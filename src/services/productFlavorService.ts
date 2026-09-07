import {
  supabase,
} from './supabase';

export interface ProductFlavor {
  id: string;
  productId: string;
  modifierId: string;
  name: string;
  isAvailable: boolean;
  position: number;
}

interface ProductFlavorRow {
  id: string;
  product_id: string;
  modifier_id: string;
  name: string;
  is_available: boolean;
  position: number;
}

export async function getAvailableProductFlavors(
  productId: string,
): Promise<ProductFlavor[]> {
  const cleanProductId =
    productId.trim();

  if (!cleanProductId) {
    throw new Error(
      'El identificador del producto es obligatorio.',
    );
  }

  const {
    data,
    error,
  } = await supabase
    .from(
      'product_flavors',
    )
    .select(`
      id,
      product_id,
      modifier_id,
      name,
      is_available,
      position
    `)
    .eq(
      'product_id',
      cleanProductId,
    )
    .eq(
      'is_available',
      true,
    )
    .order(
      'position',
      {
        ascending:
          true,
      },
    );

  if (error) {
    throw new Error(
      `No fue posible obtener los sabores: ${error.message}`,
    );
  }

  return (
    data ?? []
  ).map(
    (row) => {
      const flavor =
        row as ProductFlavorRow;

      return {
        id:
          flavor.id,

        productId:
          flavor.product_id,

        modifierId:
          flavor.modifier_id,

        name:
          flavor.name,

        isAvailable:
          flavor.is_available,

        position:
          flavor.position,
      };
    },
  );
}