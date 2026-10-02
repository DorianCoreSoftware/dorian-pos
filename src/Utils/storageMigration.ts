export interface StorageAdapter {
  getItem: (
    key: string,
  ) => string | null;
  setItem: (
    key: string,
    value: string,
  ) => void;
  removeItem: (
    key: string,
  ) => void;
}

export const DORIAN_STORAGE_KEYS = {
  sessionLastActivity:
    'dorian:session:last-activity',
  sessionActiveUser:
    'dorian:session:active-user',
  recentWebOrderTrackingCodes:
    'dorian:web:recent-order-tracking-codes',
  lastWebOrderTrackingCode:
    'dorian:web:last-order-tracking-code',
  webLoyaltyToken:
    'dorian:web:loyalty-token',
} as const;

/*
 * Compatibilidad temporal con versiones
 * anteriores a Dorian POS.
 *
 * Estas claves se conservan durante la
 * transición para que una actualización o
 * rollback no pierda sesión, pedidos web ni
 * el token de Loyalty del usuario.
 */
export const LEGACY_STORAGE_KEYS = {
  sessionLastActivity:
    'burger-kong-last-activity',
  sessionActiveUser:
    'burger-kong-active-user',
  recentWebOrderTrackingCodes:
    'burger-kong:recent-web-order-tracking-codes',
  lastWebOrderTrackingCode:
    'burger-kong:last-web-order-tracking-code',
  webLoyaltyToken:
    'burger-kong-loyalty-token',
} as const;

export function getMigratedStorageItem(
  storage: StorageAdapter,
  key: string,
  legacyKeys: readonly string[] = [],
): string | null {
  const currentValue =
    storage.getItem(
      key,
    );

  if (
    currentValue !== null
  ) {
    return currentValue;
  }

  for (
    const legacyKey of
    legacyKeys
  ) {
    const legacyValue =
      storage.getItem(
        legacyKey,
      );

    if (
      legacyValue === null
    ) {
      continue;
    }

    storage.setItem(
      key,
      legacyValue,
    );

    return legacyValue;
  }

  return null;
}

export function setMigratedStorageItem(
  storage: StorageAdapter,
  key: string,
  value: string,
  legacyKeys: readonly string[] = [],
): void {
  storage.setItem(
    key,
    value,
  );

  /*
   * Dual-write temporal para permitir rollback
   * a una versión anterior durante la etapa de
   * migración de Burger Kong DEV/PROD.
   */
  for (
    const legacyKey of
    legacyKeys
  ) {
    storage.setItem(
      legacyKey,
      value,
    );
  }
}

export function removeMigratedStorageItem(
  storage: StorageAdapter,
  key: string,
  legacyKeys: readonly string[] = [],
): void {
  storage.removeItem(
    key,
  );

  for (
    const legacyKey of
    legacyKeys
  ) {
    storage.removeItem(
      legacyKey,
    );
  }
}
