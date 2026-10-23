/*
 * Dorian POS - protect settings managed by DorianCore.
 *
 * Business users may continue updating operational/customer-owned settings,
 * but authenticated client sessions cannot directly change branding or
 * feature entitlements. DorianCore backend/service-role operations remain
 * able to manage these fields.
 */

create or replace function public.protect_doriancore_managed_business_settings()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.role() = 'authenticated'
     and (
       new.logo_url is distinct from old.logo_url
       or new.primary_color is distinct from old.primary_color
       or new.secondary_color is distinct from old.secondary_color
       or new.loyalty_enabled is distinct from old.loyalty_enabled
       or new.delivery_enabled is distinct from old.delivery_enabled
       or new.promotions_enabled is distinct from old.promotions_enabled
       or new.kitchen_enabled is distinct from old.kitchen_enabled
     )
  then
    raise exception
      'La identidad visual y las funciones habilitadas son administradas por DorianCore.';
  end if;

  return new;
end;
$$;

drop trigger if exists business_settings_protect_doriancore_managed
on public.business_settings;

create trigger business_settings_protect_doriancore_managed
before update on public.business_settings
for each row
execute function public.protect_doriancore_managed_business_settings();

comment on function public.protect_doriancore_managed_business_settings() is
'Prevents authenticated client sessions from changing DorianCore-managed branding and feature entitlement fields.';
