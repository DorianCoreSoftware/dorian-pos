import { Product } from './product';
import { SelectedModifier } from './modifier';
import {
  ComboComponentSelection,
} from './combo';
import { DeliveryDetails } from './delivery';

export interface CartItem {
  id: string;
  product: Product;
  quantity: number;
  notes: string;

  selectedModifiers: SelectedModifier[];

  comboComponents?: ComboComponentSelection[];

  deliveryDetails?: DeliveryDetails;
}