import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';

import {
  createClient,
} from 'https://esm.sh/@supabase/supabase-js@2';

type UserRole =
  | 'admin'
  | 'accountant'
  | 'seller'
  | 'driver';

interface AdminUserProfile {
  id: string;
  email: string;
  username: string | null;
  firstName: string | null;
  lastName: string | null;
  role: UserRole;
  isActive: boolean;
}

interface CreateUserPayload {
  action: 'create';
  email: string;
  username: string;
  password: string;
  firstName: string;
  lastName: string;
  role: UserRole;
}

interface UpdateUserPayload {
  action: 'update';
  userId: string;
  email: string;
  username: string;
  firstName: string;
  lastName: string;
  role: UserRole;
}

interface SetActivePayload {
  action: 'set_active';
  userId: string;
  isActive: boolean;
}

interface ListUsersPayload {
  action: 'list';
}

type RequestPayload =
  | CreateUserPayload
  | UpdateUserPayload
  | SetActivePayload
  | ListUsersPayload;

const ALLOWED_ROLES:
  UserRole[] = [
    'admin',
    'accountant',
    'seller',
    'driver',
  ];

const USERNAME_REGEX =
  /^[A-Za-z0-9._-]{3,40}$/;

serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response(
      'ok',
      {
        headers:
          getCorsHeaders(),
      },
    );
  }

  if (request.method !== 'POST') {
    return jsonResponse(
      {
        error:
          'Método no permitido.',
      },
      405,
    );
  }

  try {
    const supabaseUrl =
      Deno.env.get(
        'SUPABASE_URL',
      );

    const anonKey =
      Deno.env.get(
        'SUPABASE_ANON_KEY',
      );

    const serviceRoleKey =
      Deno.env.get(
        'SUPABASE_SERVICE_ROLE_KEY',
      );

    if (
      !supabaseUrl ||
      !anonKey ||
      !serviceRoleKey
    ) {
      throw new Error(
        'Faltan variables de entorno de Supabase.',
      );
    }

    const authorization =
      request.headers.get(
        'Authorization',
      );

    if (!authorization) {
      return jsonResponse(
        {
          error:
            'Sesión requerida.',
        },
        401,
      );
    }

    const userClient =
      createClient(
        supabaseUrl,
        anonKey,
        {
          global: {
            headers: {
              Authorization:
                authorization,
            },
          },
        },
      );

    const adminClient =
      createClient(
        supabaseUrl,
        serviceRoleKey,
        {
          auth: {
            autoRefreshToken:
              false,
            persistSession:
              false,
          },
        },
      );

    const {
      data: {
        user:
          authenticatedUser,
      },
      error:
        authError,
    } =
      await userClient.auth.getUser();

    if (
      authError ||
      !authenticatedUser
    ) {
      return jsonResponse(
        {
          error:
            'Sesión inválida.',
        },
        401,
      );
    }

    const {
      data:
        requesterProfile,
      error:
        requesterProfileError,
    } =
      await adminClient
        .from('profiles')
        .select(`
          role,
          is_active
        `)
        .eq(
          'id',
          authenticatedUser.id,
        )
        .single();

    if (
      requesterProfileError ||
      !requesterProfile
    ) {
      return jsonResponse(
        {
          error:
            'No se encontró el perfil del usuario.',
        },
        403,
      );
    }

    if (
      requesterProfile.role !==
      'admin'
    ) {
      return jsonResponse(
        {
          error:
            'No tienes permisos para administrar usuarios.',
        },
        403,
      );
    }

    if (
      requesterProfile.is_active ===
      false
    ) {
      return jsonResponse(
        {
          error:
            'Tu usuario está inactivo.',
        },
        403,
      );
    }

    const payload =
      await request.json() as
        RequestPayload;

    switch (
      payload.action
    ) {
      case 'list':
        return await handleList(
          adminClient,
        );

      case 'create':
        return await handleCreate(
          adminClient,
          payload,
        );

      case 'update':
        return await handleUpdate(
          adminClient,
          payload,
          authenticatedUser.id,
        );

      case 'set_active':
        return await handleSetActive(
          adminClient,
          payload,
          authenticatedUser.id,
        );

      default:
        return jsonResponse(
          {
            error:
              'Acción no soportada.',
          },
          400,
        );
    }
  } catch (error) {
    console.error(
      'admin-users error:',
      error,
    );

    return jsonResponse(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Ocurrió un error inesperado.',
      },
      500,
    );
  }
});

async function handleList(
  adminClient:
    ReturnType<
      typeof createClient
    >,
): Promise<Response> {
  const {
    data:
      authUsersData,
    error:
      authUsersError,
  } =
    await adminClient.auth.admin.listUsers(
      {
        page: 1,
        perPage:
          1000,
      },
    );

  if (authUsersError) {
    throw authUsersError;
  }

  const {
    data:
      profiles,
    error:
      profilesError,
  } =
    await adminClient
      .from('profiles')
      .select(`
        id,
        username,
        first_name,
        last_name,
        role,
        is_active
      `);

  if (profilesError) {
    throw profilesError;
  }

  const authUsersById =
    new Map(
      authUsersData.users.map(
        user => [
          user.id,
          user,
        ],
      ),
    );

  const users:
    AdminUserProfile[] =
    (
      profiles ??
      []
    ).map(
      profile => {
        const authUser =
          authUsersById.get(
            profile.id,
          );

        return {
          id:
            profile.id,

          email:
            authUser
              ?.email ??
            '',

          username:
            profile.username,

          firstName:
            profile.first_name,

          lastName:
            profile.last_name,

          role:
            profile.role,

          isActive:
            profile.is_active !==
            false,
        };
      },
    );

  users.sort(
    (
      first,
      second,
    ) => {
      const firstName =
        `${first.firstName ?? ''} ${first.lastName ?? ''}`
          .trim();

      const secondName =
        `${second.firstName ?? ''} ${second.lastName ?? ''}`
          .trim();

      return firstName.localeCompare(
        secondName,
        'es',
        {
          sensitivity:
            'base',
        },
      );
    },
  );

  return jsonResponse({
    users,
  });
}

async function handleCreate(
  adminClient:
    ReturnType<
      typeof createClient
    >,
  payload:
    CreateUserPayload,
): Promise<Response> {
  const email =
    normalizeEmail(
      payload.email,
    );

  const username =
    normalizeUsername(
      payload.username,
    );

  const firstName =
    payload.firstName
      ?.trim();

  const lastName =
    payload.lastName
      ?.trim();

  validateRole(
    payload.role,
  );

  validateUsername(
    username,
  );

  validatePassword(
    payload.password,
  );

  if (!email) {
    return jsonResponse(
      {
        error:
          'El correo es obligatorio.',
      },
      400,
    );
  }

  if (!firstName) {
    return jsonResponse(
      {
        error:
          'El nombre es obligatorio.',
      },
      400,
    );
  }

  const {
    data:
      usernameOwner,
    error:
      usernameError,
  } =
    await adminClient
      .from('profiles')
      .select('id')
      .ilike(
        'username',
        username,
      )
      .maybeSingle();

  if (usernameError) {
    throw usernameError;
  }

  if (usernameOwner) {
    return jsonResponse(
      {
        error:
          'Ese username ya está en uso.',
      },
      409,
    );
  }

  const {
    data:
      createdAuthData,
    error:
      createAuthError,
  } =
    await adminClient.auth.admin.createUser({
      email,
      password:
        payload.password,

      email_confirm:
        true,
    });

  if (
    createAuthError ||
    !createdAuthData.user
  ) {
    return jsonResponse(
      {
        error:
          createAuthError
            ?.message ??
          'No se pudo crear el usuario.',
      },
      400,
    );
  }

  const userId =
    createdAuthData.user.id;

  const {
    error:
      profileError,
  } =
    await adminClient
      .from('profiles')
      .upsert(
        {
          id:
            userId,

          username,

          first_name:
            firstName,

          last_name:
            lastName ||
            null,

          role:
            payload.role,

          is_active:
            true,

          updated_at:
            new Date()
              .toISOString(),
        },
        {
          onConflict:
            'id',
        },
      );

  if (profileError) {
    await adminClient
      .auth
      .admin
      .deleteUser(
        userId,
      );

    throw profileError;
  }

  return jsonResponse(
    {
      success:
        true,

      userId,
    },
    201,
  );
}

async function handleUpdate(
  adminClient:
    ReturnType<
      typeof createClient
    >,
  payload:
    UpdateUserPayload,
  requesterUserId:
    string,
): Promise<Response> {
  const userId =
    payload.userId
      ?.trim();

  const email =
    normalizeEmail(
      payload.email,
    );

  const username =
    normalizeUsername(
      payload.username,
    );

  const firstName =
    payload.firstName
      ?.trim();

  const lastName =
    payload.lastName
      ?.trim();

  if (!userId) {
    return jsonResponse(
      {
        error:
          'El usuario es obligatorio.',
      },
      400,
    );
  }

  if (!email) {
    return jsonResponse(
      {
        error:
          'El correo es obligatorio.',
      },
      400,
    );
  }

  if (!firstName) {
    return jsonResponse(
      {
        error:
          'El nombre es obligatorio.',
      },
      400,
    );
  }

  validateRole(
    payload.role,
  );

  validateUsername(
    username,
  );

  const {
    data:
      currentProfile,
    error:
      currentProfileError,
  } =
    await adminClient
      .from('profiles')
      .select(`
        id,
        role
      `)
      .eq(
        'id',
        userId,
      )
      .single();

  if (
    currentProfileError ||
    !currentProfile
  ) {
    return jsonResponse(
      {
        error:
          'No se encontró el perfil del usuario.',
      },
      404,
    );
  }

  if (
    userId ===
      requesterUserId &&
    payload.role !==
      currentProfile.role
  ) {
    return jsonResponse(
      {
        error:
          'No puedes cambiar el rol de tu propio usuario.',
      },
      400,
    );
  }

  const {
    data:
      usernameOwner,
    error:
      usernameError,
  } =
    await adminClient
      .from('profiles')
      .select('id')
      .ilike(
        'username',
        username,
      )
      .neq(
        'id',
        userId,
      )
      .maybeSingle();

  if (usernameError) {
    throw usernameError;
  }

  if (usernameOwner) {
    return jsonResponse(
      {
        error:
          'Ese username ya está en uso.',
      },
      409,
    );
  }

  const {
    error:
      authUpdateError,
  } =
    await adminClient.auth.admin.updateUserById(
      userId,
      {
        email,
      },
    );

  if (authUpdateError) {
    return jsonResponse(
      {
        error:
          authUpdateError.message,
      },
      400,
    );
  }

  const {
    error:
      profileUpdateError,
  } =
    await adminClient
      .from('profiles')
      .update({
        username,

        first_name:
          firstName,

        last_name:
          lastName ||
          null,

        role:
          payload.role,

        updated_at:
          new Date()
            .toISOString(),
      })
      .eq(
        'id',
        userId,
      );

  if (profileUpdateError) {
    throw profileUpdateError;
  }

  return jsonResponse({
    success:
      true,
  });
}

async function handleSetActive(
  adminClient:
    ReturnType<
      typeof createClient
    >,
  payload:
    SetActivePayload,
  requesterUserId:
    string,
): Promise<Response> {
  const userId =
    payload.userId
      ?.trim();

  if (!userId) {
    return jsonResponse(
      {
        error:
          'El usuario es obligatorio.',
      },
      400,
    );
  }

  if (
    userId ===
      requesterUserId &&
    payload.isActive ===
      false
  ) {
    return jsonResponse(
      {
        error:
          'No puedes desactivar tu propio usuario.',
      },
      400,
    );
  }

  const {
    error:
      profileError,
  } =
    await adminClient
      .from('profiles')
      .update({
        is_active:
          payload.isActive,

        updated_at:
          new Date()
            .toISOString(),
      })
      .eq(
        'id',
        userId,
      );

  if (profileError) {
    throw profileError;
  }

  const {
    error:
      authError,
  } =
    await adminClient.auth.admin.updateUserById(
      userId,
      {
        ban_duration:
          payload.isActive
            ? 'none'
            : '876000h',
      },
    );

  if (authError) {
    throw authError;
  }

  return jsonResponse({
    success:
      true,
  });
}

function validateRole(
  role:
    UserRole,
): void {
  if (
    !ALLOWED_ROLES.includes(
      role,
    )
  ) {
    throw new Error(
      'El rol seleccionado no es válido.',
    );
  }
}

function validateUsername(
  username:
    string,
): void {
  if (
    !USERNAME_REGEX.test(
      username,
    )
  ) {
    throw new Error(
      'El username debe tener entre 3 y 40 caracteres y solo puede contener letras, números, punto, guion y guion bajo.',
    );
  }
}

function validatePassword(
  password:
    string,
): void {
  if (
    !password ||
    password.length <
      8
  ) {
    throw new Error(
      'La contraseña debe tener al menos 8 caracteres.',
    );
  }
}

function normalizeEmail(
  value:
    string,
): string {
  return (
    value ??
    ''
  )
    .trim()
    .toLowerCase();
}

function normalizeUsername(
  value:
    string,
): string {
  return (
    value ??
    ''
  )
    .trim()
    .toLowerCase();
}

function getCorsHeaders() {
  return {
    'Access-Control-Allow-Origin':
      '*',

    'Access-Control-Allow-Headers':
      'authorization, x-client-info, apikey, content-type',

    'Access-Control-Allow-Methods':
      'POST, OPTIONS',

    'Content-Type':
      'application/json',
  };
}

function jsonResponse(
  body:
    unknown,
  status =
    200,
): Response {
  return new Response(
    JSON.stringify(
      body,
    ),
    {
      status,
      headers:
        getCorsHeaders(),
    },
  );
}
