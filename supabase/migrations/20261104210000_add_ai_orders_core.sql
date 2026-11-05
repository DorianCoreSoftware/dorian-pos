-- ============================================================
-- DORIAN AI ORDERS - CORE FASE 1
-- ============================================================
-- Núcleo independiente de canal para conversaciones de pedidos.
-- La creación real de órdenes permanece deshabilitada por defecto.

create table if not exists public.ai_order_settings (
  id smallint primary key default 1,
  enabled boolean not null default false,
  order_creation_enabled boolean not null default false,
  model text not null default 'gpt-6-luna',
  max_tool_iterations integer not null default 8,
  max_history_messages integer not null default 30,
  require_explicit_confirmation boolean not null default true,
  system_instructions text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint ai_order_settings_singleton check (id = 1),
  constraint ai_order_settings_tool_iterations_check check (max_tool_iterations between 1 and 20),
  constraint ai_order_settings_history_check check (max_history_messages between 4 and 100)
);

insert into public.ai_order_settings (id)
values (1)
on conflict (id) do nothing;

create table if not exists public.ai_order_conversations (
  id uuid primary key default gen_random_uuid(),
  channel text not null default 'internal',
  external_conversation_id text,
  status text not null default 'active',
  customer_name text,
  customer_phone text,
  human_handoff_requested boolean not null default false,
  human_handoff_reason text,
  last_message_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint ai_order_conversations_channel_check
    check (channel in ('internal', 'web', 'whatsapp', 'instagram', 'voice')),
  constraint ai_order_conversations_status_check
    check (status in ('active', 'awaiting_human', 'completed', 'abandoned', 'cancelled'))
);

create unique index if not exists ai_order_conversations_external_unique
on public.ai_order_conversations(channel, external_conversation_id)
where external_conversation_id is not null;

create index if not exists ai_order_conversations_status_idx
on public.ai_order_conversations(status, last_message_at desc);

create table if not exists public.ai_order_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.ai_order_conversations(id) on delete cascade,
  role text not null,
  content text,
  tool_name text,
  tool_call_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint ai_order_messages_role_check
    check (role in ('user', 'assistant', 'tool', 'system')),
  constraint ai_order_messages_payload_check
    check (
      nullif(trim(coalesce(content, '')), '') is not null
      or nullif(trim(coalesce(tool_name, '')), '') is not null
    )
);

create index if not exists ai_order_messages_conversation_idx
on public.ai_order_messages(conversation_id, created_at);

create table if not exists public.ai_order_drafts (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null unique references public.ai_order_conversations(id) on delete cascade,
  status text not null default 'building',
  customer_name text,
  customer_phone text,
  fulfillment_type text,
  delivery jsonb,
  items jsonb not null default '[]'::jsonb,
  estimated_total numeric(12,2) not null default 0,
  currency_code text not null default 'MXN',
  explicit_confirmation_at timestamptz,
  order_id uuid references public.orders(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint ai_order_drafts_status_check
    check (status in ('building', 'awaiting_confirmation', 'confirmed', 'converted', 'cancelled')),
  constraint ai_order_drafts_fulfillment_check
    check (fulfillment_type is null or fulfillment_type in ('pickup', 'delivery')),
  constraint ai_order_drafts_total_check check (estimated_total >= 0),
  constraint ai_order_drafts_items_array_check check (jsonb_typeof(items) = 'array')
);

create table if not exists public.ai_order_tool_runs (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.ai_order_conversations(id) on delete cascade,
  tool_name text not null,
  arguments jsonb not null default '{}'::jsonb,
  result jsonb,
  succeeded boolean not null default true,
  error_message text,
  duration_ms integer,
  created_at timestamptz not null default now(),
  constraint ai_order_tool_runs_duration_check check (duration_ms is null or duration_ms >= 0)
);

create index if not exists ai_order_tool_runs_conversation_idx
on public.ai_order_tool_runs(conversation_id, created_at desc);

alter table public.ai_order_settings enable row level security;
alter table public.ai_order_conversations enable row level security;
alter table public.ai_order_messages enable row level security;
alter table public.ai_order_drafts enable row level security;
alter table public.ai_order_tool_runs enable row level security;

-- Administración: lectura para administradores autenticados.
drop policy if exists "Admins read AI order settings" on public.ai_order_settings;
create policy "Admins read AI order settings"
on public.ai_order_settings for select to authenticated
using (
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'admin'::public.user_role
  )
);

drop policy if exists "Admins update AI order settings" on public.ai_order_settings;
create policy "Admins update AI order settings"
on public.ai_order_settings for update to authenticated
using (
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'admin'::public.user_role
  )
)
with check (
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'admin'::public.user_role
  )
);

-- El resto del historial se escribe por service-role desde la Edge Function.
-- Permitimos lectura administrativa para auditoría futura.
do $$
declare
  v_table text;
begin
  foreach v_table in array array[
    'ai_order_conversations',
    'ai_order_messages',
    'ai_order_drafts',
    'ai_order_tool_runs'
  ]
  loop
    execute format('drop policy if exists %I on public.%I', 'Admins read ' || v_table, v_table);
    execute format(
      'create policy %I on public.%I for select to authenticated using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = ''admin''::public.user_role))',
      'Admins read ' || v_table,
      v_table
    );
  end loop;
end;
$$;

create or replace function public.ai_order_touch_updated_at()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists ai_order_settings_touch_updated_at on public.ai_order_settings;
create trigger ai_order_settings_touch_updated_at
before update on public.ai_order_settings
for each row execute function public.ai_order_touch_updated_at();

drop trigger if exists ai_order_conversations_touch_updated_at on public.ai_order_conversations;
create trigger ai_order_conversations_touch_updated_at
before update on public.ai_order_conversations
for each row execute function public.ai_order_touch_updated_at();

drop trigger if exists ai_order_drafts_touch_updated_at on public.ai_order_drafts;
create trigger ai_order_drafts_touch_updated_at
before update on public.ai_order_drafts
for each row execute function public.ai_order_touch_updated_at();

comment on table public.ai_order_settings is
  'Configuración global del agente Dorian AI Orders. enabled y order_creation_enabled comienzan apagados por seguridad.';
comment on table public.ai_order_conversations is
  'Conversaciones omnicanal del agente de pedidos.';
comment on table public.ai_order_drafts is
  'Borrador estructurado del pedido. Los precios se recalculan desde products y modifiers; no son autoridad para checkout.';
