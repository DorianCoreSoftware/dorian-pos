import {
  ComboComponentType,
} from '../types/combo';

/**
 * Determina cómo se obtiene el producto de un espacio.
 *
 * fixed:
 * El producto ya está definido por la receta.
 *
 * selectable:
 * El usuario debe elegir entre varios productos permitidos.
 */
export type ComboSlotSelectionMode =
  | 'fixed'
  | 'selectable';

export interface ComboSlot {
  /**
   * Identificador único dentro de la receta.
   *
   * Ejemplos:
   * burger-1
   * side-2
   * drink-4
   */
  id: string;

  type: ComboComponentType;

  /**
   * Texto mostrado al usuario.
   */
  label: string;

  selectionMode: ComboSlotSelectionMode;

  /**
   * Nombre del producto que debe asignarse automáticamente.
   *
   * Se utiliza cuando selectionMode es "fixed".
   */
  fixedProductName?: string;

  /**
   * Productos permitidos en un selector.
   *
   * Se utiliza cuando solo pueden elegirse ciertos productos.
   */
  allowedProductNames?: string[];

  /**
   * Productos que no deben aparecer en el selector.
   */
  excludedProductNames?: string[];

  /**
   * Categoría de productos utilizada para llenar el selector.
   */
  productCategoryName?: string;

  /**
   * Indica si este componente permite notas.
   */
  allowsNotes: boolean;

  /**
   * Indica si debe configurarse la carne.
   */
  requiresMeat: boolean;

  /**
   * Indica si debe configurarse una salsa.
   */
  requiresSauce: boolean;

  /**
   * Indica si el refresco necesita selección de sabor.
   */
  requiresDrinkFlavor: boolean;
}

export interface ComboRecipe {
  /**
   * Categoría a la que pertenece el combo vendido.
   *
   * Es necesaria porque hay combos con nombres repetidos.
   */
  categoryName: string;

  /**
   * Nombre del producto combo.
   */
  productName: string;

  slots: ComboSlot[];
}

const fixedBurger = (
  id: string,
  label: string,
  productName: string,
): ComboSlot => ({
  id,
  type: 'burger',
  label,
  selectionMode: 'fixed',
  fixedProductName: productName,
  productCategoryName: 'Hamburguesas',
  allowsNotes: true,
  requiresMeat: true,
  requiresSauce: false,
  requiresDrinkFlavor: false,
});

const selectableBurger = (
  id: string,
  label: string,
  options?: {
    allowedProductNames?: string[];
    excludedProductNames?: string[];
  },
): ComboSlot => ({
  id,
  type: 'burger',
  label,
  selectionMode: 'selectable',
  productCategoryName: 'Hamburguesas',
  allowedProductNames:
    options?.allowedProductNames,
  excludedProductNames:
    options?.excludedProductNames,
  allowsNotes: true,
  requiresMeat: true,
  requiresSauce: false,
  requiresDrinkFlavor: false,
});

const fixedHotdog = (
  id: string,
  label: string,
  productName: string,
): ComboSlot => ({
  id,
  type: 'hotdog',
  label,
  selectionMode: 'fixed',
  fixedProductName: productName,
  productCategoryName: 'Hotdogs',
  allowsNotes: true,
  requiresMeat: false,
  requiresSauce: false,
  requiresDrinkFlavor: false,
});

const side = (
  id: string,
  label = 'Complemento',
): ComboSlot => ({
  id,
  type: 'side',
  label,
  selectionMode: 'selectable',
  productCategoryName: 'Complementos',
  allowsNotes: false,
  requiresMeat: false,
  requiresSauce: false,
  requiresDrinkFlavor: false,
});

const fixedSide = (
  id: string,
  label: string,
  productName: string,
): ComboSlot => ({
  id,
  type: 'side',
  label,
  selectionMode: 'fixed',
  fixedProductName: productName,
  productCategoryName: 'Complementos',
  allowsNotes: false,
  requiresMeat: false,
  requiresSauce: false,
  requiresDrinkFlavor: false,
});

const drink = (
  id: string,
  label = 'Refresco 355 ml',
): ComboSlot => ({
  id,
  type: 'drink',
  label,
  selectionMode: 'selectable',
  productCategoryName: 'Bebidas',

  /**
   * Ajusta este nombre si en Supabase está escrito de otra forma.
   *
   * También puede eliminarse allowedProductNames para mostrar
   * todas las bebidas disponibles.
   */
  allowedProductNames: [
    'Refresco 355ml.',
    'Refresco 355 ml',
    'Coca-Cola 355ml.',
  ],

  allowsNotes: false,
  requiresMeat: false,
  requiresSauce: false,

  /**
   * Déjalo en true cuando "Refresco 355ml." sea un producto
   * genérico cuyo sabor se selecciona por separado.
   */
  requiresDrinkFlavor: true,
});

export const COMBO_RECIPES: ComboRecipe[] = [
  /*
   * ==========================================================
   * COMBOS DE HAMBURGUESAS
   * ==========================================================
   */

  {
    categoryName: 'Combos Hamburguesas',
    productName: 'Combo sencillo',
    slots: [
      fixedBurger(
        'burger-1',
        'Hamburguesa sencilla',
        'Hamburguesa sencilla',
      ),
      side(
        'side-1',
        'Complemento',
      ),
      drink(
        'drink-1',
        'Refresco 355 ml',
      ),
    ],
  },

  {
    categoryName: 'Combos Hamburguesas',
    productName: 'Combo especial',
    slots: [
      fixedBurger(
        'burger-1',
        'Hamburguesa especial',
        'Hamburguesa especial',
      ),
      side(
        'side-1',
        'Complemento',
      ),
      drink(
        'drink-1',
        'Refresco 355 ml',
      ),
    ],
  },

  {
    categoryName: 'Combos Hamburguesas',
    productName: 'Combo doble',
    slots: [
      fixedBurger(
        'burger-1',
        'Hamburguesa doble',
        'Hamburguesa doble',
      ),
      side(
        'side-1',
        'Complemento',
      ),
      drink(
        'drink-1',
        'Refresco 355 ml',
      ),
    ],
  },

  {
    categoryName: 'Combos Hamburguesas',
    productName: 'Combo Dúo Mixto',
    slots: [
      selectableBurger(
        'burger-1',
        'Hamburguesa',
        {
          excludedProductNames: [
            'Hamburguesa doble',
            'Hamburguesa Kong',
          ],
        },
      ),
      fixedHotdog(
        'hotdog-1',
        'Hotdog sencillo',
        'Hotdog sencillo',
      ),
      side(
        'side-1',
        'Complemento',
      ),
      drink(
        'drink-1',
        'Refresco 355 ml',
      ),
    ],
  },

  {
    categoryName: 'Combos Hamburguesas',
    productName: 'Combo familiar',
    slots: [
      fixedBurger(
        'burger-1',
        'Hamburguesa especial 1',
        'Hamburguesa especial',
      ),
      fixedBurger(
        'burger-2',
        'Hamburguesa especial 2',
        'Hamburguesa especial',
      ),

      fixedHotdog(
        'hotdog-1',
        'Hotdog especial 1',
        'Hotdog especial',
      ),
      fixedHotdog(
        'hotdog-2',
        'Hotdog especial 2',
        'Hotdog especial',
      ),

      side(
        'side-1',
        'Complemento 1',
      ),
      side(
        'side-2',
        'Complemento 2',
      ),

      drink(
        'drink-1',
        'Refresco 1',
      ),
      drink(
        'drink-2',
        'Refresco 2',
      ),
      drink(
        'drink-3',
        'Refresco 3',
      ),
      drink(
        'drink-4',
        'Refresco 4',
      ),
    ],
  },

  {
    categoryName: 'Combos Hamburguesas',
    productName: 'Combo Kong',
    slots: [
      fixedBurger(
        'burger-1',
        'Hamburguesa Kong',
        'Hamburguesa Kong',
      ),

      /**
       * Papas Kong no es una selección libre.
       */
      fixedSide(
        'side-1',
        'Papas Kong',
        'Papas Kong',
      ),

      side(
        'side-2',
        'Complemento',
      ),

      drink(
        'drink-1',
        'Refresco',
      ),
    ],
  },

  /*
   * ==========================================================
   * COMBOS DE HOTDOGS
   * ==========================================================
   */

  {
    categoryName: 'Combos Hotdogs',
    productName: 'Combo sencillo',
    slots: [
      fixedHotdog(
        'hotdog-1',
        'Hotdog sencillo',
        'Hotdog sencillo',
      ),
      side(
        'side-1',
        'Complemento',
      ),
      drink(
        'drink-1',
        'Refresco 355 ml',
      ),
    ],
  },

  {
    categoryName: 'Combos Hotdogs',
    productName: 'Combo tropical',
    slots: [
      fixedHotdog(
        'hotdog-1',
        'Hotdog tropical',
        'Hotdog tropical',
      ),
      side(
        'side-1',
        'Complemento',
      ),
      drink(
        'drink-1',
        'Refresco 355 ml',
      ),
    ],
  },

  {
    categoryName: 'Combos Hotdogs',
    productName: 'Combo Burger Dog',
    slots: [
      fixedHotdog(
        'hotdog-1',
        'Burger Dog',
        'Burger Dog',
      ),
      side(
        'side-1',
        'Complemento',
      ),
      drink(
        'drink-1',
        'Refresco 355 ml',
      ),
    ],
  },

  {
    categoryName: 'Combos Hotdogs',
    productName: 'Combo Chaparrin',
    slots: [
      fixedHotdog(
        'hotdog-1',
        'Hotdog Chaparrin',
        'Hotdog Chaparrin',
      ),
      side(
        'side-1',
        'Complemento',
      ),
      drink(
        'drink-1',
        'Refresco 355 ml',
      ),
    ],
  },

  /*
   * ==========================================================
   * KONG ESPECIAL
   * ==========================================================
   *
   * Con la información compartida sabemos que existen:
   *
   * - Combo Kong
   * - Combo Dorian
   *
   * Pero todavía no tenemos la composición exacta de estos
   * dos productos. No se agregan recetas incompletas para evitar
   * que el POS permita guardar configuraciones incorrectas.
   */
];

function normalizeComboText(
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

export function findComboRecipe(
  categoryName: string,
  productName: string,
): ComboRecipe | null {
  const normalizedCategory =
    normalizeComboText(categoryName);

  const normalizedProduct =
    normalizeComboText(productName);

  return (
    COMBO_RECIPES.find(
      (recipe) =>
        normalizeComboText(
          recipe.categoryName,
        ) === normalizedCategory &&
        normalizeComboText(
          recipe.productName,
        ) === normalizedProduct,
    ) ?? null
  );
}