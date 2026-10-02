import {
  DORIAN_STORAGE_KEYS,
  LEGACY_STORAGE_KEYS,
  getMigratedStorageItem,
  removeMigratedStorageItem,
  setMigratedStorageItem,
} from '../../Utils/storageMigration';

const STORAGE_KEY =
  DORIAN_STORAGE_KEYS.webLoyaltyToken;

const LEGACY_KEYS = [
  LEGACY_STORAGE_KEYS.webLoyaltyToken,
] as const;

export function saveWebLoyaltyToken(
  token: string,
): void {
  if (
    typeof window ===
    'undefined'
  ) {
    return;
  }

  setMigratedStorageItem(
    window.localStorage,
    STORAGE_KEY,
    token,
    LEGACY_KEYS,
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

  return getMigratedStorageItem(
    window.localStorage,
    STORAGE_KEY,
    LEGACY_KEYS,
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

  removeMigratedStorageItem(
    window.localStorage,
    STORAGE_KEY,
    LEGACY_KEYS,
  );
}
