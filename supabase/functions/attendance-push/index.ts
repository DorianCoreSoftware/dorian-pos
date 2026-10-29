import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      ...cors,
      'Content-Type': 'application/json',
    },
  });

function preferenceKeyFor(
  notificationType: string,
): 'clock_reminders' | 'request_updates' | 'payroll_updates' | 'shift_updates' | null {
  if (
    notificationType === 'clock_in_pending' ||
    notificationType === 'clock_out_pending'
  ) {
    return 'clock_reminders';
  }

  if (
    notificationType === 'employee_request_approved' ||
    notificationType === 'employee_request_rejected' ||
    notificationType === 'employee_request_new'
  ) {
    return 'request_updates';
  }

  if (notificationType === 'payroll_paid') {
    return 'payroll_updates';
  }

  if (
    notificationType === 'shift_schedule_published' ||
    notificationType === 'shift_schedule_updated' ||
    notificationType === 'shift_change_request_new' ||
    notificationType === 'shift_change_offer_new' ||
    notificationType === 'shift_change_approved' ||
    notificationType === 'shift_change_rejected'
  ) {
    return 'shift_updates';
  }

  /* Los avisos operativos críticos de Admin no se silencian. */
  return null;
}

serve(async request => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: cors });
  }

  if (request.method !== 'POST') {
    return json({ error: 'Método no permitido.' }, 405);
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

  if (!supabaseUrl || !anonKey || !serviceRoleKey) {
    return json({ error: 'Faltan variables de Supabase.' }, 500);
  }

  const authorization =
    request.headers.get('Authorization') ?? '';

  const token =
    authorization.replace(/^Bearer\s+/i, '');

  if (!token) {
    return json({ error: 'No autorizado.' }, 401);
  }

  const authClient = createClient(
    supabaseUrl,
    anonKey,
    {
      global: {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    },
  );

  const { data: authData, error: authError } =
    await authClient.auth.getUser();

  if (authError || !authData.user) {
    return json({ error: 'Sesión inválida.' }, 401);
  }

  const admin = createClient(
    supabaseUrl,
    serviceRoleKey,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    },
  );

  const { data: caller } =
    await admin
      .from('profiles')
      .select('id,role,is_active')
      .eq('id', authData.user.id)
      .maybeSingle();

  if (!caller || caller.is_active === false) {
    return json({ error: 'Usuario inactivo.' }, 403);
  }

  const body =
    await request.json().catch(() => ({}));

  const action =
    String(body?.action ?? 'my_pending');

  try {
    let query = admin
      .from('attendance_notifications')
      .select('id,recipient_user_id,notification_type,title,message,severity,request_id,payroll_item_id,attendance_record_id,work_date,shift_draft_id,shift_revision,shift_change_request_id,execution_alert_id,pushed_at,push_skipped_at')
      .is('pushed_at', null)
      .is('push_skipped_at', null)
      .order('created_at', { ascending: true })
      .limit(100);

    if (action === 'my_pending') {
      query = query.eq(
        'recipient_user_id',
        authData.user.id,
      );
    } else if (action === 'request') {
      const requestId =
        String(body?.requestId ?? '');

      const { data: req } =
        await admin
          .from('attendance_employee_requests')
          .select('id,user_id')
          .eq('id', requestId)
          .maybeSingle();

      if (!req) {
        return json(
          { error: 'Solicitud no encontrada.' },
          404,
        );
      }

      if (
        caller.role !== 'admin' &&
        req.user_id !== authData.user.id
      ) {
        return json({ error: 'No autorizado.' }, 403);
      }

      query = query.eq('request_id', requestId);
    } else if (action === 'payroll') {
      if (caller.role !== 'admin') {
        return json({ error: 'Solo administración.' }, 403);
      }

      const itemId =
        String(body?.itemId ?? '');

      query = query.eq('payroll_item_id', itemId);
    } else if (action === 'shift_change') {
      const requestId =
        String(body?.requestId ?? '');

      if (!requestId) {
        return json({ error: 'Falta requestId.' }, 400);
      }

      const { data: shiftRequest } =
        await admin
          .from('attendance_shift_change_requests')
          .select('id,requester_user_id')
          .eq('id', requestId)
          .maybeSingle();

      if (!shiftRequest) {
        return json({ error: 'Solicitud no encontrada.' }, 404);
      }

      const { data: ownOffer } =
        await admin
          .from('attendance_shift_change_offers')
          .select('id')
          .eq('request_id', requestId)
          .eq('offered_by', authData.user.id)
          .limit(1);

      if (
        caller.role !== 'admin' &&
        shiftRequest.requester_user_id !== authData.user.id &&
        !ownOffer?.length
      ) {
        return json({ error: 'No autorizado.' }, 403);
      }

      query = query.eq(
        'shift_change_request_id',
        requestId,
      );
    } else if (action === 'shift_plan') {
      if (caller.role !== 'admin') {
        return json({ error: 'Solo administración.' }, 403);
      }

      const draftId =
        String(body?.draftId ?? '');

      if (!draftId) {
        return json({ error: 'Falta draftId.' }, 400);
      }

      query = query.eq('shift_draft_id', draftId);
    } else {
      return json({ error: 'Acción no soportada.' }, 400);
    }

    const {
      data: notifications,
      error: notificationError,
    } = await query;

    if (notificationError) {
      throw notificationError;
    }

    if (!notifications?.length) {
      return json({ success: true, sent: 0, skipped: 0 });
    }

    let sent = 0;
    let skipped = 0;

    for (const n of notifications) {
      const preferenceKey =
        preferenceKeyFor(n.notification_type);

      if (preferenceKey) {
        const { data: preferences } =
          await admin
            .from('attendance_notification_preferences')
            .select('clock_reminders,request_updates,payroll_updates,shift_updates')
            .eq('user_id', n.recipient_user_id)
            .maybeSingle();

        const enabled =
          preferences?.[preferenceKey] !== false;

        if (!enabled) {
          await admin
            .from('attendance_notifications')
            .update({
              push_skipped_at:
                new Date().toISOString(),
              push_last_error: null,
            })
            .eq('id', n.id);

          skipped += 1;
          continue;
        }
      }

      const { data: devices, error: deviceError } =
        await admin
          .from('pos_push_devices')
          .select('expo_push_token')
          .eq('user_id', n.recipient_user_id)
          .eq('is_active', true);

      if (deviceError) {
        throw deviceError;
      }

      const tokens =
        (devices ?? [])
          .map((device: any) => device.expo_push_token)
          .filter(
            (value: unknown) =>
              typeof value === 'string' &&
              value.length > 0,
          );

      if (!tokens.length) {
        continue;
      }

      const messages =
        tokens.map((to: string) => ({
          to,
          sound: 'default',
          title: n.title,
          body: n.message,
          priority: 'high',
          channelId: 'attendance',
          data: {
            type: 'attendance_notification',
            notificationId: n.id,
            category: n.notification_type,
            requestId: n.request_id,
            payrollItemId: n.payroll_item_id,
            attendanceRecordId:
              n.attendance_record_id,
            workDate: n.work_date,
            shiftDraftId: n.shift_draft_id,
            shiftRevision: n.shift_revision,
            shiftChangeRequestId: n.shift_change_request_id,
            executionAlertId: n.execution_alert_id,
          },
        }));

      try {
        const response =
          await fetch(
            'https://exp.host/--/api/v2/push/send',
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Accept: 'application/json',
              },
              body: JSON.stringify(messages),
            },
          );

        const payload =
          await response.json();

        if (!response.ok) {
          throw new Error(
            payload?.message ||
            'Expo rechazó la notificación.',
          );
        }

        await admin
          .from('attendance_notifications')
          .update({
            pushed_at:
              new Date().toISOString(),
            push_last_error: null,
          })
          .eq('id', n.id);

        sent += 1;
      } catch (pushError) {
        const message =
          pushError instanceof Error
            ? pushError.message
            : 'Error de push';

        await admin
          .from('attendance_notifications')
          .update({
            push_last_error:
              message.slice(0, 500),
          })
          .eq('id', n.id);
      }
    }

    return json({
      success: true,
      sent,
      skipped,
    });
  } catch (error) {
    console.error(
      'attendance-push error:',
      error,
    );

    return json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Ocurrió un error.',
      },
      500,
    );
  }
});
