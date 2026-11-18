begin;

/* ============================================================
 * ASISTENCIA · RECORDATORIO PREVIO DE TURNO + HISTORIAL FILTRABLE
 * ============================================================ */

create extension if not exists pg_cron;
create extension if not exists pg_net;

/* ------------------------------------------------------------
 * 1. Configuración global: minutos antes del turno
 * ------------------------------------------------------------ */
alter table public.attendance_settings
  add column if not exists shift_start_reminder_minutes integer not null default 10
    check (shift_start_reminder_minutes between 1 and 240);

update public.attendance_settings
set shift_start_reminder_minutes = 10
where id = 1
  and shift_start_reminder_minutes is null;

/* ------------------------------------------------------------
 * 2. Preferencia individual del empleado
 * ------------------------------------------------------------ */
alter table public.attendance_notification_preferences
  add column if not exists shift_start_reminders boolean not null default true;

/* ------------------------------------------------------------
 * 3. RPC de configuración admin ampliados
 * ------------------------------------------------------------ */
drop function if exists public.attendance_admin_get_settings();
create function public.attendance_admin_get_settings()
returns table (
  reminders_enabled boolean,
  shift_start_reminder_minutes integer,
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
  select * into v_admin
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
    s.shift_start_reminder_minutes,
    s.early_clock_in_minutes,
    s.reminder_interval_minutes,
    s.after_close_grace_minutes,
    s.late_tolerance_minutes,
    s.early_leave_tolerance_minutes,
    s.overtime_tolerance_minutes
  from public.attendance_settings s
  where s.id = 1;
end;
$$;

revoke all on function public.attendance_admin_get_settings() from public;
grant execute on function public.attendance_admin_get_settings() to authenticated;

drop function if exists public.attendance_admin_save_settings(
  boolean, integer, integer, integer, integer, integer, integer
);

create or replace function public.attendance_admin_save_settings(
  p_reminders_enabled boolean,
  p_shift_start_reminder_minutes integer,
  p_early_clock_in_minutes integer,
  p_reminder_interval_minutes integer,
  p_after_close_grace_minutes integer,
  p_late_tolerance_minutes integer,
  p_early_leave_tolerance_minutes integer,
  p_overtime_tolerance_minutes integer
)
returns table (
  reminders_enabled boolean,
  shift_start_reminder_minutes integer,
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
  select * into v_admin
  from public.profiles
  where id = auth.uid();

  if v_admin.id is null
     or v_admin.role <> 'admin'::public.user_role
     or not coalesce(v_admin.is_active, false) then
    raise exception 'Solo un administrador activo puede cambiar esta configuración.';
  end if;

  if coalesce(p_shift_start_reminder_minutes, 0) not between 1 and 240 then
    raise exception 'El aviso previo al turno debe estar entre 1 y 240 minutos.';
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
  if coalesce(p_late_tolerance_minutes, -1) not between 0 and 180 then
    raise exception 'La tolerancia de retardo debe estar entre 0 y 180 minutos.';
  end if;
  if coalesce(p_early_leave_tolerance_minutes, -1) not between 0 and 180 then
    raise exception 'La tolerancia de salida anticipada debe estar entre 0 y 180 minutos.';
  end if;
  if coalesce(p_overtime_tolerance_minutes, -1) not between 0 and 240 then
    raise exception 'La tolerancia de horas extra debe estar entre 0 y 240 minutos.';
  end if;

  update public.attendance_settings s
  set
    reminders_enabled = coalesce(p_reminders_enabled, true),
    shift_start_reminder_minutes = p_shift_start_reminder_minutes,
    early_clock_in_minutes = p_early_clock_in_minutes,
    reminder_interval_minutes = p_reminder_interval_minutes,
    after_close_grace_minutes = p_after_close_grace_minutes,
    late_tolerance_minutes = p_late_tolerance_minutes,
    early_leave_tolerance_minutes = p_early_leave_tolerance_minutes,
    overtime_tolerance_minutes = p_overtime_tolerance_minutes,
    updated_at = now(),
    updated_by = auth.uid()
  where s.id = 1;

  return query
  select
    s.reminders_enabled,
    s.shift_start_reminder_minutes,
    s.early_clock_in_minutes,
    s.reminder_interval_minutes,
    s.after_close_grace_minutes,
    s.late_tolerance_minutes,
    s.early_leave_tolerance_minutes,
    s.overtime_tolerance_minutes
  from public.attendance_settings s
  where s.id = 1;
end;
$$;

revoke all on function public.attendance_admin_save_settings(
  boolean, integer, integer, integer, integer, integer, integer, integer
) from public;
grant execute on function public.attendance_admin_save_settings(
  boolean, integer, integer, integer, integer, integer, integer, integer
) to authenticated;

/* ------------------------------------------------------------
 * 4. Preferencias de push ampliadas
 * ------------------------------------------------------------ */
drop function if exists public.attendance_get_notification_preferences();
create or replace function public.attendance_get_notification_preferences()
returns table (
  clock_reminders boolean,
  shift_start_reminders boolean,
  request_updates boolean,
  payroll_updates boolean,
  shift_updates boolean
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user public.profiles%rowtype;
begin
  select * into v_user
  from public.profiles p
  where p.id = auth.uid();

  if v_user.id is null or not coalesce(v_user.is_active, false) then
    raise exception 'Usuario no disponible.';
  end if;

  return query
  select
    coalesce(pref.clock_reminders, true),
    coalesce(pref.shift_start_reminders, true),
    coalesce(pref.request_updates, true),
    coalesce(pref.payroll_updates, true),
    coalesce(pref.shift_updates, true)
  from (select 1) seed
  left join public.attendance_notification_preferences pref
    on pref.user_id = auth.uid();
end;
$$;

revoke all on function public.attendance_get_notification_preferences() from public;
grant execute on function public.attendance_get_notification_preferences() to authenticated;

drop function if exists public.attendance_save_notification_preferences(
  boolean, boolean, boolean, boolean
);
create or replace function public.attendance_save_notification_preferences(
  p_clock_reminders boolean,
  p_shift_start_reminders boolean,
  p_request_updates boolean,
  p_payroll_updates boolean,
  p_shift_updates boolean
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user public.profiles%rowtype;
begin
  select * into v_user
  from public.profiles p
  where p.id = auth.uid();

  if v_user.id is null or not coalesce(v_user.is_active, false) then
    raise exception 'Usuario no disponible.';
  end if;

  insert into public.attendance_notification_preferences (
    user_id,
    clock_reminders,
    shift_start_reminders,
    request_updates,
    payroll_updates,
    shift_updates,
    updated_at,
    updated_by
  )
  values (
    auth.uid(),
    coalesce(p_clock_reminders, true),
    coalesce(p_shift_start_reminders, true),
    coalesce(p_request_updates, true),
    coalesce(p_payroll_updates, true),
    coalesce(p_shift_updates, true),
    now(),
    auth.uid()
  )
  on conflict (user_id) do update
  set
    clock_reminders = excluded.clock_reminders,
    shift_start_reminders = excluded.shift_start_reminders,
    request_updates = excluded.request_updates,
    payroll_updates = excluded.payroll_updates,
    shift_updates = excluded.shift_updates,
    updated_at = now(),
    updated_by = auth.uid();
end;
$$;

revoke all on function public.attendance_save_notification_preferences(
  boolean, boolean, boolean, boolean, boolean
) from public;
grant execute on function public.attendance_save_notification_preferences(
  boolean, boolean, boolean, boolean, boolean
) to authenticated;

/* ------------------------------------------------------------
 * 5. Historial: nombre del usuario relacionado para filtros
 * ------------------------------------------------------------ */
drop function if exists public.attendance_my_notifications(integer);
create or replace function public.attendance_my_notifications(p_limit integer default 80)
returns table(
  id uuid,
  notification_type text,
  title text,
  message text,
  severity text,
  related_user_id uuid,
  related_user_name text,
  request_id uuid,
  payroll_item_id uuid,
  attendance_record_id uuid,
  work_date date,
  read_at timestamptz,
  pushed_at timestamptz,
  created_at timestamptz
)
language sql
security definer
set search_path = public
stable
as $$
  select
    n.id,
    n.notification_type,
    n.title,
    n.message,
    n.severity,
    n.related_user_id,
    nullif(trim(concat_ws(' ', p.first_name, p.last_name)), ''),
    n.request_id,
    n.payroll_item_id,
    n.attendance_record_id,
    n.work_date,
    n.read_at,
    n.pushed_at,
    n.created_at
  from public.attendance_notifications n
  left join public.profiles p
    on p.id = n.related_user_id
  where n.recipient_user_id = auth.uid()
  order by n.created_at desc
  limit least(greatest(coalesce(p_limit, 80), 1), 200);
$$;

revoke all on function public.attendance_my_notifications(integer) from public;
grant execute on function public.attendance_my_notifications(integer) to authenticated;

/* ------------------------------------------------------------
 * 6. Generar recordatorio único antes del turno
 * ------------------------------------------------------------ */
create or replace function public.attendance_generate_shift_start_reminders()
returns integer
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_settings public.attendance_settings%rowtype;
  v_timezone text;
  v_local_date date;
  v_employee record;
  v_work_date date;
  v_schedule record;
  v_notification_id uuid;
  v_created integer := 0;
  v_time_label text;
begin
  select * into v_settings
  from public.attendance_settings
  where id = 1;

  if not coalesce(v_settings.reminders_enabled, true) then
    return 0;
  end if;

  select coalesce(bs.timezone, 'America/Mexico_City')
  into v_timezone
  from public.business_settings bs
  where bs.id = 1;

  v_timezone := coalesce(v_timezone, 'America/Mexico_City');
  v_local_date := timezone(v_timezone, now())::date;

  for v_employee in
    select p.id
    from public.profiles p
    where coalesce(p.is_active, false) = true
  loop
    foreach v_work_date in array array[v_local_date, v_local_date + 1]
    loop
      select * into v_schedule
      from public.attendance_effective_employee_schedule(
        v_employee.id,
        v_work_date
      );

      if coalesce(v_schedule.is_working, false)
         and v_schedule.scheduled_start is not null
         and v_schedule.scheduled_start > now()
         and v_schedule.scheduled_start <=
           now() + make_interval(
             mins => coalesce(v_settings.shift_start_reminder_minutes, 10)
           )
         and not exists (
           select 1
           from public.attendance_records ar
           where ar.user_id = v_employee.id
             and ar.schedule_date = v_work_date
             and ar.clock_in is not null
         )
      then
        v_time_label := to_char(
          timezone(v_timezone, v_schedule.scheduled_start),
          'HH12:MI AM'
        );

        v_notification_id := public.attendance_enqueue_notification(
          v_employee.id,
          'shift_start_soon',
          'Tu turno está por comenzar',
          'Tu turno inicia a las ' || v_time_label ||
            '. Recuerda registrar tu entrada al comenzar labores.',
          'info',
          v_employee.id,
          null,
          null,
          null,
          v_work_date,
          'shift_start_soon:' || v_employee.id::text || ':' ||
            v_work_date::text || ':' || v_schedule.scheduled_start::text
        );

        if v_notification_id is not null then
          v_created := v_created + 1;
        end if;
      end if;
    end loop;
  end loop;

  return v_created;
end;
$$;

revoke all on function public.attendance_generate_shift_start_reminders() from public;

/* ------------------------------------------------------------
 * 7. Despachar recordatorios pendientes a Edge Function
 * ------------------------------------------------------------ */
create or replace function public.attendance_dispatch_shift_start_reminders()
returns integer
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_project_url text;
  v_notification record;
  v_dispatched integer := 0;
begin
  select decrypted_secret
  into v_project_url
  from vault.decrypted_secrets
  where name = 'project_url'
  limit 1;

  if v_project_url is null or btrim(v_project_url) = '' then
    raise warning 'Vault secret project_url is not configured. Attendance shift reminder push skipped.';
    return 0;
  end if;

  for v_notification in
    select n.id
    from public.attendance_notifications n
    where n.notification_type = 'shift_start_soon'
      and n.pushed_at is null
      and n.push_skipped_at is null
      and n.created_at >= now() - interval '30 minutes'
    order by n.created_at
    limit 50
  loop
    perform net.http_post(
      url := rtrim(v_project_url, '/') || '/functions/v1/attendance-shift-reminder-push',
      headers := jsonb_build_object('Content-Type', 'application/json'),
      body := jsonb_build_object('notificationId', v_notification.id),
      timeout_milliseconds := 5000
    );

    v_dispatched := v_dispatched + 1;
  end loop;

  return v_dispatched;
end;
$$;

revoke all on function public.attendance_dispatch_shift_start_reminders() from public;

create or replace function public.process_attendance_shift_start_reminders()
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_generated integer;
  v_dispatched integer;
begin
  v_generated := public.attendance_generate_shift_start_reminders();
  v_dispatched := public.attendance_dispatch_shift_start_reminders();

  return jsonb_build_object(
    'generated', v_generated,
    'dispatched', v_dispatched
  );
end;
$$;

revoke all on function public.process_attendance_shift_start_reminders() from public;

/* Prueba manual sólo para admin. */
create or replace function public.process_attendance_shift_start_reminders_admin()
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  perform public.attendance_assert_active_admin();
  return public.process_attendance_shift_start_reminders();
end;
$$;

revoke all on function public.process_attendance_shift_start_reminders_admin() from public;
grant execute on function public.process_attendance_shift_start_reminders_admin() to authenticated;

/* ------------------------------------------------------------
 * 8. Cron cada minuto
 * ------------------------------------------------------------ */
do $$
begin
  perform cron.unschedule('attendance-shift-start-reminders-1m');
exception
  when others then null;
end;
$$;

select cron.schedule(
  'attendance-shift-start-reminders-1m',
  '* * * * *',
  $cron$select public.process_attendance_shift_start_reminders();$cron$
);

commit;
