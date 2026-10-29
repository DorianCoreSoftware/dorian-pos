begin;

/* ============================================================
 * FASE 4 · REPORTES DE ASISTENCIA
 * ============================================================
 * - Detalle diario por empleado / periodo
 * - Resumen acumulado por empleado
 * - Máximo 366 días por consulta
 */

create or replace function public.attendance_admin_report_days(
  p_start_date date,
  p_end_date date,
  p_user_id uuid default null
)
returns table (
  work_date date,
  user_id uuid,
  employee_name text,
  employee_role text,
  is_working boolean,
  expected_start timestamptz,
  expected_end timestamptz,
  clock_in timestamptz,
  clock_out timestamptz,
  worked_minutes integer,
  scheduled_minutes integer,
  late_minutes integer,
  early_leave_minutes integer,
  overtime_minutes integer,
  day_status text,
  incident_type text,
  incident_status text,
  incident_note text
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
  select * into v_admin
  from public.profiles
  where id = auth.uid();

  if v_admin.id is null
     or v_admin.role <> 'admin'::public.user_role
     or not coalesce(v_admin.is_active, false)
  then
    raise exception 'Solo un administrador activo puede consultar reportes de asistencia.';
  end if;

  if p_start_date is null or p_end_date is null or p_end_date < p_start_date then
    raise exception 'Rango de fechas inválido.';
  end if;

  if (p_end_date - p_start_date) > 365 then
    raise exception 'El rango máximo del reporte es de 366 días.';
  end if;

  if p_user_id is not null and not exists (
    select 1 from public.profiles p where p.id = p_user_id
  ) then
    raise exception 'No se encontró el empleado.';
  end if;

  select coalesce(bs.timezone, 'America/Mexico_City')
  into v_timezone
  from public.business_settings bs
  where bs.id = 1;

  v_timezone := coalesce(v_timezone, 'America/Mexico_City');
  v_local_today := timezone(v_timezone, now())::date;

  select * into v_settings
  from public.attendance_settings
  where id = 1;

  return query
  with daily as (
    select
      d.work_date,
      p.id as user_id,
      trim(concat_ws(' ', p.first_name, p.last_name)) as employee_name,
      p.role::text as employee_role,
      coalesce(es.is_working, false) as is_working,
      es.scheduled_start as expected_start,
      es.scheduled_end as expected_end,
      ar.clock_in,
      ar.clock_out,
      case
        when ar.id is null then 0
        else greatest(
          0,
          floor(
            extract(epoch from (coalesce(ar.clock_out, now()) - ar.clock_in)) / 60
          )::integer
        )
      end as worked_minutes,
      case
        when not coalesce(es.is_working, false)
             or es.scheduled_start is null
             or es.scheduled_end is null
          then 0
        else greatest(
          0,
          floor(extract(epoch from (es.scheduled_end - es.scheduled_start)) / 60)::integer
        )
      end as scheduled_minutes,
      coalesce(ar.late_minutes, 0)::integer as late_minutes,
      coalesce(ar.early_leave_minutes, 0)::integer as early_leave_minutes,
      coalesce(ar.overtime_minutes, 0)::integer as overtime_minutes,
      ar.id as attendance_id,
      inc.id as incident_id,
      inc.incident_type,
      inc.status as incident_status,
      inc.note as incident_note
    from generate_series(p_start_date, p_end_date, interval '1 day') g(day_value)
    cross join lateral (select g.day_value::date as work_date) d
    cross join public.profiles p
    cross join lateral public.attendance_effective_employee_schedule(p.id, d.work_date) es
    left join lateral (
      select r.*
      from public.attendance_records r
      where r.user_id = p.id
        and r.schedule_date = d.work_date
      order by r.clock_in asc
      limit 1
    ) ar on true
    left join lateral (
      select ai.*
      from public.attendance_incidents ai
      where ai.user_id = p.id
        and d.work_date between ai.start_date and ai.end_date
        and ai.status <> 'cancelled'
      order by
        case ai.status
          when 'approved' then 0
          when 'pending' then 1
          when 'rejected' then 2
          else 3
        end,
        ai.created_at desc
      limit 1
    ) inc on true
    where coalesce(p.is_active, false)
      and (p_user_id is null or p.id = p_user_id)
  )
  select
    daily.work_date,
    daily.user_id,
    daily.employee_name,
    daily.employee_role,
    daily.is_working,
    daily.expected_start,
    daily.expected_end,
    daily.clock_in,
    daily.clock_out,
    daily.worked_minutes,
    daily.scheduled_minutes,
    daily.late_minutes,
    daily.early_leave_minutes,
    daily.overtime_minutes,
    case
      when daily.incident_id is not null
           and daily.incident_status = 'approved'
           and daily.incident_type in ('vacation','medical_leave','permission','absence_justified')
           and daily.attendance_id is null
        then daily.incident_type
      when daily.incident_id is not null
           and daily.incident_status = 'approved'
           and daily.incident_type = 'late_justified'
           and daily.late_minutes > 0
        then 'late_justified'
      when daily.incident_id is not null
           and daily.incident_status = 'approved'
           and daily.incident_type = 'early_leave_justified'
           and daily.early_leave_minutes > 0
        then 'early_leave_justified'
      when not daily.is_working then 'off'
      when daily.attendance_id is not null and daily.clock_out is null then 'working'
      when daily.attendance_id is not null then 'completed'
      when daily.work_date < v_local_today then 'absent'
      when daily.work_date = v_local_today
           and daily.expected_end is not null
           and now() >= (
             daily.expected_end
             + make_interval(mins => coalesce(v_settings.after_close_grace_minutes, 60))
           )
        then 'absent'
      when daily.work_date = v_local_today
           and daily.expected_start is not null
           and now() >= daily.expected_start
        then 'pending_entry'
      else 'scheduled'
    end as day_status,
    daily.incident_type,
    daily.incident_status,
    daily.incident_note
  from daily
  order by daily.work_date desc, daily.employee_name;
end;
$$;

revoke all on function public.attendance_admin_report_days(date, date, uuid) from public;
grant execute on function public.attendance_admin_report_days(date, date, uuid) to authenticated;


create or replace function public.attendance_admin_period_report(
  p_start_date date,
  p_end_date date,
  p_user_id uuid default null
)
returns table (
  user_id uuid,
  employee_name text,
  employee_role text,
  scheduled_days integer,
  worked_days integer,
  completed_days integer,
  open_shifts integer,
  absent_days integer,
  justified_absence_days integer,
  vacation_days integer,
  medical_leave_days integer,
  permission_days integer,
  late_days integer,
  justified_late_days integer,
  total_late_minutes integer,
  early_leave_days integer,
  justified_early_leave_days integer,
  total_early_leave_minutes integer,
  overtime_days integer,
  total_overtime_minutes integer,
  total_worked_minutes integer,
  total_scheduled_minutes integer,
  balance_minutes integer
)
language sql
security definer
set search_path = public
stable
as $$
  with days as (
    select *
    from public.attendance_admin_report_days(
      p_start_date,
      p_end_date,
      p_user_id
    )
  )
  select
    d.user_id,
    max(d.employee_name) as employee_name,
    max(d.employee_role) as employee_role,
    count(*) filter (where d.is_working)::integer as scheduled_days,
    count(*) filter (where d.clock_in is not null)::integer as worked_days,
    count(*) filter (where d.clock_in is not null and d.clock_out is not null)::integer as completed_days,
    count(*) filter (where d.clock_in is not null and d.clock_out is null)::integer as open_shifts,
    count(*) filter (where d.day_status = 'absent')::integer as absent_days,
    count(*) filter (where d.day_status = 'absence_justified')::integer as justified_absence_days,
    count(*) filter (where d.day_status = 'vacation')::integer as vacation_days,
    count(*) filter (where d.day_status = 'medical_leave')::integer as medical_leave_days,
    count(*) filter (where d.day_status = 'permission')::integer as permission_days,
    count(*) filter (where d.late_minutes > 0)::integer as late_days,
    count(*) filter (where d.day_status = 'late_justified')::integer as justified_late_days,
    coalesce(sum(d.late_minutes), 0)::integer as total_late_minutes,
    count(*) filter (where d.early_leave_minutes > 0)::integer as early_leave_days,
    count(*) filter (where d.day_status = 'early_leave_justified')::integer as justified_early_leave_days,
    coalesce(sum(d.early_leave_minutes), 0)::integer as total_early_leave_minutes,
    count(*) filter (where d.overtime_minutes > 0)::integer as overtime_days,
    coalesce(sum(d.overtime_minutes), 0)::integer as total_overtime_minutes,
    coalesce(sum(d.worked_minutes), 0)::integer as total_worked_minutes,
    coalesce(sum(d.scheduled_minutes), 0)::integer as total_scheduled_minutes,
    (
      coalesce(sum(d.worked_minutes), 0)
      - coalesce(sum(d.scheduled_minutes), 0)
    )::integer as balance_minutes
  from days d
  group by d.user_id
  order by max(d.employee_name);
$$;

revoke all on function public.attendance_admin_period_report(date, date, uuid) from public;
grant execute on function public.attendance_admin_period_report(date, date, uuid) to authenticated;

commit;
