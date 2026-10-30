begin;

/* ============================================================
 * FASE 6 · CICLO DE PAGO Y RECIBOS DE NÓMINA
 * ============================================================
 * - Detalle histórico de cada corte congelado
 * - Pago individual por empleado
 * - Estado cerrado / parcialmente pagado / pagado
 * - Fecha, método y referencia de pago
 * - Anulación con motivo (solo mientras no existan pagos)
 * - Recibo individual desde el snapshot histórico
 */

alter table public.attendance_payroll_runs
  drop constraint if exists attendance_payroll_runs_status_check;

alter table public.attendance_payroll_runs
  add constraint attendance_payroll_runs_status_check
  check (status in ('closed','partially_paid','paid','voided'));

alter table public.attendance_payroll_run_items
  add column if not exists payment_status text not null default 'pending';

alter table public.attendance_payroll_run_items
  drop constraint if exists attendance_payroll_run_items_payment_status_check;

alter table public.attendance_payroll_run_items
  add constraint attendance_payroll_run_items_payment_status_check
  check (payment_status in ('pending','paid'));

alter table public.attendance_payroll_run_items
  add column if not exists paid_at timestamptz;

alter table public.attendance_payroll_run_items
  add column if not exists payment_method text;

alter table public.attendance_payroll_run_items
  add column if not exists payment_reference text;

alter table public.attendance_payroll_run_items
  add column if not exists paid_by uuid references public.profiles(id);

alter table public.attendance_payroll_run_items
  drop constraint if exists attendance_payroll_run_items_payment_method_check;

alter table public.attendance_payroll_run_items
  add constraint attendance_payroll_run_items_payment_method_check
  check (
    payment_method is null
    or payment_method in ('cash','transfer','card','other')
  );

/* Normaliza cualquier registro histórico previo. */
update public.attendance_payroll_run_items
set payment_status = 'pending'
where payment_status is null;

create or replace function public.attendance_refresh_payroll_run_status(
  p_payroll_run_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_status text;
  v_total integer;
  v_paid integer;
begin
  select r.status
  into v_status
  from public.attendance_payroll_runs r
  where r.id = p_payroll_run_id
  for update;

  if v_status is null or v_status = 'voided' then
    return;
  end if;

  select
    count(*)::integer,
    count(*) filter (where i.payment_status = 'paid')::integer
  into v_total, v_paid
  from public.attendance_payroll_run_items i
  where i.payroll_run_id = p_payroll_run_id;

  update public.attendance_payroll_runs
  set status = case
    when coalesce(v_total, 0) = 0 then 'closed'
    when v_paid = 0 then 'closed'
    when v_paid = v_total then 'paid'
    else 'partially_paid'
  end
  where id = p_payroll_run_id;
end;
$$;

revoke all on function public.attendance_refresh_payroll_run_status(uuid) from public;
grant execute on function public.attendance_refresh_payroll_run_status(uuid) to authenticated;

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
  perform public.attendance_assert_active_admin();

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
  perform public.attendance_assert_active_admin();

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
  perform public.attendance_assert_active_admin();

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

/* Actualizamos el listado para mostrar progreso de pagos. */
drop function if exists public.attendance_admin_list_payroll_runs(integer);

create function public.attendance_admin_list_payroll_runs(p_limit integer default 20)
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
  perform public.attendance_assert_active_admin();

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

commit;
