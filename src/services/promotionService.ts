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
  code?: string;
  displayName: string;
  programType: import('../repositories/PromoRepository').PromotionProgramType;
  codePrefix?: string;
  isEnabled: boolean;
  issueChanceDenominator: number;
  requiredCoupons: number | null;
  targetProductId?: string | null;
  targetModifierId?: string | null;
  buyQuantity?: number | null;
  payQuantity?: number | null;
  discountAmount?: number | null;
  fixedPrice?: number | null;
  minimumOrderAmount?: number | null;
  orderDiscountKind?: 'percent' | 'fixed' | null;
  orderDiscountValue?: number | null;
  startsAt?: string | null;
  endsAt?: string | null;
  activeWeekdays?: number[];
  priority: number;

  ticketShowImage?: boolean;
  ticketImageUrl?: string | null;
  ticketImageRasterBase64?: string | null;
  ticketImageWidth?: number | null;
  ticketImageHeight?: number | null;
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

function normalizePromotionCode(
  value: string,
): string {
  return value
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(
      /[\u0300-\u036f]/g,
      '',
    )
    .replace(
      /[^a-z0-9]+/g,
      '_',
    )
    .replace(
      /^_+|_+$/g,
      '',
    )
    .slice(
      0,
      48,
    );
}

function normalizePromotionPrefix(
  value: string,
): string {
  const clean =
    value
      .trim()
      .normalize('NFD')
      .replace(
        /[\u0300-\u036f]/g,
        '',
      )
      .toUpperCase()
      .replace(
        /[^A-Z0-9]/g,
        '',
      )
      .slice(
        0,
        5,
      );

  return clean
    ? `${clean}-`
    : '';
}

export function buildPromotionPrefixSuggestion(
  displayName: string,
): string {
  const stopWords =
    new Set([
      'DE',
      'DEL',
      'LA',
      'LAS',
      'EL',
      'LOS',
      'Y',
      'EN',
      'PARA',
      'POR',
    ]);

  const words =
    displayName
      .trim()
      .normalize('NFD')
      .replace(
        /[\u0300-\u036f]/g,
        '',
      )
      .toUpperCase()
      .split(
        /[^A-Z0-9]+/,
      )
      .filter(
        word =>
          Boolean(word) &&
          !stopWords.has(word),
      );

  if (words.length === 0) {
    return 'PROMO-';
  }

  if (words.length === 1) {
    return `${words[0].slice(0, 3)}-`;
  }

  const initials =
    words
      .map(
        word =>
          word.charAt(0),
      )
      .join('')
      .slice(
        0,
        5,
      );

  if (initials.length >= 2) {
    return `${initials}-`;
  }

  return `${words[0].slice(0, 3)}-`;
}

export async function savePromotionProgram(
  input: PromotionProgramInput,
): Promise<string> {
  const displayName =
    input.displayName.trim();

  if (!displayName) {
    throw new Error(
      'El nombre de la promoción es obligatorio.',
    );
  }

  const code =
    normalizePromotionCode(
      input.code?.trim() ||
      displayName,
    );

  const requestedPrefix =
    normalizePromotionPrefix(
      input.codePrefix ?? '',
    );

  const codePrefix =
    requestedPrefix ||
    buildPromotionPrefixSuggestion(
      displayName,
    );

  if (!Number.isInteger(input.issueChanceDenominator) || input.issueChanceDenominator < 1) {
    throw new Error('La probabilidad debe ser un entero mayor a 0.');
  }

  if (
    input.programType === 'collect_reward' &&
    (!Number.isInteger(input.requiredCoupons) || (input.requiredCoupons ?? 0) < 1)
  ) {
    throw new Error('La cantidad de cupones requeridos debe ser mayor a 0.');
  }

  if (
    input.programType === 'quantity_deal'
  ) {
    if (
      !input.targetProductId?.trim()
    ) {
      throw new Error(
        'Selecciona el producto al que se aplicará la promoción.',
      );
    }

    if (
      !Number.isInteger(
        input.buyQuantity,
      ) ||
      !Number.isInteger(
        input.payQuantity,
      ) ||
      (input.buyQuantity ?? 0) < 2 ||
      (input.payQuantity ?? 0) < 1 ||
      (input.payQuantity ?? 0) >=
        (input.buyQuantity ?? 0)
    ) {
      throw new Error(
        'Configura una promoción válida. Ejemplo: compra 2 y paga 1.',
      );
    }
  }

  if (input.programType === 'modifier_discount') {
    if (!input.targetModifierId?.trim()) {
      throw new Error('Selecciona el modificador de la promoción.');
    }
    if (!Number.isFinite(Number(input.discountAmount)) || (input.discountAmount ?? 0) <= 0) {
      throw new Error('El descuento debe ser mayor a 0.');
    }
  }

  if (input.programType === 'special_price') {
    if (!input.targetProductId?.trim()) {
      throw new Error('Selecciona el producto de la promoción.');
    }
    if (!Number.isFinite(Number(input.fixedPrice)) || (input.fixedPrice ?? 0) < 0) {
      throw new Error('El precio especial no es válido.');
    }
  }

  if (input.programType === 'minimum_spend_discount') {
    if (!Number.isFinite(Number(input.minimumOrderAmount)) || (input.minimumOrderAmount ?? 0) <= 0) {
      throw new Error('El monto mínimo debe ser mayor a 0.');
    }
    if (input.orderDiscountKind !== 'percent' && input.orderDiscountKind !== 'fixed') {
      throw new Error('Selecciona el tipo de descuento.');
    }
    if (!Number.isFinite(Number(input.orderDiscountValue)) || (input.orderDiscountValue ?? 0) <= 0) {
      throw new Error('El valor del descuento debe ser mayor a 0.');
    }
    if (input.orderDiscountKind === 'percent' && (input.orderDiscountValue ?? 0) > 100) {
      throw new Error('El porcentaje no puede ser mayor a 100.');
    }
  }

  const activeWeekdays = (input.activeWeekdays ?? [0,1,2,3,4,5,6])
    .filter(value => Number.isInteger(value) && value >= 0 && value <= 6);

  if (activeWeekdays.length === 0) {
    throw new Error('Selecciona al menos un día de aplicación.');
  }

  if (input.startsAt && input.endsAt && input.endsAt < input.startsAt) {
    throw new Error('La fecha final no puede ser anterior a la inicial.');
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

    target_product_id:
      input.programType === 'quantity_deal' ||
      input.programType === 'special_price'
        ? input.targetProductId
        : null,

    target_modifier_id:
      input.programType === 'modifier_discount'
        ? input.targetModifierId
        : null,

    buy_quantity:
      input.programType === 'quantity_deal'
        ? input.buyQuantity
        : null,

    pay_quantity:
      input.programType === 'quantity_deal'
        ? input.payQuantity
        : null,

    discount_amount:
      input.programType === 'modifier_discount'
        ? input.discountAmount
        : null,

    fixed_price:
      input.programType === 'special_price'
        ? input.fixedPrice
        : null,

    minimum_order_amount:
      input.programType === 'minimum_spend_discount'
        ? input.minimumOrderAmount
        : null,

    order_discount_kind:
      input.programType === 'minimum_spend_discount'
        ? input.orderDiscountKind
        : null,

    order_discount_value:
      input.programType === 'minimum_spend_discount'
        ? input.orderDiscountValue
        : null,

    starts_at: input.startsAt || null,
    ends_at: input.endsAt || null,
    active_weekdays: activeWeekdays,

    ticket_show_image:
      input.ticketShowImage ?? false,

    ticket_image_url:
      input.ticketShowImage
        ? input.ticketImageUrl ?? null
        : null,

    ticket_image_raster_base64:
      input.ticketShowImage
        ? input.ticketImageRasterBase64 ?? null
        : null,

    ticket_image_width:
      input.ticketShowImage
        ? input.ticketImageWidth ?? null
        : null,

    ticket_image_height:
      input.ticketShowImage
        ? input.ticketImageHeight ?? null
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
  if (!input.productId?.trim()) {
    throw new Error('Selecciona un producto válido para el premio.');
  }

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
