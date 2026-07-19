import {
  RealtimeChannel,
  RealtimePostgresChangesPayload,
} from '@supabase/supabase-js';

import { supabase } from '../services/supabase';

type OrderChangePayload =
  RealtimePostgresChangesPayload<Record<string, unknown>>;

export interface RealtimeSubscription {
  unsubscribe: () => Promise<void>;
}

export function subscribeToOrderChanges(
  onChange: (
    payload: OrderChangePayload,
  ) => void,
  onSubscribed?: () => void,
): RealtimeSubscription {
  const channel: RealtimeChannel =
    supabase
      .channel('orders-live-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'orders',
        },
        onChange,
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'orders',
        },
        onChange,
      )
      .subscribe((status) => {
        if (
          status === 'SUBSCRIBED'
        ) {
          onSubscribed?.();
        }
      });

  return {
    unsubscribe: async () => {
      await supabase.removeChannel(
        channel,
      );
    },
  };
}