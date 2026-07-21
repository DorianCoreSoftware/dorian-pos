import { Product } from './product';
import { SelectedModifier } from './modifier';
import {
  ComboComponentSelection,
} from './combo';

export interface CartItem {
  id: string;
  product: Product;
  quantity: number;
  notes: string;
  selectedModifiers: SelectedModifier[];

  comboComponents?: ComboComponentSelection[];
}