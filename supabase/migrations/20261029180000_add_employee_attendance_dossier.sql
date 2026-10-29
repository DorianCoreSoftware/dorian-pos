begin;

/* ============================================================
 * FASE 7 · EXPEDIENTE DEL EMPLEADO Y RECIBOS HISTÓRICOS
 * ============================================================
 * - Historial de recibos/cortes por empleado
 * - Acumulados de nómina por periodo
 * - Conserva snapshot de cada corte histórico
 */

create or replace function public.attendance_admin_employee_payroll_history(
  p_user_id uuid,
  p_start_date date default null,
  p_end_date date default null
)
returns table (
  payroll_run_id uuid,
  payroll_item_id uuid,
  start_date date,
  end_date date,
  run_status text,
  currency_code text,
  employee_name text,
  employee_role text,
  pay_basis text,
  base_rate numeric,
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
  paid_by_name text,
  run_created_at timestamptz
)
language plpgsql
security definer
set search_path = public
stable
as $$
begin
  perform public.attendance_assert_active_admin();

  if not exists (select 1 from public.profiles p where p.id = p_user_id) then
    raise exception 'No se encontró el empleado.';
  end if;

  return query
  select
    r.id,
    i.id,
    r.start_date,
    r.end_date,
    r.status,
    r.currency_code,
    i.employee_name,
    i.employee_role,
    i.pay_basis,
    i.base_rate,
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
    case
      when payer.id is null then null
      else trim(concat_ws(' ', payer.first_name, payer.last_name))
    end,
    r.created_at
  from public.attendance_payroll_run_items i
  join public.attendance_payroll_runs r on r.id = i.payroll_run_id
  left join public.profiles payer on payer.id = i.paid_by
  where i.user_id = p_user_id
    and (p_start_date is null or r.end_date >= p_start_date)
    and (p_end_date is null or r.start_date <= p_end_date)
  order by r.start_date desc, r.created_at desc;
end;
$$;

revoke all on function public.attendance_admin_employee_payroll_history(uuid,date,date) from public;
grant execute on function public.attendance_admin_employee_payroll_history(uuid,date,date) to authenticated;

commit;
