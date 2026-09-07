const LAST_WEB_ORDER_TRACKING_CODE_KEY =
  'burger-kong:last-web-order-tracking-code';

export function saveLastWebOrderTrackingCode(
  trackingCode: string,
): void {
  if (
    typeof window === 'undefined'
  ) {
    return;
  }

  const normalized =
    trackingCode
      .trim()
      .toUpperCase();

  if (
    !/^[0-9A-F]{8}$/.test(
      normalized,
    )
  ) {
    return;
  }

  try {
    window.localStorage.setItem(
      LAST_WEB_ORDER_TRACKING_CODE_KEY,
      normalized,
    );
  } catch {
    // El navegador puede bloquear localStorage.
  }
}

export function getLastWebOrderTrackingCode():
  | string
  | null {
  if (
    typeof window === 'undefined'
  ) {
    return null;
  }

  try {
    const value =
      window.localStorage.getItem(
        LAST_WEB_ORDER_TRACKING_CODE_KEY,
      );

    if (!value) {
      return null;
    }

    const normalized =
      value
        .trim()
        .toUpperCase();

    return /^[0-9A-F]{8}$/.test(
      normalized,
    )
      ? normalized
      : null;
  } catch {
    return null;
  }
}

export function clearLastWebOrderTrackingCode(): void {
  if (
    typeof window === 'undefined'
  ) {
    return;
  }

  try {
    window.localStorage.removeItem(
      LAST_WEB_ORDER_TRACKING_CODE_KEY,
    );
  } catch {
    // Sin acción.
  }
}