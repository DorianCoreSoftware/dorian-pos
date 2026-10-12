import { RefundAvailabilityItem, CreateRefundInput, OrderRefundHistoryRow, RefundCashSummary, RefundReportRow, RefundReportSummary } from '../types/refund';
import { supabase } from './supabase';


export async function getOrderRefundAvailability(orderId: string): Promise<RefundAvailabilityItem[]> {
  const { data, error } = await supabase.rpc('get_order_refund_availability', { p_order_id: orderId });
  if (error) throw new Error(`No se pudo consultar la devolución: ${error.message}`);
  return ((data ?? []) as any[]).map(row => ({
    orderId: row.order_id,
    originalTotal: Number(row.original_total ?? 0),
    paymentMethod: row.payment_method,
    paidAt: row.paid_at,
    maxHours: Number(row.max_hours ?? 0),
    allowPartial: Boolean(row.allow_partial),
    requireReason: Boolean(row.require_reason),
    requireNotes: Boolean(row.require_notes),
    itemId: row.item_id,
    productId: row.product_id,
    productName: row.product_name,
    purchasedQuantity: Number(row.purchased_quantity ?? 0),
    refundedQuantity: Number(row.refunded_quantity ?? 0),
    remainingQuantity: Number(row.remaining_quantity ?? 0),
    unitRefundAmount: Number(row.unit_refund_amount ?? 0),
    rewardSource: row.reward_source ?? null,
    refundable: Boolean(row.refundable),
  }));
}

export async function createOrderRefund(input: CreateRefundInput): Promise<string> {
  const { data, error } = await supabase.rpc('create_order_refund', {
    p_order_id: input.orderId,
    p_items: input.items.map(item => ({ orderItemId: item.orderItemId, quantity: item.quantity })),
    p_reason: input.reason.trim(),
    p_notes: input.notes?.trim() || null,
    p_policy_exception: Boolean(input.policyException),
  });
  if (error) throw new Error(error.message);
  if (!data || typeof data !== 'string') throw new Error('Supabase no devolvió la devolución creada.');
  return data;
}

export async function getOrderRefundHistory(orderId: string): Promise<OrderRefundHistoryRow[]> {
  const { data, error } = await supabase.rpc('get_order_refund_history', { p_order_id: orderId });
  if (error) throw new Error(`No se pudo cargar el historial de devoluciones: ${error.message}`);
  return ((data ?? []) as any[]).map(row => ({
    refundId: row.refund_id,
    refundNumber: Number(row.refund_number ?? 0),
    refundType: row.refund_type,
    paymentMethod: row.payment_method,
    refundTotal: Number(row.refund_total ?? 0),
    reason: row.reason,
    notes: row.notes,
    policyException: Boolean(row.policy_exception),
    createdAt: row.created_at,
    userName: row.user_name,
  }));
}

export async function getOrderRefundCashSummary(cashSessionId: string): Promise<RefundCashSummary> {
  const { data, error } = await supabase.rpc('get_order_refund_cash_summary', { p_cash_session_id: cashSessionId });
  if (error) throw new Error(`No se pudieron consultar las devoluciones de caja: ${error.message}`);
  const row = ((data ?? []) as any[])[0];
  return {
    cash: Number(row?.cash ?? 0),
    card: Number(row?.card ?? 0),
    total: Number(row?.total ?? 0),
    count: Number(row?.count ?? 0),
  };
}

export async function getRefundReport(from: Date, to: Date): Promise<RefundReportRow[]> {
  const { data, error } = await supabase.rpc('get_refund_report', { p_from: from.toISOString(), p_to: to.toISOString() });
  if (error) throw new Error(`No se pudo cargar el reporte de devoluciones: ${error.message}`);
  return ((data ?? []) as any[]).map(row => ({
    refundId: row.refund_id,
    refundNumber: Number(row.refund_number ?? 0),
    createdAt: row.created_at,
    orderId: row.order_id,
    refundType: row.refund_type,
    paymentMethod: row.payment_method,
    originalTotal: Number(row.original_total ?? 0),
    refundTotal: Number(row.refund_total ?? 0),
    reason: row.reason,
    notes: row.notes,
    policyException: Boolean(row.policy_exception),
    userName: row.user_name,
    itemsCount: Number(row.items_count ?? 0),
  }));
}

export async function getRefundReportSummary(from: Date, to: Date): Promise<RefundReportSummary> {
  const { data, error } = await supabase.rpc('get_refund_report_summary', { p_from: from.toISOString(), p_to: to.toISOString() });
  if (error) throw new Error(`No se pudo cargar el resumen de devoluciones: ${error.message}`);
  const row = ((data ?? []) as any[])[0];
  return {
    refundsCount: Number(row?.refunds_count ?? 0),
    refundedTotal: Number(row?.refunded_total ?? 0),
    cashTotal: Number(row?.cash_total ?? 0),
    cardTotal: Number(row?.card_total ?? 0),
    itemsCount: Number(row?.items_count ?? 0),
  };
}


export interface RefundSettings {
  enabled: boolean;
  maxHours: number;
  allowPartial: boolean;
  requireReason: boolean;
  requireNotes: boolean;
  allowPolicyExceptions: boolean;
  updatedAt?: string | null;
}

export async function getRefundSettings():
  Promise<RefundSettings> {
  const {
    data,
    error,
  } = await supabase.rpc(
    'get_refund_settings',
  );

  if (error) {
    throw new Error(
      `No se pudo cargar la política de devoluciones: ${error.message}`,
    );
  }

  if (!data || typeof data !== 'object') {
    throw new Error(
      'Supabase no devolvió la configuración de devoluciones.',
    );
  }

  const row =
    data as Record<string, unknown>;

  return {
    enabled:
      Boolean(row.enabled),

    maxHours:
      Number(
        row.maxHours ??
        0,
      ),

    allowPartial:
      Boolean(
        row.allowPartial,
      ),

    requireReason:
      Boolean(
        row.requireReason,
      ),

    requireNotes:
      Boolean(
        row.requireNotes,
      ),

    allowPolicyExceptions:
      Boolean(
        row.allowPolicyExceptions,
      ),

    updatedAt:
      typeof row.updatedAt ===
      'string'
        ? row.updatedAt
        : null,
  };
}

export async function updateRefundSettings(
  input: RefundSettings,
): Promise<void> {
  const {
    error,
  } = await supabase.rpc(
    'update_refund_settings',
    {
      p_enabled:
        input.enabled,

      p_max_hours:
        input.maxHours,

      p_allow_partial:
        input.allowPartial,

      p_require_reason:
        input.requireReason,

      p_require_notes:
        input.requireNotes,

      p_allow_policy_exceptions:
        input.allowPolicyExceptions,
    },
  );

  if (error) {
    throw new Error(
      `No se pudo guardar la política de devoluciones: ${error.message}`,
    );
  }
}


export type RefundStatus =
  | 'partial'
  | 'full';

export interface RefundStatusByOrder {
  orderId: string;
  refundedTotal: number;
  originalTotal: number;
  status: RefundStatus;
}

export async function getOrderRefundStatuses(
  orderIds: string[],
): Promise<Record<string, RefundStatusByOrder>> {
  const uniqueOrderIds =
    Array.from(
      new Set(
        orderIds.filter(Boolean),
      ),
    );

  if (uniqueOrderIds.length === 0) {
    return {};
  }

  const {
    data,
    error,
  } = await supabase.rpc(
    'get_order_refund_statuses',
    {
      p_order_ids:
        uniqueOrderIds,
    },
  );

  if (error) {
    throw new Error(
      `No se pudo consultar el estado de las devoluciones: ${error.message}`,
    );
  }

  const result:
    Record<
      string,
      RefundStatusByOrder
    > = {};

  for (
    const row of
    (data ?? []) as any[]
  ) {
    if (!row?.order_id) {
      continue;
    }

    result[row.order_id] = {
      orderId:
        row.order_id,

      refundedTotal:
        Number(
          row.refunded_total ??
          0,
        ),

      originalTotal:
        Number(
          row.original_total ??
          0,
        ),

      status:
        row.refund_status ===
        'full'
          ? 'full'
          : 'partial',
    };
  }

  return result;
}
