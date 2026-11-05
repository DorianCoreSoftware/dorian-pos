-- ============================================================
-- HISTORIAL PRIVADO DE CÓDIGOS PROMOCIONALES PARA CLIENTE WEB
-- 2026-11-05
-- ============================================================
--
-- No expone promo_coupons directamente.
-- La sesión resuelve customer_id y únicamente devuelve cupones de
-- órdenes vinculadas a esa cuenta web.
-- ============================================================

create or replace function public.get_my_web_promotion_codes(
  p_session_token text,
  p_limit integer default 100,
  p_offset integer default 0
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_customer_id uuid;
  v_limit integer;
  v_offset integer;
  v_result jsonb;
begin
  v_customer_id :=
    public.resolve_web_customer_session(
      p_session_token
    );

  v_limit :=
    least(
      greatest(
        coalesce(
          p_limit,
          100
        ),
        1
      ),
      200
    );

  v_offset :=
    greatest(
      coalesce(
        p_offset,
        0
      ),
      0
    );

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', rows.id,
        'orderId', rows.order_id,
        'orderTrackingCode',
          upper(
            split_part(
              rows.order_id::text,
              '-',
              1
            )
          ),
        'code', rows.code,
        'programId', rows.program_id,
        'programName', rows.program_name,
        'programType', rows.program_type,
        'requiredCoupons', rows.required_coupons,
        'status',
          case
            when rows.voided then 'voided'
            when rows.redeemed then 'redeemed'
            else 'available'
          end,
        'redeemedAt', rows.redeemed_at,
        'voidedAt', rows.voided_at,
        'createdAt', rows.created_at
      )
      order by
        case
          when not rows.voided
           and not rows.redeemed
          then 0
          else 1
        end asc,
        rows.created_at desc
    ),
    '[]'::jsonb
  )
  into v_result
  from (
    select
      pc.id,
      pc.order_id,
      pc.code,
      pc.program_id,
      pc.redeemed,
      pc.redeemed_at,
      pc.voided,
      pc.voided_at,
      pc.created_at,
      pp.display_name as program_name,
      pp.program_type,
      pp.required_coupons
    from public.promo_coupons pc
    inner join public.orders o
      on o.id = pc.order_id
    inner join public.promotion_programs pp
      on pp.id = pc.program_id
    where
      o.customer_id = v_customer_id
      and o.order_source = 'web'
    order by
      case
        when not pc.voided
         and not pc.redeemed
        then 0
        else 1
      end asc,
      pc.created_at desc
    limit v_limit
    offset v_offset
  ) rows;

  return v_result;
end;
$$;

revoke all
on function public.get_my_web_promotion_codes(
  text,
  integer,
  integer
)
from public;

grant execute
on function public.get_my_web_promotion_codes(
  text,
  integer,
  integer
)
to anon, authenticated;

comment on function public.get_my_web_promotion_codes(
  text,
  integer,
  integer
) is
'Devuelve el historial privado de códigos promocionales emitidos en pedidos web vinculados a la sesión del cliente.';
