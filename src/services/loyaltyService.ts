import {
  fetchLoyaltyStatus,
  redeemLoyaltyReward,
  registerLoyaltyCustomer,
  registerLoyaltyVisit,
} from '../repositories/LoyaltyRepository';

import {
  LoyaltyStatus,
  RedeemLoyaltyRewardResult,
  RegisterLoyaltyCustomerResult,
  RegisterLoyaltyVisitResult,
} from '../types/loyalty';

function cleanQrToken(
  qrToken: string,
): string {
  return qrToken.trim();
}

export async function createLoyaltyCustomer(
  name: string,
  phone: string,
  email?: string,
): Promise<RegisterLoyaltyCustomerResult> {
  const cleanName =
    name.trim();

  const cleanPhone =
    phone.trim();

  const cleanEmail =
    email?.trim() || null;

  if (
    cleanName.length < 2
  ) {
    throw new Error(
      'Ingresa un nombre válido.',
    );
  }

  if (
    cleanPhone.length < 10
  ) {
    throw new Error(
      'Ingresa un teléfono válido.',
    );
  }

  try {
    return await registerLoyaltyCustomer(
      cleanName,
      cleanPhone,
      cleanEmail,
    );
  } catch (error) {
    console.error(
      'Error registrando cliente Rewards:',
      error,
    );

    throw error;
  }
}

export async function getLoyaltyStatus(
  qrToken: string,
): Promise<LoyaltyStatus> {
  const cleanToken =
    cleanQrToken(
      qrToken,
    );

  if (!cleanToken) {
    throw new Error(
      'QR inválido.',
    );
  }

  try {
    return await fetchLoyaltyStatus(
      cleanToken,
    );
  } catch (error) {
    console.error(
      'Error obteniendo estado Rewards:',
      error,
    );

    throw error;
  }
}

export async function addLoyaltyVisit(
  qrToken: string,
  orderId?: string | null,
): Promise<RegisterLoyaltyVisitResult> {
  const cleanToken =
    cleanQrToken(
      qrToken,
    );

  if (!cleanToken) {
    throw new Error(
      'QR inválido.',
    );
  }

  try {
    return await registerLoyaltyVisit(
      cleanToken,
      orderId,
    );
  } catch (error) {
    console.error(
      'Error registrando visita Rewards:',
      error,
    );

    throw error;
  }
}

export async function redeemReward(
  qrToken: string,
  rewardId: string,
  orderId?: string | null,
): Promise<RedeemLoyaltyRewardResult> {
  const cleanToken =
    cleanQrToken(
      qrToken,
    );

  const cleanRewardId =
    rewardId.trim();

  if (!cleanToken) {
    throw new Error(
      'QR inválido.',
    );
  }

  if (!cleanRewardId) {
    throw new Error(
      'Recompensa inválida.',
    );
  }

  try {
    return await redeemLoyaltyReward(
      cleanToken,
      cleanRewardId,
      orderId,
    );
  } catch (error) {
    console.error(
      'Error canjeando recompensa:',
      error,
    );

    throw error;
  }
}

export function extractLoyaltyQrToken(
  value: string,
): string {
  const cleanValue =
    value.trim();

  const uuidRegex =
    /[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/i;

  const match =
    cleanValue.match(
      uuidRegex,
    );

  if (!match) {
    throw new Error(
      'Este QR no pertenece al programa de recompensas.',
    );
  }

  return match[0];
}