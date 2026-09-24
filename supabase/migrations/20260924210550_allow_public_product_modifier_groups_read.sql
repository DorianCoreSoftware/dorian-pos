alter table public.product_modifier_groups
enable row level security;

drop policy if exists
  "Public can read active product modifier groups"
on public.product_modifier_groups;

create policy
  "Public can read active product modifier groups"
on public.product_modifier_groups
for select
to anon
using (is_active = true);