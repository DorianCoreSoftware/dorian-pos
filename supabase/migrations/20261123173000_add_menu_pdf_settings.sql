-- DorianCore - Configuración del menú PDF

create table if not exists public.menu_pdf_settings (
  id integer primary key default 1
    check (id = 1),
  show_descriptions boolean not null default true,
  show_unavailable_products boolean not null default true,
  show_updated_date boolean not null default true,
  show_logo boolean not null default true,
  qr_enabled boolean not null default false,
  qr_url text,
  qr_label text not null default 'Escanea para ordenar',
  updated_at timestamptz not null default now()
);

insert into public.menu_pdf_settings(id)
values (1)
on conflict (id) do nothing;

create table if not exists public.menu_pdf_category_order (
  category_id uuid primary key
    references public.categories(id)
    on delete cascade,
  position integer not null default 0,
  updated_at timestamptz not null default now()
);

create index if not exists
  menu_pdf_category_order_position_idx
on public.menu_pdf_category_order(position);

alter table public.menu_pdf_settings
  enable row level security;

alter table public.menu_pdf_category_order
  enable row level security;

drop policy if exists
  "menu_pdf_settings_public_read"
on public.menu_pdf_settings;

create policy
  "menu_pdf_settings_public_read"
on public.menu_pdf_settings
for select
to anon, authenticated
using (true);

drop policy if exists
  "menu_pdf_settings_authenticated_write"
on public.menu_pdf_settings;

create policy
  "menu_pdf_settings_authenticated_write"
on public.menu_pdf_settings
for all
to authenticated
using (true)
with check (true);

drop policy if exists
  "menu_pdf_category_order_public_read"
on public.menu_pdf_category_order;

create policy
  "menu_pdf_category_order_public_read"
on public.menu_pdf_category_order
for select
to anon, authenticated
using (true);

drop policy if exists
  "menu_pdf_category_order_authenticated_write"
on public.menu_pdf_category_order;

create policy
  "menu_pdf_category_order_authenticated_write"
on public.menu_pdf_category_order
for all
to authenticated
using (true)
with check (true);

grant select
on public.menu_pdf_settings
to anon, authenticated;

grant select
on public.menu_pdf_category_order
to anon, authenticated;

grant insert, update, delete
on public.menu_pdf_settings
to authenticated;

grant insert, update, delete
on public.menu_pdf_category_order
to authenticated;
