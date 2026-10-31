import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { ...cors, 'Content-Type': 'application/json' },
});

function esc(value: unknown): string {
  return String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[char] ?? char));
}

function money(value: unknown, currency = 'MXN'): string {
  const n = Number(value ?? 0);
  return new Intl.NumberFormat('es-MX', { style: 'currency', currency }).format(n);
}

async function sendResend(to: string, subject: string, html: string): Promise<void> {
  const key = Deno.env.get('RESEND_API_KEY');
  if (!key) throw new Error('RESEND_API_KEY no está configurada.');
  const from = Deno.env.get('ATTENDANCE_EMAIL_FROM') || 'Burger Kong <onboarding@resend.dev>';
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from, to: [to], subject, html }),
  });
  const payload = await response.json();
  if (!response.ok) throw new Error(payload?.message || 'No se pudo enviar el correo.');
}

serve(async request => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (request.method !== 'POST') return json({ error: 'Método no permitido.' }, 405);

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!supabaseUrl || !anonKey || !serviceRoleKey) return json({ error: 'Faltan variables de Supabase.' }, 500);

  const authorization = request.headers.get('Authorization') ?? '';
  const token = authorization.replace(/^Bearer\s+/i, '');
  if (!token) return json({ error: 'No autorizado.' }, 401);

  const authClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: `Bearer ${token}` } } });
  const { data: authData, error: authError } = await authClient.auth.getUser();
  if (authError || !authData.user) return json({ error: 'Sesión inválida.' }, 401);

  const admin = createClient(supabaseUrl, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } });
  const { data: callerProfile } = await admin.from('profiles').select('id,role,is_active').eq('id', authData.user.id).maybeSingle();
  if (!callerProfile || callerProfile.is_active === false) return json({ error: 'Usuario inactivo.' }, 403);

  const body = await request.json().catch(() => ({}));
  const action = body?.action;

  try {
    if (action === 'payroll_receipt') {
      const itemId = String(body?.itemId ?? '');
      const { data: item, error } = await admin
        .from('attendance_payroll_run_items')
        .select('id,user_id,employee_name,employee_role,pay_basis,base_rate,scheduled_pay,absence_deduction,late_deduction,early_leave_deduction,overtime_pay,total_pay,payment_status,paid_at,payment_method,payment_reference,payroll_run_id')
        .eq('id', itemId).maybeSingle();
      if (error || !item) throw new Error('No se encontró el recibo.');
      if (!['admin', 'accountant'].includes(String(callerProfile.role)) && item.user_id !== authData.user.id) return json({ error: 'No autorizado.' }, 403);

      const { data: run } = await admin.from('attendance_payroll_runs').select('start_date,end_date,status,currency_code').eq('id', item.payroll_run_id).single();
      if (!run || run.status === 'voided') throw new Error('El corte no está disponible.');
      const { data: userData } = await admin.auth.admin.getUserById(item.user_id);
      const email = userData.user?.email?.trim();
      if (!email) throw new Error('El empleado no tiene correo registrado.');
      const { data: business } = await admin.from('business_settings').select('business_name').eq('id',1).maybeSingle();
      const brand = business?.business_name || 'Dorian POS';
      const c = run.currency_code || 'MXN';
      const subject = `${brand} · Recibo de nómina ${run.start_date} a ${run.end_date}`;
      const html = `<div style="font-family:Arial,sans-serif;background:#f5f5f5;padding:24px"><div style="max-width:650px;margin:auto;background:white;padding:28px;border-radius:14px;border:1px solid #ddd"><h2 style="margin:0">${esc(brand)}</h2><p style="color:#666">RECIBO DE NÓMINA</p><p><b>Empleado:</b> ${esc(item.employee_name)}<br><b>Puesto:</b> ${esc(item.employee_role)}<br><b>Periodo:</b> ${esc(run.start_date)} a ${esc(run.end_date)}</p><hr><table style="width:100%;border-collapse:collapse"><tr><td>Pago programado</td><td style="text-align:right">${esc(money(item.scheduled_pay,c))}</td></tr><tr><td>Descuento faltas</td><td style="text-align:right">-${esc(money(item.absence_deduction,c))}</td></tr><tr><td>Descuento retardos</td><td style="text-align:right">-${esc(money(item.late_deduction,c))}</td></tr><tr><td>Descuento salidas anticipadas</td><td style="text-align:right">-${esc(money(item.early_leave_deduction,c))}</td></tr><tr><td>Horas extra</td><td style="text-align:right">+${esc(money(item.overtime_pay,c))}</td></tr><tr><td style="padding-top:14px;font-size:20px"><b>TOTAL</b></td><td style="padding-top:14px;text-align:right;font-size:20px"><b>${esc(money(item.total_pay,c))}</b></td></tr></table><hr><p><b>Estado:</b> ${item.payment_status === 'paid' ? 'PAGADO' : 'PENDIENTE'}${item.paid_at ? `<br><b>Fecha de pago:</b> ${esc(new Date(item.paid_at).toLocaleString('es-MX'))}` : ''}${item.payment_method ? `<br><b>Método:</b> ${esc(item.payment_method)}` : ''}${item.payment_reference ? `<br><b>Referencia:</b> ${esc(item.payment_reference)}` : ''}</p><p style="font-size:12px;color:#777">Este recibo corresponde al snapshot histórico del corte de nómina. También está disponible en Asistencia → Mi expediente → Recibos.</p></div></div>`;
      try {
        await sendResend(email, subject, html);
        await admin.from('attendance_payroll_run_items').update({ email_sent_at: new Date().toISOString(), email_last_error: null }).eq('id', item.id);
        await admin.from('attendance_email_log').insert({ event_type:'payroll_receipt', user_id:item.user_id, payroll_item_id:item.id, recipient_email:email, status:'sent', sent_at:new Date().toISOString() });
      } catch (sendError) {
        const msg = sendError instanceof Error ? sendError.message : 'Error de correo';
        await admin.from('attendance_payroll_run_items').update({ email_last_error: msg.slice(0,500) }).eq('id', item.id);
        await admin.from('attendance_email_log').insert({ event_type:'payroll_receipt', user_id:item.user_id, payroll_item_id:item.id, recipient_email:email, status:'failed', error_message:msg.slice(0,500) });
        throw sendError;
      }
      return json({ success: true });
    }

    if (action === 'request_status') {
      if (callerProfile.role !== 'admin') return json({ error: 'Solo administración puede notificar resoluciones.' }, 403);
      const requestId = String(body?.requestId ?? '');
      const { data: req, error } = await admin.from('attendance_employee_requests').select('id,user_id,start_date,end_date,request_type,status,note,admin_note').eq('id',requestId).maybeSingle();
      if (error || !req) throw new Error('No se encontró la solicitud.');
      const { data: userData } = await admin.auth.admin.getUserById(req.user_id);
      const email = userData.user?.email?.trim();
      if (!email) throw new Error('El empleado no tiene correo registrado.');
      const { data: profile } = await admin.from('profiles').select('first_name,last_name').eq('id',req.user_id).maybeSingle();
      const { data: business } = await admin.from('business_settings').select('business_name').eq('id',1).maybeSingle();
      const brand = business?.business_name || 'Dorian POS';
      const state = req.status === 'approved' ? 'APROBADA' : req.status === 'rejected' ? 'RECHAZADA' : req.status.toUpperCase();
      const subject = `${brand} · Solicitud ${state.toLowerCase()}`;
      const html = `<div style="font-family:Arial,sans-serif;background:#f5f5f5;padding:24px"><div style="max-width:600px;margin:auto;background:white;padding:28px;border-radius:14px"><h2>${esc(brand)}</h2><p>Hola ${esc(profile?.first_name || '')},</p><p>Tu solicitud de <b>${esc(req.request_type)}</b> para ${esc(req.start_date)}${req.end_date!==req.start_date?` a ${esc(req.end_date)}`:''} quedó <b>${esc(state)}</b>.</p><p><b>Motivo enviado:</b> ${esc(req.note)}</p>${req.admin_note?`<p><b>Respuesta de administración:</b> ${esc(req.admin_note)}</p>`:''}<p style="color:#777;font-size:12px">Puedes consultar el historial en Asistencia → Mi expediente → Solicitudes.</p></div></div>`;
      try {
        await sendResend(email, subject, html);
        await admin.from('attendance_email_log').insert({ event_type:'request_status', user_id:req.user_id, request_id:req.id, recipient_email:email, status:'sent', sent_at:new Date().toISOString() });
      } catch (sendError) {
        const msg = sendError instanceof Error ? sendError.message : 'Error de correo';
        await admin.from('attendance_email_log').insert({ event_type:'request_status', user_id:req.user_id, request_id:req.id, recipient_email:email, status:'failed', error_message:msg.slice(0,500) });
        throw sendError;
      }
      return json({ success: true });
    }

    return json({ error: 'Acción no soportada.' }, 400);
  } catch (error) {
    console.error('attendance-email error:', error);
    return json({ error: error instanceof Error ? error.message : 'Ocurrió un error.' }, 500);
  }
});
