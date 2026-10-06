import {
  createClient,
} from 'https://esm.sh/@supabase/supabase-js@2';

type OrderWebhookPayload = {
  type: 'INSERT';
  table: 'orders';
  schema: 'public';
  record: {
    id: string;
    order_source:
    | 'web'
    | 'pos'
    | string;
    fulfillment_type:
    | 'pickup'
    | 'delivery'
    | string;
    total:
    | number
    | string
    | null;
    status:
    | string
    | null;
  };
};

type PosPushDevice = {
  expo_push_token: string;
};

const expoPushUrl =
  'https://exp.host/--/api/v2/push/send';

function getTrackingCode(
  orderId: string,
): string {
  return orderId
    .split('-')[0]
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
  currencyCode:
    string,
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
    return '';
  }

  try {
    return new Intl.NumberFormat(
      'es-MX',
      {
        style: 'currency',
        currency:
          currencyCode,
      },
    ).format(
      numericTotal,
    );
  } catch {
    return `${currencyCode} ${numericTotal.toFixed(2)}`;
  }
}

Deno.serve(
  async request => {
    if (
      request.method !==
      'POST'
    ) {
      return new Response(
        JSON.stringify({
          error:
            'Method not allowed',
        }),
        {
          status: 405,
          headers: {
            'Content-Type':
              'application/json',
          },
        },
      );
    }

    try {
      const payload =
        (await request.json()) as
        OrderWebhookPayload;

      const order =
        payload.record;

      if (
        !order ||
        payload.type !==
        'INSERT'
      ) {
        return new Response(
          JSON.stringify({
            ok: true,
            skipped: true,
            reason:
              'Not an INSERT event',
          }),
          {
            status: 200,
            headers: {
              'Content-Type':
                'application/json',
            },
          },
        );
      }

      /*
       * Solo notificamos pedidos
       * creados desde la web.
       */
      if (
        order.order_source !==
        'web'
      ) {
        return new Response(
          JSON.stringify({
            ok: true,
            skipped: true,
            reason:
              'Not a web order',
          }),
          {
            status: 200,
            headers: {
              'Content-Type':
                'application/json',
            },
          },
        );
      }

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
          'Missing Supabase environment variables.',
        );
      }

      const supabase =
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

      const {
        data: businessSettings,
        error: businessSettingsError,
      } =
        await supabase
          .from(
            'business_settings',
          )
          .select(
            'short_name, business_name, currency_code',
          )
          .eq(
            'id',
            1,
          )
          .maybeSingle();

      if (
        businessSettingsError
      ) {
        console.error(
          'Could not load business settings for push:',
          businessSettingsError,
        );
      }

      const businessName =
        businessSettings?.short_name?.trim() ||
        businessSettings?.business_name?.trim() ||
        'Dorian POS';

      const currencyCode =
        businessSettings?.currency_code?.trim().toUpperCase() ||
        'MXN';

      const {
        data: devices,
        error: devicesError,
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
        throw new Error(
          `Could not load push devices: ${devicesError.message}`,
        );
      }

      const activeDevices =
        (devices ??
          []) as PosPushDevice[];

      if (
        activeDevices.length ===
        0
      ) {
        return new Response(
          JSON.stringify({
            ok: true,
            skipped: true,
            reason:
              'No active POS devices',
          }),
          {
            status: 200,
            headers: {
              'Content-Type':
                'application/json',
            },
          },
        );
      }

      const trackingCode =
        getTrackingCode(
          order.id,
        );

      const fulfillmentLabel =
        getFulfillmentLabel(
          order.fulfillment_type,
        );

      const totalText =
        getTotalText(
          order.total,
          currencyCode,
        );

      const bodyParts = [
        `Pedido #${trackingCode}`,
        fulfillmentLabel,
      ];

      if (totalText) {
        bodyParts.push(
          totalText,
        );
      }

      const messages =
        activeDevices.map(
          device => ({
            to:
              device.expo_push_token,

            sound:
              'default',

            title:
              `🛍️ Nuevo pedido web · ${businessName}`,

            body:
              bodyParts.join(
                ' · ',
              ),

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
          expoPushUrl,
          {
            method:
              'POST',

            headers: {
              Accept:
                'application/json',

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
        await expoResponse.json();

      if (
        !expoResponse.ok
      ) {
        console.error(
          'Expo Push error:',
          expoResult,
        );

        throw new Error(
          'Expo Push Service rejected the notification.',
        );
      }

      console.log(
        'Push sent:',
        expoResult,
      );

      return new Response(
        JSON.stringify({
          ok: true,
          sent:
            messages.length,
          expo:
            expoResult,
        }),
        {
          status: 200,
          headers: {
            'Content-Type':
              'application/json',
          },
        },
      );
    } catch (error) {
      console.error(
        'new-web-order-push error:',
        error,
      );

      return new Response(
        JSON.stringify({
          ok: false,
          error:
            error instanceof Error
              ? error.message
              : 'Unknown error',
        }),
        {
          status: 500,
          headers: {
            'Content-Type':
              'application/json',
          },
        },
      );
    }
  },
);