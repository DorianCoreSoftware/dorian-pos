-- ============================================================
-- DORIAN POS
-- DISPONIBILIDAD POR MODALIDAD + HORARIOS AUTOMÁTICOS
-- ============================================================

alter table public.delivery_settings
  add column if not exists pickup_enabled boolean not null default true,
  add column if not exists pickup_schedule_enabled boolean not null default false,
  add column if not exists delivery_schedule_enabled boolean not null default false;

comment on column public.delivery_settings.pickup_enabled is
  'Manual availability switch for pickup orders.';
comment on column public.delivery_settings.pickup_schedule_enabled is
  'When true, pickup additionally requires an active fulfillment schedule window.';
comment on column public.delivery_settings.delivery_schedule_enabled is
  'When true, delivery additionally requires an active fulfillment schedule window.';

create table if not exists public.fulfillment_schedule_windows (
  id uuid primary key default gen_random_uuid(),
  fulfillment_type text not null
    check (fulfillment_type in ('pickup', 'delivery')),
  day_of_week integer not null
    check (day_of_week between 0 and 6),
  start_time time not null,
  end_time time not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (start_time <> end_time)
);

create index if not exists fulfillment_schedule_windows_lookup_idx
  on public.fulfillment_schedule_windows (
    fulfillment_type,
    day_of_week,
    is_active,
    start_time
  );

alter table public.fulfillment_schedule_windows enable row level security;

drop policy if exists fulfillment_schedule_windows_admin_select
  on public.fulfillment_schedule_windows;
create policy fulfillment_schedule_windows_admin_select
  on public.fulfillment_schedule_windows
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and coalesce(p.is_active, true) = true
        and p.role::text = 'admin'
    )
  );

drop policy if exists fulfillment_schedule_windows_admin_insert
  on public.fulfillment_schedule_windows;
create policy fulfillment_schedule_windows_admin_insert
  on public.fulfillment_schedule_windows
  for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and coalesce(p.is_active, true) = true
        and p.role::text = 'admin'
    )
  );

drop policy if exists fulfillment_schedule_windows_admin_update
  on public.fulfillment_schedule_windows;
create policy fulfillment_schedule_windows_admin_update
  on public.fulfillment_schedule_windows
  for update
  to authenticated
  using (
    exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and coalesce(p.is_active, true) = true
        and p.role::text = 'admin'
    )
  )
  with check (
    exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and coalesce(p.is_active, true) = true
        and p.role::text = 'admin'
    )
  );

drop policy if exists fulfillment_schedule_windows_admin_delete
  on public.fulfillment_schedule_windows;
create policy fulfillment_schedule_windows_admin_delete
  on public.fulfillment_schedule_windows
  for delete
  to authenticated
  using (
    exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and coalesce(p.is_active, true) = true
        and p.role::text = 'admin'
    )
  );

create or replace function public.is_fulfillment_schedule_open(
  p_fulfillment_type text
)
returns boolean
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  v_timezone text;
  v_local_ts timestamp;
  v_day integer;
  v_prev_day integer;
  v_local_time time;
  v_schedule_enabled boolean := false;
begin
  if p_fulfillment_type not in ('pickup', 'delivery') then
    return false;
  end if;

  select coalesce(bs.timezone, 'America/Mexico_City')
    into v_timezone
  from public.business_settings bs
  where bs.id = 1;

  v_timezone := coalesce(v_timezone, 'America/Mexico_City');
  v_local_ts := now() at time zone v_timezone;
  v_day := extract(dow from v_local_ts)::integer;
  v_prev_day := (v_day + 6) % 7;
  v_local_time := v_local_ts::time;

  select case
    when p_fulfillment_type = 'pickup'
      then coalesce(ds.pickup_schedule_enabled, false)
    else coalesce(ds.delivery_schedule_enabled, false)
  end
  into v_schedule_enabled
  from public.delivery_settings ds
  where ds.id = true;

  if not coalesce(v_schedule_enabled, false) then
    return true;
  end if;

  return exists (
    select 1
    from public.fulfillment_schedule_windows w
    where w.fulfillment_type = p_fulfillment_type
      and w.is_active = true
      and (
        (
          w.day_of_week = v_day
          and w.start_time < w.end_time
          and v_local_time >= w.start_time
          and v_local_time < w.end_time
        )
        or
        (
          w.day_of_week = v_day
          and w.start_time > w.end_time
          and v_local_time >= w.start_time
        )
        or
        (
          w.day_of_week = v_prev_day
          and w.start_time > w.end_time
          and v_local_time < w.end_time
        )
      )
  );
end;
$$;

revoke all on function public.is_fulfillment_schedule_open(text) from public;
grant execute on function public.is_fulfillment_schedule_open(text)
  to anon, authenticated;

create or replace function public.get_pickup_service_status()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    coalesce((
      select ds.pickup_enabled
      from public.delivery_settings ds
      where ds.id = true
      limit 1
    ), true)
    and public.is_fulfillment_schedule_open('pickup');
$$;

revoke all on function public.get_pickup_service_status() from public;
grant execute on function public.get_pickup_service_status()
  to anon, authenticated;

-- Conserva el nombre público existente, pero ahora devuelve la
-- disponibilidad EFECTIVA: interruptor manual + horario automático.
create or replace function public.get_delivery_service_status()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    coalesce((
      select ds.is_enabled
      from public.delivery_settings ds
      where ds.id = true
      limit 1
    ), false)
    and coalesce((
      select bs.delivery_enabled
      from public.business_settings bs
      where bs.id = 1
      limit 1
    ), true)
    and public.is_fulfillment_schedule_open('delivery');
$$;

revoke all on function public.get_delivery_service_status() from public;
grant execute on function public.get_delivery_service_status()
  to anon, authenticated;

create or replace function public.get_next_fulfillment_window_label(
  p_fulfillment_type text
)
returns text
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  v_timezone text;
  v_local_ts timestamp;
  v_day integer;
  v_local_time time;
  v_offset integer;
  v_target_day integer;
  v_window record;
  v_day_names text[] := array[
    'Domingo', 'Lunes', 'Martes', 'Miércoles',
    'Jueves', 'Viernes', 'Sábado'
  ];
begin
  if p_fulfillment_type not in ('pickup', 'delivery') then
    return null;
  end if;

  select coalesce(bs.timezone, 'America/Mexico_City')
    into v_timezone
  from public.business_settings bs
  where bs.id = 1;

  v_timezone := coalesce(v_timezone, 'America/Mexico_City');
  v_local_ts := now() at time zone v_timezone;
  v_day := extract(dow from v_local_ts)::integer;
  v_local_time := v_local_ts::time;

  for v_offset in 0..7 loop
    v_target_day := (v_day + v_offset) % 7;

    select
      w.start_time,
      w.end_time
    into v_window
    from public.fulfillment_schedule_windows w
    where w.fulfillment_type = p_fulfillment_type
      and w.is_active = true
      and w.day_of_week = v_target_day
      and (
        v_offset > 0
        or w.start_time > v_local_time
      )
    order by w.start_time
    limit 1;

    if found then
      return
        case
          when v_offset = 0 then 'Hoy '
          when v_offset = 1 then 'Mañana '
          else v_day_names[v_target_day + 1] || ' '
        end
        || to_char(v_window.start_time, 'HH24:MI')
        || '–'
        || to_char(v_window.end_time, 'HH24:MI');
    end if;
  end loop;

  return null;
end;
$$;

revoke all on function public.get_next_fulfillment_window_label(text) from public;
grant execute on function public.get_next_fulfillment_window_label(text)
  to anon, authenticated;

create or replace function public.get_public_fulfillment_availability()
returns table (
  pickup_available boolean,
  delivery_available boolean,
  pickup_reason text,
  delivery_reason text,
  pickup_next_window text,
  delivery_next_window text
)
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  v_pickup_manual boolean := true;
  v_delivery_manual boolean := false;
  v_pickup_schedule boolean := false;
  v_delivery_schedule boolean := false;
  v_delivery_entitled boolean := true;
begin
  select
    coalesce(ds.pickup_enabled, true),
    coalesce(ds.is_enabled, false),
    coalesce(ds.pickup_schedule_enabled, false),
    coalesce(ds.delivery_schedule_enabled, false)
  into
    v_pickup_manual,
    v_delivery_manual,
    v_pickup_schedule,
    v_delivery_schedule
  from public.delivery_settings ds
  where ds.id = true;

  select coalesce(bs.delivery_enabled, true)
    into v_delivery_entitled
  from public.business_settings bs
  where bs.id = 1;

  pickup_available :=
    coalesce(v_pickup_manual, true)
    and public.is_fulfillment_schedule_open('pickup');

  delivery_available :=
    coalesce(v_delivery_manual, false)
    and coalesce(v_delivery_entitled, true)
    and public.is_fulfillment_schedule_open('delivery');

  pickup_reason := case
    when not coalesce(v_pickup_manual, true)
      then 'Recoger está desactivado temporalmente.'
    when v_pickup_schedule and not pickup_available
      then 'Fuera del horario para recoger.'
    else ''
  end;

  delivery_reason := case
    when not coalesce(v_delivery_entitled, true)
      then 'El servicio a domicilio no está habilitado.'
    when not coalesce(v_delivery_manual, false)
      then 'El servicio a domicilio está desactivado temporalmente.'
    when v_delivery_schedule and not delivery_available
      then 'Fuera del horario de entrega a domicilio.'
    else ''
  end;

  pickup_next_window := case
    when not pickup_available and v_pickup_schedule and v_pickup_manual
      then public.get_next_fulfillment_window_label('pickup')
    else null
  end;

  delivery_next_window := case
    when not delivery_available
      and v_delivery_schedule
      and v_delivery_manual
      and v_delivery_entitled
      then public.get_next_fulfillment_window_label('delivery')
    else null
  end;

  return next;
end;
$$;

revoke all on function public.get_public_fulfillment_availability() from public;
grant execute on function public.get_public_fulfillment_availability()
  to anon, authenticated;

-- ============================================================
-- PROTECCIÓN DE PICKUP EN CREATE_WEB_ORDER
-- ============================================================
-- La protección de delivery existente sigue activa porque llama a
-- get_delivery_service_status(), que ahora ya contempla el horario.
-- Solo agregamos el guard equivalente para pickup a la función base.

do $$
declare
  v_signature regprocedure;
  v_current_definition text;
  v_updated_definition text;
  v_error_message constant text :=
    'El servicio para recoger no está disponible por el momento.';
begin
  v_signature :=
    to_regprocedure(
      'public.create_web_order(jsonb,jsonb,uuid,text,text,text)'
    );

  if v_signature is null then
    raise exception
      'No existe public.create_web_order(jsonb,jsonb,uuid,text,text,text).';
  end if;

  select pg_get_functiondef(v_signature)
    into v_current_definition;

  if position(v_error_message in v_current_definition) > 0 then
    return;
  end if;

  v_updated_definition :=
    regexp_replace(
      v_current_definition,
      '\mbegin\M',
      $replacement$begin
  if
    lower(trim(coalesce(p_fulfillment_type, ''))) = 'pickup'
    and not public.get_pickup_service_status()
  then
    raise exception
      'El servicio para recoger no está disponible por el momento.';
  end if;
$replacement$,
      'i'
    );

  if v_updated_definition = v_current_definition then
    raise exception
      'No se pudo insertar la validación de pickup en create_web_order().';
  end if;

  execute v_updated_definition;
end;
$$;
