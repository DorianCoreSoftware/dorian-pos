import {
  supabase,
} from '../services/supabase';

import {
  UserRole,
} from '../types/auth';

export interface AdminUserRecord {
  id: string;
  email: string;
  username: string | null;
  firstName: string | null;
  lastName: string | null;
  role: UserRole;
  isActive: boolean;
}

interface AdminUsersResponse {
  users?: AdminUserRecord[];
  success?: boolean;
  userId?: string;
  error?: string;
}

async function invokeAdminUsers(
  body:
    Record<string, unknown>,
): Promise<AdminUsersResponse> {
  const {
    data: {
      session,
    },
    error:
      sessionError,
  } =
    await supabase.auth.getSession();

  if (
    sessionError ||
    !session
  ) {
    throw new Error(
      'No hay una sesión activa.',
    );
  }

  const {
    data,
    error,
  } =
    await supabase.functions.invoke(
      'admin-users',
      {
        body,
        headers: {
          Authorization:
            `Bearer ${session.access_token}`,
        },
      },
    );

  if (error) {
    throw new Error(
      error.message,
    );
  }

  const response =
    data as AdminUsersResponse;

  if (
    response.error
  ) {
    throw new Error(
      response.error,
    );
  }

  return response;
}

export async function fetchAdminUsers(): Promise<
  AdminUserRecord[]
> {
  const response =
    await invokeAdminUsers({
      action:
        'list',
    });

  return (
    response.users ??
    []
  );
}

export interface CreateAdminUserData {
  email: string;
  username: string;
  password: string;
  firstName: string;
  lastName: string;
  role: UserRole;
}

export async function createAdminUser(
  input:
    CreateAdminUserData,
): Promise<string> {
  const response =
    await invokeAdminUsers({
      action:
        'create',

      email:
        input.email,

      username:
        input.username,

      password:
        input.password,

      firstName:
        input.firstName,

      lastName:
        input.lastName,

      role:
        input.role,
    });

  if (
    !response.userId
  ) {
    throw new Error(
      'La función no devolvió el ID del usuario creado.',
    );
  }

  return response.userId;
}

export interface UpdateAdminUserData {
  userId: string;
  email: string;
  username: string;
  firstName: string;
  lastName: string;
  role: UserRole;
}

export async function updateAdminUser(
  input:
    UpdateAdminUserData,
): Promise<void> {
  await invokeAdminUsers({
    action:
      'update',

    userId:
      input.userId,

    email:
      input.email,

    username:
      input.username,

    firstName:
      input.firstName,

    lastName:
      input.lastName,

    role:
      input.role,
  });
}

export async function setAdminUserActive(
  userId: string,
  isActive: boolean,
): Promise<void> {
  await invokeAdminUsers({
    action:
      'set_active',

    userId,

    isActive,
  });
}