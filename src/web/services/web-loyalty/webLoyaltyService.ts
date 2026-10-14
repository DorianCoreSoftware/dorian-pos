import {
  supabase,
} from '../../../services/supabase';

export type WebLoyaltyRewardStatus =
  | 'locked'
  | 'available'
  | 'redeemed';

export interface WebLoyaltyCustomer {
  id: string;
  name: string;
  qrToken: string;
  totalVisits: number;
}

export interface WebLoyaltyReward {
  id: string;
  name: string;
  description: string | null;
  requiredVisits: number;
  status: WebLoyaltyRewardStatus;
  visitsRemaining: number;
  redeemedAt: string | null;
}

export interface WebLoyaltyStatus {
  customer: WebLoyaltyCustomer;
  rewards: WebLoyaltyReward[];
}

export interface RegisterWebLoyaltyCustomerResult {
  id: string;
  name: string;
  qrToken: string;
  totalVisits: number;
}

function normalizePhone(
  value: string,
): string {
  return value.replace(
    /\D/g,
    '',
  );
}

export async function getWebLoyaltyStatus(
  qrToken: string,
): Promise<WebLoyaltyStatus> {
  const {
    data,
    error,
  } =
    await supabase.rpc(
      'get_loyalty_status',
      {
        p_qr_token:
          qrToken.trim(),
      },
    );

  if (error) {
    throw new Error(
      error.message ||
      'No se pudo consultar tu cuenta Rewards.',
    );
  }

  return data as
    WebLoyaltyStatus;
}

export interface LoginWebLoyaltyResult {
  id: string;
  name: string;
  qrToken: string;
}

export async function registerWebLoyaltyCustomer(
  name: string,
  phone: string,
  email: string | undefined,
  pin: string,
): Promise<RegisterWebLoyaltyCustomerResult> {
  const cleanName =
    name.trim();

  const cleanPhone =
    normalizePhone(
      phone,
    );

  const cleanEmail =
    email?.trim() ||
    null;

  const cleanPin =
    pin.trim();

  if (
    cleanName.length <
    2
  ) {
    throw new Error(
      'Ingresa tu nombre.',
    );
  }

  if (
    cleanPhone.length !==
    10
  ) {
    throw new Error(
      'El teléfono debe tener 10 dígitos.',
    );
  }

  if (
    !/^\d{6}$/.test(
      cleanPin,
    )
  ) {
    throw new Error(
      'El PIN debe tener 6 dígitos.',
    );
  }

  const {
    data,
    error,
  } =
    await supabase.rpc(
      'register_loyalty_customer',
      {
        p_name:
          cleanName,

        p_phone:
          cleanPhone,

        p_email:
          cleanEmail,

        p_pin:
          cleanPin,
      },
    );

  if (error) {
    throw new Error(
      error.message ||
      'No se pudo completar tu registro.',
    );
  }

  return data as
    RegisterWebLoyaltyCustomerResult;
}

export async function loginWebLoyaltyCustomer(
  phone: string,
  pin: string,
): Promise<LoginWebLoyaltyResult> {
  const cleanPhone =
    normalizePhone(
      phone,
    );

  const cleanPin =
    pin.trim();

  if (
    cleanPhone.length !==
    10
  ) {
    throw new Error(
      'Ingresa un teléfono válido.',
    );
  }

  if (
    !/^\d{6}$/.test(
      cleanPin,
    )
  ) {
    throw new Error(
      'Ingresa tu PIN de 6 dígitos.',
    );
  }

  const {
    data,
    error,
  } =
    await supabase.rpc(
      'login_loyalty_customer',
      {
        p_phone:
          cleanPhone,

        p_pin:
          cleanPin,
      },
    );

  if (error) {
    throw new Error(
      error.message ||
      'No se pudo iniciar sesión.',
    );
  }

  return data as
    LoginWebLoyaltyResult;
}