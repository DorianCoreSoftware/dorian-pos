import { supabase } from './supabase';

export interface EventSettings {
  publicQuoteEnabled: boolean;
  minGuests: number;
  maxGuests: number;
  minAdvanceHours: number;
  maxAdvanceDays: number;
  quoteDisclaimer: string;
  terms: string;
}

export interface EventTypeAdmin {
  id: string;
  name: string;
  description: string;
  position: number;
  isActive: boolean;
}

export interface EventPackageAdmin {
  id: string;
  eventTypeId: string | null;
  eventTypeName: string;
  name: string;
  description: string;
  basePrice: number;
  includedGuests: number;
  extraGuestPrice: number;
  durationMinutes: number;
  extraIds: string[];
  position: number;
  isActive: boolean;
}

export type EventExtraPricingType =
  | 'fixed'
  | 'per_guest'
  | 'per_unit';

export interface EventExtraAdmin {
  id: string;
  name: string;
  description: string;
  pricingType: EventExtraPricingType;
  price: number;
  position: number;
  isActive: boolean;
}

export interface EventAdminCatalog {
  types: EventTypeAdmin[];
  packages: EventPackageAdmin[];
  extras: EventExtraAdmin[];
}

interface EventSettingsRow {
  public_quote_enabled: boolean;
  min_guests: number;
  max_guests: number;
  min_advance_hours: number;
  max_advance_days: number;
  quote_disclaimer: string | null;
  terms: string | null;
}

interface EventTypeRpcRow {
  id: string;
  name: string;
  description?: string | null;
  position: number;
  isActive?: boolean;
  is_active?: boolean;
}

interface EventPackageRpcRow {
  id: string;
  eventTypeId?: string | null;
  event_type_id?: string | null;
  eventTypeName?: string | null;
  event_type_name?: string | null;
  name: string;
  description?: string | null;
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
  position: number;
  isActive?: boolean;
  is_active?: boolean;
}

interface EventExtraRpcRow {
  id: string;
  name: string;
  description?: string | null;
  pricingType?: EventExtraPricingType;
  pricing_type?: EventExtraPricingType;
  price: number;
  position: number;
  isActive?: boolean;
  is_active?: boolean;
}

interface EventCatalogRpcResult {
  types?: EventTypeRpcRow[];
  packages?: EventPackageRpcRow[];
  extras?: EventExtraRpcRow[];
}

export const DEFAULT_EVENT_SETTINGS: EventSettings = {
  publicQuoteEnabled: false,
  minGuests: 1,
  maxGuests: 200,
  minAdvanceHours: 24,
  maxAdvanceDays: 180,
  quoteDisclaimer:
    'La cotización es estimada y está sujeta a disponibilidad y confirmación del negocio.',
  terms: '',
};

function requiredText(
  value: string,
  label: string,
  maxLength: number,
): string {
  const normalized = value.trim();

  if (!normalized) {
    throw new Error(`${label} es obligatorio.`);
  }

  if (normalized.length > maxLength) {
    throw new Error(
      `${label} no puede superar ${maxLength} caracteres.`,
    );
  }

  return normalized;
}

function optionalText(
  value: string,
  label: string,
  maxLength: number,
): string {
  const normalized = value.trim();

  if (normalized.length > maxLength) {
    throw new Error(
      `${label} no puede superar ${maxLength} caracteres.`,
    );
  }

  return normalized;
}

function nonNegativeNumber(
  value: number,
  label: string,
): number {
  if (!Number.isFinite(value) || value < 0) {
    throw new Error(`${label} debe ser un número válido mayor o igual a cero.`);
  }

  return Math.round(value * 100) / 100;
}

function positiveInteger(
  value: number,
  label: string,
): number {
  const normalized = Math.trunc(value);

  if (!Number.isFinite(value) || normalized <= 0) {
    throw new Error(`${label} debe ser mayor a cero.`);
  }

  return normalized;
}

function mapEventType(
  row: EventTypeRpcRow,
): EventTypeAdmin {
  return {
    id: row.id,
    name: row.name,
    description: row.description?.trim() ?? '',
    position: row.position,
    isActive: row.isActive ?? row.is_active ?? true,
  };
}

function mapEventPackage(
  row: EventPackageRpcRow,
): EventPackageAdmin {
  return {
    id: row.id,
    eventTypeId: row.eventTypeId ?? row.event_type_id ?? null,
    eventTypeName:
      row.eventTypeName?.trim() ??
      row.event_type_name?.trim() ??
      '',
    name: row.name,
    description: row.description?.trim() ?? '',
    basePrice: Number(row.basePrice ?? row.base_price ?? 0),
    includedGuests: Number(
      row.includedGuests ?? row.included_guests ?? 1,
    ),
    extraGuestPrice: Number(
      row.extraGuestPrice ?? row.extra_guest_price ?? 0,
    ),
    durationMinutes: Number(
      row.durationMinutes ?? row.duration_minutes ?? 120,
    ),
    extraIds: row.extraIds ?? row.extra_ids ?? [],
    position: row.position,
    isActive: row.isActive ?? row.is_active ?? true,
  };
}

function mapEventExtra(
  row: EventExtraRpcRow,
): EventExtraAdmin {
  return {
    id: row.id,
    name: row.name,
    description: row.description?.trim() ?? '',
    pricingType:
      row.pricingType ?? row.pricing_type ?? 'fixed',
    price: Number(row.price ?? 0),
    position: row.position,
    isActive: row.isActive ?? row.is_active ?? true,
  };
}

export async function getEventSettings(): Promise<EventSettings> {
  const { data, error } = await supabase
    .from('event_settings')
    .select(`
      public_quote_enabled,
      min_guests,
      max_guests,
      min_advance_hours,
      max_advance_days,
      quote_disclaimer,
      terms
    `)
    .eq('id', 1)
    .single();

  if (error) {
    throw new Error(
      `No se pudo obtener la configuración de eventos: ${error.message}`,
    );
  }

  const row = data as EventSettingsRow;

  return {
    publicQuoteEnabled:
      row.public_quote_enabled ?? DEFAULT_EVENT_SETTINGS.publicQuoteEnabled,
    minGuests:
      row.min_guests ?? DEFAULT_EVENT_SETTINGS.minGuests,
    maxGuests:
      row.max_guests ?? DEFAULT_EVENT_SETTINGS.maxGuests,
    minAdvanceHours:
      row.min_advance_hours ?? DEFAULT_EVENT_SETTINGS.minAdvanceHours,
    maxAdvanceDays:
      row.max_advance_days ?? DEFAULT_EVENT_SETTINGS.maxAdvanceDays,
    quoteDisclaimer:
      row.quote_disclaimer?.trim() ??
      DEFAULT_EVENT_SETTINGS.quoteDisclaimer,
    terms:
      row.terms?.trim() ?? '',
  };
}

export async function saveEventSettings(
  input: EventSettings,
): Promise<void> {
  const minGuests = Math.trunc(input.minGuests);
  const maxGuests = Math.trunc(input.maxGuests);
  const minAdvanceHours = Math.trunc(input.minAdvanceHours);
  const maxAdvanceDays = Math.trunc(input.maxAdvanceDays);
  const quoteDisclaimer = input.quoteDisclaimer.trim();
  const terms = input.terms.trim();

  if (minGuests <= 0) {
    throw new Error(
      'El mínimo de personas debe ser mayor a cero.',
    );
  }

  if (maxGuests < minGuests) {
    throw new Error(
      'El máximo de personas no puede ser menor al mínimo.',
    );
  }

  if (minAdvanceHours < 0) {
    throw new Error(
      'La anticipación mínima no puede ser negativa.',
    );
  }

  if (maxAdvanceDays <= 0) {
    throw new Error(
      'El periodo máximo para cotizar debe ser mayor a cero días.',
    );
  }

  if (quoteDisclaimer.length > 300) {
    throw new Error(
      'El aviso de cotización no puede superar 300 caracteres.',
    );
  }

  if (terms.length > 3000) {
    throw new Error(
      'Las condiciones no pueden superar 3000 caracteres.',
    );
  }

  const { error } = await supabase.rpc(
    'update_event_settings',
    {
      p_public_quote_enabled:
        input.publicQuoteEnabled,
      p_min_guests:
        minGuests,
      p_max_guests:
        maxGuests,
      p_min_advance_hours:
        minAdvanceHours,
      p_max_advance_days:
        maxAdvanceDays,
      p_quote_disclaimer:
        quoteDisclaimer,
      p_terms:
        terms,
    },
  );

  if (error) {
    throw new Error(
      `No se pudo guardar la configuración de eventos: ${error.message}`,
    );
  }
}

export async function getEventAdminCatalog(): Promise<EventAdminCatalog> {
  const { data, error } = await supabase.rpc(
    'get_event_admin_catalog',
  );

  if (error) {
    throw new Error(
      `No se pudo obtener el catálogo de eventos: ${error.message}`,
    );
  }

  const result = (data ?? {}) as EventCatalogRpcResult;

  return {
    types: (result.types ?? []).map(mapEventType),
    packages: (result.packages ?? []).map(mapEventPackage),
    extras: (result.extras ?? []).map(mapEventExtra),
  };
}

export interface SaveEventTypeInput {
  id?: string;
  name: string;
  description: string;
  isActive: boolean;
}

export async function saveEventType(
  input: SaveEventTypeInput,
): Promise<void> {
  const name = requiredText(input.name, 'El nombre', 80);
  const description = optionalText(
    input.description,
    'La descripción',
    400,
  );

  const rpcName = input.id
    ? 'update_event_type'
    : 'create_event_type';

  const params = input.id
    ? {
        p_event_type_id: input.id,
        p_name: name,
        p_description: description,
        p_is_active: input.isActive,
      }
    : {
        p_name: name,
        p_description: description,
        p_is_active: input.isActive,
      };

  const { error } = await supabase.rpc(
    rpcName,
    params,
  );

  if (error) {
    throw new Error(
      `No se pudo guardar el tipo de evento: ${error.message}`,
    );
  }
}

export async function setEventTypeActive(
  id: string,
  isActive: boolean,
): Promise<void> {
  const { error } = await supabase.rpc(
    'set_event_type_active',
    {
      p_event_type_id: id,
      p_is_active: isActive,
    },
  );

  if (error) {
    throw new Error(
      `No se pudo actualizar el tipo de evento: ${error.message}`,
    );
  }
}

export async function reorderEventTypes(
  ids: string[],
): Promise<void> {
  const { error } = await supabase.rpc(
    'reorder_event_types',
    {
      p_event_type_ids: ids,
    },
  );

  if (error) {
    throw new Error(
      `No se pudo reordenar los tipos de evento: ${error.message}`,
    );
  }
}

export interface SaveEventPackageInput {
  id?: string;
  eventTypeId: string | null;
  name: string;
  description: string;
  basePrice: number;
  includedGuests: number;
  extraGuestPrice: number;
  durationMinutes: number;
  extraIds: string[];
  isActive: boolean;
}

export async function saveEventPackage(
  input: SaveEventPackageInput,
): Promise<void> {
  const name = requiredText(input.name, 'El nombre', 100);
  const description = optionalText(
    input.description,
    'La descripción',
    600,
  );
  const basePrice = nonNegativeNumber(
    input.basePrice,
    'El precio base',
  );
  const includedGuests = positiveInteger(
    input.includedGuests,
    'Las personas incluidas',
  );
  const extraGuestPrice = nonNegativeNumber(
    input.extraGuestPrice,
    'El precio por persona adicional',
  );
  const durationMinutes = positiveInteger(
    input.durationMinutes,
    'La duración',
  );

  const extraIds = Array.from(
    new Set(input.extraIds),
  );

  const { error } = await supabase.rpc(
    'save_event_package_admin',
    {
      p_package_id: input.id ?? null,
      p_event_type_id: input.eventTypeId,
      p_name: name,
      p_description: description,
      p_base_price: basePrice,
      p_included_guests: includedGuests,
      p_extra_guest_price: extraGuestPrice,
      p_duration_minutes: durationMinutes,
      p_is_active: input.isActive,
      p_extra_ids: extraIds,
    },
  );

  if (error) {
    throw new Error(
      `No se pudo guardar el paquete: ${error.message}`,
    );
  }
}

export async function setEventPackageActive(
  id: string,
  isActive: boolean,
): Promise<void> {
  const { error } = await supabase.rpc(
    'set_event_package_active',
    {
      p_package_id: id,
      p_is_active: isActive,
    },
  );

  if (error) {
    throw new Error(
      `No se pudo actualizar el paquete: ${error.message}`,
    );
  }
}

export async function reorderEventPackages(
  ids: string[],
): Promise<void> {
  const { error } = await supabase.rpc(
    'reorder_event_packages',
    {
      p_package_ids: ids,
    },
  );

  if (error) {
    throw new Error(
      `No se pudo reordenar los paquetes: ${error.message}`,
    );
  }
}

export interface SaveEventExtraInput {
  id?: string;
  name: string;
  description: string;
  pricingType: EventExtraPricingType;
  price: number;
  isActive: boolean;
}

export async function saveEventExtra(
  input: SaveEventExtraInput,
): Promise<void> {
  const name = requiredText(input.name, 'El nombre', 100);
  const description = optionalText(
    input.description,
    'La descripción',
    600,
  );
  const price = nonNegativeNumber(
    input.price,
    'El precio',
  );

  const rpcName = input.id
    ? 'update_event_extra'
    : 'create_event_extra';

  const baseParams = {
    p_name: name,
    p_description: description,
    p_pricing_type: input.pricingType,
    p_price: price,
    p_is_active: input.isActive,
  };

  const params = input.id
    ? {
        p_extra_id: input.id,
        ...baseParams,
      }
    : baseParams;

  const { error } = await supabase.rpc(
    rpcName,
    params,
  );

  if (error) {
    throw new Error(
      `No se pudo guardar el extra: ${error.message}`,
    );
  }
}

export async function setEventExtraActive(
  id: string,
  isActive: boolean,
): Promise<void> {
  const { error } = await supabase.rpc(
    'set_event_extra_active',
    {
      p_extra_id: id,
      p_is_active: isActive,
    },
  );

  if (error) {
    throw new Error(
      `No se pudo actualizar el extra: ${error.message}`,
    );
  }
}

export async function reorderEventExtras(
  ids: string[],
): Promise<void> {
  const { error } = await supabase.rpc(
    'reorder_event_extras',
    {
      p_extra_ids: ids,
    },
  );

  if (error) {
    throw new Error(
      `No se pudo reordenar los extras: ${error.message}`,
    );
  }
}


export type EventRequestStatus =
  | 'new'
  | 'reviewing'
  | 'quoted'
  | 'accepted'
  | 'rejected'
  | 'cancelled'
  | 'completed';

export interface EventRequestExtraAdmin {
  id: string;
  extraId: string | null;
  extraName: string;
  pricingType: EventExtraPricingType;
  unitPrice: number;
  quantity: number;
  subtotal: number;
}

export interface EventRequestAdmin {
  id: string;
  folio: number;
  status: EventRequestStatus;
  eventTypeId: string | null;
  eventTypeName: string;
  packageId: string | null;
  packageName: string;
  eventDate: string;
  eventTime: string;
  guestCount: number;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  customerNotes: string;
  packageBasePrice: number;
  packageIncludedGuests: number;
  packageExtraGuestPrice: number;
  additionalGuestCount: number;
  additionalGuestSubtotal: number;
  estimatedTotal: number;
  quotedTotal: number | null;
  adminNotes: string;
  createdAt: string;
  updatedAt: string;
  extras: EventRequestExtraAdmin[];
}

interface EventRequestRpcRow {
  id: string;
  folio: number;
  status: EventRequestStatus;
  eventTypeId?: string | null;
  event_type_id?: string | null;
  eventTypeName?: string | null;
  event_type_name?: string | null;
  packageId?: string | null;
  package_id?: string | null;
  packageName?: string | null;
  package_name?: string | null;
  eventDate?: string;
  event_date?: string;
  eventTime?: string | null;
  event_time?: string | null;
  guestCount?: number;
  guest_count?: number;
  customerName?: string;
  customer_name?: string;
  customerPhone?: string | null;
  customer_phone?: string | null;
  customerEmail?: string | null;
  customer_email?: string | null;
  customerNotes?: string | null;
  customer_notes?: string | null;
  packageBasePrice?: number;
  package_base_price?: number;
  packageIncludedGuests?: number;
  package_included_guests?: number;
  packageExtraGuestPrice?: number;
  package_extra_guest_price?: number;
  additionalGuestCount?: number;
  additional_guest_count?: number;
  additionalGuestSubtotal?: number;
  additional_guest_subtotal?: number;
  estimatedTotal?: number;
  estimated_total?: number;
  quotedTotal?: number | null;
  quoted_total?: number | null;
  adminNotes?: string | null;
  admin_notes?: string | null;
  createdAt?: string;
  created_at?: string;
  updatedAt?: string;
  updated_at?: string;
  extras?: Array<{
    id: string;
    extraId?: string | null;
    extra_id?: string | null;
    extraName?: string;
    extra_name?: string;
    pricingType?: EventExtraPricingType;
    pricing_type?: EventExtraPricingType;
    unitPrice?: number;
    unit_price?: number;
    quantity?: number;
    subtotal?: number;
  }>;
}

function mapEventRequest(row: EventRequestRpcRow): EventRequestAdmin {
  return {
    id: row.id,
    folio: Number(row.folio),
    status: row.status,
    eventTypeId: row.eventTypeId ?? row.event_type_id ?? null,
    eventTypeName: row.eventTypeName ?? row.event_type_name ?? '',
    packageId: row.packageId ?? row.package_id ?? null,
    packageName: row.packageName ?? row.package_name ?? '',
    eventDate: row.eventDate ?? row.event_date ?? '',
    eventTime: row.eventTime ?? row.event_time ?? '',
    guestCount: Number(row.guestCount ?? row.guest_count ?? 0),
    customerName: row.customerName ?? row.customer_name ?? '',
    customerPhone: row.customerPhone ?? row.customer_phone ?? '',
    customerEmail: row.customerEmail ?? row.customer_email ?? '',
    customerNotes: row.customerNotes ?? row.customer_notes ?? '',
    packageBasePrice: Number(row.packageBasePrice ?? row.package_base_price ?? 0),
    packageIncludedGuests: Number(row.packageIncludedGuests ?? row.package_included_guests ?? 0),
    packageExtraGuestPrice: Number(row.packageExtraGuestPrice ?? row.package_extra_guest_price ?? 0),
    additionalGuestCount: Number(row.additionalGuestCount ?? row.additional_guest_count ?? 0),
    additionalGuestSubtotal: Number(row.additionalGuestSubtotal ?? row.additional_guest_subtotal ?? 0),
    estimatedTotal: Number(row.estimatedTotal ?? row.estimated_total ?? 0),
    quotedTotal:
      row.quotedTotal ?? row.quoted_total ?? null,
    adminNotes: row.adminNotes ?? row.admin_notes ?? '',
    createdAt: row.createdAt ?? row.created_at ?? '',
    updatedAt: row.updatedAt ?? row.updated_at ?? '',
    extras: (row.extras ?? []).map(extra => ({
      id: extra.id,
      extraId: extra.extraId ?? extra.extra_id ?? null,
      extraName: extra.extraName ?? extra.extra_name ?? '',
      pricingType: extra.pricingType ?? extra.pricing_type ?? 'fixed',
      unitPrice: Number(extra.unitPrice ?? extra.unit_price ?? 0),
      quantity: Number(extra.quantity ?? 0),
      subtotal: Number(extra.subtotal ?? 0),
    })),
  };
}

export async function getEventRequestsAdmin(): Promise<EventRequestAdmin[]> {
  const { data, error } = await supabase.rpc('get_event_requests_admin');

  if (error) {
    throw new Error(`No se pudieron obtener las solicitudes de eventos: ${error.message}`);
  }

  return ((data ?? []) as EventRequestRpcRow[]).map(mapEventRequest);
}

export async function updateEventRequestAdmin(input: {
  id: string;
  status: EventRequestStatus;
  quotedTotal: number | null;
  adminNotes: string;
}): Promise<void> {
  const quotedTotal =
    input.quotedTotal === null
      ? null
      : nonNegativeNumber(input.quotedTotal, 'El total cotizado');
  const adminNotes = optionalText(input.adminNotes, 'Las notas internas', 3000);

  const { error } = await supabase.rpc('update_event_request_admin', {
    p_request_id: input.id,
    p_status: input.status,
    p_quoted_total: quotedTotal,
    p_admin_notes: adminNotes,
  });

  if (error) {
    throw new Error(`No se pudo actualizar la solicitud de evento: ${error.message}`);
  }
}
