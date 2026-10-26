import { supabase } from '../../../services/supabase';
import {
  EventQuoteSnapshot,
  EventQuoteSnapshotExtra,
  EventRequestStatus,
} from '../../../services/adminEventsService';

export type PublicEventQuotePortalReason =
  | 'invalid'
  | 'revoked'
  | 'expired'
  | 'superseded'
  | null;

export type PublicEventQuotePortalResponse =
  | 'accepted'
  | 'rejected'
  | null;

export interface PublicEventQuotePortal {
  available: boolean;
  reason: PublicEventQuotePortalReason;
  canRespond: boolean;
  response: PublicEventQuotePortalResponse;
  respondedAt: string;
  requestStatus: EventRequestStatus | '';
  currentPaidAmount: number;
  currentRequiredDepositAmount: number;
  currentPendingDepositAmount: number;
  currentPaymentStatus: 'not_required' | 'pending' | 'partial' | 'paid';
  quote: EventQuoteSnapshot | null;
}

interface PortalRpcResult {
  available?: boolean;
  reason?: PublicEventQuotePortalReason;
  canRespond?: boolean;
  can_respond?: boolean;
  response?: PublicEventQuotePortalResponse;
  respondedAt?: string | null;
  responded_at?: string | null;
  requestStatus?: EventRequestStatus;
  request_status?: EventRequestStatus;
  currentPaidAmount?: number;
  current_paid_amount?: number;
  currentRequiredDepositAmount?: number;
  current_required_deposit_amount?: number;
  currentPendingDepositAmount?: number;
  current_pending_deposit_amount?: number;
  currentPaymentStatus?: 'not_required' | 'pending' | 'partial' | 'paid';
  current_payment_status?: 'not_required' | 'pending' | 'partial' | 'paid';
  quote?: Record<string, unknown> | null;
}

function mapQuote(raw: Record<string, unknown>): EventQuoteSnapshot {
  const readString = (camel: string, snake: string): string =>
    String(raw[camel] ?? raw[snake] ?? '');

  const readNumber = (camel: string, snake: string): number =>
    Number(raw[camel] ?? raw[snake] ?? 0);

  const extras = (
    (raw.extras ?? []) as Array<Record<string, unknown>>
  ).map<EventQuoteSnapshotExtra>(extra => ({
    id: String(extra.id ?? ''),
    extraId: (extra.extraId ?? extra.extra_id ?? null) as string | null,
    extraName: String(extra.extraName ?? extra.extra_name ?? ''),
    pricingType:
      (extra.pricingType ?? extra.pricing_type ?? 'fixed') as EventQuoteSnapshotExtra['pricingType'],
    unitPrice: Number(extra.unitPrice ?? extra.unit_price ?? 0),
    quantity: Number(extra.quantity ?? 0),
    subtotal: Number(extra.subtotal ?? 0),
  }));

  return {
    id: readString('id', 'id'),
    requestId: readString('requestId', 'request_id'),
    folio: readNumber('folio', 'folio'),
    version: readNumber('version', 'version'),
    businessName: readString('businessName', 'business_name'),
    currencyCode: readString('currencyCode', 'currency_code') || 'MXN',
    customerName: readString('customerName', 'customer_name'),
    customerPhone: readString('customerPhone', 'customer_phone'),
    customerEmail: readString('customerEmail', 'customer_email'),
    eventTypeName: readString('eventTypeName', 'event_type_name'),
    packageName: readString('packageName', 'package_name'),
    eventDate: readString('eventDate', 'event_date'),
    eventTime: readString('eventTime', 'event_time'),
    guestCount: readNumber('guestCount', 'guest_count'),
    packageBasePrice: readNumber('packageBasePrice', 'package_base_price'),
    packageExtraGuestPrice: readNumber('packageExtraGuestPrice', 'package_extra_guest_price'),
    additionalGuestCount: readNumber('additionalGuestCount', 'additional_guest_count'),
    additionalGuestSubtotal: readNumber('additionalGuestSubtotal', 'additional_guest_subtotal'),
    extras,
    estimatedTotal: readNumber('estimatedTotal', 'estimated_total'),
    quotedTotal:
      raw.quotedTotal !== undefined || raw.quoted_total !== undefined
        ? Number(raw.quotedTotal ?? raw.quoted_total)
        : null,
    effectiveTotal: readNumber('effectiveTotal', 'effective_total'),
    requiredDepositAmount: readNumber('requiredDepositAmount', 'required_deposit_amount'),
    paidAmount: readNumber('paidAmount', 'paid_amount'),
    pendingDepositAmount: readNumber('pendingDepositAmount', 'pending_deposit_amount'),
    paymentDueDate: readString('paymentDueDate', 'payment_due_date'),
    terms: readString('terms', 'terms'),
    createdAt: readString('createdAt', 'created_at'),
  };
}

function mapPortal(raw: PortalRpcResult): PublicEventQuotePortal {
  return {
    available: raw.available ?? false,
    reason: raw.reason ?? null,
    canRespond: raw.canRespond ?? raw.can_respond ?? false,
    response: raw.response ?? null,
    respondedAt: raw.respondedAt ?? raw.responded_at ?? '',
    requestStatus: raw.requestStatus ?? raw.request_status ?? '',
    currentPaidAmount: Number(raw.currentPaidAmount ?? raw.current_paid_amount ?? 0),
    currentRequiredDepositAmount: Number(
      raw.currentRequiredDepositAmount ?? raw.current_required_deposit_amount ?? 0,
    ),
    currentPendingDepositAmount: Number(
      raw.currentPendingDepositAmount ?? raw.current_pending_deposit_amount ?? 0,
    ),
    currentPaymentStatus:
      raw.currentPaymentStatus ??
      raw.current_payment_status ??
      'not_required',
    quote: raw.quote ? mapQuote(raw.quote) : null,
  };
}

export async function getPublicEventQuotePortal(
  token: string,
): Promise<PublicEventQuotePortal> {
  if (!token.trim()) {
    return mapPortal({ available: false, reason: 'invalid' });
  }

  const { data, error } = await supabase.rpc(
    'get_public_event_quote_portal',
    {
      p_token: token.trim(),
    },
  );

  if (error) {
    throw new Error(`No se pudo abrir la cotización: ${error.message}`);
  }

  return mapPortal((data ?? {}) as PortalRpcResult);
}

export async function respondPublicEventQuote(
  token: string,
  response: 'accepted' | 'rejected',
): Promise<PublicEventQuotePortal> {
  const { error } = await supabase.rpc(
    'respond_public_event_quote',
    {
      p_token: token.trim(),
      p_response: response,
    },
  );

  if (error) {
    throw new Error(`No se pudo registrar tu respuesta: ${error.message}`);
  }

  return getPublicEventQuotePortal(token);
}
