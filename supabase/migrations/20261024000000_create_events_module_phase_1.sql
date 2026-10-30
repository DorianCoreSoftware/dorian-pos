-- ============================================================
-- DORIAN POS
-- EVENTOS - FASE 1
-- Feature flag + configuración base + estructura del cotizador
-- ============================================================

-- ------------------------------------------------------------
-- 1. Feature administrada por DorianCore
-- ------------------------------------------------------------

alter table public.business_settings
  add column if not exists events_enabled boolean not null default false;

comment on column public.business_settings.events_enabled is
  'DorianCore-managed entitlement for the Events module.';

-- Extiende la protección existente para incluir Eventos.
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
     )
  then
    raise exception
      'La identidad visual y las funciones habilitadas son administradas por DorianCore.';
  end if;

  return new;
end;
$$;

-- ------------------------------------------------------------
-- 2. Configuración general del cotizador
-- ------------------------------------------------------------

create table if not exists public.event_settings (
  id smallint primary key default 1 check (id = 1),
  public_quote_enabled boolean not null default false,
  min_guests integer not null default 1 check (min_guests > 0),
  max_guests integer not null default 200 check (max_guests >= min_guests),
  min_advance_hours integer not null default 24 check (min_advance_hours >= 0),
  max_advance_days integer not null default 180 check (max_advance_days > 0),
  quote_disclaimer text not null default
    'La cotización es estimada y está sujeta a disponibilidad y confirmación del negocio.',
  terms text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.event_settings (id)
values (1)
on conflict (id) do nothing;

alter table public.event_settings enable row level security;

drop policy if exists event_settings_authenticated_read
on public.event_settings;

create policy event_settings_authenticated_read
on public.event_settings
for select
to authenticated
using (true);

-- ------------------------------------------------------------
-- 3. Catálogos base para siguientes etapas
-- ------------------------------------------------------------

create table if not exists public.event_types (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  position integer not null default 0 check (position >= 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.event_packages (
  id uuid primary key default gen_random_uuid(),
  event_type_id uuid references public.event_types(id) on delete set null,
  name text not null,
  description text,
  base_price numeric(12,2) not null default 0 check (base_price >= 0),
  included_guests integer not null default 1 check (included_guests > 0),
  extra_guest_price numeric(12,2) not null default 0 check (extra_guest_price >= 0),
  duration_minutes integer not null default 120 check (duration_minutes > 0),
  position integer not null default 0 check (position >= 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.event_extras (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  pricing_type text not null default 'fixed'
    check (pricing_type in ('fixed', 'per_guest', 'per_unit')),
  price numeric(12,2) not null default 0 check (price >= 0),
  position integer not null default 0 check (position >= 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.event_package_extras (
  package_id uuid not null references public.event_packages(id) on delete cascade,
  extra_id uuid not null references public.event_extras(id) on delete cascade,
  primary key (package_id, extra_id)
);

create table if not exists public.event_requests (
  id uuid primary key default gen_random_uuid(),
  folio bigint generated always as identity unique,
  status text not null default 'new'
    check (
      status in (
        'new',
        'reviewing',
        'quoted',
        'accepted',
        'rejected',
        'cancelled',
        'completed'
      )
    ),
  event_type_id uuid references public.event_types(id) on delete set null,
  package_id uuid references public.event_packages(id) on delete set null,
  event_date date not null,
  event_time time,
  guest_count integer not null check (guest_count > 0),
  customer_name text not null,
  customer_phone text,
  customer_email text,
  customer_notes text,
  estimated_total numeric(12,2) not null default 0 check (estimated_total >= 0),
  quoted_total numeric(12,2) check (quoted_total is null or quoted_total >= 0),
  admin_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.event_request_extras (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.event_requests(id) on delete cascade,
  extra_id uuid references public.event_extras(id) on delete set null,
  extra_name text not null,
  pricing_type text not null
    check (pricing_type in ('fixed', 'per_guest', 'per_unit')),
  unit_price numeric(12,2) not null default 0 check (unit_price >= 0),
  quantity numeric(12,2) not null default 1 check (quantity > 0),
  subtotal numeric(12,2) not null default 0 check (subtotal >= 0)
);

-- RLS: por ahora sólo administración autenticada.
alter table public.event_types enable row level security;
alter table public.event_packages enable row level security;
alter table public.event_extras enable row level security;
alter table public.event_package_extras enable row level security;
alter table public.event_requests enable row level security;
alter table public.event_request_extras enable row level security;

-- ------------------------------------------------------------
-- 4. Configuración: escritura exclusiva mediante RPC de admin
-- ------------------------------------------------------------

create or replace function public.update_event_settings(
  p_public_quote_enabled boolean,
  p_min_guests integer,
  p_max_guests integer,
  p_min_advance_hours integer,
  p_max_advance_days integer,
  p_quote_disclaimer text,
  p_terms text
)
returns jsonb
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
    raise exception 'No tienes permisos para configurar eventos';
  end if;

  if p_min_guests <= 0 then
    raise exception 'El mínimo de personas debe ser mayor a cero';
  end if;

  if p_max_guests < p_min_guests then
    raise exception 'El máximo de personas no puede ser menor al mínimo';
  end if;

  if p_min_advance_hours < 0 then
    raise exception 'La anticipación mínima no puede ser negativa';
  end if;

  if p_max_advance_days <= 0 then
    raise exception 'El periodo máximo debe ser mayor a cero días';
  end if;

  if length(trim(coalesce(p_quote_disclaimer, ''))) > 300 then
    raise exception 'El aviso de cotización no puede superar 300 caracteres';
  end if;

  if length(trim(coalesce(p_terms, ''))) > 3000 then
    raise exception 'Las condiciones no pueden superar 3000 caracteres';
  end if;

  update public.event_settings
  set
    public_quote_enabled = coalesce(p_public_quote_enabled, false),
    min_guests = p_min_guests,
    max_guests = p_max_guests,
    min_advance_hours = p_min_advance_hours,
    max_advance_days = p_max_advance_days,
    quote_disclaimer = trim(coalesce(p_quote_disclaimer, '')),
    terms = trim(coalesce(p_terms, '')),
    updated_at = now()
  where id = 1;

  return jsonb_build_object(
    'ok', true
  );
end;
$$;

revoke all on function public.update_event_settings(
  boolean,
  integer,
  integer,
  integer,
  integer,
  text,
  text
) from public;

grant execute on function public.update_event_settings(
  boolean,
  integer,
  integer,
  integer,
  integer,
  text,
  text
) to authenticated;

comment on function public.update_event_settings(
  boolean,
  integer,
  integer,
  integer,
  integer,
  text,
  text
) is
  'Updates the Events quote settings for authenticated Dorian POS administrators.';
