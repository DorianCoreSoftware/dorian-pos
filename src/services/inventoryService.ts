import { supabase } from './supabase';

export type InventoryBaseUnit =
  | 'g'
  | 'ml'
  | 'piece';

export type InventoryMovementType =
  | 'initial'
  | 'entry'
  | 'exit'
  | 'adjustment'
  | 'waste';

export interface InventoryItem {
  id: string;
  sku: string | null;
  name: string;
  baseUnit: InventoryBaseUnit;
  currentStock: number;
  minimumStock: number;
  isActive: boolean;
  notes: string;
  createdAt: string;
  purchaseCost: number;
  purchaseBaseQuantity: number;
  unitCost: number;
  updatedAt: string;
}

export interface InventoryMovement {
  id: string;
  inventoryItemId: string;
  itemName: string;
  baseUnit: InventoryBaseUnit;
  movementType: InventoryMovementType;
  quantityDelta: number;
  stockBefore: number;
  stockAfter: number;
  reason: string;
  createdBy: string | null;
  createdByName: string | null;
  createdAt: string;
}

interface InventoryItemRow {
  id: string;
  sku: string | null;
  name: string;
  base_unit: InventoryBaseUnit;
  current_stock: string | number;
  minimum_stock: string | number;
  is_active: boolean;
  notes: string | null;
  created_at: string;
  purchase_cost: string | number;
  purchase_base_quantity: string | number;
  unit_cost: string | number;
  updated_at: string;
}

interface InventoryMovementRow {
  id: string;
  inventory_item_id: string;
  item_name: string;
  base_unit: InventoryBaseUnit;
  movement_type: InventoryMovementType;
  quantity_delta: string | number;
  stock_before: string | number;
  stock_after: string | number;
  reason: string;
  created_by: string | null;
  created_by_name: string | null;
  created_at: string;
}

export interface CreateInventoryItemInput {
  sku: string;
  name: string;
  baseUnit: InventoryBaseUnit;
  initialStock: number;
  minimumStock: number;
  notes: string;
}

export interface UpdateInventoryItemInput {
  sku: string;
  name: string;
  baseUnit: InventoryBaseUnit;
  minimumStock: number;
  notes: string;
}

export interface RegisterInventoryMovementInput {
  inventoryItemId: string;
  movementType:
    | 'entry'
    | 'exit'
    | 'adjustment'
    | 'waste';
  quantity: number;
  reason: string;
}

function mapItem(
  row: InventoryItemRow,
): InventoryItem {
  return {
    id: row.id,
    sku: row.sku?.trim() || null,
    name: row.name,
    baseUnit: row.base_unit,
    currentStock: Number(row.current_stock ?? 0),
    minimumStock: Number(row.minimum_stock ?? 0),
    isActive: row.is_active,
    notes: row.notes?.trim() ?? '',
    createdAt: row.created_at,
    purchaseCost: Number(row.purchase_cost ?? 0),
    purchaseBaseQuantity: Number(row.purchase_base_quantity ?? 1),
    unitCost: Number(row.unit_cost ?? 0),
    updatedAt: row.updated_at,
  };
}

function mapMovement(
  row: InventoryMovementRow,
): InventoryMovement {
  return {
    id: row.id,
    inventoryItemId: row.inventory_item_id,
    itemName: row.item_name,
    baseUnit: row.base_unit,
    movementType: row.movement_type,
    quantityDelta: Number(row.quantity_delta ?? 0),
    stockBefore: Number(row.stock_before ?? 0),
    stockAfter: Number(row.stock_after ?? 0),
    reason: row.reason,
    createdBy: row.created_by,
    createdByName: row.created_by_name?.trim() || null,
    createdAt: row.created_at,
  };
}

function validateNonNegative(
  value: number,
  label: string,
): void {
  if (
    !Number.isFinite(value) ||
    value < 0
  ) {
    throw new Error(
      `${label} debe ser un número igual o mayor a 0.`,
    );
  }
}

export async function getInventoryItems():
  Promise<InventoryItem[]> {
  const { data, error } =
    await supabase
      .from('inventory_items')
      .select(`
        id,
        sku,
        name,
        base_unit,
        current_stock,
        minimum_stock,
        is_active,
        notes,
        created_at,
        purchase_cost,
        purchase_base_quantity,
        unit_cost,
        updated_at
      `)
      .order('name', {
        ascending: true,
      });

  if (error) {
    throw new Error(
      error.message ||
      'No se pudieron cargar los insumos.',
    );
  }

  return (
    (data ?? []) as InventoryItemRow[]
  ).map(mapItem);
}

export async function getInventoryMovements(
  limit = 100,
): Promise<InventoryMovement[]> {
  const safeLimit =
    Math.max(
      1,
      Math.min(
        Math.trunc(limit),
        500,
      ),
    );

  const { data, error } =
    await supabase.rpc(
      'get_inventory_movements_admin',
      {
        p_limit: safeLimit,
      },
    );

  if (error) {
    throw new Error(
      error.message ||
      'No se pudo cargar el historial de inventario.',
    );
  }

  return (
    (data ?? []) as InventoryMovementRow[]
  ).map(mapMovement);
}

export async function createInventoryItem(
  input: CreateInventoryItemInput,
): Promise<string> {
  const cleanName = input.name.trim();
  const cleanSku = input.sku.trim();
  const cleanNotes = input.notes.trim();

  if (!cleanName) {
    throw new Error(
      'El nombre del insumo es obligatorio.',
    );
  }

  validateNonNegative(
    input.initialStock,
    'La existencia inicial',
  );

  validateNonNegative(
    input.minimumStock,
    'El stock mínimo',
  );

  const { data, error } =
    await supabase.rpc(
      'create_inventory_item_admin',
      {
        p_name: cleanName,
        p_sku: cleanSku || null,
        p_base_unit: input.baseUnit,
        p_initial_stock: input.initialStock,
        p_minimum_stock: input.minimumStock,
        p_notes: cleanNotes,
      },
    );

  if (error) {
    throw new Error(
      error.message ||
      'No se pudo crear el insumo.',
    );
  }

  if (
    !data ||
    typeof data !== 'string'
  ) {
    throw new Error(
      'No se recibió el identificador del insumo creado.',
    );
  }

  return data;
}

export interface InventoryCostingSettings {
  targetFoodCostPercent: number;
  roundingStep: number;
}

export async function getInventoryCostingSettings():
  Promise<InventoryCostingSettings> {
  const { data, error } =
    await supabase.rpc(
      'get_inventory_costing_settings_admin',
    );

  if (error) {
    throw new Error(
      error.message ||
      'No se pudo cargar la configuración de costeo.',
    );
  }

  const row =
    Array.isArray(data)
      ? data[0]
      : data;

  return {
    targetFoodCostPercent:
      Number(
        row?.target_food_cost_percent ??
        35,
      ),
    roundingStep:
      Number(
        row?.rounding_step ??
        5,
      ),
  };
}

export async function saveInventoryCostingSettings(
  settings: InventoryCostingSettings,
): Promise<void> {
  const { error } =
    await supabase.rpc(
      'save_inventory_costing_settings_admin',
      {
        p_target_food_cost_percent:
          settings.targetFoodCostPercent,
        p_rounding_step:
          settings.roundingStep,
      },
    );

  if (error) {
    throw new Error(
      error.message ||
      'No se pudo guardar la configuración de costeo.',
    );
  }
}

export async function setInventoryItemCost(
  itemId: string,
  purchaseCost: number,
  purchaseBaseQuantity: number,
  reason = 'Actualización manual de costo',
): Promise<void> {
  if (
    !Number.isFinite(purchaseCost) ||
    purchaseCost < 0
  ) {
    throw new Error(
      'El costo de compra debe ser igual o mayor a 0.',
    );
  }

  if (
    !Number.isFinite(purchaseBaseQuantity) ||
    purchaseBaseQuantity <= 0
  ) {
    throw new Error(
      'El contenido de la presentación debe ser mayor a 0.',
    );
  }

  const { error } =
    await supabase.rpc(
      'set_inventory_item_cost_admin',
      {
        p_item_id: itemId,
        p_purchase_cost: purchaseCost,
        p_purchase_base_quantity:
          purchaseBaseQuantity,
        p_reason: reason,
      },
    );

  if (error) {
    throw new Error(
      error.message ||
      'No se pudo actualizar el costo del insumo.',
    );
  }
}

export async function updateInventoryItem(
  itemId: string,
  input: UpdateInventoryItemInput,
): Promise<void> {
  const cleanName = input.name.trim();
  const cleanSku = input.sku.trim();
  const cleanNotes = input.notes.trim();

  if (!cleanName) {
    throw new Error(
      'El nombre del insumo es obligatorio.',
    );
  }

  validateNonNegative(
    input.minimumStock,
    'El stock mínimo',
  );

  const { error } =
    await supabase.rpc(
      'update_inventory_item_admin',
      {
        p_item_id: itemId,
        p_name: cleanName,
        p_sku: cleanSku || null,
        p_base_unit: input.baseUnit,
        p_minimum_stock: input.minimumStock,
        p_notes: cleanNotes,
      },
    );

  if (error) {
    throw new Error(
      error.message ||
      'No se pudo actualizar el insumo.',
    );
  }
}

export async function setInventoryItemActive(
  itemId: string,
  isActive: boolean,
): Promise<void> {
  const { error } =
    await supabase.rpc(
      'set_inventory_item_active_admin',
      {
        p_item_id: itemId,
        p_is_active: isActive,
      },
    );

  if (error) {
    throw new Error(
      error.message ||
      'No se pudo cambiar el estado del insumo.',
    );
  }
}

export async function registerInventoryMovement(
  input: RegisterInventoryMovementInput,
): Promise<void> {
  const cleanReason = input.reason.trim();

  if (!cleanReason) {
    throw new Error(
      'El motivo del movimiento es obligatorio.',
    );
  }

  if (
    !Number.isFinite(input.quantity) ||
    input.quantity === 0
  ) {
    throw new Error(
      input.movementType === 'adjustment'
        ? 'El ajuste debe ser distinto de 0.'
        : 'La cantidad debe ser mayor a 0.',
    );
  }

  if (
    input.movementType !== 'adjustment' &&
    input.quantity < 0
  ) {
    throw new Error(
      'La cantidad debe ser mayor a 0.',
    );
  }

  const { error } =
    await supabase.rpc(
      'register_inventory_movement_admin',
      {
        p_item_id: input.inventoryItemId,
        p_movement_type: input.movementType,
        p_quantity: input.quantity,
        p_reason: cleanReason,
      },
    );

  if (error) {
    throw new Error(
      error.message ||
      'No se pudo registrar el movimiento.',
    );
  }
}
