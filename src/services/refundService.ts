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
