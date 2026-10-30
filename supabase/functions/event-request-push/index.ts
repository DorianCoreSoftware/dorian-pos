import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

type EventRequestWebhookPayload = {
  type: 'INSERT';
  table: 'event_requests';
  schema: 'public';
  record: {
    id: string;
    folio: number;
    customer_name: string | null;
    guest_count: number | null;
    event_date: string | null;
    event_time: string | null;
  };
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

  try {
    const payload = (await request.json()) as EventRequestWebhookPayload;
    const eventRequest = payload.record;

    if (!eventRequest || payload.type !== 'INSERT') {
      return new Response(
        JSON.stringify({ ok: true, skipped: true, reason: 'Not an INSERT event' }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
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

    const { data: businessSettings, error: businessSettingsError } =
      await supabase
        .from('business_settings')
        .select('short_name, business_name')
        .eq('id', 1)
        .maybeSingle();

    if (businessSettingsError) {
      console.error(
        'Could not load business settings for event push:',
        businessSettingsError,
      );
    }

    const businessName =
      businessSettings?.short_name?.trim() ||
      businessSettings?.business_name?.trim() ||
      'Dorian POS';

    const { data: devices, error: devicesError } =
      await supabase
        .from('pos_push_devices')
        .select('expo_push_token')
        .eq('is_active', true)
        .eq('device_type', 'pos');

    if (devicesError) {
      throw new Error(
        `Could not load push devices: ${devicesError.message}`,
      );
    }

    const activeDevices = (devices ?? []) as PosPushDevice[];

    if (activeDevices.length === 0) {
      return new Response(
        JSON.stringify({
          ok: true,
          skipped: true,
          reason: 'No active POS devices',
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      );
    }

    const customerName = eventRequest.customer_name?.trim() || 'Cliente';
    const guestCount = Number(eventRequest.guest_count ?? 0);
    const dateText = eventRequest.event_date
      ? eventRequest.event_date.split('-').reverse().join('/')
      : '';

    const bodyParts = [
      `Folio #${eventRequest.folio}`,
      customerName,
    ];

    if (guestCount > 0) {
      bodyParts.push(`${guestCount} personas`);
    }

    if (dateText) {
      bodyParts.push(dateText);
    }

    const messages = activeDevices.map(device => ({
      to: device.expo_push_token,
      sound: 'default',
      title: `🎉 Nueva solicitud de evento · ${businessName}`,
      body: bodyParts.join(' · '),
      priority: 'high',
      channelId: 'event-requests',
      data: {
        type: 'new_event_request',
        requestId: eventRequest.id,
        folio: eventRequest.folio,
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
      console.error('Expo Push error:', expoResult);
      throw new Error('Expo Push Service rejected the notification.');
    }

    console.log('Event request push sent:', expoResult);

    return new Response(
      JSON.stringify({
        ok: true,
        sent: messages.length,
        expo: expoResult,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    );
  } catch (error) {
    console.error('event-request-push error:', error);

    return new Response(
      JSON.stringify({
        ok: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    );
  }
});
