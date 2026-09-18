/*
 * ============================================================
 * DRIVER DELIVERY FLOW
 * ============================================================
 *
 * - Solo usuarios con role = driver pueden usar estos RPC.
 * - Un pedido ready puede estar sin asignar.
 * - Al iniciar reparto queda asignado al repartidor.
 * - Solo ese repartidor puede marcarlo entregado.
 */


/*
 * ============================================================
 * 1. ASIGNACIÓN DE REPARTIDOR
 * ============================================================
 */

alter table public.orders
add column if not exists driver_id uuid
references public.profiles(id)
on delete set null;

create index if not exists
orders_driver_id_idx
on public.orders(driver_id);


/*
 * ============================================================
 * 2. PEDIDOS VISIBLES PARA REPARTIDOR
 * ============================================================
 */

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

  /*
   * Solo repartidores.
   */
  if not exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role = 'driver'
  ) then
    raise exception
      'No tienes permisos para consultar entregas.';
  end if;


  return query
  select
    o.id,
    o.status::text,
    o.total,
    o.created_at,

    coalesce(
      d.customer_name,
      o.customer_name
    ),

    coalesce(
      d.phone,
      o.customer_phone
    ),

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
      /*
       * Pedidos disponibles.
       */
      (
        o.status = 'ready'
        and o.driver_id is null
      )

      or

      /*
       * Pedido que ya tomó este repartidor.
       */
      (
        o.status = 'on_the_way'
        and o.driver_id = auth.uid()
      )
    )

  order by
    case
      when o.status = 'on_the_way'
        then 0
      else 1
    end,
    o.created_at asc;

end;
$$;


/*
 * ============================================================
 * 3. TOMAR PEDIDO / SALIR A REPARTO
 * ============================================================
 */

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
      'No tienes permisos para iniciar entregas.';
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


  get diagnostics
    v_updated_count = row_count;


  if v_updated_count = 0 then
    raise exception
      'El pedido ya no está disponible para reparto.';
  end if;

end;
$$;


/*
 * ============================================================
 * 4. MARCAR ENTREGADO
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
      'No puedes completar este pedido.';
  end if;

end;
$$;


/*
 * ============================================================
 * 5. PERMISOS
 * ============================================================
 */

revoke all on function
public.get_driver_orders()
from public;

revoke all on function
public.driver_start_delivery(uuid)
from public;

revoke all on function
public.driver_complete_delivery(uuid)
from public;


grant execute on function
public.get_driver_orders()
to authenticated;

grant execute on function
public.driver_start_delivery(uuid)
to authenticated;

grant execute on function
public.driver_complete_delivery(uuid)
to authenticated;