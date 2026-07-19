export type ModifierGroup = 'Carne' | 'Salsa' | null;

export interface Modifier {
  id: string;
  name: string;
  extra_price: string | number;
  is_available: boolean;
  group_name: ModifierGroup;
}

export type SelectedModifier = Modifier;