const RECENT_WEB_ORDER_TRACKING_CODES_KEY =
  'burger-kong:recent-web-order-tracking-codes';

const LAST_WEB_ORDER_TRACKING_CODE_KEY =
  'burger-kong:last-web-order-tracking-code';

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
    window.localStorage.setItem(
      RECENT_WEB_ORDER_TRACKING_CODES_KEY,
      JSON.stringify(
        trackingCodes.slice(
          0,
          MAX_RECENT_ORDERS,
        ),
      ),
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
      window.localStorage.getItem(
        RECENT_WEB_ORDER_TRACKING_CODES_KEY,
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
      window.localStorage.getItem(
        LAST_WEB_ORDER_TRACKING_CODE_KEY,
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

  /*
   * Conservamos también la clave antigua
   * por compatibilidad.
   */
  try {
    if (
      typeof window !==
      'undefined'
    ) {
      window.localStorage.setItem(
        LAST_WEB_ORDER_TRACKING_CODE_KEY,
        normalized,
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
    window.localStorage.removeItem(
      LAST_WEB_ORDER_TRACKING_CODE_KEY,
    );

    window.localStorage.removeItem(
      RECENT_WEB_ORDER_TRACKING_CODES_KEY,
    );
  } catch {
    // Sin acción.
  }
}