-- ============================================================
-- BURGER KONG REWARDS - CUSTOMER LOGIN
-- ============================================================

create extension if not exists pgcrypto
with schema extensions;


-- ============================================================
-- 1. CAMPOS DE AUTENTICACIÓN
-- ============================================================

alter table public.loyalty_customers
add column if not exists pin_hash text null;

alter table public.loyalty_customers
add column if not exists failed_login_attempts integer
not null default 0;

alter table public.loyalty_customers
add column if not exists locked_until timestamptz null;


-- ============================================================
-- 2. ACTUALIZAR REGISTRO
-- ============================================================

drop function if exists
public.register_loyalty_customer(
  text,
  text,
  text
);

create or replace function public.register_loyalty_customer(
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

  v_is_enabled boolean;

  v_customer public.loyalty_customers;
begin
  select is_enabled
  into v_is_enabled
  from public.loyalty_settings
  where id = true;

  if not coalesce(
    v_is_enabled,
    false
  ) then
    raise exception
      'El programa de recompensas no está disponible';
  end if;

  v_name :=
    trim(
      coalesce(
        p_name,
        ''
      )
    );

  v_phone :=
    regexp_replace(
      coalesce(
        p_phone,
        ''
      ),
      '[^0-9]',
      '',
      'g'
    );

  v_email :=
    nullif(
      lower(
        trim(
          coalesce(
            p_email,
            ''
          )
        )
      ),
      ''
    );

  v_pin :=
    trim(
      coalesce(
        p_pin,
        ''
      )
    );


  if length(v_name) < 2 then
    raise exception
      'Nombre inválido';
  end if;


  if length(v_phone) <> 10 then
    raise exception
      'El teléfono debe tener 10 dígitos';
  end if;


  if v_pin !~ '^[0-9]{6}$' then
    raise exception
      'El PIN debe tener 6 dígitos';
  end if;


  if exists (
    select 1
    from public.loyalty_customers
    where regexp_replace(
      phone,
      '[^0-9]',
      '',
      'g'
    ) = v_phone
  ) then
    raise exception
      'Este teléfono ya está registrado';
  end if;


  insert into public.loyalty_customers (
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
      extensions.gen_salt(
        'bf'
      )
    )
  )
  returning *
  into v_customer;


  return jsonb_build_object(
    'id',
      v_customer.id,

    'name',
      v_customer.name,

    'qrToken',
      v_customer.qr_token,

    'totalVisits',
      0
  );
end;
$$;


-- ============================================================
-- 3. LOGIN DEL CLIENTE
-- ============================================================

create or replace function public.login_loyalty_customer(
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

  v_customer public.loyalty_customers;
begin
  v_phone :=
    regexp_replace(
      coalesce(
        p_phone,
        ''
      ),
      '[^0-9]',
      '',
      'g'
    );

  v_pin :=
    trim(
      coalesce(
        p_pin,
        ''
      )
    );


  if length(v_phone) <> 10
     or v_pin !~ '^[0-9]{6}$'
  then
    raise exception
      'Teléfono o PIN incorrectos';
  end if;


  select *
  into v_customer
  from public.loyalty_customers
  where regexp_replace(
    phone,
    '[^0-9]',
    '',
    'g'
  ) = v_phone
    and is_active = true;


  if not found then
    raise exception
      'Teléfono o PIN incorrectos';
  end if;


  if v_customer.locked_until
       is not null
     and
     v_customer.locked_until >
       now()
  then
    raise exception
      'Demasiados intentos. Intenta nuevamente más tarde';
  end if;


  if v_customer.pin_hash
       is null
  then
    raise exception
      'Esta cuenta todavía no tiene un PIN configurado';
  end if;


  if extensions.crypt(
    v_pin,
    v_customer.pin_hash
  ) <>
  v_customer.pin_hash
  then

    update public.loyalty_customers
    set
      failed_login_attempts =
        failed_login_attempts + 1,

      locked_until =
        case
          when
            failed_login_attempts + 1 >= 5
          then
            now() +
            interval '15 minutes'
          else
            null
        end

    where id =
      v_customer.id;


    raise exception
      'Teléfono o PIN incorrectos';
  end if;


  update public.loyalty_customers
  set
    failed_login_attempts =
      0,

    locked_until =
      null,

    updated_at =
      now()

  where id =
    v_customer.id;


  return jsonb_build_object(
    'id',
      v_customer.id,

    'name',
      v_customer.name,

    'qrToken',
      v_customer.qr_token
  );
end;
$$;


-- ============================================================
-- 4. PERMISOS
-- ============================================================

revoke all
on function public.register_loyalty_customer(
  text,
  text,
  text,
  text
)
from public;

grant execute
on function public.register_loyalty_customer(
  text,
  text,
  text,
  text
)
to anon, authenticated;


revoke all
on function public.login_loyalty_customer(
  text,
  text
)
from public;

grant execute
on function public.login_loyalty_customer(
  text,
  text
)
to anon, authenticated;