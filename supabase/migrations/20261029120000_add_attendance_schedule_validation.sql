begin;

/*
 * ============================================================
 * CONFIGURACIÓN DE ASISTENCIA
 * ============================================================
 */
create table if not exists public.attendance_settings (
  id smallint primary key default 1 check (id = 1),
  reminders_enabled boolean not null default true,
  early_clock_in_minutes integer not null default 60
    check (early_clock_in_minutes between 0 and 360),
  reminder_interval_minutes integer not null default 15
    check (reminder_interval_minutes between 1 and 240),
  after_close_grace_minutes integer not null default 60
    check (after_close_grace_minutes between 0 and 720),
  updated_at timestamptz not null default now(),
  updated_by uuid null references public.profiles(id)
);

insert into public.attendance_settings (
  id,
  reminders_enabled,
  early_clock_in_minutes,
  reminder_interval_minutes,
  after_close_grace_minutes
)
values (1, true, 60, 15, 60)
on conflict (id) do nothing;

alter table public.attendance_settings enable row level security;
revoke all on public.attendance_settings from anon, authenticated;

/*
 * ============================================================
 * CONTEXTO DEL HORARIO EFECTIVO
 * ============================================================
 * Respeta:
 * - timezone del negocio
 * - excepciones por fecha
 * - horarios que cruzan medianoche
 * - ventana anticipada configurable
 */
create or replace function public.attendance_schedule_context()
returns table (
  timezone text,
  local_now timestamp,
  schedule_date date,
  schedule_is_open boolean,
  schedule_open_at timestamptz,
  schedule_close_at timestamptz,
  entry_window_start timestamptz,
  within_business_hours boolean,
  within_clock_in_window boolean,
  before_clock_in_window boolean,
  after_business_close boolean,
  schedule_is_exception boolean,
  schedule_reason text
)
language plpgsql
security definer
set search_path = public
stable
as $$
declare
  v_timezone text;
  v_local_now timestamp;
  v_today date;
  v_yesterday date;
  v_early integer;

  v_today_open boolean;
  v_today_open_time time;
  v_today_close_time time;
  v_today_exception boolean;
  v_today_reason text;

  v_prev_open boolean;
  v_prev_open_time time;
  v_prev_close_time time;
  v_prev_exception boolean;
  v_prev_reason text;

  v_date date;
  v_is_open boolean;
  v_open_time time;
  v_close_time time;
  v_exception boolean;
  v_reason text;

  v_open_local timestamp;
  v_close_local timestamp;
  v_entry_local timestamp;
begin
  select coalesce(bs.timezone, 'America/Mexico_City')
  into v_timezone
  from public.business_settings bs
  where bs.id = 1;

  v_timezone := coalesce(v_timezone, 'America/Mexico_City');
  v_local_now := timezone(v_timezone, now());
  v_today := v_local_now::date;
  v_yesterday := v_today - 1;

  select coalesce(s.early_clock_in_minutes, 60)
  into v_early
  from public.attendance_settings s
  where s.id = 1;

  v_early := coalesce(v_early, 60);

  select
    s.is_open,
    s.open_time,
    s.close_time,
    s.is_exception,
    s.reason
  into
    v_today_open,
    v_today_open_time,
    v_today_close_time,
    v_today_exception,
    v_today_reason
  from public.get_effective_business_schedule(v_today) s;

  select
    s.is_open,
    s.open_time,
    s.close_time,
    s.is_exception,
    s.reason
  into
    v_prev_open,
    v_prev_open_time,
    v_prev_close_time,
    v_prev_exception,
    v_prev_reason
  from public.get_effective_business_schedule(v_yesterday) s;

  /*
   * Si el turno de ayer cruza medianoche y todavía no ha terminado,
   * ese es el horario efectivo actual.
   */
  if
    coalesce(v_prev_open, false)
    and v_prev_open_time is not null
    and v_prev_close_time is not null
    and v_prev_close_time <= v_prev_open_time
    and v_local_now < (v_today + v_prev_close_time)
  then
    v_date := v_yesterday;
    v_is_open := v_prev_open;
    v_open_time := v_prev_open_time;
    v_close_time := v_prev_close_time;
    v_exception := coalesce(v_prev_exception, false);
    v_reason := v_prev_reason;
  else
    v_date := v_today;
    v_is_open := coalesce(v_today_open, false);
    v_open_time := v_today_open_time;
    v_close_time := v_today_close_time;
    v_exception := coalesce(v_today_exception, false);
    v_reason := v_today_reason;
  end if;

  if
    not coalesce(v_is_open, false)
    or v_open_time is null
    or v_close_time is null
  then
    return query
    select
      v_timezone,
      v_local_now,
      v_date,
      false,
      null::timestamptz,
      null::timestamptz,
      null::timestamptz,
      false,
      false,
      false,
      false,
      v_exception,
      v_reason;
    return;
  end if;

  v_open_local := v_date + v_open_time;

  if v_close_time > v_open_time then
    v_close_local := v_date + v_close_time;
  else
    v_close_local := (v_date + 1) + v_close_time;
  end if;

  v_entry_local := v_open_local - make_interval(mins => v_early);

  return query
  select
    v_timezone,
    v_local_now,
    v_date,
    true,
    v_open_local at time zone v_timezone,
    v_close_local at time zone v_timezone,
    v_entry_local at time zone v_timezone,
    v_local_now >= v_open_local and v_local_now < v_close_local,
    v_local_now >= v_entry_local and v_local_now < v_close_local,
    v_local_now < v_entry_local,
    v_local_now >= v_close_local,
    v_exception,
    v_reason;
end;
$$;

revoke all on function public.attendance_schedule_context() from public;
grant execute on function public.attendance_schedule_context() to authenticated;

/*
 * ============================================================
 * ESTADO GLOBAL DEL CHECADOR
 * ============================================================
 */
create or replace function public.attendance_get_status()
returns jsonb
language plpgsql
security definer
set search_path = public
stable
as $$
declare
  v_profile public.profiles%rowtype;
  v_open public.attendance_records%rowtype;
  v_schedule record;
  v_settings public.attendance_settings%rowtype;
  v_needs_clock_in boolean;
  v_needs_clock_out boolean;
  v_open_local_date date;
  v_open_schedule record;
  v_open_close_local timestamp;
  v_open_expected_close timestamptz;
begin
  select *
  into v_profile
  from public.profiles
  where id = auth.uid();

  if v_profile.id is null then
    raise exception 'No se encontró el perfil del usuario.';
  end if;

  if not coalesce(v_profile.is_active, false) then
    raise exception 'Tu usuario está inactivo.';
  end if;

  select *
  into v_settings
  from public.attendance_settings
  where id = 1;

  select *
  into v_open
  from public.attendance_records
  where user_id = auth.uid()
    and clock_out is null
  order by clock_in desc
  limit 1;

  select *
  into v_schedule
  from public.attendance_schedule_context();

  v_needs_clock_in :=
    coalesce(v_settings.reminders_enabled, true)
    and v_open.id is null
    and coalesce(v_schedule.schedule_is_open, false)
    and coalesce(v_schedule.within_clock_in_window, false);

  v_needs_clock_out := false;

  if
    coalesce(v_settings.reminders_enabled, true)
    and v_open.id is not null
  then
    v_open_local_date :=
      timezone(v_schedule.timezone, v_open.clock_in)::date;

    select *
    into v_open_schedule
    from public.get_effective_business_schedule(v_open_local_date);

    if
      coalesce(v_open_schedule.is_open, false)
      and v_open_schedule.open_time is not null
      and v_open_schedule.close_time is not null
    then
      if v_open_schedule.close_time > v_open_schedule.open_time then
        v_open_close_local :=
          v_open_local_date + v_open_schedule.close_time;
      else
        v_open_close_local :=
          (v_open_local_date + 1) + v_open_schedule.close_time;
      end if;

      v_open_expected_close :=
        v_open_close_local at time zone v_schedule.timezone;

      v_needs_clock_out :=
        now() >= (
          v_open_expected_close
          + make_interval(
              mins => coalesce(v_settings.after_close_grace_minutes, 60)
            )
        );
    end if;
  end if;

  return jsonb_build_object(
    'has_open_attendance', v_open.id is not null,
    'open_attendance_id', v_open.id,
    'open_clock_in', v_open.clock_in,
    'timezone', v_schedule.timezone,
    'local_now', v_schedule.local_now,
    'schedule_date', v_schedule.schedule_date,
    'schedule_is_open', coalesce(v_schedule.schedule_is_open, false),
    'schedule_open_at', v_schedule.schedule_open_at,
    'schedule_close_at', v_schedule.schedule_close_at,
    'entry_window_start', v_schedule.entry_window_start,
    'within_business_hours', coalesce(v_schedule.within_business_hours, false),
    'within_clock_in_window', coalesce(v_schedule.within_clock_in_window, false),
    'before_clock_in_window', coalesce(v_schedule.before_clock_in_window, false),
    'after_business_close', coalesce(v_schedule.after_business_close, false),
    'schedule_is_exception', coalesce(v_schedule.schedule_is_exception, false),
    'schedule_reason', v_schedule.schedule_reason,
    'needs_clock_in_reminder', v_needs_clock_in,
    'needs_clock_out_reminder', v_needs_clock_out,
    'reminders_enabled', coalesce(v_settings.reminders_enabled, true),
    'early_clock_in_minutes', coalesce(v_settings.early_clock_in_minutes, 60),
    'reminder_interval_minutes', coalesce(v_settings.reminder_interval_minutes, 15),
    'after_close_grace_minutes', coalesce(v_settings.after_close_grace_minutes, 60)
  );
end;
$$;

revoke all on function public.attendance_get_status() from public;
grant execute on function public.attendance_get_status() to authenticated;

/*
 * ============================================================
 * ENTRADA CON VALIDACIÓN DE HORARIO
 * ============================================================
 */
create or replace function public.attendance_clock_in()
returns public.attendance_records
language plpgsql
security definer
set search_path = public
as $$
declare
  v_profile public.profiles%rowtype;
  v_record public.attendance_records%rowtype;
  v_schedule record;
begin
  select *
  into v_profile
  from public.profiles
  where id = auth.uid();

  if v_profile.id is null then
    raise exception 'No se encontró el perfil del usuario.';
  end if;

  if not coalesce(v_profile.is_active, false) then
    raise exception 'Tu usuario está inactivo.';
  end if;

  if exists (
    select 1
    from public.attendance_records
    where user_id = auth.uid()
      and clock_out is null
  ) then
    raise exception 'Ya tienes una asistencia abierta.';
  end if;

  select *
  into v_schedule
  from public.attendance_schedule_context();

  if not coalesce(v_schedule.schedule_is_open, false) then
    if nullif(trim(coalesce(v_schedule.schedule_reason, '')), '') is not null then
      raise exception 'No puedes registrar entrada: el negocio está cerrado (%).',
        v_schedule.schedule_reason;
    end if;

    raise exception 'No puedes registrar entrada: el negocio está cerrado para este turno.';
  end if;

  if coalesce(v_schedule.before_clock_in_window, false) then
    raise exception 'Aún es demasiado temprano para registrar entrada. La ventana comienza a las %.',
      to_char(v_schedule.entry_window_start at time zone v_schedule.timezone, 'HH24:MI');
  end if;

  if coalesce(v_schedule.after_business_close, false) then
    raise exception 'El horario del negocio ya terminó. Solicita una corrección a un administrador si trabajaste fuera de horario.';
  end if;

  if not coalesce(v_schedule.within_clock_in_window, false) then
    raise exception 'No puedes registrar entrada fuera de la ventana permitida.';
  end if;

  insert into public.attendance_records (
    user_id,
    clock_in
  )
  values (
    auth.uid(),
    now()
  )
  returning * into v_record;

  return v_record;
end;
$$;

grant execute on function public.attendance_clock_in() to authenticated;

/*
 * La salida se mantiene deliberadamente disponible aunque el negocio
 * ya haya cerrado: nunca debemos dejar atrapada una jornada abierta.
 */

/*
 * ============================================================
 * CONFIGURACIÓN ADMIN
 * ============================================================
 */
create or replace function public.attendance_admin_get_settings()
returns table (
  reminders_enabled boolean,
  early_clock_in_minutes integer,
  reminder_interval_minutes integer,
  after_close_grace_minutes integer
)
language plpgsql
security definer
set search_path = public
stable
as $$
declare
  v_admin public.profiles%rowtype;
begin
  select *
  into v_admin
  from public.profiles
  where id = auth.uid();

  if v_admin.id is null
     or v_admin.role <> 'admin'::public.user_role
     or not coalesce(v_admin.is_active, false) then
    raise exception 'Solo un administrador activo puede consultar esta configuración.';
  end if;

  return query
  select
    s.reminders_enabled,
    s.early_clock_in_minutes,
    s.reminder_interval_minutes,
    s.after_close_grace_minutes
  from public.attendance_settings s
  where s.id = 1;
end;
$$;

revoke all on function public.attendance_admin_get_settings() from public;
grant execute on function public.attendance_admin_get_settings() to authenticated;

create or replace function public.attendance_admin_save_settings(
  p_reminders_enabled boolean,
  p_early_clock_in_minutes integer,
  p_reminder_interval_minutes integer,
  p_after_close_grace_minutes integer
)
returns table (
  reminders_enabled boolean,
  early_clock_in_minutes integer,
  reminder_interval_minutes integer,
  after_close_grace_minutes integer
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_admin public.profiles%rowtype;
begin
  select *
  into v_admin
  from public.profiles
  where id = auth.uid();

  if v_admin.id is null
     or v_admin.role <> 'admin'::public.user_role
     or not coalesce(v_admin.is_active, false) then
    raise exception 'Solo un administrador activo puede cambiar esta configuración.';
  end if;

  if coalesce(p_early_clock_in_minutes, -1) not between 0 and 360 then
    raise exception 'La entrada anticipada debe estar entre 0 y 360 minutos.';
  end if;

  if coalesce(p_reminder_interval_minutes, 0) not between 1 and 240 then
    raise exception 'El intervalo de recordatorio debe estar entre 1 y 240 minutos.';
  end if;

  if coalesce(p_after_close_grace_minutes, -1) not between 0 and 720 then
    raise exception 'La gracia posterior al cierre debe estar entre 0 y 720 minutos.';
  end if;

  update public.attendance_settings s
  set
    reminders_enabled = coalesce(p_reminders_enabled, true),
    early_clock_in_minutes = p_early_clock_in_minutes,
    reminder_interval_minutes = p_reminder_interval_minutes,
    after_close_grace_minutes = p_after_close_grace_minutes,
    updated_at = now(),
    updated_by = auth.uid()
  where s.id = 1;

  return query
  select
    s.reminders_enabled,
    s.early_clock_in_minutes,
    s.reminder_interval_minutes,
    s.after_close_grace_minutes
  from public.attendance_settings s
  where s.id = 1;
end;
$$;

revoke all on function public.attendance_admin_save_settings(boolean, integer, integer, integer) from public;
grant execute on function public.attendance_admin_save_settings(boolean, integer, integer, integer) to authenticated;

commit;
