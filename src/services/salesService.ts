import {
  fetchCompletedSales,
} from '../repositories/PaymentRepository';

import {
  CompletedSale,
} from '../types';

export async function getCompletedSales(): Promise<
  CompletedSale[]
> {
  const records =
    await fetchCompletedSales();

  return records
    .map((record) => {
      const payment =
        Array.isArray(
          record.order_payments,
        )
          ? record.order_payments[0] ??
          null
          : record.order_payments ??
          null;

      if (!payment) {
        return null;
      }

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

        payment: {
          id:
            payment.id,

          orderId:
            payment.order_id,

          paymentMethod:
            payment.payment_method,

          totalAmount:
            Number(
              payment.total_amount,
            ),

          amountReceived:
            payment.amount_received ===
              null
              ? null
              : Number(
                payment.amount_received,
              ),

          changeAmount:
            payment.change_amount ===
              null
              ? null
              : Number(
                payment.change_amount,
              ),

          paymentReference:
            payment.payment_reference ?? null,

          paymentTiming:
            payment.payment_timing ?? 'final',

          createdAt:
            payment.created_at,
        },
      } satisfies CompletedSale;
    })
    .filter(
      (
        sale,
      ): sale is CompletedSale =>
        sale !== null,
    );
}