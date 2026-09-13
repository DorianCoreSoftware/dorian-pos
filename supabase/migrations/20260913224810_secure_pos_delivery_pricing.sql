/*
 * ============================================================
 * SECURE POS DELIVERY PRICING
 * ============================================================
 *
 * Objetivo:
 *
 * - Recalcular la tarifa de domicilio en backend.
 * - No confiar en el precio de envío recibido desde el POS.
 * - Mantener intactas las funciones base de 4 parámetros.
 * - Guardar snapshot de zona/distancia/tarifas en orders.
 * - Aplicar la misma lógica al crear y editar.
 */


/*
 * ============================================================
 * 1. CREATE KITCHEN ORDER
 * ============================================================
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

  v_item jsonb;
  v_safe_items jsonb := '[]'::jsonb;

  v_product_id uuid;
  v_product_name text;

  v_delivery_product_id uuid;
  v_delivery_base_fee numeric(10,2);

  v_client_delivery_fee numeric(10,2) := 0;
  v_delivery_extra_fee numeric(10,2) := 0;
  v_delivery_total_fee numeric(10,2) := 0;

  v_delivery_zone_id uuid;
  v_delivery_zone_name text;
  v_delivery_distance_km numeric(8,2);

  v_quote_available boolean;

  v_latitude numeric;
  v_longitude numeric;

  v_safe_total numeric(10,2);

  v_delivery_item_count integer := 0;

begin

  /*
   * ==========================================================
   * VALIDACIONES GENERALES
   * ==========================================================
   */

  if p_client_request_id is null then
    raise exception
      'El identificador de la solicitud es obligatorio.';
  end if;


  /*
   * Idempotencia.
   *
   * Si ya existe esta solicitud NO recalculamos nada,
   * porque un retry no debe modificar una orden existente.
   */

  select id
  into v_order_id
  from public.orders
  where client_request_id =
    p_client_request_id;

  if v_order_id is not null then
    return v_order_id;
  end if;


  if p_order_source not in (
    'pos',
    'web'
  ) then
    raise exception
      'El origen de la orden no es válido.';
  end if;


  if p_fulfillment_type not in (
    'pickup',
    'delivery'
  ) then
    raise exception
      'El tipo de entrega de la orden no es válido.';
  end if;


  if
    p_total is null
    or p_total < 0
  then
    raise exception
      'El total de la orden no es válido.';
  end if;


  if
    p_items is null
    or jsonb_typeof(p_items) <> 'array'
    or jsonb_array_length(p_items) = 0
  then
    raise exception
      'La orden debe contener al menos un producto.';
  end if;


  /*
   * De inicio conservamos el total del POS.
   *
   * Ese total ya puede incluir:
   *
   * - precios
   * - modificadores
   * - combos
   * - Salsa de la Semana
   *
   * Solo sustituiremos la parte correspondiente
   * a la tarifa de domicilio.
   */

  v_safe_total := p_total;


  /*
   * ==========================================================
   * PICKUP
   * ==========================================================
   */

  if p_fulfillment_type = 'pickup' then

    v_order_id :=
      public.create_kitchen_order(
        p_total,
        p_items,
        null,
        p_client_request_id
      );

    update public.orders
    set
      order_source =
        p_order_source,

      fulfillment_type =
        'pickup',

      delivery_zone_id =
        null,

      delivery_zone_name =
        null,

      delivery_distance_km =
        null,

      delivery_base_fee =
        null,

      delivery_extra_fee =
        null,

      delivery_total_fee =
        null

    where id =
      v_order_id;


    return v_order_id;

  end if;


  /*
   * ==========================================================
   * DELIVERY
   * ==========================================================
   */

  if
    p_delivery is null
    or jsonb_typeof(p_delivery) <> 'object'
  then
    raise exception
      'Los datos de domicilio son obligatorios.';
  end if;


  /*
   * Coordenadas obligatorias.
   */

  begin
    v_latitude :=
      nullif(
        p_delivery ->>
        'latitude',
        ''
      )::numeric;

    v_longitude :=
      nullif(
        p_delivery ->>
        'longitude',
        ''
      )::numeric;

  exception
    when others then
      raise exception
        'Las coordenadas de entrega no son válidas.';
  end;


  if
    v_latitude is null
    or v_longitude is null
  then
    raise exception
      'La ubicación de entrega es obligatoria.';
  end if;


  if
    v_latitude < -90
    or v_latitude > 90
    or v_longitude < -180
    or v_longitude > 180
  then
    raise exception
      'Las coordenadas de entrega no son válidas.';
  end if;


  /*
   * ==========================================================
   * COTIZACIÓN REAL
   * ==========================================================
   */

  select
    quote.available,
    quote.distance_km,
    quote.zone_id,
    quote.zone_name,
    quote.extra_fee

  into
    v_quote_available,
    v_delivery_distance_km,
    v_delivery_zone_id,
    v_delivery_zone_name,
    v_delivery_extra_fee

  from public.get_delivery_quote(
    v_latitude,
    v_longitude
  ) quote

  limit 1;


  if
    v_quote_available is distinct from true
  then
    raise exception
      'La dirección está fuera de nuestra zona de reparto.';
  end if;


  /*
   * ==========================================================
   * PRODUCTO REAL DE DOMICILIO
   * ==========================================================
   */

  select
    p.id,
    p.price

  into
    v_delivery_product_id,
    v_delivery_base_fee

  from public.products p

  where
    lower(
      trim(
        p.name
      )
    ) in (
      'envío a domicilio',
      'envio a domicilio'
    )

    and p.is_active = true
    and p.is_available = true

  order by
    p.created_at desc

  limit 1;


  if v_delivery_product_id is null then
    raise exception
      'El servicio a domicilio no está disponible.';
  end if;


  v_delivery_base_fee :=
    coalesce(
      v_delivery_base_fee,
      0
    );

  v_delivery_extra_fee :=
    coalesce(
      v_delivery_extra_fee,
      0
    );

  v_delivery_total_fee :=
    v_delivery_base_fee +
    v_delivery_extra_fee;


  /*
   * ==========================================================
   * NORMALIZAR ITEMS
   * ==========================================================
   *
   * Conservamos todos los items recibidos por el POS,
   * excepto que al producto de domicilio le imponemos:
   *
   * quantity = 1
   * price    = tarifa backend
   * modifiers/components vacíos
   */

  for v_item in
    select value
    from jsonb_array_elements(
      p_items
    )
  loop

    begin
      v_product_id :=
        (
          v_item ->>
          'productId'
        )::uuid;

    exception
      when others then
        raise exception
          'Uno de los productos de la orden no es válido.';
    end;


    select
      p.name
    into
      v_product_name

    from public.products p
    where p.id =
      v_product_id;


    if not found then
      raise exception
        'Uno de los productos de la orden no existe.';
    end if;


    /*
     * Producto de domicilio.
     */

    if
      v_product_id =
        v_delivery_product_id
      or lower(
        trim(
          v_product_name
        )
      ) in (
        'envío a domicilio',
        'envio a domicilio'
      )
    then

      v_delivery_item_count :=
        v_delivery_item_count + 1;


      /*
       * Guardamos cuánto pretendía cobrar
       * el cliente solamente para corregir
       * el total posteriormente.
       */

      begin
        v_client_delivery_fee :=
          coalesce(
            (
              v_item ->>
              'price'
            )::numeric,
            0
          );

      exception
        when others then
          v_client_delivery_fee := 0;
      end;


      v_safe_items :=
        v_safe_items ||
        jsonb_build_array(
          jsonb_build_object(
            'productId',
            v_delivery_product_id,

            'quantity',
            1,

            'price',
            v_delivery_total_fee,

            'notes',
            '',

            'modifiers',
            jsonb_build_array(),

            'components',
            jsonb_build_array()
          )
        );


      continue;

    end if;


    /*
     * Item normal.
     */

    v_safe_items :=
      v_safe_items ||
      jsonb_build_array(
        v_item
      );

  end loop;


  /*
   * Debe existir exactamente un producto
   * de domicilio dentro del carrito POS.
   */

  if v_delivery_item_count = 0 then
    raise exception
      'La orden de domicilio no contiene el cargo de envío.';
  end if;


  if v_delivery_item_count > 1 then
    raise exception
      'La orden contiene más de un cargo de envío.';
  end if;


  /*
   * ==========================================================
   * TOTAL CORREGIDO
   * ==========================================================
   *
   * El total del POS ya contiene el precio del
   * item de domicilio.
   *
   * Quitamos ese valor y colocamos el calculado
   * por el servidor.
   */

  v_safe_total :=
    greatest(
      0,
      p_total -
      v_client_delivery_fee +
      v_delivery_total_fee
    );


  /*
   * ==========================================================
   * CREAR ORDEN
   * ==========================================================
   *
   * Reutilizamos la función transaccional existente
   * de 4 parámetros.
   */

  v_order_id :=
    public.create_kitchen_order(
      v_safe_total,
      v_safe_items,
      p_delivery,
      p_client_request_id
    );


  /*
   * ==========================================================
   * SNAPSHOT
   * ==========================================================
   */

  update public.orders
  set
    order_source =
      p_order_source,

    fulfillment_type =
      'delivery',

    delivery_zone_id =
      v_delivery_zone_id,

    delivery_zone_name =
      v_delivery_zone_name,

    delivery_distance_km =
      v_delivery_distance_km,

    delivery_base_fee =
      v_delivery_base_fee,

    delivery_extra_fee =
      v_delivery_extra_fee,

    delivery_total_fee =
      v_delivery_total_fee

  where id =
    v_order_id;


  return v_order_id;

end;
$$;


/*
 * ============================================================
 * 2. UPDATE KITCHEN ORDER
 * ============================================================
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
declare
  v_item jsonb;
  v_safe_items jsonb := '[]'::jsonb;

  v_product_id uuid;
  v_product_name text;

  v_delivery_product_id uuid;
  v_delivery_base_fee numeric(10,2);

  v_client_delivery_fee numeric(10,2) := 0;
  v_delivery_extra_fee numeric(10,2) := 0;
  v_delivery_total_fee numeric(10,2) := 0;

  v_delivery_zone_id uuid;
  v_delivery_zone_name text;
  v_delivery_distance_km numeric(8,2);

  v_quote_available boolean;

  v_latitude numeric;
  v_longitude numeric;

  v_safe_total numeric(10,2);

  v_delivery_item_count integer := 0;

begin

  /*
   * ==========================================================
   * VALIDACIONES
   * ==========================================================
   */

  if p_order_id is null then
    raise exception
      'El identificador de la orden es obligatorio.';
  end if;


  if not exists (
    select 1
    from public.orders
    where id = p_order_id
  ) then
    raise exception
      'La orden no existe.';
  end if;


  if p_fulfillment_type not in (
    'pickup',
    'delivery'
  ) then
    raise exception
      'El tipo de entrega de la orden no es válido.';
  end if;


  if
    p_total is null
    or p_total < 0
  then
    raise exception
      'El total de la orden no es válido.';
  end if;


  if
    p_items is null
    or jsonb_typeof(p_items) <> 'array'
    or jsonb_array_length(p_items) = 0
  then
    raise exception
      'La orden debe contener al menos un producto.';
  end if;


  /*
   * ==========================================================
   * PICKUP
   * ==========================================================
   */

  if p_fulfillment_type = 'pickup' then

    perform public.update_kitchen_order(
      p_order_id,
      p_total,
      p_items,
      null
    );


    update public.orders
    set
      fulfillment_type =
        'pickup',

      delivery_zone_id =
        null,

      delivery_zone_name =
        null,

      delivery_distance_km =
        null,

      delivery_base_fee =
        null,

      delivery_extra_fee =
        null,

      delivery_total_fee =
        null

    where id =
      p_order_id;


    return;

  end if;


  /*
   * ==========================================================
   * DELIVERY
   * ==========================================================
   */

  if
    p_delivery is null
    or jsonb_typeof(p_delivery) <> 'object'
  then
    raise exception
      'Los datos de domicilio son obligatorios.';
  end if;


  begin
    v_latitude :=
      nullif(
        p_delivery ->>
        'latitude',
        ''
      )::numeric;

    v_longitude :=
      nullif(
        p_delivery ->>
        'longitude',
        ''
      )::numeric;

  exception
    when others then
      raise exception
        'Las coordenadas de entrega no son válidas.';
  end;


  if
    v_latitude is null
    or v_longitude is null
  then
    raise exception
      'La ubicación de entrega es obligatoria.';
  end if;


  if
    v_latitude < -90
    or v_latitude > 90
    or v_longitude < -180
    or v_longitude > 180
  then
    raise exception
      'Las coordenadas de entrega no son válidas.';
  end if;


  /*
   * Cotización backend.
   */

  select
    quote.available,
    quote.distance_km,
    quote.zone_id,
    quote.zone_name,
    quote.extra_fee

  into
    v_quote_available,
    v_delivery_distance_km,
    v_delivery_zone_id,
    v_delivery_zone_name,
    v_delivery_extra_fee

  from public.get_delivery_quote(
    v_latitude,
    v_longitude
  ) quote

  limit 1;


  if
    v_quote_available is distinct from true
  then
    raise exception
      'La dirección está fuera de nuestra zona de reparto.';
  end if;


  /*
   * Producto real de domicilio.
   */

  select
    p.id,
    p.price

  into
    v_delivery_product_id,
    v_delivery_base_fee

  from public.products p

  where
    lower(
      trim(
        p.name
      )
    ) in (
      'envío a domicilio',
      'envio a domicilio'
    )

    and p.is_active = true
    and p.is_available = true

  order by
    p.created_at desc

  limit 1;


  if v_delivery_product_id is null then
    raise exception
      'El servicio a domicilio no está disponible.';
  end if;


  v_delivery_base_fee :=
    coalesce(
      v_delivery_base_fee,
      0
    );

  v_delivery_extra_fee :=
    coalesce(
      v_delivery_extra_fee,
      0
    );

  v_delivery_total_fee :=
    v_delivery_base_fee +
    v_delivery_extra_fee;


  /*
   * Normalizar items.
   */

  for v_item in
    select value
    from jsonb_array_elements(
      p_items
    )
  loop

    begin
      v_product_id :=
        (
          v_item ->>
          'productId'
        )::uuid;

    exception
      when others then
        raise exception
          'Uno de los productos de la orden no es válido.';
    end;


    select
      p.name
    into
      v_product_name

    from public.products p

    where p.id =
      v_product_id;


    if not found then
      raise exception
        'Uno de los productos de la orden no existe.';
    end if;


    if
      v_product_id =
        v_delivery_product_id
      or lower(
        trim(
          v_product_name
        )
      ) in (
        'envío a domicilio',
        'envio a domicilio'
      )
    then

      v_delivery_item_count :=
        v_delivery_item_count + 1;


      begin
        v_client_delivery_fee :=
          coalesce(
            (
              v_item ->>
              'price'
            )::numeric,
            0
          );

      exception
        when others then
          v_client_delivery_fee := 0;
      end;


      v_safe_items :=
        v_safe_items ||
        jsonb_build_array(
          jsonb_build_object(
            'productId',
            v_delivery_product_id,

            'quantity',
            1,

            'price',
            v_delivery_total_fee,

            'notes',
            '',

            'modifiers',
            jsonb_build_array(),

            'components',
            jsonb_build_array()
          )
        );


      continue;

    end if;


    v_safe_items :=
      v_safe_items ||
      jsonb_build_array(
        v_item
      );

  end loop;


  if v_delivery_item_count = 0 then
    raise exception
      'La orden de domicilio no contiene el cargo de envío.';
  end if;


  if v_delivery_item_count > 1 then
    raise exception
      'La orden contiene más de un cargo de envío.';
  end if;


  /*
   * Total corregido.
   */

  v_safe_total :=
    greatest(
      0,
      p_total -
      v_client_delivery_fee +
      v_delivery_total_fee
    );


  /*
   * Ejecutar actualización base.
   */

  perform public.update_kitchen_order(
    p_order_id,
    v_safe_total,
    v_safe_items,
    p_delivery
  );


  /*
   * Snapshot actualizado.
   */

  update public.orders
  set
    fulfillment_type =
      'delivery',

    delivery_zone_id =
      v_delivery_zone_id,

    delivery_zone_name =
      v_delivery_zone_name,

    delivery_distance_km =
      v_delivery_distance_km,

    delivery_base_fee =
      v_delivery_base_fee,

    delivery_extra_fee =
      v_delivery_extra_fee,

    delivery_total_fee =
      v_delivery_total_fee

  where id =
    p_order_id;

end;
$$;


/*
 * ============================================================
 * 3. PERMISOS
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
  authenticated,
  postgres,
  service_role;