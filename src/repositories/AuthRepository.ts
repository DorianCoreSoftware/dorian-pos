import {
  AuthChangeEvent,
  Session,
} from '@supabase/supabase-js';

import {
  supabase,
} from '../services/supabase';

import {
  UserRole,
} from '../types/auth';

export interface UserProfileRecord {
  role: UserRole;
  first_name:
    string | null;
  last_name:
    string | null;
  is_active:
    boolean;
}

export interface AuthSubscription {
  unsubscribe:
    () => void;
}

interface LoginByIdentifierResponse {
  accessToken?: string;
  refreshToken?: string;
  error?: string;
}

export async function getCurrentSession(): Promise<
  Session | null
> {
  const {
    data: {
      session,
    },
    error,
  } =
    await supabase.auth.getSession();

  if (
    error
  ) {
    throw error;
  }

  return session;
}

export function subscribeToAuthChanges(
  callback: (
    event:
      AuthChangeEvent,

    session:
      Session | null,
  ) => void,
): AuthSubscription {
  const {
    data: {
      subscription,
    },
  } =
    supabase.auth.onAuthStateChange(
      callback,
    );

  return {
    unsubscribe: () => {
      subscription.unsubscribe();
    },
  };
}

export async function signInWithIdentifierCredentials(
  identifier:
    string,

  password:
    string,
): Promise<Session> {
  const {
    data,
    error,
  } =
    await supabase.functions.invoke(
      'login-by-identifier',
      {
        body: {
          identifier,
          password,
        },
      },
    );

  if (
    error
  ) {
    throw new Error(
      error.message,
    );
  }

  const response =
    data as
      LoginByIdentifierResponse;

  if (
    response.error
  ) {
    throw new Error(
      response.error,
    );
  }

  if (
    !response.accessToken ||
    !response.refreshToken
  ) {
    throw new Error(
      'No se recibió una sesión válida.',
    );
  }

  const {
    data:
      sessionData,
    error:
      setSessionError,
  } =
    await supabase.auth.setSession({
      access_token:
        response.accessToken,

      refresh_token:
        response.refreshToken,
    });

  if (
    setSessionError
  ) {
    throw setSessionError;
  }

  if (
    !sessionData.session
  ) {
    throw new Error(
      'No se pudo crear la sesión.',
    );
  }

  return sessionData.session;
}

/**
 * Se conserva para cualquier flujo que todavía
 * necesite autenticación directa por correo.
 */
export async function signInWithPassword(
  email:
    string,

  password:
    string,
): Promise<Session> {
  const {
    data,
    error,
  } =
    await supabase.auth.signInWithPassword({
      email,
      password,
    });

  if (
    error
  ) {
    throw error;
  }

  if (
    !data.session
  ) {
    throw new Error(
      'No se pudo crear la sesión.',
    );
  }

  return data.session;
}

export async function fetchUserProfileById(
  userId:
    string,
): Promise<UserProfileRecord> {
  const {
    data,
    error,
  } =
    await supabase
      .from(
        'profiles',
      )
      .select(`
        role,
        first_name,
        last_name,
        is_active
      `)
      .eq(
        'id',
        userId,
      )
      .single();

  if (
    error
  ) {
    throw error;
  }

  return data as
    UserProfileRecord;
}

export async function signOutCurrentUser(): Promise<void> {
  const {
    error,
  } =
    await supabase.auth.signOut();

  if (
    error
  ) {
    throw error;
  }
}