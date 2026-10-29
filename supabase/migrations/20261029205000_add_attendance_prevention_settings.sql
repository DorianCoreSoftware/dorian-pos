begin;

create table if not exists public.attendance_prevention_settings (
  id smallint primary key default 1 check (id = 1),
  history_days integer not null default 28 check (history_days between 7 and 366),
  lookahead_days integer not null default 14 check (lookahead_days between 7 and 28),
  minimum_staff_per_day integer not null default 2 check (minimum_staff_per_day between 1 and 50),
  overtime_risk_minutes integer not null default 180 check (overtime_risk_minutes between 0 and 20000),
  absence_risk_days integer not null default 2 check (absence_risk_days between 1 and 60),
  late_risk_days integer not null default 3 check (late_risk_days between 1 and 60),
  negative_balance_risk_minutes integer not null default 240 check (negative_balance_risk_minutes between 0 and 20000),
  updated_at timestamptz not null default now(),
  updated_by uuid null references public.profiles(id)
);

insert into public.attendance_prevention_settings (id)
values (1)
on conflict (id) do nothing;

alter table public.attendance_prevention_settings enable row level security;
revoke all on public.attendance_prevention_settings from anon, authenticated;

drop function if exists public.attendance_admin_get_prevention_settings();
create or replace function public.attendance_admin_get_prevention_settings()
returns table (
  history_days integer,
  lookahead_days integer,
  minimum_staff_per_day integer,
  overtime_risk_minutes integer,
  absence_risk_days integer,
  late_risk_days integer,
  negative_balance_risk_minutes integer
)
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.attendance_assert_active_admin();

  return query
  select
    s.history_days,
    s.lookahead_days,
    s.minimum_staff_per_day,
    s.overtime_risk_minutes,
    s.absence_risk_days,
    s.late_risk_days,
    s.negative_balance_risk_minutes
  from public.attendance_prevention_settings s
  where s.id = 1;
end;
$$;

drop function if exists public.attendance_admin_save_prevention_settings(integer, integer, integer, integer, integer, integer, integer);
create or replace function public.attendance_admin_save_prevention_settings(
  p_history_days integer,
  p_lookahead_days integer,
  p_minimum_staff_per_day integer,
  p_overtime_risk_minutes integer,
  p_absence_risk_days integer,
  p_late_risk_days integer,
  p_negative_balance_risk_minutes integer
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.attendance_assert_active_admin();

  if p_history_days not between 7 and 366 then
    raise exception 'El historial debe estar entre 7 y 366 días.';
  end if;
  if p_lookahead_days not between 7 and 28 then
    raise exception 'La proyección debe estar entre 7 y 28 días.';
  end if;
  if p_minimum_staff_per_day not between 1 and 50 then
    raise exception 'El mínimo de personal debe estar entre 1 y 50.';
  end if;
  if p_overtime_risk_minutes not between 0 and 20000
     or p_negative_balance_risk_minutes not between 0 and 20000 then
    raise exception 'Los umbrales de minutos no son válidos.';
  end if;
  if p_absence_risk_days not between 1 and 60
     or p_late_risk_days not between 1 and 60 then
    raise exception 'Los umbrales de días no son válidos.';
  end if;

  insert into public.attendance_prevention_settings (
    id,
    history_days,
    lookahead_days,
    minimum_staff_per_day,
    overtime_risk_minutes,
    absence_risk_days,
    late_risk_days,
    negative_balance_risk_minutes,
    updated_at,
    updated_by
  )
  values (
    1,
    p_history_days,
    p_lookahead_days,
    p_minimum_staff_per_day,
    p_overtime_risk_minutes,
    p_absence_risk_days,
    p_late_risk_days,
    p_negative_balance_risk_minutes,
    now(),
    auth.uid()
  )
  on conflict (id) do update
  set
    history_days = excluded.history_days,
    lookahead_days = excluded.lookahead_days,
    minimum_staff_per_day = excluded.minimum_staff_per_day,
    overtime_risk_minutes = excluded.overtime_risk_minutes,
    absence_risk_days = excluded.absence_risk_days,
    late_risk_days = excluded.late_risk_days,
    negative_balance_risk_minutes = excluded.negative_balance_risk_minutes,
    updated_at = now(),
    updated_by = auth.uid();
end;
$$;

grant execute on function public.attendance_admin_get_prevention_settings() to authenticated;
grant execute on function public.attendance_admin_save_prevention_settings(integer, integer, integer, integer, integer, integer, integer) to authenticated;

commit;
