-- DorianCore - Extras cobrables y cantidades repetibles
-- 2026-11-19

alter table public.modifier_groups
add column if not exists kind text not null default 'option';

alter table public.modifier_groups
drop constraint if exists modifier_groups_kind_check;

alter table public.modifier_groups
add constraint modifier_groups_kind_check
check (kind in ('option', 'extra'));

comment on column public.modifier_groups.kind is
  'option = elección/configuración; extra = adicional cobrable, normalmente opcional y repetible.';

alter table public.order_item_component_modifiers
add column if not exists extra_price_applied numeric(10,2) not null default 0;

comment on column public.order_item_component_modifiers.extra_price_applied is
  'Precio extra histórico aplicado al modificador del componente al momento de la venta.';

-- -----------------------------------------------------------------------------
-- Conserva la implementación vigente de create_kitchen_order() y sólo amplía
-- el INSERT de modificadores de componentes para persistir extraPrice.
-- -----------------------------------------------------------------------------
do $$
declare
  v_definition text;
  v_new_definition text;
  v_step_definition text;
begin
  select pg_get_functiondef(
    'public.create_kitchen_order(numeric,jsonb,jsonb,uuid)'::regprocedure
  ) into v_definition;

  v_new_definition := v_definition;

  v_step_definition := regexp_replace(
    v_new_definition,
    $re$(insert\s+into\s+public\.order_item_component_modifiers\s*\(\s*order_item_component_id\s*,\s*modifier_id)(\s*\))$re$,
    E'\\1,\n              extra_price_applied\\2',
    'i'
  );

  if v_step_definition = v_new_definition then
    raise exception 'No se encontró la lista de columnas de order_item_component_modifiers en create_kitchen_order().';
  end if;

  v_new_definition := v_step_definition;

  v_step_definition := regexp_replace(
    v_new_definition,
    $re$(values\s*\(\s*v_component_id\s*,\s*\(\s*v_component_modifier\s*->>\s*'id'(?:::text)?\s*\)::uuid)(\s*\))$re$,
    $rep$\1,
              coalesce(
                nullif(
                  v_component_modifier ->> 'extraPrice',
                  ''
                )::numeric,
                0
              )\2$rep$,
    'i'
  );

  if v_step_definition = v_new_definition then
    raise exception 'No se encontró VALUES de order_item_component_modifiers en create_kitchen_order().';
  end if;

  execute v_step_definition;
end
$$;

-- -----------------------------------------------------------------------------
-- Igual para update_kitchen_order() base. Las sobrecargas de modalidad llaman
-- internamente a esta función y conservan sus validaciones actuales.
-- -----------------------------------------------------------------------------
do $$
declare
  v_definition text;
  v_new_definition text;
  v_step_definition text;
begin
  select pg_get_functiondef(
    'public.update_kitchen_order(uuid,numeric,jsonb,jsonb)'::regprocedure
  ) into v_definition;

  v_new_definition := v_definition;

  v_step_definition := regexp_replace(
    v_new_definition,
    $re$(insert\s+into\s+public\.order_item_component_modifiers\s*\(\s*order_item_component_id\s*,\s*modifier_id)(\s*\))$re$,
    E'\\1,\n              extra_price_applied\\2',
    'i'
  );

  if v_step_definition = v_new_definition then
    raise exception 'No se encontró la lista de columnas de order_item_component_modifiers en update_kitchen_order().';
  end if;

  v_new_definition := v_step_definition;

  v_step_definition := regexp_replace(
    v_new_definition,
    $re$(values\s*\(\s*v_component_id\s*,\s*\(\s*v_component_modifier\s*->>\s*'id'(?:::text)?\s*\)::uuid)(\s*\))$re$,
    $rep$\1,
              coalesce(
                nullif(
                  v_component_modifier ->> 'extraPrice',
                  ''
                )::numeric,
                0
              )\2$rep$,
    'i'
  );

  if v_step_definition = v_new_definition then
    raise exception 'No se encontró VALUES de order_item_component_modifiers en update_kitchen_order().';
  end if;

  execute v_step_definition;
end
$$;

-- -----------------------------------------------------------------------------
-- Checkout web seguro:
-- 1) obtiene el precio real del modificador de componente desde BD;
-- 2) lo conserva en safe_components;
-- 3) suma extras directos y de componentes al subtotal seguro.
-- -----------------------------------------------------------------------------
do $$
declare
  v_definition text;
  v_new_definition text;
  v_step_definition text;
begin
  select pg_get_functiondef(
    'public.create_web_order(jsonb,jsonb,uuid,text,text,text)'::regprocedure
  ) into v_definition;

  v_new_definition := v_definition;

  -- Después de validar disponibilidad del modificador de componente, lee precio.
  v_step_definition := regexp_replace(
    v_new_definition,
    $re$(raise\s+exception\s+'Uno de los modificadores del componente ya no está disponible\.'\s*;\s*end\s+if\s*;)(\s*v_safe_component_modifiers\s*:=\s*v_safe_component_modifiers\s*\|\|)$re$,
    $rep$\1

            select
              coalesce(m.extra_price, 0)
            into
              v_modifier_extra_price
            from public.modifiers m
            where
              m.id = v_modifier_id
              and m.is_available = true;

            \2$rep$,
    'i'
  );

  if v_step_definition = v_new_definition then
    raise exception 'No se encontró el bloque de modificador de componente en create_web_order().';
  end if;

  v_new_definition := v_step_definition;

  -- El objeto seguro del modificador de componente conserva el precio de BD.
  v_step_definition := regexp_replace(
    v_new_definition,
    $re$jsonb_build_object\s*\(\s*'id'(?:::text)?\s*,\s*v_modifier_id\s*\)$re$,
    $rep$jsonb_build_object(
                  'id',
                  v_modifier_id,
                  'extraPrice',
                  v_modifier_extra_price
                )$rep$,
    'i'
  );

  if v_step_definition = v_new_definition then
    raise exception 'No se encontró el objeto seguro del modificador de componente en create_web_order().';
  end if;

  v_new_definition := v_step_definition;

  -- Sustituye el subtotal de producto base por base + extras reales.
  v_step_definition := regexp_replace(
    v_new_definition,
    $re$v_subtotal\s*:=\s*v_subtotal\s*\+\s*\(\s*v_product_price\s*\*\s*v_quantity(?:\s*::\s*numeric)?\s*\)\s*;$re$,
    $rep$v_subtotal :=
      v_subtotal +
      (
        (
          v_product_price
          + coalesce(
              (
                select sum(
                  coalesce(
                    nullif(modifier_entry ->> 'extraPrice', '')::numeric,
                    0
                  )
                )
                from jsonb_array_elements(v_safe_modifiers) modifier_entry
              ),
              0
            )
          + coalesce(
              (
                select sum(
                  coalesce(
                    nullif(component_entry ->> 'quantity', '')::numeric,
                    1
                  )
                  * coalesce(
                      (
                        select sum(
                          coalesce(
                            nullif(component_modifier ->> 'extraPrice', '')::numeric,
                            0
                          )
                        )
                        from jsonb_array_elements(
                          coalesce(component_entry -> 'modifiers', '[]'::jsonb)
                        ) component_modifier
                      ),
                      0
                    )
                )
                from jsonb_array_elements(v_safe_components) component_entry
              ),
              0
            )
        )
        * v_quantity
      );$rep$,
    'i'
  );

  if v_step_definition = v_new_definition then
    raise exception 'No se encontró el cálculo de subtotal por producto en create_web_order().';
  end if;

  execute v_step_definition;
end
$$;

-- -----------------------------------------------------------------------------
-- Costeo base del producto:
-- los grupos de tipo EXTRA no forman parte del costo mínimo/máximo base porque
-- se cobran por separado. Su rentabilidad se revisa en la receta del extra.
-- Las opciones normales siguen usando min/max selections como antes.
-- -----------------------------------------------------------------------------
create or replace function public.get_product_modifier_cost_range_internal(
  p_product_id uuid
)
returns table(
  minimum_cost numeric,
  maximum_cost numeric
)
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  v_group record;
  v_min_option numeric;
  v_max_option numeric;
  v_group_min numeric;
  v_group_max numeric;
  v_total_min numeric := 0;
  v_total_max numeric := 0;
begin
  for v_group in
    select
      pmg.modifier_group_id,
      pmg.min_selections,
      pmg.max_selections,
      pmg.allow_duplicates
    from public.product_modifier_groups pmg
    join public.modifier_groups mg
      on mg.id = pmg.modifier_group_id
    where pmg.product_id = p_product_id
      and pmg.is_active = true
      and coalesce(mg.kind, 'option') <> 'extra'
    order by pmg.position
  loop
    if v_group.allow_duplicates then
      select
        min(
          greatest(
            public.get_modifier_inventory_cost(m.id) -
            coalesce(m.extra_price, 0),
            0
          )
        ),
        max(
          greatest(
            public.get_modifier_inventory_cost(m.id) -
            coalesce(m.extra_price, 0),
            0
          )
        )
      into
        v_min_option,
        v_max_option
      from public.modifiers m
      where m.group_id = v_group.modifier_group_id
        and m.is_available = true
        and (
          not exists (
            select 1
            from public.product_modifier_options pmo
            join public.modifiers scoped_modifier
              on scoped_modifier.id = pmo.modifier_id
            where pmo.product_id = p_product_id
              and scoped_modifier.group_id = v_group.modifier_group_id
          )
          or exists (
            select 1
            from public.product_modifier_options pmo
            where pmo.product_id = p_product_id
              and pmo.modifier_id = m.id
              and pmo.is_available = true
          )
        );

      v_group_min :=
        coalesce(v_min_option, 0) *
        greatest(v_group.min_selections, 0);

      v_group_max :=
        coalesce(v_max_option, 0) *
        greatest(v_group.max_selections, 0);
    else
      select
        coalesce(sum(candidate.burden), 0)
      into v_group_min
      from (
        select
          greatest(
            public.get_modifier_inventory_cost(m.id) -
            coalesce(m.extra_price, 0),
            0
          ) as burden
        from public.modifiers m
        where m.group_id = v_group.modifier_group_id
          and m.is_available = true
          and (
            not exists (
              select 1
              from public.product_modifier_options pmo
              join public.modifiers scoped_modifier
                on scoped_modifier.id = pmo.modifier_id
              where pmo.product_id = p_product_id
                and scoped_modifier.group_id = v_group.modifier_group_id
            )
            or exists (
              select 1
              from public.product_modifier_options pmo
              where pmo.product_id = p_product_id
                and pmo.modifier_id = m.id
                and pmo.is_available = true
            )
          )
        order by burden asc
        limit greatest(v_group.min_selections, 0)
      ) candidate;

      select
        coalesce(sum(candidate.burden), 0)
      into v_group_max
      from (
        select
          greatest(
            public.get_modifier_inventory_cost(m.id) -
            coalesce(m.extra_price, 0),
            0
          ) as burden
        from public.modifiers m
        where m.group_id = v_group.modifier_group_id
          and m.is_available = true
          and (
            not exists (
              select 1
              from public.product_modifier_options pmo
              join public.modifiers scoped_modifier
                on scoped_modifier.id = pmo.modifier_id
              where pmo.product_id = p_product_id
                and scoped_modifier.group_id = v_group.modifier_group_id
            )
            or exists (
              select 1
              from public.product_modifier_options pmo
              where pmo.product_id = p_product_id
                and pmo.modifier_id = m.id
                and pmo.is_available = true
            )
          )
        order by burden desc
        limit greatest(v_group.max_selections, 0)
      ) candidate;
    end if;

    v_total_min := v_total_min + coalesce(v_group_min, 0);
    v_total_max := v_total_max + coalesce(v_group_max, 0);
  end loop;

  return query
  select
    round(v_total_min, 4),
    round(v_total_max, 4);
end;
$$;

revoke all
on function public.get_product_modifier_cost_range_internal(uuid)
from public;
