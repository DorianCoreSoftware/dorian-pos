/*
 * ============================================================
 * SECURE DRIVER PAYMENT FLOW
 * ============================================================
 */


/*
 * ============================================================
 * REGISTRAR PAGO DESDE REPARTIDOR
 * ============================================================
 */

create or replace function public.driver_register_payment(
  p_order_id uuid,
  p_payment_method text,
  p_amount_received numeric default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_total numeric;
  v_payment_id uuid;
  v_change numeric;
begin
  v_user_id := auth.uid();

  if v_user_id is null then
    raise exception
      'Debes iniciar sesión.';
  end if;


  if not exists (
    select 1
    from public.profiles
    where id = v_user_id
      and role = 'driver'
  ) then
    raise exception
      'No tienes permisos para registrar este pago.';
  end if;


  select o.total
  into v_total
  from public.orders o
  where
    o.id = p_order_id
    and o.fulfillment_type = 'delivery'
    and o.status = 'on_the_way'
    and o.driver_id = v_user_id;

  if v_total is null then
    raise exception
      'No puedes cobrar este pedido.';
  end if;


  /*
   * Si ya existe pago, devolvemos
   * el mismo y no cobramos otra vez.
   */
  select op.id
  into v_payment_id
  from public.order_payments op
  where op.order_id = p_order_id
  limit 1;

  if v_payment_id is not null then
    return v_payment_id;
  end if;


  if p_payment_method not in (
    'cash',
    'card'
  ) then
    raise exception
      'Método de pago inválido.';
  end if;


  if p_payment_method = 'cash' then

    if p_amount_received is null then
      raise exception
        'Ingresa la cantidad recibida.';
    end if;

    if p_amount_received < v_total then
      raise exception
        'La cantidad recibida es menor al total.';
    end if;

    v_change :=
      round(
        p_amount_received - v_total,
        2
      );

  else

    p_amount_received := null;
    v_change := null;

  end if;


  insert into public.order_payments (
    order_id,
    payment_method,
    total_amount,
    amount_received,
    change_amount
  )
  values (
    p_order_id,
    p_payment_method,
    v_total,
    p_amount_received,
    v_change
  )
  returning id
  into v_payment_id;


  return v_payment_id;
end;
$$;


/*
 * ============================================================
 * ENTREGAR SOLO SI YA ESTÁ PAGADO
 * ============================================================
 */

create or replace function public.driver_complete_delivery(
  p_order_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_updated_count integer;
begin

  if auth.uid() is null then
    raise exception
      'Debes iniciar sesión.';
  end if;


  if not exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role = 'driver'
  ) then
    raise exception
      'No tienes permisos para completar entregas.';
  end if;


  if not exists (
    select 1
    from public.orders o
    where
      o.id = p_order_id
      and o.fulfillment_type = 'delivery'
      and o.status = 'on_the_way'
      and o.driver_id = auth.uid()
  ) then
    raise exception
      'No puedes completar este pedido.';
  end if;


  if not exists (
    select 1
    from public.order_payments op
    where op.order_id = p_order_id
  ) then
    raise exception
      'Debes registrar el pago antes de entregar el pedido.';
  end if;


  update public.orders
  set
    status = 'delivered',
    status_updated_at = now()

  where
    id = p_order_id
    and fulfillment_type = 'delivery'
    and status = 'on_the_way'
    and driver_id = auth.uid();


  get diagnostics
    v_updated_count = row_count;


  if v_updated_count = 0 then
    raise exception
      'No se pudo completar el pedido.';
  end if;

end;
$$;


revoke all on function
public.driver_register_payment(
  uuid,
  text,
  numeric
)
from public;

grant execute on function
public.driver_register_payment(
  uuid,
  text,
  numeric
)
to authenticated;


revoke all on function
public.driver_complete_delivery(uuid)
from public;

grant execute on function
public.driver_complete_delivery(uuid)
to authenticated;