create or replace function public.broadcast_web_order_status()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  tracking_code text;
begin
  if new.order_source <> 'web' then
    return new;
  end if;

  if tg_op = 'UPDATE'
     and new.status is not distinct from old.status then
    return new;
  end if;

  tracking_code :=
    upper(
      split_part(
        new.id::text,
        '-',
        1
      )
    );

  perform realtime.send(
    jsonb_build_object(
      'trackingCode',
      tracking_code,
      'status',
      new.status,
      'updatedAt',
      now()
    ),
    'order_status_changed',
    'web-order:' || tracking_code,
    false
  );

  return new;
end;
$$;

drop trigger if exists trg_broadcast_web_order_status
on public.orders;

create trigger trg_broadcast_web_order_status
after insert or update of status
on public.orders
for each row
execute function public.broadcast_web_order_status();