import {
  useCallback,
  useEffect,
  useRef,
} from 'react';

import {
  AppState,
  AppStateStatus,
} from 'react-native';

import {
  getUserProfile,
} from '../services/authService';

const ACCOUNT_STATUS_CHECK_INTERVAL_MS =
  60 * 1000;

interface UseAccountStatusParams {
  userId: string | null;
  logout: () => Promise<void>;
}

export function useAccountStatus({
  userId,
  logout,
}: UseAccountStatusParams) {
  const isCheckingRef =
    useRef(false);

  const isLoggingOutRef =
    useRef(false);

  const checkAccountStatus =
    useCallback(
      async (): Promise<void> => {
        if (
          !userId ||
          isCheckingRef.current ||
          isLoggingOutRef.current
        ) {
          return;
        }

        try {
          isCheckingRef.current =
            true;

          const profile =
            await getUserProfile(
              userId,
            );

          if (
            profile.isActive
          ) {
            return;
          }

          isLoggingOutRef.current =
            true;

          await logout();
        } catch (error) {
          /*
           * Un error de red no debe cerrar la sesión.
           * Solo cerramos cuando el servidor confirma
           * explícitamente que is_active es false.
           */
          console.error(
            'Error verificando el estado de la cuenta:',
            error,
          );
        } finally {
          isCheckingRef.current =
            false;
        }
      },
      [
        userId,
        logout,
      ],
    );

  useEffect(() => {
    if (!userId) {
      isCheckingRef.current =
        false;

      isLoggingOutRef.current =
        false;

      return;
    }

    void checkAccountStatus();

    const interval =
      setInterval(() => {
        void checkAccountStatus();
      }, ACCOUNT_STATUS_CHECK_INTERVAL_MS);

    const appStateSubscription =
      AppState.addEventListener(
        'change',
        (
          nextState:
            AppStateStatus,
        ) => {
          if (
            nextState ===
            'active'
          ) {
            void checkAccountStatus();
          }
        },
      );

    return () => {
      clearInterval(
        interval,
      );

      appStateSubscription.remove();
    };
  }, [
    userId,
    checkAccountStatus,
  ]);
}
