alter table public.profiles
add column if not exists username text;

update public.profiles
set is_active = true
where is_active is null;

alter table public.profiles
alter column is_active set default true;

alter table public.profiles
alter column is_active set not null;

create unique index if not exists
profiles_username_unique_ci
on public.profiles (
  lower(username)
)
where username is not null;

alter table public.profiles
drop constraint if exists profiles_username_format_check;

alter table public.profiles
add constraint profiles_username_format_check
check (
  username is null
  or username ~ '^[A-Za-z0-9._-]{3,40}$'
);

create index if not exists
profiles_role_idx
on public.profiles (
  role
);

create index if not exists
profiles_is_active_idx
on public.profiles (
  is_active
);