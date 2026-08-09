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