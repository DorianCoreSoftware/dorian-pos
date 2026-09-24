import {
  ComboRecipe,
} from '../domain/entities/ComboRecipe';
import {
  SupabaseComboRepository,
} from '../repositories/SupabaseComboRepository';
import { supabase } from './supabase';
const comboRepository =
  new SupabaseComboRepository(supabase);
export async function getComboRecipeByProductId(
  comboProductId: string,
): Promise<ComboRecipe | null> {
  if (!comboProductId.trim()) {
    throw new Error(
      'El identificador del combo es obligatorio.',
    );
  }
  try {
    return await comboRepository
      .getRecipeByComboProductId(
        comboProductId,
      );
  } catch (error) {
    console.error(
      'Error al obtener la receta del combo:',
      error,
    );
    throw error;
  }
}
export async function hasActiveComboRecipe(
  comboProductId: string,
): Promise<boolean> {
  const recipe =
    await getComboRecipeByProductId(
      comboProductId,
    );
  return recipe !== null;
}
