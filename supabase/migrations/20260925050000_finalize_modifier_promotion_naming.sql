/*
 * ============================================================
 * PROMOCIÓN GENÉRICA DE MODIFICADOR - FASE 2
 * ============================================================
 * Retira los nombres físicos weekly_sauce_* del esquema activo.
 * Los datos existentes se conservan mediante RENAME.
 */

alter table if exists public.weekly_sauce_settings
  rename to modifier_promotion_settings;

alter table if exists public.order_weekly_sauce_discounts
  rename to order_modifier_promotion_discounts;

alter index if exists public.idx_weekly_sauce_settings_modifier
  rename to idx_modifier_promotion_settings_modifier;
alter index if exists public.idx_weekly_sauce_settings_enabled
  rename to idx_modifier_promotion_settings_enabled;
alter index if exists public.idx_order_weekly_sauce_discounts_order
  rename to idx_order_modifier_promotion_discounts_order;
alter index if exists public.idx_order_weekly_sauce_discounts_modifier
  rename to idx_order_modifier_promotion_discounts_modifier;
alter index if exists public.uq_weekly_sauce_discount_order_item
  rename to uq_modifier_promotion_discount_order_item;
alter index if exists public.uq_weekly_sauce_discount_component
  rename to uq_modifier_promotion_discount_component;

do $$
declare
  rename_pair text[];
begin
  foreach rename_pair slice 1 in array array[
    array['weekly_sauce_settings_pkey','modifier_promotion_settings_pkey'],
    array['weekly_sauce_settings_modifier_id_fkey','modifier_promotion_settings_modifier_id_fkey'],
    array['weekly_sauce_settings_display_name_not_blank','modifier_promotion_settings_display_name_not_blank']
  ]
  loop
    if exists (
      select 1 from pg_constraint
      where conrelid = 'public.modifier_promotion_settings'::regclass
        and conname = rename_pair[1]
    ) then
      execute format(
        'alter table public.modifier_promotion_settings rename constraint %I to %I',
        rename_pair[1], rename_pair[2]
      );
    end if;
  end loop;

  foreach rename_pair slice 1 in array array[
    array['order_weekly_sauce_discounts_pkey','order_modifier_promotion_discounts_pkey'],
    array['order_weekly_sauce_discounts_order_id_fkey','order_modifier_promotion_discounts_order_id_fkey'],
    array['order_weekly_sauce_discounts_order_item_id_fkey','order_modifier_promotion_discounts_order_item_id_fkey'],
    array['order_weekly_sauce_discounts_order_item_component_id_fkey','order_modifier_promotion_discounts_order_item_component_id_fkey'],
    array['order_weekly_sauce_discounts_modifier_id_fkey','order_modifier_promotion_discounts_modifier_id_fkey'],
    array['order_weekly_sauce_discount_source_check','order_modifier_promotion_discount_source_check']
  ]
  loop
    if exists (
      select 1 from pg_constraint
      where conrelid = 'public.order_modifier_promotion_discounts'::regclass
        and conname = rename_pair[1]
    ) then
      execute format(
        'alter table public.order_modifier_promotion_discounts rename constraint %I to %I',
        rename_pair[1], rename_pair[2]
      );
    end if;
  end loop;
end;
$$;

drop policy if exists "authenticated can read weekly sauce settings"
  on public.modifier_promotion_settings;
drop policy if exists "authenticated can insert weekly sauce settings"
  on public.modifier_promotion_settings;
drop policy if exists "authenticated can update weekly sauce settings"
  on public.modifier_promotion_settings;

drop policy if exists "authenticated can read modifier promotion settings"
  on public.modifier_promotion_settings;
create policy "authenticated can read modifier promotion settings"
  on public.modifier_promotion_settings
  for select to authenticated
  using (true);

drop policy if exists "authenticated can insert modifier promotion settings"
  on public.modifier_promotion_settings;
create policy "authenticated can insert modifier promotion settings"
  on public.modifier_promotion_settings
  for insert to authenticated
  with check (true);

drop policy if exists "authenticated can update modifier promotion settings"
  on public.modifier_promotion_settings;
create policy "authenticated can update modifier promotion settings"
  on public.modifier_promotion_settings
  for update to authenticated
  using (true)
  with check (true);

alter function public.get_active_weekly_sauce()
  rename to get_active_modifier_promotion;

alter function public.apply_weekly_sauce_discounts(uuid)
  rename to apply_modifier_promotion_discounts;

create or replace function public.get_active_modifier_promotion()
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
    settings.id,
    settings.display_name,
    settings.modifier_id,
    modifier.name as modifier_name,
    settings.discount_amount,
    settings.starts_at,
    settings.ends_at
  from public.modifier_promotion_settings settings
  join public.modifiers modifier
    on modifier.id = settings.modifier_id
  where
    settings.is_enabled = true
    and modifier.is_available = true
    and (
      settings.starts_at is null
      or current_date >= settings.starts_at
    )
    and (
      settings.ends_at is null
      or current_date <= settings.ends_at
    )
  order by settings.updated_at desc
  limit 1;
$$;

grant execute
on function public.get_active_modifier_promotion()
to anon, authenticated, postgres, service_role;

create or replace function public.apply_modifier_promotion_discounts(
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
    raise exception 'El identificador de la orden es obligatorio.';
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

  if v_modifier_id is null
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
  where item.order_id = p_order_id
    and exists (
      select 1
      from public.order_item_modifiers item_modifier
      where item_modifier.order_item_id = item.id
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
  where item.order_id = p_order_id
    and exists (
      select 1
      from public.order_item_component_modifiers component_modifier
      where component_modifier.order_item_component_id = component.id
        and component_modifier.modifier_id = v_modifier_id
    );

  select coalesce(sum(discount.discount_amount), 0)
  into v_total_discount
  from public.order_modifier_promotion_discounts discount
  where discount.order_id = p_order_id;

  return v_total_discount;
end;
$$;

-- Base transaccional POS (firma de 4 parámetros).
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

  v_modifier_promotion_discount numeric(10,2) := 0;

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
   * PROMOCIÓN DE MODIFICADOR
   * ============================
   *
   * El total YA viene descontado
   * desde el POS.
   *
   * Aquí solamente persistimos
   * cuánto descuento correspondió.
   */

  v_modifier_promotion_discount :=
    public.apply_modifier_promotion_discounts(
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

-- Base transaccional de edición (firma de 4 parámetros).
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

  v_modifier_promotion_discount numeric(10,2) := 0;

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

  delete from public.order_modifier_promotion_discounts
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
   * PROMOCIÓN DE MODIFICADOR
   * ============================
   *
   * Reconstruye completamente los
   * descuentos según la nueva
   * configuración de la orden.
   */

  v_modifier_promotion_discount :=
    public.apply_modifier_promotion_discounts(
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

-- Checkout Web actual.
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

  v_safe_delivery jsonb := null;

  /*
   * Cotización real de entrega.
   */
  v_delivery_latitude numeric;
  v_delivery_longitude numeric;

  v_delivery_available boolean := false;

  v_delivery_distance_km numeric;
  v_delivery_zone_id uuid;
  v_delivery_zone_name text;

  v_delivery_extra_fee numeric(10,2) := 0;
  v_delivery_total_fee numeric(10,2) := 0;

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
     * El cliente nunca puede agregar manualmente
     * el producto de domicilio.
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
           * Precio leído de BD.
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


    /*
     * Dirección.
     */

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
     * ========================================================
     * COORDENADAS
     * ========================================================
     */

    begin
      v_delivery_latitude :=
        (
          p_delivery ->>
          'latitude'
        )::numeric;

      v_delivery_longitude :=
        (
          p_delivery ->>
          'longitude'
        )::numeric;
    exception
      when others then
        raise exception
          'Las coordenadas del domicilio no son válidas.';
    end;

    if
      v_delivery_latitude is null
      or v_delivery_longitude is null
      or v_delivery_latitude < -90
      or v_delivery_latitude > 90
      or v_delivery_longitude < -180
      or v_delivery_longitude > 180
    then
      raise exception
        'Las coordenadas del domicilio no son válidas.';
    end if;


    /*
     * ========================================================
     * COTIZACIÓN REAL
     * ========================================================
     *
     * El servidor vuelve a calcular la zona.
     * Nunca confía en la tarifa mostrada por la web.
     */

    select
      q.available,
      q.distance_km,
      q.zone_id,
      q.zone_name,
      q.extra_fee
    into
      v_delivery_available,
      v_delivery_distance_km,
      v_delivery_zone_id,
      v_delivery_zone_name,
      v_delivery_extra_fee
    from public.get_delivery_quote(
      v_delivery_latitude,
      v_delivery_longitude
    ) q
    limit 1;

    if
      coalesce(
        v_delivery_available,
        false
      ) = false
    then
      raise exception
        'El domicilio se encuentra fuera de nuestra zona de entrega.';
    end if;

    if
      v_delivery_zone_id is null
    then
      raise exception
        'No se pudo determinar la zona de entrega.';
    end if;

    v_delivery_extra_fee :=
      coalesce(
        v_delivery_extra_fee,
        0
      );


    /*
     * ========================================================
     * PRECIO BASE DE DOMICILIO
     * ========================================================
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

    v_delivery_total_fee :=
      v_delivery_product_price +
      v_delivery_extra_fee;


    /*
     * El servidor agrega el envío con su precio REAL:
     *
     * precio base + cargo de zona.
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
          v_delivery_total_fee,

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
      v_delivery_total_fee;


    /*
     * ========================================================
     * DOMICILIO SEGURO
     * ========================================================
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
        v_delivery_latitude,

        'longitude',
        v_delivery_longitude,

        'deliveryZoneId',
        v_delivery_zone_id,

        'deliveryZoneName',
        v_delivery_zone_name,

        'deliveryDistanceKm',
        v_delivery_distance_km,

        'deliveryBaseFee',
        v_delivery_product_price,

        'deliveryExtraFee',
        v_delivery_extra_fee,

        'deliveryTotalFee',
        v_delivery_total_fee
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
   * DESCUENTO PROMOCIÓN DE MODIFICADOR
   * ==========================================================
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
  from public.order_modifier_promotion_discounts
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
      v_customer_phone,

    delivery_zone_id =
      case
        when p_fulfillment_type = 'delivery'
          then v_delivery_zone_id
        else null
      end,

    delivery_zone_name =
      case
        when p_fulfillment_type = 'delivery'
          then v_delivery_zone_name
        else null
      end,

    delivery_distance_km =
      case
        when p_fulfillment_type = 'delivery'
          then v_delivery_distance_km
        else null
      end,

    delivery_base_fee =
      case
        when p_fulfillment_type = 'delivery'
          then v_delivery_product_price
        else null
      end,

    delivery_extra_fee =
      case
        when p_fulfillment_type = 'delivery'
          then v_delivery_extra_fee
        else null
      end,

    delivery_total_fee =
      case
        when p_fulfillment_type = 'delivery'
          then v_delivery_total_fee
        else null
      end

  where id =
    v_order_id;


  return v_order_id;

end;
$$;

-- No quedan wrappers legacy en el esquema activo.
drop function if exists public.get_active_weekly_sauce();
drop function if exists public.apply_weekly_sauce_discounts(uuid);
