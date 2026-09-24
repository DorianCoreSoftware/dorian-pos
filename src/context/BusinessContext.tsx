import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

import {
  BusinessSettings,
  getBusinessSettings,
} from '../services/businessHoursService';
import { BusinessTheme, createBusinessTheme } from '../theme/businessTheme';

interface BusinessContextValue {
  theme: BusinessTheme;
  business: BusinessSettings | null;
  isLoading: boolean;
  error: string | null;
  refreshBusiness: () => Promise<void>;
}

interface BusinessProviderProps {
  children: ReactNode;
}

const BusinessContext =
  createContext<BusinessContextValue | null>(
    null,
  );

export function BusinessProvider({
  children,
}: BusinessProviderProps) {

  const [
    business,
    setBusiness,
  ] =
    useState<BusinessSettings | null>(
      null,
    );

  const [
    isLoading,
    setIsLoading,
  ] =
    useState(
      true,
    );

  const [
    error,
    setError,
  ] =
    useState<string | null>(
      null,
    );

  const refreshBusiness =
    useCallback(
      async (): Promise<void> => {
        try {
          setIsLoading(
            true,
          );

          setError(
            null,
          );

          const settings =
            await getBusinessSettings();

          setBusiness(
            settings,
          );
        } catch (refreshError) {
          console.error(
            'Error al cargar la configuración del negocio:',
            refreshError,
          );

          setError(
            refreshError instanceof Error
              ? refreshError.message
              : 'No se pudo cargar la configuración del negocio.',
          );
        } finally {
          setIsLoading(
            false,
          );
        }
      },
      [],
    );

  useEffect(
    () => {
      void refreshBusiness();
    },
    [
      refreshBusiness,
    ],
  );

  const theme =
    useMemo(
      () =>
        createBusinessTheme(
          business?.identity,
        ),
      [
        business?.identity,
      ],
    );

  const value =
    useMemo<BusinessContextValue>(
      () => ({
        business,
        theme,
        isLoading,
        error,
        refreshBusiness,
      }),
      [
        business,
        theme,
        isLoading,
        error,
        refreshBusiness,
      ],
    );

  return (
    <BusinessContext.Provider
      value={value}
    >
      {children}
    </BusinessContext.Provider>
  );
}

export function useBusiness():
  BusinessContextValue {
  const context =
    useContext(
      BusinessContext,
    );

  if (!context) {
    throw new Error(
      'useBusiness debe utilizarse dentro de BusinessProvider.',
    );
  }

  return context;
}