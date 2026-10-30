import { supabase } from './supabase';

export interface ProductInventoryRecipeItem {
  inventoryItemId: string;
  inventoryItemName: string;
  baseUnit:
    | 'g'
    | 'ml'
    | 'piece';
  quantity: number;
  isInventoryItemActive: boolean;
}

export interface ProductInventoryRecipe {
  productId: string;
  enabled: boolean;
  items:
    ProductInventoryRecipeItem[];
}

interface RecipeRow {
  product_id: string;
  enabled: boolean;
  inventory_item_id: string | null;
  inventory_item_name: string | null;
  base_unit:
    | 'g'
    | 'ml'
    | 'piece'
    | null;
  quantity: string | number | null;
  inventory_item_active: boolean | null;
}

export interface SaveProductInventoryRecipeInput {
  productId: string;
  enabled: boolean;
  items: Array<{
    inventoryItemId: string;
    quantity: number;
  }>;
}

export async function getProductInventoryRecipe(
  productId: string,
): Promise<ProductInventoryRecipe> {
  const {
    data,
    error,
  } =
    await supabase.rpc(
      'get_product_inventory_recipe_admin',
      {
        p_product_id:
          productId,
      },
    );

  if (error) {
    throw new Error(
      error.message ||
      'No se pudo cargar la receta de inventario.',
    );
  }

  const rows =
    (data ?? []) as RecipeRow[];

  if (
    rows.length === 0
  ) {
    return {
      productId,
      enabled: false,
      items: [],
    };
  }

  return {
    productId,
    enabled:
      rows[0]
        .enabled,
    items:
      rows
        .filter(
          row =>
            row.inventory_item_id !==
              null &&
            row.inventory_item_name !==
              null &&
            row.base_unit !==
              null &&
            row.quantity !==
              null,
        )
        .map(
          row => ({
            inventoryItemId:
              row.inventory_item_id as string,
            inventoryItemName:
              row.inventory_item_name as string,
            baseUnit:
              row.base_unit as
                | 'g'
                | 'ml'
                | 'piece',
            quantity:
              Number(
                row.quantity,
              ),
            isInventoryItemActive:
              row.inventory_item_active ===
              true,
          }),
        ),
  };
}

export async function saveProductInventoryRecipe(
  input:
    SaveProductInventoryRecipeInput,
): Promise<void> {
  const normalizedItems =
    input.items.map(
      item => ({
        inventoryItemId:
          item.inventoryItemId,
        quantity:
          item.quantity,
      }),
    );

  for (
    const item of
    normalizedItems
  ) {
    if (
      !item.inventoryItemId
    ) {
      throw new Error(
        'Todos los ingredientes deben tener un insumo.',
      );
    }

    if (
      !Number.isFinite(
        item.quantity,
      ) ||
      item.quantity <= 0
    ) {
      throw new Error(
        'Las cantidades de la receta deben ser mayores a 0.',
      );
    }
  }

  const {
    error,
  } =
    await supabase.rpc(
      'save_product_inventory_recipe_admin',
      {
        p_product_id:
          input.productId,
        p_enabled:
          input.enabled,
        p_items:
          normalizedItems,
      },
    );

  if (error) {
    throw new Error(
      error.message ||
      'No se pudo guardar la receta de inventario.',
    );
  }
}
