import { CashRefundRecord, fetchCashRefundsBySessionId } from "../repositories/CashRefoundRepository";


export interface CashRefundSummary {
  refunds:
    CashRefundRecord[];

  cash:
    number;

  card:
    number;

  total:
    number;

  count:
    number;
}

export async function getCashRefundSummary(
  cashSessionId: string,
): Promise<CashRefundSummary> {
  if (
    !cashSessionId?.trim()
  ) {
    throw new Error(
      'La sesión de caja no es válida.',
    );
  }

  const refunds =
    await fetchCashRefundsBySessionId(
      cashSessionId,
    );

  return refunds.reduce<CashRefundSummary>(
    (
      summary,
      refund,
    ) => {
      summary.refunds.push(
        refund,
      );

      summary.total +=
        refund.amount;

      summary.count +=
        1;

      if (
        refund.paymentMethod ===
        'cash'
      ) {
        summary.cash +=
          refund.amount;
      }

      if (
        refund.paymentMethod ===
        'card'
      ) {
        summary.card +=
          refund.amount;
      }

      return summary;
    },
    {
      refunds: [],
      cash: 0,
      card: 0,
      total: 0,
      count: 0,
    },
  );
}