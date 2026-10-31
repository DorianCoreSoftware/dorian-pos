import {
  completeDriverDeliveryById,
  DriverOrderRecord,
  DriverOrderStatus,
  fetchDriverOrders,
  registerDriverPaymentById,
  startDriverDeliveryById,
  subscribeToDriverOrderChanges,
} from '../repositories/DriverRepository';

export interface DriverOrder {
  id: string;

  status:
    DriverOrderStatus;

  total: number;

  createdAt: string;

  customerName: string;

  customerPhone: string;

  street: string;

  exteriorNumber: string;

  interiorNumber: string;

  neighborhood: string;

  postalCode: string;

  deliveryReferences: string;

  latitude:
    | number
    | null;

  longitude:
    | number
    | null;

  deliveryZoneName: string;

  deliveryDistanceKm:
    | number
    | null;

  deliveryBaseFee: number;

  deliveryExtraFee: number;

  deliveryTotalFee: number;

  driverId:
    | string
    | null;
}

export async function getDriverOrders(): Promise<
  DriverOrder[]
> {
  const records =
    await fetchDriverOrders();

  return records.map(
    mapDriverOrder,
  );
}

export async function startDriverDelivery(
  orderId: string,
): Promise<void> {
  validateOrderId(
    orderId,
  );

  await startDriverDeliveryById(
    orderId,
  );
}

export async function completeDriverDelivery(
  orderId: string,
): Promise<void> {
  validateOrderId(
    orderId,
  );

  await completeDriverDeliveryById(
    orderId,
  );
}

export async function registerDriverPayment(
  orderId: string,

  paymentMethod:
    | 'cash'
    | 'card'
    | 'transfer',

  amountReceived:
    | number
    | null,

  paymentReference:
    | string
    | null,
): Promise<void> {
  validateOrderId(
    orderId,
  );

  await registerDriverPaymentById(
    orderId,
    paymentMethod,
    amountReceived,
    paymentReference,
  );
}

/*
 * ============================================================
 * REALTIME
 * ============================================================
 */
export function listenToDriverOrderChanges(
  onChange:
    () => void,
): () => void {
  return subscribeToDriverOrderChanges(
    onChange,
  );
}

/*
 * ============================================================
 * MAPPER
 * ============================================================
 */
function mapDriverOrder(
  record:
    DriverOrderRecord,
): DriverOrder {
  return {
    id:
      record.order_id,

    status:
      record.status,

    total:
      toNumber(
        record.total,
      ) ?? 0,

    createdAt:
      record.created_at,

    customerName:
      record.customer_name?.trim() ||
      'Cliente',

    customerPhone:
      record.customer_phone?.trim() ||
      '',

    street:
      record.street?.trim() ||
      '',

    exteriorNumber:
      record.exterior_number?.trim() ||
      '',

    interiorNumber:
      record.interior_number?.trim() ||
      '',

    neighborhood:
      record.neighborhood?.trim() ||
      '',

    postalCode:
      record.postal_code?.trim() ||
      '',

    deliveryReferences:
      record.delivery_references?.trim() ||
      '',

    latitude:
      toNumber(
        record.latitude,
      ),

    longitude:
      toNumber(
        record.longitude,
      ),

    deliveryZoneName:
      record.delivery_zone_name?.trim() ||
      '',

    deliveryDistanceKm:
      toNumber(
        record.delivery_distance_km,
      ),

    deliveryBaseFee:
      toNumber(
        record.delivery_base_fee,
      ) ?? 0,

    deliveryExtraFee:
      toNumber(
        record.delivery_extra_fee,
      ) ?? 0,

    deliveryTotalFee:
      toNumber(
        record.delivery_total_fee,
      ) ?? 0,

    driverId:
      record.driver_id,
  };
}

/*
 * ============================================================
 * HELPERS
 * ============================================================
 */
function toNumber(
  value:
    | number
    | string
    | null,
): number | null {
  if (
    value === null ||
    value === ''
  ) {
    return null;
  }

  const parsed =
    Number(value);

  return Number.isFinite(
    parsed,
  )
    ? parsed
    : null;
}

function validateOrderId(
  orderId:
    string,
): void {
  if (
    !orderId?.trim()
  ) {
    throw new Error(
      'El identificador del pedido no es válido.',
    );
  }
}