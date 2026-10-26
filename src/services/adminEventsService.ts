import { supabase } from './supabase';

export interface EventSettings {
  publicQuoteEnabled: boolean;
  minGuests: number;
  maxGuests: number;
  minAdvanceHours: number;
  maxAdvanceDays: number;
  quoteDisclaimer: string;
  terms: string;
  depositEnabled: boolean;
  depositType: 'percentage' | 'fixed';
  depositValue: number;
  depositDueDays: number;
  portalBaseUrl: string;
  remindersEnabled: boolean;
  depositReminderDaysBefore: number;
  eventReminderHoursBefore: number;
  balanceReminderHoursBefore: number;
  checklistReminderHoursBefore: number;
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
  deposit_enabled?: boolean;
  deposit_type?: 'percentage' | 'fixed';
  deposit_value?: number;
  deposit_due_days?: number;
  portal_base_url?: string | null;
  reminders_enabled?: boolean;
  deposit_reminder_days_before?: number;
  event_reminder_hours_before?: number;
  balance_reminder_hours_before?: number;
  checklist_reminder_hours_before?: number;
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
  depositEnabled: false,
  depositType: 'percentage',
  depositValue: 50,
  depositDueDays: 2,
  portalBaseUrl: '',
  remindersEnabled: true,
  depositReminderDaysBefore: 1,
  eventReminderHoursBefore: 24,
  balanceReminderHoursBefore: 24,
  checklistReminderHoursBefore: 6,
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
      terms,
      deposit_enabled,
      deposit_type,
      deposit_value,
      deposit_due_days,
      portal_base_url,
      reminders_enabled,
      deposit_reminder_days_before,
      event_reminder_hours_before,
      balance_reminder_hours_before,
      checklist_reminder_hours_before
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
    depositEnabled:
      row.deposit_enabled ?? DEFAULT_EVENT_SETTINGS.depositEnabled,
    depositType:
      row.deposit_type ?? DEFAULT_EVENT_SETTINGS.depositType,
    depositValue:
      Number(row.deposit_value ?? DEFAULT_EVENT_SETTINGS.depositValue),
    depositDueDays:
      Number(row.deposit_due_days ?? DEFAULT_EVENT_SETTINGS.depositDueDays),
    portalBaseUrl:
      row.portal_base_url?.trim() ?? DEFAULT_EVENT_SETTINGS.portalBaseUrl,
    remindersEnabled:
      row.reminders_enabled ?? DEFAULT_EVENT_SETTINGS.remindersEnabled,
    depositReminderDaysBefore:
      Number(row.deposit_reminder_days_before ?? DEFAULT_EVENT_SETTINGS.depositReminderDaysBefore),
    eventReminderHoursBefore:
      Number(row.event_reminder_hours_before ?? DEFAULT_EVENT_SETTINGS.eventReminderHoursBefore),
    balanceReminderHoursBefore:
      Number(row.balance_reminder_hours_before ?? DEFAULT_EVENT_SETTINGS.balanceReminderHoursBefore),
    checklistReminderHoursBefore:
      Number(row.checklist_reminder_hours_before ?? DEFAULT_EVENT_SETTINGS.checklistReminderHoursBefore),
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

  const depositValue = nonNegativeNumber(input.depositValue, 'El anticipo');
  const depositDueDays = Math.trunc(input.depositDueDays);
  const portalBaseUrl = input.portalBaseUrl.trim();
  const depositReminderDaysBefore = Math.trunc(input.depositReminderDaysBefore);
  const eventReminderHoursBefore = Math.trunc(input.eventReminderHoursBefore);
  const balanceReminderHoursBefore = Math.trunc(input.balanceReminderHoursBefore);
  const checklistReminderHoursBefore = Math.trunc(input.checklistReminderHoursBefore);

  if (portalBaseUrl.length > 300) {
    throw new Error('La URL pública del portal no puede superar 300 caracteres.');
  }

  if (portalBaseUrl && !/^https?:\/\//i.test(portalBaseUrl)) {
    throw new Error('La URL pública del portal debe comenzar con http:// o https://.');
  }

  if (depositReminderDaysBefore < 0 || depositReminderDaysBefore > 30) {
    throw new Error('El recordatorio de anticipo debe estar entre 0 y 30 días antes.');
  }

  for (const [value, label] of [
    [eventReminderHoursBefore, 'El recordatorio del evento'],
    [balanceReminderHoursBefore, 'El recordatorio de saldo'],
    [checklistReminderHoursBefore, 'El recordatorio de checklist'],
  ] as Array<[number, string]>) {
    if (value < 0 || value > 720) {
      throw new Error(`${label} debe estar entre 0 y 720 horas antes.`);
    }
  }


  if (input.depositType === 'percentage' && depositValue > 100) {
    throw new Error('El anticipo porcentual no puede superar 100%.');
  }

  if (depositDueDays < 0 || depositDueDays > 365) {
    throw new Error('El plazo del anticipo debe estar entre 0 y 365 días.');
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
      p_deposit_enabled:
        input.depositEnabled,
      p_deposit_type:
        input.depositType,
      p_deposit_value:
        depositValue,
      p_deposit_due_days:
        depositDueDays,
      p_portal_base_url:
        portalBaseUrl,
      p_reminders_enabled:
        input.remindersEnabled,
      p_deposit_reminder_days_before:
        depositReminderDaysBefore,
      p_event_reminder_hours_before:
        eventReminderHoursBefore,
      p_balance_reminder_hours_before:
        balanceReminderHoursBefore,
      p_checklist_reminder_hours_before:
        checklistReminderHoursBefore,
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
  | 'confirmed'
  | 'rejected'
  | 'cancelled'
  | 'completed';

export type EventPaymentMethod = 'cash' | 'card' | 'transfer' | 'other';

export interface EventPaymentAdmin {
  id: string;
  amount: number;
  method: EventPaymentMethod;
  reference: string;
  notes: string;
  paidAt: string;
  createdAt: string;
}

export interface EventRequestExtraAdmin {
  id: string;
  extraId: string | null;
  extraName: string;
  pricingType: EventExtraPricingType;
  unitPrice: number;
  quantity: number;
  subtotal: number;
}

export type EventOperationStatus = 'planned' | 'in_progress' | 'ready' | 'completed';

export interface EventOperationChecklistItem {
  id: string;
  label: string;
  position: number;
  isCompleted: boolean;
  completedAt: string;
}

export interface EventOperationHistoryItem {
  id: string;
  action: string;
  details: Record<string, unknown>;
  createdAt: string;
}

export type EventReminderType =
  | 'deposit_due'
  | 'event_upcoming'
  | 'balance_pending'
  | 'checklist_incomplete';

export interface EventReminderAdmin {
  id: string;
  type: EventReminderType;
  title: string;
  body: string;
  scheduledFor: string;
  sentAt: string;
  handledAt: string;
  attemptCount: number;
  pushError: string;
  createdAt: string;
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
  requiredDepositAmount: number;
  paymentDueDate: string;
  paidAmount: number;
  pendingDepositAmount: number;
  paymentStatus: 'not_required' | 'pending' | 'partial' | 'paid';
  confirmedAt: string;
  payments: EventPaymentAdmin[];
  operationStatus: EventOperationStatus;
  operationNotes: string;
  posOrderId: string;
  posOrderStatus: string;
  posOrderTotal: number | null;
  posOrderCreatedAt: string;
  operationCompletedAt: string;
  remainingBalance: number;
  operationChecklist: EventOperationChecklistItem[];
  operationHistory: EventOperationHistoryItem[];
  reminders: EventReminderAdmin[];
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
  requiredDepositAmount?: number;
  required_deposit_amount?: number;
  paymentDueDate?: string | null;
  payment_due_date?: string | null;
  paidAmount?: number;
  paid_amount?: number;
  pendingDepositAmount?: number;
  pending_deposit_amount?: number;
  paymentStatus?: 'not_required' | 'pending' | 'partial' | 'paid';
  payment_status?: 'not_required' | 'pending' | 'partial' | 'paid';
  confirmedAt?: string | null;
  confirmed_at?: string | null;
  payments?: Array<{
    id: string;
    amount?: number;
    method?: EventPaymentMethod;
    reference?: string | null;
    notes?: string | null;
    paidAt?: string;
    paid_at?: string;
    createdAt?: string;
    created_at?: string;
  }>;
  operationStatus?: EventOperationStatus;
  operation_status?: EventOperationStatus;
  operationNotes?: string | null;
  operation_notes?: string | null;
  posOrderId?: string | null;
  pos_order_id?: string | null;
  posOrderStatus?: string | null;
  pos_order_status?: string | null;
  posOrderTotal?: number | null;
  pos_order_total?: number | null;
  posOrderCreatedAt?: string | null;
  pos_order_created_at?: string | null;
  operationCompletedAt?: string | null;
  operation_completed_at?: string | null;
  remainingBalance?: number;
  remaining_balance?: number;
  operationChecklist?: Array<{
    id: string; label?: string; position?: number; isCompleted?: boolean; is_completed?: boolean; completedAt?: string | null; completed_at?: string | null;
  }>;
  operation_checklist?: Array<{
    id: string; label?: string; position?: number; isCompleted?: boolean; is_completed?: boolean; completedAt?: string | null; completed_at?: string | null;
  }>;
  operationHistory?: Array<{
    id: string; action?: string; details?: Record<string, unknown>; createdAt?: string; created_at?: string;
  }>;
  operation_history?: Array<{
    id: string; action?: string; details?: Record<string, unknown>; createdAt?: string; created_at?: string;
  }>;
  reminders?: Array<{
    id: string; type?: EventReminderType; reminder_type?: EventReminderType; title?: string; body?: string; scheduledFor?: string; scheduled_for?: string; sentAt?: string | null; sent_at?: string | null; handledAt?: string | null; handled_at?: string | null; attemptCount?: number; attempt_count?: number; pushError?: string | null; push_error?: string | null; createdAt?: string; created_at?: string;
  }>;
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
    requiredDepositAmount: Number(row.requiredDepositAmount ?? row.required_deposit_amount ?? 0),
    paymentDueDate: row.paymentDueDate ?? row.payment_due_date ?? '',
    paidAmount: Number(row.paidAmount ?? row.paid_amount ?? 0),
    pendingDepositAmount: Number(row.pendingDepositAmount ?? row.pending_deposit_amount ?? 0),
    paymentStatus: row.paymentStatus ?? row.payment_status ?? 'not_required',
    confirmedAt: row.confirmedAt ?? row.confirmed_at ?? '',
    payments: (row.payments ?? []).map(payment => ({
      id: payment.id,
      amount: Number(payment.amount ?? 0),
      method: payment.method ?? 'other',
      reference: payment.reference ?? '',
      notes: payment.notes ?? '',
      paidAt: payment.paidAt ?? payment.paid_at ?? '',
      createdAt: payment.createdAt ?? payment.created_at ?? '',
    })),
    operationStatus: row.operationStatus ?? row.operation_status ?? 'planned',
    operationNotes: row.operationNotes ?? row.operation_notes ?? '',
    posOrderId: row.posOrderId ?? row.pos_order_id ?? '',
    posOrderStatus: row.posOrderStatus ?? row.pos_order_status ?? '',
    posOrderTotal: row.posOrderTotal ?? row.pos_order_total ?? null,
    posOrderCreatedAt: row.posOrderCreatedAt ?? row.pos_order_created_at ?? '',
    operationCompletedAt: row.operationCompletedAt ?? row.operation_completed_at ?? '',
    remainingBalance: Number(row.remainingBalance ?? row.remaining_balance ?? 0),
    operationChecklist: (row.operationChecklist ?? row.operation_checklist ?? []).map(item => ({
      id: item.id,
      label: item.label ?? '',
      position: Number(item.position ?? 0),
      isCompleted: item.isCompleted ?? item.is_completed ?? false,
      completedAt: item.completedAt ?? item.completed_at ?? '',
    })),
    operationHistory: (row.operationHistory ?? row.operation_history ?? []).map(item => ({
      id: item.id,
      action: item.action ?? '',
      details: item.details ?? {},
      createdAt: item.createdAt ?? item.created_at ?? '',
    })),
    reminders: (row.reminders ?? []).map(item => ({
      id: item.id,
      type: item.type ?? item.reminder_type ?? 'event_upcoming',
      title: item.title ?? '',
      body: item.body ?? '',
      scheduledFor: item.scheduledFor ?? item.scheduled_for ?? '',
      sentAt: item.sentAt ?? item.sent_at ?? '',
      handledAt: item.handledAt ?? item.handled_at ?? '',
      attemptCount: Number(item.attemptCount ?? item.attempt_count ?? 0),
      pushError: item.pushError ?? item.push_error ?? '',
      createdAt: item.createdAt ?? item.created_at ?? '',
    })),
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

export async function addEventPaymentAdmin(input: {
  requestId: string;
  amount: number;
  method: EventPaymentMethod;
  reference: string;
  notes: string;
}): Promise<void> {
  const amount = nonNegativeNumber(input.amount, 'El pago');
  if (amount <= 0) {
    throw new Error('El pago debe ser mayor a cero.');
  }

  const reference = optionalText(input.reference, 'La referencia', 160);
  const notes = optionalText(input.notes, 'Las notas del pago', 500);

  const { error } = await supabase.rpc('add_event_payment_admin', {
    p_request_id: input.requestId,
    p_amount: amount,
    p_method: input.method,
    p_reference: reference || null,
    p_notes: notes || null,
  });

  if (error) {
    throw new Error(`No se pudo registrar el pago: ${error.message}`);
  }
}

export interface EventAvailabilityRuleAdmin {
  dayOfWeek: number;
  isEnabled: boolean;
  startTime: string;
  endTime: string;
}

export interface EventAvailabilityBlockAdmin {
  id: string;
  eventDate: string;
  fullDay: boolean;
  startTime: string;
  endTime: string;
  reason: string;
}

export interface EventAvailabilityAdmin {
  enabled: boolean;
  slotIntervalMinutes: number;
  maxSimultaneousEvents: number;
  rules: EventAvailabilityRuleAdmin[];
  blocks: EventAvailabilityBlockAdmin[];
}

interface EventAvailabilityRpcResult {
  enabled?: boolean;
  slotIntervalMinutes?: number;
  slot_interval_minutes?: number;
  maxSimultaneousEvents?: number;
  max_simultaneous_events?: number;
  rules?: Array<{
    dayOfWeek?: number;
    day_of_week?: number;
    isEnabled?: boolean;
    is_enabled?: boolean;
    startTime?: string;
    start_time?: string;
    endTime?: string;
    end_time?: string;
  }>;
  blocks?: Array<{
    id: string;
    eventDate?: string;
    event_date?: string;
    fullDay?: boolean;
    full_day?: boolean;
    startTime?: string | null;
    start_time?: string | null;
    endTime?: string | null;
    end_time?: string | null;
    reason?: string | null;
  }>;
}

export async function getEventAvailabilityAdmin(): Promise<EventAvailabilityAdmin> {
  const { data, error } = await supabase.rpc('get_event_availability_admin');

  if (error) {
    throw new Error(`No se pudo obtener la disponibilidad de eventos: ${error.message}`);
  }

  const raw = (data ?? {}) as EventAvailabilityRpcResult;

  return {
    enabled: raw.enabled ?? false,
    slotIntervalMinutes: Number(
      raw.slotIntervalMinutes ?? raw.slot_interval_minutes ?? 30,
    ),
    maxSimultaneousEvents: Number(
      raw.maxSimultaneousEvents ?? raw.max_simultaneous_events ?? 1,
    ),
    rules: (raw.rules ?? []).map(rule => ({
      dayOfWeek: Number(rule.dayOfWeek ?? rule.day_of_week ?? 0),
      isEnabled: rule.isEnabled ?? rule.is_enabled ?? false,
      startTime: (rule.startTime ?? rule.start_time ?? '12:00').slice(0, 5),
      endTime: (rule.endTime ?? rule.end_time ?? '22:00').slice(0, 5),
    })),
    blocks: (raw.blocks ?? []).map(block => ({
      id: block.id,
      eventDate: block.eventDate ?? block.event_date ?? '',
      fullDay: block.fullDay ?? block.full_day ?? false,
      startTime: (block.startTime ?? block.start_time ?? '').slice(0, 5),
      endTime: (block.endTime ?? block.end_time ?? '').slice(0, 5),
      reason: block.reason?.trim() ?? '',
    })),
  };
}

export async function saveEventAvailabilityConfig(input: {
  enabled: boolean;
  slotIntervalMinutes: number;
  maxSimultaneousEvents: number;
  rules: EventAvailabilityRuleAdmin[];
}): Promise<void> {
  const slotIntervalMinutes = positiveInteger(
    input.slotIntervalMinutes,
    'El intervalo entre horarios',
  );
  const maxSimultaneousEvents = positiveInteger(
    input.maxSimultaneousEvents,
    'La cantidad de eventos simultáneos',
  );

  if (slotIntervalMinutes < 15 || slotIntervalMinutes > 240) {
    throw new Error('El intervalo debe estar entre 15 y 240 minutos.');
  }

  if (maxSimultaneousEvents > 20) {
    throw new Error('No puedes permitir más de 20 eventos simultáneos.');
  }

  const normalizedRules = input.rules.map(rule => ({
    dayOfWeek: Math.trunc(rule.dayOfWeek),
    isEnabled: rule.isEnabled,
    startTime: rule.startTime.trim(),
    endTime: rule.endTime.trim(),
  }));

  const { error } = await supabase.rpc('save_event_availability_config', {
    p_enabled: input.enabled,
    p_slot_interval_minutes: slotIntervalMinutes,
    p_max_simultaneous_events: maxSimultaneousEvents,
    p_rules: normalizedRules,
  });

  if (error) {
    throw new Error(`No se pudo guardar la disponibilidad de eventos: ${error.message}`);
  }
}

export async function createEventAvailabilityBlock(input: {
  eventDate: string;
  fullDay: boolean;
  startTime: string;
  endTime: string;
  reason: string;
}): Promise<void> {
  const eventDate = input.eventDate.trim();
  const reason = optionalText(input.reason, 'El motivo', 300);

  if (!/^\d{4}-\d{2}-\d{2}$/.test(eventDate)) {
    throw new Error('La fecha del bloqueo debe tener formato AAAA-MM-DD.');
  }

  if (!input.fullDay) {
    if (!/^\d{2}:\d{2}$/.test(input.startTime.trim()) || !/^\d{2}:\d{2}$/.test(input.endTime.trim())) {
      throw new Error('Los horarios del bloqueo deben tener formato HH:MM.');
    }
  }

  const { error } = await supabase.rpc('create_event_availability_block', {
    p_event_date: eventDate,
    p_full_day: input.fullDay,
    p_start_time: input.fullDay ? null : input.startTime.trim(),
    p_end_time: input.fullDay ? null : input.endTime.trim(),
    p_reason: reason || null,
  });

  if (error) {
    throw new Error(`No se pudo crear el bloqueo: ${error.message}`);
  }
}

export async function deleteEventAvailabilityBlock(id: string): Promise<void> {
  const { error } = await supabase.rpc('delete_event_availability_block', {
    p_block_id: id,
  });

  if (error) {
    throw new Error(`No se pudo eliminar el bloqueo: ${error.message}`);
  }
}

export interface EventQuoteVersionSummary {
  id: string;
  requestId: string;
  folio: number;
  version: number;
  effectiveTotal: number;
  requiredDepositAmount: number;
  paidAmount: number;
  pendingDepositAmount: number;
  createdAt: string;
}

export interface EventQuoteSnapshotExtra {
  id: string;
  extraId: string | null;
  extraName: string;
  pricingType: EventExtraPricingType;
  unitPrice: number;
  quantity: number;
  subtotal: number;
}

export interface EventQuoteSnapshot extends EventQuoteVersionSummary {
  businessName: string;
  currencyCode: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  eventTypeName: string;
  packageName: string;
  eventDate: string;
  eventTime: string;
  guestCount: number;
  packageBasePrice: number;
  packageExtraGuestPrice: number;
  additionalGuestCount: number;
  additionalGuestSubtotal: number;
  extras: EventQuoteSnapshotExtra[];
  estimatedTotal: number;
  quotedTotal: number | null;
  paymentDueDate: string;
  terms: string;
}

interface EventQuoteSnapshotRpc {
  id: string;
  requestId?: string;
  request_id?: string;
  folio?: number;
  version?: number;
  businessName?: string;
  business_name?: string;
  currencyCode?: string;
  currency_code?: string;
  customerName?: string;
  customer_name?: string;
  customerPhone?: string | null;
  customer_phone?: string | null;
  customerEmail?: string | null;
  customer_email?: string | null;
  eventTypeName?: string | null;
  event_type_name?: string | null;
  packageName?: string | null;
  package_name?: string | null;
  eventDate?: string;
  event_date?: string;
  eventTime?: string | null;
  event_time?: string | null;
  guestCount?: number;
  guest_count?: number;
  packageBasePrice?: number;
  package_base_price?: number;
  packageExtraGuestPrice?: number;
  package_extra_guest_price?: number;
  additionalGuestCount?: number;
  additional_guest_count?: number;
  additionalGuestSubtotal?: number;
  additional_guest_subtotal?: number;
  extras?: EventQuoteSnapshotExtra[];
  estimatedTotal?: number;
  estimated_total?: number;
  quotedTotal?: number | null;
  quoted_total?: number | null;
  effectiveTotal?: number;
  effective_total?: number;
  requiredDepositAmount?: number;
  required_deposit_amount?: number;
  paidAmount?: number;
  paid_amount?: number;
  pendingDepositAmount?: number;
  pending_deposit_amount?: number;
  paymentDueDate?: string | null;
  payment_due_date?: string | null;
  terms?: string | null;
  createdAt?: string;
  created_at?: string;
}

function mapEventQuoteSnapshot(row: EventQuoteSnapshotRpc): EventQuoteSnapshot {
  return {
    id: row.id,
    requestId: row.requestId ?? row.request_id ?? '',
    folio: Number(row.folio ?? 0),
    version: Number(row.version ?? 0),
    businessName: row.businessName ?? row.business_name ?? '',
    currencyCode: row.currencyCode ?? row.currency_code ?? 'MXN',
    customerName: row.customerName ?? row.customer_name ?? '',
    customerPhone: row.customerPhone ?? row.customer_phone ?? '',
    customerEmail: row.customerEmail ?? row.customer_email ?? '',
    eventTypeName: row.eventTypeName ?? row.event_type_name ?? '',
    packageName: row.packageName ?? row.package_name ?? '',
    eventDate: row.eventDate ?? row.event_date ?? '',
    eventTime: row.eventTime ?? row.event_time ?? '',
    guestCount: Number(row.guestCount ?? row.guest_count ?? 0),
    packageBasePrice: Number(row.packageBasePrice ?? row.package_base_price ?? 0),
    packageExtraGuestPrice: Number(row.packageExtraGuestPrice ?? row.package_extra_guest_price ?? 0),
    additionalGuestCount: Number(row.additionalGuestCount ?? row.additional_guest_count ?? 0),
    additionalGuestSubtotal: Number(row.additionalGuestSubtotal ?? row.additional_guest_subtotal ?? 0),
    extras: row.extras ?? [],
    estimatedTotal: Number(row.estimatedTotal ?? row.estimated_total ?? 0),
    quotedTotal: row.quotedTotal ?? row.quoted_total ?? null,
    effectiveTotal: Number(row.effectiveTotal ?? row.effective_total ?? 0),
    requiredDepositAmount: Number(row.requiredDepositAmount ?? row.required_deposit_amount ?? 0),
    paidAmount: Number(row.paidAmount ?? row.paid_amount ?? 0),
    pendingDepositAmount: Number(row.pendingDepositAmount ?? row.pending_deposit_amount ?? 0),
    paymentDueDate: row.paymentDueDate ?? row.payment_due_date ?? '',
    terms: row.terms ?? '',
    createdAt: row.createdAt ?? row.created_at ?? '',
  };
}

export async function createEventQuoteVersionAdmin(input: {
  requestId: string;
  businessName: string;
  currencyCode: string;
}): Promise<EventQuoteSnapshot> {
  const businessName = requiredText(input.businessName, 'El nombre del negocio', 160);
  const currencyCode = requiredText(input.currencyCode, 'La moneda', 8).toUpperCase();

  const { data, error } = await supabase.rpc('create_event_quote_version_admin', {
    p_request_id: input.requestId,
    p_business_name: businessName,
    p_currency_code: currencyCode,
  });

  if (error) {
    throw new Error(`No se pudo generar la cotización: ${error.message}`);
  }

  return mapEventQuoteSnapshot((data ?? {}) as EventQuoteSnapshotRpc);
}

export async function getEventQuoteVersionsAdmin(
  requestId: string,
): Promise<EventQuoteVersionSummary[]> {
  const { data, error } = await supabase.rpc('get_event_quote_versions_admin', {
    p_request_id: requestId,
  });

  if (error) {
    throw new Error(`No se pudo obtener el historial de cotizaciones: ${error.message}`);
  }

  return ((data ?? []) as EventQuoteSnapshotRpc[]).map(row => ({
    id: row.id,
    requestId: row.requestId ?? row.request_id ?? requestId,
    folio: Number(row.folio ?? 0),
    version: Number(row.version ?? 0),
    effectiveTotal: Number(row.effectiveTotal ?? row.effective_total ?? 0),
    requiredDepositAmount: Number(row.requiredDepositAmount ?? row.required_deposit_amount ?? 0),
    paidAmount: Number(row.paidAmount ?? row.paid_amount ?? 0),
    pendingDepositAmount: Number(row.pendingDepositAmount ?? row.pending_deposit_amount ?? 0),
    createdAt: row.createdAt ?? row.created_at ?? '',
  }));
}

export async function getEventQuoteVersionAdmin(
  quoteVersionId: string,
): Promise<EventQuoteSnapshot> {
  const { data, error } = await supabase.rpc('get_event_quote_version_admin', {
    p_quote_version_id: quoteVersionId,
  });

  if (error) {
    throw new Error(`No se pudo obtener la cotización: ${error.message}`);
  }

  return mapEventQuoteSnapshot((data ?? {}) as EventQuoteSnapshotRpc);
}


export type EventQuotePortalResponse = 'accepted' | 'rejected' | null;

export interface EventQuotePortalLinkAdmin {
  id: string;
  quoteVersionId: string;
  requestId: string;
  version: number;
  token: string;
  url: string;
  isActive: boolean;
  expiresAt: string;
  response: EventQuotePortalResponse;
  respondedAt: string;
  createdAt: string;
}

interface EventQuotePortalLinkRpc {
  id: string;
  quoteVersionId?: string;
  quote_version_id?: string;
  requestId?: string;
  request_id?: string;
  version?: number;
  token?: string;
  url?: string;
  isActive?: boolean;
  is_active?: boolean;
  expiresAt?: string | null;
  expires_at?: string | null;
  response?: EventQuotePortalResponse;
  respondedAt?: string | null;
  responded_at?: string | null;
  createdAt?: string;
  created_at?: string;
}

function mapEventQuotePortalLink(row: EventQuotePortalLinkRpc): EventQuotePortalLinkAdmin {
  return {
    id: row.id,
    quoteVersionId: row.quoteVersionId ?? row.quote_version_id ?? '',
    requestId: row.requestId ?? row.request_id ?? '',
    version: Number(row.version ?? 0),
    token: row.token ?? '',
    url: row.url ?? '',
    isActive: row.isActive ?? row.is_active ?? false,
    expiresAt: row.expiresAt ?? row.expires_at ?? '',
    response: row.response ?? null,
    respondedAt: row.respondedAt ?? row.responded_at ?? '',
    createdAt: row.createdAt ?? row.created_at ?? '',
  };
}

export async function getEventQuotePortalLinksAdmin(
  requestId: string,
): Promise<EventQuotePortalLinkAdmin[]> {
  const { data, error } = await supabase.rpc('get_event_quote_portal_links_admin', {
    p_request_id: requestId,
  });

  if (error) {
    throw new Error(`No se pudieron obtener los enlaces del portal: ${error.message}`);
  }

  return ((data ?? []) as EventQuotePortalLinkRpc[]).map(mapEventQuotePortalLink);
}

export async function createEventQuotePortalLinkAdmin(input: {
  quoteVersionId: string;
  expiresDays?: number;
  regenerate?: boolean;
}): Promise<EventQuotePortalLinkAdmin> {
  const expiresDays = Math.trunc(input.expiresDays ?? 30);
  if (expiresDays < 1 || expiresDays > 365) {
    throw new Error('La vigencia del enlace debe estar entre 1 y 365 días.');
  }

  const { data, error } = await supabase.rpc('create_event_quote_portal_link_admin', {
    p_quote_version_id: input.quoteVersionId,
    p_expires_days: expiresDays,
    p_regenerate: input.regenerate ?? false,
  });

  if (error) {
    throw new Error(`No se pudo crear el enlace del cliente: ${error.message}`);
  }

  return mapEventQuotePortalLink((data ?? {}) as EventQuotePortalLinkRpc);
}

export async function revokeEventQuotePortalLinkAdmin(linkId: string): Promise<void> {
  const { error } = await supabase.rpc('revoke_event_quote_portal_link_admin', {
    p_link_id: linkId,
  });

  if (error) {
    throw new Error(`No se pudo revocar el enlace del cliente: ${error.message}`);
  }
}


export async function updateEventOperationAdmin(input: {
  requestId: string;
  status: EventOperationStatus;
  notes: string;
}): Promise<void> {
  const notes = optionalText(input.notes, 'Las notas de operación', 3000);
  const { error } = await supabase.rpc('update_event_operation_admin', {
    p_request_id: input.requestId,
    p_operation_status: input.status,
    p_operation_notes: notes,
  });
  if (error) {
    throw new Error(`No se pudo actualizar la operación del evento: ${error.message}`);
  }
}

export async function setEventOperationChecklistItemAdmin(
  itemId: string,
  isCompleted: boolean,
): Promise<void> {
  const { error } = await supabase.rpc('set_event_operation_checklist_item_admin', {
    p_item_id: itemId,
    p_is_completed: isCompleted,
  });
  if (error) {
    throw new Error(`No se pudo actualizar el checklist: ${error.message}`);
  }
}

export interface CreateEventPosOrderResult {
  orderId: string;
  orderTotal: number;
  created: boolean;
}

export async function createEventPosOrderAdmin(
  requestId: string,
): Promise<CreateEventPosOrderResult> {
  const { data, error } = await supabase.rpc('create_event_pos_order_admin', {
    p_request_id: requestId,
  });
  if (error) {
    throw new Error(`No se pudo crear el pedido POS del evento: ${error.message}`);
  }
  const result = (data ?? {}) as { orderId?: string; orderTotal?: number; created?: boolean };
  if (!result.orderId) {
    throw new Error('Supabase no devolvió el pedido creado.');
  }
  return {
    orderId: result.orderId,
    orderTotal: Number(result.orderTotal ?? 0),
    created: result.created ?? false,
  };
}


export async function markEventReminderHandledAdmin(reminderId: string): Promise<void> {
  const { error } = await supabase.rpc('mark_event_reminder_handled_admin', {
    p_reminder_id: reminderId,
  });
  if (error) {
    throw new Error(`No se pudo marcar el recordatorio como atendido: ${error.message}`);
  }
}

export async function processEventRemindersAdmin(): Promise<void> {
  const { error } = await supabase.rpc('process_event_reminders_admin');
  if (error) {
    throw new Error(`No se pudieron procesar los recordatorios: ${error.message}`);
  }
}
