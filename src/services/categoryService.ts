import {
  fetchActiveCategories,
  fetchAllCategories,
  insertCategory,
  setCategoryActiveById,
  updateCategoryById,
} from '../repositories/CategoryRepository';

import {
  Category,
} from '../types';

export interface CreateCategoryInput {
  name: string;
  description: string;
}

export interface UpdateCategoryInput {
  name: string;
  description: string;
}

export async function getActiveCategories(): Promise<
  Category[]
> {
  try {
    return await fetchActiveCategories();
  } catch (error) {
    console.error(
      'Error al obtener categorías activas:',
      error,
    );

    throw new Error(
      'No se pudieron obtener las categorías.',
    );
  }
}

export async function getAllCategories(): Promise<
  Category[]
> {
  try {
    return await fetchAllCategories();
  } catch (error) {
    console.error(
      'Error al obtener todas las categorías:',
      error,
    );

    throw new Error(
      'No se pudieron obtener las categorías.',
    );
  }
}

export async function createCategory(
  input:
    CreateCategoryInput,
): Promise<Category> {
  const cleanName =
    input.name.trim();

  const cleanDescription =
    input.description.trim();

  validateCategoryName(
    cleanName,
  );

  try {
    return await insertCategory({
      name:
        cleanName,

      description:
        cleanDescription ||
        null,
    });
  } catch (error) {
    console.error(
      'Error al crear categoría:',
      error,
    );

    throw mapCategoryError(
      error,
      'No se pudo crear la categoría.',
    );
  }
}

export async function updateCategory(
  categoryId: string,
  input:
    UpdateCategoryInput,
): Promise<Category> {
  validateCategoryId(
    categoryId,
  );

  const cleanName =
    input.name.trim();

  const cleanDescription =
    input.description.trim();

  validateCategoryName(
    cleanName,
  );

  try {
    return await updateCategoryById(
      categoryId,
      {
        name:
          cleanName,

        description:
          cleanDescription ||
          null,
      },
    );
  } catch (error) {
    console.error(
      'Error al actualizar categoría:',
      error,
    );

    throw mapCategoryError(
      error,
      'No se pudo actualizar la categoría.',
    );
  }
}

export async function setCategoryActive(
  categoryId: string,
  isActive: boolean,
): Promise<Category> {
  validateCategoryId(
    categoryId,
  );

  try {
    return await setCategoryActiveById(
      categoryId,
      isActive,
    );
  } catch (error) {
    console.error(
      'Error al cambiar estado de categoría:',
      error,
    );

    throw new Error(
      isActive
        ? 'No se pudo activar la categoría.'
        : 'No se pudo desactivar la categoría.',
    );
  }
}

function validateCategoryId(
  categoryId: string,
): void {
  if (!categoryId?.trim()) {
    throw new Error(
      'La categoría no es válida.',
    );
  }
}

function validateCategoryName(
  name: string,
): void {
  if (!name) {
    throw new Error(
      'El nombre de la categoría es obligatorio.',
    );
  }

  if (name.length > 80) {
    throw new Error(
      'El nombre de la categoría es demasiado largo.',
    );
  }
}

function mapCategoryError(
  error: unknown,
  fallbackMessage: string,
): Error {
  if (
    error instanceof Error &&
    error.message.includes(
      'categories_name_unique',
    )
  ) {
    return new Error(
      'Ya existe una categoría con ese nombre.',
    );
  }

  return new Error(
    fallbackMessage,
  );
}