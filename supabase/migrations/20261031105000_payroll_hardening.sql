/*
 * ============================================================
 * NÓMINA 1.1 HARDENING
 * - Cierre compatible con accountant.
 * - Evita solapamiento de cortes activos.
 * - Pago solo en corte cerrado/parcial.
 * - Referencia obligatoria para transferencia/tarjeta.
 * ============================================================
 */

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

  if p_start_date is null or p_end_date is null or p_end_date < p_start_date then
    raise exception 'Rango de fechas inválido.';
  end if;

  if exists (
    select 1
    from public.attendance_payroll_runs r
    where r.status <> 'voided'
      and daterange(r.start_date, r.end_date, '[]') && daterange(p_start_date, p_end_date, '[]')
  ) then
    raise exception 'Ya existe un corte activo que se cruza con este periodo.';
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
    from public.attendance_payroll_report_days(p_start_date, p_end_date, null) d
    where d.is_working
      and d.day_status in ('scheduled','pending_entry','working')
  ) then
    raise exception 'El periodo contiene jornadas que todavía no han terminado. Espera a que concluyan o ajusta la fecha final.';
  end if;

  select coalesce(sum(p.total_pay), 0), max(p.currency_code)
  into v_total, v_currency
  from public.attendance_admin_payroll_preview(p_start_date, p_end_date, null) p;

  if coalesce(v_total,0) <= 0 then
    raise exception 'El corte no puede cerrarse con total en cero.';
  end if;

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
  v_payment_status text;
  v_user_id uuid;
  v_reference text := nullif(left(trim(coalesce(p_payment_reference,'')),160),'');
begin
  perform public.attendance_assert_payroll_manager();

  if p_payment_method not in ('cash','transfer','card','other') then
    raise exception 'Método de pago inválido.';
  end if;

  if p_payment_method in ('transfer','card') and length(coalesce(v_reference,'')) < 3 then
    raise exception 'Captura la referencia o folio del pago.';
  end if;

  select i.payroll_run_id, r.status, i.payment_status, i.user_id
  into v_run_id, v_run_status, v_payment_status, v_user_id
  from public.attendance_payroll_run_items i
  join public.attendance_payroll_runs r on r.id = i.payroll_run_id
  where i.id = p_item_id
  for update of i, r;

  if v_run_id is null then
    raise exception 'No se encontró el recibo de nómina.';
  end if;

  if v_run_status not in ('closed','partially_paid') then
    raise exception 'Este corte no admite nuevos pagos.';
  end if;

  if v_payment_status = 'paid' then
    raise exception 'Este recibo ya está marcado como pagado.';
  end if;

  if p_payment_method = 'transfer' and not exists (
    select 1
    from public.employee_bank_accounts e
    where e.user_id = v_user_id
      and e.clabe ~ '^[0-9]{18}$'
  ) then
    raise exception 'El empleado no tiene una CLABE válida registrada para recibir transferencias.';
  end if;

  update public.attendance_payroll_run_items
  set
    payment_status = 'paid',
    paid_at = coalesce(p_paid_at, now()),
    payment_method = p_payment_method,
    payment_reference = v_reference,
    paid_by = auth.uid()
  where id = p_item_id
    and payment_status <> 'paid';

  if not found then
    raise exception 'El recibo ya fue pagado por otro proceso.';
  end if;

  perform public.attendance_refresh_payroll_run_status(v_run_id);
end;
$$;

revoke all on function public.attendance_admin_mark_payroll_item_paid(uuid,text,text,timestamptz) from public;
grant execute on function public.attendance_admin_mark_payroll_item_paid(uuid,text,text,timestamptz) to authenticated;
