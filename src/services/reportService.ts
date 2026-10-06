import { supabase } from './supabase';

/**
 * Resumen general de ventas que usa la app.
 */
export interface SalesReportSummary {
  total_revenue: number;
  orders_count: number;
  average_ticket: number;
  items_sold: number;
}

/**
 * Reporte de productos que usa la app.
 */
export interface ProductSalesReport {
  id: string;
  category_id: string;
  name: string;
  units_sold: number;
  revenue: number;
}

/**
 * Reporte de modificadores que usa la app.
 *
 * El grupo se obtiene de modifier_groups y puede ser
 * cualquier grupo configurado por el negocio.
 */
export interface ModifierSalesReport {
  id: string;
  name: string;
  group_name: string;
  units_sold: number;
}

/**
 * Tipos crudos devueltos por Supabase.
 *
 * PostgreSQL puede devolver numeric/bigint
 * como string, por eso aceptamos ambos.
 */
interface SalesReportSummaryRow {
  total_revenue:
    | string
    | number
    | null;

  orders_count:
    | string
    | number
    | null;

  average_ticket:
    | string
    | number
    | null;

  items_sold:
    | string
    | number
    | null;
}

interface ProductSalesReportRow {
  id: string;
  category_id: string;
  name: string;

  units_sold:
    | string
    | number
    | null;

  revenue:
    | string
    | number
    | null;
}

interface ModifierSalesReportRow {
  id: string;
  name: string;
  group_name: string;

  units_sold:
    | string
    | number
    | null;
}

/**
 * Obtiene el resumen general del periodo:
 *
 * - Ingresos
 * - Número de órdenes
 * - Ticket promedio
 * - Artículos vendidos
 */
export async function getSalesReportSummary(
  from: Date,
  to: Date,
): Promise<SalesReportSummary> {
  const {
    data,
    error,
  } = await supabase.rpc(
    'get_sales_report_summary',
    {
      p_from:
        from.toISOString(),

      p_to:
        to.toISOString(),
    },
  );

  if (error) {
    console.error(
      'Error fetching sales report summary:',
      error,
    );

    throw error;
  }

  const rows =
    (data ?? []) as
    SalesReportSummaryRow[];

  const row =
    rows[0] ?? null;

  return {
    total_revenue:
      Number(
        row?.total_revenue ??
        0,
      ),

    orders_count:
      Number(
        row?.orders_count ??
        0,
      ),

    average_ticket:
      Number(
        row?.average_ticket ??
        0,
      ),

    items_sold:
      Number(
        row?.items_sold ??
        0,
      ),
  };
}

/**
 * Obtiene los productos vendidos
 * dentro del rango seleccionado.
 */
export async function getProductSalesReport(
  from: Date,
  to: Date,
  limit = 20,
): Promise<ProductSalesReport[]> {
  const {
    data,
    error,
  } = await supabase.rpc(
    'get_product_sales_report',
    {
      p_from:
        from.toISOString(),

      p_to:
        to.toISOString(),

      p_limit:
        limit,
    },
  );

  if (error) {
    console.error(
      'Error fetching product sales report:',
      error,
    );

    throw error;
  }

  const rows =
    (data ?? []) as
    ProductSalesReportRow[];

  return rows.map(
    (
      row:
        ProductSalesReportRow,
    ): ProductSalesReport => ({
      id:
        row.id,

      category_id:
        row.category_id,

      name:
        row.name,

      units_sold:
        Number(
          row.units_sold ??
          0,
        ),

      revenue:
        Number(
          row.revenue ??
          0,
        ),
    }),
  );
}

/**
 * Obtiene el consumo de modificadores
 * dentro del rango seleccionado.
 *
 * Si se proporciona groupCode, filtra por
 * modifier_groups.code. Si no se proporciona,
 * devuelve todos los modificadores asociados
 * a un grupo.
 */
export async function getModifierSalesReport(
  from: Date,
  to: Date,
  groupCode?: string,
): Promise<ModifierSalesReport[]> {
  const {
    data,
    error,
  } = await supabase.rpc(
    'get_modifier_sales_report',
    {
      p_from:
        from.toISOString(),

      p_to:
        to.toISOString(),

      p_group:
        groupCode?.trim() || null,
    },
  );

  if (error) {
    console.error(
      'Error fetching modifier sales report:',
      error,
    );

    throw error;
  }

  const rows =
    (data ?? []) as
    ModifierSalesReportRow[];

  return rows.map(
    (
      row:
        ModifierSalesReportRow,
    ): ModifierSalesReport => ({
      id:
        row.id,

      name:
        row.name,

      group_name:
        row.group_name,

      units_sold:
        Number(
          row.units_sold ??
          0,
        ),
    }),
  );
}

export interface DailySalesReport {
  sale_date: string;
  revenue: number;
  orders_count: number;
}

interface DailySalesReportRow {
  sale_date: string;

  revenue:
    | string
    | number
    | null;

  orders_count:
    | string
    | number
    | null;
}

export async function getDailySalesReport(
  from: Date,
  to: Date,
): Promise<DailySalesReport[]> {
  const {
    data,
    error,
  } = await supabase.rpc(
    'get_daily_sales_report',
    {
      p_from:
        from.toISOString(),

      p_to:
        to.toISOString(),
    },
  );

  if (error) {
    console.error(
      'Error fetching daily sales report:',
      error,
    );

    throw error;
  }

  const rows =
    (data ?? []) as
    DailySalesReportRow[];

  return rows.map(
    (
      row:
        DailySalesReportRow,
    ): DailySalesReport => ({
      sale_date:
        row.sale_date,

      revenue:
        Number(
          row.revenue ??
          0,
        ),

      orders_count:
        Number(
          row.orders_count ??
          0,
        ),
    }),
  );
}
/**
 * Evento genérico de promoción para reportes administrativos.
 * Incluye canjes de programas configurables y descuentos de
 * promociones de modificadores.
 */
export interface PromotionActivityReport {
  event_id: string;
  event_at: string;
  promotion_id: string | null;
  promotion_name: string;
  promotion_type:
    | 'collect_reward'
    | 'order_refund'
    | 'modifier_discount'
    | string;
  benefit_name: string | null;
  codes: string | null;
  order_references: string | null;
  amount: number;
  applications_count: number;
  user_name: string | null;
}

interface PromotionActivityReportRow {
  event_id: string;
  event_at: string;
  promotion_id: string | null;
  promotion_name: string;
  promotion_type: string;
  benefit_name: string | null;
  codes: string | null;
  order_references: string | null;
  amount: string | number | null;
  applications_count: string | number | null;
  user_name: string | null;
}

/**
 * Obtiene el historial unificado de promociones dentro del rango.
 */
export async function getPromotionActivityReport(
  from: Date,
  to: Date,
): Promise<PromotionActivityReport[]> {
  const {
    data,
    error,
  } = await supabase.rpc(
    'get_promotion_activity_report',
    {
      p_from: from.toISOString(),
      p_to: to.toISOString(),
    },
  );

  if (error) {
    console.error(
      'Error fetching promotion activity report:',
      error,
    );

    throw error;
  }

  return ((data ?? []) as PromotionActivityReportRow[]).map(
    row => ({
      event_id: row.event_id,
      event_at: row.event_at,
      promotion_id: row.promotion_id,
      promotion_name: row.promotion_name,
      promotion_type: row.promotion_type,
      benefit_name: row.benefit_name,
      codes: row.codes,
      order_references: row.order_references,
      amount: Number(row.amount ?? 0),
      applications_count: Number(row.applications_count ?? 0),
      user_name: row.user_name,
    }),
  );
}

export interface FinancialBalanceReport {
  gross_sales: number;
  refunds: number;
  net_sales: number;
  expenses: number;
  balance: number;
  expense_count: number;
}

export interface ExpenseCategoryReport {
  category_id: string;
  category_name: string;
  expense_count: number;
  amount: number;
}

export interface DailyFinancialReport {
  report_date: string;
  net_sales: number;
  expenses: number;
  balance: number;
}

interface FinancialBalanceReportRow {
  gross_sales: string | number | null;
  refunds: string | number | null;
  net_sales: string | number | null;
  expenses: string | number | null;
  balance: string | number | null;
  expense_count: string | number | null;
}

interface ExpenseCategoryReportRow {
  category_id: string;
  category_name: string;
  expense_count: string | number | null;
  amount: string | number | null;
}

interface DailyFinancialReportRow {
  report_date: string;
  net_sales: string | number | null;
  expenses: string | number | null;
  balance: string | number | null;
}

export async function getFinancialBalanceReport(
  from: Date,
  to: Date,
): Promise<FinancialBalanceReport> {
  const { data, error } = await supabase.rpc(
    'get_financial_balance_report',
    {
      p_from: from.toISOString(),
      p_to: to.toISOString(),
    },
  );

  if (error) throw error;

  const row = ((data ?? []) as FinancialBalanceReportRow[])[0];
  return {
    gross_sales: Number(row?.gross_sales ?? 0),
    refunds: Number(row?.refunds ?? 0),
    net_sales: Number(row?.net_sales ?? 0),
    expenses: Number(row?.expenses ?? 0),
    balance: Number(row?.balance ?? 0),
    expense_count: Number(row?.expense_count ?? 0),
  };
}

export async function getExpenseCategoryReport(
  from: Date,
  to: Date,
): Promise<ExpenseCategoryReport[]> {
  const { data, error } = await supabase.rpc(
    'get_expense_category_report',
    {
      p_from: from.toISOString(),
      p_to: to.toISOString(),
    },
  );

  if (error) throw error;

  return ((data ?? []) as ExpenseCategoryReportRow[]).map(row => ({
    category_id: row.category_id,
    category_name: row.category_name,
    expense_count: Number(row.expense_count ?? 0),
    amount: Number(row.amount ?? 0),
  }));
}

export async function getDailyFinancialReport(
  from: Date,
  to: Date,
): Promise<DailyFinancialReport[]> {
  const { data, error } = await supabase.rpc(
    'get_daily_financial_report',
    {
      p_from: from.toISOString(),
      p_to: to.toISOString(),
    },
  );

  if (error) throw error;

  return ((data ?? []) as DailyFinancialReportRow[]).map(row => ({
    report_date: row.report_date,
    net_sales: Number(row.net_sales ?? 0),
    expenses: Number(row.expenses ?? 0),
    balance: Number(row.balance ?? 0),
  }));
}
