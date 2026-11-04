import { supabase } from "../../services/supabase";


export type PublicEventExtraPricingType =
  | 'fixed'
  | 'per_guest'
  | 'per_unit';

export interface PublicEventSettings {
  minGuests: number;
  maxGuests: number;
  minAdvanceHours: number;
  maxAdvanceDays: number;
  quoteDisclaimer: string;
  terms: string;
}

export interface PublicEventType {
  id: string;
  name: string;
  description: string;
  position: number;
}

export interface PublicEventPackageItem {
  productId: string;
  productName: string;
  productDescription: string;
  productPrice: number;
  quantity: number;
}

export interface PublicEventPackage {
  id: string;
  eventTypeId: string;
  name: string;
  description: string;
  items: PublicEventPackageItem[];
  basePrice: number;
  includedGuests: number;
  extraGuestPrice: number;
  durationMinutes: number;
  extraIds: string[];
  position: number;
}

export interface PublicEventExtra {
  id: string;
  name: string;
  description: string;
  pricingType: PublicEventExtraPricingType;
  price: number;
  position: number;
}

export interface PublicEventCatalog {
  enabled: boolean;
  settings: PublicEventSettings;
  types: PublicEventType[];
  packages: PublicEventPackage[];
  extras: PublicEventExtra[];
}

interface PublicEventStatusRow {
  enabled: boolean;
}

interface PublicEventCatalogRpcResult {
  enabled?: boolean;
  settings?: {
    minGuests?: number;
    min_guests?: number;
    maxGuests?: number;
    max_guests?: number;
    minAdvanceHours?: number;
    min_advance_hours?: number;
    maxAdvanceDays?: number;
    max_advance_days?: number;
    quoteDisclaimer?: string | null;
    quote_disclaimer?: string | null;
    terms?: string | null;
  };
  types?: Array<{
    id: string;
    name: string;
    description?: string | null;
    position?: number;
  }>;
  packages?: Array<{
    id: string;
    eventTypeId?: string;
    event_type_id?: string;
    name: string;
    description?: string | null;
    items?: Array<{
      productId?: string;
      product_id?: string;
      productName?: string;
      product_name?: string;
      productDescription?: string | null;
      product_description?: string | null;
      productPrice?: number;
      product_price?: number;
      quantity?: number;
    }>;
    basePrice?: number;
    base_price?: number;
    includedGuests?: number;
    included_guests?: number;
    extraGuestPrice?: number;
    extra_guest_price?: number;
    durationMinutes?: number;
    duration_minutes?: number;
    extraIds?: string[];
    extra_ids?: string[];
    position?: number;
  }>;
  extras?: Array<{
    id: string;
    name: string;
    description?: string | null;
    pricingType?: PublicEventExtraPricingType;
    pricing_type?: PublicEventExtraPricingType;
    price?: number;
    position?: number;
  }>;
}

const DEFAULT_SETTINGS: PublicEventSettings = {
  minGuests: 1,
  maxGuests: 200,
  minAdvanceHours: 24,
  maxAdvanceDays: 180,
  quoteDisclaimer:
    'La cotización es estimada y está sujeta a disponibilidad y confirmación del negocio.',
  terms: '',
};

export async function getPublicEventsAvailability():
  Promise<boolean> {
  const {
    data,
    error,
  } = await supabase.rpc(
    'get_public_events_status',
  );

  if (error) {
    throw new Error(
      `No se pudo consultar Eventos: ${error.message}`,
    );
  }

  const row =
    (
      data as
        | PublicEventStatusRow[]
        | null
    )?.[0];

  return row?.enabled ?? false;
}

export async function getPublicEventCatalog():
  Promise<PublicEventCatalog> {
  const {
    data,
    error,
  } = await supabase.rpc(
    'get_public_event_quote_catalog',
  );

  if (error) {
    throw new Error(
      `No se pudo cargar el cotizador de eventos: ${error.message}`,
    );
  }

  const raw =
    (data ?? {}) as PublicEventCatalogRpcResult;

  const settings = raw.settings;

  return {
    enabled: raw.enabled ?? false,
    settings: {
      minGuests: Number(
        settings?.minGuests ??
        settings?.min_guests ??
        DEFAULT_SETTINGS.minGuests,
      ),
      maxGuests: Number(
        settings?.maxGuests ??
        settings?.max_guests ??
        DEFAULT_SETTINGS.maxGuests,
      ),
      minAdvanceHours: Number(
        settings?.minAdvanceHours ??
        settings?.min_advance_hours ??
        DEFAULT_SETTINGS.minAdvanceHours,
      ),
      maxAdvanceDays: Number(
        settings?.maxAdvanceDays ??
        settings?.max_advance_days ??
        DEFAULT_SETTINGS.maxAdvanceDays,
      ),
      quoteDisclaimer:
        settings?.quoteDisclaimer?.trim() ??
        settings?.quote_disclaimer?.trim() ??
        DEFAULT_SETTINGS.quoteDisclaimer,
      terms:
        settings?.terms?.trim() ?? '',
    },
    types: (raw.types ?? []).map(
      item => ({
        id: item.id,
        name: item.name,
        description:
          item.description?.trim() ?? '',
        position: Number(
          item.position ?? 0,
        ),
      }),
    ),
    packages: (raw.packages ?? []).map(
      item => ({
        id: item.id,
        eventTypeId:
          item.eventTypeId ??
          item.event_type_id ??
          '',
        name: item.name,
        description:
          item.description?.trim() ?? '',
        items: (item.items ?? []).map(packageItem => ({
          productId:
            packageItem.productId ??
            packageItem.product_id ??
            '',
          productName:
            packageItem.productName?.trim() ??
            packageItem.product_name?.trim() ??
            '',
          productDescription:
            packageItem.productDescription?.trim() ??
            packageItem.product_description?.trim() ??
            '',
          productPrice: Number(
            packageItem.productPrice ??
            packageItem.product_price ??
            0,
          ),
          quantity: Number(packageItem.quantity ?? 1),
        })),
        basePrice: Number(
          item.basePrice ??
          item.base_price ??
          0,
        ),
        includedGuests: Number(
          item.includedGuests ??
          item.included_guests ??
          1,
        ),
        extraGuestPrice: Number(
          item.extraGuestPrice ??
          item.extra_guest_price ??
          0,
        ),
        durationMinutes: Number(
          item.durationMinutes ??
          item.duration_minutes ??
          120,
        ),
        extraIds:
          item.extraIds ??
          item.extra_ids ??
          [],
        position: Number(
          item.position ?? 0,
        ),
      }),
    ),
    extras: (raw.extras ?? []).map(
      item => ({
        id: item.id,
        name: item.name,
        description:
          item.description?.trim() ?? '',
        pricingType:
          item.pricingType ??
          item.pricing_type ??
          'fixed',
        price: Number(
          item.price ?? 0,
        ),
        position: Number(
          item.position ?? 0,
        ),
      }),
    ),
  };
}


export interface SubmitPublicEventExtra {
  extraId: string;
  quantity: number;
}

export interface SubmitPublicEventRequestInput {
  eventTypeId: string;
  packageId: string;
  eventDate: string;
  eventTime: string;
  guestCount: number;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  customerNotes: string;
  extras: SubmitPublicEventExtra[];
}

export interface SubmitPublicEventRequestResult {
  id: string;
  folio: number;
  estimatedTotal: number;
  status: string;
  createdAt: string;
}

export async function submitPublicEventRequest(
  input: SubmitPublicEventRequestInput,
): Promise<SubmitPublicEventRequestResult> {
  const { data, error } = await supabase.rpc(
    'create_public_event_request',
    {
      p_event_type_id: input.eventTypeId,
      p_package_id: input.packageId,
      p_event_date: input.eventDate,
      p_event_time: input.eventTime || null,
      p_guest_count: input.guestCount,
      p_customer_name: input.customerName.trim(),
      p_customer_phone: input.customerPhone.trim(),
      p_customer_email: input.customerEmail.trim() || null,
      p_customer_notes: input.customerNotes.trim() || null,
      p_extras: input.extras.map(item => ({
        extraId: item.extraId,
        quantity: item.quantity,
      })),
    },
  );

  if (error) {
    throw new Error(`No se pudo enviar la solicitud: ${error.message}`);
  }

  const raw = (data ?? {}) as {
    id?: string;
    folio?: number;
    estimatedTotal?: number;
    estimated_total?: number;
    status?: string;
    createdAt?: string;
    created_at?: string;
  };

  if (!raw.id || !raw.folio) {
    throw new Error('La solicitud fue enviada, pero no pudimos confirmar su folio.');
  }

  return {
    id: raw.id,
    folio: Number(raw.folio),
    estimatedTotal: Number(raw.estimatedTotal ?? raw.estimated_total ?? 0),
    status: raw.status ?? 'new',
    createdAt: raw.createdAt ?? raw.created_at ?? '',
  };
}

export interface PublicEventSlot {
  time: string;
  endTime: string;
}

interface PublicEventSlotsRpcResult {
  enabled?: boolean;
  slots?: Array<{
    time?: string;
    endTime?: string;
    end_time?: string;
  }>;
}

export async function getPublicEventAvailableSlots(
  packageId: string,
  eventDate: string,
): Promise<PublicEventSlot[]> {
  const { data, error } = await supabase.rpc(
    'get_public_event_available_slots',
    {
      p_package_id: packageId,
      p_event_date: eventDate,
    },
  );

  if (error) {
    throw new Error(`No se pudieron consultar los horarios disponibles: ${error.message}`);
  }

  const raw = (data ?? {}) as PublicEventSlotsRpcResult;

  if (!raw.enabled) {
    return [];
  }

  return (raw.slots ?? [])
    .map(slot => ({
      time: (slot.time ?? '').slice(0, 5),
      endTime: (slot.endTime ?? slot.end_time ?? '').slice(0, 5),
    }))
    .filter(slot => !!slot.time && !!slot.endTime);
}
