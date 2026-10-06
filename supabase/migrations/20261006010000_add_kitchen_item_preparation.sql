/*
 * Kitchen item preparation tracking.
 *
 * Each order item can be marked as prepared from Kitchen. The state is
 * persisted so it survives refreshes/devices, and the database prevents
 * orders with pending items from being marked ready or paid.
 */

alter table public.order_items
add column if not exists is_prepared boolean not null default false,
add column if not exists prepared_at timestamptz null,
add column if not exists prepared_by uuid null;

comment on column public.order_items.is_prepared is
  'Whether this order line has been prepared in Kitchen.';

comment on column public.order_items.prepared_at is
  'Timestamp when the order line was last marked prepared.';

comment on column public.order_items.prepared_by is
  'Authenticated user that last marked the order line prepared.';

/*
 * Existing delivered orders are historical and should not suddenly appear
 * as incomplete if they are inspected/reprinted after this migration.
 */
update public.order_items oi
set
  is_prepared = true,
  prepared_at = coalesce(oi.prepared_at, now())
from public.orders o
where
  o.id = oi.order_id
  and o.status = 'delivered'
  and oi.is_prepared = false;

create or replace function public.set_order_item_prepared(
  p_order_item_id uuid,
  p_is_prepared boolean
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_order_id uuid;
  v_order_status text;
begin
  if auth.uid() is null then
    raise exception 'Debes iniciar sesión para actualizar la preparación.';
  end if;

  if p_order_item_id is null then
    raise exception 'El producto de la orden es obligatorio.';
  end if;

  select
    oi.order_id,
    o.status
  into
    v_order_id,
    v_order_status
  from public.order_items oi
  join public.orders o
    on o.id = oi.order_id
  where oi.id = p_order_item_id;

  if not found then
    raise exception 'No se encontró el producto de la orden.';
  end if;

  if v_order_status in ('delivered', 'cancelled') then
    raise exception 'No puedes modificar la preparación de una orden cerrada.';
  end if;

  update public.order_items
  set
    is_prepared = coalesce(p_is_prepared, false),
    prepared_at = case
      when coalesce(p_is_prepared, false) then now()
      else null
    end,
    prepared_by = case
      when coalesce(p_is_prepared, false) then auth.uid()
      else null
    end
  where id = p_order_item_id;
end;
$$;

revoke all on function public.set_order_item_prepared(uuid, boolean) from public;
grant execute on function public.set_order_item_prepared(uuid, boolean) to authenticated;

/*
 * Shared assertion used by triggers. It intentionally raises when there are
 * no order items as well, since a zero-item order must never be ready/paid.
 */
create or replace function public.assert_order_fully_prepared(
  p_order_id uuid
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if p_order_id is null then
    raise exception 'La orden es obligatoria.';
  end if;

  if not exists (
    select 1
    from public.order_items oi
    where oi.order_id = p_order_id
  ) then
    raise exception 'La orden no contiene productos para preparar.';
  end if;

  if exists (
    select 1
    from public.order_items oi
    where
      oi.order_id = p_order_id
      and oi.is_prepared = false
  ) then
    raise exception 'No se puede continuar: todavía hay productos pendientes de preparar.';
  end if;
end;
$$;

revoke all on function public.assert_order_fully_prepared(uuid) from public;

create or replace function public.enforce_order_prepared_before_ready()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  if
    new.status is distinct from old.status
    and new.status in ('ready', 'on_the_way', 'delivered')
  then
    perform public.assert_order_fully_prepared(new.id);
  end if;

  return new;
end;
$$;

drop trigger if exists trg_orders_require_prepared_items on public.orders;

create trigger trg_orders_require_prepared_items
before update of status on public.orders
for each row
execute function public.enforce_order_prepared_before_ready();

create or replace function public.enforce_order_prepared_before_payment()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  perform public.assert_order_fully_prepared(new.order_id);
  return new;
end;
$$;

drop trigger if exists trg_order_payments_require_prepared_items
on public.order_payments;

create trigger trg_order_payments_require_prepared_items
before insert on public.order_payments
for each row
execute function public.enforce_order_prepared_before_payment();
