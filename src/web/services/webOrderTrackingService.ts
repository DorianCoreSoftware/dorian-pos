import { supabase } from '../../services/supabase';

export type PublicOrderTrackingStatus =
  | 'pending'
  | 'preparing'
  | 'ready'
  | 'on_the_way'
  | 'delivered'
  | 'cancelled';

export type PublicOrderFulfillmentType =
  | 'pickup'
  | 'delivery';

export interface PublicOrderTracking {
  orderId: string;
  trackingCode: string;
  status: PublicOrderTrackingStatus;
  fulfillmentType: PublicOrderFulfillmentType;
  createdAt: string;
  customerName: string | null;
}

interface PublicOrderTrackingRpcRow {
  order_id: string;
  tracking_code: string;
  status: PublicOrderTrackingStatus;
  fulfillment_type: PublicOrderFulfillmentType;
  created_at: string;
  customer_name: string | null;
}

export function normalizeTrackingCode(
  value: string,
): string {
  return value
    .trim()
    .toUpperCase()
    .replace(/\s+/g, '');
}

export function isValidTrackingCode(
  value: string,
): boolean {
  return /^[0-9A-F]{8}$/.test(
    normalizeTrackingCode(value),
  );
}

export async function getPublicOrderTracking(
  trackingCode: string,
): Promise<PublicOrderTracking | null> {
  const normalizedCode =
    normalizeTrackingCode(
      trackingCode,
    );

  if (
    !isValidTrackingCode(
      normalizedCode,
    )
  ) {
    throw new Error(
      'Ingresa un código de pedido válido de 8 caracteres.',
    );
  }

  const {
    data,
    error,
  } = await supabase.rpc(
    'get_public_order_tracking',
    {
      p_tracking_code:
        normalizedCode,
    },
  );

  if (error) {
    throw new Error(
      `No se pudo consultar el pedido: ${error.message}`,
    );
  }

  const rows =
    (data ??
      []) as PublicOrderTrackingRpcRow[];

  const row =
    rows[0];

  if (!row) {
    return null;
  }

  return {
    orderId:
      row.order_id,

    trackingCode:
      row.tracking_code,

    status:
      row.status,

    fulfillmentType:
      row.fulfillment_type,

    createdAt:
      row.created_at,

    customerName:
      row.customer_name,
  };
}
