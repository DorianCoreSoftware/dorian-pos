-- ============================================================
-- DORIAN POS
-- EVENTOS - FASE 5
-- Solicitud pública + recálculo seguro + bandeja administrativa
-- ============================================================

alter table public.event_requests
  add column if not exists event_type_name text,
  add column if not exists package_name text,
  add column if not exists package_base_price numeric(12,2) not null default 0,
  add column if not exists package_included_guests integer not null default 0,
  add column if not exists package_extra_guest_price numeric(12,2) not null default 0,
  add column if not exists additional_guest_count integer not null default 0,
  add column if not exists additional_guest_subtotal numeric(12,2) not null default 0;

create index if not exists event_requests_status_created_at_idx
  on public.event_requests (status, created_at desc);

create or replace function public.create_public_event_request(
  p_event_type_id uuid,
  p_package_id uuid,
  p_event_date date,
  p_event_time time,
  p_guest_count integer,
  p_customer_name text,
  p_customer_phone text,
  p_customer_email text,
  p_customer_notes text,
  p_extras jsonb default '[]'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_enabled boolean := false;
  v_min_guests integer;
  v_max_guests integer;
  v_min_advance_hours integer;
  v_max_advance_days integer;
  v_type_name text;
  v_package_name text;
  v_base_price numeric(12,2);
  v_included_guests integer;
  v_extra_guest_price numeric(12,2);
  v_additional_guests integer;
  v_additional_subtotal numeric(12,2);
  v_extras_total numeric(12,2) := 0;
  v_estimated_total numeric(12,2);
  v_request_id uuid;
  v_folio bigint;
  v_created_at timestamptz;
  v_item jsonb;
  v_extra_id uuid;
  v_extra_name text;
  v_pricing_type text;
  v_unit_price numeric(12,2);
  v_quantity numeric(12,2);
  v_subtotal numeric(12,2);
  v_min_date date;
  v_max_date date;
begin
  select
    coalesce(bs.events_enabled, false)
      and coalesce(es.public_quote_enabled, false),
    es.min_guests,
    es.max_guests,
    es.min_advance_hours,
    es.max_advance_days
  into
    v_enabled,
    v_min_guests,
    v_max_guests,
    v_min_advance_hours,
    v_max_advance_days
  from public.business_settings bs
  cross join public.event_settings es
  where bs.id = 1
    and es.id = 1;

  if not coalesce(v_enabled, false) then
    raise exception 'El cotizador de eventos no está disponible en este momento';
  end if;

  if p_guest_count is null
     or p_guest_count < v_min_guests
     or p_guest_count > v_max_guests then
    raise exception 'La cantidad de personas está fuera del rango permitido';
  end if;

  v_min_date := current_date + ceil(v_min_advance_hours / 24.0)::integer;
  v_max_date := current_date + v_max_advance_days;

  if p_event_date is null
     or p_event_date < v_min_date
     or p_event_date > v_max_date then
    raise exception 'La fecha del evento está fuera del rango permitido';
  end if;

  if length(trim(coalesce(p_customer_name, ''))) < 2
     or length(trim(coalesce(p_customer_name, ''))) > 120 then
    raise exception 'Escribe un nombre válido';
  end if;

  if length(trim(coalesce(p_customer_phone, ''))) < 7
     or length(trim(coalesce(p_customer_phone, ''))) > 30 then
    raise exception 'Escribe un teléfono válido';
  end if;

  if length(trim(coalesce(p_customer_email, ''))) > 160 then
    raise exception 'El correo es demasiado largo';
  end if;

  if length(trim(coalesce(p_customer_notes, ''))) > 1200 then
    raise exception 'Los comentarios no pueden superar 1200 caracteres';
  end if;

  select
    t.name,
    p.name,
    p.base_price,
    p.included_guests,
    p.extra_guest_price
  into
    v_type_name,
    v_package_name,
    v_base_price,
    v_included_guests,
    v_extra_guest_price
  from public.event_packages p
  join public.event_types t
    on t.id = p.event_type_id
  where p.id = p_package_id
    and p.event_type_id = p_event_type_id
    and p.is_active = true
    and t.is_active = true;

  if v_package_name is null then
    raise exception 'El tipo de evento o paquete ya no está disponible';
  end if;

  v_additional_guests := greatest(0, p_guest_count - v_included_guests);
  v_additional_subtotal := v_additional_guests * v_extra_guest_price;

  if jsonb_typeof(coalesce(p_extras, '[]'::jsonb)) <> 'array' then
    raise exception 'La selección de extras no es válida';
  end if;

  create temporary table if not exists pg_temp.event_request_extra_calc (
    extra_id uuid,
    extra_name text,
    pricing_type text,
    unit_price numeric(12,2),
    quantity numeric(12,2),
    subtotal numeric(12,2)
  ) on commit drop;

  truncate table pg_temp.event_request_extra_calc;

  for v_item in
    select value
    from jsonb_array_elements(coalesce(p_extras, '[]'::jsonb))
  loop
    begin
      v_extra_id := nullif(v_item->>'extraId', '')::uuid;
    exception
      when others then
        raise exception 'Uno de los extras seleccionados no es válido';
    end;

    if exists (
      select 1
      from pg_temp.event_request_extra_calc c
      where c.extra_id = v_extra_id
    ) then
      continue;
    end if;

    select
      e.name,
      e.pricing_type,
      e.price
    into
      v_extra_name,
      v_pricing_type,
      v_unit_price
    from public.event_package_extras pe
    join public.event_extras e
      on e.id = pe.extra_id
    where pe.package_id = p_package_id
      and pe.extra_id = v_extra_id
      and e.is_active = true;

    if v_extra_name is null then
      raise exception 'Uno de los extras ya no está disponible para este paquete';
    end if;

    if v_pricing_type = 'fixed' then
      v_quantity := 1;
    elsif v_pricing_type = 'per_guest' then
      v_quantity := p_guest_count;
    elsif v_pricing_type = 'per_unit' then
      v_quantity := greatest(1, floor(coalesce(nullif(v_item->>'quantity', '')::numeric, 1)));
      if v_quantity > 100 then
        raise exception 'La cantidad de un extra no puede superar 100 unidades';
      end if;
    else
      raise exception 'El tipo de precio de un extra no es válido';
    end if;

    v_subtotal := round(v_unit_price * v_quantity, 2);

    insert into pg_temp.event_request_extra_calc (
      extra_id,
      extra_name,
      pricing_type,
      unit_price,
      quantity,
      subtotal
    ) values (
      v_extra_id,
      v_extra_name,
      v_pricing_type,
      v_unit_price,
      v_quantity,
      v_subtotal
    );

    v_extras_total := v_extras_total + v_subtotal;
    v_extra_name := null;
  end loop;

  v_estimated_total := round(
    v_base_price + v_additional_subtotal + v_extras_total,
    2
  );

  insert into public.event_requests (
    status,
    event_type_id,
    package_id,
    event_type_name,
    package_name,
    event_date,
    event_time,
    guest_count,
    customer_name,
    customer_phone,
    customer_email,
    customer_notes,
    package_base_price,
    package_included_guests,
    package_extra_guest_price,
    additional_guest_count,
    additional_guest_subtotal,
    estimated_total
  ) values (
    'new',
    p_event_type_id,
    p_package_id,
    v_type_name,
    v_package_name,
    p_event_date,
    p_event_time,
    p_guest_count,
    trim(p_customer_name),
    trim(p_customer_phone),
    nullif(trim(coalesce(p_customer_email, '')), ''),
    nullif(trim(coalesce(p_customer_notes, '')), ''),
    v_base_price,
    v_included_guests,
    v_extra_guest_price,
    v_additional_guests,
    v_additional_subtotal,
    v_estimated_total
  )
  returning id, folio, created_at
  into v_request_id, v_folio, v_created_at;

  insert into public.event_request_extras (
    request_id,
    extra_id,
    extra_name,
    pricing_type,
    unit_price,
    quantity,
    subtotal
  )
  select
    v_request_id,
    c.extra_id,
    c.extra_name,
    c.pricing_type,
    c.unit_price,
    c.quantity,
    c.subtotal
  from pg_temp.event_request_extra_calc c;

  return jsonb_build_object(
    'id', v_request_id,
    'folio', v_folio,
    'estimatedTotal', v_estimated_total,
    'status', 'new',
    'createdAt', v_created_at
  );
end;
$$;

revoke all on function public.create_public_event_request(
  uuid,
  uuid,
  date,
  time,
  integer,
  text,
  text,
  text,
  text,
  jsonb
) from public;

grant execute on function public.create_public_event_request(
  uuid,
  uuid,
  date,
  time,
  integer,
  text,
  text,
  text,
  text,
  jsonb
) to anon, authenticated;


create or replace function public.get_event_requests_admin()
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
    raise exception 'No tienes permisos para consultar solicitudes de eventos';
  end if;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', r.id,
        'folio', r.folio,
        'status', r.status,
        'eventTypeId', r.event_type_id,
        'eventTypeName', coalesce(r.event_type_name, t.name, ''),
        'packageId', r.package_id,
        'packageName', coalesce(r.package_name, p.name, ''),
        'eventDate', r.event_date,
        'eventTime', r.event_time,
        'guestCount', r.guest_count,
        'customerName', r.customer_name,
        'customerPhone', coalesce(r.customer_phone, ''),
        'customerEmail', coalesce(r.customer_email, ''),
        'customerNotes', coalesce(r.customer_notes, ''),
        'packageBasePrice', r.package_base_price,
        'packageIncludedGuests', r.package_included_guests,
        'packageExtraGuestPrice', r.package_extra_guest_price,
        'additionalGuestCount', r.additional_guest_count,
        'additionalGuestSubtotal', r.additional_guest_subtotal,
        'estimatedTotal', r.estimated_total,
        'quotedTotal', r.quoted_total,
        'adminNotes', coalesce(r.admin_notes, ''),
        'createdAt', r.created_at,
        'updatedAt', r.updated_at,
        'extras', coalesce((
          select jsonb_agg(
            jsonb_build_object(
              'id', re.id,
              'extraId', re.extra_id,
              'extraName', re.extra_name,
              'pricingType', re.pricing_type,
              'unitPrice', re.unit_price,
              'quantity', re.quantity,
              'subtotal', re.subtotal
            )
            order by re.id
          )
          from public.event_request_extras re
          where re.request_id = r.id
        ), '[]'::jsonb)
      )
      order by r.created_at desc, r.folio desc
    ),
    '[]'::jsonb
  )
  into v_result
  from public.event_requests r
  left join public.event_types t
    on t.id = r.event_type_id
  left join public.event_packages p
    on p.id = r.package_id;

  return v_result;
end;
$$;

revoke all on function public.get_event_requests_admin() from public;
grant execute on function public.get_event_requests_admin() to authenticated;


create or replace function public.update_event_request_admin(
  p_request_id uuid,
  p_status text,
  p_quoted_total numeric,
  p_admin_notes text
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
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
    raise exception 'No tienes permisos para actualizar solicitudes de eventos';
  end if;

  if p_status not in (
    'new',
    'reviewing',
    'quoted',
    'accepted',
    'rejected',
    'cancelled',
    'completed'
  ) then
    raise exception 'Estado de solicitud no válido';
  end if;

  if p_quoted_total is not null and p_quoted_total < 0 then
    raise exception 'El total cotizado no puede ser negativo';
  end if;

  if length(trim(coalesce(p_admin_notes, ''))) > 3000 then
    raise exception 'Las notas internas no pueden superar 3000 caracteres';
  end if;

  update public.event_requests
  set
    status = p_status,
    quoted_total = p_quoted_total,
    admin_notes = nullif(trim(coalesce(p_admin_notes, '')), ''),
    updated_at = now()
  where id = p_request_id;

  if not found then
    raise exception 'Solicitud de evento no encontrada';
  end if;

  return jsonb_build_object('ok', true);
end;
$$;

revoke all on function public.update_event_request_admin(uuid, text, numeric, text) from public;
grant execute on function public.update_event_request_admin(uuid, text, numeric, text) to authenticated;
