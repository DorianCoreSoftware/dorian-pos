/*
 * ============================================================
 * HOTFIX 9.2
 * - attendance_get_status() devuelve JSONB, no un record.
 * - attendance_sync_notifications() debe leer las claves JSONB.
 * ============================================================
 */

create or replace function public.attendance_sync_notifications()
returns void
language plpgsql
security definer
set search_path=public
as $$
declare
  v_profile public.profiles%rowtype;
  v_status jsonb;
  v_schedule_date date;
  v_open_attendance_id uuid;
  v_timezone text;
  v_local_date date;
  v_late integer := 10;
  v_grace integer := 60;
  v_emp record;
  v_schedule record;
begin
  select p.*
  into v_profile
  from public.profiles p
  where p.id = auth.uid();

  if v_profile.id is null or not coalesce(v_profile.is_active,false) then
    raise exception 'Usuario no disponible.';
  end if;

  v_status := public.attendance_get_status();

  v_schedule_date := nullif(v_status ->> 'schedule_date', '')::date;
  v_open_attendance_id := nullif(v_status ->> 'open_attendance_id', '')::uuid;

  if coalesce((v_status ->> 'needs_clock_in_reminder')::boolean,false) then
    perform public.attendance_enqueue_notification(
      auth.uid(),
      'clock_in_pending',
      'Entrada pendiente',
      'Estás dentro de tu horario y todavía no has registrado tu entrada.',
      'warning',
      auth.uid(),
      null,
      null,
      null,
      v_schedule_date,
      'clock_in_pending:' || coalesce(v_schedule_date::text,'sin-fecha')
    );
  end if;

  if coalesce((v_status ->> 'needs_clock_out_reminder')::boolean,false) then
    perform public.attendance_enqueue_notification(
      auth.uid(),
      'clock_out_pending',
      'Salida pendiente',
      'Tu jornada continúa abierta después del horario esperado. Registra tu salida cuando termines.',
      'warning',
      auth.uid(),
      null,
      null,
      v_open_attendance_id,
      v_schedule_date,
      'clock_out_pending:' || coalesce(v_open_attendance_id::text,'sin-registro')
    );
  end if;

  if v_profile.role::text <> 'admin' then
    return;
  end if;

  select coalesce(bs.timezone,'America/Mexico_City')
  into v_timezone
  from public.business_settings bs
  where bs.id=1;

  v_timezone := coalesce(v_timezone,'America/Mexico_City');
  v_local_date := timezone(v_timezone,now())::date;

  select
    coalesce(s.late_tolerance_minutes,10),
    coalesce(s.after_close_grace_minutes,60)
  into v_late,v_grace
  from public.attendance_settings s
  where s.id=1;

  /* Jornadas abiertas demasiado tiempo. */
  for v_emp in
    select
      ar.id,
      ar.user_id,
      ar.schedule_date,
      ar.scheduled_end,
      trim(concat_ws(' ',p.first_name,p.last_name)) as employee_name
    from public.attendance_records ar
    join public.profiles p on p.id=ar.user_id
    where ar.clock_out is null
      and ar.scheduled_end is not null
      and now() > ar.scheduled_end + make_interval(mins=>v_grace)
      and coalesce(p.is_active,false)=true
  loop
    perform public.attendance_enqueue_notification(
      auth.uid(),
      'admin_open_shift',
      'Jornada abierta fuera de horario',
      coalesce(v_emp.employee_name,'Empleado')||' todavía tiene una jornada abierta.',
      'danger',
      v_emp.user_id,
      null,
      null,
      v_emp.id,
      v_emp.schedule_date,
      'admin_open_shift:'||v_emp.id::text
    );
  end loop;

  /* Empleados cuyo horario inició y todavía no checan. */
  for v_emp in
    select
      p.id as user_id,
      trim(concat_ws(' ',p.first_name,p.last_name)) as employee_name
    from public.profiles p
    where coalesce(p.is_active,false)=true
      and p.id<>auth.uid()
  loop
    select *
    into v_schedule
    from public.attendance_effective_employee_schedule(v_emp.user_id,v_local_date);

    if coalesce(v_schedule.is_working,false)
       and v_schedule.scheduled_start is not null
       and v_schedule.scheduled_end is not null
       and now() > v_schedule.scheduled_start + make_interval(mins=>v_late)
       and now() < v_schedule.scheduled_end
       and not exists(
         select 1
         from public.attendance_records ar
         where ar.user_id=v_emp.user_id
           and ar.schedule_date=v_local_date
       ) then
      perform public.attendance_enqueue_notification(
        auth.uid(),
        'admin_missing_clock_in',
        'Empleado sin entrada',
        coalesce(v_emp.employee_name,'Empleado')||' ya debía iniciar turno y aún no registra entrada.',
        'warning',
        v_emp.user_id,
        null,
        null,
        null,
        v_local_date,
        'admin_missing_clock_in:'||v_emp.user_id::text||':'||v_local_date::text
      );
    end if;
  end loop;
end;
$$;

revoke all on function public.attendance_sync_notifications() from public;
grant execute on function public.attendance_sync_notifications() to authenticated;
