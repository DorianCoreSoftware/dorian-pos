-- ============================================================
-- FASE 6G: REPORTES DE EVENTOS
-- ============================================================
-- El periodo se interpreta por fecha del evento usando la zona
-- horaria configurada para el negocio.
--
-- Finanzas:
--   total contratado = quoted_total ?? estimated_total
--   cobrado total    = event_payments + order_payments del POS
-- No se suma el total cotizado como ingreso cobrado.
-- ============================================================

create or replace function public.get_event_report(
  p_from timestamptz,
  p_to timestamptz
)
returns table (
  request_id uuid,
  folio bigint,
  status text,
  event_date date,
  event_time time,
  created_at timestamptz,
  customer_name text,
  customer_phone text,
  customer_email text,
  event_type_name text,
  package_name text,
  guest_count integer,
  estimated_total numeric,
  quoted_total numeric,
  effective_total numeric,
  event_payments_total numeric,
  pos_payments_total numeric,
  total_collected numeric,
  pending_balance numeric,
  pos_order_id uuid,
  was_quoted boolean
)
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_timezone text := 'America/Mexico_City';
  v_from_date date;
  v_to_date date;
begin
  if v_user_id is null or not exists (
    select 1
    from public.profiles p
    where p.id = v_user_id
      and p.is_active = true
      and p.role::text = 'admin'
  ) then
    raise exception 'No tienes permisos para consultar reportes de eventos';
  end if;

  if p_from is null or p_to is null or p_to <= p_from then
    raise exception 'El rango del reporte no es válido';
  end if;

  select coalesce(nullif(trim(bs.timezone), ''), 'America/Mexico_City')
  into v_timezone
  from public.business_settings bs
  where bs.id = 1;

  v_from_date := (p_from at time zone v_timezone)::date;
  v_to_date := (p_to at time zone v_timezone)::date;

  return query
  with payment_totals as (
    select
      ep.request_id,
      coalesce(sum(ep.amount), 0)::numeric as amount
    from public.event_payments ep
    group by ep.request_id
  ),
  pos_totals as (
    select
      r.id as request_id,
      coalesce(sum(op.total_amount), 0)::numeric as amount
    from public.event_requests r
    join public.order_payments op
      on op.order_id = r.pos_order_id
    where r.pos_order_id is not null
    group by r.id
  )
  select
    r.id as request_id,
    r.folio,
    r.status,
    r.event_date,
    r.event_time,
    r.created_at,
    coalesce(r.customer_name, '')::text,
    coalesce(r.customer_phone, '')::text,
    coalesce(r.customer_email, '')::text,
    coalesce(r.event_type_name, et.name, '')::text,
    coalesce(r.package_name, pkg.name, '')::text,
    r.guest_count,
    coalesce(r.estimated_total, 0)::numeric,
    r.quoted_total,
    coalesce(r.quoted_total, r.estimated_total, 0)::numeric as effective_total,
    coalesce(ep.amount, 0)::numeric as event_payments_total,
    coalesce(pp.amount, 0)::numeric as pos_payments_total,
    (coalesce(ep.amount, 0) + coalesce(pp.amount, 0))::numeric as total_collected,
    case
      when r.status in ('rejected', 'cancelled') then 0::numeric
      when r.status in ('accepted', 'confirmed', 'completed') then
        greatest(
          coalesce(r.quoted_total, r.estimated_total, 0)
          - coalesce(ep.amount, 0)
          - coalesce(pp.amount, 0),
          0
        )::numeric
      else 0::numeric
    end as pending_balance,
    r.pos_order_id,
    (
      r.quoted_total is not null
      or r.status in ('quoted', 'accepted', 'confirmed', 'completed')
    ) as was_quoted
  from public.event_requests r
  left join public.event_types et
    on et.id = r.event_type_id
  left join public.event_packages pkg
    on pkg.id = r.package_id
  left join payment_totals ep
    on ep.request_id = r.id
  left join pos_totals pp
    on pp.request_id = r.id
  where r.event_date >= v_from_date
    and r.event_date < v_to_date
  order by r.event_date desc, r.event_time desc nulls last, r.folio desc;
end;
$$;

revoke all on function public.get_event_report(timestamptz, timestamptz) from public;
grant execute on function public.get_event_report(timestamptz, timestamptz) to authenticated;

comment on function public.get_event_report(timestamptz, timestamptz) is
  'Reporte administrativo de eventos por fecha del evento. Separa anticipos/pagos de Eventos del saldo cobrado en el pedido POS vinculado para evitar doble conteo.';
