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