import { ComboComponentType } from './combo';
import { OrderDeliveryDetails } from './delivery';
import { Modifier } from './modifier';
import { Product, ProductCookingMethod } from './product';

export type OrderStatus =
  | 'pending'
  | 'preparing'
  | 'ready'
  | 'on_the_way'
  | 'delivered'
  | 'cancelled';

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
  cooking_method?: ProductCookingMethod | null;

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

  reward_source?: 'promotion' | 'loyalty' | null;

  is_prepared: boolean;
  prepared_at: string | null;
  prepared_by: string | null;
  cooking_method?: ProductCookingMethod | null;

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

  requestedPaymentMethod:
  | 'cash'
  | 'card'
  | 'transfer'
  | null;

  created_at: string;

  deliveryDetails:
  OrderDeliveryDetails | null;

  order_items:
  KitchenOrderItem[];

  customerName:
  string | null;

  customerPhone:
  string | null;

  driverId:
  | string
  | null;

driverName:
  | string
  | null;
}