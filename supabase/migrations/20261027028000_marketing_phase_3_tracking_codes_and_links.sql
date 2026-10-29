-- ============================================================
-- DORIAN POS
-- MARKETING - FASE 3
-- Códigos / tokens rastreables + atribución automática al entregar
-- ============================================================

alter table public.marketing_campaigns
  add column if not exists tracking_code text,
  add column if not exists tracking_token text,
  add column if not exists tracking_enabled boolean
    not null default false;

create unique index if not exists marketing_campaigns_tracking_code_unique
on public.marketing_campaigns(
  upper(tracking_code)
)
where tracking_code is not null;

create unique index if not exists marketing_campaigns_tracking_token_unique
on public.marketing_campaigns(
  tracking_token
)
where tracking_token is not null;

alter table public.orders
  add column if not exists marketing_campaign_id uuid
    references public.marketing_campaigns(id)
    on delete set null,
  add column if not exists marketing_tracking_source text,
  add column if not exists marketing_tracking_value text;

alter table public.orders
  drop constraint if exists orders_marketing_tracking_source_check;

alter table public.orders
  add constraint orders_marketing_tracking_source_check
  check (
    marketing_tracking_source is null
    or marketing_tracking_source in (
      'code',
      'link'
    )
  );

create index if not exists orders_marketing_campaign_idx
on public.orders(
  marketing_campaign_id,
  created_at desc
)
where marketing_campaign_id is not null;

-- ------------------------------------------------------------
-- Configuración de tracking por campaña
-- ------------------------------------------------------------

create or replace function public.save_marketing_campaign_tracking_identifiers_admin(
  p_campaign_id uuid,
  p_tracking_enabled boolean,
  p_tracking_code text
)
returns table(
  tracking_code text,
  tracking_token text,
  tracking_enabled boolean
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_code text;
  v_token text;
begin
  perform public.require_marketing_admin();

  if not exists (
    select 1
    from public.marketing_campaigns c
    where c.id = p_campaign_id
  ) then
    raise exception
      'Campaña no encontrada.';
  end if;

  v_code :=
    nullif(
      upper(
        regexp_replace(
          btrim(
            coalesce(
              p_tracking_code,
              ''
            )
          ),
          '[^A-Za-z0-9_-]',
          '',
          'g'
        )
      ),
      ''
    );

  if coalesce(
    p_tracking_enabled,
    false
  ) and v_code is null then
    raise exception
      'Debes indicar un código de seguimiento.';
  end if;

  select c.tracking_token
  into v_token
  from public.marketing_campaigns c
  where c.id =
    p_campaign_id;

  if v_token is null then
    v_token :=
      replace(
        gen_random_uuid()::text,
        '-',
        ''
      );
  end if;

  update public.marketing_campaigns
  set
    tracking_enabled =
      coalesce(
        p_tracking_enabled,
        false
      ),
    tracking_code =
      case
        when coalesce(
          p_tracking_enabled,
          false
        )
        then v_code
        else tracking_code
      end,
    tracking_token =
      v_token,
    updated_at =
      now()
  where id =
    p_campaign_id;

  return query
  select
    c.tracking_code,
    c.tracking_token,
    c.tracking_enabled
  from public.marketing_campaigns c
  where c.id =
    p_campaign_id;
end;
$$;

-- ------------------------------------------------------------
-- Resolver código / token de forma pública
-- No expone datos privados ni audiencia.
-- ------------------------------------------------------------

create or replace function public.resolve_marketing_tracking_public(
  p_code text default null,
  p_token text default null
)
returns table(
  campaign_id uuid,
  campaign_name text,
  source_type text,
  source_value text
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_code text;
  v_token text;
begin
  v_code :=
    nullif(
      upper(
        btrim(
          coalesce(
            p_code,
            ''
          )
        )
      ),
      ''
    );

  v_token :=
    nullif(
      btrim(
        coalesce(
          p_token,
          ''
        )
      ),
      ''
    );

  if v_code is null
     and v_token is null then
    return;
  end if;

  return query
  select
    c.id,
    c.name,
    case
      when v_token is not null
           and c.tracking_token = v_token
      then 'link'::text
      else 'code'::text
    end,
    case
      when v_token is not null
           and c.tracking_token = v_token
      then v_token
      else v_code
    end
  from public.marketing_campaigns c
  where
    c.tracking_enabled = true
    and c.status in (
      'scheduled',
      'active'
    )
    and (
      c.starts_at is null
      or c.starts_at <= now()
    )
    and (
      c.ends_at is null
      or c.ends_at >= now()
    )
    and (
      (
        v_token is not null
        and c.tracking_token = v_token
      )
      or (
        v_code is not null
        and upper(
          coalesce(
            c.tracking_code,
            ''
          )
        ) = v_code
      )
    )
  order by
    case
      when v_token is not null
           and c.tracking_token = v_token
      then 0
      else 1
    end
  limit 1;
end;
$$;

-- ------------------------------------------------------------
-- Asociar tracking a una orden web existente
-- Se valida order_id + client_request_id para evitar reclamar
-- órdenes ajenas conociendo sólo el UUID de la orden.
-- ------------------------------------------------------------

create or replace function public.claim_marketing_tracking_for_web_order(
  p_order_id uuid,
  p_client_request_id uuid,
  p_code text default null,
  p_token text default null
)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_order public.orders%rowtype;
  v_tracking record;
begin
  if p_order_id is null
     or p_client_request_id is null then
    return false;
  end if;

  select *
  into v_order
  from public.orders o
  where
    o.id =
      p_order_id
    and o.client_request_id =
      p_client_request_id
    and o.order_source =
      'web'
  for update;

  if not found then
    return false;
  end if;

  if v_order.marketing_campaign_id
    is not null then
    return true;
  end if;

  select *
  into v_tracking
  from public.resolve_marketing_tracking_public(
    p_code,
    p_token
  )
  limit 1;

  if not found then
    return false;
  end if;

  update public.orders
  set
    marketing_campaign_id =
      v_tracking.campaign_id,
    marketing_tracking_source =
      v_tracking.source_type,
    marketing_tracking_value =
      v_tracking.source_value
  where id =
    p_order_id;

  return true;
end;
$$;

-- ------------------------------------------------------------
-- Conversión automática cuando la orden rastreada se entrega.
-- ------------------------------------------------------------

create or replace function public.sync_marketing_conversion_from_order()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_refunded numeric :=
    0;
  v_net numeric :=
    0;
  v_attribution_type text;
begin
  if new.marketing_campaign_id is null then
    return new;
  end if;

  if new.status <> 'delivered' then
    return new;
  end if;

  if old.status is not distinct from new.status
     and tg_op = 'UPDATE' then
    return new;
  end if;

  select coalesce(
    sum(
      r.refund_total
    ),
    0
  )
  into v_refunded
  from public.order_refunds r
  where
    r.order_id =
      new.id
    and r.status =
      'completed';

  v_net :=
    greatest(
      coalesce(
        new.total,
        0
      ) -
      coalesce(
        v_refunded,
        0
      ),
      0
    );

  v_attribution_type :=
    case
      when new.marketing_tracking_source =
        'link'
      then 'link'
      when new.marketing_tracking_source =
        'code'
      then 'code'
      when new.order_source =
        'web'
      then 'web'
      else 'pos'
    end;

  insert into public.marketing_campaign_conversions(
    campaign_id,
    order_id,
    crm_customer_id,
    revenue_amount,
    attribution_type,
    notes
  )
  values (
    new.marketing_campaign_id,
    new.id,
    new.crm_customer_id,
    v_net,
    v_attribution_type,
    'Conversión automática desde orden rastreada.'
  )
  on conflict (
    campaign_id,
    order_id
  )
  where order_id is not null
  do update set
    crm_customer_id =
      excluded.crm_customer_id,
    revenue_amount =
      excluded.revenue_amount,
    attribution_type =
      excluded.attribution_type,
    notes =
      excluded.notes;

  return new;
end;
$$;

drop trigger if exists trg_orders_sync_marketing_conversion
on public.orders;

create trigger trg_orders_sync_marketing_conversion
after update of status
on public.orders
for each row
execute function public.sync_marketing_conversion_from_order();

-- ------------------------------------------------------------
-- Si una orden atribuida recibe devolución después de entregada,
-- actualiza el revenue neto de la conversión.
-- ------------------------------------------------------------

create or replace function public.refresh_marketing_conversion_after_refund()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_order_id uuid;
  v_campaign_id uuid;
  v_total numeric;
  v_refunded numeric;
begin
  v_order_id :=
    coalesce(
      new.order_id,
      old.order_id
    );

  select
    o.marketing_campaign_id,
    coalesce(
      o.total,
      0
    )
  into
    v_campaign_id,
    v_total
  from public.orders o
  where o.id =
    v_order_id
    and o.status =
      'delivered';

  if v_campaign_id is null then
    return coalesce(
      new,
      old
    );
  end if;

  select coalesce(
    sum(
      r.refund_total
    ),
    0
  )
  into v_refunded
  from public.order_refunds r
  where
    r.order_id =
      v_order_id
    and r.status =
      'completed';

  update public.marketing_campaign_conversions
  set
    revenue_amount =
      greatest(
        v_total -
        v_refunded,
        0
      )
  where
    campaign_id =
      v_campaign_id
    and order_id =
      v_order_id;

  return coalesce(
    new,
    old
  );
end;
$$;

drop trigger if exists trg_refunds_refresh_marketing_conversion
on public.order_refunds;

create trigger trg_refunds_refresh_marketing_conversion
after insert or update or delete
on public.order_refunds
for each row
execute function public.refresh_marketing_conversion_after_refund();

-- ------------------------------------------------------------
-- Campañas V3
-- ------------------------------------------------------------

create or replace function public.get_marketing_campaigns_admin_v3(
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
  tracking_enabled boolean,
  tracking_code text,
  tracking_token text,
  tracked_orders bigint,
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
  select
    v.id,
    v.name,
    v.description,
    v.audience_id,
    v.audience_name,
    v.current_audience_size,
    v.audience_size_snapshot,
    v.objective,
    v.channel,
    v.action_type,
    v.message_title,
    v.message_body,
    v.starts_at,
    v.ends_at,
    v.status,
    v.activated_at,
    v.completed_at,
    v.cancelled_at,
    v.budget_amount,
    v.notes,
    v.conversion_orders,
    v.converted_customers,
    v.attributed_revenue,
    v.conversion_rate,
    v.roi_percent,
    c.tracking_enabled,
    c.tracking_code,
    c.tracking_token,
    (
      select count(*)::bigint
      from public.orders o
      where o.marketing_campaign_id =
        c.id
    ),
    v.created_at,
    v.updated_at
  from public.get_marketing_campaigns_admin_v2(
    p_status,
    p_limit
  ) v
  join public.marketing_campaigns c
    on c.id =
      v.id;
end;
$$;

revoke all
on function public.save_marketing_campaign_tracking_identifiers_admin(
  uuid,
  boolean,
  text
)
from public;

revoke all
on function public.resolve_marketing_tracking_public(
  text,
  text
)
from public;

revoke all
on function public.claim_marketing_tracking_for_web_order(
  uuid,
  uuid,
  text,
  text
)
from public;

revoke all
on function public.get_marketing_campaigns_admin_v3(
  text,
  integer
)
from public;

grant execute
on function public.save_marketing_campaign_tracking_identifiers_admin(
  uuid,
  boolean,
  text
)
to authenticated;

grant execute
on function public.resolve_marketing_tracking_public(
  text,
  text
)
to anon, authenticated;

grant execute
on function public.claim_marketing_tracking_for_web_order(
  uuid,
  uuid,
  text,
  text
)
to anon, authenticated;

grant execute
on function public.get_marketing_campaigns_admin_v3(
  text,
  integer
)
to authenticated;
