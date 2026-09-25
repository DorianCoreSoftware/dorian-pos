-- ============================================================
-- OPCIONES DE MODIFICADORES POR PRODUCTO
-- ============================================================
--
-- Sustituye conceptualmente a product_flavors por una relación
-- genérica producto -> modificador. Sirve para sabores, tamaños,
-- toppings o cualquier subconjunto específico de un grupo.
--
-- En esta migración NO eliminamos product_flavors todavía.
-- Primero copiamos sus datos y dejamos un ciclo de compatibilidad.

create table if not exists public.product_modifier_options (
  id uuid primary key default gen_random_uuid(),

  product_id uuid not null
    references public.products(id)
    on delete cascade,

  modifier_id uuid not null
    references public.modifiers(id)
    on delete cascade,

  is_available boolean not null default true,

  position integer not null default 0,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint product_modifier_options_unique
    unique (
      product_id,
      modifier_id
    ),

  constraint product_modifier_options_position_check
    check (position >= 0)
);

create index if not exists
  idx_product_modifier_options_product
on public.product_modifier_options(
  product_id,
  is_available,
  position
);

create index if not exists
  idx_product_modifier_options_modifier
on public.product_modifier_options(
  modifier_id
);

alter table public.product_modifier_options
  enable row level security;

-- Lectura POS/autenticados.
drop policy if exists
  "Authenticated users read product modifier options"
on public.product_modifier_options;

create policy
  "Authenticated users read product modifier options"
on public.product_modifier_options
for select
to authenticated
using (true);

-- Lectura del menú web público.
drop policy if exists
  "anon_read_available_product_modifier_options"
on public.product_modifier_options;

create policy
  "anon_read_available_product_modifier_options"
on public.product_modifier_options
for select
to anon
using (is_available = true);

-- Escritura administrativa.
drop policy if exists
  "Admins insert product modifier options"
on public.product_modifier_options;

create policy
  "Admins insert product modifier options"
on public.product_modifier_options
for insert
to authenticated
with check (
  exists (
    select 1
    from public.profiles p
    where
      p.id = auth.uid()
      and p.role = 'admin'::public.user_role
  )
);

drop policy if exists
  "Admins update product modifier options"
on public.product_modifier_options;

create policy
  "Admins update product modifier options"
on public.product_modifier_options
for update
to authenticated
using (
  exists (
    select 1
    from public.profiles p
    where
      p.id = auth.uid()
      and p.role = 'admin'::public.user_role
  )
)
with check (
  exists (
    select 1
    from public.profiles p
    where
      p.id = auth.uid()
      and p.role = 'admin'::public.user_role
  )
);

drop policy if exists
  "Admins delete product modifier options"
on public.product_modifier_options;

create policy
  "Admins delete product modifier options"
on public.product_modifier_options
for delete
to authenticated
using (
  exists (
    select 1
    from public.profiles p
    where
      p.id = auth.uid()
      and p.role = 'admin'::public.user_role
  )
);

-- ============================================================
-- MIGRACIÓN DE PRODUCT_FLAVORS
-- ============================================================
-- Copiamos las relaciones existentes sin perder posición ni
-- disponibilidad. name ya no es necesario: modifiers es la fuente
-- de verdad del nombre.

insert into public.product_modifier_options (
  product_id,
  modifier_id,
  is_available,
  position
)
select
  pf.product_id,
  pf.modifier_id,
  pf.is_available,
  pf.position
from public.product_flavors pf
where pf.modifier_id is not null
on conflict (
  product_id,
  modifier_id
)
do update set
  is_available = excluded.is_available,
  position = excluded.position,
  updated_at = now();

-- Si un producto tenía sabores pero aún no tenía asociado el grupo
-- del modificador, creamos la asociación como selección obligatoria
-- de una sola opción. Esto preserva el comportamiento previo.

insert into public.product_modifier_groups (
  product_id,
  modifier_group_id,
  is_required,
  min_selections,
  max_selections,
  position,
  is_active
)
select distinct
  pf.product_id,
  m.group_id,
  true,
  1,
  1,
  coalesce(mg.position, 0),
  true
from public.product_flavors pf
join public.modifiers m
  on m.id = pf.modifier_id
left join public.modifier_groups mg
  on mg.id = m.group_id
where
  pf.modifier_id is not null
  and m.group_id is not null
on conflict (
  product_id,
  modifier_group_id
)
do nothing;
