import {
  supabase,
} from '../services/supabase';

import {
  CreateOrderPayment,
  OrderPayment,
} from '../types';

interface OrderPaymentRecord {
  id: string;
  order_id: string;
  payment_method:
    | 'cash'
    | 'card';
  total_amount: string | number;
  amount_received:
    | string
    | number
    | null;
  change_amount:
    | string
    | number
    | null;
  created_at: string;
}

export async function insertOrderPayment(
  payment: CreateOrderPayment,
): Promise<OrderPayment> {
  const { data, error } =
    await supabase
      .from('order_payments')
      .insert({
        order_id:
          payment.orderId,

        payment_method:
          payment.paymentMethod,

        total_amount:
          payment.totalAmount,

        amount_received:
          payment.amountReceived,

        change_amount:
          payment.changeAmount,
      })
      .select()
      .single();

  if (error) {
    throw new Error(
      `No se pudo registrar el pago: ${error.message}`,
    );
  }

  if (!data) {
    throw new Error(
      'Supabase no devolvió el pago registrado.',
    );
  }

  return mapOrderPayment(
    data as OrderPaymentRecord,
  );
}

export async function fetchOrderPaymentByOrderId(
  orderId: string,
): Promise<OrderPayment | null> {
  const { data, error } =
    await supabase
      .from('order_payments')
      .select('*')
      .eq(
        'order_id',
        orderId,
      )
      .maybeSingle();

  if (error) {
    throw new Error(
      `No se pudo consultar el pago de la orden: ${error.message}`,
    );
  }

  if (!data) {
    return null;
  }

  return mapOrderPayment(
    data as OrderPaymentRecord,
  );
}

function mapOrderPayment(
  record: OrderPaymentRecord,
): OrderPayment {
  return {
    id:
      record.id,

    orderId:
      record.order_id,

    paymentMethod:
      record.payment_method,

    totalAmount:
      Number(
        record.total_amount,
      ),

    amountReceived:
      record.amount_received ===
      null
        ? null
        : Number(
            record.amount_received,
          ),

    changeAmount:
      record.change_amount ===
      null
        ? null
        : Number(
            record.change_amount,
          ),

    createdAt:
      record.created_at,
  };
}