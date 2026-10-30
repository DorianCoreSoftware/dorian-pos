-- ============================================================
-- DORIAN POS
-- INVENTARIO - FASE 7 CORE
-- Recetas de modificadores + consumo automático
-- ============================================================

create table if not exists public.modifier_inventory_recipes (
  id uuid primary key default gen_random_uuid(),
  modifier_id uuid not null unique
    references public.modifiers(id)
    on delete cascade,
  is_enabled boolean not null default false,
  created_by uuid
    references public.profiles(id)
    on delete set null,
  updated_by uuid
    references public.profiles(id)
    on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.modifier_inventory_recipe_items (
  id uuid primary key default gen_random_uuid(),
  recipe_id uuid not null
    references public.modifier_inventory_recipes(id)
    on delete cascade,
  inventory_item_id uuid not null
    references public.inventory_items(id)
    on delete restrict,
  quantity numeric(14,3) not null
    check (quantity > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint modifier_inventory_recipe_item_unique
    unique (
      recipe_id,
      inventory_item_id
    )
);

create index if not exists idx_modifier_inventory_recipes_modifier
on public.modifier_inventory_recipes(
  modifier_id
);

create index if not exists idx_modifier_inventory_recipe_items_recipe
on public.modifier_inventory_recipe_items(
  recipe_id
);

create index if not exists idx_modifier_inventory_recipe_items_inventory
on public.modifier_inventory_recipe_items(
  inventory_item_id
);

alter table public.modifier_inventory_recipes
  enable row level security;

alter table public.modifier_inventory_recipe_items
  enable row level security;

drop policy if exists modifier_inventory_recipes_authenticated_read
on public.modifier_inventory_recipes;

create policy modifier_inventory_recipes_authenticated_read
on public.modifier_inventory_recipes
for select
to authenticated
using (true);

drop policy if exists modifier_inventory_recipe_items_authenticated_read
on public.modifier_inventory_recipe_items;

create policy modifier_inventory_recipe_items_authenticated_read
on public.modifier_inventory_recipe_items
for select
to authenticated
using (true);

-- ------------------------------------------------------------
-- Admin: leer receta de modificador
-- ------------------------------------------------------------

create or replace function public.get_modifier_inventory_recipe_admin(
  p_modifier_id uuid
)
returns table(
  modifier_id uuid,
  enabled boolean,
  inventory_item_id uuid,
  inventory_item_name text,
  base_unit text,
  quantity numeric,
  unit_cost numeric,
  inventory_item_active boolean
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_recipe_id uuid;
  v_enabled boolean;
begin
  perform public.require_inventory_admin();

  if not exists (
    select 1
    from public.modifiers
    where id =
      p_modifier_id
  ) then
    raise exception
      'El modificador no existe';
  end if;

  select
    r.id,
    r.is_enabled
  into
    v_recipe_id,
    v_enabled
  from public.modifier_inventory_recipes r
  where r.modifier_id =
    p_modifier_id;

  if v_recipe_id is null then
    return;
  end if;

  if not exists (
    select 1
    from public.modifier_inventory_recipe_items
    where recipe_id =
      v_recipe_id
  ) then
    return query
    select
      p_modifier_id,
      v_enabled,
      null::uuid,
      null::text,
      null::text,
      null::numeric,
      null::numeric,
      null::boolean;

    return;
  end if;

  return query
  select
    p_modifier_id,
    v_enabled,
    i.id,
    i.name,
    i.base_unit,
    ri.quantity,
    i.unit_cost,
    i.is_active
  from public.modifier_inventory_recipe_items ri
  join public.inventory_items i
    on i.id =
      ri.inventory_item_id
  where ri.recipe_id =
    v_recipe_id
  order by i.name;
end;
$$;

revoke all
on function public.get_modifier_inventory_recipe_admin(uuid)
from public;

grant execute
on function public.get_modifier_inventory_recipe_admin(uuid)
to authenticated;

-- ------------------------------------------------------------
-- Admin: guardar receta de modificador
-- ------------------------------------------------------------

create or replace function public.save_modifier_inventory_recipe_admin(
  p_modifier_id uuid,
  p_enabled boolean,
  p_items jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid;
  v_recipe_id uuid;
  v_item jsonb;
  v_inventory_item_id uuid;
  v_quantity numeric(14,3);
  v_seen uuid[] :=
    array[]::uuid[];
begin
  v_user_id :=
    public.require_inventory_admin();

  if not exists (
    select 1
    from public.modifiers
    where id =
      p_modifier_id
  ) then
    raise exception
      'El modificador no existe';
  end if;

  if
    p_items is null
    or jsonb_typeof(
      p_items
    ) <> 'array'
  then
    raise exception
      'Los insumos deben ser un arreglo';
  end if;

  if
    coalesce(
      p_enabled,
      false
    )
    and jsonb_array_length(
      p_items
    ) = 0
  then
    raise exception
      'Una receta activa debe tener al menos un insumo';
  end if;

  insert into public.modifier_inventory_recipes(
    modifier_id,
    is_enabled,
    created_by,
    updated_by
  )
  values (
    p_modifier_id,
    coalesce(
      p_enabled,
      false
    ),
    v_user_id,
    v_user_id
  )
  on conflict(modifier_id)
  do update set
    is_enabled =
      excluded.is_enabled,
    updated_by =
      excluded.updated_by,
    updated_at =
      now()
  returning id
  into v_recipe_id;

  delete from public.modifier_inventory_recipe_items
  where recipe_id =
    v_recipe_id;

  for v_item in
    select value
    from jsonb_array_elements(
      p_items
    )
  loop
    begin
      v_inventory_item_id :=
        nullif(
          trim(
            v_item ->>
            'inventoryItemId'
          ),
          ''
        )::uuid;
    exception
      when others then
        raise exception
          'Uno de los insumos tiene un identificador inválido';
    end;

    v_quantity :=
      round(
        coalesce(
          nullif(
            trim(
              v_item ->>
              'quantity'
            ),
            ''
          )::numeric,
          0
        ),
        3
      );

    if
      v_inventory_item_id is null
    then
      raise exception
        'Todos los renglones deben tener un insumo';
    end if;

    if
      v_inventory_item_id =
      any(v_seen)
    then
      raise exception
        'Un insumo no puede repetirse en la misma receta';
    end if;

    v_seen :=
      array_append(
        v_seen,
        v_inventory_item_id
      );

    if not exists (
      select 1
      from public.inventory_items
      where id =
        v_inventory_item_id
    ) then
      raise exception
        'Uno de los insumos ya no existe';
    end if;

    if v_quantity <= 0 then
      raise exception
        'La cantidad de cada insumo debe ser mayor a 0';
    end if;

    insert into public.modifier_inventory_recipe_items(
      recipe_id,
      inventory_item_id,
      quantity
    )
    values (
      v_recipe_id,
      v_inventory_item_id,
      v_quantity
    );
  end loop;

  return jsonb_build_object(
    'ok',
    true,
    'recipeId',
    v_recipe_id
  );
end;
$$;

revoke all
on function public.save_modifier_inventory_recipe_admin(
  uuid,
  boolean,
  jsonb
)
from public;

grant execute
on function public.save_modifier_inventory_recipe_admin(
  uuid,
  boolean,
  jsonb
)
to authenticated;

-- ------------------------------------------------------------
-- Extiende el consumo automático de la Fase 3:
-- producto + componentes + modificadores de ambos niveles
-- ------------------------------------------------------------

create or replace function public.consume_order_inventory(
  p_order_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_status text;
  v_user_id uuid;
  v_consumption record;
  v_item public.inventory_items%rowtype;
  v_stock_after numeric(14,3);
  v_consumed_count integer := 0;
begin
  if p_order_id is null then
    raise exception
      'La orden es obligatoria';
  end if;

  select o.status::text
  into v_status
  from public.orders o
  where o.id =
    p_order_id
  for update;

  if v_status is null then
    raise exception
      'La orden no existe';
  end if;

  if v_status <> 'delivered' then
    raise exception
      'El inventario sólo puede consumirse para una orden entregada';
  end if;

  v_user_id :=
    auth.uid();

  for v_consumption in
    with direct_product_consumption as (
      select
        ri.inventory_item_id,
        sum(
          ri.quantity *
          oi.quantity
        )::numeric(14,3)
          as quantity_consumed
      from public.order_items oi
      join public.product_inventory_recipes r
        on r.product_id =
          oi.product_id
       and r.is_enabled = true
      join public.product_inventory_recipe_items ri
        on ri.recipe_id =
          r.id
      where oi.order_id =
        p_order_id
      group by
        ri.inventory_item_id
    ),

    component_product_consumption as (
      select
        ri.inventory_item_id,
        sum(
          ri.quantity *
          oi.quantity *
          c.quantity
        )::numeric(14,3)
          as quantity_consumed
      from public.order_items oi
      join public.order_item_components c
        on c.order_item_id =
          oi.id
      join public.product_inventory_recipes r
        on r.product_id =
          c.product_id
       and r.is_enabled = true
      join public.product_inventory_recipe_items ri
        on ri.recipe_id =
          r.id
      where oi.order_id =
        p_order_id
      group by
        ri.inventory_item_id
    ),

    direct_modifier_consumption as (
      select
        ri.inventory_item_id,
        sum(
          ri.quantity *
          oi.quantity
        )::numeric(14,3)
          as quantity_consumed
      from public.order_items oi
      join public.order_item_modifiers oim
        on oim.order_item_id =
          oi.id
      join public.modifier_inventory_recipes r
        on r.modifier_id =
          oim.modifier_id
       and r.is_enabled = true
      join public.modifier_inventory_recipe_items ri
        on ri.recipe_id =
          r.id
      where oi.order_id =
        p_order_id
      group by
        ri.inventory_item_id
    ),

    component_modifier_consumption as (
      select
        ri.inventory_item_id,
        sum(
          ri.quantity *
          oi.quantity *
          c.quantity
        )::numeric(14,3)
          as quantity_consumed
      from public.order_items oi
      join public.order_item_components c
        on c.order_item_id =
          oi.id
      join public.order_item_component_modifiers oicm
        on oicm.order_item_component_id =
          c.id
      join public.modifier_inventory_recipes r
        on r.modifier_id =
          oicm.modifier_id
       and r.is_enabled = true
      join public.modifier_inventory_recipe_items ri
        on ri.recipe_id =
          r.id
      where oi.order_id =
        p_order_id
      group by
        ri.inventory_item_id
    ),

    combined as (
      select *
      from direct_product_consumption

      union all

      select *
      from component_product_consumption

      union all

      select *
      from direct_modifier_consumption

      union all

      select *
      from component_modifier_consumption
    )

    select
      inventory_item_id,
      round(
        sum(
          quantity_consumed
        ),
        3
      )::numeric(14,3)
        as quantity_consumed
    from combined
    group by
      inventory_item_id
    having
      sum(
        quantity_consumed
      ) > 0
    order by
      inventory_item_id
  loop
    if exists (
      select 1
      from public.order_inventory_consumptions e
      where e.order_id =
        p_order_id
        and e.inventory_item_id =
          v_consumption.inventory_item_id
    ) then
      continue;
    end if;

    select *
    into v_item
    from public.inventory_items
    where id =
      v_consumption.inventory_item_id
    for update;

    if v_item.id is null then
      raise exception
        'Un insumo de la receta ya no existe';
    end if;

    v_stock_after :=
      round(
        v_item.current_stock -
        v_consumption.quantity_consumed,
        3
      );

    insert into public.order_inventory_consumptions(
      order_id,
      inventory_item_id,
      quantity_consumed,
      stock_before,
      stock_after,
      consumed_by
    )
    values (
      p_order_id,
      v_item.id,
      v_consumption.quantity_consumed,
      v_item.current_stock,
      v_stock_after,
      v_user_id
    );

    update public.inventory_items
    set
      current_stock =
        v_stock_after,
      updated_at =
        now()
    where id =
      v_item.id;

    insert into public.inventory_movements(
      inventory_item_id,
      movement_type,
      quantity_delta,
      stock_before,
      stock_after,
      reason,
      created_by
    )
    values (
      v_item.id,
      'sale',
      -v_consumption.quantity_consumed,
      v_item.current_stock,
      v_stock_after,
      'Venta · Orden #' ||
        upper(
          right(
            p_order_id::text,
            6
          )
        ),
      v_user_id
    );

    v_consumed_count :=
      v_consumed_count + 1;
  end loop;

  return jsonb_build_object(
    'ok',
    true,
    'orderId',
    p_order_id,
    'inventoryItemsConsumed',
    v_consumed_count
  );
end;
$$;

revoke all
on function public.consume_order_inventory(uuid)
from public;
