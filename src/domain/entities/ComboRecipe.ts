export type ComboComponentType =
  | 'burger'
  | 'hotdog'
  | 'side'
  | 'drink';

export type ComboSelectionMode =
  | 'fixed'
  | 'selectable';

export type ComboProductRuleType =
  | 'allowed'
  | 'excluded';

export interface ComboProductOption {
  id: string;
  categoryId: string;
  name: string;
  description: string | null;
  price: number;
  imageUrl: string | null;
  isAvailable: boolean;
  isActive: boolean;
  isComboOption: boolean;
  flavors: ProductFlavor[];
}

export interface ComboComponentProductRule {
  productId: string;
  ruleType: ComboProductRuleType;
}

export interface ComboRecipeComponent {
  id: string;
  slotKey: string;
  type: ComboComponentType;
  label: string;
  selectionMode: ComboSelectionMode;
  position: number;

  fixedProductId: string | null;
  selectableCategoryId: string | null;

  allowsNotes: boolean;
  requiresMeat: boolean;
  requiresSauce: boolean;
  requiresDrinkFlavor: boolean;

  fixedProduct: ComboProductOption | null;
  options: ComboProductOption[];
  rules: ComboComponentProductRule[];
}

export interface ComboRecipe {
  id: string;
  comboProductId: string;
  enabled: boolean;
  components: ComboRecipeComponent[];
}

export interface ProductFlavor {
  id: string;
  productId: string;
  name: string;
  isAvailable: boolean;
  position: number;
}