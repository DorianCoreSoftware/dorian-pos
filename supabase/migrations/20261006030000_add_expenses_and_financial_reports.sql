-- ============================================================
-- FASE 13: EGRESOS + BALANCE FINANCIERO
-- ============================================================

create table if not exists public.expense_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  position integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint expense_categories_name_not_blank check (btrim(name) <> '')
);

create unique index if not exists expense_categories_name_unique_ci
  on public.expense_categories (lower(btrim(name)));

create table if not exists public.business_expenses (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references public.expense_categories(id),
  amount numeric(12,2) not null,
  description text not null,
  payment_method text not null default 'cash',
  expense_at timestamptz not null default now(),
  recorded_by uuid not null default auth.uid() references public.profiles(id),
  receipt_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint expenses_amount_positive check (amount > 0),
  constraint expenses_description_not_blank check (btrim(description) <> ''),
  constraint expenses_payment_method_check check (
    payment_method in ('cash', 'card', 'transfer', 'other')
  )
);

create index if not exists business_expenses_expense_at_idx
  on public.business_expenses (expense_at desc);

create index if not exists business_expenses_category_id_idx
  on public.business_expenses (category_id);

alter table public.expense_categories enable row level security;
alter table public.business_expenses enable row level security;

drop policy if exists "Admins manage expense categories" on public.expense_categories;
create policy "Admins manage expense categories"
on public.expense_categories
for all
to authenticated
using (
  exists (
    select 1
    from public.profiles profile
    where profile.id = auth.uid()
      and profile.role = 'admin'::public.user_role
      and coalesce(profile.is_active, true) = true
  )
)
with check (
  exists (
    select 1
    from public.profiles profile
    where profile.id = auth.uid()
      and profile.role = 'admin'::public.user_role
      and coalesce(profile.is_active, true) = true
  )
);

drop policy if exists "Admins manage business expenses" on public.business_expenses;
create policy "Admins manage business expenses"
on public.business_expenses
for all
to authenticated
using (
  exists (
    select 1
    from public.profiles profile
    where profile.id = auth.uid()
      and profile.role = 'admin'::public.user_role
      and coalesce(profile.is_active, true) = true
  )
)
with check (
  exists (
    select 1
    from public.profiles profile
    where profile.id = auth.uid()
      and profile.role = 'admin'::public.user_role
      and coalesce(profile.is_active, true) = true
  )
);

grant select, insert, update, delete on public.expense_categories to authenticated;
grant select, insert, update, delete on public.business_expenses to authenticated;

insert into public.expense_categories(name, position)
values
  ('Insumos', 10),
  ('Nómina', 20),
  ('Renta', 30),
  ('Servicios', 40),
  ('Mantenimiento', 50),
  ('Publicidad', 60),
  ('Transporte', 70),
  ('Otros', 100)
on conflict do nothing;

-- Resumen del periodo. "Balance" no pretende ser utilidad contable:
-- compara ventas cobradas netas de reembolsos contra egresos registrados.
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
    select coalesce(sum(op.total_amount), 0)::numeric as gross_sales
    from public.order_payments op
    where op.created_at >= p_from
      and op.created_at <= p_to
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
    (p.gross_sales - r.refunds)::numeric as net_sales,
    e.expenses,
    (p.gross_sales - r.refunds - e.expenses)::numeric as balance,
    e.expense_count
  from payment_totals p
  cross join refund_totals r
  cross join expense_totals e;
end;
$$;

create or replace function public.get_expense_category_report(
  p_from timestamptz,
  p_to timestamptz
)
returns table (
  category_id uuid,
  category_name text,
  expense_count bigint,
  amount numeric
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
  select
    category.id,
    category.name,
    count(expense.id)::bigint,
    coalesce(sum(expense.amount), 0)::numeric
  from public.expense_categories category
  join public.business_expenses expense
    on expense.category_id = category.id
  where expense.expense_at >= p_from
    and expense.expense_at <= p_to
  group by category.id, category.name, category.position
  order by sum(expense.amount) desc, category.position asc, category.name asc;
end;
$$;

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
  with days as (
    select generate_series(
      date_trunc('day', p_from),
      date_trunc('day', p_to),
      interval '1 day'
    )::date as day
  ),
  sales as (
    select
      op.created_at::date as day,
      coalesce(sum(op.total_amount), 0)::numeric as gross
    from public.order_payments op
    where op.created_at >= p_from
      and op.created_at <= p_to
    group by op.created_at::date
  ),
  refunds as (
    select
      cr.created_at::date as day,
      coalesce(sum(cr.amount), 0)::numeric as amount
    from public.cash_refunds cr
    where cr.created_at >= p_from
      and cr.created_at <= p_to
    group by cr.created_at::date
  ),
  expenses_by_day as (
    select
      e.expense_at::date as day,
      coalesce(sum(e.amount), 0)::numeric as amount
    from public.business_expenses e
    where e.expense_at >= p_from
      and e.expense_at <= p_to
    group by e.expense_at::date
  )
  select
    d.day,
    (coalesce(s.gross, 0) - coalesce(r.amount, 0))::numeric as net_sales,
    coalesce(e.amount, 0)::numeric as expenses,
    (
      coalesce(s.gross, 0) -
      coalesce(r.amount, 0) -
      coalesce(e.amount, 0)
    )::numeric as balance
  from days d
  left join sales s on s.day = d.day
  left join refunds r on r.day = d.day
  left join expenses_by_day e on e.day = d.day
  order by d.day asc;
end;
$$;

grant execute on function public.get_financial_balance_report(timestamptz, timestamptz) to authenticated;
grant execute on function public.get_expense_category_report(timestamptz, timestamptz) to authenticated;
grant execute on function public.get_daily_financial_report(timestamptz, timestamptz) to authenticated;
