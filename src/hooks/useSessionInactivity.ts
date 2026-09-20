import 'expo-sqlite/localStorage/install';

import {
  useCallback,
  useEffect,
  useRef,
} from 'react';

import {
  AppState,
  AppStateStatus,
} from 'react-native';

const INACTIVITY_LIMIT_MS =
  2 * 60 * 60 * 1000;

const CHECK_INTERVAL_MS =
  60 * 1000;

const LAST_ACTIVITY_KEY =
  'burger-kong-last-activity';

const ACTIVE_USER_KEY =
  'burger-kong-active-user';

interface UseSessionInactivityParams {
  userId: string | null;
  logout: () => Promise<void>;
}

export function useSessionInactivity({
  userId,
  logout,
}: UseSessionInactivityParams) {
  const isLoggingOutRef =
    useRef(false);

  const registerActivity =
    useCallback((): void => {
      if (!userId) {
        return;
      }

      const now =
        Date.now().toString();

      globalThis.localStorage.setItem(
        LAST_ACTIVITY_KEY,
        now,
      );

      globalThis.localStorage.setItem(
        ACTIVE_USER_KEY,
        userId,
      );
    }, [
      userId,
    ]);

  const clearActivity =
    useCallback((): void => {
      globalThis.localStorage.removeItem(
        LAST_ACTIVITY_KEY,
      );

      globalThis.localStorage.removeItem(
        ACTIVE_USER_KEY,
      );
    }, []);

  const checkInactivity =
    useCallback(
      async (): Promise<void> => {
        if (
          !userId ||
          isLoggingOutRef.current
        ) {
          return;
        }

        const storedUserId =
          globalThis.localStorage.getItem(
            ACTIVE_USER_KEY,
          );

        const lastActivityValue =
          globalThis.localStorage.getItem(
            LAST_ACTIVITY_KEY,
          );

        if (
          storedUserId !==
            userId ||
          !lastActivityValue
        ) {
          registerActivity();
          return;
        }

        const lastActivity =
          Number(
            lastActivityValue,
          );

        if (
          !Number.isFinite(
            lastActivity,
          )
        ) {
          registerActivity();
          return;
        }

        const elapsed =
          Date.now() -
          lastActivity;

        if (
          elapsed <
          INACTIVITY_LIMIT_MS
        ) {
          return;
        }

        try {
          isLoggingOutRef.current =
            true;

          clearActivity();

          await logout();
        } catch (error) {
          console.error(
            'Error cerrando sesión por inactividad:',
            error,
          );

          isLoggingOutRef.current =
            false;
        }
      },
      [
        userId,
        logout,
        registerActivity,
        clearActivity,
      ],
    );

  useEffect(() => {
    if (!userId) {
      isLoggingOutRef.current =
        false;

      clearActivity();

      return;
    }

    const storedUserId =
      globalThis.localStorage.getItem(
        ACTIVE_USER_KEY,
      );

    if (
      storedUserId !==
      userId
    ) {
      registerActivity();
    }

    void checkInactivity();

    const interval =
      setInterval(() => {
        void checkInactivity();
      }, CHECK_INTERVAL_MS);

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
            void checkInactivity();
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
    checkInactivity,
    registerActivity,
    clearActivity,
  ]);

  return {
    registerActivity,
  };
}