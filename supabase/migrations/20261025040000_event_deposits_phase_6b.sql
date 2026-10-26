-- ============================================================
-- DORIAN POS
-- EVENTOS - FASE 6B
-- Anticipos, pagos manuales y confirmación formal
-- ============================================================

alter table public.event_settings
  add column if not exists deposit_enabled boolean not null default false,
  add column if not exists deposit_type text not null default 'percentage',
  add column if not exists deposit_value numeric(12,2) not null default 50,
  add column if not exists deposit_due_days integer not null default 2;

alter table public.event_settings
  drop constraint if exists event_settings_deposit_type_check,
  add constraint event_settings_deposit_type_check
    check (deposit_type in ('percentage', 'fixed')),
  drop constraint if exists event_settings_deposit_value_check,
  add constraint event_settings_deposit_value_check
    check (deposit_value >= 0),
  drop constraint if exists event_settings_deposit_due_days_check,
  add constraint event_settings_deposit_due_days_check
    check (deposit_due_days between 0 and 365);

alter table public.event_requests
  add column if not exists required_deposit_amount numeric(12,2) not null default 0,
  add column if not exists payment_due_date date,
  add column if not exists confirmed_at timestamptz;

alter table public.event_requests
  drop constraint if exists event_requests_status_check;

alter table public.event_requests
  add constraint event_requests_status_check
    check (
      status in (
        'new',
        'reviewing',
        'quoted',
        'accepted',
        'confirmed',
        'rejected',
        'cancelled',
        'completed'
      )
    );

create table if not exists public.event_payments (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.event_requests(id) on delete cascade,
  amount numeric(12,2) not null check (amount > 0),
  method text not null check (method in ('cash', 'card', 'transfer', 'other')),
  reference text,
  notes text,
  paid_at timestamptz not null default now(),
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists event_payments_request_paid_at_idx
  on public.event_payments (request_id, paid_at desc);

alter table public.event_payments enable row level security;
revoke all on public.event_payments from anon, authenticated;

-- ============================================================
-- CONFIGURACIÓN DE ANTICIPO
-- ============================================================

drop function if exists public.update_event_settings(
  boolean,
  integer,
  integer,
  integer,
  integer,
  text,
  text
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
  p_deposit_due_days integer
)
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
    updated_at = now()
  where id = 1;

  return jsonb_build_object('ok', true);
end;
$$;

revoke all on function public.update_event_settings(
  boolean, integer, integer, integer, integer, text, text,
  boolean, text, numeric, integer
) from public;

grant execute on function public.update_event_settings(
  boolean, integer, integer, integer, integer, text, text,
  boolean, text, numeric, integer
) to authenticated;

-- ============================================================
-- DISPONIBILIDAD: ACEPTADA Y CONFIRMADA RESERVAN CAPACIDAD
-- ============================================================

create or replace function public.event_slot_is_available(
  p_event_date date,
  p_event_time time,
  p_duration_minutes integer,
  p_exclude_request_id uuid default null
)
returns boolean
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  v_enabled boolean := false;
  v_max_simultaneous integer := 1;
  v_rule_enabled boolean := false;
  v_start_time time;
  v_end_time time;
  v_candidate_end timestamp;
  v_overlap_count integer := 0;
begin
  if p_event_date is null
     or p_event_time is null
     or coalesce(p_duration_minutes, 0) <= 0 then
    return false;
  end if;

  select enabled, max_simultaneous_events
  into v_enabled, v_max_simultaneous
  from public.event_availability_settings
  where id = 1;

  if not coalesce(v_enabled, false) then
    return true;
  end if;

  select is_enabled, start_time, end_time
  into v_rule_enabled, v_start_time, v_end_time
  from public.event_availability_rules
  where day_of_week = extract(dow from p_event_date)::integer;

  if not coalesce(v_rule_enabled, false) then
    return false;
  end if;

  v_candidate_end :=
    p_event_date + p_event_time
    + make_interval(mins => p_duration_minutes);

  if p_event_time < v_start_time
     or v_candidate_end > (p_event_date + v_end_time) then
    return false;
  end if;

  if exists (
    select 1
    from public.event_availability_blocks b
    where b.event_date = p_event_date
      and (
        b.full_day
        or (
          b.start_time < v_candidate_end::time
          and b.end_time > p_event_time
        )
      )
  ) then
    return false;
  end if;

  select count(*)
  into v_overlap_count
  from public.event_requests r
  left join public.event_packages p on p.id = r.package_id
  where r.event_date = p_event_date
    and r.status in ('accepted', 'confirmed')
    and r.event_time is not null
    and (p_exclude_request_id is null or r.id <> p_exclude_request_id)
    and r.event_time < v_candidate_end::time
    and (
      p_event_date + r.event_time
      + make_interval(
          mins => greatest(
            1,
            coalesce(
              nullif(r.package_duration_minutes, 0),
              p.duration_minutes,
              120
            )
          )
        )
    ) > (p_event_date + p_event_time);

  return v_overlap_count < greatest(1, v_max_simultaneous);
end;
$$;

revoke all on function public.event_slot_is_available(date, time, integer, uuid) from public;

create or replace function public.enforce_event_request_availability()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_enabled boolean := false;
  v_duration integer;
  v_old_reserves boolean := false;
  v_new_reserves boolean := false;
begin
  select enabled
  into v_enabled
  from public.event_availability_settings
  where id = 1;

  select duration_minutes
  into v_duration
  from public.event_packages
  where id = new.package_id;

  if coalesce(new.package_duration_minutes, 0) <= 0 then
    new.package_duration_minutes := greatest(1, coalesce(v_duration, 120));
  end if;

  if not coalesce(v_enabled, false) then
    return new;
  end if;

  if new.event_time is null then
    raise exception 'Selecciona un horario disponible para el evento';
  end if;

  if tg_op = 'INSERT' then
    if not public.event_slot_is_available(
      new.event_date,
      new.event_time,
      new.package_duration_minutes,
      null
    ) then
      raise exception 'El horario seleccionado ya no está disponible';
    end if;
  end if;

  v_new_reserves := new.status in ('accepted', 'confirmed');
  if tg_op = 'UPDATE' then
    v_old_reserves := old.status in ('accepted', 'confirmed');
  end if;

  if v_new_reserves and not v_old_reserves then
    if not public.event_slot_is_available(
      new.event_date,
      new.event_time,
      new.package_duration_minutes,
      new.id
    ) then
      raise exception 'El horario ya no está disponible para confirmar este evento';
    end if;
  end if;

  return new;
end;
$$;

-- ============================================================
-- SOLICITUDES: SNAPSHOT DE ANTICIPO + ESTADO CONFIRMADO
-- ============================================================

create or replace function public.update_event_request_admin(
  p_request_id uuid,
  p_status text,
  p_quoted_total numeric,
  p_admin_notes text
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_current public.event_requests%rowtype;
  v_deposit_enabled boolean := false;
  v_deposit_type text := 'percentage';
  v_deposit_value numeric(12,2) := 0;
  v_deposit_due_days integer := 0;
  v_effective_total numeric(12,2);
  v_required numeric(12,2);
  v_paid numeric(12,2);
begin
  if v_user_id is null or not exists (
    select 1 from public.profiles
    where id = v_user_id
      and is_active = true
      and role::text = 'admin'
  ) then
    raise exception 'No tienes permisos para actualizar solicitudes de eventos';
  end if;

  if p_status not in (
    'new', 'reviewing', 'quoted', 'accepted', 'confirmed',
    'rejected', 'cancelled', 'completed'
  ) then
    raise exception 'Estado de solicitud no válido';
  end if;

  if p_quoted_total is not null and p_quoted_total < 0 then
    raise exception 'El total cotizado no puede ser negativo';
  end if;

  if length(trim(coalesce(p_admin_notes, ''))) > 3000 then
    raise exception 'Las notas internas no pueden superar 3000 caracteres';
  end if;

  select * into v_current
  from public.event_requests
  where id = p_request_id
  for update;

  if not found then
    raise exception 'Solicitud de evento no encontrada';
  end if;

  v_effective_total := coalesce(p_quoted_total, v_current.quoted_total, v_current.estimated_total, 0);

  if p_status in ('accepted', 'confirmed')
     and v_current.status not in ('accepted', 'confirmed') then
    select deposit_enabled, deposit_type, deposit_value, deposit_due_days
    into v_deposit_enabled, v_deposit_type, v_deposit_value, v_deposit_due_days
    from public.event_settings
    where id = 1;

    if coalesce(v_deposit_enabled, false) then
      if v_deposit_type = 'percentage' then
        v_required := round(v_effective_total * v_deposit_value / 100.0, 2);
      else
        v_required := least(v_effective_total, round(v_deposit_value, 2));
      end if;
    else
      v_required := 0;
    end if;

    update public.event_requests
    set
      required_deposit_amount = greatest(0, coalesce(v_required, 0)),
      payment_due_date = case
        when greatest(0, coalesce(v_required, 0)) <= 0 then null
        else least(event_date, current_date + greatest(0, coalesce(v_deposit_due_days, 0)))
      end
    where id = p_request_id;
  end if;

  select coalesce(sum(amount), 0)
  into v_paid
  from public.event_payments
  where request_id = p_request_id;

  select required_deposit_amount
  into v_required
  from public.event_requests
  where id = p_request_id;

  if p_status = 'confirmed'
     and coalesce(v_required, 0) > coalesce(v_paid, 0) then
    raise exception 'El evento no puede confirmarse hasta cubrir el anticipo requerido';
  end if;

  if p_status = 'accepted' and coalesce(v_required, 0) <= coalesce(v_paid, 0) then
    p_status := 'confirmed';
  end if;

  update public.event_requests
  set
    status = p_status,
    quoted_total = p_quoted_total,
    admin_notes = nullif(trim(coalesce(p_admin_notes, '')), ''),
    confirmed_at = case
      when p_status = 'confirmed' then coalesce(confirmed_at, now())
      else confirmed_at
    end,
    updated_at = now()
  where id = p_request_id;

  return jsonb_build_object('ok', true, 'status', p_status);
end;
$$;

revoke all on function public.update_event_request_admin(uuid, text, numeric, text) from public;
grant execute on function public.update_event_request_admin(uuid, text, numeric, text) to authenticated;

-- ============================================================
-- REGISTRO MANUAL DE PAGOS
-- ============================================================

create or replace function public.add_event_payment_admin(
  p_request_id uuid,
  p_amount numeric,
  p_method text,
  p_reference text,
  p_notes text
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_request public.event_requests%rowtype;
  v_effective_total numeric(12,2);
  v_paid_before numeric(12,2);
  v_paid_after numeric(12,2);
  v_payment_id uuid;
begin
  if v_user_id is null or not exists (
    select 1 from public.profiles
    where id = v_user_id
      and is_active = true
      and role::text = 'admin'
  ) then
    raise exception 'No tienes permisos para registrar pagos de eventos';
  end if;

  if coalesce(p_amount, 0) <= 0 then
    raise exception 'El pago debe ser mayor a cero';
  end if;

  if p_method not in ('cash', 'card', 'transfer', 'other') then
    raise exception 'El método de pago no es válido';
  end if;

  if length(trim(coalesce(p_reference, ''))) > 160 then
    raise exception 'La referencia no puede superar 160 caracteres';
  end if;

  if length(trim(coalesce(p_notes, ''))) > 500 then
    raise exception 'Las notas del pago no pueden superar 500 caracteres';
  end if;

  select * into v_request
  from public.event_requests
  where id = p_request_id
  for update;

  if not found then
    raise exception 'Solicitud de evento no encontrada';
  end if;

  if v_request.status not in ('accepted', 'confirmed') then
    raise exception 'Primero acepta la solicitud antes de registrar un anticipo';
  end if;

  v_effective_total := coalesce(v_request.quoted_total, v_request.estimated_total, 0);

  select coalesce(sum(amount), 0)
  into v_paid_before
  from public.event_payments
  where request_id = p_request_id;

  if v_paid_before + p_amount > v_effective_total then
    raise exception 'El pago supera el total vigente del evento';
  end if;

  insert into public.event_payments (
    request_id,
    amount,
    method,
    reference,
    notes,
    created_by
  ) values (
    p_request_id,
    round(p_amount, 2),
    p_method,
    nullif(trim(coalesce(p_reference, '')), ''),
    nullif(trim(coalesce(p_notes, '')), ''),
    v_user_id
  )
  returning id into v_payment_id;

  v_paid_after := v_paid_before + round(p_amount, 2);

  if v_request.status = 'accepted'
     and v_paid_after >= coalesce(v_request.required_deposit_amount, 0) then
    update public.event_requests
    set
      status = 'confirmed',
      confirmed_at = coalesce(confirmed_at, now()),
      updated_at = now()
    where id = p_request_id;
  else
    update public.event_requests
    set updated_at = now()
    where id = p_request_id;
  end if;

  return jsonb_build_object(
    'ok', true,
    'paymentId', v_payment_id,
    'paidAmount', v_paid_after
  );
end;
$$;

revoke all on function public.add_event_payment_admin(uuid, numeric, text, text, text) from public;
grant execute on function public.add_event_payment_admin(uuid, numeric, text, text, text) to authenticated;

-- ============================================================
-- ADMIN INBOX CON RESUMEN FINANCIERO
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
