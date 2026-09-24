alter table public.weekly_sauce_settings
enable row level security;

drop policy if exists
  "authenticated can read weekly sauce settings"
on public.weekly_sauce_settings;

create policy
  "authenticated can read weekly sauce settings"
on public.weekly_sauce_settings
for select
to authenticated
using (true);


drop policy if exists
  "authenticated can insert weekly sauce settings"
on public.weekly_sauce_settings;

create policy
  "authenticated can insert weekly sauce settings"
on public.weekly_sauce_settings
for insert
to authenticated
with check (true);


drop policy if exists
  "authenticated can update weekly sauce settings"
on public.weekly_sauce_settings;

create policy
  "authenticated can update weekly sauce settings"
on public.weekly_sauce_settings
for update
to authenticated
using (true)
with check (true);