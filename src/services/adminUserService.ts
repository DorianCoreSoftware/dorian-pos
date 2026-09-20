import {
  AdminUserRecord,
  createAdminUser,
  CreateAdminUserData,
  fetchAdminUsers,
  setAdminUserActive,
  updateAdminUser,
  UpdateAdminUserData,
} from '../repositories/AdminUserRepository';

import {
  UserRole,
} from '../types/auth';

export type {
  AdminUserRecord,
};

export interface CreateAdminUserInput {
  email: string;
  username: string;
  password: string;
  firstName: string;
  lastName: string;
  role: UserRole;
}

export interface UpdateAdminUserInput {
  userId: string;
  email: string;
  username: string;
  firstName: string;
  lastName: string;
  role: UserRole;
}

export async function getAdminUsers(): Promise<
  AdminUserRecord[]
> {
  try {
    return await fetchAdminUsers();
  } catch (error) {
    console.error(
      'Error al obtener usuarios administrativos:',
      error,
    );

    throw new Error(
      error instanceof Error
        ? error.message
        : 'No se pudieron obtener los usuarios.',
    );
  }
}

export async function saveNewAdminUser(
  input:
    CreateAdminUserInput,
): Promise<string> {
  const cleanEmail =
    input.email
      .trim()
      .toLowerCase();

  const cleanUsername =
    input.username
      .trim()
      .toLowerCase();

  const cleanFirstName =
    input.firstName
      .trim();

  const cleanLastName =
    input.lastName
      .trim();

  if (!cleanEmail) {
    throw new Error(
      'El correo es obligatorio.',
    );
  }

  if (!cleanUsername) {
    throw new Error(
      'El username es obligatorio.',
    );
  }

  if (!cleanFirstName) {
    throw new Error(
      'El nombre es obligatorio.',
    );
  }

  if (
    !input.password ||
    input.password.length <
      8
  ) {
    throw new Error(
      'La contraseña debe tener al menos 8 caracteres.',
    );
  }

  const data:
    CreateAdminUserData = {
    email:
      cleanEmail,

    username:
      cleanUsername,

    password:
      input.password,

    firstName:
      cleanFirstName,

    lastName:
      cleanLastName,

    role:
      input.role,
  };

  return createAdminUser(
    data,
  );
}

export async function saveAdminUserChanges(
  input:
    UpdateAdminUserInput,
): Promise<void> {
  const cleanEmail =
    input.email
      .trim()
      .toLowerCase();

  const cleanUsername =
    input.username
      .trim()
      .toLowerCase();

  const cleanFirstName =
    input.firstName
      .trim();

  const cleanLastName =
    input.lastName
      .trim();

  if (
    !input.userId
      .trim()
  ) {
    throw new Error(
      'El usuario no es válido.',
    );
  }

  if (!cleanEmail) {
    throw new Error(
      'El correo es obligatorio.',
    );
  }

  if (!cleanUsername) {
    throw new Error(
      'El username es obligatorio.',
    );
  }

  if (!cleanFirstName) {
    throw new Error(
      'El nombre es obligatorio.',
    );
  }

  const data:
    UpdateAdminUserData = {
    userId:
      input.userId,

    email:
      cleanEmail,

    username:
      cleanUsername,

    firstName:
      cleanFirstName,

    lastName:
      cleanLastName,

    role:
      input.role,
  };

  await updateAdminUser(
    data,
  );
}

export async function changeAdminUserActive(
  userId: string,
  isActive: boolean,
): Promise<void> {
  if (
    !userId?.trim()
  ) {
    throw new Error(
      'El usuario no es válido.',
    );
  }

  await setAdminUserActive(
    userId,
    isActive,
  );
}