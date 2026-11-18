import {
  supabase,
} from '../services/supabase';

import {
  CreateOrderPayment,
  OrderPayment,
  OrderPaymentMovement,
  OrderPaymentState,
  PaymentMethod,
  PaymentTiming,
} from '../types';

export interface CompletedSaleRecord {
  id: string;
  total: string | number;
  status: string;
  created_at: string;

  order_payments:
    | OrderPaymentRecord
    | OrderPaymentRecord[]
    | null;

  order_payment_movements:
    | OrderPaymentMovementRecord[]
    | null;
}

interface OrderPaymentRecord {
  id: string;
  order_id: string;
  payment_method: PaymentMethod;
  total_amount: string | number;
  amount_received: string | number | null;
  change_amount: string | number | null;
  payment_reference: string | null;
  payment_timing: PaymentTiming;
  created_at: string;
}

interface OrderPaymentMovementRecord {
  id: string;
  order_id: string;
  payment_method: PaymentMethod;
  amount: string | number;
  amount_received: string | number | null;
  change_amount: string | number | null;
  payment_reference: string | null;
  payment_timing: PaymentTiming;
  created_at: string;
}

interface OrderPaymentStateRecord {
  orderId?: string;
  order_id?: string;
  orderTotal?: string | number;
  order_total?: string | number;
  paidTotal?: string | number;
  paid_total?: string | number;
  balanceDue?: string | number;
  balance_due?: string | number;
  creditDue?: string | number;
  credit_due?: string | number;
  status?: OrderPaymentState['status'];
  movements?: Array<Record<string, unknown>>;
}

export class PaymentRepositoryError extends Error {
  code: string | null;

  constructor(
    message: string,
    code: string | null,
  ) {
    super(message);
    this.name = 'PaymentRepositoryError';
    this.code = code;
  }
}

/**
 * Legacy direct insert retained for compatibility with older callers.
 * New POS/Kitchen flows should use register_order_payment_movement RPC.
 */
export async function insertOrderPayment(
  payment: CreateOrderPayment,
): Promise<OrderPayment> {
  const { data, error } = await supabase
    .from('order_payments')
    .insert({
      order_id: payment.orderId,
      payment_method: payment.paymentMethod,
      total_amount: payment.totalAmount,
      amount_received: payment.amountReceived,
      change_amount: payment.changeAmount,
      payment_reference: payment.paymentReference ?? null,
      payment_timing: payment.paymentTiming ?? 'final',
    })
    .select()
    .single();

  if (error) {
    throw new PaymentRepositoryError(
      `No se pudo registrar el pago: ${error.message}`,
      error.code ?? null,
    );
  }

  if (!data) {
    throw new Error('Supabase no devolvió el pago registrado.');
  }

  return mapOrderPayment(data as OrderPaymentRecord);
}

export async function fetchOrderPaymentByOrderId(
  orderId: string,
): Promise<OrderPayment | null> {
  const { data, error } = await supabase
    .from('order_payments')
    .select('*')
    .eq('order_id', orderId)
    .maybeSingle();

  if (error) {
    throw new Error(
      `No se pudo consultar el pago de la orden: ${error.message}`,
    );
  }

  return data
    ? mapOrderPayment(data as OrderPaymentRecord)
    : null;
}

export async function fetchOrderPaymentState(
  orderId: string,
): Promise<OrderPaymentState> {
  const { data, error } = await supabase.rpc(
    'get_order_payment_state',
    {
      p_order_id: orderId,
    },
  );

  if (error) {
    throw new Error(
      `No se pudo consultar el saldo del pedido: ${error.message}`,
    );
  }

  return mapOrderPaymentState(
    (data ?? {}) as OrderPaymentStateRecord,
    orderId,
  );
}

export async function registerOrderPaymentMovement(input: {
  orderId: string;
  paymentMethod: PaymentMethod;
  amount: number;
  amountReceived: number | null;
  paymentReference: string | null;
  paymentTiming: 'advance' | 'final';
}): Promise<OrderPaymentState> {
  const { data, error } = await supabase.rpc(
    'register_order_payment_movement',
    {
      p_order_id: input.orderId,
      p_payment_method: input.paymentMethod,
      p_amount: input.amount,
      p_amount_received: input.amountReceived,
      p_payment_reference: input.paymentReference,
      p_payment_timing: input.paymentTiming,
    },
  );

  if (error) {
    throw new PaymentRepositoryError(
      `No se pudo registrar el pago: ${error.message}`,
      error.code ?? null,
    );
  }

  return mapOrderPaymentState(
    (data ?? {}) as OrderPaymentStateRecord,
    input.orderId,
  );
}

export async function registerOrderOverpaymentRefund(input: {
  orderId: string;
  paymentMethod: PaymentMethod;
  amount: number;
  paymentReference?: string | null;
}): Promise<OrderPaymentState> {
  const { data, error } = await supabase.rpc(
    'register_order_overpayment_refund',
    {
      p_order_id: input.orderId,
      p_payment_method: input.paymentMethod,
      p_amount: input.amount,
      p_reference: input.paymentReference ?? null,
    },
  );

  if (error) {
    throw new PaymentRepositoryError(
      `No se pudo registrar la devolución de diferencia: ${error.message}`,
      error.code ?? null,
    );
  }

  return mapOrderPaymentState(
    (data ?? {}) as OrderPaymentStateRecord,
    input.orderId,
  );
}

function mapOrderPayment(
  record: OrderPaymentRecord,
): OrderPayment {
  return {
    id: record.id,
    orderId: record.order_id,
    paymentMethod: record.payment_method,
    totalAmount: Number(record.total_amount),
    amountReceived:
      record.amount_received === null
        ? null
        : Number(record.amount_received),
    changeAmount:
      record.change_amount === null
        ? null
        : Number(record.change_amount),
    paymentReference: record.payment_reference ?? null,
    paymentTiming: record.payment_timing ?? 'final',
    createdAt: record.created_at,
  };
}

export function mapOrderPaymentMovement(
  record: OrderPaymentMovementRecord,
): OrderPaymentMovement {
  return {
    id: record.id,
    orderId: record.order_id,
    paymentMethod: record.payment_method,
    amount: Number(record.amount),
    amountReceived:
      record.amount_received === null
        ? null
        : Number(record.amount_received),
    changeAmount:
      record.change_amount === null
        ? null
        : Number(record.change_amount),
    paymentReference: record.payment_reference ?? null,
    paymentTiming: record.payment_timing ?? 'final',
    createdAt: record.created_at,
  };
}

function mapOrderPaymentState(
  record: OrderPaymentStateRecord,
  fallbackOrderId: string,
): OrderPaymentState {
  const rawMovements = Array.isArray(record.movements)
    ? record.movements
    : [];

  const movements: OrderPaymentMovement[] = rawMovements.map(
    (movement, index) => ({
      id: String(movement.id ?? `${fallbackOrderId}-${index}`),
      orderId: String(
        movement.orderId ??
          movement.order_id ??
          fallbackOrderId,
      ),
      paymentMethod: String(
        movement.paymentMethod ??
          movement.payment_method ??
          'cash',
      ) as PaymentMethod,
      amount: Number(movement.amount ?? 0),
      amountReceived:
        movement.amountReceived == null &&
        movement.amount_received == null
          ? null
          : Number(
              movement.amountReceived ??
                movement.amount_received,
            ),
      changeAmount:
        movement.changeAmount == null &&
        movement.change_amount == null
          ? null
          : Number(
              movement.changeAmount ??
                movement.change_amount,
            ),
      paymentReference:
        String(
          movement.paymentReference ??
            movement.payment_reference ??
            '',
        ).trim() || null,
      paymentTiming: String(
        movement.paymentTiming ??
          movement.payment_timing ??
          'final',
      ) as PaymentTiming,
      createdAt: String(
        movement.createdAt ??
          movement.created_at ??
          new Date(0).toISOString(),
      ),
    }),
  );

  return {
    orderId: String(
      record.orderId ??
        record.order_id ??
        fallbackOrderId,
    ),
    orderTotal: Number(
      record.orderTotal ??
        record.order_total ??
        0,
    ),
    paidTotal: Number(
      record.paidTotal ??
        record.paid_total ??
        0,
    ),
    balanceDue: Number(
      record.balanceDue ??
        record.balance_due ??
        0,
    ),
    creditDue: Number(
      record.creditDue ??
        record.credit_due ??
        0,
    ),
    status:
      record.status ?? 'unpaid',
    movements,
  };
}

export async function fetchCompletedSales(): Promise<
  CompletedSaleRecord[]
> {
  const { data, error } = await supabase
    .from('orders')
    .select(`
      id,
      total,
      status,
      created_at,
      order_payments(
        id,
        order_id,
        payment_method,
        total_amount,
        amount_received,
        change_amount,
        payment_reference,
        payment_timing,
        created_at
      ),
      order_payment_movements(
        id,
        order_id,
        payment_method,
        amount,
        amount_received,
        change_amount,
        payment_reference,
        payment_timing,
        created_at
      )
    `)
    .eq('status', 'delivered')
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(
      `No se pudieron consultar las ventas: ${error.message}`,
    );
  }

  return (data ?? []) as unknown as CompletedSaleRecord[];
}

export async function fetchOrderPaymentMovementsSince(
  since: string,
): Promise<OrderPaymentMovement[]> {
  const { data, error } = await supabase
    .from('order_payment_movements')
    .select('*')
    .gte('created_at', since)
    .order('created_at', { ascending: true });

  if (error) {
    throw new Error(
      `No se pudieron consultar los movimientos de pago: ${error.message}`,
    );
  }

  return (
    (data ?? []) as OrderPaymentMovementRecord[]
  ).map(mapOrderPaymentMovement);
}
