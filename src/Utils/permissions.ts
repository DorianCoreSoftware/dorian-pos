import {
  UserSession,
} from '../context/AuthContext';


export function canAccessAdminPanel(
  user: UserSession | null,
): boolean {
  return (
    user?.role === 'admin' ||
    user?.role === 'accountant'
  );
}

export function canManagePayroll(
  user: UserSession | null,
): boolean {
  return (
    user?.role === 'admin' ||
    user?.role === 'accountant'
  );
}

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
    user?.role === 'driver' ||
    user?.role === 'admin'
  );
}

export function canCreateRefund(
  user: UserSession | null,
): boolean {
  return user?.role === 'admin';
}

export function canAuthorizeRefundException(
  user: UserSession | null,
): boolean {
  return user?.role === 'admin';
}

export function canViewRefundReport(
  user: UserSession | null,
): boolean {
  return user?.role === 'admin';
}


export function canManageRefundSettings(
  user: UserSession | null,
): boolean {
  return user?.role === 'admin';
}
