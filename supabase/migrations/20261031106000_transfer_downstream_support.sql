-- Transferencias: compatibilidad transversal en repartidor, facturacion y reembolsos promocionales.

-- 1) Repartidor: permitir transferencia con referencia obligatoria.
drop function if exists public.driver_register_payment(uuid, text, numeric);

create function public.driver_register_payment(
  p_order_id uuid,
  p_payment_method text,
  p_amount_received numeric default null,
  p_payment_reference text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_total numeric;
  v_payment_id uuid;
  v_change numeric;
  v_reference text;
begin
  v_user_id := auth.uid();
  if v_user_id is null then raise exception 'Debes iniciar sesión.'; end if;

  if not exists (select 1 from public.profiles where id = v_user_id and role = 'driver') then
    raise exception 'No tienes permisos para registrar este pago.';
  end if;

  select o.total into v_total
  from public.orders o
  where o.id = p_order_id
    and o.fulfillment_type = 'delivery'
    and o.status = 'on_the_way'
    and o.driver_id = v_user_id;

  if v_total is null then raise exception 'No puedes cobrar este pedido.'; end if;

  select op.id into v_payment_id
  from public.order_payments op
  where op.order_id = p_order_id
  limit 1;

  if v_payment_id is not null then return v_payment_id; end if;

  if p_payment_method not in ('cash','card','transfer') then
    raise exception 'Método de pago inválido.';
  end if;

  v_reference := nullif(trim(coalesce(p_payment_reference, '')), '');

  if p_payment_method = 'cash' then
    if p_amount_received is null then raise exception 'Ingresa la cantidad recibida.'; end if;
    if p_amount_received < v_total then raise exception 'La cantidad recibida es menor al total.'; end if;
    v_change := round(p_amount_received - v_total, 2);
    v_reference := null;
  else
    p_amount_received := null;
    v_change := null;
    if p_payment_method = 'transfer' and (v_reference is null or length(v_reference) < 3) then
      raise exception 'Ingresa la referencia o folio de la transferencia.';
    end if;
  end if;

  insert into public.order_payments (
    order_id, payment_method, total_amount, amount_received, change_amount, payment_reference
  ) values (
    p_order_id, p_payment_method, v_total, p_amount_received, v_change, v_reference
  ) returning id into v_payment_id;

  return v_payment_id;
end;
$$;

revoke all on function public.driver_register_payment(uuid,text,numeric,text) from public;
grant execute on function public.driver_register_payment(uuid,text,numeric,text) to authenticated;

-- 2) Facturacion: transferencia electronica = Forma de pago SAT 03.
create or replace function public.create_invoice_draft_from_order_admin(
  p_order_id uuid,
  p_fiscal_customer_id uuid,
  p_cfdi_use_code text default null
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid;
  v_settings public.invoicing_settings%rowtype;
  v_customer public.fiscal_customers%rowtype;
  v_order public.orders%rowtype;
  v_payment public.order_payments%rowtype;
  v_invoice_id uuid;
  v_use text;
  v_payment_form text;
  v_currency text;
  v_refund_total numeric := 0;
  v_paid_total numeric := 0;
  v_weight_total numeric := 0;
  v_allocated_total numeric := 0;
  v_line_final numeric;
  v_line_base numeric;
  v_line_tax numeric;
  v_index integer := 0;
  v_count integer := 0;
  v_row record;
  v_subtotal numeric := 0;
  v_tax_total numeric := 0;
begin
  v_user_id := public.require_invoicing_admin();

  select * into v_settings
  from public.invoicing_settings
  where id = 1;

  if trim(coalesce(v_settings.legal_name, '')) = ''
     or trim(coalesce(v_settings.rfc, '')) = ''
     or trim(coalesce(v_settings.tax_regime_code, '')) = ''
     or trim(coalesce(v_settings.postal_code, '')) = '' then
    raise exception 'Completa primero los datos fiscales del emisor';
  end if;

  select * into v_customer
  from public.fiscal_customers
  where id = p_fiscal_customer_id
    and is_active = true;

  if not found then
    raise exception 'Cliente fiscal no encontrado o inactivo';
  end if;

  select * into v_order
  from public.orders
  where id = p_order_id
  for update;

  if not found then
    raise exception 'Orden no encontrada';
  end if;

  if v_order.status::text <> 'delivered' then
    raise exception 'Solo pueden facturarse ordenes entregadas';
  end if;

  select * into v_payment
  from public.order_payments
  where order_id = p_order_id
  order by created_at desc
  limit 1;

  if not found then
    raise exception 'La orden no tiene un pago registrado';
  end if;

  select coalesce(sum(r.refund_total), 0)
  into v_refund_total
  from public.order_refunds r
  where r.order_id = p_order_id
    and r.status = 'completed';

  if v_refund_total > 0 then
    raise exception 'La venta tiene devoluciones y no puede facturarse en esta fase';
  end if;

  if exists (
    select 1
    from public.invoice_order_links iol
    join public.invoices i on i.id = iol.invoice_id
    where iol.order_id = p_order_id
      and i.status <> 'cancelled'
  ) then
    raise exception 'La venta ya esta ligada a otra factura';
  end if;

  if exists (
    select 1
    from public.order_items oi
    where oi.order_id = p_order_id
      and coalesce(oi.reward_source, '') <> ''
  ) then
    raise exception 'Las ventas con recompensas se habilitaran en una fase posterior';
  end if;

  if exists (
    select 1
    from public.order_items oi
    left join public.product_fiscal_settings fs
      on fs.product_id = oi.product_id
    where oi.order_id = p_order_id
      and (
        fs.product_id is null
        or fs.product_service_code is null
        or fs.unit_code is null
        or fs.tax_object_code is null
        or fs.vat_rate is null
      )
  ) then
    raise exception 'Falta configuracion SAT en uno o mas productos de la venta';
  end if;

  v_use := upper(trim(coalesce(p_cfdi_use_code, v_customer.cfdi_use_code)));
  if v_use !~ '^[A-Z0-9]{3}$' then
    raise exception 'El uso CFDI no es valido';
  end if;

  v_payment_form := case lower(v_payment.payment_method)
    when 'cash' then '01'
    when 'card' then '04'
    when 'transfer' then '03'
    else null
  end;

  if v_payment_form is null then
    raise exception 'La forma de pago de la venta no esta soportada para facturacion';
  end if;

  select coalesce(nullif(trim(bs.currency_code), ''), 'MXN')
  into v_currency
  from public.business_settings bs
  where bs.id = 1;

  v_paid_total := round(v_payment.total_amount::numeric, 2);

  select
    coalesce(sum(
      greatest(0, oi.price_at_purchase::numeric + coalesce((
        select sum(coalesce(oim.extra_price_applied::numeric, 0))
        from public.order_item_modifiers oim
        where oim.order_item_id = oi.id
      ), 0)) * oi.quantity
    ), 0),
    count(*)::integer
  into v_weight_total, v_count
  from public.order_items oi
  where oi.order_id = p_order_id;

  if v_count <= 0 or v_weight_total <= 0 then
    raise exception 'La orden no contiene conceptos facturables';
  end if;

  insert into public.invoices (
    invoice_kind,
    status,
    series,
    fiscal_customer_id,
    issuer_legal_name,
    issuer_rfc,
    issuer_tax_regime_code,
    issuer_postal_code,
    receiver_legal_name,
    receiver_rfc,
    receiver_tax_regime_code,
    receiver_postal_code,
    receiver_cfdi_use_code,
    receiver_email,
    currency_code,
    payment_form_code,
    payment_method_code,
    subtotal,
    discount,
    tax_total,
    total,
    created_by
  ) values (
    'regular',
    'draft',
    v_settings.invoice_series,
    v_customer.id,
    v_settings.legal_name,
    v_settings.rfc,
    v_settings.tax_regime_code,
    v_settings.postal_code,
    v_customer.legal_name,
    v_customer.rfc,
    v_customer.tax_regime_code,
    v_customer.postal_code,
    v_use,
    nullif(trim(coalesce(v_customer.email, '')), ''),
    v_currency,
    v_payment_form,
    'PUE',
    0,
    0,
    0,
    v_paid_total,
    v_user_id
  ) returning id into v_invoice_id;

  insert into public.invoice_order_links (
    invoice_id,
    order_id,
    linked_amount
  ) values (
    v_invoice_id,
    p_order_id,
    v_paid_total
  );

  for v_row in
    select
      oi.id,
      oi.product_id,
      oi.quantity,
      p.name as product_name,
      fs.product_service_code,
      fs.unit_code,
      fs.tax_object_code,
      fs.vat_rate,
      greatest(0, oi.price_at_purchase::numeric + coalesce((
        select sum(coalesce(oim.extra_price_applied::numeric, 0))
        from public.order_item_modifiers oim
        where oim.order_item_id = oi.id
      ), 0)) * oi.quantity as weight_amount
    from public.order_items oi
    join public.products p on p.id = oi.product_id
    join public.product_fiscal_settings fs on fs.product_id = oi.product_id
    where oi.order_id = p_order_id
    order by oi.created_at nulls last, oi.id
  loop
    v_index := v_index + 1;

    if v_index = v_count then
      v_line_final := round(v_paid_total - v_allocated_total, 2);
    else
      v_line_final := round(v_paid_total * v_row.weight_amount / v_weight_total, 2);
    end if;

    v_allocated_total := v_allocated_total + v_line_final;

    if coalesce(v_row.vat_rate, 0) > 0 then
      v_line_base := round(v_line_final / (1 + v_row.vat_rate), 2);
      v_line_tax := round(v_line_final - v_line_base, 2);
    else
      v_line_base := v_line_final;
      v_line_tax := 0;
    end if;

    v_subtotal := v_subtotal + v_line_base;
    v_tax_total := v_tax_total + v_line_tax;

    insert into public.invoice_items (
      invoice_id,
      product_id,
      description,
      quantity,
      unit_price,
      discount,
      amount,
      product_service_code,
      unit_code,
      tax_object_code,
      vat_rate,
      tax_amount
    ) values (
      v_invoice_id,
      v_row.product_id,
      v_row.product_name,
      v_row.quantity,
      case when v_row.quantity > 0
        then round(v_line_base / v_row.quantity, 6)
        else 0
      end,
      0,
      v_line_base,
      v_row.product_service_code,
      v_row.unit_code,
      v_row.tax_object_code,
      v_row.vat_rate,
      v_line_tax
    );
  end loop;

  update public.invoices
  set
    subtotal = round(v_subtotal, 2),
    tax_total = round(v_tax_total, 2),
    total = v_paid_total,
    updated_at = now()
  where id = v_invoice_id;

  return v_invoice_id;
end;
$$;

revoke all on function public.create_invoice_draft_from_order_admin(uuid, uuid, text) from public;
grant execute on function public.create_invoice_draft_from_order_admin(uuid, uuid, text) to authenticated;

-- 3) Reembolsos promocionales: conservar el metodo original transferencia.
alter table public.cash_refunds
  drop constraint if exists cash_refunds_payment_method_check;

alter table public.cash_refunds
  add constraint cash_refunds_payment_method_check
  check (payment_method in ('cash','card','transfer'));

create or replace function public.redeem_order_refund_promotion(
  p_code text
)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_coupon public.promo_coupons%rowtype;
  v_program public.promotion_programs%rowtype;
  v_payment public.order_payments%rowtype;
  v_cash_session_id uuid;
  v_redemption_id uuid;
  v_refund_id uuid;
begin
  if p_code is null or trim(p_code) = '' then
    raise exception 'El código es obligatorio.';
  end if;

  select pc.* into v_coupon
  from public.promo_coupons pc
  where pc.code = upper(trim(p_code))
  for update;

  if not found then
    raise exception 'El código no existe.';
  end if;

  select * into v_program
  from public.promotion_programs
  where id = v_coupon.program_id
    and program_type = 'order_refund';

  if not found then
    raise exception 'El código no corresponde a una promoción de reembolso.';
  end if;

  if v_coupon.redeemed then
    raise exception 'Este cupón ya fue canjeado.';
  end if;

  select id into v_cash_session_id
  from public.cash_sessions
  where status = 'open'
  order by opened_at desc
  limit 1;

  if not found then
    raise exception 'No hay una caja abierta para registrar el reembolso.';
  end if;

  select * into v_payment
  from public.order_payments
  where order_id = v_coupon.order_id
  limit 1;

  if not found then
    raise exception 'No se encontró el pago asociado a esta compra.';
  end if;

  if v_payment.payment_method not in ('cash', 'card', 'transfer') then
    raise exception 'La forma de pago original no es válida para reembolso.';
  end if;

  insert into public.promo_redemptions(
    redemption_type,
    reward,
    redeemed_by,
    program_id,
    reward_id
  ) values (
    'order_refund',
    null,
    auth.uid(),
    v_program.id,
    null
  ) returning id into v_redemption_id;

  insert into public.cash_refunds(
    order_id,
    promo_redemption_id,
    cash_session_id,
    payment_method,
    amount,
    refunded_by
  ) values (
    v_coupon.order_id,
    v_redemption_id,
    v_cash_session_id,
    v_payment.payment_method,
    v_payment.total_amount,
    auth.uid()
  ) returning id into v_refund_id;

  update public.promo_coupons
  set redeemed = true,
      redeemed_at = now(),
      redemption_id = v_redemption_id
  where id = v_coupon.id;

  return jsonb_build_object(
    'redemptionId', v_redemption_id,
    'refundId', v_refund_id,
    'orderId', v_coupon.order_id,
    'cashSessionId', v_cash_session_id,
    'paymentMethod', v_payment.payment_method,
    'amount', v_payment.total_amount,
    'programId', v_program.id,
    'programName', v_program.display_name
  );
end;
$function$;


-- =========================================================
-- REMOVE LEGACY PROMOTION API / SETTINGS
-- Historical migrations remain immutable, but the effective schema is generic.
-- =========================================================

drop function if exists public.create_or_get_order_promo_coupon(uuid);
drop function if exists public.redeem_kong_coupons(text[], text);
drop function if exists public.redeem_lucky_dorian(text);

drop table if exists public.promo_settings;
drop function if exists public.set_promo_settings_updated_at();

-- =========================================================
-- RLS
-- =========================================================

alter table public.promotion_programs enable row level security;
alter table public.promotion_rewards enable row level security;

drop policy if exists "Authenticated users read promotion programs" on public.promotion_programs;
create policy "Authenticated users read promotion programs"
on public.promotion_programs for select to authenticated using (true);

drop policy if exists "Admins manage promotion programs" on public.promotion_programs;
create policy "Admins manage promotion programs"
on public.promotion_programs for all to authenticated
using (((select profiles.role from public.profiles where profiles.id = (select auth.uid())) = 'admin'::public.user_role))
with check (((select profiles.role from public.profiles where profiles.id = (select auth.uid())) = 'admin'::public.user_role));

drop policy if exists "Authenticated users read promotion rewards" on public.promotion_rewards;
create policy "Authenticated users read promotion rewards"
on public.promotion_rewards for select to authenticated using (true);

drop policy if exists "Admins manage promotion rewards" on public.promotion_rewards;
create policy "Admins manage promotion rewards"
on public.promotion_rewards for all to authenticated
using (((select profiles.role from public.profiles where profiles.id = (select auth.uid())) = 'admin'::public.user_role))
with check (((select profiles.role from public.profiles where profiles.id = (select auth.uid())) = 'admin'::public.user_role));

grant select, insert, update, delete on public.promotion_programs to authenticated;
grant select, insert, update, delete on public.promotion_rewards to authenticated;
grant execute on function public.create_or_get_order_promotion_coupon(uuid) to authenticated;
grant execute on function public.redeem_collect_promotion(uuid, text[], uuid, uuid) to authenticated;

grant execute on function public.redeem_order_refund_promotion(text) to authenticated;
