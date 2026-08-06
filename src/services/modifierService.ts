import {
  fetchAvailableModifiers,
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

export async function getAvailableModifiers(): Promise<
  GroupedModifiers
> {
  const modifiers =
    await fetchAvailableModifiers();

  return {
    meats: modifiers.filter(
      (modifier) =>
        modifier.group_name ===
        'Carne',
    ),

    sauces: modifiers.filter(
      (modifier) =>
        modifier.group_name ===
        'Salsa',
    ),
  };
}

export function getProductModifierMode(
  product: Product | null,
  categoryName?: string,
): ProductModifierMode {
  if (!product) {
    return 'none';
  }

  const normalizedName =
    normalizeText(product.name);

  const normalizedCategory =
    normalizeText(categoryName);

  /*
   * Los combos se detectan primero para
   * evitar que "Combo Alitas" se trate
   * como un producto individual.
   */
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

  /*
   * Boneless puede detectarse tanto por
   * el nombre del producto como por la
   * categoría a la que pertenece.
   */
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

  /*
   * Algunos productos de la categoría
   * Alitas pueden llamarse solamente por
   * número de piezas. Por eso también se
   * revisa el nombre de la categoría.
   */
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

  /*
   * También se contempla la categoría de
   * hamburguesas por si un producto tiene
   * un nombre que no incluye la palabra.
   */
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
      .toLocaleLowerCase('es') ?? ''
  );
}