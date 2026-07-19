import { fetchAvailableModifiers } from '../repositories/ModifierRepository';
import {
  Modifier,
  Product,
} from '../types';

export type ProductModifierMode =
  | 'burger'
  | 'wings'
  | 'boneless'
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

  const normalizedProductName =
    normalizeText(product.name);

  const normalizedCategoryName =
    normalizeText(categoryName ?? '');

  const searchableText = [
    normalizedProductName,
    normalizedCategoryName,
  ].join(' ');

  if (
    searchableText.includes('boneless') ||
    searchableText.includes('bonelesses')
  ) {
    return 'boneless';
  }

  if (
    searchableText.includes('alita') ||
    searchableText.includes('wings')
  ) {
    return 'wings';
  }

  if (
    searchableText.includes('hamburguesa') ||
    searchableText.includes('burger')
  ) {
    return 'burger';
  }

  return 'none';
}

export function isKongBurger(
  product: Product | null,
): boolean {
  return normalizeText(
    product?.name ?? '',
  ).includes('kong');
}

function normalizeText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();
}