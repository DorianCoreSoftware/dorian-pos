alter table public.delivery_settings
add column if not exists business_address text;

alter table public.delivery_settings
add column if not exists business_place_id text;