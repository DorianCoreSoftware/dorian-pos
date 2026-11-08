-- DORIAN AI ORDERS - AVATAR DEL ASISTENTE
-- 2026-11-06

alter table public.ai_order_settings
add column if not exists assistant_avatar_url text null;

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'ai-order-assistant',
  'ai-order-assistant',
  true,
  2097152,
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

drop policy if exists "Admins upload AI order assistant avatar"
on storage.objects;

create policy "Admins upload AI order assistant avatar"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'ai-order-assistant'
  and exists (
    select 1
    from public.profiles profile
    where profile.id = auth.uid()
      and profile.role = 'admin'::public.user_role
      and coalesce(profile.is_active, true) = true
  )
);

drop policy if exists "Admins update AI order assistant avatar"
on storage.objects;

create policy "Admins update AI order assistant avatar"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'ai-order-assistant'
  and exists (
    select 1
    from public.profiles profile
    where profile.id = auth.uid()
      and profile.role = 'admin'::public.user_role
      and coalesce(profile.is_active, true) = true
  )
)
with check (
  bucket_id = 'ai-order-assistant'
  and exists (
    select 1
    from public.profiles profile
    where profile.id = auth.uid()
      and profile.role = 'admin'::public.user_role
      and coalesce(profile.is_active, true) = true
  )
);

drop policy if exists "Admins delete AI order assistant avatar"
on storage.objects;

create policy "Admins delete AI order assistant avatar"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'ai-order-assistant'
  and exists (
    select 1
    from public.profiles profile
    where profile.id = auth.uid()
      and profile.role = 'admin'::public.user_role
      and coalesce(profile.is_active, true) = true
  )
);

comment on column public.ai_order_settings.assistant_avatar_url is
  'Foto de perfil configurable para DORIAN AI.';
