import {
  adminUpdateProductById,
  deactivateProductById,
  fetchActiveProducts,
  fetchAllProducts,
  fetchCategories,
  insertProduct,
  setProductActiveById,
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

export interface AdminUpdateProductInput {
  name: string;
  description: string;
  price: number;
  categoryId: string;
  isAvailable: boolean;
}

export interface CreateProductInput {
  name: string;
  description: string;
  price: number;
  categoryId: string;
}

function normalizeProduct(
  product: Product,
): Product {
  return {
    ...product,

    price:
      typeof product.price ===
      'string'
        ? Number(
            product.price,
          )
        : product.price,
  };
}

function validateProductData(
  name: string,
  price: number,
): void {
  if (!name.trim()) {
    throw new Error(
      'El nombre del producto es obligatorio.',
    );
  }

  if (
    !Number.isFinite(price) ||
    price <= 0
  ) {
    throw new Error(
      'El precio debe ser mayor a 0.',
    );
  }
}

function validateCategoryId(
  categoryId: string,
): void {
  if (!categoryId.trim()) {
    throw new Error(
      'Selecciona una categoría.',
    );
  }
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

export async function getAllProducts(): Promise<
  Product[]
> {
  try {
    const products =
      await fetchAllProducts();

    return products.map(
      normalizeProduct,
    );
  } catch (error) {
    console.error(
      'Error al obtener todos los productos:',
      error,
    );

    throw new Error(
      'No se pudieron obtener los productos.',
    );
  }
}

export async function createProduct(
  input:
    CreateProductInput,
): Promise<Product> {
  const cleanName =
    input.name.trim();

  const cleanDescription =
    input.description.trim();

  validateProductData(
    cleanName,
    input.price,
  );

  validateCategoryId(
    input.categoryId,
  );

  try {
    const product =
      await insertProduct({
        name:
          cleanName,

        description:
          cleanDescription ||
          null,

        price:
          input.price,

        categoryId:
          input.categoryId,
      });

    return normalizeProduct(
      product,
    );
  } catch (error) {
    console.error(
      'Error al crear producto:',
      error,
    );

    throw new Error(
      'No se pudo crear el producto.',
    );
  }
}

/*
 * Se conserva porque MenuList
 * todavía utiliza esta función.
 */
export async function updateProduct(
  productId: string,
  input:
    UpdateProductInput,
): Promise<Product> {
  const cleanName =
    input.name.trim();

  const cleanDescription =
    input.description.trim();

  validateProductData(
    cleanName,
    input.price,
  );

  try {
    const updatedProduct =
      await updateProductById(
        productId,
        {
          name:
            cleanName,

          description:
            cleanDescription ||
            null,

          price:
            input.price,
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

export async function adminUpdateProduct(
  productId: string,
  input:
    AdminUpdateProductInput,
): Promise<Product> {
  const cleanName =
    input.name.trim();

  const cleanDescription =
    input.description.trim();

  validateProductData(
    cleanName,
    input.price,
  );

  validateCategoryId(
    input.categoryId,
  );

  try {
    const updatedProduct =
      await adminUpdateProductById(
        productId,
        {
          name:
            cleanName,

          description:
            cleanDescription ||
            null,

          price:
            input.price,

          categoryId:
            input.categoryId,

          isAvailable:
            input.isAvailable,
        },
      );

    return normalizeProduct(
      updatedProduct,
    );
  } catch (error) {
    console.error(
      'Error al actualizar el producto desde administración:',
      error,
    );

    throw new Error(
      'No se pudo actualizar el producto.',
    );
  }
}

export async function setProductActive(
  productId: string,
  isActive: boolean,
): Promise<Product> {
  try {
    const updatedProduct =
      await setProductActiveById(
        productId,
        isActive,
      );

    return normalizeProduct(
      updatedProduct,
    );
  } catch (error) {
    console.error(
      'Error al cambiar el estado del producto:',
      error,
    );

    throw new Error(
      isActive
        ? 'No se pudo activar el producto.'
        : 'No se pudo desactivar el producto.',
    );
  }
}

/*
 * También se conserva temporalmente
 * por compatibilidad con MenuList.
 *
 * En realidad no borra físicamente:
 * cambia is_active a false.
 */
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
    !Number.isFinite(
      newPrice,
    ) ||
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