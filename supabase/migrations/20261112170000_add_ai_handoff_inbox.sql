-- ============================================================
-- DORIAN AI ORDERS - FASE 5 BLOQUE 1
-- Inbox operativo para handoff humano
-- ============================================================

alter table public.ai_order_conversations
add column if not exists human_handoff_at timestamptz;

alter table public.ai_order_conversations
add column if not exists human_assignee_id uuid
references public.profiles(id)
on delete set null;

alter table public.ai_order_conversations
add column if not exists human_taken_at timestamptz;

alter table public.ai_order_conversations
add column if not exists human_resolved_at timestamptz;

create index if not exists ai_order_conversations_handoff_queue_idx
on public.ai_order_conversations(
  status,
  human_handoff_requested,
  human_handoff_at,
  last_message_at desc
)
where human_handoff_requested = true;

-- Backfill para conversaciones previas ya esperando humano.
update public.ai_order_conversations
set human_handoff_at =
  coalesce(
    human_handoff_at,
    updated_at,
    last_message_at,
    created_at,
    now()
  )
where
  status = 'awaiting_human'
  and human_handoff_requested = true
  and human_handoff_at is null;

-- ------------------------------------------------------------
-- Helper: verificar admin.
-- ------------------------------------------------------------
create or replace function public.is_current_user_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists(
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'admin'::public.user_role
  );
$$;

revoke all
on function public.is_current_user_admin()
from public, anon;

grant execute
on function public.is_current_user_admin()
to authenticated;

-- ------------------------------------------------------------
-- Inbox resumido.
-- ------------------------------------------------------------
create or replace function public.get_ai_handoff_inbox()
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
  estimated_total numeric
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
    d.estimated_total
  from public.ai_order_conversations c
  left join public.ai_order_drafts d
    on d.conversation_id = c.id
  where
    c.status = 'awaiting_human'
    and c.human_handoff_requested = true
    and c.human_resolved_at is null
  order by
    case when c.human_assignee_id is null then 0 else 1 end,
    c.human_handoff_at asc nulls first,
    c.last_message_at desc;
end;
$$;

revoke all
on function public.get_ai_handoff_inbox()
from public, anon;

grant execute
on function public.get_ai_handoff_inbox()
to authenticated;

-- ------------------------------------------------------------
-- Detalle de una conversación de handoff.
-- Devuelve JSON para mantener la UI simple.
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
    'lastMessageAt', c.last_message_at,
    'metadata', c.metadata
  )
  into v_conversation
  from public.ai_order_conversations c
  where c.id = p_conversation_id
    and c.human_handoff_requested = true;

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

comment on function public.get_ai_handoff_inbox() is
  'Bandeja administrativa de conversaciones DORIAN AI que esperan atención humana.';

comment on function public.get_ai_handoff_conversation(uuid) is
  'Detalle de mensajes y borrador para una conversación DORIAN AI en handoff.';
