import {
  Session,
} from '@supabase/supabase-js';

import {
  AuthSubscription,
  fetchUserProfileById,
  getCurrentSession,
  signInWithIdentifierCredentials,
  signOutCurrentUser,
  subscribeToAuthChanges,
} from '../repositories/AuthRepository';

import {
  UserRole,
} from '../types/auth';

export interface AuthenticatedUser {
  id: string;
  email: string;
}

export interface UserProfile {
  role: UserRole;
  fullName: string;
  isActive: boolean;
}

export interface AuthState {
  user:
    AuthenticatedUser | null;
}

function mapSessionUser(
  session:
    Session | null,
): AuthenticatedUser | null {
  if (
    !session?.user
  ) {
    return null;
  }

  return {
    id:
      session.user.id,

    email:
      session.user.email ??
      '',
  };
}

export async function getActiveUser(): Promise<
  AuthenticatedUser | null
> {
  try {
    const session =
      await getCurrentSession();

    return mapSessionUser(
      session,
    );
  } catch (error) {
    console.error(
      'Error al recuperar la sesión activa:',
      error,
    );

    throw new Error(
      'No se pudo recuperar la sesión.',
    );
  }
}

export function listenToAuthChanges(
  callback: (
    authState:
      AuthState,
  ) => void,
): AuthSubscription {
  return subscribeToAuthChanges(
    (
      _event,
      session,
    ) => {
      callback({
        user:
          mapSessionUser(
            session,
          ),
      });
    },
  );
}

export async function signInWithIdentifier(
  identifier:
    string,

  password:
    string,
): Promise<AuthenticatedUser> {
  const cleanIdentifier =
    identifier
      .trim()
      .toLowerCase();

  if (
    !cleanIdentifier
  ) {
    throw new Error(
      'El correo o usuario es obligatorio.',
    );
  }

  if (
    !password
  ) {
    throw new Error(
      'La contraseña es obligatoria.',
    );
  }

  try {
    const session =
      await signInWithIdentifierCredentials(
        cleanIdentifier,
        password,
      );

    const user =
      mapSessionUser(
        session,
      );

    if (
      !user
    ) {
      throw new Error(
        'No se pudo obtener el usuario autenticado.',
      );
    }

    return user;
  } catch (error) {
    console.error(
      'Error al iniciar sesión:',
      error,
    );

    throw error;
  }
}

/**
 * Alias temporal para no romper otros imports
 * existentes mientras migramos el login.
 */
export async function signInWithEmail(
  email:
    string,

  password:
    string,
): Promise<AuthenticatedUser> {
  return signInWithIdentifier(
    email,
    password,
  );
}

export async function getUserProfile(
  userId:
    string,
): Promise<UserProfile> {
  try {
    const profile =
      await fetchUserProfileById(
        userId,
      );

    const fullName = [
      profile.first_name,
      profile.last_name,
    ]
      .filter(
        Boolean,
      )
      .join(' ')
      .trim();

    return {
      role:
        profile.role,

      fullName,

      isActive:
        profile.is_active !==
        false,
    };
  } catch (error) {
    console.error(
      'Error al obtener el perfil:',
      error,
    );

    throw new Error(
      'No se pudo obtener el perfil del usuario.',
    );
  }
}

export async function signOut(): Promise<void> {
  try {
    await signOutCurrentUser();
  } catch (error) {
    console.error(
      'Error al cerrar sesión:',
      error,
    );

    throw new Error(
      'No se pudo cerrar la sesión.',
    );
  }
}