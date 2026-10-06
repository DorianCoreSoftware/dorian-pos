-- Phase 16: make report grouping and loyalty daily limits honor the
-- configurable business_settings.timezone instead of a fixed Mexico City zone.

create or replace function public.get_daily_sales_report(
  p_from timestamptz,
  p_to timestamptz
)
returns table (
  sale_date date,
  revenue numeric,
  orders_count bigint
)
language sql
stable
security invoker
as $$
  with config as (
    select coalesce(
      (
        select bs.timezone
        from public.business_settings bs
        where bs.id = 1
      ),
      'America/Mexico_City'
    ) as timezone
  )
  select
    (
      o.status_updated_at
        at time zone config.timezone
    )::date as sale_date,
    coalesce(sum(o.total), 0)::numeric as revenue,
    count(*)::bigint as orders_count
  from public.orders o
  cross join config
  where o.status = 'delivered'
    and o.status_updated_at >= p_from
    and o.status_updated_at < p_to
  group by
    (
      o.status_updated_at
        at time zone config.timezone
    )::date
  order by sale_date asc;
$$;

create or replace function public.get_daily_financial_report(
  p_from timestamptz,
  p_to timestamptz
)
returns table (
  report_date date,
  net_sales numeric,
  expenses numeric,
  balance numeric
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_timezone text;
begin
  if not exists (
    select 1
    from public.profiles profile
    where profile.id = auth.uid()
      and profile.role = 'admin'::public.user_role
      and coalesce(profile.is_active, true) = true
  ) then
    raise exception 'No autorizado.';
  end if;

  select coalesce(bs.timezone, 'America/Mexico_City')
  into v_timezone
  from public.business_settings bs
  where bs.id = 1;

  v_timezone := coalesce(v_timezone, 'America/Mexico_City');

  return query
  with days as (
    select generate_series(
      (p_from at time zone v_timezone)::date,
      (p_to at time zone v_timezone)::date,
      interval '1 day'
    )::date as day
  ),
  sales as (
    select
      (op.created_at at time zone v_timezone)::date as day,
      coalesce(sum(op.total_amount), 0)::numeric as gross
    from public.order_payments op
    where op.created_at >= p_from
      and op.created_at <= p_to
    group by (op.created_at at time zone v_timezone)::date
  ),
  refunds as (
    select
      (cr.created_at at time zone v_timezone)::date as day,
      coalesce(sum(cr.amount), 0)::numeric as amount
    from public.cash_refunds cr
    where cr.created_at >= p_from
      and cr.created_at <= p_to
    group by (cr.created_at at time zone v_timezone)::date
  ),
  expenses_by_day as (
    select
      (e.expense_at at time zone v_timezone)::date as day,
      coalesce(sum(e.amount), 0)::numeric as amount
    from public.business_expenses e
    where e.expense_at >= p_from
      and e.expense_at <= p_to
    group by (e.expense_at at time zone v_timezone)::date
  )
  select
    d.day,
    (coalesce(s.gross, 0) - coalesce(r.amount, 0))::numeric as net_sales,
    coalesce(e.amount, 0)::numeric as expenses,
    (
      coalesce(s.gross, 0) -
      coalesce(r.amount, 0) -
      coalesce(e.amount, 0)
    )::numeric as balance
  from days d
  left join sales s on s.day = d.day
  left join refunds r on r.day = d.day
  left join expenses_by_day e on e.day = d.day
  order by d.day asc;
end;
$$;

create or replace function public.register_loyalty_visit(
  p_qr_token uuid,
  p_order_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_customer public.loyalty_customers;
  v_is_enabled boolean;
  v_minimum_purchase_amount numeric(10,2);
  v_cooldown_minutes integer;
  v_max_visits_per_day integer;
  v_today_visits integer;
  v_last_visit timestamptz;
  v_order_total numeric(10,2);
  v_visit_id uuid;
  v_total_visits integer;
  v_timezone text;
begin
  v_user_id := auth.uid();

  if v_user_id is null then
    raise exception 'Usuario no autenticado';
  end if;

  if not exists (
    select 1
    from public.profiles
    where id = v_user_id
      and is_active = true
      and role::text in ('admin', 'seller')
  ) then
    raise exception 'No tienes permisos para registrar visitas';
  end if;

  select
    is_enabled,
    minimum_purchase_amount,
    visit_cooldown_minutes,
    max_visits_per_day
  into
    v_is_enabled,
    v_minimum_purchase_amount,
    v_cooldown_minutes,
    v_max_visits_per_day
  from public.loyalty_settings
  where id = true;

  if not coalesce(v_is_enabled, false) then
    raise exception 'El programa de recompensas está desactivado';
  end if;

  select coalesce(bs.timezone, 'America/Mexico_City')
  into v_timezone
  from public.business_settings bs
  where bs.id = 1;

  v_timezone := coalesce(v_timezone, 'America/Mexico_City');

  select *
  into v_customer
  from public.loyalty_customers
  where qr_token = p_qr_token
    and is_active = true;

  if not found then
    raise exception 'Cliente no encontrado';
  end if;

  if p_order_id is not null then
    select total
    into v_order_total
    from public.orders
    where id = p_order_id;

    if not found then
      raise exception 'La orden no existe';
    end if;

    if exists (
      select 1
      from public.loyalty_visits
      where order_id = p_order_id
    ) then
      raise exception 'Esta orden ya fue utilizada para registrar una visita';
    end if;
  end if;

  if v_minimum_purchase_amount is not null
     and v_minimum_purchase_amount > 0
  then
    if p_order_id is null then
      raise exception 'Se requiere una orden para validar la compra mínima';
    end if;

    if coalesce(v_order_total, 0) < v_minimum_purchase_amount then
      raise exception 'La compra no alcanza el monto mínimo para registrar una visita';
    end if;
  end if;

  select count(*)::integer
  into v_today_visits
  from public.loyalty_visits
  where customer_id = v_customer.id
    and visited_at >=
      (
        date_trunc(
          'day',
          now() at time zone v_timezone
        ) at time zone v_timezone
      )
    and visited_at <
      (
        (
          date_trunc(
            'day',
            now() at time zone v_timezone
          ) + interval '1 day'
        ) at time zone v_timezone
      );

  if v_today_visits >= v_max_visits_per_day then
    raise exception 'El cliente alcanzó el máximo de visitas permitidas por día';
  end if;

  select visited_at
  into v_last_visit
  from public.loyalty_visits
  where customer_id = v_customer.id
  order by visited_at desc
  limit 1;

  if v_last_visit is not null
     and now() < v_last_visit + make_interval(mins => v_cooldown_minutes)
  then
    raise exception 'Debe transcurrir más tiempo antes de registrar otra visita';
  end if;

  insert into public.loyalty_visits (
    customer_id,
    order_id,
    registered_by
  )
  values (
    v_customer.id,
    p_order_id,
    v_user_id
  )
  returning id
  into v_visit_id;

  select count(*)::integer
  into v_total_visits
  from public.loyalty_visits
  where customer_id = v_customer.id;

  return jsonb_build_object(
    'visitId', v_visit_id,
    'customerId', v_customer.id,
    'customerName', v_customer.name,
    'totalVisits', v_total_visits
  );
end;
$$;

grant execute on function public.get_daily_sales_report(timestamptz, timestamptz) to authenticated;
grant execute on function public.get_daily_financial_report(timestamptz, timestamptz) to authenticated;
grant execute on function public.register_loyalty_visit(uuid, uuid) to authenticated;
