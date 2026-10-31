-- Nómina hotfix: elimina ambigüedades PL/pgSQL en el preview de nómina.
-- En funciones RETURNS TABLE, los nombres de columnas de salida son variables PL/pgSQL;
-- por eso todas las columnas susceptibles se califican explícitamente con alias.

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
    select d.*,
      case
        when d.day_status = 'absence_justified' then d.pay_justified_absence
        when d.day_status = 'vacation' then d.pay_vacation
        when d.day_status = 'medical_leave' then d.pay_medical_leave
        when d.day_status = 'permission' then d.pay_permission
        else false
      end as is_paid_leave,
      case
        when d.scheduled_minutes <= 0 then 0::numeric
        when d.pay_basis = 'hourly' then d.base_rate
        else d.nominal_day_pay / (d.scheduled_minutes::numeric / 60)
      end as hourly_equivalent
    from days d
  ),
  money as (
    select c.*,
      case
        when c.day_status = 'absent' and c.deduct_absences then c.nominal_day_pay
        when c.day_status in ('absence_justified','vacation','medical_leave','permission') and not c.is_paid_leave then c.nominal_day_pay
        else 0::numeric
      end as absence_deduction_day,
      case
        when c.deduct_late and c.late_minutes > 0 and c.day_status <> 'late_justified' and c.scheduled_minutes > 0
          then c.nominal_day_pay * least(c.late_minutes, c.scheduled_minutes)::numeric / c.scheduled_minutes
        else 0::numeric
      end as late_deduction_day,
      case
        when c.deduct_early_leave and c.early_leave_minutes > 0 and c.day_status <> 'early_leave_justified' and c.scheduled_minutes > 0
          then c.nominal_day_pay * least(c.early_leave_minutes, c.scheduled_minutes)::numeric / c.scheduled_minutes
        else 0::numeric
      end as early_deduction_day,
      case
        when c.overtime_minutes > 0 and c.hourly_equivalent > 0
          then (c.overtime_minutes::numeric / 60) * c.hourly_equivalent * c.overtime_multiplier
        else 0::numeric
      end as overtime_pay_day
    from calc c
  ),
  bounded as (
    select m.*,
      least(
        greatest(0::numeric, m.nominal_day_pay - m.absence_deduction_day),
        m.late_deduction_day + m.early_deduction_day
      ) as attendance_partial_deduction
    from money m
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
