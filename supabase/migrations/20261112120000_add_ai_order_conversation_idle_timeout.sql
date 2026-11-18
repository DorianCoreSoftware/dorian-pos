-- ============================================================
-- DORIAN AI ORDERS - FASE 2 BLOQUE 4
-- Timeout configurable de conversaciones activas
-- ============================================================

alter table public.ai_order_settings
add column if not exists conversation_idle_timeout_minutes integer
not null default 30;

alter table public.ai_order_settings
drop constraint if exists ai_order_settings_idle_timeout_check;

alter table public.ai_order_settings
add constraint ai_order_settings_idle_timeout_check
check (
  conversation_idle_timeout_minutes between 0 and 1440
);

comment on column public.ai_order_settings.conversation_idle_timeout_minutes is
  'Minutos máximos de inactividad de una conversación activa. 0 desactiva el abandono automático. Al expirar, el contexto anterior se marca abandoned y el siguiente mensaje inicia una conversación limpia.';
