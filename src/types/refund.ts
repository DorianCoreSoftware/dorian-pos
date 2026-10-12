export type RefundType = 'full' | 'partial';

export interface RefundAvailabilityItem {
  orderId: string;
  originalTotal: number;
  paymentMethod: string;
  paidAt: string;
  maxHours: number;
  allowPartial: boolean;
  requireReason: boolean;
  requireNotes: boolean;
  itemId: string;
  productId: string;
  productName: string;
  purchasedQuantity: number;
  refundedQuantity: number;
  remainingQuantity: number;
  unitRefundAmount: number;
  rewardSource: 'promotion' | 'loyalty' | null;
  refundable: boolean;
}

export interface CreateRefundItemInput {
  orderItemId: string;
  quantity: number;
}

export interface CreateRefundInput {
  orderId: string;
  items: CreateRefundItemInput[];
  reason: string;
  notes?: string;
  policyException?: boolean;
}

export interface OrderRefundHistoryRow {
  refundId: string;
  refundNumber: number;
  refundType: RefundType;
  paymentMethod: string;
  refundTotal: number;
  reason: string;
  notes: string | null;
  policyException: boolean;
  createdAt: string;
  userName: string | null;
}

export interface RefundCashSummary {
  cash: number;
  card: number;
  total: number;
  count: number;
}

export interface RefundReportRow {
  refundId: string;
  refundNumber: number;
  createdAt: string;
  orderId: string;
  refundType: RefundType;
  paymentMethod: string;
  originalTotal: number;
  refundTotal: number;
  reason: string;
  notes: string | null;
  policyException: boolean;
  userName: string | null;
  itemsCount: number;
}

export interface RefundReportSummary {
  refundsCount: number;
  refundedTotal: number;
  cashTotal: number;
  cardTotal: number;
  itemsCount: number;
}
