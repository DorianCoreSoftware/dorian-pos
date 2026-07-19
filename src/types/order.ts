import { Modifier } from './modifier';
import { Product } from './product';

export type OrderStatus =
  | 'pending'
  | 'completed'
  | 'cancelled'
  | 'entregado'
  | 'cancelado';

export interface KitchenOrderItem {
  id: string;
  order_id: string;
  product_id: string;
  quantity: number;
  price_at_purchase: string | number;
  notes: string | null;
  products: Product | null;
  modifiers: Modifier[];
}

export interface KitchenOrder {
  id: string;
  total: string | number;
  status: OrderStatus;
  created_at: string;
  order_items: KitchenOrderItem[];
}