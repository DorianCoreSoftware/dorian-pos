import {
  fetchOrderPaymentByOrderId,
  insertOrderPayment,
} from '../repositories/PaymentRepository';

import {
  OrderPayment,
  PaymentMethod,
} from '../types';

interface RegisterPaymentParams {
  orderId: string;
  paymentMethod: PaymentMethod;
  totalAmount: number;
  amountReceived?: number | null;
}

export async function registerOrderPayment({
  orderId,
  paymentMethod,
  totalAmount,
  amountReceived = null,
}: RegisterPaymentParams): Promise<OrderPayment> {
  validateOrderId(orderId);
  validateTotalAmount(totalAmount);

  const existingPayment =
    await fetchOrderPaymentByOrderId(
      orderId,
    );

  /*
   * Si el pago ya existe, no intentamos
   * insertarlo nuevamente.
   *
   * Esto permite recuperar el flujo si
   * el pago se guardó correctamente pero
   * falló el cambio de estado de la orden.
   */
  if (existingPayment) {
    return existingPayment;
  }

  if (paymentMethod === 'card') {
    return insertOrderPayment({
      orderId,
      paymentMethod,
      totalAmount,
      amountReceived: null,
      changeAmount: null,
    });
  }

  validateCashPayment(
    totalAmount,
    amountReceived,
  );

  const received =
    amountReceived as number;

  const changeAmount =
    calculateChange(
      totalAmount,
      received,
    );

  return insertOrderPayment({
    orderId,
    paymentMethod,
    totalAmount,
    amountReceived: received,
    changeAmount,
  });
}

export function calculateChange(
  totalAmount: number,
  amountReceived: number,
): number {
  const change =
    amountReceived - totalAmount;

  return roundCurrency(change);
}

function validateOrderId(
  orderId: string,
): void {
  if (!orderId?.trim()) {
    throw new Error(
      'El identificador de la orden es obligatorio.',
    );
  }
}

function validateTotalAmount(
  totalAmount: number,
): void {
  if (
    !Number.isFinite(
      totalAmount,
    ) ||
    totalAmount < 0
  ) {
    throw new Error(
      'El total de la orden no es válido.',
    );
  }
}

function validateCashPayment(
  totalAmount: number,
  amountReceived: number | null,
): void {
  if (
    amountReceived === null ||
    !Number.isFinite(
      amountReceived,
    )
  ) {
    throw new Error(
      'Ingresa la cantidad recibida.',
    );
  }

  if (amountReceived < 0) {
    throw new Error(
      'La cantidad recibida no es válida.',
    );
  }

  if (
    amountReceived <
    totalAmount
  ) {
    const missingAmount =
      roundCurrency(
        totalAmount -
          amountReceived,
      );

    throw new Error(
      `Faltan $${missingAmount.toFixed(
        2,
      )} para completar el pago.`,
    );
  }
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