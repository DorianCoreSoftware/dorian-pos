-- ============================================================
-- DORIAN POS
-- FIX WEB CUSTOMER SESSION PERSISTENCE + ORDER HISTORY CLAIM
-- ============================================================
--
-- - Hace la sesión deslizante: cada uso válido renueva 30 días.
-- - Reasocia pedidos web sin customer_id por teléfono de la cuenta.
-- - Mantiene el token almacenado únicamente como hash en servidor.
-- ============================================================

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
  v_customer_phone text;
begin
  v_token := trim(coalesce(p_session_token, ''));

  if v_token = '' then
    raise exception 'Sesión requerida.';
  end if;

  v_token_hash := encode(
    extensions.digest(v_token, 'sha256'),
    'hex'
  );

  select
    s.customer_id,
    regexp_replace(c.phone, '[^0-9]', '', 'g')
  into
    v_customer_id,
    v_customer_phone
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
  set
    last_seen_at = now(),
    expires_at = greatest(
      expires_at,
      now() + interval '30 days'
    )
  where token_hash = v_token_hash;

  -- Pedidos creados como invitado con el mismo teléfono pueden aparecer
  -- en el historial una vez que la cuenta se autentica.
  update public.orders o
  set customer_id = v_customer_id
  where
    o.customer_id is null
    and o.order_source = 'web'
    and o.customer_phone is not null
    and regexp_replace(o.customer_phone, '[^0-9]', '', 'g') =
        v_customer_phone;

  return v_customer_id;
end;
$$;

revoke all
on function public.resolve_web_customer_session(text)
from public;

comment on function public.resolve_web_customer_session(text) is
'Valida una sesión web, renueva su expiración 30 días y recupera pedidos web sin cuenta por teléfono.';
