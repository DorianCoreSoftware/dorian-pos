-- ============================================================
-- Push de pedido web
--
-- La orden se inserta primero y posteriormente
-- create_kitchen_order actualiza order_source a 'web'.
-- Por eso escuchamos también el UPDATE de order_source.
-- ============================================================

create or replace function public.notify_new_web_order_push()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  request_id bigint;
begin

  /*
   * Solo nos interesa una orden cuando ya
   * quedó identificada como pedido web.
   */
  if new.order_source <> 'web' then
    return new;
  end if;


  /*
   * Si es UPDATE, solo notificamos cuando
   * acaba de convertirse en orden web.
   *
   * Esto evita notificaciones duplicadas
   * por updates posteriores.
   */
  if
    tg_op = 'UPDATE'
    and old.order_source is not distinct from 'web'
  then
    return new;
  end if;


  request_id := net.http_post(
    url :=
      'https://wkcijycvvvsspiqptoyi.supabase.co/functions/v1/new-web-order-push',

    headers :=
      jsonb_build_object(
        'Content-Type',
        'application/json',

        'apikey',
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndrY2lqeWN2dnZzc3BpcXB0b3lpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ0NjA2ODAsImV4cCI6MjA5MDAzNjY4MH0.pmDpCc_Iad0ZY65-O_dferzwnoKKwvWOFVjpAq6PBfY',

        'Authorization',
        'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndrY2lqeWN2dnZzc3BpcXB0b3lpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ0NjA2ODAsImV4cCI6MjA5MDAzNjY4MH0.pmDpCc_Iad0ZY65-O_dferzwnoKKwvWOFVjpAq6PBfY'
      ),

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
        case
          when tg_op = 'UPDATE'
            then to_jsonb(old)
          else null
        end
      ),

    timeout_milliseconds :=
      5000
  );


  insert into public.web_order_push_debug (
    order_id,
    request_id,
    order_source
  )
  values (
    new.id,
    request_id,
    new.order_source
  );


  return new;
end;
$$;


-- ============================================================
-- Recreamos trigger
-- ============================================================

drop trigger if exists
  trg_new_web_order_push
on public.orders;


create trigger trg_new_web_order_push
after insert or update of order_source
on public.orders
for each row
execute function
  public.notify_new_web_order_push();