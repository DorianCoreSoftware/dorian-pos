-- ============================================================
-- DORIAN AI ORDERS - FASE 4 BLOQUE 3
-- Cancelación segura y atómica de pedidos desde IA
-- ============================================================

create or replace function public.cancel_ai_order_if_eligible(
  p_order_id uuid,
  p_reason text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order public.orders%rowtype;
  v_has_payment boolean := false;
begin
  if p_order_id is null then
    return jsonb_build_object(
      'cancelled', false,
      'requiresHuman', false,
      'reason', 'El pedido es obligatorio.'
    );
  end if;

  select *
  into v_order
  from public.orders
  where id = p_order_id
  for update;

  if not found then
    return jsonb_build_object(
      'cancelled', false,
      'requiresHuman', false,
      'reason', 'No se encontró el pedido.'
    );
  end if;

  select exists(
    select 1
    from public.order_payments op
    where op.order_id = p_order_id
  )
  into v_has_payment;

  if v_order.status = 'cancelled' then
    return jsonb_build_object(
      'cancelled', false,
      'requiresHuman', false,
      'status', v_order.status,
      'reason', 'El pedido ya está cancelado.'
    );
  end if;

  if v_order.status = 'delivered' then
    return jsonb_build_object(
      'cancelled', false,
      'requiresHuman', true,
      'status', v_order.status,
      'reason', 'El pedido ya aparece como entregado.'
    );
  end if;

  if v_has_payment then
    return jsonb_build_object(
      'cancelled', false,
      'requiresHuman', true,
      'status', v_order.status,
      'hasPayment', true,
      'reason', 'El pedido ya tiene un pago registrado y requiere revisión humana.'
    );
  end if;

  if v_order.status not in ('pending', 'preparing') then
    return jsonb_build_object(
      'cancelled', false,
      'requiresHuman', true,
      'status', v_order.status,
      'hasPayment', false,
      'reason',
        case
          when v_order.status = 'ready'
            then 'El pedido ya está listo y requiere autorización humana para cancelarse.'
          when v_order.status = 'on_the_way'
            then 'El pedido ya va en camino y requiere atención humana para intentar cancelarlo.'
          else 'El pedido no puede cancelarse automáticamente en su estado actual.'
        end
    );
  end if;

  update public.orders
  set
    status = 'cancelled',
    status_updated_at = now()
  where id = p_order_id;

  return jsonb_build_object(
    'cancelled', true,
    'requiresHuman', false,
    'status', 'cancelled',
    'hasPayment', false,
    'reason', 'Pedido cancelado correctamente.'
  );
end;
$$;

revoke all
on function public.cancel_ai_order_if_eligible(uuid, text)
from public, anon, authenticated;

grant execute
on function public.cancel_ai_order_if_eligible(uuid, text)
to service_role;

comment on function public.cancel_ai_order_if_eligible(uuid, text) is
  'Cancelación segura para DORIAN AI. Solo permite pending/preparing sin pago. Bloquea pedidos listos, en camino, entregados o pagados.';
