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
import { DORIAN_STORAGE_KEYS, LEGACY_STORAGE_KEYS, setMigratedStorageItem, removeMigratedStorageItem, getMigratedStorageItem } from '../Utils/storageMigration';



const INACTIVITY_LIMIT_MS =
  2 * 60 * 60 * 1000;

const CHECK_INTERVAL_MS =
  60 * 1000;

const LAST_ACTIVITY_KEY =
  DORIAN_STORAGE_KEYS.sessionLastActivity;

const ACTIVE_USER_KEY =
  DORIAN_STORAGE_KEYS.sessionActiveUser;

const LEGACY_LAST_ACTIVITY_KEYS = [
  LEGACY_STORAGE_KEYS.sessionLastActivity,
] as const;

const LEGACY_ACTIVE_USER_KEYS = [
  LEGACY_STORAGE_KEYS.sessionActiveUser,
] as const;

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

      setMigratedStorageItem(
        globalThis.localStorage,
        LAST_ACTIVITY_KEY,
        now,
        LEGACY_LAST_ACTIVITY_KEYS,
      );

      setMigratedStorageItem(
        globalThis.localStorage,
        ACTIVE_USER_KEY,
        userId,
        LEGACY_ACTIVE_USER_KEYS,
      );
    }, [
      userId,
    ]);

  const clearActivity =
    useCallback((): void => {
      removeMigratedStorageItem(
        globalThis.localStorage,
        LAST_ACTIVITY_KEY,
        LEGACY_LAST_ACTIVITY_KEYS,
      );

      removeMigratedStorageItem(
        globalThis.localStorage,
        ACTIVE_USER_KEY,
        LEGACY_ACTIVE_USER_KEYS,
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
          getMigratedStorageItem(
            globalThis.localStorage,
            ACTIVE_USER_KEY,
            LEGACY_ACTIVE_USER_KEYS,
          );

        const lastActivityValue =
          getMigratedStorageItem(
            globalThis.localStorage,
            LAST_ACTIVITY_KEY,
            LEGACY_LAST_ACTIVITY_KEYS,
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
      getMigratedStorageItem(
        globalThis.localStorage,
        ACTIVE_USER_KEY,
        LEGACY_ACTIVE_USER_KEYS,
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