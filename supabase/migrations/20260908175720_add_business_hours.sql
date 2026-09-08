create table if not exists public.business_settings (
  id smallint primary key check (id = 1),
  timezone text not null default 'America/Mexico_City',
  updated_at timestamptz not null default now()
);

insert into public.business_settings (id, timezone)
values (1, 'America/Mexico_City')
on conflict (id) do nothing;

create table if not exists public.business_hours (
  id uuid primary key default gen_random_uuid(),
  day_of_week smallint not null check (day_of_week between 0 and 6),
  is_open boolean not null default true,
  open_time time not null default '17:00',
  close_time time not null default '23:00',
  updated_at timestamptz not null default now(),
  unique (day_of_week)
);

insert into public.business_hours (
  day_of_week,
  is_open,
  open_time,
  close_time
)
select
  day_number,
  true,
  '17:00'::time,
  '23:00'::time
from generate_series(0, 6) as day_number
on conflict (day_of_week) do nothing;

alter table public.business_settings enable row level security;
alter table public.business_hours enable row level security;

drop policy if exists "authenticated can read business settings"
on public.business_settings;

create policy "authenticated can read business settings"
on public.business_settings
for select
to authenticated
using (true);

drop policy if exists "authenticated can update business settings"
on public.business_settings;

create policy "authenticated can update business settings"
on public.business_settings
for update
to authenticated
using (true)
with check (true);

drop policy if exists "authenticated can read business hours"
on public.business_hours;

create policy "authenticated can read business hours"
on public.business_hours
for select
to authenticated
using (true);

drop policy if exists "authenticated can insert business hours"
on public.business_hours;

create policy "authenticated can insert business hours"
on public.business_hours
for insert
to authenticated
with check (true);

drop policy if exists "authenticated can update business hours"
on public.business_hours;

create policy "authenticated can update business hours"
on public.business_hours
for update
to authenticated
using (true)
with check (true);

create or replace function public.is_business_open()
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_timezone text;
  v_local_now timestamp;
  v_day smallint;
  v_previous_day smallint;
  v_time time;
  v_today public.business_hours%rowtype;
  v_previous public.business_hours%rowtype;
begin
  select timezone
  into v_timezone
  from public.business_settings
  where id = 1;

  v_timezone := coalesce(v_timezone, 'America/Mexico_City');
  v_local_now := timezone(v_timezone, now());

  v_day := extract(dow from v_local_now)::smallint;
  v_previous_day := case when v_day = 0 then 6 else v_day - 1 end;
  v_time := v_local_now::time;

  select *
  into v_today
  from public.business_hours
  where day_of_week = v_day;

  if found and v_today.is_open then
    if v_today.close_time > v_today.open_time then
      if v_time >= v_today.open_time and v_time < v_today.close_time then
        return true;
      end if;
    else
      if v_time >= v_today.open_time then
        return true;
      end if;
    end if;
  end if;

  select *
  into v_previous
  from public.business_hours
  where day_of_week = v_previous_day;

  if
    found
    and v_previous.is_open
    and v_previous.close_time <= v_previous.open_time
    and v_time < v_previous.close_time
  then
    return true;
  end if;

  return false;
end;
$$;

revoke all on function public.is_business_open() from public;
grant execute on function public.is_business_open() to anon, authenticated;

create or replace function public.get_public_business_status()
returns table (
  is_open boolean,
  timezone text,
  local_day_of_week smallint,
  local_time time,
  today_is_open boolean,
  today_open_time time,
  today_close_time time
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_timezone text;
  v_local_now timestamp;
begin
  select bs.timezone
  into v_timezone
  from public.business_settings bs
  where bs.id = 1;

  v_timezone := coalesce(v_timezone, 'America/Mexico_City');
  v_local_now := timezone(v_timezone, now());

  return query
  select
    public.is_business_open(),
    v_timezone,
    extract(dow from v_local_now)::smallint,
    v_local_now::time,
    coalesce(bh.is_open, false),
    bh.open_time,
    bh.close_time
  from (select 1) seed
  left join public.business_hours bh
    on bh.day_of_week = extract(dow from v_local_now)::smallint;
end;
$$;

revoke all on function public.get_public_business_status() from public;
grant execute on function public.get_public_business_status() to anon, authenticated;