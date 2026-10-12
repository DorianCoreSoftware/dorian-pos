-- Dorian POS - Devoluciones: integración financiera
-- Ejecutar SOLO después de 20261012023000_refunds_v1.sql.
--
-- Objetivo:
-- 1) El Balance financiero suma reembolsos promocionales (cash_refunds)
--    + devoluciones normales (order_refunds).
-- 2) El reporte diario hace la misma suma por fecha.
-- 3) No se altera el reporte de promociones: cash_refunds sigue siendo
--    exclusivamente el origen de los reembolsos promocionales.

create or replace function public.get_financial_balance_report(
  p_from timestamp with time zone,
  p_to timestamp with time zone
)
returns table(
  gross_sales numeric,
  refunds numeric,
  net_sales numeric,
  expenses numeric,
  balance numeric,
  expense_count bigint
)
language plpgsql
security definer
set search_path to 'public'
as $function$
begin
  if not exists (
    select 1
    from public.profiles profile
    where profile.id = auth.uid()
      and profile.role = 'admin'::public.user_role
      and coalesce(profile.is_active, true) = true
  ) then
    raise exception 'No autorizado.';
  end if;

  return query
  with payment_totals as (
    select
      coalesce(
        sum(op.total_amount),
        0
      )::numeric
        as gross_sales
    from public.order_payments op
    where op.created_at >= p_from
      and op.created_at <= p_to
  ),
  refund_events as (
    select
      cr.amount::numeric
        as amount
    from public.cash_refunds cr
    where cr.created_at >= p_from
      and cr.created_at <= p_to

    union all

    select
      r.refund_total::numeric
        as amount
    from public.order_refunds r
    where r.status = 'completed'
      and r.created_at >= p_from
      and r.created_at <= p_to
  ),
  refund_totals as (
    select
      coalesce(
        sum(re.amount),
        0
      )::numeric
        as refunds
    from refund_events re
  ),
  expense_totals as (
    select
      coalesce(
        sum(e.amount),
        0
      )::numeric
        as expenses,

      count(*)::bigint
        as expense_count
    from public.business_expenses e
    where e.expense_at >= p_from
      and e.expense_at <= p_to
  )
  select
    p.gross_sales,
    r.refunds,

    (
      p.gross_sales -
      r.refunds
    )::numeric
      as net_sales,

    e.expenses,

    (
      p.gross_sales -
      r.refunds -
      e.expenses
    )::numeric
      as balance,

    e.expense_count
  from payment_totals p
  cross join refund_totals r
  cross join expense_totals e;
end;
$function$;


create or replace function public.get_daily_financial_report(
  p_from timestamp with time zone,
  p_to timestamp with time zone
)
returns table(
  report_date date,
  net_sales numeric,
  expenses numeric,
  balance numeric
)
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_timezone text;
begin
  if not exists (
    select 1
    from public.profiles profile
    where profile.id = auth.uid()
      and profile.role = 'admin'::public.user_role
      and coalesce(profile.is_active, true) = true
  ) then
    raise exception 'No autorizado.';
  end if;

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
  with days as (
    select
      generate_series(
        (
          p_from
          at time zone
          v_timezone
        )::date,

        (
          p_to
          at time zone
          v_timezone
        )::date,

        interval '1 day'
      )::date
        as day
  ),
  sales as (
    select
      (
        op.created_at
        at time zone
        v_timezone
      )::date
        as day,

      coalesce(
        sum(op.total_amount),
        0
      )::numeric
        as gross
    from public.order_payments op
    where op.created_at >= p_from
      and op.created_at <= p_to
    group by
      (
        op.created_at
        at time zone
        v_timezone
      )::date
  ),
  refund_events as (
    select
      (
        cr.created_at
        at time zone
        v_timezone
      )::date
        as day,

      cr.amount::numeric
        as amount
    from public.cash_refunds cr
    where cr.created_at >= p_from
      and cr.created_at <= p_to

    union all

    select
      (
        r.created_at
        at time zone
        v_timezone
      )::date
        as day,

      r.refund_total::numeric
        as amount
    from public.order_refunds r
    where r.status = 'completed'
      and r.created_at >= p_from
      and r.created_at <= p_to
  ),
  refunds as (
    select
      re.day,
      coalesce(
        sum(re.amount),
        0
      )::numeric
        as amount
    from refund_events re
    group by
      re.day
  ),
  expenses_by_day as (
    select
      (
        e.expense_at
        at time zone
        v_timezone
      )::date
        as day,

      coalesce(
        sum(e.amount),
        0
      )::numeric
        as amount
    from public.business_expenses e
    where e.expense_at >= p_from
      and e.expense_at <= p_to
    group by
      (
        e.expense_at
        at time zone
        v_timezone
      )::date
  )
  select
    d.day,

    (
      coalesce(
        s.gross,
        0
      ) -
      coalesce(
        r.amount,
        0
      )
    )::numeric
      as net_sales,

    coalesce(
      e.amount,
      0
    )::numeric
      as expenses,

    (
      coalesce(
        s.gross,
        0
      ) -
      coalesce(
        r.amount,
        0
      ) -
      coalesce(
        e.amount,
        0
      )
    )::numeric
      as balance
  from days d
  left join sales s
    on s.day = d.day
  left join refunds r
    on r.day = d.day
  left join expenses_by_day e
    on e.day = d.day
  order by
    d.day asc;
end;
$function$;
