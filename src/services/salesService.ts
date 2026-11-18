import {
  fetchCompletedSales,
  mapOrderPaymentMovement,
} from '../repositories/PaymentRepository';

import {
  CompletedSale,
  OrderPayment,
  OrderPaymentMovement,
  PaymentMethod,
} from '../types';

export async function getCompletedSales(): Promise<
  CompletedSale[]
> {
  const records =
    await fetchCompletedSales();

  return records
    .map((record) => {
      const summaryPayment =
        Array.isArray(
          record.order_payments,
        )
          ? record.order_payments[0] ??
            null
          : record.order_payments ??
            null;

      const movements =
        (
          record.order_payment_movements ??
          []
        )
          .map(
            mapOrderPaymentMovement,
          )
          .sort(
            (a, b) =>
              new Date(a.createdAt)
                .getTime() -
              new Date(b.createdAt)
                .getTime(),
          );

      if (
        !summaryPayment &&
        movements.length === 0
      ) {
        return null;
      }

      const aggregatePayment =
        buildAggregatePayment(
          record.id,
          movements,
          summaryPayment,
        );

      return {
        orderId:
          record.id,

        totalAmount:
          Number(
            record.total,
          ),

        orderStatus:
          record.status,

        orderCreatedAt:
          record.created_at,

        payment:
          aggregatePayment,

        payments:
          movements,
      } satisfies CompletedSale;
    })
    .filter(
      (
        sale,
      ): sale is CompletedSale =>
        sale !== null,
    );
}

function buildAggregatePayment(
  orderId: string,
  movements: OrderPaymentMovement[],
  summary:
    | {
        id: string;
        order_id: string;
        payment_method:
          PaymentMethod;
        total_amount:
          string | number;
        amount_received:
          string | number | null;
        change_amount:
          string | number | null;
        payment_reference:
          string | null;
        payment_timing:
          OrderPayment['paymentTiming'];
        created_at: string;
      }
    | null,
): OrderPayment {
  const latest =
    movements.length > 0
      ? movements[
          movements.length - 1
        ]
      : null;

  const paidTotal =
    movements.length > 0
      ? movements.reduce(
          (
            total,
            movement,
          ) =>
            total +
            movement.amount,
          0,
        )
      : Number(
          summary?.total_amount ??
          0,
        );

  return {
    id:
      latest?.id ??
      summary?.id ??
      orderId,

    orderId,

    paymentMethod:
      latest?.paymentMethod ??
      summary
        ?.payment_method ??
      'cash',

    totalAmount:
      roundCurrency(
        paidTotal,
      ),

    amountReceived:
      latest
        ?.amountReceived ??
      (
        summary
          ?.amount_received ===
        null ||
        summary
          ?.amount_received ===
        undefined
          ? null
          : Number(
              summary
                .amount_received,
            )
      ),

    changeAmount:
      latest
        ?.changeAmount ??
      (
        summary
          ?.change_amount ===
        null ||
        summary
          ?.change_amount ===
        undefined
          ? null
          : Number(
              summary
                .change_amount,
            )
      ),

    paymentReference:
      latest
        ?.paymentReference ??
      summary
        ?.payment_reference ??
      null,

    paymentTiming:
      latest
        ?.paymentTiming ??
      summary
        ?.payment_timing ??
      'final',

    createdAt:
      latest
        ?.createdAt ??
      summary
        ?.created_at ??
      new Date(0)
        .toISOString(),
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
