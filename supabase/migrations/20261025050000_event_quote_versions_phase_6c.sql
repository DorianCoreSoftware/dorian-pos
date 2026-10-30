-- Fase 6C: cotizaciones formales versionadas para eventos

create table if not exists public.event_quote_versions (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.event_requests(id) on delete cascade,
  folio bigint not null,
  version integer not null,
  business_name text not null,
  currency_code text not null,
  customer_name text not null,
  customer_phone text,
  customer_email text,
  event_type_name text,
  package_name text,
  event_date date not null,
  event_time time,
  guest_count integer not null,
  package_base_price numeric(12,2) not null default 0,
  package_extra_guest_price numeric(12,2) not null default 0,
  additional_guest_count integer not null default 0,
  additional_guest_subtotal numeric(12,2) not null default 0,
  extras jsonb not null default '[]'::jsonb,
  estimated_total numeric(12,2) not null default 0,
  quoted_total numeric(12,2),
  effective_total numeric(12,2) not null default 0,
  required_deposit_amount numeric(12,2) not null default 0,
  paid_amount numeric(12,2) not null default 0,
  pending_deposit_amount numeric(12,2) not null default 0,
  payment_due_date date,
  terms text,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  constraint event_quote_versions_request_version_key unique (request_id, version),
  constraint event_quote_versions_version_check check (version > 0),
  constraint event_quote_versions_guest_count_check check (guest_count > 0)
);

create index if not exists idx_event_quote_versions_request_created
  on public.event_quote_versions(request_id, created_at desc);

alter table public.event_quote_versions enable row level security;

-- No direct table access. All reads/writes go through admin-only RPCs.
revoke all on table public.event_quote_versions from anon, authenticated;

create or replace function public.create_event_quote_version_admin(
  p_request_id uuid,
  p_business_name text,
  p_currency_code text
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_request public.event_requests%rowtype;
  v_version integer;
  v_quote_id uuid;
  v_paid numeric(12,2) := 0;
  v_effective_total numeric(12,2) := 0;
  v_terms text := '';
  v_extras jsonb := '[]'::jsonb;
  v_row public.event_quote_versions%rowtype;
begin
  if v_user_id is null or not exists (
    select 1 from public.profiles
    where id = v_user_id
      and is_active = true
      and role::text = 'admin'
  ) then
    raise exception 'No tienes permisos para generar cotizaciones de eventos';
  end if;

  if length(trim(coalesce(p_business_name, ''))) = 0 then
    raise exception 'El nombre del negocio es obligatorio';
  end if;

  if length(trim(coalesce(p_business_name, ''))) > 160 then
    raise exception 'El nombre del negocio no puede superar 160 caracteres';
  end if;

  if length(trim(coalesce(p_currency_code, ''))) < 3
     or length(trim(coalesce(p_currency_code, ''))) > 8 then
    raise exception 'La moneda no es válida';
  end if;

  select * into v_request
  from public.event_requests
  where id = p_request_id
  for update;

  if not found then
    raise exception 'Solicitud de evento no encontrada';
  end if;

  select coalesce(sum(amount), 0)
  into v_paid
  from public.event_payments
  where request_id = p_request_id;

  v_effective_total := coalesce(v_request.quoted_total, v_request.estimated_total, 0);

  select coalesce(terms, '')
  into v_terms
  from public.event_settings
  where id = 1;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', re.id,
        'extraId', re.extra_id,
        'extraName', re.extra_name,
        'pricingType', re.pricing_type,
        'unitPrice', re.unit_price,
        'quantity', re.quantity,
        'subtotal', re.subtotal
      ) order by re.id
    ),
    '[]'::jsonb
  )
  into v_extras
  from public.event_request_extras re
  where re.request_id = p_request_id;

  select coalesce(max(version), 0) + 1
  into v_version
  from public.event_quote_versions
  where request_id = p_request_id;

  insert into public.event_quote_versions (
    request_id,
    folio,
    version,
    business_name,
    currency_code,
    customer_name,
    customer_phone,
    customer_email,
    event_type_name,
    package_name,
    event_date,
    event_time,
    guest_count,
    package_base_price,
    package_extra_guest_price,
    additional_guest_count,
    additional_guest_subtotal,
    extras,
    estimated_total,
    quoted_total,
    effective_total,
    required_deposit_amount,
    paid_amount,
    pending_deposit_amount,
    payment_due_date,
    terms,
    created_by
  ) values (
    p_request_id,
    v_request.folio,
    v_version,
    trim(p_business_name),
    upper(trim(p_currency_code)),
    v_request.customer_name,
    v_request.customer_phone,
    v_request.customer_email,
    coalesce(v_request.event_type_name, ''),
    coalesce(v_request.package_name, ''),
    v_request.event_date,
    v_request.event_time,
    v_request.guest_count,
    coalesce(v_request.package_base_price, 0),
    coalesce(v_request.package_extra_guest_price, 0),
    coalesce(v_request.additional_guest_count, 0),
    coalesce(v_request.additional_guest_subtotal, 0),
    v_extras,
    coalesce(v_request.estimated_total, 0),
    v_request.quoted_total,
    v_effective_total,
    coalesce(v_request.required_deposit_amount, 0),
    v_paid,
    greatest(0, coalesce(v_request.required_deposit_amount, 0) - v_paid),
    v_request.payment_due_date,
    v_terms,
    v_user_id
  )
  returning id into v_quote_id;

  select * into v_row
  from public.event_quote_versions
  where id = v_quote_id;

  return jsonb_build_object(
    'id', v_row.id,
    'requestId', v_row.request_id,
    'folio', v_row.folio,
    'version', v_row.version,
    'businessName', v_row.business_name,
    'currencyCode', v_row.currency_code,
    'customerName', v_row.customer_name,
    'customerPhone', coalesce(v_row.customer_phone, ''),
    'customerEmail', coalesce(v_row.customer_email, ''),
    'eventTypeName', coalesce(v_row.event_type_name, ''),
    'packageName', coalesce(v_row.package_name, ''),
    'eventDate', v_row.event_date,
    'eventTime', v_row.event_time,
    'guestCount', v_row.guest_count,
    'packageBasePrice', v_row.package_base_price,
    'packageExtraGuestPrice', v_row.package_extra_guest_price,
    'additionalGuestCount', v_row.additional_guest_count,
    'additionalGuestSubtotal', v_row.additional_guest_subtotal,
    'extras', v_row.extras,
    'estimatedTotal', v_row.estimated_total,
    'quotedTotal', v_row.quoted_total,
    'effectiveTotal', v_row.effective_total,
    'requiredDepositAmount', v_row.required_deposit_amount,
    'paidAmount', v_row.paid_amount,
    'pendingDepositAmount', v_row.pending_deposit_amount,
    'paymentDueDate', v_row.payment_due_date,
    'terms', coalesce(v_row.terms, ''),
    'createdAt', v_row.created_at
  );
end;
$$;

revoke all on function public.create_event_quote_version_admin(uuid, text, text) from public;
grant execute on function public.create_event_quote_version_admin(uuid, text, text) to authenticated;

create or replace function public.get_event_quote_versions_admin(
  p_request_id uuid
)
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
    raise exception 'No tienes permisos para consultar cotizaciones de eventos';
  end if;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', q.id,
        'requestId', q.request_id,
        'folio', q.folio,
        'version', q.version,
        'effectiveTotal', q.effective_total,
        'requiredDepositAmount', q.required_deposit_amount,
        'paidAmount', q.paid_amount,
        'pendingDepositAmount', q.pending_deposit_amount,
        'createdAt', q.created_at
      ) order by q.version desc
    ),
    '[]'::jsonb
  )
  into v_result
  from public.event_quote_versions q
  where q.request_id = p_request_id;

  return v_result;
end;
$$;

revoke all on function public.get_event_quote_versions_admin(uuid) from public;
grant execute on function public.get_event_quote_versions_admin(uuid) to authenticated;

create or replace function public.get_event_quote_version_admin(
  p_quote_version_id uuid
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_row public.event_quote_versions%rowtype;
begin
  if v_user_id is null or not exists (
    select 1 from public.profiles
    where id = v_user_id
      and is_active = true
      and role::text = 'admin'
  ) then
    raise exception 'No tienes permisos para consultar cotizaciones de eventos';
  end if;

  select * into v_row
  from public.event_quote_versions
  where id = p_quote_version_id;

  if not found then
    raise exception 'Versión de cotización no encontrada';
  end if;

  return jsonb_build_object(
    'id', v_row.id,
    'requestId', v_row.request_id,
    'folio', v_row.folio,
    'version', v_row.version,
    'businessName', v_row.business_name,
    'currencyCode', v_row.currency_code,
    'customerName', v_row.customer_name,
    'customerPhone', coalesce(v_row.customer_phone, ''),
    'customerEmail', coalesce(v_row.customer_email, ''),
    'eventTypeName', coalesce(v_row.event_type_name, ''),
    'packageName', coalesce(v_row.package_name, ''),
    'eventDate', v_row.event_date,
    'eventTime', v_row.event_time,
    'guestCount', v_row.guest_count,
    'packageBasePrice', v_row.package_base_price,
    'packageExtraGuestPrice', v_row.package_extra_guest_price,
    'additionalGuestCount', v_row.additional_guest_count,
    'additionalGuestSubtotal', v_row.additional_guest_subtotal,
    'extras', v_row.extras,
    'estimatedTotal', v_row.estimated_total,
    'quotedTotal', v_row.quoted_total,
    'effectiveTotal', v_row.effective_total,
    'requiredDepositAmount', v_row.required_deposit_amount,
    'paidAmount', v_row.paid_amount,
    'pendingDepositAmount', v_row.pending_deposit_amount,
    'paymentDueDate', v_row.payment_due_date,
    'terms', coalesce(v_row.terms, ''),
    'createdAt', v_row.created_at
  );
end;
$$;

revoke all on function public.get_event_quote_version_admin(uuid) from public;
grant execute on function public.get_event_quote_version_admin(uuid) to authenticated;
