export type PaymentMethod =
  | 'cash'
  | 'card'
  | 'transfer';

export interface OrderPayment {
  id: string;
  orderId: string;
  paymentMethod: PaymentMethod;
  totalAmount: number;
  amountReceived: number | null;
  changeAmount: number | null;
  paymentReference: string | null;
  createdAt: string;
}

export interface CreateOrderPayment {
  orderId: string;
  paymentMethod: PaymentMethod;
  totalAmount: number;
  amountReceived: number | null;
  changeAmount: number | null;
  paymentReference?: string | null;
}

export interface CompletedSale {
  orderId: string;

  totalAmount: number;

  orderStatus: string;

  orderCreatedAt: string;

  payment: OrderPayment;
}