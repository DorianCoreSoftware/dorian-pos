import {
  createClient,
} from 'https://esm.sh/@supabase/supabase-js@2';

Deno.serve(
  async (req) => {
    try {
      /*
       * ======================================================
       * PAYLOAD DEL TRIGGER
       * ======================================================
       */
      const payload =
        await req.json();

      const record =
        payload?.record;

      /*
       * Esta función únicamente atiende:
       *
       * - pedidos a domicilio
       * - que hayan llegado a READY
       */
      if (
        !record ||
        record.fulfillment_type !==
          'delivery' ||
        record.status !==
          'ready'
      ) {
        return new Response(
          JSON.stringify({
            skipped:
              true,
          }),
          {
            headers: {
              'Content-Type':
                'application/json',
            },
          },
        );
      }

      /*
       * ======================================================
       * SUPABASE ADMIN CLIENT
       * ======================================================
       */
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
          'Supabase environment variables are missing.',
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

      /*
       * ======================================================
       * OBTENER REPARTIDORES
       * ======================================================
       *
       * No confiamos únicamente en device_type.
       *
       * También comprobamos que el usuario asociado al
       * dispositivo siga teniendo role = driver.
       */
      const {
        data:
          drivers,
        error:
          driversError,
      } =
        await supabase
          .from(
            'profiles',
          )
          .select(
            'id',
          )
          .eq(
            'role',
            'driver',
          );

      if (
        driversError
      ) {
        throw driversError;
      }

      const driverIds =
        (
          drivers ?? []
        ).map(
          (
            driver,
          ) =>
            driver.id,
        );

      if (
        driverIds.length ===
        0
      ) {
        console.log(
          '🛵 No hay repartidores registrados.',
        );

        return new Response(
          JSON.stringify({
            sent:
              0,

            reason:
              'no_drivers',
          }),
          {
            headers: {
              'Content-Type':
                'application/json',
            },
          },
        );
      }

      /*
       * ======================================================
       * DISPOSITIVOS DE REPARTIDORES
       * ======================================================
       *
       * Requisitos:
       *
       * - dispositivo activo
       * - device_type = driver
       * - user_id pertenece realmente a un perfil driver
       */
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
            `
              expo_push_token,
              user_id
            `,
          )
          .eq(
            'is_active',
            true,
          )
          .eq(
            'device_type',
            'driver',
          )
          .in(
            'user_id',
            driverIds,
          );

      if (
        devicesError
      ) {
        throw devicesError;
      }

      /*
       * Eliminamos tokens duplicados.
       */
      const tokens =
        Array.from(
          new Set(
            (
              devices ?? []
            )
              .map(
                (
                  device,
                ) =>
                  device
                    .expo_push_token,
              )
              .filter(
                (
                  token,
                ): token is string =>
                  Boolean(
                    token,
                  ),
              ),
          ),
        );

      if (
        tokens.length ===
        0
      ) {
        console.log(
          '🛵 No hay dispositivos driver activos.',
        );

        return new Response(
          JSON.stringify({
            sent:
              0,

            reason:
              'no_driver_devices',
          }),
          {
            headers: {
              'Content-Type':
                'application/json',
            },
          },
        );
      }

      /*
       * ======================================================
       * CÓDIGO DEL PEDIDO
       * ======================================================
       */
      const trackingCode =
        String(
          record.id ?? '',
        )
          .split(
            '-',
          )[0]
          .toUpperCase();

      /*
       * ======================================================
       * CREAR NOTIFICACIONES
       * ======================================================
       */
      const messages =
        tokens.map(
          (
            token,
          ) => ({
            to:
              token,

            sound:
              'default',

            /*
             * Canal específico para repartidores.
             */
            channelId:
              'delivery-orders',

            title:
              '🛵 Pedido listo para reparto',

            body:
              `Pedido #${trackingCode} está listo para entregar.`,

            priority:
              'high',

            data: {
              type:
                'delivery_ready',

              orderId:
                record.id,

              trackingCode,
            },
          }),
        );

      console.log(
        `🛵 Enviando pedido #${trackingCode} a ${messages.length} dispositivo(s) de reparto.`,
      );

      /*
       * ======================================================
       * EXPO PUSH API
       * ======================================================
       */
      const expoResponse =
        await fetch(
          'https://exp.host/--/api/v2/push/send',
          {
            method:
              'POST',

            headers: {
              'Content-Type':
                'application/json',
            },

            body:
              JSON.stringify(
                messages,
              ),
          },
        );

      /*
       * Aunque Expo responda HTTP no exitoso,
       * queremos verlo claramente en logs.
       */
      const expoResult =
        await expoResponse
          .json();

      if (
        !expoResponse.ok
      ) {
        console.error(
          '❌ Expo Push respondió con error:',
          expoResult,
        );

        throw new Error(
          `Expo Push error: ${expoResponse.status}`,
        );
      }

      console.log(
        '✅ Delivery push result:',
        expoResult,
      );

      return new Response(
        JSON.stringify({
          sent:
            messages.length,

          trackingCode,

          expoResult,
        }),
        {
          headers: {
            'Content-Type':
              'application/json',
          },
        },
      );
    } catch (
      error
    ) {
      console.error(
        '❌ delivery-ready-push error:',
        error,
      );

      return new Response(
        JSON.stringify({
          error:
            error instanceof Error
              ? error.message
              : String(
                  error,
                ),
        }),
        {
          status:
            500,

          headers: {
            'Content-Type':
              'application/json',
          },
        },
      );
    }
  },
);