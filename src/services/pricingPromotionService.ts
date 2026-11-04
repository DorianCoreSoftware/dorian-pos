import {
  Cart,
} from '../types';

import {
  supabase,
} from './supabase';

export type PricingPromotionType =
  | 'special_price'
  | 'minimum_spend_discount';

export interface PricingPromotion {
  id: string;
  displayName: string;
  programType: PricingPromotionType;
  targetProductId: string | null;
  productName: string | null;
  fixedPrice: number | null;
  minimumOrderAmount: number | null;
  orderDiscountKind: 'percent' | 'fixed' | null;
  orderDiscountValue: number | null;
  priority: number;
}

export interface PricingPromotionDiscountLine {
  promotionId: string;
  promotionName: string;
  label: string;
  discountAmount: number;
}

export interface PricingPromotionDiscountSummary {
  totalDiscount: number;
  lines: PricingPromotionDiscountLine[];
}

interface PricingPromotionRecord {
  id: string;
  display_name: string;
  program_type: PricingPromotionType;
  target_product_id: string | null;
  product_name: string | null;
  fixed_price: number | string | null;
  minimum_order_amount: number | string | null;
  order_discount_kind: 'percent' | 'fixed' | null;
  order_discount_value: number | string | null;
  priority: number | string;
}

export async function getActivePricingPromotions(): Promise<PricingPromotion[]> {
  const {
    data,
    error,
  } = await supabase.rpc(
    'get_active_pricing_promotions',
  );

  if (error) {
    throw new Error(
      `No se pudieron cargar las promociones de precio: ${error.message}`,
    );
  }

  return (
    (data ?? []) as PricingPromotionRecord[]
  ).map(
    row => ({
      id: row.id,
      displayName: row.display_name,
      programType: row.program_type,
      targetProductId: row.target_product_id,
      productName: row.product_name,
      fixedPrice: row.fixed_price === null ? null : Number(row.fixed_price),
      minimumOrderAmount: row.minimum_order_amount === null ? null : Number(row.minimum_order_amount),
      orderDiscountKind: row.order_discount_kind,
      orderDiscountValue: row.order_discount_value === null ? null : Number(row.order_discount_value),
      priority: Number(row.priority),
    }),
  );
}

export function calculatePricingPromotionDiscount(
  cart: Cart,
  promotions: PricingPromotion[],
  amountAfterExistingDiscounts: number,
  excludedProductIds: string[] = [],
): PricingPromotionDiscountSummary {
  const lines: PricingPromotionDiscountLine[] = [];

  const productQuantities =
    new Map<
      string,
      {
        quantity: number;
        unitPrice: number;
      }
    >();

  let originalProductSubtotal = 0;

  for (const item of cart) {
    const unitPrice = Number(item.product.price);

    if (!Number.isFinite(unitPrice) || unitPrice < 0 || item.quantity <= 0) {
      continue;
    }

    originalProductSubtotal += unitPrice * item.quantity;

    const current = productQuantities.get(item.product.id);
    if (!current) {
      productQuantities.set(item.product.id, {
        quantity: item.quantity,
        unitPrice,
      });
      continue;
    }

    current.quantity += item.quantity;
    current.unitPrice = Math.min(current.unitPrice, unitPrice);
  }

  const excludedProducts =
    new Set(
      excludedProductIds,
    );

  const specialPriceByProduct =
    new Map<string, PricingPromotion>();

  const minimumSpendPromotions: PricingPromotion[] = [];

  for (const promotion of promotions) {
    if (
      promotion.programType === 'special_price' &&
      promotion.targetProductId &&
      !excludedProducts.has(
        promotion.targetProductId,
      ) &&
      promotion.fixedPrice !== null
    ) {
      const previous = specialPriceByProduct.get(promotion.targetProductId);
      if (!previous || promotion.priority < previous.priority) {
        specialPriceByProduct.set(promotion.targetProductId, promotion);
      }
      continue;
    }

    if (promotion.programType === 'minimum_spend_discount') {
      minimumSpendPromotions.push(promotion);
    }
  }

  let specialPriceDiscount = 0;

  for (const [productId, promotion] of specialPriceByProduct.entries()) {
    const item = productQuantities.get(productId);
    if (!item || promotion.fixedPrice === null) continue;

    const discountPerUnit = Math.max(0, item.unitPrice - promotion.fixedPrice);
    const discountAmount = discountPerUnit * item.quantity;
    if (discountAmount <= 0) continue;

    specialPriceDiscount += discountAmount;
    lines.push({
      promotionId: promotion.id,
      promotionName: promotion.displayName,
      label: `${promotion.displayName} · ${promotion.productName ?? 'Producto'}`,
      discountAmount,
    });
  }

  const selectedMinimum = minimumSpendPromotions
    .filter(promotion =>
      promotion.minimumOrderAmount !== null &&
      originalProductSubtotal >= promotion.minimumOrderAmount,
    )
    .sort((a, b) => a.priority - b.priority)[0] ?? null;

  let minimumSpendDiscount = 0;

  if (
    selectedMinimum &&
    selectedMinimum.orderDiscountKind &&
    selectedMinimum.orderDiscountValue !== null
  ) {
    const eligibleAmount = Math.max(
      0,
      amountAfterExistingDiscounts - specialPriceDiscount,
    );

    minimumSpendDiscount =
      selectedMinimum.orderDiscountKind === 'percent'
        ? eligibleAmount * (selectedMinimum.orderDiscountValue / 100)
        : Math.min(eligibleAmount, selectedMinimum.orderDiscountValue);

    if (minimumSpendDiscount > 0) {
      lines.push({
        promotionId: selectedMinimum.id,
        promotionName: selectedMinimum.displayName,
        label:
          selectedMinimum.orderDiscountKind === 'percent'
            ? `${selectedMinimum.displayName} · ${selectedMinimum.orderDiscountValue}%`
            : selectedMinimum.displayName,
        discountAmount: minimumSpendDiscount,
      });
    }
  }

  return {
    totalDiscount: specialPriceDiscount + minimumSpendDiscount,
    lines,
  };
}
