-- ============================================================
-- DORIAN AI ORDERS - FASE 5 BLOQUE 3
-- Resolver/cerrar handoff + devolver control a DORIAN
-- ============================================================

alter table public.ai_order_conversations
add column if not exists human_resolved_by_id uuid
references public.profiles(id)
on delete set null;

alter table public.ai_order_conversations
add column if not exists human_resolution_type text;

alter table public.ai_order_conversations
drop constraint if exists ai_order_conversations_human_resolution_type_check;

alter table public.ai_order_conversations
add constraint ai_order_conversations_human_resolution_type_check
check (
  human_resolution_type is null
  or human_resolution_type in (
    'returned_to_ai',
    'resolved_closed'
  )
);

-- ------------------------------------------------------------
-- Auditoría de lifecycle de handoffs.
-- ------------------------------------------------------------
create table if not exists public.ai_order_handoff_events (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null
    references public.ai_order_conversations(id)
    on delete cascade,
  event_type text not null,
  actor_user_id uuid
    references public.profiles(id)
    on delete set null,
  note text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint ai_order_handoff_events_type_check
    check (
      event_type in (
        'requested',
        'claimed',
        'human_message',
        'returned_to_ai',
        'resolved_closed'
      )
    )
);

create index if not exists ai_order_handoff_events_conversation_idx
on public.ai_order_handoff_events(
  conversation_id,
  created_at
);

alter table public.ai_order_handoff_events
enable row level security;

drop policy if exists "Admins read ai_order_handoff_events"
on public.ai_order_handoff_events;

create policy "Admins read ai_order_handoff_events"
on public.ai_order_handoff_events
for select
to authenticated
using (
  public.is_current_user_admin()
);

-- ------------------------------------------------------------
-- Claim actualizado: agrega evento de auditoría.
-- ------------------------------------------------------------
create or replace function public.claim_ai_handoff_conversation(
  p_conversation_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_conversation public.ai_order_conversations%rowtype;
  v_assignee_name text;
  v_taken_at timestamptz;
begin
  if v_user_id is null then
    raise exception 'UNAUTHORIZED';
  end if;

  if not public.is_current_user_admin() then
    raise exception 'FORBIDDEN';
  end if;

  select *
  into v_conversation
  from public.ai_order_conversations
  where id = p_conversation_id
  for update;

  if not found then
    return jsonb_build_object(
      'claimed', false,
      'reason', 'Conversación no encontrada.'
    );
  end if;

  if
    v_conversation.status <> 'awaiting_human'
    or v_conversation.human_handoff_requested <> true
    or v_conversation.human_resolved_at is not null
  then
    return jsonb_build_object(
      'claimed', false,
      'reason', 'La conversación ya no está esperando atención humana.'
    );
  end if;

  if
    v_conversation.human_assignee_id is not null
    and v_conversation.human_assignee_id <> v_user_id
  then
    select nullif(
      trim(
        concat_ws(
          ' ',
          p.first_name,
          p.last_name
        )
      ),
      ''
    )
    into v_assignee_name
    from public.profiles p
    where p.id = v_conversation.human_assignee_id;

    return jsonb_build_object(
      'claimed', false,
      'alreadyClaimed', true,
      'assigneeId', v_conversation.human_assignee_id,
      'assigneeName', v_assignee_name,
      'reason', 'Otro administrador ya está atendiendo esta conversación.'
    );
  end if;

  v_taken_at :=
    coalesce(
      v_conversation.human_taken_at,
      now()
    );

  update public.ai_order_conversations
  set
    human_assignee_id = v_user_id,
    human_taken_at = v_taken_at,
    updated_at = now()
  where id = p_conversation_id;

  select nullif(
    trim(
      concat_ws(
        ' ',
        p.first_name,
        p.last_name
      )
    ),
    ''
  )
  into v_assignee_name
  from public.profiles p
  where p.id = v_user_id;

  if v_conversation.human_assignee_id is null then
    insert into public.ai_order_handoff_events(
      conversation_id,
      event_type,
      actor_user_id,
      metadata
    )
    values(
      p_conversation_id,
      'claimed',
      v_user_id,
      jsonb_build_object(
        'assigneeName',
        v_assignee_name
      )
    );
  end if;

  return jsonb_build_object(
    'claimed', true,
    'alreadyClaimed', false,
    'assigneeId', v_user_id,
    'assigneeName', v_assignee_name,
    'takenAt', v_taken_at
  );
end;
$$;

-- ------------------------------------------------------------
-- Respuesta humana actualizada: agrega evento de auditoría.
-- ------------------------------------------------------------
create or replace function public.send_ai_handoff_human_message(
  p_conversation_id uuid,
  p_content text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_content text;
  v_conversation public.ai_order_conversations%rowtype;
  v_message_id uuid;
  v_human_name text;
begin
  if v_user_id is null then
    raise exception 'UNAUTHORIZED';
  end if;

  if not public.is_current_user_admin() then
    raise exception 'FORBIDDEN';
  end if;

  v_content := left(
    trim(
      coalesce(
        p_content,
        ''
      )
    ),
    3000
  );

  if v_content = '' then
    return jsonb_build_object(
      'sent', false,
      'reason', 'El mensaje no puede estar vacío.'
    );
  end if;

  select *
  into v_conversation
  from public.ai_order_conversations
  where id = p_conversation_id
  for update;

  if not found then
    return jsonb_build_object(
      'sent', false,
      'reason', 'Conversación no encontrada.'
    );
  end if;

  if
    v_conversation.status <> 'awaiting_human'
    or v_conversation.human_handoff_requested <> true
    or v_conversation.human_resolved_at is not null
  then
    return jsonb_build_object(
      'sent', false,
      'reason', 'La conversación ya no está disponible para atención humana.'
    );
  end if;

  if v_conversation.human_assignee_id is null then
    return jsonb_build_object(
      'sent', false,
      'reason', 'Primero debes tomar la conversación.'
    );
  end if;

  if v_conversation.human_assignee_id <> v_user_id then
    return jsonb_build_object(
      'sent', false,
      'reason', 'Otro administrador está atendiendo esta conversación.'
    );
  end if;

  select nullif(
    trim(
      concat_ws(
        ' ',
        p.first_name,
        p.last_name
      )
    ),
    ''
  )
  into v_human_name
  from public.profiles p
  where p.id = v_user_id;

  insert into public.ai_order_messages(
    conversation_id,
    role,
    content,
    metadata
  )
  values(
    p_conversation_id,
    'assistant',
    v_content,
    jsonb_build_object(
      'source', 'human',
      'human', true,
      'human_user_id', v_user_id,
      'human_name', v_human_name
    )
  )
  returning id
  into v_message_id;

  insert into public.ai_order_handoff_events(
    conversation_id,
    event_type,
    actor_user_id,
    note,
    metadata
  )
  values(
    p_conversation_id,
    'human_message',
    v_user_id,
    v_content,
    jsonb_build_object(
      'messageId',
      v_message_id,
      'humanName',
      v_human_name
    )
  );

  update public.ai_order_conversations
  set
    last_message_at = now(),
    updated_at = now()
  where id = p_conversation_id;

  return jsonb_build_object(
    'sent', true,
    'messageId', v_message_id,
    'humanUserId', v_user_id,
    'humanName', v_human_name,
    'createdAt', now()
  );
end;
$$;

-- ------------------------------------------------------------
-- Devolver control a DORIAN.
-- Solo el admin asignado puede hacerlo.
-- ------------------------------------------------------------
create or replace function public.return_ai_handoff_to_dorian(
  p_conversation_id uuid,
  p_note text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_conversation public.ai_order_conversations%rowtype;
  v_note text;
  v_now timestamptz := now();
begin
  if v_user_id is null then
    raise exception 'UNAUTHORIZED';
  end if;

  if not public.is_current_user_admin() then
    raise exception 'FORBIDDEN';
  end if;

  v_note :=
    nullif(
      left(
        trim(
          coalesce(
            p_note,
            ''
          )
        ),
        500
      ),
      ''
    );

  select *
  into v_conversation
  from public.ai_order_conversations
  where id = p_conversation_id
  for update;

  if not found then
    return jsonb_build_object(
      'resumed', false,
      'reason', 'Conversación no encontrada.'
    );
  end if;

  if
    v_conversation.status <> 'awaiting_human'
    or v_conversation.human_handoff_requested <> true
    or v_conversation.human_resolved_at is not null
  then
    return jsonb_build_object(
      'resumed', false,
      'reason', 'La conversación ya no está en atención humana.'
    );
  end if;

  if v_conversation.human_assignee_id is null then
    return jsonb_build_object(
      'resumed', false,
      'reason', 'Primero debes tomar la conversación.'
    );
  end if;

  if v_conversation.human_assignee_id <> v_user_id then
    return jsonb_build_object(
      'resumed', false,
      'reason', 'Solo el administrador asignado puede devolver la conversación a DORIAN.'
    );
  end if;

  insert into public.ai_order_handoff_events(
    conversation_id,
    event_type,
    actor_user_id,
    note,
    metadata
  )
  values(
    p_conversation_id,
    'returned_to_ai',
    v_user_id,
    v_note,
    jsonb_build_object(
      'previousReason',
      v_conversation.human_handoff_reason
    )
  );

  update public.ai_order_conversations
  set
    status = 'active',
    human_handoff_requested = false,
    human_handoff_reason = null,
    human_resolved_at = v_now,
    human_resolved_by_id = v_user_id,
    human_resolution_type = 'returned_to_ai',
    human_assignee_id = null,
    human_taken_at = null,
    last_message_at = v_now,
    metadata =
      coalesce(metadata, '{}'::jsonb) ||
      jsonb_build_object(
        'lastHandoffResolution',
        jsonb_build_object(
          'type',
          'returned_to_ai',
          'resolvedAt',
          v_now,
          'resolvedBy',
          v_user_id,
          'note',
          v_note
        )
      ),
    updated_at = v_now
  where id = p_conversation_id;

  return jsonb_build_object(
    'resumed', true,
    'status', 'active',
    'resolvedAt', v_now,
    'reason', 'La conversación volvió a DORIAN.'
  );
end;
$$;

-- ------------------------------------------------------------
-- Resolver/cerrar caso humano.
-- Si existe una orden real -> completed.
-- Si no existe orden -> abandoned.
-- ------------------------------------------------------------
create or replace function public.resolve_ai_handoff_conversation(
  p_conversation_id uuid,
  p_note text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_conversation public.ai_order_conversations%rowtype;
  v_order_id uuid;
  v_next_status text;
  v_note text;
  v_now timestamptz := now();
begin
  if v_user_id is null then
    raise exception 'UNAUTHORIZED';
  end if;

  if not public.is_current_user_admin() then
    raise exception 'FORBIDDEN';
  end if;

  v_note :=
    nullif(
      left(
        trim(
          coalesce(
            p_note,
            ''
          )
        ),
        500
      ),
      ''
    );

  select *
  into v_conversation
  from public.ai_order_conversations
  where id = p_conversation_id
  for update;

  if not found then
    return jsonb_build_object(
      'resolved', false,
      'reason', 'Conversación no encontrada.'
    );
  end if;

  if
    v_conversation.status <> 'awaiting_human'
    or v_conversation.human_handoff_requested <> true
    or v_conversation.human_resolved_at is not null
  then
    return jsonb_build_object(
      'resolved', false,
      'reason', 'La conversación ya no está en atención humana.'
    );
  end if;

  if v_conversation.human_assignee_id is null then
    return jsonb_build_object(
      'resolved', false,
      'reason', 'Primero debes tomar la conversación.'
    );
  end if;

  if v_conversation.human_assignee_id <> v_user_id then
    return jsonb_build_object(
      'resolved', false,
      'reason', 'Solo el administrador asignado puede resolver este caso.'
    );
  end if;

  select d.order_id
  into v_order_id
  from public.ai_order_drafts d
  where d.conversation_id = p_conversation_id
  limit 1;

  v_next_status :=
    case
      when v_order_id is not null
        then 'completed'
      else 'abandoned'
    end;

  insert into public.ai_order_handoff_events(
    conversation_id,
    event_type,
    actor_user_id,
    note,
    metadata
  )
  values(
    p_conversation_id,
    'resolved_closed',
    v_user_id,
    v_note,
    jsonb_build_object(
      'nextStatus',
      v_next_status,
      'orderId',
      v_order_id
    )
  );

  update public.ai_order_conversations
  set
    status = v_next_status,
    human_handoff_requested = false,
    human_resolved_at = v_now,
    human_resolved_by_id = v_user_id,
    human_resolution_type = 'resolved_closed',
    metadata =
      coalesce(metadata, '{}'::jsonb) ||
      jsonb_build_object(
        'lastHandoffResolution',
        jsonb_build_object(
          'type',
          'resolved_closed',
          'resolvedAt',
          v_now,
          'resolvedBy',
          v_user_id,
          'note',
          v_note,
          'nextStatus',
          v_next_status
        )
      ),
    updated_at = v_now
  where id = p_conversation_id;

  return jsonb_build_object(
    'resolved', true,
    'status', v_next_status,
    'resolvedAt', v_now,
    'hasOrder', v_order_id is not null,
    'reason',
      case
        when v_order_id is not null
          then 'Caso humano resuelto. La conversación vuelve a modo post-pedido.'
        else 'Caso humano resuelto y conversación cerrada.'
      end
  );
end;
$$;

revoke all
on function public.return_ai_handoff_to_dorian(uuid, text)
from public, anon;

revoke all
on function public.resolve_ai_handoff_conversation(uuid, text)
from public, anon;

grant execute
on function public.return_ai_handoff_to_dorian(uuid, text)
to authenticated;

grant execute
on function public.resolve_ai_handoff_conversation(uuid, text)
to authenticated;

comment on function public.return_ai_handoff_to_dorian(uuid, text) is
  'Devuelve una conversación awaiting_human a DORIAN AI. Solo puede hacerlo el admin asignado.';

comment on function public.resolve_ai_handoff_conversation(uuid, text) is
  'Resuelve un handoff sin devolverlo a IA: completed si ya existe orden; abandoned si no existe orden.';
