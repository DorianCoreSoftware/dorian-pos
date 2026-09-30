import { supabase } from '../services/supabase';

export type PromotionProgramType =
  | 'collect_reward'
  | 'order_refund';

export interface PromotionRewardRecord {
  id: string;
  program_id: string;
  product_id: string | null;
  display_name: string;
  position: number;
  is_active: boolean;
}

export interface PromotionProgramRecord {
  id: string;
  code: string;
  display_name: string;
  program_type: PromotionProgramType;
  code_prefix: string;
  is_enabled: boolean;
  issue_chance_denominator: number;
  required_coupons: number | null;
  priority: number;
  rewards?: PromotionRewardRecord[] | null;
}

export interface PromoCouponRecord {
  id: string;
  order_id: string;
  code: string;
  program_id: string;
  program_code: string;
  program_name: string;
  program_type: PromotionProgramType;
  code_prefix: string;
  required_coupons: number | null;
  redeemed: boolean;
  redeemed_at: string | null;
  created_at: string;
}

export interface PromotionRefundResult {
  redemptionId: string;
  refundId: string;
  orderId: string;
  paymentMethod: 'cash' | 'card';
  amount: number;
  programId?: string;
  programName?: string;
}

export async function fetchPromotionPrograms(): Promise<PromotionProgramRecord[]> {
  const { data, error } = await supabase
    .from('promotion_programs')
    .select(`
      id,
      code,
      display_name,
      program_type,
      code_prefix,
      is_enabled,
      issue_chance_denominator,
      required_coupons,
      priority,
      rewards:promotion_rewards(
        id,
        program_id,
        product_id,
        display_name,
        position,
        is_active
      )
    `)
    .order('priority', { ascending: true });

  if (error) {
    throw new Error(`No se pudieron cargar los programas de promoción: ${error.message}`);
  }

  return (data ?? []) as unknown as PromotionProgramRecord[];
}

export async function createOrGetOrderPromoCoupon(
  orderId: string,
): Promise<PromoCouponRecord | null> {
  const { data, error } = await supabase.rpc(
    'create_or_get_order_promotion_coupon',
    { p_order_id: orderId },
  );

  if (error) {
    throw new Error(`No se pudo generar el cupón promocional: ${error.message}`);
  }

  if (!Array.isArray(data) || data.length === 0) {
    return null;
  }

  return data[0] as PromoCouponRecord;
}

export async function redeemCollectPromotion(
  programId: string,
  codes: string[],
  rewardId: string,
): Promise<string> {
  const { data, error } = await supabase.rpc(
    'redeem_collect_promotion',
    {
      p_program_id: programId,
      p_codes: codes,
      p_reward_id: rewardId,
    },
  );

  if (error) {
    throw new Error(`No se pudo realizar el canje: ${error.message}`);
  }

  if (!data || typeof data !== 'string') {
    throw new Error('Supabase no devolvió el identificador del canje.');
  }

  return data;
}

export async function redeemOrderRefundPromotion(
  code: string,
): Promise<PromotionRefundResult> {
  const { data, error } = await supabase.rpc(
    'redeem_order_refund_promotion',
    { p_code: code },
  );

  if (error) {
    throw new Error(`No se pudo realizar el reembolso promocional: ${error.message}`);
  }

  if (!data || typeof data !== 'object') {
    throw new Error('Supabase no devolvió la información del reembolso.');
  }

  const result = data as Record<string, unknown>;
  const amount = Number(result.amount);

  if (
    typeof result.redemptionId !== 'string' ||
    typeof result.refundId !== 'string' ||
    typeof result.orderId !== 'string' ||
    (result.paymentMethod !== 'cash' && result.paymentMethod !== 'card') ||
    !Number.isFinite(amount) ||
    amount <= 0
  ) {
    throw new Error('La respuesta del reembolso no tiene el formato esperado.');
  }

  return {
    redemptionId: result.redemptionId,
    refundId: result.refundId,
    orderId: result.orderId,
    paymentMethod: result.paymentMethod,
    amount,
    programId: typeof result.programId === 'string' ? result.programId : undefined,
    programName: typeof result.programName === 'string' ? result.programName : undefined,
  };
}

export async function fetchOrderPromoCoupon(
  orderId: string,
): Promise<PromoCouponRecord | null> {
  const { data, error } = await supabase
    .from('promo_coupons')
    .select(`
      id,
      order_id,
      code,
      redeemed,
      redeemed_at,
      created_at,
      program:promotion_programs!inner(
        id,
        code,
        display_name,
        program_type,
        code_prefix,
        required_coupons
      )
    `)
    .eq('order_id', orderId)
    .maybeSingle();

  if (error) {
    throw new Error(`No se pudo consultar el cupón promocional: ${error.message}`);
  }

  if (!data) {
    return null;
  }

  const row = data as unknown as {
    id: string;
    order_id: string;
    code: string;
    redeemed: boolean;
    redeemed_at: string | null;
    created_at: string;
    program: {
      id: string;
      code: string;
      display_name: string;
      program_type: PromotionProgramType;
      code_prefix: string;
      required_coupons: number | null;
    };
  };

  return {
    id: row.id,
    order_id: row.order_id,
    code: row.code,
    program_id: row.program.id,
    program_code: row.program.code,
    program_name: row.program.display_name,
    program_type: row.program.program_type,
    code_prefix: row.program.code_prefix,
    required_coupons: row.program.required_coupons,
    redeemed: row.redeemed,
    redeemed_at: row.redeemed_at,
    created_at: row.created_at,
  };
}
