begin;

/* ============================================================
 * FASE 10 · PREFERENCIAS DE PUSH LABORAL
 * ============================================================ */
alter table public.attendance_notifications
  add column if not exists push_skipped_at timestamptz;

create table if not exists public.attendance_notification_preferences (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  clock_reminders boolean not null default true,
  request_updates boolean not null default true,
  payroll_updates boolean not null default true,
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles(id) on delete set null
);

alter table public.attendance_notification_preferences enable row level security;
revoke insert, update, delete on public.attendance_notification_preferences from authenticated;

drop policy if exists attendance_notification_preferences_select_own
  on public.attendance_notification_preferences;
create policy attendance_notification_preferences_select_own
on public.attendance_notification_preferences
for select to authenticated
using (user_id = auth.uid());

create or replace function public.attendance_get_notification_preferences()
returns table (
  clock_reminders boolean,
  request_updates boolean,
  payroll_updates boolean
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_profile public.profiles%rowtype;
begin
  select p.* into v_profile
  from public.profiles p
  where p.id = auth.uid();

  if v_profile.id is null or not coalesce(v_profile.is_active,false) then
    raise exception 'Usuario no disponible.';
  end if;

  return query
  select
    coalesce(pref.clock_reminders,true),
    coalesce(pref.request_updates,true),
    coalesce(pref.payroll_updates,true)
  from (select 1) seed
  left join public.attendance_notification_preferences pref
    on pref.user_id = auth.uid();
end;
$$;

grant execute on function public.attendance_get_notification_preferences()
  to authenticated;

create or replace function public.attendance_save_notification_preferences(
  p_clock_reminders boolean,
  p_request_updates boolean,
  p_payroll_updates boolean
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_profile public.profiles%rowtype;
begin
  select p.* into v_profile
  from public.profiles p
  where p.id = auth.uid();

  if v_profile.id is null or not coalesce(v_profile.is_active,false) then
    raise exception 'Usuario no disponible.';
  end if;

  insert into public.attendance_notification_preferences(
    user_id,
    clock_reminders,
    request_updates,
    payroll_updates,
    updated_at,
    updated_by
  ) values (
    auth.uid(),
    coalesce(p_clock_reminders,true),
    coalesce(p_request_updates,true),
    coalesce(p_payroll_updates,true),
    now(),
    auth.uid()
  )
  on conflict (user_id)
  do update set
    clock_reminders = excluded.clock_reminders,
    request_updates = excluded.request_updates,
    payroll_updates = excluded.payroll_updates,
    updated_at = now(),
    updated_by = auth.uid();
end;
$$;

grant execute on function public.attendance_save_notification_preferences(boolean,boolean,boolean)
  to authenticated;

commit;
