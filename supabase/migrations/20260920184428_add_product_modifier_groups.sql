create table if not exists public.product_modifier_groups (
  id uuid primary key default gen_random_uuid(),

  product_id uuid not null
    references public.products(id)
    on delete cascade,

  modifier_group_id uuid not null
    references public.modifier_groups(id)
    on delete cascade,

  is_required boolean not null default false,

  min_selections integer not null default 0,

  max_selections integer not null default 1,

  position integer not null default 0,

  is_active boolean not null default true,

  created_at timestamptz not null default now(),

  updated_at timestamptz not null default now(),

  constraint product_modifier_groups_unique
    unique (
      product_id,
      modifier_group_id
    ),

  constraint product_modifier_groups_min_check
    check (
      min_selections >= 0
    ),

  constraint product_modifier_groups_max_check
    check (
      max_selections >= 1
    ),

  constraint product_modifier_groups_range_check
    check (
      max_selections >= min_selections
    )
);

create index if not exists
  idx_product_modifier_groups_product
on public.product_modifier_groups(
  product_id
);

create index if not exists
  idx_product_modifier_groups_group
on public.product_modifier_groups(
  modifier_group_id
);

create index if not exists
  idx_product_modifier_groups_active
on public.product_modifier_groups(
  product_id,
  is_active,
  position
);