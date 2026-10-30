-- ============================================================
-- DORIAN POS
-- CENTRO DE NOTIFICACIONES - FASE 2
-- Push para alertas críticas
-- ============================================================

create or replace function public.notify_critical_pos_alert_push()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  project_url text;
  should_send boolean := false;
begin
  -- Solo alertas activas y críticas.
  if new.severity <> 'critical'
     or new.is_active <> true then
    return new;
  end if;

  -- INSERT crítico nuevo.
  if tg_op = 'INSERT' then
    should_send := true;
  end if;

  -- UPDATE: solo cuando se reactiva.
  -- Evita push repetido si el stock sigue negativo y solo cambia
  -- de -1 a -2, -3, etc.
  if tg_op = 'UPDATE' then
    should_send :=
      coalesce(old.is_active, false) = false
      and new.is_active = true;
  end if;

  if not should_send then
    return new;
  end if;

  select decrypted_secret
  into project_url
  from vault.decrypted_secrets
  where name = 'project_url'
  limit 1;

  if project_url is null
     or btrim(project_url) = '' then
    raise warning
      'Vault secret project_url is not configured. Critical alert push skipped.';

    return new;
  end if;

  perform net.http_post(
    url :=
      rtrim(project_url, '/') ||
      '/functions/v1/critical-alert-push',

    headers :=
      jsonb_build_object(
        'Content-Type',
        'application/json'
      ),

    body :=
      jsonb_build_object(
        'type',
        tg_op,
        'table',
        'pos_notifications',
        'schema',
        'public',
        'record',
        to_jsonb(new),
        'old_record',
        case
          when tg_op = 'UPDATE'
          then to_jsonb(old)
          else null
        end
      ),

    timeout_milliseconds :=
      5000
  );

  return new;
end;
$$;

drop trigger if exists
  trg_critical_pos_alert_push
on public.pos_notifications;

create trigger trg_critical_pos_alert_push
after insert or update
on public.pos_notifications
for each row
execute function
  public.notify_critical_pos_alert_push();
