begin;

/* ============================================================
 * FASE 11 · AUDITORÍA Y CIERRE OPERATIVO
 * ============================================================ */

create table if not exists public.attendance_period_locks (
  id uuid primary key default gen_random_uuid(),
  start_date date not null,
  end_date date not null,
  reason text not null,
  is_locked boolean not null default true,
  locked_by uuid not null references public.profiles(id),
  locked_at timestamptz not null default now(),
  reopened_by uuid references public.profiles(id),
  reopened_at timestamptz,
  reopen_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint attendance_period_locks_dates_check check (end_date >= start_date),
  constraint attendance_period_locks_reason_check check (length(trim(reason)) between 3 and 500),
  constraint attendance_period_locks_reopen_reason_check check (
    reopen_reason is null or length(trim(reopen_reason)) between 3 and 500
  )
);

create index if not exists attendance_period_locks_dates_idx
  on public.attendance_period_locks(start_date desc, end_date desc);
create index if not exists attendance_period_locks_locked_idx
  on public.attendance_period_locks(is_locked, start_date desc, end_date desc);

alter table public.attendance_period_locks enable row level security;
revoke insert, update, delete on public.attendance_period_locks from authenticated;

drop policy if exists attendance_period_locks_select_admin on public.attendance_period_locks;
create policy attendance_period_locks_select_admin
on public.attendance_period_locks
for select
to authenticated
using (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'admin'::public.user_role
      and coalesce(p.is_active, false)
  )
);

create table if not exists public.attendance_audit_log (
  id bigserial primary key,
  occurred_at timestamptz not null default now(),
  actor_user_id uuid references public.profiles(id) on delete set null,
  entity_type text not null,
  entity_id text,
  action text not null,
  work_date date,
  employee_user_id uuid references public.profiles(id) on delete set null,
  reason text,
  old_data jsonb,
  new_data jsonb,
  metadata jsonb not null default '{}'::jsonb
);

create index if not exists attendance_audit_log_occurred_idx
  on public.attendance_audit_log(occurred_at desc);
create index if not exists attendance_audit_log_entity_idx
  on public.attendance_audit_log(entity_type, entity_id, occurred_at desc);
create index if not exists attendance_audit_log_employee_idx
  on public.attendance_audit_log(employee_user_id, occurred_at desc);

alter table public.attendance_audit_log enable row level security;
revoke all on public.attendance_audit_log from authenticated;

create or replace function public.attendance_audit_write(
  p_entity_type text,
  p_entity_id text,
  p_action text,
  p_work_date date default null,
  p_employee_user_id uuid default null,
  p_reason text default null,
  p_old_data jsonb default null,
  p_new_data jsonb default null,
  p_metadata jsonb default '{}'::jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.attendance_audit_log(
    actor_user_id,
    entity_type,
    entity_id,
    action,
    work_date,
    employee_user_id,
    reason,
    old_data,
    new_data,
    metadata
  ) values (
    auth.uid(),
    coalesce(nullif(trim(p_entity_type), ''), 'unknown'),
    p_entity_id,
    coalesce(nullif(trim(p_action), ''), 'unknown'),
    p_work_date,
    p_employee_user_id,
    nullif(trim(coalesce(p_reason, '')), ''),
    p_old_data,
    p_new_data,
    coalesce(p_metadata, '{}'::jsonb)
  );
end;
$$;

revoke all on function public.attendance_audit_write(text,text,text,date,uuid,text,jsonb,jsonb,jsonb) from public;

create or replace function public.attendance_is_range_locked(
  p_start_date date,
  p_end_date date
)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.attendance_period_locks l
    where l.is_locked
      and l.start_date <= p_end_date
      and l.end_date >= p_start_date
  );
$$;

revoke all on function public.attendance_is_range_locked(date,date) from public;
grant execute on function public.attendance_is_range_locked(date,date) to authenticated;

create or replace function public.attendance_assert_range_unlocked(
  p_start_date date,
  p_end_date date,
  p_action text default 'modificar asistencia'
)
returns void
language plpgsql
security definer
set search_path = public
stable
as $$
declare
  v_lock public.attendance_period_locks%rowtype;
begin
  if p_start_date is null or p_end_date is null then
    return;
  end if;

  select l.*
  into v_lock
  from public.attendance_period_locks l
  where l.is_locked
    and l.start_date <= p_end_date
    and l.end_date >= p_start_date
  order by l.locked_at desc
  limit 1;

  if v_lock.id is not null then
    raise exception 'El periodo % a % está cerrado. No se puede %.',
      to_char(v_lock.start_date, 'YYYY-MM-DD'),
      to_char(v_lock.end_date, 'YYYY-MM-DD'),
      coalesce(nullif(trim(p_action), ''), 'modificar asistencia');
  end if;
end;
$$;

revoke all on function public.attendance_assert_range_unlocked(date,date,text) from public;
grant execute on function public.attendance_assert_range_unlocked(date,date,text) to authenticated;

create or replace function public.attendance_admin_lock_period(
  p_start_date date,
  p_end_date date,
  p_reason text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_timezone text := 'America/Mexico_City';
  v_today date;
  v_id uuid;
begin
  perform public.attendance_assert_active_admin();

  if p_start_date is null or p_end_date is null or p_end_date < p_start_date then
    raise exception 'Rango de fechas inválido.';
  end if;
  if (p_end_date - p_start_date) > 366 then
    raise exception 'Un cierre no puede abarcar más de 367 días.';
  end if;
  if length(trim(coalesce(p_reason, ''))) < 3 then
    raise exception 'El motivo del cierre es obligatorio.';
  end if;

  select coalesce(bs.timezone, 'America/Mexico_City')
  into v_timezone
  from public.business_settings bs
  where bs.id = 1;

  v_today := (now() at time zone v_timezone)::date;
  if p_end_date >= v_today then
    raise exception 'Solo puedes cerrar periodos que ya terminaron.';
  end if;

  if public.attendance_is_range_locked(p_start_date, p_end_date) then
    raise exception 'El rango seleccionado se cruza con un periodo que ya está cerrado.';
  end if;

  insert into public.attendance_period_locks(
    start_date,end_date,reason,locked_by
  ) values (
    p_start_date,p_end_date,left(trim(p_reason),500),auth.uid()
  ) returning id into v_id;

  perform public.attendance_audit_write(
    'period_lock',
    v_id::text,
    'lock',
    p_end_date,
    null,
    p_reason,
    null,
    jsonb_build_object('start_date',p_start_date,'end_date',p_end_date,'is_locked',true),
    '{}'::jsonb
  );

  return v_id;
end;
$$;

revoke all on function public.attendance_admin_lock_period(date,date,text) from public;
grant execute on function public.attendance_admin_lock_period(date,date,text) to authenticated;

create or replace function public.attendance_admin_reopen_period(
  p_lock_id uuid,
  p_reason text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_lock public.attendance_period_locks%rowtype;
begin
  perform public.attendance_assert_active_admin();

  if length(trim(coalesce(p_reason, ''))) < 3 then
    raise exception 'El motivo de reapertura es obligatorio.';
  end if;

  select l.* into v_lock
  from public.attendance_period_locks l
  where l.id = p_lock_id
  for update;

  if v_lock.id is null then
    raise exception 'No se encontró el cierre.';
  end if;
  if not v_lock.is_locked then
    raise exception 'Este periodo ya está reabierto.';
  end if;

  update public.attendance_period_locks l
  set is_locked = false,
      reopened_by = auth.uid(),
      reopened_at = now(),
      reopen_reason = left(trim(p_reason),500),
      updated_at = now()
  where l.id = p_lock_id;

  perform public.attendance_audit_write(
    'period_lock',
    p_lock_id::text,
    'reopen',
    v_lock.end_date,
    null,
    p_reason,
    jsonb_build_object('start_date',v_lock.start_date,'end_date',v_lock.end_date,'is_locked',true),
    jsonb_build_object('start_date',v_lock.start_date,'end_date',v_lock.end_date,'is_locked',false),
    '{}'::jsonb
  );
end;
$$;

revoke all on function public.attendance_admin_reopen_period(uuid,text) from public;
grant execute on function public.attendance_admin_reopen_period(uuid,text) to authenticated;

create or replace function public.attendance_admin_list_period_locks()
returns table(
  id uuid,
  start_date date,
  end_date date,
  reason text,
  is_locked boolean,
  locked_by_name text,
  locked_at timestamptz,
  reopened_by_name text,
  reopened_at timestamptz,
  reopen_reason text
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
    l.id,
    l.start_date,
    l.end_date,
    l.reason,
    l.is_locked,
    trim(concat_ws(' ',lb.first_name,lb.last_name))::text,
    l.locked_at,
    case when rb.id is null then null else trim(concat_ws(' ',rb.first_name,rb.last_name))::text end,
    l.reopened_at,
    l.reopen_reason
  from public.attendance_period_locks l
  join public.profiles lb on lb.id = l.locked_by
  left join public.profiles rb on rb.id = l.reopened_by
  order by l.created_at desc;
end;
$$;

revoke all on function public.attendance_admin_list_period_locks() from public;
grant execute on function public.attendance_admin_list_period_locks() to authenticated;

create or replace function public.attendance_admin_audit_log(
  p_start_at timestamptz default null,
  p_end_at timestamptz default null,
  p_employee_user_id uuid default null,
  p_entity_type text default null,
  p_limit integer default 500
)
returns table(
  id bigint,
  occurred_at timestamptz,
  actor_user_id uuid,
  actor_name text,
  entity_type text,
  entity_id text,
  action text,
  work_date date,
  employee_user_id uuid,
  employee_name text,
  reason text,
  old_data jsonb,
  new_data jsonb,
  metadata jsonb
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
    a.id,
    a.occurred_at,
    a.actor_user_id,
    case when ap.id is null then 'Sistema' else trim(concat_ws(' ',ap.first_name,ap.last_name))::text end,
    a.entity_type,
    a.entity_id,
    a.action,
    a.work_date,
    a.employee_user_id,
    case when ep.id is null then null else trim(concat_ws(' ',ep.first_name,ep.last_name))::text end,
    a.reason,
    a.old_data,
    a.new_data,
    a.metadata
  from public.attendance_audit_log a
  left join public.profiles ap on ap.id = a.actor_user_id
  left join public.profiles ep on ep.id = a.employee_user_id
  where (p_start_at is null or a.occurred_at >= p_start_at)
    and (p_end_at is null or a.occurred_at <= p_end_at)
    and (p_employee_user_id is null or a.employee_user_id = p_employee_user_id)
    and (p_entity_type is null or a.entity_type = p_entity_type)
  order by a.occurred_at desc
  limit greatest(1, least(coalesce(p_limit,500), 2000));
end;
$$;

revoke all on function public.attendance_admin_audit_log(timestamptz,timestamptz,uuid,text,integer) from public;
grant execute on function public.attendance_admin_audit_log(timestamptz,timestamptz,uuid,text,integer) to authenticated;

/* ------------------------------------------------------------
 * Auditoría genérica de tablas del módulo
 * ------------------------------------------------------------ */
create or replace function public.attendance_audit_row_trigger()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_old jsonb;
  v_new jsonb;
  v_row jsonb;
  v_entity_id text;
  v_employee uuid;
  v_work_date date;
  v_action text;
begin
  v_old := case when tg_op in ('UPDATE','DELETE') then to_jsonb(old) else null end;
  v_new := case when tg_op in ('INSERT','UPDATE') then to_jsonb(new) else null end;
  v_row := coalesce(v_new, v_old, '{}'::jsonb);
  v_entity_id := v_row ->> 'id';
  v_employee := nullif(v_row ->> 'user_id','')::uuid;
  v_work_date := coalesce(
    nullif(v_row ->> 'schedule_date','')::date,
    nullif(v_row ->> 'start_date','')::date
  );
  v_action := lower(tg_op);

  perform public.attendance_audit_write(
    tg_table_name,
    v_entity_id,
    v_action,
    v_work_date,
    v_employee,
    null,
    v_old,
    v_new,
    jsonb_build_object('schema',tg_table_schema)
  );

  return case when tg_op = 'DELETE' then old else new end;
end;
$$;

/* ------------------------------------------------------------
 * Protección de periodos cerrados
 * ------------------------------------------------------------ */
create or replace function public.attendance_lock_guard_records()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_timezone text := 'America/Mexico_City';
  v_date date;
  v_row jsonb;
begin
  v_row := case when tg_op = 'DELETE' then to_jsonb(old) else to_jsonb(new) end;
  select coalesce(bs.timezone,'America/Mexico_City') into v_timezone
  from public.business_settings bs where bs.id = 1;

  v_date := coalesce(
    nullif(v_row ->> 'schedule_date','')::date,
    ((nullif(v_row ->> 'clock_in','')::timestamptz) at time zone v_timezone)::date
  );

  perform public.attendance_assert_range_unlocked(v_date,v_date,'modificar una checada de ese periodo');
  return case when tg_op = 'DELETE' then old else new end;
end;
$$;

create or replace function public.attendance_lock_guard_range()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row jsonb;
  v_start date;
  v_end date;
begin
  v_row := case when tg_op = 'DELETE' then to_jsonb(old) else to_jsonb(new) end;
  v_start := nullif(v_row ->> 'start_date','')::date;
  v_end := nullif(v_row ->> 'end_date','')::date;
  perform public.attendance_assert_range_unlocked(v_start,v_end,'modificar una incidencia o solicitud de ese periodo');
  return case when tg_op = 'DELETE' then old else new end;
end;
$$;

/* Triggers base */
drop trigger if exists trg_attendance_records_period_guard on public.attendance_records;
create trigger trg_attendance_records_period_guard
before insert or update or delete on public.attendance_records
for each row execute function public.attendance_lock_guard_records();

drop trigger if exists trg_attendance_records_audit on public.attendance_records;
create trigger trg_attendance_records_audit
after insert or update or delete on public.attendance_records
for each row execute function public.attendance_audit_row_trigger();

drop trigger if exists trg_attendance_corrections_audit on public.attendance_corrections;
create trigger trg_attendance_corrections_audit
after insert or update or delete on public.attendance_corrections
for each row execute function public.attendance_audit_row_trigger();

drop trigger if exists trg_attendance_incidents_period_guard on public.attendance_incidents;
create trigger trg_attendance_incidents_period_guard
before insert or update or delete on public.attendance_incidents
for each row execute function public.attendance_lock_guard_range();

drop trigger if exists trg_attendance_incidents_audit on public.attendance_incidents;
create trigger trg_attendance_incidents_audit
after insert or update or delete on public.attendance_incidents
for each row execute function public.attendance_audit_row_trigger();

drop trigger if exists trg_attendance_employee_requests_period_guard on public.attendance_employee_requests;
create trigger trg_attendance_employee_requests_period_guard
before insert or update or delete on public.attendance_employee_requests
for each row execute function public.attendance_lock_guard_range();

drop trigger if exists trg_attendance_employee_requests_audit on public.attendance_employee_requests;
create trigger trg_attendance_employee_requests_audit
after insert or update or delete on public.attendance_employee_requests
for each row execute function public.attendance_audit_row_trigger();

/* Auditoría de nómina: se agrega solo si las tablas existen. */
do $$
begin
  if to_regclass('public.attendance_payroll_runs') is not null then
    execute 'drop trigger if exists trg_attendance_payroll_runs_audit on public.attendance_payroll_runs';
    execute 'create trigger trg_attendance_payroll_runs_audit after insert or update or delete on public.attendance_payroll_runs for each row execute function public.attendance_audit_row_trigger()';
  end if;
  if to_regclass('public.attendance_payroll_run_items') is not null then
    execute 'drop trigger if exists trg_attendance_payroll_items_audit on public.attendance_payroll_run_items';
    execute 'create trigger trg_attendance_payroll_items_audit after insert or update or delete on public.attendance_payroll_run_items for each row execute function public.attendance_audit_row_trigger()';
  end if;
end;
$$;

commit;
