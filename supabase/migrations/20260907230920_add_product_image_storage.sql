-- Bucket público para imágenes del catálogo.
insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'product-images',
  'product-images',
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

-- La lectura pública funciona a través del bucket público.
-- La escritura queda limitada a sesiones autenticadas.
drop policy if exists
  "authenticated can upload product images"
on storage.objects;

create policy
  "authenticated can upload product images"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'product-images'
);

drop policy if exists
  "authenticated can update product images"
on storage.objects;

create policy
  "authenticated can update product images"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'product-images'
)
with check (
  bucket_id = 'product-images'
);

drop policy if exists
  "authenticated can delete product images"
on storage.objects;

create policy
  "authenticated can delete product images"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'product-images'
);