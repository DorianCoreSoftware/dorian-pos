import { Linking, Platform } from 'react-native';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

import { EventQuoteSnapshot } from './adminEventsService';

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function formatMoney(value: number, currencyCode: string): string {
  try {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: currencyCode,
      minimumFractionDigits: 2,
    }).format(value);
  } catch {
    return `$${value.toFixed(2)}`;
  }
}

function formatDate(value: string): string {
  if (!value) return '—';
  const parts = value.slice(0, 10).split('-');
  if (parts.length !== 3) return value;
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

function formatCreatedAt(value: string): string {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('es-MX');
}

function buildQuoteHtml(quote: EventQuoteSnapshot): string {
  const extrasRows = quote.extras.length
    ? quote.extras
        .map(
          extra => `
            <tr>
              <td>${escapeHtml(extra.extraName)}${extra.quantity > 1 ? ` × ${extra.quantity}` : ''}</td>
              <td class="amount">${escapeHtml(formatMoney(extra.subtotal, quote.currencyCode))}</td>
            </tr>`,
        )
        .join('')
    : '<tr><td>Sin extras</td><td class="amount">—</td></tr>';

  const additionalGuestsRow = quote.additionalGuestCount > 0
    ? `
      <tr>
        <td>${quote.additionalGuestCount} personas adicionales × ${escapeHtml(formatMoney(quote.packageExtraGuestPrice, quote.currencyCode))}</td>
        <td class="amount">${escapeHtml(formatMoney(quote.additionalGuestSubtotal, quote.currencyCode))}</td>
      </tr>`
    : '';

  const terms = quote.terms.trim()
    ? escapeHtml(quote.terms).replace(/\n/g, '<br />')
    : 'Sin condiciones adicionales.';

  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <style>
    @page { margin: 24px; }
    * { box-sizing: border-box; }
    body { font-family: Arial, Helvetica, sans-serif; color: #171717; margin: 0; padding: 0; font-size: 12px; }
    .header { padding-bottom: 16px; border-bottom: 2px solid #171717; margin-bottom: 18px; }
    .brand { font-size: 22px; font-weight: 800; margin: 0; }
    .title { font-size: 16px; font-weight: 800; margin: 4px 0 0; }
    .meta { color: #666; margin-top: 5px; line-height: 1.5; }
    .grid { display: table; width: 100%; table-layout: fixed; margin-bottom: 16px; }
    .cell { display: table-cell; width: 50%; vertical-align: top; padding-right: 14px; }
    .section { margin-top: 18px; }
    .section-title { font-size: 13px; font-weight: 800; margin: 0 0 8px; text-transform: uppercase; }
    .line { margin: 4px 0; line-height: 1.45; }
    table { width: 100%; border-collapse: collapse; }
    th, td { padding: 8px 6px; border-bottom: 1px solid #ddd; text-align: left; }
    th { font-size: 11px; text-transform: uppercase; color: #666; }
    .amount { text-align: right; white-space: nowrap; }
    .total { font-size: 16px; font-weight: 800; }
    .summary { margin-top: 12px; margin-left: auto; width: 55%; }
    .summary-row { display: table; width: 100%; padding: 4px 0; }
    .summary-label, .summary-value { display: table-cell; }
    .summary-value { text-align: right; font-weight: 700; }
    .notice { margin-top: 18px; padding: 12px; background: #f4f4f4; border-radius: 8px; line-height: 1.5; }
    .footer { margin-top: 28px; padding-top: 12px; border-top: 1px solid #ddd; color: #777; font-size: 10px; line-height: 1.5; }
  </style>
</head>
<body>
  <div class="header">
    <p class="brand">${escapeHtml(quote.businessName)}</p>
    <p class="title">Cotización de evento #${quote.folio} · Versión ${quote.version}</p>
    <div class="meta">Emitida: ${escapeHtml(formatCreatedAt(quote.createdAt))}</div>
  </div>

  <div class="grid">
    <div class="cell">
      <div class="section-title">Cliente</div>
      <div class="line"><strong>Nombre:</strong> ${escapeHtml(quote.customerName)}</div>
      <div class="line"><strong>Teléfono:</strong> ${escapeHtml(quote.customerPhone || '—')}</div>
      <div class="line"><strong>Correo:</strong> ${escapeHtml(quote.customerEmail || '—')}</div>
    </div>
    <div class="cell">
      <div class="section-title">Evento</div>
      <div class="line"><strong>Fecha:</strong> ${escapeHtml(formatDate(quote.eventDate))}</div>
      <div class="line"><strong>Hora:</strong> ${escapeHtml(quote.eventTime ? quote.eventTime.slice(0, 5) : '—')}</div>
      <div class="line"><strong>Personas:</strong> ${quote.guestCount}</div>
      <div class="line"><strong>Tipo:</strong> ${escapeHtml(quote.eventTypeName || '—')}</div>
      <div class="line"><strong>Paquete:</strong> ${escapeHtml(quote.packageName || '—')}</div>
    </div>
  </div>

  <div class="section">
    <div class="section-title">Desglose</div>
    <table>
      <thead><tr><th>Concepto</th><th class="amount">Importe</th></tr></thead>
      <tbody>
        <tr><td>${escapeHtml(quote.packageName || 'Paquete')}</td><td class="amount">${escapeHtml(formatMoney(quote.packageBasePrice, quote.currencyCode))}</td></tr>
        ${additionalGuestsRow}
        ${extrasRows}
      </tbody>
    </table>

    <div class="summary">
      <div class="summary-row"><div class="summary-label">Total cotizado</div><div class="summary-value total">${escapeHtml(formatMoney(quote.effectiveTotal, quote.currencyCode))}</div></div>
      <div class="summary-row"><div class="summary-label">Anticipo requerido</div><div class="summary-value">${escapeHtml(formatMoney(quote.requiredDepositAmount, quote.currencyCode))}</div></div>
      <div class="summary-row"><div class="summary-label">Pagado</div><div class="summary-value">${escapeHtml(formatMoney(quote.paidAmount, quote.currencyCode))}</div></div>
      <div class="summary-row"><div class="summary-label">Anticipo pendiente</div><div class="summary-value">${escapeHtml(formatMoney(quote.pendingDepositAmount, quote.currencyCode))}</div></div>
      ${quote.paymentDueDate ? `<div class="summary-row"><div class="summary-label">Fecha límite de anticipo</div><div class="summary-value">${escapeHtml(formatDate(quote.paymentDueDate))}</div></div>` : ''}
    </div>
  </div>

  <div class="notice">
    <strong>Condiciones</strong><br />
    ${terms}
  </div>

  <div class="footer">
    Esta cotización corresponde a la versión ${quote.version} emitida el ${escapeHtml(formatCreatedAt(quote.createdAt))}.
    Los cambios posteriores en precios, paquetes, extras o condiciones no modifican esta versión histórica.
  </div>
</body>
</html>`;
}

export async function shareEventQuotePdf(quote: EventQuoteSnapshot): Promise<void> {
  const html = buildQuoteHtml(quote);

  if (Platform.OS === 'web') {
    const browser = globalThis as typeof globalThis & {
      open?: (url?: string, target?: string) => {
        document?: { open: () => void; write: (html: string) => void; close: () => void };
        focus?: () => void;
        print?: () => void;
      } | null;
    };
    const popup = browser.open?.('', '_blank');
    if (!popup?.document) {
      throw new Error('El navegador bloqueó la ventana de impresión. Permite ventanas emergentes e inténtalo de nuevo.');
    }
    popup.document.open();
    popup.document.write(html);
    popup.document.close();
    popup.focus?.();
    popup.print?.();
    return;
  }

  const result = await Print.printToFileAsync({ html });
  const canShare = await Sharing.isAvailableAsync();

  if (!canShare) {
    throw new Error('Este dispositivo no permite compartir archivos desde la aplicación.');
  }

  await Sharing.shareAsync(result.uri, {
    mimeType: 'application/pdf',
    dialogTitle: `Cotización evento #${quote.folio} · Versión ${quote.version}`,
    UTI: 'com.adobe.pdf',
  });
}

export function buildEventQuoteMessage(quote: EventQuoteSnapshot): string {
  const date = formatDate(quote.eventDate);
  const time = quote.eventTime ? quote.eventTime.slice(0, 5) : 'por definir';
  const total = formatMoney(quote.effectiveTotal, quote.currencyCode);
  const deposit = formatMoney(quote.requiredDepositAmount, quote.currencyCode);
  const pending = formatMoney(quote.pendingDepositAmount, quote.currencyCode);

  return [
    `Hola ${quote.customerName},`,
    '',
    `Te compartimos la cotización de tu evento con ${quote.businessName}.`,
    `Folio: #${quote.folio}`,
    `Versión: ${quote.version}`,
    `Fecha: ${date}`,
    `Hora: ${time}`,
    `Paquete: ${quote.packageName || '—'}`,
    `Personas: ${quote.guestCount}`,
    `Total: ${total}`,
    `Anticipo requerido: ${deposit}`,
    `Anticipo pendiente: ${pending}`,
    '',
    'Esta cotización está sujeta a las condiciones indicadas en el documento emitido.',
  ].join('\n');
}

export async function openEventQuoteWhatsApp(quote: EventQuoteSnapshot): Promise<void> {
  const phone = quote.customerPhone.replace(/\D/g, '');
  if (!phone) {
    throw new Error('La solicitud no tiene un teléfono válido para WhatsApp.');
  }

  const message = encodeURIComponent(buildEventQuoteMessage(quote));
  const url = `https://wa.me/${phone}?text=${message}`;
  const supported = await Linking.canOpenURL(url);
  if (!supported) {
    throw new Error('No se pudo abrir WhatsApp en este dispositivo.');
  }
  await Linking.openURL(url);
}

export async function openEventQuoteEmail(quote: EventQuoteSnapshot): Promise<void> {
  const email = quote.customerEmail.trim();
  if (!email) {
    throw new Error('La solicitud no tiene correo electrónico.');
  }

  const subject = encodeURIComponent(`Cotización de evento #${quote.folio} · ${quote.businessName} · V${quote.version}`);
  const body = encodeURIComponent(buildEventQuoteMessage(quote));
  const url = `mailto:${email}?subject=${subject}&body=${body}`;
  const supported = await Linking.canOpenURL(url);
  if (!supported) {
    throw new Error('No se encontró una aplicación de correo disponible.');
  }
  await Linking.openURL(url);
}
