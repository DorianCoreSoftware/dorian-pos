import {
  CreateModifierData,
  CreateModifierGroupData,
  fetchActiveModifierGroups,
  fetchAllModifiers,
  fetchAvailableModifiers,
  fetchModifierGroupByCode,
  fetchModifierGroups,
  insertModifier,
  insertModifierGroup,
  ModifierGroup,
  ModifierGroupEntity,
  ModifierWithGroup,
  setModifierAvailableById,
  setModifierGroupActiveById,
  updateModifierById,
  updateModifierGroupById,
} from '../repositories/ModifierRepository';
import {
  Modifier,
} from '../types';
export interface GroupedModifiers {
  meats: ModifierWithGroup[];
  sauces: ModifierWithGroup[];
}
export interface CreateModifierInput {
  name: string;
  extraPrice: number;
  /**
   * Compatibilidad temporal con AdminModifiers actual.
   */
  groupName?: ModifierGroup;
  /**
   * Nuevo modelo.
   */
  groupId?: string | null;
}
export interface UpdateModifierInput {
  name: string;
  extraPrice: number;
  groupName?: ModifierGroup;
  groupId?: string | null;
  isAvailable: boolean;
}
export interface CreateModifierGroupInput {
  code: string;
  name: string;
  position: number;
}
export interface UpdateModifierGroupInput {
  name: string;
  position: number;
  isActive: boolean;
}
/**
 * Modificadores utilizados actualmente
 * por los configuradores de productos.
 *
 * Ya no depende de group_name.
 */
export async function getAvailableModifiers(): Promise<
  GroupedModifiers
> {
  const modifiers =
    await fetchAvailableModifiers();
  return {
    meats:
      modifiers.filter(
        modifier =>
          modifier.group
            ?.code ===
          'meat',
      ),
    sauces:
      modifiers.filter(
        modifier =>
          modifier.group
            ?.code ===
          'sauce',
      ),
  };
}
/**
 * Obtiene los modificadores disponibles
 * pertenecientes a un grupo por su ID.
 *
 * Esta será la forma principal utilizada
 * por los grupos asociados a productos.
 */
export async function getAvailableModifiersByGroupId(
  groupId: string,
): Promise<
  ModifierWithGroup[]
> {
  const cleanGroupId =
    groupId.trim();
  if (!cleanGroupId) {
    throw new Error(
      'El identificador del grupo es obligatorio.',
    );
  }
  try {
    const modifiers =
      await fetchAvailableModifiers();
    return modifiers.filter(
      modifier =>
        modifier.group_id ===
        cleanGroupId,
    );
  } catch (error) {
    console.error(
      'Error al obtener modificadores del grupo:',
      error,
    );
    throw new Error(
      error instanceof Error
        ? error.message
        : 'No se pudieron obtener los modificadores del grupo.',
    );
  }
}
/**
 * Obtiene los modificadores disponibles
 * pertenecientes a un grupo por su código.
 *
 * Útil para reglas internas como:
 * meat, sauce, drink_flavor, ice_cream_flavor.
 */
export async function getAvailableModifiersByGroupCode(
  groupCode: string,
): Promise<
  ModifierWithGroup[]
> {
  const cleanGroupCode =
    groupCode.trim();
  if (!cleanGroupCode) {
    throw new Error(
      'El código del grupo es obligatorio.',
    );
  }
  try {
    const modifiers =
      await fetchAvailableModifiers();
    return modifiers.filter(
      modifier =>
        modifier.group
          ?.code ===
        cleanGroupCode,
    );
  } catch (error) {
    console.error(
      'Error al obtener modificadores por código de grupo:',
      error,
    );
    throw new Error(
      error instanceof Error
        ? error.message
        : 'No se pudieron obtener los modificadores del grupo.',
    );
  }
}
/**
 * Todos los modificadores para administración.
 */
export async function getAllModifiers(): Promise<
  ModifierWithGroup[]
> {
  try {
    return await fetchAllModifiers();
  } catch (error) {
    console.error(
      'Error al obtener todos los modificadores:',
      error,
    );
    throw new Error(
      'No se pudieron obtener los modificadores.',
    );
  }
}
/**
 * Todos los grupos, activos e inactivos.
 */
export async function getModifierGroups(): Promise<
  ModifierGroupEntity[]
> {
  try {
    return await fetchModifierGroups();
  } catch (error) {
    console.error(
      'Error al obtener grupos de modificadores:',
      error,
    );
    throw new Error(
      'No se pudieron obtener los grupos de modificadores.',
    );
  }
}
/**
 * Solamente grupos activos.
 */
export async function getActiveModifierGroups(): Promise<
  ModifierGroupEntity[]
> {
  try {
    return await fetchActiveModifierGroups();
  } catch (error) {
    console.error(
      'Error al obtener grupos activos:',
      error,
    );
    throw new Error(
      'No se pudieron obtener los grupos activos.',
    );
  }
}
/**
 * Crea un modificador.
 */
export async function createModifier(
  input:
    CreateModifierInput,
): Promise<Modifier> {
  const cleanName =
    input.name.trim();
  validateModifier(
    cleanName,
    input.extraPrice,
  );
  try {
    const resolvedGroup =
      await resolveModifierGroup(
        input.groupId,
        input.groupName,
      );
    const data:
      CreateModifierData = {
      name:
        cleanName,
      extraPrice:
        input.extraPrice,
      groupId:
        resolvedGroup.id,
      /**
       * Campo legacy.
       *
       * Lo mantenemos sincronizado
       * mientras terminamos la migración.
       */
      groupName:
        getLegacyGroupName(
          resolvedGroup.code,
        ),
    };
    return await insertModifier(
      data,
    );
  } catch (error) {
    console.error(
      'Error al crear modificador:',
      error,
    );
    throw new Error(
      error instanceof Error
        ? error.message
        : 'No se pudo crear el modificador.',
    );
  }
}
/**
 * Actualiza un modificador.
 */
export async function updateModifier(
  modifierId: string,
  input:
    UpdateModifierInput,
): Promise<Modifier> {
  validateModifierId(
    modifierId,
  );
  const cleanName =
    input.name.trim();
  validateModifier(
    cleanName,
    input.extraPrice,
  );
  try {
    const resolvedGroup =
      await resolveModifierGroup(
        input.groupId,
        input.groupName,
      );
    return await updateModifierById(
      modifierId,
      {
        name:
          cleanName,
        extraPrice:
          input.extraPrice,
        groupId:
          resolvedGroup.id,
        groupName:
          getLegacyGroupName(
            resolvedGroup.code,
          ),
        isAvailable:
          input.isAvailable,
      },
    );
  } catch (error) {
    console.error(
      'Error al actualizar modificador:',
      error,
    );
    throw new Error(
      error instanceof Error
        ? error.message
        : 'No se pudo actualizar el modificador.',
    );
  }
}
/**
 * Activa o desactiva un modificador.
 */
export async function setModifierAvailable(
  modifierId: string,
  isAvailable: boolean,
): Promise<Modifier> {
  validateModifierId(
    modifierId,
  );
  try {
    return await setModifierAvailableById(
      modifierId,
      isAvailable,
    );
  } catch (error) {
    console.error(
      'Error al cambiar disponibilidad del modificador:',
      error,
    );
    throw new Error(
      isAvailable
        ? 'No se pudo activar el modificador.'
        : 'No se pudo desactivar el modificador.',
    );
  }
}
/**
 * Crea un nuevo grupo.
 */
export async function createModifierGroup(
  input:
    CreateModifierGroupInput,
): Promise<ModifierGroupEntity> {
  const cleanName =
    input.name.trim();
  const cleanCode =
    normalizeCode(
      input.code,
    );
  validateModifierGroup(
    cleanName,
    cleanCode,
    input.position,
  );
  try {
    const data:
      CreateModifierGroupData = {
      code:
        cleanCode,
      name:
        cleanName,
      position:
        input.position,
    };
    return await insertModifierGroup(
      data,
    );
  } catch (error) {
    console.error(
      'Error al crear grupo de modificadores:',
      error,
    );
    throw new Error(
      error instanceof Error
        ? error.message
        : 'No se pudo crear el grupo.',
    );
  }
}
/**
 * Actualiza un grupo existente.
 *
 * El código queda fijo.
 */
export async function updateModifierGroup(
  groupId: string,
  input:
    UpdateModifierGroupInput,
): Promise<ModifierGroupEntity> {
  validateModifierId(
    groupId,
  );
  const cleanName =
    input.name.trim();
  if (!cleanName) {
    throw new Error(
      'El nombre del grupo es obligatorio.',
    );
  }
  if (
    !Number.isInteger(
      input.position,
    ) ||
    input.position < 0
  ) {
    throw new Error(
      'La posición del grupo no es válida.',
    );
  }
  try {
    return await updateModifierGroupById(
      groupId,
      {
        name:
          cleanName,
        position:
          input.position,
        isActive:
          input.isActive,
      },
    );
  } catch (error) {
    console.error(
      'Error al actualizar grupo:',
      error,
    );
    throw new Error(
      error instanceof Error
        ? error.message
        : 'No se pudo actualizar el grupo.',
    );
  }
}
/**
 * Activa o desactiva un grupo.
 */
export async function setModifierGroupActive(
  groupId: string,
  isActive: boolean,
): Promise<ModifierGroupEntity> {
  validateModifierId(
    groupId,
  );
  try {
    return await setModifierGroupActiveById(
      groupId,
      isActive,
    );
  } catch (error) {
    console.error(
      'Error al cambiar estado del grupo:',
      error,
    );
    throw new Error(
      isActive
        ? 'No se pudo activar el grupo.'
        : 'No se pudo desactivar el grupo.',
    );
  }
}
/**
 * Obtiene el grupo nuevo usando:
 *
 * 1. groupId, si ya viene de la nueva UI.
 * 2. groupName legacy, mientras AdminModifiers
 *    todavía use Carne/Salsa/Sabor.
 */
async function resolveModifierGroup(
  groupId?:
    | string
    | null,
  legacyGroupName?:
    ModifierGroup,
): Promise<ModifierGroupEntity> {
  if (
    groupId?.trim()
  ) {
    const groups =
      await fetchModifierGroups();
    const group =
      groups.find(
        item =>
          item.id ===
          groupId,
      );
    if (!group) {
      throw new Error(
        'El grupo de modificadores seleccionado no existe.',
      );
    }
    if (
      !group.is_active
    ) {
      throw new Error(
        'El grupo de modificadores seleccionado está inactivo.',
      );
    }
    return group;
  }
  const code =
    getCodeFromLegacyGroupName(
      legacyGroupName,
    );
  if (!code) {
    throw new Error(
      'Debes seleccionar un grupo de modificadores.',
    );
  }
  const group =
    await fetchModifierGroupByCode(
      code,
    );
  if (!group) {
    throw new Error(
      `No existe el grupo de modificadores "${code}".`,
    );
  }
  if (
    !group.is_active
  ) {
    throw new Error(
      `El grupo "${group.name}" está inactivo.`,
    );
  }
  return group;
}
/**
 * Traducción temporal de la UI antigua
 * hacia los códigos nuevos.
 */
function getCodeFromLegacyGroupName(
  groupName?:
    ModifierGroup,
): string | null {
  switch (
    groupName
  ) {
    case 'Carne':
      return 'meat';
    case 'Salsa':
      return 'sauce';
    case 'Sabor':
      return 'drink_flavor';
    default:
      return null;
  }
}
/**
 * Traducción temporal desde grupos nuevos
 * hacia group_name legacy.
 */
function getLegacyGroupName(
  code: string,
): ModifierGroup {
  switch (
    code
  ) {
    case 'meat':
      return 'Carne';
    case 'sauce':
      return 'Salsa';
    case 'drink_flavor':
      return 'Sabor';
    default:
      return null;
  }
}
function validateModifierId(
  modifierId: string,
): void {
  if (
    !modifierId?.trim()
  ) {
    throw new Error(
      'El identificador no es válido.',
    );
  }
}
function validateModifier(
  name: string,
  extraPrice: number,
): void {
  if (!name) {
    throw new Error(
      'El nombre del modificador es obligatorio.',
    );
  }
  if (
    !Number.isFinite(
      extraPrice,
    ) ||
    extraPrice < 0
  ) {
    throw new Error(
      'El precio extra no es válido.',
    );
  }
}
function validateModifierGroup(
  name: string,
  code: string,
  position: number,
): void {
  if (!name) {
    throw new Error(
      'El nombre del grupo es obligatorio.',
    );
  }
  if (!code) {
    throw new Error(
      'El código del grupo es obligatorio.',
    );
  }
  if (
    !Number.isInteger(
      position,
    ) ||
    position < 0
  ) {
    throw new Error(
      'La posición del grupo no es válida.',
    );
  }
}
function normalizeCode(
  value: string,
): string {
  return normalizeText(
    value,
  )
    .replace(
      /[^a-z0-9]+/g,
      '_',
    )
    .replace(
      /^_+|_+$/g,
      '',
    );
}
function normalizeText(
  value?: string | null,
): string {
  return (
    value
      ?.normalize(
        'NFD',
      )
      .replace(
        /[\u0300-\u036f]/g,
        '',
      )
      .trim()
      .toLocaleLowerCase(
        'es',
      ) ??
    ''
  );
}
export { ModifierGroupEntity, ModifierWithGroup };
