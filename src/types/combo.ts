import { Product, ProductCookingMethod } from './product';
import { SelectedModifier } from './modifier';

export type ComboComponentType = string;

export interface ComboComponentSelection {
  slotId: string;
  type: ComboComponentType;
  label: string;
  product: Product;
  quantity: number;
  notes: string;
  selectedModifiers: SelectedModifier[];
  cookingMethod?: ProductCookingMethod | null;
}