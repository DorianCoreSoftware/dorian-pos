/*
 * ============================================================
 * TRACKING PÚBLICO DE PEDIDOS
 * ============================================================
 *
 * Permite consultar un pedido web usando su código corto
 * de seguimiento.
 *
 * No expone teléfono, dirección, precios internos ni datos
 * sensibles.
 */


/*
 * ============================================================
 * 1. FUNCIÓN PÚBLICA
 * ============================================================
 */

create or replace function public.get_public_order_tracking(
  p_tracking_code text
)
returns table (
  order_id uuid,
  tracking_code text,
  status text,
  fulfillment_type text,
  created_at timestamptz,
  customer_name text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_tracking_code text;
begin
  v_tracking_code :=
    upper(
      trim(
        coalesce(
          p_tracking_code,
          ''
        )
      )
    );

  if
    v_tracking_code = ''
    or length(v_tracking_code) <> 8
  then
    raise exception
      'El código de seguimiento no es válido.';
  end if;

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

    o.status,

    o.fulfillment_type,

    o.created_at,

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
    ) = v_tracking_code

  order by
    o.created_at desc

  limit 1;
end;
$$;


/*
 * ============================================================
 * 2. PERMISOS
 * ============================================================
 */

revoke all
on function public.get_public_order_tracking(text)
from public;

revoke all
on function public.get_public_order_tracking(text)
from anon;

revoke all
on function public.get_public_order_tracking(text)
from authenticated;


grant execute
on function public.get_public_order_tracking(text)
to anon;

grant execute
on function public.get_public_order_tracking(text)
to authenticated;