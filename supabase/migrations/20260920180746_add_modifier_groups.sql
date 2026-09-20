create table if not exists public.modifier_groups (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  is_active boolean not null default true,
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.modifiers
add column if not exists group_id uuid null;

alter table public.modifiers
add constraint modifiers_group_id_fkey
foreign key (group_id)
references public.modifier_groups(id)
on delete set null;

insert into public.modifier_groups (
  code,
  name,
  position
)
values
  ('meat', 'Carne', 1),
  ('sauce', 'Salsa', 2),
  ('drink_flavor', 'Sabor de refresco', 3),
  ('ice_cream_flavor', 'Sabor de nieve', 4)
on conflict (code)
do update set
  name = excluded.name,
  position = excluded.position,
  is_active = true;

update public.modifiers m
set group_id = g.id
from public.modifier_groups g
where
  (
    m.group_name = 'Carne'
    and g.code = 'meat'
  )
  or
  (
    m.group_name = 'Salsa'
    and g.code = 'sauce'
  )
  or
  (
    m.group_name = 'Sabor'
    and g.code = 'drink_flavor'
  );

create index if not exists idx_modifiers_group_id
on public.modifiers(group_id);

create index if not exists idx_modifier_groups_active_position
on public.modifier_groups(is_active, position);