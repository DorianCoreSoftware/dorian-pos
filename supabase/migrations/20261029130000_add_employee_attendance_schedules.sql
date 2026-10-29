begin;

/* ============================================================
 * FASE 2B · HORARIOS INDIVIDUALES E INCIDENCIAS
 * ============================================================ */

alter table public.attendance_settings
  add column if not exists late_tolerance_minutes integer not null default 10
    check (late_tolerance_minutes between 0 and 180),
  add column if not exists early_leave_tolerance_minutes integer not null default 5
    check (early_leave_tolerance_minutes between 0 and 180),
  add column if not exists overtime_tolerance_minutes integer not null default 10
    check (overtime_tolerance_minutes between 0 and 240);

create table if not exists public.attendance_employee_settings (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  use_business_schedule boolean not null default true,
  updated_at timestamptz not null default now(),
  updated_by uuid null references public.profiles(id)
);

create table if not exists public.attendance_employee_schedules (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  day_of_week smallint not null check (day_of_week between 0 and 6),
  is_working boolean not null default false,
  start_time time null,
  end_time time null,
  updated_at timestamptz not null default now(),
  updated_by uuid null references public.profiles(id),
  unique (user_id, day_of_week),
  constraint attendance_employee_schedule_times_check check (
    (is_working = false and start_time is null and end_time is null)
    or
    (is_working = true and start_time is not null and end_time is not null and start_time <> end_time)
  )
);

alter table public.attendance_employee_settings enable row level security;
alter table public.attendance_employee_schedules enable row level security;
revoke all on public.attendance_employee_settings from anon, authenticated;
revoke all on public.attendance_employee_schedules from anon, authenticated;

alter table public.attendance_records
  add column if not exists schedule_date date,
  add column if not exists scheduled_start timestamptz,
  add column if not exists scheduled_end timestamptz,
  add column if not exists schedule_source text,
  add column if not exists late_minutes integer not null default 0,
  add column if not exists early_leave_minutes integer not null default 0,
  add column if not exists overtime_minutes integer not null default 0,
  add column if not exists attendance_result text;

/* Vincula registros previos con su fecha local para evitar falsas faltas históricas. */
update public.attendance_records ar
set schedule_date = timezone(
  coalesce((select bs.timezone from public.business_settings bs where bs.id = 1), 'America/Mexico_City'),
  ar.clock_in
)::date
where ar.schedule_date is null;

/* ============================================================
 * HORARIO EFECTIVO DE UN EMPLEADO PARA UNA FECHA
 * ============================================================ */
create or replace function public.attendance_effective_employee_schedule(
  p_user_id uuid,
  p_date date
)
returns table (
  schedule_date date,
  is_working boolean,
  scheduled_start timestamptz,
  scheduled_end timestamptz,
  schedule_source text,
  business_open_at timestamptz,
  business_close_at timestamptz,
  adjusted_to_business_hours boolean,
  reason text
)
language plpgsql
security definer
set search_path = public
stable
as $$
declare
  v_timezone text;
  v_business record;
  v_use_business boolean;
  v_custom public.attendance_employee_schedules%rowtype;
  v_business_start_local timestamp;
  v_business_end_local timestamp;
  v_employee_start_local timestamp;
  v_employee_end_local timestamp;
  v_effective_start_local timestamp;
  v_effective_end_local timestamp;
begin
  select coalesce(bs.timezone, 'America/Mexico_City')
  into v_timezone
  from public.business_settings bs
  where bs.id = 1;

  v_timezone := coalesce(v_timezone, 'America/Mexico_City');

  select *
  into v_business
  from public.get_effective_business_schedule(p_date);

  if
    not coalesce(v_business.is_open, false)
    or v_business.open_time is null
    or v_business.close_time is null
  then
    return query select
      p_date,
      false,
      null::timestamptz,
      null::timestamptz,
      'business_closed'::text,
      null::timestamptz,
      null::timestamptz,
      false,
      v_business.reason;
    return;
  end if;

  v_business_start_local := p_date + v_business.open_time;
  if v_business.close_time > v_business.open_time then
    v_business_end_local := p_date + v_business.close_time;
  else
    v_business_end_local := (p_date + 1) + v_business.close_time;
  end if;

  select coalesce(aes.use_business_schedule, true)
  into v_use_business
  from public.attendance_employee_settings aes
  where aes.user_id = p_user_id;

  v_use_business := coalesce(v_use_business, true);

  if v_use_business then
    return query select
      p_date,
      true,
      v_business_start_local at time zone v_timezone,
      v_business_end_local at time zone v_timezone,
      'business'::text,
      v_business_start_local at time zone v_timezone,
      v_business_end_local at time zone v_timezone,
      false,
      v_business.reason;
    return;
  end if;

  select *
  into v_custom
  from public.attendance_employee_schedules s
  where s.user_id = p_user_id
    and s.day_of_week = extract(dow from p_date)::smallint;

  if
    v_custom.id is null
    or not coalesce(v_custom.is_working, false)
    or v_custom.start_time is null
    or v_custom.end_time is null
  then
    return query select
      p_date,
      false,
      null::timestamptz,
      null::timestamptz,
      'custom_day_off'::text,
      v_business_start_local at time zone v_timezone,
      v_business_end_local at time zone v_timezone,
      false,
      v_business.reason;
    return;
  end if;

  v_employee_start_local := p_date + v_custom.start_time;
  if v_custom.end_time > v_custom.start_time then
    v_employee_end_local := p_date + v_custom.end_time;
  else
    v_employee_end_local := (p_date + 1) + v_custom.end_time;
  end if;

  /* Una excepción puede recortar el turno del empleado. */
  v_effective_start_local := greatest(v_employee_start_local, v_business_start_local);
  v_effective_end_local := least(v_employee_end_local, v_business_end_local);

  if v_effective_end_local <= v_effective_start_local then
    return query select
      p_date,
      false,
      null::timestamptz,
      null::timestamptz,
      'custom_outside_business_hours'::text,
      v_business_start_local at time zone v_timezone,
      v_business_end_local at time zone v_timezone,
      true,
      v_business.reason;
    return;
  end if;

  return query select
    p_date,
    true,
    v_effective_start_local at time zone v_timezone,
    v_effective_end_local at time zone v_timezone,
    'custom'::text,
    v_business_start_local at time zone v_timezone,
    v_business_end_local at time zone v_timezone,
    (v_effective_start_local <> v_employee_start_local or v_effective_end_local <> v_employee_end_local),
    v_business.reason;
end;
$$;

revoke all on function public.attendance_effective_employee_schedule(uuid, date) from public;
grant execute on function public.attendance_effective_employee_schedule(uuid, date) to authenticated;

/* ============================================================
 * CONTEXTO ACTUAL DEL EMPLEADO
 * Mantiene las mismas claves consumidas por App.tsx en Fase 2A.
 * ============================================================ */
create or replace function public.attendance_employee_schedule_context(
  p_user_id uuid
)
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
  schedule_reason text,
  schedule_source text,
  adjusted_to_business_hours boolean
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
  v_today_schedule record;
  v_prev_schedule record;
  v_schedule_date date;
  v_is_working boolean;
  v_start timestamptz;
  v_end timestamptz;
  v_source text;
  v_adjusted boolean;
  v_reason text;
  v_entry_start timestamptz;
  v_business_info record;
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

  select * into v_today_schedule
  from public.attendance_effective_employee_schedule(p_user_id, v_today);

  select * into v_prev_schedule
  from public.attendance_effective_employee_schedule(p_user_id, v_yesterday);

  if
    coalesce(v_prev_schedule.is_working, false)
    and v_prev_schedule.scheduled_start is not null
    and v_prev_schedule.scheduled_end is not null
    and now() < v_prev_schedule.scheduled_end
    and now() >= (v_prev_schedule.scheduled_start - make_interval(mins => v_early))
  then
    v_schedule_date := v_prev_schedule.schedule_date;
    v_is_working := v_prev_schedule.is_working;
    v_start := v_prev_schedule.scheduled_start;
    v_end := v_prev_schedule.scheduled_end;
    v_source := v_prev_schedule.schedule_source;
    v_adjusted := coalesce(v_prev_schedule.adjusted_to_business_hours, false);
    v_reason := v_prev_schedule.reason;
  else
    v_schedule_date := v_today_schedule.schedule_date;
    v_is_working := v_today_schedule.is_working;
    v_start := v_today_schedule.scheduled_start;
    v_end := v_today_schedule.scheduled_end;
    v_source := v_today_schedule.schedule_source;
    v_adjusted := coalesce(v_today_schedule.adjusted_to_business_hours, false);
    v_reason := v_today_schedule.reason;
  end if;

  select * into v_business_info
  from public.get_effective_business_schedule(v_schedule_date);

  if not coalesce(v_is_working, false) then
    return query select
      v_timezone,
      v_local_now,
      v_schedule_date,
      false,
      null::timestamptz,
      null::timestamptz,
      null::timestamptz,
      false,
      false,
      false,
      false,
      coalesce(v_business_info.is_exception, false),
      coalesce(v_reason, v_business_info.reason),
      coalesce(v_source, 'business_closed'),
      v_adjusted;
    return;
  end if;

  v_entry_start := v_start - make_interval(mins => v_early);

  return query select
    v_timezone,
    v_local_now,
    v_schedule_date,
    true,
    v_start,
    v_end,
    v_entry_start,
    now() >= v_start and now() < v_end,
    now() >= v_entry_start and now() < v_end,
    now() < v_entry_start,
    now() >= v_end,
    coalesce(v_business_info.is_exception, false),
    coalesce(v_reason, v_business_info.reason),
    v_source,
    v_adjusted;
end;
$$;

revoke all on function public.attendance_employee_schedule_context(uuid) from public;
grant execute on function public.attendance_employee_schedule_context(uuid) to authenticated;

/* ============================================================
 * CONFIGURACIÓN ADMIN · EMPLEADOS Y HORARIOS
 * ============================================================ */
create or replace function public.attendance_admin_list_employees()
returns table (
  user_id uuid,
  employee_name text,
  employee_role text,
  is_active boolean,
  use_business_schedule boolean
)
language plpgsql
security definer
set search_path = public
stable
as $$
declare
  v_admin public.profiles%rowtype;
begin
  select * into v_admin from public.profiles where id = auth.uid();
  if v_admin.id is null or v_admin.role <> 'admin'::public.user_role or not coalesce(v_admin.is_active, false) then
    raise exception 'Solo un administrador activo puede consultar horarios de empleados.';
  end if;

  return query
  select
    p.id,
    trim(concat_ws(' ', p.first_name, p.last_name)),
    p.role::text,
    coalesce(p.is_active, false),
    coalesce(aes.use_business_schedule, true)
  from public.profiles p
  left join public.attendance_employee_settings aes on aes.user_id = p.id
  order by coalesce(p.is_active, false) desc, trim(concat_ws(' ', p.first_name, p.last_name));
end;
$$;

revoke all on function public.attendance_admin_list_employees() from public;
grant execute on function public.attendance_admin_list_employees() to authenticated;

create or replace function public.attendance_admin_get_employee_schedule(
  p_user_id uuid
)
returns table (
  day_of_week smallint,
  is_working boolean,
  start_time time,
  end_time time,
  use_business_schedule boolean
)
language plpgsql
security definer
set search_path = public
stable
as $$
declare
  v_admin public.profiles%rowtype;
  v_use_business boolean;
begin
  select * into v_admin from public.profiles where id = auth.uid();
  if v_admin.id is null or v_admin.role <> 'admin'::public.user_role or not coalesce(v_admin.is_active, false) then
    raise exception 'Solo un administrador activo puede consultar horarios de empleados.';
  end if;

  if not exists (select 1 from public.profiles p where p.id = p_user_id) then
    raise exception 'No se encontró el empleado.';
  end if;

  select coalesce(aes.use_business_schedule, true)
  into v_use_business
  from public.attendance_employee_settings aes
  where aes.user_id = p_user_id;
  v_use_business := coalesce(v_use_business, true);

  return query
  select
    d.day::smallint,
    case when v_use_business then coalesce(bh.is_open, false) else coalesce(es.is_working, false) end,
    case when v_use_business then bh.open_time else es.start_time end,
    case when v_use_business then bh.close_time else es.end_time end,
    v_use_business
  from generate_series(0, 6) d(day)
  left join public.business_hours bh on bh.day_of_week = d.day
  left join public.attendance_employee_schedules es
    on es.user_id = p_user_id and es.day_of_week = d.day
  order by d.day;
end;
$$;

revoke all on function public.attendance_admin_get_employee_schedule(uuid) from public;
grant execute on function public.attendance_admin_get_employee_schedule(uuid) to authenticated;

create or replace function public.attendance_admin_save_employee_schedule(
  p_user_id uuid,
  p_use_business_schedule boolean,
  p_schedule jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_admin public.profiles%rowtype;
  v_item jsonb;
  v_day smallint;
  v_working boolean;
  v_start time;
  v_end time;
  v_business public.business_hours%rowtype;
  v_b_start integer;
  v_b_end integer;
  v_e_start_raw integer;
  v_e_end_raw integer;
  v_e_start integer;
  v_e_end integer;
begin
  select * into v_admin from public.profiles where id = auth.uid();
  if v_admin.id is null or v_admin.role <> 'admin'::public.user_role or not coalesce(v_admin.is_active, false) then
    raise exception 'Solo un administrador activo puede modificar horarios de empleados.';
  end if;

  if not exists (select 1 from public.profiles p where p.id = p_user_id) then
    raise exception 'No se encontró el empleado.';
  end if;

  insert into public.attendance_employee_settings(user_id, use_business_schedule, updated_at, updated_by)
  values (p_user_id, coalesce(p_use_business_schedule, true), now(), auth.uid())
  on conflict (user_id) do update set
    use_business_schedule = excluded.use_business_schedule,
    updated_at = now(),
    updated_by = auth.uid();

  if coalesce(p_use_business_schedule, true) then
    return;
  end if;

  if jsonb_typeof(p_schedule) <> 'array' or jsonb_array_length(p_schedule) <> 7 then
    raise exception 'El horario personalizado debe contener exactamente los 7 días.';
  end if;

  delete from public.attendance_employee_schedules where user_id = p_user_id;

  for v_item in select value from jsonb_array_elements(p_schedule)
  loop
    v_day := (v_item ->> 'dayOfWeek')::smallint;
    v_working := coalesce((v_item ->> 'isWorking')::boolean, false);

    if v_day not between 0 and 6 then
      raise exception 'Día de semana inválido.';
    end if;

    if not v_working then
      insert into public.attendance_employee_schedules(
        user_id, day_of_week, is_working, start_time, end_time, updated_by
      ) values (p_user_id, v_day, false, null, null, auth.uid());
      continue;
    end if;

    begin
      v_start := (v_item ->> 'startTime')::time;
      v_end := (v_item ->> 'endTime')::time;
    exception when others then
      raise exception 'Horario inválido para el día %.', v_day;
    end;

    if v_start is null or v_end is null or v_start = v_end then
      raise exception 'La entrada y salida del día % deben ser válidas y distintas.', v_day;
    end if;

    select * into v_business
    from public.business_hours bh
    where bh.day_of_week = v_day;

    if v_business.id is null or not coalesce(v_business.is_open, false) then
      raise exception 'No puedes asignar jornada el día % porque el negocio está cerrado.', v_day;
    end if;

    v_b_start := floor(extract(epoch from v_business.open_time) / 60)::integer;
    v_b_end := floor(extract(epoch from v_business.close_time) / 60)::integer;
    if v_b_end <= v_b_start then v_b_end := v_b_end + 1440; end if;

    v_e_start_raw := floor(extract(epoch from v_start) / 60)::integer;
    v_e_end_raw := floor(extract(epoch from v_end) / 60)::integer;
    v_e_start := v_e_start_raw;
    v_e_end := v_e_end_raw;

    if v_b_end > 1440 and v_e_start < v_b_start then
      v_e_start := v_e_start + 1440;
    end if;

    if v_e_end_raw <= v_e_start_raw then
      v_e_end := v_e_end + 1440;
    elsif v_b_end > 1440 and v_e_end < v_b_start then
      v_e_end := v_e_end + 1440;
    end if;

    if v_e_start < v_b_start or v_e_end > v_b_end or v_e_end <= v_e_start then
      raise exception 'El horario del día % debe quedar dentro del horario del negocio.', v_day;
    end if;

    insert into public.attendance_employee_schedules(
      user_id, day_of_week, is_working, start_time, end_time, updated_by
    ) values (p_user_id, v_day, true, v_start, v_end, auth.uid());
  end loop;
end;
$$;

revoke all on function public.attendance_admin_save_employee_schedule(uuid, boolean, jsonb) from public;
grant execute on function public.attendance_admin_save_employee_schedule(uuid, boolean, jsonb) to authenticated;

/* ============================================================
 * ESTADO GLOBAL BASADO EN HORARIO DEL EMPLEADO
 * ============================================================ */
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
begin
  select * into v_profile from public.profiles where id = auth.uid();
  if v_profile.id is null then raise exception 'No se encontró el perfil del usuario.'; end if;
  if not coalesce(v_profile.is_active, false) then raise exception 'Tu usuario está inactivo.'; end if;

  select * into v_settings from public.attendance_settings where id = 1;
  select * into v_open
  from public.attendance_records
  where user_id = auth.uid() and clock_out is null
  order by clock_in desc limit 1;

  select * into v_schedule
  from public.attendance_employee_schedule_context(auth.uid());

  v_needs_clock_in :=
    coalesce(v_settings.reminders_enabled, true)
    and v_open.id is null
    and coalesce(v_schedule.schedule_is_open, false)
    and coalesce(v_schedule.within_clock_in_window, false);

  v_needs_clock_out :=
    coalesce(v_settings.reminders_enabled, true)
    and v_open.id is not null
    and v_open.scheduled_end is not null
    and now() >= (
      v_open.scheduled_end + make_interval(mins => coalesce(v_settings.after_close_grace_minutes, 60))
    );

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
    'schedule_source', v_schedule.schedule_source,
    'adjusted_to_business_hours', coalesce(v_schedule.adjusted_to_business_hours, false),
    'needs_clock_in_reminder', v_needs_clock_in,
    'needs_clock_out_reminder', v_needs_clock_out,
    'reminders_enabled', coalesce(v_settings.reminders_enabled, true),
    'early_clock_in_minutes', coalesce(v_settings.early_clock_in_minutes, 60),
    'reminder_interval_minutes', coalesce(v_settings.reminder_interval_minutes, 15),
    'after_close_grace_minutes', coalesce(v_settings.after_close_grace_minutes, 60),
    'late_tolerance_minutes', coalesce(v_settings.late_tolerance_minutes, 10),
    'early_leave_tolerance_minutes', coalesce(v_settings.early_leave_tolerance_minutes, 5),
    'overtime_tolerance_minutes', coalesce(v_settings.overtime_tolerance_minutes, 10)
  );
end;
$$;

revoke all on function public.attendance_get_status() from public;
grant execute on function public.attendance_get_status() to authenticated;

/* ============================================================
 * ENTRADA/SALIDA CON SNAPSHOT Y MÉTRICAS
 * ============================================================ */
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
  v_settings public.attendance_settings%rowtype;
  v_late integer;
begin
  select * into v_profile from public.profiles where id = auth.uid();
  if v_profile.id is null then raise exception 'No se encontró el perfil del usuario.'; end if;
  if not coalesce(v_profile.is_active, false) then raise exception 'Tu usuario está inactivo.'; end if;

  if exists (select 1 from public.attendance_records where user_id = auth.uid() and clock_out is null) then
    raise exception 'Ya tienes una asistencia abierta.';
  end if;

  select * into v_schedule from public.attendance_employee_schedule_context(auth.uid());
  select * into v_settings from public.attendance_settings where id = 1;

  if not coalesce(v_schedule.schedule_is_open, false) then
    raise exception 'No tienes una jornada programada disponible en este momento.';
  end if;
  if coalesce(v_schedule.before_clock_in_window, false) then
    raise exception 'Aún es demasiado temprano. Puedes registrar entrada desde las %.',
      to_char(v_schedule.entry_window_start at time zone v_schedule.timezone, 'HH24:MI');
  end if;
  if coalesce(v_schedule.after_business_close, false) or not coalesce(v_schedule.within_clock_in_window, false) then
    raise exception 'Tu horario de entrada para este turno ya terminó. Solicita una corrección a un administrador si corresponde.';
  end if;

  v_late := greatest(
    0,
    floor(extract(epoch from (now() - (v_schedule.schedule_open_at + make_interval(mins => coalesce(v_settings.late_tolerance_minutes, 10))))) / 60)::integer
  );

  insert into public.attendance_records(
    user_id, clock_in, schedule_date, scheduled_start, scheduled_end,
    schedule_source, late_minutes, early_leave_minutes, overtime_minutes, attendance_result
  ) values (
    auth.uid(), now(), v_schedule.schedule_date, v_schedule.schedule_open_at, v_schedule.schedule_close_at,
    v_schedule.schedule_source, v_late, 0, 0, 'open'
  ) returning * into v_record;

  return v_record;
end;
$$;

grant execute on function public.attendance_clock_in() to authenticated;

create or replace function public.attendance_clock_out()
returns public.attendance_records
language plpgsql
security definer
set search_path = public
as $$
declare
  v_profile public.profiles%rowtype;
  v_record public.attendance_records%rowtype;
  v_settings public.attendance_settings%rowtype;
  v_early integer := 0;
  v_overtime integer := 0;
  v_result text;
begin
  select * into v_profile from public.profiles where id = auth.uid();
  if v_profile.id is null then raise exception 'No se encontró el perfil del usuario.'; end if;
  if not coalesce(v_profile.is_active, false) then raise exception 'Tu usuario está inactivo.'; end if;

  select * into v_record
  from public.attendance_records
  where user_id = auth.uid() and clock_out is null
  order by clock_in desc limit 1 for update;

  if v_record.id is null then raise exception 'No tienes una asistencia abierta.'; end if;
  select * into v_settings from public.attendance_settings where id = 1;

  if v_record.scheduled_end is not null then
    v_early := greatest(0,
      floor(extract(epoch from ((v_record.scheduled_end - make_interval(mins => coalesce(v_settings.early_leave_tolerance_minutes, 5))) - now())) / 60)::integer
    );
    v_overtime := greatest(0,
      floor(extract(epoch from (now() - (v_record.scheduled_end + make_interval(mins => coalesce(v_settings.overtime_tolerance_minutes, 10))))) / 60)::integer
    );
  end if;

  v_result := case
    when coalesce(v_record.late_minutes, 0) > 0 and v_early > 0 then 'late_and_early_leave'
    when coalesce(v_record.late_minutes, 0) > 0 then 'late'
    when v_early > 0 then 'early_leave'
    when v_overtime > 0 then 'overtime'
    else 'on_time'
  end;

  update public.attendance_records
  set clock_out = now(), early_leave_minutes = v_early, overtime_minutes = v_overtime, attendance_result = v_result
  where id = v_record.id
  returning * into v_record;

  return v_record;
end;
$$;

grant execute on function public.attendance_clock_out() to authenticated;

/* ============================================================
 * SETTINGS ADMIN AMPLIADOS
 * ============================================================ */
drop function if exists public.attendance_admin_get_settings();
create function public.attendance_admin_get_settings()
returns table (
  reminders_enabled boolean,
  early_clock_in_minutes integer,
  reminder_interval_minutes integer,
  after_close_grace_minutes integer,
  late_tolerance_minutes integer,
  early_leave_tolerance_minutes integer,
  overtime_tolerance_minutes integer
)
language plpgsql
security definer
set search_path = public
stable
as $$
declare
  v_admin public.profiles%rowtype;
begin
  select * into v_admin from public.profiles where id = auth.uid();
  if v_admin.id is null or v_admin.role <> 'admin'::public.user_role or not coalesce(v_admin.is_active, false) then
    raise exception 'Solo un administrador activo puede consultar esta configuración.';
  end if;
  return query select
    s.reminders_enabled, s.early_clock_in_minutes, s.reminder_interval_minutes,
    s.after_close_grace_minutes, s.late_tolerance_minutes,
    s.early_leave_tolerance_minutes, s.overtime_tolerance_minutes
  from public.attendance_settings s where s.id = 1;
end;
$$;
revoke all on function public.attendance_admin_get_settings() from public;
grant execute on function public.attendance_admin_get_settings() to authenticated;

drop function if exists public.attendance_admin_save_settings(boolean, integer, integer, integer);
create or replace function public.attendance_admin_save_settings(
  p_reminders_enabled boolean,
  p_early_clock_in_minutes integer,
  p_reminder_interval_minutes integer,
  p_after_close_grace_minutes integer,
  p_late_tolerance_minutes integer,
  p_early_leave_tolerance_minutes integer,
  p_overtime_tolerance_minutes integer
)
returns table (
  reminders_enabled boolean,
  early_clock_in_minutes integer,
  reminder_interval_minutes integer,
  after_close_grace_minutes integer,
  late_tolerance_minutes integer,
  early_leave_tolerance_minutes integer,
  overtime_tolerance_minutes integer
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_admin public.profiles%rowtype;
begin
  select * into v_admin from public.profiles where id = auth.uid();
  if v_admin.id is null or v_admin.role <> 'admin'::public.user_role or not coalesce(v_admin.is_active, false) then
    raise exception 'Solo un administrador activo puede cambiar esta configuración.';
  end if;

  if coalesce(p_early_clock_in_minutes, -1) not between 0 and 360 then raise exception 'La entrada anticipada debe estar entre 0 y 360 minutos.'; end if;
  if coalesce(p_reminder_interval_minutes, 0) not between 1 and 240 then raise exception 'El intervalo de recordatorio debe estar entre 1 y 240 minutos.'; end if;
  if coalesce(p_after_close_grace_minutes, -1) not between 0 and 720 then raise exception 'La gracia posterior al cierre debe estar entre 0 y 720 minutos.'; end if;
  if coalesce(p_late_tolerance_minutes, -1) not between 0 and 180 then raise exception 'La tolerancia de retardo debe estar entre 0 y 180 minutos.'; end if;
  if coalesce(p_early_leave_tolerance_minutes, -1) not between 0 and 180 then raise exception 'La tolerancia de salida anticipada debe estar entre 0 y 180 minutos.'; end if;
  if coalesce(p_overtime_tolerance_minutes, -1) not between 0 and 240 then raise exception 'La tolerancia de horas extra debe estar entre 0 y 240 minutos.'; end if;

  update public.attendance_settings s set
    reminders_enabled = coalesce(p_reminders_enabled, true),
    early_clock_in_minutes = p_early_clock_in_minutes,
    reminder_interval_minutes = p_reminder_interval_minutes,
    after_close_grace_minutes = p_after_close_grace_minutes,
    late_tolerance_minutes = p_late_tolerance_minutes,
    early_leave_tolerance_minutes = p_early_leave_tolerance_minutes,
    overtime_tolerance_minutes = p_overtime_tolerance_minutes,
    updated_at = now(), updated_by = auth.uid()
  where s.id = 1;

  return query select
    s.reminders_enabled, s.early_clock_in_minutes, s.reminder_interval_minutes,
    s.after_close_grace_minutes, s.late_tolerance_minutes,
    s.early_leave_tolerance_minutes, s.overtime_tolerance_minutes
  from public.attendance_settings s where s.id = 1;
end;
$$;
revoke all on function public.attendance_admin_save_settings(boolean, integer, integer, integer, integer, integer, integer) from public;
grant execute on function public.attendance_admin_save_settings(boolean, integer, integer, integer, integer, integer, integer) to authenticated;

/* ============================================================
 * HISTORIAL ADMIN CON MÉTRICAS
 * ============================================================ */
drop function if exists public.attendance_admin_list(integer);
create function public.attendance_admin_list(p_limit integer default 250)
returns table (
  id uuid,
  user_id uuid,
  clock_in timestamptz,
  clock_out timestamptz,
  created_at timestamptz,
  updated_at timestamptz,
  employee_name text,
  employee_role text,
  schedule_date date,
  scheduled_start timestamptz,
  scheduled_end timestamptz,
  schedule_source text,
  late_minutes integer,
  early_leave_minutes integer,
  overtime_minutes integer,
  attendance_result text
)
language plpgsql
security definer
set search_path = public
as $$
declare v_admin public.profiles%rowtype;
begin
  select * into v_admin from public.profiles where id = auth.uid();
  if v_admin.id is null or v_admin.role <> 'admin'::public.user_role or not coalesce(v_admin.is_active, false) then
    raise exception 'Solo un administrador activo puede consultar este historial.';
  end if;

  return query select
    ar.id, ar.user_id, ar.clock_in, ar.clock_out, ar.created_at, ar.updated_at,
    trim(concat_ws(' ', p.first_name, p.last_name)), p.role::text,
    ar.schedule_date, ar.scheduled_start, ar.scheduled_end, ar.schedule_source,
    ar.late_minutes, ar.early_leave_minutes, ar.overtime_minutes, ar.attendance_result
  from public.attendance_records ar
  join public.profiles p on p.id = ar.user_id
  order by ar.clock_in desc
  limit greatest(1, least(coalesce(p_limit, 250), 1000));
end;
$$;
grant execute on function public.attendance_admin_list(integer) to authenticated;

/* Correcciones: recalcula métricas usando el snapshot existente. */
drop function if exists public.attendance_admin_correct(uuid, timestamptz, timestamptz, text);
create function public.attendance_admin_correct(
  p_attendance_id uuid,
  p_clock_in timestamptz,
  p_clock_out timestamptz,
  p_reason text
)
returns table (
  id uuid,
  user_id uuid,
  clock_in timestamptz,
  clock_out timestamptz,
  created_at timestamptz,
  updated_at timestamptz,
  employee_name text,
  employee_role text,
  schedule_date date,
  scheduled_start timestamptz,
  scheduled_end timestamptz,
  schedule_source text,
  late_minutes integer,
  early_leave_minutes integer,
  overtime_minutes integer,
  attendance_result text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_admin public.profiles%rowtype;
  v_existing public.attendance_records%rowtype;
  v_updated public.attendance_records%rowtype;
  v_settings public.attendance_settings%rowtype;
  v_late integer := 0;
  v_early integer := 0;
  v_overtime integer := 0;
  v_result text;
begin
  select * into v_admin from public.profiles where id = auth.uid();
  if v_admin.id is null or v_admin.role <> 'admin'::public.user_role or not coalesce(v_admin.is_active, false) then
    raise exception 'Solo un administrador activo puede corregir asistencias.';
  end if;
  if p_clock_in is null then raise exception 'La hora de entrada es obligatoria.'; end if;
  if p_clock_out is not null and p_clock_out <= p_clock_in then raise exception 'La salida debe ser posterior a la entrada.'; end if;
  if length(trim(coalesce(p_reason, ''))) = 0 then raise exception 'El motivo de la corrección es obligatorio.'; end if;

  select * into v_existing from public.attendance_records where attendance_records.id = p_attendance_id for update;
  if v_existing.id is null then raise exception 'No se encontró la asistencia.'; end if;

  if exists (
    select 1 from public.attendance_records other
    where other.user_id = v_existing.user_id and other.id <> v_existing.id
      and tstzrange(other.clock_in, coalesce(other.clock_out, 'infinity'::timestamptz), '[)')
        && tstzrange(p_clock_in, coalesce(p_clock_out, 'infinity'::timestamptz), '[)')
  ) then raise exception 'La corrección se traslapa con otra asistencia del empleado.'; end if;

  select * into v_settings from public.attendance_settings where id = 1;

  if v_existing.scheduled_start is not null then
    v_late := greatest(0,
      floor(extract(epoch from (p_clock_in - (v_existing.scheduled_start + make_interval(mins => coalesce(v_settings.late_tolerance_minutes, 10))))) / 60)::integer
    );
  end if;

  if p_clock_out is not null and v_existing.scheduled_end is not null then
    v_early := greatest(0,
      floor(extract(epoch from ((v_existing.scheduled_end - make_interval(mins => coalesce(v_settings.early_leave_tolerance_minutes, 5))) - p_clock_out)) / 60)::integer
    );
    v_overtime := greatest(0,
      floor(extract(epoch from (p_clock_out - (v_existing.scheduled_end + make_interval(mins => coalesce(v_settings.overtime_tolerance_minutes, 10))))) / 60)::integer
    );
  end if;

  v_result := case
    when p_clock_out is null then 'open'
    when v_late > 0 and v_early > 0 then 'late_and_early_leave'
    when v_late > 0 then 'late'
    when v_early > 0 then 'early_leave'
    when v_overtime > 0 then 'overtime'
    else 'on_time'
  end;

  update public.attendance_records set
    clock_in = p_clock_in, clock_out = p_clock_out,
    late_minutes = v_late, early_leave_minutes = v_early,
    overtime_minutes = v_overtime, attendance_result = v_result
  where attendance_records.id = p_attendance_id returning * into v_updated;

  insert into public.attendance_corrections(
    attendance_id, corrected_by, reason, previous_clock_in, previous_clock_out, new_clock_in, new_clock_out
  ) values (
    v_existing.id, auth.uid(), trim(p_reason), v_existing.clock_in, v_existing.clock_out, v_updated.clock_in, v_updated.clock_out
  );

  return query select
    v_updated.id, v_updated.user_id, v_updated.clock_in, v_updated.clock_out,
    v_updated.created_at, v_updated.updated_at,
    trim(concat_ws(' ', p.first_name, p.last_name)), p.role::text,
    v_updated.schedule_date, v_updated.scheduled_start, v_updated.scheduled_end,
    v_updated.schedule_source, v_updated.late_minutes, v_updated.early_leave_minutes,
    v_updated.overtime_minutes, v_updated.attendance_result
  from public.profiles p where p.id = v_updated.user_id;
end;
$$;
grant execute on function public.attendance_admin_correct(uuid, timestamptz, timestamptz, text) to authenticated;

/* ============================================================
 * RESUMEN DIARIO / FALTAS
 * ============================================================ */
create or replace function public.attendance_admin_daily_summary(
  p_start_date date,
  p_end_date date
)
returns table (
  work_date date,
  user_id uuid,
  employee_name text,
  employee_role text,
  expected_start timestamptz,
  expected_end timestamptz,
  clock_in timestamptz,
  clock_out timestamptz,
  late_minutes integer,
  early_leave_minutes integer,
  overtime_minutes integer,
  day_status text
)
language plpgsql
security definer
set search_path = public
stable
as $$
declare
  v_admin public.profiles%rowtype;
  v_timezone text;
  v_local_today date;
  v_settings public.attendance_settings%rowtype;
begin
  select * into v_admin from public.profiles where id = auth.uid();
  if v_admin.id is null or v_admin.role <> 'admin'::public.user_role or not coalesce(v_admin.is_active, false) then
    raise exception 'Solo un administrador activo puede consultar incidencias.';
  end if;

  if p_start_date is null or p_end_date is null or p_end_date < p_start_date then
    raise exception 'Rango de fechas inválido.';
  end if;
  if (p_end_date - p_start_date) > 31 then raise exception 'El rango máximo es de 31 días.'; end if;

  select coalesce(bs.timezone, 'America/Mexico_City') into v_timezone from public.business_settings bs where bs.id = 1;
  v_timezone := coalesce(v_timezone, 'America/Mexico_City');
  v_local_today := timezone(v_timezone, now())::date;
  select * into v_settings from public.attendance_settings where id = 1;

  return query
  select
    d.work_date,
    p.id,
    trim(concat_ws(' ', p.first_name, p.last_name)),
    p.role::text,
    es.scheduled_start,
    es.scheduled_end,
    ar.clock_in,
    ar.clock_out,
    coalesce(ar.late_minutes, 0),
    coalesce(ar.early_leave_minutes, 0),
    coalesce(ar.overtime_minutes, 0),
    case
      when not coalesce(es.is_working, false) then 'off'
      when ar.id is not null and ar.clock_out is null then 'working'
      when ar.id is not null then 'completed'
      when d.work_date < v_local_today then 'absent'
      when d.work_date = v_local_today and es.scheduled_end is not null
        and now() >= (es.scheduled_end + make_interval(mins => coalesce(v_settings.after_close_grace_minutes, 60))) then 'absent'
      when d.work_date = v_local_today and es.scheduled_start is not null and now() >= es.scheduled_start then 'pending_entry'
      else 'scheduled'
    end
  from generate_series(p_start_date, p_end_date, interval '1 day') g(day_value)
  cross join lateral (select g.day_value::date as work_date) d
  cross join public.profiles p
  cross join lateral public.attendance_effective_employee_schedule(p.id, d.work_date) es
  left join lateral (
    select r.* from public.attendance_records r
    where r.user_id = p.id and r.schedule_date = d.work_date
    order by r.clock_in asc limit 1
  ) ar on true
  where coalesce(p.is_active, false)
  order by d.work_date desc, trim(concat_ws(' ', p.first_name, p.last_name));
end;
$$;

revoke all on function public.attendance_admin_daily_summary(date, date) from public;
grant execute on function public.attendance_admin_daily_summary(date, date) to authenticated;

commit;
