-- =========================================================
-- BURGER KONG - SALES REPORTS
-- =========================================================


-- =========================================================
-- 1. RESUMEN GENERAL
-- =========================================================

create or replace function public.get_sales_report_summary(
  p_from timestamptz,
  p_to timestamptz
)
returns table (
  total_revenue numeric,
  orders_count bigint,
  average_ticket numeric,
  items_sold bigint
)
language sql
stable
security invoker
as $$
  select
    coalesce(sum(o.total), 0)::numeric
      as total_revenue,

    count(*)::bigint
      as orders_count,

    coalesce(avg(o.total), 0)::numeric
      as average_ticket,

    coalesce(
      (
        select sum(oi.quantity)
        from public.order_items oi
        join public.orders item_order
          on item_order.id = oi.order_id
        where item_order.status = 'entregado'
          and item_order.created_at >= p_from
          and item_order.created_at < p_to
      ),
      0
    )::bigint
      as items_sold

  from public.orders o
  where o.status = 'entregado'
    and o.created_at >= p_from
    and o.created_at < p_to;
$$;


-- =========================================================
-- 2. PRODUCTOS
-- =========================================================

create or replace function public.get_product_sales_report(
  p_from timestamptz,
  p_to timestamptz,
  p_limit integer default 50
)
returns table (
  id uuid,
  category_id uuid,
  name text,
  units_sold bigint,
  revenue numeric
)
language sql
stable
security invoker
as $$
  select
    p.id,
    p.category_id,
    p.name,

    coalesce(
      sum(oi.quantity),
      0
    )::bigint as units_sold,

    coalesce(
      sum(
        oi.quantity *
        oi.price_at_purchase
      ),
      0
    )::numeric as revenue

  from public.products p

  join public.order_items oi
    on oi.product_id = p.id

  join public.orders o
    on o.id = oi.order_id

  where o.status = 'entregado'
    and o.created_at >= p_from
    and o.created_at < p_to

  group by
    p.id,
    p.category_id,
    p.name

  order by
    units_sold desc,
    revenue desc,
    p.name

  limit greatest(
    coalesce(p_limit, 50),
    1
  );
$$;


-- =========================================================
-- 3. MODIFICADORES / SALSAS / SABORES / CARNES
-- =========================================================

create or replace function public.get_modifier_sales_report(
  p_from timestamptz,
  p_to timestamptz,
  p_group text default null
)
returns table (
  id uuid,
  name text,
  group_name text,
  units_sold bigint
)
language sql
stable
security invoker
as $$
  with modifier_usage as (

    -- -----------------------------------------
    -- Modificador directamente sobre producto
    -- -----------------------------------------

    select
      oim.modifier_id,

      sum(
        oi.quantity
      )::bigint as units_sold

    from public.order_item_modifiers oim

    join public.order_items oi
      on oi.id =
         oim.order_item_id

    join public.orders o
      on o.id =
         oi.order_id

    where o.status = 'entregado'
      and o.created_at >= p_from
      and o.created_at < p_to

    group by
      oim.modifier_id


    union all


    -- -----------------------------------------
    -- Modificador dentro de componente de combo
    -- -----------------------------------------

    select
      oicm.modifier_id,

      sum(
        oi.quantity *
        coalesce(
          oic.quantity,
          1
        )
      )::bigint
        as units_sold

    from public.order_item_component_modifiers oicm

    join public.order_item_components oic
      on oic.id =
         oicm.order_item_component_id

    join public.order_items oi
      on oi.id =
         oic.order_item_id

    join public.orders o
      on o.id =
         oi.order_id

    where o.status = 'entregado'
      and o.created_at >= p_from
      and o.created_at < p_to

    group by
      oicm.modifier_id
  ),

  usage_totals as (
    select
      modifier_id,
      sum(units_sold)::bigint
        as units_sold
    from modifier_usage
    group by modifier_id
  )

  select
    m.id,
    m.name,
    m.group_name,

    coalesce(
      ut.units_sold,
      0
    )::bigint
      as units_sold

  from public.modifiers m

  left join usage_totals ut
    on ut.modifier_id = m.id

  where
    m.group_name is not null

    and (
      p_group is null
      or m.group_name = p_group
    )

  order by
    units_sold desc,
    m.name;
$$;