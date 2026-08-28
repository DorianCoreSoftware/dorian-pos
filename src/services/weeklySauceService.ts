import {
  supabase,
} from './supabase';

export interface WeeklySauce {
  id: string;
  modifier_id: string;
  modifier_name: string;
  discount_amount: number;
  starts_at: string | null;
  ends_at: string | null;
}

export interface WeeklySauceSettings {
  id: string;
  modifier_id: string | null;
  discount_amount: number;
  is_enabled: boolean;
  starts_at: string | null;
  ends_at: string | null;
}

export interface SauceOption {
  id: string;
  name: string;
}

interface WeeklySauceSettingsRow {
  id: string;
  modifier_id: string | null;
  discount_amount: string | number;
  is_enabled: boolean;
  starts_at: string | null;
  ends_at: string | null;
}

interface ActiveWeeklySauceRow {
  id: string;
  modifier_id: string;
  modifier_name: string;
  discount_amount: string | number;
  starts_at: string | null;
  ends_at: string | null;
}

export async function getAvailableSauces(): Promise<SauceOption[]> {
  const { data, error } = await supabase
    .from('modifiers')
    .select('id, name')
    .eq('group_name', 'Salsa')
    .eq('is_available', true)
    .order('name', { ascending: true });

  if (error) {
    console.error('Error fetching sauces:', error);
    throw error;
  }

  return (data ?? []).map(row => ({
    id: row.id,
    name: row.name,
  }));
}

export async function getWeeklySauceSettings(): Promise<WeeklySauceSettings | null> {
  const { data, error } = await supabase
    .from('weekly_sauce_settings')
    .select(`
      id,
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
    console.error('Error fetching weekly sauce settings:', error);
    throw error;
  }

  if (!data) {
    return null;
  }

  const row = data as WeeklySauceSettingsRow;

  return {
    id: row.id,
    modifier_id: row.modifier_id,
    discount_amount: Number(row.discount_amount ?? 5),
    is_enabled: Boolean(row.is_enabled),
    starts_at: row.starts_at,
    ends_at: row.ends_at,
  };
}

export async function saveWeeklySauceSettings(
  id: string | null,
  settings: {
    modifier_id: string | null;
    discount_amount: number;
    is_enabled: boolean;
    starts_at: string | null;
    ends_at: string | null;
  },
): Promise<string> {
  const updatedAt = new Date().toISOString();

  if (id) {
    const { data, error } = await supabase
      .from('weekly_sauce_settings')
      .update({
        ...settings,
        updated_at: updatedAt,
      })
      .eq('id', id)
      .select('id')
      .single();

    if (error) {
      console.error('Error updating weekly sauce settings:', error);
      throw error;
    }

    return data.id;
  }

  const { data, error } = await supabase
    .from('weekly_sauce_settings')
    .insert({
      ...settings,
      created_at: updatedAt,
      updated_at: updatedAt,
    })
    .select('id')
    .single();

  if (error) {
    console.error('Error creating weekly sauce settings:', error);
    throw error;
  }

  return data.id;
}

export async function getActiveWeeklySauce(): Promise<WeeklySauce | null> {
  const { data, error } = await supabase.rpc('get_active_weekly_sauce');

  if (error) {
    console.error('Error fetching active weekly sauce:', error);
    throw error;
  }

  if (!Array.isArray(data) || data.length === 0) {
    return null;
  }

  const row = data[0] as ActiveWeeklySauceRow;

  return {
    id: row.id,
    modifier_id: row.modifier_id,
    modifier_name: row.modifier_name,
    discount_amount: Number(row.discount_amount),
    starts_at: row.starts_at,
    ends_at: row.ends_at,
  };
}
