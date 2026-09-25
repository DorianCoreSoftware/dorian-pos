import {
  deleteProductModifierGroup,
  fetchActiveProductModifierGroups,
  fetchProductModifierGroups,
  ProductModifierGroup,
  replaceProductModifierGroups,
  UpsertProductModifierGroupData,
  upsertProductModifierGroup,
} from '../repositories/ProductModifierGroupRepository';

export type {
  ProductModifierGroup,
};

export interface SaveProductModifierGroupInput {
  productId: string;

  modifierGroupId: string;

  isRequired: boolean;

  minSelections: number;

  maxSelections: number;

  allowDuplicates: boolean;

  position: number;

  isActive?: boolean;
}

export async function getProductModifierGroups(
  productId: string,
): Promise<
  ProductModifierGroup[]
> {
  try {
    return await fetchProductModifierGroups(
      productId,
    );
  } catch (error) {
    console.error(
      'Error al obtener grupos del producto:',
      error,
    );

    throw new Error(
      error instanceof Error
        ? error.message
        : 'No se pudieron obtener los grupos del producto.',
    );
  }
}

export async function getActiveProductModifierGroups(
  productId: string,
): Promise<
  ProductModifierGroup[]
> {
  try {
    return await fetchActiveProductModifierGroups(
      productId,
    );
  } catch (error) {
    console.error(
      'Error al obtener grupos activos del producto:',
      error,
    );

    throw new Error(
      error instanceof Error
        ? error.message
        : 'No se pudieron obtener los grupos activos del producto.',
    );
  }
}

export async function saveProductModifierGroup(
  input:
    SaveProductModifierGroupInput,
): Promise<
  ProductModifierGroup
> {
  validateInput(
    input,
  );

  const data:
    UpsertProductModifierGroupData = {
    productId:
      input.productId,

    modifierGroupId:
      input.modifierGroupId,

    isRequired:
      input.isRequired,

    minSelections:
      input.minSelections,

    maxSelections:
      input.maxSelections,

    allowDuplicates:
      input.allowDuplicates,

    position:
      input.position,

    isActive:
      input.isActive ??
      true,
  };

  try {
    return await upsertProductModifierGroup(
      data,
    );
  } catch (error) {
    console.error(
      'Error guardando grupo del producto:',
      error,
    );

    throw new Error(
      error instanceof Error
        ? error.message
        : 'No se pudo guardar el grupo del producto.',
    );
  }
}

export async function removeProductModifierGroup(
  productId: string,
  modifierGroupId: string,
): Promise<void> {
  if (
    !productId?.trim() ||
    !modifierGroupId?.trim()
  ) {
    throw new Error(
      'Los identificadores son obligatorios.',
    );
  }

  try {
    await deleteProductModifierGroup(
      productId,
      modifierGroupId,
    );
  } catch (error) {
    console.error(
      'Error eliminando grupo del producto:',
      error,
    );

    throw new Error(
      error instanceof Error
        ? error.message
        : 'No se pudo eliminar el grupo del producto.',
    );
  }
}

export async function saveProductModifierGroups(
  productId: string,
  groups:
    SaveProductModifierGroupInput[],
): Promise<void> {
  if (!productId?.trim()) {
    throw new Error(
      'El identificador del producto es obligatorio.',
    );
  }

  groups.forEach(
    validateInput,
  );

  try {
    await replaceProductModifierGroups(
      productId,
      groups.map(
        group => ({
          productId,

          modifierGroupId:
            group.modifierGroupId,

          isRequired:
            group.isRequired,

          minSelections:
            group.minSelections,

          maxSelections:
            group.maxSelections,

          allowDuplicates:
            group.allowDuplicates,

          position:
            group.position,

          isActive:
            group.isActive ??
            true,
        }),
      ),
    );
  } catch (error) {
    console.error(
      'Error guardando grupos del producto:',
      error,
    );

    throw new Error(
      error instanceof Error
        ? error.message
        : 'No se pudieron guardar los grupos del producto.',
    );
  }
}

function validateInput(
  input:
    SaveProductModifierGroupInput,
): void {
  if (
    !input.productId?.trim()
  ) {
    throw new Error(
      'El producto es obligatorio.',
    );
  }

  if (
    !input.modifierGroupId?.trim()
  ) {
    throw new Error(
      'El grupo de modificadores es obligatorio.',
    );
  }

  if (
    !Number.isInteger(
      input.minSelections,
    ) ||
    input.minSelections < 0
  ) {
    throw new Error(
      'El mínimo de selecciones no es válido.',
    );
  }

  if (
    !Number.isInteger(
      input.maxSelections,
    ) ||
    input.maxSelections < 1
  ) {
    throw new Error(
      'El máximo de selecciones no es válido.',
    );
  }

  if (
    input.maxSelections <
    input.minSelections
  ) {
    throw new Error(
      'El máximo de selecciones no puede ser menor que el mínimo.',
    );
  }

  if (
    !Number.isInteger(
      input.position,
    ) ||
    input.position < 0
  ) {
    throw new Error(
      'La posición no es válida.',
    );
  }
}