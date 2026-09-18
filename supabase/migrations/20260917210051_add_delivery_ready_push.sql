create or replace function
public.notify_delivery_ready_push()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  project_url text;
begin

  /*
   * Solo domicilio.
   */
  if new.fulfillment_type <> 'delivery' then
    return new;
  end if;


  /*
   * Solo cuando entra a READY.
   */
  if new.status <> 'ready' then
    return new;
  end if;


  /*
   * Evitamos notificar varias veces
   * por updates posteriores del pedido.
   */
  if old.status is not distinct from 'ready' then
    return new;
  end if;


  select decrypted_secret
  into project_url
  from vault.decrypted_secrets
  where name = 'project_url'
  limit 1;


  if
    project_url is null
    or btrim(
      project_url
    ) = ''
  then

    raise warning
      'Vault secret project_url is not configured. Driver push skipped.';

    return new;

  end if;


  perform net.http_post(
    url :=
      rtrim(
        project_url,
        '/'
      ) ||
      '/functions/v1/delivery-ready-push',

    headers :=
      jsonb_build_object(
        'Content-Type',
        'application/json'
      ),

    body :=
      jsonb_build_object(
        'type',
        'UPDATE',

        'table',
        'orders',

        'schema',
        'public',

        'record',
        to_jsonb(new),

        'old_record',
        to_jsonb(old)
      ),

    timeout_milliseconds :=
      5000
  );


  return new;
end;
$$;


drop trigger if exists
trg_delivery_ready_push
on public.orders;


create trigger
trg_delivery_ready_push

after update of status
on public.orders

for each row

when (
  new.status = 'ready'
  and old.status is distinct from new.status
)

execute function
public.notify_delivery_ready_push();