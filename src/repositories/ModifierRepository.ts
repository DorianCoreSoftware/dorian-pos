import {

  supabase,

} from '../services/supabase';



import {

  Modifier,

} from '../types';



export interface ModifierGroupEntity {

  id: string;

  code: string;

  name: string;

  is_active: boolean;

  position: number;

  created_at?: string;

  updated_at?: string;

}



export interface ModifierWithGroup

  extends Modifier {

  group_id: string;

  group: ModifierGroupEntity;

}



interface ModifierGroupDatabaseRecord {

  id: string;

  code: string;

  name: string;

  is_active: boolean;

  position: number;

  created_at?: string;

  updated_at?: string;

}



interface ModifierDatabaseRecord {

  id: string;

  name: string;



  extra_price:

    | string

    | number;



  is_available: boolean;



  group_id: string;



  /**

   * Supabase puede inferir esta relación

   * como objeto o como arreglo.

   */

  group:

    | ModifierGroupDatabaseRecord

    | ModifierGroupDatabaseRecord[]

    | null;

}



export interface CreateModifierData {

  name: string;

  extraPrice: number;



  groupId: string;

}



export interface UpdateModifierData {

  name: string;

  extraPrice: number;



  groupId: string;



  isAvailable: boolean;

}



export interface CreateModifierGroupData {

  code: string;

  name: string;

  position: number;

}



export interface UpdateModifierGroupData {

  name: string;

  position: number;

  isActive: boolean;

}



const MODIFIER_SELECT = `

  id,

  name,

  extra_price,

  is_available,

  group_id,

  group:modifier_groups!modifiers_group_id_fkey(

    id,

    code,

    name,

    is_active,

    position,

    created_at,

    updated_at

  )

`;



const MODIFIER_GROUP_SELECT = `

  id,

  code,

  name,

  is_active,

  position,

  created_at,

  updated_at

`;



function mapModifierGroup(

  group:

    ModifierGroupDatabaseRecord,

): ModifierGroupEntity {

  return {

    id:

      group.id,



    code:

      group.code,



    name:

      group.name,



    is_active:

      group.is_active,



    position:

      group.position,



    created_at:

      group.created_at,



    updated_at:

      group.updated_at,

  };

}



function mapModifier(

  modifier:

    ModifierDatabaseRecord,

): ModifierWithGroup {

  const rawGroup = Array.isArray(
    modifier.group,
  )
    ? modifier.group[0] ?? null
    : modifier.group;

  if (!rawGroup) {
    throw new Error(
      `El modificador "${modifier.name}" no tiene un grupo válido.`,
    );
  }



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

group_id:

      modifier.group_id,



    group: mapModifierGroup(
      rawGroup,
    ),

  };

}



/**

 * Obtiene modificadores disponibles.

 */

export async function fetchAvailableModifiers(): Promise<

  ModifierWithGroup[]

> {

  const {

    data,

    error,

  } = await supabase

    .from(

      'modifiers',

    )

    .select(

      MODIFIER_SELECT,

    )

    .eq(

      'is_available',

      true,

    )

    .order(

      'name',

      {

        ascending:

          true,

      },

    );



  if (error) {

    throw new Error(

      `No se pudieron consultar los modificadores: ${error.message}`,

    );

  }



  return (

    data ??

    []

  ).map(

    modifier =>

      mapModifier(

        modifier as

          ModifierDatabaseRecord,

      ),

  );

}



/**

 * Obtiene todos los modificadores.

 */

export async function fetchAllModifiers(): Promise<

  ModifierWithGroup[]

> {

  const {

    data,

    error,

  } = await supabase

    .from(

      'modifiers',

    )

    .select(

      MODIFIER_SELECT,

    )

    .order(

      'name',

      {

        ascending:

          true,

      },

    );



  if (error) {

    throw new Error(

      `No se pudieron consultar los modificadores: ${error.message}`,

    );

  }



  const modifiers =

    (

      data ??

      []

    ).map(

      modifier =>

        mapModifier(

          modifier as

            ModifierDatabaseRecord,

        ),

    );



  return modifiers.sort(

    (

      first,

      second,

    ) => {

      const firstPosition =

        first.group

          ?.position ??

        Number.MAX_SAFE_INTEGER;



      const secondPosition =

        second.group

          ?.position ??

        Number.MAX_SAFE_INTEGER;



      if (

        firstPosition !==

        secondPosition

      ) {

        return (

          firstPosition -

          secondPosition

        );

      }



      return first.name.localeCompare(

        second.name,

        'es',

        {

          sensitivity:

            'base',

        },

      );

    },

  );

}



/**

 * Obtiene todos los grupos.

 */

export async function fetchModifierGroups(): Promise<

  ModifierGroupEntity[]

> {

  const {

    data,

    error,

  } = await supabase

    .from(

      'modifier_groups',

    )

    .select(

      MODIFIER_GROUP_SELECT,

    )

    .order(

      'position',

      {

        ascending:

          true,

      },

    )

    .order(

      'name',

      {

        ascending:

          true,

      },

    );



  if (error) {

    throw new Error(

      `No se pudieron consultar los grupos de modificadores: ${error.message}`,

    );

  }



  return (

    data ??

    []

  ).map(

    group =>

      mapModifierGroup(

        group as

          ModifierGroupDatabaseRecord,

      ),

  );

}



/**

 * Obtiene únicamente grupos activos.

 */

export async function fetchActiveModifierGroups(): Promise<

  ModifierGroupEntity[]

> {

  const {

    data,

    error,

  } = await supabase

    .from(

      'modifier_groups',

    )

    .select(

      MODIFIER_GROUP_SELECT,

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

    )

    .order(

      'name',

      {

        ascending:

          true,

      },

    );



  if (error) {

    throw new Error(

      `No se pudieron consultar los grupos activos: ${error.message}`,

    );

  }



  return (

    data ??

    []

  ).map(

    group =>

      mapModifierGroup(

        group as

          ModifierGroupDatabaseRecord,

      ),

  );

}



/**

 * Inserta un modificador.

 */

export async function insertModifier(

  modifierData:

    CreateModifierData,

): Promise<ModifierWithGroup> {

  const {

    data,

    error,

  } = await supabase

    .from(

      'modifiers',

    )

    .insert({

      name:

        modifierData.name,



      extra_price:

        modifierData.extraPrice,



      group_id:

        modifierData.groupId,



      is_available:

        true,

    })

    .select(

      MODIFIER_SELECT,

    )

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



/**

 * Actualiza un modificador.

 */

export async function updateModifierById(

  modifierId: string,

  modifierData:

    UpdateModifierData,

): Promise<ModifierWithGroup> {

  const {

    data,

    error,

  } = await supabase

    .from(

      'modifiers',

    )

    .update({

      name:

        modifierData.name,



      extra_price:

        modifierData.extraPrice,



      group_id:

        modifierData.groupId,



      is_available:

        modifierData.isAvailable,

    })

    .eq(

      'id',

      modifierId,

    )

    .select(

      MODIFIER_SELECT,

    )

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



/**

 * Activa o desactiva un modificador.

 */

export async function setModifierAvailableById(

  modifierId: string,

  isAvailable: boolean,

): Promise<ModifierWithGroup> {

  const {

    data,

    error,

  } = await supabase

    .from(

      'modifiers',

    )

    .update({

      is_available:

        isAvailable,

    })

    .eq(

      'id',

      modifierId,

    )

    .select(

      MODIFIER_SELECT,

    )

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



/**

 * Crea un grupo.

 */

export async function insertModifierGroup(

  input:

    CreateModifierGroupData,

): Promise<ModifierGroupEntity> {

  const {

    data,

    error,

  } = await supabase

    .from(

      'modifier_groups',

    )

    .insert({

      code:

        input.code,



      name:

        input.name,



      position:

        input.position,



      is_active:

        true,

    })

    .select(

      MODIFIER_GROUP_SELECT,

    )

    .single();



  if (error) {

    throw new Error(

      error.message,

    );

  }



  return mapModifierGroup(

    data as

      ModifierGroupDatabaseRecord,

  );

}



/**

 * Actualiza un grupo.

 *

 * El código no se modifica.

 */

export async function updateModifierGroupById(

  groupId: string,

  input:

    UpdateModifierGroupData,

): Promise<ModifierGroupEntity> {

  const {

    data,

    error,

  } = await supabase

    .from(

      'modifier_groups',

    )

    .update({

      name:

        input.name,



      position:

        input.position,



      is_active:

        input.isActive,



      updated_at:

        new Date()

          .toISOString(),

    })

    .eq(

      'id',

      groupId,

    )

    .select(

      MODIFIER_GROUP_SELECT,

    )

    .single();



  if (error) {

    throw new Error(

      error.message,

    );

  }



  return mapModifierGroup(

    data as

      ModifierGroupDatabaseRecord,

  );

}



/**

 * Activa o desactiva un grupo.

 */

export async function setModifierGroupActiveById(

  groupId: string,

  isActive: boolean,

): Promise<ModifierGroupEntity> {

  const {

    data,

    error,

  } = await supabase

    .from(

      'modifier_groups',

    )

    .update({

      is_active:

        isActive,



      updated_at:

        new Date()

          .toISOString(),

    })

    .eq(

      'id',

      groupId,

    )

    .select(

      MODIFIER_GROUP_SELECT,

    )

    .single();



  if (error) {

    throw new Error(

      error.message,

    );

  }



  return mapModifierGroup(

    data as

      ModifierGroupDatabaseRecord,

  );

}