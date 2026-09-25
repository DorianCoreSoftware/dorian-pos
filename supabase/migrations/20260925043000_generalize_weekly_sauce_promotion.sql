/*
 * ============================================================
 * PROMOCIÓN GENÉRICA DE MODIFICADOR - FASE 1
 * ============================================================
 *
 * Conservamos temporalmente los nombres físicos
 * weekly_sauce_settings / get_active_weekly_sauce para no romper
 * funciones transaccionales y checkout existentes.
 *
 * La aplicación deja de limitar la promoción al grupo "sauce" y
 * ahora puede promocionar cualquier modificador disponible.
 */

alter table public.weekly_sauce_settings
add column if not exists display_name text;

update public.weekly_sauce_settings
set display_name = 'Salsa de la Semana'
where
  display_name is null
  or btrim(display_name) = '';

alter table public.weekly_sauce_settings
alter column display_name set default 'Promoción de modificador';

alter table public.weekly_sauce_settings
alter column display_name set not null;

alter table public.weekly_sauce_settings
drop constraint if exists weekly_sauce_settings_display_name_not_blank;

alter table public.weekly_sauce_settings
add constraint weekly_sauce_settings_display_name_not_blank
check (btrim(display_name) <> '');

drop function if exists public.get_active_weekly_sauce();

create function public.get_active_weekly_sauce()
returns table (
  id uuid,
  display_name text,
  modifier_id uuid,
  modifier_name text,
  discount_amount numeric,
  starts_at date,
  ends_at date
)
language sql
stable
set search_path = 'public'
as $$
  select
    wss.id,
    wss.display_name,
    wss.modifier_id,
    m.name as modifier_name,
    wss.discount_amount,
    wss.starts_at,
    wss.ends_at
  from public.weekly_sauce_settings wss
  join public.modifiers m
    on m.id = wss.modifier_id
  where
    wss.is_enabled = true
    and m.is_available = true
    and (
      wss.starts_at is null
      or current_date >= wss.starts_at
    )
    and (
      wss.ends_at is null
      or current_date <= wss.ends_at
    )
  order by wss.updated_at desc
  limit 1;
$$;

grant execute
on function public.get_active_weekly_sauce()
to anon, authenticated, postgres, service_role;

alter table public.order_weekly_sauce_discounts
add column if not exists promotion_name text;

update public.order_weekly_sauce_discounts
set promotion_name = 'Salsa de la Semana'
where
  promotion_name is null
  or btrim(promotion_name) = '';

alter table public.order_weekly_sauce_discounts
alter column promotion_name set default 'Promoción de modificador';

alter table public.order_weekly_sauce_discounts
alter column promotion_name set not null;

create or replace function public.apply_weekly_sauce_discounts(
  p_order_id uuid
)
returns numeric
language plpgsql
set search_path = 'public'
as $$
declare
  v_modifier_id uuid;
  v_promotion_name text;
  v_discount_amount numeric(10,2);
  v_total_discount numeric(10,2) := 0;
begin
  if p_order_id is null then
    raise exception
      'El identificador de la orden es obligatorio.';
  end if;

  delete from public.order_weekly_sauce_discounts
  where order_id = p_order_id;

  select
    promotion.modifier_id,
    promotion.display_name,
    promotion.discount_amount
  into
    v_modifier_id,
    v_promotion_name,
    v_discount_amount
  from public.get_active_weekly_sauce() promotion
  limit 1;

  if
    v_modifier_id is null
    or v_discount_amount is null
    or v_discount_amount <= 0
  then
    return 0;
  end if;

  insert into public.order_weekly_sauce_discounts (
    order_id,
    order_item_id,
    order_item_component_id,
    modifier_id,
    promotion_name,
    discount_amount
  )
  select
    oi.order_id,
    oi.id,
    null,
    v_modifier_id,
    v_promotion_name,
    (
      v_discount_amount *
      oi.quantity
    )
  from public.order_items oi
  where
    oi.order_id = p_order_id
    and exists (
      select 1
      from public.order_item_modifiers oim
      where
        oim.order_item_id = oi.id
        and oim.modifier_id = v_modifier_id
    );

  insert into public.order_weekly_sauce_discounts (
    order_id,
    order_item_id,
    order_item_component_id,
    modifier_id,
    promotion_name,
    discount_amount
  )
  select
    oi.order_id,
    null,
    oic.id,
    v_modifier_id,
    v_promotion_name,
    (
      v_discount_amount *
      oi.quantity *
      oic.quantity
    )
  from public.order_item_components oic
  join public.order_items oi
    on oi.id = oic.order_item_id
  where
    oi.order_id = p_order_id
    and exists (
      select 1
      from public.order_item_component_modifiers oicm
      where
        oicm.order_item_component_id = oic.id
        and oicm.modifier_id = v_modifier_id
    );

  select
    coalesce(
      sum(discount.discount_amount),
      0
    )
  into
    v_total_discount
  from public.order_weekly_sauce_discounts discount
  where
    discount.order_id = p_order_id;

  return v_total_discount;
end;
$$;
