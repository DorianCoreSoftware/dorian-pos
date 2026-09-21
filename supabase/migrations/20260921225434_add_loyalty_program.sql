-- ============================================================
-- BURGER KONG - LOYALTY / REWARDS PROGRAM
-- v1.3.0
-- ============================================================

-- ============================================================
-- 1. CUSTOMERS
-- ============================================================

create table if not exists public.loyalty_customers (
  id uuid primary key default gen_random_uuid(),

  name text not null,
  phone text not null,
  email text null,

  qr_token uuid not null default gen_random_uuid(),

  is_active boolean not null default true,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint loyalty_customers_name_not_empty
    check (length(trim(name)) > 0),

  constraint loyalty_customers_phone_not_empty
    check (length(trim(phone)) > 0),

  constraint loyalty_customers_qr_token_unique
    unique (qr_token)
);

-- Teléfono único ignorando espacios, guiones, paréntesis, etc.
create unique index if not exists loyalty_customers_phone_unique_normalized
on public.loyalty_customers (
  regexp_replace(phone, '[^0-9]', '', 'g')
);

create index if not exists loyalty_customers_active_idx
on public.loyalty_customers (is_active);

create index if not exists loyalty_customers_created_at_idx
on public.loyalty_customers (created_at desc);


-- ============================================================
-- 2. REWARDS
-- ============================================================

create table if not exists public.loyalty_rewards (
  id uuid primary key default gen_random_uuid(),

  name text not null,
  description text null,

  required_visits integer not null,

  is_active boolean not null default true,
  position integer not null default 0,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint loyalty_rewards_name_not_empty
    check (length(trim(name)) > 0),

  constraint loyalty_rewards_required_visits_positive
    check (required_visits > 0),

  constraint loyalty_rewards_required_visits_unique
    unique (required_visits)
);

create index if not exists loyalty_rewards_active_position_idx
on public.loyalty_rewards (is_active, position, required_visits);


-- ============================================================
-- 3. VISITS
-- ============================================================

create table if not exists public.loyalty_visits (
  id uuid primary key default gen_random_uuid(),

  customer_id uuid not null
    references public.loyalty_customers(id)
    on delete restrict,

  order_id uuid null
    references public.orders(id)
    on delete set null,

  registered_by uuid null
    references public.profiles(id)
    on delete set null,

  visited_at timestamptz not null default now(),

  notes text null,

  created_at timestamptz not null default now()
);

create index if not exists loyalty_visits_customer_idx
on public.loyalty_visits (customer_id, visited_at desc);

create index if not exists loyalty_visits_registered_by_idx
on public.loyalty_visits (registered_by);

create index if not exists loyalty_visits_order_idx
on public.loyalty_visits (order_id)
where order_id is not null;

-- Una orden nunca puede generar dos visitas.
create unique index if not exists loyalty_visits_order_unique
on public.loyalty_visits (order_id)
where order_id is not null;


-- ============================================================
-- 4. REDEMPTIONS
-- ============================================================

create table if not exists public.loyalty_redemptions (
  id uuid primary key default gen_random_uuid(),

  customer_id uuid not null
    references public.loyalty_customers(id)
    on delete restrict,

  reward_id uuid not null
    references public.loyalty_rewards(id)
    on delete restrict,

  order_id uuid null
    references public.orders(id)
    on delete set null,

  redeemed_by uuid null
    references public.profiles(id)
    on delete set null,

  redeemed_at timestamptz not null default now(),

  notes text null,

  created_at timestamptz not null default now(),

  -- En el modelo acumulativo cada premio se canjea una vez.
  constraint loyalty_redemptions_customer_reward_unique
    unique (customer_id, reward_id)
);

create index if not exists loyalty_redemptions_customer_idx
on public.loyalty_redemptions (customer_id, redeemed_at desc);

create index if not exists loyalty_redemptions_reward_idx
on public.loyalty_redemptions (reward_id);


-- ============================================================
-- 5. SETTINGS
-- ============================================================

create table if not exists public.loyalty_settings (
  id boolean primary key default true,

  is_enabled boolean not null default true,

  -- Monto mínimo opcional para que una compra cuente como visita.
  -- NULL significa que no hay mínimo.
  minimum_purchase_amount numeric(10,2) null,

  -- Tiempo mínimo entre registros manuales del mismo cliente.
  visit_cooldown_minutes integer not null default 60,

  -- Seguridad adicional.
  max_visits_per_day integer not null default 1,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint loyalty_settings_singleton
    check (id = true),

  constraint loyalty_settings_minimum_purchase_non_negative
    check (
      minimum_purchase_amount is null
      or minimum_purchase_amount >= 0
    ),

  constraint loyalty_settings_cooldown_non_negative
    check (visit_cooldown_minutes >= 0),

  constraint loyalty_settings_max_visits_positive
    check (max_visits_per_day > 0)
);

insert into public.loyalty_settings (
  id,
  is_enabled,
  minimum_purchase_amount,
  visit_cooldown_minutes,
  max_visits_per_day
)
values (
  true,
  true,
  null,
  60,
  1
)
on conflict (id) do nothing;


-- ============================================================
-- 6. UPDATED_AT TRIGGER
-- ============================================================

create or replace function public.set_loyalty_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists loyalty_customers_set_updated_at
on public.loyalty_customers;

create trigger loyalty_customers_set_updated_at
before update on public.loyalty_customers
for each row
execute function public.set_loyalty_updated_at();


drop trigger if exists loyalty_rewards_set_updated_at
on public.loyalty_rewards;

create trigger loyalty_rewards_set_updated_at
before update on public.loyalty_rewards
for each row
execute function public.set_loyalty_updated_at();


drop trigger if exists loyalty_settings_set_updated_at
on public.loyalty_settings;

create trigger loyalty_settings_set_updated_at
before update on public.loyalty_settings
for each row
execute function public.set_loyalty_updated_at();


-- ============================================================
-- 7. RLS
-- ============================================================

alter table public.loyalty_customers enable row level security;
alter table public.loyalty_rewards enable row level security;
alter table public.loyalty_visits enable row level security;
alter table public.loyalty_redemptions enable row level security;
alter table public.loyalty_settings enable row level security;

-- No damos acceso directo desde anon/authenticated.
-- Toda operación sensible se hará mediante RPC SECURITY DEFINER.


-- ============================================================
-- 8. PUBLIC: REGISTER CUSTOMER
-- ============================================================

create or replace function public.register_loyalty_customer(
  p_name text,
  p_phone text,
  p_email text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_name text;
  v_phone text;
  v_email text;

  v_customer public.loyalty_customers;
begin
  select is_enabled
  from public.loyalty_settings
  where id = true;

  if not coalesce(
    (
      select is_enabled
      from public.loyalty_settings
      where id = true
    ),
    false
  ) then
    raise exception 'El programa de recompensas no está disponible';
  end if;

  v_name := trim(p_name);
  v_phone := regexp_replace(coalesce(p_phone, ''), '[^0-9]', '', 'g');
  v_email := nullif(lower(trim(coalesce(p_email, ''))), '');

  if length(v_name) < 2 then
    raise exception 'Nombre inválido';
  end if;

  if length(v_phone) < 10 then
    raise exception 'Teléfono inválido';
  end if;

  if exists (
    select 1
    from public.loyalty_customers
    where regexp_replace(phone, '[^0-9]', '', 'g') = v_phone
  ) then
    raise exception 'Este teléfono ya está registrado';
  end if;

  insert into public.loyalty_customers (
    name,
    phone,
    email
  )
  values (
    v_name,
    v_phone,
    v_email
  )
  returning *
  into v_customer;

  return jsonb_build_object(
    'id', v_customer.id,
    'name', v_customer.name,
    'qrToken', v_customer.qr_token,
    'totalVisits', 0
  );
end;
$$;


-- ============================================================
-- 9. PUBLIC: GET CUSTOMER LOYALTY STATUS
-- ============================================================

create or replace function public.get_loyalty_status(
  p_qr_token uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_customer public.loyalty_customers;
  v_total_visits integer;
  v_rewards jsonb;
begin
  select *
  into v_customer
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
        'name', r.name,
        'description', r.description,
        'requiredVisits', r.required_visits,

        'status',
          case
            when red.id is not null then 'redeemed'
            when v_total_visits >= r.required_visits then 'available'
            else 'locked'
          end,

        'visitsRemaining',
          greatest(r.required_visits - v_total_visits, 0),

        'redeemedAt',
          red.redeemed_at
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
    'customer',
      jsonb_build_object(
        'id', v_customer.id,
        'name', v_customer.name,
        'qrToken', v_customer.qr_token,
        'totalVisits', v_total_visits
      ),

    'rewards', v_rewards
  );
end;
$$;


-- ============================================================
-- 10. POS: REGISTER VISIT
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
  v_customer public.loyalty_customers;

  v_is_enabled boolean;
  v_cooldown_minutes integer;
  v_max_visits_per_day integer;

  v_today_visits integer;
  v_last_visit timestamptz;

  v_visit_id uuid;
  v_total_visits integer;
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
    raise exception 'No tienes permisos para registrar visitas';
  end if;

  select
    is_enabled,
    visit_cooldown_minutes,
    max_visits_per_day
  into
    v_is_enabled,
    v_cooldown_minutes,
    v_max_visits_per_day
  from public.loyalty_settings
  where id = true;

  if not coalesce(v_is_enabled, false) then
    raise exception 'El programa de recompensas está desactivado';
  end if;

  select *
  into v_customer
  from public.loyalty_customers
  where qr_token = p_qr_token
    and is_active = true;

  if not found then
    raise exception 'Cliente no encontrado';
  end if;

  if p_order_id is not null then
    if not exists (
      select 1
      from public.orders
      where id = p_order_id
    ) then
      raise exception 'La orden no existe';
    end if;

    if exists (
      select 1
      from public.loyalty_visits
      where order_id = p_order_id
    ) then
      raise exception 'Esta orden ya fue utilizada para registrar una visita';
    end if;
  end if;

  select count(*)::integer
  into v_today_visits
  from public.loyalty_visits
  where customer_id = v_customer.id
    and visited_at >= date_trunc(
      'day',
      now() at time zone 'America/Mexico_City'
    ) at time zone 'America/Mexico_City'
    and visited_at <
      (
        date_trunc(
          'day',
          now() at time zone 'America/Mexico_City'
        )
        + interval '1 day'
      ) at time zone 'America/Mexico_City';

  if v_today_visits >= v_max_visits_per_day then
    raise exception 'El cliente alcanzó el máximo de visitas permitidas por día';
  end if;

  select visited_at
  into v_last_visit
  from public.loyalty_visits
  where customer_id = v_customer.id
  order by visited_at desc
  limit 1;

  if v_last_visit is not null
     and now() < v_last_visit + make_interval(mins => v_cooldown_minutes)
  then
    raise exception 'Debe transcurrir más tiempo antes de registrar otra visita';
  end if;

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

  select count(*)::integer
  into v_total_visits
  from public.loyalty_visits
  where customer_id = v_customer.id;

  return jsonb_build_object(
    'visitId', v_visit_id,
    'customerId', v_customer.id,
    'customerName', v_customer.name,
    'totalVisits', v_total_visits
  );
end;
$$;


-- ============================================================
-- 11. POS: REDEEM REWARD
-- ============================================================

create or replace function public.redeem_loyalty_reward(
  p_qr_token uuid,
  p_reward_id uuid,
  p_order_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;

  v_customer public.loyalty_customers;
  v_reward public.loyalty_rewards;

  v_total_visits integer;
  v_redemption_id uuid;
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

  select *
  into v_customer
  from public.loyalty_customers
  where qr_token = p_qr_token
    and is_active = true;

  if not found then
    raise exception 'Cliente no encontrado';
  end if;

  select *
  into v_reward
  from public.loyalty_rewards
  where id = p_reward_id
    and is_active = true;

  if not found then
    raise exception 'Recompensa no encontrada';
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

  if p_order_id is not null
     and not exists (
       select 1
       from public.orders
       where id = p_order_id
     )
  then
    raise exception 'La orden no existe';
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
  returning id
  into v_redemption_id;

  return jsonb_build_object(
    'redemptionId', v_redemption_id,
    'customerId', v_customer.id,
    'rewardId', v_reward.id,
    'rewardName', v_reward.name,
    'status', 'redeemed'
  );
end;
$$;


-- ============================================================
-- 12. PERMISSIONS
-- ============================================================

revoke all on public.loyalty_customers from anon, authenticated;
revoke all on public.loyalty_rewards from anon, authenticated;
revoke all on public.loyalty_visits from anon, authenticated;
revoke all on public.loyalty_redemptions from anon, authenticated;
revoke all on public.loyalty_settings from anon, authenticated;

revoke all on function public.register_loyalty_customer(text, text, text)
from public;

revoke all on function public.get_loyalty_status(uuid)
from public;

revoke all on function public.register_loyalty_visit(uuid, uuid)
from public;

revoke all on function public.redeem_loyalty_reward(uuid, uuid, uuid)
from public;


-- Web pública
grant execute on function public.register_loyalty_customer(text, text, text)
to anon, authenticated;

grant execute on function public.get_loyalty_status(uuid)
to anon, authenticated;


-- POS autenticado
grant execute on function public.register_loyalty_visit(uuid, uuid)
to authenticated;

grant execute on function public.redeem_loyalty_reward(uuid, uuid, uuid)
to authenticated;