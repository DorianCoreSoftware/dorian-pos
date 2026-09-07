drop policy if exists
  "authenticated can select product images"
on storage.objects;

create policy
  "authenticated can select product images"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'product-images'
);