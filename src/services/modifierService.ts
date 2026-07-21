import { fetchAvailableModifiers } from '../repositories/ModifierRepository';
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
        modifier.group_name === 'Carne',
    ),
    sauces: modifiers.filter(
      (modifier) =>
        modifier.group_name === 'Salsa',
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

  if (
    normalizedName.includes('combo') ||
    normalizedCategory.includes('combo')
  ) {
    return 'combo';
  }

  if (
    normalizedName.includes('boneless')
  ) {
    return 'boneless';
  }

  if (
    normalizedName.includes('alita') ||
    normalizedName.includes('wing')
  ) {
    return 'wings';
  }

  if (
    normalizedName.includes(
      'hamburguesa',
    ) ||
    normalizedName.includes('burger')
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
      .replace(/[\u0300-\u036f]/g, '')
      .trim()
      .toLowerCase() ?? ''
  );
}