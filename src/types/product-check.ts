export interface ProductCheckGroup {
  id: string;
  productId?: string | null;
  categoryId?: string | null;
  source?: 'product' | 'category';
  name: string;
  position: number;
  isActive: boolean;
}

export interface ProductCheckOption {
  id: string;
  groupId: string;
  name: string;
  position: number;
  isActive: boolean;
  defaultSelected: boolean;
}

export interface ProductCheckAssignment {
  id: string;
  productId: string;
  groupId: string;
  minSelections: number;
  maxSelections: number;
  position: number;
  isActive: boolean;
  group: ProductCheckGroup;
  options: ProductCheckOption[];
}

export interface SelectedProductCheck {
  groupId: string;
  groupName: string;
  optionId: string;
  optionName: string;
  isSelected: boolean;
}
