import { Product } from '../types';

export function isDeliveryProduct(
  product: Product | null | undefined,
): boolean {
  if (!product) {
    return false;
  }

  return (
    normalizeText(product.name) ===
    'envio a domicilio'
  );
}

function normalizeText(
  value: string,
): string {
  return value
    .normalize('NFD')
    .replace(
      /[\u0300-\u036f]/g,
      '',
    )
    .trim()
    .toLocaleLowerCase('es');
}