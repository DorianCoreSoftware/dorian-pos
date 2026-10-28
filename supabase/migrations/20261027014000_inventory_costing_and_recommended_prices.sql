-- ============================================================
-- DORIAN POS
-- INVENTARIO / COSTEO - FASE 4-6
-- Costos de insumos + costo de recetas + precio recomendado
-- ============================================================

-- 1. Costos por insumo
alter table public.inventory_items
  add column if not exists purchase_cost numeric(14,4) not null default 0
    check (purchase_cost >= 0);

alter table public.inventory_items
  add column if not exists purchase_base_quantity numeric(14,3) not null default 1
    check (purchase_base_quantity > 0);

alter table public.inventory_items
  add column if not exists unit_cost numeric(16,6) not null default 0
    check (unit_cost >= 0);

alter table public.inventory_items
  add column if not exists cost_updated_at timestamptz;

create table if not exists public.inventory_item_cost_history (
  id uuid primary key default gen_random_uuid(),
  inventory_item_id uuid not null
    references public.inventory_items(id)
    on delete restrict,
  purchase_cost numeric(14,4) not null
    check (purchase_cost >= 0),
  purchase_base_quantity numeric(14,3) not null
    check (purchase_base_quantity > 0),
  unit_cost numeric(16,6) not null
    check (unit_cost >= 0),
  reason text not null default '',
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists idx_inventory_cost_history_item_created
on public.inventory_item_cost_history(
  inventory_item_id,
  created_at desc
);

alter table public.inventory_item_cost_history
  enable row level security;

drop policy if exists inventory_item_cost_history_authenticated_read
on public.inventory_item_cost_history;

create policy inventory_item_cost_history_authenticated_read
on public.inventory_item_cost_history
for select
to authenticated
using (true);

-- 2. Configuración global
create table if not exists public.inventory_costing_settings (
  id smallint primary key default 1 check (id = 1),
  target_food_cost_percent numeric(5,2) not null default 35
    check (
      target_food_cost_percent > 0
      and target_food_cost_percent < 100
    ),
  rounding_step numeric(10,2) not null default 5
    check (rounding_step > 0),
  updated_by uuid references public.profiles(id) on delete set null,
  updated_at timestamptz not null default now()
);

insert into public.inventory_costing_settings(id)
values (1)
on conflict (id) do nothing;

alter table public.inventory_costing_settings
  enable row level security;

drop policy if exists inventory_costing_settings_authenticated_read
on public.inventory_costing_settings;

create policy inventory_costing_settings_authenticated_read
on public.inventory_costing_settings
for select
to authenticated
using (true);

-- 3. Configuración de precio por producto
create table if not exists public.product_pricing_settings (
  product_id uuid primary key
    references public.products(id)
    on delete cascade,
  pricing_mode text not null default 'manual'
    check (
      pricing_mode in (
        'manual',
        'recommended'
      )
    ),
  updated_by uuid references public.profiles(id) on delete set null,
  updated_at timestamptz not null default now()
);

alter table public.product_pricing_settings
  enable row level security;

drop policy if exists product_pricing_settings_authenticated_read
on public.product_pricing_settings;

create policy product_pricing_settings_authenticated_read
on public.product_pricing_settings
for select
to authenticated
using (true);

-- 4. RPC costo insumo
create or replace function public.set_inventory_item_cost_admin(
  p_item_id uuid,
  p_purchase_cost numeric,
  p_purchase_base_quantity numeric,
  p_reason text
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid;
  v_cost numeric(14,4);
  v_qty numeric(14,3);
  v_unit_cost numeric(16,6);
  v_reason text;
begin
  v_user_id :=
    public.require_inventory_admin();

  v_cost :=
    round(
      coalesce(
        p_purchase_cost,
        0
      ),
      4
    );

  v_qty :=
    round(
      coalesce(
        p_purchase_base_quantity,
        0
      ),
      3
    );

  if v_cost < 0 then
    raise exception
      'El costo de compra no puede ser negativo';
  end if;

  if v_qty <= 0 then
    raise exception
      'El contenido de la presentación debe ser mayor a 0';
  end if;

  v_unit_cost :=
    round(
      v_cost / v_qty,
      6
    );

  v_reason :=
    trim(
      coalesce(
        p_reason,
        ''
      )
    );

  update public.inventory_items
  set
    purchase_cost =
      v_cost,
    purchase_base_quantity =
      v_qty,
    unit_cost =
      v_unit_cost,
    cost_updated_at =
      now(),
    updated_at =
      now()
  where id =
    p_item_id;

  if not found then
    raise exception
      'El insumo no existe';
  end if;

  insert into public.inventory_item_cost_history(
    inventory_item_id,
    purchase_cost,
    purchase_base_quantity,
    unit_cost,
    reason,
    created_by
  )
  values (
    p_item_id,
    v_cost,
    v_qty,
    v_unit_cost,
    v_reason,
    v_user_id
  );

  return jsonb_build_object(
    'ok', true,
    'unitCost', v_unit_cost
  );
end;
$$;

revoke all
on function public.set_inventory_item_cost_admin(
  uuid,
  numeric,
  numeric,
  text
)
from public;

grant execute
on function public.set_inventory_item_cost_admin(
  uuid,
  numeric,
  numeric,
  text
)
to authenticated;

-- 5. Configuración global RPC
create or replace function public.get_inventory_costing_settings_admin()
returns table(
  target_food_cost_percent numeric,
  rounding_step numeric
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  perform public.require_inventory_admin();

  return query
  select
    s.target_food_cost_percent,
    s.rounding_step
  from public.inventory_costing_settings s
  where s.id = 1;
end;
$$;

revoke all
on function public.get_inventory_costing_settings_admin()
from public;

grant execute
on function public.get_inventory_costing_settings_admin()
to authenticated;

create or replace function public.save_inventory_costing_settings_admin(
  p_target_food_cost_percent numeric,
  p_rounding_step numeric
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid;
begin
  v_user_id :=
    public.require_inventory_admin();

  if
    p_target_food_cost_percent <= 0
    or p_target_food_cost_percent >= 100
  then
    raise exception
      'El food cost objetivo debe estar entre 0 y 100';
  end if;

  if p_rounding_step <= 0 then
    raise exception
      'El múltiplo de redondeo debe ser mayor a 0';
  end if;

  insert into public.inventory_costing_settings(
    id,
    target_food_cost_percent,
    rounding_step,
    updated_by,
    updated_at
  )
  values (
    1,
    round(
      p_target_food_cost_percent,
      2
    ),
    round(
      p_rounding_step,
      2
    ),
    v_user_id,
    now()
  )
  on conflict(id)
  do update set
    target_food_cost_percent =
      excluded.target_food_cost_percent,
    rounding_step =
      excluded.rounding_step,
    updated_by =
      excluded.updated_by,
    updated_at =
      now();
end;
$$;

revoke all
on function public.save_inventory_costing_settings_admin(
  numeric,
  numeric
)
from public;

grant execute
on function public.save_inventory_costing_settings_admin(
  numeric,
  numeric
)
to authenticated;

-- 6. Motor de costeo y recomendación
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
declare
  v_recipe_cost numeric(16,4);
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

  select
    coalesce(
      sum(
        ri.quantity *
        ii.unit_cost
      ),
      0
    )
  into v_recipe_cost
  from public.product_inventory_recipes r
  join public.product_inventory_recipe_items ri
    on ri.recipe_id =
      r.id
  join public.inventory_items ii
    on ii.id =
      ri.inventory_item_id
  where r.product_id =
    p_product_id
    and r.is_enabled = true;

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

  if v_recipe_cost <= 0 then
    v_recommended := 0;
  else
    v_recommended :=
      ceil(
        (
          v_recipe_cost /
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
      v_recipe_cost,
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
          v_recipe_cost /
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
            v_recipe_cost
          ) /
          v_price
        ) *
        100,
        2
      )
      else null
    end;
end;
$$;

revoke all
on function public.get_product_costing_admin(uuid)
from public;

grant execute
on function public.get_product_costing_admin(uuid)
to authenticated;

-- 7. Guardar modo de precio. Si es recomendado, aplica precio actual calculado.
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
    from public.get_product_costing_admin(
      p_product_id
    );

    if
      v_costing.recommended_price is not null
      and v_costing.recommended_price > 0
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

revoke all
on function public.save_product_pricing_mode_admin(
  uuid,
  text
)
from public;

grant execute
on function public.save_product_pricing_mode_admin(
  uuid,
  text
)
to authenticated;
