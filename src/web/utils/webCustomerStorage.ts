const STORAGE_KEY =
  'dorian:web-customer-session-token';

const CHAT_STORAGE_KEYS = [
  'dorian_web_chat_messages_v1',
  'dorian_web_visitor_id_v1',
  'dorian_web_chat_terminal_v1',
] as const;

export function saveWebCustomerSessionToken(
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

export function getSavedWebCustomerSessionToken():
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

export function clearSavedWebCustomerSessionToken(): void {
  if (
    typeof window ===
    'undefined'
  ) {
    return;
  }

  window.localStorage.removeItem(
    STORAGE_KEY,
  );

  for (
    const key of
    CHAT_STORAGE_KEYS
  ) {
    window.localStorage.removeItem(
      key,
    );
  }

  try {
    window.dispatchEvent(
      new CustomEvent(
        'dorian:web-customer-session-cleared',
      ),
    );
  } catch {
    // No-op. El storage ya quedó limpio.
  }
}
