-- ============================================================
-- DORIANCORE
-- Promociones por cantidad autoritativas en create_web_order()
-- ============================================================
--
-- Objetivo:
-- - El checkout real debe aplicar la misma promoción quantity_deal
--   que ya muestran POS/Web/AI en sus resúmenes.
-- - Se calcula desde order_items ya validados por create_web_order().
-- - El cliente/IA nunca decide el monto del descuento.
-- - Conserva la definición ACTUAL de create_web_order() e inyecta
--   únicamente el paso final antes de devolver v_order_id.
-- ============================================================

create table if not exists
public.order_quantity_promotion_discounts (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null
    references public.orders(id)
    on delete cascade,
  promotion_id uuid not null
    references public.promotion_programs(id)
    on delete restrict,
  promotion_name text not null,
  product_id uuid not null
    references public.products(id)
    on delete restrict,
  qualifying_quantity integer not null,
  free_quantity integer not null,
  discount_amount numeric(10,2) not null,
  created_at timestamptz not null default now(),
  constraint order_quantity_promotion_discounts_amount_check
    check (discount_amount >= 0),
  constraint order_quantity_promotion_discounts_quantity_check
    check (
      qualifying_quantity > 0
      and free_quantity > 0
    ),
  constraint order_quantity_promotion_discounts_unique
    unique (order_id, promotion_id)
);

create index if not exists
order_quantity_promotion_discounts_order_idx
on public.order_quantity_promotion_discounts(order_id);

alter table public.order_quantity_promotion_discounts
enable row level security;

drop policy if exists
"authenticated can read order quantity promotion discounts"
on public.order_quantity_promotion_discounts;

create policy
"authenticated can read order quantity promotion discounts"
on public.order_quantity_promotion_discounts
for select
to authenticated
using (true);

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

  delete from
    public.order_quantity_promotion_discounts
  where order_id = p_order_id;

  for v_promotion in
    select
      promotion.id,
      promotion.display_name,
      promotion.target_product_id,
      promotion.buy_quantity,
      promotion.pay_quantity
    from
      public.get_active_quantity_promotions()
      promotion
    order by
      promotion.priority asc,
      promotion.id asc
  loop
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
      item.order_id = p_order_id
      and item.product_id =
        v_promotion.target_product_id
      and coalesce(
        item.reward_source,
        ''
      ) = '';

    if
      v_quantity <= 0
      or v_unit_price is null
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

    insert into
      public.order_quantity_promotion_discounts (
        order_id,
        promotion_id,
        promotion_name,
        product_id,
        qualifying_quantity,
        free_quantity,
        discount_amount
      )
    values (
      p_order_id,
      v_promotion.id,
      v_promotion.display_name,
      v_promotion.target_product_id,
      v_groups *
        v_promotion.buy_quantity,
      v_free_quantity,
      v_discount
    )
    on conflict (
      order_id,
      promotion_id
    )
    do update set
      promotion_name =
        excluded.promotion_name,
      product_id =
        excluded.product_id,
      qualifying_quantity =
        excluded.qualifying_quantity,
      free_quantity =
        excluded.free_quantity,
      discount_amount =
        excluded.discount_amount;

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
 * Inserta el cálculo en la definición vigente de create_web_order()
 * sin reemplazar manualmente la función completa.
 */
do $migration$
declare
  v_signature regprocedure;
  v_current_definition text;
  v_updated_definition text;
  v_marker constant text :=
    'DORIAN_QUANTITY_PROMOTION_CHECKOUT_V1';
begin
  v_signature :=
    to_regprocedure(
      'public.create_web_order(jsonb,jsonb,uuid,text,text,text)'
    );

  if v_signature is null then
    raise exception
      'No existe public.create_web_order(jsonb,jsonb,uuid,text,text,text).';
  end if;

  select
    pg_get_functiondef(
      v_signature
    )
  into
    v_current_definition;

  if position(
    v_marker
    in v_current_definition
  ) > 0 then
    return;
  end if;

  /*
   * Inyectamos justo antes del return final.
   * El pedido y sus items ya existen en este punto.
   */
  v_updated_definition :=
    regexp_replace(
      v_current_definition,
      E'\\n[[:space:]]*return[[:space:]]+v_order_id;[[:space:]]*\\n',
      E'\n  /* DORIAN_QUANTITY_PROMOTION_CHECKOUT_V1 */\n'
      || E'  declare\n'
      || E'    v_quantity_promotion_discount numeric(10,2);\n'
      || E'  begin\n'
      || E'    v_quantity_promotion_discount :=\n'
      || E'      public.apply_quantity_promotion_discounts(v_order_id);\n\n'
      || E'    if coalesce(v_quantity_promotion_discount, 0) > 0 then\n'
      || E'      update public.orders\n'
      || E'      set total = greatest(\n'
      || E'        0,\n'
      || E'        round(total - v_quantity_promotion_discount, 2)\n'
      || E'      )\n'
      || E'      where id = v_order_id;\n'
      || E'    end if;\n'
      || E'  end;\n\n'
      || E'  return v_order_id;\n',
      'i'
    );

  if
    v_updated_definition =
    v_current_definition
  then
    raise exception
      'No se encontró el return final de create_web_order para insertar promociones por cantidad.';
  end if;

  execute v_updated_definition;
end;
$migration$;


/*
 * La variante de 7 parámetros (cuenta web) delega a la base de
 * 6 parámetros en el esquema vigente, por lo que queda cubierta
 * automáticamente.
 */
