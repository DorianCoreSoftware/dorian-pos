import {
  UserSession,
} from '../context/AuthContext';

export function canManageCash(
  user: UserSession | null,
): boolean {
  return (
    user?.role === 'admin'
  );
}

export function canManageCatalog(
  user: UserSession | null,
): boolean {
  return (
    user?.role === 'admin'
  );
}

export function isDriver(
  user: UserSession | null,
): boolean {
  return (
    user?.role === 'driver'
  );
}

export function canAccessDriverOrders(
  user: UserSession | null,
): boolean {
  return (
    user?.role === 'driver'
  );
}