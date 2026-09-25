-- Reportes de modificadores: usa modifier_groups como fuente de verdad.
-- Mantiene la columna de salida group_name por compatibilidad visual.

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

    -- Modificador directamente sobre producto
    select
      oim.modifier_id,

      sum(
        oi.quantity
      )::bigint
        as units_sold

    from public.order_item_modifiers oim

    join public.order_items oi
      on oi.id =
         oim.order_item_id

    join public.orders o
      on o.id =
         oi.order_id

    where
      o.status =
        'delivered'

      and o.status_updated_at >=
          p_from

      and o.status_updated_at <
          p_to

    group by
      oim.modifier_id


    union all


    -- Modificador dentro de componente de combo
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

    where
      o.status =
        'delivered'

      and o.status_updated_at >=
          p_from

      and o.status_updated_at <
          p_to

    group by
      oicm.modifier_id
  ),

  usage_totals as (
    select
      modifier_id,

      sum(
        units_sold
      )::bigint
        as units_sold

    from modifier_usage

    group by
      modifier_id
  )

  select
    m.id,

    m.name,

    mg.name as group_name,

    coalesce(
      ut.units_sold,
      0
    )::bigint
      as units_sold

  from public.modifiers m

  join public.modifier_groups mg
    on mg.id = m.group_id

  left join usage_totals ut
    on ut.modifier_id =
       m.id

  where
    p_group is null
    or mg.code = p_group

  order by
    units_sold desc,
    m.name;
$$;

