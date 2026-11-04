import {
  createOrGetOrderPromoCoupon,
  fetchOrderPromoCoupon,
  PromoCouponRecord,
  PromotionProgramRecord,
  PromotionProgramType,
  PromotionRefundResult,
  PromotionRewardRecord,
  redeemCollectPromotion,
  redeemOrderRefundPromotion,
} from '../repositories/PromoRepository';

export interface PromotionReward {
  id: string;
  productId: string | null;
  displayName: string;
  position: number;
  isActive: boolean;
}

export interface PromotionProgram {
  id: string;
  code: string;
  displayName: string;
  programType: PromotionProgramType;
  codePrefix: string;
  isEnabled: boolean;
  issueChanceDenominator: number;
  requiredCoupons: number | null;
  targetProductId: string | null;
  targetModifierId: string | null;
  buyQuantity: number | null;
  payQuantity: number | null;
  discountAmount: number | null;
  fixedPrice: number | null;
  minimumOrderAmount: number | null;
  orderDiscountKind: 'percent' | 'fixed' | null;
  orderDiscountValue: number | null;
  startsAt: string | null;
  endsAt: string | null;
  activeWeekdays: number[];
  priority: number;
  rewards: PromotionReward[];
}

export interface PromoCoupon {
  id: string;
  orderId: string;
  code: string;
  programId: string;
  programCode: string;
  programName: string;
  programType: PromotionProgramType;
  codePrefix: string;
  requiredCoupons: number | null;
  redeemed: boolean;
  redeemedAt: string | null;
  createdAt: string;
}

function mapReward(record: PromotionRewardRecord): PromotionReward {
  return {
    id: record.id,
    productId: record.product_id,
    displayName: record.display_name,
    position: Number(record.position ?? 0),
    isActive: Boolean(record.is_active),
  };
}

export function mapPromotionProgram(record: PromotionProgramRecord): PromotionProgram {
  return {
    id: record.id,
    code: record.code,
    displayName: record.display_name,
    programType: record.program_type,
    codePrefix: record.code_prefix,
    isEnabled: Boolean(record.is_enabled),
    issueChanceDenominator: Number(record.issue_chance_denominator ?? 1),
    requiredCoupons:
      record.required_coupons === null
        ? null
        : Number(record.required_coupons),

    targetProductId:
      record.target_product_id ?? null,

    buyQuantity:
      record.buy_quantity === null
        ? null
        : Number(record.buy_quantity),

    payQuantity:
      record.pay_quantity === null
        ? null
        : Number(record.pay_quantity),

    targetModifierId:
      record.target_modifier_id ?? null,

    discountAmount:
      record.discount_amount === null
        ? null
        : Number(record.discount_amount),

    fixedPrice:
      record.fixed_price === null
        ? null
        : Number(record.fixed_price),

    minimumOrderAmount:
      record.minimum_order_amount === null
        ? null
        : Number(record.minimum_order_amount),

    orderDiscountKind:
      record.order_discount_kind ?? null,

    orderDiscountValue:
      record.order_discount_value === null
        ? null
        : Number(record.order_discount_value),

    startsAt:
      record.starts_at ?? null,

    endsAt:
      record.ends_at ?? null,

    activeWeekdays:
      Array.isArray(record.active_weekdays)
        ? record.active_weekdays.map(Number)
        : [0, 1, 2, 3, 4, 5, 6],

    priority: Number(record.priority ?? 100),
    rewards: (record.rewards ?? [])
      .map(mapReward)
      .filter(reward => reward.isActive)
      .sort((a, b) => a.position - b.position),
  };
}

export function isPromotionActiveNow(
  program: PromotionProgram,
  date: Date = new Date(),
): boolean {
  if (!program.isEnabled) return false;

  const iso = [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('-');

  if (program.startsAt && iso < program.startsAt) return false;
  if (program.endsAt && iso > program.endsAt) return false;

  return program.activeWeekdays.length === 0 ||
    program.activeWeekdays.includes(date.getDay());
}

function mapCoupon(record: PromoCouponRecord): PromoCoupon {
  return {
    id: record.id,
    orderId: record.order_id,
    code: record.code,
    programId: record.program_id,
    programCode: record.program_code,
    programName: record.program_name,
    programType: record.program_type,
    codePrefix: record.code_prefix,
    requiredCoupons: record.required_coupons,
    redeemed: record.redeemed,
    redeemedAt: record.redeemed_at,
    createdAt: record.created_at,
  };
}

export async function getOrCreateOrderPromoCoupon(
  orderId: string,
): Promise<PromoCoupon | null> {
  if (!orderId?.trim()) {
    throw new Error('El identificador de la orden es obligatorio.');
  }

  const record = await createOrGetOrderPromoCoupon(orderId);
  return record ? mapCoupon(record) : null;
}

export async function getExistingOrderPromoCoupon(
  orderId: string,
): Promise<PromoCoupon | null> {
  if (!orderId?.trim()) {
    throw new Error('La orden no es válida.');
  }

  const record = await fetchOrderPromoCoupon(orderId);
  return record ? mapCoupon(record) : null;
}

export async function redeemPromotionCodes(input: {
  program: PromotionProgram;
  codes: string[];
  rewardId: string;
  orderId?: string | null;
}): Promise<string> {
  const { program } = input;

  if (program.programType !== 'collect_reward') {
    throw new Error('La promoción seleccionada no admite acumulación de códigos.');
  }

  const required = program.requiredCoupons ?? 0;
  const codes = input.codes.map(code => (code ?? '').trim().toUpperCase());

  if (!Number.isInteger(required) || required < 1) {
    throw new Error('La cantidad requerida de cupones no es válida.');
  }

  if (codes.length !== required || codes.some(code => !code)) {
    throw new Error(`Ingresa exactamente ${required} códigos.`);
  }

  if (new Set(codes).size !== required) {
    throw new Error('Todos los códigos deben ser diferentes.');
  }

  const selectedReward =
    program.rewards.find(reward => reward.id === input.rewardId) ?? null;

  if (!selectedReward) {
    throw new Error('Selecciona un premio válido.');
  }

  if (!selectedReward.productId) {
    throw new Error('Este premio no está ligado a un producto. Corrígelo en Administración.');
  }

  return redeemCollectPromotion(
    program.id,
    codes,
    input.rewardId,
    input.orderId ?? null,
  );
}

export async function redeemRefundPromotion(
  program: PromotionProgram,
  code: string,
): Promise<PromotionRefundResult> {
  const normalizedCode = (code ?? '').trim().toUpperCase();

  if (program.programType !== 'order_refund') {
    throw new Error('La promoción seleccionada no corresponde a un reembolso.');
  }

  if (!normalizedCode) {
    throw new Error('Ingresa el código promocional.');
  }

  return redeemOrderRefundPromotion(normalizedCode);
}
