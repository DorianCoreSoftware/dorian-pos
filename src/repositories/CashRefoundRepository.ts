import {
  supabase,
} from '../services/supabase';

export type CashRefundPaymentMethod =
  | 'cash'
  | 'card';

export interface CashRefundRecord {
  id: string;

  orderId: string;

  promoRedemptionId:
    string;

  cashSessionId:
    string;

  paymentMethod:
    CashRefundPaymentMethod;

  amount: number;

  refundedBy:
    string | null;

  createdAt:
    string;
}

interface CashRefundDatabaseRecord {
  id: string;

  order_id: string;

  promo_redemption_id:
    string;

  cash_session_id:
    string;

  payment_method:
    CashRefundPaymentMethod;

  amount:
    string | number;

  refunded_by:
    string | null;

  created_at:
    string;
}

export async function fetchCashRefundsBySessionId(
  cashSessionId: string,
): Promise<CashRefundRecord[]> {
  const {
    data,
    error,
  } =
    await supabase
      .from(
        'cash_refunds',
      )
      .select('*')
      .eq(
        'cash_session_id',
        cashSessionId,
      )
      .order(
        'created_at',
        {
          ascending:
            true,
        },
      );

  if (error) {
    throw new Error(
      `No se pudieron consultar los reembolsos: ${error.message}`,
    );
  }

  return (
    (
      data ??
      []
    ) as CashRefundDatabaseRecord[]
  ).map(
    (
      record,
    ) => ({
      id:
        record.id,

      orderId:
        record.order_id,

      promoRedemptionId:
        record.promo_redemption_id,

      cashSessionId:
        record.cash_session_id,

      paymentMethod:
        record.payment_method,

      amount:
        Number(
          record.amount,
        ),

      refundedBy:
        record.refunded_by,

      createdAt:
        record.created_at,
    }),
  );
}