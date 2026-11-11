-- ============================================================
-- DORIANCORE
-- FIX DEFINITIVO quantity_deal para create_web_order()
-- ============================================================
--
-- El esquema DEV ya contiene una tabla legacy llamada:
--   order_quantity_promotion_discounts
--
-- con una estructura distinta.
--
-- Para aplicar correctamente el descuento esa tabla NO es necesaria.
-- Esta migración reemplaza apply_quantity_promotion_discounts()
-- por una versión puramente autoritativa que:
--
-- - lee promociones activas desde get_active_quantity_promotions();
-- - lee cantidades/precios reales desde order_items;
-- - calcula compra X / paga Y;
-- - devuelve únicamente el descuento total;
-- - NO depende de tablas de auditoría legacy.
--
-- create_web_order() ya llama esta función en el return FINAL
-- gracias a la migración anterior.
-- ============================================================

create or replace function
public.apply_quantity_promotion_discounts(
  p_order_id uuid
)
returns numeric
language plpgsql
security definer
set search_path = public
as $$
declare
  v_promotion record;

  v_quantity integer;
  v_unit_price numeric(10,2);

  v_groups integer;
  v_free_quantity integer;

  v_discount numeric(10,2);
  v_total_discount numeric(10,2) := 0;
begin
  if p_order_id is null then
    raise exception
      'El identificador de la orden es obligatorio.';
  end if;

  /*
   * Cada promoción activa ya viene filtrada por vigencia,
   * días y disponibilidad desde get_active_quantity_promotions().
   */
  for v_promotion in
    select
      promotion.id,
      promotion.display_name,
      promotion.target_product_id,
      promotion.buy_quantity,
      promotion.pay_quantity,
      promotion.priority
    from
      public.get_active_quantity_promotions()
      promotion
    order by
      promotion.priority asc,
      promotion.id asc
  loop
    /*
     * La fuente de verdad es order_items ya creada por checkout.
     * Si el mismo producto está dividido en varias líneas,
     * sumamos las cantidades y usamos el menor precio unitario,
     * igual que la lógica del frontend/agente.
     */
    select
      coalesce(
        sum(item.quantity),
        0
      )::integer,
      min(
        item.price_at_purchase
      )
    into
      v_quantity,
      v_unit_price
    from
      public.order_items item
    where
      item.order_id =
        p_order_id
      and item.product_id =
        v_promotion.target_product_id;

    if
      v_quantity <= 0
      or v_unit_price is null
      or v_unit_price < 0
      or v_promotion.buy_quantity < 2
      or v_promotion.pay_quantity < 1
      or v_promotion.pay_quantity >=
        v_promotion.buy_quantity
    then
      continue;
    end if;

    v_groups :=
      floor(
        v_quantity::numeric /
        v_promotion.buy_quantity
      )::integer;

    if v_groups <= 0 then
      continue;
    end if;

    v_free_quantity :=
      v_groups *
      (
        v_promotion.buy_quantity -
        v_promotion.pay_quantity
      );

    v_discount :=
      round(
        v_free_quantity *
        v_unit_price,
        2
      );

    if v_discount <= 0 then
      continue;
    end if;

    v_total_discount :=
      v_total_discount +
      v_discount;
  end loop;

  return round(
    v_total_discount,
    2
  );
end;
$$;

revoke all
on function
public.apply_quantity_promotion_discounts(uuid)
from public;

grant execute
on function
public.apply_quantity_promotion_discounts(uuid)
to authenticated;


/*
 * Verificación rápida de que create_web_order sigue llamando
 * al cálculo en su definición actual.
 */
do $verify$
declare
  v_definition text;
begin
  select
    pg_get_functiondef(
      'public.create_web_order(jsonb,jsonb,uuid,text,text,text)'::regprocedure
    )
  into
    v_definition;

  if position(
    'apply_quantity_promotion_discounts'
    in v_definition
  ) = 0 then
    raise exception
      'create_web_order ya no contiene la llamada a apply_quantity_promotion_discounts().';
  end if;
end;
$verify$;
