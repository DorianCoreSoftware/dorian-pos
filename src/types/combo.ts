import { Product } from './product';
import { SelectedModifier } from './modifier';

export type ComboComponentType =
  | 'burger'
  | 'hotdog'
  | 'side'
  | 'drink';

export interface ComboComponentSelection {
  slotId: string;
  type: ComboComponentType;
  label: string;
  product: Product;
  quantity: number;
  notes: string;
  selectedModifiers: SelectedModifier[];
}