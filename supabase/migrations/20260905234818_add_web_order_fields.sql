/*
 * ============================================================
 * WEB ORDERS PREPARATION
 * ============================================================
 *
 * Agrega:
 *
 * - order_source
 *     pos
 *     web
 *
 * - fulfillment_type
 *     pickup
 *     delivery
 *
 * Mantiene compatibles los RPC anteriores.
 */


/*
 * ============================================================
 * 1. NUEVAS COLUMNAS EN ORDERS
 * ============================================================
 */

alter table public.orders
add column order_source text default 'pos';

alter table public.orders
add column fulfillment_type text default 'pickup';


/*
 * ============================================================
 * 2. MIGRAR ÓRDENES HISTÓRICAS
 * ============================================================
 *
 * Todas las órdenes actuales pertenecen al POS.
 */

update public.orders
set order_source = 'pos'
where order_source is null;


/*
 * Si una orden histórica tiene datos de domicilio,
 * se considera delivery.
 */

update public.orders o
set fulfillment_type = 'delivery'
where exists (
  select 1
  from public.order_delivery_details odd
  where odd.order_id = o.id
);


/*
 * El resto se considera pickup.
 */

update public.orders
set fulfillment_type = 'pickup'
where fulfillment_type is null;


/*
 * ============================================================
 * 3. HACER LOS CAMPOS OBLIGATORIOS
 * ============================================================
 */

alter table public.orders
alter column order_source set not null;

alter table public.orders
alter column fulfillment_type set not null;


/*
 * ============================================================
 * 4. RESTRICCIONES
 * ============================================================
 */

alter table public.orders
add constraint orders_order_source_check
check (
  order_source in (
    'pos',
    'web'
  )
);


alter table public.orders
add constraint orders_fulfillment_type_check
check (
  fulfillment_type in (
    'pickup',
    'delivery'
  )
);


/*
 * ============================================================
 * 5. CREATE KITCHEN ORDER
 * ============================================================
 *
 * NO reemplazamos la función actual:
 *
 * create_kitchen_order(
 *   numeric,
 *   jsonb,
 *   jsonb,
 *   uuid
 * )
 *
 * Creamos una nueva sobrecarga que recibe:
 *
 * order_source
 * fulfillment_type
 *
 * y reutiliza toda la lógica existente.
 */

create or replace function public.create_kitchen_order(
  p_total numeric,
  p_items jsonb,
  p_delivery jsonb,
  p_client_request_id uuid,
  p_order_source text,
  p_fulfillment_type text
)
returns uuid
language plpgsql
set search_path = 'public'
as $$
declare
  v_order_id uuid;
begin

  /*
   * ============================
   * VALIDAR ORIGEN
   * ============================
   */

  if p_order_source not in (
    'pos',
    'web'
  ) then

    raise exception
      'El origen de la orden no es válido.';

  end if;


  /*
   * ============================
   * VALIDAR TIPO DE ENTREGA
   * ============================
   */

  if p_fulfillment_type not in (
    'pickup',
    'delivery'
  ) then

    raise exception
      'El tipo de entrega de la orden no es válido.';

  end if;


  /*
   * ============================
   * CREAR ORDEN
   * ============================
   *
   * Llamamos al RPC actual para conservar:
   *
   * - validaciones
   * - idempotencia
   * - items
   * - modificadores
   * - componentes
   * - domicilio
   * - Salsa de la Semana
   */

  v_order_id :=
    public.create_kitchen_order(
      p_total,
      p_items,
      p_delivery,
      p_client_request_id
    );


  /*
   * ============================
   * ACTUALIZAR METADATOS
   * ============================
   */

  update public.orders
  set
    order_source =
      p_order_source,

    fulfillment_type =
      p_fulfillment_type

  where id =
    v_order_id;


  return v_order_id;

end;
$$;


/*
 * ============================================================
 * 6. UPDATE KITCHEN ORDER
 * ============================================================
 *
 * Conservamos el RPC actual:
 *
 * update_kitchen_order(
 *   uuid,
 *   numeric,
 *   jsonb,
 *   jsonb
 * )
 *
 * y agregamos fulfillment_type.
 */

create or replace function public.update_kitchen_order(
  p_order_id uuid,
  p_total numeric,
  p_items jsonb,
  p_delivery jsonb,
  p_fulfillment_type text
)
returns void
language plpgsql
set search_path = 'public'
as $$
begin

  /*
   * ============================
   * VALIDAR TIPO DE ENTREGA
   * ============================
   */

  if p_fulfillment_type not in (
    'pickup',
    'delivery'
  ) then

    raise exception
      'El tipo de entrega de la orden no es válido.';

  end if;


  /*
   * ============================
   * ACTUALIZAR ORDEN
   * ============================
   *
   * Ejecutamos primero toda la lógica
   * actual de actualización.
   */

  perform public.update_kitchen_order(
    p_order_id,
    p_total,
    p_items,
    p_delivery
  );


  /*
   * Después actualizamos únicamente
   * el tipo de entrega.
   *
   * order_source NO cambia al editar:
   * una orden creada en POS sigue siendo POS,
   * una creada en web sigue siendo web.
   */

  update public.orders
  set fulfillment_type =
    p_fulfillment_type

  where id =
    p_order_id;

end;
$$;


/*
 * ============================================================
 * 7. PERMISOS DE LOS NUEVOS RPC
 * ============================================================
 */

grant execute on function
public.create_kitchen_order(
  numeric,
  jsonb,
  jsonb,
  uuid,
  text,
  text
)
to
  public,
  anon,
  authenticated,
  postgres,
  service_role;


grant execute on function
public.update_kitchen_order(
  uuid,
  numeric,
  jsonb,
  jsonb,
  text
)
to
  public,
  anon,
  authenticated,
  postgres,
  service_role;