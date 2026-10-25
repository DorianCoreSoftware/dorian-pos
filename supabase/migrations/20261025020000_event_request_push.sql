create or replace function public.notify_new_event_request_push()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  project_url text;
begin
  select decrypted_secret
  into project_url
  from vault.decrypted_secrets
  where name = 'project_url'
  limit 1;

  if project_url is null or btrim(project_url) = '' then
    raise warning
      'Vault secret project_url is not configured. Event request push skipped.';

    return new;
  end if;

  perform net.http_post(
    url :=
      rtrim(project_url, '/') ||
      '/functions/v1/event-request-push',

    headers :=
      jsonb_build_object(
        'Content-Type',
        'application/json'
      ),

    body :=
      jsonb_build_object(
        'type', 'INSERT',
        'table', 'event_requests',
        'schema', 'public',
        'record', to_jsonb(new),
        'old_record', null
      ),

    timeout_milliseconds :=
      5000
  );

  return new;
end;
$$;


drop trigger if exists
  trg_new_event_request_push
on public.event_requests;


create trigger trg_new_event_request_push
after insert
on public.event_requests
for each row
execute function
  public.notify_new_event_request_push();
