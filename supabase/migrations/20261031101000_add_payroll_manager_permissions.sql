/*
 * ============================================================
 * PAYROLL MANAGER PERMISSIONS
 * Admin + accountant can manage payroll without granting the
 * accountant access to the rest of Attendance administration.
 * ============================================================
 */

create or replace function public.attendance_assert_payroll_manager()
returns void
language plpgsql
security definer
set search_path = public
stable
as $$
declare
  v_profile public.profiles%rowtype;
begin
  select *
  into v_profile
  from public.profiles
  where id = auth.uid();

  if v_profile.id is null
     or v_profile.role::text not in ('admin', 'accountant')
     or not coalesce(v_profile.is_active, false)
  then
    raise exception 'Solo un administrador o contador activo puede administrar nómina.';
  end if;
end;
$$;

revoke all on function public.attendance_assert_payroll_manager() from public;
grant execute on function public.attendance_assert_payroll_manager() to authenticated;

create or replace function public.attendance_admin_get_payroll_settings()
returns table (
  user_id uuid,
  employee_name text,
  employee_role text,
  is_active boolean,
  configured boolean,
  pay_basis text,
  base_rate numeric,
  overtime_multiplier numeric,
  weekly_paid_days smallint,
  deduct_absences boolean,
  deduct_late boolean,
  deduct_early_leave boolean,
  pay_justified_absence boolean,
  pay_vacation boolean,
  pay_medical_leave boolean,
  pay_permission boolean
)
language plpgsql
security definer
set search_path = public
stable
as $$
begin
  perform public.attendance_assert_payroll_manager();

  return query
  select
    p.id,
    trim(concat_ws(' ', p.first_name, p.last_name)),
    p.role::text,
    coalesce(p.is_active, false),
    aps.user_id is not null,
    coalesce(aps.pay_basis, 'daily'),
    coalesce(aps.base_rate, 0)::numeric,
    coalesce(aps.overtime_multiplier, 2)::numeric,
    coalesce(aps.weekly_paid_days, 6)::smallint,
    coalesce(aps.deduct_absences, true),
    coalesce(aps.deduct_late, true),
    coalesce(aps.deduct_early_leave, true),
    coalesce(aps.pay_justified_absence, true),
    coalesce(aps.pay_vacation, true),
    coalesce(aps.pay_medical_leave, true),
    coalesce(aps.pay_permission, false)
  from public.profiles p
  left join public.attendance_payroll_settings aps on aps.user_id = p.id
  order by coalesce(p.is_active, false) desc, trim(concat_ws(' ', p.first_name, p.last_name));
end;
$$;

revoke all on function public.attendance_admin_get_payroll_settings() from public;
grant execute on function public.attendance_admin_get_payroll_settings() to authenticated;

create or replace function public.attendance_admin_save_payroll_setting(
  p_user_id uuid,
  p_pay_basis text,
  p_base_rate numeric,
  p_overtime_multiplier numeric,
  p_weekly_paid_days smallint,
  p_deduct_absences boolean,
  p_deduct_late boolean,
  p_deduct_early_leave boolean,
  p_pay_justified_absence boolean,
  p_pay_vacation boolean,
  p_pay_medical_leave boolean,
  p_pay_permission boolean
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.attendance_assert_payroll_manager();

  if not exists (select 1 from public.profiles where id = p_user_id) then
    raise exception 'No se encontró el empleado.';
  end if;
  if p_pay_basis not in ('hourly','daily','weekly') then
    raise exception 'Tipo de sueldo inválido.';
  end if;
  if coalesce(p_base_rate, -1) < 0 then
    raise exception 'El sueldo no puede ser negativo.';
  end if;
  if coalesce(p_overtime_multiplier, 0) < 1 or p_overtime_multiplier > 10 then
    raise exception 'El multiplicador de horas extra debe estar entre 1 y 10.';
  end if;
  if coalesce(p_weekly_paid_days, 0) not between 1 and 7 then
    raise exception 'Los días pagados por semana deben estar entre 1 y 7.';
  end if;

  insert into public.attendance_payroll_settings (
    user_id, pay_basis, base_rate, overtime_multiplier, weekly_paid_days,
    deduct_absences, deduct_late, deduct_early_leave,
    pay_justified_absence, pay_vacation, pay_medical_leave, pay_permission,
    updated_at, updated_by
  ) values (
    p_user_id, p_pay_basis, round(p_base_rate, 2), p_overtime_multiplier, p_weekly_paid_days,
    p_deduct_absences, p_deduct_late, p_deduct_early_leave,
    p_pay_justified_absence, p_pay_vacation, p_pay_medical_leave, p_pay_permission,
    now(), auth.uid()
  )
  on conflict (user_id) do update set
    pay_basis = excluded.pay_basis,
    base_rate = excluded.base_rate,
    overtime_multiplier = excluded.overtime_multiplier,
    weekly_paid_days = excluded.weekly_paid_days,
    deduct_absences = excluded.deduct_absences,
    deduct_late = excluded.deduct_late,
    deduct_early_leave = excluded.deduct_early_leave,
    pay_justified_absence = excluded.pay_justified_absence,
    pay_vacation = excluded.pay_vacation,
    pay_medical_leave = excluded.pay_medical_leave,
    pay_permission = excluded.pay_permission,
    updated_at = now(),
    updated_by = auth.uid();
end;
$$;

revoke all on function public.attendance_admin_save_payroll_setting(uuid,text,numeric,numeric,smallint,boolean,boolean,boolean,boolean,boolean,boolean,boolean) from public;
grant execute on function public.attendance_admin_save_payroll_setting(uuid,text,numeric,numeric,smallint,boolean,boolean,boolean,boolean,boolean,boolean,boolean) to authenticated;

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
    select d.*, s.*,
      case
        when not d.is_working or d.scheduled_minutes <= 0 then 0::numeric
        when s.pay_basis = 'hourly' then (d.scheduled_minutes::numeric / 60) * s.base_rate
        when s.pay_basis = 'daily' then s.base_rate
        when s.pay_basis = 'weekly' then s.base_rate / s.weekly_paid_days
        else 0::numeric
      end as nominal_day_pay
    from public.attendance_admin_report_days(p_start_date, p_end_date, p_user_id) d
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

create or replace function public.attendance_admin_close_payroll_run(
  p_start_date date,
  p_end_date date,
  p_notes text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_run_id uuid;
  v_total numeric(14,2);
  v_currency text;
begin
  perform public.attendance_assert_payroll_manager();

  if exists (
    select 1 from public.attendance_payroll_runs r
    where r.start_date = p_start_date and r.end_date = p_end_date and r.status = 'closed'
  ) then
    raise exception 'Ya existe un corte cerrado para este mismo periodo.';
  end if;

  if exists (
    select 1 from public.attendance_admin_payroll_preview(p_start_date, p_end_date, null) p
    where not p.configured
  ) then
    raise exception 'Todos los empleados activos deben tener configuración de nómina antes de cerrar el corte.';
  end if;

  if exists (
    select 1 from public.attendance_admin_payroll_preview(p_start_date, p_end_date, null) p
    where p.open_shifts > 0
  ) then
    raise exception 'Hay jornadas abiertas. Ciérralas o corrígelas antes de cerrar la nómina.';
  end if;

  if exists (
    select 1
    from public.attendance_admin_report_days(p_start_date, p_end_date, null) d
    where d.is_working
      and d.day_status in ('scheduled','pending_entry','working')
  ) then
    raise exception 'El periodo contiene jornadas que todavía no han terminado. Espera a que concluyan o ajusta la fecha final.';
  end if;

  select coalesce(sum(p.total_pay), 0), max(p.currency_code)
  into v_total, v_currency
  from public.attendance_admin_payroll_preview(p_start_date, p_end_date, null) p;

  insert into public.attendance_payroll_runs (
    start_date, end_date, status, currency_code, notes, total_amount, created_by
  ) values (
    p_start_date, p_end_date, 'closed', coalesce(v_currency, 'MXN'), nullif(trim(p_notes), ''), round(v_total, 2), auth.uid()
  ) returning id into v_run_id;

  insert into public.attendance_payroll_run_items (
    payroll_run_id, user_id, employee_name, employee_role, pay_basis, base_rate,
    overtime_multiplier, scheduled_days, worked_days, paid_leave_days, absent_days,
    late_minutes, early_leave_minutes, overtime_minutes, scheduled_pay,
    absence_deduction, late_deduction, early_leave_deduction, overtime_pay, total_pay
  )
  select
    v_run_id, p.user_id, p.employee_name, p.employee_role, p.pay_basis, p.base_rate,
    p.overtime_multiplier, p.scheduled_days, p.worked_days, p.paid_leave_days, p.absent_days,
    p.late_minutes, p.early_leave_minutes, p.overtime_minutes, p.scheduled_pay,
    p.absence_deduction, p.late_deduction, p.early_leave_deduction, p.overtime_pay, p.total_pay
  from public.attendance_admin_payroll_preview(p_start_date, p_end_date, null) p;

  return v_run_id;
end;
$$;

revoke all on function public.attendance_admin_close_payroll_run(date,date,text) from public;
grant execute on function public.attendance_admin_close_payroll_run(date,date,text) to authenticated;

create or replace function public.attendance_admin_list_payroll_runs(p_limit integer default 20)
returns table (
  id uuid,
  start_date date,
  end_date date,
  status text,
  currency_code text,
  total_amount numeric,
  employee_count integer,
  paid_employee_count integer,
  paid_amount numeric,
  notes text,
  created_by_name text,
  created_at timestamptz,
  voided_at timestamptz,
  void_reason text
)
language plpgsql
security definer
set search_path = public
stable
as $$
begin
  perform public.attendance_assert_payroll_manager();

  return query
  select
    r.id,
    r.start_date,
    r.end_date,
    r.status,
    r.currency_code,
    r.total_amount,
    count(i.id)::integer,
    count(i.id) filter (where i.payment_status = 'paid')::integer,
    coalesce(sum(i.total_pay) filter (where i.payment_status = 'paid'), 0)::numeric,
    r.notes,
    trim(concat_ws(' ', p.first_name, p.last_name)),
    r.created_at,
    r.voided_at,
    r.void_reason
  from public.attendance_payroll_runs r
  join public.profiles p on p.id = r.created_by
  left join public.attendance_payroll_run_items i on i.payroll_run_id = r.id
  group by r.id, p.first_name, p.last_name
  order by r.created_at desc
  limit greatest(1, least(coalesce(p_limit,20),100));
end;
$$;

revoke all on function public.attendance_admin_list_payroll_runs(integer) from public;
grant execute on function public.attendance_admin_list_payroll_runs(integer) to authenticated;

create or replace function public.attendance_admin_get_payroll_run_detail(
  p_payroll_run_id uuid
)
returns table (
  run_id uuid,
  start_date date,
  end_date date,
  run_status text,
  currency_code text,
  run_total_amount numeric,
  run_notes text,
  created_by_name text,
  created_at timestamptz,
  voided_by_name text,
  voided_at timestamptz,
  void_reason text,
  item_id uuid,
  user_id uuid,
  employee_name text,
  employee_role text,
  pay_basis text,
  base_rate numeric,
  overtime_multiplier numeric,
  scheduled_days integer,
  worked_days integer,
  paid_leave_days integer,
  absent_days integer,
  late_minutes integer,
  early_leave_minutes integer,
  overtime_minutes integer,
  scheduled_pay numeric,
  absence_deduction numeric,
  late_deduction numeric,
  early_leave_deduction numeric,
  overtime_pay numeric,
  total_pay numeric,
  payment_status text,
  paid_at timestamptz,
  payment_method text,
  payment_reference text,
  paid_by_name text
)
language plpgsql
security definer
set search_path = public
stable
as $$
begin
  perform public.attendance_assert_payroll_manager();

  if not exists (
    select 1 from public.attendance_payroll_runs r where r.id = p_payroll_run_id
  ) then
    raise exception 'No se encontró el corte de nómina.';
  end if;

  return query
  select
    r.id,
    r.start_date,
    r.end_date,
    r.status,
    r.currency_code,
    r.total_amount,
    r.notes,
    trim(concat_ws(' ', creator.first_name, creator.last_name)),
    r.created_at,
    case when voider.id is null then null else trim(concat_ws(' ', voider.first_name, voider.last_name)) end,
    r.voided_at,
    r.void_reason,
    i.id,
    i.user_id,
    i.employee_name,
    i.employee_role,
    i.pay_basis,
    i.base_rate,
    i.overtime_multiplier,
    i.scheduled_days,
    i.worked_days,
    i.paid_leave_days,
    i.absent_days,
    i.late_minutes,
    i.early_leave_minutes,
    i.overtime_minutes,
    i.scheduled_pay,
    i.absence_deduction,
    i.late_deduction,
    i.early_leave_deduction,
    i.overtime_pay,
    i.total_pay,
    i.payment_status,
    i.paid_at,
    i.payment_method,
    i.payment_reference,
    case when payer.id is null then null else trim(concat_ws(' ', payer.first_name, payer.last_name)) end
  from public.attendance_payroll_runs r
  join public.profiles creator on creator.id = r.created_by
  left join public.profiles voider on voider.id = r.voided_by
  join public.attendance_payroll_run_items i on i.payroll_run_id = r.id
  left join public.profiles payer on payer.id = i.paid_by
  where r.id = p_payroll_run_id
  order by i.employee_name;
end;
$$;

revoke all on function public.attendance_admin_get_payroll_run_detail(uuid) from public;
grant execute on function public.attendance_admin_get_payroll_run_detail(uuid) to authenticated;

create or replace function public.attendance_admin_mark_payroll_item_paid(
  p_item_id uuid,
  p_payment_method text,
  p_payment_reference text default null,
  p_paid_at timestamptz default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_run_id uuid;
  v_run_status text;
begin
  perform public.attendance_assert_payroll_manager();

  if p_payment_method not in ('cash','transfer','card','other') then
    raise exception 'Método de pago inválido.';
  end if;

  select i.payroll_run_id, r.status
  into v_run_id, v_run_status
  from public.attendance_payroll_run_items i
  join public.attendance_payroll_runs r on r.id = i.payroll_run_id
  where i.id = p_item_id
  for update of i, r;

  if v_run_id is null then
    raise exception 'No se encontró el recibo de nómina.';
  end if;

  if v_run_status = 'voided' then
    raise exception 'No se puede pagar un corte anulado.';
  end if;

  if exists (
    select 1 from public.attendance_payroll_run_items i
    where i.id = p_item_id and i.payment_status = 'paid'
  ) then
    raise exception 'Este recibo ya está marcado como pagado.';
  end if;

  update public.attendance_payroll_run_items
  set
    payment_status = 'paid',
    paid_at = coalesce(p_paid_at, now()),
    payment_method = p_payment_method,
    payment_reference = nullif(left(trim(coalesce(p_payment_reference, '')), 160), ''),
    paid_by = auth.uid()
  where id = p_item_id;

  perform public.attendance_refresh_payroll_run_status(v_run_id);
end;
$$;

revoke all on function public.attendance_admin_mark_payroll_item_paid(uuid,text,text,timestamptz) from public;
grant execute on function public.attendance_admin_mark_payroll_item_paid(uuid,text,text,timestamptz) to authenticated;

create or replace function public.attendance_admin_void_payroll_run(
  p_payroll_run_id uuid,
  p_reason text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_reason text;
  v_status text;
begin
  perform public.attendance_assert_payroll_manager();

  v_reason := trim(coalesce(p_reason, ''));
  if length(v_reason) < 5 then
    raise exception 'Indica un motivo de anulación de al menos 5 caracteres.';
  end if;

  select r.status
  into v_status
  from public.attendance_payroll_runs r
  where r.id = p_payroll_run_id
  for update;

  if v_status is null then
    raise exception 'No se encontró el corte de nómina.';
  end if;

  if v_status = 'voided' then
    raise exception 'El corte ya está anulado.';
  end if;

  if exists (
    select 1
    from public.attendance_payroll_run_items i
    where i.payroll_run_id = p_payroll_run_id
      and i.payment_status = 'paid'
  ) then
    raise exception 'No se puede anular un corte que ya tiene pagos registrados.';
  end if;

  update public.attendance_payroll_runs
  set
    status = 'voided',
    voided_by = auth.uid(),
    voided_at = now(),
    void_reason = left(v_reason, 500)
  where id = p_payroll_run_id;
end;
$$;

revoke all on function public.attendance_admin_void_payroll_run(uuid,text) from public;
grant execute on function public.attendance_admin_void_payroll_run(uuid,text) to authenticated;
