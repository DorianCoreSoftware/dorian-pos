import {
  supabase,
} from './supabase';

export interface DeliverySettings {
  id: boolean;

  businessLatitude:
    number | null;

  businessLongitude:
    number | null;

  businessAddress:
    string | null;

  businessPlaceId:
    string | null;

  isEnabled:
    boolean;
}

export interface DeliveryZone {
  id: string;

  name: string;

  minDistanceKm:
    number;

  maxDistanceKm:
    number;

  extraFee:
    number;

  isActive:
    boolean;

  sortOrder:
    number;
}

interface DeliverySettingsRow {
  id: boolean;

  business_latitude:
    number | null;

  business_longitude:
    number | null;

  business_address:
    string | null;

  business_place_id:
    string | null;

  is_enabled:
    boolean;
}

interface DeliveryZoneRow {
  id: string;

  name: string;

  min_distance_km:
    string | number;

  max_distance_km:
    string | number;

  extra_fee:
    string | number;

  is_active:
    boolean;

  sort_order:
    number;
}

export interface SaveDeliverySettingsInput {
  businessLatitude:
    number | null;

  businessLongitude:
    number | null;

  businessAddress:
    string | null;

  businessPlaceId:
    string | null;

  isEnabled:
    boolean;
}

export interface SaveDeliveryZoneInput {
  name: string;

  minDistanceKm:
    number;

  maxDistanceKm:
    number;

  extraFee:
    number;

  isActive:
    boolean;

  sortOrder:
    number;
}

function mapSettings(
  row:
    DeliverySettingsRow,
): DeliverySettings {
  return {
    id:
      row.id,

    businessLatitude:
      row.business_latitude,

    businessLongitude:
      row.business_longitude,

    businessAddress:
      row.business_address,

    businessPlaceId:
      row.business_place_id,

    isEnabled:
      row.is_enabled,
  };
}

function mapZone(
  row:
    DeliveryZoneRow,
): DeliveryZone {
  return {
    id:
      row.id,

    name:
      row.name,

    minDistanceKm:
      Number(
        row.min_distance_km,
      ),

    maxDistanceKm:
      Number(
        row.max_distance_km,
      ),

    extraFee:
      Number(
        row.extra_fee,
      ),

    isActive:
      row.is_active,

    sortOrder:
      row.sort_order,
  };
}

export async function getDeliverySettings():
  Promise<DeliverySettings> {
  const {
    data,
    error,
  } =
    await supabase
      .from(
        'delivery_settings',
      )
      .select(`
        id,
        business_latitude,
        business_longitude,
        business_address,
        business_place_id,
        is_enabled
      `)
      .eq(
        'id',
        true,
      )
      .single();

  if (
    error
  ) {
    throw new Error(
      error.message ||
      'No se pudo cargar la configuración de entregas.',
    );
  }

  return mapSettings(
    data as DeliverySettingsRow,
  );
}

export async function saveDeliverySettings(
  input:
    SaveDeliverySettingsInput,
): Promise<void> {
  const {
    error,
  } =
    await supabase
      .from(
        'delivery_settings',
      )
      .update({
        business_latitude:
          input.businessLatitude,

        business_longitude:
          input.businessLongitude,

        business_address:
          input.businessAddress,

        business_place_id:
          input.businessPlaceId,

        is_enabled:
          input.isEnabled,
      })
      .eq(
        'id',
        true,
      );

  if (
    error
  ) {
    throw new Error(
      error.message ||
      'No se pudo guardar la configuración de entregas.',
    );
  }
}

export async function getDeliveryZones():
  Promise<DeliveryZone[]> {
  const {
    data,
    error,
  } =
    await supabase
      .from(
        'delivery_zones',
      )
      .select(`
        id,
        name,
        min_distance_km,
        max_distance_km,
        extra_fee,
        is_active,
        sort_order
      `)
      .order(
        'sort_order',
        {
          ascending:
            true,
        },
      )
      .order(
        'max_distance_km',
        {
          ascending:
            true,
        },
      );

  if (
    error
  ) {
    throw new Error(
      error.message ||
      'No se pudieron cargar las zonas de entrega.',
    );
  }

  return (
    data ??
    []
  ).map(
    (
      row,
    ) =>
      mapZone(
        row as DeliveryZoneRow,
      ),
  );
}

export async function createDeliveryZone(
  input:
    SaveDeliveryZoneInput,
): Promise<void> {
  const {
    error,
  } =
    await supabase
      .from(
        'delivery_zones',
      )
      .insert({
        name:
          input.name,

        min_distance_km:
          input.minDistanceKm,

        max_distance_km:
          input.maxDistanceKm,

        extra_fee:
          input.extraFee,

        is_active:
          input.isActive,

        sort_order:
          input.sortOrder,
      });

  if (
    error
  ) {
    throw new Error(
      error.message ||
      'No se pudo crear la zona de entrega.',
    );
  }
}

export async function updateDeliveryZone(
  id:
    string,

  input:
    SaveDeliveryZoneInput,
): Promise<void> {
  const {
    error,
  } =
    await supabase
      .from(
        'delivery_zones',
      )
      .update({
        name:
          input.name,

        min_distance_km:
          input.minDistanceKm,

        max_distance_km:
          input.maxDistanceKm,

        extra_fee:
          input.extraFee,

        is_active:
          input.isActive,

        sort_order:
          input.sortOrder,
      })
      .eq(
        'id',
        id,
      );

  if (
    error
  ) {
    throw new Error(
      error.message ||
      'No se pudo actualizar la zona de entrega.',
    );
  }
}

export async function setDeliveryZoneActive(
  id:
    string,

  isActive:
    boolean,
): Promise<void> {
  const {
    error,
  } =
    await supabase
      .from(
        'delivery_zones',
      )
      .update({
        is_active:
          isActive,
      })
      .eq(
        'id',
        id,
      );

  if (
    error
  ) {
    throw new Error(
      error.message ||
      'No se pudo cambiar el estado de la zona.',
    );
  }
}

export async function deleteDeliveryZone(
  id:
    string,
): Promise<void> {
  const {
    error,
  } =
    await supabase
      .from(
        'delivery_zones',
      )
      .delete()
      .eq(
        'id',
        id,
      );

  if (
    error
  ) {
    throw new Error(
      error.message ||
      'No se pudo eliminar la zona de entrega.',
    );
  }
}