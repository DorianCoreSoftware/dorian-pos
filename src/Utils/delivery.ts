import { Product } from '../types';

export function isDeliveryProduct(
  product: Product | null,
): boolean {
  if (!product) {
    return false;
  }

  return (
    product.name
      .trim()
      .toLowerCase() ===
    'envío a domicilio'
  );
}