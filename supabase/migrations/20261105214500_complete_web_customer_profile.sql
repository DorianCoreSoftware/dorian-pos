-- ============================================================
-- PERFIL COMPLETO DE CLIENTE WEB
-- 2026-11-05
-- ============================================================

alter table public.web_customers
add column if not exists avatar_url text null;

-- Bucket público solo para lectura.
-- Las escrituras se realizan exclusivamente desde la Edge Function
-- web-customer-avatar usando service_role.
insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'web-customer-avatars',
  'web-customer-avatars',
  true,
  4194304,
  array[
    'image/jpeg',
    'image/png',
    'image/webp'
  ]::text[]
)
on conflict (id)
do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create or replace function public.get_my_web_customer_profile_details(
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
    public.resolve_web_customer_session(
      p_session_token
    );

  select jsonb_build_object(
    'avatarUrl',
      wc.avatar_url,
    'createdAt',
      wc.created_at
  )
  into v_result
  from public.web_customers wc
  where wc.id = v_customer_id
    and wc.is_active = true;

  if v_result is null then
    raise exception 'La cuenta del cliente no está disponible.';
  end if;

  return v_result;
end;
$$;

revoke all
on function public.get_my_web_customer_profile_details(text)
from public;

grant execute
on function public.get_my_web_customer_profile_details(text)
to anon, authenticated;


create or replace function public.update_my_web_customer_profile(
  p_session_token text,
  p_name text,
  p_phone text,
  p_email text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_customer_id uuid;
  v_customer public.web_customers%rowtype;
  v_name text;
  v_phone text;
  v_email text;
  v_qr_token uuid;
  v_rewards_active boolean := false;
begin
  v_customer_id :=
    public.resolve_web_customer_session(
      p_session_token
    );

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
      '\D',
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

  if length(v_name) < 2
     or length(v_name) > 80
  then
    raise exception 'Ingresa un nombre válido.';
  end if;

  if v_phone !~ '^[0-9]{10}$' then
    raise exception 'El teléfono debe tener 10 dígitos.';
  end if;

  if v_email is not null
     and v_email !~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'
  then
    raise exception 'El correo electrónico no es válido.';
  end if;

  if exists (
    select 1
    from public.web_customers other_customer
    where regexp_replace(
      other_customer.phone,
      '\D',
      '',
      'g'
    ) = v_phone
      and other_customer.id <> v_customer_id
  ) then
    raise exception 'Ese teléfono ya está asociado a otra cuenta.';
  end if;

  select *
  into v_customer
  from public.web_customers
  where id = v_customer_id
  for update;

  if not found
     or not coalesce(
       v_customer.is_active,
       false
     )
  then
    raise exception 'La cuenta del cliente no está disponible.';
  end if;

  update public.web_customers
  set
    name = v_name,
    phone = v_phone,
    email = v_email,
    updated_at = now()
  where id = v_customer_id;

  if v_customer.loyalty_customer_id is not null then
    if exists (
      select 1
      from public.loyalty_customers lc
      where regexp_replace(
        lc.phone,
        '\D',
        '',
        'g'
      ) = v_phone
        and lc.id <> v_customer.loyalty_customer_id
    ) then
      raise exception 'Ese teléfono ya está asociado a otra cuenta de recompensas.';
    end if;

    update public.loyalty_customers
    set
      name = v_name,
      phone = v_phone,
      email = v_email,
      updated_at = now()
    where id = v_customer.loyalty_customer_id
      and is_active = true
    returning
      qr_token
    into
      v_qr_token;

    v_rewards_active :=
      found;
  end if;

  return jsonb_build_object(
    'id',
      v_customer_id,
    'name',
      v_name,
    'phone',
      v_phone,
    'email',
      v_email,
    'loyaltyCustomerId',
      v_customer.loyalty_customer_id,
    'qrToken',
      v_qr_token,
    'rewardsActive',
      v_rewards_active,
    'avatarUrl',
      v_customer.avatar_url,
    'createdAt',
      v_customer.created_at
  );
exception
  when unique_violation then
    raise exception 'El teléfono ya está asociado a otra cuenta.';
end;
$$;

revoke all
on function public.update_my_web_customer_profile(
  text,
  text,
  text,
  text
)
from public;

grant execute
on function public.update_my_web_customer_profile(
  text,
  text,
  text,
  text
)
to anon, authenticated;


create or replace function public.delete_my_web_customer_default_address(
  p_session_token text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_customer_id uuid;
begin
  v_customer_id :=
    public.resolve_web_customer_session(
      p_session_token
    );

  delete from public.web_customer_addresses
  where customer_id = v_customer_id
    and is_default = true;
end;
$$;

revoke all
on function public.delete_my_web_customer_default_address(text)
from public;

grant execute
on function public.delete_my_web_customer_default_address(text)
to anon, authenticated;
