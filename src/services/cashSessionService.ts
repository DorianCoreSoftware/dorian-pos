import {
  closeCashSessionById,
  fetchOpenCashSession,
  insertCashSession,
} from '../repositories/CashSessionRepository';

import {
  CashSession,
} from '../types';

interface OpenCashSessionParams {
  openingAmount: number;
  openedBy?: string | null;
}

interface CloseCashSessionParams {
  cashSessionId: string;

  countedCash: number;

  openingAmount: number;

  totalCashSales: number;
  totalCardSales: number;

  salesCount: number;

  closedBy?: string | null;
}

export async function getOpenCashSession(): Promise<
  CashSession | null
> {
  return fetchOpenCashSession();
}

export async function openCashSession({
  openingAmount,
  openedBy = null,
}: OpenCashSessionParams): Promise<CashSession> {
  validateMoney(
    openingAmount,
    'El fondo inicial',
  );

  const existingSession =
    await fetchOpenCashSession();

  if (existingSession) {
    throw new Error(
      'Ya existe una caja abierta.',
    );
  }

  return insertCashSession({
    openingAmount:
      roundCurrency(
        openingAmount,
      ),

    openedBy,
  });
}

export async function closeCashSession({
  cashSessionId,
  countedCash,
  openingAmount,
  totalCashSales,
  totalCardSales,
  salesCount,
  closedBy = null,
}: CloseCashSessionParams): Promise<CashSession> {
  if (!cashSessionId?.trim()) {
    throw new Error(
      'La sesión de caja no es válida.',
    );
  }

  validateMoney(
    countedCash,
    'El efectivo contado',
  );

  validateMoney(
    openingAmount,
    'El fondo inicial',
  );

  validateMoney(
    totalCashSales,
    'Las ventas en efectivo',
  );

  validateMoney(
    totalCardSales,
    'Las ventas con tarjeta',
  );

  if (
    !Number.isInteger(
      salesCount,
    ) ||
    salesCount < 0
  ) {
    throw new Error(
      'La cantidad de ventas no es válida.',
    );
  }

  const expectedCash =
    roundCurrency(
      openingAmount +
        totalCashSales,
    );

  const totalSales =
    roundCurrency(
      totalCashSales +
        totalCardSales,
    );

  return closeCashSessionById({
    cashSessionId,

    countedCash:
      roundCurrency(
        countedCash,
      ),

    expectedCash,

    totalCashSales:
      roundCurrency(
        totalCashSales,
      ),

    totalCardSales:
      roundCurrency(
        totalCardSales,
      ),

    totalSales,

    salesCount,

    closedBy,
  });
}

function validateMoney(
  value: number,
  label: string,
): void {
  if (
    !Number.isFinite(value) ||
    value < 0
  ) {
    throw new Error(
      `${label} no es válido.`,
    );
  }
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