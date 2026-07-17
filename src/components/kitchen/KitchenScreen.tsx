import React, { useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, Alert } from 'react-native';
import { supabase } from '../../services/supabase';
import { Product } from '../../types';
import { CartItem } from '../../types/cart-item';
import { styles } from '../../../App.styles';

interface KitchenProps {
  pendingOrders: any[];
  setPendingOrders: React.Dispatch<React.SetStateAction<any[]>>;
  editingOrderId: string | null;
  setEditingOrderId: (id: string | null) => void;
  setCart: (cart: CartItem[]) => void;
  setActiveTab: (tab: 'pos' | 'kitchen') => void;
  fetchKitchenOrders: () => Promise<void>;
}

export function KitchenScreen({
  pendingOrders,
  setPendingOrders,
  editingOrderId,
  setEditingOrderId,
  setCart,
  setActiveTab,
  fetchKitchenOrders
}: KitchenProps) {

  // Suscripción en Tiempo Real exclusiva de la cocina
  useEffect(() => {
    const channel = supabase
      .channel('orders-live-changes')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'orders' }, () => {
        setTimeout(() => { fetchKitchenOrders(); }, 300);
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'orders' }, () => {
        setTimeout(() => { fetchKitchenOrders(); }, 400);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const handleDeliverOrder = async (orderId: string) => {
    try {
      const { data, error } = await supabase
        .from('orders')
        .update({ status: 'entregado' })
        .eq('id', orderId)
        .select();

      if (error) throw error;
      setPendingOrders((prev) => prev.filter(order => order.id !== orderId));
    } catch (error) {
      Alert.alert('Error', 'No se pudo entregar la orden.');
    }
  };

  const handleCancelOrderPrompt = (orderId: string) => {
    const shortId = orderId.slice(-6).toUpperCase();
    Alert.alert('🚨 Cancelar Pedido', `¿Seguro que deseas cancelar la orden #${shortId}?`, [
      { text: 'No', style: 'cancel' },
      { text: 'Sí, Cancelar', style: 'destructive', onPress: () => executeCancelOrder(orderId) }
    ]);
  };

  const executeCancelOrder = async (orderId: string) => {
    try {
      await supabase.from('orders').update({ status: 'cancelado' }).eq('id', orderId);
      setPendingOrders((prev) => prev.filter(order => order.id !== orderId));
      if (editingOrderId === orderId) {
        setCart([]);
        setEditingOrderId(null);
      }
    } catch (error) {
      Alert.alert('❌ Error', 'No se pudo cancelar el pedido.');
    }
  };

  const handleEditOrder = (order: any) => {
    // Toda tu lógica de agrupado de items al editar se pasa limpia aquí
    const itemsAgrupados: { [key: string]: CartItem } = {};
    order.order_items.forEach((line: any) => {
      const notasLimpias = (line.notes || '').trim();
      const uniqueItemId = `${line.product_id}-${notasLimpias}`;

      if (itemsAgrupados[uniqueItemId]) {
        itemsAgrupados[uniqueItemId].quantity += line.quantity;
      } else {
        const prodBase: Product = {
          id: line.product_id,
          name: line.products?.name || 'Producto',
          price: line.price_at_purchase || line.products?.price || 0,
          category_id: line.products?.category_id || '',
          description: line.products?.description || null,
          is_active: line.products?.is_active ?? true,
          created_at: line.products?.created_at || '',
          image_url: line.products?.image_url || null,
          is_available: line.products?.is_available ?? true,
        };

        itemsAgrupados[uniqueItemId] = {
          id: uniqueItemId,
          product: prodBase,
          quantity: line.quantity,
          notes: notasLimpias,
        };
      }
    });

    setCart(Object.values(itemsAgrupados));
    setEditingOrderId(order.id);
    setActiveTab('pos');
  };

  if (pendingOrders.length === 0) {
    return (
      <View style={styles.emptyKitchen}>
        <Text style={styles.emptyKitchenText}>🎉 ¡No hay órdenes pendientes! Todo despachado.</Text>
      </View>
    );
  }

  return (
    <View style={styles.kitchenContainer}>
      <FlatList
        data={pendingOrders}
        keyExtractor={(item) => item.id}
        horizontal
        contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 20 }}
        renderItem={({ item }) => (
          <View style={styles.orderCard}>
            <View style={{ flex: 1 }}>
              <View style={styles.cardHeader}>
                <Text style={styles.orderId}>Ticket #{item.id.slice(-4).toUpperCase()}</Text>
                <Text style={styles.orderTotal}>${item.total}</Text>
              </View>
              
              <Text style={styles.timeText}>
                Ingresó: {new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </Text>

              <View style={styles.itemsContainer}>
                {item.order_items?.map((line: any, index: number) => (
                  <View key={index} style={styles.itemRow}>
                    <Text style={styles.itemText}>{line.quantity}x {line.products?.name}</Text>
                    {line.notes && <Text style={styles.notesText}>⚠️ {line.notes}</Text>}
                  </View>
                ))}
              </View>
            </View>

            <View style={styles.actionBlock}>
              <View style={styles.actionButtonsRow}>
                <TouchableOpacity style={styles.editOrderButton} onPress={() => handleEditOrder(item)}>
                  <Text style={styles.editOrderButtonText}>Editar</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.deliverButton} onPress={() => handleDeliverOrder(item.id)}>
                  <Text style={styles.deliverButtonText}>Entregar</Text>
                </TouchableOpacity>
              </View>
              <TouchableOpacity style={styles.cancelOrderButton} onPress={() => handleCancelOrderPrompt(item.id)}>
                <Text style={styles.cancelOrderButtonText}>❌ Cancelar Pedido</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      />
    </View>
  );
}