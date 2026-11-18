import {
  createClient,
} from '@supabase/supabase-js';

const SUPABASE_URL =
  Deno.env.get(
    'SUPABASE_URL',
  ) ?? '';

const SUPABASE_SERVICE_ROLE_KEY =
  Deno.env.get(
    'SUPABASE_SERVICE_ROLE_KEY',
  ) ?? '';

const WHATSAPP_VERIFY_TOKEN =
  Deno.env.get(
    'WHATSAPP_VERIFY_TOKEN',
  ) ?? '';

const WHATSAPP_APP_SECRET =
  Deno.env.get(
    'WHATSAPP_APP_SECRET',
  ) ?? '';

const WHATSAPP_ACCESS_TOKEN =
  Deno.env.get(
    'WHATSAPP_ACCESS_TOKEN',
  ) ?? '';

const WHATSAPP_PHONE_NUMBER_ID =
  Deno.env.get(
    'WHATSAPP_PHONE_NUMBER_ID',
  ) ?? '';

const WHATSAPP_GRAPH_API_VERSION =
  Deno.env.get(
    'WHATSAPP_GRAPH_API_VERSION',
  ) ||
  'v27.0';

const DORIAN_CHANNEL_SECRET =
  Deno.env.get(
    'DORIAN_CHANNEL_SECRET',
  ) ?? '';

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

function response(
  body:
    string |
    Record<
      string,
      unknown
    >,
  status =
    200,
): Response {
  if (
    typeof body ===
    'string'
  ) {
    return new Response(
      body,
      {
        status,
        headers: {
          'Content-Type':
            'text/plain; charset=utf-8',
        },
      },
    );
  }

  return new Response(
    JSON.stringify(
      body,
    ),
    {
      status,
      headers: {
        'Content-Type':
          'application/json',
      },
    },
  );
}

function bytesToHex(
  bytes: ArrayBuffer,
): string {
  return Array.from(
    new Uint8Array(
      bytes,
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

async function verifyMetaSignature(
  rawBody: Uint8Array,
  signatureHeader:
    string | null,
): Promise<boolean> {
  if (
    !WHATSAPP_APP_SECRET ||
    !signatureHeader
      ?.startsWith(
        'sha256=',
      )
  ) {
    return false;
  }

  const expectedHex =
    signatureHeader.slice(
      'sha256='.length,
    );

  const key =
    await crypto.subtle
      .importKey(
        'raw',
        new TextEncoder()
          .encode(
            WHATSAPP_APP_SECRET,
          ),
        {
          name:
            'HMAC',
          hash:
            'SHA-256',
        },
        false,
        [
          'sign',
        ],
      );

  const signature =
    await crypto.subtle
      .sign(
        'HMAC',
        key,
        rawBody,
      );

  const actualHex =
    bytesToHex(
      signature,
    );

  if (
    actualHex.length !==
    expectedHex.length
  ) {
    return false;
  }

  let mismatch =
    0;

  for (
    let index = 0;
    index <
      actualHex.length;
    index += 1
  ) {
    mismatch |=
      actualHex
        .charCodeAt(
          index,
        ) ^
      expectedHex
        .charCodeAt(
          index,
        );
  }

  return mismatch ===
    0;
}

function normalizePhone(
  value: unknown,
): string {
  return String(
    value ??
    '',
  )
    .replace(
      /\D/g,
      '',
    );
}

function getMexicanLocalPhone(
  value: unknown,
): string | null {
  const digits =
    normalizePhone(
      value,
    );

  if (
    digits.length <
    10
  ) {
    return null;
  }

  return digits.slice(
    -10,
  );
}

type IncomingTextMessage = {
  providerMessageId:
    string;
  from:
    string;
  localPhone:
    string | null;
  contactName:
    string | null;
  phoneNumberId:
    string;
  text:
    string;
  payload:
    Record<
      string,
      unknown
    >;
};

function extractIncomingTextMessages(
  payload:
    any,
): IncomingTextMessage[] {
  const result:
    IncomingTextMessage[] =
    [];

  for (
    const entry of
      (
        Array.isArray(
          payload?.entry,
        )
          ? payload.entry
          : []
      )
  ) {
    for (
      const change of
        (
          Array.isArray(
            entry?.changes,
          )
            ? entry.changes
            : []
        )
    ) {
      if (
        change?.field !==
        'messages'
      ) {
        continue;
      }

      const value =
        change?.value ??
        {};

      const phoneNumberId =
        String(
          value
            ?.metadata
            ?.phone_number_id ??
          '',
        )
          .trim();

      const contacts =
        new Map<
          string,
          string | null
        >();

      for (
        const contact of
          (
            Array.isArray(
              value?.contacts,
            )
              ? value.contacts
              : []
          )
      ) {
        const waId =
          String(
            contact?.wa_id ??
            '',
          )
            .trim();

        if (!waId) {
          continue;
        }

        contacts.set(
          waId,
          String(
            contact
              ?.profile
              ?.name ??
            '',
          )
            .trim() ||
          null,
        );
      }

      for (
        const message of
          (
            Array.isArray(
              value?.messages,
            )
              ? value.messages
              : []
          )
      ) {
        const type =
          String(
            message?.type ??
            '',
          );

        if (
          type !==
          'text'
        ) {
          continue;
        }

        const providerMessageId =
          String(
            message?.id ??
            '',
          )
            .trim();

        const from =
          normalizePhone(
            message?.from,
          );

        const text =
          String(
            message
              ?.text
              ?.body ??
            '',
          )
            .trim();

        if (
          !providerMessageId ||
          !from ||
          !text
        ) {
          continue;
        }

        result.push({
          providerMessageId,
          from,
          localPhone:
            getMexicanLocalPhone(
              from,
            ),
          contactName:
            contacts.get(
              from,
            ) ??
            null,
          phoneNumberId,
          text,
          payload: {
            timestamp:
              message
                ?.timestamp ??
              null,
            context:
              message
                ?.context ??
              null,
          },
        });
      }
    }
  }

  return result;
}

async function callDorianAgent(
  incoming:
    IncomingTextMessage,
) {
  if (
    !DORIAN_CHANNEL_SECRET
  ) {
    throw new Error(
      'DORIAN_CHANNEL_SECRET is missing.',
    );
  }

  const url =
    `${SUPABASE_URL}/functions/v1/ai-order-agent`;

  const requestBody = {
    channel:
      'whatsapp',
    externalConversationId:
      incoming.from,
    customerName:
      incoming.contactName,
    customerPhone:
      incoming.localPhone,
    channelMessageId:
      incoming.providerMessageId,
    message:
      incoming.text,
  };

  const result =
    await fetch(
      url,
      {
        method:
          'POST',
        headers: {
          Authorization:
            `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
          apikey:
            SUPABASE_SERVICE_ROLE_KEY,
          'Content-Type':
            'application/json',
          'x-dorian-channel-secret':
            DORIAN_CHANNEL_SECRET,
        },
        body:
          JSON.stringify(
            requestBody,
          ),
      },
    );

  const body =
    await result.json()
      .catch(
        () => ({}),
      );

  if (!result.ok) {
    throw new Error(
      `ai-order-agent ${result.status}: ${JSON.stringify(body)}`,
    );
  }

  return body as {
    conversationId?:
      string;
    message?:
      string;
    blocked?:
      boolean;
    conversationStatus?:
      string;
  };
}

async function sendWhatsAppText(
  phoneNumberId: string,
  to: string,
  message: string,
) {
  if (
    !WHATSAPP_ACCESS_TOKEN
  ) {
    throw new Error(
      'WHATSAPP_ACCESS_TOKEN is missing.',
    );
  }

  const effectivePhoneNumberId =
    WHATSAPP_PHONE_NUMBER_ID ||
    phoneNumberId;

  if (
    !effectivePhoneNumberId
  ) {
    throw new Error(
      'WhatsApp phone_number_id is missing.',
    );
  }

  const url =
    `https://graph.facebook.com/${WHATSAPP_GRAPH_API_VERSION}/${effectivePhoneNumberId}/messages`;

  const result =
    await fetch(
      url,
      {
        method:
          'POST',
        headers: {
          Authorization:
            `Bearer ${WHATSAPP_ACCESS_TOKEN}`,
          'Content-Type':
            'application/json',
        },
        body:
          JSON.stringify({
            messaging_product:
              'whatsapp',
            recipient_type:
              'individual',
            to,
            type:
              'text',
            text: {
              preview_url:
                false,
              body:
                message.slice(
                  0,
                  4096,
                ),
            },
          }),
      },
    );

  const body =
    await result.json()
      .catch(
        () => ({}),
      );

  if (!result.ok) {
    throw new Error(
      `WhatsApp send ${result.status}: ${JSON.stringify(body)}`,
    );
  }

  return body;
}

async function processIncomingMessage(
  incoming:
    IncomingTextMessage,
): Promise<void> {
  const {
    data:
      insertedEvent,
    error:
      insertError,
  } =
    await admin
      .from(
        'ai_whatsapp_webhook_events',
      )
      .insert({
        provider_message_id:
          incoming.providerMessageId,
        phone_number_id:
          incoming.phoneNumberId ||
          null,
        from_phone:
          incoming.from,
        message_type:
          'text',
        status:
          'processing',
        payload:
          incoming.payload,
      })
      .select(
        'id',
      )
      .maybeSingle();

  if (insertError) {
    if (
      insertError.code ===
      '23505'
    ) {
      return;
    }

    throw insertError;
  }

  const eventId =
    insertedEvent?.id;

  try {
    const agentResult =
      await callDorianAgent(
        incoming,
      );

    if (
      eventId &&
      agentResult
        .conversationId
    ) {
      await admin
        .from(
          'ai_whatsapp_webhook_events',
        )
        .update({
          conversation_id:
            agentResult
              .conversationId,
        })
        .eq(
          'id',
          eventId,
        );
    }

    /*
     * Si la conversación ya está en handoff humano,
     * ai-order-agent guarda el mensaje entrante para auditoría.
     * No enviamos la misma respuesta automática de espera
     * en cada mensaje adicional del cliente.
     */
    if (
      agentResult.blocked ===
        true &&
      agentResult
        .conversationStatus ===
        'awaiting_human'
    ) {
      if (eventId) {
        await admin
          .from(
            'ai_whatsapp_webhook_events',
          )
          .update({
            status:
              'ignored',
            processed_at:
              new Date()
                .toISOString(),
          })
          .eq(
            'id',
            eventId,
          );
      }

      return;
    }

    const assistantMessage =
      String(
        agentResult.message ??
        '',
      )
        .trim();

    if (!assistantMessage) {
      throw new Error(
        'DORIAN returned an empty response.',
      );
    }

    await sendWhatsAppText(
      incoming.phoneNumberId,
      incoming.from,
      assistantMessage,
    );

    if (eventId) {
      await admin
        .from(
          'ai_whatsapp_webhook_events',
        )
        .update({
          status:
            'sent',
          processed_at:
            new Date()
              .toISOString(),
        })
        .eq(
          'id',
          eventId,
        );
    }
  } catch (
    error
  ) {
    const message =
      error instanceof Error
        ? error.message
        : String(
            error,
          );

    if (eventId) {
      await admin
        .from(
          'ai_whatsapp_webhook_events',
        )
        .update({
          status:
            'error',
          error_message:
            message.slice(
              0,
              2000,
            ),
          processed_at:
            new Date()
              .toISOString(),
        })
        .eq(
          'id',
          eventId,
        );
    }

    console.error(
      'WhatsApp inbound processing failed:',
      error,
    );
  }
}

Deno.serve(
  async (
    request,
  ) => {
    if (
      request.method ===
      'GET'
    ) {
      const url =
        new URL(
          request.url,
        );

      const mode =
        url.searchParams.get(
          'hub.mode',
        );

      const verifyToken =
        url.searchParams.get(
          'hub.verify_token',
        );

      const challenge =
        url.searchParams.get(
          'hub.challenge',
        );

      if (
        mode ===
          'subscribe' &&
        WHATSAPP_VERIFY_TOKEN &&
        verifyToken ===
          WHATSAPP_VERIFY_TOKEN &&
        challenge
      ) {
        return response(
          challenge,
          200,
        );
      }

      return response(
        'Forbidden',
        403,
      );
    }

    if (
      request.method !==
      'POST'
    ) {
      return response(
        {
          error:
            'Method not allowed',
        },
        405,
      );
    }

    const rawBody =
      new Uint8Array(
        await request
          .arrayBuffer(),
      );

    const validSignature =
      await verifyMetaSignature(
        rawBody,
        request.headers.get(
          'x-hub-signature-256',
        ),
      );

    if (
      !validSignature
    ) {
      return response(
        {
          error:
            'Invalid Meta signature.',
        },
        401,
      );
    }

    let payload:
      any;

    try {
      payload =
        JSON.parse(
          new TextDecoder()
            .decode(
              rawBody,
            ),
        );
    } catch {
      return response(
        {
          error:
            'Invalid JSON.',
        },
        400,
      );
    }

    const messages =
      extractIncomingTextMessages(
        payload,
      );

    if (
      messages.length ===
      0
    ) {
      return response(
        {
          received:
            true,
          processed:
            0,
        },
        200,
      );
    }

    const work =
      Promise.allSettled(
        messages.map(
          processIncomingMessage,
        ),
      );

    const edgeRuntime =
      (
        globalThis as
          any
      ).EdgeRuntime;

    if (
      edgeRuntime
        ?.waitUntil
    ) {
      edgeRuntime.waitUntil(
        work,
      );

      return response(
        {
          received:
            true,
          queued:
            messages.length,
        },
        200,
      );
    }

    await work;

    return response(
      {
        received:
          true,
        processed:
          messages.length,
      },
      200,
    );
  },
);
