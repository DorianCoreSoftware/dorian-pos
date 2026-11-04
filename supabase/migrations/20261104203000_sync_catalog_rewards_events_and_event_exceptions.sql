-- ============================================================
-- DORIAN POS
-- Catálogo sincronizado: Rewards + Eventos + excepciones de horario
-- ============================================================

-- ------------------------------------------------------------
-- 1. EVENTOS: productos incluidos por paquete
-- ------------------------------------------------------------

create table if not exists public.event_package_items (
  id uuid primary key default gen_random_uuid(),
  package_id uuid not null references public.event_packages(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete restrict,
  quantity numeric(10,2) not null default 1,
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint event_package_items_quantity_positive check (quantity > 0),
  constraint event_package_items_position_non_negative check (position >= 0),
  constraint event_package_items_package_product_unique unique (package_id, product_id)
);

create index if not exists event_package_items_package_idx
  on public.event_package_items(package_id, position);

create index if not exists event_package_items_product_idx
  on public.event_package_items(product_id);

alter table public.event_package_items enable row level security;

drop trigger if exists event_package_items_set_updated_at
  on public.event_package_items;

create trigger event_package_items_set_updated_at
before update on public.event_package_items
for each row execute function public.set_updated_at();

alter table public.event_packages
  add column if not exists sync_catalog_pricing boolean not null default false,
  add column if not exists base_price_factor numeric(12,6) null,
  add column if not exists extra_guest_price_factor numeric(12,6) null;

alter table public.event_extras
  add column if not exists product_id uuid null
    references public.products(id) on delete set null;

create index if not exists event_extras_product_idx
  on public.event_extras(product_id)
  where product_id is not null;

-- ------------------------------------------------------------
-- 2. Vincular datos existentes de Burger Kong sin afectar otros clientes.
--    Si las filas no existen, simplemente no inserta nada.
-- ------------------------------------------------------------

with package_products(package_name, product_name, quantity, position) as (
  values
    ('Kong Mini', 'Hamburguesa sencilla', 10::numeric, 0),
    ('Kong Mini', 'Papas Sencillas', 10, 1),
    ('Kong Mini', 'Coca-Cola 355ml.', 10, 2),

    ('Hot Dog Party', 'Hot-Dog especial', 15, 0),
    ('Hot Dog Party', 'Papas Sencillas', 15, 1),
    ('Hot Dog Party', 'Coca-Cola 355ml.', 15, 2),

    ('Burger Party', 'Hamburguesa especial', 15, 0),
    ('Burger Party', 'Papas Sencillas', 15, 1),
    ('Burger Party', 'Coca-Cola 355ml.', 15, 2),

    ('Alitas Night', 'Alitas 12 piezas', 5, 0),
    ('Alitas Night', 'Papas Sencillas', 15, 1),
    ('Alitas Night', 'Coca-Cola 355ml.', 15, 2),

    ('Boneless Party', 'Boneless 150 gramos', 15, 0),
    ('Boneless Party', 'Papas Sencillas', 15, 1),
    ('Boneless Party', 'Coca-Cola 355ml.', 15, 2),

    ('Cumple Kong', 'Hamburguesa especial', 20, 0),
    ('Cumple Kong', 'Papas Sencillas', 20, 1),
    ('Cumple Kong', 'Coca-Cola 355ml.', 20, 2),
    ('Cumple Kong', 'Galleta', 20, 3),

    ('Familiar Mixto', 'Hamburguesa especial', 15, 0),
    ('Familiar Mixto', 'Hot-Dog especial', 10, 1),
    ('Familiar Mixto', 'Papas Sencillas', 25, 2),
    ('Familiar Mixto', 'Coca-Cola 355ml.', 25, 3),

    ('Kong Office', 'Combo Hamburguesa sencilla', 30, 0),

    ('Kong Fest', 'Hamburguesa especial', 20, 0),
    ('Kong Fest', 'Hot-Dog especial', 20, 1),
    ('Kong Fest', 'Papas Sencillas', 40, 2),
    ('Kong Fest', 'Coca-Cola 355ml.', 40, 3),
    ('Kong Fest', 'Dedos de Queso orden', 4, 4),

    ('Kong Premium', 'Kong Burger', 25, 0),
    ('Kong Premium', 'Hot-Dog Kong', 25, 1),
    ('Kong Premium', 'Papas Sencillas', 50, 2),
    ('Kong Premium', 'Coca-Cola 355ml.', 50, 3),
    ('Kong Premium', 'Galleta', 50, 4)
)
insert into public.event_package_items(package_id, product_id, quantity, position)
select ep.id, pr.id, pp.quantity, pp.position
from package_products pp
join public.event_packages ep
  on lower(trim(ep.name)) = lower(trim(pp.package_name))
join public.products pr
  on lower(trim(pr.name)) = lower(trim(pp.product_name))
on conflict (package_id, product_id) do update
set quantity = excluded.quantity,
    position = excluded.position,
    updated_at = now();

-- Extras existentes -> producto real.
update public.event_extras e
set product_id = p.id,
    name = p.name,
    description = p.description,
    price = p.price,
    updated_at = now()
from public.products p
where e.product_id is null
  and (
    lower(trim(e.name)) = lower(trim(p.name))
    or (lower(trim(e.name)) = '6 alitas' and lower(trim(p.name)) = 'alitas 6 piezas')
    or (lower(trim(e.name)) = 'refresco 355 ml' and lower(trim(p.name)) = 'coca-cola 355ml.')
  );

-- Rewards: nombre y descripción siempre parten del producto actual.
update public.loyalty_rewards r
set name = p.name,
    description = p.description,
    updated_at = now()
from public.products p
where r.product_id = p.id
  and (
    r.name is distinct from p.name
    or r.description is distinct from p.description
  );

-- Promociones vinculadas a producto: al menos el nombre debe seguir al catálogo.
update public.promotion_rewards r
set display_name = p.name,
    updated_at = now()
from public.products p
where r.product_id = p.id
  and r.display_name is distinct from p.name;

-- Inicializa factores conservando exactamente el precio/descuento actual.
with totals as (
  select
    ep.id,
    ep.base_price,
    ep.extra_guest_price,
    ep.included_guests,
    sum(i.quantity * p.price)::numeric as catalog_total
  from public.event_packages ep
  join public.event_package_items i on i.package_id = ep.id
  join public.products p on p.id = i.product_id
  group by ep.id
)
update public.event_packages ep
set
  sync_catalog_pricing = true,
  base_price_factor = case
    when t.catalog_total > 0 then ep.base_price / t.catalog_total
    else 1
  end,
  extra_guest_price_factor = case
    when t.catalog_total > 0 and ep.included_guests > 0
      then ep.extra_guest_price / (t.catalog_total / ep.included_guests)
    else 1
  end,
  updated_at = now()
from totals t
where ep.id = t.id;

-- ------------------------------------------------------------
-- 3. Recalcular un paquete desde precios actuales de products.
-- ------------------------------------------------------------

create or replace function public.refresh_event_package_catalog_pricing(
  p_package_id uuid
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_total numeric(12,2);
  v_package public.event_packages%rowtype;
begin
  select * into v_package
  from public.event_packages
  where id = p_package_id;

  if not found or not coalesce(v_package.sync_catalog_pricing, false) then
    return;
  end if;

  select round(coalesce(sum(i.quantity * p.price), 0), 2)
  into v_total
  from public.event_package_items i
  join public.products p on p.id = i.product_id
  where i.package_id = p_package_id;

  if v_total <= 0 then
    return;
  end if;

  update public.event_packages
  set
    base_price = round(v_total * coalesce(base_price_factor, 1), 2),
    extra_guest_price = round(
      (v_total / greatest(1, included_guests))
      * coalesce(extra_guest_price_factor, 1),
      2
    ),
    updated_at = now()
  where id = p_package_id;
end;
$$;

revoke all on function public.refresh_event_package_catalog_pricing(uuid) from public;

create or replace function public.sync_catalog_product_dependents()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_package_id uuid;
begin
  -- Configuraciones vivas: nunca tocar snapshots históricos de órdenes/cotizaciones.
  update public.loyalty_rewards
  set name = new.name,
      description = new.description,
      updated_at = now()
  where product_id = new.id
    and (
      name is distinct from new.name
      or description is distinct from new.description
    );

  update public.promotion_rewards
  set display_name = new.name,
      updated_at = now()
  where product_id = new.id
    and display_name is distinct from new.name;

  update public.event_extras
  set name = new.name,
      description = new.description,
      price = new.price,
      updated_at = now()
  where product_id = new.id
    and (
      name is distinct from new.name
      or description is distinct from new.description
      or price is distinct from new.price
    );

  if new.price is distinct from old.price then
    for v_package_id in
      select distinct i.package_id
      from public.event_package_items i
      where i.product_id = new.id
    loop
      perform public.refresh_event_package_catalog_pricing(v_package_id);
    end loop;
  end if;

  return new;
end;
$$;

drop trigger if exists products_sync_catalog_dependents
  on public.products;

create trigger products_sync_catalog_dependents
after update of name, description, price on public.products
for each row
execute function public.sync_catalog_product_dependents();


-- ------------------------------------------------------------
-- 3b. Canonicalización: si una configuración apunta a un producto,
--     nombre/descripción/precio vienen siempre de products.
-- ------------------------------------------------------------

create or replace function public.canonicalize_loyalty_reward_product()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_product public.products%rowtype;
begin
  if new.product_id is null then
    return new;
  end if;

  select * into v_product
  from public.products
  where id = new.product_id;

  if found then
    new.name := v_product.name;
    new.description := v_product.description;
  end if;

  return new;
end;
$$;

drop trigger if exists loyalty_rewards_canonical_product
  on public.loyalty_rewards;

create trigger loyalty_rewards_canonical_product
before insert or update of product_id, name, description
on public.loyalty_rewards
for each row
execute function public.canonicalize_loyalty_reward_product();


create or replace function public.canonicalize_promotion_reward_product()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_name text;
begin
  if new.product_id is null then
    return new;
  end if;

  select name into v_name
  from public.products
  where id = new.product_id;

  if v_name is not null then
    new.display_name := v_name;
  end if;

  return new;
end;
$$;

drop trigger if exists promotion_rewards_canonical_product
  on public.promotion_rewards;

create trigger promotion_rewards_canonical_product
before insert or update of product_id, display_name
on public.promotion_rewards
for each row
execute function public.canonicalize_promotion_reward_product();


create or replace function public.canonicalize_event_extra_product()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_product public.products%rowtype;
begin
  if new.product_id is null then
    return new;
  end if;

  select * into v_product
  from public.products
  where id = new.product_id;

  if found then
    new.name := v_product.name;
    new.description := v_product.description;
    new.price := v_product.price;
  end if;

  return new;
end;
$$;

drop trigger if exists event_extras_canonical_product
  on public.event_extras;

create trigger event_extras_canonical_product
before insert or update of product_id, name, description, price
on public.event_extras
for each row
execute function public.canonicalize_event_extra_product();

-- ------------------------------------------------------------
-- 4. Guardado de paquetes con productos incluidos.
-- ------------------------------------------------------------

drop function if exists public.save_event_package_admin(
  uuid, uuid, text, text, numeric, integer, numeric, integer, boolean, uuid[]
);

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
  p_extra_ids uuid[] default '{}'::uuid[],
  p_items jsonb default '[]'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_package_id uuid;
  v_extra_count integer;
  v_item jsonb;
  v_product_id uuid;
  v_quantity numeric;
  v_position integer := 0;
  v_catalog_total numeric(12,2) := 0;
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

  insert into public.event_package_extras(package_id, extra_id)
  select v_package_id, ids.extra_id
  from unnest(coalesce(p_extra_ids, '{}'::uuid[])) as ids(extra_id);

  if jsonb_typeof(coalesce(p_items, '[]'::jsonb)) <> 'array' then
    raise exception 'La lista de productos del paquete no es válida';
  end if;

  delete from public.event_package_items
  where package_id = v_package_id;

  for v_item in
    select value from jsonb_array_elements(coalesce(p_items, '[]'::jsonb))
  loop
    begin
      v_product_id := nullif(v_item->>'productId', '')::uuid;
      v_quantity := (v_item->>'quantity')::numeric;
    exception when others then
      raise exception 'Uno de los productos incluidos no es válido';
    end;

    if v_product_id is null
       or v_quantity is null
       or v_quantity <= 0
       or not exists (
         select 1 from public.products
         where id = v_product_id and is_active = true
       ) then
      raise exception 'Uno de los productos incluidos no es válido';
    end if;

    insert into public.event_package_items(
      package_id, product_id, quantity, position
    ) values (
      v_package_id, v_product_id, v_quantity, v_position
    );

    v_position := v_position + 1;
  end loop;

  select round(coalesce(sum(i.quantity * p.price), 0), 2)
  into v_catalog_total
  from public.event_package_items i
  join public.products p on p.id = i.product_id
  where i.package_id = v_package_id;

  update public.event_packages
  set
    sync_catalog_pricing = (v_catalog_total > 0),
    base_price_factor = case
      when v_catalog_total > 0 then p_base_price / v_catalog_total
      else null
    end,
    extra_guest_price_factor = case
      when v_catalog_total > 0 and p_included_guests > 0
        then p_extra_guest_price / (v_catalog_total / p_included_guests)
      else null
    end,
    updated_at = now()
  where id = v_package_id;

  return v_package_id;
end;
$$;

revoke all on function public.save_event_package_admin(
  uuid, uuid, text, text, numeric, integer, numeric, integer, boolean, uuid[], jsonb
) from public;

grant execute on function public.save_event_package_admin(
  uuid, uuid, text, text, numeric, integer, numeric, integer, boolean, uuid[], jsonb
) to authenticated;

-- ------------------------------------------------------------
-- 5. Extras administrables vinculados opcionalmente a products.
-- ------------------------------------------------------------

create or replace function public.save_event_extra_admin(
  p_extra_id uuid,
  p_product_id uuid,
  p_name text,
  p_description text,
  p_pricing_type text,
  p_price numeric,
  p_is_active boolean
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_id uuid;
  v_product public.products%rowtype;
  v_name text;
  v_description text;
  v_price numeric;
begin
  perform public.assert_events_admin();

  if p_pricing_type not in ('fixed', 'per_guest', 'per_unit') then
    raise exception 'Tipo de precio inválido';
  end if;

  if p_product_id is not null then
    select * into v_product
    from public.products
    where id = p_product_id
      and is_active = true;

    if not found then
      raise exception 'Selecciona un producto válido';
    end if;

    v_name := v_product.name;
    v_description := v_product.description;
    v_price := v_product.price;
  else
    v_name := trim(coalesce(p_name, ''));
    v_description := nullif(trim(coalesce(p_description, '')), '');
    v_price := p_price;
  end if;

  if v_name = '' then
    raise exception 'El nombre del extra es obligatorio';
  end if;

  if coalesce(v_price, 0) < 0 then
    raise exception 'El precio no puede ser negativo';
  end if;

  if p_extra_id is null then
    insert into public.event_extras(
      product_id, name, description, pricing_type, price,
      position, is_active
    )
    values (
      p_product_id, v_name, v_description, p_pricing_type, v_price,
      (select coalesce(max(position), -1) + 1 from public.event_extras),
      coalesce(p_is_active, true)
    )
    returning id into v_id;
  else
    update public.event_extras
    set product_id = p_product_id,
        name = v_name,
        description = v_description,
        pricing_type = p_pricing_type,
        price = v_price,
        is_active = p_is_active,
        updated_at = now()
    where id = p_extra_id
    returning id into v_id;

    if v_id is null then
      raise exception 'Extra no encontrado';
    end if;
  end if;

  return v_id;
exception
  when unique_violation then
    raise exception 'Ya existe un extra con ese nombre';
end;
$$;

revoke all on function public.save_event_extra_admin(
  uuid, uuid, text, text, text, numeric, boolean
) from public;
grant execute on function public.save_event_extra_admin(
  uuid, uuid, text, text, text, numeric, boolean
) to authenticated;

-- ------------------------------------------------------------
-- 6. Catálogo admin: productos + items de paquetes.
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
  v_products jsonb;
begin
  perform public.assert_events_admin();

  select coalesce(jsonb_agg(
    jsonb_build_object(
      'id', t.id,
      'name', t.name,
      'description', coalesce(t.description, ''),
      'position', t.position,
      'isActive', t.is_active
    ) order by t.position, t.created_at, t.id
  ), '[]'::jsonb)
  into v_types
  from public.event_types t;

  select coalesce(jsonb_agg(
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
      'syncCatalogPricing', p.sync_catalog_pricing,
      'items', coalesce((
        select jsonb_agg(
          jsonb_build_object(
            'productId', i.product_id,
            'productName', pr.name,
            'productDescription', coalesce(pr.description, ''),
            'productPrice', pr.price,
            'quantity', i.quantity,
            'position', i.position
          )
          order by i.position, i.created_at, i.id
        )
        from public.event_package_items i
        join public.products pr on pr.id = i.product_id
        where i.package_id = p.id
      ), '[]'::jsonb),
      'extraIds', coalesce((
        select jsonb_agg(pe.extra_id order by e.position, e.created_at, e.id)
        from public.event_package_extras pe
        join public.event_extras e on e.id = pe.extra_id
        where pe.package_id = p.id
      ), '[]'::jsonb),
      'position', p.position,
      'isActive', p.is_active
    ) order by p.position, p.created_at, p.id
  ), '[]'::jsonb)
  into v_packages
  from public.event_packages p
  left join public.event_types t on t.id = p.event_type_id;

  select coalesce(jsonb_agg(
    jsonb_build_object(
      'id', e.id,
      'productId', e.product_id,
      'name', e.name,
      'description', coalesce(e.description, ''),
      'pricingType', e.pricing_type,
      'price', e.price,
      'position', e.position,
      'isActive', e.is_active
    ) order by e.position, e.created_at, e.id
  ), '[]'::jsonb)
  into v_extras
  from public.event_extras e;

  select coalesce(jsonb_agg(
    jsonb_build_object(
      'id', p.id,
      'name', p.name,
      'description', coalesce(p.description, ''),
      'price', p.price
    )
    order by p.name, p.created_at, p.id
  ), '[]'::jsonb)
  into v_products
  from public.products p
  where p.is_active = true
    and p.is_available = true
    and coalesce(p.is_combo_option, false) = false
    and p.price > 0;

  return jsonb_build_object(
    'types', v_types,
    'packages', v_packages,
    'extras', v_extras,
    'products', v_products
  );
end;
$$;

revoke all on function public.get_event_admin_catalog() from public;
grant execute on function public.get_event_admin_catalog() to authenticated;

-- ------------------------------------------------------------
-- 7. Catálogo público: items siempre salen del producto actual.
-- ------------------------------------------------------------

create or replace function public.get_public_event_quote_catalog()
returns jsonb
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  v_enabled boolean := false;
  v_settings jsonb := '{}'::jsonb;
  v_types jsonb := '[]'::jsonb;
  v_packages jsonb := '[]'::jsonb;
  v_extras jsonb := '[]'::jsonb;
begin
  select coalesce(bs.events_enabled, false)
    and coalesce(es.public_quote_enabled, false)
  into v_enabled
  from public.business_settings bs
  cross join public.event_settings es
  where bs.id = 1 and es.id = 1;

  if not coalesce(v_enabled, false) then
    return jsonb_build_object(
      'enabled', false,
      'settings', '{}'::jsonb,
      'types', '[]'::jsonb,
      'packages', '[]'::jsonb,
      'extras', '[]'::jsonb
    );
  end if;

  select jsonb_build_object(
    'minGuests', es.min_guests,
    'maxGuests', es.max_guests,
    'minAdvanceHours', es.min_advance_hours,
    'maxAdvanceDays', es.max_advance_days,
    'quoteDisclaimer', es.quote_disclaimer,
    'terms', es.terms
  )
  into v_settings
  from public.event_settings es
  where es.id = 1;

  select coalesce(jsonb_agg(
    jsonb_build_object(
      'id', t.id,
      'name', t.name,
      'description', coalesce(t.description, ''),
      'position', t.position
    ) order by t.position, t.created_at, t.id
  ), '[]'::jsonb)
  into v_types
  from public.event_types t
  where t.is_active = true
    and exists (
      select 1 from public.event_packages p
      where p.event_type_id = t.id and p.is_active = true
    );

  select coalesce(jsonb_agg(
    jsonb_build_object(
      'id', p.id,
      'eventTypeId', p.event_type_id,
      'name', p.name,
      'description', coalesce(p.description, ''),
      'basePrice', p.base_price,
      'includedGuests', p.included_guests,
      'extraGuestPrice', p.extra_guest_price,
      'durationMinutes', p.duration_minutes,
      'items', coalesce((
        select jsonb_agg(
          jsonb_build_object(
            'productId', i.product_id,
            'productName', pr.name,
            'productDescription', coalesce(pr.description, ''),
            'productPrice', pr.price,
            'quantity', i.quantity
          )
          order by i.position, i.created_at, i.id
        )
        from public.event_package_items i
        join public.products pr on pr.id = i.product_id
        where i.package_id = p.id
      ), '[]'::jsonb),
      'extraIds', coalesce((
        select jsonb_agg(pe.extra_id order by e.position, e.created_at, e.id)
        from public.event_package_extras pe
        join public.event_extras e on e.id = pe.extra_id
        where pe.package_id = p.id and e.is_active = true
      ), '[]'::jsonb),
      'position', p.position
    ) order by p.position, p.created_at, p.id
  ), '[]'::jsonb)
  into v_packages
  from public.event_packages p
  join public.event_types t on t.id = p.event_type_id
  where p.is_active = true and t.is_active = true;

  select coalesce(jsonb_agg(
    jsonb_build_object(
      'id', e.id,
      'productId', e.product_id,
      'name', coalesce(pr.name, e.name),
      'description', coalesce(pr.description, e.description, ''),
      'pricingType', e.pricing_type,
      'price', coalesce(pr.price, e.price),
      'position', e.position
    ) order by e.position, e.created_at, e.id
  ), '[]'::jsonb)
  into v_extras
  from public.event_extras e
  left join public.products pr on pr.id = e.product_id
  where e.is_active = true
    and exists (
      select 1
      from public.event_package_extras pe
      join public.event_packages p on p.id = pe.package_id
      join public.event_types t on t.id = p.event_type_id
      where pe.extra_id = e.id
        and p.is_active = true
        and t.is_active = true
    );

  return jsonb_build_object(
    'enabled', true,
    'settings', v_settings,
    'types', v_types,
    'packages', v_packages,
    'extras', v_extras
  );
end;
$$;

revoke all on function public.get_public_event_quote_catalog() from public;
grant execute on function public.get_public_event_quote_catalog() to anon, authenticated;

-- ------------------------------------------------------------
-- 8. Evento confirmado => excepción del horario normal del negocio.
--    El evento tiene prioridad incluso si había una excepción manual;
--    al liberar la fecha se restaura la excepción manual anterior.
-- ------------------------------------------------------------

alter table public.business_hour_exceptions
  add column if not exists generated_by_event boolean not null default false,
  add column if not exists event_override_active boolean not null default false,
  add column if not exists previous_is_open boolean null,
  add column if not exists previous_open_time time null,
  add column if not exists previous_close_time time null,
  add column if not exists previous_reason text null;

create or replace function public.sync_event_business_hour_exception()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_old_reserved boolean := false;
  v_new_reserved boolean := false;
  v_existing public.business_hour_exceptions%rowtype;
begin
  if tg_op = 'UPDATE' then
    v_old_reserved := old.status in ('accepted', 'confirmed');
  end if;

  v_new_reserved := new.status in ('accepted', 'confirmed');

  -- Libera/restaura la fecha anterior si este evento deja de reservarla.
  if tg_op = 'UPDATE'
     and v_old_reserved
     and (
       not v_new_reserved
       or old.event_date is distinct from new.event_date
     )
     and not exists (
       select 1
       from public.event_requests r
       where r.id <> new.id
         and r.event_date = old.event_date
         and r.status in ('accepted', 'confirmed')
     )
  then
    select * into v_existing
    from public.business_hour_exceptions
    where exception_date = old.event_date;

    if found then
      if v_existing.generated_by_event then
        delete from public.business_hour_exceptions
        where id = v_existing.id;
      elsif v_existing.event_override_active then
        update public.business_hour_exceptions
        set
          is_open = coalesce(previous_is_open, false),
          open_time = previous_open_time,
          close_time = previous_close_time,
          reason = previous_reason,
          event_override_active = false,
          previous_is_open = null,
          previous_open_time = null,
          previous_close_time = null,
          previous_reason = null,
          updated_at = now()
        where id = v_existing.id;
      end if;
    end if;
  end if;

  if v_new_reserved then
    select * into v_existing
    from public.business_hour_exceptions
    where exception_date = new.event_date
    for update;

    if not found then
      insert into public.business_hour_exceptions(
        exception_date,
        is_open,
        open_time,
        close_time,
        reason,
        generated_by_event,
        event_override_active
      )
      values (
        new.event_date,
        false,
        null,
        null,
        'Evento confirmado - prioridad a producción',
        true,
        false
      );
    elsif v_existing.generated_by_event then
      update public.business_hour_exceptions
      set
        is_open = false,
        open_time = null,
        close_time = null,
        reason = 'Evento confirmado - prioridad a producción',
        updated_at = now()
      where id = v_existing.id;
    elsif not v_existing.event_override_active then
      -- Preserva la excepción manual y la reemplaza temporalmente por cierre.
      update public.business_hour_exceptions
      set
        previous_is_open = is_open,
        previous_open_time = open_time,
        previous_close_time = close_time,
        previous_reason = reason,
        event_override_active = true,
        is_open = false,
        open_time = null,
        close_time = null,
        reason = 'Evento confirmado - prioridad a producción',
        updated_at = now()
      where id = v_existing.id;
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists event_requests_sync_business_exception
  on public.event_requests;

create trigger event_requests_sync_business_exception
after insert or update of status, event_date on public.event_requests
for each row
execute function public.sync_event_business_hour_exception();

-- Backfill de eventos ya confirmados/aceptados que no tengan excepción.
insert into public.business_hour_exceptions(
  exception_date, is_open, open_time, close_time, reason,
  generated_by_event, event_override_active
)
select distinct
  r.event_date,
  false,
  null::time,
  null::time,
  'Evento confirmado - prioridad a producción',
  true,
  false
from public.event_requests r
where r.status in ('accepted', 'confirmed')
  and not exists (
    select 1
    from public.business_hour_exceptions e
    where e.exception_date = r.event_date
  )
on conflict (exception_date) do nothing;
