create table if not exists public.delivery_settings (
  id boolean primary key default true
    check (id = true),

  business_latitude double precision,
  business_longitude double precision,

  is_enabled boolean not null default true,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.delivery_settings (
  id,
  is_enabled
)
values (
  true,
  true
)
on conflict (id) do nothing;


create table if not exists public.delivery_zones (
  id uuid primary key default gen_random_uuid(),

  name text not null,

  min_distance_km numeric(8, 2)
    not null default 0,

  max_distance_km numeric(8, 2)
    not null,

  extra_fee numeric(10, 2)
    not null default 0,

  is_active boolean
    not null default true,

  sort_order integer
    not null default 0,

  created_at timestamptz
    not null default now(),

  updated_at timestamptz
    not null default now(),

  constraint delivery_zones_distance_check
    check (
      min_distance_km >= 0
      and max_distance_km > min_distance_km
    ),

  constraint delivery_zones_extra_fee_check
    check (
      extra_fee >= 0
    )
);


create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();

  return new;
end;
$$;


drop trigger if exists set_delivery_settings_updated_at
on public.delivery_settings;

create trigger set_delivery_settings_updated_at
before update
on public.delivery_settings
for each row
execute function public.set_updated_at();


drop trigger if exists set_delivery_zones_updated_at
on public.delivery_zones;

create trigger set_delivery_zones_updated_at
before update
on public.delivery_zones
for each row
execute function public.set_updated_at();


alter table public.delivery_settings
enable row level security;

alter table public.delivery_zones
enable row level security;


drop policy if exists
"Authenticated users can read delivery settings"
on public.delivery_settings;

create policy
"Authenticated users can read delivery settings"
on public.delivery_settings
for select
to authenticated
using (true);


drop policy if exists
"Authenticated users can manage delivery settings"
on public.delivery_settings;

create policy
"Authenticated users can manage delivery settings"
on public.delivery_settings
for all
to authenticated
using (true)
with check (true);


drop policy if exists
"Public can read active delivery zones"
on public.delivery_zones;

create policy
"Public can read active delivery zones"
on public.delivery_zones
for select
to anon, authenticated
using (
  is_active = true
);


drop policy if exists
"Authenticated users can manage delivery zones"
on public.delivery_zones;

create policy
"Authenticated users can manage delivery zones"
on public.delivery_zones
for all
to authenticated
using (true)
with check (true);


create or replace function public.get_delivery_quote(
  p_latitude double precision,
  p_longitude double precision
)
returns table (
  available boolean,
  distance_km numeric,
  zone_id uuid,
  zone_name text,
  extra_fee numeric
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_business_lat double precision;
  v_business_lng double precision;
  v_enabled boolean;

  v_distance double precision;
begin
  if
    p_latitude is null
    or p_longitude is null
    or p_latitude < -90
    or p_latitude > 90
    or p_longitude < -180
    or p_longitude > 180
  then
    raise exception
      'La ubicación de entrega no es válida.';
  end if;


  select
    business_latitude,
    business_longitude,
    is_enabled
  into
    v_business_lat,
    v_business_lng,
    v_enabled
  from public.delivery_settings
  where id = true;


  if not found then
    raise exception
      'La configuración de entrega no existe.';
  end if;


  if not coalesce(
    v_enabled,
    false
  ) then
    return query
    select
      false,
      null::numeric,
      null::uuid,
      null::text,
      0::numeric;

    return;
  end if;


  if
    v_business_lat is null
    or v_business_lng is null
  then
    raise exception
      'La ubicación del negocio no está configurada.';
  end if;


  if
    v_business_lat < -90
    or v_business_lat > 90
    or v_business_lng < -180
    or v_business_lng > 180
  then
    raise exception
      'La ubicación configurada del negocio no es válida.';
  end if;


  v_distance :=
    6371 * 2 * asin(
      sqrt(
        power(
          sin(
            radians(
              p_latitude -
              v_business_lat
            ) / 2
          ),
          2
        )
        +
        cos(
          radians(
            v_business_lat
          )
        )
        *
        cos(
          radians(
            p_latitude
          )
        )
        *
        power(
          sin(
            radians(
              p_longitude -
              v_business_lng
            ) / 2
          ),
          2
        )
      )
    );


  return query
  select
    true,
    round(
      v_distance::numeric,
      2
    ),
    dz.id,
    dz.name,
    dz.extra_fee
  from public.delivery_zones dz
  where
    dz.is_active = true
    and v_distance >=
      dz.min_distance_km
    and v_distance <
      dz.max_distance_km
  order by
    dz.sort_order,
    dz.max_distance_km
  limit 1;


  if not found then
    return query
    select
      false,
      round(
        v_distance::numeric,
        2
      ),
      null::uuid,
      null::text,
      0::numeric;
  end if;
end;
$$;


revoke all
on function public.get_delivery_quote(
  double precision,
  double precision
)
from public;


grant execute
on function public.get_delivery_quote(
  double precision,
  double precision
)
to anon, authenticated;