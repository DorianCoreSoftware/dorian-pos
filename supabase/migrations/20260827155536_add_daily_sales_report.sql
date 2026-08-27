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
  select
    (o.created_at at time zone 'America/Mexico_City')::date
      as sale_date,

    coalesce(
      sum(o.total),
      0
    )::numeric
      as revenue,

    count(*)::bigint
      as orders_count

  from public.orders o

  where o.status = 'entregado'
    and o.created_at >= p_from
    and o.created_at < p_to

  group by
    (o.created_at at time zone 'America/Mexico_City')::date

  order by
    sale_date asc;
$$;