-- Fase 6E hotfix
-- 1) Sincroniza automáticamente EVENTO -> REALIZADA cuando el pedido POS queda entregado
--    y el checklist operativo está completo.
-- 2) Si el pedido ya estaba entregado y se completa después el último checklist,
--    también finaliza automáticamente el evento.
-- 3) Corrige registros existentes que ya cumplen ambas condiciones.

create or replace function public.sync_event_completion_from_pos(
  p_request_id uuid,
  p_created_by uuid default null
)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_request public.event_requests%rowtype;
  v_order_status text;
  v_pending_checklist integer;
  v_changed boolean := false;
begin
  select *
  into v_request
  from public.event_requests
  where id = p_request_id
  for update;

  if not found or v_request.pos_order_id is null then
    return false;
  end if;

  select status
  into v_order_status
  from public.orders
  where id = v_request.pos_order_id;

  if coalesce(v_order_status, '') <> 'delivered' then
    return false;
  end if;

  perform public.seed_event_operation_checklist(p_request_id);

  select count(*)
  into v_pending_checklist
  from public.event_operation_checklist
  where request_id = p_request_id
    and is_completed = false;

  if v_pending_checklist > 0 then
    return false;
  end if;

  if v_request.status <> 'completed'
     or v_request.operation_status <> 'completed'
     or v_request.operation_completed_at is null then

    update public.event_requests
    set
      operation_status = 'completed',
      operation_completed_at = coalesce(operation_completed_at, now()),
      status = 'completed',
      updated_at = now()
    where id = p_request_id;

    insert into public.event_operation_history(
      request_id,
      action,
      details,
      created_by
    ) values (
      p_request_id,
      'pos_order_delivered_auto_completed',
      jsonb_build_object(
        'orderId', v_request.pos_order_id,
        'orderStatus', v_order_status,
        'reason', 'Pedido POS entregado y checklist completo'
      ),
      p_created_by
    );

    v_changed := true;
  end if;

  return v_changed;
end;
$$;

revoke all on function public.sync_event_completion_from_pos(uuid, uuid) from public;

-- Cuando PEDIDOS cobra una orden, el flujo normal la marca como delivered.
-- En ese momento intentamos cerrar automáticamente el evento relacionado.
create or replace function public.sync_event_completion_from_order_trigger()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_request_id uuid;
begin
  if new.status = 'delivered'
     and old.status is distinct from new.status then

    select id
    into v_request_id
    from public.event_requests
    where pos_order_id = new.id
    limit 1;

    if v_request_id is not null then
      perform public.sync_event_completion_from_pos(v_request_id, null);
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists orders_event_completion_sync on public.orders;
create trigger orders_event_completion_sync
after update of status on public.orders
for each row
execute function public.sync_event_completion_from_order_trigger();

-- Si el pedido ya se había cobrado, completar el último punto del checklist
-- debe cerrar el evento sin requerir otro cambio en PEDIDOS.
create or replace function public.sync_event_completion_from_checklist_trigger()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if new.is_completed = true
     and old.is_completed is distinct from true then
    perform public.sync_event_completion_from_pos(
      new.request_id,
      coalesce(new.completed_by, auth.uid())
    );
  end if;

  return new;
end;
$$;

drop trigger if exists event_checklist_completion_sync on public.event_operation_checklist;
create trigger event_checklist_completion_sync
after update of is_completed on public.event_operation_checklist
for each row
execute function public.sync_event_completion_from_checklist_trigger();

-- Backfill: corrige eventos que, como el caso detectado en DEV, ya tenían
-- pedido entregado + checklist completo antes de instalar este hotfix.
do $$
declare
  v_request_id uuid;
begin
  for v_request_id in
    select r.id
    from public.event_requests r
    join public.orders o on o.id = r.pos_order_id
    where o.status = 'delivered'
      and r.status <> 'completed'
      and not exists (
        select 1
        from public.event_operation_checklist c
        where c.request_id = r.id
          and c.is_completed = false
      )
  loop
    perform public.sync_event_completion_from_pos(v_request_id, null);
  end loop;
end;
$$;
