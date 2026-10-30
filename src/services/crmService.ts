import {
  supabase,
} from './supabase';

export interface CrmCustomer {
  id: string;
  name: string;
  phone: string;
  email: string;
  notes: string;
  tags: string[];
  isActive: boolean;
  hasWebAccount: boolean;
  hasLoyalty: boolean;
  deliveredOrders: number;
  netSpend: number;
  averageTicket: number;
  lastOrderAt: string | null;
  loyaltyVisits: number;
  eventRequests: number;
  lastEventAt: string | null;
  firstSeenAt: string;
  lastSeenAt: string;
  segmentCodes: CrmSegmentCode[];
}

export type CrmSegmentCode =
  | 'new'
  | 'frequent'
  | 'vip'
  | 'high_ticket'
  | 'inactive';

export interface CrmSettings {
  vipMinSpend: number;
  frequentMinOrders: number;
  highTicketMinAverage: number;
  inactiveDays: number;
  newCustomerDays: number;
}

export interface CrmSegmentSummary {
  totalCustomers: number;
  newCustomers: number;
  frequentCustomers: number;
  vipCustomers: number;
  highTicketCustomers: number;
  inactiveCustomers: number;
}

export interface CrmOrderHistoryItem {
  id: string;
  createdAt: string;
  deliveredAt: string | null;
  source: string;
  fulfillmentType: string | null;
  total: number;
  refunded: number;
  netTotal: number;
}

export interface CrmEventHistoryItem {
  id: string;
  folio: number;
  status: string;
  eventDate: string;
  guestCount: number;
  estimatedTotal: number;
  quotedTotal: number | null;
  createdAt: string;
}

export type CrmContactChannel =
  | 'none'
  | 'whatsapp'
  | 'sms'
  | 'email'
  | 'call';

export interface CrmCustomerDetail {
  id: string;
  name: string;
  phone: string;
  email: string;
  notes: string;
  tags: string[];
  isActive: boolean;
  hasWebAccount: boolean;
  hasLoyalty: boolean;
  orders: CrmOrderHistoryItem[];
  events: CrmEventHistoryItem[];
  rewards: {
    enabled: boolean;
    visits: number;
    redemptions: number;
  };
  marketingOptIn: boolean;
  preferredContactChannel: CrmContactChannel;
  lastContactedAt: string | null;
  doNotContactReason: string;
}

export interface CrmAudience {
  id: string;
  name: string;
  description: string;
  segmentCodes: CrmSegmentCode[];
  requiredTags: string[];
  minNetSpend: number | null;
  minDeliveredOrders: number | null;
  requireMarketingOptIn: boolean;
  isActive: boolean;
  memberCount: number;
  updatedAt: string;
}

export interface CrmAudienceMember {
  id: string;
  name: string;
  phone: string;
  email: string;
  preferredContactChannel: CrmContactChannel;
  deliveredOrders: number;
  netSpend: number;
  averageTicket: number;
  segmentCodes: CrmSegmentCode[];
  tags: string[];
  lastContactedAt: string | null;
}

interface CrmCustomerRow {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  notes: string | null;
  tags: string[] | null;
  is_active: boolean;
  has_web_account: boolean;
  has_loyalty: boolean;
  delivered_orders: number | string | null;
  net_spend: number | string | null;
  average_ticket: number | string | null;
  last_order_at: string | null;
  loyalty_visits: number | string | null;
  event_requests: number | string | null;
  last_event_at: string | null;
  first_seen_at: string;
  last_seen_at: string;
  segment_codes: CrmSegmentCode[] | null;
}

export async function getCrmCustomers(
  search = '',
  activeOnly = true,
): Promise<CrmCustomer[]> {
  const {
    data,
    error,
  } =
    await supabase.rpc(
      'get_crm_customers_admin_v2',
      {
        p_search:
          search.trim() ||
          null,
        p_active_only:
          activeOnly,
        p_limit:
          300,
      },
    );

  if (error) {
    throw new Error(
      error.message ||
      'No se pudieron cargar los clientes.',
    );
  }

  return (
    (
      data ??
      []
    ) as CrmCustomerRow[]
  ).map(
    row => ({
      id:
        row.id,
      name:
        row.name,
      phone:
        row.phone,
      email:
        row.email?.trim() ??
        '',
      notes:
        row.notes?.trim() ??
        '',
      tags:
        row.tags ??
        [],
      isActive:
        row.is_active,
      hasWebAccount:
        row.has_web_account,
      hasLoyalty:
        row.has_loyalty,
      deliveredOrders:
        Number(
          row.delivered_orders ??
          0,
        ),
      netSpend:
        Number(
          row.net_spend ??
          0,
        ),
      averageTicket:
        Number(
          row.average_ticket ??
          0,
        ),
      lastOrderAt:
        row.last_order_at,
      loyaltyVisits:
        Number(
          row.loyalty_visits ??
          0,
        ),
      eventRequests:
        Number(
          row.event_requests ??
          0,
        ),
      lastEventAt:
        row.last_event_at,
      firstSeenAt:
        row.first_seen_at,
      lastSeenAt:
        row.last_seen_at,
      segmentCodes:
        row.segment_codes ??
        [],
    }),
  );
}

export async function createCrmCustomer(
  input: {
    name: string;
    phone: string;
    email: string;
  },
): Promise<string> {
  const {
    data,
    error,
  } =
    await supabase.rpc(
      'create_crm_customer_admin',
      {
        p_name:
          input.name.trim(),
        p_phone:
          input.phone.trim(),
        p_email:
          input.email.trim() ||
          null,
      },
    );

  if (error) {
    throw new Error(
      error.message ||
      'No se pudo crear el cliente.',
    );
  }

  return String(
    data,
  );
}

export async function updateCrmCustomer(
  input: {
    id: string;
    notes: string;
    tags: string[];
    isActive: boolean;
  },
): Promise<void> {
  const {
    error,
  } =
    await supabase.rpc(
      'update_crm_customer_admin',
      {
        p_customer_id:
          input.id,
        p_notes:
          input.notes.trim() ||
          null,
        p_tags:
          input.tags,
        p_is_active:
          input.isActive,
      },
    );

  if (error) {
    throw new Error(
      error.message ||
      'No se pudo actualizar el cliente.',
    );
  }
}

export async function getCrmCustomerDetail(
  customerId: string,
): Promise<CrmCustomerDetail> {
  const {
    data,
    error,
  } =
    await supabase.rpc(
      'get_crm_customer_detail_admin_v2',
      {
        p_customer_id:
          customerId,
      },
    );

  if (error) {
    throw new Error(
      error.message ||
      'No se pudo cargar el perfil del cliente.',
    );
  }

  const row =
    data as
      | CrmCustomerDetail
      | null;

  if (!row) {
    throw new Error(
      'El cliente no existe.',
    );
  }

  return {
    ...row,
    email:
      row.email ??
      '',
    notes:
      row.notes ??
      '',
    tags:
      row.tags ??
      [],
    orders:
      (
        row.orders ??
        []
      ).map(
        order => ({
          ...order,
          total:
            Number(
              order.total ??
              0,
            ),
          refunded:
            Number(
              order.refunded ??
              0,
            ),
          netTotal:
            Number(
              order.netTotal ??
              0,
            ),
        }),
      ),
    events:
      (
        row.events ??
        []
      ).map(
        event => ({
          ...event,
          folio:
            Number(
              event.folio ??
              0,
            ),
          guestCount:
            Number(
              event.guestCount ??
              0,
            ),
          estimatedTotal:
            Number(
              event.estimatedTotal ??
              0,
            ),
          quotedTotal:
            event.quotedTotal ==
            null
              ? null
              : Number(
                  event.quotedTotal,
                ),
        }),
      ),
    rewards: {
      enabled:
        Boolean(
          row.rewards
            ?.enabled,
        ),
      visits:
        Number(
          row.rewards
            ?.visits ??
          0,
        ),
      redemptions:
        Number(
          row.rewards
            ?.redemptions ??
          0,
        ),
    },
    marketingOptIn:
      Boolean(
        row.marketingOptIn,
      ),
    preferredContactChannel:
      (
        row.preferredContactChannel ??
        'none'
      ) as CrmContactChannel,
    lastContactedAt:
      row.lastContactedAt ??
      null,
    doNotContactReason:
      row.doNotContactReason ??
      '',
  };
}


interface CrmSettingsRow {
  vip_min_spend: string | number | null;
  frequent_min_orders: string | number | null;
  high_ticket_min_average: string | number | null;
  inactive_days: string | number | null;
  new_customer_days: string | number | null;
}

interface CrmSegmentSummaryRow {
  total_customers: string | number | null;
  new_customers: string | number | null;
  frequent_customers: string | number | null;
  vip_customers: string | number | null;
  high_ticket_customers: string | number | null;
  inactive_customers: string | number | null;
}

export async function getCrmSettings():
Promise<CrmSettings> {
  const {
    data,
    error,
  } =
    await supabase.rpc(
      'get_crm_settings_admin',
    );

  if (error) {
    throw new Error(
      error.message ||
      'No se pudo cargar la configuración del CRM.',
    );
  }

  const row =
    ((
      data ??
      []
    ) as CrmSettingsRow[])[0];

  return {
    vipMinSpend:
      Number(
        row?.vip_min_spend ??
        3000,
      ),
    frequentMinOrders:
      Number(
        row?.frequent_min_orders ??
        5,
      ),
    highTicketMinAverage:
      Number(
        row?.high_ticket_min_average ??
        400,
      ),
    inactiveDays:
      Number(
        row?.inactive_days ??
        45,
      ),
    newCustomerDays:
      Number(
        row?.new_customer_days ??
        30,
      ),
  };
}

export async function saveCrmSettings(
  settings:
    CrmSettings,
): Promise<void> {
  const {
    error,
  } =
    await supabase.rpc(
      'save_crm_settings_admin',
      {
        p_vip_min_spend:
          settings.vipMinSpend,
        p_frequent_min_orders:
          settings.frequentMinOrders,
        p_high_ticket_min_average:
          settings.highTicketMinAverage,
        p_inactive_days:
          settings.inactiveDays,
        p_new_customer_days:
          settings.newCustomerDays,
      },
    );

  if (error) {
    throw new Error(
      error.message ||
      'No se pudo guardar la configuración del CRM.',
    );
  }
}

export async function getCrmSegmentSummary():
Promise<CrmSegmentSummary> {
  const {
    data,
    error,
  } =
    await supabase.rpc(
      'get_crm_segment_summary_admin',
    );

  if (error) {
    throw new Error(
      error.message ||
      'No se pudo cargar el resumen de segmentos.',
    );
  }

  const row =
    ((
      data ??
      []
    ) as CrmSegmentSummaryRow[])[0];

  return {
    totalCustomers:
      Number(
        row?.total_customers ??
        0,
      ),
    newCustomers:
      Number(
        row?.new_customers ??
        0,
      ),
    frequentCustomers:
      Number(
        row?.frequent_customers ??
        0,
      ),
    vipCustomers:
      Number(
        row?.vip_customers ??
        0,
      ),
    highTicketCustomers:
      Number(
        row?.high_ticket_customers ??
        0,
      ),
    inactiveCustomers:
      Number(
        row?.inactive_customers ??
        0,
      ),
  };
}


interface CrmAudienceRow {
  id: string;
  name: string;
  description: string | null;
  segment_codes: CrmSegmentCode[] | null;
  required_tags: string[] | null;
  min_net_spend: string | number | null;
  min_delivered_orders: string | number | null;
  require_marketing_opt_in: boolean;
  is_active: boolean;
  member_count: string | number | null;
  updated_at: string;
}

interface CrmAudienceMemberRow {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  preferred_contact_channel: CrmContactChannel;
  delivered_orders: string | number | null;
  net_spend: string | number | null;
  average_ticket: string | number | null;
  segment_codes: CrmSegmentCode[] | null;
  tags: string[] | null;
  last_contacted_at: string | null;
}

export async function updateCrmContactPreferences(
  input: {
    customerId: string;
    marketingOptIn: boolean;
    preferredContactChannel: CrmContactChannel;
    doNotContactReason: string;
  },
): Promise<void> {
  const {
    error,
  } =
    await supabase.rpc(
      'update_crm_contact_preferences_admin',
      {
        p_customer_id:
          input.customerId,
        p_marketing_opt_in:
          input.marketingOptIn,
        p_preferred_contact_channel:
          input.preferredContactChannel,
        p_do_not_contact_reason:
          input.doNotContactReason.trim() ||
          null,
      },
    );

  if (error) {
    throw new Error(
      error.message ||
      'No se pudieron guardar las preferencias de contacto.',
    );
  }
}

export async function markCrmCustomerContacted(
  customerId: string,
): Promise<string> {
  const {
    data,
    error,
  } =
    await supabase.rpc(
      'mark_crm_customer_contacted_admin',
      {
        p_customer_id:
          customerId,
      },
    );

  if (error) {
    throw new Error(
      error.message ||
      'No se pudo registrar el contacto.',
    );
  }

  return String(
    data,
  );
}

export async function getCrmAudiences(
  activeOnly = true,
): Promise<CrmAudience[]> {
  const {
    data,
    error,
  } =
    await supabase.rpc(
      'get_crm_audiences_admin',
      {
        p_active_only:
          activeOnly,
      },
    );

  if (error) {
    throw new Error(
      error.message ||
      'No se pudieron cargar las audiencias.',
    );
  }

  return (
    (
      data ??
      []
    ) as CrmAudienceRow[]
  ).map(
    row => ({
      id:
        row.id,
      name:
        row.name,
      description:
        row.description ??
        '',
      segmentCodes:
        row.segment_codes ??
        [],
      requiredTags:
        row.required_tags ??
        [],
      minNetSpend:
        row.min_net_spend ==
        null
          ? null
          : Number(
              row.min_net_spend,
            ),
      minDeliveredOrders:
        row.min_delivered_orders ==
        null
          ? null
          : Number(
              row.min_delivered_orders,
            ),
      requireMarketingOptIn:
        row.require_marketing_opt_in,
      isActive:
        row.is_active,
      memberCount:
        Number(
          row.member_count ??
          0,
        ),
      updatedAt:
        row.updated_at,
    }),
  );
}

export async function saveCrmAudience(
  input: {
    id?: string | null;
    name: string;
    description: string;
    segmentCodes: CrmSegmentCode[];
    requiredTags: string[];
    minNetSpend: number | null;
    minDeliveredOrders: number | null;
    requireMarketingOptIn: boolean;
    isActive: boolean;
  },
): Promise<string> {
  const {
    data,
    error,
  } =
    await supabase.rpc(
      'save_crm_audience_admin',
      {
        p_audience_id:
          input.id ??
          null,
        p_name:
          input.name.trim(),
        p_description:
          input.description.trim() ||
          null,
        p_segment_codes:
          input.segmentCodes,
        p_required_tags:
          input.requiredTags,
        p_min_net_spend:
          input.minNetSpend,
        p_min_delivered_orders:
          input.minDeliveredOrders,
        p_require_marketing_opt_in:
          input.requireMarketingOptIn,
        p_is_active:
          input.isActive,
      },
    );

  if (error) {
    throw new Error(
      error.message ||
      'No se pudo guardar la audiencia.',
    );
  }

  return String(
    data,
  );
}

export async function getCrmAudienceMembers(
  audienceId: string,
): Promise<CrmAudienceMember[]> {
  const {
    data,
    error,
  } =
    await supabase.rpc(
      'get_crm_audience_members_admin',
      {
        p_audience_id:
          audienceId,
        p_limit:
          500,
      },
    );

  if (error) {
    throw new Error(
      error.message ||
      'No se pudo cargar la audiencia.',
    );
  }

  return (
    (
      data ??
      []
    ) as CrmAudienceMemberRow[]
  ).map(
    row => ({
      id:
        row.id,
      name:
        row.name,
      phone:
        row.phone,
      email:
        row.email ??
        '',
      preferredContactChannel:
        row.preferred_contact_channel,
      deliveredOrders:
        Number(
          row.delivered_orders ??
          0,
        ),
      netSpend:
        Number(
          row.net_spend ??
          0,
        ),
      averageTicket:
        Number(
          row.average_ticket ??
          0,
        ),
      segmentCodes:
        row.segment_codes ??
        [],
      tags:
        row.tags ??
        [],
      lastContactedAt:
        row.last_contacted_at,
    }),
  );
}
