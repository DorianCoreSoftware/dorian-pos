/*
 * ============================================================
 * EXCEPCIONES DE HORARIO POR FECHA
 * ============================================================
 *
 * Prioridad:
 * 1) pausa manual de pedidos web
 * 2) excepción de la fecha
 * 3) horario semanal
 */

create table if not exists public.business_hour_exceptions (
  id uuid primary key default gen_random_uuid(),
  exception_date date not null unique,
  is_open boolean not null default false,
  open_time time,
  close_time time,
  reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint business_hour_exceptions_reason_length_check
  check (
    reason is null
    or length(trim(reason)) between 1 and 120
  ),

  constraint business_hour_exceptions_times_check
  check (
    (
      is_open = false
      and open_time is null
      and close_time is null
    )
    or
    (
      is_open = true
      and open_time is not null
      and close_time is not null
      and open_time <> close_time
    )
  )
);

alter table public.business_hour_exceptions
enable row level security;

drop policy if exists
  "authenticated can read business hour exceptions"
on public.business_hour_exceptions;

create policy
  "authenticated can read business hour exceptions"
on public.business_hour_exceptions
for select
to authenticated
using (true);

drop policy if exists
  "authenticated can insert business hour exceptions"
on public.business_hour_exceptions;

create policy
  "authenticated can insert business hour exceptions"
on public.business_hour_exceptions
for insert
to authenticated
with check (true);

drop policy if exists
  "authenticated can update business hour exceptions"
on public.business_hour_exceptions;

create policy
  "authenticated can update business hour exceptions"
on public.business_hour_exceptions
for update
to authenticated
using (true)
with check (true);

drop policy if exists
  "authenticated can delete business hour exceptions"
on public.business_hour_exceptions;

create policy
  "authenticated can delete business hour exceptions"
on public.business_hour_exceptions
for delete
to authenticated
using (true);


/*
 * Devuelve el horario efectivo de una fecha:
 * excepción si existe; si no, horario semanal.
 */
create or replace function public.get_effective_business_schedule(
  p_date date
)
returns table (
  is_open boolean,
  open_time time,
  close_time time,
  is_exception boolean,
  reason text
)
language sql
security definer
set search_path = public
stable
as $$
  with exception_row as (
    select
      e.is_open,
      e.open_time,
      e.close_time,
      true as is_exception,
      e.reason
    from public.business_hour_exceptions e
    where e.exception_date = p_date
    limit 1
  ),
  weekly_row as (
    select
      h.is_open,
      h.open_time,
      h.close_time,
      false as is_exception,
      null::text as reason
    from public.business_hours h
    where h.day_of_week =
      extract(dow from p_date)::smallint
    limit 1
  )
  select *
  from exception_row

  union all

  select *
  from weekly_row
  where not exists (
    select 1
    from exception_row
  )

  limit 1;
$$;

revoke all
on function public.get_effective_business_schedule(date)
from public;

grant execute
on function public.get_effective_business_schedule(date)
to anon, authenticated;


/*
 * Reescribe is_business_open() para que considere
 * excepciones y horarios que cruzan medianoche.
 */
create or replace function public.is_business_open()
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_timezone text;
  v_local_now timestamp;
  v_local_date date;
  v_previous_date date;
  v_time time;

  v_today_is_open boolean;
  v_today_open_time time;
  v_today_close_time time;

  v_previous_is_open boolean;
  v_previous_open_time time;
  v_previous_close_time time;
begin
  select timezone
  into v_timezone
  from public.business_settings
  where id = 1;

  v_timezone :=
    coalesce(
      v_timezone,
      'America/Mexico_City'
    );

  v_local_now :=
    timezone(
      v_timezone,
      now()
    );

  v_local_date :=
    v_local_now::date;

  v_previous_date :=
    v_local_date - 1;

  v_time :=
    v_local_now::time;

  select
    s.is_open,
    s.open_time,
    s.close_time
  into
    v_today_is_open,
    v_today_open_time,
    v_today_close_time
  from public.get_effective_business_schedule(
    v_local_date
  ) s;

  if
    coalesce(
      v_today_is_open,
      false
    )
  then
    if
      v_today_close_time >
      v_today_open_time
    then
      if
        v_time >= v_today_open_time
        and
        v_time < v_today_close_time
      then
        return true;
      end if;
    else
      if
        v_time >= v_today_open_time
      then
        return true;
      end if;
    end if;
  end if;

  /*
   * Si el horario de ayer cruzó medianoche,
   * todavía podemos estar dentro de ese turno.
   */
  select
    s.is_open,
    s.open_time,
    s.close_time
  into
    v_previous_is_open,
    v_previous_open_time,
    v_previous_close_time
  from public.get_effective_business_schedule(
    v_previous_date
  ) s;

  if
    coalesce(
      v_previous_is_open,
      false
    )
    and
    v_previous_close_time <=
      v_previous_open_time
    and
    v_time <
      v_previous_close_time
  then
    return true;
  end if;

  return false;
end;
$$;

revoke all
on function public.is_business_open()
from public;

grant execute
on function public.is_business_open()
to anon, authenticated;


/*
 * Estado público actualizado para la web.
 */
drop function if exists
  public.get_public_business_status();

create function public.get_public_business_status()
returns table (
  is_open boolean,
  timezone text,
  local_day_of_week smallint,
  local_time time,
  today_is_open boolean,
  today_open_time time,
  today_close_time time,
  web_orders_enabled boolean,
  pause_message text,
  is_within_business_hours boolean,
  today_is_exception boolean,
  exception_reason text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_timezone text;
  v_web_orders_enabled boolean;
  v_pause_message text;
  v_local_now timestamp;
  v_local_date date;
  v_within_hours boolean;

  v_today_is_open boolean;
  v_today_open_time time;
  v_today_close_time time;
  v_today_is_exception boolean;
  v_exception_reason text;
begin
  select
    bs.timezone,
    bs.web_orders_enabled,
    bs.web_orders_pause_message
  into
    v_timezone,
    v_web_orders_enabled,
    v_pause_message
  from public.business_settings bs
  where bs.id = 1;

  v_timezone :=
    coalesce(
      v_timezone,
      'America/Mexico_City'
    );

  v_web_orders_enabled :=
    coalesce(
      v_web_orders_enabled,
      true
    );

  v_local_now :=
    timezone(
      v_timezone,
      now()
    );

  v_local_date :=
    v_local_now::date;

  select
    s.is_open,
    s.open_time,
    s.close_time,
    s.is_exception,
    s.reason
  into
    v_today_is_open,
    v_today_open_time,
    v_today_close_time,
    v_today_is_exception,
    v_exception_reason
  from public.get_effective_business_schedule(
    v_local_date
  ) s;

  v_within_hours :=
    public.is_business_open();

  return query
  select
    (
      v_web_orders_enabled
      and v_within_hours
    ),

    v_timezone,

    extract(
      dow from v_local_now
    )::smallint,

    v_local_now::time,

    coalesce(
      v_today_is_open,
      false
    ),

    v_today_open_time,

    v_today_close_time,

    v_web_orders_enabled,

    v_pause_message,

    v_within_hours,

    coalesce(
      v_today_is_exception,
      false
    ),

    v_exception_reason;
end;
$$;

revoke all
on function public.get_public_business_status()
from public;

grant execute
on function public.get_public_business_status()
to anon, authenticated;