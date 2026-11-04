import {
  Cart,
} from '../types';

import {
  supabase,
} from './supabase';

export interface QuantityPromotion {
  id: string;
  displayName: string;
  targetProductId: string;
  productName: string;
  buyQuantity: number;
  payQuantity: number;
  priority: number;
}

export interface QuantityPromotionDiscountLine {
  promotionId: string;
  promotionName: string;
  productId: string;
  productName: string;
  qualifyingQuantity: number;
  freeQuantity: number;
  discountAmount: number;
  label: string;
}

export interface QuantityPromotionDiscountSummary {
  totalDiscount: number;
  lines: QuantityPromotionDiscountLine[];
}

interface ActiveQuantityPromotionRecord {
  id: string;
  display_name: string;
  target_product_id: string;
  product_name: string;
  buy_quantity: number | string;
  pay_quantity: number | string;
  priority: number | string;
}

export async function getActiveQuantityPromotions(): Promise<QuantityPromotion[]> {
  const {
    data,
    error,
  } = await supabase.rpc(
    'get_active_quantity_promotions',
  );

  if (error) {
    throw new Error(
      `No se pudieron cargar las promociones por cantidad: ${error.message}`,
    );
  }

  return (
    (data ?? []) as ActiveQuantityPromotionRecord[]
  ).map(
    record => ({
      id:
        record.id,

      displayName:
        record.display_name,

      targetProductId:
        record.target_product_id,

      productName:
        record.product_name,

      buyQuantity:
        Number(
          record.buy_quantity,
        ),

      payQuantity:
        Number(
          record.pay_quantity,
        ),

      priority:
        Number(
          record.priority,
        ),
    }),
  );
}

export function calculateQuantityPromotionDiscount(
  cart: Cart,
  promotions: QuantityPromotion[],
): QuantityPromotionDiscountSummary {
  const byProduct =
    new Map<
      string,
      {
        quantity: number;
        unitPrice: number;
      }
    >();

  for (
    const item
    of cart
  ) {
    const productId =
      item.product.id;

    const unitPrice =
      Number(
        item.product.price,
      );

    if (
      !productId ||
      !Number.isFinite(
        unitPrice,
      ) ||
      unitPrice < 0 ||
      item.quantity <= 0
    ) {
      continue;
    }

    const existing =
      byProduct.get(
        productId,
      );

    if (!existing) {
      byProduct.set(
        productId,
        {
          quantity:
            item.quantity,

          unitPrice,
        },
      );

      continue;
    }

    existing.quantity +=
      item.quantity;

    existing.unitPrice =
      Math.min(
        existing.unitPrice,
        unitPrice,
      );
  }

  const lines:
    QuantityPromotionDiscountLine[] = [];

  for (
    const promotion
    of promotions
  ) {
    const item =
      byProduct.get(
        promotion.targetProductId,
      );

    if (
      !item ||
      promotion.buyQuantity < 2 ||
      promotion.payQuantity < 1 ||
      promotion.payQuantity >=
        promotion.buyQuantity
    ) {
      continue;
    }

    const groups =
      Math.floor(
        item.quantity /
        promotion.buyQuantity,
      );

    if (
      groups <= 0
    ) {
      continue;
    }

    const freeQuantity =
      groups *
      (
        promotion.buyQuantity -
        promotion.payQuantity
      );

    const discountAmount =
      freeQuantity *
      item.unitPrice;

    if (
      discountAmount <= 0
    ) {
      continue;
    }

    lines.push({
      promotionId:
        promotion.id,

      promotionName:
        promotion.displayName,

      productId:
        promotion.targetProductId,

      productName:
        promotion.productName,

      qualifyingQuantity:
        groups *
        promotion.buyQuantity,

      freeQuantity,

      discountAmount,

      label:
        `${promotion.buyQuantity}x${promotion.payQuantity} · ${promotion.productName}`,
    });
  }

  return {
    totalDiscount:
      lines.reduce(
        (
          total,
          line,
        ) =>
          total +
          line.discountAmount,
        0,
      ),

    lines,
  };
}
