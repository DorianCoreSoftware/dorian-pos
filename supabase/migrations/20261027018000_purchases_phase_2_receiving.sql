create table if not exists public.purchases (
  id uuid primary key default gen_random_uuid(),
  supplier_id uuid not null references public.suppliers(id) on delete restrict,
  status text not null default 'draft' check (status in ('draft','received','cancelled')),
  reference text,
  purchased_at timestamptz not null default now(),
  payment_method text not null default 'cash' check (payment_method in ('cash','card','transfer','other')),
  notes text,
  total numeric(14,2) not null default 0 check (total >= 0),
  expense_id uuid references public.business_expenses(id) on delete set null,
  created_by uuid references public.profiles(id) on delete set null,
  received_by uuid references public.profiles(id) on delete set null,
  received_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.purchase_lines (
  id uuid primary key default gen_random_uuid(),
  purchase_id uuid not null references public.purchases(id) on delete cascade,
  presentation_id uuid not null references public.supplier_inventory_presentations(id) on delete restrict,
  inventory_item_id uuid not null references public.inventory_items(id) on delete restrict,
  presentation_name text not null,
  package_quantity numeric(12,3) not null check (package_quantity > 0),
  base_quantity_per_package numeric(14,3) not null check (base_quantity_per_package > 0),
  total_base_quantity numeric(14,3) not null check (total_base_quantity > 0),
  package_cost numeric(14,4) not null check (package_cost >= 0),
  line_total numeric(14,2) not null check (line_total >= 0),
  normalized_unit_cost numeric(16,6) not null check (normalized_unit_cost >= 0),
  stock_before numeric(14,3),
  stock_after numeric(14,3),
  previous_unit_cost numeric(16,6),
  resulting_unit_cost numeric(16,6),
  created_at timestamptz not null default now()
);

create index if not exists purchases_supplier_date_idx on public.purchases(supplier_id,purchased_at desc);
create index if not exists purchases_status_date_idx on public.purchases(status,purchased_at desc);
create index if not exists purchase_lines_purchase_idx on public.purchase_lines(purchase_id);
create index if not exists purchase_lines_inventory_idx on public.purchase_lines(inventory_item_id);

alter table public.purchases enable row level security;
alter table public.purchase_lines enable row level security;

drop policy if exists purchases_authenticated_read on public.purchases;
create policy purchases_authenticated_read on public.purchases for select to authenticated using (true);

drop policy if exists purchase_lines_authenticated_read on public.purchase_lines;
create policy purchase_lines_authenticated_read on public.purchase_lines for select to authenticated using (true);

create or replace function public.save_purchase_draft_admin(
  p_purchase_id uuid,
  p_supplier_id uuid,
  p_reference text,
  p_purchased_at timestamptz,
  p_payment_method text,
  p_notes text,
  p_lines jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid;
  v_purchase_id uuid;
  v_status text;
  v_line jsonb;
  v_presentation public.supplier_inventory_presentations%rowtype;
  v_qty numeric(12,3);
  v_cost numeric(14,4);
  v_base_qty numeric(14,3);
  v_line_total numeric(14,2);
  v_unit_cost numeric(16,6);
  v_total numeric(14,2) := 0;
begin
  v_user_id := public.require_inventory_admin();

  if not exists (select 1 from public.suppliers s where s.id = p_supplier_id and s.is_active = true) then
    raise exception 'Selecciona un proveedor activo';
  end if;

  if p_payment_method not in ('cash','card','transfer','other') then
    raise exception 'El método de pago no es válido';
  end if;

  if p_lines is null or jsonb_typeof(p_lines) <> 'array' or jsonb_array_length(p_lines) = 0 then
    raise exception 'Agrega al menos un renglón a la compra';
  end if;

  if p_purchase_id is null then
    insert into public.purchases(supplier_id,reference,purchased_at,payment_method,notes,created_by)
    values (
      p_supplier_id,
      nullif(btrim(coalesce(p_reference,'')),''),
      coalesce(p_purchased_at,now()),
      p_payment_method,
      nullif(btrim(coalesce(p_notes,'')),''),
      v_user_id
    ) returning id into v_purchase_id;
  else
    select status into v_status from public.purchases where id = p_purchase_id for update;
    if v_status is null then raise exception 'La compra no existe'; end if;
    if v_status <> 'draft' then raise exception 'Solo puedes editar compras en borrador'; end if;

    update public.purchases set
      supplier_id = p_supplier_id,
      reference = nullif(btrim(coalesce(p_reference,'')),''),
      purchased_at = coalesce(p_purchased_at,now()),
      payment_method = p_payment_method,
      notes = nullif(btrim(coalesce(p_notes,'')),''),
      updated_at = now()
    where id = p_purchase_id;

    v_purchase_id := p_purchase_id;
    delete from public.purchase_lines where purchase_id = v_purchase_id;
  end if;

  for v_line in select value from jsonb_array_elements(p_lines)
  loop
    select * into v_presentation
    from public.supplier_inventory_presentations
    where id = (v_line->>'presentationId')::uuid;

    if v_presentation.id is null then raise exception 'Una presentación no existe'; end if;
    if not v_presentation.is_active then raise exception 'Una presentación está inactiva'; end if;
    if v_presentation.supplier_id <> p_supplier_id then raise exception 'Todas las presentaciones deben pertenecer al proveedor seleccionado'; end if;

    v_qty := round(coalesce((v_line->>'packageQuantity')::numeric,0),3);
    v_cost := round(coalesce((v_line->>'packageCost')::numeric,0),4);
    if v_qty <= 0 then raise exception 'La cantidad debe ser mayor a 0'; end if;
    if v_cost < 0 then raise exception 'El costo no puede ser negativo'; end if;

    v_base_qty := round(v_qty * v_presentation.base_quantity,3);
    v_line_total := round(v_qty * v_cost,2);
    v_unit_cost := round(v_cost / v_presentation.base_quantity,6);

    insert into public.purchase_lines(
      purchase_id,presentation_id,inventory_item_id,presentation_name,
      package_quantity,base_quantity_per_package,total_base_quantity,
      package_cost,line_total,normalized_unit_cost
    ) values (
      v_purchase_id,v_presentation.id,v_presentation.inventory_item_id,v_presentation.name,
      v_qty,v_presentation.base_quantity,v_base_qty,
      v_cost,v_line_total,v_unit_cost
    );

    v_total := v_total + v_line_total;
  end loop;

  update public.purchases set total = round(v_total,2), updated_at = now() where id = v_purchase_id;
  return v_purchase_id;
end;
$$;

revoke all on function public.save_purchase_draft_admin(uuid,uuid,text,timestamptz,text,text,jsonb) from public;
grant execute on function public.save_purchase_draft_admin(uuid,uuid,text,timestamptz,text,text,jsonb) to authenticated;

create or replace function public.receive_purchase_admin(p_purchase_id uuid)
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
  v_stock_after numeric(14,3);
  v_new_unit_cost numeric(16,6);
  v_expense_category_id uuid;
  v_expense_id uuid;
  v_reason text;
begin
  v_user_id := public.require_inventory_admin();

  select * into v_purchase from public.purchases where id = p_purchase_id for update;
  if v_purchase.id is null then raise exception 'La compra no existe'; end if;
  if v_purchase.status <> 'draft' then raise exception 'La compra ya fue recibida o cancelada'; end if;
  if not exists (select 1 from public.purchase_lines where purchase_id = p_purchase_id) then raise exception 'La compra no tiene renglones'; end if;

  select name into v_supplier_name from public.suppliers where id = v_purchase.supplier_id;

  for v_line in select * from public.purchase_lines where purchase_id = p_purchase_id order by created_at,id
  loop
    select * into v_item from public.inventory_items where id = v_line.inventory_item_id for update;
    if v_item.id is null then raise exception 'Uno de los insumos ya no existe'; end if;

    v_stock_after := round(v_item.current_stock + v_line.total_base_quantity,3);

    if v_item.current_stock <= 0 then
      v_new_unit_cost := v_line.normalized_unit_cost;
    else
      v_new_unit_cost := round(
        ((v_item.current_stock * v_item.unit_cost) + (v_line.total_base_quantity * v_line.normalized_unit_cost)) /
        (v_item.current_stock + v_line.total_base_quantity),
        6
      );
    end if;

    v_reason := 'Compra · ' || v_supplier_name || case when v_purchase.reference is not null then ' · ' || v_purchase.reference else '' end;

    update public.inventory_items set
      current_stock = v_stock_after,
      purchase_cost = v_line.package_cost,
      purchase_base_quantity = v_line.base_quantity_per_package,
      unit_cost = v_new_unit_cost,
      cost_updated_at = now(),
      updated_at = now()
    where id = v_item.id;

    insert into public.inventory_movements(
      inventory_item_id,movement_type,quantity_delta,stock_before,stock_after,reason,created_by
    ) values (
      v_item.id,'entry',v_line.total_base_quantity,v_item.current_stock,v_stock_after,v_reason,v_user_id
    );

    insert into public.inventory_item_cost_history(
      inventory_item_id,purchase_cost,purchase_base_quantity,unit_cost,reason,created_by
    ) values (
      v_item.id,v_line.package_cost,v_line.base_quantity_per_package,v_new_unit_cost,
      v_reason || ' · costo promedio ponderado',v_user_id
    );

    update public.supplier_inventory_presentations set last_purchase_cost = v_line.package_cost, updated_at = now() where id = v_line.presentation_id;

    update public.purchase_lines set
      stock_before = v_item.current_stock,
      stock_after = v_stock_after,
      previous_unit_cost = v_item.unit_cost,
      resulting_unit_cost = v_new_unit_cost
    where id = v_line.id;
  end loop;

  select id into v_expense_category_id from public.expense_categories where lower(btrim(name)) = 'insumos' limit 1;
  if v_expense_category_id is null then raise exception 'No existe la categoría de egreso Insumos'; end if;

  if v_purchase.total > 0 then
    insert into public.business_expenses(category_id,amount,description,payment_method,expense_at,recorded_by)
    values (
      v_expense_category_id,
      v_purchase.total,
      'Compra a ' || v_supplier_name || case when v_purchase.reference is not null then ' · ' || v_purchase.reference else '' end,
      v_purchase.payment_method,
      v_purchase.purchased_at,
      v_user_id
    ) returning id into v_expense_id;
  end if;

  update public.purchases set status='received', expense_id=v_expense_id, received_by=v_user_id, received_at=now(), updated_at=now()
  where id = p_purchase_id;

  return jsonb_build_object('ok',true,'purchaseId',p_purchase_id,'expenseId',v_expense_id,'total',v_purchase.total);
end;
$$;

revoke all on function public.receive_purchase_admin(uuid) from public;
grant execute on function public.receive_purchase_admin(uuid) to authenticated;

create or replace function public.cancel_purchase_draft_admin(p_purchase_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare v_status text;
begin
  perform public.require_inventory_admin();
  select status into v_status from public.purchases where id = p_purchase_id for update;
  if v_status is null then raise exception 'La compra no existe'; end if;
  if v_status <> 'draft' then raise exception 'Solo puedes cancelar compras en borrador'; end if;
  update public.purchases set status='cancelled', updated_at=now() where id = p_purchase_id;
end;
$$;

revoke all on function public.cancel_purchase_draft_admin(uuid) from public;
grant execute on function public.cancel_purchase_draft_admin(uuid) to authenticated;
