-- DORIAN AI ORDERS - AUMENTAR LIMITE DE AVATAR
-- 2026-11-18

update storage.buckets
set
  file_size_limit = 10485760,
  allowed_mime_types = array[
    'image/jpeg',
    'image/png',
    'image/webp'
  ]
where id = 'ai-order-assistant';

do $$
begin
  if not exists (
    select 1
    from storage.buckets
    where id = 'ai-order-assistant'
  ) then
    raise exception
      'No existe el bucket ai-order-assistant. Aplica primero la migración base del avatar.';
  end if;
end
$$;
