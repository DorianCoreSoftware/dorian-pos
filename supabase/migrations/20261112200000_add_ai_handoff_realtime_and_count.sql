-- ============================================================
-- DORIAN AI ORDERS - FASE 5 BLOQUE 4
-- Realtime + contador operativo de handoffs
-- ============================================================

create or replace function public.get_ai_handoff_pending_count()
returns integer
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_count integer;
begin
  if not public.is_current_user_admin() then
    raise exception 'FORBIDDEN';
  end if;

  select count(*)::integer
  into v_count
  from public.ai_order_conversations c
  where
    c.status = 'awaiting_human'
    and c.human_handoff_requested = true
    and c.human_resolved_at is null;

  return coalesce(v_count, 0);
end;
$$;

revoke all
on function public.get_ai_handoff_pending_count()
from public, anon;

grant execute
on function public.get_ai_handoff_pending_count()
to authenticated;

comment on function public.get_ai_handoff_pending_count() is
  'Cantidad de conversaciones DORIAN AI actualmente esperando atención humana.';

-- Habilita eventos Postgres Changes para la tabla si todavía no está publicada.
do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'ai_order_conversations'
  ) then
    alter publication supabase_realtime
    add table public.ai_order_conversations;
  end if;
end;
$$;
