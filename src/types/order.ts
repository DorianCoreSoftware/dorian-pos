import { ComboComponentType } from './combo';
import { OrderDeliveryDetails } from './delivery';
import { Modifier } from './modifier';
import { Product } from './product';

export type OrderStatus =
  | 'pending'
  | 'completed'
  | 'cancelled'
  | 'entregado'
  | 'cancelado';

export interface KitchenOrderItemComponent {
  id: string;
  order_item_id: string;
  product_id: string;

  slot_id?: string | null;
  component_type: ComboComponentType;
  label: string;

  quantity: number;
  notes: string | null;
  position?: number | null;

  products: Product | null;
  modifiers: Modifier[];
}

export interface KitchenOrderItem {
  id: string;
  order_id: string;
  product_id: string;
  quantity: number;
  price_at_purchase: string | number;
  notes: string | null;

  products: Product | null;
  modifiers: Modifier[];

  components?: KitchenOrderItemComponent[];
}

export interface KitchenOrder {
  id: string;
  total: string | number;
  status: OrderStatus;

  orderSource:
    | 'pos'
    | 'web';

  fulfillmentType:
    | 'pickup'
    | 'delivery';

  created_at: string;

  deliveryDetails:
    OrderDeliveryDetails | null;

  order_items:
    KitchenOrderItem[];
}