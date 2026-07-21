import { ProductModifierMode } from "../services/modifierService";
import { SelectedModifier } from "./modifier";
import { Product } from "./product";

export interface ProductConfiguratorModalProps {
  visible: boolean;
  product: Product | null;
  notes: string;

  mode: ProductModifierMode;
  isKongBurger: boolean;

  meats: SelectedModifier[];
  sauces: SelectedModifier[];

  isLoading: boolean;
  error: string | null;

  onNotesChange: (text: string) => void;
  onClose: () => void;

  onConfirm: (
    selectedModifiers: SelectedModifier[],
  ) => void;
}