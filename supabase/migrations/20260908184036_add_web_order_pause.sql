/*
 * ============================================================
 * PAUSA MANUAL DE PEDIDOS WEB
 * ============================================================
 */

alter table public.business_settings
add column if not exists
  web_orders_enabled boolean not null default true;

alter table public.business_settings
add column if not exists
  web_orders_pause_message text;

alter table public.business_settings
drop constraint if exists
  business_settings_web_orders_pause_message_length_check;

alter table public.business_settings
add constraint
  business_settings_web_orders_pause_message_length_check
check (
  web_orders_pause_message is null
  or length(trim(web_orders_pause_message)) between 1 and 250
);


/*
 * Estado público actualizado.
 *
 * IMPORTANTE:
 * is_open representa si realmente se pueden recibir pedidos web:
 * - pedidos web habilitados manualmente
 * - y negocio dentro de horario
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
  is_within_business_hours boolean
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
  v_within_hours boolean;
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
      bh.is_open,
      false
    ),

    bh.open_time,

    bh.close_time,

    v_web_orders_enabled,

    v_pause_message,

    v_within_hours
  from (
    select 1
  ) seed
  left join public.business_hours bh
    on bh.day_of_week =
      extract(
        dow from v_local_now
      )::smallint;
end;
$$;

revoke all
on function public.get_public_business_status()
from public;

grant execute
on function public.get_public_business_status()
to anon, authenticated;


/*
 * Reemplazamos el trigger anterior.
 *
 * Distingue:
 * 1) pausa manual
 * 2) fuera de horario
 */

create or replace function
public.enforce_web_order_business_hours()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_web_orders_enabled boolean;
  v_pause_message text;
begin
  if
    new.order_source <> 'web'
  then
    return new;
  end if;

  select
    bs.web_orders_enabled,
    bs.web_orders_pause_message
  into
    v_web_orders_enabled,
    v_pause_message
  from public.business_settings bs
  where bs.id = 1;

  if
    coalesce(
      v_web_orders_enabled,
      true
    ) = false
  then
    raise exception '%',
      coalesce(
        nullif(
          trim(
            v_pause_message
          ),
          ''
        ),
        'Los pedidos web están pausados temporalmente.'
      );
  end if;

  if not public.is_business_open()
  then
    raise exception
      'Actualmente estamos fuera del horario de atención.';
  end if;

  return new;
end;
$$;