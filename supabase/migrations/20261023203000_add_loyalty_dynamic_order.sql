-- ============================================================
-- DORIAN POS
-- LOYALTY: ORDEN DINÁMICO + VISITAS POR POSICIÓN
-- ============================================================

-- Evita que desde los RPC de administración se asigne el mismo número de
-- visitas a dos premios distintos, aunque uno de ellos esté inactivo.

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
  v_next_position integer;
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

  select coalesce(max(position), -1) + 1
  into v_next_position
  from public.loyalty_rewards;

  if exists (
    select 1
    from public.loyalty_rewards
    where required_visits = p_required_visits
  ) then
    raise exception 'Ese número de visitas ya está ligado a otro premio';
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
    v_next_position,
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

  if not exists (
    select 1
    from public.loyalty_rewards
    where id = p_reward_id
  ) then
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

  if exists (
    select 1
    from public.loyalty_rewards
    where required_visits = p_required_visits
      and id <> p_reward_id
  ) then
    raise exception 'Ese número de visitas ya está ligado a otro premio';
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


-- Reordena todos los premios en una sola transacción. Los números de visitas
-- pertenecen al escalón/posición, no al premio: al mover las tarjetas, cada
-- premio adopta las visitas de la posición en la que termina.
create or replace function public.reorder_loyalty_rewards(
  p_reward_ids uuid[]
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid;
  v_reward_count integer;
  v_max_visits integer;
  v_slot_visits integer[];
  v_index integer;
  v_reward_id uuid;
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
    raise exception 'No tienes permisos para reordenar recompensas';
  end if;

  select count(*)
  into v_reward_count
  from public.loyalty_rewards;

  if coalesce(array_length(p_reward_ids, 1), 0) <> v_reward_count then
    raise exception 'La lista de premios está incompleta. Recarga la pantalla e inténtalo de nuevo.';
  end if;

  if (
    select count(distinct ids.reward_id)
    from unnest(p_reward_ids) as ids(reward_id)
  ) <> v_reward_count then
    raise exception 'La lista de premios contiene elementos repetidos';
  end if;

  if exists (
    select 1
    from unnest(p_reward_ids) as ids(reward_id)
    where not exists (
      select 1
      from public.loyalty_rewards r
      where r.id = ids.reward_id
    )
  ) then
    raise exception 'La lista contiene un premio que ya no existe';
  end if;

  select array_agg(required_visits order by position, required_visits, created_at)
  into v_slot_visits
  from public.loyalty_rewards;

  select coalesce(max(required_visits), 0)
  into v_max_visits
  from public.loyalty_rewards;

  -- Primera fase: valores temporales únicos para evitar choques del índice
  -- único de premios activos mientras dos escalones intercambian visitas.
  for v_index in 1..v_reward_count loop
    v_reward_id := p_reward_ids[v_index];

    update public.loyalty_rewards
    set
      required_visits = v_max_visits + v_reward_count + v_index,
      position = v_index - 1,
      updated_at = now()
    where id = v_reward_id;
  end loop;

  -- Segunda fase: cada tarjeta recibe las visitas del escalón que ocupa.
  for v_index in 1..v_reward_count loop
    v_reward_id := p_reward_ids[v_index];

    update public.loyalty_rewards
    set
      required_visits = v_slot_visits[v_index],
      position = v_index - 1,
      updated_at = now()
    where id = v_reward_id;
  end loop;

  return jsonb_build_object(
    'ok', true
  );
end;
$$;

revoke all on function public.reorder_loyalty_rewards(uuid[]) from public;
grant execute on function public.reorder_loyalty_rewards(uuid[]) to authenticated;
