-- ============================================================
-- WEB CUSTOMER SAVED ADDRESSES
-- 2026-11-05
-- ============================================================

create table if not exists public.web_customer_addresses (
  id uuid primary key default gen_random_uuid(),

  customer_id uuid not null
    references public.web_customers(id)
    on delete cascade,

  label text not null default 'Principal',

  street text not null,
  exterior_number text not null,
  interior_number text null,

  neighborhood text not null,
  postal_code text null,

  delivery_references text null,

  latitude double precision not null,
  longitude double precision not null,

  is_default boolean not null default true,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint web_customer_addresses_label_not_empty
    check (length(trim(label)) > 0),

  constraint web_customer_addresses_street_not_empty
    check (length(trim(street)) > 0),

  constraint web_customer_addresses_exterior_not_empty
    check (length(trim(exterior_number)) > 0),

  constraint web_customer_addresses_neighborhood_not_empty
    check (length(trim(neighborhood)) > 0),

  constraint web_customer_addresses_latitude_valid
    check (latitude between -90 and 90),

  constraint web_customer_addresses_longitude_valid
    check (longitude between -180 and 180)
);

create index if not exists web_customer_addresses_customer_idx
on public.web_customer_addresses (
  customer_id,
  updated_at desc
);

create unique index if not exists web_customer_addresses_one_default_idx
on public.web_customer_addresses (customer_id)
where is_default = true;

alter table public.web_customer_addresses
enable row level security;

-- Sin policies públicas.
-- El cliente web solo accede mediante RPC SECURITY DEFINER.


create or replace function public.get_my_web_customer_default_address(
  p_session_token text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_customer_id uuid;
  v_result jsonb;
begin
  v_customer_id :=
    public.resolve_web_customer_session(
      p_session_token
    );

  select jsonb_build_object(
    'id', a.id,
    'label', a.label,
    'street', a.street,
    'exteriorNumber', a.exterior_number,
    'interiorNumber', coalesce(a.interior_number, ''),
    'neighborhood', a.neighborhood,
    'postalCode', coalesce(a.postal_code, ''),
    'deliveryReferences', coalesce(a.delivery_references, ''),
    'latitude', a.latitude,
    'longitude', a.longitude,
    'isDefault', a.is_default,
    'updatedAt', a.updated_at
  )
  into v_result
  from public.web_customer_addresses a
  where a.customer_id = v_customer_id
    and a.is_default = true
  order by a.updated_at desc
  limit 1;

  return v_result;
end;
$$;

revoke all
on function public.get_my_web_customer_default_address(text)
from public;

grant execute
on function public.get_my_web_customer_default_address(text)
to anon, authenticated;


create or replace function public.save_my_web_customer_default_address(
  p_session_token text,
  p_label text,
  p_street text,
  p_exterior_number text,
  p_interior_number text,
  p_neighborhood text,
  p_postal_code text,
  p_delivery_references text,
  p_latitude double precision,
  p_longitude double precision
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_customer_id uuid;
  v_address_id uuid;
  v_result jsonb;
begin
  v_customer_id :=
    public.resolve_web_customer_session(
      p_session_token
    );

  if trim(coalesce(p_street, '')) = '' then
    raise exception 'La calle es obligatoria.';
  end if;

  if trim(coalesce(p_exterior_number, '')) = '' then
    raise exception 'El número exterior es obligatorio.';
  end if;

  if trim(coalesce(p_neighborhood, '')) = '' then
    raise exception 'La colonia es obligatoria.';
  end if;

  if p_latitude is null
     or p_latitude < -90
     or p_latitude > 90
     or p_longitude is null
     or p_longitude < -180
     or p_longitude > 180
  then
    raise exception 'Las coordenadas de la dirección no son válidas.';
  end if;

  select a.id
  into v_address_id
  from public.web_customer_addresses a
  where a.customer_id = v_customer_id
    and a.is_default = true
  order by a.updated_at desc
  limit 1
  for update;

  if v_address_id is null then
    update public.web_customer_addresses
    set is_default = false,
        updated_at = now()
    where customer_id = v_customer_id
      and is_default = true;

    insert into public.web_customer_addresses (
      customer_id,
      label,
      street,
      exterior_number,
      interior_number,
      neighborhood,
      postal_code,
      delivery_references,
      latitude,
      longitude,
      is_default
    )
    values (
      v_customer_id,
      coalesce(
        nullif(trim(coalesce(p_label, '')), ''),
        'Principal'
      ),
      trim(p_street),
      trim(p_exterior_number),
      nullif(trim(coalesce(p_interior_number, '')), ''),
      trim(p_neighborhood),
      nullif(trim(coalesce(p_postal_code, '')), ''),
      nullif(trim(coalesce(p_delivery_references, '')), ''),
      p_latitude,
      p_longitude,
      true
    )
    returning id
    into v_address_id;
  else
    update public.web_customer_addresses
    set
      label = coalesce(
        nullif(trim(coalesce(p_label, '')), ''),
        'Principal'
      ),
      street = trim(p_street),
      exterior_number = trim(p_exterior_number),
      interior_number =
        nullif(
          trim(
            coalesce(
              p_interior_number,
              ''
            )
          ),
          ''
        ),
      neighborhood = trim(p_neighborhood),
      postal_code =
        nullif(
          trim(
            coalesce(
              p_postal_code,
              ''
            )
          ),
          ''
        ),
      delivery_references =
        nullif(
          trim(
            coalesce(
              p_delivery_references,
              ''
            )
          ),
          ''
        ),
      latitude = p_latitude,
      longitude = p_longitude,
      is_default = true,
      updated_at = now()
    where id = v_address_id;
  end if;

  select jsonb_build_object(
    'id', a.id,
    'label', a.label,
    'street', a.street,
    'exteriorNumber', a.exterior_number,
    'interiorNumber', coalesce(a.interior_number, ''),
    'neighborhood', a.neighborhood,
    'postalCode', coalesce(a.postal_code, ''),
    'deliveryReferences', coalesce(a.delivery_references, ''),
    'latitude', a.latitude,
    'longitude', a.longitude,
    'isDefault', a.is_default,
    'updatedAt', a.updated_at
  )
  into v_result
  from public.web_customer_addresses a
  where a.id = v_address_id;

  return v_result;
end;
$$;

revoke all
on function public.save_my_web_customer_default_address(
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  double precision,
  double precision
)
from public;

grant execute
on function public.save_my_web_customer_default_address(
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  double precision,
  double precision
)
to anon, authenticated;

comment on table public.web_customer_addresses is
'Direcciones guardadas por clientes web. Preparada para múltiples direcciones; la UI actual usa la dirección predeterminada.';
