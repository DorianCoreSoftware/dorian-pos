-- ============================================================
-- DORIAN POS
-- INVENTARIO E INSUMOS - FASE 1
-- Catálogo + existencias + movimientos auditables
-- ============================================================

create table if not exists public.inventory_items (
  id uuid primary key default gen_random_uuid(),
  sku text,
  name text not null,
  base_unit text not null
    check (base_unit in ('g', 'ml', 'piece')),
  current_stock numeric(14,3) not null default 0
    check (current_stock >= 0),
  minimum_stock numeric(14,3) not null default 0
    check (minimum_stock >= 0),
  is_active boolean not null default true,
  notes text not null default '',
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint inventory_items_name_not_blank
    check (length(trim(name)) > 0),
  constraint inventory_items_notes_length
    check (length(notes) <= 500)
);

create unique index if not exists uq_inventory_items_name_ci
on public.inventory_items (lower(trim(name)));

create unique index if not exists uq_inventory_items_sku_ci
on public.inventory_items (lower(trim(sku)))
where sku is not null and length(trim(sku)) > 0;

create index if not exists idx_inventory_items_active_name
on public.inventory_items (is_active, name);

create index if not exists idx_inventory_items_low_stock
on public.inventory_items (is_active, current_stock, minimum_stock);

create table if not exists public.inventory_movements (
  id uuid primary key default gen_random_uuid(),
  inventory_item_id uuid not null
    references public.inventory_items(id)
    on delete restrict,
  movement_type text not null
    check (
      movement_type in (
        'initial',
        'entry',
        'exit',
        'adjustment',
        'waste'
      )
    ),
  quantity_delta numeric(14,3) not null
    check (quantity_delta <> 0),
  stock_before numeric(14,3) not null
    check (stock_before >= 0),
  stock_after numeric(14,3) not null
    check (stock_after >= 0),
  reason text not null,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  constraint inventory_movements_reason_not_blank
    check (length(trim(reason)) > 0),
  constraint inventory_movements_reason_length
    check (length(reason) <= 300),
  constraint inventory_movements_stock_math
    check (
      round(
        stock_before + quantity_delta,
        3
      ) = round(
        stock_after,
        3
      )
    )
);

create index if not exists idx_inventory_movements_item_created
on public.inventory_movements (
  inventory_item_id,
  created_at desc
);

create index if not exists idx_inventory_movements_created
on public.inventory_movements (
  created_at desc
);

alter table public.inventory_items
  enable row level security;

alter table public.inventory_movements
  enable row level security;

drop policy if exists inventory_items_authenticated_read
on public.inventory_items;

create policy inventory_items_authenticated_read
on public.inventory_items
for select
to authenticated
using (true);

drop policy if exists inventory_movements_authenticated_read
on public.inventory_movements;

create policy inventory_movements_authenticated_read
on public.inventory_movements
for select
to authenticated
using (true);

-- No se crean políticas de INSERT / UPDATE / DELETE:
-- los cambios administrativos pasan exclusivamente por RPC.

create or replace function public.require_inventory_admin()
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid;
begin
  v_user_id := auth.uid();

  if v_user_id is null then
    raise exception 'Usuario no autenticado';
  end if;

  if not exists (
    select 1
    from public.profiles
    where id = v_user_id
      and is_active = true
      and role::text = 'admin'
  ) then
    raise exception 'Solo un administrador puede modificar el inventario';
  end if;

  return v_user_id;
end;
$$;

revoke all
on function public.require_inventory_admin()
from public;

grant execute
on function public.require_inventory_admin()
to authenticated;

create or replace function public.create_inventory_item_admin(
  p_name text,
  p_sku text,
  p_base_unit text,
  p_initial_stock numeric,
  p_minimum_stock numeric,
  p_notes text
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid;
  v_item_id uuid;
  v_name text;
  v_sku text;
  v_notes text;
  v_initial_stock numeric(14,3);
  v_minimum_stock numeric(14,3);
begin
  v_user_id := public.require_inventory_admin();

  v_name := trim(coalesce(p_name, ''));
  v_sku := nullif(trim(coalesce(p_sku, '')), '');
  v_notes := trim(coalesce(p_notes, ''));
  v_initial_stock := round(coalesce(p_initial_stock, 0), 3);
  v_minimum_stock := round(coalesce(p_minimum_stock, 0), 3);

  if v_name = '' then
    raise exception 'El nombre del insumo es obligatorio';
  end if;

  if length(v_name) > 100 then
    raise exception 'El nombre no puede superar 100 caracteres';
  end if;

  if v_sku is not null and length(v_sku) > 50 then
    raise exception 'El SKU no puede superar 50 caracteres';
  end if;

  if p_base_unit not in ('g', 'ml', 'piece') then
    raise exception 'La unidad base no es válida';
  end if;

  if v_initial_stock < 0 then
    raise exception 'La existencia inicial no puede ser negativa';
  end if;

  if v_minimum_stock < 0 then
    raise exception 'El stock mínimo no puede ser negativo';
  end if;

  if length(v_notes) > 500 then
    raise exception 'Las notas no pueden superar 500 caracteres';
  end if;

  insert into public.inventory_items (
    sku,
    name,
    base_unit,
    current_stock,
    minimum_stock,
    is_active,
    notes,
    created_by
  )
  values (
    v_sku,
    v_name,
    p_base_unit,
    v_initial_stock,
    v_minimum_stock,
    true,
    v_notes,
    v_user_id
  )
  returning id
  into v_item_id;

  if v_initial_stock > 0 then
    insert into public.inventory_movements (
      inventory_item_id,
      movement_type,
      quantity_delta,
      stock_before,
      stock_after,
      reason,
      created_by
    )
    values (
      v_item_id,
      'initial',
      v_initial_stock,
      0,
      v_initial_stock,
      'Existencia inicial',
      v_user_id
    );
  end if;

  return v_item_id;
exception
  when unique_violation then
    raise exception
      'Ya existe un insumo con ese nombre o SKU';
end;
$$;

revoke all
on function public.create_inventory_item_admin(
  text,
  text,
  text,
  numeric,
  numeric,
  text
)
from public;

grant execute
on function public.create_inventory_item_admin(
  text,
  text,
  text,
  numeric,
  numeric,
  text
)
to authenticated;

create or replace function public.update_inventory_item_admin(
  p_item_id uuid,
  p_name text,
  p_sku text,
  p_base_unit text,
  p_minimum_stock numeric,
  p_notes text
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_name text;
  v_sku text;
  v_notes text;
  v_minimum_stock numeric(14,3);
  v_existing_unit text;
begin
  perform public.require_inventory_admin();

  v_name := trim(coalesce(p_name, ''));
  v_sku := nullif(trim(coalesce(p_sku, '')), '');
  v_notes := trim(coalesce(p_notes, ''));
  v_minimum_stock := round(coalesce(p_minimum_stock, 0), 3);

  if v_name = '' then
    raise exception 'El nombre del insumo es obligatorio';
  end if;

  if length(v_name) > 100 then
    raise exception 'El nombre no puede superar 100 caracteres';
  end if;

  if v_sku is not null and length(v_sku) > 50 then
    raise exception 'El SKU no puede superar 50 caracteres';
  end if;

  if p_base_unit not in ('g', 'ml', 'piece') then
    raise exception 'La unidad base no es válida';
  end if;

  if v_minimum_stock < 0 then
    raise exception 'El stock mínimo no puede ser negativo';
  end if;

  if length(v_notes) > 500 then
    raise exception 'Las notas no pueden superar 500 caracteres';
  end if;

  select base_unit
  into v_existing_unit
  from public.inventory_items
  where id = p_item_id
  for update;

  if v_existing_unit is null then
    raise exception 'El insumo no existe';
  end if;

  if
    v_existing_unit <> p_base_unit
    and exists (
      select 1
      from public.inventory_movements
      where inventory_item_id = p_item_id
    )
  then
    raise exception
      'No puedes cambiar la unidad base de un insumo que ya tiene movimientos';
  end if;

  update public.inventory_items
  set
    sku = v_sku,
    name = v_name,
    base_unit = p_base_unit,
    minimum_stock = v_minimum_stock,
    notes = v_notes,
    updated_at = now()
  where id = p_item_id;
exception
  when unique_violation then
    raise exception
      'Ya existe un insumo con ese nombre o SKU';
end;
$$;

revoke all
on function public.update_inventory_item_admin(
  uuid,
  text,
  text,
  text,
  numeric,
  text
)
from public;

grant execute
on function public.update_inventory_item_admin(
  uuid,
  text,
  text,
  text,
  numeric,
  text
)
to authenticated;

create or replace function public.set_inventory_item_active_admin(
  p_item_id uuid,
  p_is_active boolean
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  perform public.require_inventory_admin();

  update public.inventory_items
  set
    is_active = coalesce(
      p_is_active,
      false
    ),
    updated_at = now()
  where id = p_item_id;

  if not found then
    raise exception 'El insumo no existe';
  end if;
end;
$$;

revoke all
on function public.set_inventory_item_active_admin(
  uuid,
  boolean
)
from public;

grant execute
on function public.set_inventory_item_active_admin(
  uuid,
  boolean
)
to authenticated;

create or replace function public.register_inventory_movement_admin(
  p_item_id uuid,
  p_movement_type text,
  p_quantity numeric,
  p_reason text
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid;
  v_item public.inventory_items%rowtype;
  v_requested_quantity numeric(14,3);
  v_delta numeric(14,3);
  v_after numeric(14,3);
  v_reason text;
begin
  v_user_id := public.require_inventory_admin();

  if p_movement_type not in (
    'entry',
    'exit',
    'adjustment',
    'waste'
  ) then
    raise exception 'El tipo de movimiento no es válido';
  end if;

  v_requested_quantity :=
    round(
      coalesce(
        p_quantity,
        0
      ),
      3
    );

  if v_requested_quantity = 0 then
    raise exception 'La cantidad debe ser distinta de 0';
  end if;

  if
    p_movement_type <> 'adjustment'
    and v_requested_quantity < 0
  then
    raise exception
      'La cantidad debe ser mayor a 0 para este tipo de movimiento';
  end if;

  v_reason :=
    trim(
      coalesce(
        p_reason,
        ''
      )
    );

  if v_reason = '' then
    raise exception 'El motivo es obligatorio';
  end if;

  if length(v_reason) > 300 then
    raise exception 'El motivo no puede superar 300 caracteres';
  end if;

  select *
  into v_item
  from public.inventory_items
  where id = p_item_id
  for update;

  if v_item.id is null then
    raise exception 'El insumo no existe';
  end if;

  if not v_item.is_active then
    raise exception
      'No puedes registrar movimientos sobre un insumo inactivo';
  end if;

  v_delta :=
    case p_movement_type
      when 'entry'
        then abs(v_requested_quantity)
      when 'exit'
        then -abs(v_requested_quantity)
      when 'waste'
        then -abs(v_requested_quantity)
      else v_requested_quantity
    end;

  v_after :=
    round(
      v_item.current_stock +
      v_delta,
      3
    );

  if v_after < 0 then
    raise exception
      'El movimiento dejaría una existencia negativa. Stock actual: %',
      v_item.current_stock;
  end if;

  update public.inventory_items
  set
    current_stock = v_after,
    updated_at = now()
  where id = v_item.id;

  insert into public.inventory_movements (
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
    p_movement_type,
    v_delta,
    v_item.current_stock,
    v_after,
    v_reason,
    v_user_id
  );

  return jsonb_build_object(
    'ok', true,
    'itemId', v_item.id,
    'stockBefore', v_item.current_stock,
    'quantityDelta', v_delta,
    'stockAfter', v_after
  );
end;
$$;

revoke all
on function public.register_inventory_movement_admin(
  uuid,
  text,
  numeric,
  text
)
from public;

grant execute
on function public.register_inventory_movement_admin(
  uuid,
  text,
  numeric,
  text
)
to authenticated;

create or replace function public.get_inventory_movements_admin(
  p_limit integer default 100
)
returns table (
  id uuid,
  inventory_item_id uuid,
  item_name text,
  base_unit text,
  movement_type text,
  quantity_delta numeric,
  stock_before numeric,
  stock_after numeric,
  reason text,
  created_by uuid,
  created_by_name text,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_limit integer;
begin
  perform public.require_inventory_admin();

  v_limit :=
    greatest(
      1,
      least(
        coalesce(
          p_limit,
          100
        ),
        500
      )
    );

  return query
  select
    movement.id,
    movement.inventory_item_id,
    item.name,
    item.base_unit,
    movement.movement_type,
    movement.quantity_delta,
    movement.stock_before,
    movement.stock_after,
    movement.reason,
    movement.created_by,
    null::text as created_by_name,
    movement.created_at
  from public.inventory_movements movement
  join public.inventory_items item
    on item.id =
      movement.inventory_item_id
  order by movement.created_at desc
  limit v_limit;
end;
$$;

revoke all
on function public.get_inventory_movements_admin(integer)
from public;

grant execute
on function public.get_inventory_movements_admin(integer)
to authenticated;
