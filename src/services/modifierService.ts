import {
  CreateModifierData,
  fetchAllModifiers,
  fetchAvailableModifiers,
  insertModifier,
  ModifierGroup,
  setModifierAvailableById,
  updateModifierById,
} from '../repositories/ModifierRepository';

import {
  Modifier,
  Product,
} from '../types';

export type ProductModifierMode =
  | 'burger'
  | 'wings'
  | 'boneless'
  | 'combo'
  | 'none';

export interface GroupedModifiers {
  meats: Modifier[];
  sauces: Modifier[];
}

export interface CreateModifierInput {
  name: string;
  extraPrice: number;
  groupName: ModifierGroup;
}

export interface UpdateModifierInput {
  name: string;
  extraPrice: number;
  groupName: ModifierGroup;
  isAvailable: boolean;
}

export async function getAvailableModifiers(): Promise<
  GroupedModifiers
> {
  const modifiers =
    await fetchAvailableModifiers();

  return {
    meats:
      modifiers.filter(
        (modifier) =>
          modifier.group_name ===
          'Carne',
      ),

    sauces:
      modifiers.filter(
        (modifier) =>
          modifier.group_name ===
          'Salsa',
      ),
  };
}

export async function getAllModifiers(): Promise<
  Modifier[]
> {
  try {
    return await fetchAllModifiers();
  } catch (error) {
    console.error(
      'Error al obtener todos los modificadores:',
      error,
    );

    throw new Error(
      'No se pudieron obtener los modificadores.',
    );
  }
}

export async function createModifier(
  input:
    CreateModifierInput,
): Promise<Modifier> {
  const cleanName =
    input.name.trim();

  validateModifier(
    cleanName,
    input.extraPrice,
  );

  try {
    const data:
      CreateModifierData = {
      name:
        cleanName,

      extraPrice:
        input.extraPrice,

      groupName:
        input.groupName,
    };

    return await insertModifier(
      data,
    );
  } catch (error) {
    console.error(
      'Error al crear modificador:',
      error,
    );

    throw new Error(
      'No se pudo crear el modificador.',
    );
  }
}

export async function updateModifier(
  modifierId: string,
  input:
    UpdateModifierInput,
): Promise<Modifier> {
  validateModifierId(
    modifierId,
  );

  const cleanName =
    input.name.trim();

  validateModifier(
    cleanName,
    input.extraPrice,
  );

  try {
    return await updateModifierById(
      modifierId,
      {
        name:
          cleanName,

        extraPrice:
          input.extraPrice,

        groupName:
          input.groupName,

        isAvailable:
          input.isAvailable,
      },
    );
  } catch (error) {
    console.error(
      'Error al actualizar modificador:',
      error,
    );

    throw new Error(
      'No se pudo actualizar el modificador.',
    );
  }
}

export async function setModifierAvailable(
  modifierId: string,
  isAvailable: boolean,
): Promise<Modifier> {
  validateModifierId(
    modifierId,
  );

  try {
    return await setModifierAvailableById(
      modifierId,
      isAvailable,
    );
  } catch (error) {
    console.error(
      'Error al cambiar disponibilidad del modificador:',
      error,
    );

    throw new Error(
      isAvailable
        ? 'No se pudo activar el modificador.'
        : 'No se pudo desactivar el modificador.',
    );
  }
}

export function getProductModifierMode(
  product: Product | null,
  categoryName?: string,
): ProductModifierMode {
  if (!product) {
    return 'none';
  }

  const normalizedName =
    normalizeText(
      product.name,
    );

  const normalizedCategory =
    normalizeText(
      categoryName,
    );

  if (
    normalizedName.includes(
      'combo',
    ) ||
    normalizedCategory.includes(
      'combo',
    )
  ) {
    return 'combo';
  }

  if (
    normalizedName.includes(
      'boneless',
    ) ||
    normalizedCategory.includes(
      'boneless',
    )
  ) {
    return 'boneless';
  }

  if (
    normalizedName.includes(
      'alita',
    ) ||
    normalizedName.includes(
      'wing',
    ) ||
    normalizedCategory.includes(
      'alita',
    ) ||
    normalizedCategory.includes(
      'wing',
    )
  ) {
    return 'wings';
  }

  if (
    normalizedName.includes(
      'hamburguesa',
    ) ||
    normalizedName.includes(
      'burger',
    ) ||
    normalizedCategory.includes(
      'hamburguesa',
    ) ||
    normalizedCategory.includes(
      'burger',
    )
  ) {
    return 'burger';
  }

  return 'none';
}

export function isKongBurger(
  product: Product | null,
): boolean {
  return normalizeText(
    product?.name,
  ).includes('kong');
}

function validateModifierId(
  modifierId: string,
): void {
  if (!modifierId?.trim()) {
    throw new Error(
      'El modificador no es válido.',
    );
  }
}

function validateModifier(
  name: string,
  extraPrice: number,
): void {
  if (!name) {
    throw new Error(
      'El nombre del modificador es obligatorio.',
    );
  }

  if (
    !Number.isFinite(
      extraPrice,
    ) ||
    extraPrice < 0
  ) {
    throw new Error(
      'El precio extra no es válido.',
    );
  }
}

function normalizeText(
  value?: string | null,
): string {
  return (
    value
      ?.normalize('NFD')
      .replace(
        /[\u0300-\u036f]/g,
        '',
      )
      .trim()
      .toLocaleLowerCase(
        'es',
      ) ?? ''
  );
}