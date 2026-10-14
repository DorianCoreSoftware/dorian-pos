import {
  supabase,
} from './supabase';

export interface DeliveryQuote {
  available: boolean;
  distanceKm: number | null;
  zoneId: string | null;
  zoneName: string | null;
  extraFee: number;
}

interface DeliveryQuoteRpcRow {
  available: boolean;

  distance_km:
    | string
    | number
    | null;

  zone_id:
    | string
    | null;

  zone_name:
    | string
    | null;

  extra_fee:
    | string
    | number;
}

export async function getDeliveryServiceStatus():
  Promise<boolean> {
  const {
    data,
    error,
  } = await supabase.rpc(
    'get_delivery_service_status',
  );

  if (error) {
    throw new Error(
      error.message ||
      'No se pudo consultar el estado del servicio a domicilio.',
    );
  }

  return Boolean(data);
}

export async function getDeliveryQuote(
  latitude: number,
  longitude: number,
): Promise<DeliveryQuote> {
  const {
    data,
    error,
  } = await supabase.rpc(
    'get_delivery_quote',
    {
      p_latitude:
        latitude,

      p_longitude:
        longitude,
    },
  );

  if (error) {
    throw new Error(
      error.message ||
      'No se pudo calcular la zona de entrega.',
    );
  }

  if (
    !Array.isArray(data) ||
    data.length === 0
  ) {
    throw new Error(
      'No se recibió información de la zona de entrega.',
    );
  }

  const row =
    data[0] as DeliveryQuoteRpcRow;

  return {
    available:
      Boolean(
        row.available,
      ),

    distanceKm:
      row.distance_km !== null
        ? Number(
          row.distance_km,
        )
        : null,

    zoneId:
      row.zone_id,

    zoneName:
      row.zone_name,

    extraFee:
      Number(
        row.extra_fee ?? 0,
      ),
  };
}