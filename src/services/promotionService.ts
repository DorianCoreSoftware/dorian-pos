import { supabase } from './supabase';
import {
  fetchPromotionPrograms,
  PromotionProgramRecord,
} from '../repositories/PromoRepository';
import {
  mapPromotionProgram,
  PromotionProgram,
} from './promoService';

export interface PromotionProgramInput {
  id?: string;
  code: string;
  displayName: string;
  programType: 'collect_reward' | 'order_refund';
  codePrefix: string;
  isEnabled: boolean;
  issueChanceDenominator: number;
  requiredCoupons: number | null;
  priority: number;
}

export interface PromotionRewardInput {
  id?: string;
  programId: string;
  productId: string | null;
  displayName: string;
  position: number;
  isActive: boolean;
}

export async function getPromotionPrograms(): Promise<PromotionProgram[]> {
  const records = await fetchPromotionPrograms();
  return records.map(mapPromotionProgram);
}

export async function savePromotionProgram(
  input: PromotionProgramInput,
): Promise<string> {
  const code = input.code.trim().toLowerCase().replace(/[^a-z0-9_-]+/g, '_');
  const displayName = input.displayName.trim();
  const codePrefix = input.codePrefix.trim().toUpperCase().replace(/\s+/g, '');

  if (!code || !displayName || !codePrefix) {
    throw new Error('Código, nombre y prefijo son obligatorios.');
  }

  if (!Number.isInteger(input.issueChanceDenominator) || input.issueChanceDenominator < 1) {
    throw new Error('La probabilidad debe ser un entero mayor a 0.');
  }

  if (
    input.programType === 'collect_reward' &&
    (!Number.isInteger(input.requiredCoupons) || (input.requiredCoupons ?? 0) < 1)
  ) {
    throw new Error('La cantidad de cupones requeridos debe ser mayor a 0.');
  }

  const payload = {
    code,
    display_name: displayName,
    program_type: input.programType,
    code_prefix: codePrefix,
    is_enabled: input.isEnabled,
    issue_chance_denominator: input.issueChanceDenominator,
    required_coupons:
      input.programType === 'collect_reward'
        ? input.requiredCoupons
        : null,
    priority: Number.isInteger(input.priority) ? input.priority : 100,
  };

  if (input.id) {
    const { error } = await supabase
      .from('promotion_programs')
      .update(payload)
      .eq('id', input.id);

    if (error) {
      throw new Error(`No se pudo actualizar la promoción: ${error.message}`);
    }

    return input.id;
  }

  const { data, error } = await supabase
    .from('promotion_programs')
    .insert(payload)
    .select('id')
    .single();

  if (error) {
    throw new Error(`No se pudo crear la promoción: ${error.message}`);
  }

  return String(data.id);
}

export async function savePromotionReward(
  input: PromotionRewardInput,
): Promise<string> {
  if (!input.displayName.trim()) {
    throw new Error('El nombre del premio es obligatorio.');
  }

  const payload = {
    program_id: input.programId,
    product_id: input.productId,
    display_name: input.displayName.trim(),
    position: Number.isInteger(input.position) ? input.position : 0,
    is_active: input.isActive,
  };

  if (input.id) {
    const { error } = await supabase
      .from('promotion_rewards')
      .update(payload)
      .eq('id', input.id);

    if (error) {
      throw new Error(`No se pudo actualizar el premio: ${error.message}`);
    }

    return input.id;
  }

  const { data, error } = await supabase
    .from('promotion_rewards')
    .insert(payload)
    .select('id')
    .single();

  if (error) {
    throw new Error(`No se pudo crear el premio: ${error.message}`);
  }

  return String(data.id);
}

export async function deletePromotionReward(rewardId: string): Promise<void> {
  const { error } = await supabase
    .from('promotion_rewards')
    .delete()
    .eq('id', rewardId);

  if (error) {
    throw new Error(`No se pudo eliminar el premio: ${error.message}`);
  }
}

export async function deletePromotionProgram(programId: string): Promise<void> {
  const { error } = await supabase
    .from('promotion_programs')
    .delete()
    .eq('id', programId);

  if (error) {
    throw new Error(
      'No se puede eliminar una promoción que ya tiene cupones o historial. Desactívala en su lugar.',
    );
  }
}
