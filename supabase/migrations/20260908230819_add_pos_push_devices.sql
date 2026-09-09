-- ============================================================
-- Dispositivos POS autorizados para recibir Push Notifications
-- ============================================================

create table if not exists public.pos_push_devices (
  id uuid primary key default gen_random_uuid(),

  user_id uuid null,

  expo_push_token text not null unique,

  platform text not null default 'android',

  device_name text null,

  app_version text null,

  is_active boolean not null default true,

  last_seen_at timestamptz not null default now(),

  created_at timestamptz not null default now(),

  updated_at timestamptz not null default now(),

  constraint pos_push_devices_platform_check
    check (
      platform in (
        'android',
        'ios'
      )
    )
);


-- ============================================================
-- Índices
-- ============================================================

create index if not exists
  idx_pos_push_devices_active
on public.pos_push_devices (
  is_active
);

create index if not exists
  idx_pos_push_devices_user_id
on public.pos_push_devices (
  user_id
);


-- ============================================================
-- updated_at automático
-- ============================================================

create or replace function public.set_pos_push_device_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();

  return new;
end;
$$;

drop trigger if exists
  trg_set_pos_push_device_updated_at
on public.pos_push_devices;

create trigger
  trg_set_pos_push_device_updated_at
before update
on public.pos_push_devices
for each row
execute function
  public.set_pos_push_device_updated_at();


-- ============================================================
-- RLS
-- ============================================================

alter table public.pos_push_devices
enable row level security;


-- ============================================================
-- POS autenticado puede registrar su dispositivo
-- ============================================================

drop policy if exists
  "Authenticated users can insert POS push devices"
on public.pos_push_devices;

create policy
  "Authenticated users can insert POS push devices"
on public.pos_push_devices
for insert
to authenticated
with check (
  true
);


-- ============================================================
-- POS autenticado puede consultar dispositivos
-- ============================================================

drop policy if exists
  "Authenticated users can select POS push devices"
on public.pos_push_devices;

create policy
  "Authenticated users can select POS push devices"
on public.pos_push_devices
for select
to authenticated
using (
  true
);


-- ============================================================
-- POS autenticado puede actualizar su registro
-- ============================================================

drop policy if exists
  "Authenticated users can update POS push devices"
on public.pos_push_devices;

create policy
  "Authenticated users can update POS push devices"
on public.pos_push_devices
for update
to authenticated
using (
  true
)
with check (
  true
);


-- ============================================================
-- Sin acceso público/anon
-- ============================================================

revoke all
on table public.pos_push_devices
from anon;

grant select, insert, update
on table public.pos_push_devices
to authenticated;