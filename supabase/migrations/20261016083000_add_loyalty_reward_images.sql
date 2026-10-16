-- ============================================================
-- WEB REWARDS: PRODUCT IMAGE
-- ============================================================

create or replace function public.get_loyalty_status(
  p_qr_token uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_customer public.loyalty_customers;
  v_total_visits integer;
  v_rewards jsonb;
begin
  select *
  into v_customer
  from public.loyalty_customers
  where qr_token = p_qr_token
    and is_active = true;

  if not found then
    raise exception 'Cliente no encontrado';
  end if;

  select count(*)::integer
  into v_total_visits
  from public.loyalty_visits
  where customer_id = v_customer.id;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', r.id,
        'productId', r.product_id,
        'imageUrl', p.image_url,
        'name', r.name,
        'description', r.description,
        'requiredVisits', r.required_visits,
        'status',
          case
            when red.id is not null then 'redeemed'
            when v_total_visits >= r.required_visits then 'available'
            else 'locked'
          end,
        'visitsRemaining',
          greatest(
            r.required_visits - v_total_visits,
            0
          ),
        'redeemedAt', red.redeemed_at
      )
      order by
        r.required_visits,
        r.position
    ),
    '[]'::jsonb
  )
  into v_rewards
  from public.loyalty_rewards r
  left join public.products p
    on p.id = r.product_id
  left join public.loyalty_redemptions red
    on red.reward_id = r.id
   and red.customer_id = v_customer.id
  where r.is_active = true;

  return jsonb_build_object(
    'customer',
    jsonb_build_object(
      'id', v_customer.id,
      'name', v_customer.name,
      'qrToken', v_customer.qr_token,
      'totalVisits', v_total_visits
    ),
    'rewards',
    v_rewards
  );
end;
$$;

revoke all
on function public.get_loyalty_status(uuid)
from public;

grant execute
on function public.get_loyalty_status(uuid)
to anon, authenticated;