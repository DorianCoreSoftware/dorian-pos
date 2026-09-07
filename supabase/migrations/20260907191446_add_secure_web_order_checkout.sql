/*
 * ============================================================
 * CHECKOUT SEGURO PARA PEDIDOS WEB
 * ============================================================
 *
 * - Guarda cliente en orders.
 * - El navegador NO decide precios.
 * - El navegador NO decide el descuento semanal.
 * - El costo de domicilio se agrega desde BD.
 * - order_source siempre será "web".
 * - Mantiene idempotencia con client_request_id.
 */


/*
 * ============================================================
 * 1. DATOS DEL CLIENTE
 * ============================================================
 */

alter table public.orders
add column customer_name text;

alter table public.orders
add column customer_phone text;


alter table public.orders
add constraint orders_customer_name_length_check
check (
  customer_name is null
  or length(trim(customer_name)) between 1 and 80
);


alter table public.orders
add constraint orders_customer_phone_check
check (
  customer_phone is null
  or customer_phone ~ '^[0-9]{10}$'
);


/*
 * ============================================================
 * 2. BLOQUEAR RPC INTERNO PARA ANON
 * ============================================================
 *
 * El POS autenticado puede seguir utilizándolo.
 * La web solamente podrá utilizar create_web_order().
 */

revoke execute on function
public.create_kitchen_order(
  numeric,
  jsonb,
  jsonb,
  uuid
)
from public, anon;


revoke execute on function
public.create_kitchen_order(
  numeric,
  jsonb,
  jsonb,
  uuid,
  text,
  text
)
from public, anon;


revoke execute on function
public.update_kitchen_order(
  uuid,
  numeric,
  jsonb,
  jsonb
)
from public, anon;


revoke execute on function
public.update_kitchen_order(
  uuid,
  numeric,
  jsonb,
  jsonb,
  text
)
from public, anon;


/*
 * El POS autenticado continúa teniendo acceso.
 */

grant execute on function
public.create_kitchen_order(
  numeric,
  jsonb,
  jsonb,
  uuid
)
to authenticated;


grant execute on function
public.create_kitchen_order(
  numeric,
  jsonb,
  jsonb,
  uuid,
  text,
  text
)
to authenticated;


grant execute on function
public.update_kitchen_order(
  uuid,
  numeric,
  jsonb,
  jsonb
)
to authenticated;


grant execute on function
public.update_kitchen_order(
  uuid,
  numeric,
  jsonb,
  jsonb,
  text
)
to authenticated;


/*
 * ============================================================
 * 3. CREATE WEB ORDER
 * ============================================================
 */

create or replace function public.create_web_order(
  p_items jsonb,
  p_delivery jsonb,
  p_client_request_id uuid,
  p_customer_name text,
  p_customer_phone text,
  p_fulfillment_type text
)
returns uuid
language plpgsql
security definer
set search_path = 'public'
as $$
declare
  v_order_id uuid;

  v_item jsonb;
  v_modifier jsonb;
  v_component jsonb;
  v_component_modifier jsonb;

  v_safe_items jsonb := '[]'::jsonb;
  v_safe_modifiers jsonb;
  v_safe_components jsonb;
  v_safe_component_modifiers jsonb;

  v_product_id uuid;
  v_product_price numeric(10,2);
  v_product_name text;

  v_modifier_id uuid;
  v_modifier_extra_price numeric(10,2);

  v_component_product_id uuid;
  v_component_type text;
  v_component_quantity integer;

  v_quantity integer;

  v_subtotal numeric(10,2) := 0;
  v_discount numeric(10,2) := 0;

  v_customer_name text;
  v_customer_phone text;

  v_delivery_product_id uuid;
  v_delivery_product_price numeric(10,2);

  v_has_delivery_product boolean := false;
  v_safe_delivery jsonb := null;
begin

  /*
   * ==========================================================
   * IDEMPOTENCIA
   * ==========================================================
   */

  if p_client_request_id is null then
    raise exception
      'El identificador de la solicitud es obligatorio.';
  end if;


  select id
  into v_order_id
  from public.orders
  where client_request_id =
    p_client_request_id;


  if v_order_id is not null then
    return v_order_id;
  end if;


  /*
   * ==========================================================
   * CLIENTE
   * ==========================================================
   */

  v_customer_name :=
    trim(
      coalesce(
        p_customer_name,
        ''
      )
    );


  v_customer_phone :=
    regexp_replace(
      coalesce(
        p_customer_phone,
        ''
      ),
      '[^0-9]',
      '',
      'g'
    );


  if
    v_customer_name = ''
    or length(
      v_customer_name
    ) > 80
  then
    raise exception
      'El nombre del cliente no es válido.';
  end if;


  if
    v_customer_phone !~
      '^[0-9]{10}$'
  then
    raise exception
      'El teléfono debe tener exactamente 10 dígitos.';
  end if;


  /*
   * ==========================================================
   * TIPO DE ENTREGA
   * ==========================================================
   */

  if p_fulfillment_type not in (
    'pickup',
    'delivery'
  ) then
    raise exception
      'El tipo de entrega no es válido.';
  end if;


  /*
   * ==========================================================
   * ITEMS
   * ==========================================================
   */

  if
    p_items is null
    or jsonb_typeof(
      p_items
    ) <> 'array'
    or jsonb_array_length(
      p_items
    ) = 0
  then
    raise exception
      'La orden debe contener al menos un producto.';
  end if;


  for v_item in
    select value
    from jsonb_array_elements(
      p_items
    )
  loop

    /*
     * Producto
     */

    begin
      v_product_id :=
        (
          v_item ->>
          'productId'
        )::uuid;
    exception
      when others then
        raise exception
          'Uno de los productos no es válido.';
    end;


    select
      p.price,
      p.name
    into
      v_product_price,
      v_product_name
    from public.products p
    where
      p.id =
        v_product_id
      and p.is_active = true
      and p.is_available = true;


    if not found then
      raise exception
        'Uno de los productos ya no está disponible.';
    end if;


    /*
     * El cliente no puede agregar manualmente
     * el producto de domicilio.
     *
     * El servidor lo agrega después.
     */

    if
      lower(
        trim(
          v_product_name
        )
      ) in (
        'envío a domicilio',
        'envio a domicilio'
      )
    then
      v_has_delivery_product :=
        true;

      continue;
    end if;


    /*
     * Cantidad
     */

    begin
      v_quantity :=
        (
          v_item ->>
          'quantity'
        )::integer;
    exception
      when others then
        raise exception
          'La cantidad de uno de los productos no es válida.';
    end;


    if
      v_quantity < 1
      or v_quantity > 50
    then
      raise exception
        'La cantidad de uno de los productos no es válida.';
    end if;


    /*
     * ========================================================
     * MODIFICADORES
     * ========================================================
     */

    v_safe_modifiers :=
      '[]'::jsonb;


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

        begin
          v_modifier_id :=
            (
              v_modifier ->>
              'id'
            )::uuid;
        exception
          when others then
            raise exception
              'Uno de los modificadores no es válido.';
        end;


        select
          coalesce(
            m.extra_price,
            0
          )
        into
          v_modifier_extra_price
        from public.modifiers m
        where
          m.id =
            v_modifier_id
          and m.is_available = true;


        if not found then
          raise exception
            'Uno de los modificadores ya no está disponible.';
        end if;


        v_safe_modifiers :=
          v_safe_modifiers ||
          jsonb_build_array(
            jsonb_build_object(
              'id',
              v_modifier_id,

              'extraPrice',
              v_modifier_extra_price
            )
          );

      end loop;

    end if;


    /*
     * ========================================================
     * COMPONENTES DEL COMBO
     * ========================================================
     */

    v_safe_components :=
      '[]'::jsonb;


    if
      jsonb_typeof(
        v_item ->
        'components'
      ) = 'array'
    then

      for v_component in
        select value
        from jsonb_array_elements(
          v_item ->
          'components'
        )
      loop

        begin
          v_component_product_id :=
            (
              v_component ->>
              'productId'
            )::uuid;
        exception
          when others then
            raise exception
              'Uno de los componentes no es válido.';
        end;


        if not exists (
          select 1
          from public.products p
          where
            p.id =
              v_component_product_id
            and p.is_active = true
            and p.is_available = true
        ) then
          raise exception
            'Uno de los componentes ya no está disponible.';
        end if;


        v_component_type :=
          v_component ->>
          'type';


        if
          v_component_type not in (
            'burger',
            'hotdog',
            'side',
            'drink'
          )
        then
          raise exception
            'El tipo de componente no es válido.';
        end if;


        begin
          v_component_quantity :=
            coalesce(
              (
                v_component ->>
                'quantity'
              )::integer,
              1
            );
        exception
          when others then
            raise exception
              'La cantidad de un componente no es válida.';
        end;


        if
          v_component_quantity < 1
          or v_component_quantity > 20
        then
          raise exception
            'La cantidad de un componente no es válida.';
        end if;


        /*
         * Modificadores del componente
         */

        v_safe_component_modifiers :=
          '[]'::jsonb;


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

            begin
              v_modifier_id :=
                (
                  v_component_modifier ->>
                  'id'
                )::uuid;
            exception
              when others then
                raise exception
                  'Uno de los modificadores del componente no es válido.';
            end;


            if not exists (
              select 1
              from public.modifiers m
              where
                m.id =
                  v_modifier_id
                and m.is_available = true
            ) then
              raise exception
                'Uno de los modificadores del componente ya no está disponible.';
            end if;


            v_safe_component_modifiers :=
              v_safe_component_modifiers ||
              jsonb_build_array(
                jsonb_build_object(
                  'id',
                  v_modifier_id
                )
              );

          end loop;

        end if;


        v_safe_components :=
          v_safe_components ||
          jsonb_build_array(
            jsonb_build_object(
              'productId',
              v_component_product_id,

              'type',
              v_component_type,

              'label',
              left(
                coalesce(
                  v_component ->>
                  'label',
                  ''
                ),
                100
              ),

              'quantity',
              v_component_quantity,

              'notes',
              left(
                coalesce(
                  v_component ->>
                  'notes',
                  ''
                ),
                500
              ),

              'modifiers',
              v_safe_component_modifiers
            )
          );

      end loop;

    end if;


    /*
     * ========================================================
     * ITEM SEGURO
     * ========================================================
     */

    v_safe_items :=
      v_safe_items ||
      jsonb_build_array(
        jsonb_build_object(
          'productId',
          v_product_id,

          'quantity',
          v_quantity,

          /*
           * PRECIO LEÍDO DE BD.
           * Nunca usamos el enviado por navegador.
           */

          'price',
          v_product_price,

          'notes',
          left(
            coalesce(
              v_item ->>
              'notes',
              ''
            ),
            500
          ),

          'modifiers',
          v_safe_modifiers,

          'components',
          v_safe_components
        )
      );


    v_subtotal :=
      v_subtotal +
      (
        v_product_price *
        v_quantity
      );

  end loop;


  /*
   * ==========================================================
   * DOMICILIO
   * ==========================================================
   */

  if
    p_fulfillment_type =
      'delivery'
  then

    if
      p_delivery is null
      or jsonb_typeof(
        p_delivery
      ) <> 'object'
    then
      raise exception
        'Los datos de domicilio son obligatorios.';
    end if;


    if
      trim(
        coalesce(
          p_delivery ->>
          'street',
          ''
        )
      ) = ''
    then
      raise exception
        'La calle es obligatoria.';
    end if;


    if
      trim(
        coalesce(
          p_delivery ->>
          'exteriorNumber',
          ''
        )
      ) = ''
    then
      raise exception
        'El número exterior es obligatorio.';
    end if;


    if
      trim(
        coalesce(
          p_delivery ->>
          'neighborhood',
          ''
        )
      ) = ''
    then
      raise exception
        'La colonia es obligatoria.';
    end if;


    /*
     * Buscar costo real de domicilio.
     */

    select
      p.id,
      p.price
    into
      v_delivery_product_id,
      v_delivery_product_price
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


    if
      v_delivery_product_id is null
    then
      raise exception
        'El servicio a domicilio no está disponible.';
    end if;


    /*
     * El servidor agrega el producto/costo.
     */

    v_safe_items :=
      v_safe_items ||
      jsonb_build_array(
        jsonb_build_object(
          'productId',
          v_delivery_product_id,

          'quantity',
          1,

          'price',
          v_delivery_product_price,

          'notes',
          '',

          'modifiers',
          jsonb_build_array(),

          'components',
          jsonb_build_array()
        )
      );


    v_subtotal :=
      v_subtotal +
      v_delivery_product_price;


    /*
     * Nombre y teléfono siempre salen
     * de los campos ya validados.
     */

    v_safe_delivery :=
      jsonb_build_object(
        'customerName',
        v_customer_name,

        'phone',
        v_customer_phone,

        'street',
        trim(
          p_delivery ->>
          'street'
        ),

        'exteriorNumber',
        trim(
          p_delivery ->>
          'exteriorNumber'
        ),

        'interiorNumber',
        trim(
          coalesce(
            p_delivery ->>
            'interiorNumber',
            ''
          )
        ),

        'neighborhood',
        trim(
          p_delivery ->>
          'neighborhood'
        ),

        'postalCode',
        trim(
          coalesce(
            p_delivery ->>
            'postalCode',
            ''
          )
        ),

        'deliveryReferences',
        trim(
          coalesce(
            p_delivery ->>
            'deliveryReferences',
            ''
          )
        ),

        'latitude',
        p_delivery ->
        'latitude',

        'longitude',
        p_delivery ->
        'longitude'
      );

  else

    /*
     * Pickup nunca lleva domicilio.
     */

    v_safe_delivery :=
      null;

  end if;


  /*
   * ==========================================================
   * CREAR ORDEN
   * ==========================================================
   *
   * Reutilizamos toda la lógica actual.
   */

  v_order_id :=
    public.create_kitchen_order(
      v_subtotal,
      v_safe_items,
      v_safe_delivery,
      p_client_request_id,
      'web',
      p_fulfillment_type
    );


  /*
   * ==========================================================
   * DESCUENTO SALSA DE LA SEMANA
   * ==========================================================
   *
   * create_kitchen_order ya persiste los descuentos.
   * Aquí obtenemos cuánto fue para establecer el total real.
   */

  select
    coalesce(
      sum(
        discount_amount
      ),
      0
    )
  into
    v_discount
  from public.order_weekly_sauce_discounts
  where
    order_id =
      v_order_id;


  /*
   * ==========================================================
   * DATOS FINALES
   * ==========================================================
   */

  update public.orders
  set
    total =
      greatest(
        0,
        v_subtotal -
        v_discount
      ),

    customer_name =
      v_customer_name,

    customer_phone =
      v_customer_phone

  where id =
    v_order_id;


  return v_order_id;

end;
$$;


/*
 * ============================================================
 * 4. PERMISOS
 * ============================================================
 */

revoke all on function
public.create_web_order(
  jsonb,
  jsonb,
  uuid,
  text,
  text,
  text
)
from public;


grant execute on function
public.create_web_order(
  jsonb,
  jsonb,
  uuid,
  text,
  text,
  text
)
to anon, authenticated;