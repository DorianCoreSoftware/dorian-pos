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
): Promise<PromoCouponRecord | null> {
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
    !Array.isArray(
      data,
    ) ||
    data.length ===
      0
  ) {
    return null;
  }

  return data[
    0
  ] as PromoCouponRecord;
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
    typeof data !==
      'string'
  ) {
    throw new Error(
      'Supabase no devolvió el identificador del canje.',
    );
  }

  return data;
}

/*
 * ============================
 * DORIAN DE LA SUERTE
 * ============================
 */

export interface LuckyDorianRefundResult {
  redemptionId: string;

  refundId: string;

  orderId: string;

  paymentMethod:
    | 'cash'
    | 'card';

  amount: number;
}

export async function redeemLuckyDorian(
  code: string,
): Promise<LuckyDorianRefundResult> {
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
    typeof data !==
      'object'
  ) {
    throw new Error(
      'Supabase no devolvió la información del reembolso.',
    );
  }

  const result =
    data as {
      redemptionId?:
        unknown;

      refundId?:
        unknown;

      orderId?:
        unknown;

      paymentMethod?:
        unknown;

      amount?:
        unknown;
    };

  if (
    typeof result.redemptionId !==
      'string' ||
    typeof result.refundId !==
      'string' ||
    typeof result.orderId !==
      'string' ||
    (
      result.paymentMethod !==
        'cash' &&
      result.paymentMethod !==
        'card'
    ) ||
    (
      typeof result.amount !==
        'number' &&
      typeof result.amount !==
        'string'
    )
  ) {
    throw new Error(
      'La respuesta del reembolso no tiene el formato esperado.',
    );
  }

  const amount =
    Number(
      result.amount,
    );

  if (
    !Number.isFinite(
      amount,
    ) ||
    amount <= 0
  ) {
    throw new Error(
      'Supabase devolvió un monto de reembolso inválido.',
    );
  }

  return {
    redemptionId:
      result.redemptionId,

    refundId:
      result.refundId,

    orderId:
      result.orderId,

    paymentMethod:
      result.paymentMethod,

    amount,
  };
}

export async function fetchOrderPromoCoupon(
  orderId: string,
): Promise<PromoCouponRecord | null> {
  const {
    data,
    error,
  } =
    await supabase
      .from(
        'promo_coupons',
      )
      .select('*')
      .eq(
        'order_id',
        orderId,
      )
      .maybeSingle();

  if (error) {
    throw new Error(
      `No se pudo consultar el cupón promocional: ${error.message}`,
    );
  }

  if (!data) {
    return null;
  }

  return data as PromoCouponRecord;
}