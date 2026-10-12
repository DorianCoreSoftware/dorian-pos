-- Dorian POS
-- Fix: RLS bloquea order_modifier_promotion_discounts
--
-- La tabla mantiene RLS habilitado y SIN abrir INSERT directo.
-- Solo la función controlada que recalcula la promoción obtiene
-- privilegios de definer.
--
-- Importante:
-- - No cambia políticas de la tabla.
-- - No usa WITH CHECK (true).
-- - No eleva create_kitchen_order ni update_kitchen_order.
-- - Revoca ejecución directa a PUBLIC/anon.
-- - authenticated puede invocar la función, pero el importe y el
--   modificador siempre se calculan desde la configuración activa.

create or replace function public.apply_modifier_promotion_discounts(
  p_order_id uuid
)
returns numeric
language plpgsql
security definer
set search_path to 'public'
as $function$
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

  if not exists (
    select 1
    from public.orders o
    where o.id = p_order_id
  ) then
    raise exception
      'La orden no existe.';
  end if;

  delete from public.order_modifier_promotion_discounts
  where order_id = p_order_id;

  select
    promotion.modifier_id,
    promotion.display_name,
    promotion.discount_amount
  into
    v_modifier_id,
    v_promotion_name,
    v_discount_amount
  from public.get_active_modifier_promotion() promotion
  limit 1;

  if
    v_modifier_id is null
    or v_discount_amount is null
    or v_discount_amount <= 0
  then
    return 0;
  end if;

  insert into public.order_modifier_promotion_discounts (
    order_id,
    order_item_id,
    order_item_component_id,
    modifier_id,
    promotion_name,
    discount_amount
  )
  select
    item.order_id,
    item.id,
    null,
    v_modifier_id,
    v_promotion_name,
    v_discount_amount * item.quantity
  from public.order_items item
  where
    item.order_id = p_order_id
    and exists (
      select 1
      from public.order_item_modifiers item_modifier
      where
        item_modifier.order_item_id = item.id
        and item_modifier.modifier_id = v_modifier_id
    );

  insert into public.order_modifier_promotion_discounts (
    order_id,
    order_item_id,
    order_item_component_id,
    modifier_id,
    promotion_name,
    discount_amount
  )
  select
    item.order_id,
    null,
    component.id,
    v_modifier_id,
    v_promotion_name,
    v_discount_amount * item.quantity * component.quantity
  from public.order_item_components component
  join public.order_items item
    on item.id = component.order_item_id
  where
    item.order_id = p_order_id
    and exists (
      select 1
      from public.order_item_component_modifiers component_modifier
      where
        component_modifier.order_item_component_id = component.id
        and component_modifier.modifier_id = v_modifier_id
    );

  select
    coalesce(
      sum(discount.discount_amount),
      0
    )
  into
    v_total_discount
  from public.order_modifier_promotion_discounts discount
  where
    discount.order_id = p_order_id;

  return v_total_discount;
end;
$function$;

revoke all
on function public.apply_modifier_promotion_discounts(uuid)
from public;

revoke all
on function public.apply_modifier_promotion_discounts(uuid)
from anon;

grant execute
on function public.apply_modifier_promotion_discounts(uuid)
to authenticated;
