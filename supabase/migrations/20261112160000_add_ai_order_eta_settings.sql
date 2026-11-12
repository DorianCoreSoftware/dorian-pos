-- ============================================================
-- DORIAN AI ORDERS - FASE 4 BLOQUE 5
-- Configuración de ETA operativo
-- ============================================================

alter table public.ai_order_settings
add column if not exists eta_preparation_minutes integer
not null default 25;

alter table public.ai_order_settings
add column if not exists eta_delivery_transit_minutes integer
not null default 15;

alter table public.ai_order_settings
add column if not exists eta_buffer_minutes integer
not null default 5;

alter table public.ai_order_settings
drop constraint if exists ai_order_settings_eta_preparation_check;

alter table public.ai_order_settings
add constraint ai_order_settings_eta_preparation_check
check (eta_preparation_minutes between 0 and 240);

alter table public.ai_order_settings
drop constraint if exists ai_order_settings_eta_delivery_check;

alter table public.ai_order_settings
add constraint ai_order_settings_eta_delivery_check
check (eta_delivery_transit_minutes between 0 and 240);

alter table public.ai_order_settings
drop constraint if exists ai_order_settings_eta_buffer_check;

alter table public.ai_order_settings
add constraint ai_order_settings_eta_buffer_check
check (eta_buffer_minutes between 0 and 60);

comment on column public.ai_order_settings.eta_preparation_minutes is
  'Minutos operativos estimados de preparación usados por DORIAN AI.';

comment on column public.ai_order_settings.eta_delivery_transit_minutes is
  'Minutos operativos estimados de trayecto a domicilio usados por DORIAN AI.';

comment on column public.ai_order_settings.eta_buffer_minutes is
  'Margen +/- aplicado al ETA para responder con un rango conservador.';
