-- ============================================================
-- DORIAN POS - PROD READINESS AUDIT
-- SOLO LECTURA. No modifica datos ni esquema.
-- Ejecutar en Supabase SQL Editor.
-- ============================================================

-- 1) Tablas public sin RLS.
select
  n.nspname as schema_name,
  c.relname as table_name,
  c.relrowsecurity as rls_enabled
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relkind = 'r'
  and c.relrowsecurity = false
order by c.relname;

-- 2) Permisos directos de anon sobre tablas public.
-- Revisar especialmente INSERT / UPDATE / DELETE / TRUNCATE.
select
  table_name,
  privilege_type
from information_schema.role_table_grants
where table_schema = 'public'
  and grantee = 'anon'
order by table_name, privilege_type;

-- 3) Permisos directos de authenticated.
select
  table_name,
  privilege_type
from information_schema.role_table_grants
where table_schema = 'public'
  and grantee = 'authenticated'
order by table_name, privilege_type;

-- 4) Políticas RLS existentes.
select
  schemaname,
  tablename,
  policyname,
  roles,
  cmd,
  qual,
  with_check
from pg_policies
where schemaname = 'public'
order by tablename, policyname;

-- 5) SECURITY DEFINER y search_path efectivo.
select
  n.nspname as schema_name,
  p.proname as function_name,
  p.prosecdef as security_definer,
  p.proconfig as function_config
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.prosecdef = true
order by p.proname;

-- 6) Estado de negocio actual.
select
  id,
  business_name,
  short_name,
  currency_code,
  timezone,
  web_orders_enabled,
  delivery_enabled,
  loyalty_enabled,
  promotions_enabled,
  kitchen_enabled
from public.business_settings
where id = 1;

-- 7) Modificadores que impedirían una migración legacy segura.
select count(*) as modifiers_without_group
from public.modifiers
where group_id is null;

-- 8) Conteos operativos para registrar antes/después de una migración.
select 'profiles' as entity, count(*)::bigint as total from public.profiles
union all
select 'orders', count(*)::bigint from public.orders
union all
select 'order_items', count(*)::bigint from public.order_items
union all
select 'order_payments', count(*)::bigint from public.order_payments
union all
select 'products', count(*)::bigint from public.products
union all
select 'modifiers', count(*)::bigint from public.modifiers
union all
select 'promo_coupons', count(*)::bigint from public.promo_coupons
union all
select 'promo_redemptions', count(*)::bigint from public.promo_redemptions
union all
select 'business_expenses', count(*)::bigint from public.business_expenses
order by entity;

-- 9) Programas promocionales activos.
select
  code,
  display_name,
  program_type,
  code_prefix,
  is_enabled,
  required_coupons,
  issue_chance_denominator
from public.promotion_programs
order by priority, display_name;

-- 10) Verificar que la tabla legacy expenses y la nueva business_expenses
-- sean entidades distintas. Solo devuelve existencia.
select
  to_regclass('public.expenses') as legacy_expenses,
  to_regclass('public.business_expenses') as current_business_expenses;
