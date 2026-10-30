-- ============================================================
-- DORIAN POS
-- MARKETING - FASE 1
-- Centro de campañas + audiencias CRM
-- ============================================================

create table if not exists public.marketing_campaigns (
  id uuid primary key default gen_random_uuid(),

  name text not null,
  description text,

  audience_id uuid
    references public.crm_audiences(id)
    on delete set null,

  objective text not null default 'retention'
    check (
      objective in (
        'acquisition',
        'retention',
        'reactivation',
        'loyalty',
        'sales',
        'event',
        'announcement'
      )
    ),

  channel text not null default 'whatsapp'
    check (
      channel in (
        'whatsapp',
        'sms',
        'email',
        'push',
        'social',
        'in_store',
        'other'
      )
    ),

  action_type text not null default 'custom'
    check (
      action_type in (
        'promotion',
        'reward',
        'web_banner',
        'custom'
      )
    ),

  message_title text,
  message_body text,

  starts_at timestamptz,
  ends_at timestamptz,

  status text not null default 'draft'
    check (
      status in (
        'draft',
        'scheduled',
        'active',
        'completed',
        'cancelled'
      )
    ),

  audience_size_snapshot integer
    check (
      audience_size_snapshot is null
      or audience_size_snapshot >= 0
    ),

  activated_at timestamptz,
  completed_at timestamptz,
  cancelled_at timestamptz,

  created_by uuid
    references public.profiles(id)
    on delete set null,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint marketing_campaigns_name_not_blank
    check (
      btrim(name) <> ''
    ),

  constraint marketing_campaigns_date_order
    check (
      ends_at is null
      or starts_at is null
      or ends_at > starts_at
    )
);

create index if not exists marketing_campaigns_status_idx
on public.marketing_campaigns(
  status,
  starts_at,
  updated_at desc
);

create index if not exists marketing_campaigns_audience_idx
on public.marketing_campaigns(
  audience_id
)
where audience_id is not null;

alter table public.marketing_campaigns
  enable row level security;

drop policy if exists marketing_campaigns_authenticated_read
on public.marketing_campaigns;

create policy marketing_campaigns_authenticated_read
on public.marketing_campaigns
for select
to authenticated
using (true);

-- ------------------------------------------------------------
-- Admin helper
-- ------------------------------------------------------------

create or replace function public.require_marketing_admin()
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid;
begin
  v_user_id := auth.uid();

  if v_user_id is null then
    raise exception
      'Sesión no válida.';
  end if;

  if not exists (
    select 1
    from public.profiles p
    where p.id = v_user_id
      and p.role = 'admin'::public.user_role
      and coalesce(
        p.is_active,
        true
      ) = true
  ) then
    raise exception
      'Solo un administrador puede gestionar Marketing.';
  end if;

  return v_user_id;
end;
$$;

-- ------------------------------------------------------------
-- Guardar campaña
-- ------------------------------------------------------------

create or replace function public.save_marketing_campaign_admin(
  p_campaign_id uuid,
  p_name text,
  p_description text,
  p_audience_id uuid,
  p_objective text,
  p_channel text,
  p_action_type text,
  p_message_title text,
  p_message_body text,
  p_starts_at timestamptz,
  p_ends_at timestamptz
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid;
  v_id uuid;
  v_status text;
begin
  v_user_id :=
    public.require_marketing_admin();

  if btrim(
    coalesce(
      p_name,
      ''
    )
  ) = '' then
    raise exception
      'El nombre de la campaña es obligatorio.';
  end if;

  if p_objective not in (
    'acquisition',
    'retention',
    'reactivation',
    'loyalty',
    'sales',
    'event',
    'announcement'
  ) then
    raise exception
      'El objetivo de campaña no es válido.';
  end if;

  if p_channel not in (
    'whatsapp',
    'sms',
    'email',
    'push',
    'social',
    'in_store',
    'other'
  ) then
    raise exception
      'El canal de campaña no es válido.';
  end if;

  if p_action_type not in (
    'promotion',
    'reward',
    'web_banner',
    'custom'
  ) then
    raise exception
      'El tipo de acción no es válido.';
  end if;

  if p_ends_at is not null
     and p_starts_at is not null
     and p_ends_at <= p_starts_at then
    raise exception
      'La fecha final debe ser posterior a la inicial.';
  end if;

  if p_audience_id is not null
     and not exists (
       select 1
       from public.crm_audiences a
       where a.id = p_audience_id
     ) then
    raise exception
      'La audiencia seleccionada no existe.';
  end if;

  if p_campaign_id is null then
    insert into public.marketing_campaigns(
      name,
      description,
      audience_id,
      objective,
      channel,
      action_type,
      message_title,
      message_body,
      starts_at,
      ends_at,
      status,
      created_by
    )
    values (
      btrim(p_name),
      nullif(
        btrim(
          coalesce(
            p_description,
            ''
          )
        ),
        ''
      ),
      p_audience_id,
      p_objective,
      p_channel,
      p_action_type,
      nullif(
        btrim(
          coalesce(
            p_message_title,
            ''
          )
        ),
        ''
      ),
      nullif(
        btrim(
          coalesce(
            p_message_body,
            ''
          )
        ),
        ''
      ),
      p_starts_at,
      p_ends_at,
      case
        when p_starts_at is not null
             and p_starts_at > now()
        then 'scheduled'
        else 'draft'
      end,
      v_user_id
    )
    returning id
    into v_id;
  else
    select c.status
    into v_status
    from public.marketing_campaigns c
    where c.id =
      p_campaign_id
    for update;

    if not found then
      raise exception
        'Campaña no encontrada.';
    end if;

    if v_status in (
      'completed',
      'cancelled'
    ) then
      raise exception
        'Una campaña cerrada no puede editarse.';
    end if;

    update public.marketing_campaigns
    set
      name =
        btrim(p_name),
      description =
        nullif(
          btrim(
            coalesce(
              p_description,
              ''
            )
          ),
          ''
        ),
      audience_id =
        p_audience_id,
      objective =
        p_objective,
      channel =
        p_channel,
      action_type =
        p_action_type,
      message_title =
        nullif(
          btrim(
            coalesce(
              p_message_title,
              ''
            )
          ),
          ''
        ),
      message_body =
        nullif(
          btrim(
            coalesce(
              p_message_body,
              ''
            )
          ),
          ''
        ),
      starts_at =
        p_starts_at,
      ends_at =
        p_ends_at,
      status =
        case
          when v_status =
            'active'
          then 'active'
          when p_starts_at is not null
               and p_starts_at > now()
          then 'scheduled'
          else 'draft'
        end,
      updated_at =
        now()
    where id =
      p_campaign_id
    returning id
    into v_id;
  end if;

  return v_id;
end;
$$;

-- ------------------------------------------------------------
-- Activar
-- ------------------------------------------------------------

create or replace function public.activate_marketing_campaign_admin(
  p_campaign_id uuid
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_campaign public.marketing_campaigns%rowtype;
  v_audience_size integer := 0;
begin
  perform public.require_marketing_admin();

  select *
  into v_campaign
  from public.marketing_campaigns c
  where c.id =
    p_campaign_id
  for update;

  if not found then
    raise exception
      'Campaña no encontrada.';
  end if;

  if v_campaign.status in (
    'completed',
    'cancelled'
  ) then
    raise exception
      'La campaña ya está cerrada.';
  end if;

  if v_campaign.audience_id
    is not null
  then
    select count(*)::integer
    into v_audience_size
    from public.get_crm_audience_members_admin(
      v_campaign.audience_id,
      500
    );
  end if;

  update public.marketing_campaigns
  set
    status =
      'active',
    audience_size_snapshot =
      v_audience_size,
    activated_at =
      coalesce(
        activated_at,
        now()
      ),
    starts_at =
      coalesce(
        starts_at,
        now()
      ),
    updated_at =
      now()
  where id =
    p_campaign_id;
end;
$$;

-- ------------------------------------------------------------
-- Completar / cancelar
-- ------------------------------------------------------------

create or replace function public.close_marketing_campaign_admin(
  p_campaign_id uuid,
  p_action text
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_status text;
begin
  perform public.require_marketing_admin();

  if p_action not in (
    'completed',
    'cancelled'
  ) then
    raise exception
      'La acción no es válida.';
  end if;

  select c.status
  into v_status
  from public.marketing_campaigns c
  where c.id =
    p_campaign_id
  for update;

  if not found then
    raise exception
      'Campaña no encontrada.';
  end if;

  if v_status in (
    'completed',
    'cancelled'
  ) then
    raise exception
      'La campaña ya está cerrada.';
  end if;

  update public.marketing_campaigns
  set
    status =
      p_action,
    completed_at =
      case
        when p_action =
          'completed'
        then now()
        else completed_at
      end,
    cancelled_at =
      case
        when p_action =
          'cancelled'
        then now()
        else cancelled_at
      end,
    updated_at =
      now()
  where id =
    p_campaign_id;
end;
$$;

-- ------------------------------------------------------------
-- Listado
-- ------------------------------------------------------------

create or replace function public.get_marketing_campaigns_admin(
  p_status text default null,
  p_limit integer default 200
)
returns table(
  id uuid,
  name text,
  description text,
  audience_id uuid,
  audience_name text,
  current_audience_size bigint,
  audience_size_snapshot integer,
  objective text,
  channel text,
  action_type text,
  message_title text,
  message_body text,
  starts_at timestamptz,
  ends_at timestamptz,
  status text,
  activated_at timestamptz,
  completed_at timestamptz,
  cancelled_at timestamptz,
  created_at timestamptz,
  updated_at timestamptz
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  perform public.require_marketing_admin();

  return query
  select
    c.id,
    c.name,
    c.description,
    c.audience_id,
    a.name,
    case
      when c.audience_id is null
      then 0::bigint
      else (
        select count(*)::bigint
        from public.get_crm_audience_members_admin(
          c.audience_id,
          500
        )
      )
    end,
    c.audience_size_snapshot,
    c.objective,
    c.channel,
    c.action_type,
    c.message_title,
    c.message_body,
    c.starts_at,
    c.ends_at,
    c.status,
    c.activated_at,
    c.completed_at,
    c.cancelled_at,
    c.created_at,
    c.updated_at
  from public.marketing_campaigns c
  left join public.crm_audiences a
    on a.id =
      c.audience_id
  where
    p_status is null
    or c.status =
      p_status
  order by
    case c.status
      when 'active' then 1
      when 'scheduled' then 2
      when 'draft' then 3
      when 'completed' then 4
      when 'cancelled' then 5
      else 6
    end,
    coalesce(
      c.starts_at,
      c.created_at
    ) desc,
    c.updated_at desc
  limit greatest(
    1,
    least(
      coalesce(
        p_limit,
        200
      ),
      500
    )
  );
end;
$$;

revoke all
on function public.save_marketing_campaign_admin(
  uuid,
  text,
  text,
  uuid,
  text,
  text,
  text,
  text,
  text,
  timestamptz,
  timestamptz
)
from public;

revoke all
on function public.activate_marketing_campaign_admin(uuid)
from public;

revoke all
on function public.close_marketing_campaign_admin(
  uuid,
  text
)
from public;

revoke all
on function public.get_marketing_campaigns_admin(
  text,
  integer
)
from public;

grant execute
on function public.save_marketing_campaign_admin(
  uuid,
  text,
  text,
  uuid,
  text,
  text,
  text,
  text,
  text,
  timestamptz,
  timestamptz
)
to authenticated;

grant execute
on function public.activate_marketing_campaign_admin(uuid)
to authenticated;

grant execute
on function public.close_marketing_campaign_admin(
  uuid,
  text
)
to authenticated;

grant execute
on function public.get_marketing_campaigns_admin(
  text,
  integer
)
to authenticated;
