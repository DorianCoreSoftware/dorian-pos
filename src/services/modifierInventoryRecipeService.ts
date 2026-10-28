import { supabase } from './supabase';

export interface ModifierInventoryRecipeItem {
  inventoryItemId: string;
  inventoryItemName: string;
  baseUnit:
    | 'g'
    | 'ml'
    | 'piece';
  quantity: number;
  unitCost: number;
  isInventoryItemActive: boolean;
}

export interface ModifierInventoryRecipe {
  modifierId: string;
  enabled: boolean;
  items:
    ModifierInventoryRecipeItem[];
  recipeCost: number;
}

interface ModifierRecipeRow {
  modifier_id: string;
  enabled: boolean;
  inventory_item_id: string | null;
  inventory_item_name: string | null;
  base_unit:
    | 'g'
    | 'ml'
    | 'piece'
    | null;
  quantity: string | number | null;
  unit_cost: string | number | null;
  inventory_item_active: boolean | null;
}

export async function getModifierInventoryRecipe(
  modifierId: string,
): Promise<ModifierInventoryRecipe> {
  const { data, error } =
    await supabase.rpc(
      'get_modifier_inventory_recipe_admin',
      {
        p_modifier_id:
          modifierId,
      },
    );

  if (error) {
    throw new Error(
      error.message ||
      'No se pudo cargar la receta de inventario del modificador.',
    );
  }

  const rows =
    (data ?? []) as
      ModifierRecipeRow[];

  if (rows.length === 0) {
    return {
      modifierId,
      enabled: false,
      items: [],
      recipeCost: 0,
    };
  }

  const items =
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
          unitCost:
            Number(
              row.unit_cost ??
              0,
            ),
          isInventoryItemActive:
            row.inventory_item_active ===
            true,
        }),
      );

  return {
    modifierId,
    enabled:
      rows[0].enabled,
    items,
    recipeCost:
      items.reduce(
        (
          total,
          item,
        ) =>
          total +
          item.quantity *
          item.unitCost,
        0,
      ),
  };
}

export async function saveModifierInventoryRecipe(
  modifierId: string,
  enabled: boolean,
  items: Array<{
    inventoryItemId: string;
    quantity: number;
  }>,
): Promise<void> {
  for (const item of items) {
    if (
      !item.inventoryItemId
    ) {
      throw new Error(
        'Todos los renglones deben tener un insumo.',
      );
    }

    if (
      !Number.isFinite(
        item.quantity,
      ) ||
      item.quantity <= 0
    ) {
      throw new Error(
        'Las cantidades deben ser mayores a 0.',
      );
    }
  }

  const { error } =
    await supabase.rpc(
      'save_modifier_inventory_recipe_admin',
      {
        p_modifier_id:
          modifierId,
        p_enabled:
          enabled,
        p_items:
          items,
      },
    );

  if (error) {
    throw new Error(
      error.message ||
      'No se pudo guardar la receta de inventario del modificador.',
    );
  }
}
