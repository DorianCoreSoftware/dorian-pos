import {
  supabase,
} from './supabase';

import type {
  CrmAudience,
} from './crmService';

export type MarketingCampaignStatus =
  | 'draft'
  | 'scheduled'
  | 'active'
  | 'completed'
  | 'cancelled';

export type MarketingCampaignObjective =
  | 'acquisition'
  | 'retention'
  | 'reactivation'
  | 'loyalty'
  | 'sales'
  | 'event'
  | 'announcement';

export type MarketingCampaignChannel =
  | 'whatsapp'
  | 'sms'
  | 'email'
  | 'push'
  | 'social'
  | 'in_store'
  | 'other';

export type MarketingActionType =
  | 'promotion'
  | 'reward'
  | 'web_banner'
  | 'custom';

export interface MarketingCampaign {
  id: string;
  name: string;
  description: string;
  audienceId: string | null;
  audienceName: string;
  currentAudienceSize: number;
  audienceSizeSnapshot: number | null;
  objective: MarketingCampaignObjective;
  channel: MarketingCampaignChannel;
  actionType: MarketingActionType;
  messageTitle: string;
  messageBody: string;
  startsAt: string | null;
  endsAt: string | null;
  status: MarketingCampaignStatus;
  activatedAt: string | null;
  completedAt: string | null;
  cancelledAt: string | null;
  createdAt: string;
  budgetAmount: number | null;
  notes: string;
  conversionOrders: number;
  convertedCustomers: number;
  attributedRevenue: number;
  conversionRate: number;
  roiPercent: number | null;
  trackingEnabled: boolean;
  trackingCode: string;
  trackingToken: string;
  trackedOrders: number;
  updatedAt: string;
}

interface MarketingCampaignRow {
  id: string;
  name: string;
  description: string | null;
  audience_id: string | null;
  audience_name: string | null;
  current_audience_size: number | string | null;
  audience_size_snapshot: number | string | null;
  objective: MarketingCampaignObjective;
  channel: MarketingCampaignChannel;
  action_type: MarketingActionType;
  message_title: string | null;
  message_body: string | null;
  starts_at: string | null;
  ends_at: string | null;
  status: MarketingCampaignStatus;
  activated_at: string | null;
  completed_at: string | null;
  cancelled_at: string | null;
  created_at: string;
  budget_amount: number | string | null;
  notes: string | null;
  conversion_orders: number | string | null;
  converted_customers: number | string | null;
  attributed_revenue: number | string | null;
  conversion_rate: number | string | null;
  roi_percent: number | string | null;
  tracking_enabled: boolean;
  tracking_code: string | null;
  tracking_token: string | null;
  tracked_orders: number | string | null;
  updated_at: string;
}

export async function getMarketingCampaigns(
  status:
    MarketingCampaignStatus | null =
      null,
): Promise<MarketingCampaign[]> {
  const {
    data,
    error,
  } =
    await supabase.rpc(
      'get_marketing_campaigns_admin_v3',
      {
        p_status:
          status,
        p_limit:
          300,
      },
    );

  if (error) {
    throw new Error(
      error.message ||
      'No se pudieron cargar las campañas.',
    );
  }

  return (
    (
      data ??
      []
    ) as MarketingCampaignRow[]
  ).map(
    row => ({
      id:
        row.id,
      name:
        row.name,
      description:
        row.description ??
        '',
      audienceId:
        row.audience_id,
      audienceName:
        row.audience_name ??
        '',
      currentAudienceSize:
        Number(
          row.current_audience_size ??
          0,
        ),
      audienceSizeSnapshot:
        row.audience_size_snapshot ==
        null
          ? null
          : Number(
              row.audience_size_snapshot,
            ),
      objective:
        row.objective,
      channel:
        row.channel,
      actionType:
        row.action_type,
      messageTitle:
        row.message_title ??
        '',
      messageBody:
        row.message_body ??
        '',
      startsAt:
        row.starts_at,
      endsAt:
        row.ends_at,
      status:
        row.status,
      activatedAt:
        row.activated_at,
      completedAt:
        row.completed_at,
      cancelledAt:
        row.cancelled_at,
      createdAt:
        row.created_at,
      budgetAmount:
        row.budget_amount ==
        null
          ? null
          : Number(
              row.budget_amount,
            ),
      notes:
        row.notes ??
        '',
      conversionOrders:
        Number(
          row.conversion_orders ??
          0,
        ),
      convertedCustomers:
        Number(
          row.converted_customers ??
          0,
        ),
      attributedRevenue:
        Number(
          row.attributed_revenue ??
          0,
        ),
      conversionRate:
        Number(
          row.conversion_rate ??
          0,
        ),
      roiPercent:
        row.roi_percent ==
        null
          ? null
          : Number(
              row.roi_percent,
            ),
      trackingEnabled:
        row.tracking_enabled,
      trackingCode:
        row.tracking_code ??
        '',
      trackingToken:
        row.tracking_token ??
        '',
      trackedOrders:
        Number(
          row.tracked_orders ??
          0,
        ),
      updatedAt:
        row.updated_at,
    }),
  );
}

export async function saveMarketingCampaign(
  input: {
    id?: string | null;
    name: string;
    description: string;
    audienceId: string | null;
    objective: MarketingCampaignObjective;
    channel: MarketingCampaignChannel;
    actionType: MarketingActionType;
    messageTitle: string;
    messageBody: string;
    startsAt: string | null;
    endsAt: string | null;
  },
): Promise<string> {
  const {
    data,
    error,
  } =
    await supabase.rpc(
      'save_marketing_campaign_admin',
      {
        p_campaign_id:
          input.id ??
          null,
        p_name:
          input.name.trim(),
        p_description:
          input.description.trim() ||
          null,
        p_audience_id:
          input.audienceId,
        p_objective:
          input.objective,
        p_channel:
          input.channel,
        p_action_type:
          input.actionType,
        p_message_title:
          input.messageTitle.trim() ||
          null,
        p_message_body:
          input.messageBody.trim() ||
          null,
        p_starts_at:
          input.startsAt,
        p_ends_at:
          input.endsAt,
      },
    );

  if (error) {
    throw new Error(
      error.message ||
      'No se pudo guardar la campaña.',
    );
  }

  return String(
    data,
  );
}

export async function activateMarketingCampaign(
  campaignId: string,
): Promise<void> {
  const {
    error,
  } =
    await supabase.rpc(
      'activate_marketing_campaign_admin',
      {
        p_campaign_id:
          campaignId,
      },
    );

  if (error) {
    throw new Error(
      error.message ||
      'No se pudo activar la campaña.',
    );
  }
}

export async function closeMarketingCampaign(
  campaignId: string,
  action:
    'completed' | 'cancelled',
): Promise<void> {
  const {
    error,
  } =
    await supabase.rpc(
      'close_marketing_campaign_admin',
      {
        p_campaign_id:
          campaignId,
        p_action:
          action,
      },
    );

  if (error) {
    throw new Error(
      error.message ||
      'No se pudo cerrar la campaña.',
    );
  }
}

export type {
  CrmAudience,
};


export interface MarketingCandidateOrder {
  orderId: string;
  createdAt: string;
  customerName: string;
  customerPhone: string;
  crmCustomerId: string | null;
  total: number;
  refunded: number;
  netTotal: number;
  alreadyAttributed: boolean;
}

export interface MarketingCampaignConversion {
  id: string;
  orderId: string | null;
  crmCustomerId: string | null;
  customerName: string;
  revenueAmount: number;
  attributionType:
    | 'manual'
    | 'coupon'
    | 'link'
    | 'code'
    | 'pos'
    | 'web';
  notes: string;
  createdAt: string;
}

interface MarketingCandidateOrderRow {
  order_id: string;
  created_at: string;
  customer_name: string | null;
  customer_phone: string | null;
  crm_customer_id: string | null;
  total: number | string | null;
  refunded: number | string | null;
  net_total: number | string | null;
  already_attributed: boolean;
}

interface MarketingCampaignConversionRow {
  id: string;
  order_id: string | null;
  crm_customer_id: string | null;
  customer_name: string;
  revenue_amount: number | string | null;
  attribution_type:
    | 'manual'
    | 'coupon'
    | 'link'
    | 'code'
    | 'pos'
    | 'web';
  notes: string | null;
  created_at: string;
}

export async function updateMarketingCampaignTracking(
  campaignId: string,
  budgetAmount: number | null,
  notes: string,
): Promise<void> {
  const {
    error,
  } =
    await supabase.rpc(
      'update_marketing_campaign_tracking_admin',
      {
        p_campaign_id:
          campaignId,
        p_budget_amount:
          budgetAmount,
        p_notes:
          notes.trim() ||
          null,
      },
    );

  if (error) {
    throw new Error(
      error.message ||
      'No se pudo guardar el seguimiento.',
    );
  }
}

export async function getMarketingCandidateOrders(
  campaignId: string,
  search = '',
): Promise<MarketingCandidateOrder[]> {
  const {
    data,
    error,
  } =
    await supabase.rpc(
      'get_marketing_candidate_orders_admin',
      {
        p_campaign_id:
          campaignId,
        p_search:
          search.trim() ||
          null,
        p_limit:
          150,
      },
    );

  if (error) {
    throw new Error(
      error.message ||
      'No se pudieron cargar las órdenes candidatas.',
    );
  }

  return (
    (
      data ??
      []
    ) as MarketingCandidateOrderRow[]
  ).map(
    row => ({
      orderId:
        row.order_id,
      createdAt:
        row.created_at,
      customerName:
        row.customer_name ??
        'Cliente',
      customerPhone:
        row.customer_phone ??
        '',
      crmCustomerId:
        row.crm_customer_id,
      total:
        Number(
          row.total ??
          0,
        ),
      refunded:
        Number(
          row.refunded ??
          0,
        ),
      netTotal:
        Number(
          row.net_total ??
          0,
        ),
      alreadyAttributed:
        row.already_attributed,
    }),
  );
}

export async function getMarketingCampaignConversions(
  campaignId: string,
): Promise<MarketingCampaignConversion[]> {
  const {
    data,
    error,
  } =
    await supabase.rpc(
      'get_marketing_campaign_conversions_admin',
      {
        p_campaign_id:
          campaignId,
      },
    );

  if (error) {
    throw new Error(
      error.message ||
      'No se pudieron cargar las conversiones.',
    );
  }

  return (
    (
      data ??
      []
    ) as MarketingCampaignConversionRow[]
  ).map(
    row => ({
      id:
        row.id,
      orderId:
        row.order_id,
      crmCustomerId:
        row.crm_customer_id,
      customerName:
        row.customer_name,
      revenueAmount:
        Number(
          row.revenue_amount ??
          0,
        ),
      attributionType:
        row.attribution_type,
      notes:
        row.notes ??
        '',
      createdAt:
        row.created_at,
    }),
  );
}

export async function addMarketingCampaignConversion(
  input: {
    campaignId: string;
    orderId: string | null;
    crmCustomerId: string | null;
    revenueAmount: number | null;
    attributionType:
      | 'manual'
      | 'coupon'
      | 'link'
      | 'code'
      | 'pos'
      | 'web';
    notes: string;
  },
): Promise<string> {
  const {
    data,
    error,
  } =
    await supabase.rpc(
      'add_marketing_campaign_conversion_admin',
      {
        p_campaign_id:
          input.campaignId,
        p_order_id:
          input.orderId,
        p_crm_customer_id:
          input.crmCustomerId,
        p_revenue_amount:
          input.revenueAmount,
        p_attribution_type:
          input.attributionType,
        p_notes:
          input.notes.trim() ||
          null,
      },
    );

  if (error) {
    throw new Error(
      error.message ||
      'No se pudo registrar la conversión.',
    );
  }

  return String(
    data,
  );
}

export async function deleteMarketingCampaignConversion(
  conversionId: string,
): Promise<void> {
  const {
    error,
  } =
    await supabase.rpc(
      'delete_marketing_campaign_conversion_admin',
      {
        p_conversion_id:
          conversionId,
      },
    );

  if (error) {
    throw new Error(
      error.message ||
      'No se pudo eliminar la conversión.',
    );
  }
}


export interface MarketingTrackingResult {
  trackingCode: string;
  trackingToken: string;
  trackingEnabled: boolean;
}

interface MarketingTrackingResultRow {
  tracking_code: string | null;
  tracking_token: string | null;
  tracking_enabled: boolean;
}

export async function saveMarketingTrackingIdentifiers(
  campaignId: string,
  enabled: boolean,
  code: string,
): Promise<MarketingTrackingResult> {
  const {
    data,
    error,
  } =
    await supabase.rpc(
      'save_marketing_campaign_tracking_identifiers_admin',
      {
        p_campaign_id:
          campaignId,
        p_tracking_enabled:
          enabled,
        p_tracking_code:
          code.trim() ||
          null,
      },
    );

  if (error) {
    throw new Error(
      error.message ||
      'No se pudo guardar el tracking.',
    );
  }

  const row =
    ((
      data ??
      []
    ) as MarketingTrackingResultRow[])[0];

  if (!row) {
    throw new Error(
      'No se recibió la configuración de tracking.',
    );
  }

  return {
    trackingCode:
      row.tracking_code ??
      '',
    trackingToken:
      row.tracking_token ??
      '',
    trackingEnabled:
      row.tracking_enabled,
  };
}
