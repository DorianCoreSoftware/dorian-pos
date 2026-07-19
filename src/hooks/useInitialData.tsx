import {
  useCallback,
  useEffect,
  useState,
} from 'react';

import {
  getActiveProducts,
  getCategories,
} from '../services/products';

import {
  getPendingOrders,
} from '../services/orders';

import { supabase } from '../services/supabase';

import {
  Category,
  KitchenOrder,
  Product,
} from '../types';

import { UserSession } from '../context/AuthContext';

export function useInitialData(
  user: UserSession | null,
) {
  const [isLoading, setIsLoading] =
    useState(true);

  const [
    errorMessage,
    setErrorMessage,
  ] = useState<string | null>(null);

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
  ] = useState<KitchenOrder[]>([]);

  const fetchKitchenOrders =
    useCallback(async (): Promise<void> => {
      try {
        const orders =
          await getPendingOrders();

        setPendingOrders(orders);
      } catch (error) {
        console.error(
          'Error actualizando comandas:',
          error,
        );
      }
    }, []);

  const fetchProducts =
    useCallback(async (): Promise<void> => {
      try {
        const activeProducts =
          await getActiveProducts();

        setProducts(activeProducts);
      } catch (error) {
        console.error(
          'Error actualizando productos:',
          error,
        );
      }
    }, []);

  useEffect(() => {
    if (!user) {
      setCategories([]);
      setProducts([]);
      setPendingOrders([]);
      setErrorMessage(null);
      setIsLoading(false);
      return;
    }

    let isMounted = true;

    async function loadInitialData(): Promise<void> {
      try {
        setIsLoading(true);
        setErrorMessage(null);

        const [
          loadedCategories,
          loadedProducts,
          loadedOrders,
        ] = await Promise.all([
          getCategories(),
          getActiveProducts(),
          getPendingOrders(),
        ]);

        if (!isMounted) {
          return;
        }

        setCategories(loadedCategories);
        setProducts(loadedProducts);
        setPendingOrders(loadedOrders);
      } catch (error) {
        console.error(
          'Error al conectar con Supabase:',
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

    let refreshTimeout:
      ReturnType<typeof setTimeout> | null =
      null;

    const scheduleOrdersRefresh = (): void => {
      if (refreshTimeout) {
        clearTimeout(refreshTimeout);
      }

      refreshTimeout = setTimeout(() => {
        void fetchKitchenOrders();
      }, 300);
    };

    const ordersChannel = supabase
      .channel('orders-live-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'orders',
        },
        scheduleOrdersRefresh,
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'orders',
        },
        scheduleOrdersRefresh,
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log(
            '🍳 Cocina conectada en tiempo real',
          );
        }
      });

    return () => {
      if (refreshTimeout) {
        clearTimeout(refreshTimeout);
      }

      void supabase.removeChannel(
        ordersChannel,
      );
    };
  }, [
    user,
    fetchKitchenOrders,
  ]);

  return {
    categories,
    products,
    setProducts,
    pendingOrders,
    setPendingOrders,
    isLoading,
    errorMessage,
    fetchProducts,
    fetchKitchenOrders,
  };
}