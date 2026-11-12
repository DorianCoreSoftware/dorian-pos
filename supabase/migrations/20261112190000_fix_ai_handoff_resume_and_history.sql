-- ============================================================
-- DORIAN AI ORDERS - FASE 5 BLOQUE 3 HOTFIX
-- Re-handoff correcto + historial administrativo
-- ============================================================

-- ------------------------------------------------------------
-- Historial de handoffs resueltos/cerrados.
-- ------------------------------------------------------------
create or replace function public.get_ai_handoff_history()
returns table(
  conversation_id uuid,
  channel text,
  customer_name text,
  customer_phone text,
  handoff_reason text,
  handoff_at timestamptz,
  last_message_at timestamptz,
  assignee_id uuid,
  taken_at timestamptz,
  last_user_message text,
  last_assistant_message text,
  draft_status text,
  order_id uuid,
  tracking_code text,
  estimated_total numeric,
  resolved_at timestamptz,
  resolution_type text
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_current_user_admin() then
    raise exception 'FORBIDDEN';
  end if;

  return query
  select
    c.id as conversation_id,
    c.channel,
    c.customer_name,
    c.customer_phone,
    c.human_handoff_reason as handoff_reason,
    c.human_handoff_at as handoff_at,
    c.last_message_at,
    c.human_assignee_id as assignee_id,
    c.human_taken_at as taken_at,

    (
      select m.content
      from public.ai_order_messages m
      where m.conversation_id = c.id
        and m.role = 'user'
        and nullif(trim(coalesce(m.content, '')), '') is not null
      order by m.created_at desc
      limit 1
    ) as last_user_message,

    (
      select m.content
      from public.ai_order_messages m
      where m.conversation_id = c.id
        and m.role = 'assistant'
        and nullif(trim(coalesce(m.content, '')), '') is not null
      order by m.created_at desc
      limit 1
    ) as last_assistant_message,

    d.status as draft_status,
    d.order_id,
    case
      when d.order_id is null then null
      else upper(left(replace(d.order_id::text, '-', ''), 8))
    end as tracking_code,
    d.estimated_total,
    c.human_resolved_at as resolved_at,
    c.human_resolution_type as resolution_type
  from public.ai_order_conversations c
  left join public.ai_order_drafts d
    on d.conversation_id = c.id
  where
    c.human_resolved_at is not null
    and c.human_resolution_type is not null
  order by
    c.human_resolved_at desc;
end;
$$;

revoke all
on function public.get_ai_handoff_history()
from public, anon;

grant execute
on function public.get_ai_handoff_history()
to authenticated;

-- ------------------------------------------------------------
-- Detalle: ahora también puede abrir conversaciones históricas.
-- Antes solo aceptaba handoff_requested=true.
-- ------------------------------------------------------------
create or replace function public.get_ai_handoff_conversation(
  p_conversation_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_conversation jsonb;
  v_messages jsonb;
  v_draft jsonb;
begin
  if not public.is_current_user_admin() then
    raise exception 'FORBIDDEN';
  end if;

  select jsonb_build_object(
    'id', c.id,
    'channel', c.channel,
    'status', c.status,
    'customerName', c.customer_name,
    'customerPhone', c.customer_phone,
    'handoffReason', c.human_handoff_reason,
    'handoffAt', c.human_handoff_at,
    'assigneeId', c.human_assignee_id,
    'takenAt', c.human_taken_at,
    'resolvedAt', c.human_resolved_at,
    'resolutionType', c.human_resolution_type,
    'lastMessageAt', c.last_message_at,
    'metadata', c.metadata
  )
  into v_conversation
  from public.ai_order_conversations c
  where c.id = p_conversation_id
    and (
      c.human_handoff_at is not null
      or c.human_handoff_requested = true
      or c.human_resolved_at is not null
    );

  if v_conversation is null then
    return null;
  end if;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', m.id,
        'role', m.role,
        'content', m.content,
        'toolName', m.tool_name,
        'createdAt', m.created_at,
        'metadata', m.metadata
      )
      order by m.created_at asc
    ),
    '[]'::jsonb
  )
  into v_messages
  from public.ai_order_messages m
  where m.conversation_id = p_conversation_id
    and m.role in ('user', 'assistant');

  select
    case
      when d.id is null then null
      else jsonb_build_object(
        'id', d.id,
        'status', d.status,
        'customerName', d.customer_name,
        'customerPhone', d.customer_phone,
        'fulfillmentType', d.fulfillment_type,
        'delivery', d.delivery,
        'items', d.items,
        'estimatedTotal', d.estimated_total,
        'orderId', d.order_id,
        'trackingCode',
          case
            when d.order_id is null then null
            else upper(left(replace(d.order_id::text, '-', ''), 8))
          end
      )
    end
  into v_draft
  from public.ai_order_drafts d
  where d.conversation_id = p_conversation_id
  limit 1;

  return jsonb_build_object(
    'conversation', v_conversation,
    'messages', v_messages,
    'draft', v_draft
  );
end;
$$;

revoke all
on function public.get_ai_handoff_conversation(uuid)
from public, anon;

grant execute
on function public.get_ai_handoff_conversation(uuid)
to authenticated;

comment on function public.get_ai_handoff_history() is
  'Historial administrativo de handoffs DORIAN AI ya resueltos o devueltos a IA.';
