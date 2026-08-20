export type CashSessionStatus =
  | 'open'
  | 'closed';

export interface CashSession {
  id: string;

  openedBy:
    string | null;

  openedAt: string;

  openingAmount:
    number;

  closedAt:
    string | null;

  closedBy:
    string | null;

  expectedCash:
    number | null;

  countedCash:
    number | null;

  differenceAmount:
    number | null;

  totalCashSales:
    number | null;

  totalCardSales:
    number | null;

  totalSales:
    number | null;

  /*
   * ============================
   * REEMBOLSOS
   * ============================
   */

  totalCashRefunds:
    number;

  totalCardRefunds:
    number;

  totalRefunds:
    number;

  salesCount:
    number | null;

  status:
    CashSessionStatus;

  createdAt:
    string;

  openedByName?:
    string | null;

  closedByName?:
    string | null;
}

export interface OpenCashSessionInput {
  openingAmount:
    number;

  openedBy?:
    string | null;
}

export interface CloseCashSessionInput {
  cashSessionId:
    string;

  countedCash:
    number;

  expectedCash:
    number;

  totalCashSales:
    number;

  totalCardSales:
    number;

  totalSales:
    number;

  totalCashRefunds:
    number;

  totalCardRefunds:
    number;

  totalRefunds:
    number;

  salesCount:
    number;

  closedBy?:
    string | null;
}