-- Nómina hotfix: cálculo sin columnas ambiguas y soporte seguro para Contador.
-- No modifica reportes administrativos generales de Asistencia.

create or replace function public.attendance_payroll_report_days(
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
  v_timezone text;
  v_local_today date;
  v_settings public.attendance_settings%rowtype;
begin
  perform public.attendance_assert_payroll_manager();

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

revoke all on function public.attendance_payroll_report_days(date, date, uuid) from public;
grant execute on function public.attendance_payroll_report_days(date, date, uuid) to authenticated;

create or replace function public.attendance_admin_payroll_preview(
  p_start_date date,
  p_end_date date,
  p_user_id uuid default null
)
returns table (
  user_id uuid,
  employee_name text,
  employee_role text,
  configured boolean,
  pay_basis text,
  base_rate numeric,
  overtime_multiplier numeric,
  currency_code text,
  scheduled_days integer,
  worked_days integer,
  paid_leave_days integer,
  absent_days integer,
  late_minutes integer,
  early_leave_minutes integer,
  overtime_minutes integer,
  open_shifts integer,
  scheduled_pay numeric,
  absence_deduction numeric,
  late_deduction numeric,
  early_leave_deduction numeric,
  overtime_pay numeric,
  total_pay numeric
)
language plpgsql
security definer
set search_path = public
stable
as $$
declare
  v_timezone text;
  v_today date;
begin
  perform public.attendance_assert_payroll_manager();

  if p_start_date is null or p_end_date is null or p_end_date < p_start_date then
    raise exception 'Rango de fechas inválido.';
  end if;
  if (p_end_date - p_start_date) > 365 then
    raise exception 'El rango máximo del corte es de 366 días.';
  end if;

  select coalesce(bs.timezone, 'America/Mexico_City') into v_timezone
  from public.business_settings bs where bs.id = 1;
  v_today := timezone(coalesce(v_timezone, 'America/Mexico_City'), now())::date;
  if p_end_date > v_today then
    raise exception 'La nómina no puede incluir fechas futuras.';
  end if;

  return query
  with settings as (
    select
      p.id as user_id,
      trim(concat_ws(' ', p.first_name, p.last_name)) as employee_name,
      p.role::text as employee_role,
      aps.user_id is not null as configured,
      coalesce(aps.pay_basis, 'daily') as pay_basis,
      coalesce(aps.base_rate, 0)::numeric as base_rate,
      coalesce(aps.overtime_multiplier, 2)::numeric as overtime_multiplier,
      coalesce(aps.weekly_paid_days, 6)::numeric as weekly_paid_days,
      coalesce(aps.deduct_absences, true) as deduct_absences,
      coalesce(aps.deduct_late, true) as deduct_late,
      coalesce(aps.deduct_early_leave, true) as deduct_early_leave,
      coalesce(aps.pay_justified_absence, true) as pay_justified_absence,
      coalesce(aps.pay_vacation, true) as pay_vacation,
      coalesce(aps.pay_medical_leave, true) as pay_medical_leave,
      coalesce(aps.pay_permission, false) as pay_permission
    from public.profiles p
    left join public.attendance_payroll_settings aps on aps.user_id = p.id
    where coalesce(p.is_active, false)
      and (p_user_id is null or p.id = p_user_id)
  ),
  days as (
    select
      d.work_date,
      d.user_id,
      s.employee_name,
      s.employee_role,
      s.configured,
      s.pay_basis,
      s.base_rate,
      s.overtime_multiplier,
      s.weekly_paid_days,
      s.deduct_absences,
      s.deduct_late,
      s.deduct_early_leave,
      s.pay_justified_absence,
      s.pay_vacation,
      s.pay_medical_leave,
      s.pay_permission,
      d.is_working,
      d.clock_in,
      d.clock_out,
      d.scheduled_minutes,
      d.late_minutes,
      d.early_leave_minutes,
      d.overtime_minutes,
      d.day_status,
      case
        when not d.is_working or d.scheduled_minutes <= 0 then 0::numeric
        when s.pay_basis = 'hourly' then (d.scheduled_minutes::numeric / 60) * s.base_rate
        when s.pay_basis = 'daily' then s.base_rate
        when s.pay_basis = 'weekly' then s.base_rate / s.weekly_paid_days
        else 0::numeric
      end as nominal_day_pay
    from public.attendance_payroll_report_days(p_start_date, p_end_date, p_user_id) d
    join settings s on s.user_id = d.user_id
  ),
  calc as (
    select days.*,
      case
        when day_status = 'absence_justified' then pay_justified_absence
        when day_status = 'vacation' then pay_vacation
        when day_status = 'medical_leave' then pay_medical_leave
        when day_status = 'permission' then pay_permission
        else false
      end as is_paid_leave,
      case
        when scheduled_minutes <= 0 then 0::numeric
        when pay_basis = 'hourly' then base_rate
        else nominal_day_pay / (scheduled_minutes::numeric / 60)
      end as hourly_equivalent
    from days
  ),
  money as (
    select calc.*,
      case
        when day_status = 'absent' and deduct_absences then nominal_day_pay
        when day_status in ('absence_justified','vacation','medical_leave','permission') and not is_paid_leave then nominal_day_pay
        else 0::numeric
      end as absence_deduction_day,
      case
        when deduct_late and late_minutes > 0 and day_status <> 'late_justified' and scheduled_minutes > 0
          then nominal_day_pay * least(late_minutes, scheduled_minutes)::numeric / scheduled_minutes
        else 0::numeric
      end as late_deduction_day,
      case
        when deduct_early_leave and early_leave_minutes > 0 and day_status <> 'early_leave_justified' and scheduled_minutes > 0
          then nominal_day_pay * least(early_leave_minutes, scheduled_minutes)::numeric / scheduled_minutes
        else 0::numeric
      end as early_deduction_day,
      case
        when overtime_minutes > 0 and hourly_equivalent > 0
          then (overtime_minutes::numeric / 60) * hourly_equivalent * overtime_multiplier
        else 0::numeric
      end as overtime_pay_day
    from calc
  ),
  bounded as (
    select money.*,
      least(
        greatest(0::numeric, nominal_day_pay - absence_deduction_day),
        late_deduction_day + early_deduction_day
      ) as attendance_partial_deduction
    from money
  ),
  currency as (
    select coalesce(nullif(trim(bs.currency_code), ''), 'MXN') as currency_code
    from public.business_settings bs where bs.id = 1
  )
  select
    b.user_id,
    max(b.employee_name),
    max(b.employee_role),
    bool_or(b.configured),
    max(b.pay_basis),
    max(b.base_rate),
    max(b.overtime_multiplier),
    (select c.currency_code from currency c),
    count(*) filter (where b.is_working)::integer,
    count(*) filter (where b.clock_in is not null)::integer,
    count(*) filter (where b.is_paid_leave)::integer,
    count(*) filter (where b.day_status = 'absent')::integer,
    coalesce(sum(b.late_minutes), 0)::integer,
    coalesce(sum(b.early_leave_minutes), 0)::integer,
    coalesce(sum(b.overtime_minutes), 0)::integer,
    count(*) filter (where b.clock_in is not null and b.clock_out is null)::integer,
    round(coalesce(sum(b.nominal_day_pay), 0), 2),
    round(coalesce(sum(b.absence_deduction_day), 0), 2),
    round(coalesce(sum(
      case when b.attendance_partial_deduction > 0 and (b.late_deduction_day + b.early_deduction_day) > 0
        then b.attendance_partial_deduction * b.late_deduction_day / (b.late_deduction_day + b.early_deduction_day)
        else 0 end
    ), 0), 2),
    round(coalesce(sum(
      case when b.attendance_partial_deduction > 0 and (b.late_deduction_day + b.early_deduction_day) > 0
        then b.attendance_partial_deduction * b.early_deduction_day / (b.late_deduction_day + b.early_deduction_day)
        else 0 end
    ), 0), 2),
    round(coalesce(sum(b.overtime_pay_day), 0), 2),
    round(coalesce(sum(
      greatest(0::numeric, b.nominal_day_pay - b.absence_deduction_day - b.attendance_partial_deduction)
      + b.overtime_pay_day
    ), 0), 2)
  from bounded b
  group by b.user_id
  order by max(b.employee_name);
end;
$$;

revoke all on function public.attendance_admin_payroll_preview(date,date,uuid) from public;
grant execute on function public.attendance_admin_payroll_preview(date,date,uuid) to authenticated;
