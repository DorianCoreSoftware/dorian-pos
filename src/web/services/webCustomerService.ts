import {
  supabase,
} from '../../services/supabase';

export interface WebCustomerSession {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  sessionToken: string;
  loyaltyCustomerId: string | null;
}

export interface WebCustomerProfile {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  loyaltyCustomerId: string | null;
  qrToken: string | null;
  rewardsActive: boolean;
}

export interface WebCustomerOrderItem {
  id: string;
  productId: string | null;
  productName: string;
  quantity: number;
  unitPrice: number;
  notes: string | null;
}

export interface WebCustomerOrder {
  id: string;
  trackingCode: string;
  status: string;
  total: number;
  fulfillmentType: string | null;
  createdAt: string;
  updatedAt: string | null;
  customerName: string | null;
  items: WebCustomerOrderItem[];
}


export function isInvalidWebCustomerSessionError(
  error: unknown,
): boolean {
  const message =
    error instanceof Error
      ? error.message
          .toLocaleLowerCase('es')
      : String(error ?? '')
          .toLocaleLowerCase('es');

  return (
    message.includes(
      'sesión expiró',
    ) ||
    message.includes(
      'sesion expiro',
    ) ||
    message.includes(
      'sesión requerida',
    ) ||
    message.includes(
      'sesion requerida',
    ) ||
    message.includes(
      'sesión no es válida',
    ) ||
    message.includes(
      'sesion no es valida',
    )
  );
}

function normalizePhone(
  value: string,
): string {
  return value.replace(
    /\D/g,
    '',
  );
}

function validatePhoneAndPin(
  phone: string,
  pin: string,
): {
  phone: string;
  pin: string;
} {
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

  return {
    phone: cleanPhone,
    pin: cleanPin,
  };
}

export async function registerWebCustomer(
  name: string,
  phone: string,
  email: string,
  pin: string,
): Promise<WebCustomerSession> {
  const cleanName =
    name.trim();

  if (
    cleanName.length < 2
  ) {
    throw new Error(
      'Ingresa tu nombre.',
    );
  }

  const credentials =
    validatePhoneAndPin(
      phone,
      pin,
    );

  const cleanEmail =
    email.trim() || null;

  const {
    data,
    error,
  } = await supabase.rpc(
    'register_web_customer',
    {
      p_name: cleanName,
      p_phone:
        credentials.phone,
      p_email: cleanEmail,
      p_pin: credentials.pin,
    },
  );

  if (error) {
    throw new Error(
      error.message ||
      'No se pudo crear tu cuenta.',
    );
  }

  return data as WebCustomerSession;
}

export async function loginWebCustomer(
  phone: string,
  pin: string,
): Promise<WebCustomerSession> {
  const credentials =
    validatePhoneAndPin(
      phone,
      pin,
    );

  const {
    data,
    error,
  } = await supabase.rpc(
    'login_web_customer',
    {
      p_phone:
        credentials.phone,
      p_pin: credentials.pin,
    },
  );

  if (error) {
    throw new Error(
      error.message ||
      'No se pudo iniciar sesión.',
    );
  }

  return data as WebCustomerSession;
}

export async function getMyWebCustomer(
  sessionToken: string,
): Promise<WebCustomerProfile> {
  const {
    data,
    error,
  } = await supabase.rpc(
    'get_my_web_customer',
    {
      p_session_token:
        sessionToken.trim(),
    },
  );

  if (error) {
    throw new Error(
      error.message ||
      'No se pudo cargar tu cuenta.',
    );
  }

  return data as WebCustomerProfile;
}

export async function getMyWebOrders(
  sessionToken: string,
): Promise<WebCustomerOrder[]> {
  const {
    data,
    error,
  } = await supabase.rpc(
    'get_my_web_orders',
    {
      p_session_token:
        sessionToken.trim(),
      p_limit: 30,
      p_offset: 0,
    },
  );

  if (error) {
    throw new Error(
      error.message ||
      'No se pudo cargar tu historial de pedidos.',
    );
  }

  return (
    data ?? []
  ) as WebCustomerOrder[];
}

export async function logoutWebCustomer(
  sessionToken: string,
): Promise<void> {
  const {
    error,
  } = await supabase.rpc(
    'logout_web_customer',
    {
      p_session_token:
        sessionToken.trim(),
    },
  );

  if (error) {
    throw new Error(
      error.message ||
      'No se pudo cerrar la sesión.',
    );
  }
}

export interface WebCustomerRewardsAccess {
  loyaltyCustomerId: string;
  qrToken: string;
  name: string;
  totalVisits: number;
}

export async function activateMyWebRewards(
  sessionToken: string,
): Promise<WebCustomerRewardsAccess> {
  const {
    data,
    error,
  } = await supabase.rpc(
    'activate_my_web_rewards',
    {
      p_session_token:
        sessionToken.trim(),
    },
  );

  if (error) {
    throw new Error(
      error.message ||
      'No se pudo abrir tu cuenta de recompensas.',
    );
  }

  return data as WebCustomerRewardsAccess;
}
