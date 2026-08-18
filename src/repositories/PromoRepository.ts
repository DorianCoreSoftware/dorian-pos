import {
  supabase,
} from '../services/supabase';

export type PromoCouponType =
  | 'kong'
  | 'lucky_dorian';

export interface PromoCouponRecord {
  id: string;
  order_id: string;
  code: string;
  coupon_type:
    PromoCouponType;
  redeemed: boolean;
  redeemed_at:
    string | null;
  created_at: string;
}

export async function createOrGetOrderPromoCoupon(
  orderId: string,
): Promise<PromoCouponRecord> {
  const {
    data,
    error,
  } =
    await supabase.rpc(
      'create_or_get_order_promo_coupon',
      {
        p_order_id:
          orderId,
      },
    );

  if (error) {
    throw new Error(
      `No se pudo generar el cupón promocional: ${error.message}`,
    );
  }

  if (
    !Array.isArray(data) ||
    data.length === 0
  ) {
    throw new Error(
      'Supabase no devolvió el cupón promocional.',
    );
  }

  return data[0] as PromoCouponRecord;
}

export type PromoReward =
  | 'special_burger'
  | 'boneless_150'
  | 'wings_6'
  | 'large_fries'
  | 'kong_shake';

export async function redeemKongCoupons(
  codes: string[],
  reward: PromoReward,
): Promise<string> {
  const {
    data,
    error,
  } =
    await supabase.rpc(
      'redeem_kong_coupons',
      {
        p_codes:
          codes,

        p_reward:
          reward,
      },
    );

  if (error) {
    throw new Error(
      `No se pudieron canjear los Kongs: ${error.message}`,
    );
  }

  if (
    !data ||
    typeof data !== 'string'
  ) {
    throw new Error(
      'Supabase no devolvió el identificador del canje.',
    );
  }

  return data;
}

export async function redeemLuckyDorian(
  code: string,
): Promise<string> {
  const {
    data,
    error,
  } =
    await supabase.rpc(
      'redeem_lucky_dorian',
      {
        p_code:
          code,
      },
    );

  if (error) {
    throw new Error(
      `No se pudo canjear el Dorian de la Suerte: ${error.message}`,
    );
  }

  if (
    !data ||
    typeof data !== 'string'
  ) {
    throw new Error(
      'Supabase no devolvió el identificador del canje.',
    );
  }

  return data;
}