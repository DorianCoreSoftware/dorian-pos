begin;

/* ============================================================
 * HOTFIX 9.1
 * - Evita conflicto PL/pgSQL entre columnas de salida `id`
 *   y public.profiles.id.
 * - Endurece referencias ambiguas relacionadas.
 * ============================================================ */

create or replace function public.attendance_admin_list(p_limit integer default 250)
returns table (
  id uuid,
  user_id uuid,
  clock_in timestamptz,
  clock_out timestamptz,
  created_at timestamptz,
  updated_at timestamptz,
  employee_name text,
  employee_role text,
  schedule_date date,
  scheduled_start timestamptz,
  scheduled_end timestamptz,
  schedule_source text,
  late_minutes integer,
  early_leave_minutes integer,
  overtime_minutes integer,
  attendance_result text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_admin public.profiles%rowtype;
begin
  select p.*
  into v_admin
  from public.profiles p
  where p.id = auth.uid();

  if v_admin.id is null
     or v_admin.role <> 'admin'::public.user_role
     or not coalesce(v_admin.is_active, false)
  then
    raise exception 'Solo un administrador activo puede consultar este historial.';
  end if;

  return query
  select
    ar.id,
    ar.user_id,
    ar.clock_in,
    ar.clock_out,
    ar.created_at,
    ar.updated_at,
    trim(concat_ws(' ', p.first_name, p.last_name)),
    p.role::text,
    ar.schedule_date,
    ar.scheduled_start,
    ar.scheduled_end,
    ar.schedule_source,
    ar.late_minutes,
    ar.early_leave_minutes,
    ar.overtime_minutes,
    ar.attendance_result
  from public.attendance_records ar
  join public.profiles p on p.id = ar.user_id
  order by ar.clock_in desc
  limit greatest(1, least(coalesce(p_limit, 250), 1000));
end;
$$;

revoke all on function public.attendance_admin_list(integer) from public;
grant execute on function public.attendance_admin_list(integer) to authenticated;


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
  select p.*
  into v_admin
  from public.profiles p
  where p.id = auth.uid();

  if v_admin.id is null
     or v_admin.role <> 'admin'::public.user_role
     or not coalesce(v_admin.is_active, false)
  then
    raise exception 'Solo un administrador activo puede consultar incidencias.';
  end if;

  if p_start_date is not null
     and p_end_date is not null
     and p_end_date < p_start_date
  then
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
    case
      when reviewer.id is null then null
      else trim(concat_ws(' ', reviewer.first_name, reviewer.last_name))
    end,
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


create or replace function public.attendance_admin_correct(
  p_attendance_id uuid,
  p_clock_in timestamptz,
  p_clock_out timestamptz,
  p_reason text
)
returns table (
  id uuid,
  user_id uuid,
  clock_in timestamptz,
  clock_out timestamptz,
  created_at timestamptz,
  updated_at timestamptz,
  employee_name text,
  employee_role text,
  schedule_date date,
  scheduled_start timestamptz,
  scheduled_end timestamptz,
  schedule_source text,
  late_minutes integer,
  early_leave_minutes integer,
  overtime_minutes integer,
  attendance_result text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_admin public.profiles%rowtype;
  v_existing public.attendance_records%rowtype;
  v_updated public.attendance_records%rowtype;
  v_settings public.attendance_settings%rowtype;
  v_late integer := 0;
  v_early integer := 0;
  v_overtime integer := 0;
  v_result text;
begin
  select p.*
  into v_admin
  from public.profiles p
  where p.id = auth.uid();

  if v_admin.id is null
     or v_admin.role <> 'admin'::public.user_role
     or not coalesce(v_admin.is_active, false)
  then
    raise exception 'Solo un administrador activo puede corregir asistencias.';
  end if;

  if p_clock_in is null then
    raise exception 'La hora de entrada es obligatoria.';
  end if;

  if p_clock_out is not null and p_clock_out <= p_clock_in then
    raise exception 'La salida debe ser posterior a la entrada.';
  end if;

  if length(trim(coalesce(p_reason, ''))) = 0 then
    raise exception 'El motivo de la corrección es obligatorio.';
  end if;

  select ar.*
  into v_existing
  from public.attendance_records ar
  where ar.id = p_attendance_id
  for update;

  if v_existing.id is null then
    raise exception 'No se encontró la asistencia.';
  end if;

  if exists (
    select 1
    from public.attendance_records other
    where other.user_id = v_existing.user_id
      and other.id <> v_existing.id
      and tstzrange(
        other.clock_in,
        coalesce(other.clock_out, 'infinity'::timestamptz),
        '[)'
      ) && tstzrange(
        p_clock_in,
        coalesce(p_clock_out, 'infinity'::timestamptz),
        '[)'
      )
  ) then
    raise exception 'La corrección se traslapa con otra asistencia del empleado.';
  end if;

  select s.*
  into v_settings
  from public.attendance_settings s
  where s.id = 1;

  if v_existing.scheduled_start is not null then
    v_late := greatest(
      0,
      floor(
        extract(
          epoch from (
            p_clock_in -
            (
              v_existing.scheduled_start +
              make_interval(mins => coalesce(v_settings.late_tolerance_minutes, 10))
            )
          )
        ) / 60
      )::integer
    );
  end if;

  if p_clock_out is not null and v_existing.scheduled_end is not null then
    v_early := greatest(
      0,
      floor(
        extract(
          epoch from (
            (
              v_existing.scheduled_end -
              make_interval(mins => coalesce(v_settings.early_leave_tolerance_minutes, 5))
            ) - p_clock_out
          )
        ) / 60
      )::integer
    );

    v_overtime := greatest(
      0,
      floor(
        extract(
          epoch from (
            p_clock_out -
            (
              v_existing.scheduled_end +
              make_interval(mins => coalesce(v_settings.overtime_tolerance_minutes, 10))
            )
          )
        ) / 60
      )::integer
    );
  end if;

  v_result := case
    when p_clock_out is null then 'open'
    when v_late > 0 and v_early > 0 then 'late_and_early_leave'
    when v_late > 0 then 'late'
    when v_early > 0 then 'early_leave'
    when v_overtime > 0 then 'overtime'
    else 'on_time'
  end;

  update public.attendance_records ar
  set
    clock_in = p_clock_in,
    clock_out = p_clock_out,
    late_minutes = v_late,
    early_leave_minutes = v_early,
    overtime_minutes = v_overtime,
    attendance_result = v_result
  where ar.id = p_attendance_id
  returning ar.* into v_updated;

  insert into public.attendance_corrections(
    attendance_id,
    corrected_by,
    reason,
    previous_clock_in,
    previous_clock_out,
    new_clock_in,
    new_clock_out
  ) values (
    v_existing.id,
    auth.uid(),
    trim(p_reason),
    v_existing.clock_in,
    v_existing.clock_out,
    v_updated.clock_in,
    v_updated.clock_out
  );

  return query
  select
    v_updated.id,
    v_updated.user_id,
    v_updated.clock_in,
    v_updated.clock_out,
    v_updated.created_at,
    v_updated.updated_at,
    trim(concat_ws(' ', p.first_name, p.last_name)),
    p.role::text,
    v_updated.schedule_date,
    v_updated.scheduled_start,
    v_updated.scheduled_end,
    v_updated.schedule_source,
    v_updated.late_minutes,
    v_updated.early_leave_minutes,
    v_updated.overtime_minutes,
    v_updated.attendance_result
  from public.profiles p
  where p.id = v_updated.user_id;
end;
$$;

revoke all on function public.attendance_admin_correct(uuid, timestamptz, timestamptz, text) from public;
grant execute on function public.attendance_admin_correct(uuid, timestamptz, timestamptz, text) to authenticated;


create or replace function public.attendance_mark_notification_read(p_notification_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.attendance_notifications n
  set read_at = coalesce(n.read_at, now())
  where n.id = p_notification_id
    and n.recipient_user_id = auth.uid();
end;
$$;

revoke all on function public.attendance_mark_notification_read(uuid) from public;
grant execute on function public.attendance_mark_notification_read(uuid) to authenticated;

commit;
