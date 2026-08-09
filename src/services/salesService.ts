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
    .filter(
      (
        record,
      ): record is typeof record & {
        order_payments:
          NonNullable<
            typeof record.order_payments
          >;
      } =>
        record.order_payments !==
        null,
    )
    .map(
      (
        record,
      ): CompletedSale => ({
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
            record
              .order_payments
              .id,

          orderId:
            record
              .order_payments
              .order_id,

          paymentMethod:
            record
              .order_payments
              .payment_method,

          totalAmount:
            Number(
              record
                .order_payments
                .total_amount,
            ),

          amountReceived:
            record
              .order_payments
              .amount_received ===
            null
              ? null
              : Number(
                  record
                    .order_payments
                    .amount_received,
                ),

          changeAmount:
            record
              .order_payments
              .change_amount ===
            null
              ? null
              : Number(
                  record
                    .order_payments
                    .change_amount,
                ),

          createdAt:
            record
              .order_payments
              .created_at,
        },
      }),
    );
}