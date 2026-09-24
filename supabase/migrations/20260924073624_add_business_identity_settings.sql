alter table public.business_settings
add column if not exists business_name text;

alter table public.business_settings
add column if not exists short_name text;

alter table public.business_settings
add column if not exists currency_code text not null default 'MXN';

alter table public.business_settings
add column if not exists phone text;

alter table public.business_settings
add column if not exists logo_url text;

alter table public.business_settings
add column if not exists primary_color text;

alter table public.business_settings
add column if not exists secondary_color text;

alter table public.business_settings
add column if not exists loyalty_enabled boolean not null default true;

alter table public.business_settings
add column if not exists delivery_enabled boolean not null default true;

alter table public.business_settings
add column if not exists promotions_enabled boolean not null default true;

alter table public.business_settings
add column if not exists kitchen_enabled boolean not null default true;

update public.business_settings
set
  business_name = coalesce(business_name, 'Burger Kong'),
  short_name = coalesce(short_name, 'Burger Kong'),
  currency_code = coalesce(currency_code, 'MXN'),
  primary_color = coalesce(primary_color, '#FFBF00'),
  secondary_color = coalesce(secondary_color, '#000000')
where id = 1;