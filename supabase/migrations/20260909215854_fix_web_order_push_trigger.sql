create or replace function public.notify_new_web_order_push()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  project_url text;
begin

  if new.order_source <> 'web' then
    return new;
  end if;

  if
    tg_op = 'UPDATE'
    and old.order_source is not distinct from 'web'
  then
    return new;
  end if;

  select decrypted_secret
  into project_url
  from vault.decrypted_secrets
  where name = 'project_url'
  limit 1;

  if project_url is null or btrim(project_url) = '' then
    raise warning
      'Vault secret project_url is not configured. Push skipped.';

    return new;
  end if;

  perform net.http_post(
    url :=
      rtrim(project_url, '/') ||
      '/functions/v1/new-web-order-push',

    headers :=
      jsonb_build_object(
        'Content-Type',
        'application/json'
      ),

    body :=
      jsonb_build_object(
        'type', 'INSERT',
        'table', 'orders',
        'schema', 'public',
        'record', to_jsonb(new),
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
  trg_new_web_order_push
on public.orders;


create trigger trg_new_web_order_push
after insert or update of order_source
on public.orders
for each row
execute function
  public.notify_new_web_order_push();