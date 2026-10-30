-- ============================================================
-- FASE 6F: RECORDATORIOS Y SEGUIMIENTO DE EVENTOS
-- ============================================================

alter table public.event_settings
  add column if not exists reminders_enabled boolean not null default true,
  add column if not exists deposit_reminder_days_before integer not null default 1,
  add column if not exists event_reminder_hours_before integer not null default 24,
  add column if not exists balance_reminder_hours_before integer not null default 24,
  add column if not exists checklist_reminder_hours_before integer not null default 6;

alter table public.event_settings
  drop constraint if exists event_settings_deposit_reminder_days_check,
  add constraint event_settings_deposit_reminder_days_check
    check (deposit_reminder_days_before between 0 and 30),
  drop constraint if exists event_settings_event_reminder_hours_check,
  add constraint event_settings_event_reminder_hours_check
    check (event_reminder_hours_before between 0 and 720),
  drop constraint if exists event_settings_balance_reminder_hours_check,
  add constraint event_settings_balance_reminder_hours_check
    check (balance_reminder_hours_before between 0 and 720),
  drop constraint if exists event_settings_checklist_reminder_hours_check,
  add constraint event_settings_checklist_reminder_hours_check
    check (checklist_reminder_hours_before between 0 and 720);

-- Reemplazar la firma anterior para mantener una única RPC de configuración.
drop function if exists public.update_event_settings(
  boolean, integer, integer, integer, integer, text, text,
  boolean, text, numeric, integer, text
);

create or replace function public.update_event_settings(
  p_public_quote_enabled boolean,
  p_min_guests integer,
  p_max_guests integer,
  p_min_advance_hours integer,
  p_max_advance_days integer,
  p_quote_disclaimer text,
  p_terms text,
  p_deposit_enabled boolean,
  p_deposit_type text,
  p_deposit_value numeric,
  p_deposit_due_days integer,
  p_portal_base_url text,
  p_reminders_enabled boolean,
  p_deposit_reminder_days_before integer,
  p_event_reminder_hours_before integer,
  p_balance_reminder_hours_before integer,
  p_checklist_reminder_hours_before integer
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_portal_base_url text := trim(coalesce(p_portal_base_url, ''));
begin
  if v_user_id is null or not exists (
    select 1
    from public.profiles
    where id = v_user_id
      and is_active = true
      and role::text = 'admin'
  ) then
    raise exception 'No tienes permisos para configurar eventos';
  end if;

  if p_min_guests <= 0 then
    raise exception 'El mínimo de personas debe ser mayor a cero';
  end if;
  if p_max_guests < p_min_guests then
    raise exception 'El máximo de personas no puede ser menor al mínimo';
  end if;
  if p_min_advance_hours < 0 then
    raise exception 'La anticipación mínima no puede ser negativa';
  end if;
  if p_max_advance_days <= 0 then
    raise exception 'El periodo máximo debe ser mayor a cero días';
  end if;
  if length(trim(coalesce(p_quote_disclaimer, ''))) > 300 then
    raise exception 'El aviso de cotización no puede superar 300 caracteres';
  end if;
  if length(trim(coalesce(p_terms, ''))) > 3000 then
    raise exception 'Las condiciones no pueden superar 3000 caracteres';
  end if;
  if coalesce(p_deposit_type, '') not in ('percentage', 'fixed') then
    raise exception 'El tipo de anticipo no es válido';
  end if;
  if coalesce(p_deposit_value, -1) < 0 then
    raise exception 'El anticipo no puede ser negativo';
  end if;
  if p_deposit_type = 'percentage' and p_deposit_value > 100 then
    raise exception 'El anticipo porcentual no puede superar 100%%';
  end if;
  if p_deposit_due_days is null or p_deposit_due_days not between 0 and 365 then
    raise exception 'El plazo del anticipo debe estar entre 0 y 365 días';
  end if;
  if length(v_portal_base_url) > 300 then
    raise exception 'La URL pública del portal no puede superar 300 caracteres';
  end if;
  if v_portal_base_url <> '' and v_portal_base_url !~* '^https?://[^[:space:]]+$' then
    raise exception 'La URL pública del portal debe comenzar con http:// o https://';
  end if;
  if p_deposit_reminder_days_before is null or p_deposit_reminder_days_before not between 0 and 30 then
    raise exception 'El recordatorio de anticipo debe estar entre 0 y 30 días antes';
  end if;
  if p_event_reminder_hours_before is null or p_event_reminder_hours_before not between 0 and 720 then
    raise exception 'El recordatorio del evento debe estar entre 0 y 720 horas antes';
  end if;
  if p_balance_reminder_hours_before is null or p_balance_reminder_hours_before not between 0 and 720 then
    raise exception 'El recordatorio de saldo debe estar entre 0 y 720 horas antes';
  end if;
  if p_checklist_reminder_hours_before is null or p_checklist_reminder_hours_before not between 0 and 720 then
    raise exception 'El recordatorio de checklist debe estar entre 0 y 720 horas antes';
  end if;

  update public.event_settings
  set
    public_quote_enabled = coalesce(p_public_quote_enabled, false),
    min_guests = p_min_guests,
    max_guests = p_max_guests,
    min_advance_hours = p_min_advance_hours,
    max_advance_days = p_max_advance_days,
    quote_disclaimer = trim(coalesce(p_quote_disclaimer, '')),
    terms = trim(coalesce(p_terms, '')),
    deposit_enabled = coalesce(p_deposit_enabled, false),
    deposit_type = p_deposit_type,
    deposit_value = round(p_deposit_value, 2),
    deposit_due_days = p_deposit_due_days,
    portal_base_url = regexp_replace(v_portal_base_url, '/+$', ''),
    reminders_enabled = coalesce(p_reminders_enabled, true),
    deposit_reminder_days_before = p_deposit_reminder_days_before,
    event_reminder_hours_before = p_event_reminder_hours_before,
    balance_reminder_hours_before = p_balance_reminder_hours_before,
    checklist_reminder_hours_before = p_checklist_reminder_hours_before,
    updated_at = now()
  where id = 1;

  return jsonb_build_object('ok', true);
end;
$$;

revoke all on function public.update_event_settings(
  boolean, integer, integer, integer, integer, text, text,
  boolean, text, numeric, integer, text,
  boolean, integer, integer, integer, integer
) from public;

grant execute on function public.update_event_settings(
  boolean, integer, integer, integer, integer, text, text,
  boolean, text, numeric, integer, text,
  boolean, integer, integer, integer, integer
) to authenticated;

-- ============================================================
-- HISTORIAL DE RECORDATORIOS
-- ============================================================

create table if not exists public.event_reminders (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.event_requests(id) on delete cascade,
  reminder_type text not null check (
    reminder_type in (
      'deposit_due',
      'event_upcoming',
      'balance_pending',
      'checklist_incomplete'
    )
  ),
  reminder_key text not null unique,
  title text not null,
  body text not null,
  scheduled_for timestamptz not null,
  sent_at timestamptz,
  handled_at timestamptz,
  handled_by uuid references public.profiles(id) on delete set null,
  attempt_count integer not null default 0,
  last_attempt_at timestamptz,
  push_error text,
  created_at timestamptz not null default now()
);

create index if not exists event_reminders_request_idx
  on public.event_reminders(request_id, created_at desc);
create index if not exists event_reminders_pending_idx
  on public.event_reminders(sent_at, scheduled_for)
  where sent_at is null;

alter table public.event_reminders enable row level security;
revoke all on table public.event_reminders from anon, authenticated;

-- ============================================================
-- GENERAR RECORDATORIOS VENCIDOS
-- ============================================================

create or replace function public.generate_event_reminders()
returns integer
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_timezone text := 'America/Mexico_City';
  v_now_local timestamp;
  v_created integer := 0;
  v_rows integer := 0;
begin
  select coalesce(nullif(trim(bs.timezone), ''), 'America/Mexico_City')
  into v_timezone
  from public.business_settings bs
  where bs.id = 1;

  v_now_local := now() at time zone v_timezone;

  -- Anticipo pendiente antes de la fecha límite.
  insert into public.event_reminders(
    request_id, reminder_type, reminder_key, title, body, scheduled_for
  )
  select
    r.id,
    'deposit_due',
    'deposit:' || r.id::text || ':' || r.payment_due_date::text,
    '💳 Anticipo pendiente · Evento #' || r.folio,
    coalesce(nullif(trim(r.customer_name), ''), 'Cliente') ||
      ' · faltan $' || to_char(greatest(0, r.required_deposit_amount - coalesce(pay.total_paid, 0)), 'FM999999990.00') ||
      ' de anticipo · vence ' || to_char(r.payment_due_date, 'DD/MM/YYYY'),
    ((r.payment_due_date + time '10:00') - make_interval(days => s.deposit_reminder_days_before)) at time zone v_timezone
  from public.event_requests r
  cross join public.event_settings s
  left join lateral (
    select coalesce(sum(ep.amount), 0) as total_paid
    from public.event_payments ep
    where ep.request_id = r.id
  ) pay on true
  where s.id = 1
    and s.reminders_enabled = true
    and r.status = 'accepted'
    and r.payment_due_date is not null
    and r.required_deposit_amount > coalesce(pay.total_paid, 0)
    and v_now_local >= ((r.payment_due_date + time '10:00') - make_interval(days => s.deposit_reminder_days_before))
    and v_now_local < (r.payment_due_date::timestamp + interval '1 day')
  on conflict (reminder_key) do nothing;
  get diagnostics v_rows = row_count;
  v_created := v_created + v_rows;

  -- Evento próximo.
  insert into public.event_reminders(
    request_id, reminder_type, reminder_key, title, body, scheduled_for
  )
  select
    r.id,
    'event_upcoming',
    'upcoming:' || r.id::text || ':' || r.event_date::text || ':' || coalesce(r.event_time::text, ''),
    '🎉 Evento próximo · Folio #' || r.folio,
    coalesce(nullif(trim(r.customer_name), ''), 'Cliente') ||
      ' · ' || to_char(r.event_date, 'DD/MM/YYYY') ||
      case when r.event_time is not null then ' ' || to_char(r.event_time, 'HH24:MI') else '' end ||
      ' · ' || r.guest_count || ' personas',
    ((r.event_date + coalesce(r.event_time, time '12:00')) - make_interval(hours => s.event_reminder_hours_before)) at time zone v_timezone
  from public.event_requests r
  cross join public.event_settings s
  where s.id = 1
    and s.reminders_enabled = true
    and r.status = 'confirmed'
    and v_now_local >= ((r.event_date + coalesce(r.event_time, time '12:00')) - make_interval(hours => s.event_reminder_hours_before))
    and v_now_local < (r.event_date + coalesce(r.event_time, time '12:00'))
  on conflict (reminder_key) do nothing;
  get diagnostics v_rows = row_count;
  v_created := v_created + v_rows;

  -- Saldo pendiente antes del evento (mientras aún no se haya enviado a POS).
  insert into public.event_reminders(
    request_id, reminder_type, reminder_key, title, body, scheduled_for
  )
  select
    r.id,
    'balance_pending',
    'balance:' || r.id::text || ':' || r.event_date::text || ':' || coalesce(r.event_time::text, ''),
    '💰 Saldo pendiente · Evento #' || r.folio,
    coalesce(nullif(trim(r.customer_name), ''), 'Cliente') ||
      ' · saldo $' || to_char(greatest(0, coalesce(r.quoted_total, r.estimated_total, 0) - coalesce(pay.total_paid, 0)), 'FM999999990.00'),
    ((r.event_date + coalesce(r.event_time, time '12:00')) - make_interval(hours => s.balance_reminder_hours_before)) at time zone v_timezone
  from public.event_requests r
  cross join public.event_settings s
  left join lateral (
    select coalesce(sum(ep.amount), 0) as total_paid
    from public.event_payments ep
    where ep.request_id = r.id
  ) pay on true
  where s.id = 1
    and s.reminders_enabled = true
    and r.status = 'confirmed'
    and r.pos_order_id is null
    and coalesce(r.quoted_total, r.estimated_total, 0) > coalesce(pay.total_paid, 0)
    and v_now_local >= ((r.event_date + coalesce(r.event_time, time '12:00')) - make_interval(hours => s.balance_reminder_hours_before))
    and v_now_local < (r.event_date + coalesce(r.event_time, time '12:00'))
  on conflict (reminder_key) do nothing;
  get diagnostics v_rows = row_count;
  v_created := v_created + v_rows;

  -- Checklist incompleto cerca del evento.
  insert into public.event_reminders(
    request_id, reminder_type, reminder_key, title, body, scheduled_for
  )
  select
    r.id,
    'checklist_incomplete',
    'checklist:' || r.id::text || ':' || r.event_date::text || ':' || coalesce(r.event_time::text, ''),
    '✅ Checklist incompleto · Evento #' || r.folio,
    coalesce(nullif(trim(r.customer_name), ''), 'Cliente') ||
      ' · quedan ' || pending.pending_count || ' tareas pendientes',
    ((r.event_date + coalesce(r.event_time, time '12:00')) - make_interval(hours => s.checklist_reminder_hours_before)) at time zone v_timezone
  from public.event_requests r
  cross join public.event_settings s
  join lateral (
    select count(*)::integer as pending_count
    from public.event_operation_checklist c
    where c.request_id = r.id
      and c.is_completed = false
  ) pending on pending.pending_count > 0
  where s.id = 1
    and s.reminders_enabled = true
    and r.status = 'confirmed'
    and v_now_local >= ((r.event_date + coalesce(r.event_time, time '12:00')) - make_interval(hours => s.checklist_reminder_hours_before))
    and v_now_local < (r.event_date + coalesce(r.event_time, time '12:00'))
  on conflict (reminder_key) do nothing;
  get diagnostics v_rows = row_count;
  v_created := v_created + v_rows;

  return v_created;
end;
$$;

revoke all on function public.generate_event_reminders() from public;

-- ============================================================
-- DESPACHAR PUSH PENDIENTES CON RETRY
-- ============================================================

create or replace function public.dispatch_pending_event_reminders()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  project_url text;
  v_reminder record;
  v_dispatched integer := 0;
begin
  select decrypted_secret
  into project_url
  from vault.decrypted_secrets
  where name = 'project_url'
  limit 1;

  if project_url is null or btrim(project_url) = '' then
    raise warning 'Vault secret project_url is not configured. Event reminder push skipped.';
    return 0;
  end if;

  for v_reminder in
    select id
    from public.event_reminders
    where sent_at is null
      and scheduled_for <= now()
      and attempt_count < 8
      and (last_attempt_at is null or last_attempt_at <= now() - interval '15 minutes')
    order by scheduled_for, created_at
    limit 20
    for update skip locked
  loop
    update public.event_reminders
    set
      attempt_count = attempt_count + 1,
      last_attempt_at = now(),
      push_error = null
    where id = v_reminder.id;

    perform net.http_post(
      url := rtrim(project_url, '/') || '/functions/v1/event-reminder-push',
      headers := jsonb_build_object('Content-Type', 'application/json'),
      body := jsonb_build_object('reminderId', v_reminder.id),
      timeout_milliseconds := 5000
    );

    v_dispatched := v_dispatched + 1;
  end loop;

  return v_dispatched;
end;
$$;

revoke all on function public.dispatch_pending_event_reminders() from public;

create or replace function public.process_event_reminders()
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_created integer;
  v_dispatched integer;
begin
  v_created := public.generate_event_reminders();
  v_dispatched := public.dispatch_pending_event_reminders();
  return jsonb_build_object('created', v_created, 'dispatched', v_dispatched);
end;
$$;

revoke all on function public.process_event_reminders() from public;

-- Prueba manual desde el panel/admin sin esperar el cron.
create or replace function public.process_event_reminders_admin()
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null or not exists (
    select 1
    from public.profiles
    where id = v_user_id
      and is_active = true
      and role::text = 'admin'
  ) then
    raise exception 'No tienes permisos para procesar recordatorios';
  end if;

  return public.process_event_reminders();
end;
$$;

revoke all on function public.process_event_reminders_admin() from public;
grant execute on function public.process_event_reminders_admin() to authenticated;

create or replace function public.mark_event_reminder_handled_admin(p_reminder_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null or not exists (
    select 1
    from public.profiles
    where id = v_user_id
      and is_active = true
      and role::text = 'admin'
  ) then
    raise exception 'No tienes permisos para actualizar recordatorios';
  end if;

  update public.event_reminders
  set
    handled_at = coalesce(handled_at, now()),
    handled_by = coalesce(handled_by, v_user_id)
  where id = p_reminder_id;

  if not found then
    raise exception 'Recordatorio no encontrado';
  end if;

  return jsonb_build_object('ok', true);
end;
$$;

revoke all on function public.mark_event_reminder_handled_admin(uuid) from public;
grant execute on function public.mark_event_reminder_handled_admin(uuid) to authenticated;

-- ============================================================
-- BANDEJA ADMIN: INCLUIR RECORDATORIOS
-- ============================================================

create or replace function public.get_event_requests_admin()
returns jsonb
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_result jsonb;
begin
  if v_user_id is null or not exists (
    select 1 from public.profiles
    where id = v_user_id
      and is_active = true
      and role::text = 'admin'
  ) then
    raise exception 'No tienes permisos para consultar solicitudes de eventos';
  end if;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', r.id,
        'folio', r.folio,
        'status', r.status,
        'eventTypeId', r.event_type_id,
        'eventTypeName', coalesce(r.event_type_name, t.name, ''),
        'packageId', r.package_id,
        'packageName', coalesce(r.package_name, p.name, ''),
        'eventDate', r.event_date,
        'eventTime', r.event_time,
        'guestCount', r.guest_count,
        'customerName', r.customer_name,
        'customerPhone', coalesce(r.customer_phone, ''),
        'customerEmail', coalesce(r.customer_email, ''),
        'customerNotes', coalesce(r.customer_notes, ''),
        'packageBasePrice', r.package_base_price,
        'packageIncludedGuests', r.package_included_guests,
        'packageExtraGuestPrice', r.package_extra_guest_price,
        'additionalGuestCount', r.additional_guest_count,
        'additionalGuestSubtotal', r.additional_guest_subtotal,
        'estimatedTotal', r.estimated_total,
        'quotedTotal', r.quoted_total,
        'adminNotes', coalesce(r.admin_notes, ''),
        'requiredDepositAmount', r.required_deposit_amount,
        'paymentDueDate', r.payment_due_date,
        'paidAmount', coalesce(pay.total_paid, 0),
        'pendingDepositAmount', greatest(0, r.required_deposit_amount - coalesce(pay.total_paid, 0)),
        'paymentStatus', case
          when r.required_deposit_amount <= 0 then 'not_required'
          when coalesce(pay.total_paid, 0) <= 0 then 'pending'
          when coalesce(pay.total_paid, 0) < r.required_deposit_amount then 'partial'
          else 'paid'
        end,
        'confirmedAt', r.confirmed_at,
        'operationStatus', r.operation_status,
        'operationNotes', coalesce(r.operation_notes, ''),
        'posOrderId', r.pos_order_id,
        'posOrderStatus', coalesce(o.status, ''),
        'posOrderTotal', o.total,
        'posOrderCreatedAt', r.pos_order_created_at,
        'operationCompletedAt', r.operation_completed_at,
        'remainingBalance', case
          when o.status = 'delivered' then 0
          else greatest(0, coalesce(r.quoted_total, r.estimated_total, 0) - coalesce(pay.total_paid, 0))
        end,
        'createdAt', r.created_at,
        'updatedAt', r.updated_at,
        'extras', coalesce((
          select jsonb_agg(
            jsonb_build_object(
              'id', re.id,
              'extraId', re.extra_id,
              'extraName', re.extra_name,
              'pricingType', re.pricing_type,
              'unitPrice', re.unit_price,
              'quantity', re.quantity,
              'subtotal', re.subtotal
            ) order by re.id
          )
          from public.event_request_extras re
          where re.request_id = r.id
        ), '[]'::jsonb),
        'payments', coalesce((
          select jsonb_agg(
            jsonb_build_object(
              'id', ep.id,
              'amount', ep.amount,
              'method', ep.method,
              'reference', coalesce(ep.reference, ''),
              'notes', coalesce(ep.notes, ''),
              'paidAt', ep.paid_at,
              'createdAt', ep.created_at
            ) order by ep.paid_at desc, ep.created_at desc
          )
          from public.event_payments ep
          where ep.request_id = r.id
        ), '[]'::jsonb),
        'operationChecklist', coalesce((
          select jsonb_agg(
            jsonb_build_object(
              'id', c.id,
              'label', c.label,
              'position', c.position,
              'isCompleted', c.is_completed,
              'completedAt', c.completed_at
            ) order by c.position
          )
          from public.event_operation_checklist c
          where c.request_id = r.id
        ), '[]'::jsonb),
        'operationHistory', coalesce((
          select jsonb_agg(h.row_data order by h.created_at desc)
          from (
            select
              oh.created_at,
              jsonb_build_object(
                'id', oh.id,
                'action', oh.action,
                'details', oh.details,
                'createdAt', oh.created_at
              ) as row_data
            from public.event_operation_history oh
            where oh.request_id = r.id
            order by oh.created_at desc
            limit 25
          ) h
        ), '[]'::jsonb),
        'reminders', coalesce((
          select jsonb_agg(x.row_data order by x.created_at desc)
          from (
            select
              er.created_at,
              jsonb_build_object(
                'id', er.id,
                'type', er.reminder_type,
                'title', er.title,
                'body', er.body,
                'scheduledFor', er.scheduled_for,
                'sentAt', er.sent_at,
                'handledAt', er.handled_at,
                'attemptCount', er.attempt_count,
                'pushError', coalesce(er.push_error, ''),
                'createdAt', er.created_at
              ) as row_data
            from public.event_reminders er
            where er.request_id = r.id
            order by er.created_at desc
            limit 20
          ) x
        ), '[]'::jsonb)
      )
      order by r.created_at desc, r.folio desc
    ),
    '[]'::jsonb
  )
  into v_result
  from public.event_requests r
  left join public.event_types t on t.id = r.event_type_id
  left join public.event_packages p on p.id = r.package_id
  left join public.orders o on o.id = r.pos_order_id
  left join lateral (
    select sum(ep.amount) as total_paid
    from public.event_payments ep
    where ep.request_id = r.id
  ) pay on true;

  return v_result;
end;
$$;

revoke all on function public.get_event_requests_admin() from public;
grant execute on function public.get_event_requests_admin() to authenticated;

-- ============================================================
-- CRON CADA 15 MINUTOS
-- ============================================================

create extension if not exists pg_cron;

do $$
begin
  perform cron.unschedule('event-reminders-15m');
exception
  when others then null;
end;
$$;

select cron.schedule(
  'event-reminders-15m',
  '*/15 * * * *',
  $cron$select public.process_event_reminders();$cron$
);
