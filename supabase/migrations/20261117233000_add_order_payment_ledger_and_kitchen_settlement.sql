-- Kitchen/payment reconciliation: support incremental payments after order edits
-- while preserving the legacy one-row order_payments summary for downstream code.

create table if not exists public.order_payment_movements (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  payment_method text not null,
  amount numeric(10,2) not null,
  amount_received numeric(10,2),
  change_amount numeric(10,2),
  payment_reference text,
  payment_timing text not null default 'final',
  created_by uuid null references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  constraint order_payment_movements_method_check
    check (payment_method in ('cash','card','transfer')),
  constraint order_payment_movements_amount_check
    check (amount <> 0),
  constraint order_payment_movements_received_check
    check (amount_received is null or amount_received >= 0),
  constraint order_payment_movements_change_check
    check (change_amount is null or change_amount >= 0),
  constraint order_payment_movements_timing_check
    check (payment_timing in ('final','advance','adjustment'))
);

create index if not exists idx_order_payment_movements_order_created
  on public.order_payment_movements(order_id, created_at);
create index if not exists idx_order_payment_movements_created
  on public.order_payment_movements(created_at);

alter table public.order_payment_movements enable row level security;

drop policy if exists "Authenticated users read order payment movements"
  on public.order_payment_movements;
create policy "Authenticated users read order payment movements"
  on public.order_payment_movements
  for select
  to authenticated
  using (true);

-- Writes are performed through security-definer RPCs / compatibility trigger.
revoke insert, update, delete on public.order_payment_movements from authenticated;
grant select on public.order_payment_movements to authenticated;

-- Existing payments become the first ledger movement.
insert into public.order_payment_movements (
  order_id,
  payment_method,
  amount,
  amount_received,
  change_amount,
  payment_reference,
  payment_timing,
  created_at
)
select
  op.order_id,
  op.payment_method,
  op.total_amount,
  op.amount_received,
  op.change_amount,
  op.payment_reference,
  coalesce(op.payment_timing, 'final'),
  op.created_at
from public.order_payments op
where op.total_amount <> 0
  and not exists (
    select 1
    from public.order_payment_movements m
    where m.order_id = op.order_id
  );

-- The legacy row now acts as a cumulative compatibility summary.
-- Cash amount_received/change refer to the most recent movement, not the cumulative paid total.
alter table public.order_payments
  drop constraint if exists order_payments_cash_values_check;
alter table public.order_payments
  add constraint order_payments_cash_values_check
  check (
    (
      payment_method = 'cash'
      and amount_received is not null
      and change_amount is not null
      and amount_received >= 0
      and change_amount >= 0
    )
    or (
      payment_method in ('card','transfer')
      and amount_received is null
      and change_amount is null
    )
  );

create or replace function public.capture_order_payment_summary_delta()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_previous numeric(10,2) := 0;
  v_delta numeric(10,2);
  v_timing text;
begin
  if coalesce(current_setting('app.skip_payment_movement', true), '') = '1' then
    return new;
  end if;

  if tg_op = 'UPDATE' then
    v_previous := coalesce(old.total_amount, 0);
  end if;

  v_delta := round(coalesce(new.total_amount, 0) - v_previous, 2);
  if v_delta = 0 then
    return new;
  end if;

  v_timing := case
    when v_delta < 0 then 'adjustment'
    else coalesce(new.payment_timing, 'final')
  end;

  insert into public.order_payment_movements (
    order_id,
    payment_method,
    amount,
    amount_received,
    change_amount,
    payment_reference,
    payment_timing,
    created_by,
    created_at
  ) values (
    new.order_id,
    new.payment_method,
    v_delta,
    case when v_delta > 0 then new.amount_received else null end,
    case when v_delta > 0 then new.change_amount else null end,
    new.payment_reference,
    v_timing,
    auth.uid(),
    now()
  );

  return new;
end;
$$;

drop trigger if exists trg_capture_order_payment_summary_delta
  on public.order_payments;
create trigger trg_capture_order_payment_summary_delta
after insert or update of total_amount
on public.order_payments
for each row
execute function public.capture_order_payment_summary_delta();

create or replace function public.get_order_payment_state(
  p_order_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_total numeric(10,2);
  v_paid numeric(10,2);
  v_balance numeric(10,2);
  v_credit numeric(10,2);
begin
  select round(o.total::numeric, 2)
  into v_total
  from public.orders o
  where o.id = p_order_id;

  if not found then
    raise exception 'No se encontró el pedido.';
  end if;

  select round(coalesce(sum(m.amount), 0)::numeric, 2)
  into v_paid
  from public.order_payment_movements m
  where m.order_id = p_order_id;

  v_balance := greatest(round(v_total - v_paid, 2), 0);
  v_credit := greatest(round(v_paid - v_total, 2), 0);

  return jsonb_build_object(
    'orderId', p_order_id,
    'orderTotal', v_total,
    'paidTotal', v_paid,
    'balanceDue', v_balance,
    'creditDue', v_credit,
    'status', case
      when v_credit > 0 then 'credit'
      when v_paid <= 0 then 'unpaid'
      when v_balance > 0 then 'partial'
      else 'paid'
    end,
    'movements', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'id', m.id,
          'paymentMethod', m.payment_method,
          'amount', m.amount,
          'amountReceived', m.amount_received,
          'changeAmount', m.change_amount,
          'paymentReference', m.payment_reference,
          'paymentTiming', m.payment_timing,
          'createdAt', m.created_at
        ) order by m.created_at asc, m.id asc
      )
      from public.order_payment_movements m
      where m.order_id = p_order_id
    ), '[]'::jsonb)
  );
end;
$$;

revoke all on function public.get_order_payment_state(uuid) from public;
grant execute on function public.get_order_payment_state(uuid) to authenticated;

create or replace function public.register_order_payment_movement(
  p_order_id uuid,
  p_payment_method text,
  p_amount numeric,
  p_amount_received numeric default null,
  p_payment_reference text default null,
  p_payment_timing text default 'final'
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_role text;
  v_order_total numeric(10,2);
  v_paid numeric(10,2);
  v_balance numeric(10,2);
  v_change numeric(10,2) := null;
  v_summary public.order_payments%rowtype;
begin
  if auth.uid() is null then
    raise exception 'Debes iniciar sesión para registrar un pago.';
  end if;

  select p.role::text
  into v_role
  from public.profiles p
  where p.id = auth.uid()
    and coalesce(p.is_active, true) = true;

  if coalesce(v_role, '') not in ('admin','seller','operator','driver') then
    raise exception 'No tienes permisos para registrar pagos.';
  end if;

  if p_payment_method not in ('cash','card','transfer') then
    raise exception 'Método de pago inválido.';
  end if;

  if p_payment_timing not in ('final','advance') then
    raise exception 'Momento de pago inválido.';
  end if;

  select round(o.total::numeric, 2)
  into v_order_total
  from public.orders o
  where o.id = p_order_id
  for update;

  if not found then
    raise exception 'No se encontró el pedido.';
  end if;

  select round(coalesce(sum(m.amount), 0)::numeric, 2)
  into v_paid
  from public.order_payment_movements m
  where m.order_id = p_order_id;

  v_balance := round(v_order_total - v_paid, 2);

  if v_balance <= 0 then
    raise exception 'El pedido no tiene saldo pendiente.';
  end if;

  if p_amount is null or p_amount <= 0 then
    raise exception 'El importe del pago debe ser mayor a cero.';
  end if;

  if round(p_amount, 2) > v_balance then
    raise exception 'El pago excede el saldo pendiente de $%.', v_balance;
  end if;

  if p_payment_method = 'cash' then
    if p_amount_received is null or p_amount_received < p_amount then
      raise exception 'La cantidad recibida no cubre el pago.';
    end if;
    v_change := round(p_amount_received - p_amount, 2);
  elsif p_payment_method = 'transfer' then
    if length(trim(coalesce(p_payment_reference, ''))) < 3 then
      raise exception 'Captura la referencia o folio de la transferencia.';
    end if;
    p_amount_received := null;
  else
    p_amount_received := null;
    p_payment_reference := null;
  end if;

  if p_payment_timing = 'final' then
    perform public.assert_order_fully_prepared(p_order_id);
  end if;

  select *
  into v_summary
  from public.order_payments op
  where op.order_id = p_order_id
  for update;

  if found then
    update public.order_payments
    set
      total_amount = round(coalesce(v_summary.total_amount, 0) + p_amount, 2),
      payment_method = p_payment_method,
      amount_received = case when p_payment_method = 'cash' then p_amount_received else null end,
      change_amount = case when p_payment_method = 'cash' then v_change else null end,
      payment_reference = case when p_payment_method = 'transfer' then trim(p_payment_reference) else null end,
      payment_timing = p_payment_timing
    where id = v_summary.id;
  else
    insert into public.order_payments (
      order_id,
      payment_method,
      total_amount,
      amount_received,
      change_amount,
      payment_reference,
      payment_timing
    ) values (
      p_order_id,
      p_payment_method,
      round(p_amount, 2),
      case when p_payment_method = 'cash' then p_amount_received else null end,
      case when p_payment_method = 'cash' then v_change else null end,
      case when p_payment_method = 'transfer' then trim(p_payment_reference) else null end,
      p_payment_timing
    );
  end if;

  return public.get_order_payment_state(p_order_id);
end;
$$;

revoke all on function public.register_order_payment_movement(uuid,text,numeric,numeric,text,text) from public;
grant execute on function public.register_order_payment_movement(uuid,text,numeric,numeric,text,text) to authenticated;

create or replace function public.register_order_overpayment_refund(
  p_order_id uuid,
  p_payment_method text,
  p_amount numeric,
  p_reference text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_role text;
  v_total numeric(10,2);
  v_paid numeric(10,2);
  v_credit numeric(10,2);
  v_summary public.order_payments%rowtype;
begin
  if auth.uid() is null then
    raise exception 'Debes iniciar sesión para registrar el ajuste.';
  end if;

  select p.role::text
  into v_role
  from public.profiles p
  where p.id = auth.uid()
    and coalesce(p.is_active, true) = true;

  if coalesce(v_role, '') not in ('admin','seller','operator') then
    raise exception 'No tienes permisos para registrar este ajuste.';
  end if;

  if p_payment_method not in ('cash','card','transfer') then
    raise exception 'Método de devolución inválido.';
  end if;

  select round(o.total::numeric, 2)
  into v_total
  from public.orders o
  where o.id = p_order_id
  for update;

  if not found then
    raise exception 'No se encontró el pedido.';
  end if;

  select round(coalesce(sum(m.amount), 0)::numeric, 2)
  into v_paid
  from public.order_payment_movements m
  where m.order_id = p_order_id;

  v_credit := round(v_paid - v_total, 2);
  if v_credit <= 0 then
    raise exception 'El pedido no tiene saldo a favor.';
  end if;

  if p_amount is null or p_amount <= 0 or round(p_amount,2) > v_credit then
    raise exception 'El importe de devolución no es válido.';
  end if;

  select *
  into v_summary
  from public.order_payments op
  where op.order_id = p_order_id
  for update;

  if not found then
    raise exception 'No existe un pago previo para ajustar.';
  end if;

  insert into public.order_payment_movements (
    order_id,
    payment_method,
    amount,
    amount_received,
    change_amount,
    payment_reference,
    payment_timing,
    created_by,
    created_at
  ) values (
    p_order_id,
    p_payment_method,
    -round(p_amount, 2),
    null,
    null,
    case when p_payment_method = 'transfer' then nullif(trim(coalesce(p_reference,'')), '') else null end,
    'adjustment',
    auth.uid(),
    now()
  );

  perform set_config('app.skip_payment_movement', '1', true);

  update public.order_payments
  set
    total_amount = round(greatest(coalesce(v_summary.total_amount, 0) - p_amount, 0), 2)
  where id = v_summary.id;

  return public.get_order_payment_state(p_order_id);
end;
$$;

revoke all on function public.register_order_overpayment_refund(uuid,text,numeric,text) from public;
grant execute on function public.register_order_overpayment_refund(uuid,text,numeric,text) to authenticated;

-- Final payments still require the kitchen verification. Advance payments do not.
create or replace function public.enforce_order_prepared_before_payment()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  if
    coalesce(new.total_amount, 0) > coalesce(case when tg_op = 'UPDATE' then old.total_amount else 0 end, 0)
    and coalesce(new.payment_timing, 'final') <> 'advance'
  then
    perform public.assert_order_fully_prepared(new.order_id);
  end if;

  return new;
end;
$$;

drop trigger if exists trg_order_payments_require_prepared_items
on public.order_payments;
create trigger trg_order_payments_require_prepared_items
before insert or update of total_amount on public.order_payments
for each row
execute function public.enforce_order_prepared_before_payment();

-- Ready/on_the_way no longer require item checks. The final settlement does.
create or replace function public.assert_order_financially_settled(
  p_order_id uuid
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_total numeric(10,2);
  v_paid numeric(10,2);
begin
  select round(o.total::numeric,2)
  into v_total
  from public.orders o
  where o.id = p_order_id;

  select round(coalesce(sum(m.amount),0)::numeric,2)
  into v_paid
  from public.order_payment_movements m
  where m.order_id = p_order_id;

  if abs(v_total - v_paid) > 0.009 then
    if v_paid < v_total then
      raise exception 'No se puede entregar: faltan $% por cobrar.', round(v_total - v_paid,2);
    else
      raise exception 'No se puede entregar: hay $% a favor del cliente por resolver.', round(v_paid - v_total,2);
    end if;
  end if;
end;
$$;

create or replace function public.enforce_order_prepared_before_ready()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  if
    new.status is distinct from old.status
    and new.status = 'delivered'
  then
    perform public.assert_order_fully_prepared(new.id);
    perform public.assert_order_financially_settled(new.id);
  end if;

  return new;
end;
$$;

-- Financial reports use signed ledger movements so additional payments and
-- overpayment refunds land on the day/method where money actually moved.
create or replace function public.get_daily_financial_report(
  p_from timestamptz,
  p_to timestamptz
)
returns table (
  report_date date,
  net_sales numeric,
  expenses numeric,
  balance numeric
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_timezone text;
begin
  if not exists (
    select 1 from public.profiles profile
    where profile.id = auth.uid()
      and profile.role = 'admin'::public.user_role
      and coalesce(profile.is_active, true) = true
  ) then
    raise exception 'No autorizado.';
  end if;

  select coalesce(bs.timezone, 'America/Mexico_City')
  into v_timezone
  from public.business_settings bs
  where bs.id = 1;
  v_timezone := coalesce(v_timezone, 'America/Mexico_City');

  return query
  with days as (
    select generate_series(
      (p_from at time zone v_timezone)::date,
      (p_to at time zone v_timezone)::date,
      interval '1 day'
    )::date as day
  ),
  sales as (
    select
      (m.created_at at time zone v_timezone)::date as day,
      coalesce(sum(m.amount), 0)::numeric as gross
    from public.order_payment_movements m
    where m.created_at >= p_from and m.created_at <= p_to
    group by (m.created_at at time zone v_timezone)::date
  ),
  refunds as (
    select
      (cr.created_at at time zone v_timezone)::date as day,
      coalesce(sum(cr.amount), 0)::numeric as amount
    from public.cash_refunds cr
    where cr.created_at >= p_from and cr.created_at <= p_to
    group by (cr.created_at at time zone v_timezone)::date
  ),
  expenses_by_day as (
    select
      (e.expense_at at time zone v_timezone)::date as day,
      coalesce(sum(e.amount), 0)::numeric as amount
    from public.business_expenses e
    where e.expense_at >= p_from and e.expense_at <= p_to
    group by (e.expense_at at time zone v_timezone)::date
  )
  select
    d.day,
    (coalesce(s.gross,0) - coalesce(r.amount,0))::numeric,
    coalesce(e.amount,0)::numeric,
    (coalesce(s.gross,0) - coalesce(r.amount,0) - coalesce(e.amount,0))::numeric
  from days d
  left join sales s on s.day = d.day
  left join refunds r on r.day = d.day
  left join expenses_by_day e on e.day = d.day
  order by d.day asc;
end;
$$;

-- Driver flow also charges only the outstanding balance after order edits.
create or replace function public.driver_register_payment(
  p_order_id uuid,
  p_payment_method text,
  p_amount_received numeric default null,
  p_payment_reference text default null
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid;
  v_total numeric(10,2);
  v_paid numeric(10,2);
  v_balance numeric(10,2);
  v_summary_id uuid;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'Debes iniciar sesión.';
  end if;

  if not exists (
    select 1 from public.profiles p
    where p.id = v_user_id
      and p.is_active = true
      and p.role in ('driver', 'admin')
  ) then
    raise exception 'No tienes permisos para registrar este pago.';
  end if;

  select round(o.total::numeric,2)
  into v_total
  from public.orders o
  where o.id = p_order_id
    and o.fulfillment_type = 'delivery'
    and o.status = 'on_the_way'
    and (o.driver_id = v_user_id or exists (
      select 1 from public.profiles p where p.id=v_user_id and p.role='admin'
    ))
  for update;

  if v_total is null then
    raise exception 'No puedes cobrar este pedido.';
  end if;

  select round(coalesce(sum(m.amount),0)::numeric,2)
  into v_paid
  from public.order_payment_movements m
  where m.order_id = p_order_id;

  v_balance := round(v_total - v_paid,2);

  select op.id into v_summary_id
  from public.order_payments op
  where op.order_id = p_order_id
  limit 1;

  if v_balance <= 0 then
    if v_summary_id is null then
      raise exception 'El pedido no tiene saldo pendiente pero tampoco tiene un resumen de pago válido.';
    end if;
    return v_summary_id;
  end if;

  perform public.register_order_payment_movement(
    p_order_id,
    p_payment_method,
    v_balance,
    p_amount_received,
    p_payment_reference,
    'final'
  );

  select op.id into v_summary_id
  from public.order_payments op
  where op.order_id = p_order_id
  limit 1;

  return v_summary_id;
end;
$$;

revoke all on function public.driver_register_payment(uuid,text,numeric,text) from public;
grant execute on function public.driver_register_payment(uuid,text,numeric,text) to authenticated;

create or replace function public.get_financial_balance_report(
  p_from timestamptz,
  p_to timestamptz
)
returns table (
  gross_sales numeric,
  refunds numeric,
  net_sales numeric,
  expenses numeric,
  balance numeric,
  expense_count bigint
)
language plpgsql
security definer
set search_path = public
as $$
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
    select coalesce(sum(m.amount), 0)::numeric as gross_sales
    from public.order_payment_movements m
    where m.created_at >= p_from
      and m.created_at <= p_to
  ),
  refund_totals as (
    select coalesce(sum(cr.amount), 0)::numeric as refunds
    from public.cash_refunds cr
    where cr.created_at >= p_from
      and cr.created_at <= p_to
  ),
  expense_totals as (
    select
      coalesce(sum(e.amount), 0)::numeric as expenses,
      count(*)::bigint as expense_count
    from public.business_expenses e
    where e.expense_at >= p_from
      and e.expense_at <= p_to
  )
  select
    p.gross_sales,
    r.refunds,
    (p.gross_sales - r.refunds)::numeric,
    e.expenses,
    (p.gross_sales - r.refunds - e.expenses)::numeric,
    e.expense_count
  from payment_totals p
  cross join refund_totals r
  cross join expense_totals e;
end;
$$;
