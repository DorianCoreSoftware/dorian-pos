import {
  serve,
} from 'https://deno.land/std@0.224.0/http/server.ts';

import {
  createClient,
} from 'https://esm.sh/@supabase/supabase-js@2';

interface RequestBody {
  action?:
    | 'upload'
    | 'remove';
  sessionToken?: string;
  imageBase64?: string;
  mimeType?: string;
}

const BUCKET =
  'web-customer-avatars';

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin':
      '*',
    'Access-Control-Allow-Headers':
      'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods':
      'POST, OPTIONS',
  };
}

function json(
  body: unknown,
  status = 200,
): Response {
  return new Response(
    JSON.stringify(
      body,
    ),
    {
      status,
      headers: {
        ...corsHeaders(),
        'Content-Type':
          'application/json',
      },
    },
  );
}

function decodeBase64(
  value: string,
): Uint8Array {
  const binary =
    atob(value);

  const bytes =
    new Uint8Array(
      binary.length,
    );

  for (
    let index = 0;
    index <
    binary.length;
    index += 1
  ) {
    bytes[index] =
      binary.charCodeAt(
        index,
      );
  }

  return bytes;
}

function extensionForMime(
  mimeType: string,
): string {
  switch (
    mimeType
  ) {
    case 'image/png':
      return 'png';

    case 'image/webp':
      return 'webp';

    case 'image/jpeg':
    default:
      return 'jpg';
  }
}

serve(
  async (
    request,
  ) => {
    if (
      request.method ===
      'OPTIONS'
    ) {
      return new Response(
        'ok',
        {
          headers:
            corsHeaders(),
        },
      );
    }

    if (
      request.method !==
      'POST'
    ) {
      return json(
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

      const serviceRoleKey =
        Deno.env.get(
          'SUPABASE_SERVICE_ROLE_KEY',
        );

      if (
        !supabaseUrl ||
        !serviceRoleKey
      ) {
        throw new Error(
          'Falta configuración de Supabase en la función.',
        );
      }

      const adminClient =
        createClient(
          supabaseUrl,
          serviceRoleKey,
          {
            auth: {
              persistSession:
                false,
              autoRefreshToken:
                false,
            },
          },
        );

      const body =
        await request
          .json() as
          RequestBody;

      const sessionToken =
        body.sessionToken
          ?.trim();

      if (
        !sessionToken
      ) {
        return json(
          {
            error:
              'Sesión requerida.',
          },
          401,
        );
      }

      const {
        data:
          customerId,
        error:
          sessionError,
      } =
        await adminClient
          .rpc(
            'resolve_web_customer_session',
            {
              p_session_token:
                sessionToken,
            },
          );

      if (
        sessionError ||
        typeof customerId !==
          'string'
      ) {
        return json(
          {
            error:
              sessionError
                ?.message ||
              'La sesión no es válida.',
          },
          401,
        );
      }

      const action =
        body.action ??
        'upload';

      const {
        data:
          currentCustomer,
        error:
          currentCustomerError,
      } =
        await adminClient
          .from(
            'web_customers',
          )
          .select(
            'avatar_url',
          )
          .eq(
            'id',
            customerId,
          )
          .single();

      if (
        currentCustomerError
      ) {
        throw currentCustomerError;
      }

      if (
        action ===
        'remove'
      ) {
        const {
          data:
            objects,
        } =
          await adminClient
            .storage
            .from(
              BUCKET,
            )
            .list(
              customerId,
            );

        if (
          objects &&
          objects.length >
            0
        ) {
          await adminClient
            .storage
            .from(
              BUCKET,
            )
            .remove(
              objects.map(
                object =>
                  `${customerId}/${object.name}`,
              ),
            );
        }

        const {
          error:
            updateError,
        } =
          await adminClient
            .from(
              'web_customers',
            )
            .update({
              avatar_url:
                null,
              updated_at:
                new Date()
                  .toISOString(),
            })
            .eq(
              'id',
              customerId,
            );

        if (
          updateError
        ) {
          throw updateError;
        }

        return json({
          success:
            true,
          avatarUrl:
            null,
        });
      }

      const mimeType =
        body.mimeType
          ?.trim()
          .toLowerCase();

      if (
        mimeType !==
          'image/jpeg' &&
        mimeType !==
          'image/png' &&
        mimeType !==
          'image/webp'
      ) {
        return json(
          {
            error:
              'La foto debe ser JPG, PNG o WEBP.',
          },
          400,
        );
      }

      const imageBase64 =
        body.imageBase64
          ?.trim();

      if (
        !imageBase64
      ) {
        return json(
          {
            error:
              'No se recibió la imagen.',
          },
          400,
        );
      }

      const bytes =
        decodeBase64(
          imageBase64,
        );

      if (
        bytes.byteLength >
        4 * 1024 *
        1024
      ) {
        return json(
          {
            error:
              'La foto excede el límite de 4 MB.',
          },
          400,
        );
      }

      const extension =
        extensionForMime(
          mimeType,
        );

      const fileName =
        `${Date.now()}.${extension}`;

      const storagePath =
        `${customerId}/${fileName}`;

      const {
        error:
          uploadError,
      } =
        await adminClient
          .storage
          .from(
            BUCKET,
          )
          .upload(
            storagePath,
            bytes,
            {
              contentType:
                mimeType,
              cacheControl:
                '31536000',
              upsert:
                false,
            },
          );

      if (
        uploadError
      ) {
        throw uploadError;
      }

      const {
        data:
          publicUrlData,
      } =
        adminClient
          .storage
          .from(
            BUCKET,
          )
          .getPublicUrl(
            storagePath,
          );

      const avatarUrl =
        publicUrlData
          .publicUrl;

      const {
        error:
          updateError,
      } =
        await adminClient
          .from(
            'web_customers',
          )
          .update({
            avatar_url:
              avatarUrl,
            updated_at:
              new Date()
                .toISOString(),
          })
          .eq(
            'id',
            customerId,
          );

      if (
        updateError
      ) {
        await adminClient
          .storage
          .from(
            BUCKET,
          )
          .remove([
            storagePath,
          ]);

        throw updateError;
      }

      const {
        data:
          objects,
      } =
        await adminClient
          .storage
          .from(
            BUCKET,
          )
          .list(
            customerId,
          );

      if (
        objects &&
        objects.length >
          1
      ) {
        const stalePaths =
          objects
            .filter(
              object =>
                object.name !==
                fileName,
            )
            .map(
              object =>
                `${customerId}/${object.name}`,
            );

        if (
          stalePaths.length >
          0
        ) {
          await adminClient
            .storage
            .from(
              BUCKET,
            )
            .remove(
              stalePaths,
            );
        }
      }

      return json({
        success:
          true,
        avatarUrl,
      });
    } catch (error) {
      console.error(
        'web-customer-avatar error:',
        error,
      );

      return json(
        {
          error:
            error instanceof
              Error
              ? error.message
              : 'No se pudo procesar la foto de perfil.',
        },
        500,
      );
    }
  },
);
