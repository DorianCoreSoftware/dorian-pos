-- ============================================================
-- DORIAN POS
-- WEB ACCOUNT -> REWARDS INTEGRATION
-- ============================================================
--
-- - Recompensas usa la cuenta web general como identidad.
-- - Ya no requiere un segundo login de Rewards.
-- - Si la cuenta aún no tiene perfil de loyalty, se crea/vincula al
--   entrar por primera vez a Recompensas.
-- - Respeta business_settings.loyalty_enabled y loyalty_settings.is_enabled.
-- ============================================================

create or replace function public.activate_my_web_rewards(
  p_session_token text
)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_web_customer_id uuid;
  v_web_customer public.web_customers;
  v_loyalty_customer public.loyalty_customers;
  v_program_enabled boolean;
begin
  v_web_customer_id :=
    public.resolve_web_customer_session(p_session_token);

  if not public.is_business_feature_enabled('loyalty') then
    raise exception 'El programa de recompensas no está disponible para este negocio.';
  end if;

  select is_enabled
  into v_program_enabled
  from public.loyalty_settings
  where id = true;

  if not coalesce(v_program_enabled, false) then
    raise exception 'El programa de recompensas no está disponible en este momento.';
  end if;

  select *
  into v_web_customer
  from public.web_customers
  where id = v_web_customer_id
    and is_active = true;

  if not found then
    raise exception 'La cuenta del cliente no está disponible.';
  end if;

  if v_web_customer.loyalty_customer_id is not null then
    select *
    into v_loyalty_customer
    from public.loyalty_customers
    where id = v_web_customer.loyalty_customer_id;

    if not found or not coalesce(v_loyalty_customer.is_active, false) then
      raise exception 'Tu cuenta de recompensas no está disponible.';
    end if;
  else
    select *
    into v_loyalty_customer
    from public.loyalty_customers
    where regexp_replace(phone, '[^0-9]', '', 'g') =
          regexp_replace(v_web_customer.phone, '[^0-9]', '', 'g')
    limit 1;

    if found then
      if not coalesce(v_loyalty_customer.is_active, false) then
        raise exception 'Tu cuenta de recompensas no está disponible.';
      end if;
    else
      insert into public.loyalty_customers (
        name,
        phone,
        email,
        pin_hash,
        failed_login_attempts,
        locked_until,
        is_active
      )
      values (
        v_web_customer.name,
        v_web_customer.phone,
        v_web_customer.email,
        v_web_customer.pin_hash,
        0,
        null,
        true
      )
      returning *
      into v_loyalty_customer;
    end if;

    update public.web_customers
    set
      loyalty_customer_id = v_loyalty_customer.id,
      updated_at = now()
    where id = v_web_customer.id;
  end if;

  return jsonb_build_object(
    'loyaltyCustomerId', v_loyalty_customer.id,
    'qrToken', v_loyalty_customer.qr_token,
    'name', v_loyalty_customer.name,
    'totalVisits', v_loyalty_customer.total_visits
  );
end;
$$;

revoke all
on function public.activate_my_web_rewards(text)
from public;

grant execute
on function public.activate_my_web_rewards(text)
to anon, authenticated;

comment on function public.activate_my_web_rewards(text) is
'Activa o vincula Rewards para la cuenta web autenticada sin requerir un segundo login.';
