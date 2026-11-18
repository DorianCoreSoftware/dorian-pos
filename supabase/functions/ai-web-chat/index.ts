import {
  createClient,
} from 'npm:@supabase/supabase-js@2';

const SUPABASE_URL =
  Deno.env.get(
    'SUPABASE_URL',
  ) ??
  '';

const SUPABASE_SERVICE_ROLE_KEY =
  Deno.env.get(
    'SUPABASE_SERVICE_ROLE_KEY',
  ) ??
  '';

const DORIAN_CHANNEL_SECRET =
  Deno.env.get(
    'DORIAN_CHANNEL_SECRET',
  ) ??
  '';

const WEB_ALLOWED_ORIGINS =
  (
    Deno.env.get(
      'WEB_ALLOWED_ORIGINS',
    ) ??
    '*'
  )
    .split(',')
    .map(
      value =>
        value.trim(),
    )
    .filter(
      Boolean,
    );

if (
  !SUPABASE_URL ||
  !SUPABASE_SERVICE_ROLE_KEY
) {
  throw new Error(
    'Missing Supabase environment variables.',
  );
}

const admin =
  createClient(
    SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: {
        persistSession:
          false,
        autoRefreshToken:
          false,
      },
    },
  );

interface RequestBody {
  externalConversationId?: string;
  conversationId?: string;
  message?: string;
  customerSessionToken?: string;
  customerName?: string;
  customerPhone?: string;
}

interface WebCustomerIdentity {
  name: string | null;
  phone: string | null;
  avatarUrl: string | null;
}

function allowedOrigin(
  request:
    Request,
): string {
  const origin =
    request.headers.get(
      'Origin',
    ) ??
    '';

  if (
    WEB_ALLOWED_ORIGINS
      .includes(
        '*',
      )
  ) {
    return '*';
  }

  return WEB_ALLOWED_ORIGINS
    .includes(
      origin,
    )
    ? origin
    : (
        WEB_ALLOWED_ORIGINS[0] ??
        ''
      );
}

function headers(
  request:
    Request,
): Record<
  string,
  string
> {
  return {
    'Access-Control-Allow-Origin':
      allowedOrigin(
        request,
      ),
    'Access-Control-Allow-Headers':
      'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods':
      'POST, OPTIONS',
    'Content-Type':
      'application/json',
    'Vary':
      'Origin',
  };
}

function json(
  request:
    Request,
  data:
    unknown,
  status =
    200,
): Response {
  return new Response(
    JSON.stringify(
      data,
    ),
    {
      status,
      headers:
        headers(
          request,
        ),
    },
  );
}



function findStringByKeys(
  value:
    unknown,
  keys:
    RegExp,
  depth =
    0,
): string | null {
  if (
    depth >
      5 ||
    value == null
  ) {
    return null;
  }

  if (
    Array.isArray(
      value,
    )
  ) {
    for (
      const item of
        value
    ) {
      const found =
        findStringByKeys(
          item,
          keys,
          depth +
            1,
        );

      if (found) {
        return found;
      }
    }

    return null;
  }

  if (
    typeof value !==
      'object'
  ) {
    return null;
  }

  const record =
    value as
      Record<
        string,
        unknown
      >;

  for (
    const [
      key,
      item,
    ] of
      Object.entries(
        record,
      )
  ) {
    if (
      keys.test(
        key,
      ) &&
      typeof item ===
        'string' &&
      item.trim()
    ) {
      return item.trim();
    }
  }

  for (
    const item of
      Object.values(
        record,
      )
  ) {
    if (
      item &&
      typeof item ===
        'object'
    ) {
      const found =
        findStringByKeys(
          item,
          keys,
          depth +
            1,
        );

      if (found) {
        return found;
      }
    }
  }

  return null;
}

function firstNonEmptyString(
  ...values:
    unknown[]
): string | null {
  for (
    const value of
      values
  ) {
    if (
      typeof value ===
        'string' &&
      value.trim()
    ) {
      return value.trim();
    }
  }

  return null;
}

function findImageUrl(
  value:
    unknown,
  depth =
    0,
): string | null {
  if (
    depth >
      4 ||
    value == null
  ) {
    return null;
  }

  if (
    typeof value ===
      'string'
  ) {
    const text =
      value.trim();

    if (
      /^https?:\/\//i
        .test(
          text,
        )
    ) {
      return text;
    }

    return null;
  }

  if (
    Array.isArray(
      value,
    )
  ) {
    for (
      const item of
        value
    ) {
      const found =
        findImageUrl(
          item,
          depth +
            1,
        );

      if (found) {
        return found;
      }
    }

    return null;
  }

  if (
    typeof value ===
      'object'
  ) {
    const record =
      value as
        Record<
          string,
          unknown
        >;

    const preferredKeys =
      Object.keys(
        record,
      )
        .filter(
          key =>
            /avatar|photo|image|picture/i
              .test(
                key,
              ),
        );

    for (
      const key of
        preferredKeys
    ) {
      const found =
        findImageUrl(
          record[key],
          depth +
            1,
        );

      if (found) {
        return found;
      }
    }

    for (
      const nested of
        Object.values(
          record,
        )
    ) {
      if (
        nested &&
        typeof nested ===
          'object'
      ) {
        const found =
          findImageUrl(
            nested,
            depth +
              1,
          );

        if (found) {
          return found;
        }
      }
    }
  }

  return null;
}

function normalizeCustomerIdentity(
  raw:
    unknown,
): WebCustomerIdentity | null {
  if (
    !raw
  ) {
    return null;
  }

  const name =
    findStringByKeys(
      raw,
      /^(name|customerName|customer_name|fullName|full_name|displayName|display_name)$/i,
    );

  const phone =
    findStringByKeys(
      raw,
      /^(phone|customerPhone|customer_phone|phoneNumber|phone_number|mobile)$/i,
    );

  const avatarUrl =
    findStringByKeys(
      raw,
      /avatar|photo|image|picture/i,
    ) ??
    findImageUrl(
      raw,
    );

  if (
    !name &&
    !phone &&
    !avatarUrl
  ) {
    return null;
  }

  return {
    name,
    phone,
    avatarUrl,
  };
}

async function resolveWebCustomer(
  sessionToken:
    string | null | undefined,
): Promise<WebCustomerIdentity | null> {
  const token =
    sessionToken
      ?.trim();

  if (!token) {
    return null;
  }

  const {
    data,
    error,
  } =
    await admin.rpc(
      'resolve_ai_web_customer_identity',
      {
        p_session_token:
          token,
      },
    );

  if (error) {
    console.error(
      'resolve_ai_web_customer_identity:',
      error,
    );

    return null;
  }

  const value =
    Array.isArray(
      data,
    )
      ? data[0]
      : data;

  if (
    !value ||
    typeof value !==
      'object'
  ) {
    return null;
  }

  const row =
    value as
      Record<
        string,
        unknown
      >;

  const name =
    typeof row.name ===
      'string'
      ? row.name.trim()
      : null;

  const phone =
    typeof row.phone ===
      'string'
      ? row.phone.trim()
      : null;

  const avatarUrl =
    typeof row.avatarUrl ===
      'string'
      ? row.avatarUrl.trim()
      : typeof row.avatar_url ===
          'string'
        ? row.avatar_url.trim()
        : null;

  if (
    !name &&
    !phone &&
    !avatarUrl
  ) {
    return null;
  }

  return {
    name:
      name ||
      null,
    phone:
      phone ||
      null,
    avatarUrl:
      avatarUrl ||
      null,
  };
}

function isUuid(
  value:
    string,
): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    .test(
      value,
    );
}

async function sha256(
  value:
    string,
): Promise<string> {
  const digest =
    await crypto.subtle
      .digest(
        'SHA-256',
        new TextEncoder()
          .encode(
            value,
          ),
      );

  return Array.from(
    new Uint8Array(
      digest,
    ),
  )
    .map(
      byte =>
        byte
          .toString(
            16,
          )
          .padStart(
            2,
            '0',
          ),
    )
    .join(
      '',
    );
}

async function checkRateLimit(
  request:
    Request,
  visitorId:
    string,
): Promise<boolean> {
  const forwarded =
    request.headers.get(
      'x-forwarded-for',
    )
      ?.split(',')[0]
      ?.trim() ??
    '';

  const key =
    await sha256(
      `${visitorId}|${forwarded}`,
    );

  const {
    data,
    error,
  } =
    await admin.rpc(
      'check_ai_web_rate_limit',
      {
        p_key:
          key,
        p_limit:
          20,
        p_window_seconds:
          60,
      },
    );

  if (error) {
    console.error(
      'check_ai_web_rate_limit:',
      error,
    );

    /*
     * Fail closed: si el limitador no estÃ¡ disponible,
     * no dejamos un endpoint de IA sin protecciÃ³n.
     */
    return false;
  }

  return data ===
    true;
}

Deno.serve(
  async (
    request:
      Request,
  ) => {
    if (
      request.method ===
      'OPTIONS'
    ) {
      return new Response(
        'ok',
        {
          headers:
            headers(
              request,
            ),
        },
      );
    }

    if (
      request.method !==
      'POST'
    ) {
      return json(
        request,
        {
          error:
            'Method not allowed',
        },
        405,
      );
    }

    try {
      if (
        !DORIAN_CHANNEL_SECRET
      ) {
        return json(
          request,
          {
            error:
              'Canal web no configurado.',
          },
          503,
        );
      }

      const body =
        await request.json() as
          RequestBody;

      const externalConversationId =
        body
          .externalConversationId
          ?.trim() ??
        '';

      const message =
        body.message
          ?.trim() ??
        '';

      const conversationId =
        body
          .conversationId
          ?.trim() ||
        undefined;

      if (
        !isUuid(
          externalConversationId,
        )
      ) {
        return json(
          request,
          {
            error:
              'Identificador de visitante invÃ¡lido.',
          },
          400,
        );
      }

      if (
        !message ||
        message.length >
          3000
      ) {
        return json(
          request,
          {
            error:
              'Mensaje requerido (mÃ¡ximo 3000 caracteres).',
          },
          400,
        );
      }

      if (
        conversationId &&
        !isUuid(
          conversationId,
        )
      ) {
        return json(
          request,
          {
            error:
              'conversationId invÃ¡lido.',
          },
          400,
        );
      }

      const requestedCustomerName =
        firstNonEmptyString(
          body.customerName,
        );

      const requestedCustomerPhone =
        firstNonEmptyString(
          body.customerPhone,
        );

      const resolvedCustomer =
        await resolveWebCustomer(
          body.customerSessionToken,
        );

      const customer:
        WebCustomerIdentity | null =
        requestedCustomerName ||
        requestedCustomerPhone ||
        resolvedCustomer
          ? {
              name:
                requestedCustomerName ??
                resolvedCustomer
                  ?.name ??
                null,
              phone:
                requestedCustomerPhone ??
                resolvedCustomer
                  ?.phone ??
                null,
              avatarUrl:
                resolvedCustomer
                  ?.avatarUrl ??
                null,
            }
          : null;

      const permitted =
        await checkRateLimit(
          request,
          externalConversationId,
        );

      if (!permitted) {
        return json(
          request,
          {
            error:
              'Demasiados mensajes. Espera un momento antes de continuar.',
          },
          429,
        );
      }

      const response =
        await fetch(
          `${SUPABASE_URL}/functions/v1/ai-order-agent`,
          {
            method:
              'POST',
            headers: {
              'Content-Type':
                'application/json',
              'Authorization':
                `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
              'apikey':
                SUPABASE_SERVICE_ROLE_KEY,
              'x-dorian-channel-secret':
                DORIAN_CHANNEL_SECRET,
            },
            body:
              JSON.stringify({
                channel:
                  'web',
                externalConversationId,
                message,
                customerName:
                  customer
                    ?.name ??
                  undefined,
                customerPhone:
                  customer
                    ?.phone ??
                  undefined,
              }),
          },
        );

      const text =
        await response.text();

      let payload:
        unknown;

      try {
        payload =
          text
            ? JSON.parse(
                text,
              )
            : {};
      } catch {
        payload = {
          error:
            'Respuesta invÃ¡lida del agente.',
        };
      }

      if (
        payload &&
        typeof payload ===
          'object' &&
        !Array.isArray(
          payload,
        )
      ) {
        payload = {
          ...(
            payload as
              Record<
                string,
                unknown
              >
          ),
          customer,
          customerResolved:
            Boolean(
              customer,
            ),
        };
      }

      return json(
        request,
        payload,
        response.status,
      );
    } catch (error) {
      console.error(
        'ai-web-chat:',
        error,
      );

      return json(
        request,
        {
          error:
            error instanceof
              Error
              ? error.message
              : 'Error interno.',
        },
        500,
      );
    }
  },
);