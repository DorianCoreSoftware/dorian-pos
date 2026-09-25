import {
  supabase,
} from './supabase';

export interface ProductModifierOption {
  id: string;
  productId: string;
  modifierId: string;
  isAvailable: boolean;
  position: number;
}

interface ProductModifierOptionRow {
  id: string;
  product_id: string;
  modifier_id: string;
  is_available: boolean;
  position: number;
}

export async function getAvailableProductModifierOptions(
  productId: string,
): Promise<ProductModifierOption[]> {
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
      'product_modifier_options',
    )
    .select(`
      id,
      product_id,
      modifier_id,
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
        ascending: true,
      },
    );

  if (error) {
    throw new Error(
      `No fue posible obtener las opciones del producto: ${error.message}`,
    );
  }

  return (
    data ?? []
  ).map(row => {
    const option =
      row as ProductModifierOptionRow;

    return {
      id: option.id,
      productId:
        option.product_id,
      modifierId:
        option.modifier_id,
      isAvailable:
        option.is_available,
      position:
        option.position,
    };
  });
}

export async function getProductModifierOptions(
  productId: string,
): Promise<ProductModifierOption[]> {
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
      'product_modifier_options',
    )
    .select(`
      id,
      product_id,
      modifier_id,
      is_available,
      position
    `)
    .eq(
      'product_id',
      cleanProductId,
    )
    .order(
      'position',
      {
        ascending: true,
      },
    );

  if (error) {
    throw new Error(
      `No fue posible obtener las opciones del producto: ${error.message}`,
    );
  }

  return (
    data ?? []
  ).map(row => {
    const option =
      row as ProductModifierOptionRow;

    return {
      id: option.id,
      productId:
        option.product_id,
      modifierId:
        option.modifier_id,
      isAvailable:
        option.is_available,
      position:
        option.position,
    };
  });
}

export async function saveProductModifierOptions(
  productId: string,
  modifierIds: string[],
): Promise<void> {
  const cleanProductId =
    productId.trim();

  if (!cleanProductId) {
    throw new Error(
      'El identificador del producto es obligatorio.',
    );
  }

  const uniqueModifierIds =
    Array.from(
      new Set(
        modifierIds
          .map(id => id.trim())
          .filter(Boolean),
      ),
    );

  const {
    error: deleteError,
  } = await supabase
    .from(
      'product_modifier_options',
    )
    .delete()
    .eq(
      'product_id',
      cleanProductId,
    );

  if (deleteError) {
    throw new Error(
      `No fue posible limpiar las opciones del producto: ${deleteError.message}`,
    );
  }

  if (
    uniqueModifierIds.length ===
    0
  ) {
    return;
  }

  const {
    error: insertError,
  } = await supabase
    .from(
      'product_modifier_options',
    )
    .insert(
      uniqueModifierIds.map(
        (modifierId, index) => ({
          product_id:
            cleanProductId,
          modifier_id:
            modifierId,
          is_available:
            true,
          position:
            index,
        }),
      ),
    );

  if (insertError) {
    throw new Error(
      `No fue posible guardar las opciones del producto: ${insertError.message}`,
    );
  }
}
