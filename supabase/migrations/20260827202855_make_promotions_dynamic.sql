-- =========================================================
-- BURGER KONG
-- PROMOCIONES DINÁMICAS
-- =========================================================


-- =========================================================
-- 1. GENERACIÓN DE CUPÓN POR ORDEN
-- =========================================================
--
-- Reglas:
--
-- - Si la orden ya tiene cupón, devuelve el existente.
-- - Dorian tiene prioridad si está activado y resulta ganador.
-- - Si Dorian no gana, se genera Kong solamente si Kong está
--   activado.
-- - Si ninguna promoción aplica, devuelve 0 filas.
--
-- lucky_dorian_chance:
--
--   1   = 1 entre 1   = 100%
--   2   = 1 entre 2   = 50%
--   10  = 1 entre 10  = 10%
--   100 = 1 entre 100 = 1%
--
-- Un valor 0 significa que Dorian nunca será generado.
-- =========================================================

create or replace function public.create_or_get_order_promo_coupon(
  p_order_id uuid
)
returns table (
  id uuid,
  order_id uuid,
  code text,
  coupon_type text,
  redeemed boolean,
  redeemed_at timestamptz,
  created_at timestamptz
)
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_existing public.promo_coupons%rowtype;
  v_settings public.promo_settings%rowtype;

  v_coupon_type text;
  v_prefix text;
  v_code text;

  v_random_value integer;
begin

  -- =======================================================
  -- VALIDAR ORDEN
  -- =======================================================

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


  -- =======================================================
  -- IDEMPOTENCIA
  -- =======================================================
  --
  -- Si la orden ya obtuvo un cupón anteriormente,
  -- lo regresamos aunque la promoción haya sido
  -- desactivada posteriormente.
  -- =======================================================

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


  -- =======================================================
  -- CONFIGURACIÓN PROMOCIONAL ACTIVA
  -- =======================================================

  select *
  into v_settings
  from public.promo_settings
  where is_active = true
  order by updated_at desc
  limit 1;

  if not found then
    raise exception
      'No existe una configuración promocional activa.';
  end if;


  -- =======================================================
  -- DECIDIR PROMOCIÓN
  -- =======================================================
  --
  -- Inicialmente NO hay cupón.
  --
  -- Primero intentamos Dorian.
  --
  -- Si Dorian:
  --   - está activado
  --   - chance > 0
  --   - y resulta ganador
  --
  -- se genera un Lucky Dorian.
  --
  -- De lo contrario se genera Kong,
  -- únicamente si Kong está activado.
  -- =======================================================

  v_coupon_type := null;


  -- -------------------------------------------------------
  -- DORIAN DE LA SUERTE
  -- -------------------------------------------------------

  if
    v_settings.lucky_dorian_enabled
    and
    v_settings.lucky_dorian_chance > 0
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


  -- -------------------------------------------------------
  -- KONG
  -- -------------------------------------------------------
  --
  -- Solamente usamos Kong como fallback si Dorian
  -- no fue generado.
  -- -------------------------------------------------------

  if
    v_coupon_type is null
    and
    v_settings.kong_enabled
  then
    v_coupon_type :=
      'kong';
  end if;


  -- =======================================================
  -- NINGUNA PROMOCIÓN APLICA
  -- =======================================================
  --
  -- Una función RETURNS TABLE puede terminar sin emitir
  -- filas. El cliente interpretará esto como "sin cupón".
  -- =======================================================

  if
    v_coupon_type is null
  then
    return;
  end if;


  -- =======================================================
  -- PREFIJO
  -- =======================================================

  v_prefix :=
    case
      when
        v_coupon_type =
        'lucky_dorian'
      then
        'BK-D'

      else
        'BK-K'
    end;


  -- =======================================================
  -- GENERAR CÓDIGO ÚNICO
  -- =======================================================

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


  -- =======================================================
  -- INSERTAR CUPÓN
  -- =======================================================

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


  -- =======================================================
  -- RESPUESTA
  -- =======================================================

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



-- =========================================================
-- 2. CANJE DINÁMICO DE KONGS
-- =========================================================
--
-- Ya NO exige 5 códigos fijos.
--
-- Lee:
--
--   promo_settings.required_kongs
--
-- Ejemplos:
--
--   required_kongs = 3 → exige 3
--   required_kongs = 5 → exige 5
--   required_kongs = 7 → exige 7
--
-- Los Kongs ya emitidos pueden seguir canjeándose aunque
-- kong_enabled sea desactivado posteriormente.
--
-- Esto evita invalidar cupones que ya fueron entregados
-- a clientes.
-- =========================================================

create or replace function public.redeem_kong_coupons(
  p_codes text[],
  p_reward text
)
returns uuid
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_normalized_codes text[];

  v_valid_count integer;
  v_required_kongs integer;

  v_redemption_id uuid;
begin

  -- =======================================================
  -- CONFIGURACIÓN
  -- =======================================================

  select required_kongs
  into v_required_kongs
  from public.promo_settings
  where is_active = true
  order by updated_at desc
  limit 1;

  if not found then
    raise exception
      'No existe una configuración promocional activa.';
  end if;

  if
    v_required_kongs is null
    or
    v_required_kongs < 1
  then
    raise exception
      'La cantidad configurada de Kongs no es válida.';
  end if;


  -- =======================================================
  -- VALIDAR PREMIO
  -- =======================================================

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


  -- =======================================================
  -- NORMALIZAR CÓDIGOS
  -- =======================================================

  select array_agg(
    upper(
      trim(code)
    )
  )
  into v_normalized_codes
  from unnest(
    p_codes
  ) as code;


  -- =======================================================
  -- VALIDAR CANTIDAD
  -- =======================================================

  if
    v_normalized_codes is null
    or
    array_length(
      v_normalized_codes,
      1
    ) <>
    v_required_kongs
  then
    raise exception
      'Se necesitan exactamente % Kongs.',
      v_required_kongs;
  end if;


  -- =======================================================
  -- VALIDAR CÓDIGOS VACÍOS
  -- =======================================================

  if exists (
    select 1
    from unnest(
      v_normalized_codes
    ) as code
    where
      code is null
      or
      trim(code) = ''
  ) then
    raise exception
      'Todos los códigos Kong son obligatorios.';
  end if;


  -- =======================================================
  -- VALIDAR FORMATO
  -- =======================================================

  if exists (
    select 1
    from unnest(
      v_normalized_codes
    ) as code
    where code not like 'BK-K%'
  ) then
    raise exception
      'Uno o más códigos no tienen el formato de un Kong.';
  end if;


  -- =======================================================
  -- VALIDAR QUE SEAN DIFERENTES
  -- =======================================================

  if (
    select count(
      distinct code
    )
    from unnest(
      v_normalized_codes
    ) as code
  ) <>
  v_required_kongs
  then
    raise exception
      'Los % códigos Kong deben ser diferentes.',
      v_required_kongs;
  end if;


  -- =======================================================
  -- BLOQUEAR CUPONES
  -- =======================================================
  --
  -- Evita que dos dispositivos intenten canjear los mismos
  -- códigos al mismo tiempo.
  -- =======================================================

  perform id
  from public.promo_coupons
  where code = any(
    v_normalized_codes
  )
    and coupon_type =
      'kong'
    and redeemed =
      false
  for update;


  -- =======================================================
  -- CONTAR CUPONES VÁLIDOS
  -- =======================================================

  select count(*)
  into v_valid_count
  from public.promo_coupons
  where code = any(
    v_normalized_codes
  )
    and coupon_type =
      'kong'
    and redeemed =
      false;


  if
    v_valid_count <>
    v_required_kongs
  then
    raise exception
      'Uno o más Kongs no existen, ya fueron canjeados o no son válidos.';
  end if;


  -- =======================================================
  -- CREAR CANJE
  -- =======================================================

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


  -- =======================================================
  -- CONSUMIR KONGS
  -- =======================================================

  update public.promo_coupons
  set
    redeemed = true,
    redeemed_at = now(),
    redemption_id =
      v_redemption_id
  where code = any(
    v_normalized_codes
  );


  return
    v_redemption_id;

end;
$function$;