alter table public.product_modifier_groups
enable row level security;

drop policy if exists
  "authenticated can read product modifier groups"
on public.product_modifier_groups;

create policy
  "authenticated can read product modifier groups"
on public.product_modifier_groups
for select
to authenticated
using (true);

drop policy if exists
  "authenticated can insert product modifier groups"
on public.product_modifier_groups;

create policy
  "authenticated can insert product modifier groups"
on public.product_modifier_groups
for insert
to authenticated
with check (true);

drop policy if exists
  "authenticated can update product modifier groups"
on public.product_modifier_groups;

create policy
  "authenticated can update product modifier groups"
on public.product_modifier_groups
for update
to authenticated
using (true)
with check (true);

drop policy if exists
  "authenticated can delete product modifier groups"
on public.product_modifier_groups;

create policy
  "authenticated can delete product modifier groups"
on public.product_modifier_groups
for delete
to authenticated
using (true);