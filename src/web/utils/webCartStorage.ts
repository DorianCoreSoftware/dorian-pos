import {
  Cart,
} from '../../types';

const CART_STORAGE_KEY =
  'dorian:web-cart';

const ORDER_MODE_STORAGE_KEY =
  'dorian:web-order-mode';

export type WebOrderMode =
  | 'guest';

function canUseStorage(): boolean {
  return (
    typeof window !==
    'undefined'
  );
}

export function getSavedWebCart(): Cart {
  if (!canUseStorage()) {
    return [];
  }

  const raw =
    window.localStorage.getItem(
      CART_STORAGE_KEY,
    );

  if (!raw) {
    return [];
  }

  try {
    const parsed =
      JSON.parse(raw);

    if (!Array.isArray(parsed)) {
      throw new Error(
        'Carrito guardado inválido.',
      );
    }

    return parsed as Cart;
  } catch (error) {
    console.warn(
      'No se pudo restaurar el carrito web:',
      error,
    );

    window.localStorage.removeItem(
      CART_STORAGE_KEY,
    );

    return [];
  }
}

export function saveWebCart(
  cart: Cart,
): void {
  if (!canUseStorage()) {
    return;
  }

  if (cart.length === 0) {
    window.localStorage.removeItem(
      CART_STORAGE_KEY,
    );
    return;
  }

  window.localStorage.setItem(
    CART_STORAGE_KEY,
    JSON.stringify(cart),
  );
}

export function getSavedWebOrderMode():
  | WebOrderMode
  | null {
  if (!canUseStorage()) {
    return null;
  }

  const value =
    window.localStorage.getItem(
      ORDER_MODE_STORAGE_KEY,
    );

  return value === 'guest'
    ? value
    : null;
}

export function saveWebOrderMode(
  mode: WebOrderMode,
): void {
  if (!canUseStorage()) {
    return;
  }

  window.localStorage.setItem(
    ORDER_MODE_STORAGE_KEY,
    mode,
  );
}

export function clearSavedWebOrderMode(): void {
  if (!canUseStorage()) {
    return;
  }

  window.localStorage.removeItem(
    ORDER_MODE_STORAGE_KEY,
  );
}
