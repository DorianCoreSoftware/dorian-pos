create table if not exists public.weekly_sauce_settings (
  id uuid primary key default gen_random_uuid(),

  modifier_id uuid
    references public.modifiers(id)
    on delete set null,

  discount_amount numeric(10,2)
    not null
    default 5.00,

  is_enabled boolean
    not null
    default false,

  starts_at date,
  ends_at date,

  created_at timestamptz
    not null
    default now(),

  updated_at timestamptz
    not null
    default now()
);

create index if not exists idx_weekly_sauce_settings_modifier
  on public.weekly_sauce_settings(modifier_id);

create index if not exists idx_weekly_sauce_settings_enabled
  on public.weekly_sauce_settings(is_enabled);

create table if not exists public.order_weekly_sauce_discounts (
  id uuid primary key default gen_random_uuid(),

  order_id uuid
    not null
    references public.orders(id)
    on delete cascade,

  order_item_id uuid
    references public.order_items(id)
    on delete cascade,

  order_item_component_id uuid
    references public.order_item_components(id)
    on delete cascade,

  modifier_id uuid
    not null
    references public.modifiers(id),

  discount_amount numeric(10,2)
    not null,

  created_at timestamptz
    not null
    default now()
);

create index if not exists idx_order_weekly_sauce_discounts_order
  on public.order_weekly_sauce_discounts(order_id);

create index if not exists idx_order_weekly_sauce_discounts_modifier
  on public.order_weekly_sauce_discounts(modifier_id);

alter table public.order_weekly_sauce_discounts
add constraint order_weekly_sauce_discount_source_check
check (
  order_item_id is not null
  or order_item_component_id is not null
);

create unique index if not exists uq_weekly_sauce_discount_order_item
on public.order_weekly_sauce_discounts(order_item_id)
where order_item_id is not null;

create unique index if not exists uq_weekly_sauce_discount_component
on public.order_weekly_sauce_discounts(order_item_component_id)
where order_item_component_id is not null;

create or replace function public.get_active_weekly_sauce()
returns table (
  id uuid,
  modifier_id uuid,
  modifier_name text,
  discount_amount numeric,
  starts_at date,
  ends_at date
)
language sql
stable
as $$
  select
    wss.id,
    wss.modifier_id,
    m.name as modifier_name,
    wss.discount_amount,
    wss.starts_at,
    wss.ends_at
  from public.weekly_sauce_settings wss
  join public.modifiers m
    on m.id = wss.modifier_id
  where
    wss.is_enabled = true
    and (
      wss.starts_at is null
      or current_date >= wss.starts_at
    )
    and (
      wss.ends_at is null
      or current_date <= wss.ends_at
    )
  order by wss.updated_at desc
  limit 1;
$$;