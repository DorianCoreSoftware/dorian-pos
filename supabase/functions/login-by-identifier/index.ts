import {
  serve,
} from 'https://deno.land/std@0.224.0/http/server.ts';

import {
  createClient,
} from 'https://esm.sh/@supabase/supabase-js@2';

interface LoginPayload {
  identifier?: string;
  password?: string;
}

serve(async request => {
  if (
    request.method ===
    'OPTIONS'
  ) {
    return new Response(
      'ok',
      {
        headers:
          getCorsHeaders(),
      },
    );
  }

  if (
    request.method !==
    'POST'
  ) {
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

    const payload =
      await request.json() as
        LoginPayload;

    const identifier =
      (
        payload.identifier ??
        ''
      )
        .trim()
        .toLowerCase();

    const password =
      payload.password ??
      '';

    if (
      !identifier ||
      !password
    ) {
      return invalidCredentials();
    }

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

    let email =
      '';

    if (
      identifier.includes(
        '@',
      )
    ) {
      email =
        identifier;
    } else {
      const {
        data:
          profile,
        error:
          profileError,
      } =
        await adminClient
          .from(
            'profiles',
          )
          .select(`
            id,
            is_active
          `)
          .ilike(
            'username',
            identifier,
          )
          .maybeSingle();

      if (
        profileError ||
        !profile ||
        profile.is_active ===
          false
      ) {
        return invalidCredentials();
      }

      const {
        data:
          authUserData,
        error:
          authUserError,
      } =
        await adminClient
          .auth
          .admin
          .getUserById(
            profile.id,
          );

      if (
        authUserError ||
        !authUserData.user?.email
      ) {
        return invalidCredentials();
      }

      email =
        authUserData.user.email
          .trim()
          .toLowerCase();
    }

    /**
     * También verificamos is_active cuando el
     * usuario entra directamente con correo.
     */
    if (
      identifier.includes(
        '@',
      )
    ) {
      const userId =
        await findUserIdByEmail(
          adminClient,
          email,
        );

      if (
        !userId
      ) {
        return invalidCredentials();
      }

      const {
        data:
          profile,
        error:
          profileError,
      } =
        await adminClient
          .from(
            'profiles',
          )
          .select(`
            is_active
          `)
          .eq(
            'id',
            userId,
          )
          .maybeSingle();

      if (
        profileError ||
        !profile ||
        profile.is_active ===
          false
      ) {
        return invalidCredentials();
      }
    }

    const authClient =
      createClient(
        supabaseUrl,
        anonKey,
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
      data:
        signInData,
      error:
        signInError,
    } =
      await authClient
        .auth
        .signInWithPassword({
          email,
          password,
        });

    if (
      signInError ||
      !signInData.session
    ) {
      return invalidCredentials();
    }

    return jsonResponse({
      accessToken:
        signInData
          .session
          .access_token,

      refreshToken:
        signInData
          .session
          .refresh_token,
    });
  } catch (error) {
    console.error(
      'login-by-identifier error:',
      error,
    );

    /**
     * El login devuelve un error genérico para
     * no revelar si existe un correo o username.
     */
    return invalidCredentials();
  }
});

async function findUserIdByEmail(
  adminClient:
    ReturnType<
      typeof createClient
    >,

  email:
    string,
): Promise<string | null> {
  let page =
    1;

  const perPage =
    1000;

  while (
    page <=
    10
  ) {
    const {
      data,
      error,
    } =
      await adminClient
        .auth
        .admin
        .listUsers({
          page,
          perPage,
        });

    if (
      error
    ) {
      throw error;
    }

    const found =
      data.users.find(
        user =>
          user.email
            ?.trim()
            .toLowerCase() ===
          email,
      );

    if (
      found
    ) {
      return found.id;
    }

    if (
      data.users.length <
      perPage
    ) {
      break;
    }

    page += 1;
  }

  return null;
}

function invalidCredentials(): Response {
  return jsonResponse(
    {
      error:
        'Credenciales incorrectas.',
    },
    401,
  );
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