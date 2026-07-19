import {
  useCallback,
  useEffect,
  useState,
} from 'react';

import {
  getAvailableModifiers,
  GroupedModifiers,
} from '../services/modifierService';

const EMPTY_MODIFIERS: GroupedModifiers = {
  meats: [],
  sauces: [],
};

export function useModifiers() {
  const [modifiers, setModifiers] =
    useState<GroupedModifiers>(
      EMPTY_MODIFIERS,
    );

  const [isLoading, setIsLoading] =
    useState(true);

  const [error, setError] =
    useState<string | null>(null);

  const fetchModifiers =
    useCallback(async (): Promise<void> => {
      try {
        setIsLoading(true);
        setError(null);

        const availableModifiers =
          await getAvailableModifiers();

        setModifiers(availableModifiers);
      } catch (requestError) {
        console.error(
          'Error cargando modificadores:',
          requestError,
        );

        setError(
          requestError instanceof Error
            ? requestError.message
            : 'No se pudieron cargar los modificadores.',
        );
      } finally {
        setIsLoading(false);
      }
    }, []);

  useEffect(() => {
    void fetchModifiers();
  }, [fetchModifiers]);

  return {
    meats: modifiers.meats,
    sauces: modifiers.sauces,
    isLoading,
    error,
    fetchModifiers,
  };
}