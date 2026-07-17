// src/hooks/useInitialData.ts
import { useState, useEffect } from 'react';
import { getCategories, getActiveProducts } from '../services/products';
import { getPendingOrders } from '../services/orders';
import { supabase } from '../services/supabase';
import { Product, Category } from '../types';

export const useInitialData = (user: any) => {
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Estados de datos de la base de datos
  const [categorias, setCategorias] = useState<Category[]>([]);
  const [productos, setProductos] = useState<Product[]>([]);
  const [pendingOrders, setPendingOrders] = useState<any[]>([]);

  // Función para jalar las órdenes de la BD asegurando que solo queden las 'pending'
  const fetchKitchenOrders = async () => {
    try {
      const ordersData = await getPendingOrders();

      // 1. Filtro de seguridad: Solo las que sigan pendientes
      const onlyPending = (ordersData || []).filter((order: any) => order.status === 'pending');

      // 2. ELIMINAR DUPLICADOS DE RAÍZ: Evita que ráfagas de Realtime dupliquen la tarjeta
      const uniqueOrdersMap = new Map();
      onlyPending.forEach((order: any) => {
        if (!uniqueOrdersMap.has(order.id)) {
          uniqueOrdersMap.set(order.id, order);
        }
      });

      setPendingOrders(Array.from(uniqueOrdersMap.values()));
    } catch (error) {
      console.error("Error actualizando comandas:", error);
    }
  };

  // Función para recargar productos de forma independiente si se requiere
  const fetchProducts = async () => {
    const { data, error } = await supabase.from('products').select('*');
    if (data) setProductos(data);
  };

  // 1. Carga inicial de datos desde Supabase
  useEffect(() => {
    async function loadMenuFromCloud() {
      try {
        setIsLoading(true);
        setErrorMsg(null);

        const [catsResult, prodsResult] = await Promise.all([
          getCategories(),
          getActiveProducts()
        ]);

        setCategorias(catsResult);
        setProductos(prodsResult);

        // Cargamos comandas iniciales
        await fetchKitchenOrders();

      } catch (error: any) {
        console.error("Error al conectar con Supabase:", error);
        setErrorMsg(error?.message || "Error al conectar con el servidor en la nube");
      } finally {
        setIsLoading(false);
      }
    }

    if (user) {
      loadMenuFromCloud();
    }
  }, [user]);

  // 2. Suscripción en Tiempo Real para Cocina (Realtime)
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('orders-live-changes')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'orders' },
        () => {
          setTimeout(() => {
            fetchKitchenOrders();
          }, 300);
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'orders' },
        () => {
          setTimeout(() => {
            fetchKitchenOrders();
          }, 400);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  // Retornamos exactamente lo que MainApp espera desestructurar
  return {
    categorias,
    productos,
    setProductos,
    pendingOrders,
    setPendingOrders,
    isLoading,
    errorMsg,
    fetchProducts,
    fetchKitchenOrders
  };
};