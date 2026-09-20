import {
  supabase,
} from '../services/supabase';

import {
  ModifierGroupEntity,
} from './ModifierRepository';

export interface ProductModifierGroup {
  id: string;

  productId: string;

  modifierGroupId: string;

  isRequired: boolean;

  minSelections: number;

  maxSelections: number;

  position: number;

  isActive: boolean;

  group:
    ModifierGroupEntity | null;
}

interface ProductModifierGroupDatabaseRecord {
  id: string;

  product_id: string;

  modifier_group_id: string;

  is_required: boolean;

  min_selections: number;

  max_selections: number;

  position: number;

  is_active: boolean;

  modifier_group:
    | {
        id: string;
        code: string;
        name: string;
        is_active: boolean;
        position: number;
        created_at?: string;
        updated_at?: string;
      }
    | {
        id: string;
        code: string;
        name: string;
        is_active: boolean;
        position: number;
        created_at?: string;
        updated_at?: string;
      }[]
    | null;
}

export interface UpsertProductModifierGroupData {
  productId: string;

  modifierGroupId: string;

  isRequired: boolean;

  minSelections: number;

  maxSelections: number;

  position: number;

  isActive: boolean;
}

const PRODUCT_MODIFIER_GROUP_SELECT = `
  id,
  product_id,
  modifier_group_id,
  is_required,
  min_selections,
  max_selections,
  position,
  is_active,
  modifier_group:modifier_groups!product_modifier_groups_modifier_group_id_fkey(
    id,
    code,
    name,
    is_active,
    position,
    created_at,
    updated_at
  )
`;

function mapRecord(
  record:
    ProductModifierGroupDatabaseRecord,
): ProductModifierGroup {
  const rawGroup =
    Array.isArray(
      record.modifier_group,
    )
      ? record.modifier_group[0] ??
        null
      : record.modifier_group;

  return {
    id:
      record.id,

    productId:
      record.product_id,

    modifierGroupId:
      record.modifier_group_id,

    isRequired:
      record.is_required,

    minSelections:
      record.min_selections,

    maxSelections:
      record.max_selections,

    position:
      record.position,

    isActive:
      record.is_active,

    group:
      rawGroup
        ? {
            id:
              rawGroup.id,

            code:
              rawGroup.code,

            name:
              rawGroup.name,

            is_active:
              rawGroup.is_active,

            position:
              rawGroup.position,

            created_at:
              rawGroup.created_at,

            updated_at:
              rawGroup.updated_at,
          }
        : null,
  };
}

export async function fetchProductModifierGroups(
  productId: string,
): Promise<
  ProductModifierGroup[]
> {
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
      'product_modifier_groups',
    )
    .select(
      PRODUCT_MODIFIER_GROUP_SELECT,
    )
    .eq(
      'product_id',
      cleanProductId,
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
      `No se pudieron obtener los grupos del producto: ${error.message}`,
    );
  }

  return (
    data ??
    []
  ).map(
    row =>
      mapRecord(
        row as
          ProductModifierGroupDatabaseRecord,
      ),
  );
}

export async function fetchActiveProductModifierGroups(
  productId: string,
): Promise<
  ProductModifierGroup[]
> {
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
      'product_modifier_groups',
    )
    .select(
      PRODUCT_MODIFIER_GROUP_SELECT,
    )
    .eq(
      'product_id',
      cleanProductId,
    )
    .eq(
      'is_active',
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
      `No se pudieron obtener los grupos activos del producto: ${error.message}`,
    );
  }

  return (
    data ??
    []
  ).map(
    row =>
      mapRecord(
        row as
          ProductModifierGroupDatabaseRecord,
      ),
  );
}

export async function upsertProductModifierGroup(
  input:
    UpsertProductModifierGroupData,
): Promise<
  ProductModifierGroup
> {
  const {
    data,
    error,
  } = await supabase
    .from(
      'product_modifier_groups',
    )
    .upsert(
      {
        product_id:
          input.productId,

        modifier_group_id:
          input.modifierGroupId,

        is_required:
          input.isRequired,

        min_selections:
          input.minSelections,

        max_selections:
          input.maxSelections,

        position:
          input.position,

        is_active:
          input.isActive,

        updated_at:
          new Date()
            .toISOString(),
      },
      {
        onConflict:
          'product_id,modifier_group_id',
      },
    )
    .select(
      PRODUCT_MODIFIER_GROUP_SELECT,
    )
    .single();

  if (error) {
    throw new Error(
      `No se pudo guardar el grupo del producto: ${error.message}`,
    );
  }

  return mapRecord(
    data as
      ProductModifierGroupDatabaseRecord,
  );
}

export async function deleteProductModifierGroup(
  productId: string,
  modifierGroupId: string,
): Promise<void> {
  const {
    error,
  } = await supabase
    .from(
      'product_modifier_groups',
    )
    .delete()
    .eq(
      'product_id',
      productId,
    )
    .eq(
      'modifier_group_id',
      modifierGroupId,
    );

  if (error) {
    throw new Error(
      `No se pudo eliminar el grupo del producto: ${error.message}`,
    );
  }
}

export async function replaceProductModifierGroups(
  productId: string,
  groups:
    UpsertProductModifierGroupData[],
): Promise<void> {
  const cleanProductId =
    productId.trim();

  if (!cleanProductId) {
    throw new Error(
      'El identificador del producto es obligatorio.',
    );
  }

  const {
    error:
      deleteError,
  } = await supabase
    .from(
      'product_modifier_groups',
    )
    .delete()
    .eq(
      'product_id',
      cleanProductId,
    );

  if (deleteError) {
    throw new Error(
      `No se pudieron limpiar los grupos anteriores: ${deleteError.message}`,
    );
  }

  if (
    groups.length ===
    0
  ) {
    return;
  }

  const rows =
    groups.map(
      group => ({
        product_id:
          cleanProductId,

        modifier_group_id:
          group.modifierGroupId,

        is_required:
          group.isRequired,

        min_selections:
          group.minSelections,

        max_selections:
          group.maxSelections,

        position:
          group.position,

        is_active:
          group.isActive,

        updated_at:
          new Date()
            .toISOString(),
      }),
    );

  const {
    error:
      insertError,
  } = await supabase
    .from(
      'product_modifier_groups',
    )
    .insert(
      rows,
    );

  if (insertError) {
    throw new Error(
      `No se pudieron guardar los grupos del producto: ${insertError.message}`,
    );
  }
}