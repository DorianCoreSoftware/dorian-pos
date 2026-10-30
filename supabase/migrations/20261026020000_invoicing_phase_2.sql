-- ============================================================
-- DORIAN POS
-- FACTURACION - FASE 2
-- Ventas facturables + configuracion SAT por producto + borradores CFDI
-- ============================================================

-- ------------------------------------------------------------
-- 1. Catalogo fiscal de productos para administracion
-- ------------------------------------------------------------

create or replace function public.get_product_fiscal_settings_admin()
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  perform public.require_invoicing_admin();

  return coalesce(
    (
      select jsonb_agg(
        jsonb_build_object(
          'productId', p.id,
          'productName', p.name,
          'isActive', p.is_active,
          'productServiceCode', coalesce(fs.product_service_code, ''),
          'unitCode', coalesce(fs.unit_code, ''),
          'taxObjectCode', coalesce(fs.tax_object_code, ''),
          'vatRate', fs.vat_rate,
          'isReady', (
            fs.product_service_code is not null
            and fs.unit_code is not null
            and fs.tax_object_code is not null
            and fs.vat_rate is not null
          )
        )
        order by p.is_active desc, p.name asc
      )
      from public.products p
      left join public.product_fiscal_settings fs
        on fs.product_id = p.id
    ),
    '[]'::jsonb
  );
end;
$$;

create or replace function public.upsert_product_fiscal_setting_admin(
  p_product_id uuid,
  p_product_service_code text,
  p_unit_code text,
  p_tax_object_code text,
  p_vat_rate numeric
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_product_code text;
  v_unit_code text;
  v_tax_object text;
  v_vat numeric;
begin
  perform public.require_invoicing_admin();

  if not exists (
    select 1 from public.products p where p.id = p_product_id
  ) then
    raise exception 'Producto no encontrado';
  end if;

  v_product_code := trim(coalesce(p_product_service_code, ''));
  v_unit_code := upper(trim(coalesce(p_unit_code, '')));
  v_tax_object := trim(coalesce(p_tax_object_code, ''));
  v_vat := p_vat_rate;

  if v_product_code !~ '^[0-9]{8}$' then
    raise exception 'La ClaveProdServ debe contener 8 digitos';
  end if;

  if length(v_unit_code) < 1 or length(v_unit_code) > 8 then
    raise exception 'La ClaveUnidad no es valida';
  end if;

  if v_tax_object !~ '^[0-9]{2}$' then
    raise exception 'El objeto de impuesto debe contener 2 digitos';
  end if;

  if v_vat is null or v_vat < 0 or v_vat > 1 then
    raise exception 'La tasa de IVA no es valida';
  end if;

  insert into public.product_fiscal_settings (
    product_id,
    product_service_code,
    unit_code,
    tax_object_code,
    vat_rate,
    updated_at
  ) values (
    p_product_id,
    v_product_code,
    v_unit_code,
    v_tax_object,
    v_vat,
    now()
  )
  on conflict (product_id) do update
  set
    product_service_code = excluded.product_service_code,
    unit_code = excluded.unit_code,
    tax_object_code = excluded.tax_object_code,
    vat_rate = excluded.vat_rate,
    updated_at = now();

  return jsonb_build_object('ok', true);
end;
$$;

revoke all on function public.get_product_fiscal_settings_admin() from public;
grant execute on function public.get_product_fiscal_settings_admin() to authenticated;

revoke all on function public.upsert_product_fiscal_setting_admin(
  uuid, text, text, text, numeric
) from public;
grant execute on function public.upsert_product_fiscal_setting_admin(
  uuid, text, text, text, numeric
) to authenticated;

-- ------------------------------------------------------------
-- 2. Ventas facturables
-- ------------------------------------------------------------

create or replace function public.get_invoiceable_orders_admin()
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  perform public.require_invoicing_admin();

  return coalesce(
    (
      select jsonb_agg(row_data order by row_data ->> 'paidAt' desc)
      from (
        select jsonb_build_object(
          'orderId', o.id,
          'ticketCode', upper(right(replace(o.id::text, '-', ''), 6)),
          'orderTotal', o.total,
          'paymentTotal', op.total_amount,
          'paymentMethod', op.payment_method,
          'paidAt', op.created_at,
          'orderCreatedAt', o.created_at,
          'customerName', coalesce(o.customer_name, ''),
          'refundTotal', coalesce((
            select sum(r.refund_total)
            from public.order_refunds r
            where r.order_id = o.id
              and r.status = 'completed'
          ), 0),
          'invoiceId', linked.invoice_id,
          'invoiceStatus', linked.invoice_status,
          'invoiceSeries', linked.series,
          'invoiceFolio', linked.folio,
          'productsReady', not exists (
            select 1
            from public.order_items oi
            left join public.product_fiscal_settings fs
              on fs.product_id = oi.product_id
            where oi.order_id = o.id
              and (
                fs.product_id is null
                or fs.product_service_code is null
                or fs.unit_code is null
                or fs.tax_object_code is null
                or fs.vat_rate is null
              )
          ),
          'hasRewardItems', exists (
            select 1
            from public.order_items oi
            where oi.order_id = o.id
              and coalesce(oi.reward_source, '') <> ''
          ),
          'canInvoice', (
            o.status::text = 'delivered'
            and op.id is not null
            and coalesce((
              select sum(r.refund_total)
              from public.order_refunds r
              where r.order_id = o.id
                and r.status = 'completed'
            ), 0) = 0
            and linked.invoice_id is null
            and not exists (
              select 1
              from public.order_items oi
              left join public.product_fiscal_settings fs
                on fs.product_id = oi.product_id
              where oi.order_id = o.id
                and (
                  fs.product_id is null
                  or fs.product_service_code is null
                  or fs.unit_code is null
                  or fs.tax_object_code is null
                  or fs.vat_rate is null
                )
            )
            and not exists (
              select 1
              from public.order_items oi
              where oi.order_id = o.id
                and coalesce(oi.reward_source, '') <> ''
            )
          ),
          'blockReason', case
            when o.status::text <> 'delivered' then 'La orden no esta entregada'
            when op.id is null then 'La orden no tiene pago registrado'
            when coalesce((
              select sum(r.refund_total)
              from public.order_refunds r
              where r.order_id = o.id
                and r.status = 'completed'
            ), 0) > 0 then 'La venta tiene devoluciones y no puede facturarse en esta fase'
            when linked.invoice_id is not null then 'La venta ya esta ligada a una factura'
            when exists (
              select 1
              from public.order_items oi
              where oi.order_id = o.id
                and coalesce(oi.reward_source, '') <> ''
            ) then 'La venta contiene recompensas; se habilitara en una fase posterior'
            when exists (
              select 1
              from public.order_items oi
              left join public.product_fiscal_settings fs
                on fs.product_id = oi.product_id
              where oi.order_id = o.id
                and (
                  fs.product_id is null
                  or fs.product_service_code is null
                  or fs.unit_code is null
                  or fs.tax_object_code is null
                  or fs.vat_rate is null
                )
            ) then 'Falta configuracion SAT en uno o mas productos'
            else ''
          end
        ) as row_data
        from public.orders o
        join public.order_payments op
          on op.order_id = o.id
        left join lateral (
          select
            i.id as invoice_id,
            i.status as invoice_status,
            i.series,
            i.folio
          from public.invoice_order_links iol
          join public.invoices i on i.id = iol.invoice_id
          where iol.order_id = o.id
            and i.status <> 'cancelled'
          order by i.created_at desc
          limit 1
        ) linked on true
        where o.status::text = 'delivered'
        order by op.created_at desc
        limit 150
      ) q
    ),
    '[]'::jsonb
  );
end;
$$;

revoke all on function public.get_invoiceable_orders_admin() from public;
grant execute on function public.get_invoiceable_orders_admin() to authenticated;

-- ------------------------------------------------------------
-- 3. Crear borrador desde una venta
-- ------------------------------------------------------------

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

revoke all on function public.create_invoice_draft_from_order_admin(
  uuid, uuid, text
) from public;
grant execute on function public.create_invoice_draft_from_order_admin(
  uuid, uuid, text
) to authenticated;

-- ------------------------------------------------------------
-- 4. Consulta de borradores / documentos del modulo
-- ------------------------------------------------------------

create or replace function public.get_invoices_admin()
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  perform public.require_invoicing_admin();

  return coalesce(
    (
      select jsonb_agg(
        jsonb_build_object(
          'id', i.id,
          'series', i.series,
          'folio', i.folio,
          'status', i.status,
          'invoiceKind', i.invoice_kind,
          'receiverLegalName', i.receiver_legal_name,
          'receiverRfc', i.receiver_rfc,
          'cfdiUseCode', i.receiver_cfdi_use_code,
          'currencyCode', i.currency_code,
          'paymentFormCode', coalesce(i.payment_form_code, ''),
          'paymentMethodCode', coalesce(i.payment_method_code, ''),
          'subtotal', i.subtotal,
          'taxTotal', i.tax_total,
          'total', i.total,
          'cfdiUuid', i.cfdi_uuid,
          'createdAt', i.created_at,
          'stampedAt', i.stamped_at,
          'orders', coalesce((
            select jsonb_agg(
              jsonb_build_object(
                'orderId', iol.order_id,
                'linkedAmount', iol.linked_amount
              )
              order by iol.created_at asc
            )
            from public.invoice_order_links iol
            where iol.invoice_id = i.id
          ), '[]'::jsonb),
          'items', coalesce((
            select jsonb_agg(
              jsonb_build_object(
                'id', ii.id,
                'productId', ii.product_id,
                'description', ii.description,
                'quantity', ii.quantity,
                'unitPrice', ii.unit_price,
                'amount', ii.amount,
                'productServiceCode', coalesce(ii.product_service_code, ''),
                'unitCode', coalesce(ii.unit_code, ''),
                'taxObjectCode', coalesce(ii.tax_object_code, ''),
                'vatRate', ii.vat_rate,
                'taxAmount', ii.tax_amount
              )
              order by ii.created_at asc
            )
            from public.invoice_items ii
            where ii.invoice_id = i.id
          ), '[]'::jsonb)
        )
        order by i.created_at desc
      )
      from public.invoices i
    ),
    '[]'::jsonb
  );
end;
$$;

create or replace function public.delete_invoice_draft_admin(
  p_invoice_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  perform public.require_invoicing_admin();

  delete from public.invoices
  where id = p_invoice_id
    and status = 'draft';

  if not found then
    raise exception 'El borrador no existe o ya no puede eliminarse';
  end if;

  return jsonb_build_object('ok', true);
end;
$$;

revoke all on function public.get_invoices_admin() from public;
grant execute on function public.get_invoices_admin() to authenticated;

revoke all on function public.delete_invoice_draft_admin(uuid) from public;
grant execute on function public.delete_invoice_draft_admin(uuid) to authenticated;
