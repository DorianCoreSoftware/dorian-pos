import {
  supabase,
} from '../../../services/supabase';

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
  avatarUrl?: string | null;
  createdAt?: string | null;
}

export interface UpdateWebCustomerProfileInput {
  name: string;
  phone: string;
  email?: string | null;
}

export interface WebCustomerAddress {
  id: string;
  label: string;
  street: string;
  exteriorNumber: string;
  interiorNumber: string;
  neighborhood: string;
  postalCode: string;
  deliveryReferences: string;
  latitude: number;
  longitude: number;
  isDefault: boolean;
  updatedAt: string;
}

export interface SaveWebCustomerAddressInput {
  label?: string | null;
  street: string;
  exteriorNumber: string;
  interiorNumber?: string | null;
  neighborhood: string;
  postalCode?: string | null;
  deliveryReferences?: string | null;
  latitude: number;
  longitude: number;
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

export type WebCustomerPromotionCodeStatus =
  | 'available'
  | 'redeemed'
  | 'voided';

export interface WebCustomerPromotionCode {
  id: string;
  orderId: string;
  orderTrackingCode: string;
  code: string;
  programId: string;
  programName: string;
  programType: string;
  requiredCoupons: number | null;
  status: WebCustomerPromotionCodeStatus;
  redeemedAt: string | null;
  voidedAt: string | null;
  createdAt: string;
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

export async function getMyWebCustomerProfileDetails(
  sessionToken: string,
): Promise<{
  avatarUrl: string | null;
  createdAt: string | null;
}> {
  const {
    data,
    error,
  } = await supabase.rpc(
    'get_my_web_customer_profile_details',
    {
      p_session_token:
        sessionToken.trim(),
    },
  );

  if (error) {
    throw new Error(
      error.message ||
      'No se pudieron cargar los detalles de tu perfil.',
    );
  }

  const row =
    data as {
      avatarUrl?: string | null;
      createdAt?: string | null;
    } | null;

  return {
    avatarUrl:
      row?.avatarUrl ??
      null,
    createdAt:
      row?.createdAt ??
      null,
  };
}

export async function updateMyWebCustomerProfile(
  sessionToken: string,
  input: UpdateWebCustomerProfileInput,
): Promise<WebCustomerProfile> {
  const cleanName =
    input.name.trim();

  const cleanPhone =
    normalizePhone(
      input.phone,
    );

  const cleanEmail =
    input.email?.trim()
      .toLowerCase() ||
    null;

  if (
    cleanName.length <
    2
  ) {
    throw new Error(
      'Ingresa un nombre válido.',
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
    cleanEmail &&
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
      cleanEmail,
    )
  ) {
    throw new Error(
      'Ingresa un correo electrónico válido.',
    );
  }

  const {
    data,
    error,
  } = await supabase.rpc(
    'update_my_web_customer_profile',
    {
      p_session_token:
        sessionToken.trim(),
      p_name:
        cleanName,
      p_phone:
        cleanPhone,
      p_email:
        cleanEmail,
    },
  );

  if (error) {
    throw new Error(
      error.message ||
      'No se pudo actualizar tu perfil.',
    );
  }

  return data as WebCustomerProfile;
}

export async function uploadMyWebCustomerAvatar(
  sessionToken: string,
  imageBase64: string,
  mimeType:
    | 'image/jpeg'
    | 'image/png'
    | 'image/webp',
): Promise<string> {
  const {
    data,
    error,
  } = await supabase.functions.invoke(
    'web-customer-avatar',
    {
      body: {
        action:
          'upload',
        sessionToken:
          sessionToken.trim(),
        imageBase64,
        mimeType,
      },
    },
  );

  if (error) {
    let detail =
      error.message;

    const context =
      (
        error as {
          context?: Response;
        }
      ).context;

    if (context) {
      try {
        const payload =
          await context
            .clone()
            .json() as {
              error?: string;
            };

        if (
          payload?.error
        ) {
          detail =
            payload.error;
        }
      } catch {
        // Conserva el mensaje original.
      }
    }

    throw new Error(
      detail ||
      'No se pudo subir la foto de perfil.',
    );
  }

  const avatarUrl =
    (
      data as {
        avatarUrl?: string;
      } | null
    )?.avatarUrl?.trim();

  if (!avatarUrl) {
    throw new Error(
      'No se recibió la nueva foto de perfil.',
    );
  }

  return avatarUrl;
}

export async function removeMyWebCustomerAvatar(
  sessionToken: string,
): Promise<void> {
  const {
    error,
  } = await supabase.functions.invoke(
    'web-customer-avatar',
    {
      body: {
        action:
          'remove',
        sessionToken:
          sessionToken.trim(),
      },
    },
  );

  if (error) {
    throw new Error(
      error.message ||
      'No se pudo eliminar la foto de perfil.',
    );
  }
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

export async function getMyWebPromotionCodes(
  sessionToken: string,
): Promise<WebCustomerPromotionCode[]> {
  const {
    data,
    error,
  } = await supabase.rpc(
    'get_my_web_promotion_codes',
    {
      p_session_token:
        sessionToken.trim(),
      p_limit: 100,
      p_offset: 0,
    },
  );

  if (error) {
    throw new Error(
      error.message ||
      'No se pudo cargar tu historial de códigos.',
    );
  }

  return (
    data ?? []
  ) as WebCustomerPromotionCode[];
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


export async function getMyDefaultWebCustomerAddress(
  sessionToken: string,
): Promise<WebCustomerAddress | null> {
  const {
    data,
    error,
  } = await supabase.rpc(
    'get_my_web_customer_default_address',
    {
      p_session_token:
        sessionToken.trim(),
    },
  );

  if (error) {
    throw new Error(
      error.message ||
      'No se pudo cargar tu dirección guardada.',
    );
  }

  if (!data) {
    return null;
  }

  return data as WebCustomerAddress;
}

export async function saveMyDefaultWebCustomerAddress(
  sessionToken: string,
  input: SaveWebCustomerAddressInput,
): Promise<WebCustomerAddress> {
  const cleanToken =
    sessionToken.trim();

  const street =
    input.street.trim();

  const exteriorNumber =
    input.exteriorNumber.trim();

  const neighborhood =
    input.neighborhood.trim();

  if (
    !cleanToken ||
    !street ||
    !exteriorNumber ||
    !neighborhood ||
    !Number.isFinite(input.latitude) ||
    !Number.isFinite(input.longitude)
  ) {
    throw new Error(
      'La dirección no contiene todos los datos necesarios para guardarse.',
    );
  }

  const {
    data,
    error,
  } = await supabase.rpc(
    'save_my_web_customer_default_address',
    {
      p_session_token:
        cleanToken,
      p_label:
        input.label?.trim() ||
        'Principal',
      p_street:
        street,
      p_exterior_number:
        exteriorNumber,
      p_interior_number:
        input.interiorNumber?.trim() ||
        null,
      p_neighborhood:
        neighborhood,
      p_postal_code:
        input.postalCode?.trim() ||
        null,
      p_delivery_references:
        input.deliveryReferences?.trim() ||
        null,
      p_latitude:
        input.latitude,
      p_longitude:
        input.longitude,
    },
  );

  if (error) {
    throw new Error(
      error.message ||
      'No se pudo guardar tu dirección.',
    );
  }

  return data as WebCustomerAddress;
}


export async function deleteMyDefaultWebCustomerAddress(
  sessionToken: string,
): Promise<void> {
  const {
    error,
  } = await supabase.rpc(
    'delete_my_web_customer_default_address',
    {
      p_session_token:
        sessionToken.trim(),
    },
  );

  if (error) {
    throw new Error(
      error.message ||
      'No se pudo eliminar la dirección guardada.',
    );
  }
}
