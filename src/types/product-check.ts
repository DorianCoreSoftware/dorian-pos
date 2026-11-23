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

  /**
   * Estado elegido por el cliente.
   */
  isSelected: boolean;

  /**
   * Snapshot del estado configurado al crear la orden.
   *
   * true  = normalmente viene incluido.
   * false = normalmente NO viene incluido, pero el cliente puede agregarlo.
   *
   * Es opcional para mantener compatibilidad con órdenes/carritos creados
   * antes de DorianCore 1.7.x. Si falta, se interpreta como true.
   */
  defaultSelected?: boolean;
}
