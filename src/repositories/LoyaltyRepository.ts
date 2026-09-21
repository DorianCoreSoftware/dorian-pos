import {
  supabase,
} from '../services/supabase';

import {
  LoyaltyStatus,
  RedeemLoyaltyRewardResult,
  RegisterLoyaltyCustomerResult,
  RegisterLoyaltyVisitResult,
} from '../types/loyalty';

export async function registerLoyaltyCustomer(
  name: string,
  phone: string,
  email?: string | null,
): Promise<RegisterLoyaltyCustomerResult> {
  const {
    data,
    error,
  } = await supabase.rpc(
    'register_loyalty_customer',
    {
      p_name:
        name,

      p_phone:
        phone,

      p_email:
        email ?? null,
    },
  );

  if (error) {
    throw new Error(
      error.message,
    );
  }

  return data as
    RegisterLoyaltyCustomerResult;
}

export async function fetchLoyaltyStatus(
  qrToken: string,
): Promise<LoyaltyStatus> {
  const {
    data,
    error,
  } = await supabase.rpc(
    'get_loyalty_status',
    {
      p_qr_token:
        qrToken,
    },
  );

  if (error) {
    throw new Error(
      error.message,
    );
  }

  return data as
    LoyaltyStatus;
}

export async function registerLoyaltyVisit(
  qrToken: string,
  orderId?: string | null,
): Promise<RegisterLoyaltyVisitResult> {
  const {
    data,
    error,
  } = await supabase.rpc(
    'register_loyalty_visit',
    {
      p_qr_token:
        qrToken,

      p_order_id:
        orderId ?? null,
    },
  );

  if (error) {
    throw new Error(
      error.message,
    );
  }

  return data as
    RegisterLoyaltyVisitResult;
}

export async function redeemLoyaltyReward(
  qrToken: string,
  rewardId: string,
  orderId?: string | null,
): Promise<RedeemLoyaltyRewardResult> {
  const {
    data,
    error,
  } = await supabase.rpc(
    'redeem_loyalty_reward',
    {
      p_qr_token:
        qrToken,

      p_reward_id:
        rewardId,

      p_order_id:
        orderId ?? null,
    },
  );

  if (error) {
    throw new Error(
      error.message,
    );
  }

  return data as
    RedeemLoyaltyRewardResult;
}