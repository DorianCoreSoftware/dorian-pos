-- ============================================================
-- DORIAN AI ORDERS - FASE 4 BLOQUE 4
-- Cambios post-pedido seguros y limitados
-- ============================================================

create or replace function public.update_ai_order_safe_field(
  p_order_id uuid,
  p_change_type text,
  p_order_item_id uuid default null,
  p_value text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order public.orders%rowtype;
  v_value text;
  v_item_belongs boolean := false;
begin
  if p_order_id is null then
    return jsonb_build_object(
      'updated', false,
      'requiresHuman', false,
      'reason', 'El pedido es obligatorio.'
    );
  end if;

  v_value := left(trim(coalesce(p_value, '')), 500);

  if v_value = '' then
    return jsonb_build_object(
      'updated', false,
      'requiresHuman', false,
      'reason', 'El nuevo valor no puede estar vacío.'
    );
  end if;

  select *
  into v_order
  from public.orders
  where id = p_order_id
  for update;

  if not found then
    return jsonb_build_object(
      'updated', false,
      'requiresHuman', false,
      'reason', 'No se encontró el pedido.'
    );
  end if;

  if v_order.status in ('delivered', 'cancelled') then
    return jsonb_build_object(
      'updated', false,
      'requiresHuman', false,
      'status', v_order.status,
      'reason', 'El pedido ya no admite cambios.'
    );
  end if;

  -- ----------------------------------------------------------
  -- Nota de producto:
  -- únicamente mientras el pedido siga pending.
  -- ----------------------------------------------------------
  if p_change_type = 'item_note' then
    if v_order.status <> 'pending' then
      return jsonb_build_object(
        'updated', false,
        'requiresHuman', true,
        'status', v_order.status,
        'reason', 'La preparación ya pudo haber comenzado; la nota requiere atención humana.'
      );
    end if;

    if p_order_item_id is null then
      return jsonb_build_object(
        'updated', false,
        'requiresHuman', false,
        'status', v_order.status,
        'reason', 'El producto de la orden es obligatorio.'
      );
    end if;

    select exists(
      select 1
      from public.order_items oi
      where oi.id = p_order_item_id
        and oi.order_id = p_order_id
    )
    into v_item_belongs;

    if not v_item_belongs then
      return jsonb_build_object(
        'updated', false,
        'requiresHuman', false,
        'status', v_order.status,
        'reason', 'El producto indicado no pertenece a este pedido.'
      );
    end if;

    update public.order_items
    set notes = v_value
    where id = p_order_item_id
      and order_id = p_order_id;

    update public.orders
    set status_updated_at = now()
    where id = p_order_id;

    return jsonb_build_object(
      'updated', true,
      'requiresHuman', false,
      'status', v_order.status,
      'changeType', 'item_note',
      'reason', 'Nota del producto actualizada correctamente.'
    );
  end if;

  -- ----------------------------------------------------------
  -- Referencias descriptivas de entrega:
  -- NO cambia domicilio, coordenadas ni costo de envío.
  -- ----------------------------------------------------------
  if p_change_type = 'delivery_references' then
    if v_order.fulfillment_type <> 'delivery' then
      return jsonb_build_object(
        'updated', false,
        'requiresHuman', false,
        'status', v_order.status,
        'reason', 'El pedido no es a domicilio.'
      );
    end if;

    if v_order.status not in (
      'pending',
      'preparing',
      'ready',
      'on_the_way'
    ) then
      return jsonb_build_object(
        'updated', false,
        'requiresHuman', true,
        'status', v_order.status,
        'reason', 'Las referencias de entrega ya no pueden modificarse automáticamente.'
      );
    end if;

    update public.order_delivery_details
    set
      delivery_references = v_value,
      updated_at = now()
    where order_id = p_order_id;

    if not found then
      return jsonb_build_object(
        'updated', false,
        'requiresHuman', true,
        'status', v_order.status,
        'reason', 'No encontré los datos de entrega del pedido.'
      );
    end if;

    update public.orders
    set status_updated_at = now()
    where id = p_order_id;

    return jsonb_build_object(
      'updated', true,
      'requiresHuman', false,
      'status', v_order.status,
      'changeType', 'delivery_references',
      'reason', 'Referencias de entrega actualizadas correctamente.'
    );
  end if;

  return jsonb_build_object(
    'updated', false,
    'requiresHuman', true,
    'status', v_order.status,
    'reason', 'Ese tipo de cambio no está permitido automáticamente.'
  );
end;
$$;

revoke all
on function public.update_ai_order_safe_field(uuid, text, uuid, text)
from public, anon, authenticated;

grant execute
on function public.update_ai_order_safe_field(uuid, text, uuid, text)
to service_role;

comment on function public.update_ai_order_safe_field(uuid, text, uuid, text) is
  'Ediciones post-pedido limitadas para DORIAN AI: item_note solo pending; delivery_references en delivery activo. No permite cambios estructurales.';
