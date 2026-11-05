-- Rol Operador: acceso operativo completo sin acceso administrativo.
-- Añade el valor al enum y permite operar el flujo de reparto.

alter type public.user_role
add value if not exists 'operator';

-- Permitir que el administrador opere el módulo de reparto.
-- Regla: driver y admin pueden consultar/tomar/cobrar/completar entregas.
-- La asignación sigue ligada al auth.uid() que toma el pedido.

create or replace function public.get_driver_orders()
returns table (
  order_id uuid,
  status text,
  total numeric,
  created_at timestamptz,
  customer_name text,
  customer_phone text,
  street text,
  exterior_number text,
  interior_number text,
  neighborhood text,
  postal_code text,
  delivery_references text,
  latitude numeric,
  longitude numeric,
  delivery_zone_name text,
  delivery_distance_km numeric,
  delivery_base_fee numeric,
  delivery_extra_fee numeric,
  delivery_total_fee numeric,
  driver_id uuid
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Debes iniciar sesión.';
  end if;

  if not exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.is_active = true
      and p.role::text in ('driver', 'operator', 'admin')
  ) then
    raise exception 'No tienes permisos para consultar entregas.';
  end if;

  return query
  select
    o.id,
    o.status::text,
    o.total,
    o.created_at,
    coalesce(d.customer_name, o.customer_name),
    coalesce(d.phone, o.customer_phone),
    d.street,
    d.exterior_number,
    d.interior_number,
    d.neighborhood,
    d.postal_code,
    d.delivery_references,
    d.latitude,
    d.longitude,
    o.delivery_zone_name,
    o.delivery_distance_km,
    o.delivery_base_fee,
    o.delivery_extra_fee,
    o.delivery_total_fee,
    o.driver_id
  from public.orders o
  left join public.order_delivery_details d
    on d.order_id = o.id
  where
    o.fulfillment_type = 'delivery'
    and (
      (
        o.status = 'ready'
        and o.driver_id is null
      )
      or
      (
        o.status = 'on_the_way'
        and o.driver_id = auth.uid()
      )
    )
  order by
    case
      when o.status = 'on_the_way' then 0
      else 1
    end,
    o.created_at asc;
end;
$$;

create or replace function public.driver_start_delivery(
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
    raise exception 'Debes iniciar sesión.';
  end if;

  if not exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.is_active = true
      and p.role::text in ('driver', 'operator', 'admin')
  ) then
    raise exception 'No tienes permisos para iniciar entregas.';
  end if;

  update public.orders
  set
    status = 'on_the_way',
    driver_id = auth.uid(),
    status_updated_at = now()
  where
    id = p_order_id
    and fulfillment_type = 'delivery'
    and status = 'ready'
    and driver_id is null;

  get diagnostics v_updated_count = row_count;

  if v_updated_count = 0 then
    raise exception 'El pedido ya no está disponible para reparto.';
  end if;
end;
$$;

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
    raise exception 'Debes iniciar sesión.';
  end if;

  if not exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.is_active = true
      and p.role::text in ('driver', 'operator', 'admin')
  ) then
    raise exception 'No tienes permisos para completar entregas.';
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
    raise exception 'No puedes completar este pedido.';
  end if;

  if not exists (
    select 1
    from public.order_payments op
    where op.order_id = p_order_id
  ) then
    raise exception 'Debes registrar el pago antes de entregar el pedido.';
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

  get diagnostics v_updated_count = row_count;

  if v_updated_count = 0 then
    raise exception 'No se pudo completar el pedido.';
  end if;
end;
$$;

create or replace function public.driver_register_payment(
  p_order_id uuid,
  p_payment_method text,
  p_amount_received numeric default null,
  p_payment_reference text default null
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
  v_reference text;
begin
  v_user_id := auth.uid();

  if v_user_id is null then
    raise exception 'Debes iniciar sesión.';
  end if;

  if not exists (
    select 1
    from public.profiles p
    where p.id = v_user_id
      and p.is_active = true
      and p.role::text in ('driver', 'operator', 'admin')
  ) then
    raise exception 'No tienes permisos para registrar este pago.';
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
    raise exception 'No puedes cobrar este pedido.';
  end if;

  select op.id
  into v_payment_id
  from public.order_payments op
  where op.order_id = p_order_id
  limit 1;

  if v_payment_id is not null then
    return v_payment_id;
  end if;

  if p_payment_method not in ('cash', 'card', 'transfer') then
    raise exception 'Método de pago inválido.';
  end if;

  v_reference := nullif(trim(coalesce(p_payment_reference, '')), '');

  if p_payment_method = 'cash' then
    if p_amount_received is null then
      raise exception 'Ingresa la cantidad recibida.';
    end if;

    if p_amount_received < v_total then
      raise exception 'La cantidad recibida es menor al total.';
    end if;

    v_change := round(p_amount_received - v_total, 2);
    v_reference := null;
  else
    p_amount_received := null;
    v_change := null;

    if p_payment_method = 'transfer'
       and (v_reference is null or length(v_reference) < 3) then
      raise exception 'Ingresa la referencia o folio de la transferencia.';
    end if;
  end if;

  insert into public.order_payments (
    order_id,
    payment_method,
    total_amount,
    amount_received,
    change_amount,
    payment_reference
  )
  values (
    p_order_id,
    p_payment_method,
    v_total,
    p_amount_received,
    v_change,
    v_reference
  )
  returning id
  into v_payment_id;

  return v_payment_id;
end;
$$;

revoke all on function public.get_driver_orders() from public;
revoke all on function public.driver_start_delivery(uuid) from public;
revoke all on function public.driver_complete_delivery(uuid) from public;
revoke all on function public.driver_register_payment(uuid,text,numeric,text) from public;

grant execute on function public.get_driver_orders() to authenticated;
grant execute on function public.driver_start_delivery(uuid) to authenticated;
grant execute on function public.driver_complete_delivery(uuid) to authenticated;
grant execute on function public.driver_register_payment(uuid,text,numeric,text) to authenticated;
