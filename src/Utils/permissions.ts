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