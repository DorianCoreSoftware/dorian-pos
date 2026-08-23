set local check_function_bodies = off;

alter default privileges for role "postgres" in schema "public" revoke all on sequences from "anon";

alter default privileges for role "postgres" in schema "public" revoke all on sequences from "authenticated";

alter default privileges for role "postgres" in schema "public" revoke all on sequences from "service_role";

alter default privileges for role "postgres" in schema "public" revoke all on tables from "anon";

alter default privileges for role "postgres" in schema "public" revoke all on tables from "authenticated";

alter default privileges for role "postgres" in schema "public" revoke all on tables from "service_role";

create table "public"."cash_refunds" (
  "id"                  uuid                     not null default gen_random_uuid(),
  "order_id"            uuid                     not null,
  "promo_redemption_id" uuid                     not null,
  "payment_method"      text                     not null,
  "amount"              numeric(12,2)            not null,
  "refunded_by"         uuid,
  "created_at"          timestamp with time zone not null default now(),
  "cash_session_id"     uuid,
  constraint "cash_refunds_amount_check" check ((amount > (0)::numeric)),
  constraint "cash_refunds_order_unique" unique (order_id),
  constraint "cash_refunds_payment_method_check" check ((payment_method = ANY (ARRAY['cash'::text, 'card'::text]))),
  constraint "cash_refunds_pkey" primary key (id),
  constraint "cash_refunds_redemption_unique" unique (promo_redemption_id)
);

alter table "public"."cash_refunds"
  enable row level security;

create table "public"."cash_sessions" (
  "id"                 uuid                     not null default gen_random_uuid(),
  "opened_by"          uuid,
  "opened_at"          timestamp with time zone not null default now(),
  "opening_amount"     numeric(10,2)            not null default 1000.00,
  "closed_at"          timestamp with time zone,
  "closed_by"          uuid,
  "expected_cash"      numeric(10,2),
  "counted_cash"       numeric(10,2),
  "difference_amount"  numeric(10,2),
  "total_cash_sales"   numeric(10,2),
  "total_card_sales"   numeric(10,2),
  "total_sales"        numeric(10,2),
  "sales_count"        integer,
  "status"             text                     not null default 'open'::text,
  "created_at"         timestamp with time zone not null default now(),
  "total_cash_refunds" numeric(12,2)            not null default 0,
  "total_card_refunds" numeric(12,2)            not null default 0,
  "total_refunds"      numeric(12,2)            not null default 0,
  constraint "cash_sessions_counted_cash_check" check (((counted_cash IS NULL) OR (counted_cash >= (0)::numeric))),
  constraint "cash_sessions_opening_amount_check" check ((opening_amount >= (0)::numeric)),
  constraint "cash_sessions_pkey" primary key (id),
  constraint "cash_sessions_status_check" check ((status = ANY (ARRAY['open'::text, 'closed'::text])))
);

alter table "public"."cash_sessions"
  enable row level security;

create table "public"."categories" (
  "id"          uuid                     not null default gen_random_uuid(),
  "name"        text                     not null,
  "description" text,
  "created_at"  timestamp with time zone default now(),
  "is_active"   boolean                  not null default true,
  constraint "categories_pkey" primary key (id)
);

alter table "public"."categories"
  enable row level security;

create table "public"."combo_component_products" (
  "id"                 uuid                     not null default gen_random_uuid(),
  "combo_component_id" uuid                     not null,
  "product_id"         uuid                     not null,
  "rule_type"          text                     not null default 'allowed'::text,
  "created_at"         timestamp with time zone not null default now(),
  constraint "combo_component_products_pkey" primary key (id),
  constraint "combo_component_products_rule_check" check ((rule_type = ANY (ARRAY['allowed'::text, 'excluded'::text]))),
  constraint "combo_component_products_unique" unique (combo_component_id, product_id)
);

alter table "public"."combo_component_products"
  enable row level security;

create table "public"."combo_recipe_components" (
  "id"                    uuid                     not null default gen_random_uuid(),
  "combo_recipe_id"       uuid                     not null,
  "slot_key"              text                     not null,
  "component_type"        text                     not null,
  "label"                 text                     not null,
  "selection_mode"        text                     not null,
  "fixed_product_id"      uuid,
  "product_category_id"   uuid,
  "allows_notes"          boolean                  not null default false,
  "requires_meat"         boolean                  not null default false,
  "requires_sauce"        boolean                  not null default false,
  "requires_drink_flavor" boolean                  not null default false,
  "position"              integer                  not null default 0,
  "created_at"            timestamp with time zone not null default now(),
  "updated_at"            timestamp with time zone not null default now(),
  constraint "combo_recipe_components_configuration_check" check ((((selection_mode = 'fixed'::text) AND (fixed_product_id IS
    NOT NULL)) OR ((selection_mode = 'selectable'::text) AND (fixed_product_id IS NULL)))),
  constraint "combo_recipe_components_mode_check" check ((selection_mode = ANY (ARRAY['fixed'::text, 'selectable'::text]))),
  constraint "combo_recipe_components_pkey" primary key (id),
  constraint "combo_recipe_components_position_check" check (("position" >= 0)),
  constraint "combo_recipe_components_slot_unique" unique (combo_recipe_id, slot_key),
  constraint "combo_recipe_components_type_check" check ((component_type = ANY (ARRAY['burger'::text, 'hotdog'::text, 'side'::text, 'drink'::text])))
);

alter table "public"."combo_recipe_components"
  enable row level security;

create table "public"."combo_recipes" (
  "id"               uuid                     not null default gen_random_uuid(),
  "combo_product_id" uuid                     not null,
  "enabled"          boolean                  not null default true,
  "created_at"       timestamp with time zone not null default now(),
  "updated_at"       timestamp with time zone not null default now(),
  constraint "combo_recipes_combo_product_unique" unique (combo_product_id),
  constraint "combo_recipes_pkey" primary key (id)
);

alter table "public"."combo_recipes"
  enable row level security;

create table "public"."expenses" (
  "id"          uuid                     not null default gen_random_uuid(),
  "description" text                     not null,
  "amount"      numeric(10,2)            not null,
  "category"    text                     not null,
  "created_at"  timestamp with time zone default now(),
  constraint "expenses_pkey" primary key (id)
);

alter table "public"."expenses"
  enable row level security;

create table "public"."modifiers" (
  "id"           uuid          not null default gen_random_uuid(),
  "name"         text          not null,
  "extra_price"  numeric(10,2) default 0,
  "is_available" boolean       default true,
  "group_name"   text,
  constraint "modifiers_pkey" primary key (id)
);

alter table "public"."modifiers"
  enable row level security;

create table "public"."order_delivery_details" (
  "id"                  uuid                     not null default gen_random_uuid(),
  "order_id"            uuid                     not null,
  "customer_name"       text                     not null,
  "phone"               text                     not null,
  "street"              text                     not null,
  "exterior_number"     text                     not null,
  "interior_number"     text,
  "neighborhood"        text                     not null,
  "postal_code"         text,
  "delivery_references" text,
  "latitude"            numeric(10,7),
  "longitude"           numeric(10,7),
  "created_at"          timestamp with time zone not null default now(),
  "updated_at"          timestamp with time zone not null default now(),
  constraint "order_delivery_customer_name_not_empty" check ((length(TRIM(BOTH FROM customer_name)) > 0)),
  constraint "order_delivery_details_order_id_key" unique (order_id),
  constraint "order_delivery_details_pkey" primary key (id),
  constraint "order_delivery_exterior_number_not_empty" check ((length(TRIM(BOTH FROM exterior_number)) > 0)),
  constraint "order_delivery_latitude_range" check (((latitude IS NULL) OR ((latitude >= ('-90'::integer)::numeric) AND (latitude <= (90)::numeric)))),
  constraint "order_delivery_longitude_range" check (((longitude IS NULL) OR ((longitude >= ('-180'::integer)::numeric) AND (longitude <= (180)::numeric)))),
  constraint "order_delivery_neighborhood_not_empty" check ((length(TRIM(BOTH FROM neighborhood)) > 0)),
  constraint "order_delivery_phone_not_empty" check ((length(TRIM(BOTH FROM phone)) > 0)),
  constraint "order_delivery_street_not_empty" check ((length(TRIM(BOTH FROM street)) > 0))
);

alter table "public"."order_delivery_details"
  enable row level security;

create table "public"."order_item_component_modifiers" (
  "order_item_component_id" uuid not null,
  "modifier_id"             uuid not null,
  "id"                      uuid not null default gen_random_uuid(),
  constraint "order_item_component_modifiers_pkey" primary key (id)
);

alter table "public"."order_item_component_modifiers"
  enable row level security;

create table "public"."order_item_components" (
  "id"             uuid                     not null default gen_random_uuid(),
  "order_item_id"  uuid                     not null,
  "product_id"     uuid                     not null,
  "component_type" text                     not null,
  "label"          text                     not null,
  "quantity"       integer                  not null default 1,
  "notes"          text,
  "position"       integer                  not null default 0,
  "created_at"     timestamp with time zone not null default now(),
  constraint "order_item_components_component_type_check" check ((component_type = ANY (ARRAY['burger'::text, 'hotdog'::text, 'side'::text, 'drink'::text]))),
  constraint "order_item_components_pkey" primary key (id),
  constraint "order_item_components_quantity_check" check ((quantity > 0))
);

alter table "public"."order_item_components"
  enable row level security;

create table "public"."order_item_modifiers" (
  "id"                  uuid    not null default gen_random_uuid(),
  "order_item_id"       uuid,
  "modifier_id"         uuid,
  "extra_price_applied" numeric default 0,
  constraint "order_item_modifiers_pkey" primary key (id)
);

alter table "public"."order_item_modifiers"
  enable row level security;

create table "public"."order_items" (
  "id"                uuid                     not null default gen_random_uuid(),
  "order_id"          uuid,
  "product_id"        uuid                     not null,
  "quantity"          integer                  not null default 1,
  "price_at_purchase" numeric(10,2)            not null,
  "notes"             text,
  "created_at"        timestamp with time zone default now(),
  constraint "order_items_pkey" primary key (id)
);

alter table "public"."order_items"
  enable row level security;

create table "public"."order_payments" (
  "id"              uuid                     not null default gen_random_uuid(),
  "order_id"        uuid                     not null,
  "payment_method"  text                     not null,
  "total_amount"    numeric(10,2)            not null,
  "amount_received" numeric(10,2),
  "change_amount"   numeric(10,2),
  "created_at"      timestamp with time zone not null default now(),
  constraint "order_payments_amount_received_check" check (((amount_received IS NULL) OR (amount_received >= (0)::numeric))),
  constraint "order_payments_cash_values_check" check ((((payment_method = 'cash'::text) AND (amount_received IS NOT NULL) AND (change_amount IS
    NOT NULL) AND (amount_received >= total_amount)) OR ((payment_method = 'card'::text) AND (amount_received IS NULL) AND (change_amount IS NULL)))),
  constraint "order_payments_change_amount_check" check (((change_amount IS NULL) OR (change_amount >= (0)::numeric))),
  constraint "order_payments_order_id_key" unique (order_id),
  constraint "order_payments_payment_method_check" check ((payment_method = ANY (ARRAY['cash'::text, 'card'::text]))),
  constraint "order_payments_pkey" primary key (id),
  constraint "order_payments_total_amount_check" check ((total_amount >= (0)::numeric))
);

alter table "public"."order_payments"
  enable row level security;

create table "public"."orders" (
  "id"                uuid                     not null default gen_random_uuid(),
  "total"             numeric(10,2)            not null,
  "status"            text                     not null default 'pending'::text,
  "created_at"        timestamp with time zone default now(),
  "client_request_id" uuid,
  constraint "orders_client_request_id_key" unique (client_request_id),
  constraint "orders_pkey" primary key (id)
);

alter table "public"."orders"
  enable row level security;

create table "public"."printer_settings" (
  "id"                uuid                     not null default gen_random_uuid(),
  "name"              text                     not null,
  "connection_type"   text                     not null default 'bluetooth'::text,
  "bluetooth_address" text,
  "ip_address"        text,
  "port"              integer,
  "is_active"         boolean                  not null default true,
  "created_at"        timestamp with time zone not null default now(),
  "updated_at"        timestamp with time zone not null default now(),
  constraint "printer_settings_connection_check" check ((((connection_type = 'bluetooth'::text) AND (bluetooth_address IS
    NOT NULL) AND (length(TRIM(BOTH FROM bluetooth_address)) > 0) AND (ip_address IS NULL) AND (port IS NULL)) OR ((connection_type = 'network'::text) AND (ip_address IS
    NOT NULL) AND (length(TRIM(BOTH FROM ip_address)) > 0) AND (port IS NOT NULL) AND ((port >= 1) AND (port <= 65535)) AND (bluetooth_address IS NULL)))),
  constraint "printer_settings_connection_type_check" check ((connection_type = ANY (ARRAY['bluetooth'::text, 'network'::text]))),
  constraint "printer_settings_name_not_empty" check ((length(TRIM(BOTH FROM name)) > 0)),
  constraint "printer_settings_pkey" primary key (id)
);

alter table "public"."printer_settings"
  enable row level security;

create table "public"."product_flavors" (
  "id"           uuid                     not null default gen_random_uuid(),
  "product_id"   uuid                     not null,
  "name"         text                     not null,
  "is_available" boolean                  not null default true,
  "position"     integer                  not null default 0,
  "created_at"   timestamp with time zone not null default now(),
  "modifier_id"  uuid,
  constraint "product_flavors_pkey" primary key (id),
  constraint "product_flavors_product_id_name_key" unique (product_id, name)
);

alter table "public"."product_flavors"
  enable row level security;

create table "public"."products" (
  "id"              uuid                     not null default gen_random_uuid(),
  "category_id"     uuid,
  "name"            text                     not null,
  "description"     text,
  "price"           numeric(10,2)            not null default 0,
  "image_url"       text,
  "is_available"    boolean                  default true,
  "created_at"      timestamp with time zone default now(),
  "is_active"       boolean                  default true,
  "is_combo_option" boolean                  not null default false,
  constraint "products_pkey" primary key (id)
);

alter table "public"."products"
  enable row level security;

create table "public"."profiles" (
  "id"         uuid                     not null,
  "first_name" text,
  "last_name"  text,
  "is_active"  boolean                  default true,
  "updated_at" timestamp with time zone default now(),
  constraint "profiles_pkey" primary key (id)
);

alter table "public"."profiles"
  enable row level security;

create table "public"."promo_coupons" (
  "id"            uuid                     not null default gen_random_uuid(),
  "order_id"      uuid                     not null,
  "code"          text                     not null,
  "coupon_type"   text                     not null,
  "redeemed"      boolean                  not null default false,
  "redeemed_at"   timestamp with time zone,
  "created_at"    timestamp with time zone not null default now(),
  "redemption_id" uuid,
  constraint "promo_coupon_code_not_empty" check ((length(TRIM(BOTH FROM code)) > 0)),
  constraint "promo_coupon_redeemed_date_check" check ((((redeemed = false) AND (redeemed_at IS NULL)) OR ((redeemed = true) AND (redeemed_at IS NOT NULL)))),
  constraint "promo_coupons_code_key" unique (code),
  constraint "promo_coupons_coupon_type_check" check ((coupon_type = ANY (ARRAY['kong'::text, 'lucky_dorian'::text]))),
  constraint "promo_coupons_order_id_key" unique (order_id),
  constraint "promo_coupons_pkey" primary key (id)
);

alter table "public"."promo_coupons"
  enable row level security;

create table "public"."promo_redemptions" (
  "id"              uuid                     not null default gen_random_uuid(),
  "redemption_type" text                     not null,
  "reward"          text,
  "redeemed_by"     uuid,
  "created_at"      timestamp with time zone not null default now(),
  constraint "promo_redemptions_pkey" primary key (id),
  constraint "promo_redemptions_reward_required_check" check ((((redemption_type = 'kong_reward'::text) AND (reward IS
    NOT NULL)) OR ((redemption_type = 'lucky_dorian'::text) AND (reward IS NULL)))),
  constraint "promo_redemptions_reward_value_check"
    check (((reward IS NULL) OR (reward = ANY (ARRAY['special_burger'::text, 'boneless_150'::text, 'wings_6'::text, 'large_fries'::text, 'kong_shake'::text])))),
  constraint "promo_redemptions_type_check" check ((redemption_type = ANY (ARRAY['kong_reward'::text, 'lucky_dorian'::text])))
);

alter table "public"."promo_redemptions"
  enable row level security;

create table "public"."promo_settings" (
  "id"                   uuid                     not null default gen_random_uuid(),
  "lucky_dorian_enabled" boolean                  not null default true,
  "lucky_dorian_chance"  integer                  not null default 100,
  "required_kongs"       integer                  not null default 5,
  "is_active"            boolean                  not null default true,
  "created_at"           timestamp with time zone not null default now(),
  "updated_at"           timestamp with time zone not null default now(),
  constraint "promo_settings_dorian_chance_check" check ((lucky_dorian_chance >= 1)),
  constraint "promo_settings_pkey" primary key (id),
  constraint "promo_settings_required_kongs_check" check ((required_kongs >= 1))
);

alter table "public"."promo_settings"
  enable row level security;

create table "public"."sale_item_modifiers" (
  "id"                  uuid          not null default gen_random_uuid(),
  "sale_item_id"        uuid,
  "modifier_id"         uuid,
  "extra_price_applied" numeric(10,2) default 0,
  constraint "sale_item_modifiers_pkey" primary key (id)
);

alter table "public"."sale_item_modifiers"
  enable row level security;

create table "public"."sale_items" (
  "id"         uuid          not null default gen_random_uuid(),
  "sale_id"    uuid,
  "product_id" uuid,
  "quantity"   integer       not null default 1,
  "unit_price" numeric(10,2) not null,
  constraint "sale_items_pkey" primary key (id)
);

alter table "public"."sale_items"
  enable row level security;

create table "public"."sales" (
  "id"             uuid                     not null default gen_random_uuid(),
  "profile_id"     uuid,
  "total_amount"   numeric(10,2)            not null default 0,
  "payment_method" text,
  "status"         text                     default 'completed'::text,
  "created_at"     timestamp with time zone default now(),
  constraint "sales_payment_method_check" check ((payment_method = ANY (ARRAY['cash'::text, 'card'::text, 'transfer'::text]))),
  constraint "sales_pkey" primary key (id),
  constraint "sales_status_check" check ((status = ANY (ARRAY['pending'::text, 'completed'::text, 'cancelled'::text])))
);

alter table "public"."sales"
  enable row level security;

alter table "public"."sale_items"
  add column "subtotal" numeric(10,2) generated always as (((quantity)::numeric * unit_price)) stored;

create type "public"."user_role" as enum (
  'admin',
  'seller'
);

alter table "public"."profiles"
  add column "role" public.user_role default 'seller'::public.user_role;

create or replace function public.calcular_total_venta()
  returns trigger
  language plpgsql
  AS $function$BEGIN
  UPDATE ventas
  SET total = (
    SELECT SUM(cantidad * precio_unitario)
    FROM venta_items
    WHERE venta_id = NEW.venta_id
  )
  WHERE id = NEW.venta_id;
  RETURN NEW;
END;$function$;

create or replace function public.create_kitchen_order (
  p_total    numeric,
  p_items    jsonb,
  p_delivery jsonb   default null::jsonb
)
  returns uuid
  language plpgsql
  set search_path to 'public'
  AS $function$
declare
  v_order_id uuid;
  v_order_item_id uuid;
  v_component_id uuid;

  v_item jsonb;
  v_modifier jsonb;
  v_component jsonb;
  v_component_modifier jsonb;

  v_position integer;
begin
  /*
   * ============================
   * VALIDACIONES GENERALES
   * ============================
   */

  if p_total is null or p_total < 0 then
    raise exception
      'El total de la orden no es válido.';
  end if;

  if p_items is null
     or jsonb_typeof(p_items) <> 'array'
     or jsonb_array_length(p_items) = 0 then
    raise exception
      'La orden debe contener al menos un producto.';
  end if;

  /*
   * ============================
   * ORDEN
   * ============================
   */

  insert into public.orders (
    total,
    status
  )
  values (
    p_total,
    'pending'
  )
  returning id
  into v_order_id;

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
         * Modificadores del
         * componente.
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
$function$;

create or replace function public.create_kitchen_order (
  p_total             numeric,
  p_items             jsonb,
  p_delivery          jsonb,
  p_client_request_id uuid
)
  returns uuid
  language plpgsql
  set search_path to 'public'
  AS $function$
declare
  v_order_id uuid;
  v_order_item_id uuid;
  v_component_id uuid;

  v_item jsonb;
  v_modifier jsonb;
  v_component jsonb;
  v_component_modifier jsonb;

  v_position integer;
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

  if p_items is null
     or jsonb_typeof(p_items) <> 'array'
     or jsonb_array_length(p_items) = 0 then
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
   * Si esta misma solicitud ya
   * creó una orden, no generamos
   * otra.
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
   * Si no hubo INSERT significa
   * que esta solicitud ya había
   * sido procesada.
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
         * Modificadores del
         * componente.
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
$function$;

create or replace function public.create_or_get_order_promo_coupon (
  p_order_id uuid
)
  returns table (
    id          uuid,
    order_id    uuid,
    code        text,
    coupon_type text,
    redeemed    boolean,
    redeemed_at timestamp with time zone,
    created_at  timestamp with time zone
  )
  language plpgsql
  security definer
  set search_path to 'public'
  AS $function$
declare
  v_existing public.promo_coupons%rowtype;
  v_settings public.promo_settings%rowtype;

  v_coupon_type text;
  v_prefix text;
  v_code text;

  v_random_value integer;
begin
  /*
   * ============================
   * VALIDAR ORDEN
   * ============================
   */

  if p_order_id is null then
    raise exception
      'La orden no es válida.';
  end if;

  if not exists (
    select 1
    from public.orders
    where orders.id = p_order_id
  ) then
    raise exception
      'La orden no existe.';
  end if;

  /*
   * ============================
   * IDEMPOTENCIA
   * ============================
   *
   * Si la orden ya tiene cupón,
   * regresamos el existente.
   */

  select *
  into v_existing
  from public.promo_coupons
  where promo_coupons.order_id =
    p_order_id
  limit 1;

  if found then
    return query
    select
      v_existing.id,
      v_existing.order_id,
      v_existing.code,
      v_existing.coupon_type,
      v_existing.redeemed,
      v_existing.redeemed_at,
      v_existing.created_at;

    return;
  end if;

  /*
   * ============================
   * CONFIGURACIÓN ACTIVA
   * ============================
   */

  select *
  into v_settings
  from public.promo_settings
  where is_active = true
  limit 1;

  if not found then
    raise exception
      'No existe una configuración promocional activa.';
  end if;

  /*
   * ============================
   * DECIDIR TIPO DE CUPÓN
   * ============================
   *
   * lucky_dorian_chance = 100
   * significa 1 oportunidad
   * entre 100.
   */

  v_coupon_type :=
    'kong';

  if
    v_settings.lucky_dorian_enabled
  then
    v_random_value :=
      floor(
        random() *
        v_settings.lucky_dorian_chance
      )::integer + 1;

    if
      v_random_value = 1
    then
      v_coupon_type :=
        'lucky_dorian';
    end if;
  end if;

  /*
   * ============================
   * PREFIJO
   * ============================
   */

  v_prefix :=
    case
      when v_coupon_type =
        'lucky_dorian'
      then
        'BK-D'
      else
        'BK-K'
    end;

  /*
   * ============================
   * GENERAR CÓDIGO ÚNICO
   * ============================
   */

  loop
    v_code :=
      v_prefix ||
      upper(
        substring(
          replace(
            gen_random_uuid()::text,
            '-',
            ''
          )
          from 1
          for 7
        )
      );

    exit when not exists (
      select 1
      from public.promo_coupons
      where promo_coupons.code =
        v_code
    );
  end loop;

  /*
   * ============================
   * INSERTAR CUPÓN
   * ============================
   */

  insert into public.promo_coupons (
    order_id,
    code,
    coupon_type
  )
  values (
    p_order_id,
    v_code,
    v_coupon_type
  )
  returning *
  into v_existing;

  /*
   * ============================
   * RESPUESTA
   * ============================
   */

  return query
  select
    v_existing.id,
    v_existing.order_id,
    v_existing.code,
    v_existing.coupon_type,
    v_existing.redeemed,
    v_existing.redeemed_at,
    v_existing.created_at;
end;
$function$;

create or replace function public.handle_new_user()
  returns trigger
  language plpgsql
  security definer
  set search_path to 'public'
  AS $function$
BEGIN
  INSERT INTO public.profiles (id, first_name, last_name, role, is_active)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'first_name', 'Nuevo'),
    COALESCE(new.raw_user_meta_data->>'last_name', 'Usuario'),
    COALESCE(new.raw_user_meta_data->>'role', 'staff')::user_role,
    true -- Por defecto, los usuarios creados inician activos
  );
  RETURN NEW;
END;
$function$;

create or replace function public.redeem_kong_coupons (
  p_codes  text[],
  p_reward text
)
  returns uuid
  language plpgsql
  security definer
  set search_path to 'public'
  AS $function$
declare
  v_normalized_codes text[];
  v_valid_count integer;
  v_redemption_id uuid;
begin
  if p_reward not in (
    'special_burger',
    'boneless_150',
    'wings_6',
    'large_fries',
    'kong_shake'
  ) then
    raise exception
      'El premio seleccionado no es válido.';
  end if;

  select array_agg(
    upper(
      trim(code)
    )
  )
  into v_normalized_codes
  from unnest(
    p_codes
  ) as code;

  if
    v_normalized_codes is null
    or array_length(
      v_normalized_codes,
      1
    ) <> 5
  then
    raise exception
      'Se necesitan exactamente 5 Kongs.';
  end if;

  if (
    select count(
      distinct code
    )
    from unnest(
      v_normalized_codes
    ) as code
  ) <> 5
  then
    raise exception
      'Los 5 códigos deben ser diferentes.';
  end if;

  /*
   * Bloqueamos los cupones válidos
   * para evitar doble canje simultáneo.
   */
  perform id
  from public.promo_coupons
  where code = any(
    v_normalized_codes
  )
    and coupon_type = 'kong'
    and redeemed = false
  for update;

  select count(*)
  into v_valid_count
  from public.promo_coupons
  where code = any(
    v_normalized_codes
  )
    and coupon_type = 'kong'
    and redeemed = false;

  if v_valid_count <> 5 then
    raise exception
      'Uno o más Kongs no existen, ya fueron canjeados o no son válidos.';
  end if;

  insert into public.promo_redemptions (
    redemption_type,
    reward,
    redeemed_by
  )
  values (
    'kong_reward',
    p_reward,
    auth.uid()
  )
  returning id
  into v_redemption_id;

  update public.promo_coupons
  set
    redeemed = true,
    redeemed_at = now(),
    redemption_id =
      v_redemption_id
  where code = any(
    v_normalized_codes
  );

  return v_redemption_id;
end;
$function$;

create or replace function public.redeem_lucky_dorian (
  p_code text
)
  returns jsonb
  language plpgsql
  security definer
  set search_path to 'public'
  AS $function$
declare
  v_coupon public.promo_coupons%rowtype;
  v_payment public.order_payments%rowtype;

  v_cash_session_id uuid;

  v_redemption_id uuid;
  v_refund_id uuid;
begin
  /*
   * ============================
   * VALIDAR CÓDIGO
   * ============================
   */

  if
    p_code is null
    or trim(p_code) = ''
  then
    raise exception
      'El código es obligatorio.';
  end if;

  /*
   * ============================
   * EXIGIR CAJA ABIERTA
   * ============================
   */

  select id
  into v_cash_session_id
  from public.cash_sessions
  where status = 'open'
  order by opened_at desc
  limit 1;

  if not found then
    raise exception
      'No hay una caja abierta para registrar el reembolso.';
  end if;

  /*
   * ============================
   * BUSCAR DORIAN
   * ============================
   */

  select *
  into v_coupon
  from public.promo_coupons
  where code =
    upper(
      trim(p_code)
    )
  for update;

  if not found then
    raise exception
      'El código no existe.';
  end if;

  if
    v_coupon.coupon_type <>
    'lucky_dorian'
  then
    raise exception
      'El código no corresponde a un Dorian de la Suerte.';
  end if;

  if
    v_coupon.redeemed
  then
    raise exception
      'Este Dorian ya fue canjeado.';
  end if;

  /*
   * ============================
   * PAGO ORIGINAL
   * ============================
   */

  select *
  into v_payment
  from public.order_payments
  where order_id =
    v_coupon.order_id
  limit 1;

  if not found then
    raise exception
      'No se encontró el pago asociado a esta compra.';
  end if;

  if
    v_payment.payment_method not in (
      'cash',
      'card'
    )
  then
    raise exception
      'La forma de pago original no es válida para reembolso.';
  end if;

  /*
   * ============================
   * CREAR REDENCIÓN
   * ============================
   */

  insert into public.promo_redemptions (
    redemption_type,
    reward,
    redeemed_by
  )
  values (
    'lucky_dorian',
    null,
    auth.uid()
  )
  returning id
  into v_redemption_id;

  /*
   * ============================
   * REGISTRAR REEMBOLSO
   * ============================
   */

  insert into public.cash_refunds (
    order_id,
    promo_redemption_id,
    cash_session_id,
    payment_method,
    amount,
    refunded_by
  )
  values (
    v_coupon.order_id,
    v_redemption_id,
    v_cash_session_id,
    v_payment.payment_method,
    v_payment.total_amount,
    auth.uid()
  )
  returning id
  into v_refund_id;

  /*
   * ============================
   * CONSUMIR DORIAN
   * ============================
   */

  update public.promo_coupons
  set
    redeemed = true,
    redeemed_at = now(),
    redemption_id =
      v_redemption_id
  where id =
    v_coupon.id;

  /*
   * ============================
   * RESPUESTA
   * ============================
   */

  return jsonb_build_object(
    'redemptionId',
    v_redemption_id,
    'refundId',
    v_refund_id,
    'orderId',
    v_coupon.order_id,
    'cashSessionId',
    v_cash_session_id,
    'paymentMethod',
    v_payment.payment_method,
    'amount',
    v_payment.total_amount
  );
end;
$function$;

create or replace function public.refresh_sale_total()
  returns trigger
  language plpgsql
  AS $function$BEGIN
  UPDATE sales
  SET total_amount = (
    SELECT COALESCE(SUM(subtotal), 0) FROM sale_items WHERE sale_id = NEW.sale_id
  ) + (
    SELECT COALESCE(SUM(sim.extra_price_applied), 0)
    FROM sale_item_modifiers sim
    JOIN sale_items si ON sim.sale_item_id = si.id
    WHERE si.sale_id = NEW.sale_id
  )
  WHERE id = NEW.sale_id;
  RETURN NEW;
END;$function$;

create or replace function public.set_printer_settings_updated_at()
  returns trigger
  language plpgsql
  set search_path to 'public'
  AS $function$
begin
  new.updated_at = now();

  return new;
end;
$function$;

create or replace function public.set_promo_settings_updated_at()
  returns trigger
  language plpgsql
  set search_path to 'public'
  AS $function$
begin
  new.updated_at = now();

  return new;
end;
$function$;

create or replace function public.set_updated_at()
  returns trigger
  language plpgsql
  AS $function$
begin
  new.updated_at = now();
  return new;
end;
$function$;

create or replace function public.update_kitchen_order (
  p_order_id uuid,
  p_total    numeric,
  p_items    jsonb,
  p_delivery jsonb   default null::jsonb
)
  returns void
  language plpgsql
  set search_path to 'public'
  AS $function$
declare
  v_order_item_id uuid;
  v_component_id uuid;

  v_item jsonb;
  v_modifier jsonb;
  v_component jsonb;
  v_component_modifier jsonb;

  v_position integer;
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

  if p_items is null
     or jsonb_typeof(p_items) <> 'array'
     or jsonb_array_length(p_items) = 0 then
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
   */

  update public.orders
  set total = p_total
  where id = p_order_id;

  /*
   * ============================
   * LIMPIAR ITEMS ANTERIORES
   * ============================
   *
   * Los modifiers/components se
   * eliminan por ON DELETE CASCADE.
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
         * Modificadores del
         * componente.
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
$function$;

alter table "public"."cash_refunds"
  add constraint "cash_refunds_cash_session_id_fkey" foreign key (cash_session_id) references public.cash_sessions(id);

alter table "public"."combo_component_products"
  add constraint "combo_component_products_combo_component_id_fkey" foreign key (combo_component_id) references public.combo_recipe_components(id) on update cascade
    on delete cascade;

alter table "public"."combo_recipe_components"
  add constraint "combo_recipe_components_product_category_id_fkey" foreign key (product_category_id) references public.categories(id) on update cascade on delete restrict;

alter table "public"."combo_recipe_components"
  add constraint "combo_recipe_components_combo_recipe_id_fkey" foreign key (combo_recipe_id) references public.combo_recipes(id) on update cascade on delete cascade;

alter table "public"."order_item_component_modifiers"
  add constraint "order_item_component_modifiers_modifier_id_fkey" foreign key (modifier_id) references public.modifiers(id);

alter table "public"."order_item_component_modifiers"
  add constraint "order_item_component_modifiers_order_item_component_id_fkey" foreign key (order_item_component_id) references public.order_item_components(id) on delete cascade;

alter table "public"."order_item_modifiers"
  add constraint "order_item_modifiers_modifier_id_fkey" foreign key (modifier_id) references public.modifiers(id);

alter table "public"."order_item_components"
  add constraint "order_item_components_order_item_id_fkey" foreign key (order_item_id) references public.order_items(id) on delete cascade;

alter table "public"."order_item_modifiers"
  add constraint "order_item_modifiers_order_item_id_fkey" foreign key (order_item_id) references public.order_items(id) on delete cascade;

alter table "public"."cash_refunds"
  add constraint "cash_refunds_order_id_fkey" foreign key (order_id) references public.orders(id);

alter table "public"."order_delivery_details"
  add constraint "order_delivery_details_order_id_fkey" foreign key (order_id) references public.orders(id) on delete cascade;

alter table "public"."order_items"
  add constraint "order_items_order_id_fkey" foreign key (order_id) references public.orders(id) on delete cascade;

alter table "public"."order_payments"
  add constraint "order_payments_order_id_fkey" foreign key (order_id) references public.orders(id) on delete cascade;

alter table "public"."product_flavors"
  add constraint "product_flavors_modifier_id_fkey" foreign key (modifier_id) references public.modifiers(id);

alter table "public"."products"
  add constraint "products_category_id_fkey" foreign key (category_id) references public.categories(id) on delete set null;

alter table "public"."combo_component_products"
  add constraint "combo_component_products_product_id_fkey" foreign key (product_id) references public.products(id) on update cascade on delete cascade;

alter table "public"."combo_recipe_components"
  add constraint "combo_recipe_components_fixed_product_id_fkey" foreign key (fixed_product_id) references public.products(id) on update cascade on delete restrict;

alter table "public"."combo_recipes"
  add constraint "combo_recipes_combo_product_id_fkey" foreign key (combo_product_id) references public.products(id) on update cascade on delete cascade;

alter table "public"."order_item_components"
  add constraint "order_item_components_product_id_fkey" foreign key (product_id) references public.products(id);

alter table "public"."order_items"
  add constraint "fk_product" foreign key (product_id) references public.products(id) on delete restrict;

alter table "public"."product_flavors"
  add constraint "product_flavors_product_id_fkey" foreign key (product_id) references public.products(id) on delete cascade;

alter table "public"."profiles"
  add constraint "profiles_id_fkey" foreign key (id) references auth.users(id) on delete cascade;

alter table "public"."cash_refunds"
  add constraint "cash_refunds_refunded_by_fkey" foreign key (refunded_by) references public.profiles(id);

alter table "public"."cash_sessions"
  add constraint "cash_sessions_closed_by_fkey" foreign key (closed_by) references public.profiles(id) on delete set null;

alter table "public"."cash_sessions"
  add constraint "cash_sessions_opened_by_fkey" foreign key (opened_by) references public.profiles(id) on delete set null;

alter table "public"."promo_coupons"
  add constraint "promo_coupons_order_id_fkey" foreign key (order_id) references public.orders(id) on delete cascade;

alter table "public"."cash_refunds"
  add constraint "cash_refunds_promo_redemption_id_fkey" foreign key (promo_redemption_id) references public.promo_redemptions(id);

alter table "public"."promo_coupons"
  add constraint "promo_coupons_redemption_id_fkey" foreign key (redemption_id) references public.promo_redemptions(id);

alter table "public"."promo_redemptions"
  add constraint "promo_redemptions_redeemed_by_fkey" foreign key (redeemed_by) references public.profiles(id);

alter table "public"."sale_item_modifiers"
  add constraint "sale_item_modifiers_sale_item_id_fkey" foreign key (sale_item_id) references public.sale_items(id) on delete cascade;

alter table "public"."sale_items"
  add constraint "sale_items_product_id_fkey" foreign key (product_id) references public.products(id);

alter table "public"."sale_items"
  add constraint "sale_items_sale_id_fkey" foreign key (sale_id) references public.sales(id) on delete cascade;

alter table "public"."sales"
  add constraint "sales_profile_id_fkey" foreign key (profile_id) references auth.users(id);

create index cash_refunds_cash_session_id_idx on public.cash_refunds using btree (cash_session_id);

create unique index categories_name_unique on public.categories using btree (lower(TRIM(BOTH from name)));

create index combo_component_products_component_id_idx on public.combo_component_products using btree (combo_component_id);

create index combo_component_products_product_id_idx on public.combo_component_products using btree (product_id);

create index combo_recipe_components_category_id_idx on public.combo_recipe_components using btree (product_category_id);

create index combo_recipe_components_fixed_product_id_idx on public.combo_recipe_components using btree (fixed_product_id);

create index combo_recipe_components_recipe_id_idx on public.combo_recipe_components using btree (combo_recipe_id);

create index combo_recipes_combo_product_id_idx on public.combo_recipes using btree (combo_product_id);

create index idx_cash_sessions_opened_at on public.cash_sessions using btree (opened_at);

create unique index idx_cash_sessions_single_open on public.cash_sessions using btree (status)
  where (status = 'open'::text);

create index idx_order_delivery_details_phone on public.order_delivery_details using btree (phone);

create index idx_order_payments_created_at on public.order_payments using btree (created_at);

create unique index idx_order_payments_order_id_unique on public.order_payments using btree (order_id);

create unique index printer_settings_single_active_idx on public.printer_settings using btree (is_active)
  where (is_active = true);

create index promo_coupons_code_idx on public.promo_coupons using btree (code);

create index promo_coupons_redeemed_idx on public.promo_coupons using btree (redeemed);

create index promo_coupons_type_idx on public.promo_coupons using btree (coupon_type);

create unique index promo_settings_single_active_idx on public.promo_settings using btree (is_active)
  where (is_active = true);

create trigger set_combo_recipe_components_updated_at
  before update on public.combo_recipe_components
  for each row
  execute function public.set_updated_at();

create trigger set_combo_recipes_updated_at
  before update on public.combo_recipes
  for each row
  execute function public.set_updated_at();

create trigger set_order_delivery_details_updated_at
  before update on public.order_delivery_details
  for each row
  execute function public.set_updated_at();

create trigger printer_settings_set_updated_at
  before update on public.printer_settings
  for each row
  execute function public.set_printer_settings_updated_at();

create trigger promo_settings_set_updated_at
  before update on public.promo_settings
  for each row
  execute function public.set_promo_settings_updated_at();

create trigger tr_sale_modifiers_total
  after insert or delete or update on public.sale_item_modifiers
  for each row
  execute function public.refresh_sale_total();

create trigger tr_sale_items_total
  after insert or delete or update on public.sale_items
  for each row
  execute function public.refresh_sale_total();

create policy "Authenticated users can read cash refunds" on "public"."cash_refunds"
  for select
  to "authenticated"
  using (true);

create policy "Admins can insert cash sessions" on "public"."cash_sessions"
  for insert
  to "authenticated"
  with check ((( SELECT profiles.role
   FROM public.profiles
  WHERE (profiles.id = ( SELECT auth.uid() AS uid))) = 'admin'::public.user_role));

create policy "Admins can update cash sessions" on "public"."cash_sessions"
  for update
  to "authenticated"
  using ((( select profiles.role
   from public.profiles
  where (profiles.id = ( select auth.uid() as uid))) = 'admin'::public.user_role))
  with check ((( SELECT profiles.role
   FROM public.profiles
  WHERE (profiles.id = ( SELECT auth.uid() AS uid))) = 'admin'::public.user_role));

create policy "Authenticated users can read cash sessions" on "public"."cash_sessions"
  for select
  to "authenticated"
  using (true);

create policy "Admins can insert categories" on "public"."categories"
  for insert
  to "authenticated"
  with check ((( SELECT profiles.role
   FROM public.profiles
  WHERE (profiles.id = ( SELECT auth.uid() AS uid))) = 'admin'::public.user_role));

create policy "Admins can update categories" on "public"."categories"
  for update
  to "authenticated"
  using ((( select profiles.role
   from public.profiles
  where (profiles.id = ( select auth.uid() as uid))) = 'admin'::public.user_role))
  with check ((( SELECT profiles.role
   FROM public.profiles
  WHERE (profiles.id = ( SELECT auth.uid() AS uid))) = 'admin'::public.user_role));

create policy "Authenticated users can read categories" on "public"."categories"
  for select
  to "authenticated"
  using (true);

create policy "Authenticated users read combo component products" on "public"."combo_component_products"
  for select
  to "authenticated"
  using (true);

create policy "Authenticated users read combo recipe components" on "public"."combo_recipe_components"
  for select
  to "authenticated"
  using (true);

create policy "Authenticated users read combo recipes" on "public"."combo_recipes"
  for select
  to "authenticated"
  using (true);

create policy "Permitir todo a usuarios autenticados" on "public"."expenses"
  for all
  to "authenticated"
  using (true)
  with check (true);

create policy "Admins can insert modifiers" on "public"."modifiers"
  for insert
  to "authenticated"
  with check ((( SELECT profiles.role
   FROM public.profiles
  WHERE (profiles.id = ( SELECT auth.uid() AS uid))) = 'admin'::public.user_role));

create policy "Admins can update modifiers" on "public"."modifiers"
  for update
  to "authenticated"
  using ((( select profiles.role
   from public.profiles
  where (profiles.id = ( select auth.uid() as uid))) = 'admin'::public.user_role))
  with check ((( SELECT profiles.role
   FROM public.profiles
  WHERE (profiles.id = ( SELECT auth.uid() AS uid))) = 'admin'::public.user_role));

create policy "Authenticated users can read modifiers" on "public"."modifiers"
  for select
  to "authenticated"
  using (true);

create policy "Authenticated users delete delivery details" on "public"."order_delivery_details"
  for delete
  to "authenticated"
  using (true);

create policy "Authenticated users insert delivery details" on "public"."order_delivery_details"
  for insert
  to "authenticated"
  with check (true);

create policy "Authenticated users read delivery details" on "public"."order_delivery_details"
  for select
  to "authenticated"
  using (true);

create policy "Authenticated users update delivery details" on "public"."order_delivery_details"
  for update
  to "authenticated"
  using (true)
  with check (true);

create policy "Allow insert order_item_component_modifiers" on "public"."order_item_component_modifiers"
  for insert
  to PUBLIC
  with check ((EXISTS ( SELECT 1
   FROM public.order_item_components oic
  WHERE (oic.id = order_item_component_modifiers.order_item_component_id))));

create policy "Allow select order_item_component_modifiers" on "public"."order_item_component_modifiers"
  for select
  to PUBLIC
  using (true);

create policy "Allow insert order_item_components" on "public"."order_item_components"
  for insert
  to PUBLIC
  with check ((EXISTS ( SELECT 1
   FROM public.order_items oi
  WHERE (oi.id = order_item_components.order_item_id))));

create policy "Allow select order_item_components" on "public"."order_item_components"
  for select
  to PUBLIC
  using (true);

create policy "Allow delete order_item_modifiers" on "public"."order_item_modifiers"
  for delete
  to PUBLIC
  using (true);

create policy "Allow insert order_item_modifiers" on "public"."order_item_modifiers"
  for insert
  to PUBLIC
  with check (true);

create policy "Allow select order_item_modifiers" on "public"."order_item_modifiers"
  for select
  to PUBLIC
  using (true);

create policy "Allow update order_item_modifiers" on "public"."order_item_modifiers"
  for update
  to PUBLIC
  using (true)
  with check (true);

create policy "Permitir delete a usuarios autenticados" on "public"."order_items"
  for delete
  to "authenticated"
  using (true);

create policy "Permitir inserción de items" on "public"."order_items"
  for insert
  to PUBLIC
  with check (true);

create policy "Permitir lectura de items" on "public"."order_items"
  for select
  to PUBLIC
  using (true);

create policy "Authenticated users insert order payments" on "public"."order_payments"
  for insert
  to "authenticated"
  with check (true);

create policy "Authenticated users read order payments" on "public"."order_payments"
  for select
  to "authenticated"
  using (true);

create policy "Authenticated users insert orders" on "public"."orders"
  for insert
  to "authenticated"
  with check (true);

create policy "Authenticated users read orders" on "public"."orders"
  for select
  to "authenticated"
  using (true);

create policy "Authenticated users update orders" on "public"."orders"
  for update
  to "authenticated"
  using (true)
  with check (true);

create policy "Admins can delete printer settings" on "public"."printer_settings"
  for delete
  to "authenticated"
  using ((( select profiles.role
   from public.profiles
  where (profiles.id = ( select auth.uid() as uid))) = 'admin'::public.user_role));

create policy "Admins can insert printer settings" on "public"."printer_settings"
  for insert
  to "authenticated"
  with check ((( SELECT profiles.role
   FROM public.profiles
  WHERE (profiles.id = ( SELECT auth.uid() AS uid))) = 'admin'::public.user_role));

create policy "Admins can update printer settings" on "public"."printer_settings"
  for update
  to "authenticated"
  using ((( select profiles.role
   from public.profiles
  where (profiles.id = ( select auth.uid() as uid))) = 'admin'::public.user_role))
  with check ((( SELECT profiles.role
   FROM public.profiles
  WHERE (profiles.id = ( SELECT auth.uid() AS uid))) = 'admin'::public.user_role));

create policy "Authenticated users can read printer settings" on "public"."printer_settings"
  for select
  to "authenticated"
  using (true);

create policy "Authenticated users read product flavors" on "public"."product_flavors"
  for select
  to "authenticated"
  using (true);

create policy "Admins can insert products" on "public"."products"
  for insert
  to "authenticated"
  with check ((( SELECT profiles.role
   FROM public.profiles
  WHERE (profiles.id = ( SELECT auth.uid() AS uid))) = 'admin'::public.user_role));

create policy "Admins can update products" on "public"."products"
  for update
  to "authenticated"
  using ((( select profiles.role
   from public.profiles
  where (profiles.id = ( select auth.uid() as uid))) = 'admin'::public.user_role))
  with check ((( SELECT profiles.role
   FROM public.profiles
  WHERE (profiles.id = ( SELECT auth.uid() AS uid))) = 'admin'::public.user_role));

create policy "Authenticated users can read products" on "public"."products"
  for select
  to "authenticated"
  using (true);

create policy "lectura_autenticados_directa" on "public"."profiles"
  for select
  to "authenticated"
  using (true);

create policy "Authenticated users insert promo coupons" on "public"."promo_coupons"
  for insert
  to "authenticated"
  with check (true);

create policy "Authenticated users read promo coupons" on "public"."promo_coupons"
  for select
  to "authenticated"
  using (true);

create policy "Authenticated users update promo coupons" on "public"."promo_coupons"
  for update
  to "authenticated"
  using (true)
  with check (true);

create policy "Admins update promo settings" on "public"."promo_settings"
  for update
  to "authenticated"
  using ((( select profiles.role
   from public.profiles
  where (profiles.id = ( select auth.uid() as uid))) = 'admin'::public.user_role))
  with check ((( SELECT profiles.role
   FROM public.profiles
  WHERE (profiles.id = ( SELECT auth.uid() AS uid))) = 'admin'::public.user_role));

create policy "Authenticated users read promo settings" on "public"."promo_settings"
  for select
  to "authenticated"
  using (true);

create policy "Full access to authenticated users" on "public"."sale_item_modifiers"
  for all
  to "authenticated"
  using (true)
  with check (true);

create policy "Full access to authenticated users" on "public"."sale_items"
  for all
  to "authenticated"
  using (true)
  with check (true);

create policy "Full access to authenticated users" on "public"."sales"
  for all
  to "authenticated"
  using (true)
  with check (true);

alter publication "supabase_realtime" add table "public"."orders";

alter publication "supabase_realtime" add table "public"."profiles";

grant execute on function "public"."calcular_total_venta"() to public, "anon", "authenticated", "postgres", "service_role";

grant execute on function "public"."create_kitchen_order"(numeric, jsonb, jsonb) to public, "anon", "authenticated", "postgres", "service_role";

grant execute on function "public"."create_kitchen_order"(numeric, jsonb, jsonb, uuid) to public, "anon", "authenticated", "postgres", "service_role";

grant execute on function "public"."create_or_get_order_promo_coupon"(uuid) to public, "anon", "authenticated", "postgres", "service_role";

grant execute on function "public"."handle_new_user"() to public, "anon", "authenticated", "postgres", "service_role";

grant execute on function "public"."redeem_kong_coupons"(text[], text) to public, "anon", "authenticated", "postgres", "service_role";

grant execute on function "public"."redeem_lucky_dorian"(text) to public, "anon", "authenticated", "postgres", "service_role";

grant execute on function "public"."refresh_sale_total"() to public, "anon", "authenticated", "postgres", "service_role";

grant execute on function "public"."set_printer_settings_updated_at"() to public, "anon", "authenticated", "postgres", "service_role";

grant execute on function "public"."set_promo_settings_updated_at"() to public, "anon", "authenticated", "postgres", "service_role";

grant execute on function "public"."set_updated_at"() to public, "anon", "authenticated", "postgres", "service_role";

grant execute on function "public"."update_kitchen_order"(uuid, numeric, jsonb, jsonb) to public, "anon", "authenticated", "postgres", "service_role";

grant delete, insert, maintain, references, select, trigger, truncate, update on table "public"."cash_refunds" to "anon", "authenticated", "postgres", "service_role";

grant delete, insert, maintain, references, select, trigger, truncate, update on table "public"."cash_sessions" to "anon", "authenticated", "postgres", "service_role";

grant delete, insert, maintain, references, select, trigger, truncate, update on table "public"."categories" to "anon", "authenticated", "postgres", "service_role";

grant delete, insert, maintain, references, select, trigger, truncate, update on table "public"."combo_component_products" to "anon", "authenticated", "postgres", "service_role";

grant delete, insert, maintain, references, select, trigger, truncate, update on table "public"."combo_recipe_components" to "anon", "authenticated", "postgres", "service_role";

grant delete, insert, maintain, references, select, trigger, truncate, update on table "public"."combo_recipes" to "anon", "authenticated", "postgres", "service_role";

grant delete, insert, maintain, references, select, trigger, truncate, update on table "public"."expenses" to "anon", "authenticated", "postgres", "service_role";

grant delete, insert, maintain, references, select, trigger, truncate, update on table "public"."modifiers" to "anon", "authenticated", "postgres", "service_role";

grant delete, insert, maintain, references, select, trigger, truncate, update on table "public"."order_delivery_details" to "anon", "authenticated", "postgres", "service_role";

grant delete, insert, maintain, references, select, trigger, truncate, update
  on table "public"."order_item_component_modifiers"
  to "anon", "authenticated", "postgres", "service_role";

grant delete, insert, maintain, references, select, trigger, truncate, update on table "public"."order_item_components" to "anon", "authenticated", "postgres", "service_role";

grant delete, insert, maintain, references, select, trigger, truncate, update on table "public"."order_item_modifiers" to "anon", "authenticated", "postgres", "service_role";

grant delete, insert, maintain, references, select, trigger, truncate, update on table "public"."order_items" to "anon", "authenticated", "postgres", "service_role";

grant delete, insert, maintain, references, select, trigger, truncate, update on table "public"."order_payments" to "anon", "authenticated", "postgres", "service_role";

grant delete, insert, maintain, references, select, trigger, truncate, update on table "public"."orders" to "anon", "authenticated", "postgres", "service_role";

grant delete, insert, maintain, references, select, trigger, truncate, update on table "public"."printer_settings" to "anon", "authenticated", "postgres", "service_role";

grant delete, insert, maintain, references, select, trigger, truncate, update on table "public"."product_flavors" to "anon", "authenticated", "postgres", "service_role";

grant delete, insert, maintain, references, select, trigger, truncate, update on table "public"."products" to "anon", "authenticated", "postgres", "service_role";

grant delete, insert, maintain, references, select, trigger, truncate, update on table "public"."profiles" to "anon", "authenticated", "postgres", "service_role";

grant delete, insert, maintain, references, select, trigger, truncate, update on table "public"."promo_coupons" to "anon", "authenticated", "postgres", "service_role";

grant delete, insert, maintain, references, select, trigger, truncate, update on table "public"."promo_redemptions" to "anon", "authenticated", "postgres", "service_role";

grant delete, insert, maintain, references, select, trigger, truncate, update on table "public"."promo_settings" to "anon", "authenticated", "postgres", "service_role";

grant delete, insert, maintain, references, select, trigger, truncate, update on table "public"."sale_item_modifiers" to "anon", "authenticated", "postgres", "service_role";

grant delete, insert, maintain, references, select, trigger, truncate, update on table "public"."sale_items" to "anon", "authenticated", "postgres", "service_role";

grant delete, insert, maintain, references, select, trigger, truncate, update on table "public"."sales" to "anon", "authenticated", "postgres", "service_role";

grant usage on type "public"."user_role" to "postgres";

alter default privileges for role "postgres" in schema "public" grant select, update, usage on sequences to "anon";

alter default privileges for role "postgres" in schema "public" grant select, update, usage on sequences to "authenticated";

alter default privileges for role "postgres" in schema "public" grant select, update, usage on sequences to "service_role";

alter default privileges for role "postgres" in schema "public" grant execute on FUNCTIONS to "anon";

alter default privileges for role "postgres" in schema "public" grant execute on FUNCTIONS to "authenticated";

alter default privileges for role "postgres" in schema "public" grant execute on FUNCTIONS to "service_role";

alter default privileges for role "postgres" in schema "public" grant delete, insert, maintain, references, select, trigger, truncate, update on tables to "anon";

alter default privileges for role "postgres" in schema "public" grant delete, insert, maintain, references, select, trigger, truncate, update on tables to "authenticated";

alter default privileges for role "postgres" in schema "public" grant delete, insert, maintain, references, select, trigger, truncate, update on tables to "service_role";

