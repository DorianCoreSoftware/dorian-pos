import {
  createOrGetOrderPromoCoupon,
  fetchOrderPromoCoupon,
  PromoCouponRecord,
  PromotionProgramRecord,
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
  programType: 'collect_reward' | 'order_refund';
  codePrefix: string;
  isEnabled: boolean;
  issueChanceDenominator: number;
  requiredCoupons: number | null;
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
  programType: 'collect_reward' | 'order_refund';
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
    priority: Number(record.priority ?? 100),
    rewards: (record.rewards ?? [])
      .map(mapReward)
      .filter(reward => reward.isActive)
      .sort((a, b) => a.position - b.position),
  };
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
