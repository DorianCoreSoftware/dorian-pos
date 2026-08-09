export type PaymentMethod =
  | 'cash'
  | 'card';

export interface OrderPayment {
  id: string;
  orderId: string;
  paymentMethod: PaymentMethod;
  totalAmount: number;
  amountReceived: number | null;
  changeAmount: number | null;
  createdAt: string;
}

export interface CreateOrderPayment {
  orderId: string;
  paymentMethod: PaymentMethod;
  totalAmount: number;
  amountReceived: number | null;
  changeAmount: number | null;
}

export interface CompletedSale {
  orderId: string;

  totalAmount: number;

  orderStatus: string;

  orderCreatedAt: string;

  payment: OrderPayment;
}