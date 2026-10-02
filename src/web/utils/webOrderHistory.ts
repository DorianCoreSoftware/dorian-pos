import {
  DORIAN_STORAGE_KEYS,
  LEGACY_STORAGE_KEYS,
  getMigratedStorageItem,
  removeMigratedStorageItem,
  setMigratedStorageItem,
} from '../../Utils/storageMigration';

const RECENT_WEB_ORDER_TRACKING_CODES_KEY =
  DORIAN_STORAGE_KEYS.recentWebOrderTrackingCodes;

const LAST_WEB_ORDER_TRACKING_CODE_KEY =
  DORIAN_STORAGE_KEYS.lastWebOrderTrackingCode;

const LEGACY_RECENT_KEYS = [
  LEGACY_STORAGE_KEYS.recentWebOrderTrackingCodes,
] as const;

const LEGACY_LAST_KEYS = [
  LEGACY_STORAGE_KEYS.lastWebOrderTrackingCode,
] as const;

const MAX_RECENT_ORDERS =
  3;

function normalizeTrackingCode(
  trackingCode:
    | string
    | null
    | undefined,
):
  | string
  | null {
  const normalized =
    trackingCode
      ?.trim()
      .toUpperCase() ??
    '';

  return /^[0-9A-F]{8}$/.test(
    normalized,
  )
    ? normalized
    : null;
}

function saveRecentCodes(
  trackingCodes: string[],
): void {
  if (
    typeof window ===
    'undefined'
  ) {
    return;
  }

  try {
    setMigratedStorageItem(
      window.localStorage,
      RECENT_WEB_ORDER_TRACKING_CODES_KEY,
      JSON.stringify(
        trackingCodes.slice(
          0,
          MAX_RECENT_ORDERS,
        ),
      ),
      LEGACY_RECENT_KEYS,
    );
  } catch {
    // El navegador puede bloquear localStorage.
  }
}

export function getRecentWebOrderTrackingCodes():
  string[] {
  if (
    typeof window ===
    'undefined'
  ) {
    return [];
  }

  try {
    const value =
      getMigratedStorageItem(
        window.localStorage,
        RECENT_WEB_ORDER_TRACKING_CODES_KEY,
        LEGACY_RECENT_KEYS,
      );

    if (value) {
      const parsed =
        JSON.parse(
          value,
        );

      if (
        Array.isArray(
          parsed,
        )
      ) {
        const normalizedCodes =
          parsed
            .map(
              item =>
                normalizeTrackingCode(
                  String(
                    item,
                  ),
                ),
            )
            .filter(
              (
                item,
              ): item is string =>
                item !== null,
            );

        return Array.from(
          new Set(
            normalizedCodes,
          ),
        ).slice(
          0,
          MAX_RECENT_ORDERS,
        );
      }
    }

    /*
     * Migración automática desde
     * el sistema anterior de un solo pedido.
     */
    const previousValue =
      getMigratedStorageItem(
        window.localStorage,
        LAST_WEB_ORDER_TRACKING_CODE_KEY,
        LEGACY_LAST_KEYS,
      );

    const previousCode =
      normalizeTrackingCode(
        previousValue,
      );

    if (
      previousCode
    ) {
      saveRecentCodes([
        previousCode,
      ]);

      return [
        previousCode,
      ];
    }

    return [];
  } catch {
    return [];
  }
}

export function saveWebOrderTrackingCode(
  trackingCode: string,
): void {
  const normalized =
    normalizeTrackingCode(
      trackingCode,
    );

  if (
    !normalized
  ) {
    return;
  }

  const current =
    getRecentWebOrderTrackingCodes();

  const next = [
    normalized,

    ...current.filter(
      code =>
        code !==
        normalized,
    ),
  ].slice(
    0,
    MAX_RECENT_ORDERS,
  );

  saveRecentCodes(
    next,
  );

  try {
    if (
      typeof window !==
      'undefined'
    ) {
      setMigratedStorageItem(
        window.localStorage,
        LAST_WEB_ORDER_TRACKING_CODE_KEY,
        normalized,
        LEGACY_LAST_KEYS,
      );
    }
  } catch {
    // Sin acción.
  }
}

/*
 * Compatibilidad con cualquier parte
 * antigua del proyecto.
 */
export function saveLastWebOrderTrackingCode(
  trackingCode: string,
): void {
  saveWebOrderTrackingCode(
    trackingCode,
  );
}

export function getLastWebOrderTrackingCode():
  | string
  | null {
  return (
    getRecentWebOrderTrackingCodes()[
      0
    ] ??
    null
  );
}

export function clearLastWebOrderTrackingCode():
  void {
  if (
    typeof window ===
    'undefined'
  ) {
    return;
  }

  try {
    removeMigratedStorageItem(
      window.localStorage,
      LAST_WEB_ORDER_TRACKING_CODE_KEY,
      LEGACY_LAST_KEYS,
    );

    removeMigratedStorageItem(
      window.localStorage,
      RECENT_WEB_ORDER_TRACKING_CODES_KEY,
      LEGACY_RECENT_KEYS,
    );
  } catch {
    // Sin acción.
  }
}
