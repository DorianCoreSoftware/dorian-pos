export interface ModifierGroupReference {
  id: string;
  code: string;
  name: string;
  is_active?: boolean;
  position?: number;
}

export interface Modifier {
  id: string;
  name: string;
  extra_price: string | number;
  is_available: boolean;

  group_id?: string | null;
  group?: ModifierGroupReference | null;
}

export type SelectedModifier = Modifier;
