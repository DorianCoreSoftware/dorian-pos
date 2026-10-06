-- =========================================================
-- DORIAN POS
-- GENERIC PROMOTION ACTIVITY REPORT
-- =========================================================

create or replace function public.get_promotion_activity_report(
  p_from timestamptz,
  p_to timestamptz
)
returns table (
  event_id text,
  event_at timestamptz,
  promotion_id uuid,
  promotion_name text,
  promotion_type text,
  benefit_name text,
  codes text,
  order_references text,
  amount numeric,
  applications_count integer,
  user_name text
)
language plpgsql
security definer
set search_path = 'public'
as $$
begin
  if p_from is null or p_to is null or p_to <= p_from then
    raise exception 'El rango de fechas no es válido.';
  end if;

  if not exists (
    select 1
    from public.profiles profile
    where profile.id = auth.uid()
      and profile.role = 'admin'::public.user_role
      and coalesce(profile.is_active, true) = true
  ) then
    raise exception 'Solo un administrador puede consultar reportes de promociones.';
  end if;

  return query
  with redemption_events as (
    select
      redemption.id::text as event_id,
      redemption.created_at as event_at,
      program.id as promotion_id,
      program.display_name as promotion_name,
      program.program_type as promotion_type,
      case
        when program.program_type = 'order_refund'
          then 'Reembolso de compra'
        else coalesce(reward.display_name, redemption.reward, 'Premio')
      end as benefit_name,
      (
        select string_agg(coupon.code, ', ' order by coupon.code)
        from public.promo_coupons coupon
        where coupon.redemption_id = redemption.id
      ) as codes,
      (
        select string_agg(
          distinct ('#' || upper(left(coupon.order_id::text, 4))),
          ', '
        )
        from public.promo_coupons coupon
        where coupon.redemption_id = redemption.id
      ) as order_references,
      coalesce(refund.amount, 0)::numeric as amount,
      greatest(
        coalesce((
          select count(*)
          from public.promo_coupons coupon
          where coupon.redemption_id = redemption.id
        ), 0),
        1
      )::integer as applications_count,
      nullif(
        trim(concat_ws(' ', profile.first_name, profile.last_name)),
        ''
      ) as user_name
    from public.promo_redemptions redemption
    join public.promotion_programs program
      on program.id = redemption.program_id
    left join public.promotion_rewards reward
      on reward.id = redemption.reward_id
    left join public.cash_refunds refund
      on refund.promo_redemption_id = redemption.id
    left join public.profiles profile
      on profile.id = redemption.redeemed_by
    where redemption.created_at >= p_from
      and redemption.created_at < p_to
  ),
  modifier_events as (
    select
      (
        'modifier:' || discount.order_id::text || ':' ||
        discount.modifier_id::text || ':' ||
        md5(discount.promotion_name)
      ) as event_id,
      min(discount.created_at) as event_at,
      null::uuid as promotion_id,
      discount.promotion_name as promotion_name,
      'modifier_discount'::text as promotion_type,
      modifier.name as benefit_name,
      null::text as codes,
      ('#' || upper(left(discount.order_id::text, 4))) as order_references,
      sum(discount.discount_amount)::numeric as amount,
      count(*)::integer as applications_count,
      null::text as user_name
    from public.order_modifier_promotion_discounts discount
    join public.modifiers modifier
      on modifier.id = discount.modifier_id
    where discount.created_at >= p_from
      and discount.created_at < p_to
    group by
      discount.order_id,
      discount.modifier_id,
      discount.promotion_name,
      modifier.name
  )
  select * from redemption_events
  union all
  select * from modifier_events
  order by event_at desc;
end;
$$;

grant execute
on function public.get_promotion_activity_report(timestamptz, timestamptz)
to authenticated;
