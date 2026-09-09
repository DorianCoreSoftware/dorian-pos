-- ============================================================
-- Fecha real del último cambio de estado de una orden
-- ============================================================

alter table public.orders
add column if not exists status_updated_at timestamptz;

-- Para órdenes existentes usamos created_at como valor inicial.
update public.orders
set status_updated_at = created_at
where status_updated_at is null;

alter table public.orders
alter column status_updated_at
set default now();

alter table public.orders
alter column status_updated_at
set not null;


-- ============================================================
-- Actualizar status_updated_at solamente cuando cambia status
-- ============================================================

create or replace function public.set_order_status_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.status is distinct from old.status then
    new.status_updated_at := now();
  end if;

  return new;
end;
$$;

drop trigger if exists trg_set_order_status_updated_at
on public.orders;

create trigger trg_set_order_status_updated_at
before update of status
on public.orders
for each row
execute function public.set_order_status_updated_at();


-- ============================================================
-- RPC público de seguimiento
-- IMPORTANTE:
-- orders.id se devuelve con alias order_id
-- ============================================================

drop function if exists public.get_public_order_tracking(text);

create function public.get_public_order_tracking(
  p_tracking_code text
)
returns table (
  order_id uuid,
  tracking_code text,
  status text,
  fulfillment_type text,
  created_at timestamptz,
  updated_at timestamptz,
  customer_name text
)
language plpgsql
security definer
set search_path = ''
as $$
begin
  return query
  select
    o.id as order_id,

    upper(
      split_part(
        o.id::text,
        '-',
        1
      )
    ) as tracking_code,

    o.status::text,
    o.fulfillment_type::text,
    o.created_at,
    o.status_updated_at as updated_at,
    o.customer_name

  from public.orders o

  where
    o.order_source = 'web'

    and upper(
      split_part(
        o.id::text,
        '-',
        1
      )
    ) = upper(
      trim(
        p_tracking_code
      )
    )

  limit 1;
end;
$$;

grant execute
on function public.get_public_order_tracking(text)
to anon;

grant execute
on function public.get_public_order_tracking(text)
to authenticated;