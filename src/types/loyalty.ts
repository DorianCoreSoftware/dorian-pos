export type LoyaltyRewardStatus =
  | 'locked'
  | 'available'
  | 'redeemed';

export interface LoyaltyReward {
  id: string;
  name: string;
  description: string | null;
  productId: string | null;
  requiredVisits: number;
  status: LoyaltyRewardStatus;
  visitsRemaining: number;
  redeemedAt: string | null;
}

export interface LoyaltyCustomerSummary {
  id: string;
  name: string;
  qrToken: string;
  totalVisits: number;
}

export interface LoyaltyStatus {
  customer:
    LoyaltyCustomerSummary;

  rewards:
    LoyaltyReward[];
}

export interface RegisterLoyaltyVisitResult {
  visitId: string;
  customerId: string;
  customerName: string;
  totalVisits: number;
}

export interface RedeemLoyaltyRewardResult {
  redemptionId: string;
  customerId: string;
  rewardId: string;
  rewardName: string;
  productId: string;
  orderId: string;
  orderItemId: string;
  status: 'redeemed';
}

export interface RegisterLoyaltyCustomerResult {
  id: string;
  name: string;
  qrToken: string;
  totalVisits: number;
}