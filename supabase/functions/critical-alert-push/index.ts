import {
  createClient,
} from 'https://esm.sh/@supabase/supabase-js@2';

type NotificationWebhookPayload = {
  type:
    | 'INSERT'
    | 'UPDATE';
  table:
    'pos_notifications';
  schema:
    'public';
  record: {
    id: string;
    notification_type:
      string;
    severity:
      string;
    title:
      string;
    message:
      string;
    source_type:
      string | null;
    source_id:
      string | null;
    action_target:
      string | null;
    is_active:
      boolean;
  };
};

type PosPushDevice = {
  expo_push_token:
    string;
};

const expoPushUrl =
  'https://exp.host/--/api/v2/push/send';

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
        NotificationWebhookPayload;

      const notification =
        payload.record;

      if (
        !notification ||
        notification.severity !==
          'critical' ||
        notification.is_active !==
          true
      ) {
        return new Response(
          JSON.stringify({
            ok: true,
            skipped: true,
            reason:
              'Not an active critical notification',
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
        data:
          businessSettings,
        error:
          businessSettingsError,
      } =
        await supabase
          .from(
            'business_settings',
          )
          .select(
            'short_name,business_name',
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
          'Could not load business settings for critical alert push:',
          businessSettingsError,
        );
      }

      const businessName =
        businessSettings
          ?.short_name
          ?.trim() ||
        businessSettings
          ?.business_name
          ?.trim() ||
        'Dorian POS';

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

      if (
        devicesError
      ) {
        throw new Error(
          `Could not load POS push devices: ${devicesError.message}`,
        );
      }

      const activeDevices =
        (
          devices ??
          []
        ) as
        PosPushDevice[];

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

      const messages =
        activeDevices.map(
          device => ({
            to:
              device.expo_push_token,
            sound:
              'default',
            title:
              `⚠️ ${notification.title} · ${businessName}`,
            body:
              notification.message,
            priority:
              'high',
            channelId:
              'critical-alerts',
            data: {
              type:
                'critical_pos_alert',
              notificationId:
                notification.id,
              notificationType:
                notification.notification_type,
              sourceType:
                notification.source_type,
              sourceId:
                notification.source_id,
              actionTarget:
                notification.action_target,
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
        await expoResponse
          .json();

      if (
        !expoResponse.ok
      ) {
        console.error(
          'Expo Push error:',
          expoResult,
        );

        throw new Error(
          'Expo Push Service rejected the critical alert notification.',
        );
      }

      console.log(
        'Critical POS alert push sent:',
        expoResult,
      );

      return new Response(
        JSON.stringify({
          ok:
            true,
          sent:
            messages.length,
          expo:
            expoResult,
        }),
        {
          status:
            200,
          headers: {
            'Content-Type':
              'application/json',
          },
        },
      );
    } catch (error) {
      console.error(
        'critical-alert-push error:',
        error,
      );

      return new Response(
        JSON.stringify({
          ok:
            false,
          error:
            error instanceof Error
              ? error.message
              : 'Unknown error',
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
