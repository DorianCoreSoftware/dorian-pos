/*
 * ============================================================
 * PUBLICIDAD WEB / BANNERS
 * ============================================================
 *
 * - Tabla administrativa de banners.
 * - Lectura pública únicamente de banners activos y vigentes mediante RPC.
 * - Bucket público independiente para imágenes.
 * - Escritura de tabla y Storage limitada a usuarios autenticados.
 */

create table if not exists public.web_banners (
  id uuid primary key default gen_random_uuid(),

  title text,
  description text,

  image_url text not null,
  image_path text not null,

  sort_order integer not null default 0,
  is_active boolean not null default true,

  starts_at timestamptz,
  ends_at timestamptz,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint web_banners_title_length_check
    check (title is null or char_length(title) <= 120),

  constraint web_banners_description_length_check
    check (description is null or char_length(description) <= 500),

  constraint web_banners_schedule_check
    check (
      starts_at is null
      or ends_at is null
      or ends_at > starts_at
    )
);

create index if not exists web_banners_public_order_idx
on public.web_banners (
  is_active,
  sort_order,
  created_at
);


drop trigger if exists set_web_banners_updated_at
on public.web_banners;

create trigger set_web_banners_updated_at
before update
on public.web_banners
for each row
execute function public.set_updated_at();


alter table public.web_banners
  enable row level security;


drop policy if exists
  "authenticated can read web banners"
on public.web_banners;

create policy
  "authenticated can read web banners"
on public.web_banners
for select
to authenticated
using (true);


drop policy if exists
  "authenticated can insert web banners"
on public.web_banners;

create policy
  "authenticated can insert web banners"
on public.web_banners
for insert
to authenticated
with check (true);


drop policy if exists
  "authenticated can update web banners"
on public.web_banners;

create policy
  "authenticated can update web banners"
on public.web_banners
for update
to authenticated
using (true)
with check (true);


drop policy if exists
  "authenticated can delete web banners"
on public.web_banners;

create policy
  "authenticated can delete web banners"
on public.web_banners
for delete
to authenticated
using (true);


/*
 * La web pública NO consulta la tabla directamente.
 * Este RPC evita exponer banners inactivos, futuros o vencidos.
 */
create or replace function public.get_public_web_banners()
returns table (
  id uuid,
  title text,
  description text,
  image_url text,
  sort_order integer
)
language sql
stable
security definer
set search_path = public
as $$
  select
    wb.id,
    wb.title,
    wb.description,
    wb.image_url,
    wb.sort_order
  from public.web_banners wb
  where
    wb.is_active = true
    and (
      wb.starts_at is null
      or wb.starts_at <= now()
    )
    and (
      wb.ends_at is null
      or wb.ends_at >= now()
    )
  order by
    wb.sort_order asc,
    wb.created_at asc;
$$;

revoke all
on function public.get_public_web_banners()
from public;

grant execute
on function public.get_public_web_banners()
to anon, authenticated;


/*
 * ============================================================
 * STORAGE
 * ============================================================
 */
insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'web-banners',
  'web-banners',
  true,
  5242880,
  array[
    'image/jpeg',
    'image/png',
    'image/webp'
  ]
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;


drop policy if exists
  "authenticated can select web banners"
on storage.objects;

create policy
  "authenticated can select web banners"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'web-banners'
);


drop policy if exists
  "authenticated can upload web banners"
on storage.objects;

create policy
  "authenticated can upload web banners"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'web-banners'
);


drop policy if exists
  "authenticated can update web banners"
on storage.objects;

create policy
  "authenticated can update web banners"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'web-banners'
)
with check (
  bucket_id = 'web-banners'
);


drop policy if exists
  "authenticated can delete web banners"
on storage.objects;

create policy
  "authenticated can delete web banners"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'web-banners'
);
