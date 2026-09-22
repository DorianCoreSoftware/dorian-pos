import {
  supabase,
} from './supabase';

export interface LoyaltyAdminSettings {
  isEnabled: boolean;

  minimumPurchaseAmount:
    number | null;

  visitCooldownMinutes:
    number;

  maxVisitsPerDay:
    number;
}

export interface LoyaltyAdminReward {
  id: string;

  name: string;

  description:
    string | null;

  requiredVisits:
    number;

  isActive:
    boolean;

  position:
    number;

  createdAt:
    string;

  updatedAt:
    string;
}

export interface LoyaltyAdminConfig {
  settings:
    LoyaltyAdminSettings;

  rewards:
    LoyaltyAdminReward[];
}

export interface SaveLoyaltySettingsInput {
  isEnabled: boolean;

  minimumPurchaseAmount:
    number | null;

  visitCooldownMinutes:
    number;

  maxVisitsPerDay:
    number;
}

export interface SaveLoyaltyRewardInput {
  name: string;

  description:
    string | null;

  requiredVisits:
    number;

  position:
    number;

  isActive:
    boolean;
}

export async function getLoyaltyAdminConfig():
  Promise<LoyaltyAdminConfig> {
  const {
    data,
    error,
  } =
    await supabase.rpc(
      'get_loyalty_admin_config',
    );

  if (error) {
    throw new Error(
      error.message ||
      'No se pudo cargar la configuración de recompensas.',
    );
  }

  return data as
    LoyaltyAdminConfig;
}

export async function saveLoyaltySettings(
  input:
    SaveLoyaltySettingsInput,
): Promise<void> {
  const {
    error,
  } =
    await supabase.rpc(
      'update_loyalty_settings',
      {
        p_is_enabled:
          input.isEnabled,

        p_minimum_purchase_amount:
          input.minimumPurchaseAmount,

        p_visit_cooldown_minutes:
          input.visitCooldownMinutes,

        p_max_visits_per_day:
          input.maxVisitsPerDay,
      },
    );

  if (error) {
    throw new Error(
      error.message ||
      'No se pudo guardar la configuración.',
    );
  }
}

export async function createLoyaltyReward(
  input:
    SaveLoyaltyRewardInput,
): Promise<void> {
  const {
    error,
  } =
    await supabase.rpc(
      'create_loyalty_reward',
      {
        p_name:
          input.name,

        p_description:
          input.description,

        p_required_visits:
          input.requiredVisits,

        p_position:
          input.position,

        p_is_active:
          input.isActive,
      },
    );

  if (error) {
    throw new Error(
      error.message ||
      'No se pudo crear la recompensa.',
    );
  }
}

export async function updateLoyaltyReward(
  id:
    string,

  input:
    SaveLoyaltyRewardInput,
): Promise<void> {
  const {
    error,
  } =
    await supabase.rpc(
      'update_loyalty_reward',
      {
        p_reward_id:
          id,

        p_name:
          input.name,

        p_description:
          input.description,

        p_required_visits:
          input.requiredVisits,

        p_position:
          input.position,

        p_is_active:
          input.isActive,
      },
    );

  if (error) {
    throw new Error(
      error.message ||
      'No se pudo actualizar la recompensa.',
    );
  }
}

export async function setLoyaltyRewardActive(
  reward:
    LoyaltyAdminReward,

  isActive:
    boolean,
): Promise<void> {
  await updateLoyaltyReward(
    reward.id,
    {
      name:
        reward.name,

      description:
        reward.description,

      requiredVisits:
        reward.requiredVisits,

      position:
        reward.position,

      isActive,
    },
  );
}