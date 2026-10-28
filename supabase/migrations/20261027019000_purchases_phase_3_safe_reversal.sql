-- ============================================================
-- DORIAN POS
-- COMPRAS Y PROVEEDORES - FASE 3
-- Reversa segura + trazabilidad + protección de egresos generados
-- ============================================================

-- ------------------------------------------------------------
-- 1. Egresos con origen
-- ------------------------------------------------------------

alter table public.business_expenses
  add column if not exists source_type text,
  add column if not exists source_id uuid;

create index if not exists business_expenses_source_idx
on public.business_expenses(
  source_type,
  source_id
);

update public.business_expenses e
set
  source_type = 'purchase',
  source_id = p.id
from public.purchases p
where p.expense_id = e.id
  and e.source_type is null;

create or replace function public.protect_generated_business_expense()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  if
    old.source_type is not null
    and coalesce(
      current_setting(
        'dorian.allow_generated_expense_mutation',
        true
      ),
      ''
    ) <> 'on'
  then
    raise exception
      'Este egreso fue generado automáticamente y debe corregirse desde su módulo de origen.';
  end if;

  if tg_op = 'DELETE' then
    return old;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_protect_generated_business_expense
on public.business_expenses;

create trigger trg_protect_generated_business_expense
before update or delete
on public.business_expenses
for each row
execute function public.protect_generated_business_expense();

-- ------------------------------------------------------------
-- 2. Compra revertida + snapshots completos
-- ------------------------------------------------------------

alter table public.purchases
  drop constraint if exists purchases_status_check;

alter table public.purchases
  add constraint purchases_status_check
  check (
    status in (
      'draft',
      'received',
      'cancelled',
      'reversed'
    )
  );

alter table public.purchases
  add column if not exists reversal_supported boolean not null default false,
  add column if not exists reversed_at timestamptz,
  add column if not exists reversed_by uuid
    references public.profiles(id)
    on delete set null,
  add column if not exists reversal_reason text,
  add column if not exists reversal_expense_id uuid;

alter table public.purchase_lines
  add column if not exists previous_purchase_cost numeric(14,4),
  add column if not exists previous_purchase_base_quantity numeric(14,3),
  add column if not exists previous_supplier_last_purchase_cost numeric(14,4),
  add column if not exists received_movement_id uuid
    references public.inventory_movements(id)
    on delete set null,
  add column if not exists received_cost_history_id uuid
    references public.inventory_item_cost_history(id)
    on delete set null,
  add column if not exists reversal_movement_id uuid
    references public.inventory_movements(id)
    on delete set null,
  add column if not exists reversed_at timestamptz;

-- ------------------------------------------------------------
-- 3. Movimiento específico de reversa de compra
-- ------------------------------------------------------------

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
      'sale',
      'purchase_reversal'
    )
  );

-- ------------------------------------------------------------
-- 4. Recepción V2 con snapshots reversibles
-- ------------------------------------------------------------

create or replace function public.receive_purchase_admin(
  p_purchase_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid;
  v_purchase public.purchases%rowtype;
  v_supplier_name text;
  v_line public.purchase_lines%rowtype;
  v_item public.inventory_items%rowtype;
  v_presentation public.supplier_inventory_presentations%rowtype;
  v_stock_before numeric(14,3);
  v_stock_after numeric(14,3);
  v_previous_unit_cost numeric(16,6);
  v_resulting_unit_cost numeric(16,6);
  v_existing_positive_qty numeric(14,3);
  v_existing_value numeric(18,6);
  v_received_value numeric(18,6);
  v_expense_category_id uuid;
  v_expense_id uuid;
  v_reason text;
  v_received_lines integer := 0;
  v_movement_id uuid;
  v_cost_history_id uuid;
begin
  v_user_id :=
    public.require_inventory_admin();

  select *
  into v_purchase
  from public.purchases p
  where p.id = p_purchase_id
  for update;

  if v_purchase.id is null then
    raise exception
      'La compra no existe';
  end if;

  if v_purchase.status <> 'draft' then
    raise exception
      'La compra ya fue recibida o cancelada';
  end if;

  if not exists (
    select 1
    from public.purchase_lines pl
    where pl.purchase_id = p_purchase_id
  ) then
    raise exception
      'La compra no tiene renglones';
  end if;

  select s.name
  into v_supplier_name
  from public.suppliers s
  where s.id = v_purchase.supplier_id;

  if v_supplier_name is null then
    raise exception
      'El proveedor ya no existe';
  end if;

  for v_line in
    select *
    from public.purchase_lines pl
    where pl.purchase_id = p_purchase_id
    order by pl.created_at, pl.id
  loop
    select *
    into v_item
    from public.inventory_items i
    where i.id = v_line.inventory_item_id
    for update;

    if v_item.id is null then
      raise exception
        'Uno de los insumos ya no existe';
    end if;

    select *
    into v_presentation
    from public.supplier_inventory_presentations sip
    where sip.id = v_line.presentation_id
    for update;

    if v_presentation.id is null then
      raise exception
        'Una de las presentaciones ya no existe';
    end if;

    v_stock_before :=
      v_item.current_stock;

    v_stock_after :=
      round(
        v_stock_before +
        v_line.total_base_quantity,
        3
      );

    v_previous_unit_cost :=
      v_item.unit_cost;

    if v_stock_before <= 0 then
      v_resulting_unit_cost :=
        v_line.normalized_unit_cost;
    else
      v_existing_positive_qty :=
        v_stock_before;

      v_existing_value :=
        v_existing_positive_qty *
        v_previous_unit_cost;

      v_received_value :=
        v_line.total_base_quantity *
        v_line.normalized_unit_cost;

      v_resulting_unit_cost :=
        round(
          (
            v_existing_value +
            v_received_value
          ) /
          (
            v_existing_positive_qty +
            v_line.total_base_quantity
          ),
          6
        );
    end if;

    update public.inventory_items
    set
      current_stock = v_stock_after,
      purchase_cost = v_line.package_cost,
      purchase_base_quantity = v_line.base_quantity_per_package,
      unit_cost = v_resulting_unit_cost,
      cost_updated_at = now(),
      updated_at = now()
    where id = v_item.id;

    v_reason :=
      'Compra · ' ||
      v_supplier_name ||
      case
        when v_purchase.reference is not null
        then ' · ' || v_purchase.reference
        else ''
      end;

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
      'entry',
      v_line.total_base_quantity,
      v_stock_before,
      v_stock_after,
      v_reason,
      v_user_id
    )
    returning id
    into v_movement_id;

    insert into public.inventory_item_cost_history(
      inventory_item_id,
      purchase_cost,
      purchase_base_quantity,
      unit_cost,
      reason,
      created_by
    )
    values (
      v_item.id,
      v_line.package_cost,
      v_line.base_quantity_per_package,
      v_resulting_unit_cost,
      v_reason ||
      ' · costo promedio ponderado',
      v_user_id
    )
    returning id
    into v_cost_history_id;

    update public.supplier_inventory_presentations
    set
      last_purchase_cost = v_line.package_cost,
      updated_at = now()
    where id = v_line.presentation_id;

    update public.purchase_lines
    set
      stock_before = v_stock_before,
      stock_after = v_stock_after,
      previous_unit_cost = v_previous_unit_cost,
      resulting_unit_cost = v_resulting_unit_cost,
      previous_purchase_cost = v_item.purchase_cost,
      previous_purchase_base_quantity = v_item.purchase_base_quantity,
      previous_supplier_last_purchase_cost = v_presentation.last_purchase_cost,
      received_movement_id = v_movement_id,
      received_cost_history_id = v_cost_history_id
    where id = v_line.id;

    v_received_lines :=
      v_received_lines +
      1;
  end loop;

  select ec.id
  into v_expense_category_id
  from public.expense_categories ec
  where lower(btrim(ec.name)) = 'insumos'
  limit 1;

  if v_expense_category_id is null then
    raise exception
      'No existe la categoría de egreso "Insumos"';
  end if;

  if v_purchase.total > 0 then
    insert into public.business_expenses(
      category_id,
      amount,
      description,
      payment_method,
      expense_at,
      recorded_by,
      source_type,
      source_id
    )
    values (
      v_expense_category_id,
      v_purchase.total,
      'Compra a ' ||
      v_supplier_name ||
      case
        when v_purchase.reference is not null
        then ' · ' || v_purchase.reference
        else ''
      end,
      v_purchase.payment_method,
      v_purchase.purchased_at,
      v_user_id,
      'purchase',
      p_purchase_id
    )
    returning id
    into v_expense_id;
  end if;

  update public.purchases
  set
    status = 'received',
    expense_id = v_expense_id,
    received_by = v_user_id,
    received_at = now(),
    reversal_supported = true,
    updated_at = now()
  where id = p_purchase_id;

  return jsonb_build_object(
    'ok', true,
    'purchaseId', p_purchase_id,
    'expenseId', v_expense_id,
    'receivedLines', v_received_lines,
    'total', v_purchase.total
  );
end;
$$;

-- ------------------------------------------------------------
-- 5. Reversa exacta y segura
-- ------------------------------------------------------------

create or replace function public.reverse_received_purchase_admin(
  p_purchase_id uuid,
  p_reason text
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid;
  v_purchase public.purchases%rowtype;
  v_supplier_name text;
  v_line public.purchase_lines%rowtype;
  v_item public.inventory_items%rowtype;
  v_reason text;
  v_movement_id uuid;
  v_expense_id uuid;
  v_reversed_lines integer := 0;
begin
  v_user_id :=
    public.require_inventory_admin();

  if btrim(coalesce(p_reason, '')) = '' then
    raise exception
      'Escribe el motivo de la reversa';
  end if;

  select *
  into v_purchase
  from public.purchases p
  where p.id = p_purchase_id
  for update;

  if v_purchase.id is null then
    raise exception
      'La compra no existe';
  end if;

  if v_purchase.status <> 'received' then
    raise exception
      'Solo se puede revertir una compra recibida';
  end if;

  if not v_purchase.reversal_supported then
    raise exception
      'Esta compra fue recibida antes de habilitar reversas seguras y no puede revertirse automáticamente.';
  end if;

  select s.name
  into v_supplier_name
  from public.suppliers s
  where s.id = v_purchase.supplier_id;

  v_supplier_name :=
    coalesce(
      v_supplier_name,
      'Proveedor'
    );

  for v_line in
    select *
    from public.purchase_lines pl
    where pl.purchase_id = p_purchase_id
    order by pl.created_at desc, pl.id desc
  loop
    if
      v_line.stock_before is null
      or v_line.stock_after is null
      or v_line.previous_unit_cost is null
      or v_line.resulting_unit_cost is null
      or v_line.previous_purchase_cost is null
      or v_line.previous_purchase_base_quantity is null
      or v_line.previous_supplier_last_purchase_cost is null
      or v_line.received_movement_id is null
    then
      raise exception
        'La compra no tiene todos los snapshots necesarios para una reversa exacta.';
    end if;

    select *
    into v_item
    from public.inventory_items i
    where i.id = v_line.inventory_item_id
    for update;

    if v_item.id is null then
      raise exception
        'Uno de los insumos ya no existe';
    end if;

    if abs(
      v_item.current_stock -
      v_line.stock_after
    ) > 0.0005 then
      raise exception
        'No se puede revertir la compra porque el stock de "%" cambió después de la recepción.',
        v_item.name;
    end if;

    if abs(
      v_item.unit_cost -
      v_line.resulting_unit_cost
    ) > 0.0000005 then
      raise exception
        'No se puede revertir la compra porque el costo de "%" cambió después de la recepción.',
        v_item.name;
    end if;

    update public.inventory_items
    set
      current_stock = v_line.stock_before,
      purchase_cost = v_line.previous_purchase_cost,
      purchase_base_quantity = v_line.previous_purchase_base_quantity,
      unit_cost = v_line.previous_unit_cost,
      cost_updated_at = now(),
      updated_at = now()
    where id = v_item.id;

    v_reason :=
      'Reversa compra · ' ||
      v_supplier_name ||
      case
        when v_purchase.reference is not null
        then ' · ' || v_purchase.reference
        else ''
      end ||
      ' · ' ||
      btrim(p_reason);

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
      'purchase_reversal',
      -v_line.total_base_quantity,
      v_item.current_stock,
      v_line.stock_before,
      v_reason,
      v_user_id
    )
    returning id
    into v_movement_id;

    insert into public.inventory_item_cost_history(
      inventory_item_id,
      purchase_cost,
      purchase_base_quantity,
      unit_cost,
      reason,
      created_by
    )
    values (
      v_item.id,
      v_line.previous_purchase_cost,
      v_line.previous_purchase_base_quantity,
      v_line.previous_unit_cost,
      v_reason ||
      ' · restauración de costo',
      v_user_id
    );

    update public.supplier_inventory_presentations
    set
      last_purchase_cost =
        v_line.previous_supplier_last_purchase_cost,
      updated_at =
        now()
    where id =
      v_line.presentation_id;

    update public.purchase_lines
    set
      reversal_movement_id =
        v_movement_id,
      reversed_at =
        now()
    where id =
      v_line.id;

    v_reversed_lines :=
      v_reversed_lines +
      1;
  end loop;

  v_expense_id :=
    v_purchase.expense_id;

  if v_expense_id is not null then
    if not exists (
      select 1
      from public.business_expenses e
      where e.id = v_expense_id
        and e.source_type = 'purchase'
        and e.source_id = p_purchase_id
    ) then
      raise exception
        'El egreso asociado ya no coincide con esta compra.';
    end if;

    perform set_config(
      'dorian.allow_generated_expense_mutation',
      'on',
      true
    );

    delete from public.business_expenses
    where id = v_expense_id;

    perform set_config(
      'dorian.allow_generated_expense_mutation',
      'off',
      true
    );
  end if;

  update public.purchases
  set
    status = 'reversed',
    reversal_expense_id = v_expense_id,
    expense_id = null,
    reversed_at = now(),
    reversed_by = v_user_id,
    reversal_reason = btrim(p_reason),
    updated_at = now()
  where id = p_purchase_id;

  return jsonb_build_object(
    'ok', true,
    'purchaseId', p_purchase_id,
    'reversedLines', v_reversed_lines,
    'reversedExpenseId', v_expense_id
  );
end;
$$;

revoke all
on function public.reverse_received_purchase_admin(
  uuid,
  text
)
from public;

grant execute
on function public.reverse_received_purchase_admin(
  uuid,
  text
)
to authenticated;
