/*
 * ============================================================
 * NORMALIZAR ESTADOS DE ORDERS + TRACKING
 * ============================================================
 *
 * Estados finales:
 *
 * pending
 * preparing
 * ready
 * on_the_way
 * delivered
 * cancelled
 */


/*
 * ============================================================
 * 1. QUITAR CONSTRAINT ACTUAL
 * ============================================================
 */

alter table public.orders
drop constraint if exists orders_status_check;


/*
 * ============================================================
 * 2. MIGRAR ESTADOS ACTUALES A INGLÉS
 * ============================================================
 */

update public.orders
set status = 'delivered'
where status = 'entregado';


update public.orders
set status = 'cancelled'
where status = 'cancelado';


/*
 * ============================================================
 * 3. VALIDAR QUE NO QUEDEN ESTADOS DESCONOCIDOS
 * ============================================================
 */

do $$
begin
  if exists (
    select 1
    from public.orders
    where status not in (
      'pending',
      'preparing',
      'ready',
      'on_the_way',
      'delivered',
      'cancelled'
    )
  ) then
    raise exception
      'Existen órdenes con estados no contemplados. Revisa public.orders antes de continuar.';
  end if;
end;
$$;


/*
 * ============================================================
 * 4. AGREGAR NUEVO CONSTRAINT
 * ============================================================
 */

alter table public.orders
add constraint orders_status_check
check (
  status in (
    'pending',
    'preparing',
    'ready',
    'on_the_way',
    'delivered',
    'cancelled'
  )
);