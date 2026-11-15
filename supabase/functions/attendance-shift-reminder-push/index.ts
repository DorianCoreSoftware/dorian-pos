import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

type Payload = {
  notificationId?: string;
};

type PushDevice = {
  expo_push_token: string;
};

const expoPushUrl = 'https://exp.host/--/api/v2/push/send';

function json(body: unknown, status = 200): Response {
  return new Response(
    JSON.stringify(body),
    {
      status,
      headers: {
        'Content-Type': 'application/json',
      },
    },
  );
}

Deno.serve(async request => {
  if (request.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405);
  }

  let notificationId = '';

  try {
    const body = (await request.json()) as Payload;
    notificationId = body.notificationId?.trim() ?? '';

    if (!notificationId) {
      return json({ ok: false, error: 'Missing notificationId' }, 400);
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !serviceRoleKey) {
      throw new Error('Missing Supabase environment variables.');
    }

    const admin = createClient(
      supabaseUrl,
      serviceRoleKey,
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      },
    );

    const { data: notification, error: notificationError } =
      await admin
        .from('attendance_notifications')
        .select('id,recipient_user_id,notification_type,title,message,work_date,pushed_at,push_skipped_at')
        .eq('id', notificationId)
        .maybeSingle();

    if (notificationError) {
      throw notificationError;
    }

    if (!notification) {
      return json({ ok: true, skipped: true, reason: 'Notification not found' });
    }

    if (notification.notification_type !== 'shift_start_soon') {
      return json({ ok: true, skipped: true, reason: 'Not a shift start reminder' });
    }

    if (notification.pushed_at || notification.push_skipped_at) {
      return json({ ok: true, skipped: true, reason: 'Already processed' });
    }

    const { data: preferences, error: preferenceError } =
      await admin
        .from('attendance_notification_preferences')
        .select('shift_start_reminders')
        .eq('user_id', notification.recipient_user_id)
        .maybeSingle();

    if (preferenceError) {
      throw preferenceError;
    }

    if (preferences?.shift_start_reminders === false) {
      await admin
        .from('attendance_notifications')
        .update({
          push_skipped_at: new Date().toISOString(),
          push_last_error: null,
        })
        .eq('id', notification.id);

      return json({ ok: true, skipped: true, reason: 'User preference disabled' });
    }

    const { data: devices, error: deviceError } =
      await admin
        .from('pos_push_devices')
        .select('expo_push_token')
        .eq('user_id', notification.recipient_user_id)
        .eq('is_active', true);

    if (deviceError) {
      throw deviceError;
    }

    const tokens = ((devices ?? []) as PushDevice[])
      .map(device => device.expo_push_token)
      .filter(Boolean);

    if (!tokens.length) {
      await admin
        .from('attendance_notifications')
        .update({
          push_skipped_at: new Date().toISOString(),
          push_last_error: 'No hay dispositivos activos para este empleado.',
        })
        .eq('id', notification.id);

      return json({ ok: true, skipped: true, reason: 'No active devices' });
    }

    const messages = tokens.map(to => ({
      to,
      sound: 'default',
      title: notification.title,
      body: notification.message,
      priority: 'high',
      channelId: 'attendance',
      data: {
        type: 'attendance_notification',
        notificationId: notification.id,
        category: notification.notification_type,
        workDate: notification.work_date,
      },
    }));

    const response = await fetch(
      expoPushUrl,
      {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(messages),
      },
    );

    const expo = await response.json();

    if (!response.ok) {
      throw new Error(
        expo?.message ||
        `Expo Push Service rejected the notification: ${JSON.stringify(expo)}`,
      );
    }

    await admin
      .from('attendance_notifications')
      .update({
        pushed_at: new Date().toISOString(),
        push_last_error: null,
      })
      .eq('id', notification.id);

    return json({
      ok: true,
      sent: messages.length,
      expo,
    });
  } catch (error) {
    console.error('attendance-shift-reminder-push error:', error);

    if (notificationId) {
      try {
        const supabaseUrl = Deno.env.get('SUPABASE_URL');
        const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

        if (supabaseUrl && serviceRoleKey) {
          const admin = createClient(supabaseUrl, serviceRoleKey, {
            auth: {
              persistSession: false,
              autoRefreshToken: false,
            },
          });

          await admin
            .from('attendance_notifications')
            .update({
              push_last_error:
                error instanceof Error
                  ? error.message.slice(0, 500)
                  : 'Unknown error',
            })
            .eq('id', notificationId);
        }
      } catch (updateError) {
        console.error('Could not persist attendance reminder push error:', updateError);
      }
    }

    return json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : 'Unknown error',
      },
      500,
    );
  }
});
