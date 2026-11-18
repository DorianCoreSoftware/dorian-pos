-- ============================================================
-- DORIAN AI ORDERS - FASE 6 BLOQUE 1
-- Canal WhatsApp Cloud API - núcleo de texto
-- ============================================================

-- El índice original impedía conservar varias conversaciones históricas
-- del mismo contacto externo. Para canales reales necesitamos permitir
-- rotación por inactividad manteniendo el historial.
drop index if exists public.ai_order_conversations_external_unique;

create unique index if not exists ai_order_conversations_external_open_unique
on public.ai_order_conversations(
  channel,
  external_conversation_id
)
where
  external_conversation_id is not null
  and status in (
    'active',
    'awaiting_human'
  );

create index if not exists ai_order_conversations_external_history_idx
on public.ai_order_conversations(
  channel,
  external_conversation_id,
  created_at desc
)
where external_conversation_id is not null;

-- ------------------------------------------------------------
-- Deduplicación y auditoría de mensajes entrantes de WhatsApp.
-- Meta puede reintentar un mismo webhook.
-- ------------------------------------------------------------
create table if not exists public.ai_whatsapp_webhook_events (
  id uuid primary key default gen_random_uuid(),
  provider_message_id text not null unique,
  phone_number_id text,
  from_phone text,
  conversation_id uuid
    references public.ai_order_conversations(id)
    on delete set null,
  message_type text,
  status text not null default 'received',
  payload jsonb not null default '{}'::jsonb,
  error_message text,
  received_at timestamptz not null default now(),
  processed_at timestamptz,
  constraint ai_whatsapp_webhook_events_status_check
    check (
      status in (
        'received',
        'processing',
        'sent',
        'ignored',
        'error'
      )
    )
);

create index if not exists ai_whatsapp_webhook_events_received_idx
on public.ai_whatsapp_webhook_events(
  received_at desc
);

alter table public.ai_whatsapp_webhook_events
enable row level security;

drop policy if exists "Admins read whatsapp webhook events"
on public.ai_whatsapp_webhook_events;

create policy "Admins read whatsapp webhook events"
on public.ai_whatsapp_webhook_events
for select
to authenticated
using (
  public.is_current_user_admin()
);

comment on table public.ai_whatsapp_webhook_events is
  'Deduplicación y auditoría técnica de mensajes recibidos desde Meta WhatsApp Cloud API.';
