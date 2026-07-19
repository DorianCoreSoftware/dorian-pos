import {
  deactivateProductById,
  fetchActiveProducts,
  fetchCategories,
  updateProductById,
  updateProductPriceById,
} from '../repositories/ProductRepository';

import {
  Category,
  Product,
} from '../types';

export interface UpdateProductInput {
  name: string;
  description: string;
  price: number;
}

function normalizeProduct(
  product: Product,
): Product {
  return {
    ...product,
    price:
      typeof product.price === 'string'
        ? Number(product.price)
        : product.price,
  };
}

export async function getCategories(): Promise<
  Category[]
> {
  try {
    return await fetchCategories();
  } catch (error) {
    console.error(
      'Error al obtener las categorías:',
      error,
    );

    throw new Error(
      'No se pudieron obtener las categorías.',
    );
  }
}

export async function getActiveProducts(): Promise<
  Product[]
> {
  try {
    const products =
      await fetchActiveProducts();

    return products.map(
      normalizeProduct,
    );
  } catch (error) {
    console.error(
      'Error al obtener los productos:',
      error,
    );

    throw new Error(
      'No se pudieron obtener los productos.',
    );
  }
}

export async function updateProduct(
  productId: string,
  input: UpdateProductInput,
): Promise<Product> {
  const cleanName = input.name.trim();
  const cleanDescription =
    input.description.trim();

  if (!cleanName) {
    throw new Error(
      'El nombre del producto es obligatorio.',
    );
  }

  if (
    !Number.isFinite(input.price) ||
    input.price <= 0
  ) {
    throw new Error(
      'El precio debe ser mayor a 0.',
    );
  }

  try {
    const updatedProduct =
      await updateProductById(
        productId,
        {
          name: cleanName,
          description:
            cleanDescription || null,
          price: input.price,
        },
      );

    return normalizeProduct(
      updatedProduct,
    );
  } catch (error) {
    console.error(
      'Error al actualizar el producto:',
      error,
    );

    throw new Error(
      'No se pudo actualizar el producto en el servidor.',
    );
  }
}

export async function deleteProduct(
  productId: string,
): Promise<Product> {
  try {
    const deletedProduct =
      await deactivateProductById(
        productId,
      );

    return normalizeProduct(
      deletedProduct,
    );
  } catch (error) {
    console.error(
      'Error al eliminar el producto:',
      error,
    );

    throw new Error(
      'No se pudo eliminar el producto en el servidor.',
    );
  }
}

export async function updateProductPrice(
  productId: string,
  newPrice: number,
): Promise<Product> {
  if (
    !Number.isFinite(newPrice) ||
    newPrice <= 0
  ) {
    throw new Error(
      'El precio debe ser mayor a 0.',
    );
  }

  try {
    const updatedProduct =
      await updateProductPriceById(
        productId,
        newPrice,
      );

    return normalizeProduct(
      updatedProduct,
    );
  } catch (error) {
    console.error(
      'Error al actualizar el precio:',
      error,
    );

    throw new Error(
      'No se pudo actualizar el precio.',
    );
  }
}