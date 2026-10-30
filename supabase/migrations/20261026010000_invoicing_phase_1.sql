-- ============================================================
-- DORIAN POS
-- FACTURACION - FASE 1
-- Feature flag + perfil fiscal + clientes fiscales + base CFDI
-- ============================================================

-- ------------------------------------------------------------
-- 1. Feature administrada por DorianCore
-- ------------------------------------------------------------

alter table public.business_settings
  add column if not exists invoicing_enabled boolean not null default false;

comment on column public.business_settings.invoicing_enabled is
  'DorianCore-managed entitlement for the Invoicing module.';

create or replace function public.protect_doriancore_managed_business_settings()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.role() = 'authenticated'
     and (
       new.logo_url is distinct from old.logo_url
       or new.primary_color is distinct from old.primary_color
       or new.secondary_color is distinct from old.secondary_color
       or new.loyalty_enabled is distinct from old.loyalty_enabled
       or new.delivery_enabled is distinct from old.delivery_enabled
       or new.promotions_enabled is distinct from old.promotions_enabled
       or new.kitchen_enabled is distinct from old.kitchen_enabled
       or new.events_enabled is distinct from old.events_enabled
       or new.invoicing_enabled is distinct from old.invoicing_enabled
     )
  then
    raise exception
      'La identidad visual y las funciones habilitadas son administradas por DorianCore.';
  end if;

  return new;
end;
$$;

comment on function public.protect_doriancore_managed_business_settings() is
  'Prevents authenticated client sessions from changing DorianCore-managed branding and feature entitlement fields.';

-- ------------------------------------------------------------
-- 2. Perfil fiscal del emisor
-- ------------------------------------------------------------

create table if not exists public.invoicing_settings (
  id smallint primary key default 1 check (id = 1),
  legal_name text not null default '',
  rfc text not null default '',
  tax_regime_code text not null default '',
  postal_code text not null default '',
  invoice_series text not null default 'A',
  global_invoice_enabled boolean not null default false,
  global_periodicity_code text not null default '01',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.invoicing_settings (id)
values (1)
on conflict (id) do nothing;

alter table public.invoicing_settings enable row level security;

comment on table public.invoicing_settings is
  'Fiscal issuer configuration. CSD files, private keys and PAC secrets must not be stored here.';

-- ------------------------------------------------------------
-- 3. Clientes fiscales
-- ------------------------------------------------------------

create table if not exists public.fiscal_customers (
  id uuid primary key default gen_random_uuid(),
  alias text,
  legal_name text not null,
  rfc text not null,
  tax_regime_code text not null,
  postal_code text not null,
  cfdi_use_code text not null,
  email text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (length(trim(legal_name)) between 1 and 300),
  check (rfc ~ '^[A-Z&Ñ]{3,4}[0-9]{6}[A-Z0-9]{3}$'),
  check (tax_regime_code ~ '^[0-9]{3}$'),
  check (postal_code ~ '^[0-9]{5}$'),
  check (cfdi_use_code ~ '^[A-Z0-9]{3}$')
);

create index if not exists fiscal_customers_rfc_idx
  on public.fiscal_customers (rfc);

create index if not exists fiscal_customers_active_idx
  on public.fiscal_customers (is_active, legal_name);

alter table public.fiscal_customers enable row level security;

comment on table public.fiscal_customers is
  'Reusable fiscal profiles. Each CFDI must keep its own immutable fiscal snapshot.';

-- ------------------------------------------------------------
-- 4. Configuracion fiscal por producto
-- ------------------------------------------------------------

create table if not exists public.product_fiscal_settings (
  product_id uuid primary key references public.products(id) on delete cascade,
  product_service_code text,
  unit_code text,
  tax_object_code text,
  vat_rate numeric(8,6),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (product_service_code is null or product_service_code ~ '^[0-9]{8}$'),
  check (unit_code is null or length(trim(unit_code)) between 1 and 8),
  check (tax_object_code is null or tax_object_code ~ '^[0-9]{2}$'),
  check (vat_rate is null or vat_rate between 0 and 1)
);

alter table public.product_fiscal_settings enable row level security;

-- ------------------------------------------------------------
-- 5. Base documental de CFDI
-- ------------------------------------------------------------

create table if not exists public.invoices (
  id uuid primary key default gen_random_uuid(),
  invoice_kind text not null default 'regular'
    check (invoice_kind in ('regular', 'global', 'replacement')),
  status text not null default 'draft'
    check (
      status in (
        'draft',
        'stamping',
        'stamped',
        'cancel_pending',
        'cancelled',
        'error'
      )
    ),
  series text not null default 'A',
  folio bigint generated always as identity,

  fiscal_customer_id uuid references public.fiscal_customers(id) on delete set null,

  issuer_legal_name text not null default '',
  issuer_rfc text not null default '',
  issuer_tax_regime_code text not null default '',
  issuer_postal_code text not null default '',

  receiver_legal_name text not null default '',
  receiver_rfc text not null default '',
  receiver_tax_regime_code text not null default '',
  receiver_postal_code text not null default '',
  receiver_cfdi_use_code text not null default '',
  receiver_email text,

  currency_code text not null default 'MXN',
  payment_form_code text,
  payment_method_code text,
  subtotal numeric(14,2) not null default 0 check (subtotal >= 0),
  discount numeric(14,2) not null default 0 check (discount >= 0),
  tax_total numeric(14,2) not null default 0 check (tax_total >= 0),
  total numeric(14,2) not null default 0 check (total >= 0),

  cfdi_uuid uuid unique,
  pac_provider text,
  pac_reference text,
  xml_storage_path text,
  pdf_storage_path text,
  error_message text,
  stamped_at timestamptz,
  cancellation_reason_code text,
  cancelled_at timestamptz,
  substitute_invoice_id uuid references public.invoices(id) on delete set null,

  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique (series, folio)
);

alter table public.invoices enable row level security;

create index if not exists invoices_status_idx
  on public.invoices (status, created_at desc);

create index if not exists invoices_receiver_rfc_idx
  on public.invoices (receiver_rfc, created_at desc);

create table if not exists public.invoice_order_links (
  invoice_id uuid not null references public.invoices(id) on delete cascade,
  order_id uuid not null references public.orders(id) on delete restrict,
  linked_amount numeric(14,2) not null default 0 check (linked_amount >= 0),
  created_at timestamptz not null default now(),
  primary key (invoice_id, order_id)
);

alter table public.invoice_order_links enable row level security;

create index if not exists invoice_order_links_order_idx
  on public.invoice_order_links (order_id);

create table if not exists public.invoice_items (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references public.invoices(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  description text not null,
  quantity numeric(14,4) not null check (quantity > 0),
  unit_price numeric(14,6) not null default 0 check (unit_price >= 0),
  discount numeric(14,2) not null default 0 check (discount >= 0),
  amount numeric(14,2) not null default 0 check (amount >= 0),
  product_service_code text,
  unit_code text,
  tax_object_code text,
  vat_rate numeric(8,6),
  tax_amount numeric(14,2) not null default 0 check (tax_amount >= 0),
  created_at timestamptz not null default now(),
  check (product_service_code is null or product_service_code ~ '^[0-9]{8}$'),
  check (tax_object_code is null or tax_object_code ~ '^[0-9]{2}$'),
  check (vat_rate is null or vat_rate between 0 and 1)
);

alter table public.invoice_items enable row level security;

create index if not exists invoice_items_invoice_idx
  on public.invoice_items (invoice_id);

-- ------------------------------------------------------------
-- 6. Helper admin
-- ------------------------------------------------------------

create or replace function public.require_invoicing_admin()
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
    raise exception 'No tienes permisos para administrar facturación';
  end if;

  return v_user_id;
end;
$$;

revoke all on function public.require_invoicing_admin() from public;
grant execute on function public.require_invoicing_admin() to authenticated;

-- ------------------------------------------------------------
-- 7. RPC configuración fiscal
-- ------------------------------------------------------------

create or replace function public.get_invoicing_settings_admin()
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_row public.invoicing_settings;
begin
  perform public.require_invoicing_admin();

  select * into v_row
  from public.invoicing_settings
  where id = 1;

  return jsonb_build_object(
    'legalName', coalesce(v_row.legal_name, ''),
    'rfc', coalesce(v_row.rfc, ''),
    'taxRegimeCode', coalesce(v_row.tax_regime_code, ''),
    'postalCode', coalesce(v_row.postal_code, ''),
    'invoiceSeries', coalesce(v_row.invoice_series, 'A'),
    'globalInvoiceEnabled', coalesce(v_row.global_invoice_enabled, false),
    'globalPeriodicityCode', coalesce(v_row.global_periodicity_code, '01')
  );
end;
$$;

create or replace function public.update_invoicing_settings_admin(
  p_legal_name text,
  p_rfc text,
  p_tax_regime_code text,
  p_postal_code text,
  p_invoice_series text,
  p_global_invoice_enabled boolean,
  p_global_periodicity_code text
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_rfc text;
  v_tax_regime text;
  v_postal_code text;
  v_series text;
  v_periodicity text;
begin
  perform public.require_invoicing_admin();

  v_rfc := upper(trim(coalesce(p_rfc, '')));
  v_tax_regime := trim(coalesce(p_tax_regime_code, ''));
  v_postal_code := trim(coalesce(p_postal_code, ''));
  v_series := upper(trim(coalesce(p_invoice_series, '')));
  v_periodicity := trim(coalesce(p_global_periodicity_code, ''));

  if length(trim(coalesce(p_legal_name, ''))) = 0
     or length(trim(p_legal_name)) > 300 then
    raise exception 'La razón social fiscal no es válida';
  end if;

  if v_rfc !~ '^[A-Z&Ñ]{3,4}[0-9]{6}[A-Z0-9]{3}$' then
    raise exception 'El RFC del emisor no tiene un formato válido';
  end if;

  if v_tax_regime !~ '^[0-9]{3}$' then
    raise exception 'El régimen fiscal debe ser un código de 3 dígitos';
  end if;

  if v_postal_code !~ '^[0-9]{5}$' then
    raise exception 'El código postal fiscal debe contener 5 dígitos';
  end if;

  if v_series !~ '^[A-Z0-9-]{1,10}$' then
    raise exception 'La serie de facturación no es válida';
  end if;

  if v_periodicity !~ '^[0-9]{2}$' then
    raise exception 'La periodicidad global debe ser un código de 2 dígitos';
  end if;

  update public.invoicing_settings
  set
    legal_name = trim(p_legal_name),
    rfc = v_rfc,
    tax_regime_code = v_tax_regime,
    postal_code = v_postal_code,
    invoice_series = v_series,
    global_invoice_enabled = coalesce(p_global_invoice_enabled, false),
    global_periodicity_code = v_periodicity,
    updated_at = now()
  where id = 1;

  return jsonb_build_object('ok', true);
end;
$$;

revoke all on function public.get_invoicing_settings_admin() from public;
grant execute on function public.get_invoicing_settings_admin() to authenticated;

revoke all on function public.update_invoicing_settings_admin(
  text, text, text, text, text, boolean, text
) from public;
grant execute on function public.update_invoicing_settings_admin(
  text, text, text, text, text, boolean, text
) to authenticated;

-- ------------------------------------------------------------
-- 8. RPC clientes fiscales
-- ------------------------------------------------------------

create or replace function public.get_fiscal_customers_admin()
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  perform public.require_invoicing_admin();

  return coalesce(
    (
      select jsonb_agg(
        jsonb_build_object(
          'id', c.id,
          'alias', coalesce(c.alias, ''),
          'legalName', c.legal_name,
          'rfc', c.rfc,
          'taxRegimeCode', c.tax_regime_code,
          'postalCode', c.postal_code,
          'cfdiUseCode', c.cfdi_use_code,
          'email', coalesce(c.email, ''),
          'isActive', c.is_active,
          'createdAt', c.created_at,
          'updatedAt', c.updated_at
        )
        order by c.is_active desc, c.legal_name asc
      )
      from public.fiscal_customers c
    ),
    '[]'::jsonb
  );
end;
$$;

create or replace function public.upsert_fiscal_customer_admin(
  p_id uuid,
  p_alias text,
  p_legal_name text,
  p_rfc text,
  p_tax_regime_code text,
  p_postal_code text,
  p_cfdi_use_code text,
  p_email text
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_id uuid;
  v_rfc text;
  v_regime text;
  v_postal text;
  v_use text;
  v_email text;
begin
  perform public.require_invoicing_admin();

  v_rfc := upper(trim(coalesce(p_rfc, '')));
  v_regime := trim(coalesce(p_tax_regime_code, ''));
  v_postal := trim(coalesce(p_postal_code, ''));
  v_use := upper(trim(coalesce(p_cfdi_use_code, '')));
  v_email := lower(trim(coalesce(p_email, '')));

  if length(trim(coalesce(p_legal_name, ''))) = 0
     or length(trim(p_legal_name)) > 300 then
    raise exception 'La razón social del cliente no es válida';
  end if;

  if v_rfc !~ '^[A-Z&Ñ]{3,4}[0-9]{6}[A-Z0-9]{3}$' then
    raise exception 'El RFC del cliente no tiene un formato válido';
  end if;

  if v_regime !~ '^[0-9]{3}$' then
    raise exception 'El régimen fiscal del cliente no es válido';
  end if;

  if v_postal !~ '^[0-9]{5}$' then
    raise exception 'El código postal fiscal del cliente no es válido';
  end if;

  if v_use !~ '^[A-Z0-9]{3}$' then
    raise exception 'El uso CFDI no es válido';
  end if;

  if length(v_email) > 254 then
    raise exception 'El correo del cliente es demasiado largo';
  end if;

  if p_id is null then
    insert into public.fiscal_customers (
      alias,
      legal_name,
      rfc,
      tax_regime_code,
      postal_code,
      cfdi_use_code,
      email
    ) values (
      nullif(trim(coalesce(p_alias, '')), ''),
      trim(p_legal_name),
      v_rfc,
      v_regime,
      v_postal,
      v_use,
      nullif(v_email, '')
    )
    returning id into v_id;
  else
    update public.fiscal_customers
    set
      alias = nullif(trim(coalesce(p_alias, '')), ''),
      legal_name = trim(p_legal_name),
      rfc = v_rfc,
      tax_regime_code = v_regime,
      postal_code = v_postal,
      cfdi_use_code = v_use,
      email = nullif(v_email, ''),
      updated_at = now()
    where id = p_id
    returning id into v_id;

    if v_id is null then
      raise exception 'Cliente fiscal no encontrado';
    end if;
  end if;

  return v_id;
end;
$$;

create or replace function public.set_fiscal_customer_active_admin(
  p_customer_id uuid,
  p_is_active boolean
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  perform public.require_invoicing_admin();

  update public.fiscal_customers
  set
    is_active = coalesce(p_is_active, false),
    updated_at = now()
  where id = p_customer_id;

  if not found then
    raise exception 'Cliente fiscal no encontrado';
  end if;

  return jsonb_build_object('ok', true);
end;
$$;

revoke all on function public.get_fiscal_customers_admin() from public;
grant execute on function public.get_fiscal_customers_admin() to authenticated;

revoke all on function public.upsert_fiscal_customer_admin(
  uuid, text, text, text, text, text, text, text
) from public;
grant execute on function public.upsert_fiscal_customer_admin(
  uuid, text, text, text, text, text, text, text
) to authenticated;

revoke all on function public.set_fiscal_customer_active_admin(uuid, boolean) from public;
grant execute on function public.set_fiscal_customer_active_admin(uuid, boolean) to authenticated;

-- ------------------------------------------------------------
-- 9. Sin acceso directo a documentos fiscales en Fase 1
-- ------------------------------------------------------------

revoke all on table public.invoicing_settings from anon, authenticated;
revoke all on table public.fiscal_customers from anon, authenticated;
revoke all on table public.product_fiscal_settings from anon, authenticated;
revoke all on table public.invoices from anon, authenticated;
revoke all on table public.invoice_order_links from anon, authenticated;
revoke all on table public.invoice_items from anon, authenticated;
