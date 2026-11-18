import { createClient } from '@supabase/supabase-js';

type Payload = {
  source?: 'ai_handoff' | 'customer_feedback';
  record?: Record<string, unknown>;
};

type Device = {
  user_id: string | null;
  expo_push_token: string;
};

const expoPushUrl = 'https://exp.host/--/api/v2/push/send';

Deno.serve(async request => {
  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const payload = await request.json() as Payload;
    const record = payload.record ?? {};
    const source = payload.source;

    if (source !== 'ai_handoff' && source !== 'customer_feedback') {
      return new Response(JSON.stringify({ ok: true, skipped: true, reason: 'Unsupported source' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    if (!supabaseUrl || !serviceRoleKey) {
      throw new Error('Missing Supabase environment variables.');
    }

    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const [{ data: admins, error: adminError }, { data: devices, error: deviceError }, { data: business }] =
      await Promise.all([
        admin.from('profiles').select('id').eq('role', 'admin').eq('is_active', true),
        admin.from('pos_push_devices').select('user_id,expo_push_token').eq('is_active', true).eq('device_type', 'pos'),
        admin.from('business_settings').select('short_name,business_name').eq('id', 1).maybeSingle(),
      ]);

    if (adminError) throw adminError;
    if (deviceError) throw deviceError;

    const adminIds = new Set((admins ?? []).map(row => String(row.id)));
    const targets = ((devices ?? []) as Device[]).filter(
      device => device.user_id && adminIds.has(device.user_id),
    );

    if (targets.length === 0) {
      return new Response(JSON.stringify({ ok: true, skipped: true, reason: 'No active admin devices' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const businessName =
      String(business?.short_name ?? '').trim() ||
      String(business?.business_name ?? '').trim() ||
      'Dorian POS';

    let title = '';
    let body = '';
    let data: Record<string, unknown> = {};

    if (source === 'ai_handoff') {
      const customer = String(record.customer_name ?? '').trim() || 'Cliente sin nombre';
      const reason = String(record.human_handoff_reason ?? '').trim() || 'DORIAN solicita atención humana.';
      title = `🤖 Inbox IA · ${businessName}`;
      body = `${customer}: ${reason}`.slice(0, 220);
      data = {
        type: 'ai_handoff_pending',
        conversationId: String(record.id ?? ''),
      };
    } else {
      const customer = String(record.customer_name ?? '').trim() || 'Cliente web';
      const message = String(record.message ?? '').trim();
      const feedbackType = String(record.feedback_type ?? 'suggestion');
      title = `💬 Nueva sugerencia · ${businessName}`;
      body = `${customer}: ${message}`.slice(0, 220);
      data = {
        type: 'customer_feedback_new',
        feedbackId: String(record.id ?? ''),
        feedbackType,
      };
    }

    const messages = targets.map(device => ({
      to: device.expo_push_token,
      sound: 'default',
      title,
      body,
      priority: 'high',
      channelId: 'admin-actions',
      data,
    }));

    const response = await fetch(expoPushUrl, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(messages),
    });

    const expo = await response.json();
    if (!response.ok) {
      console.error('Expo push error:', expo);
      throw new Error('Expo Push Service rejected the notification.');
    }

    return new Response(JSON.stringify({ ok: true, sent: messages.length, expo }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('admin-action-push error:', error);
    return new Response(JSON.stringify({
      ok: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});
