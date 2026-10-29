begin;

/* ============================================================
 * FASE 3 · INCIDENCIAS / JUSTIFICACIONES
 * ============================================================ */

create table if not exists public.attendance_incidents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  start_date date not null,
  end_date date not null,
  incident_type text not null,
  status text not null default 'approved',
  note text not null,
  admin_note text,
  created_by uuid not null references public.profiles(id),
  reviewed_by uuid references public.profiles(id),
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint attendance_incidents_dates_check check (end_date >= start_date),
  constraint attendance_incidents_range_check check ((end_date - start_date) <= 60),
  constraint attendance_incidents_type_check check (
    incident_type in (
      'absence_justified',
      'late_justified',
      'early_leave_justified',
      'permission',
      'vacation',
      'medical_leave',
      'other'
    )
  ),
  constraint attendance_incidents_status_check check (
    status in ('pending', 'approved', 'rejected', 'cancelled')
  ),
  constraint attendance_incidents_note_check check (
    length(trim(note)) between 3 and 500
  ),
  constraint attendance_incidents_admin_note_check check (
    admin_note is null or length(trim(admin_note)) between 3 and 500
  )
);

create index if not exists attendance_incidents_user_dates_idx
  on public.attendance_incidents(user_id, start_date desc, end_date desc);

create index if not exists attendance_incidents_status_idx
  on public.attendance_incidents(status, start_date desc);

alter table public.attendance_incidents enable row level security;

/* Lectura directa solo para el propio usuario; administración usa RPC. */
drop policy if exists attendance_incidents_select_own on public.attendance_incidents;
create policy attendance_incidents_select_own
on public.attendance_incidents
for select
to authenticated
using (user_id = auth.uid());

/* No insert/update/delete directo desde cliente. */
revoke insert, update, delete on public.attendance_incidents from authenticated;

create or replace function public.attendance_admin_list_incidents(
  p_start_date date default null,
  p_end_date date default null,
  p_user_id uuid default null
)
returns table (
  id uuid,
  user_id uuid,
  employee_name text,
  employee_role text,
  start_date date,
  end_date date,
  incident_type text,
  status text,
  note text,
  admin_note text,
  created_by uuid,
  created_by_name text,
  reviewed_by uuid,
  reviewed_by_name text,
  reviewed_at timestamptz,
  created_at timestamptz,
  updated_at timestamptz
)
language plpgsql
security definer
set search_path = public
stable
as $$
declare
  v_admin public.profiles%rowtype;
begin
  select * into v_admin from public.profiles where id = auth.uid();
  if v_admin.id is null or v_admin.role <> 'admin'::public.user_role or not coalesce(v_admin.is_active, false) then
    raise exception 'Solo un administrador activo puede consultar incidencias.';
  end if;

  if p_start_date is not null and p_end_date is not null and p_end_date < p_start_date then
    raise exception 'Rango de fechas inválido.';
  end if;

  return query
  select
    ai.id,
    ai.user_id,
    trim(concat_ws(' ', p.first_name, p.last_name)),
    p.role::text,
    ai.start_date,
    ai.end_date,
    ai.incident_type,
    ai.status,
    ai.note,
    ai.admin_note,
    ai.created_by,
    trim(concat_ws(' ', creator.first_name, creator.last_name)),
    ai.reviewed_by,
    case when reviewer.id is null then null else trim(concat_ws(' ', reviewer.first_name, reviewer.last_name)) end,
    ai.reviewed_at,
    ai.created_at,
    ai.updated_at
  from public.attendance_incidents ai
  join public.profiles p on p.id = ai.user_id
  join public.profiles creator on creator.id = ai.created_by
  left join public.profiles reviewer on reviewer.id = ai.reviewed_by
  where (p_user_id is null or ai.user_id = p_user_id)
    and (p_start_date is null or ai.end_date >= p_start_date)
    and (p_end_date is null or ai.start_date <= p_end_date)
  order by ai.start_date desc, ai.created_at desc;
end;
$$;

revoke all on function public.attendance_admin_list_incidents(date, date, uuid) from public;
grant execute on function public.attendance_admin_list_incidents(date, date, uuid) to authenticated;

create or replace function public.attendance_admin_create_incident(
  p_user_id uuid,
  p_start_date date,
  p_end_date date,
  p_incident_type text,
  p_note text,
  p_status text default 'approved',
  p_admin_note text default null
)
returns public.attendance_incidents
language plpgsql
security definer
set search_path = public
as $$
declare
  v_admin public.profiles%rowtype;
  v_row public.attendance_incidents%rowtype;
begin
  select * into v_admin from public.profiles where id = auth.uid();
  if v_admin.id is null or v_admin.role <> 'admin'::public.user_role or not coalesce(v_admin.is_active, false) then
    raise exception 'Solo un administrador activo puede registrar incidencias.';
  end if;

  if not exists (select 1 from public.profiles p where p.id = p_user_id) then
    raise exception 'No se encontró el empleado.';
  end if;

  if p_start_date is null or p_end_date is null or p_end_date < p_start_date then
    raise exception 'Rango de fechas inválido.';
  end if;
  if (p_end_date - p_start_date) > 60 then
    raise exception 'Una incidencia no puede abarcar más de 61 días.';
  end if;
  if p_incident_type not in ('absence_justified','late_justified','early_leave_justified','permission','vacation','medical_leave','other') then
    raise exception 'Tipo de incidencia inválido.';
  end if;
  if coalesce(p_status, 'approved') not in ('pending','approved','rejected','cancelled') then
    raise exception 'Estado de incidencia inválido.';
  end if;
  if length(trim(coalesce(p_note, ''))) < 3 then
    raise exception 'La descripción de la incidencia es obligatoria.';
  end if;
  if p_admin_note is not null and length(trim(p_admin_note)) < 3 then
    raise exception 'La nota administrativa debe tener al menos 3 caracteres.';
  end if;

  insert into public.attendance_incidents(
    user_id, start_date, end_date, incident_type, status, note, admin_note,
    created_by, reviewed_by, reviewed_at
  ) values (
    p_user_id, p_start_date, p_end_date, p_incident_type, coalesce(p_status, 'approved'),
    trim(p_note), nullif(trim(coalesce(p_admin_note, '')), ''), auth.uid(),
    case when coalesce(p_status, 'approved') in ('approved','rejected') then auth.uid() else null end,
    case when coalesce(p_status, 'approved') in ('approved','rejected') then now() else null end
  ) returning * into v_row;

  return v_row;
end;
$$;

revoke all on function public.attendance_admin_create_incident(uuid, date, date, text, text, text, text) from public;
grant execute on function public.attendance_admin_create_incident(uuid, date, date, text, text, text, text) to authenticated;

create or replace function public.attendance_admin_review_incident(
  p_incident_id uuid,
  p_status text,
  p_admin_note text default null
)
returns public.attendance_incidents
language plpgsql
security definer
set search_path = public
as $$
declare
  v_admin public.profiles%rowtype;
  v_row public.attendance_incidents%rowtype;
begin
  select * into v_admin from public.profiles where id = auth.uid();
  if v_admin.id is null or v_admin.role <> 'admin'::public.user_role or not coalesce(v_admin.is_active, false) then
    raise exception 'Solo un administrador activo puede resolver incidencias.';
  end if;

  if p_status not in ('pending','approved','rejected','cancelled') then
    raise exception 'Estado de incidencia inválido.';
  end if;

  if p_admin_note is not null and length(trim(p_admin_note)) > 0 and length(trim(p_admin_note)) < 3 then
    raise exception 'La nota administrativa debe tener al menos 3 caracteres.';
  end if;

  update public.attendance_incidents
  set
    status = p_status,
    admin_note = nullif(trim(coalesce(p_admin_note, admin_note, '')), ''),
    reviewed_by = case when p_status in ('approved','rejected') then auth.uid() else reviewed_by end,
    reviewed_at = case when p_status in ('approved','rejected') then now() else reviewed_at end,
    updated_at = now()
  where id = p_incident_id
  returning * into v_row;

  if v_row.id is null then
    raise exception 'No se encontró la incidencia.';
  end if;

  return v_row;
end;
$$;

revoke all on function public.attendance_admin_review_incident(uuid, text, text) from public;
grant execute on function public.attendance_admin_review_incident(uuid, text, text) to authenticated;

/* ============================================================
 * RESUMEN DIARIO CON JUSTIFICACIONES
 * Mantiene datos reales de retardo/salida/extra y agrega el
 * estado justificado sin borrar las métricas originales.
 * ============================================================ */
drop function if exists public.attendance_admin_daily_summary(date, date);
create function public.attendance_admin_daily_summary(
  p_start_date date,
  p_end_date date
)
returns table (
  work_date date,
  user_id uuid,
  employee_name text,
  employee_role text,
  expected_start timestamptz,
  expected_end timestamptz,
  clock_in timestamptz,
  clock_out timestamptz,
  late_minutes integer,
  early_leave_minutes integer,
  overtime_minutes integer,
  day_status text,
  incident_id uuid,
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
  select * into v_admin from public.profiles where id = auth.uid();
  if v_admin.id is null or v_admin.role <> 'admin'::public.user_role or not coalesce(v_admin.is_active, false) then
    raise exception 'Solo un administrador activo puede consultar incidencias.';
  end if;

  if p_start_date is null or p_end_date is null or p_end_date < p_start_date then
    raise exception 'Rango de fechas inválido.';
  end if;
  if (p_end_date - p_start_date) > 31 then raise exception 'El rango máximo es de 31 días.'; end if;

  select coalesce(bs.timezone, 'America/Mexico_City') into v_timezone from public.business_settings bs where bs.id = 1;
  v_timezone := coalesce(v_timezone, 'America/Mexico_City');
  v_local_today := timezone(v_timezone, now())::date;
  select * into v_settings from public.attendance_settings where id = 1;

  return query
  select
    d.work_date,
    p.id,
    trim(concat_ws(' ', p.first_name, p.last_name)),
    p.role::text,
    es.scheduled_start,
    es.scheduled_end,
    ar.clock_in,
    ar.clock_out,
    coalesce(ar.late_minutes, 0),
    coalesce(ar.early_leave_minutes, 0),
    coalesce(ar.overtime_minutes, 0),
    case
      when inc.id is not null and inc.status = 'approved' and inc.incident_type in ('vacation','medical_leave','permission','absence_justified') and ar.id is null
        then inc.incident_type
      when inc.id is not null and inc.status = 'approved' and inc.incident_type = 'late_justified' and coalesce(ar.late_minutes,0) > 0
        then 'late_justified'
      when inc.id is not null and inc.status = 'approved' and inc.incident_type = 'early_leave_justified' and coalesce(ar.early_leave_minutes,0) > 0
        then 'early_leave_justified'
      when not coalesce(es.is_working, false) then 'off'
      when ar.id is not null and ar.clock_out is null then 'working'
      when ar.id is not null then 'completed'
      when d.work_date < v_local_today then 'absent'
      when d.work_date = v_local_today and es.scheduled_end is not null
        and now() >= (es.scheduled_end + make_interval(mins => coalesce(v_settings.after_close_grace_minutes, 60))) then 'absent'
      when d.work_date = v_local_today and es.scheduled_start is not null and now() >= es.scheduled_start then 'pending_entry'
      else 'scheduled'
    end,
    inc.id,
    inc.incident_type,
    inc.status,
    inc.note
  from generate_series(p_start_date, p_end_date, interval '1 day') g(day_value)
  cross join lateral (select g.day_value::date as work_date) d
  cross join public.profiles p
  cross join lateral public.attendance_effective_employee_schedule(p.id, d.work_date) es
  left join lateral (
    select r.* from public.attendance_records r
    where r.user_id = p.id and r.schedule_date = d.work_date
    order by r.clock_in asc limit 1
  ) ar on true
  left join lateral (
    select ai.*
    from public.attendance_incidents ai
    where ai.user_id = p.id
      and d.work_date between ai.start_date and ai.end_date
      and ai.status <> 'cancelled'
    order by
      case ai.status when 'approved' then 0 when 'pending' then 1 else 2 end,
      ai.created_at desc
    limit 1
  ) inc on true
  where coalesce(p.is_active, false)
  order by d.work_date desc, trim(concat_ws(' ', p.first_name, p.last_name));
end;
$$;

revoke all on function public.attendance_admin_daily_summary(date, date) from public;
grant execute on function public.attendance_admin_daily_summary(date, date) to authenticated;

commit;
