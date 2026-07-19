import { Product } from './product';
import { SelectedModifier } from './modifier';

export interface CartItem {
  id: string;
  product: Product;
  quantity: number;
  notes: string;
  selectedModifiers: SelectedModifier[];
}