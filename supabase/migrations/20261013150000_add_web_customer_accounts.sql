-- ============================================================
-- DORIAN POS
-- WEB CUSTOMER ACCOUNTS + SECURE SESSIONS + ORDER HISTORY
-- ============================================================
--
-- Objetivos:
-- - Separar la cuenta web general del programa Rewards.
-- - Reutilizar/migrar las cuentas Rewards existentes cuando sea posible.
-- - Mantener checkout como invitado totalmente compatible.
-- - Vincular pedidos web autenticados a una cuenta real.
-- - Exponer historial privado mediante token de sesión seguro.
--
-- IMPORTANTE:
-- La función create_web_order de 6 argumentos NO se reemplaza. Se agrega
-- una sobrecarga de 7 argumentos para clientes autenticados.
-- ============================================================

create extension if not exists pgcrypto
with schema extensions;


-- ============================================================
-- 1. CUENTAS WEB GENERALES
-- ============================================================

create table if not exists public.web_customers (
  id uuid primary key default gen_random_uuid(),

  name text not null,
  phone text not null,
  email text null,

  pin_hash text not null,
  failed_login_attempts integer not null default 0,
  locked_until timestamptz null,

  loyalty_customer_id uuid null
    references public.loyalty_customers(id)
    on delete set null,

  is_active boolean not null default true,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint web_customers_name_not_empty
    check (length(trim(name)) >= 2),

  constraint web_customers_phone_not_empty
    check (length(trim(phone)) > 0),

  constraint web_customers_loyalty_customer_unique
    unique (loyalty_customer_id)
);

create unique index if not exists web_customers_phone_unique_normalized
on public.web_customers (
  regexp_replace(phone, '[^0-9]', '', 'g')
);

create index if not exists web_customers_active_idx
on public.web_customers (is_active);

create index if not exists web_customers_created_at_idx
on public.web_customers (created_at desc);

alter table public.web_customers enable row level security;

-- No se crean policies públicas. El acceso web se realiza exclusivamente
-- mediante RPC SECURITY DEFINER.


-- ============================================================
-- 2. MIGRAR CUENTAS REWARDS EXISTENTES
-- ============================================================
--
-- Solo se migran clientes que ya tienen PIN. Conservamos el mismo UUID
-- como id de la cuenta web para facilitar trazabilidad.
-- ============================================================

insert into public.web_customers (
  id,
  name,
  phone,
  email,
  pin_hash,
  failed_login_attempts,
  locked_until,
  loyalty_customer_id,
  is_active,
  created_at,
  updated_at
)
select
  lc.id,
  lc.name,
  lc.phone,
  lc.email,
  lc.pin_hash,
  coalesce(lc.failed_login_attempts, 0),
  lc.locked_until,
  lc.id,
  lc.is_active,
  lc.created_at,
  lc.updated_at
from public.loyalty_customers lc
where
  lc.pin_hash is not null
  and not exists (
    select 1
    from public.web_customers wc
    where regexp_replace(wc.phone, '[^0-9]', '', 'g') =
          regexp_replace(lc.phone, '[^0-9]', '', 'g')
  );


-- ============================================================
-- 3. SESIONES WEB
-- ============================================================

create table if not exists public.web_customer_sessions (
  id uuid primary key default gen_random_uuid(),

  customer_id uuid not null
    references public.web_customers(id)
    on delete cascade,

  token_hash text not null unique,

  created_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  expires_at timestamptz not null,
  revoked_at timestamptz null
);

create index if not exists web_customer_sessions_customer_idx
on public.web_customer_sessions (customer_id, created_at desc);

create index if not exists web_customer_sessions_active_idx
on public.web_customer_sessions (expires_at)
where revoked_at is null;

alter table public.web_customer_sessions enable row level security;

-- Igual que web_customers: sin policies públicas.


-- ============================================================
-- 4. HELPERS PRIVADOS DE SESIÓN
-- ============================================================

create or replace function public.issue_web_customer_session(
  p_customer_id uuid
)
returns text
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_token text;
  v_token_hash text;
begin
  if p_customer_id is null
     or not exists (
       select 1
       from public.web_customers
       where id = p_customer_id
         and is_active = true
     )
  then
    raise exception 'Cuenta inválida o inactiva.';
  end if;

  v_token := encode(
    extensions.gen_random_bytes(32),
    'hex'
  );

  v_token_hash := encode(
    extensions.digest(v_token, 'sha256'),
    'hex'
  );

  insert into public.web_customer_sessions (
    customer_id,
    token_hash,
    expires_at
  )
  values (
    p_customer_id,
    v_token_hash,
    now() + interval '30 days'
  );

  return v_token;
end;
$$;

revoke all
on function public.issue_web_customer_session(uuid)
from public;


create or replace function public.resolve_web_customer_session(
  p_session_token text
)
returns uuid
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_token text;
  v_token_hash text;
  v_customer_id uuid;
begin
  v_token := trim(coalesce(p_session_token, ''));

  if v_token = '' then
    raise exception 'Sesión requerida.';
  end if;

  v_token_hash := encode(
    extensions.digest(v_token, 'sha256'),
    'hex'
  );

  select s.customer_id
  into v_customer_id
  from public.web_customer_sessions s
  join public.web_customers c
    on c.id = s.customer_id
  where s.token_hash = v_token_hash
    and s.revoked_at is null
    and s.expires_at > now()
    and c.is_active = true
  limit 1;

  if v_customer_id is null then
    raise exception 'La sesión expiró o no es válida.';
  end if;

  update public.web_customer_sessions
  set last_seen_at = now()
  where token_hash = v_token_hash;

  return v_customer_id;
end;
$$;

revoke all
on function public.resolve_web_customer_session(text)
from public;


-- ============================================================
-- 5. REGISTRO WEB GENERAL
-- ============================================================
--
-- Este registro NO depende de que Rewards esté habilitado.
-- ============================================================

create or replace function public.register_web_customer(
  p_name text,
  p_phone text,
  p_email text,
  p_pin text
)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_name text;
  v_phone text;
  v_email text;
  v_pin text;
  v_customer public.web_customers;
  v_session_token text;
begin
  v_name := trim(coalesce(p_name, ''));

  v_phone := regexp_replace(
    coalesce(p_phone, ''),
    '[^0-9]',
    '',
    'g'
  );

  v_email := nullif(
    lower(trim(coalesce(p_email, ''))),
    ''
  );

  v_pin := trim(coalesce(p_pin, ''));

  if length(v_name) < 2 then
    raise exception 'Ingresa un nombre válido.';
  end if;

  if length(v_phone) <> 10 then
    raise exception 'El teléfono debe tener 10 dígitos.';
  end if;

  if v_pin !~ '^[0-9]{6}$' then
    raise exception 'El PIN debe tener 6 dígitos.';
  end if;

  if exists (
    select 1
    from public.web_customers
    where regexp_replace(phone, '[^0-9]', '', 'g') = v_phone
  ) then
    raise exception 'Este teléfono ya está registrado.';
  end if;

  insert into public.web_customers (
    name,
    phone,
    email,
    pin_hash
  )
  values (
    v_name,
    v_phone,
    v_email,
    extensions.crypt(
      v_pin,
      extensions.gen_salt('bf')
    )
  )
  returning *
  into v_customer;

  v_session_token :=
    public.issue_web_customer_session(v_customer.id);

  return jsonb_build_object(
    'id', v_customer.id,
    'name', v_customer.name,
    'phone', v_customer.phone,
    'email', v_customer.email,
    'sessionToken', v_session_token,
    'loyaltyCustomerId', v_customer.loyalty_customer_id
  );
end;
$$;

revoke all
on function public.register_web_customer(text, text, text, text)
from public;

grant execute
on function public.register_web_customer(text, text, text, text)
to anon, authenticated;


-- ============================================================
-- 6. LOGIN WEB GENERAL
-- ============================================================

create or replace function public.login_web_customer(
  p_phone text,
  p_pin text
)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_phone text;
  v_pin text;
  v_customer public.web_customers;
  v_session_token text;
begin
  v_phone := regexp_replace(
    coalesce(p_phone, ''),
    '[^0-9]',
    '',
    'g'
  );

  v_pin := trim(coalesce(p_pin, ''));

  if length(v_phone) <> 10
     or v_pin !~ '^[0-9]{6}$'
  then
    raise exception 'Teléfono o PIN incorrectos.';
  end if;

  select *
  into v_customer
  from public.web_customers
  where regexp_replace(phone, '[^0-9]', '', 'g') = v_phone
    and is_active = true;

  if not found then
    raise exception 'Teléfono o PIN incorrectos.';
  end if;

  if v_customer.locked_until is not null
     and v_customer.locked_until > now()
  then
    raise exception 'Demasiados intentos. Intenta nuevamente más tarde.';
  end if;

  if extensions.crypt(v_pin, v_customer.pin_hash) <>
     v_customer.pin_hash
  then
    update public.web_customers
    set
      failed_login_attempts = failed_login_attempts + 1,
      locked_until = case
        when failed_login_attempts + 1 >= 5
          then now() + interval '15 minutes'
        else null
      end,
      updated_at = now()
    where id = v_customer.id;

    raise exception 'Teléfono o PIN incorrectos.';
  end if;

  update public.web_customers
  set
    failed_login_attempts = 0,
    locked_until = null,
    updated_at = now()
  where id = v_customer.id;

  v_session_token :=
    public.issue_web_customer_session(v_customer.id);

  return jsonb_build_object(
    'id', v_customer.id,
    'name', v_customer.name,
    'phone', v_customer.phone,
    'email', v_customer.email,
    'sessionToken', v_session_token,
    'loyaltyCustomerId', v_customer.loyalty_customer_id
  );
end;
$$;

revoke all
on function public.login_web_customer(text, text)
from public;

grant execute
on function public.login_web_customer(text, text)
to anon, authenticated;


-- ============================================================
-- 7. PERFIL DE LA SESIÓN ACTUAL
-- ============================================================

create or replace function public.get_my_web_customer(
  p_session_token text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_customer_id uuid;
  v_result jsonb;
begin
  v_customer_id :=
    public.resolve_web_customer_session(p_session_token);

  select jsonb_build_object(
    'id', wc.id,
    'name', wc.name,
    'phone', wc.phone,
    'email', wc.email,
    'loyaltyCustomerId', wc.loyalty_customer_id,
    'qrToken', lc.qr_token,
    'rewardsActive', (
      wc.loyalty_customer_id is not null
      and coalesce(lc.is_active, false)
    )
  )
  into v_result
  from public.web_customers wc
  left join public.loyalty_customers lc
    on lc.id = wc.loyalty_customer_id
  where wc.id = v_customer_id;

  return v_result;
end;
$$;

revoke all
on function public.get_my_web_customer(text)
from public;

grant execute
on function public.get_my_web_customer(text)
to anon, authenticated;


-- ============================================================
-- 8. LOGOUT
-- ============================================================

create or replace function public.logout_web_customer(
  p_session_token text
)
returns boolean
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_token text;
  v_token_hash text;
begin
  v_token := trim(coalesce(p_session_token, ''));

  if v_token = '' then
    return true;
  end if;

  v_token_hash := encode(
    extensions.digest(v_token, 'sha256'),
    'hex'
  );

  update public.web_customer_sessions
  set revoked_at = coalesce(revoked_at, now())
  where token_hash = v_token_hash;

  return true;
end;
$$;

revoke all
on function public.logout_web_customer(text)
from public;

grant execute
on function public.logout_web_customer(text)
to anon, authenticated;


-- ============================================================
-- 9. VINCULAR ORDERS A CUENTA WEB
-- ============================================================

alter table public.orders
add column if not exists customer_id uuid null
references public.web_customers(id)
on delete set null;

create index if not exists orders_customer_created_idx
on public.orders (customer_id, created_at desc)
where customer_id is not null;

-- Recuperamos historial web anterior por teléfono cuando existe una cuenta
-- web con ese teléfono normalizado.
update public.orders o
set customer_id = wc.id
from public.web_customers wc
where
  o.customer_id is null
  and o.order_source = 'web'
  and o.customer_phone is not null
  and regexp_replace(o.customer_phone, '[^0-9]', '', 'g') =
      regexp_replace(wc.phone, '[^0-9]', '', 'g');


-- ============================================================
-- 10. CHECKOUT WEB AUTENTICADO
-- ============================================================
--
-- Se conserva intacta la función existente de 6 argumentos usada por
-- invitados. Esta sobrecarga agrega p_customer_session_token.
-- ============================================================

create or replace function public.create_web_order(
  p_items jsonb,
  p_delivery jsonb,
  p_client_request_id uuid,
  p_customer_name text,
  p_customer_phone text,
  p_fulfillment_type text,
  p_customer_session_token text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_customer_id uuid;
  v_customer public.web_customers;
  v_existing_order public.orders;
  v_order_id uuid;
begin
  if nullif(trim(coalesce(p_customer_session_token, '')), '') is null then
    return public.create_web_order(
      p_items,
      p_delivery,
      p_client_request_id,
      p_customer_name,
      p_customer_phone,
      p_fulfillment_type
    );
  end if;

  v_customer_id :=
    public.resolve_web_customer_session(p_customer_session_token);

  select *
  into v_customer
  from public.web_customers
  where id = v_customer_id
    and is_active = true;

  if not found then
    raise exception 'La cuenta del cliente no está disponible.';
  end if;

  -- Protección adicional de idempotencia: si el request ya existía,
  -- únicamente puede reutilizarse por la misma cuenta/teléfono.
  select *
  into v_existing_order
  from public.orders
  where client_request_id = p_client_request_id;

  if found then
    if v_existing_order.customer_id is not null
       and v_existing_order.customer_id <> v_customer_id
    then
      raise exception 'La solicitud ya pertenece a otra cuenta.';
    end if;

    if v_existing_order.customer_id is null
       and v_existing_order.customer_phone is not null
       and regexp_replace(v_existing_order.customer_phone, '[^0-9]', '', 'g') <>
           regexp_replace(v_customer.phone, '[^0-9]', '', 'g')
    then
      raise exception 'La solicitud ya pertenece a otro cliente.';
    end if;
  end if;

  -- Para una cuenta autenticada, nombre y teléfono salen del servidor;
  -- no confiamos en los valores que envíe el navegador.
  v_order_id := public.create_web_order(
    p_items,
    p_delivery,
    p_client_request_id,
    v_customer.name,
    v_customer.phone,
    p_fulfillment_type
  );

  update public.orders
  set customer_id = v_customer_id
  where id = v_order_id
    and (
      customer_id is null
      or customer_id = v_customer_id
    );

  return v_order_id;
end;
$$;

revoke all
on function public.create_web_order(
  jsonb,
  jsonb,
  uuid,
  text,
  text,
  text,
  text
)
from public;

grant execute
on function public.create_web_order(
  jsonb,
  jsonb,
  uuid,
  text,
  text,
  text,
  text
)
to anon, authenticated;


-- ============================================================
-- 11. HISTORIAL PRIVADO DE PEDIDOS
-- ============================================================

create or replace function public.get_my_web_orders(
  p_session_token text,
  p_limit integer default 30,
  p_offset integer default 0
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_customer_id uuid;
  v_limit integer;
  v_offset integer;
  v_result jsonb;
begin
  v_customer_id :=
    public.resolve_web_customer_session(p_session_token);

  v_limit := least(greatest(coalesce(p_limit, 30), 1), 100);
  v_offset := greatest(coalesce(p_offset, 0), 0);

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', o.id,
        'trackingCode', upper(split_part(o.id::text, '-', 1)),
        'status', o.status,
        'total', o.total,
        'fulfillmentType', o.fulfillment_type,
        'createdAt', o.created_at,
        'updatedAt', o.status_updated_at,
        'customerName', o.customer_name,
        'items', coalesce(
          (
            select jsonb_agg(
              jsonb_build_object(
                'id', oi.id,
                'productId', oi.product_id,
                'productName', coalesce(p.name, 'Producto'),
                'quantity', oi.quantity,
                'unitPrice', oi.price_at_purchase,
                'notes', oi.notes
              )
              order by oi.created_at asc
            )
            from public.order_items oi
            left join public.products p
              on p.id = oi.product_id
            where oi.order_id = o.id
          ),
          '[]'::jsonb
        )
      )
      order by o.created_at desc
    ),
    '[]'::jsonb
  )
  into v_result
  from (
    select ord.*
    from public.orders ord
    where ord.customer_id = v_customer_id
      and ord.order_source = 'web'
    order by ord.created_at desc
    limit v_limit
    offset v_offset
  ) o;

  return v_result;
end;
$$;

revoke all
on function public.get_my_web_orders(text, integer, integer)
from public;

grant execute
on function public.get_my_web_orders(text, integer, integer)
to anon, authenticated;


-- ============================================================
-- 12. COMENTARIOS DE ESQUEMA
-- ============================================================

comment on table public.web_customers is
'Cuenta general del cliente de la web. Independiente de Rewards.';

comment on table public.web_customer_sessions is
'Sesiones web de clientes. Solo almacena hash SHA-256 del token.';

comment on column public.orders.customer_id is
'Cuenta web autenticada asociada al pedido. NULL para pedidos de invitado.';

comment on function public.get_my_web_orders(text, integer, integer) is
'Historial privado de pedidos web resuelto mediante token de sesión.';
