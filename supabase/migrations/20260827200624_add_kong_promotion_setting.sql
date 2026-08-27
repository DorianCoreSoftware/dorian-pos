alter table public.promo_settings
add column if not exists kong_enabled boolean not null default true;