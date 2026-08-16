import {
  supabase,
} from '../services/supabase';

import {
  CashSession,
  CashSessionStatus,
  CloseCashSessionInput,
  OpenCashSessionInput,
} from '../types';

interface CashSessionRecord {
  id: string;

  opened_by: string | null;
  opened_at: string;

  opening_amount:
  string | number;

  closed_at: string | null;
  closed_by: string | null;

  expected_cash:
  string | number | null;

  counted_cash:
  string | number | null;

  difference_amount:
  string | number | null;

  total_cash_sales:
  string | number | null;

  total_card_sales:
  string | number | null;

  total_sales:
  string | number | null;

  sales_count: number | null;

  status: CashSessionStatus;

  created_at: string;

  opened_by_profile?: {
    first_name: string | null;
    last_name: string | null;
  } | null;

  closed_by_profile?: {
    first_name: string | null;
    last_name: string | null;
  } | null;
}

export async function fetchOpenCashSession(): Promise<
  CashSession | null
> {
  const { data, error } =
    await supabase
      .from('cash_sessions')
      .select('*')
      .eq(
        'status',
        'open',
      )
      .maybeSingle();

  if (error) {
    throw new Error(
      `No se pudo consultar la caja abierta: ${error.message}`,
    );
  }

  if (!data) {
    return null;
  }

  return mapCashSession(
    data as CashSessionRecord,
  );
}

export async function fetchClosedCashSessions(): Promise<
  CashSession[]
> {
  const {
    data,
    error,
  } = await supabase
    .from('cash_sessions')
    .select(`
      *,
      opened_by_profile:profiles!cash_sessions_opened_by_fkey(
        first_name,
        last_name
      ),
      closed_by_profile:profiles!cash_sessions_closed_by_fkey(
        first_name,
        last_name
      )
    `)
    .eq(
      'status',
      'closed',
    )
    .order(
      'closed_at',
      {
        ascending: false,
      },
    );

  if (error) {
    throw new Error(
      `No se pudo consultar el historial de caja: ${error.message}`,
    );
  }

  return (
    data as
    | CashSessionRecord[]
    | null
  )?.map(
    mapCashSession,
  ) ?? [];
}

export async function insertCashSession(
  input: OpenCashSessionInput,
): Promise<CashSession> {
  const { data, error } =
    await supabase
      .from('cash_sessions')
      .insert({
        opening_amount:
          input.openingAmount,

        opened_by:
          input.openedBy ??
          null,

        status: 'open',
      })
      .select()
      .single();

  if (error) {
    throw new Error(
      `No se pudo abrir la caja: ${error.message}`,
    );
  }

  if (!data) {
    throw new Error(
      'Supabase no devolvió la sesión de caja creada.',
    );
  }

  return mapCashSession(
    data as CashSessionRecord,
  );
}

export async function closeCashSessionById(
  input: CloseCashSessionInput,
): Promise<CashSession> {
  const differenceAmount =
    roundCurrency(
      input.countedCash -
      input.expectedCash,
    );

  const { data, error } =
    await supabase
      .from('cash_sessions')
      .update({
        closed_at:
          new Date().toISOString(),

        closed_by:
          input.closedBy ??
          null,

        expected_cash:
          input.expectedCash,

        counted_cash:
          input.countedCash,

        difference_amount:
          differenceAmount,

        total_cash_sales:
          input.totalCashSales,

        total_card_sales:
          input.totalCardSales,

        total_sales:
          input.totalSales,

        sales_count:
          input.salesCount,

        status:
          'closed',
      })
      .eq(
        'id',
        input.cashSessionId,
      )
      .eq(
        'status',
        'open',
      )
      .select()
      .single();

  if (error) {
    throw new Error(
      `No se pudo cerrar la caja: ${error.message}`,
    );
  }

  if (!data) {
    throw new Error(
      'Supabase no devolvió la sesión de caja cerrada.',
    );
  }

  return mapCashSession(
    data as CashSessionRecord,
  );
}

function mapCashSession(
  record: CashSessionRecord,
): CashSession {
  return {
    id:
      record.id,

    openedBy:
      record.opened_by,

    openedAt:
      record.opened_at,

    openingAmount:
      Number(
        record.opening_amount,
      ),

    closedAt:
      record.closed_at,

    closedBy:
      record.closed_by,

    expectedCash:
      toNullableNumber(
        record.expected_cash,
      ),

    countedCash:
      toNullableNumber(
        record.counted_cash,
      ),

    differenceAmount:
      toNullableNumber(
        record.difference_amount,
      ),

    totalCashSales:
      toNullableNumber(
        record.total_cash_sales,
      ),

    totalCardSales:
      toNullableNumber(
        record.total_card_sales,
      ),

    totalSales:
      toNullableNumber(
        record.total_sales,
      ),

    salesCount:
      record.sales_count,

    status:
      record.status,

    createdAt:
      record.created_at,

    openedByName:
      buildProfileName(
        record.opened_by_profile,
      ),

    closedByName:
      buildProfileName(
        record.closed_by_profile,
      ),
  };
}

function toNullableNumber(
  value:
    | string
    | number
    | null,
): number | null {
  if (value === null) {
    return null;
  }

  return Number(value);
}

function roundCurrency(
  amount: number,
): number {
  return (
    Math.round(
      (
        amount +
        Number.EPSILON
      ) * 100,
    ) / 100
  );
}

function buildProfileName(
  profile:
    | {
        first_name:
          | string
          | null;

        last_name:
          | string
          | null;
      }
    | null
    | undefined,
): string | null {
  if (!profile) {
    return null;
  }

  const fullName = [
    profile.first_name,
    profile.last_name,
  ]
    .filter(Boolean)
    .join(' ')
    .trim();

  return fullName || null;
}