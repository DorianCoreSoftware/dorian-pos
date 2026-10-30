-- ============================================================
-- DORIAN POS
-- CENTRO DE NOTIFICACIONES - FASE 1
-- Alertas internas de inventario
-- ============================================================

create table if not exists public.pos_notifications (
  id uuid primary key default gen_random_uuid(),
  notification_key text not null unique,
  notification_type text not null,
  severity text not null default 'info',
  title text not null,
  message text not null,
  source_type text,
  source_id uuid,
  action_target text,
  metadata jsonb not null default '{}'::jsonb,
  is_active boolean not null default true,
  read_at timestamptz,
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint pos_notifications_type_not_blank
    check (btrim(notification_type) <> ''),
  constraint pos_notifications_severity_check
    check (
      severity in (
        'info',
        'warning',
        'critical'
      )
    ),
  constraint pos_notifications_title_not_blank
    check (btrim(title) <> ''),
  constraint pos_notifications_message_not_blank
    check (btrim(message) <> '')
);

create index if not exists pos_notifications_active_created_idx
on public.pos_notifications(
  is_active,
  created_at desc
);

create index if not exists pos_notifications_source_idx
on public.pos_notifications(
  source_type,
  source_id
);

alter table public.pos_notifications
  enable row level security;

drop policy if exists pos_notifications_authenticated_read
on public.pos_notifications;

create policy pos_notifications_authenticated_read
on public.pos_notifications
for select
to authenticated
using (true);

-- ------------------------------------------------------------
-- Admin helper
-- ------------------------------------------------------------

create or replace function public.require_notification_admin()
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
      and coalesce(p.is_active, true) = true
  ) then
    raise exception
      'Solo un administrador puede gestionar notificaciones.';
  end if;

  return v_user_id;
end;
$$;

-- ------------------------------------------------------------
-- Sincronización de alertas de un insumo
-- ------------------------------------------------------------

create or replace function public.sync_inventory_notification(
  p_inventory_item_id uuid
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_item public.inventory_items%rowtype;
  v_low_key text;
  v_negative_key text;
  v_unit_label text;
begin
  select *
  into v_item
  from public.inventory_items i
  where i.id = p_inventory_item_id;

  if v_item.id is null then
    return;
  end if;

  v_low_key :=
    'inventory:' ||
    v_item.id::text ||
    ':low';

  v_negative_key :=
    'inventory:' ||
    v_item.id::text ||
    ':negative';

  v_unit_label :=
    case v_item.base_unit
      when 'g' then 'g'
      when 'ml' then 'ml'
      else 'pza'
    end;

  -- Insumo inactivo: resolver cualquier alerta abierta.
  if not v_item.is_active then
    update public.pos_notifications
    set
      is_active = false,
      resolved_at = coalesce(
        resolved_at,
        now()
      ),
      updated_at = now()
    where notification_key in (
      v_low_key,
      v_negative_key
    )
      and is_active = true;

    return;
  end if;

  -- Stock negativo: alerta crítica y se resuelve la de stock bajo
  -- para no mostrar dos alertas por el mismo insumo.
  if v_item.current_stock < 0 then
    insert into public.pos_notifications(
      notification_key,
      notification_type,
      severity,
      title,
      message,
      source_type,
      source_id,
      action_target,
      metadata,
      is_active,
      read_at,
      resolved_at
    )
    values (
      v_negative_key,
      'inventory_negative_stock',
      'critical',
      'Stock negativo',
      v_item.name ||
        ' tiene ' ||
        trim(
          to_char(
            v_item.current_stock,
            'FM999999990.###'
          )
        ) ||
        ' ' ||
        v_unit_label ||
        ' en inventario.',
      'inventory_item',
      v_item.id,
      'inventory',
      jsonb_build_object(
        'inventoryItemId', v_item.id,
        'inventoryItemName', v_item.name,
        'currentStock', v_item.current_stock,
        'minimumStock', v_item.minimum_stock,
        'baseUnit', v_item.base_unit
      ),
      true,
      null,
      null
    )
    on conflict (notification_key)
    do update set
      notification_type = excluded.notification_type,
      severity = excluded.severity,
      title = excluded.title,
      message = excluded.message,
      source_type = excluded.source_type,
      source_id = excluded.source_id,
      action_target = excluded.action_target,
      metadata = excluded.metadata,
      is_active = true,
      read_at = case
        when public.pos_notifications.message <>
          excluded.message
        then null
        else public.pos_notifications.read_at
      end,
      resolved_at = null,
      updated_at = now();

    update public.pos_notifications
    set
      is_active = false,
      resolved_at = coalesce(
        resolved_at,
        now()
      ),
      updated_at = now()
    where notification_key = v_low_key
      and is_active = true;

    return;
  end if;

  -- Ya no está negativo.
  update public.pos_notifications
  set
    is_active = false,
    resolved_at = coalesce(
      resolved_at,
      now()
    ),
    updated_at = now()
  where notification_key = v_negative_key
    and is_active = true;

  -- Stock bajo solo aplica si el mínimo configurado es > 0.
  if
    v_item.minimum_stock > 0
    and
    v_item.current_stock <=
      v_item.minimum_stock
  then
    insert into public.pos_notifications(
      notification_key,
      notification_type,
      severity,
      title,
      message,
      source_type,
      source_id,
      action_target,
      metadata,
      is_active,
      read_at,
      resolved_at
    )
    values (
      v_low_key,
      'inventory_low_stock',
      'warning',
      'Stock bajo',
      v_item.name ||
        ' tiene ' ||
        trim(
          to_char(
            v_item.current_stock,
            'FM999999990.###'
          )
        ) ||
        ' ' ||
        v_unit_label ||
        '. Mínimo configurado: ' ||
        trim(
          to_char(
            v_item.minimum_stock,
            'FM999999990.###'
          )
        ) ||
        ' ' ||
        v_unit_label ||
        '.',
      'inventory_item',
      v_item.id,
      'inventory',
      jsonb_build_object(
        'inventoryItemId', v_item.id,
        'inventoryItemName', v_item.name,
        'currentStock', v_item.current_stock,
        'minimumStock', v_item.minimum_stock,
        'baseUnit', v_item.base_unit
      ),
      true,
      null,
      null
    )
    on conflict (notification_key)
    do update set
      notification_type = excluded.notification_type,
      severity = excluded.severity,
      title = excluded.title,
      message = excluded.message,
      source_type = excluded.source_type,
      source_id = excluded.source_id,
      action_target = excluded.action_target,
      metadata = excluded.metadata,
      is_active = true,
      read_at = case
        when public.pos_notifications.message <>
          excluded.message
        then null
        else public.pos_notifications.read_at
      end,
      resolved_at = null,
      updated_at = now();
  else
    update public.pos_notifications
    set
      is_active = false,
      resolved_at = coalesce(
        resolved_at,
        now()
      ),
      updated_at = now()
    where notification_key = v_low_key
      and is_active = true;
  end if;
end;
$$;

-- ------------------------------------------------------------
-- Trigger automático
-- ------------------------------------------------------------

create or replace function public.inventory_notification_trigger()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  perform public.sync_inventory_notification(
    new.id
  );

  return new;
end;
$$;

drop trigger if exists trg_inventory_notifications
on public.inventory_items;

create trigger trg_inventory_notifications
after insert or update of
  current_stock,
  minimum_stock,
  is_active,
  name,
  base_unit
on public.inventory_items
for each row
execute function public.inventory_notification_trigger();

-- ------------------------------------------------------------
-- Sembrar alertas de inventario actuales
-- ------------------------------------------------------------

do $$
declare
  v_id uuid;
begin
  for v_id in
    select i.id
    from public.inventory_items i
  loop
    perform public.sync_inventory_notification(
      v_id
    );
  end loop;
end;
$$;

-- ------------------------------------------------------------
-- RPCs de lectura y gestión
-- ------------------------------------------------------------

create or replace function public.get_pos_notifications_admin(
  p_active_only boolean default true,
  p_limit integer default 100
)
returns table(
  id uuid,
  notification_key text,
  notification_type text,
  severity text,
  title text,
  message text,
  source_type text,
  source_id uuid,
  action_target text,
  metadata jsonb,
  is_active boolean,
  read_at timestamptz,
  resolved_at timestamptz,
  created_at timestamptz,
  updated_at timestamptz
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  perform public.require_notification_admin();

  return query
  select
    n.id,
    n.notification_key,
    n.notification_type,
    n.severity,
    n.title,
    n.message,
    n.source_type,
    n.source_id,
    n.action_target,
    n.metadata,
    n.is_active,
    n.read_at,
    n.resolved_at,
    n.created_at,
    n.updated_at
  from public.pos_notifications n
  where
    not p_active_only
    or n.is_active = true
  order by
    case n.severity
      when 'critical' then 0
      when 'warning' then 1
      else 2
    end,
    n.read_at nulls first,
    n.updated_at desc
  limit greatest(
    1,
    least(
      coalesce(p_limit, 100),
      500
    )
  );
end;
$$;

create or replace function public.mark_pos_notification_read_admin(
  p_notification_id uuid
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  perform public.require_notification_admin();

  update public.pos_notifications
  set
    read_at = coalesce(
      read_at,
      now()
    ),
    updated_at = now()
  where id = p_notification_id;
end;
$$;

create or replace function public.mark_all_pos_notifications_read_admin()
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  perform public.require_notification_admin();

  update public.pos_notifications
  set
    read_at = now(),
    updated_at = now()
  where is_active = true
    and read_at is null;
end;
$$;

revoke all
on function public.get_pos_notifications_admin(
  boolean,
  integer
)
from public;

revoke all
on function public.mark_pos_notification_read_admin(uuid)
from public;

revoke all
on function public.mark_all_pos_notifications_read_admin()
from public;

grant execute
on function public.get_pos_notifications_admin(
  boolean,
  integer
)
to authenticated;

grant execute
on function public.mark_pos_notification_read_admin(uuid)
to authenticated;

grant execute
on function public.mark_all_pos_notifications_read_admin()
to authenticated;
