-- ============================================================
-- DORIAN POS
-- CRM - FASE 3
-- Consentimiento de contacto + audiencias guardadas
-- ============================================================

alter table public.crm_customers
  add column if not exists marketing_opt_in boolean
    not null default false,
  add column if not exists preferred_contact_channel text
    not null default 'none',
  add column if not exists last_contacted_at timestamptz,
  add column if not exists do_not_contact_reason text;

alter table public.crm_customers
  drop constraint if exists crm_customers_preferred_contact_channel_check;

alter table public.crm_customers
  add constraint crm_customers_preferred_contact_channel_check
  check (
    preferred_contact_channel in (
      'none',
      'whatsapp',
      'sms',
      'email',
      'call'
    )
  );

create table if not exists public.crm_audiences (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,

  segment_codes text[] not null default '{}'::text[],
  required_tags text[] not null default '{}'::text[],

  min_net_spend numeric(12,2)
    check (
      min_net_spend is null
      or min_net_spend >= 0
    ),

  min_delivered_orders integer
    check (
      min_delivered_orders is null
      or min_delivered_orders >= 0
    ),

  require_marketing_opt_in boolean
    not null default true,

  is_active boolean
    not null default true,

  created_by uuid
    references public.profiles(id)
    on delete set null,

  created_at timestamptz
    not null default now(),

  updated_at timestamptz
    not null default now(),

  constraint crm_audiences_name_not_blank
    check (btrim(name) <> ''),

  constraint crm_audiences_segment_codes_check
    check (
      segment_codes <@
      array[
        'new',
        'frequent',
        'vip',
        'high_ticket',
        'inactive'
      ]::text[]
    )
);

create unique index if not exists crm_audiences_name_unique_idx
on public.crm_audiences(
  lower(name)
);

create index if not exists crm_audiences_active_idx
on public.crm_audiences(
  is_active,
  updated_at desc
);

alter table public.crm_audiences
  enable row level security;

drop policy if exists crm_audiences_authenticated_read
on public.crm_audiences;

create policy crm_audiences_authenticated_read
on public.crm_audiences
for select
to authenticated
using (true);

-- ------------------------------------------------------------
-- Contacto / consentimiento
-- ------------------------------------------------------------

create or replace function public.update_crm_contact_preferences_admin(
  p_customer_id uuid,
  p_marketing_opt_in boolean,
  p_preferred_contact_channel text,
  p_do_not_contact_reason text default null
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_channel text;
begin
  perform public.require_crm_admin();

  v_channel :=
    lower(
      btrim(
        coalesce(
          p_preferred_contact_channel,
          'none'
        )
      )
    );

  if v_channel not in (
    'none',
    'whatsapp',
    'sms',
    'email',
    'call'
  ) then
    raise exception
      'El canal de contacto no es válido.';
  end if;

  update public.crm_customers
  set
    marketing_opt_in =
      coalesce(
        p_marketing_opt_in,
        false
      ),
    preferred_contact_channel =
      v_channel,
    do_not_contact_reason =
      case
        when coalesce(
          p_marketing_opt_in,
          false
        )
        then null
        else nullif(
          btrim(
            coalesce(
              p_do_not_contact_reason,
              ''
            )
          ),
          ''
        )
      end,
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

create or replace function public.mark_crm_customer_contacted_admin(
  p_customer_id uuid
)
returns timestamptz
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_contacted_at timestamptz :=
    now();
begin
  perform public.require_crm_admin();

  update public.crm_customers
  set
    last_contacted_at =
      v_contacted_at,
    updated_at =
      now()
  where id =
    p_customer_id;

  if not found then
    raise exception
      'Cliente CRM no encontrado.';
  end if;

  return v_contacted_at;
end;
$$;

-- ------------------------------------------------------------
-- Perfil 360 V2
-- ------------------------------------------------------------

create or replace function public.get_crm_customer_detail_admin_v2(
  p_customer_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_base jsonb;
  v_customer public.crm_customers%rowtype;
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

  v_base :=
    public.get_crm_customer_detail_admin(
      p_customer_id
    );

  return
    v_base ||
    jsonb_build_object(
      'marketingOptIn',
        v_customer.marketing_opt_in,
      'preferredContactChannel',
        v_customer.preferred_contact_channel,
      'lastContactedAt',
        v_customer.last_contacted_at,
      'doNotContactReason',
        v_customer.do_not_contact_reason
    );
end;
$$;

-- ------------------------------------------------------------
-- Guardar audiencia
-- ------------------------------------------------------------

create or replace function public.save_crm_audience_admin(
  p_audience_id uuid,
  p_name text,
  p_description text,
  p_segment_codes text[],
  p_required_tags text[],
  p_min_net_spend numeric,
  p_min_delivered_orders integer,
  p_require_marketing_opt_in boolean,
  p_is_active boolean
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid;
  v_id uuid;
  v_segments text[];
  v_tags text[];
begin
  v_user_id :=
    public.require_crm_admin();

  if btrim(
    coalesce(
      p_name,
      ''
    )
  ) = '' then
    raise exception
      'El nombre de la audiencia es obligatorio.';
  end if;

  v_segments :=
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
            p_segment_codes,
            '{}'::text[]
          )
        ) x
        where btrim(x) <> ''
      ),
      '{}'::text[]
    );

  if not (
    v_segments <@
    array[
      'new',
      'frequent',
      'vip',
      'high_ticket',
      'inactive'
    ]::text[]
  ) then
    raise exception
      'Uno o más segmentos no son válidos.';
  end if;

  v_tags :=
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
            p_required_tags,
            '{}'::text[]
          )
        ) x
        where btrim(x) <> ''
      ),
      '{}'::text[]
    );

  if p_min_net_spend is not null
     and p_min_net_spend < 0 then
    raise exception
      'El gasto mínimo no es válido.';
  end if;

  if p_min_delivered_orders is not null
     and p_min_delivered_orders < 0 then
    raise exception
      'Las compras mínimas no son válidas.';
  end if;

  if p_audience_id is null then
    insert into public.crm_audiences(
      name,
      description,
      segment_codes,
      required_tags,
      min_net_spend,
      min_delivered_orders,
      require_marketing_opt_in,
      is_active,
      created_by
    )
    values (
      btrim(p_name),
      nullif(
        btrim(
          coalesce(
            p_description,
            ''
          )
        ),
        ''
      ),
      v_segments,
      v_tags,
      p_min_net_spend,
      p_min_delivered_orders,
      coalesce(
        p_require_marketing_opt_in,
        true
      ),
      coalesce(
        p_is_active,
        true
      ),
      v_user_id
    )
    returning id
    into v_id;
  else
    update public.crm_audiences
    set
      name =
        btrim(p_name),
      description =
        nullif(
          btrim(
            coalesce(
              p_description,
              ''
            )
          ),
          ''
        ),
      segment_codes =
        v_segments,
      required_tags =
        v_tags,
      min_net_spend =
        p_min_net_spend,
      min_delivered_orders =
        p_min_delivered_orders,
      require_marketing_opt_in =
        coalesce(
          p_require_marketing_opt_in,
          true
        ),
      is_active =
        coalesce(
          p_is_active,
          true
        ),
      updated_at =
        now()
    where id =
      p_audience_id
    returning id
    into v_id;

    if v_id is null then
      raise exception
        'Audiencia CRM no encontrada.';
    end if;
  end if;

  return v_id;
end;
$$;

-- ------------------------------------------------------------
-- Resolver miembros de audiencia
-- ------------------------------------------------------------

create or replace function public.get_crm_audience_members_admin(
  p_audience_id uuid,
  p_limit integer default 500
)
returns table(
  id uuid,
  name text,
  phone text,
  email text,
  preferred_contact_channel text,
  delivered_orders bigint,
  net_spend numeric,
  average_ticket numeric,
  segment_codes text[],
  tags text[],
  last_contacted_at timestamptz
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_audience public.crm_audiences%rowtype;
begin
  perform public.require_crm_admin();

  select *
  into v_audience
  from public.crm_audiences a
  where a.id =
    p_audience_id;

  if not found then
    raise exception
      'Audiencia CRM no encontrada.';
  end if;

  return query
  select
    c.id,
    c.name,
    c.phone,
    c.email,
    c.preferred_contact_channel,
    d.delivered_orders,
    d.net_spend,
    d.average_ticket,
    d.segment_codes,
    c.tags,
    c.last_contacted_at
  from public.get_crm_customers_admin_v2(
    null,
    true,
    500
  ) d
  join public.crm_customers c
    on c.id = d.id
  where
    (
      cardinality(
        v_audience.segment_codes
      ) = 0
      or d.segment_codes @>
        v_audience.segment_codes
    )
    and (
      cardinality(
        v_audience.required_tags
      ) = 0
      or c.tags @>
        v_audience.required_tags
    )
    and (
      v_audience.min_net_spend
        is null
      or d.net_spend >=
        v_audience.min_net_spend
    )
    and (
      v_audience.min_delivered_orders
        is null
      or d.delivered_orders >=
        v_audience.min_delivered_orders
    )
    and (
      not v_audience.require_marketing_opt_in
      or c.marketing_opt_in = true
    )
  order by
    d.net_spend desc,
    d.delivered_orders desc,
    c.name asc
  limit greatest(
    1,
    least(
      coalesce(
        p_limit,
        500
      ),
      500
    )
  );
end;
$$;

-- ------------------------------------------------------------
-- Listado de audiencias + conteo
-- ------------------------------------------------------------

create or replace function public.get_crm_audiences_admin(
  p_active_only boolean default true
)
returns table(
  id uuid,
  name text,
  description text,
  segment_codes text[],
  required_tags text[],
  min_net_spend numeric,
  min_delivered_orders integer,
  require_marketing_opt_in boolean,
  is_active boolean,
  member_count bigint,
  updated_at timestamptz
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  perform public.require_crm_admin();

  return query
  select
    a.id,
    a.name,
    a.description,
    a.segment_codes,
    a.required_tags,
    a.min_net_spend,
    a.min_delivered_orders,
    a.require_marketing_opt_in,
    a.is_active,
    (
      select count(*)::bigint
      from public.get_crm_audience_members_admin(
        a.id,
        500
      )
    ) as member_count,
    a.updated_at
  from public.crm_audiences a
  where
    not p_active_only
    or a.is_active = true
  order by
    a.is_active desc,
    a.updated_at desc,
    a.name asc;
end;
$$;

revoke all
on function public.update_crm_contact_preferences_admin(
  uuid,
  boolean,
  text,
  text
)
from public;

revoke all
on function public.mark_crm_customer_contacted_admin(uuid)
from public;

revoke all
on function public.get_crm_customer_detail_admin_v2(uuid)
from public;

revoke all
on function public.save_crm_audience_admin(
  uuid,
  text,
  text,
  text[],
  text[],
  numeric,
  integer,
  boolean,
  boolean
)
from public;

revoke all
on function public.get_crm_audience_members_admin(
  uuid,
  integer
)
from public;

revoke all
on function public.get_crm_audiences_admin(boolean)
from public;

grant execute
on function public.update_crm_contact_preferences_admin(
  uuid,
  boolean,
  text,
  text
)
to authenticated;

grant execute
on function public.mark_crm_customer_contacted_admin(uuid)
to authenticated;

grant execute
on function public.get_crm_customer_detail_admin_v2(uuid)
to authenticated;

grant execute
on function public.save_crm_audience_admin(
  uuid,
  text,
  text,
  text[],
  text[],
  numeric,
  integer,
  boolean,
  boolean
)
to authenticated;

grant execute
on function public.get_crm_audience_members_admin(
  uuid,
  integer
)
to authenticated;

grant execute
on function public.get_crm_audiences_admin(boolean)
to authenticated;
