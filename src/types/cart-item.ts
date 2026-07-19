import { SelectedModifier } from '../components/modifier-modal/ModifierModal';
import { Product } from './product';


export interface CartItem {
  id: string;
  product: Product;
  quantity: number;
  notes: string;
  selectedModifiers?: SelectedModifier[];
}