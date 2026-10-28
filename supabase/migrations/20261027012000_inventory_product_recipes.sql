-- ============================================================
-- DORIAN POS
-- INVENTARIO E INSUMOS - FASE 2
-- Recetas de inventario por producto
-- ============================================================

create table if not exists public.product_inventory_recipes (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null unique
    references public.products(id)
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

create table if not exists public.product_inventory_recipe_items (
  id uuid primary key default gen_random_uuid(),
  recipe_id uuid not null
    references public.product_inventory_recipes(id)
    on delete cascade,
  inventory_item_id uuid not null
    references public.inventory_items(id)
    on delete restrict,
  quantity numeric(14,3) not null
    check (quantity > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint product_inventory_recipe_item_unique
    unique (
      recipe_id,
      inventory_item_id
    )
);

create index if not exists idx_product_inventory_recipes_product
on public.product_inventory_recipes (
  product_id
);

create index if not exists idx_product_inventory_recipe_items_recipe
on public.product_inventory_recipe_items (
  recipe_id
);

create index if not exists idx_product_inventory_recipe_items_inventory
on public.product_inventory_recipe_items (
  inventory_item_id
);

alter table public.product_inventory_recipes
  enable row level security;

alter table public.product_inventory_recipe_items
  enable row level security;

drop policy if exists product_inventory_recipes_authenticated_read
on public.product_inventory_recipes;

create policy product_inventory_recipes_authenticated_read
on public.product_inventory_recipes
for select
to authenticated
using (true);

drop policy if exists product_inventory_recipe_items_authenticated_read
on public.product_inventory_recipe_items;

create policy product_inventory_recipe_items_authenticated_read
on public.product_inventory_recipe_items
for select
to authenticated
using (true);

create or replace function public.get_product_inventory_recipe_admin(
  p_product_id uuid
)
returns table (
  product_id uuid,
  enabled boolean,
  inventory_item_id uuid,
  inventory_item_name text,
  base_unit text,
  quantity numeric,
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
    from public.products
    where id = p_product_id
  ) then
    raise exception
      'El producto no existe';
  end if;

  select
    recipe.id,
    recipe.is_enabled
  into
    v_recipe_id,
    v_enabled
  from public.product_inventory_recipes recipe
  where recipe.product_id =
    p_product_id;

  if v_recipe_id is null then
    return;
  end if;

  if not exists (
    select 1
    from public.product_inventory_recipe_items
    where recipe_id =
      v_recipe_id
  ) then
    return query
    select
      p_product_id,
      v_enabled,
      null::uuid,
      null::text,
      null::text,
      null::numeric,
      null::boolean;

    return;
  end if;

  return query
  select
    p_product_id,
    v_enabled,
    item.id,
    item.name,
    item.base_unit,
    recipe_item.quantity,
    item.is_active
  from public.product_inventory_recipe_items recipe_item
  join public.inventory_items item
    on item.id =
      recipe_item.inventory_item_id
  where recipe_item.recipe_id =
    v_recipe_id
  order by item.name;
end;
$$;

revoke all
on function public.get_product_inventory_recipe_admin(uuid)
from public;

grant execute
on function public.get_product_inventory_recipe_admin(uuid)
to authenticated;

create or replace function public.save_product_inventory_recipe_admin(
  p_product_id uuid,
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
  v_seen_ids uuid[] :=
    array[]::uuid[];
begin
  v_user_id :=
    public.require_inventory_admin();

  if not exists (
    select 1
    from public.products
    where id = p_product_id
  ) then
    raise exception
      'El producto no existe';
  end if;

  if
    p_items is null or
    jsonb_typeof(p_items) <>
      'array'
  then
    raise exception
      'Los insumos de la receta deben ser un arreglo';
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

  insert into public.product_inventory_recipes (
    product_id,
    is_enabled,
    created_by,
    updated_by
  )
  values (
    p_product_id,
    coalesce(
      p_enabled,
      false
    ),
    v_user_id,
    v_user_id
  )
  on conflict (
    product_id
  )
  do update
  set
    is_enabled =
      excluded.is_enabled,
    updated_by =
      v_user_id,
    updated_at =
      now()
  returning id
  into v_recipe_id;

  delete from public.product_inventory_recipe_items
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
      any(v_seen_ids)
    then
      raise exception
        'Un insumo no puede repetirse dentro de la misma receta';
    end if;

    v_seen_ids :=
      array_append(
        v_seen_ids,
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

    insert into public.product_inventory_recipe_items (
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
on function public.save_product_inventory_recipe_admin(
  uuid,
  boolean,
  jsonb
)
from public;

grant execute
on function public.save_product_inventory_recipe_admin(
  uuid,
  boolean,
  jsonb
)
to authenticated;
