-- ============================================================
-- BURGER KONG - LOYALTY ADMIN MANAGEMENT
-- v1.3.0
-- ============================================================


-- ============================================================
-- 1. PERMITIR REUTILIZAR NÚMERO DE VISITAS
--    CUANDO EL PREMIO ANTERIOR ESTÁ INACTIVO
-- ============================================================

alter table public.loyalty_rewards
drop constraint if exists loyalty_rewards_required_visits_unique;

create unique index if not exists
loyalty_rewards_active_required_visits_unique
on public.loyalty_rewards (required_visits)
where is_active = true;


-- ============================================================
-- 2. OBTENER CONFIGURACIÓN COMPLETA PARA ADMIN
-- ============================================================

create or replace function public.get_loyalty_admin_config()
returns jsonb
language plpgsql
security definer
set search_path = public
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
    'isEnabled',
      s.is_enabled,

    'minimumPurchaseAmount',
      s.minimum_purchase_amount,

    'visitCooldownMinutes',
      s.visit_cooldown_minutes,

    'maxVisitsPerDay',
      s.max_visits_per_day
  )
  into v_settings
  from public.loyalty_settings s
  where s.id = true;


  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id',
          r.id,

        'name',
          r.name,

        'description',
          r.description,

        'requiredVisits',
          r.required_visits,

        'isActive',
          r.is_active,

        'position',
          r.position,

        'createdAt',
          r.created_at,

        'updatedAt',
          r.updated_at
      )
      order by
        r.position,
        r.required_visits,
        r.created_at
    ),
    '[]'::jsonb
  )
  into v_rewards
  from public.loyalty_rewards r;


  return jsonb_build_object(
    'settings',
      v_settings,

    'rewards',
      v_rewards
  );
end;
$$;


-- ============================================================
-- 3. GUARDAR CONFIGURACIÓN GENERAL
-- ============================================================

create or replace function public.update_loyalty_settings(
  p_is_enabled boolean,
  p_minimum_purchase_amount numeric,
  p_visit_cooldown_minutes integer,
  p_max_visits_per_day integer
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
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


  if p_minimum_purchase_amount is not null
     and p_minimum_purchase_amount < 0
  then
    raise exception 'La compra mínima no puede ser negativa';
  end if;


  if p_visit_cooldown_minutes < 0 then
    raise exception 'El tiempo entre visitas no puede ser negativo';
  end if;


  if p_max_visits_per_day <= 0 then
    raise exception 'El máximo de visitas debe ser mayor a cero';
  end if;


  update public.loyalty_settings
  set
    is_enabled =
      p_is_enabled,

    minimum_purchase_amount =
      p_minimum_purchase_amount,

    visit_cooldown_minutes =
      p_visit_cooldown_minutes,

    max_visits_per_day =
      p_max_visits_per_day,

    updated_at =
      now()

  where id = true;


  return jsonb_build_object(
    'ok',
      true
  );
end;
$$;


-- ============================================================
-- 4. CREAR RECOMPENSA
-- ============================================================

create or replace function public.create_loyalty_reward(
  p_name text,
  p_description text,
  p_required_visits integer,
  p_position integer default 0,
  p_is_active boolean default true
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_reward public.loyalty_rewards;
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


  if length(
    trim(
      coalesce(
        p_name,
        ''
      )
    )
  ) < 2 then
    raise exception 'Ingresa un nombre válido';
  end if;


  if p_required_visits <= 0 then
    raise exception 'El número de visitas debe ser mayor a cero';
  end if;


  if p_position < 0 then
    raise exception 'La posición no puede ser negativa';
  end if;


  if p_is_active
     and exists (
       select 1
       from public.loyalty_rewards
       where required_visits =
         p_required_visits
         and is_active = true
     )
  then
    raise exception
      'Ya existe una recompensa activa para ese número de visitas';
  end if;


  insert into public.loyalty_rewards (
    name,
    description,
    required_visits,
    position,
    is_active
  )
  values (
    trim(p_name),

    nullif(
      trim(
        coalesce(
          p_description,
          ''
        )
      ),
      ''
    ),

    p_required_visits,
    p_position,
    p_is_active
  )
  returning *
  into v_reward;


  return jsonb_build_object(
    'id',
      v_reward.id,

    'name',
      v_reward.name,

    'description',
      v_reward.description,

    'requiredVisits',
      v_reward.required_visits,

    'position',
      v_reward.position,

    'isActive',
      v_reward.is_active
  );
end;
$$;


-- ============================================================
-- 5. EDITAR RECOMPENSA
-- ============================================================

create or replace function public.update_loyalty_reward(
  p_reward_id uuid,
  p_name text,
  p_description text,
  p_required_visits integer,
  p_position integer,
  p_is_active boolean
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_reward public.loyalty_rewards;
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


  if length(
    trim(
      coalesce(
        p_name,
        ''
      )
    )
  ) < 2 then
    raise exception 'Ingresa un nombre válido';
  end if;


  if p_required_visits <= 0 then
    raise exception 'El número de visitas debe ser mayor a cero';
  end if;


  if p_position < 0 then
    raise exception 'La posición no puede ser negativa';
  end if;


  if p_is_active
     and exists (
       select 1
       from public.loyalty_rewards
       where required_visits =
         p_required_visits
         and is_active = true
         and id <> p_reward_id
     )
  then
    raise exception
      'Ya existe una recompensa activa para ese número de visitas';
  end if;


  update public.loyalty_rewards
  set
    name =
      trim(p_name),

    description =
      nullif(
        trim(
          coalesce(
            p_description,
            ''
          )
        ),
        ''
      ),

    required_visits =
      p_required_visits,

    position =
      p_position,

    is_active =
      p_is_active,

    updated_at =
      now()

  where id =
    p_reward_id

  returning *
  into v_reward;


  return jsonb_build_object(
    'id',
      v_reward.id,

    'name',
      v_reward.name,

    'description',
      v_reward.description,

    'requiredVisits',
      v_reward.required_visits,

    'position',
      v_reward.position,

    'isActive',
      v_reward.is_active
  );
end;
$$;


-- ============================================================
-- 6. HACER CUMPLIR COMPRA MÍNIMA
-- ============================================================

create or replace function public.register_loyalty_visit(
  p_qr_token uuid,
  p_order_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;

  v_customer
    public.loyalty_customers;

  v_is_enabled boolean;

  v_minimum_purchase_amount
    numeric(10,2);

  v_cooldown_minutes integer;
  v_max_visits_per_day integer;

  v_today_visits integer;
  v_last_visit timestamptz;

  v_order_total numeric(10,2);

  v_visit_id uuid;
  v_total_visits integer;
begin
  v_user_id :=
    auth.uid();


  if v_user_id is null then
    raise exception
      'Usuario no autenticado';
  end if;


  if not exists (
    select 1
    from public.profiles
    where id = v_user_id
      and is_active = true
      and role::text in (
        'admin',
        'seller'
      )
  ) then
    raise exception
      'No tienes permisos para registrar visitas';
  end if;


  select
    is_enabled,
    minimum_purchase_amount,
    visit_cooldown_minutes,
    max_visits_per_day

  into
    v_is_enabled,
    v_minimum_purchase_amount,
    v_cooldown_minutes,
    v_max_visits_per_day

  from public.loyalty_settings
  where id = true;


  if not coalesce(
    v_is_enabled,
    false
  ) then
    raise exception
      'El programa de recompensas está desactivado';
  end if;


  select *
  into v_customer
  from public.loyalty_customers
  where qr_token =
    p_qr_token
    and is_active = true;


  if not found then
    raise exception
      'Cliente no encontrado';
  end if;


  -- ==========================================================
  -- VALIDACIÓN DE ORDEN
  -- ==========================================================

  if p_order_id is not null then

    select total
    into v_order_total
    from public.orders
    where id =
      p_order_id;


    if not found then
      raise exception
        'La orden no existe';
    end if;


    if exists (
      select 1
      from public.loyalty_visits
      where order_id =
        p_order_id
    ) then
      raise exception
        'Esta orden ya fue utilizada para registrar una visita';
    end if;

  end if;


  -- Si existe compra mínima,
  -- obligamos a relacionar una orden.
  if v_minimum_purchase_amount
       is not null
     and
     v_minimum_purchase_amount > 0
  then

    if p_order_id is null then
      raise exception
        'Se requiere una orden para validar la compra mínima';
    end if;


    if coalesce(
      v_order_total,
      0
    ) <
    v_minimum_purchase_amount
    then
      raise exception
        'La compra no alcanza el monto mínimo para registrar una visita';
    end if;

  end if;


  -- ==========================================================
  -- VISITAS DEL DÍA
  -- ==========================================================

  select
    count(*)::integer
  into
    v_today_visits

  from public.loyalty_visits

  where customer_id =
    v_customer.id

    and visited_at >=
      date_trunc(
        'day',
        now()
          at time zone
          'America/Mexico_City'
      )
      at time zone
      'America/Mexico_City'

    and visited_at <
      (
        date_trunc(
          'day',
          now()
            at time zone
            'America/Mexico_City'
        )
        +
        interval '1 day'
      )
      at time zone
      'America/Mexico_City';


  if v_today_visits >=
     v_max_visits_per_day
  then
    raise exception
      'El cliente alcanzó el máximo de visitas permitidas por día';
  end if;


  -- ==========================================================
  -- COOLDOWN
  -- ==========================================================

  select
    visited_at
  into
    v_last_visit

  from public.loyalty_visits

  where customer_id =
    v_customer.id

  order by
    visited_at desc

  limit 1;


  if v_last_visit is not null
     and
     now() <
       v_last_visit +
       make_interval(
         mins =>
           v_cooldown_minutes
       )
  then
    raise exception
      'Debe transcurrir más tiempo antes de registrar otra visita';
  end if;


  -- ==========================================================
  -- REGISTRAR
  -- ==========================================================

  insert into public.loyalty_visits (
    customer_id,
    order_id,
    registered_by
  )
  values (
    v_customer.id,
    p_order_id,
    v_user_id
  )
  returning id
  into v_visit_id;


  select
    count(*)::integer
  into
    v_total_visits

  from public.loyalty_visits

  where customer_id =
    v_customer.id;


  return jsonb_build_object(
    'visitId',
      v_visit_id,

    'customerId',
      v_customer.id,

    'customerName',
      v_customer.name,

    'totalVisits',
      v_total_visits
  );
end;
$$;


-- ============================================================
-- 7. PERMISOS
-- ============================================================

revoke all
on function public.get_loyalty_admin_config()
from public;

revoke all
on function public.update_loyalty_settings(
  boolean,
  numeric,
  integer,
  integer
)
from public;

revoke all
on function public.create_loyalty_reward(
  text,
  text,
  integer,
  integer,
  boolean
)
from public;

revoke all
on function public.update_loyalty_reward(
  uuid,
  text,
  text,
  integer,
  integer,
  boolean
)
from public;


grant execute
on function public.get_loyalty_admin_config()
to authenticated;

grant execute
on function public.update_loyalty_settings(
  boolean,
  numeric,
  integer,
  integer
)
to authenticated;

grant execute
on function public.create_loyalty_reward(
  text,
  text,
  integer,
  integer,
  boolean
)
to authenticated;

grant execute
on function public.update_loyalty_reward(
  uuid,
  text,
  text,
  integer,
  integer,
  boolean
)
to authenticated;