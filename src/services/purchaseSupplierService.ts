import { supabase } from './supabase';

import {
  InventoryBaseUnit,
} from './inventoryService';

export interface Supplier {
  id: string;
  name: string;
  contactName: string;
  phone: string;
  email: string;
  notes: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export type PurchaseUnit =
  | 'g'
  | 'kg'
  | 'ml'
  | 'l'
  | 'piece';

export interface SupplierInventoryPresentation {
  id: string;
  supplierId: string;
  supplierName: string;
  inventoryItemId: string;
  inventoryItemName: string;
  inventoryBaseUnit: InventoryBaseUnit;
  name: string;
  supplierSku: string;
  purchaseUnit: PurchaseUnit;
  purchaseQuantity: number;
  baseQuantity: number;
  lastPurchaseCost: number;
  normalizedUnitCost: number;
  isPreferred: boolean;
  isActive: boolean;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

interface SupplierRow {
  id: string;
  name: string;
  contact_name: string | null;
  phone: string | null;
  email: string | null;
  notes: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface PresentationRow {
  id: string;
  supplier_id: string;
  inventory_item_id: string;
  name: string;
  supplier_sku: string | null;
  purchase_unit: PurchaseUnit;
  purchase_quantity: string | number;
  base_quantity: string | number;
  last_purchase_cost: string | number;
  is_preferred: boolean;
  is_active: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
  suppliers?: {
    name?: string | null;
  } | null;
  inventory_items?: {
    name?: string | null;
    base_unit?: InventoryBaseUnit | null;
  } | null;
}

export interface SaveSupplierInput {
  id?: string;
  name: string;
  contactName: string;
  phone: string;
  email: string;
  notes: string;
  isActive: boolean;
}

export interface SaveSupplierPresentationInput {
  id?: string;
  supplierId: string;
  inventoryItemId: string;
  name: string;
  supplierSku: string;
  purchaseUnit: PurchaseUnit;
  purchaseQuantity: number;
  lastPurchaseCost: number;
  isPreferred: boolean;
  isActive: boolean;
  notes: string;
}

export function getCompatiblePurchaseUnits(
  baseUnit: InventoryBaseUnit,
): PurchaseUnit[] {
  if (baseUnit === 'g') {
    return [
      'g',
      'kg',
    ];
  }

  if (baseUnit === 'ml') {
    return [
      'ml',
      'l',
    ];
  }

  return [
    'piece',
  ];
}

export function convertPurchaseQuantityToBase(
  baseUnit: InventoryBaseUnit,
  purchaseUnit: PurchaseUnit,
  quantity: number,
): number {
  if (
    !Number.isFinite(quantity) ||
    quantity <= 0
  ) {
    return 0;
  }

  if (
    baseUnit === 'g' &&
    purchaseUnit === 'kg'
  ) {
    return quantity * 1000;
  }

  if (
    baseUnit === 'ml' &&
    purchaseUnit === 'l'
  ) {
    return quantity * 1000;
  }

  if (
    baseUnit === 'g' &&
    purchaseUnit === 'g'
  ) {
    return quantity;
  }

  if (
    baseUnit === 'ml' &&
    purchaseUnit === 'ml'
  ) {
    return quantity;
  }

  if (
    baseUnit === 'piece' &&
    purchaseUnit === 'piece'
  ) {
    return quantity;
  }

  return 0;
}

export async function getSuppliers(
  includeInactive = true,
): Promise<Supplier[]> {
  let query =
    supabase
      .from('suppliers')
      .select(`
        id,
        name,
        contact_name,
        phone,
        email,
        notes,
        is_active,
        created_at,
        updated_at
      `)
      .order(
        'name',
        {
          ascending: true,
        },
      );

  if (!includeInactive) {
    query =
      query.eq(
        'is_active',
        true,
      );
  }

  const {
    data,
    error,
  } =
    await query;

  if (error) {
    throw new Error(
      error.message ||
      'No se pudieron cargar los proveedores.',
    );
  }

  return (
    (data ?? []) as SupplierRow[]
  ).map(
    row => ({
      id: row.id,
      name: row.name,
      contactName:
        row.contact_name?.trim() ??
        '',
      phone:
        row.phone?.trim() ??
        '',
      email:
        row.email?.trim() ??
        '',
      notes:
        row.notes?.trim() ??
        '',
      isActive:
        row.is_active,
      createdAt:
        row.created_at,
      updatedAt:
        row.updated_at,
    }),
  );
}

export async function saveSupplier(
  input: SaveSupplierInput,
): Promise<string> {
  const cleanName =
    input.name.trim();

  if (!cleanName) {
    throw new Error(
      'Ingresa el nombre del proveedor.',
    );
  }

  const {
    data,
    error,
  } =
    await supabase.rpc(
      'save_supplier_admin',
      {
        p_supplier_id:
          input.id ??
          null,
        p_name:
          cleanName,
        p_contact_name:
          input.contactName.trim() ||
          null,
        p_phone:
          input.phone.trim() ||
          null,
        p_email:
          input.email.trim() ||
          null,
        p_notes:
          input.notes.trim() ||
          null,
        p_is_active:
          input.isActive,
      },
    );

  if (error) {
    throw new Error(
      error.message ||
      'No se pudo guardar el proveedor.',
    );
  }

  return String(data);
}

export async function getSupplierInventoryPresentations(
  includeInactive = true,
): Promise<SupplierInventoryPresentation[]> {
  let query =
    supabase
      .from(
        'supplier_inventory_presentations',
      )
      .select(`
        id,
        supplier_id,
        inventory_item_id,
        name,
        supplier_sku,
        purchase_unit,
        purchase_quantity,
        base_quantity,
        last_purchase_cost,
        is_preferred,
        is_active,
        notes,
        created_at,
        updated_at,
        suppliers:supplier_id(name),
        inventory_items:inventory_item_id(name,base_unit)
      `)
      .order(
        'name',
        {
          ascending: true,
        },
      );

  if (!includeInactive) {
    query =
      query.eq(
        'is_active',
        true,
      );
  }

  const {
    data,
    error,
  } =
    await query;

  if (error) {
    throw new Error(
      error.message ||
      'No se pudieron cargar las presentaciones de compra.',
    );
  }

  return (
    (
      data ??
      []
    ) as unknown as PresentationRow[]
  ).map(
    row => {
      const baseQuantity =
        Number(
          row.base_quantity ??
          0,
        );

      const lastPurchaseCost =
        Number(
          row.last_purchase_cost ??
          0,
        );

      return {
        id:
          row.id,
        supplierId:
          row.supplier_id,
        supplierName:
          row.suppliers?.name ??
          'Proveedor',
        inventoryItemId:
          row.inventory_item_id,
        inventoryItemName:
          row.inventory_items?.name ??
          'Insumo',
        inventoryBaseUnit:
          row.inventory_items
            ?.base_unit ??
          'piece',
        name:
          row.name,
        supplierSku:
          row.supplier_sku?.trim() ??
          '',
        purchaseUnit:
          row.purchase_unit,
        purchaseQuantity:
          Number(
            row.purchase_quantity ??
            0,
          ),
        baseQuantity,
        lastPurchaseCost,
        normalizedUnitCost:
          baseQuantity > 0
            ? lastPurchaseCost /
              baseQuantity
            : 0,
        isPreferred:
          row.is_preferred,
        isActive:
          row.is_active,
        notes:
          row.notes?.trim() ??
          '',
        createdAt:
          row.created_at,
        updatedAt:
          row.updated_at,
      };
    },
  );
}

export async function saveSupplierInventoryPresentation(
  input: SaveSupplierPresentationInput,
): Promise<string> {
  if (!input.supplierId) {
    throw new Error(
      'Selecciona un proveedor.',
    );
  }

  if (!input.inventoryItemId) {
    throw new Error(
      'Selecciona un insumo.',
    );
  }

  if (!input.name.trim()) {
    throw new Error(
      'Ingresa el nombre de la presentación.',
    );
  }

  if (
    !Number.isFinite(
      input.purchaseQuantity,
    ) ||
    input.purchaseQuantity <= 0
  ) {
    throw new Error(
      'La cantidad de la presentación debe ser mayor a 0.',
    );
  }

  if (
    !Number.isFinite(
      input.lastPurchaseCost,
    ) ||
    input.lastPurchaseCost < 0
  ) {
    throw new Error(
      'El costo debe ser igual o mayor a 0.',
    );
  }

  const {
    data,
    error,
  } =
    await supabase.rpc(
      'save_supplier_inventory_presentation_admin',
      {
        p_presentation_id:
          input.id ??
          null,
        p_supplier_id:
          input.supplierId,
        p_inventory_item_id:
          input.inventoryItemId,
        p_name:
          input.name.trim(),
        p_supplier_sku:
          input.supplierSku.trim() ||
          null,
        p_purchase_unit:
          input.purchaseUnit,
        p_purchase_quantity:
          input.purchaseQuantity,
        p_last_purchase_cost:
          input.lastPurchaseCost,
        p_is_preferred:
          input.isPreferred,
        p_is_active:
          input.isActive,
        p_notes:
          input.notes.trim() ||
          null,
      },
    );

  if (error) {
    throw new Error(
      error.message ||
      'No se pudo guardar la presentación.',
    );
  }

  return String(data);
}

export type PurchaseStatus = 'draft' | 'received' | 'cancelled' | 'reversed';
export type PurchasePaymentMethod = 'cash' | 'card' | 'transfer' | 'other';

export interface PurchaseRecord {
  id: string;
  supplierId: string;
  supplierName: string;
  status: PurchaseStatus;
  reference: string;
  purchasedAt: string;
  paymentMethod: PurchasePaymentMethod;
  notes: string;
  total: number;
  expenseId: string | null;
  receivedAt: string | null;
  reversalSupported: boolean;
  reversedAt: string | null;
  reversalReason: string;
  reversalExpenseId: string | null;
}

export interface PurchaseLineRecord {
  id: string;
  presentationId: string;
  inventoryItemId: string;
  inventoryItemName: string;
  presentationName: string;
  packageQuantity: number;
  baseQuantityPerPackage: number;
  totalBaseQuantity: number;
  packageCost: number;
  lineTotal: number;
  normalizedUnitCost: number;
  stockBefore: number | null;
  stockAfter: number | null;
  previousUnitCost: number | null;
  resultingUnitCost: number | null;
  previousPurchaseCost: number | null;
  previousPurchaseBaseQuantity: number | null;
  previousSupplierLastPurchaseCost: number | null;
  receivedMovementId: string | null;
  reversalMovementId: string | null;
  reversedAt: string | null;
}

export interface SavePurchaseDraftInput {
  id?: string;
  supplierId: string;
  reference: string;
  purchasedAt: Date;
  paymentMethod: PurchasePaymentMethod;
  notes: string;
  lines: Array<{
    presentationId: string;
    packageQuantity: number;
    packageCost: number;
  }>;
}

export async function getPurchases(): Promise<PurchaseRecord[]> {
  const { data, error } = await supabase
    .from('purchases')
    .select(`
      id,supplier_id,status,reference,purchased_at,payment_method,notes,total,expense_id,received_at,
      reversal_supported,reversed_at,reversal_reason,reversal_expense_id,
      suppliers:supplier_id(name)
    `)
    .order('purchased_at', { ascending: false });

  if (error) throw new Error(error.message || 'No se pudieron cargar las compras.');

  return ((data ?? []) as any[]).map(row => ({
    id: String(row.id),
    supplierId: String(row.supplier_id),
    supplierName: row.suppliers?.name ?? 'Proveedor',
    status: row.status as PurchaseStatus,
    reference: row.reference?.trim() ?? '',
    purchasedAt: row.purchased_at,
    paymentMethod: row.payment_method as PurchasePaymentMethod,
    notes: row.notes?.trim() ?? '',
    total: Number(row.total ?? 0),
    expenseId: row.expense_id ?? null,
    receivedAt: row.received_at ?? null,
    reversalSupported: row.reversal_supported === true,
    reversedAt: row.reversed_at ?? null,
    reversalReason: row.reversal_reason?.trim() ?? '',
    reversalExpenseId: row.reversal_expense_id ?? null,
  }));
}

export async function getPurchaseLines(purchaseId: string): Promise<PurchaseLineRecord[]> {
  const { data, error } = await supabase
    .from('purchase_lines')
    .select(`
      id,presentation_id,inventory_item_id,presentation_name,package_quantity,
      base_quantity_per_package,total_base_quantity,package_cost,line_total,normalized_unit_cost,
      stock_before,stock_after,previous_unit_cost,resulting_unit_cost,
      previous_purchase_cost,previous_purchase_base_quantity,previous_supplier_last_purchase_cost,
      received_movement_id,reversal_movement_id,reversed_at,
      inventory_items:inventory_item_id(name)
    `)
    .eq('purchase_id', purchaseId)
    .order('created_at', { ascending: true });

  if (error) throw new Error(error.message || 'No se pudieron cargar los renglones.');

  return ((data ?? []) as any[]).map(row => ({
    id: String(row.id),
    presentationId: String(row.presentation_id),
    inventoryItemId: String(row.inventory_item_id),
    inventoryItemName: row.inventory_items?.name ?? 'Insumo',
    presentationName: row.presentation_name,
    packageQuantity: Number(row.package_quantity),
    baseQuantityPerPackage: Number(row.base_quantity_per_package),
    totalBaseQuantity: Number(row.total_base_quantity),
    packageCost: Number(row.package_cost),
    lineTotal: Number(row.line_total),
    normalizedUnitCost: Number(row.normalized_unit_cost),
    stockBefore: row.stock_before == null ? null : Number(row.stock_before),
    stockAfter: row.stock_after == null ? null : Number(row.stock_after),
    previousUnitCost: row.previous_unit_cost == null ? null : Number(row.previous_unit_cost),
    resultingUnitCost: row.resulting_unit_cost == null ? null : Number(row.resulting_unit_cost),
    previousPurchaseCost: row.previous_purchase_cost == null ? null : Number(row.previous_purchase_cost),
    previousPurchaseBaseQuantity: row.previous_purchase_base_quantity == null ? null : Number(row.previous_purchase_base_quantity),
    previousSupplierLastPurchaseCost: row.previous_supplier_last_purchase_cost == null ? null : Number(row.previous_supplier_last_purchase_cost),
    receivedMovementId: row.received_movement_id ?? null,
    reversalMovementId: row.reversal_movement_id ?? null,
    reversedAt: row.reversed_at ?? null,
  }));
}

export async function savePurchaseDraft(input: SavePurchaseDraftInput): Promise<string> {
  if (!input.supplierId) throw new Error('Selecciona un proveedor.');
  if (input.lines.length === 0) throw new Error('Agrega al menos un renglón.');

  for (const line of input.lines) {
    if (!line.presentationId) throw new Error('Todos los renglones deben tener una presentación.');
    if (!Number.isFinite(line.packageQuantity) || line.packageQuantity <= 0) throw new Error('La cantidad debe ser mayor a 0.');
    if (!Number.isFinite(line.packageCost) || line.packageCost < 0) throw new Error('El costo no puede ser negativo.');
  }

  const { data, error } = await supabase.rpc('save_purchase_draft_admin', {
    p_purchase_id: input.id ?? null,
    p_supplier_id: input.supplierId,
    p_reference: input.reference.trim() || null,
    p_purchased_at: input.purchasedAt.toISOString(),
    p_payment_method: input.paymentMethod,
    p_notes: input.notes.trim() || null,
    p_lines: input.lines,
  });

  if (error) throw new Error(error.message || 'No se pudo guardar la compra.');
  return String(data);
}

export async function receivePurchase(purchaseId: string): Promise<void> {
  const { error } = await supabase.rpc('receive_purchase_admin', { p_purchase_id: purchaseId });
  if (error) throw new Error(error.message || 'No se pudo recibir la compra.');
}

export async function cancelPurchaseDraft(purchaseId: string): Promise<void> {
  const { error } = await supabase.rpc('cancel_purchase_draft_admin', { p_purchase_id: purchaseId });
  if (error) throw new Error(error.message || 'No se pudo cancelar la compra.');
}


export async function reverseReceivedPurchase(
  purchaseId: string,
  reason: string,
): Promise<void> {
  const cleanReason =
    reason.trim();

  if (!cleanReason) {
    throw new Error(
      'Escribe el motivo de la reversa.',
    );
  }

  const {
    error,
  } =
    await supabase.rpc(
      'reverse_received_purchase_admin',
      {
        p_purchase_id:
          purchaseId,
        p_reason:
          cleanReason,
      },
    );

  if (error) {
    throw new Error(
      error.message ||
      'No se pudo revertir la compra.',
    );
  }
}
