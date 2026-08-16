import {
  supabase,
} from '../services/supabase';

import {
  Modifier,
} from '../types';

export type ModifierGroup =
  | 'Carne'
  | 'Salsa'
  | 'Sabor'
  | null;

interface ModifierDatabaseRecord {
  id: string;
  name: string;
  extra_price: string | number;
  is_available: boolean;
  group_name: ModifierGroup;
}

export interface CreateModifierData {
  name: string;
  extraPrice: number;
  groupName: ModifierGroup;
}

export interface UpdateModifierData {
  name: string;
  extraPrice: number;
  groupName: ModifierGroup;
  isAvailable: boolean;
}

function mapModifier(
  modifier:
    ModifierDatabaseRecord,
): Modifier {
  return {
    id:
      modifier.id,

    name:
      modifier.name,

    extra_price:
      Number(
        modifier.extra_price,
      ),

    is_available:
      modifier.is_available,

    group_name:
      modifier.group_name,
  };
}

export async function fetchAvailableModifiers(): Promise<
  Modifier[]
> {
  const {
    data,
    error,
  } = await supabase
    .from('modifiers')
    .select(`
      id,
      name,
      extra_price,
      is_available,
      group_name
    `)
    .eq(
      'is_available',
      true,
    )
    .order(
      'name',
      {
        ascending: true,
      },
    );

  if (error) {
    throw new Error(
      `No se pudieron consultar los modificadores: ${error.message}`,
    );
  }

  return (
    data as
      | ModifierDatabaseRecord[]
      | null
  )?.map(
    mapModifier,
  ) ?? [];
}

export async function fetchAllModifiers(): Promise<
  Modifier[]
> {
  const {
    data,
    error,
  } = await supabase
    .from('modifiers')
    .select(`
      id,
      name,
      extra_price,
      is_available,
      group_name
    `)
    .order(
      'group_name',
      {
        ascending: true,
      },
    )
    .order(
      'name',
      {
        ascending: true,
      },
    );

  if (error) {
    throw new Error(
      `No se pudieron consultar los modificadores: ${error.message}`,
    );
  }

  return (
    data as
      | ModifierDatabaseRecord[]
      | null
  )?.map(
    mapModifier,
  ) ?? [];
}

export async function insertModifier(
  modifierData:
    CreateModifierData,
): Promise<Modifier> {
  const {
    data,
    error,
  } = await supabase
    .from('modifiers')
    .insert({
      name:
        modifierData.name,

      extra_price:
        modifierData.extraPrice,

      group_name:
        modifierData.groupName,

      is_available:
        true,
    })
    .select(`
      id,
      name,
      extra_price,
      is_available,
      group_name
    `)
    .single();

  if (error) {
    throw new Error(
      error.message,
    );
  }

  return mapModifier(
    data as
      ModifierDatabaseRecord,
  );
}

export async function updateModifierById(
  modifierId: string,
  modifierData:
    UpdateModifierData,
): Promise<Modifier> {
  const {
    data,
    error,
  } = await supabase
    .from('modifiers')
    .update({
      name:
        modifierData.name,

      extra_price:
        modifierData.extraPrice,

      group_name:
        modifierData.groupName,

      is_available:
        modifierData.isAvailable,
    })
    .eq(
      'id',
      modifierId,
    )
    .select(`
      id,
      name,
      extra_price,
      is_available,
      group_name
    `)
    .single();

  if (error) {
    throw new Error(
      error.message,
    );
  }

  return mapModifier(
    data as
      ModifierDatabaseRecord,
  );
}

export async function setModifierAvailableById(
  modifierId: string,
  isAvailable: boolean,
): Promise<Modifier> {
  const {
    data,
    error,
  } = await supabase
    .from('modifiers')
    .update({
      is_available:
        isAvailable,
    })
    .eq(
      'id',
      modifierId,
    )
    .select(`
      id,
      name,
      extra_price,
      is_available,
      group_name
    `)
    .single();

  if (error) {
    throw new Error(
      error.message,
    );
  }

  return mapModifier(
    data as
      ModifierDatabaseRecord,
  );
}