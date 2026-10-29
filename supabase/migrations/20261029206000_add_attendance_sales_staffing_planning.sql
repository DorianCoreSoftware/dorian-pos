begin;

/*
 * ============================================================
 * FASE 14 · PLANEACIÓN DE PERSONAL BASADA EN VENTAS REALES
 * ============================================================
 *
 * No modifica horarios automáticamente.
 * Genera un perfil histórico de ventas por día de semana/hora
 * y parámetros editables para convertir demanda histórica en
 * una recomendación de cobertura.
 */

create table if not exists public.attendance_sales_planning_settings (
  id smallint primary key default 1 check (id = 1),
  history_days integer not null default 56
    check (history_days between 14 and 366),
  lookahead_days integer not null default 14
    check (lookahead_days between 7 and 28),
  minimum_staff_per_hour integer not null default 1
    check (minimum_staff_per_hour between 0 and 50),
  orders_per_staff_hour numeric(10,2) not null default 8
    check (orders_per_staff_hour > 0 and orders_per_staff_hour <= 1000),
  revenue_per_staff_hour numeric(12,2) not null default 600
    check (revenue_per_staff_hour > 0 and revenue_per_staff_hour <= 1000000),
  updated_at timestamptz not null default now(),
  updated_by uuid null references public.profiles(id)
);

insert into public.attendance_sales_planning_settings (id)
values (1)
on conflict (id) do nothing;

alter table public.attendance_sales_planning_settings enable row level security;
revoke all on public.attendance_sales_planning_settings from anon, authenticated;

drop function if exists public.attendance_admin_get_sales_planning_settings();
create or replace function public.attendance_admin_get_sales_planning_settings()
returns table (
  history_days integer,
  lookahead_days integer,
  minimum_staff_per_hour integer,
  orders_per_staff_hour numeric,
  revenue_per_staff_hour numeric
)
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.attendance_assert_active_admin();

  return query
  select
    s.history_days,
    s.lookahead_days,
    s.minimum_staff_per_hour,
    s.orders_per_staff_hour,
    s.revenue_per_staff_hour
  from public.attendance_sales_planning_settings s
  where s.id = 1;
end;
$$;

drop function if exists public.attendance_admin_save_sales_planning_settings(
  integer, integer, integer, numeric, numeric
);
create or replace function public.attendance_admin_save_sales_planning_settings(
  p_history_days integer,
  p_lookahead_days integer,
  p_minimum_staff_per_hour integer,
  p_orders_per_staff_hour numeric,
  p_revenue_per_staff_hour numeric
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.attendance_assert_active_admin();

  if p_history_days not between 14 and 366 then
    raise exception 'El historial debe estar entre 14 y 366 días.';
  end if;

  if p_lookahead_days not between 7 and 28 then
    raise exception 'La proyección debe estar entre 7 y 28 días.';
  end if;

  if p_minimum_staff_per_hour not between 0 and 50 then
    raise exception 'El mínimo de personal por hora debe estar entre 0 y 50.';
  end if;

  if p_orders_per_staff_hour <= 0 or p_orders_per_staff_hour > 1000 then
    raise exception 'Órdenes por persona/hora no es válido.';
  end if;

  if p_revenue_per_staff_hour <= 0 or p_revenue_per_staff_hour > 1000000 then
    raise exception 'Ventas por persona/hora no es válido.';
  end if;

  insert into public.attendance_sales_planning_settings (
    id,
    history_days,
    lookahead_days,
    minimum_staff_per_hour,
    orders_per_staff_hour,
    revenue_per_staff_hour,
    updated_at,
    updated_by
  )
  values (
    1,
    p_history_days,
    p_lookahead_days,
    p_minimum_staff_per_hour,
    p_orders_per_staff_hour,
    p_revenue_per_staff_hour,
    now(),
    auth.uid()
  )
  on conflict (id) do update
  set
    history_days = excluded.history_days,
    lookahead_days = excluded.lookahead_days,
    minimum_staff_per_hour = excluded.minimum_staff_per_hour,
    orders_per_staff_hour = excluded.orders_per_staff_hour,
    revenue_per_staff_hour = excluded.revenue_per_staff_hour,
    updated_at = now(),
    updated_by = auth.uid();
end;
$$;

/*
 * Perfil histórico por día de semana + hora local del negocio.
 *
 * Importante:
 * - Usa created_at de la orden como momento de demanda.
 * - Excluye pedidos cancelados.
 * - Divide entre TODAS las ocurrencias de ese día de semana
 *   dentro del rango, incluso cuando una hora tuvo cero ventas.
 *   Así el promedio no se infla omitiendo días tranquilos.
 */
drop function if exists public.attendance_admin_sales_hourly_profile(date, date);
create or replace function public.attendance_admin_sales_hourly_profile(
  p_start_date date,
  p_end_date date
)
returns table (
  day_of_week integer,
  hour_of_day integer,
  sample_days integer,
  orders_total bigint,
  revenue_total numeric,
  average_orders numeric,
  average_revenue numeric
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_timezone text;
begin
  perform public.attendance_assert_active_admin();

  if p_start_date is null or p_end_date is null then
    raise exception 'El rango de fechas es obligatorio.';
  end if;

  if p_end_date < p_start_date then
    raise exception 'La fecha final no puede ser anterior a la inicial.';
  end if;

  if (p_end_date - p_start_date) > 365 then
    raise exception 'El rango máximo es de 366 días.';
  end if;

  select coalesce(bs.timezone, 'America/Mexico_City')
  into v_timezone
  from public.business_settings bs
  where bs.id = 1;

  v_timezone := coalesce(v_timezone, 'America/Mexico_City');

  return query
  with calendar as (
    select
      d::date as work_date,
      extract(dow from d)::integer as dow
    from generate_series(
      p_start_date::timestamp,
      p_end_date::timestamp,
      interval '1 day'
    ) d
  ),
  sample_counts as (
    select
      c.dow,
      count(*)::integer as day_count
    from calendar c
    group by c.dow
  ),
  local_orders as (
    select
      (o.created_at at time zone v_timezone)::date as sale_date,
      extract(
        dow from (o.created_at at time zone v_timezone)
      )::integer as dow,
      extract(
        hour from (o.created_at at time zone v_timezone)
      )::integer as sale_hour,
      o.total::numeric as order_total
    from public.orders o
    where o.created_at is not null
      and (o.created_at at time zone v_timezone)::date
          between p_start_date and p_end_date
      and lower(coalesce(o.status, '')) <> 'cancelled'
  ),
  grouped as (
    select
      lo.dow,
      lo.sale_hour,
      count(*)::bigint as order_count,
      coalesce(sum(lo.order_total), 0)::numeric as revenue
    from local_orders lo
    group by lo.dow, lo.sale_hour
  )
  select
    g.dow,
    g.sale_hour,
    sc.day_count,
    g.order_count,
    g.revenue,
    round(
      g.order_count::numeric / nullif(sc.day_count, 0),
      2
    ) as average_orders,
    round(
      g.revenue / nullif(sc.day_count, 0),
      2
    ) as average_revenue
  from grouped g
  join sample_counts sc
    on sc.dow = g.dow
  order by g.dow, g.sale_hour;
end;
$$;

grant execute on function public.attendance_admin_get_sales_planning_settings()
to authenticated;

grant execute on function public.attendance_admin_save_sales_planning_settings(
  integer, integer, integer, numeric, numeric
)
to authenticated;

grant execute on function public.attendance_admin_sales_hourly_profile(date, date)
to authenticated;

commit;
