import {
  fetchOrderPaymentByOrderId,
  insertOrderPayment,
  PaymentRepositoryError,
} from '../repositories/PaymentRepository';

import {
  OrderPayment,
  PaymentMethod,
} from '../types';

import {
  DEFAULT_CURRENCY_CODE,
  formatCurrency,
} from '../Utils/currency';

interface RegisterPaymentParams {
  orderId: string;
  paymentMethod:
    PaymentMethod;
  totalAmount: number;

  amountReceived?:
    number | null;

  paymentReference?:
    string | null;

  currencyCode?:
    string;
}

export async function registerOrderPayment({
  orderId,
  paymentMethod,
  totalAmount,
  amountReceived = null,
  paymentReference = null,
  currencyCode =
    DEFAULT_CURRENCY_CODE,
}: RegisterPaymentParams): Promise<OrderPayment> {
  validateOrderId(
    orderId,
  );

  validateTotalAmount(
    totalAmount,
  );

  const existingPayment =
    await fetchOrderPaymentByOrderId(
      orderId,
    );

  if (existingPayment) {
    return existingPayment;
  }

  const paymentPayload =
    buildPaymentPayload({
      orderId,
      paymentMethod,
      totalAmount,
      amountReceived,
      paymentReference,
      currencyCode,
    });

  try {
    return await insertOrderPayment(
      paymentPayload,
    );
  } catch (error) {
    /*
     * 23505 = unique_violation.
     *
     * Otro request pudo registrar
     * el pago entre nuestro SELECT
     * y nuestro INSERT.
     */
    if (
      error instanceof
        PaymentRepositoryError &&
      error.code ===
        '23505'
    ) {
      const paymentAfterConflict =
        await fetchOrderPaymentByOrderId(
          orderId,
        );

      if (
        paymentAfterConflict
      ) {
        return paymentAfterConflict;
      }
    }

    throw error;
  }
}

function buildPaymentPayload({
  orderId,
  paymentMethod,
  totalAmount,
  amountReceived,
  paymentReference,
  currencyCode =
    DEFAULT_CURRENCY_CODE,
}: RegisterPaymentParams) {
  if (
    paymentMethod ===
    'card' ||
    paymentMethod ===
    'transfer'
  ) {
    return {
      orderId,
      paymentMethod,
      totalAmount,
      amountReceived: null,
      changeAmount: null,
      paymentReference:
        paymentMethod === 'transfer'
          ? validateTransferReference(paymentReference)
          : null,
    };
  }

  validateCashPayment(
    totalAmount,
    amountReceived ??
      null,
    currencyCode,
  );

  const received =
    amountReceived as number;

  return {
    orderId,
    paymentMethod,
    totalAmount,

    amountReceived:
      received,

    changeAmount:
      calculateChange(
        totalAmount,
        received,
      ),
    paymentReference: null,
  };
}


function validateTransferReference(
  value: string | null | undefined,
): string {
  const clean = value?.trim() ?? '';
  if (clean.length < 3) {
    throw new Error(
      'Captura la referencia o folio de la transferencia.',
    );
  }
  return clean.slice(0, 160);
}

export function calculateChange(
  totalAmount: number,
  amountReceived: number,
): number {
  const change =
    amountReceived -
    totalAmount;

  return roundCurrency(
    change,
  );
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
  amountReceived:
    number | null,
  currencyCode:
    string,
): void {
  if (
    amountReceived ===
      null ||
    !Number.isFinite(
      amountReceived,
    )
  ) {
    throw new Error(
      'Ingresa la cantidad recibida.',
    );
  }

  if (
    amountReceived < 0
  ) {
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
      `Faltan ${formatCurrency(
        missingAmount,
        currencyCode,
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