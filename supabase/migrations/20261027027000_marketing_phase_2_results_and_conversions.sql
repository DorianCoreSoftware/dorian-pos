-- ============================================================
-- DORIAN POS
-- MARKETING - FASE 2
-- Resultados, conversiones y ROI básico
-- ============================================================

alter table public.marketing_campaigns
  add column if not exists budget_amount numeric(12,2)
    check (
      budget_amount is null
      or budget_amount >= 0
    ),
  add column if not exists notes text;

create table if not exists public.marketing_campaign_conversions (
  id uuid primary key default gen_random_uuid(),

  campaign_id uuid not null
    references public.marketing_campaigns(id)
    on delete cascade,

  order_id uuid
    references public.orders(id)
    on delete set null,

  crm_customer_id uuid
    references public.crm_customers(id)
    on delete set null,

  revenue_amount numeric(12,2) not null default 0
    check (revenue_amount >= 0),

  attribution_type text not null default 'manual'
    check (
      attribution_type in (
        'manual',
        'coupon',
        'link',
        'code',
        'pos',
        'web'
      )
    ),

  notes text,

  created_by uuid
    references public.profiles(id)
    on delete set null,

  created_at timestamptz not null default now(),

  constraint marketing_campaign_conversion_has_subject
    check (
      order_id is not null
      or crm_customer_id is not null
    )
);

create unique index if not exists marketing_campaign_conversion_order_unique
on public.marketing_campaign_conversions(
  campaign_id,
  order_id
)
where order_id is not null;

create index if not exists marketing_campaign_conversions_campaign_idx
on public.marketing_campaign_conversions(
  campaign_id,
  created_at desc
);

alter table public.marketing_campaign_conversions
  enable row level security;

drop policy if exists marketing_campaign_conversions_authenticated_read
on public.marketing_campaign_conversions;

create policy marketing_campaign_conversions_authenticated_read
on public.marketing_campaign_conversions
for select
to authenticated
using (true);

-- ------------------------------------------------------------
-- Guardar presupuesto/notas
-- ------------------------------------------------------------

create or replace function public.update_marketing_campaign_tracking_admin(
  p_campaign_id uuid,
  p_budget_amount numeric,
  p_notes text
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  perform public.require_marketing_admin();

  if p_budget_amount is not null
     and p_budget_amount < 0 then
    raise exception
      'El presupuesto no es válido.';
  end if;

  update public.marketing_campaigns
  set
    budget_amount =
      p_budget_amount,
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
    updated_at =
      now()
  where id =
    p_campaign_id;

  if not found then
    raise exception
      'Campaña no encontrada.';
  end if;
end;
$$;

-- ------------------------------------------------------------
-- Registrar conversión
-- ------------------------------------------------------------

create or replace function public.add_marketing_campaign_conversion_admin(
  p_campaign_id uuid,
  p_order_id uuid,
  p_crm_customer_id uuid,
  p_revenue_amount numeric,
  p_attribution_type text,
  p_notes text
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid;
  v_id uuid;
  v_order public.orders%rowtype;
  v_customer_id uuid;
  v_revenue numeric(12,2);
begin
  v_user_id :=
    public.require_marketing_admin();

  if not exists (
    select 1
    from public.marketing_campaigns c
    where c.id =
      p_campaign_id
  ) then
    raise exception
      'Campaña no encontrada.';
  end if;

  if p_attribution_type not in (
    'manual',
    'coupon',
    'link',
    'code',
    'pos',
    'web'
  ) then
    raise exception
      'El tipo de atribución no es válido.';
  end if;

  if p_order_id is null
     and p_crm_customer_id is null then
    raise exception
      'Debes indicar una orden o un cliente.';
  end if;

  v_customer_id :=
    p_crm_customer_id;

  v_revenue :=
    greatest(
      coalesce(
        p_revenue_amount,
        0
      ),
      0
    );

  if p_order_id is not null then
    select *
    into v_order
    from public.orders o
    where o.id =
      p_order_id;

    if not found then
      raise exception
        'Orden no encontrada.';
    end if;

    if v_order.status <>
      'delivered' then
      raise exception
        'Solo se pueden atribuir órdenes entregadas.';
    end if;

    v_customer_id :=
      coalesce(
        v_customer_id,
        v_order.crm_customer_id
      );

    if p_revenue_amount is null then
      v_revenue :=
        greatest(
          coalesce(
            v_order.total,
            0
          ) -
          coalesce(
            (
              select sum(
                r.refund_total
              )
              from public.order_refunds r
              where r.order_id =
                v_order.id
                and r.status =
                  'completed'
            ),
            0
          ),
          0
        );
    end if;
  end if;

  if v_customer_id is not null
     and not exists (
       select 1
       from public.crm_customers c
       where c.id =
         v_customer_id
     ) then
    raise exception
      'Cliente CRM no encontrado.';
  end if;

  insert into public.marketing_campaign_conversions(
    campaign_id,
    order_id,
    crm_customer_id,
    revenue_amount,
    attribution_type,
    notes,
    created_by
  )
  values (
    p_campaign_id,
    p_order_id,
    v_customer_id,
    v_revenue,
    p_attribution_type,
    nullif(
      btrim(
        coalesce(
          p_notes,
          ''
        )
      ),
      ''
    ),
    v_user_id
  )
  returning id
  into v_id;

  return v_id;
end;
$$;

-- ------------------------------------------------------------
-- Eliminar conversión manual
-- ------------------------------------------------------------

create or replace function public.delete_marketing_campaign_conversion_admin(
  p_conversion_id uuid
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  perform public.require_marketing_admin();

  delete from public.marketing_campaign_conversions
  where id =
    p_conversion_id;

  if not found then
    raise exception
      'Conversión no encontrada.';
  end if;
end;
$$;

-- ------------------------------------------------------------
-- Órdenes candidatas para atribución
-- ------------------------------------------------------------

create or replace function public.get_marketing_candidate_orders_admin(
  p_campaign_id uuid,
  p_search text default null,
  p_limit integer default 100
)
returns table(
  order_id uuid,
  created_at timestamptz,
  customer_name text,
  customer_phone text,
  crm_customer_id uuid,
  total numeric,
  refunded numeric,
  net_total numeric,
  already_attributed boolean
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_campaign public.marketing_campaigns%rowtype;
begin
  perform public.require_marketing_admin();

  select *
  into v_campaign
  from public.marketing_campaigns c
  where c.id =
    p_campaign_id;

  if not found then
    raise exception
      'Campaña no encontrada.';
  end if;

  return query
  with refund_totals as (
    select
      r.order_id,
      coalesce(
        sum(r.refund_total),
        0
      )::numeric as refunded
    from public.order_refunds r
    where r.status =
      'completed'
    group by r.order_id
  )
  select
    o.id,
    o.created_at,
    o.customer_name,
    o.customer_phone,
    o.crm_customer_id,
    coalesce(
      o.total,
      0
    )::numeric,
    coalesce(
      rf.refunded,
      0
    )::numeric,
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
    )::numeric,
    exists (
      select 1
      from public.marketing_campaign_conversions mc
      where mc.campaign_id =
        p_campaign_id
        and mc.order_id =
          o.id
    )::boolean
  from public.orders o
  left join refund_totals rf
    on rf.order_id =
      o.id
  where
    o.status =
      'delivered'
    and (
      v_campaign.starts_at is null
      or o.created_at >=
        v_campaign.starts_at
    )
    and (
      v_campaign.ends_at is null
      or o.created_at <=
        v_campaign.ends_at
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
      or lower(
        coalesce(
          o.customer_name,
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
      or regexp_replace(
        coalesce(
          o.customer_phone,
          ''
        ),
        '[^0-9]',
        '',
        'g'
      ) like
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
    )
  order by
    o.created_at desc
  limit greatest(
    1,
    least(
      coalesce(
        p_limit,
        100
      ),
      300
    )
  );
end;
$$;

-- ------------------------------------------------------------
-- Conversiones de campaña
-- ------------------------------------------------------------

create or replace function public.get_marketing_campaign_conversions_admin(
  p_campaign_id uuid
)
returns table(
  id uuid,
  order_id uuid,
  crm_customer_id uuid,
  customer_name text,
  revenue_amount numeric,
  attribution_type text,
  notes text,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  perform public.require_marketing_admin();

  return query
  select
    mc.id,
    mc.order_id,
    mc.crm_customer_id,
    coalesce(
      c.name,
      o.customer_name,
      'Cliente'
    ),
    mc.revenue_amount,
    mc.attribution_type,
    mc.notes,
    mc.created_at
  from public.marketing_campaign_conversions mc
  left join public.crm_customers c
    on c.id =
      mc.crm_customer_id
  left join public.orders o
    on o.id =
      mc.order_id
  where mc.campaign_id =
    p_campaign_id
  order by
    mc.created_at desc;
end;
$$;

-- ------------------------------------------------------------
-- Campañas V2 con KPIs
-- ------------------------------------------------------------

create or replace function public.get_marketing_campaigns_admin_v2(
  p_status text default null,
  p_limit integer default 200
)
returns table(
  id uuid,
  name text,
  description text,
  audience_id uuid,
  audience_name text,
  current_audience_size bigint,
  audience_size_snapshot integer,
  objective text,
  channel text,
  action_type text,
  message_title text,
  message_body text,
  starts_at timestamptz,
  ends_at timestamptz,
  status text,
  activated_at timestamptz,
  completed_at timestamptz,
  cancelled_at timestamptz,
  budget_amount numeric,
  notes text,
  conversion_orders bigint,
  converted_customers bigint,
  attributed_revenue numeric,
  conversion_rate numeric,
  roi_percent numeric,
  created_at timestamptz,
  updated_at timestamptz
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  perform public.require_marketing_admin();

  return query
  with conversion_stats as (
    select
      mc.campaign_id,
      count(
        distinct mc.order_id
      ) filter (
        where mc.order_id
          is not null
      )::bigint
        as conversion_orders,
      count(
        distinct mc.crm_customer_id
      ) filter (
        where mc.crm_customer_id
          is not null
      )::bigint
        as converted_customers,
      coalesce(
        sum(
          mc.revenue_amount
        ),
        0
      )::numeric
        as attributed_revenue
    from public.marketing_campaign_conversions mc
    group by
      mc.campaign_id
  )
  select
    c.id,
    c.name,
    c.description,
    c.audience_id,
    a.name,
    case
      when c.audience_id is null
      then 0::bigint
      else (
        select count(*)::bigint
        from public.get_crm_audience_members_admin(
          c.audience_id,
          500
        )
      )
    end,
    c.audience_size_snapshot,
    c.objective,
    c.channel,
    c.action_type,
    c.message_title,
    c.message_body,
    c.starts_at,
    c.ends_at,
    c.status,
    c.activated_at,
    c.completed_at,
    c.cancelled_at,
    c.budget_amount,
    c.notes,
    coalesce(
      cs.conversion_orders,
      0
    )::bigint,
    coalesce(
      cs.converted_customers,
      0
    )::bigint,
    round(
      coalesce(
        cs.attributed_revenue,
        0
      ),
      2
    ),
    case
      when coalesce(
        c.audience_size_snapshot,
        0
      ) > 0
      then round(
        (
          coalesce(
            cs.converted_customers,
            0
          )::numeric /
          c.audience_size_snapshot::numeric
        ) * 100,
        2
      )
      else 0::numeric
    end,
    case
      when coalesce(
        c.budget_amount,
        0
      ) > 0
      then round(
        (
          (
            coalesce(
              cs.attributed_revenue,
              0
            ) -
            c.budget_amount
          ) /
          c.budget_amount
        ) * 100,
        2
      )
      else null::numeric
    end,
    c.created_at,
    c.updated_at
  from public.marketing_campaigns c
  left join public.crm_audiences a
    on a.id =
      c.audience_id
  left join conversion_stats cs
    on cs.campaign_id =
      c.id
  where
    p_status is null
    or c.status =
      p_status
  order by
    case c.status
      when 'active' then 1
      when 'scheduled' then 2
      when 'draft' then 3
      when 'completed' then 4
      when 'cancelled' then 5
      else 6
    end,
    coalesce(
      c.starts_at,
      c.created_at
    ) desc,
    c.updated_at desc
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

revoke all
on function public.update_marketing_campaign_tracking_admin(
  uuid,
  numeric,
  text
)
from public;

revoke all
on function public.add_marketing_campaign_conversion_admin(
  uuid,
  uuid,
  uuid,
  numeric,
  text,
  text
)
from public;

revoke all
on function public.delete_marketing_campaign_conversion_admin(uuid)
from public;

revoke all
on function public.get_marketing_candidate_orders_admin(
  uuid,
  text,
  integer
)
from public;

revoke all
on function public.get_marketing_campaign_conversions_admin(uuid)
from public;

revoke all
on function public.get_marketing_campaigns_admin_v2(
  text,
  integer
)
from public;

grant execute
on function public.update_marketing_campaign_tracking_admin(
  uuid,
  numeric,
  text
)
to authenticated;

grant execute
on function public.add_marketing_campaign_conversion_admin(
  uuid,
  uuid,
  uuid,
  numeric,
  text,
  text
)
to authenticated;

grant execute
on function public.delete_marketing_campaign_conversion_admin(uuid)
to authenticated;

grant execute
on function public.get_marketing_candidate_orders_admin(
  uuid,
  text,
  integer
)
to authenticated;

grant execute
on function public.get_marketing_campaign_conversions_admin(uuid)
to authenticated;

grant execute
on function public.get_marketing_campaigns_admin_v2(
  text,
  integer
)
to authenticated;
