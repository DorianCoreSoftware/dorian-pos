-- ============================================================
-- DORIAN POS
-- CRM HOTFIX
-- Corrige referencia ambigua de `id` en get_crm_customers_admin_v2
-- ============================================================
--
-- En PL/pgSQL, las columnas declaradas en RETURNS TABLE también
-- existen como variables de salida. La función retorna `id`, por
-- lo que `where id = 1` era ambiguo dentro del CTE settings.
--
-- Se califica explícitamente `crm_settings.id` con alias.
-- ============================================================

create or replace function public.get_crm_customers_admin_v2(
  p_search text default null,
  p_active_only boolean default true,
  p_limit integer default 300
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
  last_seen_at timestamptz,
  segment_codes text[]
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  perform public.require_crm_admin();

  return query
  with settings as (
    select cs.*
    from public.crm_settings cs
    where cs.id = 1
  ),
  refund_totals as (
    select
      r.order_id,
      coalesce(
        sum(r.refund_total),
        0
      )::numeric as refunded
    from public.order_refunds r
    where r.status = 'completed'
    group by r.order_id
  ),
  order_stats as (
    select
      o.crm_customer_id,
      count(*)::bigint as delivered_orders,
      coalesce(
        sum(
          greatest(
            coalesce(o.total, 0) -
            coalesce(rf.refunded, 0),
            0
          )
        ),
        0
      )::numeric as net_spend,
      max(
        coalesce(
          o.status_updated_at,
          o.created_at
        )
      ) as last_order_at
    from public.orders o
    left join refund_totals rf
      on rf.order_id = o.id
    where
      o.crm_customer_id is not null
      and o.status = 'delivered'
    group by o.crm_customer_id
  ),
  loyalty_stats as (
    select
      lc.id as loyalty_customer_id,
      count(lv.id)::bigint as visits
    from public.loyalty_customers lc
    left join public.loyalty_visits lv
      on lv.customer_id = lc.id
    group by lc.id
  ),
  event_stats as (
    select
      e.crm_customer_id,
      count(*)::bigint as event_requests,
      max(e.created_at) as last_event_at
    from public.event_requests e
    where e.crm_customer_id is not null
    group by e.crm_customer_id
  ),
  customer_stats as (
    select
      c.*,
      coalesce(os.delivered_orders, 0)::bigint
        as delivered_orders_calc,
      round(
        coalesce(os.net_spend, 0),
        2
      ) as net_spend_calc,
      case
        when coalesce(os.delivered_orders, 0) > 0
        then round(
          os.net_spend /
          os.delivered_orders,
          2
        )
        else 0::numeric
      end as average_ticket_calc,
      os.last_order_at,
      coalesce(ls.visits, 0)::bigint
        as loyalty_visits_calc,
      coalesce(es.event_requests, 0)::bigint
        as event_requests_calc,
      es.last_event_at,
      greatest(
        c.last_seen_at,
        coalesce(os.last_order_at, c.last_seen_at),
        coalesce(es.last_event_at, c.last_seen_at)
      ) as activity_at
    from public.crm_customers c
    left join order_stats os
      on os.crm_customer_id = c.id
    left join loyalty_stats ls
      on ls.loyalty_customer_id =
        c.loyalty_customer_id
    left join event_stats es
      on es.crm_customer_id = c.id
  )
  select
    cs.id,
    cs.name,
    cs.phone,
    cs.email,
    cs.notes,
    cs.tags,
    cs.is_active,
    (
      cs.web_customer_id is not null
    )::boolean as has_web_account,
    (
      cs.loyalty_customer_id is not null
    )::boolean as has_loyalty,
    cs.delivered_orders_calc,
    cs.net_spend_calc,
    cs.average_ticket_calc,
    cs.last_order_at,
    cs.loyalty_visits_calc,
    cs.event_requests_calc,
    cs.last_event_at,
    cs.first_seen_at,
    cs.activity_at,
    array_remove(
      array[
        case
          when cs.first_seen_at >=
            now() -
            make_interval(
              days => s.new_customer_days
            )
          then 'new'
        end,

        case
          when cs.delivered_orders_calc >=
            s.frequent_min_orders
          then 'frequent'
        end,

        case
          when cs.net_spend_calc >=
            s.vip_min_spend
          then 'vip'
        end,

        case
          when
            cs.delivered_orders_calc > 0
            and cs.average_ticket_calc >=
              s.high_ticket_min_average
          then 'high_ticket'
        end,

        case
          when
            (
              cs.last_order_at is not null
              and cs.last_order_at <
                now() -
                make_interval(
                  days => s.inactive_days
                )
            )
            or
            (
              cs.last_order_at is null
              and cs.first_seen_at <
                now() -
                make_interval(
                  days => s.inactive_days
                )
            )
          then 'inactive'
        end
      ],
      null
    )::text[] as segment_codes
  from customer_stats cs
  cross join settings s
  where
    (
      not p_active_only
      or cs.is_active = true
    )
    and (
      nullif(
        btrim(
          coalesce(p_search, '')
        ),
        ''
      ) is null
      or lower(cs.name) like
        '%' ||
        lower(btrim(p_search)) ||
        '%'
      or cs.normalized_phone like
        '%' ||
        regexp_replace(
          coalesce(p_search, ''),
          '[^0-9]',
          '',
          'g'
        ) ||
        '%'
      or lower(
        coalesce(cs.email, '')
      ) like
        '%' ||
        lower(btrim(p_search)) ||
        '%'
      or exists (
        select 1
        from unnest(cs.tags) tag
        where lower(tag) like
          '%' ||
          lower(btrim(p_search)) ||
          '%'
      )
    )
  order by
    cs.activity_at desc,
    cs.name asc
  limit greatest(
    1,
    least(
      coalesce(p_limit, 300),
      500
    )
  );
end;
$$;

-- Restaurar permisos de ejecución de la función reemplazada.
revoke all
on function public.get_crm_customers_admin_v2(
  text,
  boolean,
  integer
)
from public;

grant execute
on function public.get_crm_customers_admin_v2(
  text,
  boolean,
  integer
)
to authenticated;
