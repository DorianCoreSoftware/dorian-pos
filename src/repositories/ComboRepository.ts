import { ComboRecipe } from "../domain/entities/ComboRecipe";


export interface ComboRepository {
  getRecipeByComboProductId(
    comboProductId: string
  ): Promise<ComboRecipe | null>;
}