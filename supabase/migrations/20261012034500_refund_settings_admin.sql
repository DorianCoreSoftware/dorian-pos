-- Dorian POS
-- Administración de política de devoluciones.

create or replace function public.get_refund_settings()
returns jsonb
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $function$
declare
  v_settings public.refund_settings%rowtype;
begin
  if not exists (
    select 1
    from public.profiles profile
    where profile.id = auth.uid()
      and profile.role = 'admin'::public.user_role
      and coalesce(profile.is_active, true) = true
  ) then
    raise exception 'No autorizado.';
  end if;

  select *
  into v_settings
  from public.refund_settings
  where id = 1;

  if not found then
    raise exception 'No existe la configuración de devoluciones.';
  end if;

  return jsonb_build_object(
    'enabled',
    v_settings.enabled,

    'maxHours',
    v_settings.max_hours,

    'allowPartial',
    v_settings.allow_partial,

    'requireReason',
    v_settings.require_reason,

    'requireNotes',
    v_settings.require_notes,

    'allowPolicyExceptions',
    v_settings.allow_policy_exceptions,

    'updatedAt',
    v_settings.updated_at
  );
end;
$function$;


create or replace function public.update_refund_settings(
  p_enabled boolean,
  p_max_hours integer,
  p_allow_partial boolean,
  p_require_reason boolean,
  p_require_notes boolean,
  p_allow_policy_exceptions boolean
)
returns void
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $function$
begin
  if not exists (
    select 1
    from public.profiles profile
    where profile.id = auth.uid()
      and profile.role = 'admin'::public.user_role
      and coalesce(profile.is_active, true) = true
  ) then
    raise exception 'No autorizado.';
  end if;

  if p_max_hours is null
     or p_max_hours < 0
     or p_max_hours > 8760
  then
    raise exception
      'Las horas máximas deben estar entre 0 y 8760.';
  end if;

  update public.refund_settings
  set
    enabled =
      coalesce(
        p_enabled,
        enabled
      ),

    max_hours =
      p_max_hours,

    allow_partial =
      coalesce(
        p_allow_partial,
        allow_partial
      ),

    require_reason =
      coalesce(
        p_require_reason,
        require_reason
      ),

    require_notes =
      coalesce(
        p_require_notes,
        require_notes
      ),

    allow_policy_exceptions =
      coalesce(
        p_allow_policy_exceptions,
        allow_policy_exceptions
      ),

    updated_at =
      now()
  where id = 1;

  if not found then
    raise exception
      'No existe la configuración de devoluciones.';
  end if;
end;
$function$;


revoke execute
on function public.get_refund_settings()
from public, anon;

revoke execute
on function public.update_refund_settings(
  boolean,
  integer,
  boolean,
  boolean,
  boolean,
  boolean
)
from public, anon;

grant execute
on function public.get_refund_settings()
to authenticated;

grant execute
on function public.update_refund_settings(
  boolean,
  integer,
  boolean,
  boolean,
  boolean,
  boolean
)
to authenticated;
