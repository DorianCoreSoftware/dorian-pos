-- ============================================================
-- DORIAN POS
-- CRM - FASE 1
-- Directorio unificado + perfil 360 básico
-- ============================================================

create table if not exists public.crm_customers (
  id uuid primary key default gen_random_uuid(),

  name text not null,
  phone text not null,
  normalized_phone text not null,
  email text,

  web_customer_id uuid unique
    references public.web_customers(id)
    on delete set null,

  loyalty_customer_id uuid unique
    references public.loyalty_customers(id)
    on delete set null,

  notes text,
  tags text[] not null default '{}'::text[],
  is_active boolean not null default true,

  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint crm_customers_name_not_blank
    check (btrim(name) <> ''),

  constraint crm_customers_phone_not_blank
    check (btrim(phone) <> ''),

  constraint crm_customers_normalized_phone_not_blank
    check (btrim(normalized_phone) <> ''),

  constraint crm_customers_normalized_phone_unique
    unique (normalized_phone)
);

create index if not exists crm_customers_active_name_idx
on public.crm_customers(
  is_active,
  name
);

create index if not exists crm_customers_last_seen_idx
on public.crm_customers(
  last_seen_at desc
);

alter table public.crm_customers
  enable row level security;

drop policy if exists crm_customers_authenticated_read
on public.crm_customers;

create policy crm_customers_authenticated_read
on public.crm_customers
for select
to authenticated
using (true);

-- ------------------------------------------------------------
-- Relación directa desde órdenes y eventos
-- ------------------------------------------------------------

alter table public.orders
  add column if not exists crm_customer_id uuid
    references public.crm_customers(id)
    on delete set null;

create index if not exists orders_crm_customer_created_idx
on public.orders(
  crm_customer_id,
  created_at desc
)
where crm_customer_id is not null;

alter table public.event_requests
  add column if not exists crm_customer_id uuid
    references public.crm_customers(id)
    on delete set null;

create index if not exists event_requests_crm_customer_created_idx
on public.event_requests(
  crm_customer_id,
  created_at desc
)
where crm_customer_id is not null;

-- ------------------------------------------------------------
-- Admin
-- ------------------------------------------------------------

create or replace function public.require_crm_admin()
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid;
begin
  v_user_id := auth.uid();

  if v_user_id is null then
    raise exception
      'Sesión no válida.';
  end if;

  if not exists (
    select 1
    from public.profiles p
    where p.id = v_user_id
      and p.role = 'admin'::public.user_role
      and coalesce(p.is_active, true) = true
  ) then
    raise exception
      'Solo un administrador puede gestionar CRM.';
  end if;

  return v_user_id;
end;
$$;

-- ------------------------------------------------------------
-- Identidad CRM por teléfono normalizado
-- ------------------------------------------------------------

create or replace function public.upsert_crm_customer_identity(
  p_name text,
  p_phone text,
  p_email text default null,
  p_web_customer_id uuid default null,
  p_loyalty_customer_id uuid default null,
  p_seen_at timestamptz default now()
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_name text;
  v_phone text;
  v_normalized_phone text;
  v_email text;
  v_id uuid;
begin
  v_phone :=
    btrim(
      coalesce(
        p_phone,
        ''
      )
    );

  v_normalized_phone :=
    regexp_replace(
      v_phone,
      '[^0-9]',
      '',
      'g'
    );

  if v_normalized_phone = '' then
    return null;
  end if;

  v_name :=
    nullif(
      btrim(
        coalesce(
          p_name,
          ''
        )
      ),
      ''
    );

  v_email :=
    nullif(
      lower(
        btrim(
          coalesce(
            p_email,
            ''
          )
        )
      ),
      ''
    );

  insert into public.crm_customers(
    name,
    phone,
    normalized_phone,
    email,
    web_customer_id,
    loyalty_customer_id,
    first_seen_at,
    last_seen_at
  )
  values (
    coalesce(
      v_name,
      'Cliente'
    ),
    v_phone,
    v_normalized_phone,
    v_email,
    p_web_customer_id,
    p_loyalty_customer_id,
    coalesce(
      p_seen_at,
      now()
    ),
    coalesce(
      p_seen_at,
      now()
    )
  )
  on conflict (
    normalized_phone
  )
  do update set
    name = case
      when excluded.name <> 'Cliente'
      then excluded.name
      else public.crm_customers.name
    end,
    phone = excluded.phone,
    email = coalesce(
      excluded.email,
      public.crm_customers.email
    ),
    web_customer_id = coalesce(
      excluded.web_customer_id,
      public.crm_customers.web_customer_id
    ),
    loyalty_customer_id = coalesce(
      excluded.loyalty_customer_id,
      public.crm_customers.loyalty_customer_id
    ),
    first_seen_at = least(
      public.crm_customers.first_seen_at,
      excluded.first_seen_at
    ),
    last_seen_at = greatest(
      public.crm_customers.last_seen_at,
      excluded.last_seen_at
    ),
    updated_at = now()
  returning id
  into v_id;

  return v_id;
end;
$$;

-- ------------------------------------------------------------
-- Backfill: web accounts
-- ------------------------------------------------------------

do $$
declare
  r record;
begin
  for r in
    select
      wc.id,
      wc.name,
      wc.phone,
      wc.email,
      wc.loyalty_customer_id,
      wc.created_at,
      wc.updated_at
    from public.web_customers wc
  loop
    perform public.upsert_crm_customer_identity(
      r.name,
      r.phone,
      r.email,
      r.id,
      r.loyalty_customer_id,
      coalesce(
        r.updated_at,
        r.created_at
      )
    );
  end loop;
end;
$$;

-- ------------------------------------------------------------
-- Backfill: rewards
-- ------------------------------------------------------------

do $$
declare
  r record;
begin
  for r in
    select
      lc.id,
      lc.name,
      lc.phone,
      lc.email,
      lc.created_at,
      lc.updated_at
    from public.loyalty_customers lc
  loop
    perform public.upsert_crm_customer_identity(
      r.name,
      r.phone,
      r.email,
      null,
      r.id,
      coalesce(
        r.updated_at,
        r.created_at
      )
    );
  end loop;
end;
$$;

-- ------------------------------------------------------------
-- Backfill: órdenes
-- ------------------------------------------------------------

update public.orders o
set crm_customer_id =
  public.upsert_crm_customer_identity(
    o.customer_name,
    o.customer_phone,
    null,
    o.customer_id,
    null,
    o.created_at
  )
where
  o.customer_phone is not null
  and regexp_replace(
    o.customer_phone,
    '[^0-9]',
    '',
    'g'
  ) <> '';

-- ------------------------------------------------------------
-- Backfill: eventos
-- ------------------------------------------------------------

update public.event_requests e
set crm_customer_id =
  public.upsert_crm_customer_identity(
    e.customer_name,
    e.customer_phone,
    e.customer_email,
    null,
    null,
    e.created_at
  )
where
  e.customer_phone is not null
  and regexp_replace(
    e.customer_phone,
    '[^0-9]',
    '',
    'g'
  ) <> '';

-- ------------------------------------------------------------
-- Sincronización automática: órdenes
-- ------------------------------------------------------------

create or replace function public.sync_order_crm_customer()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if
    new.customer_phone is null
    or regexp_replace(
      new.customer_phone,
      '[^0-9]',
      '',
      'g'
    ) = ''
  then
    new.crm_customer_id := null;
    return new;
  end if;

  new.crm_customer_id :=
    public.upsert_crm_customer_identity(
      new.customer_name,
      new.customer_phone,
      null,
      new.customer_id,
      null,
      coalesce(
        new.created_at,
        now()
      )
    );

  return new;
end;
$$;

drop trigger if exists trg_orders_sync_crm_customer
on public.orders;

create trigger trg_orders_sync_crm_customer
before insert or update of
  customer_name,
  customer_phone,
  customer_id
on public.orders
for each row
execute function public.sync_order_crm_customer();

-- ------------------------------------------------------------
-- Sincronización automática: eventos
-- ------------------------------------------------------------

create or replace function public.sync_event_request_crm_customer()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if
    new.customer_phone is null
    or regexp_replace(
      new.customer_phone,
      '[^0-9]',
      '',
      'g'
    ) = ''
  then
    new.crm_customer_id := null;
    return new;
  end if;

  new.crm_customer_id :=
    public.upsert_crm_customer_identity(
      new.customer_name,
      new.customer_phone,
      new.customer_email,
      null,
      null,
      coalesce(
        new.created_at,
        now()
      )
    );

  return new;
end;
$$;

drop trigger if exists trg_event_requests_sync_crm_customer
on public.event_requests;

create trigger trg_event_requests_sync_crm_customer
before insert or update of
  customer_name,
  customer_phone,
  customer_email
on public.event_requests
for each row
execute function public.sync_event_request_crm_customer();

-- ------------------------------------------------------------
-- Sincronización automática: cuenta web
-- ------------------------------------------------------------

create or replace function public.sync_web_customer_to_crm()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  perform public.upsert_crm_customer_identity(
    new.name,
    new.phone,
    new.email,
    new.id,
    new.loyalty_customer_id,
    coalesce(
      new.updated_at,
      new.created_at,
      now()
    )
  );

  return new;
end;
$$;

drop trigger if exists trg_web_customers_sync_crm
on public.web_customers;

create trigger trg_web_customers_sync_crm
after insert or update of
  name,
  phone,
  email,
  loyalty_customer_id
on public.web_customers
for each row
execute function public.sync_web_customer_to_crm();

-- ------------------------------------------------------------
-- Sincronización automática: rewards
-- ------------------------------------------------------------

create or replace function public.sync_loyalty_customer_to_crm()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  perform public.upsert_crm_customer_identity(
    new.name,
    new.phone,
    new.email,
    null,
    new.id,
    coalesce(
      new.updated_at,
      new.created_at,
      now()
    )
  );

  return new;
end;
$$;

drop trigger if exists trg_loyalty_customers_sync_crm
on public.loyalty_customers;

create trigger trg_loyalty_customers_sync_crm
after insert or update of
  name,
  phone,
  email
on public.loyalty_customers
for each row
execute function public.sync_loyalty_customer_to_crm();

-- ------------------------------------------------------------
-- Alta manual
-- ------------------------------------------------------------

create or replace function public.create_crm_customer_admin(
  p_name text,
  p_phone text,
  p_email text default null
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_id uuid;
  v_normalized_phone text;
begin
  perform public.require_crm_admin();

  if btrim(
    coalesce(
      p_name,
      ''
    )
  ) = '' then
    raise exception
      'El nombre es obligatorio.';
  end if;

  v_normalized_phone :=
    regexp_replace(
      coalesce(
        p_phone,
        ''
      ),
      '[^0-9]',
      '',
      'g'
    );

  if length(
    v_normalized_phone
  ) < 7 then
    raise exception
      'El teléfono no es válido.';
  end if;

  v_id :=
    public.upsert_crm_customer_identity(
      p_name,
      p_phone,
      p_email,
      null,
      null,
      now()
    );

  return v_id;
end;
$$;

-- ------------------------------------------------------------
-- Notas, etiquetas y estado
-- ------------------------------------------------------------

create or replace function public.update_crm_customer_admin(
  p_customer_id uuid,
  p_notes text,
  p_tags text[],
  p_is_active boolean
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  perform public.require_crm_admin();

  update public.crm_customers
  set
    notes =
      nullif(
        btrim(
          coalesce(
            p_notes,
            ''
          )
        ),
        ''
      ),
    tags =
      coalesce(
        (
          select array_agg(
            distinct lower(
              btrim(x)
            )
            order by lower(
              btrim(x)
            )
          )
          from unnest(
            coalesce(
              p_tags,
              '{}'::text[]
            )
          ) x
          where btrim(x) <> ''
        ),
        '{}'::text[]
      ),
    is_active =
      coalesce(
        p_is_active,
        true
      ),
    updated_at =
      now()
  where id =
    p_customer_id;

  if not found then
    raise exception
      'Cliente CRM no encontrado.';
  end if;
end;
$$;

-- ------------------------------------------------------------
-- Directorio con métricas
-- ------------------------------------------------------------

create or replace function public.get_crm_customers_admin(
  p_search text default null,
  p_active_only boolean default true,
  p_limit integer default 200
)
returns table(
  id uuid,
  name text,
  phone text,
  email text,
  notes text,
  tags text[],
  is_active boolean,
  has_web_account boolean,
  has_loyalty boolean,
  delivered_orders bigint,
  net_spend numeric,
  average_ticket numeric,
  last_order_at timestamptz,
  loyalty_visits bigint,
  event_requests bigint,
  last_event_at timestamptz,
  first_seen_at timestamptz,
  last_seen_at timestamptz
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  perform public.require_crm_admin();

  return query
  with refund_totals as (
    select
      r.order_id,
      coalesce(
        sum(r.refund_total),
        0
      )::numeric
        as refunded
    from public.order_refunds r
    where r.status =
      'completed'
    group by r.order_id
  ),
  order_stats as (
    select
      o.crm_customer_id,
      count(*)::bigint
        as delivered_orders,
      coalesce(
        sum(
          greatest(
            coalesce(
              o.total,
              0
            ) -
            coalesce(
              rf.refunded,
              0
            ),
            0
          )
        ),
        0
      )::numeric
        as net_spend,
      max(
        coalesce(
          o.status_updated_at,
          o.created_at
        )
      )
        as last_order_at
    from public.orders o
    left join refund_totals rf
      on rf.order_id =
        o.id
    where
      o.crm_customer_id is not null
      and o.status =
        'delivered'
    group by
      o.crm_customer_id
  ),
  loyalty_stats as (
    select
      lc.id
        as loyalty_customer_id,
      count(lv.id)::bigint
        as visits
    from public.loyalty_customers lc
    left join public.loyalty_visits lv
      on lv.customer_id =
        lc.id
    group by lc.id
  ),
  event_stats as (
    select
      e.crm_customer_id,
      count(*)::bigint
        as event_requests,
      max(e.created_at)
        as last_event_at
    from public.event_requests e
    where e.crm_customer_id
      is not null
    group by
      e.crm_customer_id
  )
  select
    c.id,
    c.name,
    c.phone,
    c.email,
    c.notes,
    c.tags,
    c.is_active,
    (
      c.web_customer_id
      is not null
    )::boolean,
    (
      c.loyalty_customer_id
      is not null
    )::boolean,
    coalesce(
      os.delivered_orders,
      0
    )::bigint,
    round(
      coalesce(
        os.net_spend,
        0
      ),
      2
    ),
    case
      when coalesce(
        os.delivered_orders,
        0
      ) > 0
      then round(
        os.net_spend /
        os.delivered_orders,
        2
      )
      else 0::numeric
    end,
    os.last_order_at,
    coalesce(
      ls.visits,
      0
    )::bigint,
    coalesce(
      es.event_requests,
      0
    )::bigint,
    es.last_event_at,
    c.first_seen_at,
    greatest(
      c.last_seen_at,
      coalesce(
        os.last_order_at,
        c.last_seen_at
      ),
      coalesce(
        es.last_event_at,
        c.last_seen_at
      )
    )
  from public.crm_customers c
  left join order_stats os
    on os.crm_customer_id =
      c.id
  left join loyalty_stats ls
    on ls.loyalty_customer_id =
      c.loyalty_customer_id
  left join event_stats es
    on es.crm_customer_id =
      c.id
  where
    (
      not p_active_only
      or c.is_active = true
    )
    and (
      nullif(
        btrim(
          coalesce(
            p_search,
            ''
          )
        ),
        ''
      ) is null
      or lower(c.name) like
        '%' ||
        lower(
          btrim(
            p_search
          )
        ) ||
        '%'
      or c.normalized_phone like
        '%' ||
        regexp_replace(
          coalesce(
            p_search,
            ''
          ),
          '[^0-9]',
          '',
          'g'
        ) ||
        '%'
      or lower(
        coalesce(
          c.email,
          ''
        )
      ) like
        '%' ||
        lower(
          btrim(
            p_search
          )
        ) ||
        '%'
      or exists (
        select 1
        from unnest(c.tags) tag
        where lower(tag) like
          '%' ||
          lower(
            btrim(
              p_search
            )
          ) ||
          '%'
      )
    )
  order by
    greatest(
      c.last_seen_at,
      coalesce(
        os.last_order_at,
        c.last_seen_at
      ),
      coalesce(
        es.last_event_at,
        c.last_seen_at
      )
    ) desc,
    c.name asc
  limit greatest(
    1,
    least(
      coalesce(
        p_limit,
        200
      ),
      500
    )
  );
end;
$$;

-- ------------------------------------------------------------
-- Perfil 360
-- ------------------------------------------------------------

create or replace function public.get_crm_customer_detail_admin(
  p_customer_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_customer public.crm_customers%rowtype;
  v_orders jsonb;
  v_events jsonb;
  v_rewards jsonb;
begin
  perform public.require_crm_admin();

  select *
  into v_customer
  from public.crm_customers c
  where c.id =
    p_customer_id;

  if not found then
    raise exception
      'Cliente CRM no encontrado.';
  end if;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', x.id,
        'createdAt', x.created_at,
        'deliveredAt', x.status_updated_at,
        'source', x.order_source,
        'fulfillmentType', x.fulfillment_type,
        'total', x.total,
        'refunded', x.refunded,
        'netTotal', greatest(
          x.total -
          x.refunded,
          0
        )
      )
      order by x.created_at desc
    ),
    '[]'::jsonb
  )
  into v_orders
  from (
    select
      o.id,
      o.created_at,
      o.status_updated_at,
      o.order_source,
      o.fulfillment_type,
      coalesce(
        o.total,
        0
      )::numeric
        as total,
      coalesce(
        (
          select sum(
            r.refund_total
          )
          from public.order_refunds r
          where r.order_id =
            o.id
            and r.status =
              'completed'
        ),
        0
      )::numeric
        as refunded
    from public.orders o
    where o.crm_customer_id =
      p_customer_id
      and o.status =
        'delivered'
    order by o.created_at desc
    limit 30
  ) x;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', e.id,
        'folio', e.folio,
        'status', e.status,
        'eventDate', e.event_date,
        'guestCount', e.guest_count,
        'estimatedTotal', e.estimated_total,
        'quotedTotal', e.quoted_total,
        'createdAt', e.created_at
      )
      order by e.created_at desc
    ),
    '[]'::jsonb
  )
  into v_events
  from public.event_requests e
  where e.crm_customer_id =
    p_customer_id;

  if v_customer.loyalty_customer_id
    is not null
  then
    select jsonb_build_object(
      'enabled',
      true,
      'visits',
      (
        select count(*)
        from public.loyalty_visits lv
        where lv.customer_id =
          v_customer.loyalty_customer_id
      ),
      'redemptions',
      (
        select count(*)
        from public.loyalty_redemptions lr
        where lr.customer_id =
          v_customer.loyalty_customer_id
      )
    )
    into v_rewards;
  else
    v_rewards :=
      jsonb_build_object(
        'enabled',
        false,
        'visits',
        0,
        'redemptions',
        0
      );
  end if;

  return jsonb_build_object(
    'id',
      v_customer.id,
    'name',
      v_customer.name,
    'phone',
      v_customer.phone,
    'email',
      v_customer.email,
    'notes',
      v_customer.notes,
    'tags',
      v_customer.tags,
    'isActive',
      v_customer.is_active,
    'hasWebAccount',
      v_customer.web_customer_id
        is not null,
    'hasLoyalty',
      v_customer.loyalty_customer_id
        is not null,
    'orders',
      v_orders,
    'events',
      v_events,
    'rewards',
      v_rewards
  );
end;
$$;

revoke all
on function public.create_crm_customer_admin(
  text,
  text,
  text
)
from public;

revoke all
on function public.update_crm_customer_admin(
  uuid,
  text,
  text[],
  boolean
)
from public;

revoke all
on function public.get_crm_customers_admin(
  text,
  boolean,
  integer
)
from public;

revoke all
on function public.get_crm_customer_detail_admin(uuid)
from public;

grant execute
on function public.create_crm_customer_admin(
  text,
  text,
  text
)
to authenticated;

grant execute
on function public.update_crm_customer_admin(
  uuid,
  text,
  text[],
  boolean
)
to authenticated;

grant execute
on function public.get_crm_customers_admin(
  text,
  boolean,
  integer
)
to authenticated;

grant execute
on function public.get_crm_customer_detail_admin(uuid)
to authenticated;
