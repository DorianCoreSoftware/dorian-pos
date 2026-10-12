-- Dorian POS
-- Refunds V1 hardening
--
-- 1) Bloquea orderItemId duplicados dentro de una misma solicitud.
-- 2) Refuerza integridad en order_refund_items a nivel BD.
-- 3) Revoca EXECUTE a PUBLIC/anon en RPCs de devoluciones.
-- 4) Agrega validación admin interna a RPCs de lectura sensibles.
-- 5) Endurece search_path de SECURITY DEFINER.

create unique index if not exists
  ux_order_refund_items_refund_item
on public.order_refund_items (
  refund_id,
  order_item_id
);

create or replace function public.get_order_refund_availability(
  p_order_id uuid
)
returns table(
  order_id uuid,
  original_total numeric,
  payment_method text,
  paid_at timestamptz,
  max_hours integer,
  allow_partial boolean,
  require_reason boolean,
  require_notes boolean,
  item_id uuid,
  product_id uuid,
  product_name text,
  purchased_quantity integer,
  refunded_quantity integer,
  remaining_quantity integer,
  unit_refund_amount numeric,
  reward_source text,
  refundable boolean
)
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $function$
declare
  v_payment public.order_payments%rowtype;
  v_settings public.refund_settings%rowtype;
  v_gross_refundable numeric := 0;
begin
  if auth.uid() is null then
    raise exception 'Sesión no válida.';
  end if;

  if not exists (
    select 1
    from public.profiles profile
    where profile.id = auth.uid()
      and profile.role = 'admin'::public.user_role
      and coalesce(profile.is_active, true) = true
  ) then
    raise exception 'Solo un administrador puede consultar devoluciones.';
  end if;

  if not exists (
    select 1
    from public.orders o
    where o.id = p_order_id
  ) then
    raise exception 'No se encontró la orden.';
  end if;

  select *
  into v_payment
  from public.order_payments op
  where op.order_id = p_order_id
  order by op.created_at desc
  limit 1;

  if not found then
    raise exception 'La orden todavía no tiene un pago registrado.';
  end if;

  select *
  into v_settings
  from public.refund_settings rs
  where rs.id = 1;

  if not found or not v_settings.enabled then
    raise exception 'Las devoluciones están deshabilitadas.';
  end if;

  select coalesce(sum((
    greatest(oi.price_at_purchase::numeric, 0)
    + coalesce((
      select sum(coalesce(oim.extra_price_applied::numeric, 0))
      from public.order_item_modifiers oim
      where oim.order_item_id = oi.id
    ), 0)
  ) * oi.quantity), 0)
  into v_gross_refundable
  from public.order_items oi
  where oi.order_id = p_order_id
    and coalesce(oi.reward_source, '') = ''
    and oi.price_at_purchase::numeric > 0;

  return query
  with refunded as (
    select
      ori.order_item_id,
      coalesce(sum(ori.quantity), 0)::integer as qty
    from public.order_refund_items ori
    join public.order_refunds r
      on r.id = ori.refund_id
    where r.order_id = p_order_id
      and r.status = 'completed'
    group by ori.order_item_id
  ),
  item_base as (
    select
      oi.id,
      greatest(oi.price_at_purchase::numeric, 0)
      + coalesce((
        select sum(coalesce(oim.extra_price_applied::numeric, 0))
        from public.order_item_modifiers oim
        where oim.order_item_id = oi.id
      ), 0) as gross_unit
    from public.order_items oi
    where oi.order_id = p_order_id
  )
  select
    p_order_id,
    v_payment.total_amount::numeric,
    v_payment.payment_method,
    v_payment.created_at,
    v_settings.max_hours,
    v_settings.allow_partial,
    v_settings.require_reason,
    v_settings.require_notes,
    oi.id,
    oi.product_id,
    coalesce(p.name, 'Producto'),
    oi.quantity,
    coalesce(rf.qty, 0),
    greatest(0, oi.quantity - coalesce(rf.qty, 0))::integer,
    case
      when coalesce(oi.reward_source, '') <> ''
        or oi.price_at_purchase::numeric <= 0
        or v_gross_refundable <= 0
      then 0::numeric
      else round(
        v_payment.total_amount::numeric
        * ib.gross_unit
        / v_gross_refundable,
        2
      )
    end,
    oi.reward_source,
    (
      coalesce(oi.reward_source, '') = ''
      and oi.price_at_purchase::numeric > 0
      and greatest(0, oi.quantity - coalesce(rf.qty, 0)) > 0
    )
  from public.order_items oi
  left join public.products p on p.id = oi.product_id
  left join refunded rf on rf.order_item_id = oi.id
  join item_base ib on ib.id = oi.id
  where oi.order_id = p_order_id
  order by oi.created_at nulls last, oi.id;
end;
$function$;

create or replace function public.create_order_refund(
  p_order_id uuid,
  p_items jsonb,
  p_reason text,
  p_notes text default null,
  p_policy_exception boolean default false
)
returns uuid
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $function$
declare
  v_user_id uuid := auth.uid();
  v_settings public.refund_settings%rowtype;
  v_payment public.order_payments%rowtype;
  v_refund_id uuid;
  v_cash_session_id uuid;
  v_original_total numeric;
  v_already_refunded numeric := 0;
  v_remaining_money numeric := 0;
  v_refund_total numeric := 0;
  v_refundable_remaining_qty integer := 0;
  v_selected_qty integer := 0;
  v_row jsonb;
  v_item_id uuid;
  v_qty integer;
  v_available record;
  v_refund_type text;
  v_index integer := 0;
  v_count integer;
  v_inserted_total numeric := 0;
  v_item_amount numeric;
begin
  if v_user_id is null then
    raise exception 'Sesión no válida.';
  end if;

  if not exists (
    select 1
    from public.profiles p
    where p.id = v_user_id
      and p.role = 'admin'::public.user_role
      and coalesce(p.is_active, true) = true
  ) then
    raise exception 'Solo un administrador puede realizar devoluciones.';
  end if;

  select * into v_settings
  from public.refund_settings rs
  where rs.id = 1;

  if not found or not v_settings.enabled then
    raise exception 'Las devoluciones están deshabilitadas.';
  end if;

  if v_settings.require_reason
     and coalesce(trim(p_reason), '') = ''
  then
    raise exception 'El motivo de la devolución es obligatorio.';
  end if;

  if v_settings.require_notes
     and coalesce(trim(p_notes), '') = ''
  then
    raise exception 'Las notas de la devolución son obligatorias.';
  end if;

  perform 1
  from public.orders o
  where o.id = p_order_id
  for update;

  if not found then
    raise exception 'No se encontró la orden.';
  end if;

  select * into v_payment
  from public.order_payments op
  where op.order_id = p_order_id
  order by op.created_at desc
  limit 1;

  if not found then
    raise exception 'No existe un pago para esta orden.';
  end if;

  if v_settings.max_hours > 0
     and now() > v_payment.created_at + make_interval(hours => v_settings.max_hours)
  then
    if not p_policy_exception then
      raise exception
        'La venta está fuera del plazo de devolución (% horas).',
        v_settings.max_hours;
    end if;

    if not v_settings.allow_policy_exceptions then
      raise exception
        'La política del negocio no permite excepciones.';
    end if;
  end if;

  if p_items is null
     or jsonb_typeof(p_items) <> 'array'
     or jsonb_array_length(p_items) = 0
  then
    raise exception
      'Selecciona al menos un artículo para devolver.';
  end if;

  if exists (
    select 1
    from jsonb_array_elements(p_items) item
    group by item ->> 'orderItemId'
    having count(*) > 1
  ) then
    raise exception
      'No se permiten artículos duplicados en la devolución.';
  end if;

  v_original_total := v_payment.total_amount::numeric;

  select coalesce(sum(r.refund_total), 0)
  into v_already_refunded
  from public.order_refunds r
  where r.order_id = p_order_id
    and r.status = 'completed';

  v_remaining_money :=
    greatest(0, v_original_total - v_already_refunded);

  if v_remaining_money <= 0 then
    raise exception 'La venta ya fue devuelta completamente.';
  end if;

  select coalesce(sum(a.remaining_quantity), 0)::integer
  into v_refundable_remaining_qty
  from public.get_order_refund_availability(p_order_id) a
  where a.refundable;

  for v_row in
    select value
    from jsonb_array_elements(p_items)
  loop
    v_item_id := nullif(v_row ->> 'orderItemId', '')::uuid;
    v_qty := coalesce((v_row ->> 'quantity')::integer, 0);

    if v_item_id is null or v_qty <= 0 then
      raise exception
        'Los artículos de la devolución no son válidos.';
    end if;

    select *
    into v_available
    from public.get_order_refund_availability(p_order_id) a
    where a.item_id = v_item_id;

    if not found then
      raise exception 'Uno de los artículos no pertenece a la orden.';
    end if;

    if not v_available.refundable then
      raise exception
        'El artículo "%" no es reembolsable.',
        v_available.product_name;
    end if;

    if v_qty > v_available.remaining_quantity then
      raise exception
        'No puedes devolver % unidad(es) de "%". Máximo disponible: %.',
        v_qty,
        v_available.product_name,
        v_available.remaining_quantity;
    end if;

    v_refund_total :=
      v_refund_total
      + round(v_available.unit_refund_amount * v_qty, 2);

    v_selected_qty := v_selected_qty + v_qty;
  end loop;

  if v_refund_total <= 0 then
    raise exception
      'El importe de devolución debe ser mayor que cero.';
  end if;

  if v_selected_qty >= v_refundable_remaining_qty then
    v_refund_total := v_remaining_money;
  else
    v_refund_total := least(v_refund_total, v_remaining_money);
  end if;

  v_refund_type :=
    case
      when v_refund_total >= v_remaining_money then 'full'
      else 'partial'
    end;

  if v_refund_type = 'partial'
     and not v_settings.allow_partial
  then
    raise exception 'La política no permite devoluciones parciales.';
  end if;

  select cs.id
  into v_cash_session_id
  from public.cash_sessions cs
  where cs.status = 'open'
  order by cs.opened_at desc
  limit 1;

  if lower(v_payment.payment_method) = 'cash'
     and v_cash_session_id is null
  then
    raise exception 'Abre una caja antes de devolver efectivo.';
  end if;

  insert into public.order_refunds (
    order_id,
    refund_type,
    status,
    payment_method,
    original_total,
    refund_total,
    reason,
    notes,
    refunded_by,
    policy_exception,
    cash_session_id
  )
  values (
    p_order_id,
    v_refund_type,
    'completed',
    v_payment.payment_method,
    v_original_total,
    round(v_refund_total, 2),
    trim(p_reason),
    nullif(trim(coalesce(p_notes, '')), ''),
    v_user_id,
    p_policy_exception,
    v_cash_session_id
  )
  returning id into v_refund_id;

  v_count := jsonb_array_length(p_items);

  for v_row in
    select value
    from jsonb_array_elements(p_items)
  loop
    v_index := v_index + 1;
    v_item_id := (v_row ->> 'orderItemId')::uuid;
    v_qty := (v_row ->> 'quantity')::integer;

    select *
    into v_available
    from public.get_order_refund_availability(p_order_id) a
    where a.item_id = v_item_id;

    if v_index = v_count then
      v_item_amount := round(v_refund_total - v_inserted_total, 2);
    else
      v_item_amount := round(v_available.unit_refund_amount * v_qty, 2);
    end if;

    insert into public.order_refund_items (
      refund_id,
      order_item_id,
      product_id,
      quantity,
      unit_refund_amount,
      refund_amount
    )
    values (
      v_refund_id,
      v_item_id,
      v_available.product_id,
      v_qty,
      round(v_item_amount / v_qty, 2),
      v_item_amount
    );

    v_inserted_total := v_inserted_total + v_item_amount;
  end loop;

  return v_refund_id;
end;
$function$;

create or replace function public.get_order_refund_history(
  p_order_id uuid
)
returns table(
  refund_id uuid,
  refund_number bigint,
  refund_type text,
  payment_method text,
  refund_total numeric,
  reason text,
  notes text,
  policy_exception boolean,
  created_at timestamptz,
  user_name text
)
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $function$
begin
  if not exists (
    select 1
    from public.profiles profile
    where profile.id = auth.uid()
      and profile.role = 'admin'::public.user_role
      and coalesce(profile.is_active, true) = true
  ) then
    raise exception 'No autorizado.';
  end if;

  return query
  select
    r.id,
    r.refund_number,
    r.refund_type,
    r.payment_method,
    r.refund_total,
    r.reason,
    r.notes,
    r.policy_exception,
    r.created_at,
    nullif(trim(concat_ws(' ', p.first_name, p.last_name)), '')
  from public.order_refunds r
  left join public.profiles p
    on p.id = r.refunded_by
  where r.order_id = p_order_id
    and r.status = 'completed'
  order by r.created_at desc;
end;
$function$;

create or replace function public.get_order_refund_cash_summary(
  p_cash_session_id uuid
)
returns table(
  cash numeric,
  card numeric,
  total numeric,
  count bigint
)
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $function$
begin
  if not exists (
    select 1
    from public.profiles profile
    where profile.id = auth.uid()
      and profile.role = 'admin'::public.user_role
      and coalesce(profile.is_active, true) = true
  ) then
    raise exception 'No autorizado.';
  end if;

  return query
  select
    coalesce(sum(case when lower(r.payment_method) = 'cash' then r.refund_total else 0 end), 0)::numeric,
    coalesce(sum(case when lower(r.payment_method) = 'card' then r.refund_total else 0 end), 0)::numeric,
    coalesce(sum(r.refund_total), 0)::numeric,
    count(*)::bigint
  from public.order_refunds r
  where r.cash_session_id = p_cash_session_id
    and r.status = 'completed';
end;
$function$;

alter function public.get_refund_report(
  timestamptz,
  timestamptz
)
set search_path to 'public', 'pg_temp';

alter function public.get_refund_report_summary(
  timestamptz,
  timestamptz
)
set search_path to 'public', 'pg_temp';

revoke execute
on function public.create_order_refund(uuid, jsonb, text, text, boolean)
from public, anon;

revoke execute
on function public.get_order_refund_availability(uuid)
from public, anon;

revoke execute
on function public.get_order_refund_history(uuid)
from public, anon;

revoke execute
on function public.get_order_refund_cash_summary(uuid)
from public, anon;

revoke execute
on function public.get_refund_report(timestamptz, timestamptz)
from public, anon;

revoke execute
on function public.get_refund_report_summary(timestamptz, timestamptz)
from public, anon;

grant execute
on function public.create_order_refund(uuid, jsonb, text, text, boolean)
to authenticated;

grant execute
on function public.get_order_refund_availability(uuid)
to authenticated;

grant execute
on function public.get_order_refund_history(uuid)
to authenticated;

grant execute
on function public.get_order_refund_cash_summary(uuid)
to authenticated;

grant execute
on function public.get_refund_report(timestamptz, timestamptz)
to authenticated;

grant execute
on function public.get_refund_report_summary(timestamptz, timestamptz)
to authenticated;
