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
 * Se utiliza también para:
 * - Salsas
 * - Sabores
 * - Carnes
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

export type ModifierReportGroup =
  | 'sauce'
  | 'drink_flavor'
  | 'meat';

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
 * Puede filtrar por:
 * - sauce
 * - drink_flavor
 * - meat
 *
 * Si no se manda group,
 * devuelve todos los modificadores
 * que tengan un modifier_group asociado.
 */
export async function getModifierSalesReport(
  from: Date,
  to: Date,
  group?: ModifierReportGroup,
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
        group ?? null,
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

/**
 * Helpers de reportes por código de grupo.
 */
export function getSauceSalesReport(
  from: Date,
  to: Date,
): Promise<ModifierSalesReport[]> {
  return getModifierSalesReport(
    from,
    to,
    'sauce',
  );
}

export function getFlavorSalesReport(
  from: Date,
  to: Date,
): Promise<ModifierSalesReport[]> {
  return getModifierSalesReport(
    from,
    to,
    'drink_flavor',
  );
}

export function getMeatSalesReport(
  from: Date,
  to: Date,
): Promise<ModifierSalesReport[]> {
  return getModifierSalesReport(
    from,
    to,
    'meat',
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