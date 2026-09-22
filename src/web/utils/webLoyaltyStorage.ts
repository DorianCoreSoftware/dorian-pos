const STORAGE_KEY =
  'burger-kong-loyalty-token';

export function saveWebLoyaltyToken(
  token: string,
): void {
  if (
    typeof window ===
    'undefined'
  ) {
    return;
  }

  window.localStorage.setItem(
    STORAGE_KEY,
    token,
  );
}

export function getSavedWebLoyaltyToken():
  | string
  | null {
  if (
    typeof window ===
    'undefined'
  ) {
    return null;
  }

  return window.localStorage.getItem(
    STORAGE_KEY,
  );
}

export function clearSavedWebLoyaltyToken():
  void {
  if (
    typeof window ===
    'undefined'
  ) {
    return;
  }

  window.localStorage.removeItem(
    STORAGE_KEY,
  );
}