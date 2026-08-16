import {
  useCallback,
  useEffect,
  useState,
} from 'react';

import {
  getActiveProducts,
} from '../services/products';

import {
  getActiveCategories,
} from '../services/categoryService';

import {
  getPendingOrders,
} from '../services/orders';

import {
  getOpenCashSession,
} from '../services/cashSessionService';

import {
  listenToOrderChanges,
} from '../services/realtimeService';

import {
  CashSession,
  Category,
  KitchenOrder,
  Product,
} from '../types';

import {
  UserSession,
} from '../context/AuthContext';

export function useInitialData(
  user: UserSession | null,
) {
  const [
    isLoading,
    setIsLoading,
  ] = useState(true);

  const [
    errorMessage,
    setErrorMessage,
  ] = useState<string | null>(
    null,
  );

  const [
    categories,
    setCategories,
  ] = useState<Category[]>([]);

  const [
    products,
    setProducts,
  ] = useState<Product[]>([]);

  const [
    pendingOrders,
    setPendingOrders,
  ] = useState<KitchenOrder[]>(
    [],
  );

  const [
    cashSession,
    setCashSession,
  ] = useState<CashSession | null>(
    null,
  );

  const fetchCategories =
    useCallback(
      async (): Promise<void> => {
        try {
          const activeCategories =
            await getActiveCategories();

          setCategories(
            activeCategories,
          );
        } catch (error) {
          console.error(
            'Error actualizando categorías:',
            error,
          );
        }
      },
      [],
    );

  const fetchKitchenOrders =
    useCallback(
      async (): Promise<void> => {
        try {
          const orders =
            await getPendingOrders();

          setPendingOrders(
            orders,
          );
        } catch (error) {
          console.error(
            'Error actualizando comandas:',
            error,
          );
        }
      },
      [],
    );

  const fetchProducts =
    useCallback(
      async (): Promise<void> => {
        try {
          const activeProducts =
            await getActiveProducts();

          setProducts(
            activeProducts,
          );
        } catch (error) {
          console.error(
            'Error actualizando productos:',
            error,
          );
        }
      },
      [],
    );

  const fetchCashSession =
    useCallback(
      async (): Promise<void> => {
        try {
          const openSession =
            await getOpenCashSession();

          setCashSession(
            openSession,
          );
        } catch (error) {
          console.error(
            'Error actualizando la caja:',
            error,
          );
        }
      },
      [],
    );

  useEffect(() => {
    if (!user) {
      setCategories([]);
      setProducts([]);
      setPendingOrders([]);
      setCashSession(null);
      setErrorMessage(null);
      setIsLoading(false);

      return;
    }

    let isMounted = true;

    async function loadInitialData():
      Promise<void> {
      try {
        setIsLoading(true);
        setErrorMessage(null);

        const [
          loadedCategories,
          loadedProducts,
          loadedOrders,
          loadedCashSession,
        ] = await Promise.all([
          getActiveCategories(),
          getActiveProducts(),
          getPendingOrders(),
          getOpenCashSession(),
        ]);

        if (!isMounted) {
          return;
        }

        setCategories(
          loadedCategories,
        );

        setProducts(
          loadedProducts,
        );

        setPendingOrders(
          loadedOrders,
        );

        setCashSession(
          loadedCashSession,
        );
      } catch (error) {
        console.error(
          'Error al cargar los datos iniciales:',
          error,
        );

        if (!isMounted) {
          return;
        }

        setErrorMessage(
          error instanceof Error
            ? error.message
            : 'Error al conectar con el servidor en la nube.',
        );
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void loadInitialData();

    return () => {
      isMounted = false;
    };
  }, [user]);

  useEffect(() => {
    if (!user) {
      return;
    }

    const subscription =
      listenToOrderChanges({
        onOrdersChanged: () => {
          void fetchKitchenOrders();
        },

        onConnected: () => {
          console.log(
            '🍳 Cocina conectada en tiempo real',
          );
        },

        debounceMs: 300,
      });

    return () => {
      void subscription.unsubscribe();
    };
  }, [
    user,
    fetchKitchenOrders,
  ]);

  return {
    categories,
    setCategories,

    products,
    setProducts,

    pendingOrders,
    setPendingOrders,

    cashSession,
    setCashSession,

    isLoading,
    errorMessage,

    fetchCategories,
    fetchProducts,
    fetchKitchenOrders,
    fetchCashSession,
  };
}