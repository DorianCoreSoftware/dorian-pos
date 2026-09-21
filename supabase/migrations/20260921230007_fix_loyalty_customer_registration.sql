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
  v_is_enabled boolean;

  v_customer public.loyalty_customers;
begin
  select is_enabled
  into v_is_enabled
  from public.loyalty_settings
  where id = true;

  if not coalesce(v_is_enabled, false) then
    raise exception 'El programa de recompensas no está disponible';
  end if;

  v_name := trim(coalesce(p_name, ''));
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

revoke all on function public.register_loyalty_customer(text, text, text)
from public;

grant execute on function public.register_loyalty_customer(text, text, text)
to anon, authenticated;