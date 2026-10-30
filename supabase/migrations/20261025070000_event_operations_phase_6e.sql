-- Fase 6E: operación del evento + integración segura con Pedidos/POS

-- ============================================================
-- ESTADO OPERATIVO EN LA SOLICITUD
-- ============================================================

alter table public.event_requests
  add column if not exists operation_status text not null default 'planned',
  add column if not exists operation_notes text not null default '',
  add column if not exists pos_order_id uuid references public.orders(id),
  add column if not exists pos_order_created_at timestamptz,
  add column if not exists operation_completed_at timestamptz;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'event_requests_operation_status_check'
      and conrelid = 'public.event_requests'::regclass
  ) then
    alter table public.event_requests
      add constraint event_requests_operation_status_check
      check (operation_status in ('planned', 'in_progress', 'ready', 'completed'));
  end if;
end;
$$;

create unique index if not exists uq_event_requests_pos_order_id
  on public.event_requests(pos_order_id)
  where pos_order_id is not null;

-- Solicitudes ya realizadas antes de 6E se consideran operación terminada.
update public.event_requests
set
  operation_status = 'completed',
  operation_completed_at = coalesce(operation_completed_at, updated_at, now())
where status = 'completed'
  and operation_status <> 'completed';

-- ============================================================
-- CHECKLIST E HISTORIAL
-- ============================================================

create table if not exists public.event_operation_checklist (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.event_requests(id) on delete cascade,
  label text not null,
  position integer not null,
  is_completed boolean not null default false,
  completed_at timestamptz,
  completed_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  constraint event_operation_checklist_label_length check (char_length(label) between 1 and 180),
  constraint event_operation_checklist_request_position_key unique (request_id, position)
);

create index if not exists idx_event_operation_checklist_request
  on public.event_operation_checklist(request_id, position);

create table if not exists public.event_operation_history (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.event_requests(id) on delete cascade,
  action text not null,
  details jsonb not null default '{}'::jsonb,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

create index if not exists idx_event_operation_history_request
  on public.event_operation_history(request_id, created_at desc);

alter table public.event_operation_checklist enable row level security;
alter table public.event_operation_history enable row level security;
revoke all on table public.event_operation_checklist from anon, authenticated;
revoke all on table public.event_operation_history from anon, authenticated;

-- ============================================================
-- CHECKLIST PREDETERMINADO
-- ============================================================

create or replace function public.seed_event_operation_checklist(p_request_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if p_request_id is null then
    return;
  end if;

  if exists (
    select 1
    from public.event_operation_checklist
    where request_id = p_request_id
  ) then
    return;
  end if;

  insert into public.event_operation_checklist(request_id, label, position)
  values
    (p_request_id, 'Confirmar horario y detalles finales con el cliente', 1),
    (p_request_id, 'Preparar insumos y productos del evento', 2),
    (p_request_id, 'Preparar equipo, montaje y área de servicio', 3),
    (p_request_id, 'Verificar paquete, extras y cantidades', 4),
    (p_request_id, 'Confirmar personal y responsables', 5),
    (p_request_id, 'Cerrar servicio y validar entrega final', 6)
  on conflict (request_id, position) do nothing;
end;
$$;

revoke all on function public.seed_event_operation_checklist(uuid) from public;

create or replace function public.seed_event_operation_checklist_trigger()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if new.status in ('confirmed', 'completed') then
    perform public.seed_event_operation_checklist(new.id);
  end if;
  return new;
end;
$$;

drop trigger if exists event_requests_operation_seed on public.event_requests;
create trigger event_requests_operation_seed
after insert or update of status on public.event_requests
for each row
execute function public.seed_event_operation_checklist_trigger();

-- Backfill para confirmados existentes.
do $$
declare
  v_request_id uuid;
begin
  for v_request_id in
    select id
    from public.event_requests
    where status in ('confirmed', 'completed')
  loop
    perform public.seed_event_operation_checklist(v_request_id);
  end loop;
end;
$$;

-- REALIZADA solo puede alcanzarse cerrando la operación.
create or replace function public.guard_event_completed_operation()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  if new.status = 'completed'
     and old.status is distinct from 'completed'
     and coalesce(new.operation_status, 'planned') <> 'completed' then
    raise exception 'Finaliza primero la operación del evento antes de marcarlo como realizado';
  end if;
  return new;
end;
$$;

drop trigger if exists event_requests_completed_operation_guard on public.event_requests;
create trigger event_requests_completed_operation_guard
before update of status on public.event_requests
for each row
execute function public.guard_event_completed_operation();

-- Una vez enviado el saldo a POS ya no deben registrarse pagos desde Eventos.
create or replace function public.guard_event_payment_after_pos_order()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  if exists (
    select 1
    from public.event_requests r
    where r.id = new.request_id
      and r.pos_order_id is not null
  ) then
    raise exception 'El saldo del evento ya fue enviado a POS; registra el cobro desde PEDIDOS';
  end if;
  return new;
end;
$$;

drop trigger if exists event_payments_after_pos_order_guard on public.event_payments;
create trigger event_payments_after_pos_order_guard
before insert on public.event_payments
for each row
execute function public.guard_event_payment_after_pos_order();

-- ============================================================
-- ADMIN: ACTUALIZAR OPERACIÓN
-- ============================================================

create or replace function public.update_event_operation_admin(
  p_request_id uuid,
  p_operation_status text,
  p_operation_notes text
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_request public.event_requests%rowtype;
  v_pending integer;
begin
  if v_user_id is null or not exists (
    select 1
    from public.profiles
    where id = v_user_id
      and is_active = true
      and role::text = 'admin'
  ) then
    raise exception 'No tienes permisos para operar eventos';
  end if;

  if p_operation_status not in ('planned', 'in_progress', 'ready', 'completed') then
    raise exception 'El estado operativo no es válido';
  end if;

  if length(trim(coalesce(p_operation_notes, ''))) > 3000 then
    raise exception 'Las notas de operación no pueden superar 3000 caracteres';
  end if;

  select * into v_request
  from public.event_requests
  where id = p_request_id
  for update;

  if not found then
    raise exception 'Solicitud de evento no encontrada';
  end if;

  if v_request.status not in ('confirmed', 'completed') then
    raise exception 'La operación solo está disponible para eventos confirmados';
  end if;

  if v_request.operation_status = 'completed'
     and p_operation_status <> 'completed' then
    raise exception 'La operación finalizada no puede reabrirse desde este flujo';
  end if;

  perform public.seed_event_operation_checklist(p_request_id);

  if p_operation_status = 'completed' then
    select count(*) into v_pending
    from public.event_operation_checklist
    where request_id = p_request_id
      and is_completed = false;

    if v_pending > 0 then
      raise exception 'Completa todo el checklist antes de finalizar el evento';
    end if;
  end if;

  update public.event_requests
  set
    operation_status = p_operation_status,
    operation_notes = trim(coalesce(p_operation_notes, '')),
    operation_completed_at = case
      when p_operation_status = 'completed' then coalesce(operation_completed_at, now())
      else operation_completed_at
    end,
    status = case
      when p_operation_status = 'completed' then 'completed'
      else status
    end,
    updated_at = now()
  where id = p_request_id;

  insert into public.event_operation_history(request_id, action, details, created_by)
  values (
    p_request_id,
    'operation_updated',
    jsonb_build_object(
      'status', p_operation_status,
      'notes', trim(coalesce(p_operation_notes, ''))
    ),
    v_user_id
  );

  return jsonb_build_object('ok', true);
end;
$$;

revoke all on function public.update_event_operation_admin(uuid, text, text) from public;
grant execute on function public.update_event_operation_admin(uuid, text, text) to authenticated;

-- ============================================================
-- ADMIN: CHECKLIST
-- ============================================================

create or replace function public.set_event_operation_checklist_item_admin(
  p_item_id uuid,
  p_is_completed boolean
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_item public.event_operation_checklist%rowtype;
  v_request public.event_requests%rowtype;
begin
  if v_user_id is null or not exists (
    select 1
    from public.profiles
    where id = v_user_id
      and is_active = true
      and role::text = 'admin'
  ) then
    raise exception 'No tienes permisos para operar eventos';
  end if;

  select * into v_item
  from public.event_operation_checklist
  where id = p_item_id
  for update;

  if not found then
    raise exception 'Elemento de checklist no encontrado';
  end if;

  select * into v_request
  from public.event_requests
  where id = v_item.request_id
  for update;

  if v_request.status not in ('confirmed', 'completed') then
    raise exception 'La operación solo está disponible para eventos confirmados';
  end if;

  if v_request.operation_status = 'completed' then
    raise exception 'El evento ya fue finalizado';
  end if;

  update public.event_operation_checklist
  set
    is_completed = coalesce(p_is_completed, false),
    completed_at = case when coalesce(p_is_completed, false) then now() else null end,
    completed_by = case when coalesce(p_is_completed, false) then v_user_id else null end
  where id = p_item_id;

  update public.event_requests
  set
    operation_status = case
      when operation_status = 'planned' then 'in_progress'
      else operation_status
    end,
    updated_at = now()
  where id = v_item.request_id;

  insert into public.event_operation_history(request_id, action, details, created_by)
  values (
    v_item.request_id,
    case when coalesce(p_is_completed, false) then 'checklist_completed' else 'checklist_reopened' end,
    jsonb_build_object('itemId', v_item.id, 'label', v_item.label),
    v_user_id
  );

  return jsonb_build_object('ok', true);
end;
$$;

revoke all on function public.set_event_operation_checklist_item_admin(uuid, boolean) from public;
grant execute on function public.set_event_operation_checklist_item_admin(uuid, boolean) to authenticated;

-- ============================================================
-- ADMIN: CONVERTIR EVENTO A PEDIDO POS
-- ============================================================

create or replace function public.create_event_pos_order_admin(p_request_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_request public.event_requests%rowtype;
  v_existing_status text;
  v_effective_total numeric(12,2);
  v_event_paid numeric(12,2);
  v_balance numeric(12,2);
  v_category_id uuid;
  v_product_id uuid;
  v_order_id uuid;
  v_notes text;
  v_extras text;
begin
  if v_user_id is null or not exists (
    select 1
    from public.profiles
    where id = v_user_id
      and is_active = true
      and role::text = 'admin'
  ) then
    raise exception 'No tienes permisos para crear pedidos de eventos';
  end if;

  select * into v_request
  from public.event_requests
  where id = p_request_id
  for update;

  if not found then
    raise exception 'Solicitud de evento no encontrada';
  end if;

  if v_request.pos_order_id is not null then
    select status into v_existing_status
    from public.orders
    where id = v_request.pos_order_id;

    if coalesce(v_existing_status, '') <> 'cancelled' then
      return jsonb_build_object(
        'orderId', v_request.pos_order_id,
        'orderTotal', coalesce((select total from public.orders where id = v_request.pos_order_id), 0),
        'created', false
      );
    end if;

    -- Si el pedido anterior fue cancelado permitimos generar uno nuevo.
    update public.event_requests
    set pos_order_id = null, pos_order_created_at = null
    where id = p_request_id;
    v_request.pos_order_id := null;
  end if;

  if v_request.status <> 'confirmed' then
    raise exception 'El evento debe estar CONFIRMADO antes de crear el pedido POS';
  end if;

  v_effective_total := round(coalesce(v_request.quoted_total, v_request.estimated_total, 0), 2);

  select round(coalesce(sum(amount), 0), 2)
  into v_event_paid
  from public.event_payments
  where request_id = p_request_id;

  v_balance := greatest(0, round(v_effective_total - coalesce(v_event_paid, 0), 2));

  -- Producto técnico oculto: nunca aparece en MENÚ porque queda inactivo/no disponible.
  select id into v_product_id
  from public.products
  where description = '[DORIAN_EVENT_SYSTEM]'
  order by created_at
  limit 1;

  if v_product_id is null then
    select id into v_category_id
    from public.categories
    order by created_at, id
    limit 1;

    if v_category_id is null then
      raise exception 'Necesitas al menos una categoría de productos para integrar Eventos con PEDIDOS';
    end if;

    insert into public.products(
      name,
      description,
      price,
      category_id,
      is_active,
      is_available
    ) values (
      'Evento / servicio',
      '[DORIAN_EVENT_SYSTEM]',
      0,
      v_category_id,
      false,
      false
    )
    returning id into v_product_id;
  end if;

  select string_agg(
    extra_name || case when quantity > 1 then ' x' || quantity::text else '' end,
    ', ' order by extra_name
  )
  into v_extras
  from public.event_request_extras
  where request_id = p_request_id;

  v_notes := concat_ws(
    ' | ',
    'Evento #' || v_request.folio::text,
    nullif(v_request.package_name, ''),
    to_char(v_request.event_date, 'DD/MM/YYYY') || case when v_request.event_time is not null then ' ' || to_char(v_request.event_time, 'HH24:MI') else '' end,
    v_request.guest_count::text || ' personas',
    case when coalesce(v_extras, '') <> '' then 'Extras: ' || v_extras else null end,
    case when coalesce(v_request.operation_notes, '') <> '' then 'Operación: ' || v_request.operation_notes else null end
  );

  v_order_id := public.create_kitchen_order(
    v_balance,
    jsonb_build_array(
      jsonb_build_object(
        'productId', v_product_id,
        'quantity', 1,
        'price', v_balance,
        'notes', v_notes,
        'modifiers', '[]'::jsonb,
        'components', '[]'::jsonb
      )
    ),
    null::jsonb,
    gen_random_uuid(),
    'pos'::text,
    'pickup'::text
  );

  update public.orders
  set
    customer_name = nullif(trim(coalesce(v_request.customer_name, '')), ''),
    customer_phone = nullif(trim(coalesce(v_request.customer_phone, '')), '')
  where id = v_order_id;

  update public.event_requests
  set
    pos_order_id = v_order_id,
    pos_order_created_at = now(),
    operation_status = case when operation_status = 'planned' then 'in_progress' else operation_status end,
    updated_at = now()
  where id = p_request_id;

  insert into public.event_operation_history(request_id, action, details, created_by)
  values (
    p_request_id,
    'pos_order_created',
    jsonb_build_object(
      'orderId', v_order_id,
      'eventTotal', v_effective_total,
      'eventPayments', v_event_paid,
      'orderTotal', v_balance
    ),
    v_user_id
  );

  return jsonb_build_object(
    'orderId', v_order_id,
    'orderTotal', v_balance,
    'created', true
  );
end;
$$;

revoke all on function public.create_event_pos_order_admin(uuid) from public;
grant execute on function public.create_event_pos_order_admin(uuid) to authenticated;

-- ============================================================
-- ADMIN INBOX: AGREGAR OPERACIÓN Y PEDIDO POS
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
