create or replace function public.notify_new_web_order_push()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin

  if new.order_source <> 'web' then
    return new;
  end if;

  perform net.http_post(
    url :=
      'https://wkcijycvvvsspiqptoyi.supabase.co/functions/v1/new-web-order-push',

    body :=
      jsonb_build_object(
        'type',
        'INSERT',

        'table',
        'orders',

        'schema',
        'public',

        'record',
        to_jsonb(new),

        'old_record',
        null
      ),

    headers :=
      jsonb_build_object(
        'Content-Type',
        'application/json',

        'apikey',
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndrY2lqeWN2dnZzc3BpcXB0b3lpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ0NjA2ODAsImV4cCI6MjA5MDAzNjY4MH0.pmDpCc_Iad0ZY65-O_dferzwnoKKwvWOFVjpAq6PBfY',

        'Authorization',
        'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndrY2lqeWN2dnZzc3BpcXB0b3lpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ0NjA2ODAsImV4cCI6MjA5MDAzNjY4MH0.pmDpCc_Iad0ZY65-O_dferzwnoKKwvWOFVjpAq6PBfY'
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


create trigger
  trg_new_web_order_push
after insert
on public.orders
for each row
execute function
  public.notify_new_web_order_push();