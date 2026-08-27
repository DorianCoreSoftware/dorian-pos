import {
  supabase,
} from './supabase';

export interface PromotionSettings {
  id: string;
  kong_enabled: boolean;
  lucky_dorian_enabled: boolean;
  lucky_dorian_chance: number;
  required_kongs: number;
  is_active: boolean;
}

interface PromotionSettingsRow {
  id: string;
  kong_enabled: boolean;
  lucky_dorian_enabled: boolean;
  lucky_dorian_chance:
    | string
    | number;
  required_kongs:
    | string
    | number;
  is_active: boolean;
}

export async function getPromotionSettings():
Promise<PromotionSettings> {
  const {
    data,
    error,
  } = await supabase
    .from(
      'promo_settings',
    )
    .select(`
      id,
      kong_enabled,
      lucky_dorian_enabled,
      lucky_dorian_chance,
      required_kongs,
      is_active
    `)
    .eq(
      'is_active',
      true,
    )
    .single();

  if (error) {
    console.error(
      'Error fetching promotion settings:',
      error,
    );

    throw error;
  }

  const row =
    data as
    PromotionSettingsRow;

  return {
    id:
      row.id,

    kong_enabled:
      Boolean(
        row.kong_enabled,
      ),

    lucky_dorian_enabled:
      Boolean(
        row.lucky_dorian_enabled,
      ),

    lucky_dorian_chance:
      Number(
        row.lucky_dorian_chance ??
        0,
      ),

    required_kongs:
      Number(
        row.required_kongs ??
        5,
      ),

    is_active:
      Boolean(
        row.is_active,
      ),
  };
}

export async function updatePromotionSettings(
  id: string,
  settings: {
    kong_enabled?: boolean;
    lucky_dorian_enabled?: boolean;
    lucky_dorian_chance?: number;
    required_kongs?: number;
  },
): Promise<void> {
  const {
    error,
  } = await supabase
    .from(
      'promo_settings',
    )
    .update({
      ...settings,
      updated_at:
        new Date()
          .toISOString(),
    })
    .eq(
      'id',
      id,
    );

  if (error) {
    console.error(
      'Error updating promotion settings:',
      error,
    );

    throw error;
  }
}