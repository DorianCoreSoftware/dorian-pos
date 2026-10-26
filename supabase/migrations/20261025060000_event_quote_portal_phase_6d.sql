-- Fase 6D: portal público seguro para cotizaciones de eventos

-- ============================================================
-- URL PÚBLICA BASE DEL PORTAL
-- ============================================================

alter table public.event_settings
  add column if not exists portal_base_url text not null default '';

drop function if exists public.update_event_settings(
  boolean,
  integer,
  integer,
  integer,
  integer,
  text,
  text,
  boolean,
  text,
  numeric,
  integer
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
  p_portal_base_url text
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

  if v_portal_base_url <> ''
     and v_portal_base_url !~* '^https?://[^[:space:]]+$' then
    raise exception 'La URL pública del portal debe comenzar con http:// o https://';
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
    updated_at = now()
  where id = 1;

  return jsonb_build_object('ok', true);
end;
$$;

revoke all on function public.update_event_settings(
  boolean, integer, integer, integer, integer, text, text,
  boolean, text, numeric, integer, text
) from public;

grant execute on function public.update_event_settings(
  boolean, integer, integer, integer, integer, text, text,
  boolean, text, numeric, integer, text
) to authenticated;

-- ============================================================
-- ANTICIPO PREVISTO EN NUEVAS VERSIONES DE COTIZACIÓN
-- ============================================================

create or replace function public.fill_event_quote_deposit_preview()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
declare
  v_enabled boolean := false;
  v_type text := 'percentage';
  v_value numeric(12,2) := 0;
  v_due_days integer := 0;
  v_required numeric(12,2) := 0;
begin
  if coalesce(new.required_deposit_amount, 0) > 0 then
    return new;
  end if;

  select
    deposit_enabled,
    deposit_type,
    deposit_value,
    deposit_due_days
  into
    v_enabled,
    v_type,
    v_value,
    v_due_days
  from public.event_settings
  where id = 1;

  if coalesce(v_enabled, false) then
    if v_type = 'percentage' then
      v_required := round(coalesce(new.effective_total, 0) * coalesce(v_value, 0) / 100.0, 2);
    else
      v_required := least(
        coalesce(new.effective_total, 0),
        round(coalesce(v_value, 0), 2)
      );
    end if;
  end if;

  new.required_deposit_amount := greatest(0, coalesce(v_required, 0));
  new.pending_deposit_amount := greatest(
    0,
    new.required_deposit_amount - coalesce(new.paid_amount, 0)
  );

  if new.required_deposit_amount > 0 then
    new.payment_due_date := least(
      new.event_date,
      current_date + greatest(0, coalesce(v_due_days, 0))
    );
  else
    new.payment_due_date := null;
  end if;

  return new;
end;
$$;

drop trigger if exists event_quote_versions_deposit_preview
  on public.event_quote_versions;

create trigger event_quote_versions_deposit_preview
before insert on public.event_quote_versions
for each row
execute function public.fill_event_quote_deposit_preview();

-- ============================================================
-- ENLACES SEGUROS DEL PORTAL
-- ============================================================

create table if not exists public.event_quote_portal_links (
  id uuid primary key default gen_random_uuid(),
  quote_version_id uuid not null
    references public.event_quote_versions(id) on delete cascade,
  token uuid not null default gen_random_uuid(),
  is_active boolean not null default true,
  expires_at timestamptz not null,
  response text,
  responded_at timestamptz,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  revoked_at timestamptz,
  constraint event_quote_portal_links_token_key unique (token),
  constraint event_quote_portal_links_response_check
    check (response is null or response in ('accepted', 'rejected'))
);

create index if not exists idx_event_quote_portal_links_quote
  on public.event_quote_portal_links(quote_version_id, created_at desc);

create unique index if not exists uq_event_quote_portal_links_active_quote
  on public.event_quote_portal_links(quote_version_id)
  where is_active = true;

alter table public.event_quote_portal_links enable row level security;
revoke all on table public.event_quote_portal_links from anon, authenticated;

-- ============================================================
-- ADMIN: CREAR / REUTILIZAR / REGENERAR LINK
-- ============================================================

create or replace function public.create_event_quote_portal_link_admin(
  p_quote_version_id uuid,
  p_expires_days integer default 30,
  p_regenerate boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_quote public.event_quote_versions%rowtype;
  v_link public.event_quote_portal_links%rowtype;
  v_base_url text;
begin
  if v_user_id is null or not exists (
    select 1
    from public.profiles
    where id = v_user_id
      and is_active = true
      and role::text = 'admin'
  ) then
    raise exception 'No tienes permisos para administrar enlaces de cotización';
  end if;

  if p_expires_days is null or p_expires_days not between 1 and 365 then
    raise exception 'La vigencia del enlace debe estar entre 1 y 365 días';
  end if;

  select * into v_quote
  from public.event_quote_versions
  where id = p_quote_version_id;

  if not found then
    raise exception 'Versión de cotización no encontrada';
  end if;

  select regexp_replace(trim(coalesce(portal_base_url, '')), '/+$', '')
  into v_base_url
  from public.event_settings
  where id = 1;

  if coalesce(v_base_url, '') = '' then
    raise exception 'Configura primero la URL pública base en Admin > Eventos > Configuración';
  end if;

  select * into v_link
  from public.event_quote_portal_links
  where quote_version_id = p_quote_version_id
    and is_active = true
    and expires_at > now()
  order by created_at desc
  limit 1;

  if found and not coalesce(p_regenerate, false) then
    return jsonb_build_object(
      'id', v_link.id,
      'quoteVersionId', v_link.quote_version_id,
      'requestId', v_quote.request_id,
      'version', v_quote.version,
      'token', v_link.token,
      'url', v_base_url || '/eventos/cotizacion/' || v_link.token::text,
      'isActive', v_link.is_active,
      'expiresAt', v_link.expires_at,
      'response', v_link.response,
      'respondedAt', v_link.responded_at,
      'createdAt', v_link.created_at
    );
  end if;

  if found and v_link.response is not null and coalesce(p_regenerate, false) then
    raise exception 'No se puede regenerar un enlace que ya fue respondido';
  end if;

  update public.event_quote_portal_links
  set
    is_active = false,
    revoked_at = coalesce(revoked_at, now())
  where quote_version_id = p_quote_version_id
    and is_active = true;

  insert into public.event_quote_portal_links (
    quote_version_id,
    expires_at,
    created_by
  ) values (
    p_quote_version_id,
    now() + make_interval(days => p_expires_days),
    v_user_id
  )
  returning * into v_link;

  return jsonb_build_object(
    'id', v_link.id,
    'quoteVersionId', v_link.quote_version_id,
    'requestId', v_quote.request_id,
    'version', v_quote.version,
    'token', v_link.token,
    'url', v_base_url || '/eventos/cotizacion/' || v_link.token::text,
    'isActive', v_link.is_active,
    'expiresAt', v_link.expires_at,
    'response', v_link.response,
    'respondedAt', v_link.responded_at,
    'createdAt', v_link.created_at
  );
end;
$$;

revoke all on function public.create_event_quote_portal_link_admin(uuid, integer, boolean) from public;
grant execute on function public.create_event_quote_portal_link_admin(uuid, integer, boolean) to authenticated;

create or replace function public.get_event_quote_portal_links_admin(
  p_request_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_base_url text;
begin
  if v_user_id is null or not exists (
    select 1
    from public.profiles
    where id = v_user_id
      and is_active = true
      and role::text = 'admin'
  ) then
    raise exception 'No tienes permisos para consultar enlaces de cotización';
  end if;

  select regexp_replace(trim(coalesce(portal_base_url, '')), '/+$', '')
  into v_base_url
  from public.event_settings
  where id = 1;

  return coalesce(
    (
      select jsonb_agg(
        jsonb_build_object(
          'id', l.id,
          'quoteVersionId', l.quote_version_id,
          'requestId', q.request_id,
          'version', q.version,
          'token', l.token,
          'url',
            case
              when coalesce(v_base_url, '') = '' then ''
              else v_base_url || '/eventos/cotizacion/' || l.token::text
            end,
          'isActive', l.is_active and l.expires_at > now(),
          'expiresAt', l.expires_at,
          'response', l.response,
          'respondedAt', l.responded_at,
          'createdAt', l.created_at
        )
        order by q.version desc, l.created_at desc
      )
      from public.event_quote_portal_links l
      join public.event_quote_versions q
        on q.id = l.quote_version_id
      where q.request_id = p_request_id
        and l.is_active = true
        and l.expires_at > now()
    ),
    '[]'::jsonb
  );
end;
$$;

revoke all on function public.get_event_quote_portal_links_admin(uuid) from public;
grant execute on function public.get_event_quote_portal_links_admin(uuid) to authenticated;

create or replace function public.revoke_event_quote_portal_link_admin(
  p_link_id uuid
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
    raise exception 'No tienes permisos para revocar enlaces de cotización';
  end if;

  update public.event_quote_portal_links
  set
    is_active = false,
    revoked_at = coalesce(revoked_at, now())
  where id = p_link_id;

  if not found then
    raise exception 'Enlace de cotización no encontrado';
  end if;

  return jsonb_build_object('ok', true);
end;
$$;

revoke all on function public.revoke_event_quote_portal_link_admin(uuid) from public;
grant execute on function public.revoke_event_quote_portal_link_admin(uuid) to authenticated;

-- ============================================================
-- PÚBLICO: CONSULTAR PORTAL POR TOKEN
-- ============================================================

create or replace function public.get_public_event_quote_portal(
  p_token text
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_token uuid;
  v_link public.event_quote_portal_links%rowtype;
  v_quote public.event_quote_versions%rowtype;
  v_request public.event_requests%rowtype;
  v_latest_version integer := 0;
  v_paid numeric(12,2) := 0;
  v_required numeric(12,2) := 0;
  v_pending numeric(12,2) := 0;
  v_due_date date;
  v_payment_status text := 'not_required';
  v_can_respond boolean := false;
  v_reason text := null;
  v_deposit_enabled boolean := false;
  v_deposit_type text := 'percentage';
  v_deposit_value numeric(12,2) := 0;
  v_due_days integer := 0;
begin
  begin
    v_token := p_token::uuid;
  exception when others then
    return jsonb_build_object('available', false, 'reason', 'invalid');
  end;

  select * into v_link
  from public.event_quote_portal_links
  where token = v_token;

  if not found then
    return jsonb_build_object('available', false, 'reason', 'invalid');
  end if;

  if not v_link.is_active then
    return jsonb_build_object('available', false, 'reason', 'revoked');
  end if;

  if v_link.expires_at <= now() then
    return jsonb_build_object('available', false, 'reason', 'expired');
  end if;

  select * into v_quote
  from public.event_quote_versions
  where id = v_link.quote_version_id;

  if not found then
    return jsonb_build_object('available', false, 'reason', 'invalid');
  end if;

  select * into v_request
  from public.event_requests
  where id = v_quote.request_id;

  if not found then
    return jsonb_build_object('available', false, 'reason', 'invalid');
  end if;

  select coalesce(max(version), 0)
  into v_latest_version
  from public.event_quote_versions
  where request_id = v_quote.request_id;

  if v_quote.version < v_latest_version then
    v_reason := 'superseded';
  end if;

  select coalesce(sum(amount), 0)
  into v_paid
  from public.event_payments
  where request_id = v_quote.request_id;

  v_required := coalesce(v_request.required_deposit_amount, 0);
  v_due_date := coalesce(v_request.payment_due_date, v_quote.payment_due_date);

  if v_request.status not in ('accepted', 'confirmed') and v_required <= 0 then
    v_required := coalesce(v_quote.required_deposit_amount, 0);

    if v_required <= 0 then
      select
        deposit_enabled,
        deposit_type,
        deposit_value,
        deposit_due_days
      into
        v_deposit_enabled,
        v_deposit_type,
        v_deposit_value,
        v_due_days
      from public.event_settings
      where id = 1;

      if coalesce(v_deposit_enabled, false) then
        if v_deposit_type = 'percentage' then
          v_required := round(v_quote.effective_total * coalesce(v_deposit_value, 0) / 100.0, 2);
        else
          v_required := least(v_quote.effective_total, round(coalesce(v_deposit_value, 0), 2));
        end if;

        v_due_date := least(
          v_quote.event_date,
          current_date + greatest(0, coalesce(v_due_days, 0))
        );
      end if;
    end if;
  end if;

  v_required := greatest(0, coalesce(v_required, 0));
  v_pending := greatest(0, v_required - v_paid);

  if v_required <= 0 then
    v_payment_status := 'not_required';
  elsif v_paid <= 0 then
    v_payment_status := 'pending';
  elsif v_paid < v_required then
    v_payment_status := 'partial';
  else
    v_payment_status := 'paid';
  end if;

  v_can_respond :=
    v_link.response is null
    and v_reason is null
    and v_request.status in ('new', 'reviewing', 'quoted');

  return jsonb_build_object(
    'available', true,
    'reason', v_reason,
    'canRespond', v_can_respond,
    'response', v_link.response,
    'respondedAt', v_link.responded_at,
    'requestStatus', v_request.status,
    'currentPaidAmount', v_paid,
    'currentRequiredDepositAmount', v_required,
    'currentPendingDepositAmount', v_pending,
    'currentPaymentStatus', v_payment_status,
    'quote', jsonb_build_object(
      'id', v_quote.id,
      'requestId', v_quote.request_id,
      'folio', v_quote.folio,
      'version', v_quote.version,
      'businessName', v_quote.business_name,
      'currencyCode', v_quote.currency_code,
      'customerName', v_quote.customer_name,
      'customerPhone', coalesce(v_quote.customer_phone, ''),
      'customerEmail', coalesce(v_quote.customer_email, ''),
      'eventTypeName', coalesce(v_quote.event_type_name, ''),
      'packageName', coalesce(v_quote.package_name, ''),
      'eventDate', v_quote.event_date,
      'eventTime', v_quote.event_time,
      'guestCount', v_quote.guest_count,
      'packageBasePrice', v_quote.package_base_price,
      'packageExtraGuestPrice', v_quote.package_extra_guest_price,
      'additionalGuestCount', v_quote.additional_guest_count,
      'additionalGuestSubtotal', v_quote.additional_guest_subtotal,
      'extras', v_quote.extras,
      'estimatedTotal', v_quote.estimated_total,
      'quotedTotal', v_quote.quoted_total,
      'effectiveTotal', v_quote.effective_total,
      'requiredDepositAmount', v_required,
      'paidAmount', v_paid,
      'pendingDepositAmount', v_pending,
      'paymentDueDate', v_due_date,
      'terms', coalesce(v_quote.terms, ''),
      'createdAt', v_quote.created_at
    )
  );
end;
$$;

revoke all on function public.get_public_event_quote_portal(text) from public;
grant execute on function public.get_public_event_quote_portal(text) to anon, authenticated;

-- ============================================================
-- PÚBLICO: ACEPTAR / RECHAZAR UNA COTIZACIÓN
-- ============================================================

create or replace function public.respond_public_event_quote(
  p_token text,
  p_response text
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_token uuid;
  v_link public.event_quote_portal_links%rowtype;
  v_quote public.event_quote_versions%rowtype;
  v_request public.event_requests%rowtype;
  v_latest_version integer := 0;
  v_paid numeric(12,2) := 0;
  v_required numeric(12,2) := 0;
  v_due_date date;
  v_deposit_enabled boolean := false;
  v_deposit_type text := 'percentage';
  v_deposit_value numeric(12,2) := 0;
  v_due_days integer := 0;
  v_next_status text;
begin
  if p_response not in ('accepted', 'rejected') then
    raise exception 'Respuesta no válida';
  end if;

  begin
    v_token := p_token::uuid;
  exception when others then
    raise exception 'El enlace de cotización no es válido';
  end;

  select * into v_link
  from public.event_quote_portal_links
  where token = v_token
  for update;

  if not found or not v_link.is_active then
    raise exception 'El enlace de cotización no está disponible';
  end if;

  if v_link.expires_at <= now() then
    raise exception 'El enlace de cotización ya venció';
  end if;

  if v_link.response is not null then
    raise exception 'Esta cotización ya fue respondida';
  end if;

  select * into v_quote
  from public.event_quote_versions
  where id = v_link.quote_version_id;

  if not found then
    raise exception 'La cotización no existe';
  end if;

  select coalesce(max(version), 0)
  into v_latest_version
  from public.event_quote_versions
  where request_id = v_quote.request_id;

  if v_quote.version < v_latest_version then
    raise exception 'Existe una versión más reciente de la cotización';
  end if;

  select * into v_request
  from public.event_requests
  where id = v_quote.request_id
  for update;

  if not found then
    raise exception 'La solicitud de evento no existe';
  end if;

  if v_request.status not in ('new', 'reviewing', 'quoted') then
    raise exception 'La solicitud ya no admite respuesta desde este enlace';
  end if;

  if p_response = 'rejected' then
    update public.event_requests
    set
      status = 'rejected',
      updated_at = now()
    where id = v_request.id;

    update public.event_quote_portal_links
    set
      response = 'rejected',
      responded_at = now()
    where id = v_link.id;

    return jsonb_build_object('ok', true, 'status', 'rejected');
  end if;

  select coalesce(sum(amount), 0)
  into v_paid
  from public.event_payments
  where request_id = v_request.id;

  v_required := coalesce(v_quote.required_deposit_amount, 0);
  v_due_date := v_quote.payment_due_date;

  if v_required <= 0 then
    select
      deposit_enabled,
      deposit_type,
      deposit_value,
      deposit_due_days
    into
      v_deposit_enabled,
      v_deposit_type,
      v_deposit_value,
      v_due_days
    from public.event_settings
    where id = 1;

    if coalesce(v_deposit_enabled, false) then
      if v_deposit_type = 'percentage' then
        v_required := round(v_quote.effective_total * coalesce(v_deposit_value, 0) / 100.0, 2);
      else
        v_required := least(v_quote.effective_total, round(coalesce(v_deposit_value, 0), 2));
      end if;

      v_due_date := least(
        v_quote.event_date,
        current_date + greatest(0, coalesce(v_due_days, 0))
      );
    end if;
  end if;

  v_required := greatest(0, coalesce(v_required, 0));

  if v_paid >= v_required then
    v_next_status := 'confirmed';
  else
    v_next_status := 'accepted';
  end if;

  update public.event_requests
  set
    status = v_next_status,
    required_deposit_amount = v_required,
    payment_due_date = case
      when v_required <= 0 then null
      else v_due_date
    end,
    confirmed_at = case
      when v_next_status = 'confirmed' then coalesce(confirmed_at, now())
      else confirmed_at
    end,
    updated_at = now()
  where id = v_request.id;

  update public.event_quote_portal_links
  set
    response = 'accepted',
    responded_at = now()
  where id = v_link.id;

  return jsonb_build_object('ok', true, 'status', v_next_status);
end;
$$;

revoke all on function public.respond_public_event_quote(text, text) from public;
grant execute on function public.respond_public_event_quote(text, text) to anon, authenticated;
