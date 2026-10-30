import {
  supabase,
} from './supabase';

export type DashboardPeriod =
  | 'today'
  | '7d'
  | '30d';

export interface DashboardDailyPoint {
  date: string;
  revenue: number;
  ordersCount: number;
}

export interface DashboardTopProduct {
  id: string;
  name: string;
  unitsSold: number;
  revenue: number;
}

export interface DashboardSnapshot {
  from: Date;
  to: Date;
  previousFrom: Date;
  previousTo: Date;

  netSales: number;
  previousNetSales: number;
  ordersCount: number;
  previousOrdersCount: number;
  averageTicket: number;
  previousAverageTicket: number;

  grossProfit: number;
  previousGrossProfit: number;
  grossMarginPercent: number | null;
  previousGrossMarginPercent: number | null;
  cogs: number;
  costCoveragePercent: number;

  expenses: number;
  balance: number;
  refunds: number;

  lowStockItems: number;
  criticalStockItems: number;

  activeCrmCustomers: number;
  newCrmCustomers: number;

  activeCampaigns: number;
  marketingAttributedRevenue: number;

  dailySales: DashboardDailyPoint[];
  topProducts: DashboardTopProduct[];
}

interface SalesSummaryRow {
  total_revenue:
    | number
    | string
    | null;
  orders_count:
    | number
    | string
    | null;
  average_ticket:
    | number
    | string
    | null;
}

interface FinancialRow {
  refunds:
    | number
    | string
    | null;
  net_sales:
    | number
    | string
    | null;
  expenses:
    | number
    | string
    | null;
  balance:
    | number
    | string
    | null;
}

interface ProfitabilityRow {
  cogs:
    | number
    | string
    | null;
  gross_profit:
    | number
    | string
    | null;
  gross_margin_percent:
    | number
    | string
    | null;
  cost_coverage_percent:
    | number
    | string
    | null;
}

interface InventoryRow {
  current_stock:
    | number
    | string
    | null;
  minimum_stock:
    | number
    | string
    | null;
}

interface MarketingConversionRow {
  revenue_amount:
    | number
    | string
    | null;
}

interface DailySalesRow {
  sale_date: string;
  revenue:
    | number
    | string
    | null;
  orders_count:
    | number
    | string
    | null;
}

interface ProductSalesRow {
  id: string;
  name: string;
  units_sold:
    | number
    | string
    | null;
  revenue:
    | number
    | string
    | null;
}

function startOfLocalDay(
  date: Date,
): Date {
  const value =
    new Date(date);

  value.setHours(
    0,
    0,
    0,
    0,
  );

  return value;
}

function getPeriodDates(
  period: DashboardPeriod,
): {
  from: Date;
  to: Date;
  previousFrom: Date;
  previousTo: Date;
} {
  const now =
    new Date();

  const to =
    new Date(now);

  let from:
    Date;

  if (
    period ===
    'today'
  ) {
    from =
      startOfLocalDay(
        now,
      );
  } else {
    const days =
      period ===
        '7d'
        ? 7
        : 30;

    from =
      startOfLocalDay(
        new Date(
          now.getFullYear(),
          now.getMonth(),
          now.getDate() -
            (
              days -
              1
            ),
        ),
      );
  }

  const duration =
    Math.max(
      to.getTime() -
        from.getTime(),
      1,
    );

  const previousTo =
    new Date(
      from.getTime() -
        1,
    );

  const previousFrom =
    new Date(
      previousTo.getTime() -
        duration,
    );

  return {
    from,
    to,
    previousFrom,
    previousTo,
  };
}

async function getSales(
  from: Date,
  to: Date,
): Promise<{
  netSales: number;
  ordersCount: number;
  averageTicket: number;
}> {
  const {
    data,
    error,
  } =
    await supabase.rpc(
      'get_sales_report_summary',
      {
        p_from:
          from.toISOString(),
        p_to:
          to.toISOString(),
      },
    );

  if (error) {
    throw error;
  }

  const row =
    ((
      data ??
      []
    ) as SalesSummaryRow[])[0];

  return {
    netSales:
      Number(
        row?.total_revenue ??
        0,
      ),
    ordersCount:
      Number(
        row?.orders_count ??
        0,
      ),
    averageTicket:
      Number(
        row?.average_ticket ??
        0,
      ),
  };
}

async function getFinancial(
  from: Date,
  to: Date,
): Promise<{
  refunds: number;
  expenses: number;
  balance: number;
}> {
  const {
    data,
    error,
  } =
    await supabase.rpc(
      'get_financial_balance_report',
      {
        p_from:
          from.toISOString(),
        p_to:
          to.toISOString(),
      },
    );

  if (error) {
    throw error;
  }

  const row =
    ((
      data ??
      []
    ) as FinancialRow[])[0];

  return {
    refunds:
      Number(
        row?.refunds ??
        0,
      ),
    expenses:
      Number(
        row?.expenses ??
        0,
      ),
    balance:
      Number(
        row?.balance ??
        0,
      ),
  };
}

async function getProfitability(
  from: Date,
  to: Date,
): Promise<{
  cogs: number;
  grossProfit: number;
  grossMarginPercent:
    number | null;
  costCoveragePercent: number;
}> {
  const {
    data,
    error,
  } =
    await supabase.rpc(
      'get_profitability_report_admin',
      {
        p_from:
          from.toISOString(),
        p_to:
          to.toISOString(),
      },
    );

  if (error) {
    throw error;
  }

  const row =
    ((
      data ??
      []
    ) as ProfitabilityRow[])[0];

  return {
    cogs:
      Number(
        row?.cogs ??
        0,
      ),
    grossProfit:
      Number(
        row?.gross_profit ??
        0,
      ),
    grossMarginPercent:
      row?.gross_margin_percent ==
      null
        ? null
        : Number(
            row.gross_margin_percent,
          ),
    costCoveragePercent:
      Number(
        row?.cost_coverage_percent ??
        0,
      ),
  };
}

async function getInventoryHealth():
Promise<{
  lowStockItems: number;
  criticalStockItems: number;
}> {
  const {
    data,
    error,
  } =
    await supabase
      .from(
        'inventory_items',
      )
      .select(
        'current_stock,minimum_stock',
      )
      .eq(
        'is_active',
        true,
      );

  if (error) {
    throw error;
  }

  let lowStockItems =
    0;

  let criticalStockItems =
    0;

  (
    (
      data ??
      []
    ) as InventoryRow[]
  ).forEach(
    row => {
      const current =
        Number(
          row.current_stock ??
          0,
        );

      const minimum =
        Number(
          row.minimum_stock ??
          0,
        );

      if (
        current <=
        minimum
      ) {
        lowStockItems +=
          1;
      }

      if (
        current <=
        0
      ) {
        criticalStockItems +=
          1;
      }
    },
  );

  return {
    lowStockItems,
    criticalStockItems,
  };
}

async function getCrmHealth(
  from: Date,
): Promise<{
  activeCrmCustomers: number;
  newCrmCustomers: number;
}> {
  const [
    activeResult,
    newResult,
  ] =
    await Promise.all([
      supabase
        .from(
          'crm_customers',
        )
        .select(
          'id',
          {
            count:
              'exact',
            head:
              true,
          },
        )
        .eq(
          'is_active',
          true,
        ),

      supabase
        .from(
          'crm_customers',
        )
        .select(
          'id',
          {
            count:
              'exact',
            head:
              true,
          },
        )
        .eq(
          'is_active',
          true,
        )
        .gte(
          'created_at',
          from.toISOString(),
        ),
    ]);

  if (
    activeResult.error
  ) {
    throw activeResult.error;
  }

  if (
    newResult.error
  ) {
    throw newResult.error;
  }

  return {
    activeCrmCustomers:
      activeResult.count ??
      0,
    newCrmCustomers:
      newResult.count ??
      0,
  };
}

async function getMarketingHealth(
  from: Date,
  to: Date,
): Promise<{
  activeCampaigns: number;
  marketingAttributedRevenue: number;
}> {
  const [
    campaignsResult,
    conversionsResult,
  ] =
    await Promise.all([
      supabase
        .from(
          'marketing_campaigns',
        )
        .select(
          'id',
          {
            count:
              'exact',
            head:
              true,
          },
        )
        .eq(
          'status',
          'active',
        ),

      supabase
        .from(
          'marketing_campaign_conversions',
        )
        .select(
          'revenue_amount',
        )
        .gte(
          'created_at',
          from.toISOString(),
        )
        .lte(
          'created_at',
          to.toISOString(),
        ),
    ]);

  if (
    campaignsResult.error
  ) {
    throw campaignsResult.error;
  }

  if (
    conversionsResult.error
  ) {
    throw conversionsResult.error;
  }

  const revenue =
    (
      (
        conversionsResult.data ??
        []
      ) as MarketingConversionRow[]
    ).reduce(
      (
        total,
        row,
      ) =>
        total +
        Number(
          row.revenue_amount ??
          0,
        ),
      0,
    );

  return {
    activeCampaigns:
      campaignsResult.count ??
      0,
    marketingAttributedRevenue:
      revenue,
  };
}


async function getDailySales(
  from: Date,
  to: Date,
): Promise<DashboardDailyPoint[]> {
  const { data, error } = await supabase.rpc(
    'get_daily_sales_report',
    {
      p_from: from.toISOString(),
      p_to: to.toISOString(),
    },
  );

  if (error) {
    throw error;
  }

  return ((data ?? []) as DailySalesRow[]).map(
    row => ({
      date: row.sale_date,
      revenue: Number(row.revenue ?? 0),
      ordersCount: Number(row.orders_count ?? 0),
    }),
  );
}

async function getTopProducts(
  from: Date,
  to: Date,
): Promise<DashboardTopProduct[]> {
  const { data, error } = await supabase.rpc(
    'get_product_sales_report',
    {
      p_from: from.toISOString(),
      p_to: to.toISOString(),
      p_limit: 5,
    },
  );

  if (error) {
    throw error;
  }

  return ((data ?? []) as ProductSalesRow[]).map(
    row => ({
      id: row.id,
      name: row.name,
      unitsSold: Number(row.units_sold ?? 0),
      revenue: Number(row.revenue ?? 0),
    }),
  );
}

export async function getDashboardSnapshot(
  period: DashboardPeriod,
): Promise<DashboardSnapshot> {
  const dates =
    getPeriodDates(
      period,
    );

  const [
    currentSales,
    previousSales,
    currentFinancial,
    currentProfitability,
    previousProfitability,
    inventory,
    crm,
    marketing,
    dailySales,
    topProducts,
  ] =
    await Promise.all([
      getSales(
        dates.from,
        dates.to,
      ),
      getSales(
        dates.previousFrom,
        dates.previousTo,
      ),
      getFinancial(
        dates.from,
        dates.to,
      ),
      getProfitability(
        dates.from,
        dates.to,
      ),
      getProfitability(
        dates.previousFrom,
        dates.previousTo,
      ),
      getInventoryHealth(),
      getCrmHealth(
        dates.from,
      ),
      getMarketingHealth(
        dates.from,
        dates.to,
      ),
      getDailySales(
        dates.from,
        dates.to,
      ),
      getTopProducts(
        dates.from,
        dates.to,
      ),
    ]);

  return {
    ...dates,

    netSales:
      currentSales.netSales,
    previousNetSales:
      previousSales.netSales,
    ordersCount:
      currentSales.ordersCount,
    previousOrdersCount:
      previousSales.ordersCount,
    averageTicket:
      currentSales.averageTicket,
    previousAverageTicket:
      previousSales.averageTicket,

    grossProfit:
      currentProfitability.grossProfit,
    previousGrossProfit:
      previousProfitability.grossProfit,
    grossMarginPercent:
      currentProfitability.grossMarginPercent,
    previousGrossMarginPercent:
      previousProfitability.grossMarginPercent,
    cogs:
      currentProfitability.cogs,
    costCoveragePercent:
      currentProfitability.costCoveragePercent,

    expenses:
      currentFinancial.expenses,
    balance:
      currentFinancial.balance,
    refunds:
      currentFinancial.refunds,

    lowStockItems:
      inventory.lowStockItems,
    criticalStockItems:
      inventory.criticalStockItems,

    activeCrmCustomers:
      crm.activeCrmCustomers,
    newCrmCustomers:
      crm.newCrmCustomers,

    activeCampaigns:
      marketing.activeCampaigns,
    marketingAttributedRevenue:
      marketing.marketingAttributedRevenue,

    dailySales,
    topProducts,
  };
}
