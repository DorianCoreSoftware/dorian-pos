-- ============================================================
-- DORIAN POS
-- REWARD REDEMPTIONS -> KITCHEN ORDERS
-- ============================================================

alter table public.orders
add column if not exists order_kind text not null default 'sale';

alter table public.orders
drop constraint if exists orders_order_kind_check;

alter table public.orders
add constraint orders_order_kind_check
check (order_kind in ('sale', 'reward_redemption'));

alter table public.promo_redemptions
add column if not exists order_id uuid null references public.orders(id) on delete set null;

alter table public.loyalty_rewards
add column if not exists product_id uuid null references public.products(id) on delete restrict;

alter table public.order_items
add column if not exists reward_source text null,
add column if not exists promo_redemption_id uuid null references public.promo_redemptions(id) on delete set null,
add column if not exists loyalty_redemption_id uuid null references public.loyalty_redemptions(id) on delete set null;

alter table public.order_items
drop constraint if exists order_items_reward_source_check;

alter table public.order_items
add constraint order_items_reward_source_check
check (reward_source is null or reward_source in ('promotion', 'loyalty'));

create index if not exists order_items_reward_source_idx
on public.order_items(order_id, reward_source)
where reward_source is not null;

-- Intentamos ligar premios históricos por nombre exacto. Los que no coincidan
-- quedan pendientes de selección manual en Administración.
update public.loyalty_rewards r
set
  product_id = (
    select pr.id
    from public.products pr
    where lower(trim(pr.name)) = lower(trim(r.name))
    order by pr.created_at asc
    limit 1
  ),
  name = coalesce(
    (
      select pr.name
      from public.products pr
      where lower(trim(pr.name)) = lower(trim(r.name))
      order by pr.created_at asc
      limit 1
    ),
    r.name
  )
where
  r.product_id is null
  and exists (
    select 1
    from public.products pr
    where lower(trim(pr.name)) = lower(trim(r.name))
  );

-- ============================================================
-- HELPER PRIVADO: CREA O REUTILIZA ORDEN Y AGREGA PREMIO A $0
-- ============================================================

create or replace function public.attach_reward_to_kitchen_order(
  p_product_id uuid,
  p_order_id uuid,
  p_customer_name text,
  p_reward_source text,
  p_promo_redemption_id uuid default null,
  p_loyalty_redemption_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_order_id uuid;
  v_order_status text;
  v_order_item_id uuid;
begin
  if p_product_id is null
     or not exists (
       select 1 from public.products where id = p_product_id
     )
  then
    raise exception 'El premio no tiene un producto válido asociado.';
  end if;

  if p_reward_source not in ('promotion', 'loyalty') then
    raise exception 'El origen del premio no es válido.';
  end if;

  if p_order_id is null then
    insert into public.orders (
      total,
      status,
      client_request_id,
      order_source,
      fulfillment_type,
      customer_name,
      order_kind
    )
    values (
      0,
      'pending',
      gen_random_uuid(),
      'pos',
      'pickup',
      nullif(trim(coalesce(p_customer_name, '')), ''),
      'reward_redemption'
    )
    returning id into v_order_id;
  else
    select status
    into v_order_status
    from public.orders
    where id = p_order_id
    for update;

    if not found then
      raise exception 'La orden seleccionada no existe.';
    end if;

    if v_order_status not in ('pending', 'preparing', 'ready') then
      raise exception 'La orden seleccionada ya no puede recibir premios.';
    end if;

    if exists (
      select 1
      from public.order_payments
      where order_id = p_order_id
    ) then
      raise exception 'La orden seleccionada ya fue pagada.';
    end if;

    v_order_id := p_order_id;

    if v_order_status = 'ready' then
      update public.orders
      set status = 'preparing'
      where id = v_order_id;
    end if;
  end if;

  insert into public.order_items (
    order_id,
    product_id,
    quantity,
    price_at_purchase,
    notes,
    reward_source,
    promo_redemption_id,
    loyalty_redemption_id
  )
  values (
    v_order_id,
    p_product_id,
    1,
    0,
    case
      when p_reward_source = 'promotion' then 'Premio de promoción'
      else 'Premio de lealtad'
    end,
    p_reward_source,
    p_promo_redemption_id,
    p_loyalty_redemption_id
  )
  returning id into v_order_item_id;

  -- Dispara la suscripción realtime de órdenes también cuando el premio se
  -- agrega a una orden existente y el estado no necesita cambiar.
  update public.orders
  set status = status
  where id = v_order_id;

  return jsonb_build_object(
    'orderId', v_order_id,
    'orderItemId', v_order_item_id
  );
end;
$$;

revoke all on function public.attach_reward_to_kitchen_order(uuid, uuid, text, text, uuid, uuid) from public;

-- ============================================================
-- PROMOCIONES: CANJE + PREMIO EN COCINA
-- ============================================================

drop function if exists public.redeem_collect_promotion(uuid, text[], uuid);

create or replace function public.redeem_collect_promotion(
  p_program_id uuid,
  p_codes text[],
  p_reward_id uuid,
  p_order_id uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid;
  v_program public.promotion_programs%rowtype;
  v_reward public.promotion_rewards%rowtype;
  v_codes text[];
  v_valid_count integer;
  v_redemption_id uuid;
  v_attached jsonb;
begin
  v_user_id := auth.uid();

  if v_user_id is null then
    raise exception 'Usuario no autenticado';
  end if;

  if not exists (
    select 1
    from public.profiles
    where id = v_user_id
      and is_active = true
      and role::text in ('admin', 'seller')
  ) then
    raise exception 'No tienes permisos para canjear promociones';
  end if;

  select * into v_program
  from public.promotion_programs
  where id = p_program_id
    and program_type = 'collect_reward'
    and is_enabled = true;

  if not found then
    raise exception 'La promoción seleccionada no es válida.';
  end if;

  select * into v_reward
  from public.promotion_rewards
  where id = p_reward_id
    and program_id = p_program_id
    and is_active = true;

  if not found then
    raise exception 'El premio seleccionado no es válido.';
  end if;

  if v_reward.product_id is null then
    raise exception 'Este premio no está ligado a un producto. Corrígelo en Administración.';
  end if;

  select array_agg(upper(trim(code))) into v_codes
  from unnest(p_codes) as code;

  if v_codes is null or array_length(v_codes, 1) <> v_program.required_coupons then
    raise exception 'Se necesitan exactamente % códigos.', v_program.required_coupons;
  end if;

  if exists (
    select 1 from unnest(v_codes) code
    where code is null or trim(code) = ''
  ) then
    raise exception 'Todos los códigos son obligatorios.';
  end if;

  if (select count(distinct code) from unnest(v_codes) code) <> v_program.required_coupons then
    raise exception 'Todos los códigos deben ser diferentes.';
  end if;

  perform id
  from public.promo_coupons
  where code = any(v_codes)
    and program_id = p_program_id
    and redeemed = false
  for update;

  select count(*) into v_valid_count
  from public.promo_coupons
  where code = any(v_codes)
    and program_id = p_program_id
    and redeemed = false;

  if v_valid_count <> v_program.required_coupons then
    raise exception 'Uno o más códigos no existen, ya fueron canjeados o pertenecen a otra promoción.';
  end if;

  insert into public.promo_redemptions (
    redemption_type,
    reward,
    redeemed_by,
    program_id,
    reward_id,
    order_id
  )
  values (
    'collect_reward',
    v_reward.display_name,
    v_user_id,
    p_program_id,
    p_reward_id,
    p_order_id
  )
  returning id into v_redemption_id;

  v_attached := public.attach_reward_to_kitchen_order(
    v_reward.product_id,
    p_order_id,
    v_program.display_name,
    'promotion',
    v_redemption_id,
    null
  );

  update public.promo_redemptions
  set order_id = (v_attached ->> 'orderId')::uuid
  where id = v_redemption_id;

  update public.promo_coupons
  set redeemed = true,
      redeemed_at = now(),
      redemption_id = v_redemption_id
  where code = any(v_codes);

  return v_redemption_id;
end;
$$;

revoke all on function public.redeem_collect_promotion(uuid, text[], uuid, uuid) from public;
grant execute on function public.redeem_collect_promotion(uuid, text[], uuid, uuid) to authenticated;

-- ============================================================
-- LEALTAD: ADMIN USA PRODUCTOS REALES
-- ============================================================

create or replace function public.get_loyalty_admin_config()
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid;
  v_settings jsonb;
  v_rewards jsonb;
begin
  v_user_id := auth.uid();

  if v_user_id is null then
    raise exception 'Usuario no autenticado';
  end if;

  if not exists (
    select 1
    from public.profiles
    where id = v_user_id
      and is_active = true
      and role::text = 'admin'
  ) then
    raise exception 'No tienes permisos para administrar recompensas';
  end if;

  select jsonb_build_object(
    'isEnabled', s.is_enabled,
    'minimumPurchaseAmount', s.minimum_purchase_amount,
    'visitCooldownMinutes', s.visit_cooldown_minutes,
    'maxVisitsPerDay', s.max_visits_per_day
  )
  into v_settings
  from public.loyalty_settings s
  where s.id = true;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', r.id,
        'productId', r.product_id,
        'name', r.name,
        'description', r.description,
        'requiredVisits', r.required_visits,
        'isActive', r.is_active,
        'position', r.position,
        'createdAt', r.created_at,
        'updatedAt', r.updated_at
      )
      order by r.position, r.required_visits, r.created_at
    ),
    '[]'::jsonb
  )
  into v_rewards
  from public.loyalty_rewards r;

  return jsonb_build_object(
    'settings', v_settings,
    'rewards', v_rewards
  );
end;
$$;

revoke all on function public.get_loyalty_admin_config() from public;
grant execute on function public.get_loyalty_admin_config() to authenticated;

drop function if exists public.create_loyalty_reward(text, text, integer, integer, boolean);

create or replace function public.create_loyalty_reward(
  p_product_id uuid,
  p_name text,
  p_description text,
  p_required_visits integer,
  p_position integer default 0,
  p_is_active boolean default true
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid;
  v_product public.products%rowtype;
  v_reward public.loyalty_rewards%rowtype;
begin
  v_user_id := auth.uid();

  if v_user_id is null then
    raise exception 'Usuario no autenticado';
  end if;

  if not exists (
    select 1
    from public.profiles
    where id = v_user_id
      and is_active = true
      and role::text = 'admin'
  ) then
    raise exception 'No tienes permisos para crear recompensas';
  end if;

  select * into v_product
  from public.products
  where id = p_product_id;

  if not found then
    raise exception 'Selecciona un producto válido para el premio';
  end if;

  if p_required_visits <= 0 then
    raise exception 'El número de visitas debe ser mayor a cero';
  end if;

  if p_position < 0 then
    raise exception 'La posición no puede ser negativa';
  end if;

  if p_is_active and exists (
    select 1
    from public.loyalty_rewards
    where required_visits = p_required_visits
      and is_active = true
  ) then
    raise exception 'Ya existe una recompensa activa para ese número de visitas';
  end if;

  insert into public.loyalty_rewards (
    product_id,
    name,
    description,
    required_visits,
    position,
    is_active
  )
  values (
    v_product.id,
    v_product.name,
    nullif(trim(coalesce(p_description, '')), ''),
    p_required_visits,
    p_position,
    p_is_active
  )
  returning * into v_reward;

  return jsonb_build_object(
    'id', v_reward.id,
    'productId', v_reward.product_id,
    'name', v_reward.name,
    'description', v_reward.description,
    'requiredVisits', v_reward.required_visits,
    'position', v_reward.position,
    'isActive', v_reward.is_active
  );
end;
$$;

revoke all on function public.create_loyalty_reward(uuid, text, text, integer, integer, boolean) from public;
grant execute on function public.create_loyalty_reward(uuid, text, text, integer, integer, boolean) to authenticated;

drop function if exists public.update_loyalty_reward(uuid, text, text, integer, integer, boolean);

create or replace function public.update_loyalty_reward(
  p_reward_id uuid,
  p_product_id uuid,
  p_name text,
  p_description text,
  p_required_visits integer,
  p_position integer,
  p_is_active boolean
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid;
  v_product public.products%rowtype;
  v_reward public.loyalty_rewards%rowtype;
begin
  v_user_id := auth.uid();

  if v_user_id is null then
    raise exception 'Usuario no autenticado';
  end if;

  if not exists (
    select 1
    from public.profiles
    where id = v_user_id
      and is_active = true
      and role::text = 'admin'
  ) then
    raise exception 'No tienes permisos para modificar recompensas';
  end if;

  if not exists (select 1 from public.loyalty_rewards where id = p_reward_id) then
    raise exception 'Recompensa no encontrada';
  end if;

  select * into v_product
  from public.products
  where id = p_product_id;

  if not found then
    raise exception 'Selecciona un producto válido para el premio';
  end if;

  if p_required_visits <= 0 then
    raise exception 'El número de visitas debe ser mayor a cero';
  end if;

  if p_position < 0 then
    raise exception 'La posición no puede ser negativa';
  end if;

  if p_is_active and exists (
    select 1
    from public.loyalty_rewards
    where required_visits = p_required_visits
      and is_active = true
      and id <> p_reward_id
  ) then
    raise exception 'Ya existe una recompensa activa para ese número de visitas';
  end if;

  update public.loyalty_rewards
  set
    product_id = v_product.id,
    name = v_product.name,
    description = nullif(trim(coalesce(p_description, '')), ''),
    required_visits = p_required_visits,
    position = p_position,
    is_active = p_is_active,
    updated_at = now()
  where id = p_reward_id
  returning * into v_reward;

  return jsonb_build_object(
    'id', v_reward.id,
    'productId', v_reward.product_id,
    'name', v_reward.name,
    'description', v_reward.description,
    'requiredVisits', v_reward.required_visits,
    'position', v_reward.position,
    'isActive', v_reward.is_active
  );
end;
$$;

revoke all on function public.update_loyalty_reward(uuid, uuid, text, text, integer, integer, boolean) from public;
grant execute on function public.update_loyalty_reward(uuid, uuid, text, text, integer, integer, boolean) to authenticated;

-- ============================================================
-- LEALTAD: STATUS INCLUYE PRODUCTO
-- ============================================================

create or replace function public.get_loyalty_status(
  p_qr_token uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_customer public.loyalty_customers;
  v_total_visits integer;
  v_rewards jsonb;
begin
  select * into v_customer
  from public.loyalty_customers
  where qr_token = p_qr_token
    and is_active = true;

  if not found then
    raise exception 'Cliente no encontrado';
  end if;

  select count(*)::integer
  into v_total_visits
  from public.loyalty_visits
  where customer_id = v_customer.id;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', r.id,
        'productId', r.product_id,
        'name', r.name,
        'description', r.description,
        'requiredVisits', r.required_visits,
        'status',
          case
            when red.id is not null then 'redeemed'
            when v_total_visits >= r.required_visits then 'available'
            else 'locked'
          end,
        'visitsRemaining', greatest(r.required_visits - v_total_visits, 0),
        'redeemedAt', red.redeemed_at
      )
      order by r.required_visits, r.position
    ),
    '[]'::jsonb
  )
  into v_rewards
  from public.loyalty_rewards r
  left join public.loyalty_redemptions red
    on red.reward_id = r.id
   and red.customer_id = v_customer.id
  where r.is_active = true;

  return jsonb_build_object(
    'customer', jsonb_build_object(
      'id', v_customer.id,
      'name', v_customer.name,
      'qrToken', v_customer.qr_token,
      'totalVisits', v_total_visits
    ),
    'rewards', v_rewards
  );
end;
$$;

revoke all on function public.get_loyalty_status(uuid) from public;
grant execute on function public.get_loyalty_status(uuid) to anon, authenticated;

-- ============================================================
-- LEALTAD: CANJE + PREMIO EN COCINA
-- ============================================================

create or replace function public.redeem_loyalty_reward(
  p_qr_token uuid,
  p_reward_id uuid,
  p_order_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid;
  v_customer public.loyalty_customers;
  v_reward public.loyalty_rewards;
  v_total_visits integer;
  v_redemption_id uuid;
  v_attached jsonb;
begin
  v_user_id := auth.uid();

  if v_user_id is null then
    raise exception 'Usuario no autenticado';
  end if;

  if not exists (
    select 1
    from public.profiles
    where id = v_user_id
      and is_active = true
      and role::text in ('admin', 'seller')
  ) then
    raise exception 'No tienes permisos para canjear recompensas';
  end if;

  select * into v_customer
  from public.loyalty_customers
  where qr_token = p_qr_token
    and is_active = true;

  if not found then
    raise exception 'Cliente no encontrado';
  end if;

  select * into v_reward
  from public.loyalty_rewards
  where id = p_reward_id
    and is_active = true;

  if not found then
    raise exception 'Recompensa no encontrada';
  end if;

  if v_reward.product_id is null then
    raise exception 'Esta recompensa no está ligada a un producto. Corrígela en Administración.';
  end if;

  select count(*)::integer
  into v_total_visits
  from public.loyalty_visits
  where customer_id = v_customer.id;

  if v_total_visits < v_reward.required_visits then
    raise exception 'El cliente todavía no alcanza esta recompensa';
  end if;

  if exists (
    select 1
    from public.loyalty_redemptions
    where customer_id = v_customer.id
      and reward_id = v_reward.id
  ) then
    raise exception 'Esta recompensa ya fue canjeada';
  end if;

  insert into public.loyalty_redemptions (
    customer_id,
    reward_id,
    order_id,
    redeemed_by
  )
  values (
    v_customer.id,
    v_reward.id,
    p_order_id,
    v_user_id
  )
  returning id into v_redemption_id;

  v_attached := public.attach_reward_to_kitchen_order(
    v_reward.product_id,
    p_order_id,
    v_customer.name,
    'loyalty',
    null,
    v_redemption_id
  );

  update public.loyalty_redemptions
  set order_id = (v_attached ->> 'orderId')::uuid
  where id = v_redemption_id;

  return jsonb_build_object(
    'redemptionId', v_redemption_id,
    'customerId', v_customer.id,
    'rewardId', v_reward.id,
    'rewardName', v_reward.name,
    'productId', v_reward.product_id,
    'orderId', v_attached ->> 'orderId',
    'orderItemId', v_attached ->> 'orderItemId',
    'status', 'redeemed'
  );
end;
$$;

revoke all on function public.redeem_loyalty_reward(uuid, uuid, uuid) from public;
grant execute on function public.redeem_loyalty_reward(uuid, uuid, uuid) to authenticated;
