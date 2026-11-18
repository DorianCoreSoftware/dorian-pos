import {
  fetchOrderPaymentMovementsSince,
  fetchOrderPaymentState,
  registerOrderOverpaymentRefund,
  registerOrderPaymentMovement,
} from '../repositories/PaymentRepository';

import {
  OrderPaymentMovement,
  OrderPaymentState,
  PaymentMethod,
  PaymentTiming,
} from '../types';

import {
  DEFAULT_CURRENCY_CODE,
  formatCurrency,
} from '../Utils/currency';

interface RegisterPaymentParams {
  orderId: string;
  paymentMethod: PaymentMethod;

  /**
   * Amount applied to the outstanding balance in this movement.
   * For the first payment this may equal the order total; after edits it is
   * normally only the remaining balance.
   */
  totalAmount: number;

  amountReceived?: number | null;
  paymentReference?: string | null;
  paymentTiming?: Exclude<PaymentTiming, 'adjustment'>;
  currencyCode?: string;
}


export async function getOrderPaymentMovementsSince(
  since: string,
): Promise<OrderPaymentMovement[]> {
  return fetchOrderPaymentMovementsSince(
    since,
  );
}

export async function getOrderPaymentState(
  orderId: string,
): Promise<OrderPaymentState> {
  validateOrderId(orderId);
  return fetchOrderPaymentState(orderId);
}

export async function registerOrderPayment({
  orderId,
  paymentMethod,
  totalAmount,
  amountReceived = null,
  paymentReference = null,
  paymentTiming = 'final',
  currencyCode = DEFAULT_CURRENCY_CODE,
}: RegisterPaymentParams): Promise<OrderPaymentState> {
  validateOrderId(orderId);
  validateTotalAmount(totalAmount);

  if (paymentMethod === 'cash') {
    validateCashPayment(
      totalAmount,
      amountReceived,
      currencyCode,
    );
  }

  if (
    paymentMethod === 'transfer' &&
    (paymentReference?.trim().length ?? 0) < 3
  ) {
    throw new Error(
      'Captura la referencia o folio de la transferencia.',
    );
  }

  return registerOrderPaymentMovement({
    orderId,
    paymentMethod,
    amount: roundCurrency(totalAmount),
    amountReceived:
      paymentMethod === 'cash'
        ? amountReceived
        : null,
    paymentReference:
      paymentMethod === 'transfer'
        ? paymentReference?.trim() ?? null
        : null,
    paymentTiming,
  });
}

export async function refundOrderOverpayment(input: {
  orderId: string;
  paymentMethod: PaymentMethod;
  amount: number;
  paymentReference?: string | null;
}): Promise<OrderPaymentState> {
  validateOrderId(input.orderId);
  validateTotalAmount(input.amount);

  if (input.amount <= 0) {
    throw new Error(
      'El importe de devolución debe ser mayor a cero.',
    );
  }

  return registerOrderOverpaymentRefund({
    orderId: input.orderId,
    paymentMethod: input.paymentMethod,
    amount: roundCurrency(input.amount),
    paymentReference: input.paymentReference ?? null,
  });
}

export function calculateChange(
  totalAmount: number,
  amountReceived: number,
): number {
  return roundCurrency(
    amountReceived - totalAmount,
  );
}

function validateOrderId(orderId: string): void {
  if (!orderId?.trim()) {
    throw new Error(
      'El identificador de la orden es obligatorio.',
    );
  }
}

function validateTotalAmount(totalAmount: number): void {
  if (
    !Number.isFinite(totalAmount) ||
    totalAmount < 0
  ) {
    throw new Error(
      'El importe del pago no es válido.',
    );
  }
}

function validateCashPayment(
  totalAmount: number,
  amountReceived: number | null,
  currencyCode: string,
): void {
  if (
    amountReceived === null ||
    !Number.isFinite(amountReceived)
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

  if (amountReceived < totalAmount) {
    const missingAmount = roundCurrency(
      totalAmount - amountReceived,
    );

    throw new Error(
      `Faltan ${formatCurrency(
        missingAmount,
        currencyCode,
      )} para completar el pago.`,
    );
  }
}

function roundCurrency(amount: number): number {
  return (
    Math.round(
      (amount + Number.EPSILON) * 100,
    ) / 100
  );
}
