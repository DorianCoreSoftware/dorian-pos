import {
  ComboRecipe,
  ComboSelectionMode,
} from '../domain/entities/ComboRecipe';

export interface SaveComboRecipeComponentInput {
  slotKey: string;
  type: string;
  label: string;
  selectionMode: ComboSelectionMode;
  fixedProductId: string | null;
  selectableCategoryId: string | null;
  allowsNotes: boolean;
  position: number;
  allowedProductIds: string[];
}

export interface SaveComboRecipeInput {
  comboProductId: string;
  enabled: boolean;
  components: SaveComboRecipeComponentInput[];
}

export interface ComboRepository {
  getRecipeByComboProductId(
    comboProductId: string,
  ): Promise<ComboRecipe | null>;

  getRecipeByComboProductIdForAdmin(
    comboProductId: string,
  ): Promise<ComboRecipe | null>;

  saveRecipe(
    input: SaveComboRecipeInput,
  ): Promise<string>;
}
