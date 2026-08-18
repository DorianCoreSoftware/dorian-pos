import {
  createOrGetOrderPromoCoupon,
  PromoCouponRecord,
  PromoCouponType,
} from '../repositories/PromoRepository';

export interface PromoCoupon {
  id: string;
  orderId: string;
  code: string;
  couponType:
    PromoCouponType;
  redeemed: boolean;
  redeemedAt:
    string | null;
  createdAt: string;
}

export async function getOrCreateOrderPromoCoupon(
  orderId: string,
): Promise<PromoCoupon> {
  validateOrderId(
    orderId,
  );

  const record:
    PromoCouponRecord =
    await createOrGetOrderPromoCoupon(
      orderId,
    );

  return {
    id:
      record.id,

    orderId:
      record.order_id,

    code:
      record.code,

    couponType:
      record.coupon_type,

    redeemed:
      record.redeemed,

    redeemedAt:
      record.redeemed_at,

    createdAt:
      record.created_at,
  };
}

function validateOrderId(
  orderId: string,
): void {
  if (
    !orderId?.trim()
  ) {
    throw new Error(
      'El identificador de la orden es obligatorio.',
    );
  }
}