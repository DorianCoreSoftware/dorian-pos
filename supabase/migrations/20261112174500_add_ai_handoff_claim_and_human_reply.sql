-- ============================================================
-- DORIAN AI ORDERS - FASE 5 BLOQUE 2
-- Claim/take conversation + respuestas humanas auditadas
-- ============================================================

-- ------------------------------------------------------------
-- Reclamar una conversación de forma atómica.
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

  update public.ai_order_conversations
  set
    human_assignee_id = v_user_id,
    human_taken_at = coalesce(human_taken_at, now()),
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

  return jsonb_build_object(
    'claimed', true,
    'alreadyClaimed', false,
    'assigneeId', v_user_id,
    'assigneeName', v_assignee_name,
    'takenAt', coalesce(v_conversation.human_taken_at, now())
  );
end;
$$;

revoke all
on function public.claim_ai_handoff_conversation(uuid)
from public, anon;

grant execute
on function public.claim_ai_handoff_conversation(uuid)
to authenticated;

-- ------------------------------------------------------------
-- Respuesta humana auditada.
-- Solo el admin que tomó la conversación puede escribir.
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

revoke all
on function public.send_ai_handoff_human_message(uuid, text)
from public, anon;

grant execute
on function public.send_ai_handoff_human_message(uuid, text)
to authenticated;

comment on function public.claim_ai_handoff_conversation(uuid) is
  'Asigna atómicamente un handoff DORIAN AI a un administrador para evitar doble atención.';

comment on function public.send_ai_handoff_human_message(uuid, text) is
  'Guarda una respuesta humana auditada en ai_order_messages. Solo puede escribir el admin asignado.';
