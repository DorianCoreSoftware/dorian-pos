import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.110.2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

type StampItem = {
  description: string;
  quantity: number | string;
  unitPrice: number | string;
  amount: number | string;
  discount: number | string;
  productServiceCode: string;
  unitCode: string;
  taxObjectCode: string;
  vatRate: number | string | null;
  taxAmount: number | string;
};

type StampSnapshot = {
  id: string;
  series: string;
  folio: number | string;
  issuerLegalName: string;
  issuerRfc: string;
  issuerTaxRegimeCode: string;
  issuerPostalCode: string;
  receiverLegalName: string;
  receiverRfc: string;
  receiverTaxRegimeCode: string;
  receiverPostalCode: string;
  receiverCfdiUseCode: string;
  receiverEmail: string;
  currencyCode: string;
  paymentFormCode: string;
  paymentMethodCode: string;
  subtotal: number | string;
  discount: number | string;
  taxTotal: number | string;
  total: number | string;
  items: StampItem[];
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function number(value: number | string | null | undefined): number {
  const result = Number(value ?? 0);
  return Number.isFinite(result) ? result : 0;
}

function facturamaBaseUrl(): string {
  return (Deno.env.get('FACTURAMA_ENV') ?? 'sandbox').toLowerCase() === 'production'
    ? 'https://api.facturama.mx'
    : 'https://apisandbox.facturama.mx';
}

function pacEnvironment(): 'sandbox' | 'production' {
  return (Deno.env.get('FACTURAMA_ENV') ?? 'sandbox').toLowerCase() === 'production'
    ? 'production'
    : 'sandbox';
}

function authHeader(): string {
  const username = Deno.env.get('FACTURAMA_USERNAME') ?? '';
  const password = Deno.env.get('FACTURAMA_PASSWORD') ?? '';
  if (!username || !password) {
    throw new Error('Faltan FACTURAMA_USERNAME y FACTURAMA_PASSWORD en los secretos de Supabase.');
  }
  return `Basic ${btoa(`${username}:${password}`)}`;
}

async function facturamaRequest(path: string, init: RequestInit = {}): Promise<any> {
  const response = await fetch(`${facturamaBaseUrl()}${path}`, {
    ...init,
    headers: {
      Authorization: authHeader(),
      Accept: 'application/json',
      ...(init.body ? { 'Content-Type': 'application/json' } : {}),
      ...(init.headers ?? {}),
    },
  });

  const raw = await response.text();
  let data: any = null;
  if (raw) {
    try { data = JSON.parse(raw); } catch { data = raw; }
  }

  if (!response.ok) {
    const message =
      (typeof data === 'object' && data && (data.Message || data.message || data.ModelState))
        ? JSON.stringify(data.Message || data.message || data.ModelState)
        : raw || `HTTP ${response.status}`;
    throw new Error(`Facturama ${response.status}: ${message}`);
  }

  return data;
}

function buildFacturamaPayload(invoice: StampSnapshot): Record<string, unknown> {
  return {
    NameId: 1,
    Serie: invoice.series,
    Folio: String(invoice.folio),
    CfdiType: 'I',
    PaymentForm: invoice.paymentFormCode,
    PaymentMethod: invoice.paymentMethodCode,
    Currency: invoice.currencyCode || 'MXN',
    ExpeditionPlace: invoice.issuerPostalCode,
    Exportation: '01',
    OrderNumber: invoice.id,
    Issuer: {
      Rfc: invoice.issuerRfc,
      Name: invoice.issuerLegalName,
      FiscalRegime: invoice.issuerTaxRegimeCode,
    },
    Receiver: {
      Rfc: invoice.receiverRfc,
      Name: invoice.receiverLegalName,
      CfdiUse: invoice.receiverCfdiUseCode,
      FiscalRegime: invoice.receiverTaxRegimeCode,
      TaxZipCode: invoice.receiverPostalCode,
    },
    Items: invoice.items.map(item => {
      const base = number(item.amount);
      const taxAmount = number(item.taxAmount);
      const vatRate = number(item.vatRate);
      const taxObject = item.taxObjectCode || '01';
      return {
        ProductCode: item.productServiceCode,
        Description: item.description,
        Unit: 'Unidad',
        UnitCode: item.unitCode,
        UnitPrice: number(item.unitPrice),
        Quantity: number(item.quantity),
        Subtotal: base,
        Discount: number(item.discount),
        TaxObject: taxObject,
        Taxes: taxObject === '02'
          ? [{
              Total: taxAmount,
              Name: 'IVA',
              Base: base,
              Rate: vatRate * 100,
              IsRetention: false,
              IsQuota: false,
              TaxObject: taxObject,
            }]
          : [],
        Total: base + taxAmount,
      };
    }),
  };
}

async function getArtifact(providerId: string, format: 'xml' | 'pdf'): Promise<string> {
  const data = await facturamaRequest(`/cfdi/${format}/issuedLite/${encodeURIComponent(providerId)}`);
  const content = data?.Content ?? data?.content;
  if (!content || typeof content !== 'string') {
    throw new Error(`Facturama no devolvio el ${format.toUpperCase()} del CFDI.`);
  }
  return content;
}

Deno.serve(async req => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const authorization = req.headers.get('Authorization') ?? '';

    if (!authorization) {
      return json({ error: 'Sesion no valida.' });
    }

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authorization } },
      auth: { persistSession: false },
    });
    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false },
    });

    const body = await req.json().catch(() => ({}));
    const action = String(body?.action ?? '');
    const invoiceId = String(body?.invoiceId ?? '');

    if (!invoiceId) {
      return json({ error: 'invoiceId es obligatorio.' });
    }

    if (action === 'artifact') {
      const format = body?.format === 'pdf' ? 'pdf' : 'xml';
      const { data: paths, error: pathsError } = await userClient.rpc(
        'get_invoice_artifact_paths_admin',
        { p_invoice_id: invoiceId },
      );
      if (pathsError) throw new Error(pathsError.message);
      let path = format === 'pdf' ? paths?.pdfStoragePath : paths?.xmlStoragePath;

      if (!path) {
        const { data: invoiceRow, error: invoiceError } = await adminClient
          .from('invoices')
          .select('pac_reference, cfdi_uuid')
          .eq('id', invoiceId)
          .single();
        if (invoiceError || !invoiceRow?.pac_reference || !invoiceRow?.cfdi_uuid) {
          throw new Error(`No se encontro el archivo ${format.toUpperCase()} ni la referencia PAC.`);
        }

        const base64 = await getArtifact(String(invoiceRow.pac_reference), format);
        const bytes = Uint8Array.from(atob(base64), c => c.charCodeAt(0));
        path = `${invoiceId}/${String(invoiceRow.cfdi_uuid).toUpperCase()}.${format}`;
        const contentType = format === 'pdf' ? 'application/pdf' : 'application/xml';
        const { error: uploadError } = await adminClient.storage
          .from('invoices')
          .upload(path, bytes, { contentType, upsert: true });
        if (uploadError) throw new Error(uploadError.message);

        await adminClient.from('invoices').update(
          format === 'pdf'
            ? { pdf_storage_path: path, updated_at: new Date().toISOString() }
            : { xml_storage_path: path, updated_at: new Date().toISOString() },
        ).eq('id', invoiceId);
      }

      const { data: signed, error: signedError } = await adminClient.storage
        .from('invoices')
        .createSignedUrl(path, 60);
      if (signedError || !signed?.signedUrl) {
        throw new Error(signedError?.message ?? 'No se pudo generar el enlace temporal.');
      }
      return json({ url: signed.signedUrl });
    }

    if (action !== 'stamp') {
      return json({ error: 'Accion no soportada.' });
    }

    const { data: snapshot, error: snapshotError } = await userClient.rpc(
      'begin_invoice_stamping_admin',
      { p_invoice_id: invoiceId },
    );
    if (snapshotError) throw new Error(snapshotError.message);

    const invoice = snapshot as StampSnapshot;
    const environment = pacEnvironment();

    if (environment !== 'sandbox') {
      await adminClient.from('invoices').update({
        status: 'error',
        pac_provider: 'facturama',
        pac_environment: environment,
        error_message: 'Fase 3 solo permite timbrado sandbox. Produccion se habilitara despues de validar conciliacion y cancelacion.',
        updated_at: new Date().toISOString(),
      }).eq('id', invoiceId).eq('status', 'stamping');
      return json({ error: 'Fase 3 solo permite timbrado sandbox.' });
    }

    try {
      const payload = buildFacturamaPayload(invoice);
      const providerResult = await facturamaRequest('/api-lite/3/cfdis', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      const providerId = String(providerResult?.Id ?? providerResult?.id ?? '');
      const uuid = String(
        providerResult?.Complement?.TaxStamp?.Uuid ??
        providerResult?.Complemento?.TaxStamp?.Uuid ??
        providerResult?.Uuid ??
        providerResult?.uuid ??
        '',
      ).toUpperCase();

      if (!providerId || !uuid) {
        throw new Error('Facturama respondio sin Id o UUID fiscal.');
      }

      // Primero persistimos el timbrado. Si la descarga de archivos falla,
      // el CFDI no se vuelve a timbrar por accidente.
      const { error: stampedError } = await adminClient
        .from('invoices')
        .update({
          status: 'stamped',
          pac_provider: 'facturama',
          pac_environment: environment,
          pac_reference: providerId,
          cfdi_uuid: uuid,
          stamped_at: new Date().toISOString(),
          pac_response: providerResult,
          error_message: null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', invoiceId)
        .eq('status', 'stamping');
      if (stampedError) throw new Error(stampedError.message);

      let xmlPath = '';
      let pdfPath = '';
      let artifactWarning = '';
      try {
        const [xmlBase64, pdfBase64] = await Promise.all([
          getArtifact(providerId, 'xml'),
          getArtifact(providerId, 'pdf'),
        ]);
        const xmlBytes = Uint8Array.from(atob(xmlBase64), c => c.charCodeAt(0));
        const pdfBytes = Uint8Array.from(atob(pdfBase64), c => c.charCodeAt(0));
        xmlPath = `${invoiceId}/${uuid}.xml`;
        pdfPath = `${invoiceId}/${uuid}.pdf`;

        const [{ error: xmlError }, { error: pdfError }] = await Promise.all([
          adminClient.storage.from('invoices').upload(xmlPath, xmlBytes, {
            contentType: 'application/xml', upsert: true,
          }),
          adminClient.storage.from('invoices').upload(pdfPath, pdfBytes, {
            contentType: 'application/pdf', upsert: true,
          }),
        ]);
        if (xmlError) throw xmlError;
        if (pdfError) throw pdfError;

        await adminClient.from('invoices').update({
          xml_storage_path: xmlPath,
          pdf_storage_path: pdfPath,
          updated_at: new Date().toISOString(),
        }).eq('id', invoiceId);
      } catch (artifactError) {
        artifactWarning = artifactError instanceof Error
          ? artifactError.message
          : 'No se pudieron guardar XML/PDF.';
        await adminClient.from('invoices').update({
          error_message: `CFDI timbrado correctamente, pero faltan archivos locales: ${artifactWarning}`,
          updated_at: new Date().toISOString(),
        }).eq('id', invoiceId);
      }

      return json({
        ok: true,
        invoiceId,
        provider: 'facturama',
        environment,
        providerId,
        uuid,
        artifactWarning: artifactWarning || null,
      });
    } catch (stampError) {
      const message = stampError instanceof Error ? stampError.message : 'Error de timbrado.';
      await adminClient.from('invoices').update({
        status: 'error',
        pac_provider: 'facturama',
        pac_environment: environment,
        error_message: message,
        pac_last_attempt_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }).eq('id', invoiceId).eq('status', 'stamping');
      throw stampError;
    }
  } catch (error) {
    return json({
      error: error instanceof Error ? error.message : 'Error inesperado.',
    });
  }
});
