-- ============================================================
-- DORIAN POS
-- EVENTOS - FASE 2
-- Administración de tipos, paquetes y extras
-- ============================================================

create unique index if not exists event_types_name_unique
  on public.event_types (lower(trim(name)));

create unique index if not exists event_packages_name_unique
  on public.event_packages (lower(trim(name)));

create unique index if not exists event_extras_name_unique
  on public.event_extras (lower(trim(name)));

create or replace function public.assert_events_admin()
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if auth.uid() is null then
    raise exception 'Usuario no autenticado';
  end if;

  if not exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and is_active = true
      and role::text = 'admin'
  ) then
    raise exception 'No tienes permisos para administrar eventos';
  end if;
end;
$$;

revoke all on function public.assert_events_admin() from public;

-- ------------------------------------------------------------
-- Lectura administrativa consolidada
-- ------------------------------------------------------------

create or replace function public.get_event_admin_catalog()
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_types jsonb;
  v_packages jsonb;
  v_extras jsonb;
begin
  perform public.assert_events_admin();

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', t.id,
        'name', t.name,
        'description', coalesce(t.description, ''),
        'position', t.position,
        'isActive', t.is_active
      )
      order by t.position, t.created_at, t.id
    ),
    '[]'::jsonb
  )
  into v_types
  from public.event_types t;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', p.id,
        'eventTypeId', p.event_type_id,
        'eventTypeName', coalesce(t.name, ''),
        'name', p.name,
        'description', coalesce(p.description, ''),
        'basePrice', p.base_price,
        'includedGuests', p.included_guests,
        'extraGuestPrice', p.extra_guest_price,
        'durationMinutes', p.duration_minutes,
        'position', p.position,
        'isActive', p.is_active
      )
      order by p.position, p.created_at, p.id
    ),
    '[]'::jsonb
  )
  into v_packages
  from public.event_packages p
  left join public.event_types t
    on t.id = p.event_type_id;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', e.id,
        'name', e.name,
        'description', coalesce(e.description, ''),
        'pricingType', e.pricing_type,
        'price', e.price,
        'position', e.position,
        'isActive', e.is_active
      )
      order by e.position, e.created_at, e.id
    ),
    '[]'::jsonb
  )
  into v_extras
  from public.event_extras e;

  return jsonb_build_object(
    'types', v_types,
    'packages', v_packages,
    'extras', v_extras
  );
end;
$$;

revoke all on function public.get_event_admin_catalog() from public;
grant execute on function public.get_event_admin_catalog() to authenticated;

-- ------------------------------------------------------------
-- Tipos de evento
-- ------------------------------------------------------------

create or replace function public.create_event_type(
  p_name text,
  p_description text,
  p_is_active boolean default true
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_id uuid;
  v_position integer;
  v_name text;
begin
  perform public.assert_events_admin();
  v_name := trim(coalesce(p_name, ''));

  if v_name = '' then
    raise exception 'El nombre del tipo de evento es obligatorio';
  end if;

  if length(v_name) > 80 then
    raise exception 'El nombre no puede superar 80 caracteres';
  end if;

  if length(trim(coalesce(p_description, ''))) > 400 then
    raise exception 'La descripción no puede superar 400 caracteres';
  end if;

  select coalesce(max(position), -1) + 1
  into v_position
  from public.event_types;

  insert into public.event_types (
    name, description, position, is_active
  ) values (
    v_name,
    nullif(trim(coalesce(p_description, '')), ''),
    v_position,
    coalesce(p_is_active, true)
  )
  returning id into v_id;

  return v_id;
exception
  when unique_violation then
    raise exception 'Ya existe un tipo de evento con ese nombre';
end;
$$;

create or replace function public.update_event_type(
  p_event_type_id uuid,
  p_name text,
  p_description text,
  p_is_active boolean
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_name text;
begin
  perform public.assert_events_admin();
  v_name := trim(coalesce(p_name, ''));

  if v_name = '' then
    raise exception 'El nombre del tipo de evento es obligatorio';
  end if;

  if length(v_name) > 80 then
    raise exception 'El nombre no puede superar 80 caracteres';
  end if;

  if length(trim(coalesce(p_description, ''))) > 400 then
    raise exception 'La descripción no puede superar 400 caracteres';
  end if;

  update public.event_types
  set name = v_name,
      description = nullif(trim(coalesce(p_description, '')), ''),
      is_active = p_is_active,
      updated_at = now()
  where id = p_event_type_id;

  if not found then
    raise exception 'Tipo de evento no encontrado';
  end if;
exception
  when unique_violation then
    raise exception 'Ya existe un tipo de evento con ese nombre';
end;
$$;

create or replace function public.set_event_type_active(
  p_event_type_id uuid,
  p_is_active boolean
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  perform public.assert_events_admin();

  update public.event_types
  set is_active = p_is_active,
      updated_at = now()
  where id = p_event_type_id;

  if not found then
    raise exception 'Tipo de evento no encontrado';
  end if;
end;
$$;

create or replace function public.reorder_event_types(
  p_event_type_ids uuid[]
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_count integer;
  v_index integer;
begin
  perform public.assert_events_admin();

  select count(*) into v_count from public.event_types;

  if coalesce(array_length(p_event_type_ids, 1), 0) <> v_count then
    raise exception 'La lista de tipos está incompleta. Recarga la pantalla.';
  end if;

  if (select count(distinct ids.item_id) from unnest(p_event_type_ids) as ids(item_id)) <> v_count then
    raise exception 'La lista de tipos contiene elementos repetidos';
  end if;

  if exists (
    select 1
    from unnest(p_event_type_ids) as ids(item_id)
    where not exists (
      select 1 from public.event_types t where t.id = ids.item_id
    )
  ) then
    raise exception 'La lista contiene un tipo de evento que ya no existe';
  end if;

  for v_index in 1..v_count loop
    update public.event_types
    set position = v_index - 1,
        updated_at = now()
    where id = p_event_type_ids[v_index];
  end loop;
end;
$$;

-- ------------------------------------------------------------
-- Paquetes
-- ------------------------------------------------------------

create or replace function public.create_event_package(
  p_event_type_id uuid,
  p_name text,
  p_description text,
  p_base_price numeric,
  p_included_guests integer,
  p_extra_guest_price numeric,
  p_duration_minutes integer,
  p_is_active boolean default true
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_id uuid;
  v_position integer;
  v_name text;
begin
  perform public.assert_events_admin();
  v_name := trim(coalesce(p_name, ''));

  if v_name = '' then raise exception 'El nombre del paquete es obligatorio'; end if;
  if length(v_name) > 100 then raise exception 'El nombre no puede superar 100 caracteres'; end if;
  if length(trim(coalesce(p_description, ''))) > 600 then raise exception 'La descripción no puede superar 600 caracteres'; end if;
  if p_base_price < 0 then raise exception 'El precio base no puede ser negativo'; end if;
  if p_included_guests <= 0 then raise exception 'Las personas incluidas deben ser mayores a cero'; end if;
  if p_extra_guest_price < 0 then raise exception 'El precio por persona adicional no puede ser negativo'; end if;
  if p_duration_minutes <= 0 then raise exception 'La duración debe ser mayor a cero'; end if;

  if p_event_type_id is not null and not exists (
    select 1 from public.event_types where id = p_event_type_id
  ) then
    raise exception 'Selecciona un tipo de evento válido';
  end if;

  select coalesce(max(position), -1) + 1
  into v_position
  from public.event_packages;

  insert into public.event_packages (
    event_type_id, name, description, base_price,
    included_guests, extra_guest_price, duration_minutes,
    position, is_active
  ) values (
    p_event_type_id,
    v_name,
    nullif(trim(coalesce(p_description, '')), ''),
    p_base_price,
    p_included_guests,
    p_extra_guest_price,
    p_duration_minutes,
    v_position,
    coalesce(p_is_active, true)
  )
  returning id into v_id;

  return v_id;
exception
  when unique_violation then
    raise exception 'Ya existe un paquete con ese nombre';
end;
$$;

create or replace function public.update_event_package(
  p_package_id uuid,
  p_event_type_id uuid,
  p_name text,
  p_description text,
  p_base_price numeric,
  p_included_guests integer,
  p_extra_guest_price numeric,
  p_duration_minutes integer,
  p_is_active boolean
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_name text;
begin
  perform public.assert_events_admin();
  v_name := trim(coalesce(p_name, ''));

  if v_name = '' then raise exception 'El nombre del paquete es obligatorio'; end if;
  if length(v_name) > 100 then raise exception 'El nombre no puede superar 100 caracteres'; end if;
  if length(trim(coalesce(p_description, ''))) > 600 then raise exception 'La descripción no puede superar 600 caracteres'; end if;
  if p_base_price < 0 then raise exception 'El precio base no puede ser negativo'; end if;
  if p_included_guests <= 0 then raise exception 'Las personas incluidas deben ser mayores a cero'; end if;
  if p_extra_guest_price < 0 then raise exception 'El precio por persona adicional no puede ser negativo'; end if;
  if p_duration_minutes <= 0 then raise exception 'La duración debe ser mayor a cero'; end if;

  if p_event_type_id is not null and not exists (
    select 1 from public.event_types where id = p_event_type_id
  ) then
    raise exception 'Selecciona un tipo de evento válido';
  end if;

  update public.event_packages
  set event_type_id = p_event_type_id,
      name = v_name,
      description = nullif(trim(coalesce(p_description, '')), ''),
      base_price = p_base_price,
      included_guests = p_included_guests,
      extra_guest_price = p_extra_guest_price,
      duration_minutes = p_duration_minutes,
      is_active = p_is_active,
      updated_at = now()
  where id = p_package_id;

  if not found then raise exception 'Paquete no encontrado'; end if;
exception
  when unique_violation then
    raise exception 'Ya existe un paquete con ese nombre';
end;
$$;

create or replace function public.set_event_package_active(
  p_package_id uuid,
  p_is_active boolean
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  perform public.assert_events_admin();
  update public.event_packages
  set is_active = p_is_active, updated_at = now()
  where id = p_package_id;
  if not found then raise exception 'Paquete no encontrado'; end if;
end;
$$;

create or replace function public.reorder_event_packages(
  p_package_ids uuid[]
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_count integer;
  v_index integer;
begin
  perform public.assert_events_admin();
  select count(*) into v_count from public.event_packages;

  if coalesce(array_length(p_package_ids, 1), 0) <> v_count then
    raise exception 'La lista de paquetes está incompleta. Recarga la pantalla.';
  end if;
  if (select count(distinct ids.item_id) from unnest(p_package_ids) as ids(item_id)) <> v_count then
    raise exception 'La lista de paquetes contiene elementos repetidos';
  end if;
  if exists (
    select 1 from unnest(p_package_ids) as ids(item_id)
    where not exists (select 1 from public.event_packages p where p.id = ids.item_id)
  ) then
    raise exception 'La lista contiene un paquete que ya no existe';
  end if;

  for v_index in 1..v_count loop
    update public.event_packages
    set position = v_index - 1, updated_at = now()
    where id = p_package_ids[v_index];
  end loop;
end;
$$;

-- ------------------------------------------------------------
-- Extras
-- ------------------------------------------------------------

create or replace function public.create_event_extra(
  p_name text,
  p_description text,
  p_pricing_type text,
  p_price numeric,
  p_is_active boolean default true
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_id uuid;
  v_position integer;
  v_name text;
begin
  perform public.assert_events_admin();
  v_name := trim(coalesce(p_name, ''));

  if v_name = '' then raise exception 'El nombre del extra es obligatorio'; end if;
  if length(v_name) > 100 then raise exception 'El nombre no puede superar 100 caracteres'; end if;
  if length(trim(coalesce(p_description, ''))) > 600 then raise exception 'La descripción no puede superar 600 caracteres'; end if;
  if p_pricing_type not in ('fixed', 'per_guest', 'per_unit') then raise exception 'Tipo de precio inválido'; end if;
  if p_price < 0 then raise exception 'El precio no puede ser negativo'; end if;

  select coalesce(max(position), -1) + 1
  into v_position
  from public.event_extras;

  insert into public.event_extras (
    name, description, pricing_type, price, position, is_active
  ) values (
    v_name,
    nullif(trim(coalesce(p_description, '')), ''),
    p_pricing_type,
    p_price,
    v_position,
    coalesce(p_is_active, true)
  )
  returning id into v_id;

  return v_id;
exception
  when unique_violation then
    raise exception 'Ya existe un extra con ese nombre';
end;
$$;

create or replace function public.update_event_extra(
  p_extra_id uuid,
  p_name text,
  p_description text,
  p_pricing_type text,
  p_price numeric,
  p_is_active boolean
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_name text;
begin
  perform public.assert_events_admin();
  v_name := trim(coalesce(p_name, ''));

  if v_name = '' then raise exception 'El nombre del extra es obligatorio'; end if;
  if length(v_name) > 100 then raise exception 'El nombre no puede superar 100 caracteres'; end if;
  if length(trim(coalesce(p_description, ''))) > 600 then raise exception 'La descripción no puede superar 600 caracteres'; end if;
  if p_pricing_type not in ('fixed', 'per_guest', 'per_unit') then raise exception 'Tipo de precio inválido'; end if;
  if p_price < 0 then raise exception 'El precio no puede ser negativo'; end if;

  update public.event_extras
  set name = v_name,
      description = nullif(trim(coalesce(p_description, '')), ''),
      pricing_type = p_pricing_type,
      price = p_price,
      is_active = p_is_active,
      updated_at = now()
  where id = p_extra_id;

  if not found then raise exception 'Extra no encontrado'; end if;
exception
  when unique_violation then
    raise exception 'Ya existe un extra con ese nombre';
end;
$$;

create or replace function public.set_event_extra_active(
  p_extra_id uuid,
  p_is_active boolean
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  perform public.assert_events_admin();
  update public.event_extras
  set is_active = p_is_active, updated_at = now()
  where id = p_extra_id;
  if not found then raise exception 'Extra no encontrado'; end if;
end;
$$;

create or replace function public.reorder_event_extras(
  p_extra_ids uuid[]
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_count integer;
  v_index integer;
begin
  perform public.assert_events_admin();
  select count(*) into v_count from public.event_extras;

  if coalesce(array_length(p_extra_ids, 1), 0) <> v_count then
    raise exception 'La lista de extras está incompleta. Recarga la pantalla.';
  end if;
  if (select count(distinct ids.item_id) from unnest(p_extra_ids) as ids(item_id)) <> v_count then
    raise exception 'La lista de extras contiene elementos repetidos';
  end if;
  if exists (
    select 1 from unnest(p_extra_ids) as ids(item_id)
    where not exists (select 1 from public.event_extras e where e.id = ids.item_id)
  ) then
    raise exception 'La lista contiene un extra que ya no existe';
  end if;

  for v_index in 1..v_count loop
    update public.event_extras
    set position = v_index - 1, updated_at = now()
    where id = p_extra_ids[v_index];
  end loop;
end;
$$;

-- ------------------------------------------------------------
-- Permisos RPC
-- ------------------------------------------------------------

revoke all on function public.create_event_type(text, text, boolean) from public;
revoke all on function public.update_event_type(uuid, text, text, boolean) from public;
revoke all on function public.set_event_type_active(uuid, boolean) from public;
revoke all on function public.reorder_event_types(uuid[]) from public;
revoke all on function public.create_event_package(uuid, text, text, numeric, integer, numeric, integer, boolean) from public;
revoke all on function public.update_event_package(uuid, uuid, text, text, numeric, integer, numeric, integer, boolean) from public;
revoke all on function public.set_event_package_active(uuid, boolean) from public;
revoke all on function public.reorder_event_packages(uuid[]) from public;
revoke all on function public.create_event_extra(text, text, text, numeric, boolean) from public;
revoke all on function public.update_event_extra(uuid, text, text, text, numeric, boolean) from public;
revoke all on function public.set_event_extra_active(uuid, boolean) from public;
revoke all on function public.reorder_event_extras(uuid[]) from public;

grant execute on function public.create_event_type(text, text, boolean) to authenticated;
grant execute on function public.update_event_type(uuid, text, text, boolean) to authenticated;
grant execute on function public.set_event_type_active(uuid, boolean) to authenticated;
grant execute on function public.reorder_event_types(uuid[]) to authenticated;
grant execute on function public.create_event_package(uuid, text, text, numeric, integer, numeric, integer, boolean) to authenticated;
grant execute on function public.update_event_package(uuid, uuid, text, text, numeric, integer, numeric, integer, boolean) to authenticated;
grant execute on function public.set_event_package_active(uuid, boolean) to authenticated;
grant execute on function public.reorder_event_packages(uuid[]) to authenticated;
grant execute on function public.create_event_extra(text, text, text, numeric, boolean) to authenticated;
grant execute on function public.update_event_extra(uuid, text, text, text, numeric, boolean) to authenticated;
grant execute on function public.set_event_extra_active(uuid, boolean) to authenticated;
grant execute on function public.reorder_event_extras(uuid[]) to authenticated;
