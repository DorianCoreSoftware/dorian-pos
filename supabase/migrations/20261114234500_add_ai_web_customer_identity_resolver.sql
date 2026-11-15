-- ============================================================
-- DorianCore AI Orders - Phase 6 / Block 2 Hotfix 5
-- Exact web-customer identity resolver for ai-web-chat
-- ============================================================

create or replace function
  public.resolve_ai_web_customer_identity(
    p_session_token text
  )
returns jsonb
language plpgsql
security definer
set search_path =
  public,
  pg_temp
as $$
declare
  v_customer jsonb;
  v_details jsonb;
begin
  if
    nullif(
      trim(
        coalesce(
          p_session_token,
          ''
        )
      ),
      ''
    ) is null
  then
    return null;
  end if;

  /*
   * Reutilizamos EXACTAMENTE las mismas RPC que usa la web.
   * get_my_web_customer valida la sesión y devuelve
   * name/phone/email/etc.
   */
  select
    public.get_my_web_customer(
      p_session_token
    )
  into
    v_customer;

  if
    v_customer is null
  then
    return null;
  end if;

  /*
   * El avatar se obtiene por separado en la implementación
   * actual del sitio web.
   */
  begin
    select
      public.get_my_web_customer_profile_details(
        p_session_token
      )
    into
      v_details;
  exception
    when others then
      v_details :=
        null;
  end;

  return jsonb_build_object(
    'name',
      v_customer ->> 'name',
    'phone',
      v_customer ->> 'phone',
    'avatarUrl',
      coalesce(
        v_details ->> 'avatarUrl',
        v_details ->> 'avatar_url'
      )
  );
end;
$$;

revoke all
on function
  public.resolve_ai_web_customer_identity(
    text
  )
from public;

grant execute
on function
  public.resolve_ai_web_customer_identity(
    text
  )
to service_role;

comment on function
  public.resolve_ai_web_customer_identity(
    text
  )
is
  'Resuelve de forma interna y segura nombre, teléfono y avatar de una sesión web para ai-web-chat.';
