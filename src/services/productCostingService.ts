import { supabase } from './supabase';

export type ProductPricingMode =
  | 'manual'
  | 'recommended';

export interface ProductCosting {
  productId: string;
  baseRecipeCost: number;
  variantMinCost: number;
  variantMaxCost: number;
  comboMinCost: number;
  comboMaxCost: number;
  minimumTotalCost: number;
  maximumTotalCost: number;
  currentPrice: number;
  recommendedPrice: number;
  targetFoodCostPercent: number;
  roundingStep: number;
  pricingMode: ProductPricingMode;
  currentFoodCostPercent: number | null;
  currentGrossMarginPercent: number | null;
  isVariableCost: boolean;
}

interface ProductCostingRow {
  product_id: string;
  base_recipe_cost: string | number;
  variant_min_cost: string | number;
  variant_max_cost: string | number;
  combo_min_cost: string | number;
  combo_max_cost: string | number;
  minimum_total_cost: string | number;
  maximum_total_cost: string | number;
  current_price: string | number;
  recommended_price: string | number;
  target_food_cost_percent: string | number;
  rounding_step: string | number;
  pricing_mode: ProductPricingMode;
  current_food_cost_percent: string | number | null;
  current_gross_margin_percent: string | number | null;
  is_variable_cost: boolean;
}

export async function getProductCosting(
  productId: string,
): Promise<ProductCosting> {
  const { data, error } =
    await supabase.rpc(
      'get_product_costing_admin_v2',
      {
        p_product_id: productId,
      },
    );

  if (error) {
    throw new Error(
      error.message ||
      'No se pudo calcular el costo del producto.',
    );
  }

  const row =
    (
      Array.isArray(data)
        ? data[0]
        : data
    ) as ProductCostingRow | undefined;

  if (!row) {
    throw new Error(
      'No se recibió información de costeo del producto.',
    );
  }

  return {
    productId:
      row.product_id,
    baseRecipeCost:
      Number(
        row.base_recipe_cost ??
        0,
      ),
    variantMinCost:
      Number(
        row.variant_min_cost ??
        0,
      ),
    variantMaxCost:
      Number(
        row.variant_max_cost ??
        0,
      ),
    comboMinCost:
      Number(
        row.combo_min_cost ??
        0,
      ),
    comboMaxCost:
      Number(
        row.combo_max_cost ??
        0,
      ),
    minimumTotalCost:
      Number(
        row.minimum_total_cost ??
        0,
      ),
    maximumTotalCost:
      Number(
        row.maximum_total_cost ??
        0,
      ),
    currentPrice:
      Number(
        row.current_price ??
        0,
      ),
    recommendedPrice:
      Number(
        row.recommended_price ??
        0,
      ),
    targetFoodCostPercent:
      Number(
        row.target_food_cost_percent ??
        35,
      ),
    roundingStep:
      Number(
        row.rounding_step ??
        5,
      ),
    pricingMode:
      row.pricing_mode ??
      'manual',
    currentFoodCostPercent:
      row.current_food_cost_percent ===
      null
        ? null
        : Number(
            row.current_food_cost_percent,
          ),
    currentGrossMarginPercent:
      row.current_gross_margin_percent ===
      null
        ? null
        : Number(
            row.current_gross_margin_percent,
          ),
    isVariableCost:
      row.is_variable_cost ===
      true,
  };
}

export async function saveProductPricingMode(
  productId: string,
  pricingMode: ProductPricingMode,
): Promise<ProductCosting> {
  const { error } =
    await supabase.rpc(
      'save_product_pricing_mode_admin',
      {
        p_product_id: productId,
        p_pricing_mode: pricingMode,
      },
    );

  if (error) {
    throw new Error(
      error.message ||
      'No se pudo guardar el modo de precio.',
    );
  }

  return getProductCosting(
    productId,
  );
}
