import {
  RealtimeSubscription,
  subscribeToOrderChanges,
} from '../repositories/RealtimeRepository';

export interface SubscribeToOrdersOptions {
  onOrdersChanged: () => void;
  onConnected?: () => void;
  debounceMs?: number;
}

export function listenToOrderChanges({
  onOrdersChanged,
  onConnected,
  debounceMs = 300,
}: SubscribeToOrdersOptions): RealtimeSubscription {
  let refreshTimeout:
    ReturnType<typeof setTimeout> | null =
    null;

  const scheduleRefresh = (): void => {
    if (refreshTimeout) {
      clearTimeout(refreshTimeout);
    }

    refreshTimeout = setTimeout(() => {
      onOrdersChanged();
    }, debounceMs);
  };

  const subscription =
    subscribeToOrderChanges(
      scheduleRefresh,
      onConnected,
    );

  return {
    unsubscribe: async () => {
      if (refreshTimeout) {
        clearTimeout(refreshTimeout);
      }

      await subscription.unsubscribe();
    },
  };
}