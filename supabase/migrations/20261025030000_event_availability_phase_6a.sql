-- ============================================================
-- DORIAN POS
-- EVENTOS - FASE 6A
-- Disponibilidad semanal + bloqueos + slots públicos + traslapes
-- ============================================================

create table if not exists public.event_availability_settings (
  id smallint primary key default 1 check (id = 1),
  enabled boolean not null default false,
  slot_interval_minutes integer not null default 30
    check (slot_interval_minutes between 15 and 240),
  max_simultaneous_events integer not null default 1
    check (max_simultaneous_events between 1 and 20),
  updated_at timestamptz not null default now()
);

insert into public.event_availability_settings (
  id,
  enabled,
  slot_interval_minutes,
  max_simultaneous_events
) values (1, false, 30, 1)
on conflict (id) do nothing;

create table if not exists public.event_availability_rules (
  day_of_week smallint primary key
    check (day_of_week between 0 and 6),
  is_enabled boolean not null default false,
  start_time time not null default '12:00',
  end_time time not null default '22:00',
  updated_at timestamptz not null default now(),
  check (end_time > start_time)
);

insert into public.event_availability_rules (
  day_of_week,
  is_enabled,
  start_time,
  end_time
)
select day, false, '12:00'::time, '22:00'::time
from generate_series(0, 6) as day
on conflict (day_of_week) do nothing;

create table if not exists public.event_availability_blocks (
  id uuid primary key default gen_random_uuid(),
  event_date date not null,
  full_day boolean not null default true,
  start_time time,
  end_time time,
  reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (
    (full_day = true and start_time is null and end_time is null)
    or
    (full_day = false and start_time is not null and end_time is not null and end_time > start_time)
  )
);

create index if not exists event_availability_blocks_date_idx
  on public.event_availability_blocks (event_date, start_time, end_time);

alter table public.event_availability_settings enable row level security;
alter table public.event_availability_rules enable row level security;
alter table public.event_availability_blocks enable row level security;

alter table public.event_requests
  add column if not exists package_duration_minutes integer not null default 0;

update public.event_requests r
set package_duration_minutes = coalesce(p.duration_minutes, 120)
from public.event_packages p
where r.package_id = p.id
  and r.package_duration_minutes <= 0;

update public.event_requests
set package_duration_minutes = 120
where package_duration_minutes <= 0;

-- ============================================================
-- HELPERS
-- ============================================================

create or replace function public.event_slot_is_available(
  p_event_date date,
  p_event_time time,
  p_duration_minutes integer,
  p_exclude_request_id uuid default null
)
returns boolean
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  v_enabled boolean := false;
  v_max_simultaneous integer := 1;
  v_rule_enabled boolean := false;
  v_start_time time;
  v_end_time time;
  v_candidate_end timestamp;
  v_overlap_count integer := 0;
begin
  if p_event_date is null
     or p_event_time is null
     or coalesce(p_duration_minutes, 0) <= 0 then
    return false;
  end if;

  select enabled, max_simultaneous_events
  into v_enabled, v_max_simultaneous
  from public.event_availability_settings
  where id = 1;

  -- Compatibilidad: hasta que el negocio active la disponibilidad,
  -- no bloqueamos solicitudes existentes por esta nueva regla.
  if not coalesce(v_enabled, false) then
    return true;
  end if;

  select is_enabled, start_time, end_time
  into v_rule_enabled, v_start_time, v_end_time
  from public.event_availability_rules
  where day_of_week = extract(dow from p_event_date)::integer;

  if not coalesce(v_rule_enabled, false) then
    return false;
  end if;

  v_candidate_end :=
    p_event_date + p_event_time
    + make_interval(mins => p_duration_minutes);

  if p_event_time < v_start_time
     or v_candidate_end > (p_event_date + v_end_time) then
    return false;
  end if;

  if exists (
    select 1
    from public.event_availability_blocks b
    where b.event_date = p_event_date
      and (
        b.full_day
        or (
          b.start_time < v_candidate_end::time
          and b.end_time > p_event_time
        )
      )
  ) then
    return false;
  end if;

  select count(*)
  into v_overlap_count
  from public.event_requests r
  left join public.event_packages p
    on p.id = r.package_id
  where r.event_date = p_event_date
    and r.status = 'accepted'
    and r.event_time is not null
    and (p_exclude_request_id is null or r.id <> p_exclude_request_id)
    and r.event_time < v_candidate_end::time
    and (
      p_event_date + r.event_time
      + make_interval(
          mins => greatest(
            1,
            coalesce(
              nullif(r.package_duration_minutes, 0),
              p.duration_minutes,
              120
            )
          )
        )
    ) > (p_event_date + p_event_time);

  return v_overlap_count < greatest(1, v_max_simultaneous);
end;
$$;

revoke all on function public.event_slot_is_available(date, time, integer, uuid) from public;

-- ============================================================
-- ADMIN
-- ============================================================

create or replace function public.get_event_availability_admin()
returns jsonb
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_result jsonb;
begin
  if v_user_id is null then
    raise exception 'Usuario no autenticado';
  end if;

  if not exists (
    select 1
    from public.profiles
    where id = v_user_id
      and is_active = true
      and role::text = 'admin'
  ) then
    raise exception 'No tienes permisos para administrar disponibilidad de eventos';
  end if;

  select jsonb_build_object(
    'enabled', s.enabled,
    'slotIntervalMinutes', s.slot_interval_minutes,
    'maxSimultaneousEvents', s.max_simultaneous_events,
    'rules', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'dayOfWeek', r.day_of_week,
          'isEnabled', r.is_enabled,
          'startTime', to_char(r.start_time, 'HH24:MI'),
          'endTime', to_char(r.end_time, 'HH24:MI')
        ) order by r.day_of_week
      )
      from public.event_availability_rules r
    ), '[]'::jsonb),
    'blocks', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'id', b.id,
          'eventDate', b.event_date,
          'fullDay', b.full_day,
          'startTime', case when b.start_time is null then null else to_char(b.start_time, 'HH24:MI') end,
          'endTime', case when b.end_time is null then null else to_char(b.end_time, 'HH24:MI') end,
          'reason', coalesce(b.reason, '')
        ) order by b.event_date asc, b.start_time asc nulls first
      )
      from public.event_availability_blocks b
      where b.event_date >= current_date - 30
    ), '[]'::jsonb)
  )
  into v_result
  from public.event_availability_settings s
  where s.id = 1;

  return coalesce(v_result, '{}'::jsonb);
end;
$$;

revoke all on function public.get_event_availability_admin() from public;
grant execute on function public.get_event_availability_admin() to authenticated;

create or replace function public.save_event_availability_config(
  p_enabled boolean,
  p_slot_interval_minutes integer,
  p_max_simultaneous_events integer,
  p_rules jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_item jsonb;
  v_day integer;
  v_rule_enabled boolean;
  v_start time;
  v_end time;
begin
  if v_user_id is null or not exists (
    select 1 from public.profiles
    where id = v_user_id
      and is_active = true
      and role::text = 'admin'
  ) then
    raise exception 'No tienes permisos para administrar disponibilidad de eventos';
  end if;

  if p_slot_interval_minutes not between 15 and 240 then
    raise exception 'El intervalo debe estar entre 15 y 240 minutos';
  end if;

  if p_max_simultaneous_events not between 1 and 20 then
    raise exception 'Los eventos simultáneos deben estar entre 1 y 20';
  end if;

  if jsonb_typeof(coalesce(p_rules, '[]'::jsonb)) <> 'array' then
    raise exception 'La configuración semanal no es válida';
  end if;

  update public.event_availability_settings
  set
    enabled = coalesce(p_enabled, false),
    slot_interval_minutes = p_slot_interval_minutes,
    max_simultaneous_events = p_max_simultaneous_events,
    updated_at = now()
  where id = 1;

  for v_item in select value from jsonb_array_elements(p_rules)
  loop
    v_day := coalesce((v_item->>'dayOfWeek')::integer, -1);
    v_rule_enabled := coalesce((v_item->>'isEnabled')::boolean, false);

    if v_day not between 0 and 6 then
      raise exception 'Día de semana no válido';
    end if;

    begin
      v_start := coalesce(nullif(v_item->>'startTime', '')::time, '12:00'::time);
      v_end := coalesce(nullif(v_item->>'endTime', '')::time, '22:00'::time);
    exception
      when others then
        raise exception 'Uno de los horarios semanales no es válido';
    end;

    if v_rule_enabled and v_end <= v_start then
      raise exception 'La hora de cierre debe ser posterior a la hora de inicio';
    end if;

    insert into public.event_availability_rules (
      day_of_week,
      is_enabled,
      start_time,
      end_time,
      updated_at
    ) values (
      v_day,
      v_rule_enabled,
      v_start,
      v_end,
      now()
    )
    on conflict (day_of_week) do update
    set
      is_enabled = excluded.is_enabled,
      start_time = excluded.start_time,
      end_time = excluded.end_time,
      updated_at = now();
  end loop;

  return jsonb_build_object('ok', true);
end;
$$;

revoke all on function public.save_event_availability_config(boolean, integer, integer, jsonb) from public;
grant execute on function public.save_event_availability_config(boolean, integer, integer, jsonb) to authenticated;

create or replace function public.create_event_availability_block(
  p_event_date date,
  p_full_day boolean,
  p_start_time time,
  p_end_time time,
  p_reason text
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_id uuid;
begin
  if v_user_id is null or not exists (
    select 1 from public.profiles
    where id = v_user_id
      and is_active = true
      and role::text = 'admin'
  ) then
    raise exception 'No tienes permisos para administrar bloqueos de eventos';
  end if;

  if p_event_date is null then
    raise exception 'Selecciona una fecha para el bloqueo';
  end if;

  if not coalesce(p_full_day, false) then
    if p_start_time is null or p_end_time is null or p_end_time <= p_start_time then
      raise exception 'El rango de horas del bloqueo no es válido';
    end if;
  end if;

  if length(trim(coalesce(p_reason, ''))) > 300 then
    raise exception 'El motivo no puede superar 300 caracteres';
  end if;

  -- No permitimos crear un bloqueo encima de una reservación ya aceptada.
  if exists (
    select 1
    from public.event_requests r
    left join public.event_packages p on p.id = r.package_id
    where r.event_date = p_event_date
      and r.status = 'accepted'
      and r.event_time is not null
      and (
        coalesce(p_full_day, false)
        or (
          r.event_time < p_end_time
          and (
            p_event_date + r.event_time
            + make_interval(
                mins => greatest(
                  1,
                  coalesce(nullif(r.package_duration_minutes, 0), p.duration_minutes, 120)
                )
              )
          ) > (p_event_date + p_start_time)
        )
      )
  ) then
    raise exception 'El bloqueo se traslapa con un evento ya aceptado';
  end if;

  insert into public.event_availability_blocks (
    event_date,
    full_day,
    start_time,
    end_time,
    reason
  ) values (
    p_event_date,
    coalesce(p_full_day, false),
    case when coalesce(p_full_day, false) then null else p_start_time end,
    case when coalesce(p_full_day, false) then null else p_end_time end,
    nullif(trim(coalesce(p_reason, '')), '')
  )
  returning id into v_id;

  return jsonb_build_object('id', v_id);
end;
$$;

revoke all on function public.create_event_availability_block(date, boolean, time, time, text) from public;
grant execute on function public.create_event_availability_block(date, boolean, time, time, text) to authenticated;

create or replace function public.delete_event_availability_block(
  p_block_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null or not exists (
    select 1 from public.profiles
    where id = v_user_id
      and is_active = true
      and role::text = 'admin'
  ) then
    raise exception 'No tienes permisos para administrar bloqueos de eventos';
  end if;

  delete from public.event_availability_blocks
  where id = p_block_id;

  if not found then
    raise exception 'Bloqueo no encontrado';
  end if;

  return jsonb_build_object('ok', true);
end;
$$;

revoke all on function public.delete_event_availability_block(uuid) from public;
grant execute on function public.delete_event_availability_block(uuid) to authenticated;

-- ============================================================
-- PUBLIC SLOTS
-- ============================================================

create or replace function public.get_public_event_available_slots(
  p_package_id uuid,
  p_event_date date
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  v_public_enabled boolean := false;
  v_availability_enabled boolean := false;
  v_interval integer := 30;
  v_duration integer;
  v_rule_enabled boolean := false;
  v_start time;
  v_end time;
  v_slots jsonb := '[]'::jsonb;
begin
  select
    coalesce(bs.events_enabled, false)
      and coalesce(es.public_quote_enabled, false),
    coalesce(a.enabled, false),
    coalesce(a.slot_interval_minutes, 30)
  into
    v_public_enabled,
    v_availability_enabled,
    v_interval
  from public.business_settings bs
  cross join public.event_settings es
  cross join public.event_availability_settings a
  where bs.id = 1
    and es.id = 1
    and a.id = 1;

  if not coalesce(v_public_enabled, false)
     or not coalesce(v_availability_enabled, false)
     or p_event_date is null then
    return jsonb_build_object('enabled', false, 'slots', '[]'::jsonb);
  end if;

  select duration_minutes
  into v_duration
  from public.event_packages
  where id = p_package_id
    and is_active = true;

  if v_duration is null then
    return jsonb_build_object('enabled', true, 'slots', '[]'::jsonb);
  end if;

  select is_enabled, start_time, end_time
  into v_rule_enabled, v_start, v_end
  from public.event_availability_rules
  where day_of_week = extract(dow from p_event_date)::integer;

  if not coalesce(v_rule_enabled, false) then
    return jsonb_build_object('enabled', true, 'slots', '[]'::jsonb);
  end if;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'time', to_char(candidate_start, 'HH24:MI'),
        'endTime', to_char(candidate_start + make_interval(mins => v_duration), 'HH24:MI')
      )
      order by candidate_start
    ),
    '[]'::jsonb
  )
  into v_slots
  from generate_series(
    p_event_date + v_start,
    p_event_date + v_end - make_interval(mins => v_duration),
    make_interval(mins => v_interval)
  ) candidate_start
  where public.event_slot_is_available(
    p_event_date,
    candidate_start::time,
    v_duration,
    null
  );

  return jsonb_build_object('enabled', true, 'slots', v_slots);
end;
$$;

revoke all on function public.get_public_event_available_slots(uuid, date) from public;
grant execute on function public.get_public_event_available_slots(uuid, date) to anon, authenticated;

-- ============================================================
-- ENFORCEMENT: solicitudes y aceptación
-- ============================================================

create or replace function public.enforce_event_request_availability()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_enabled boolean := false;
  v_duration integer;
begin
  select enabled
  into v_enabled
  from public.event_availability_settings
  where id = 1;

  select duration_minutes
  into v_duration
  from public.event_packages
  where id = new.package_id;

  if coalesce(new.package_duration_minutes, 0) <= 0 then
    new.package_duration_minutes := greatest(1, coalesce(v_duration, 120));
  end if;

  if not coalesce(v_enabled, false) then
    return new;
  end if;

  if new.event_time is null then
    raise exception 'Selecciona un horario disponible para el evento';
  end if;

  -- Una solicitud nueva debe corresponder a un slot válido.
  -- Las solicitudes nuevas NO consumen capacidad; solo las aceptadas.
  if tg_op = 'INSERT' then
    if not public.event_slot_is_available(
      new.event_date,
      new.event_time,
      new.package_duration_minutes,
      null
    ) then
      raise exception 'El horario seleccionado ya no está disponible';
    end if;
  end if;

  -- Al aceptar sí reservamos capacidad y volvemos a comprobar
  -- para cubrir solicitudes concurrentes.
  if new.status = 'accepted'
     and (tg_op = 'INSERT' or old.status is distinct from 'accepted') then
    if not public.event_slot_is_available(
      new.event_date,
      new.event_time,
      new.package_duration_minutes,
      new.id
    ) then
      raise exception 'El horario ya no está disponible para confirmar este evento';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists event_requests_availability_guard on public.event_requests;
create trigger event_requests_availability_guard
before insert or update of status, event_date, event_time, package_id
on public.event_requests
for each row
execute function public.enforce_event_request_availability();

-- Las tablas se mantienen cerradas a clientes; el acceso es únicamente por RPC.
revoke all on public.event_availability_settings from anon, authenticated;
revoke all on public.event_availability_rules from anon, authenticated;
revoke all on public.event_availability_blocks from anon, authenticated;
