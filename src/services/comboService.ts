import {
  ComboRecipe,
  ComboSlot,
  findComboRecipe,
} from '../constants/comboRecipes';

import {
  Category,
  Product,
} from '../types';

export interface ResolvedComboSlot {
  slot: ComboSlot;

  /**
   * Producto asignado automáticamente cuando
   * el slot es de tipo "fixed".
   */
  fixedProduct: Product | null;

  /**
   * Productos disponibles cuando el slot
   * es de tipo "selectable".
   */
  selectableProducts: Product[];
}

export interface ResolvedComboRecipe {
  recipe: ComboRecipe;
  slots: ResolvedComboSlot[];
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
    .toLowerCase();
}

function getProductCategoryName(
  product: Product,
  categories: Category[],
): string {
  if (product.category?.name) {
    return product.category.name;
  }

  const category = categories.find(
    (item) =>
      item.id === product.category_id,
  );

  return category?.name ?? '';
}

function matchesCategory(
  product: Product,
  categoryName: string | undefined,
  categories: Category[],
): boolean {
  if (!categoryName) {
    return true;
  }

  const productCategoryName =
    getProductCategoryName(
      product,
      categories,
    );

  return (
    normalizeText(
      productCategoryName,
    ) === normalizeText(categoryName)
  );
}

function matchesAllowedNames(
  product: Product,
  allowedNames?: string[],
): boolean {
  if (
    !allowedNames ||
    allowedNames.length === 0
  ) {
    return true;
  }

  const normalizedProductName =
    normalizeText(product.name);

  return allowedNames.some(
    (name) =>
      normalizeText(name) ===
      normalizedProductName,
  );
}

function matchesExcludedNames(
  product: Product,
  excludedNames?: string[],
): boolean {
  if (
    !excludedNames ||
    excludedNames.length === 0
  ) {
    return false;
  }

  const normalizedProductName =
    normalizeText(product.name);

  return excludedNames.some(
    (name) =>
      normalizeText(name) ===
      normalizedProductName,
  );
}

function getAvailableProducts(
  products: Product[],
): Product[] {
  return products.filter(
    (product) =>
      product.is_active &&
      product.is_available,
  );
}

function resolveFixedProduct(
  slot: ComboSlot,
  products: Product[],
  categories: Category[],
): Product {
  if (!slot.fixedProductName) {
    throw new Error(
      `El espacio "${slot.label}" no tiene un producto fijo configurado.`,
    );
  }

  const product = products.find(
    (item) =>
      matchesCategory(
        item,
        slot.productCategoryName,
        categories,
      ) &&
      normalizeText(item.name) ===
        normalizeText(
          slot.fixedProductName!,
        ),
  );

  if (!product) {
    throw new Error(
      `No se encontró el producto "${slot.fixedProductName}" para "${slot.label}".`,
    );
  }

  return product;
}

function resolveSelectableProducts(
  slot: ComboSlot,
  products: Product[],
  categories: Category[],
): Product[] {
  return products.filter(
    (product) =>
      matchesCategory(
        product,
        slot.productCategoryName,
        categories,
      ) &&
      matchesAllowedNames(
        product,
        slot.allowedProductNames,
      ) &&
      !matchesExcludedNames(
        product,
        slot.excludedProductNames,
      ),
  );
}

export function resolveComboRecipe(
  comboProduct: Product,
  products: Product[],
  categories: Category[],
): ResolvedComboRecipe {
  const categoryName =
    getProductCategoryName(
      comboProduct,
      categories,
    );

  const recipe = findComboRecipe(
    categoryName,
    comboProduct.name,
  );

  if (!recipe) {
    throw new Error(
      `No existe una receta para "${comboProduct.name}" en la categoría "${categoryName}".`,
    );
  }

  const availableProducts =
    getAvailableProducts(products);

  const slots = recipe.slots.map(
    (slot): ResolvedComboSlot => {
      if (
        slot.selectionMode === 'fixed'
      ) {
        return {
          slot,
          fixedProduct:
            resolveFixedProduct(
              slot,
              availableProducts,
              categories,
            ),
          selectableProducts: [],
        };
      }

      const selectableProducts =
        resolveSelectableProducts(
          slot,
          availableProducts,
          categories,
        );

      if (
        selectableProducts.length === 0
      ) {
        throw new Error(
          `No hay productos disponibles para "${slot.label}".`,
        );
      }

      return {
        slot,
        fixedProduct: null,
        selectableProducts,
      };
    },
  );

  return {
    recipe,
    slots,
  };
}