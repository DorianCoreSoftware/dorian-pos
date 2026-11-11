import {
  createClient,
} from 'npm:@supabase/supabase-js@2';

type OrderRecord = {
  id: string;
  total: number | string;
  order_source: string | null;
  fulfillment_type: string | null;
};

type OrderWebhookPayload = {
  type?: string;
  table?: string;
  schema?: string;
  record?: {
    id?: string;
    total?: number | string;
    order_source?: string | null;
    fulfillment_type?: string | null;
  } | null;
};

type PosPushDevice = {
  expo_push_token: string;
};

const EXPO_PUSH_URL =
  'https://exp.host/--/api/v2/push/send';

function jsonResponse(
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
        'Content-Type':
          'application/json',
      },
    },
  );
}

function getTrackingCode(
  orderId: string,
): string {
  return orderId
    .replace(
      /-/g,
      '',
    )
    .slice(
      0,
      8,
    )
    .toUpperCase();
}

function getFulfillmentLabel(
  fulfillmentType:
    | string
    | null
    | undefined,
): string {
  return fulfillmentType ===
    'delivery'
    ? 'Domicilio'
    : 'Recoger';
}

function getTotalText(
  total:
    | number
    | string
    | null
    | undefined,
): string {
  const numericTotal =
    Number(
      total ?? 0,
    );

  if (
    !Number.isFinite(
      numericTotal,
    )
  ) {
    return '0.00';
  }

  return numericTotal
    .toFixed(
      2,
    );
}

async function loadFinalOrder(
  supabase: ReturnType<
    typeof createClient
  >,
  orderId: string,
): Promise<OrderRecord> {
  /*
   * El webhook INSERT contiene el total inicial.
   * create_web_order puede actualizar orders.total después
   * de aplicar promociones dentro de la misma operación.
   *
   * Nunca usamos record.total para el push: releemos la orden.
   */
  let lastError:
    | unknown
    | null =
    null;

  for (
    let attempt = 0;
    attempt < 4;
    attempt += 1
  ) {
    const {
      data,
      error,
    } =
      await supabase
        .from(
          'orders',
        )
        .select(
          'id,total,order_source,fulfillment_type',
        )
        .eq(
          'id',
          orderId,
        )
        .maybeSingle();

    if (
      !error &&
      data
    ) {
      return data as OrderRecord;
    }

    lastError =
      error;

    if (
      attempt < 3
    ) {
      await new Promise(
        resolve =>
          setTimeout(
            resolve,
            150,
          ),
      );
    }
  }

  throw new Error(
    lastError instanceof Error
      ? lastError.message
      : 'No se pudo consultar la orden final.',
  );
}

Deno.serve(
  async req => {
    if (
      req.method !==
      'POST'
    ) {
      return jsonResponse(
        {
          error:
            'Method not allowed',
        },
        405,
      );
    }

    try {
      const payload =
        await req.json() as
          OrderWebhookPayload;

      if (
        payload.type !==
          'INSERT' ||
        payload.table !==
          'orders'
      ) {
        return jsonResponse({
          ok:
            true,
          ignored:
            true,
          reason:
            'Evento no aplicable.',
        });
      }

      const webhookRecord =
        payload.record;

      const orderId =
        String(
          webhookRecord?.id ??
          '',
        ).trim();

      if (!orderId) {
        return jsonResponse(
          {
            error:
              'El webhook no contiene order id.',
          },
          400,
        );
      }

      /*
       * Podemos filtrar temprano si el webhook ya deja claro
       * que no es una orden web. Después volvemos a validar
       * con la fila final de BD.
       */
      if (
        webhookRecord
          ?.order_source &&
        webhookRecord
          .order_source !==
          'web'
      ) {
        return jsonResponse({
          ok:
            true,
          ignored:
            true,
          reason:
            'La orden no proviene de web.',
        });
      }

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

      if (
        !SUPABASE_URL ||
        !SUPABASE_SERVICE_ROLE_KEY
      ) {
        throw new Error(
          'Faltan variables de Supabase.',
        );
      }

      const supabase =
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

      const order =
        await loadFinalOrder(
          supabase,
          orderId,
        );

      if (
        order.order_source !==
        'web'
      ) {
        return jsonResponse({
          ok:
            true,
          ignored:
            true,
          reason:
            'La orden final no proviene de web.',
        });
      }

      const {
        data:
          businessSettings,
      } =
        await supabase
          .from(
            'business_settings',
          )
          .select(
            'business_name,short_name',
          )
          .eq(
            'id',
            1,
          )
          .maybeSingle();

      const businessName =
        String(
          businessSettings
            ?.short_name ??
          businessSettings
            ?.business_name ??
          'Dorian',
        ).trim() ||
        'Dorian';

      const {
        data:
          devices,
        error:
          devicesError,
      } =
        await supabase
          .from(
            'pos_push_devices',
          )
          .select(
            'expo_push_token',
          )
          .eq(
            'is_active',
            true,
          )
          .eq(
            'device_type',
            'pos',
          );

      if (devicesError) {
        throw devicesError;
      }

      const validDevices =
        (
          devices ??
          []
        ).filter(
          (
            device,
          ): device is PosPushDevice =>
            typeof device
              .expo_push_token ===
              'string' &&
            device
              .expo_push_token
              .startsWith(
                'ExponentPushToken[',
              ),
        );

      if (
        validDevices.length ===
        0
      ) {
        return jsonResponse({
          ok:
            true,
          sent:
            0,
          reason:
            'No hay dispositivos POS activos.',
        });
      }

      const trackingCode =
        getTrackingCode(
          order.id,
        );

      const fulfillmentLabel =
        getFulfillmentLabel(
          order.fulfillment_type,
        );

      /*
       * IMPORTANTE:
       * Este total viene de la consulta FINAL a orders,
       * no del payload INSERT del webhook.
       */
      const total =
        getTotalText(
          order.total,
        );

      const messages =
        validDevices.map(
          device => ({
            to:
              device.expo_push_token,
            sound:
              'default',
            title:
              `${businessName} · Nuevo pedido`,
            body:
              `Pedido #${trackingCode} · ${fulfillmentLabel} · $${total}`,
            priority:
              'high',
            channelId:
              'web-orders',
            data: {
              type:
                'new_web_order',
              orderId:
                order.id,
              trackingCode,
            },
          }),
        );

      const expoResponse =
        await fetch(
          EXPO_PUSH_URL,
          {
            method:
              'POST',
            headers: {
              Accept:
                'application/json',
              'Accept-Encoding':
                'gzip, deflate',
              'Content-Type':
                'application/json',
            },
            body:
              JSON.stringify(
                messages,
              ),
          },
        );

      const expoResult =
        await expoResponse
          .json()
          .catch(
            () => null,
          );

      if (
        !expoResponse.ok
      ) {
        throw new Error(
          `Expo Push respondió ${expoResponse.status}: ${JSON.stringify(expoResult)}`,
        );
      }

      return jsonResponse({
        ok:
          true,
        sent:
          messages.length,
        orderId:
          order.id,
        trackingCode,
        finalTotal:
          Number(
            order.total,
          ),
        expo:
          expoResult,
      });
    } catch (error) {
      console.error(
        'Error enviando notificación de nuevo pedido web:',
        error,
      );

      return jsonResponse(
        {
          error:
            error instanceof
              Error
              ? error.message
              : String(
                  error,
                ),
        },
        500,
      );
    }
  },
);
