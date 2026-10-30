-- ============================================================
-- DORIAN POS
-- COSTEO Y UTILIDAD REAL - FASE 4
-- Snapshot histórico de COGS + reporte de utilidad bruta
-- ============================================================

-- ------------------------------------------------------------
-- 1. Snapshot de costo al momento del consumo
-- ------------------------------------------------------------

alter table public.order_inventory_consumptions
  add column if not exists unit_cost_snapshot numeric(16,6),
  add column if not exists cost_consumed numeric(16,4),
  add column if not exists cost_snapshot_source text;

alter table public.order_inventory_consumptions
  drop constraint if exists order_inventory_consumptions_cost_snapshot_source_check;

alter table public.order_inventory_consumptions
  add constraint order_inventory_consumptions_cost_snapshot_source_check
  check (
    cost_snapshot_source is null
    or cost_snapshot_source in (
      'delivery'
    )
  );

create or replace function public.snapshot_order_inventory_cost()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_unit_cost numeric(16,6);
begin
  if new.unit_cost_snapshot is null then
    select
      coalesce(i.unit_cost, 0)
    into
      v_unit_cost
    from public.inventory_items i
    where i.id =
      new.inventory_item_id;

    if v_unit_cost is null then
      raise exception
        'No se pudo obtener el costo del insumo consumido';
    end if;

    new.unit_cost_snapshot :=
      round(
        v_unit_cost,
        6
      );

    new.cost_consumed :=
      round(
        new.quantity_consumed *
        new.unit_cost_snapshot,
        4
      );

    new.cost_snapshot_source :=
      'delivery';
  elsif new.cost_consumed is null then
    new.cost_consumed :=
      round(
        new.quantity_consumed *
        new.unit_cost_snapshot,
        4
      );

    new.cost_snapshot_source :=
      coalesce(
        new.cost_snapshot_source,
        'delivery'
      );
  end if;

  return new;
end;
$$;

drop trigger if exists trg_snapshot_order_inventory_cost
on public.order_inventory_consumptions;

create trigger trg_snapshot_order_inventory_cost
before insert
on public.order_inventory_consumptions
for each row
execute function public.snapshot_order_inventory_cost();

-- Las filas históricas se dejan sin backfill a propósito.
-- Usar el costo actual para una venta pasada falsearía la utilidad.

-- ------------------------------------------------------------
-- 2. Resumen de utilidad de órdenes entregadas
-- ------------------------------------------------------------

create or replace function public.get_profitability_report_admin(
  p_from timestamptz,
  p_to timestamptz
)
returns table(
  gross_sales numeric,
  refunds numeric,
  net_sales numeric,
  cogs numeric,
  gross_profit numeric,
  gross_margin_percent numeric,
  orders_count bigint,
  costed_orders_count bigint,
  uncosted_orders_count bigint,
  cost_coverage_percent numeric
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  perform public.require_inventory_admin();

  return query
  with delivered_orders as (
    select
      o.id,
      coalesce(o.total, 0)::numeric
        as order_total
    from public.orders o
    where o.status = 'delivered'
      and o.status_updated_at >= p_from
      and o.status_updated_at < p_to
  ),
  refund_totals as (
    select
      r.order_id,
      coalesce(
        sum(r.refund_total),
        0
      )::numeric
        as refunded
    from public.order_refunds r
    join delivered_orders d
      on d.id = r.order_id
    where r.status = 'completed'
    group by r.order_id
  ),
  order_costs as (
    select
      d.id
        as order_id,
      count(c.id)::bigint
        as consumption_rows,
      count(c.id) filter (
        where c.cost_consumed is not null
      )::bigint
        as costed_rows,
      coalesce(
        sum(c.cost_consumed)
          filter (
            where c.cost_consumed is not null
          ),
        0
      )::numeric
        as cogs
    from delivered_orders d
    left join public.order_inventory_consumptions c
      on c.order_id = d.id
    group by d.id
  ),
  totals as (
    select
      coalesce(
        sum(d.order_total),
        0
      )::numeric
        as gross_sales,
      coalesce(
        sum(
          coalesce(
            r.refunded,
            0
          )
        ),
        0
      )::numeric
        as refunds,
      coalesce(
        sum(oc.cogs),
        0
      )::numeric
        as cogs,
      count(*)::bigint
        as orders_count,
      count(*) filter (
        where
          oc.consumption_rows > 0
          and
          oc.costed_rows =
            oc.consumption_rows
      )::bigint
        as costed_orders_count
    from delivered_orders d
    left join refund_totals r
      on r.order_id = d.id
    left join order_costs oc
      on oc.order_id = d.id
  )
  select
    round(
      t.gross_sales,
      2
    ),
    round(
      t.refunds,
      2
    ),
    round(
      t.gross_sales -
      t.refunds,
      2
    ),
    round(
      t.cogs,
      2
    ),
    round(
      (
        t.gross_sales -
        t.refunds
      ) -
      t.cogs,
      2
    ),
    case
      when
        (
          t.gross_sales -
          t.refunds
        ) > 0
      then round(
        (
          (
            (
              t.gross_sales -
              t.refunds
            ) -
            t.cogs
          ) /
          (
            t.gross_sales -
            t.refunds
          )
        ) *
        100,
        2
      )
      else null
    end,
    t.orders_count,
    t.costed_orders_count,
    (
      t.orders_count -
      t.costed_orders_count
    )::bigint,
    case
      when t.orders_count > 0
      then round(
        (
          t.costed_orders_count::numeric /
          t.orders_count::numeric
        ) *
        100,
        2
      )
      else 100::numeric
    end
  from totals t;
end;
$$;

revoke all
on function public.get_profitability_report_admin(
  timestamptz,
  timestamptz
)
from public;

grant execute
on function public.get_profitability_report_admin(
  timestamptz,
  timestamptz
)
to authenticated;

-- ------------------------------------------------------------
-- 3. Utilidad diaria según fecha de entrega
-- ------------------------------------------------------------

create or replace function public.get_daily_profitability_report_admin(
  p_from timestamptz,
  p_to timestamptz
)
returns table(
  report_date date,
  gross_sales numeric,
  refunds numeric,
  net_sales numeric,
  cogs numeric,
  gross_profit numeric,
  gross_margin_percent numeric,
  orders_count bigint,
  costed_orders_count bigint
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_timezone text;
begin
  perform public.require_inventory_admin();

  select
    coalesce(
      bs.timezone,
      'America/Mexico_City'
    )
  into
    v_timezone
  from public.business_settings bs
  where bs.id = 1;

  v_timezone :=
    coalesce(
      v_timezone,
      'America/Mexico_City'
    );

  return query
  with delivered_orders as (
    select
      o.id,
      (
        o.status_updated_at
        at time zone
        v_timezone
      )::date
        as day,
      coalesce(
        o.total,
        0
      )::numeric
        as order_total
    from public.orders o
    where o.status = 'delivered'
      and o.status_updated_at >= p_from
      and o.status_updated_at < p_to
  ),
  refund_totals as (
    select
      r.order_id,
      coalesce(
        sum(r.refund_total),
        0
      )::numeric
        as refunded
    from public.order_refunds r
    join delivered_orders d
      on d.id = r.order_id
    where r.status = 'completed'
    group by r.order_id
  ),
  order_costs as (
    select
      d.id
        as order_id,
      count(c.id)::bigint
        as consumption_rows,
      count(c.id) filter (
        where c.cost_consumed is not null
      )::bigint
        as costed_rows,
      coalesce(
        sum(c.cost_consumed)
          filter (
            where c.cost_consumed is not null
          ),
        0
      )::numeric
        as cogs
    from delivered_orders d
    left join public.order_inventory_consumptions c
      on c.order_id = d.id
    group by d.id
  )
  select
    d.day,
    round(
      coalesce(
        sum(d.order_total),
        0
      ),
      2
    )::numeric
      as gross_sales,
    round(
      coalesce(
        sum(
          coalesce(
            r.refunded,
            0
          )
        ),
        0
      ),
      2
    )::numeric
      as refunds,
    round(
      (
        coalesce(
          sum(d.order_total),
          0
        ) -
        coalesce(
          sum(
            coalesce(
              r.refunded,
              0
            )
          ),
          0
        )
      ),
      2
    )::numeric
      as net_sales,
    round(
      coalesce(
        sum(oc.cogs),
        0
      ),
      2
    )::numeric
      as cogs,
    round(
      (
        coalesce(
          sum(d.order_total),
          0
        ) -
        coalesce(
          sum(
            coalesce(
              r.refunded,
              0
            )
          ),
          0
        ) -
        coalesce(
          sum(oc.cogs),
          0
        )
      ),
      2
    )::numeric
      as gross_profit,
    case
      when
        (
          coalesce(
            sum(d.order_total),
            0
          ) -
          coalesce(
            sum(
              coalesce(
                r.refunded,
                0
              )
            ),
            0
          )
        ) > 0
      then round(
        (
          (
            coalesce(
              sum(d.order_total),
              0
            ) -
            coalesce(
              sum(
                coalesce(
                  r.refunded,
                  0
                )
              ),
              0
            ) -
            coalesce(
              sum(oc.cogs),
              0
            )
          ) /
          (
            coalesce(
              sum(d.order_total),
              0
            ) -
            coalesce(
              sum(
                coalesce(
                  r.refunded,
                  0
                )
              ),
              0
            )
          )
        ) *
        100,
        2
      )
      else null
    end
      as gross_margin_percent,
    count(*)::bigint
      as orders_count,
    count(*) filter (
      where
        oc.consumption_rows > 0
        and
        oc.costed_rows =
          oc.consumption_rows
    )::bigint
      as costed_orders_count
  from delivered_orders d
  left join refund_totals r
    on r.order_id = d.id
  left join order_costs oc
    on oc.order_id = d.id
  group by d.day
  order by d.day asc;
end;
$$;

revoke all
on function public.get_daily_profitability_report_admin(
  timestamptz,
  timestamptz
)
from public;

grant execute
on function public.get_daily_profitability_report_admin(
  timestamptz,
  timestamptz
)
to authenticated;
