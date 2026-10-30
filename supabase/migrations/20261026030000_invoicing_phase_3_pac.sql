-- ============================================================
-- DORIAN POS
-- FACTURACION - FASE 3
-- Integracion PAC: estado de timbrado + almacenamiento privado
-- ============================================================

alter table public.invoices
  add column if not exists pac_environment text,
  add column if not exists pac_last_attempt_at timestamptz,
  add column if not exists pac_response jsonb;

alter table public.invoices
  drop constraint if exists invoices_pac_environment_check;

alter table public.invoices
  add constraint invoices_pac_environment_check
  check (pac_environment is null or pac_environment in ('sandbox', 'production'));

insert into storage.buckets (id, name, public)
values ('invoices', 'invoices', false)
on conflict (id) do update set public = false;

-- No se crean policies para authenticated. Los archivos fiscales se gestionan
-- exclusivamente desde Edge Functions con service_role.

create or replace function public.begin_invoice_stamping_admin(
  p_invoice_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_invoice public.invoices%rowtype;
begin
  perform public.require_invoicing_admin();

  select * into v_invoice
  from public.invoices
  where id = p_invoice_id
  for update;

  if not found then
    raise exception 'Factura no encontrada';
  end if;

  if v_invoice.status = 'stamped' then
    raise exception 'La factura ya esta timbrada';
  end if;

  if v_invoice.status = 'stamping' then
    raise exception 'La factura ya se esta timbrando';
  end if;

  if v_invoice.status not in ('draft', 'error') then
    raise exception 'La factura no puede timbrarse en su estado actual';
  end if;

  if trim(coalesce(v_invoice.issuer_legal_name, '')) = ''
     or trim(coalesce(v_invoice.issuer_rfc, '')) = ''
     or trim(coalesce(v_invoice.issuer_tax_regime_code, '')) = ''
     or trim(coalesce(v_invoice.issuer_postal_code, '')) = '' then
    raise exception 'Los datos fiscales del emisor estan incompletos';
  end if;

  if trim(coalesce(v_invoice.receiver_legal_name, '')) = ''
     or trim(coalesce(v_invoice.receiver_rfc, '')) = ''
     or trim(coalesce(v_invoice.receiver_tax_regime_code, '')) = ''
     or trim(coalesce(v_invoice.receiver_postal_code, '')) = ''
     or trim(coalesce(v_invoice.receiver_cfdi_use_code, '')) = '' then
    raise exception 'Los datos fiscales del receptor estan incompletos';
  end if;

  if v_invoice.total <= 0 then
    raise exception 'El total de la factura debe ser mayor a cero';
  end if;

  if not exists (
    select 1 from public.invoice_items ii where ii.invoice_id = p_invoice_id
  ) then
    raise exception 'La factura no tiene conceptos';
  end if;

  if exists (
    select 1
    from public.invoice_items ii
    where ii.invoice_id = p_invoice_id
      and (
        trim(coalesce(ii.product_service_code, '')) = ''
        or trim(coalesce(ii.unit_code, '')) = ''
        or trim(coalesce(ii.tax_object_code, '')) = ''
        or ii.vat_rate is null
      )
  ) then
    raise exception 'Uno o mas conceptos no tienen configuracion SAT completa';
  end if;

  update public.invoices
  set
    status = 'stamping',
    error_message = null,
    pac_last_attempt_at = now(),
    updated_at = now()
  where id = p_invoice_id;

  return jsonb_build_object(
    'id', v_invoice.id,
    'series', v_invoice.series,
    'folio', v_invoice.folio,
    'issuerLegalName', v_invoice.issuer_legal_name,
    'issuerRfc', v_invoice.issuer_rfc,
    'issuerTaxRegimeCode', v_invoice.issuer_tax_regime_code,
    'issuerPostalCode', v_invoice.issuer_postal_code,
    'receiverLegalName', v_invoice.receiver_legal_name,
    'receiverRfc', v_invoice.receiver_rfc,
    'receiverTaxRegimeCode', v_invoice.receiver_tax_regime_code,
    'receiverPostalCode', v_invoice.receiver_postal_code,
    'receiverCfdiUseCode', v_invoice.receiver_cfdi_use_code,
    'receiverEmail', coalesce(v_invoice.receiver_email, ''),
    'currencyCode', v_invoice.currency_code,
    'paymentFormCode', coalesce(v_invoice.payment_form_code, ''),
    'paymentMethodCode', coalesce(v_invoice.payment_method_code, ''),
    'subtotal', v_invoice.subtotal,
    'discount', v_invoice.discount,
    'taxTotal', v_invoice.tax_total,
    'total', v_invoice.total,
    'items', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'id', ii.id,
          'productId', ii.product_id,
          'description', ii.description,
          'quantity', ii.quantity,
          'unitPrice', ii.unit_price,
          'amount', ii.amount,
          'discount', ii.discount,
          'productServiceCode', ii.product_service_code,
          'unitCode', ii.unit_code,
          'taxObjectCode', ii.tax_object_code,
          'vatRate', ii.vat_rate,
          'taxAmount', ii.tax_amount
        )
        order by ii.created_at asc, ii.id asc
      )
      from public.invoice_items ii
      where ii.invoice_id = p_invoice_id
    ), '[]'::jsonb)
  );
end;
$$;

revoke all on function public.begin_invoice_stamping_admin(uuid) from public;
grant execute on function public.begin_invoice_stamping_admin(uuid) to authenticated;

create or replace function public.get_invoice_artifact_paths_admin(
  p_invoice_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_invoice public.invoices%rowtype;
begin
  perform public.require_invoicing_admin();

  select * into v_invoice
  from public.invoices
  where id = p_invoice_id;

  if not found then
    raise exception 'Factura no encontrada';
  end if;

  if v_invoice.status <> 'stamped' then
    raise exception 'La factura aun no esta timbrada';
  end if;

  return jsonb_build_object(
    'xmlStoragePath', coalesce(v_invoice.xml_storage_path, ''),
    'pdfStoragePath', coalesce(v_invoice.pdf_storage_path, '')
  );
end;
$$;

revoke all on function public.get_invoice_artifact_paths_admin(uuid) from public;
grant execute on function public.get_invoice_artifact_paths_admin(uuid) to authenticated;

-- Extiende consulta administrativa con metadatos PAC.
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
          'pacProvider', coalesce(i.pac_provider, ''),
          'pacEnvironment', coalesce(i.pac_environment, ''),
          'pacReference', coalesce(i.pac_reference, ''),
          'xmlStoragePath', coalesce(i.xml_storage_path, ''),
          'pdfStoragePath', coalesce(i.pdf_storage_path, ''),
          'errorMessage', coalesce(i.error_message, ''),
          'pacLastAttemptAt', i.pac_last_attempt_at,
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

revoke all on function public.get_invoices_admin() from public;
grant execute on function public.get_invoices_admin() to authenticated;
