-- ============================================================
-- DORIAN POS
-- EVENTOS - FASE 3
-- Extras permitidos por paquete + guardado transaccional
-- ============================================================

create or replace function public.save_event_package_admin(
  p_package_id uuid,
  p_event_type_id uuid,
  p_name text,
  p_description text,
  p_base_price numeric,
  p_included_guests integer,
  p_extra_guest_price numeric,
  p_duration_minutes integer,
  p_is_active boolean,
  p_extra_ids uuid[] default '{}'::uuid[]
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_package_id uuid;
  v_extra_count integer;
begin
  perform public.assert_events_admin();

  if p_package_id is null then
    select public.create_event_package(
      p_event_type_id,
      p_name,
      p_description,
      p_base_price,
      p_included_guests,
      p_extra_guest_price,
      p_duration_minutes,
      p_is_active
    ) into v_package_id;
  else
    perform public.update_event_package(
      p_package_id,
      p_event_type_id,
      p_name,
      p_description,
      p_base_price,
      p_included_guests,
      p_extra_guest_price,
      p_duration_minutes,
      p_is_active
    );
    v_package_id := p_package_id;
  end if;

  if coalesce(array_length(p_extra_ids, 1), 0) > 0 then
    if (
      select count(distinct ids.extra_id)
      from unnest(p_extra_ids) as ids(extra_id)
    ) <> coalesce(array_length(p_extra_ids, 1), 0) then
      raise exception 'La lista de extras contiene elementos repetidos';
    end if;

    select count(*)
    into v_extra_count
    from public.event_extras e
    where e.id = any(p_extra_ids);

    if v_extra_count <> coalesce(array_length(p_extra_ids, 1), 0) then
      raise exception 'La lista contiene un extra que ya no existe';
    end if;
  end if;

  delete from public.event_package_extras
  where package_id = v_package_id;

  insert into public.event_package_extras (
    package_id,
    extra_id
  )
  select
    v_package_id,
    ids.extra_id
  from unnest(coalesce(p_extra_ids, '{}'::uuid[])) as ids(extra_id);

  return v_package_id;
end;
$$;

revoke all on function public.save_event_package_admin(
  uuid, uuid, text, text, numeric, integer, numeric, integer, boolean, uuid[]
) from public;
grant execute on function public.save_event_package_admin(
  uuid, uuid, text, text, numeric, integer, numeric, integer, boolean, uuid[]
) to authenticated;

-- Incluye los extras ligados a cada paquete en la lectura administrativa.
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
        'extraIds', coalesce((
          select jsonb_agg(pe.extra_id order by e.position, e.created_at, e.id)
          from public.event_package_extras pe
          join public.event_extras e on e.id = pe.extra_id
          where pe.package_id = p.id
        ), '[]'::jsonb),
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
