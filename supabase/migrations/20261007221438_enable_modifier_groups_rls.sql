-- ============================================================
-- MODIFIER GROUPS RLS
-- ============================================================
--
-- modifier_groups forma parte del catálogo de configuración
-- pública de productos, pero las escrituras deben quedar
-- restringidas a administradores.
--
-- Lecturas:
-- - anon: únicamente grupos activos
-- - authenticated: todos los grupos
--
-- Escrituras:
-- - únicamente usuarios autenticados con role = admin
-- ============================================================

alter table public.modifier_groups
enable row level security;


-- ============================================================
-- AUTHENTICATED READ
-- ============================================================

drop policy if exists
  "Authenticated users read modifier groups"
on public.modifier_groups;

create policy
  "Authenticated users read modifier groups"
on public.modifier_groups
for select
to authenticated
using (true);


-- ============================================================
-- PUBLIC READ
-- ============================================================

drop policy if exists
  "Public can read active modifier groups"
on public.modifier_groups;

create policy
  "Public can read active modifier groups"
on public.modifier_groups
for select
to anon
using (
  is_active = true
);


-- ============================================================
-- ADMIN INSERT
-- ============================================================

drop policy if exists
  "Admins insert modifier groups"
on public.modifier_groups;

create policy
  "Admins insert modifier groups"
on public.modifier_groups
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


-- ============================================================
-- ADMIN UPDATE
-- ============================================================

drop policy if exists
  "Admins update modifier groups"
on public.modifier_groups;

create policy
  "Admins update modifier groups"
on public.modifier_groups
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


-- ============================================================
-- ADMIN DELETE
-- ============================================================

drop policy if exists
  "Admins delete modifier groups"
on public.modifier_groups;

create policy
  "Admins delete modifier groups"
on public.modifier_groups
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