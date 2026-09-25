import {
  supabase,
} from './supabase';

export interface ModifierPromotion {
  id: string;
  display_name: string;
  modifier_id: string;
  modifier_name: string;
  discount_amount: number;
  starts_at: string | null;
  ends_at: string | null;
}

export interface ModifierPromotionSettings {
  id: string;
  display_name: string;
  modifier_id: string | null;
  discount_amount: number;
  is_enabled: boolean;
  starts_at: string | null;
  ends_at: string | null;
}

export interface ModifierPromotionOption {
  id: string;
  name: string;
  group_id: string;
  group_name: string;
}

interface ModifierPromotionSettingsRow {
  id: string;
  display_name: string | null;
  modifier_id: string | null;
  discount_amount: string | number;
  is_enabled: boolean;
  starts_at: string | null;
  ends_at: string | null;
}

interface ActiveModifierPromotionRow {
  id: string;
  display_name: string | null;
  modifier_id: string;
  modifier_name: string;
  discount_amount: string | number;
  starts_at: string | null;
  ends_at: string | null;
}

interface ModifierPromotionOptionRow {
  id: string;
  name: string;
  group_id: string;
  group:
    | {
        id: string;
        name: string;
      }
    | Array<{
        id: string;
        name: string;
      }>
    | null;
}

export async function getAvailablePromotionModifiers(): Promise<ModifierPromotionOption[]> {
  const { data, error } = await supabase
    .from('modifiers')
    .select(`
      id,
      name,
      group_id,
      group:modifier_groups!inner(
        id,
        name,
        position,
        is_active
      )
    `)
    .eq('is_available', true)
    .eq('group.is_active', true)
    .order('name', { ascending: true });

  if (error) {
    console.error(
      'Error fetching promotion modifiers:',
      error,
    );
    throw error;
  }

  return (data ?? [])
    .map(row => {
      const typedRow =
        row as unknown as ModifierPromotionOptionRow;

      const rawGroup =
        Array.isArray(typedRow.group)
          ? typedRow.group[0] ?? null
          : typedRow.group;

      return {
        id: typedRow.id,
        name: typedRow.name,
        group_id: typedRow.group_id,
        group_name: rawGroup?.name ?? 'Opciones',
      };
    })
    .sort((first, second) => {
      const groupComparison =
        first.group_name.localeCompare(
          second.group_name,
          'es',
          { sensitivity: 'base' },
        );

      if (groupComparison !== 0) {
        return groupComparison;
      }

      return first.name.localeCompare(
        second.name,
        'es',
        { sensitivity: 'base' },
      );
    });
}

export async function getModifierPromotionSettings(): Promise<ModifierPromotionSettings | null> {
  const { data, error } = await supabase
    .from('modifier_promotion_settings')
    .select(`
      id,
      display_name,
      modifier_id,
      discount_amount,
      is_enabled,
      starts_at,
      ends_at
    `)
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error(
      'Error fetching modifier promotion settings:',
      error,
    );
    throw error;
  }

  if (!data) {
    return null;
  }

  const row =
    data as ModifierPromotionSettingsRow;

  return {
    id: row.id,
    display_name:
      row.display_name?.trim() ||
      'Promoción de modificador',
    modifier_id: row.modifier_id,
    discount_amount:
      Number(row.discount_amount ?? 5),
    is_enabled:
      Boolean(row.is_enabled),
    starts_at: row.starts_at,
    ends_at: row.ends_at,
  };
}

export async function saveModifierPromotionSettings(
  id: string | null,
  settings: {
    display_name: string;
    modifier_id: string | null;
    discount_amount: number;
    is_enabled: boolean;
    starts_at: string | null;
    ends_at: string | null;
  },
): Promise<string> {
  const updatedAt =
    new Date().toISOString();

  const payload = {
    ...settings,
    display_name:
      settings.display_name.trim(),
    updated_at: updatedAt,
  };

  if (id) {
    const { data, error } = await supabase
      .from('modifier_promotion_settings')
      .update(payload)
      .eq('id', id)
      .select('id')
      .single();

    if (error) {
      console.error(
        'Error updating modifier promotion settings:',
        error,
      );
      throw error;
    }

    return data.id;
  }

  const { data, error } = await supabase
    .from('modifier_promotion_settings')
    .insert({
      ...payload,
      created_at: updatedAt,
    })
    .select('id')
    .single();

  if (error) {
    console.error(
      'Error creating modifier promotion settings:',
      error,
    );
    throw error;
  }

  return data.id;
}

export async function getActiveModifierPromotion(): Promise<ModifierPromotion | null> {
  const { data, error } = await supabase.rpc(
    'get_active_modifier_promotion',
  );

  if (error) {
    console.error(
      'Error fetching active modifier promotion:',
      error,
    );
    throw error;
  }

  if (
    !Array.isArray(data) ||
    data.length === 0
  ) {
    return null;
  }

  const row =
    data[0] as ActiveModifierPromotionRow;

  return {
    id: row.id,
    display_name:
      row.display_name?.trim() ||
      'Promoción de modificador',
    modifier_id: row.modifier_id,
    modifier_name: row.modifier_name,
    discount_amount:
      Number(row.discount_amount),
    starts_at: row.starts_at,
    ends_at: row.ends_at,
  };
}
