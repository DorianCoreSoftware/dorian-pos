-- ============================================================
-- DORIAN POS
-- COMPRAS Y PROVEEDORES - FASE 1
-- Proveedores + presentaciones de compra por insumo
-- ============================================================

create table if not exists public.suppliers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  contact_name text,
  phone text,
  email text,
  notes text,
  is_active boolean not null default true,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint suppliers_name_not_blank
    check (btrim(name) <> '')
);

create unique index if not exists suppliers_name_unique_ci
on public.suppliers(lower(btrim(name)));

create index if not exists suppliers_active_name_idx
on public.suppliers(is_active, name);

create table if not exists public.supplier_inventory_presentations (
  id uuid primary key default gen_random_uuid(),
  supplier_id uuid not null
    references public.suppliers(id)
    on delete restrict,
  inventory_item_id uuid not null
    references public.inventory_items(id)
    on delete restrict,
  name text not null,
  supplier_sku text,
  purchase_unit text not null,
  purchase_quantity numeric(14,3) not null,
  base_quantity numeric(14,3) not null,
  last_purchase_cost numeric(14,4) not null default 0,
  is_preferred boolean not null default false,
  is_active boolean not null default true,
  notes text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint supplier_inventory_presentations_name_not_blank
    check (btrim(name) <> ''),
  constraint supplier_inventory_presentations_purchase_unit_check
    check (purchase_unit in ('g', 'kg', 'ml', 'l', 'piece')),
  constraint supplier_inventory_presentations_purchase_quantity_positive
    check (purchase_quantity > 0),
  constraint supplier_inventory_presentations_base_quantity_positive
    check (base_quantity > 0),
  constraint supplier_inventory_presentations_cost_nonnegative
    check (last_purchase_cost >= 0)
);

create unique index if not exists supplier_inventory_presentations_unique_ci
on public.supplier_inventory_presentations(
  supplier_id,
  inventory_item_id,
  lower(btrim(name))
);

create index if not exists supplier_inventory_presentations_supplier_idx
on public.supplier_inventory_presentations(
  supplier_id,
  is_active
);

create index if not exists supplier_inventory_presentations_item_idx
on public.supplier_inventory_presentations(
  inventory_item_id,
  is_active
);

alter table public.suppliers
  enable row level security;

alter table public.supplier_inventory_presentations
  enable row level security;

drop policy if exists suppliers_authenticated_read
on public.suppliers;

create policy suppliers_authenticated_read
on public.suppliers
for select
to authenticated
using (true);

drop policy if exists supplier_inventory_presentations_authenticated_read
on public.supplier_inventory_presentations;

create policy supplier_inventory_presentations_authenticated_read
on public.supplier_inventory_presentations
for select
to authenticated
using (true);

-- ------------------------------------------------------------
-- Conversión de presentación a unidad base
-- ------------------------------------------------------------

create or replace function public.convert_purchase_quantity_to_base(
  p_inventory_base_unit text,
  p_purchase_unit text,
  p_purchase_quantity numeric
)
returns numeric
language plpgsql
immutable
set search_path = public, pg_temp
as $$
begin
  if p_purchase_quantity is null
     or p_purchase_quantity <= 0 then
    raise exception
      'La cantidad de presentación debe ser mayor a 0';
  end if;

  if p_inventory_base_unit = 'g' then
    if p_purchase_unit = 'g' then
      return round(p_purchase_quantity, 3);
    elsif p_purchase_unit = 'kg' then
      return round(p_purchase_quantity * 1000, 3);
    else
      raise exception
        'La unidad de compra no es compatible con un insumo medido en gramos';
    end if;
  elsif p_inventory_base_unit = 'ml' then
    if p_purchase_unit = 'ml' then
      return round(p_purchase_quantity, 3);
    elsif p_purchase_unit = 'l' then
      return round(p_purchase_quantity * 1000, 3);
    else
      raise exception
        'La unidad de compra no es compatible con un insumo medido en mililitros';
    end if;
  elsif p_inventory_base_unit = 'piece' then
    if p_purchase_unit = 'piece' then
      return round(p_purchase_quantity, 3);
    else
      raise exception
        'La unidad de compra no es compatible con un insumo medido en piezas';
    end if;
  end if;

  raise exception
    'La unidad base del insumo no es válida';
end;
$$;

-- ------------------------------------------------------------
-- Proveedores
-- ------------------------------------------------------------

create or replace function public.save_supplier_admin(
  p_supplier_id uuid,
  p_name text,
  p_contact_name text,
  p_phone text,
  p_email text,
  p_notes text,
  p_is_active boolean
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid;
  v_supplier_id uuid;
begin
  v_user_id :=
    public.require_inventory_admin();

  if btrim(coalesce(p_name, '')) = '' then
    raise exception
      'El nombre del proveedor es obligatorio';
  end if;

  if p_supplier_id is null then
    insert into public.suppliers(
      name,
      contact_name,
      phone,
      email,
      notes,
      is_active,
      created_by
    )
    values (
      btrim(p_name),
      nullif(btrim(coalesce(p_contact_name, '')), ''),
      nullif(btrim(coalesce(p_phone, '')), ''),
      nullif(btrim(coalesce(p_email, '')), ''),
      nullif(btrim(coalesce(p_notes, '')), ''),
      coalesce(p_is_active, true),
      v_user_id
    )
    returning id
    into v_supplier_id;
  else
    update public.suppliers
    set
      name = btrim(p_name),
      contact_name =
        nullif(btrim(coalesce(p_contact_name, '')), ''),
      phone =
        nullif(btrim(coalesce(p_phone, '')), ''),
      email =
        nullif(btrim(coalesce(p_email, '')), ''),
      notes =
        nullif(btrim(coalesce(p_notes, '')), ''),
      is_active =
        coalesce(p_is_active, true),
      updated_at =
        now()
    where id =
      p_supplier_id
    returning id
    into v_supplier_id;

    if v_supplier_id is null then
      raise exception
        'El proveedor no existe';
    end if;
  end if;

  return v_supplier_id;
end;
$$;

revoke all
on function public.save_supplier_admin(
  uuid,
  text,
  text,
  text,
  text,
  text,
  boolean
)
from public;

grant execute
on function public.save_supplier_admin(
  uuid,
  text,
  text,
  text,
  text,
  text,
  boolean
)
to authenticated;

-- ------------------------------------------------------------
-- Presentaciones
-- ------------------------------------------------------------

create or replace function public.save_supplier_inventory_presentation_admin(
  p_presentation_id uuid,
  p_supplier_id uuid,
  p_inventory_item_id uuid,
  p_name text,
  p_supplier_sku text,
  p_purchase_unit text,
  p_purchase_quantity numeric,
  p_last_purchase_cost numeric,
  p_is_preferred boolean,
  p_is_active boolean,
  p_notes text
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid;
  v_base_unit text;
  v_base_quantity numeric(14,3);
  v_id uuid;
begin
  v_user_id :=
    public.require_inventory_admin();

  if btrim(coalesce(p_name, '')) = '' then
    raise exception
      'El nombre de la presentación es obligatorio';
  end if;

  if not exists (
    select 1
    from public.suppliers s
    where s.id = p_supplier_id
  ) then
    raise exception
      'El proveedor no existe';
  end if;

  select i.base_unit
  into v_base_unit
  from public.inventory_items i
  where i.id =
    p_inventory_item_id;

  if v_base_unit is null then
    raise exception
      'El insumo no existe';
  end if;

  if p_last_purchase_cost is null
     or p_last_purchase_cost < 0 then
    raise exception
      'El costo debe ser igual o mayor a 0';
  end if;

  v_base_quantity :=
    public.convert_purchase_quantity_to_base(
      v_base_unit,
      p_purchase_unit,
      p_purchase_quantity
    );

  if coalesce(p_is_preferred, false) then
    update public.supplier_inventory_presentations
    set
      is_preferred = false,
      updated_at = now()
    where inventory_item_id =
      p_inventory_item_id
      and (
        p_presentation_id is null
        or id <> p_presentation_id
      );
  end if;

  if p_presentation_id is null then
    insert into public.supplier_inventory_presentations(
      supplier_id,
      inventory_item_id,
      name,
      supplier_sku,
      purchase_unit,
      purchase_quantity,
      base_quantity,
      last_purchase_cost,
      is_preferred,
      is_active,
      notes,
      created_by
    )
    values (
      p_supplier_id,
      p_inventory_item_id,
      btrim(p_name),
      nullif(btrim(coalesce(p_supplier_sku, '')), ''),
      p_purchase_unit,
      round(p_purchase_quantity, 3),
      v_base_quantity,
      round(p_last_purchase_cost, 4),
      coalesce(p_is_preferred, false),
      coalesce(p_is_active, true),
      nullif(btrim(coalesce(p_notes, '')), ''),
      v_user_id
    )
    returning id
    into v_id;
  else
    update public.supplier_inventory_presentations
    set
      supplier_id =
        p_supplier_id,
      inventory_item_id =
        p_inventory_item_id,
      name =
        btrim(p_name),
      supplier_sku =
        nullif(btrim(coalesce(p_supplier_sku, '')), ''),
      purchase_unit =
        p_purchase_unit,
      purchase_quantity =
        round(p_purchase_quantity, 3),
      base_quantity =
        v_base_quantity,
      last_purchase_cost =
        round(p_last_purchase_cost, 4),
      is_preferred =
        coalesce(p_is_preferred, false),
      is_active =
        coalesce(p_is_active, true),
      notes =
        nullif(btrim(coalesce(p_notes, '')), ''),
      updated_at =
        now()
    where id =
      p_presentation_id
    returning id
    into v_id;

    if v_id is null then
      raise exception
        'La presentación no existe';
    end if;
  end if;

  return v_id;
end;
$$;

revoke all
on function public.save_supplier_inventory_presentation_admin(
  uuid,
  uuid,
  uuid,
  text,
  text,
  text,
  numeric,
  numeric,
  boolean,
  boolean,
  text
)
from public;

grant execute
on function public.save_supplier_inventory_presentation_admin(
  uuid,
  uuid,
  uuid,
  text,
  text,
  text,
  numeric,
  numeric,
  boolean,
  boolean,
  text
)
to authenticated;
