/*
 * Dorian POS - backend enforcement for business feature flags.
 *
 * The UI already hides disabled modules. These triggers make the same
 * configuration authoritative at the database boundary so direct RPC/API
 * calls cannot create new activity for a disabled feature.
 */

create or replace function public.is_business_feature_enabled(
  p_feature text
)
returns boolean
language plpgsql
stable
security definer
set search_path to 'public'
as $function$
declare
  v_enabled boolean;
begin
  case lower(trim(coalesce(p_feature, '')))
    when 'delivery' then
      select delivery_enabled into v_enabled
      from public.business_settings
      where id = 1;

    when 'loyalty' then
      select loyalty_enabled into v_enabled
      from public.business_settings
      where id = 1;

    when 'promotions' then
      select promotions_enabled into v_enabled
      from public.business_settings
      where id = 1;

    when 'kitchen' then
      select kitchen_enabled into v_enabled
      from public.business_settings
      where id = 1;

    else
      raise exception 'Feature de negocio desconocida: %', p_feature;
  end case;

  return coalesce(v_enabled, false);
end;
$function$;

revoke all on function public.is_business_feature_enabled(text) from public;
grant execute on function public.is_business_feature_enabled(text) to authenticated, anon, service_role;

create or replace function public.enforce_delivery_feature_on_orders()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
begin
  if new.fulfillment_type = 'delivery'
     and not public.is_business_feature_enabled('delivery')
  then
    if tg_op = 'INSERT' then
      raise exception 'Las entregas a domicilio están deshabilitadas para este negocio.';
    elsif old.fulfillment_type is distinct from new.fulfillment_type then
      raise exception 'Las entregas a domicilio están deshabilitadas para este negocio.';
    end if;
  end if;

  return new;
end;
$function$;

drop trigger if exists orders_enforce_delivery_feature on public.orders;
create trigger orders_enforce_delivery_feature
before insert or update of fulfillment_type on public.orders
for each row execute function public.enforce_delivery_feature_on_orders();

create or replace function public.enforce_business_feature_insert()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_feature text := tg_argv[0];
begin
  if not public.is_business_feature_enabled(v_feature) then
    case v_feature
      when 'loyalty' then
        raise exception 'Rewards está deshabilitado para este negocio.';
      when 'promotions' then
        raise exception 'Las promociones están deshabilitadas para este negocio.';
      else
        raise exception 'La función % está deshabilitada para este negocio.', v_feature;
    end case;
  end if;

  return new;
end;
$function$;

-- Loyalty: preserve historical data, but reject new activity while disabled.
drop trigger if exists loyalty_customers_enforce_feature on public.loyalty_customers;
create trigger loyalty_customers_enforce_feature
before insert on public.loyalty_customers
for each row execute function public.enforce_business_feature_insert('loyalty');

drop trigger if exists loyalty_visits_enforce_feature on public.loyalty_visits;
create trigger loyalty_visits_enforce_feature
before insert on public.loyalty_visits
for each row execute function public.enforce_business_feature_insert('loyalty');

drop trigger if exists loyalty_redemptions_enforce_feature on public.loyalty_redemptions;
create trigger loyalty_redemptions_enforce_feature
before insert on public.loyalty_redemptions
for each row execute function public.enforce_business_feature_insert('loyalty');

-- Promotions: existing coupons/history remain readable, but no new coupons
-- or redemptions are generated while the feature is disabled.
drop trigger if exists promo_coupons_enforce_feature on public.promo_coupons;
create trigger promo_coupons_enforce_feature
before insert on public.promo_coupons
for each row execute function public.enforce_business_feature_insert('promotions');

drop trigger if exists promo_redemptions_enforce_feature on public.promo_redemptions;
create trigger promo_redemptions_enforce_feature
before insert on public.promo_redemptions
for each row execute function public.enforce_business_feature_insert('promotions');

comment on function public.is_business_feature_enabled(text) is
'Central feature-flag check used by backend enforcement. business_settings id=1 is authoritative.';
