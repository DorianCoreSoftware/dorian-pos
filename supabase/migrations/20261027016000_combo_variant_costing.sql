-- ============================================================
-- DORIAN POS
-- INVENTARIO / COSTEO - FASE 8
-- Costeo completo de variantes y combos
-- ============================================================

-- ------------------------------------------------------------
-- 1. Helpers internos de costo
-- ------------------------------------------------------------

create or replace function public.get_product_base_inventory_cost(
  p_product_id uuid
)
returns numeric
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select
    round(
      coalesce(
        sum(
          ri.quantity *
          ii.unit_cost
        ),
        0
      ),
      4
    )
  from public.product_inventory_recipes r
  join public.product_inventory_recipe_items ri
    on ri.recipe_id = r.id
  join public.inventory_items ii
    on ii.id = ri.inventory_item_id
  where r.product_id = p_product_id
    and r.is_enabled = true;
$$;

revoke all
on function public.get_product_base_inventory_cost(uuid)
from public;

create or replace function public.get_modifier_inventory_cost(
  p_modifier_id uuid
)
returns numeric
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select
    round(
      coalesce(
        sum(
          ri.quantity *
          ii.unit_cost
        ),
        0
      ),
      4
    )
  from public.modifier_inventory_recipes r
  join public.modifier_inventory_recipe_items ri
    on ri.recipe_id = r.id
  join public.inventory_items ii
    on ii.id = ri.inventory_item_id
  where r.modifier_id = p_modifier_id
    and r.is_enabled = true;
$$;

revoke all
on function public.get_modifier_inventory_cost(uuid)
from public;

-- ------------------------------------------------------------
-- 2. Rango de costo de modificadores asociados a un producto
--
-- "burden" = costo receta modificador - precio extra cobrado.
-- Nunca se permite que un extra rentable reduzca el costo base:
-- greatest(costo - extra, 0).
-- ------------------------------------------------------------

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
    where pmg.product_id = p_product_id
      and pmg.is_active = true
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
        coalesce(
          v_min_option,
          0
        ) *
        greatest(
          v_group.min_selections,
          0
        );

      v_group_max :=
        coalesce(
          v_max_option,
          0
        ) *
        greatest(
          v_group.max_selections,
          0
        );
    else
      select
        coalesce(
          sum(candidate.burden),
          0
        )
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
        limit greatest(
          v_group.min_selections,
          0
        )
      ) candidate;

      select
        coalesce(
          sum(candidate.burden),
          0
        )
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
        limit greatest(
          v_group.max_selections,
          0
        )
      ) candidate;
    end if;

    v_total_min :=
      v_total_min +
      coalesce(
        v_group_min,
        0
      );

    v_total_max :=
      v_total_max +
      coalesce(
        v_group_max,
        0
      );
  end loop;

  return query
  select
    round(
      v_total_min,
      4
    ),
    round(
      v_total_max,
      4
    );
end;
$$;

revoke all
on function public.get_product_modifier_cost_range_internal(uuid)
from public;

-- ------------------------------------------------------------
-- 3. Rango total de costo.
--
-- Para productos normales:
--   receta base + variantes/modificadores.
--
-- Para combos:
--   receta base del combo (empaque, etc.)
--   + variantes propias
--   + cada componente.
--
-- Un componente selectable usa el producto permitido más barato
-- para el mínimo y el más caro para el máximo.
-- ------------------------------------------------------------

create or replace function public.get_product_cost_range_internal(
  p_product_id uuid,
  p_include_combo boolean default true
)
returns table(
  base_recipe_cost numeric,
  modifier_min_cost numeric,
  modifier_max_cost numeric,
  combo_min_cost numeric,
  combo_max_cost numeric,
  minimum_total_cost numeric,
  maximum_total_cost numeric
)
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  v_base numeric := 0;
  v_modifier_min numeric := 0;
  v_modifier_max numeric := 0;
  v_combo_min numeric := 0;
  v_combo_max numeric := 0;
  v_recipe_id uuid;
  v_component record;
  v_option record;
  v_option_range record;
  v_component_min numeric;
  v_component_max numeric;
begin
  if not exists (
    select 1
    from public.products p
    where p.id = p_product_id
  ) then
    raise exception
      'El producto no existe';
  end if;

  v_base :=
    public.get_product_base_inventory_cost(
      p_product_id
    );

  select
    r.minimum_cost,
    r.maximum_cost
  into
    v_modifier_min,
    v_modifier_max
  from public.get_product_modifier_cost_range_internal(
    p_product_id
  ) r;

  v_modifier_min :=
    coalesce(
      v_modifier_min,
      0
    );

  v_modifier_max :=
    coalesce(
      v_modifier_max,
      0
    );

  if p_include_combo then
    select cr.id
    into v_recipe_id
    from public.combo_recipes cr
    where cr.combo_product_id =
      p_product_id
      and cr.enabled = true
    limit 1;

    if v_recipe_id is not null then
      for v_component in
        select
          c.id,
          c.selection_mode,
          c.fixed_product_id,
          c.product_category_id
        from public.combo_recipe_components c
        where c.combo_recipe_id =
          v_recipe_id
        order by c.position
      loop
        v_component_min :=
          null;

        v_component_max :=
          null;

        if
          v_component.selection_mode =
            'fixed'
          and
          v_component.fixed_product_id
            is not null
        then
          select *
          into v_option_range
          from public.get_product_cost_range_internal(
            v_component.fixed_product_id,
            false
          );

          v_component_min :=
            v_option_range.minimum_total_cost;

          v_component_max :=
            v_option_range.maximum_total_cost;

        elsif
          v_component.selection_mode =
            'selectable'
          and
          v_component.product_category_id
            is not null
        then
          for v_option in
            select p.id
            from public.products p
            where p.category_id =
              v_component.product_category_id
              and p.is_active = true
              and p.is_available = true
              and coalesce(
                p.is_combo_option,
                false
              ) = true
              and not exists (
                select 1
                from public.combo_component_products rule_excluded
                where rule_excluded.combo_component_id =
                  v_component.id
                  and rule_excluded.product_id =
                    p.id
                  and rule_excluded.rule_type =
                    'excluded'
              )
              and (
                not exists (
                  select 1
                  from public.combo_component_products rule_allowed_any
                  where rule_allowed_any.combo_component_id =
                    v_component.id
                    and rule_allowed_any.rule_type =
                      'allowed'
                )
                or exists (
                  select 1
                  from public.combo_component_products rule_allowed
                  where rule_allowed.combo_component_id =
                    v_component.id
                    and rule_allowed.product_id =
                      p.id
                    and rule_allowed.rule_type =
                      'allowed'
                )
              )
          loop
            select *
            into v_option_range
            from public.get_product_cost_range_internal(
              v_option.id,
              false
            );

            if
              v_component_min is null
              or
              v_option_range.minimum_total_cost <
                v_component_min
            then
              v_component_min :=
                v_option_range.minimum_total_cost;
            end if;

            if
              v_component_max is null
              or
              v_option_range.maximum_total_cost >
                v_component_max
            then
              v_component_max :=
                v_option_range.maximum_total_cost;
            end if;
          end loop;
        end if;

        v_combo_min :=
          v_combo_min +
          coalesce(
            v_component_min,
            0
          );

        v_combo_max :=
          v_combo_max +
          coalesce(
            v_component_max,
            0
          );
      end loop;
    end if;
  end if;

  return query
  select
    round(
      v_base,
      4
    ),
    round(
      v_modifier_min,
      4
    ),
    round(
      v_modifier_max,
      4
    ),
    round(
      v_combo_min,
      4
    ),
    round(
      v_combo_max,
      4
    ),
    round(
      v_base +
      v_modifier_min +
      v_combo_min,
      4
    ),
    round(
      v_base +
      v_modifier_max +
      v_combo_max,
      4
    );
end;
$$;

revoke all
on function public.get_product_cost_range_internal(
  uuid,
  boolean
)
from public;

-- ------------------------------------------------------------
-- 4. RPC admin V2 de costeo
-- ------------------------------------------------------------

create or replace function public.get_product_costing_admin_v2(
  p_product_id uuid
)
returns table(
  product_id uuid,
  base_recipe_cost numeric,
  variant_min_cost numeric,
  variant_max_cost numeric,
  combo_min_cost numeric,
  combo_max_cost numeric,
  minimum_total_cost numeric,
  maximum_total_cost numeric,
  current_price numeric,
  recommended_price numeric,
  target_food_cost_percent numeric,
  rounding_step numeric,
  pricing_mode text,
  current_food_cost_percent numeric,
  current_gross_margin_percent numeric,
  is_variable_cost boolean
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_range record;
  v_price numeric(14,2);
  v_target numeric(5,2);
  v_rounding numeric(10,2);
  v_recommended numeric(14,2);
  v_mode text;
begin
  perform public.require_inventory_admin();

  select p.price
  into v_price
  from public.products p
  where p.id =
    p_product_id;

  if v_price is null then
    raise exception
      'El producto no existe';
  end if;

  select *
  into v_range
  from public.get_product_cost_range_internal(
    p_product_id,
    true
  );

  select
    s.target_food_cost_percent,
    s.rounding_step
  into
    v_target,
    v_rounding
  from public.inventory_costing_settings s
  where s.id = 1;

  v_target :=
    coalesce(
      v_target,
      35
    );

  v_rounding :=
    coalesce(
      v_rounding,
      5
    );

  if
    coalesce(
      v_range.maximum_total_cost,
      0
    ) <= 0
  then
    v_recommended :=
      0;
  else
    v_recommended :=
      ceil(
        (
          v_range.maximum_total_cost /
          (
            v_target /
            100
          )
        ) /
        v_rounding
      ) *
      v_rounding;
  end if;

  select ps.pricing_mode
  into v_mode
  from public.product_pricing_settings ps
  where ps.product_id =
    p_product_id;

  v_mode :=
    coalesce(
      v_mode,
      'manual'
    );

  return query
  select
    p_product_id,
    round(
      v_range.base_recipe_cost,
      2
    ),
    round(
      v_range.modifier_min_cost,
      2
    ),
    round(
      v_range.modifier_max_cost,
      2
    ),
    round(
      v_range.combo_min_cost,
      2
    ),
    round(
      v_range.combo_max_cost,
      2
    ),
    round(
      v_range.minimum_total_cost,
      2
    ),
    round(
      v_range.maximum_total_cost,
      2
    ),
    round(
      v_price,
      2
    ),
    round(
      v_recommended,
      2
    ),
    v_target,
    v_rounding,
    v_mode,
    case
      when v_price > 0
      then round(
        (
          v_range.maximum_total_cost /
          v_price
        ) *
        100,
        2
      )
      else null
    end,
    case
      when v_price > 0
      then round(
        (
          (
            v_price -
            v_range.maximum_total_cost
          ) /
          v_price
        ) *
        100,
        2
      )
      else null
    end,
    abs(
      v_range.maximum_total_cost -
      v_range.minimum_total_cost
    ) >= 0.01;
end;
$$;

revoke all
on function public.get_product_costing_admin_v2(uuid)
from public;

grant execute
on function public.get_product_costing_admin_v2(uuid)
to authenticated;

-- ------------------------------------------------------------
-- 5. Mantener RPC anterior compatible, pero con el nuevo motor.
-- recipe_cost representa ahora el costo máximo protegido.
-- ------------------------------------------------------------

create or replace function public.get_product_costing_admin(
  p_product_id uuid
)
returns table(
  product_id uuid,
  recipe_cost numeric,
  current_price numeric,
  recommended_price numeric,
  target_food_cost_percent numeric,
  rounding_step numeric,
  pricing_mode text,
  current_food_cost_percent numeric,
  current_gross_margin_percent numeric
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  perform public.require_inventory_admin();

  return query
  select
    c.product_id,
    c.maximum_total_cost,
    c.current_price,
    c.recommended_price,
    c.target_food_cost_percent,
    c.rounding_step,
    c.pricing_mode,
    c.current_food_cost_percent,
    c.current_gross_margin_percent
  from public.get_product_costing_admin_v2(
    p_product_id
  ) c;
end;
$$;

-- ------------------------------------------------------------
-- 6. Modo recomendado usa el costo máximo de cualquier variante.
-- ------------------------------------------------------------

create or replace function public.save_product_pricing_mode_admin(
  p_product_id uuid,
  p_pricing_mode text
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid;
  v_costing record;
begin
  v_user_id :=
    public.require_inventory_admin();

  if p_pricing_mode not in (
    'manual',
    'recommended'
  ) then
    raise exception
      'El modo de precio no es válido';
  end if;

  if not exists (
    select 1
    from public.products
    where id =
      p_product_id
  ) then
    raise exception
      'El producto no existe';
  end if;

  insert into public.product_pricing_settings(
    product_id,
    pricing_mode,
    updated_by,
    updated_at
  )
  values (
    p_product_id,
    p_pricing_mode,
    v_user_id,
    now()
  )
  on conflict(product_id)
  do update set
    pricing_mode =
      excluded.pricing_mode,
    updated_by =
      excluded.updated_by,
    updated_at =
      now();

  if p_pricing_mode = 'recommended' then
    select *
    into v_costing
    from public.get_product_costing_admin_v2(
      p_product_id
    );

    if
      v_costing.recommended_price
        is not null
      and
      v_costing.recommended_price > 0
    then
      update public.products
      set price =
        v_costing.recommended_price
      where id =
        p_product_id;
    end if;
  end if;
end;
$$;
