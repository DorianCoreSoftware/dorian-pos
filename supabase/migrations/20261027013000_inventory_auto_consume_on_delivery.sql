-- ============================================================
-- DORIAN POS
-- INVENTARIO E INSUMOS - FASE 3
-- Consumo automático al entregar una orden
-- Productos directos + componentes de combo
-- ============================================================

-- ------------------------------------------------------------
-- 1. Inventario puede quedar negativo por una venta real
-- ------------------------------------------------------------

alter table public.inventory_items
  drop constraint if exists inventory_items_current_stock_check;

alter table public.inventory_movements
  drop constraint if exists inventory_movements_stock_before_check;

alter table public.inventory_movements
  drop constraint if exists inventory_movements_stock_after_check;

alter table public.inventory_movements
  drop constraint if exists inventory_movements_movement_type_check;

alter table public.inventory_movements
  add constraint inventory_movements_movement_type_check
  check (
    movement_type in (
      'initial',
      'entry',
      'exit',
      'adjustment',
      'waste',
      'sale'
    )
  );

-- ------------------------------------------------------------
-- 2. Trazabilidad idempotente por orden e insumo
-- ------------------------------------------------------------

create table if not exists public.order_inventory_consumptions (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null
    references public.orders(id)
    on delete restrict,
  inventory_item_id uuid not null
    references public.inventory_items(id)
    on delete restrict,
  quantity_consumed numeric(14,3) not null
    check (quantity_consumed > 0),
  stock_before numeric(14,3) not null,
  stock_after numeric(14,3) not null,
  consumed_by uuid
    references public.profiles(id)
    on delete set null,
  consumed_at timestamptz not null default now(),
  constraint order_inventory_consumptions_unique
    unique (
      order_id,
      inventory_item_id
    ),
  constraint order_inventory_consumptions_stock_math
    check (
      round(
        stock_before - quantity_consumed,
        3
      ) = round(
        stock_after,
        3
      )
    )
);

create index if not exists idx_order_inventory_consumptions_order
on public.order_inventory_consumptions (
  order_id
);

create index if not exists idx_order_inventory_consumptions_inventory
on public.order_inventory_consumptions (
  inventory_item_id,
  consumed_at desc
);

alter table public.order_inventory_consumptions
  enable row level security;

drop policy if exists order_inventory_consumptions_authenticated_read
on public.order_inventory_consumptions;

create policy order_inventory_consumptions_authenticated_read
on public.order_inventory_consumptions
for select
to authenticated
using (true);

-- ------------------------------------------------------------
-- 3. Movimiento manual: permitir entradas que corrijan negativos
-- ------------------------------------------------------------

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

  -- Una salida, merma o ajuste negativo manual nunca puede
  -- empeorar un stock hasta dejarlo por debajo de cero.
  -- Las entradas y ajustes positivos sí pueden recuperar un
  -- stock negativo generado por ventas.
  if
    v_after < 0
    and v_delta < 0
  then
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

-- ------------------------------------------------------------
-- 4. Consumir recetas de una orden entregada
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
  v_consumption_id uuid;
  v_consumed_count integer := 0;
begin
  if p_order_id is null then
    raise exception 'La orden es obligatoria';
  end if;

  select o.status::text
  into v_status
  from public.orders o
  where o.id = p_order_id
  for update;

  if v_status is null then
    raise exception 'La orden no existe';
  end if;

  if v_status <> 'delivered' then
    raise exception
      'El inventario sólo puede consumirse para una orden entregada';
  end if;

  v_user_id := auth.uid();

  /*
   * Se suman dos fuentes:
   *
   * 1. Producto principal de cada order_item.
   * 2. Productos elegidos como componentes de combo.
   *
   * Para un combo, la receta del producto padre puede representar
   * empaque/servilletas/etc. y las recetas de sus componentes
   * representan el alimento/bebida elegido.
   */
  for v_consumption in
    with direct_consumption as (
      select
        recipe_item.inventory_item_id,
        sum(
          recipe_item.quantity *
          order_item.quantity
        )::numeric(14,3)
          as quantity_consumed
      from public.order_items order_item
      join public.product_inventory_recipes recipe
        on recipe.product_id =
          order_item.product_id
       and recipe.is_enabled = true
      join public.product_inventory_recipe_items recipe_item
        on recipe_item.recipe_id =
          recipe.id
      where order_item.order_id =
        p_order_id
      group by
        recipe_item.inventory_item_id
    ),
    component_consumption as (
      select
        recipe_item.inventory_item_id,
        sum(
          recipe_item.quantity *
          order_item.quantity *
          component.quantity
        )::numeric(14,3)
          as quantity_consumed
      from public.order_items order_item
      join public.order_item_components component
        on component.order_item_id =
          order_item.id
      join public.product_inventory_recipes recipe
        on recipe.product_id =
          component.product_id
       and recipe.is_enabled = true
      join public.product_inventory_recipe_items recipe_item
        on recipe_item.recipe_id =
          recipe.id
      where order_item.order_id =
        p_order_id
      group by
        recipe_item.inventory_item_id
    ),
    combined as (
      select *
      from direct_consumption

      union all

      select *
      from component_consumption
    )
    select
      inventory_item_id,
      round(
        sum(quantity_consumed),
        3
      )::numeric(14,3)
        as quantity_consumed
    from combined
    group by inventory_item_id
    having sum(quantity_consumed) > 0
    order by inventory_item_id
  loop
    /*
     * Idempotencia:
     * si esta orden ya consumió este insumo, no se vuelve
     * a descontar aunque la orden regrese accidentalmente
     * a otro estado y luego otra vez a delivered.
     */
    if exists (
      select 1
      from public.order_inventory_consumptions existing
      where existing.order_id =
        p_order_id
        and existing.inventory_item_id =
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

    insert into public.order_inventory_consumptions (
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
    )
    returning id
    into v_consumption_id;

    update public.inventory_items
    set
      current_stock =
        v_stock_after,
      updated_at =
        now()
    where id =
      v_item.id;

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

-- ------------------------------------------------------------
-- 5. Trigger único para cualquier flujo que entregue una orden
-- ------------------------------------------------------------

create or replace function public.consume_inventory_when_order_delivered()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if
    new.status::text = 'delivered'
    and old.status::text is distinct from 'delivered'
  then
    perform public.consume_order_inventory(
      new.id
    );
  end if;

  return new;
end;
$$;

drop trigger if exists trg_consume_inventory_when_order_delivered
on public.orders;

create trigger trg_consume_inventory_when_order_delivered
after update of status
on public.orders
for each row
when (
  new.status::text = 'delivered'
  and old.status::text is distinct from 'delivered'
)
execute function public.consume_inventory_when_order_delivered();

-- ------------------------------------------------------------
-- 6. Historial admin: incluir ventas automáticas
-- ------------------------------------------------------------

-- La RPC existente ya devuelve movement_type de forma genérica,
-- por lo que no necesita redefinirse para mostrar "sale".
