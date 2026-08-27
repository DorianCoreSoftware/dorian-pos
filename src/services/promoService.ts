import {
  createOrGetOrderPromoCoupon,
  fetchOrderPromoCoupon,
  LuckyDorianRefundResult,
  PromoCouponRecord,
  PromoCouponType,
  PromoReward,
  redeemKongCoupons,
  redeemLuckyDorian,
} from '../repositories/PromoRepository';
import { getPromotionSettings } from './promotionService';

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
): Promise<PromoCoupon | null> {
  validateOrderId(
    orderId,
  );

  const record =
    await createOrGetOrderPromoCoupon(
      orderId,
    );

  if (!record) {
    return null;
  }

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

export interface RedeemKongsInput {
  codes: string[];
  reward:
    PromoReward;
}

export interface PromoRewardOption {
  value:
    PromoReward;

  label: string;
}

export const PROMO_REWARD_OPTIONS:
  PromoRewardOption[] = [
    {
      value:
        'special_burger',

      label:
        'Hamburguesa especial',
    },
    {
      value:
        'boneless_150',

      label:
        'Boneless 150 g',
    },
    {
      value:
        'wings_6',

      label:
        'Alitas 6 piezas',
    },
    {
      value:
        'large_fries',

      label:
        'Papas grandes',
    },
    {
      value:
        'kong_shake',

      label:
        'Malteada Kong',
    },
  ];

export async function redeemKongs(
  input:
    RedeemKongsInput,
): Promise<string> {
  const normalizedCodes =
    normalizeKongCodes(
      input.codes,
    );

  const settings =
    await getPromotionSettings();

  validateKongCodes(
    normalizedCodes,
    settings.required_kongs,
  );

  validateReward(
    input.reward,
  );

  return redeemKongCoupons(
    normalizedCodes,
    input.reward,
  );
}

export async function redeemDorian(
  code: string,
): Promise<LuckyDorianRefundResult> {
  const normalizedCode =
    normalizePromoCode(
      code,
    );

  if (!normalizedCode) {
    throw new Error(
      'Ingresa el código del Dorian de la Suerte.',
    );
  }

  if (
    !normalizedCode.startsWith(
      'BK-D',
    )
  ) {
    throw new Error(
      'El código no tiene el formato de un Dorian de la Suerte.',
    );
  }

  return redeemLuckyDorian(
    normalizedCode,
  );
}

function normalizeKongCodes(
  codes: string[],
): string[] {
  return codes.map(
    normalizePromoCode,
  );
}

function normalizePromoCode(
  code: string,
): string {
  return (
    code ??
    ''
  )
    .trim()
    .toUpperCase();
}

function validateKongCodes(
  codes: string[],
  requiredKongs: number,
): void {
  if (
    !Number.isInteger(
      requiredKongs,
    ) ||
    requiredKongs <
    1
  ) {
    throw new Error(
      'La configuración de Kongs no es válida.',
    );
  }

  if (
    !Array.isArray(
      codes,
    ) ||
    codes.length !==
    requiredKongs
  ) {
    throw new Error(
      `Se necesitan exactamente ${requiredKongs} códigos Kong.`,
    );
  }

  if (
    codes.some(
      (
        code,
      ) =>
        !code,
    )
  ) {
    throw new Error(
      `Ingresa los ${requiredKongs} códigos Kong.`,
    );
  }

  if (
    codes.some(
      (
        code,
      ) =>
        !code.startsWith(
          'BK-K',
        ),
    )
  ) {
    throw new Error(
      'Uno o más códigos no tienen el formato de un Kong.',
    );
  }

  const uniqueCodes =
    new Set(
      codes,
    );

  if (
    uniqueCodes.size !==
    requiredKongs
  ) {
    throw new Error(
      `Los ${requiredKongs} códigos Kong deben ser diferentes.`,
    );
  }
}

function validateReward(
  reward:
    PromoReward,
): void {
  const validReward =
    PROMO_REWARD_OPTIONS.some(
      (
        option,
      ) =>
        option.value ===
        reward,
    );

  if (!validReward) {
    throw new Error(
      'Selecciona un premio válido.',
    );
  }
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

export async function getExistingOrderPromoCoupon(
  orderId: string,
): Promise<PromoCoupon | null> {
  if (!orderId?.trim()) {
    throw new Error(
      'La orden no es válida.',
    );
  }

  const coupon =
    await fetchOrderPromoCoupon(
      orderId,
    );

  if (!coupon) {
    return null;
  }

  return {
    id:
      coupon.id,

    orderId:
      coupon.order_id,

    code:
      coupon.code,

    couponType:
      coupon.coupon_type,

    redeemed:
      coupon.redeemed,

    redeemedAt:
      coupon.redeemed_at,

    createdAt:
      coupon.created_at,
  };
}