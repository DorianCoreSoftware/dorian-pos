-- Dorian POS
-- Detalle seguro de una devolución para reimpresión de comprobantes.

create or replace function public.get_refund_receipt_details(
  p_refund_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $function$
declare
  v_result jsonb;
begin
  if auth.uid() is null then
    raise exception 'Sesión no válida.';
  end if;

  if not exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'admin'::public.user_role
      and coalesce(p.is_active, true) = true
  ) then
    raise exception 'No autorizado.';
  end if;

  select jsonb_build_object(
    'refundId', r.id,
    'refundNumber', r.refund_number,
    'refundType', r.refund_type,
    'orderId', r.order_id,
    'createdAt', r.created_at,
    'paymentMethod', r.payment_method,
    'refundTotal', r.refund_total,
    'reason', r.reason,
    'notes', r.notes,
    'policyException', r.policy_exception,
    'userName',
      nullif(
        trim(
          concat_ws(
            ' ',
            p.first_name,
            p.last_name
          )
        ),
        ''
      ),
    'items',
      coalesce(
        (
          select jsonb_agg(
            jsonb_build_object(
              'productName',
                coalesce(
                  product.name,
                  'Producto'
                ),
              'quantity',
                ri.quantity,
              'unitRefundAmount',
                ri.unit_refund_amount,
              'refundAmount',
                ri.refund_amount
            )
            order by ri.id
          )
          from public.order_refund_items ri
          left join public.products product
            on product.id = ri.product_id
          where ri.refund_id = r.id
        ),
        '[]'::jsonb
      )
  )
  into v_result
  from public.order_refunds r
  left join public.profiles p
    on p.id = r.refunded_by
  where r.id = p_refund_id
    and r.status = 'completed';

  if v_result is null then
    raise exception 'No se encontró la devolución.';
  end if;

  return v_result;
end;
$function$;

revoke execute
on function public.get_refund_receipt_details(uuid)
from public, anon;

grant execute
on function public.get_refund_receipt_details(uuid)
to authenticated;
