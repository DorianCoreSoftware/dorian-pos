import { supabase } from './supabase';

export interface CombinedCashRefundSummary {
  refunds: [];
  cash: number;
  card: number;
  total: number;
  count: number;
}

interface PromoRefundRow {
  payment_method:
    | 'cash'
    | 'card';
  amount:
    | string
    | number;
}

interface OrderRefundRow {
  payment_method:
    | 'cash'
    | 'card';
  refund_total:
    | string
    | number;
}

export async function getCombinedCashRefundSummary(
  cashSessionId: string,
): Promise<CombinedCashRefundSummary> {
  const [
    promoResult,
    orderResult,
  ] = await Promise.all([
    supabase
      .from(
        'cash_refunds',
      )
      .select(
        'payment_method, amount',
      )
      .eq(
        'cash_session_id',
        cashSessionId,
      ),

    supabase
      .from(
        'order_refunds',
      )
      .select(
        'payment_method, refund_total',
      )
      .eq(
        'cash_session_id',
        cashSessionId,
      )
      .eq(
        'status',
        'completed',
      ),
  ]);

  if (
    promoResult.error
  ) {
    throw new Error(
      `No se pudieron consultar los reembolsos promocionales: ${promoResult.error.message}`,
    );
  }

  if (
    orderResult.error
  ) {
    throw new Error(
      `No se pudieron consultar las devoluciones de ventas: ${orderResult.error.message}`,
    );
  }

  const promoRefunds =
    (
      promoResult.data ??
      []
    ) as PromoRefundRow[];

  const orderRefunds =
    (
      orderResult.data ??
      []
    ) as OrderRefundRow[];

  const summary = {
    cash: 0,
    card: 0,
    total: 0,
    count:
      promoRefunds.length +
      orderRefunds.length,
  };

  promoRefunds.forEach(
    refund => {
      const amount =
        Number(
          refund.amount ??
          0,
        );

      summary.total +=
        amount;

      if (
        refund.payment_method ===
        'cash'
      ) {
        summary.cash +=
          amount;
      }

      if (
        refund.payment_method ===
        'card'
      ) {
        summary.card +=
          amount;
      }
    },
  );

  orderRefunds.forEach(
    refund => {
      const amount =
        Number(
          refund.refund_total ??
          0,
        );

      summary.total +=
        amount;

      if (
        refund.payment_method ===
        'cash'
      ) {
        summary.cash +=
          amount;
      }

      if (
        refund.payment_method ===
        'card'
      ) {
        summary.card +=
          amount;
      }
    },
  );

  return {
    refunds: [],
    cash:
      roundCurrency(
        summary.cash,
      ),
    card:
      roundCurrency(
        summary.card,
      ),
    total:
      roundCurrency(
        summary.total,
      ),
    count:
      summary.count,
  };
}

function roundCurrency(
  amount: number,
): number {
  return (
    Math.round(
      (
        amount +
        Number.EPSILON
      ) * 100,
    ) / 100
  );
}
