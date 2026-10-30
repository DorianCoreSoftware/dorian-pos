begin;

/* ============================================================
 * FASE 8 · AUTOSERVICIO DEL EMPLEADO + TRAZABILIDAD DE CORREO
 * ============================================================ */

create table if not exists public.attendance_employee_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  start_date date not null,
  end_date date not null,
  request_type text not null,
  status text not null default 'pending',
  note text not null,
  admin_note text,
  incident_id uuid references public.attendance_incidents(id),
  reviewed_by uuid references public.profiles(id),
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint attendance_employee_requests_dates_check check (end_date >= start_date),
  constraint attendance_employee_requests_range_check check ((end_date - start_date) <= 60),
  constraint attendance_employee_requests_type_check check (
    request_type in ('absence_justified','late_justified','early_leave_justified','permission','vacation','medical_leave','other')
  ),
  constraint attendance_employee_requests_status_check check (
    status in ('pending','approved','rejected','cancelled')
  ),
  constraint attendance_employee_requests_note_check check (length(trim(note)) between 3 and 500),
  constraint attendance_employee_requests_admin_note_check check (
    admin_note is null or length(trim(admin_note)) between 3 and 500
  )
);

create index if not exists attendance_employee_requests_user_idx
  on public.attendance_employee_requests(user_id, created_at desc);
create index if not exists attendance_employee_requests_status_idx
  on public.attendance_employee_requests(status, created_at desc);

alter table public.attendance_employee_requests enable row level security;

drop policy if exists attendance_employee_requests_select_own on public.attendance_employee_requests;
create policy attendance_employee_requests_select_own
on public.attendance_employee_requests
for select to authenticated
using (user_id = auth.uid());

revoke insert, update, delete on public.attendance_employee_requests from authenticated;

alter table public.attendance_payroll_run_items
  add column if not exists email_sent_at timestamptz;
alter table public.attendance_payroll_run_items
  add column if not exists email_last_error text;

create table if not exists public.attendance_email_log (
  id uuid primary key default gen_random_uuid(),
  event_type text not null,
  user_id uuid references public.profiles(id) on delete set null,
  payroll_item_id uuid references public.attendance_payroll_run_items(id) on delete set null,
  request_id uuid references public.attendance_employee_requests(id) on delete set null,
  recipient_email text,
  status text not null,
  error_message text,
  created_at timestamptz not null default now(),
  sent_at timestamptz,
  constraint attendance_email_log_status_check check (status in ('sent','failed'))
);

alter table public.attendance_email_log enable row level security;
revoke all on public.attendance_email_log from authenticated;

create or replace function public.attendance_create_my_request(
  p_start_date date,
  p_end_date date,
  p_request_type text,
  p_note text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_profile public.profiles%rowtype;
  v_id uuid;
begin
  select * into v_profile from public.profiles where id = auth.uid();
  if v_profile.id is null or not coalesce(v_profile.is_active, false) then
    raise exception 'Tu usuario no está activo.';
  end if;
  if p_start_date is null or p_end_date is null or p_end_date < p_start_date then
    raise exception 'Rango de fechas inválido.';
  end if;
  if (p_end_date - p_start_date) > 60 then
    raise exception 'Una solicitud no puede abarcar más de 61 días.';
  end if;
  if p_request_type not in ('absence_justified','late_justified','early_leave_justified','permission','vacation','medical_leave','other') then
    raise exception 'Tipo de solicitud inválido.';
  end if;
  if length(trim(coalesce(p_note,''))) < 3 then
    raise exception 'Describe el motivo de la solicitud.';
  end if;

  insert into public.attendance_employee_requests(user_id,start_date,end_date,request_type,note)
  values(auth.uid(),p_start_date,p_end_date,p_request_type,left(trim(p_note),500))
  returning id into v_id;
  return v_id;
end;
$$;
revoke all on function public.attendance_create_my_request(date,date,text,text) from public;
grant execute on function public.attendance_create_my_request(date,date,text,text) to authenticated;

create or replace function public.attendance_cancel_my_request(p_request_id uuid)
returns void
language plpgsql security definer set search_path=public
as $$
begin
  update public.attendance_employee_requests
  set status='cancelled', updated_at=now()
  where id=p_request_id and user_id=auth.uid() and status='pending';
  if not found then raise exception 'La solicitud no existe o ya no puede cancelarse.'; end if;
end; $$;
revoke all on function public.attendance_cancel_my_request(uuid) from public;
grant execute on function public.attendance_cancel_my_request(uuid) to authenticated;

create or replace function public.attendance_my_requests()
returns table(
  id uuid,user_id uuid,employee_name text,employee_role text,start_date date,end_date date,
  request_type text,status text,note text,admin_note text,incident_id uuid,reviewed_by_name text,
  reviewed_at timestamptz,created_at timestamptz,updated_at timestamptz
)
language sql security definer set search_path=public stable
as $$
  select r.id,r.user_id,trim(concat_ws(' ',p.first_name,p.last_name)),p.role::text,r.start_date,r.end_date,
    r.request_type,r.status,r.note,r.admin_note,r.incident_id,
    case when rv.id is null then null else trim(concat_ws(' ',rv.first_name,rv.last_name)) end,
    r.reviewed_at,r.created_at,r.updated_at
  from public.attendance_employee_requests r
  join public.profiles p on p.id=r.user_id
  left join public.profiles rv on rv.id=r.reviewed_by
  where r.user_id=auth.uid()
  order by r.created_at desc;
$$;
revoke all on function public.attendance_my_requests() from public;
grant execute on function public.attendance_my_requests() to authenticated;

create or replace function public.attendance_admin_list_requests()
returns table(
  id uuid,user_id uuid,employee_name text,employee_role text,start_date date,end_date date,
  request_type text,status text,note text,admin_note text,incident_id uuid,reviewed_by_name text,
  reviewed_at timestamptz,created_at timestamptz,updated_at timestamptz
)
language plpgsql security definer set search_path=public stable
as $$
begin
  perform public.attendance_assert_active_admin();
  return query
  select r.id,r.user_id,trim(concat_ws(' ',p.first_name,p.last_name)),p.role::text,r.start_date,r.end_date,
    r.request_type,r.status,r.note,r.admin_note,r.incident_id,
    case when rv.id is null then null else trim(concat_ws(' ',rv.first_name,rv.last_name)) end,
    r.reviewed_at,r.created_at,r.updated_at
  from public.attendance_employee_requests r
  join public.profiles p on p.id=r.user_id
  left join public.profiles rv on rv.id=r.reviewed_by
  order by case when r.status='pending' then 0 else 1 end, r.created_at desc;
end; $$;
revoke all on function public.attendance_admin_list_requests() from public;
grant execute on function public.attendance_admin_list_requests() to authenticated;

create or replace function public.attendance_admin_review_request(
  p_request_id uuid,
  p_status text,
  p_admin_note text default null
)
returns void
language plpgsql security definer set search_path=public
as $$
declare
  v_request public.attendance_employee_requests%rowtype;
  v_incident_id uuid;
begin
  perform public.attendance_assert_active_admin();
  if p_status not in ('approved','rejected') then raise exception 'Estado inválido.'; end if;
  if p_admin_note is not null and length(trim(p_admin_note)) > 0 and length(trim(p_admin_note)) < 3 then
    raise exception 'La nota administrativa debe tener al menos 3 caracteres.';
  end if;

  select * into v_request from public.attendance_employee_requests where id=p_request_id for update;
  if v_request.id is null then raise exception 'No se encontró la solicitud.'; end if;
  if v_request.status <> 'pending' then raise exception 'La solicitud ya fue resuelta o cancelada.'; end if;

  if p_status='approved' then
    insert into public.attendance_incidents(
      user_id,start_date,end_date,incident_type,status,note,admin_note,created_by,reviewed_by,reviewed_at
    ) values(
      v_request.user_id,v_request.start_date,v_request.end_date,v_request.request_type,'approved',v_request.note,
      nullif(trim(coalesce(p_admin_note,'')),''),auth.uid(),auth.uid(),now()
    ) returning id into v_incident_id;
  end if;

  update public.attendance_employee_requests
  set status=p_status,
      admin_note=nullif(trim(coalesce(p_admin_note,'')),''),
      incident_id=v_incident_id,
      reviewed_by=auth.uid(),reviewed_at=now(),updated_at=now()
  where id=p_request_id;
end; $$;
revoke all on function public.attendance_admin_review_request(uuid,text,text) from public;
grant execute on function public.attendance_admin_review_request(uuid,text,text) to authenticated;

create or replace function public.attendance_my_payroll_receipts()
returns table(
  payroll_run_id uuid,payroll_item_id uuid,start_date date,end_date date,run_status text,currency_code text,
  employee_name text,employee_role text,pay_basis text,base_rate numeric,scheduled_pay numeric,
  absence_deduction numeric,late_deduction numeric,early_leave_deduction numeric,overtime_pay numeric,total_pay numeric,
  payment_status text,paid_at timestamptz,payment_method text,payment_reference text,email_sent_at timestamptz
)
language sql security definer set search_path=public stable
as $$
  select r.id,i.id,r.start_date,r.end_date,r.status,r.currency_code,i.employee_name,i.employee_role,i.pay_basis,i.base_rate,
    i.scheduled_pay,i.absence_deduction,i.late_deduction,i.early_leave_deduction,i.overtime_pay,i.total_pay,
    i.payment_status,i.paid_at,i.payment_method,i.payment_reference,i.email_sent_at
  from public.attendance_payroll_run_items i
  join public.attendance_payroll_runs r on r.id=i.payroll_run_id
  where i.user_id=auth.uid() and r.status <> 'voided'
  order by r.end_date desc,r.created_at desc;
$$;
revoke all on function public.attendance_my_payroll_receipts() from public;
grant execute on function public.attendance_my_payroll_receipts() to authenticated;

commit;
