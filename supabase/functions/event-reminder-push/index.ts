import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

type ReminderPayload = {
  reminderId?: string;
};

type PosPushDevice = {
  expo_push_token: string;
};

const expoPushUrl = 'https://exp.host/--/api/v2/push/send';

Deno.serve(async request => {
  if (request.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { 'Content-Type': 'application/json' } },
    );
  }

  let reminderId = '';

  try {
    const payload = (await request.json()) as ReminderPayload;
    reminderId = payload.reminderId?.trim() ?? '';

    if (!reminderId) {
      return new Response(
        JSON.stringify({ ok: false, error: 'Missing reminderId' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } },
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !serviceRoleKey) {
      throw new Error('Missing Supabase environment variables.');
    }

    const supabase = createClient(
      supabaseUrl,
      serviceRoleKey,
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      },
    );

    const { data: reminder, error: reminderError } = await supabase
      .from('event_reminders')
      .select(`
        id,
        request_id,
        reminder_type,
        title,
        body,
        sent_at,
        event_requests(
          folio,
          customer_name,
          event_date,
          event_time
        )
      `)
      .eq('id', reminderId)
      .maybeSingle();

    if (reminderError) {
      throw new Error(`Could not load reminder: ${reminderError.message}`);
    }

    if (!reminder) {
      return new Response(
        JSON.stringify({ ok: true, skipped: true, reason: 'Reminder not found' }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      );
    }

    if (reminder.sent_at) {
      return new Response(
        JSON.stringify({ ok: true, skipped: true, reason: 'Already sent' }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      );
    }

    const { data: devices, error: devicesError } = await supabase
      .from('pos_push_devices')
      .select('expo_push_token')
      .eq('is_active', true)
      .eq('device_type', 'pos');

    if (devicesError) {
      throw new Error(`Could not load push devices: ${devicesError.message}`);
    }

    const activeDevices = (devices ?? []) as PosPushDevice[];

    if (activeDevices.length === 0) {
      await supabase
        .from('event_reminders')
        .update({ push_error: 'No hay dispositivos POS activos para push.' })
        .eq('id', reminderId);

      return new Response(
        JSON.stringify({ ok: true, skipped: true, reason: 'No active POS devices' }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      );
    }

    const eventRowRaw = reminder.event_requests;
    const eventRow = Array.isArray(eventRowRaw) ? eventRowRaw[0] : eventRowRaw;

    const messages = activeDevices.map(device => ({
      to: device.expo_push_token,
      sound: 'default',
      title: reminder.title,
      body: reminder.body,
      priority: 'high',
      channelId: 'event-reminders',
      data: {
        type: 'event_reminder',
        reminderId: reminder.id,
        requestId: reminder.request_id,
        reminderType: reminder.reminder_type,
        folio: eventRow?.folio ?? null,
      },
    }));

    const expoResponse = await fetch(
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

    const expoResult = await expoResponse.json();

    if (!expoResponse.ok) {
      throw new Error(`Expo Push Service rejected the notification: ${JSON.stringify(expoResult)}`);
    }

    const { error: updateError } = await supabase
      .from('event_reminders')
      .update({
        sent_at: new Date().toISOString(),
        push_error: null,
      })
      .eq('id', reminderId);

    if (updateError) {
      console.error('Could not mark reminder as sent:', updateError);
    }

    return new Response(
      JSON.stringify({ ok: true, sent: messages.length, expo: expoResult }),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    );
  } catch (error) {
    console.error('event-reminder-push error:', error);

    if (reminderId) {
      try {
        const supabaseUrl = Deno.env.get('SUPABASE_URL');
        const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
        if (supabaseUrl && serviceRoleKey) {
          const supabase = createClient(supabaseUrl, serviceRoleKey, {
            auth: { persistSession: false, autoRefreshToken: false },
          });
          await supabase
            .from('event_reminders')
            .update({
              push_error: error instanceof Error ? error.message.slice(0, 500) : 'Unknown error',
            })
            .eq('id', reminderId);
        }
      } catch (updateError) {
        console.error('Could not persist reminder push error:', updateError);
      }
    }

    return new Response(
      JSON.stringify({
        ok: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    );
  }
});
