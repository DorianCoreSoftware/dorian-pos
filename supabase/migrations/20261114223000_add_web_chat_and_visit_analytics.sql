-- ============================================================
-- DorianCore AI Orders - Phase 6 / Block 2
-- Web Chat Core + private web visit analytics
-- ============================================================

create extension if not exists pgcrypto;

-- ------------------------------------------------------------
-- 1. Permitir el canal WEB en conversaciones IA.
-- Conserva cualquier otro constraint y reemplaza únicamente
-- CHECK constraints que validen la columna channel.
-- ------------------------------------------------------------
do $$
declare
  constraint_row record;
begin
  for constraint_row in
    select
      conname
    from
      pg_constraint
    where
      conrelid =
        'public.ai_order_conversations'::regclass
      and contype =
        'c'
      and pg_get_constraintdef(
        oid
      ) ilike '%channel%'
  loop
    execute format(
      'alter table public.ai_order_conversations drop constraint %I',
      constraint_row.conname
    );
  end loop;
end
$$;

alter table
  public.ai_order_conversations
add constraint
  ai_order_conversations_channel_check
check (
  channel in (
    'internal',
    'whatsapp',
    'web'
  )
);

-- ------------------------------------------------------------
-- 2. Sesiones de visita web.
-- session_id evita contar refresh como otra visita.
-- visitor_id permite métricas anónimas de visitantes únicos.
-- ------------------------------------------------------------
create table if not exists
  public.web_visit_sessions (
    id uuid primary key
      default gen_random_uuid(),
    session_id uuid not null unique,
    visitor_id uuid not null,
    path text not null
      default '/',
    referrer text null,
    created_at timestamptz not null
      default now()
  );

create index if not exists
  web_visit_sessions_created_at_idx
on
  public.web_visit_sessions (
    created_at desc
  );

create index if not exists
  web_visit_sessions_visitor_id_idx
on
  public.web_visit_sessions (
    visitor_id,
    created_at desc
  );

alter table
  public.web_visit_sessions
enable row level security;

-- No creamos políticas SELECT/INSERT.
-- El navegador solo puede registrar mediante RPC SECURITY DEFINER.
revoke all
on table
  public.web_visit_sessions
from
  anon,
  authenticated;

-- ------------------------------------------------------------
-- 3. Registro público controlado.
-- Devuelve TRUE solo cuando la sesión se insertó por primera vez.
-- ------------------------------------------------------------
create or replace function
  public.register_web_visit(
    p_session_id uuid,
    p_visitor_id uuid,
    p_path text default '/',
    p_referrer text default null
  )
returns boolean
language plpgsql
security definer
set search_path =
  public,
  pg_temp
as $$
declare
  inserted_count integer;
begin
  if
    p_session_id is null or
    p_visitor_id is null
  then
    return false;
  end if;

  insert into
    public.web_visit_sessions (
      session_id,
      visitor_id,
      path,
      referrer
    )
  values (
    p_session_id,
    p_visitor_id,
    left(
      coalesce(
        nullif(
          trim(
            p_path
          ),
          ''
        ),
        '/'
      ),
      300
    ),
    nullif(
      left(
        trim(
          coalesce(
            p_referrer,
            ''
          )
        ),
        500
      ),
      ''
    )
  )
  on conflict (
    session_id
  )
  do nothing;

  get diagnostics
    inserted_count =
      row_count;

  return
    inserted_count >
    0;
end;
$$;

revoke all
on function
  public.register_web_visit(
    uuid,
    uuid,
    text,
    text
  )
from public;

grant execute
on function
  public.register_web_visit(
    uuid,
    uuid,
    text,
    text
  )
to
  anon,
  authenticated;

-- ------------------------------------------------------------
-- 4. Estadísticas privadas.
-- Incluso conociendo el nombre de la RPC, un visitante/empleado
-- que no sea admin recibe FORBIDDEN.
-- Zona horaria actual del producto: America/Mexico_City.
-- ------------------------------------------------------------
create or replace function
  public.get_web_visit_stats()
returns table (
  today bigint,
  last_7_days bigint,
  last_30_days bigint,
  total bigint,
  unique_today bigint,
  unique_7_days bigint,
  unique_30_days bigint,
  unique_total bigint
)
language plpgsql
security definer
set search_path =
  public,
  auth,
  pg_temp
as $$
declare
  caller_role text;
  today_start timestamptz;
  seven_days_start timestamptz;
  thirty_days_start timestamptz;
begin
  select
    p.role
  into
    caller_role
  from
    public.profiles p
  where
    p.id =
      auth.uid()
    and
    coalesce(
      p.is_active,
      true
    ) =
      true;

  if
    caller_role is distinct from
      'admin'
  then
    raise exception
      'FORBIDDEN'
      using errcode =
        '42501';
  end if;

  today_start =
    (
      date_trunc(
        'day',
        now() at time zone
          'America/Mexico_City'
      )
      at time zone
        'America/Mexico_City'
    );

  seven_days_start =
    today_start -
    interval '6 days';

  thirty_days_start =
    today_start -
    interval '29 days';

  return query
  select
    count(*) filter (
      where
        created_at >=
        today_start
    )::bigint,
    count(*) filter (
      where
        created_at >=
        seven_days_start
    )::bigint,
    count(*) filter (
      where
        created_at >=
        thirty_days_start
    )::bigint,
    count(*)::bigint,
    count(
      distinct visitor_id
    ) filter (
      where
        created_at >=
        today_start
    )::bigint,
    count(
      distinct visitor_id
    ) filter (
      where
        created_at >=
        seven_days_start
    )::bigint,
    count(
      distinct visitor_id
    ) filter (
      where
        created_at >=
        thirty_days_start
    )::bigint,
    count(
      distinct visitor_id
    )::bigint
  from
    public.web_visit_sessions;
end;
$$;

revoke all
on function
  public.get_web_visit_stats()
from public;

grant execute
on function
  public.get_web_visit_stats()
to authenticated;

-- ------------------------------------------------------------
-- 5. Rate limit persistente para ai-web-chat.
-- Una fila por clave anónima hasheada + ventana.
-- ------------------------------------------------------------
create table if not exists
  public.ai_web_rate_limits (
    rate_key text primary key,
    window_started_at timestamptz not null,
    request_count integer not null
      default 0,
    updated_at timestamptz not null
      default now()
  );

alter table
  public.ai_web_rate_limits
enable row level security;

revoke all
on table
  public.ai_web_rate_limits
from
  anon,
  authenticated;

create or replace function
  public.check_ai_web_rate_limit(
    p_key text,
    p_limit integer default 20,
    p_window_seconds integer default 60
  )
returns boolean
language plpgsql
security definer
set search_path =
  public,
  pg_temp
as $$
declare
  current_row
    public.ai_web_rate_limits%rowtype;
  now_value timestamptz :=
    now();
  safe_limit integer :=
    greatest(
      1,
      least(
        coalesce(
          p_limit,
          20
        ),
        100
      )
    );
  safe_window integer :=
    greatest(
      10,
      least(
        coalesce(
          p_window_seconds,
          60
        ),
        3600
      )
    );
begin
  if
    p_key is null or
    length(
      trim(
        p_key
      )
    ) <
      16
  then
    return false;
  end if;

  insert into
    public.ai_web_rate_limits (
      rate_key,
      window_started_at,
      request_count,
      updated_at
    )
  values (
    p_key,
    now_value,
    1,
    now_value
  )
  on conflict (
    rate_key
  )
  do update
  set
    window_started_at =
      case
        when
          public.ai_web_rate_limits
            .window_started_at <=
          now_value -
            make_interval(
              secs =>
                safe_window
            )
        then
          now_value
        else
          public.ai_web_rate_limits
            .window_started_at
      end,
    request_count =
      case
        when
          public.ai_web_rate_limits
            .window_started_at <=
          now_value -
            make_interval(
              secs =>
                safe_window
            )
        then
          1
        else
          public.ai_web_rate_limits
            .request_count +
          1
      end,
    updated_at =
      now_value
  returning
    *
  into
    current_row;

  return
    current_row
      .request_count <=
    safe_limit;
end;
$$;

revoke all
on function
  public.check_ai_web_rate_limit(
    text,
    integer,
    integer
  )
from public;

-- Solo service_role debe invocarla desde la Edge Function.
-- No se otorga execute a anon/authenticated.


grant execute
on function
  public.check_ai_web_rate_limit(
    text,
    integer,
    integer
  )
to service_role;
