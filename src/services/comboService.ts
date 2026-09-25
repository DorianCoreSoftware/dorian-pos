import {
  ComboRecipe,
} from '../domain/entities/ComboRecipe';
import {
  SaveComboRecipeInput,
} from '../repositories/ComboRepository';
import {
  SupabaseComboRepository,
} from '../repositories/SupabaseComboRepository';
import { supabase } from './supabase';

const comboRepository =
  new SupabaseComboRepository(supabase);

function validateComboProductId(
  comboProductId: string,
): void {
  if (!comboProductId.trim()) {
    throw new Error(
      'El identificador del combo es obligatorio.',
    );
  }
}

export async function getComboRecipeByProductId(
  comboProductId: string,
): Promise<ComboRecipe | null> {
  validateComboProductId(
    comboProductId,
  );

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

export async function getComboRecipeForAdmin(
  comboProductId: string,
): Promise<ComboRecipe | null> {
  validateComboProductId(
    comboProductId,
  );

  try {
    return await comboRepository
      .getRecipeByComboProductIdForAdmin(
        comboProductId,
      );
  } catch (error) {
    console.error(
      'Error al obtener la receta administrativa del combo:',
      error,
    );

    throw error;
  }
}

export async function saveComboRecipe(
  input: SaveComboRecipeInput,
): Promise<string> {
  validateComboProductId(
    input.comboProductId,
  );

  try {
    return await comboRepository
      .saveRecipe(input);
  } catch (error) {
    console.error(
      'Error al guardar la receta del combo:',
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
