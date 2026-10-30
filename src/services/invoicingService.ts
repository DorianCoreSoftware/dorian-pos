import { supabase } from './supabase';

export interface InvoicingSettings {
  legalName: string;
  rfc: string;
  taxRegimeCode: string;
  postalCode: string;
  invoiceSeries: string;
  globalInvoiceEnabled: boolean;
  globalPeriodicityCode: string;
}

export interface FiscalCustomer {
  id: string;
  alias: string;
  legalName: string;
  rfc: string;
  taxRegimeCode: string;
  postalCode: string;
  cfdiUseCode: string;
  email: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SaveFiscalCustomerInput {
  id?: string;
  alias: string;
  legalName: string;
  rfc: string;
  taxRegimeCode: string;
  postalCode: string;
  cfdiUseCode: string;
  email: string;
}

interface InvoicingSettingsRow {
  legal_name?: string | null;
  legalName?: string | null;
  rfc?: string | null;
  tax_regime_code?: string | null;
  taxRegimeCode?: string | null;
  postal_code?: string | null;
  postalCode?: string | null;
  invoice_series?: string | null;
  invoiceSeries?: string | null;
  global_invoice_enabled?: boolean | null;
  globalInvoiceEnabled?: boolean | null;
  global_periodicity_code?: string | null;
  globalPeriodicityCode?: string | null;
}

interface FiscalCustomerRow {
  id: string;
  alias?: string | null;
  legal_name?: string | null;
  legalName?: string | null;
  rfc?: string | null;
  tax_regime_code?: string | null;
  taxRegimeCode?: string | null;
  postal_code?: string | null;
  postalCode?: string | null;
  cfdi_use_code?: string | null;
  cfdiUseCode?: string | null;
  email?: string | null;
  is_active?: boolean | null;
  isActive?: boolean | null;
  created_at?: string | null;
  createdAt?: string | null;
  updated_at?: string | null;
  updatedAt?: string | null;
}

function normalizeRfc(value: string): string {
  return value.trim().toUpperCase();
}

function normalizeCode(value: string): string {
  return value.trim().toUpperCase();
}

function normalizePostalCode(value: string): string {
  return value.replace(/\D/g, '').slice(0, 5);
}

export async function getInvoicingSettings(): Promise<InvoicingSettings> {
  const { data, error } = await supabase.rpc(
    'get_invoicing_settings_admin',
  );

  if (error) {
    throw new Error(
      `No se pudo obtener la configuración fiscal: ${error.message}`,
    );
  }

  const row = (data ?? {}) as InvoicingSettingsRow;

  return {
    legalName: row.legalName ?? row.legal_name ?? '',
    rfc: row.rfc ?? '',
    taxRegimeCode:
      row.taxRegimeCode ?? row.tax_regime_code ?? '',
    postalCode:
      row.postalCode ?? row.postal_code ?? '',
    invoiceSeries:
      row.invoiceSeries ?? row.invoice_series ?? 'A',
    globalInvoiceEnabled:
      row.globalInvoiceEnabled ??
      row.global_invoice_enabled ??
      false,
    globalPeriodicityCode:
      row.globalPeriodicityCode ??
      row.global_periodicity_code ??
      '01',
  };
}

export async function saveInvoicingSettings(
  input: InvoicingSettings,
): Promise<void> {
  const legalName = input.legalName.trim();
  const rfc = normalizeRfc(input.rfc);
  const taxRegimeCode = normalizeCode(input.taxRegimeCode);
  const postalCode = normalizePostalCode(input.postalCode);
  const invoiceSeries = normalizeCode(input.invoiceSeries);
  const globalPeriodicityCode = normalizeCode(
    input.globalPeriodicityCode,
  );

  if (!legalName) {
    throw new Error('La razón social fiscal es obligatoria.');
  }

  if (!/^[A-Z&Ñ]{3,4}\d{6}[A-Z0-9]{3}$/.test(rfc)) {
    throw new Error('El RFC del emisor no tiene un formato válido.');
  }

  if (!/^\d{3}$/.test(taxRegimeCode)) {
    throw new Error('El régimen fiscal debe ser un código SAT de 3 dígitos.');
  }

  if (!/^\d{5}$/.test(postalCode)) {
    throw new Error('El código postal fiscal debe contener 5 dígitos.');
  }

  if (!/^[A-Z0-9-]{1,10}$/.test(invoiceSeries)) {
    throw new Error('La serie debe contener de 1 a 10 letras, números o guiones.');
  }

  if (!/^\d{2}$/.test(globalPeriodicityCode)) {
    throw new Error('La periodicidad debe ser un código SAT de 2 dígitos.');
  }

  const { error } = await supabase.rpc(
    'update_invoicing_settings_admin',
    {
      p_legal_name: legalName,
      p_rfc: rfc,
      p_tax_regime_code: taxRegimeCode,
      p_postal_code: postalCode,
      p_invoice_series: invoiceSeries,
      p_global_invoice_enabled: input.globalInvoiceEnabled,
      p_global_periodicity_code: globalPeriodicityCode,
    },
  );

  if (error) {
    throw new Error(
      `No se pudo guardar la configuración fiscal: ${error.message}`,
    );
  }
}

export async function getFiscalCustomers(): Promise<FiscalCustomer[]> {
  const { data, error } = await supabase.rpc(
    'get_fiscal_customers_admin',
  );

  if (error) {
    throw new Error(
      `No se pudieron obtener los clientes fiscales: ${error.message}`,
    );
  }

  return ((data ?? []) as FiscalCustomerRow[]).map(row => ({
    id: row.id,
    alias: row.alias ?? '',
    legalName: row.legalName ?? row.legal_name ?? '',
    rfc: row.rfc ?? '',
    taxRegimeCode:
      row.taxRegimeCode ?? row.tax_regime_code ?? '',
    postalCode:
      row.postalCode ?? row.postal_code ?? '',
    cfdiUseCode:
      row.cfdiUseCode ?? row.cfdi_use_code ?? '',
    email: row.email ?? '',
    isActive: row.isActive ?? row.is_active ?? true,
    createdAt: row.createdAt ?? row.created_at ?? '',
    updatedAt: row.updatedAt ?? row.updated_at ?? '',
  }));
}

export async function saveFiscalCustomer(
  input: SaveFiscalCustomerInput,
): Promise<string> {
  const alias = input.alias.trim();
  const legalName = input.legalName.trim();
  const rfc = normalizeRfc(input.rfc);
  const taxRegimeCode = normalizeCode(input.taxRegimeCode);
  const postalCode = normalizePostalCode(input.postalCode);
  const cfdiUseCode = normalizeCode(input.cfdiUseCode);
  const email = input.email.trim().toLowerCase();

  if (!legalName) {
    throw new Error('La razón social del cliente es obligatoria.');
  }

  if (!/^[A-Z&Ñ]{3,4}\d{6}[A-Z0-9]{3}$/.test(rfc)) {
    throw new Error('El RFC del cliente no tiene un formato válido.');
  }

  if (!/^\d{3}$/.test(taxRegimeCode)) {
    throw new Error('El régimen fiscal del cliente debe tener 3 dígitos.');
  }

  if (!/^\d{5}$/.test(postalCode)) {
    throw new Error('El código postal fiscal debe contener 5 dígitos.');
  }

  if (!/^[A-Z0-9]{3}$/.test(cfdiUseCode)) {
    throw new Error('El uso CFDI debe tener un código SAT válido, por ejemplo G03.');
  }

  if (email && !/^\S+@\S+\.\S+$/.test(email)) {
    throw new Error('El correo del cliente no es válido.');
  }

  const { data, error } = await supabase.rpc(
    'upsert_fiscal_customer_admin',
    {
      p_id: input.id ?? null,
      p_alias: alias || null,
      p_legal_name: legalName,
      p_rfc: rfc,
      p_tax_regime_code: taxRegimeCode,
      p_postal_code: postalCode,
      p_cfdi_use_code: cfdiUseCode,
      p_email: email || null,
    },
  );

  if (error) {
    throw new Error(
      `No se pudo guardar el cliente fiscal: ${error.message}`,
    );
  }

  if (!data || typeof data !== 'string') {
    throw new Error('No se obtuvo el identificador del cliente fiscal.');
  }

  return data;
}

export async function setFiscalCustomerActive(
  customerId: string,
  isActive: boolean,
): Promise<void> {
  const { error } = await supabase.rpc(
    'set_fiscal_customer_active_admin',
    {
      p_customer_id: customerId,
      p_is_active: isActive,
    },
  );

  if (error) {
    throw new Error(
      `No se pudo actualizar el cliente fiscal: ${error.message}`,
    );
  }
}

export interface ProductFiscalSettingAdmin {
  productId: string;
  productName: string;
  isActive: boolean;
  productServiceCode: string;
  unitCode: string;
  taxObjectCode: string;
  vatRate: number | null;
  isReady: boolean;
}

export interface SaveProductFiscalSettingInput {
  productId: string;
  productServiceCode: string;
  unitCode: string;
  taxObjectCode: string;
  vatRate: number;
}

export interface InvoiceableOrderAdmin {
  orderId: string;
  ticketCode: string;
  orderTotal: number;
  paymentTotal: number;
  paymentMethod: string;
  paidAt: string;
  orderCreatedAt: string;
  customerName: string;
  refundTotal: number;
  invoiceId: string | null;
  invoiceStatus: string | null;
  invoiceSeries: string | null;
  invoiceFolio: number | null;
  productsReady: boolean;
  hasRewardItems: boolean;
  canInvoice: boolean;
  blockReason: string;
}

export interface InvoiceAdminItem {
  id: string;
  productId: string | null;
  description: string;
  quantity: number;
  unitPrice: number;
  amount: number;
  productServiceCode: string;
  unitCode: string;
  taxObjectCode: string;
  vatRate: number | null;
  taxAmount: number;
}

export interface InvoiceAdmin {
  id: string;
  series: string;
  folio: number;
  status: string;
  invoiceKind: string;
  receiverLegalName: string;
  receiverRfc: string;
  cfdiUseCode: string;
  currencyCode: string;
  paymentFormCode: string;
  paymentMethodCode: string;
  subtotal: number;
  taxTotal: number;
  total: number;
  cfdiUuid: string | null;
  pacProvider: string;
  pacEnvironment: string;
  pacReference: string;
  xmlStoragePath: string;
  pdfStoragePath: string;
  errorMessage: string;
  pacLastAttemptAt: string | null;
  createdAt: string;
  stampedAt: string | null;
  orders: Array<{
    orderId: string;
    linkedAmount: number;
  }>;
  items: InvoiceAdminItem[];
}

interface ProductFiscalSettingRow {
  productId?: string;
  product_id?: string;
  productName?: string;
  product_name?: string;
  isActive?: boolean;
  is_active?: boolean;
  productServiceCode?: string;
  product_service_code?: string;
  unitCode?: string;
  unit_code?: string;
  taxObjectCode?: string;
  tax_object_code?: string;
  vatRate?: number | string | null;
  vat_rate?: number | string | null;
  isReady?: boolean;
  is_ready?: boolean;
}

interface InvoiceableOrderRow {
  orderId?: string;
  order_id?: string;
  ticketCode?: string;
  ticket_code?: string;
  orderTotal?: number | string | null;
  order_total?: number | string | null;
  paymentTotal?: number | string | null;
  payment_total?: number | string | null;
  paymentMethod?: string | null;
  payment_method?: string | null;
  paidAt?: string | null;
  paid_at?: string | null;
  orderCreatedAt?: string | null;
  order_created_at?: string | null;
  customerName?: string | null;
  customer_name?: string | null;
  refundTotal?: number | string | null;
  refund_total?: number | string | null;
  invoiceId?: string | null;
  invoice_id?: string | null;
  invoiceStatus?: string | null;
  invoice_status?: string | null;
  invoiceSeries?: string | null;
  invoice_series?: string | null;
  invoiceFolio?: number | string | null;
  invoice_folio?: number | string | null;
  productsReady?: boolean | null;
  products_ready?: boolean | null;
  hasRewardItems?: boolean | null;
  has_reward_items?: boolean | null;
  canInvoice?: boolean | null;
  can_invoice?: boolean | null;
  blockReason?: string | null;
  block_reason?: string | null;
}

interface InvoiceAdminRow {
  id: string;
  series?: string | null;
  folio?: number | string | null;
  status?: string | null;
  invoiceKind?: string | null;
  invoice_kind?: string | null;
  receiverLegalName?: string | null;
  receiver_legal_name?: string | null;
  receiverRfc?: string | null;
  receiver_rfc?: string | null;
  cfdiUseCode?: string | null;
  cfdi_use_code?: string | null;
  currencyCode?: string | null;
  currency_code?: string | null;
  paymentFormCode?: string | null;
  payment_form_code?: string | null;
  paymentMethodCode?: string | null;
  payment_method_code?: string | null;
  subtotal?: number | string | null;
  taxTotal?: number | string | null;
  tax_total?: number | string | null;
  total?: number | string | null;
  cfdiUuid?: string | null;
  cfdi_uuid?: string | null;
  pacProvider?: string | null;
  pac_provider?: string | null;
  pacEnvironment?: string | null;
  pac_environment?: string | null;
  pacReference?: string | null;
  pac_reference?: string | null;
  xmlStoragePath?: string | null;
  xml_storage_path?: string | null;
  pdfStoragePath?: string | null;
  pdf_storage_path?: string | null;
  errorMessage?: string | null;
  error_message?: string | null;
  pacLastAttemptAt?: string | null;
  pac_last_attempt_at?: string | null;
  createdAt?: string | null;
  created_at?: string | null;
  stampedAt?: string | null;
  stamped_at?: string | null;
  orders?: Array<{
    orderId?: string;
    order_id?: string;
    linkedAmount?: number | string | null;
    linked_amount?: number | string | null;
  }>;
  items?: Array<{
    id: string;
    productId?: string | null;
    product_id?: string | null;
    description?: string | null;
    quantity?: number | string | null;
    unitPrice?: number | string | null;
    unit_price?: number | string | null;
    amount?: number | string | null;
    productServiceCode?: string | null;
    product_service_code?: string | null;
    unitCode?: string | null;
    unit_code?: string | null;
    taxObjectCode?: string | null;
    tax_object_code?: string | null;
    vatRate?: number | string | null;
    vat_rate?: number | string | null;
    taxAmount?: number | string | null;
    tax_amount?: number | string | null;
  }>;
}

export async function getProductFiscalSettings(): Promise<
  ProductFiscalSettingAdmin[]
> {
  const { data, error } = await supabase.rpc(
    'get_product_fiscal_settings_admin',
  );

  if (error) {
    throw new Error(
      `No se pudo obtener la configuración fiscal de productos: ${error.message}`,
    );
  }

  return ((data ?? []) as ProductFiscalSettingRow[]).map(row => ({
    productId: row.productId ?? row.product_id ?? '',
    productName: row.productName ?? row.product_name ?? '',
    isActive: row.isActive ?? row.is_active ?? true,
    productServiceCode:
      row.productServiceCode ?? row.product_service_code ?? '',
    unitCode: row.unitCode ?? row.unit_code ?? '',
    taxObjectCode: row.taxObjectCode ?? row.tax_object_code ?? '',
    vatRate:
      row.vatRate ?? row.vat_rate ?? null,
    isReady: row.isReady ?? row.is_ready ?? false,
  })).map(row => ({
    ...row,
    vatRate: row.vatRate === null ? null : Number(row.vatRate),
  }));
}

export async function saveProductFiscalSetting(
  input: SaveProductFiscalSettingInput,
): Promise<void> {
  const productServiceCode = input.productServiceCode.trim();
  const unitCode = input.unitCode.trim().toUpperCase();
  const taxObjectCode = input.taxObjectCode.trim();
  const vatRate = Number(input.vatRate);

  if (!/^\d{8}$/.test(productServiceCode)) {
    throw new Error('La ClaveProdServ debe contener 8 dígitos.');
  }

  if (!unitCode || unitCode.length > 8) {
    throw new Error('La ClaveUnidad no es válida.');
  }

  if (!/^\d{2}$/.test(taxObjectCode)) {
    throw new Error('El objeto de impuesto debe contener 2 dígitos.');
  }

  if (!Number.isFinite(vatRate) || vatRate < 0 || vatRate > 1) {
    throw new Error('La tasa de IVA no es válida.');
  }

  const { error } = await supabase.rpc(
    'upsert_product_fiscal_setting_admin',
    {
      p_product_id: input.productId,
      p_product_service_code: productServiceCode,
      p_unit_code: unitCode,
      p_tax_object_code: taxObjectCode,
      p_vat_rate: vatRate,
    },
  );

  if (error) {
    throw new Error(
      `No se pudo guardar la configuración SAT del producto: ${error.message}`,
    );
  }
}

export async function getInvoiceableOrders(): Promise<
  InvoiceableOrderAdmin[]
> {
  const { data, error } = await supabase.rpc(
    'get_invoiceable_orders_admin',
  );

  if (error) {
    throw new Error(
      `No se pudieron obtener las ventas facturables: ${error.message}`,
    );
  }

  return ((data ?? []) as InvoiceableOrderRow[]).map(row => ({
    orderId: row.orderId ?? row.order_id ?? '',
    ticketCode: row.ticketCode ?? row.ticket_code ?? '',
    orderTotal: Number(row.orderTotal ?? row.order_total ?? 0),
    paymentTotal: Number(row.paymentTotal ?? row.payment_total ?? 0),
    paymentMethod: row.paymentMethod ?? row.payment_method ?? '',
    paidAt: row.paidAt ?? row.paid_at ?? '',
    orderCreatedAt: row.orderCreatedAt ?? row.order_created_at ?? '',
    customerName: row.customerName ?? row.customer_name ?? '',
    refundTotal: Number(row.refundTotal ?? row.refund_total ?? 0),
    invoiceId: row.invoiceId ?? row.invoice_id ?? null,
    invoiceStatus: row.invoiceStatus ?? row.invoice_status ?? null,
    invoiceSeries: row.invoiceSeries ?? row.invoice_series ?? null,
    invoiceFolio: (() => {
      const value = row.invoiceFolio ?? row.invoice_folio ?? null;
      return value === null ? null : Number(value);
    })(),
    productsReady: row.productsReady ?? row.products_ready ?? false,
    hasRewardItems: row.hasRewardItems ?? row.has_reward_items ?? false,
    canInvoice: row.canInvoice ?? row.can_invoice ?? false,
    blockReason: row.blockReason ?? row.block_reason ?? '',
  }));
}

export async function createInvoiceDraftFromOrder(input: {
  orderId: string;
  fiscalCustomerId: string;
  cfdiUseCode?: string;
}): Promise<string> {
  const { data, error } = await supabase.rpc(
    'create_invoice_draft_from_order_admin',
    {
      p_order_id: input.orderId,
      p_fiscal_customer_id: input.fiscalCustomerId,
      p_cfdi_use_code: input.cfdiUseCode?.trim().toUpperCase() || null,
    },
  );

  if (error) {
    throw new Error(
      `No se pudo crear el borrador de factura: ${error.message}`,
    );
  }

  if (!data || typeof data !== 'string') {
    throw new Error('No se obtuvo el identificador del borrador.');
  }

  return data;
}

export async function getInvoicesAdmin(): Promise<InvoiceAdmin[]> {
  const { data, error } = await supabase.rpc('get_invoices_admin');

  if (error) {
    throw new Error(
      `No se pudieron obtener las facturas: ${error.message}`,
    );
  }

  return ((data ?? []) as InvoiceAdminRow[]).map(row => ({
    id: row.id,
    series: row.series ?? '',
    folio: Number(row.folio ?? 0),
    status: row.status ?? 'draft',
    invoiceKind: row.invoiceKind ?? row.invoice_kind ?? 'regular',
    receiverLegalName:
      row.receiverLegalName ?? row.receiver_legal_name ?? '',
    receiverRfc: row.receiverRfc ?? row.receiver_rfc ?? '',
    cfdiUseCode: row.cfdiUseCode ?? row.cfdi_use_code ?? '',
    currencyCode: row.currencyCode ?? row.currency_code ?? 'MXN',
    paymentFormCode:
      row.paymentFormCode ?? row.payment_form_code ?? '',
    paymentMethodCode:
      row.paymentMethodCode ?? row.payment_method_code ?? '',
    subtotal: Number(row.subtotal ?? 0),
    taxTotal: Number(row.taxTotal ?? row.tax_total ?? 0),
    total: Number(row.total ?? 0),
    cfdiUuid: row.cfdiUuid ?? row.cfdi_uuid ?? null,
    pacProvider: row.pacProvider ?? row.pac_provider ?? '',
    pacEnvironment: row.pacEnvironment ?? row.pac_environment ?? '',
    pacReference: row.pacReference ?? row.pac_reference ?? '',
    xmlStoragePath: row.xmlStoragePath ?? row.xml_storage_path ?? '',
    pdfStoragePath: row.pdfStoragePath ?? row.pdf_storage_path ?? '',
    errorMessage: row.errorMessage ?? row.error_message ?? '',
    pacLastAttemptAt: row.pacLastAttemptAt ?? row.pac_last_attempt_at ?? null,
    createdAt: row.createdAt ?? row.created_at ?? '',
    stampedAt: row.stampedAt ?? row.stamped_at ?? null,
    orders: (row.orders ?? []).map(order => ({
      orderId: order.orderId ?? order.order_id ?? '',
      linkedAmount: Number(
        order.linkedAmount ?? order.linked_amount ?? 0,
      ),
    })),
    items: (row.items ?? []).map(item => ({
      id: item.id,
      productId: item.productId ?? item.product_id ?? null,
      description: item.description ?? '',
      quantity: Number(item.quantity ?? 0),
      unitPrice: Number(item.unitPrice ?? item.unit_price ?? 0),
      amount: Number(item.amount ?? 0),
      productServiceCode:
        item.productServiceCode ?? item.product_service_code ?? '',
      unitCode: item.unitCode ?? item.unit_code ?? '',
      taxObjectCode:
        item.taxObjectCode ?? item.tax_object_code ?? '',
      vatRate: (() => {
        const value = item.vatRate ?? item.vat_rate ?? null;
        return value === null ? null : Number(value);
      })(),
      taxAmount: Number(item.taxAmount ?? item.tax_amount ?? 0),
    })),
  }));
}

export async function deleteInvoiceDraft(invoiceId: string): Promise<void> {
  const { error } = await supabase.rpc(
    'delete_invoice_draft_admin',
    { p_invoice_id: invoiceId },
  );

  if (error) {
    throw new Error(
      `No se pudo eliminar el borrador: ${error.message}`,
    );
  }
}


export interface StampInvoiceResult {
  ok: true;
  invoiceId: string;
  provider: string;
  environment: 'sandbox' | 'production';
  providerId: string;
  uuid: string;
  artifactWarning: string | null;
}

export async function stampInvoice(invoiceId: string): Promise<StampInvoiceResult> {
  const { data, error } = await supabase.functions.invoke('invoice-pac', {
    body: { action: 'stamp', invoiceId },
  });

  if (error) {
    throw new Error(`No se pudo timbrar la factura: ${error.message}`);
  }

  if (data?.error) {
    throw new Error(String(data.error));
  }

  return data as StampInvoiceResult;
}

export async function getInvoiceArtifactUrl(
  invoiceId: string,
  format: 'xml' | 'pdf',
): Promise<string> {
  const { data, error } = await supabase.functions.invoke('invoice-pac', {
    body: { action: 'artifact', invoiceId, format },
  });

  if (error) {
    throw new Error(`No se pudo obtener el ${format.toUpperCase()}: ${error.message}`);
  }

  if (data?.error) {
    throw new Error(String(data.error));
  }

  if (!data?.url || typeof data.url !== 'string') {
    throw new Error(`No se obtuvo el enlace del ${format.toUpperCase()}.`);
  }

  return data.url;
}
