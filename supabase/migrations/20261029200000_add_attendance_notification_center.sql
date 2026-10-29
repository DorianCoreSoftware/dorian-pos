begin;

/* ============================================================
 * FASE 9 · CENTRO DE NOTIFICACIONES LABORALES
 * ============================================================ */

create table if not exists public.attendance_notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_user_id uuid not null references public.profiles(id) on delete cascade,
  notification_type text not null,
  title text not null,
  message text not null,
  severity text not null default 'info',
  related_user_id uuid references public.profiles(id) on delete set null,
  request_id uuid references public.attendance_employee_requests(id) on delete set null,
  payroll_item_id uuid references public.attendance_payroll_run_items(id) on delete set null,
  attendance_record_id uuid references public.attendance_records(id) on delete set null,
  work_date date,
  dedup_key text,
  read_at timestamptz,
  pushed_at timestamptz,
  push_last_error text,
  created_at timestamptz not null default now(),
  constraint attendance_notifications_severity_check
    check (severity in ('info','success','warning','danger'))
);

create index if not exists attendance_notifications_recipient_idx
  on public.attendance_notifications(recipient_user_id, created_at desc);
create index if not exists attendance_notifications_unread_idx
  on public.attendance_notifications(recipient_user_id, read_at, created_at desc);
create unique index if not exists attendance_notifications_dedup_idx
  on public.attendance_notifications(recipient_user_id, dedup_key)
  where dedup_key is not null;

alter table public.attendance_notifications enable row level security;

drop policy if exists attendance_notifications_select_own on public.attendance_notifications;
create policy attendance_notifications_select_own
on public.attendance_notifications
for select to authenticated
using (recipient_user_id = auth.uid());

revoke insert, update, delete on public.attendance_notifications from authenticated;

create or replace function public.attendance_enqueue_notification(
  p_recipient_user_id uuid,
  p_notification_type text,
  p_title text,
  p_message text,
  p_severity text default 'info',
  p_related_user_id uuid default null,
  p_request_id uuid default null,
  p_payroll_item_id uuid default null,
  p_attendance_record_id uuid default null,
  p_work_date date default null,
  p_dedup_key text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  if p_recipient_user_id is null then
    return null;
  end if;

  insert into public.attendance_notifications(
    recipient_user_id, notification_type, title, message, severity,
    related_user_id, request_id, payroll_item_id, attendance_record_id,
    work_date, dedup_key
  ) values (
    p_recipient_user_id,
    left(coalesce(p_notification_type,'general'),80),
    left(coalesce(p_title,'Notificación'),160),
    left(coalesce(p_message,''),1000),
    case when p_severity in ('info','success','warning','danger') then p_severity else 'info' end,
    p_related_user_id,p_request_id,p_payroll_item_id,p_attendance_record_id,
    p_work_date,nullif(trim(coalesce(p_dedup_key,'')),'')
  )
  on conflict do nothing
  returning id into v_id;

  if v_id is null and p_dedup_key is not null then
    select n.id into v_id
    from public.attendance_notifications n
    where n.recipient_user_id=p_recipient_user_id
      and n.dedup_key=p_dedup_key
    order by n.created_at desc
    limit 1;
  end if;

  return v_id;
end;
$$;
revoke all on function public.attendance_enqueue_notification(uuid,text,text,text,text,uuid,uuid,uuid,uuid,date,text) from public;

/* Solicitud nueva -> aviso a administradores activos. */
create or replace function public.attendance_notify_request_insert()
returns trigger
language plpgsql
security definer
set search_path=public
as $$
declare
  v_admin record;
  v_employee_name text;
begin
  select trim(concat_ws(' ',p.first_name,p.last_name))
  into v_employee_name
  from public.profiles p where p.id=new.user_id;

  for v_admin in
    select p.id from public.profiles p
    where p.role::text='admin' and coalesce(p.is_active,false)=true
  loop
    perform public.attendance_enqueue_notification(
      v_admin.id,
      'employee_request_new',
      'Nueva solicitud de empleado',
      coalesce(v_employee_name,'Empleado') || ' envió una solicitud que requiere revisión.',
      'info',new.user_id,new.id,null,null,new.start_date,
      'request_new:'||new.id::text
    );
  end loop;
  return new;
end;
$$;

drop trigger if exists attendance_employee_requests_notify_insert on public.attendance_employee_requests;
create trigger attendance_employee_requests_notify_insert
after insert on public.attendance_employee_requests
for each row execute function public.attendance_notify_request_insert();

/* Resolución -> aviso al empleado. */
create or replace function public.attendance_notify_request_status()
returns trigger
language plpgsql
security definer
set search_path=public
as $$
begin
  if new.status is distinct from old.status and new.status in ('approved','rejected') then
    perform public.attendance_enqueue_notification(
      new.user_id,
      case when new.status='approved' then 'employee_request_approved' else 'employee_request_rejected' end,
      case when new.status='approved' then 'Solicitud aprobada' else 'Solicitud rechazada' end,
      case when new.status='approved'
        then 'Tu solicitud fue aprobada. Puedes consultar el detalle en Mi expediente.'
        else 'Tu solicitud fue rechazada. Puedes consultar la respuesta en Mi expediente.' end,
      case when new.status='approved' then 'success' else 'warning' end,
      new.user_id,new.id,null,null,new.start_date,
      'request_status:'||new.id::text||':'||new.status
    );
  end if;
  return new;
end;
$$;

drop trigger if exists attendance_employee_requests_notify_status on public.attendance_employee_requests;
create trigger attendance_employee_requests_notify_status
after update of status on public.attendance_employee_requests
for each row execute function public.attendance_notify_request_status();

/* Pago individual -> aviso al empleado. */
create or replace function public.attendance_notify_payroll_paid()
returns trigger
language plpgsql
security definer
set search_path=public
as $$
declare
  v_start date;
  v_end date;
begin
  if new.payment_status='paid' and old.payment_status is distinct from new.payment_status then
    select r.start_date,r.end_date into v_start,v_end
    from public.attendance_payroll_runs r where r.id=new.payroll_run_id;

    perform public.attendance_enqueue_notification(
      new.user_id,
      'payroll_paid',
      'Pago de nómina registrado',
      'Tu pago de nómina del periodo '||coalesce(v_start::text,'')||' a '||coalesce(v_end::text,'')||' fue registrado. Tu recibo ya está disponible.',
      'success',new.user_id,null,new.id,null,v_end,
      'payroll_paid:'||new.id::text
    );
  end if;
  return new;
end;
$$;

drop trigger if exists attendance_payroll_item_notify_paid on public.attendance_payroll_run_items;
create trigger attendance_payroll_item_notify_paid
after update of payment_status on public.attendance_payroll_run_items
for each row execute function public.attendance_notify_payroll_paid();

/* Genera avisos operativos actuales para el usuario y, si es admin, su equipo. */
create or replace function public.attendance_sync_notifications()
returns void
language plpgsql
security definer
set search_path=public
as $$
declare
  v_profile public.profiles%rowtype;
  v_status record;
  v_timezone text;
  v_local_date date;
  v_late integer := 10;
  v_grace integer := 60;
  v_emp record;
  v_schedule record;
begin
  select * into v_profile from public.profiles where id=auth.uid();
  if v_profile.id is null or not coalesce(v_profile.is_active,false) then
    raise exception 'Usuario no disponible.';
  end if;

  select * into v_status from public.attendance_get_status();

  if coalesce(v_status.needs_clock_in_reminder,false) then
    perform public.attendance_enqueue_notification(
      auth.uid(),'clock_in_pending','Entrada pendiente',
      'Estás dentro de tu horario y todavía no has registrado tu entrada.',
      'warning',auth.uid(),null,null,null,v_status.schedule_date,
      'clock_in_pending:'||coalesce(v_status.schedule_date::text,'sin-fecha')
    );
  end if;

  if coalesce(v_status.needs_clock_out_reminder,false) then
    perform public.attendance_enqueue_notification(
      auth.uid(),'clock_out_pending','Salida pendiente',
      'Tu jornada continúa abierta después del horario esperado. Registra tu salida cuando termines.',
      'warning',auth.uid(),null,null,v_status.open_attendance_id,null,v_status.schedule_date,
      'clock_out_pending:'||coalesce(v_status.open_attendance_id::text,'sin-registro')
    );
  end if;

  if v_profile.role::text <> 'admin' then
    return;
  end if;

  select coalesce(bs.timezone,'America/Mexico_City') into v_timezone
  from public.business_settings bs where bs.id=1;
  v_timezone := coalesce(v_timezone,'America/Mexico_City');
  v_local_date := timezone(v_timezone,now())::date;

  select coalesce(s.late_tolerance_minutes,10),coalesce(s.after_close_grace_minutes,60)
  into v_late,v_grace
  from public.attendance_settings s where s.id=1;

  /* Jornadas abiertas demasiado tiempo. */
  for v_emp in
    select ar.id,ar.user_id,ar.schedule_date,ar.scheduled_end,
           trim(concat_ws(' ',p.first_name,p.last_name)) as employee_name
    from public.attendance_records ar
    join public.profiles p on p.id=ar.user_id
    where ar.clock_out is null
      and ar.scheduled_end is not null
      and now() > ar.scheduled_end + make_interval(mins=>v_grace)
      and coalesce(p.is_active,false)=true
  loop
    perform public.attendance_enqueue_notification(
      auth.uid(),'admin_open_shift','Jornada abierta fuera de horario',
      coalesce(v_emp.employee_name,'Empleado')||' todavía tiene una jornada abierta.',
      'danger',v_emp.user_id,null,null,v_emp.id,v_emp.schedule_date,
      'admin_open_shift:'||v_emp.id::text
    );
  end loop;

  /* Empleados cuyo horario inició y todavía no checan. */
  for v_emp in
    select p.id as user_id,trim(concat_ws(' ',p.first_name,p.last_name)) as employee_name
    from public.profiles p
    where coalesce(p.is_active,false)=true and p.id<>auth.uid()
  loop
    select * into v_schedule
    from public.attendance_effective_employee_schedule(v_emp.user_id,v_local_date);

    if coalesce(v_schedule.is_working,false)
       and v_schedule.scheduled_start is not null
       and v_schedule.scheduled_end is not null
       and now() > v_schedule.scheduled_start + make_interval(mins=>v_late)
       and now() < v_schedule.scheduled_end
       and not exists(
         select 1 from public.attendance_records ar
         where ar.user_id=v_emp.user_id and ar.schedule_date=v_local_date
       ) then
      perform public.attendance_enqueue_notification(
        auth.uid(),'admin_missing_clock_in','Empleado sin entrada',
        coalesce(v_emp.employee_name,'Empleado')||' ya debía iniciar turno y aún no registra entrada.',
        'warning',v_emp.user_id,null,null,null,v_local_date,
        'admin_missing_clock_in:'||v_emp.user_id::text||':'||v_local_date::text
      );
    end if;
  end loop;
end;
$$;
revoke all on function public.attendance_sync_notifications() from public;
grant execute on function public.attendance_sync_notifications() to authenticated;

create or replace function public.attendance_my_notifications(p_limit integer default 80)
returns table(
  id uuid,notification_type text,title text,message text,severity text,
  related_user_id uuid,request_id uuid,payroll_item_id uuid,attendance_record_id uuid,
  work_date date,read_at timestamptz,pushed_at timestamptz,created_at timestamptz
)
language sql
security definer
set search_path=public
stable
as $$
  select n.id,n.notification_type,n.title,n.message,n.severity,n.related_user_id,
         n.request_id,n.payroll_item_id,n.attendance_record_id,n.work_date,n.read_at,n.pushed_at,n.created_at
  from public.attendance_notifications n
  where n.recipient_user_id=auth.uid()
  order by n.created_at desc
  limit least(greatest(coalesce(p_limit,80),1),200);
$$;
revoke all on function public.attendance_my_notifications(integer) from public;
grant execute on function public.attendance_my_notifications(integer) to authenticated;

create or replace function public.attendance_mark_notification_read(p_notification_id uuid)
returns void
language plpgsql security definer set search_path=public
as $$
begin
  update public.attendance_notifications
  set read_at=coalesce(read_at,now())
  where id=p_notification_id and recipient_user_id=auth.uid();
end; $$;
revoke all on function public.attendance_mark_notification_read(uuid) from public;
grant execute on function public.attendance_mark_notification_read(uuid) to authenticated;

create or replace function public.attendance_mark_all_notifications_read()
returns void
language plpgsql security definer set search_path=public
as $$
begin
  update public.attendance_notifications set read_at=coalesce(read_at,now())
  where recipient_user_id=auth.uid() and read_at is null;
end; $$;
revoke all on function public.attendance_mark_all_notifications_read() from public;
grant execute on function public.attendance_mark_all_notifications_read() to authenticated;

commit;
