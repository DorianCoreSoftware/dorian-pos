-- ============================================================
-- DorianCore - acciones administrativas en push
-- Inbox IA + sugerencias web
-- ============================================================

create or replace function public.notify_admin_action_push()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  project_url text;
  payload_source text;
begin
  if tg_table_name = 'ai_order_conversations' then
    if not (
      new.status = 'awaiting_human'
      and new.human_handoff_requested = true
    ) then
      return new;
    end if;

    if tg_op = 'UPDATE' then
      if
        old.status is not distinct from new.status
        and old.human_handoff_requested is not distinct from new.human_handoff_requested
        and old.human_handoff_at is not distinct from new.human_handoff_at
      then
        return new;
      end if;
    end if;

    payload_source := 'ai_handoff';
  elsif tg_table_name = 'customer_feedback' then
    if tg_op <> 'INSERT' then
      return new;
    end if;
    payload_source := 'customer_feedback';
  else
    return new;
  end if;

  select decrypted_secret
  into project_url
  from vault.decrypted_secrets
  where name = 'project_url'
  limit 1;

  if project_url is null or btrim(project_url) = '' then
    raise warning 'Vault secret project_url is not configured. Admin action push skipped.';
    return new;
  end if;

  perform net.http_post(
    url := rtrim(project_url, '/') || '/functions/v1/admin-action-push',
    headers := jsonb_build_object('Content-Type', 'application/json'),
    body := jsonb_build_object(
      'source', payload_source,
      'record', to_jsonb(new)
    ),
    timeout_milliseconds := 5000
  );

  return new;
end;
$$;

drop trigger if exists trg_ai_handoff_admin_push on public.ai_order_conversations;
create trigger trg_ai_handoff_admin_push
after insert or update of status, human_handoff_requested, human_handoff_at
on public.ai_order_conversations
for each row
execute function public.notify_admin_action_push();

drop trigger if exists trg_customer_feedback_admin_push on public.customer_feedback;
create trigger trg_customer_feedback_admin_push
after insert
on public.customer_feedback
for each row
execute function public.notify_admin_action_push();

-- Realtime para actualizar el badge de Sugerencias sin refrescar la app.
do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'customer_feedback'
  ) then
    alter publication supabase_realtime add table public.customer_feedback;
  end if;
end;
$$;
