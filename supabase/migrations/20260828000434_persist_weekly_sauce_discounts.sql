/*
 * ============================================================
 * SALSA DE LA SEMANA
 * Persistencia transaccional de descuentos
 * ============================================================
 *
 * Reglas:
 *
 * - La configuración activa se obtiene desde
 *   get_active_weekly_sauce().
 *
 * - El cliente NO decide el monto del descuento.
 *
 * - Un producto solamente recibe un descuento aunque tenga
 *   hasta 3 salsas seleccionadas.
 *
 * - El descuento se multiplica por quantity.
 *
 * - Los componentes de combo también califican.
 *
 * - Al editar una orden los descuentos se reconstruyen.
 *
 * - orders.total ya llega descontado desde el POS.
 *   Esta migración NO vuelve a restar el descuento.
 */


/*
 * ============================================================
 * 1. HELPER
 * ============================================================
 */

create or replace function public.apply_weekly_sauce_discounts(
  p_order_id uuid
)
returns numeric
language plpgsql
set search_path = 'public'
as $$
declare
  v_modifier_id uuid;
  v_discount_amount numeric(10,2);
  v_total_discount numeric(10,2) := 0;
begin

  /*
   * ============================
   * VALIDACIÓN
   * ============================
   */

  if p_order_id is null then
    raise exception
      'El identificador de la orden es obligatorio.';
  end if;


  /*
   * ============================
   * LIMPIAR DESCUENTOS ANTERIORES
   * ============================
   *
   * Esto permite recalcular una
   * orden de forma segura.
   */

  delete from public.order_weekly_sauce_discounts
  where order_id = p_order_id;


  /*
   * ============================
   * PROMOCIÓN ACTIVA
   * ============================
   */

  select
    weekly.modifier_id,
    weekly.discount_amount
  into
    v_modifier_id,
    v_discount_amount
  from public.get_active_weekly_sauce() weekly
  limit 1;


  /*
   * No existe promoción activa.
   */

  if
    v_modifier_id is null
    or v_discount_amount is null
    or v_discount_amount <= 0
  then
    return 0;
  end if;


  /*
   * ============================
   * ITEMS NORMALES
   * ============================
   *
   * Ejemplo:
   *
   * Boneless x1
   * Teriyaki + BBQ + Búffalo
   *
   * = $5
   *
   *
   * Boneless x3
   * Teriyaki + BBQ
   *
   * = $15
   *
   * EXISTS evita multiplicar el
   * descuento por número de salsas.
   */

  insert into public.order_weekly_sauce_discounts (
    order_id,
    order_item_id,
    order_item_component_id,
    modifier_id,
    discount_amount
  )
  select
    oi.order_id,
    oi.id,
    null,
    v_modifier_id,
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


  /*
   * ============================
   * COMPONENTES DE COMBO
   * ============================
   *
   * Ejemplo:
   *
   * Combo x2
   *   Boneless x1
   *   Teriyaki
   *
   * 2 × 1 × $5
   *
   * = $10
   */

  insert into public.order_weekly_sauce_discounts (
    order_id,
    order_item_id,
    order_item_component_id,
    modifier_id,
    discount_amount
  )
  select
    oi.order_id,
    null,
    oic.id,
    v_modifier_id,
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


  /*
   * ============================
   * TOTAL DE DESCUENTO
   * ============================
   */

  select
    coalesce(
      sum(
        weekly_discount.discount_amount
      ),
      0
    )
  into
    v_total_discount
  from public.order_weekly_sauce_discounts weekly_discount
  where
    weekly_discount.order_id = p_order_id;


  return v_total_discount;

end;
$$;


/*
 * ============================================================
 * 2. CREATE KITCHEN ORDER
 * ============================================================
 *
 * IMPORTANTE:
 *
 * Esta es la versión utilizada actualmente por la app:
 *
 * create_kitchen_order(
 *   numeric,
 *   jsonb,
 *   jsonb,
 *   uuid
 * )
 *
 * Conservamos client_request_id para mantener idempotencia.
 */

create or replace function public.create_kitchen_order(
  p_total numeric,
  p_items jsonb,
  p_delivery jsonb,
  p_client_request_id uuid
)
returns uuid
language plpgsql
set search_path = 'public'
as $$
declare
  v_order_id uuid;
  v_order_item_id uuid;
  v_component_id uuid;

  v_item jsonb;
  v_modifier jsonb;
  v_component jsonb;
  v_component_modifier jsonb;

  v_position integer;

  v_weekly_sauce_discount numeric(10,2) := 0;

begin

  /*
   * ============================
   * VALIDACIONES GENERALES
   * ============================
   */

  if p_client_request_id is null then
    raise exception
      'El identificador de la solicitud es obligatorio.';
  end if;


  if p_total is null or p_total < 0 then
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
   * ============================
   * ORDEN
   * ============================
   *
   * client_request_id es UNIQUE.
   *
   * Si la misma solicitud ya fue
   * procesada, recuperamos la orden
   * existente.
   */

  insert into public.orders (
    total,
    status,
    client_request_id
  )
  values (
    p_total,
    'pending',
    p_client_request_id
  )

  on conflict (
    client_request_id
  )
  do nothing

  returning id
  into v_order_id;


  /*
   * Solicitud ya procesada.
   */

  if v_order_id is null then

    select id
    into v_order_id
    from public.orders
    where client_request_id =
      p_client_request_id;


    if v_order_id is null then
      raise exception
        'No se pudo recuperar la orden existente.';
    end if;


    return v_order_id;

  end if;


  /*
   * ============================
   * ITEMS
   * ============================
   */

  for v_item in

    select value
    from jsonb_array_elements(
      p_items
    )

  loop


    /*
     * Producto válido.
     */

    if
      nullif(
        v_item ->> 'productId',
        ''
      ) is null
    then

      raise exception
        'El producto de la orden no es válido.';

    end if;


    /*
     * Cantidad válida.
     */

    if
      coalesce(
        (
          v_item ->>
          'quantity'
        )::integer,
        0
      ) <= 0
    then

      raise exception
        'La cantidad del producto no es válida.';

    end if;


    /*
     * Insertar item.
     */

    insert into public.order_items (
      order_id,
      product_id,
      quantity,
      price_at_purchase,
      notes
    )
    values (
      v_order_id,

      (
        v_item ->>
        'productId'
      )::uuid,

      (
        v_item ->>
        'quantity'
      )::integer,

      (
        v_item ->>
        'price'
      )::numeric,

      nullif(
        trim(
          v_item ->>
          'notes'
        ),
        ''
      )
    )

    returning id
    into v_order_item_id;


    /*
     * ============================
     * MODIFICADORES DEL ITEM
     * ============================
     */

    if
      jsonb_typeof(
        v_item ->
        'modifiers'
      ) = 'array'
    then


      for v_modifier in

        select value
        from jsonb_array_elements(
          v_item ->
          'modifiers'
        )

      loop


        insert into public.order_item_modifiers (
          order_item_id,
          modifier_id,
          extra_price_applied
        )
        values (
          v_order_item_id,

          (
            v_modifier ->>
            'id'
          )::uuid,

          coalesce(
            nullif(
              v_modifier ->>
              'extraPrice',
              ''
            )::numeric,
            0
          )
        );


      end loop;

    end if;


    /*
     * ============================
     * COMPONENTES DE COMBO
     * ============================
     */

    if
      jsonb_typeof(
        v_item ->
        'components'
      ) = 'array'
    then


      v_position := 0;


      for v_component in

        select value
        from jsonb_array_elements(
          v_item ->
          'components'
        )

      loop


        insert into public.order_item_components (
          order_item_id,
          product_id,
          component_type,
          label,
          quantity,
          notes,
          position
        )
        values (
          v_order_item_id,

          (
            v_component ->>
            'productId'
          )::uuid,

          v_component ->>
          'type',

          v_component ->>
          'label',

          coalesce(
            (
              v_component ->>
              'quantity'
            )::integer,
            1
          ),

          nullif(
            trim(
              v_component ->>
              'notes'
            ),
            ''
          ),

          v_position
        )

        returning id
        into v_component_id;


        /*
         * ============================
         * MODIFICADORES DEL COMPONENTE
         * ============================
         */

        if
          jsonb_typeof(
            v_component ->
            'modifiers'
          ) = 'array'
        then


          for v_component_modifier in

            select value
            from jsonb_array_elements(
              v_component ->
              'modifiers'
            )

          loop


            insert into public.order_item_component_modifiers (
              order_item_component_id,
              modifier_id
            )
            values (
              v_component_id,

              (
                v_component_modifier ->>
                'id'
              )::uuid
            );


          end loop;

        end if;


        v_position :=
          v_position + 1;


      end loop;

    end if;


  end loop;


  /*
   * ============================
   * SALSA DE LA SEMANA
   * ============================
   *
   * El total YA viene descontado
   * desde el POS.
   *
   * Aquí solamente persistimos
   * cuánto descuento correspondió.
   */

  v_weekly_sauce_discount :=
    public.apply_weekly_sauce_discounts(
      v_order_id
    );


  /*
   * ============================
   * DOMICILIO
   * ============================
   */

  if
    p_delivery is not null
    and
    jsonb_typeof(
      p_delivery
    ) = 'object'
  then


    insert into public.order_delivery_details (
      order_id,
      customer_name,
      phone,
      street,
      exterior_number,
      interior_number,
      neighborhood,
      postal_code,
      delivery_references,
      latitude,
      longitude
    )
    values (
      v_order_id,

      trim(
        p_delivery ->>
        'customerName'
      ),

      trim(
        p_delivery ->>
        'phone'
      ),

      trim(
        p_delivery ->>
        'street'
      ),

      trim(
        p_delivery ->>
        'exteriorNumber'
      ),

      nullif(
        trim(
          p_delivery ->>
          'interiorNumber'
        ),
        ''
      ),

      trim(
        p_delivery ->>
        'neighborhood'
      ),

      nullif(
        trim(
          p_delivery ->>
          'postalCode'
        ),
        ''
      ),

      nullif(
        trim(
          p_delivery ->>
          'deliveryReferences'
        ),
        ''
      ),

      nullif(
        p_delivery ->>
        'latitude',
        ''
      )::numeric,

      nullif(
        p_delivery ->>
        'longitude',
        ''
      )::numeric
    );


  end if;


  return v_order_id;

end;
$$;


/*
 * ============================================================
 * 3. UPDATE KITCHEN ORDER
 * ============================================================
 */

create or replace function public.update_kitchen_order(
  p_order_id uuid,
  p_total numeric,
  p_items jsonb,
  p_delivery jsonb default null::jsonb
)
returns void
language plpgsql
set search_path = 'public'
as $$
declare
  v_order_item_id uuid;
  v_component_id uuid;

  v_item jsonb;
  v_modifier jsonb;
  v_component jsonb;
  v_component_modifier jsonb;

  v_position integer;

  v_weekly_sauce_discount numeric(10,2) := 0;

begin

  /*
   * ============================
   * VALIDACIONES
   * ============================
   */

  if p_order_id is null then
    raise exception
      'El identificador de la orden es obligatorio.';
  end if;


  if p_total is null or p_total < 0 then
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


  if not exists (
    select 1
    from public.orders
    where id = p_order_id
  ) then

    raise exception
      'La orden no existe.';

  end if;


  /*
   * ============================
   * TOTAL
   * ============================
   *
   * El total ya contiene el
   * descuento calculado por POS.
   */

  update public.orders
  set total = p_total
  where id = p_order_id;


  /*
   * ============================
   * LIMPIAR DESCUENTOS
   * ============================
   *
   * Lo hacemos explícitamente
   * antes de reconstruir.
   */

  delete from public.order_weekly_sauce_discounts
  where order_id = p_order_id;


  /*
   * ============================
   * LIMPIAR ITEMS ANTERIORES
   * ============================
   *
   * Modifiers/components se
   * eliminan mediante CASCADE.
   */

  delete from public.order_items
  where order_id = p_order_id;


  /*
   * ============================
   * RECONSTRUIR ITEMS
   * ============================
   */

  for v_item in

    select value
    from jsonb_array_elements(
      p_items
    )

  loop


    if
      nullif(
        v_item ->> 'productId',
        ''
      ) is null
    then

      raise exception
        'El producto de la orden no es válido.';

    end if;


    if
      coalesce(
        (
          v_item ->>
          'quantity'
        )::integer,
        0
      ) <= 0
    then

      raise exception
        'La cantidad del producto no es válida.';

    end if;


    /*
     * ITEM
     */

    insert into public.order_items (
      order_id,
      product_id,
      quantity,
      price_at_purchase,
      notes
    )
    values (
      p_order_id,

      (
        v_item ->>
        'productId'
      )::uuid,

      (
        v_item ->>
        'quantity'
      )::integer,

      (
        v_item ->>
        'price'
      )::numeric,

      nullif(
        trim(
          v_item ->>
          'notes'
        ),
        ''
      )
    )

    returning id
    into v_order_item_id;


    /*
     * ============================
     * MODIFICADORES DEL ITEM
     * ============================
     */

    if
      jsonb_typeof(
        v_item ->
        'modifiers'
      ) = 'array'
    then


      for v_modifier in

        select value
        from jsonb_array_elements(
          v_item ->
          'modifiers'
        )

      loop


        insert into public.order_item_modifiers (
          order_item_id,
          modifier_id,
          extra_price_applied
        )
        values (
          v_order_item_id,

          (
            v_modifier ->>
            'id'
          )::uuid,

          coalesce(
            nullif(
              v_modifier ->>
              'extraPrice',
              ''
            )::numeric,
            0
          )
        );


      end loop;

    end if;


    /*
     * ============================
     * COMPONENTES
     * ============================
     */

    if
      jsonb_typeof(
        v_item ->
        'components'
      ) = 'array'
    then


      v_position := 0;


      for v_component in

        select value
        from jsonb_array_elements(
          v_item ->
          'components'
        )

      loop


        insert into public.order_item_components (
          order_item_id,
          product_id,
          component_type,
          label,
          quantity,
          notes,
          position
        )
        values (
          v_order_item_id,

          (
            v_component ->>
            'productId'
          )::uuid,

          v_component ->>
          'type',

          v_component ->>
          'label',

          coalesce(
            (
              v_component ->>
              'quantity'
            )::integer,
            1
          ),

          nullif(
            trim(
              v_component ->>
              'notes'
            ),
            ''
          ),

          v_position
        )

        returning id
        into v_component_id;


        /*
         * ============================
         * MODIFICADORES COMPONENTE
         * ============================
         */

        if
          jsonb_typeof(
            v_component ->
            'modifiers'
          ) = 'array'
        then


          for v_component_modifier in

            select value
            from jsonb_array_elements(
              v_component ->
              'modifiers'
            )

          loop


            insert into public.order_item_component_modifiers (
              order_item_component_id,
              modifier_id
            )
            values (
              v_component_id,

              (
                v_component_modifier ->>
                'id'
              )::uuid
            );


          end loop;

        end if;


        v_position :=
          v_position + 1;


      end loop;

    end if;


  end loop;


  /*
   * ============================
   * SALSA DE LA SEMANA
   * ============================
   *
   * Reconstruye completamente los
   * descuentos según la nueva
   * configuración de la orden.
   */

  v_weekly_sauce_discount :=
    public.apply_weekly_sauce_discounts(
      p_order_id
    );


  /*
   * ============================
   * DOMICILIO
   * ============================
   */

  if
    p_delivery is not null
    and
    jsonb_typeof(
      p_delivery
    ) = 'object'
  then


    insert into public.order_delivery_details (
      order_id,
      customer_name,
      phone,
      street,
      exterior_number,
      interior_number,
      neighborhood,
      postal_code,
      delivery_references,
      latitude,
      longitude
    )
    values (
      p_order_id,

      trim(
        p_delivery ->>
        'customerName'
      ),

      trim(
        p_delivery ->>
        'phone'
      ),

      trim(
        p_delivery ->>
        'street'
      ),

      trim(
        p_delivery ->>
        'exteriorNumber'
      ),

      nullif(
        trim(
          p_delivery ->>
          'interiorNumber'
        ),
        ''
      ),

      trim(
        p_delivery ->>
        'neighborhood'
      ),

      nullif(
        trim(
          p_delivery ->>
          'postalCode'
        ),
        ''
      ),

      nullif(
        trim(
          p_delivery ->>
          'deliveryReferences'
        ),
        ''
      ),

      nullif(
        p_delivery ->>
        'latitude',
        ''
      )::numeric,

      nullif(
        p_delivery ->>
        'longitude',
        ''
      )::numeric
    )

    on conflict (order_id)

    do update set

      customer_name =
        excluded.customer_name,

      phone =
        excluded.phone,

      street =
        excluded.street,

      exterior_number =
        excluded.exterior_number,

      interior_number =
        excluded.interior_number,

      neighborhood =
        excluded.neighborhood,

      postal_code =
        excluded.postal_code,

      delivery_references =
        excluded.delivery_references,

      latitude =
        excluded.latitude,

      longitude =
        excluded.longitude,

      updated_at =
        now();


  else


    delete from public.order_delivery_details
    where order_id = p_order_id;


  end if;

end;
$$;