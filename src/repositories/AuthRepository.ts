import {
  AuthChangeEvent,
  Session,
} from '@supabase/supabase-js';

import { supabase } from '../services/supabase';

export interface UserProfileRecord {
  role: 'admin' | 'seller';
  first_name: string | null;
  last_name: string | null;
}

export interface AuthSubscription {
  unsubscribe: () => void;
}

export async function getCurrentSession(): Promise<
  Session | null
> {
  const {
    data: { session },
    error,
  } = await supabase.auth.getSession();

  if (error) {
    throw error;
  }

  return session;
}

export function subscribeToAuthChanges(
  callback: (
    event: AuthChangeEvent,
    session: Session | null,
  ) => void,
): AuthSubscription {
  const {
    data: { subscription },
  } = supabase.auth.onAuthStateChange(
    callback,
  );

  return {
    unsubscribe: () => {
      subscription.unsubscribe();
    },
  };
}

export async function signInWithPassword(
  email: string,
  password: string,
): Promise<Session> {
  const { data, error } =
    await supabase.auth.signInWithPassword({
      email,
      password,
    });

  if (error) {
    throw error;
  }

  if (!data.session) {
    throw new Error(
      'No se pudo crear la sesión.',
    );
  }

  return data.session;
}

export async function fetchUserProfileById(
  userId: string,
): Promise<UserProfileRecord> {
  const { data, error } = await supabase
    .from('profiles')
    .select(
      `
        role,
        first_name,
        last_name
      `,
    )
    .eq('id', userId)
    .single();

  if (error) {
    throw error;
  }

  return data as UserProfileRecord;
}

export async function signOutCurrentUser(): Promise<void> {
  const { error } =
    await supabase.auth.signOut();

  if (error) {
    throw error;
  }
}