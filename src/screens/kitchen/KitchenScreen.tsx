import React from 'react';
import {
  Alert,
  FlatList,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import {
  cancelOrder,
  deliverOrder,
} from '../../services/orderService';

import {
  Cart,
  CartItem,
  KitchenOrder,
  KitchenOrderItem,
  Product,
} from '../../types';

import { styles } from '../../../App.styles';

interface KitchenProps {
  pendingOrders: KitchenOrder[];

  setPendingOrders: React.Dispatch<
    React.SetStateAction<KitchenOrder[]>
  >;

  editingOrderId: string | null;

  setEditingOrderId: React.Dispatch<
    React.SetStateAction<string | null>
  >;

  setCart: React.Dispatch<
    React.SetStateAction<Cart>
  >;

  setActiveTab: (
    tab: 'pos' | 'kitchen',
  ) => void;
}

export function KitchenScreen({
  pendingOrders,
  setPendingOrders,
  editingOrderId,
  setEditingOrderId,
  setCart,
  setActiveTab,
}: KitchenProps) {
  const handleDeliverOrder = async (
    orderId: string,
  ): Promise<void> => {
    try {
      await deliverOrder(orderId);

      removeOrderFromPendingList(orderId);

      if (editingOrderId === orderId) {
        clearEditingOrder();
      }
    } catch (error) {
      console.error(
        'Error al entregar la orden:',
        error,
      );

      Alert.alert(
        'Error',
        error instanceof Error
          ? error.message
          : 'No se pudo entregar la orden.',
      );
    }
  };

  const handleCancelOrderPrompt = (
    orderId: string,
  ): void => {
    const shortId = orderId
      .slice(-6)
      .toUpperCase();

    Alert.alert(
      '🚨 Cancelar pedido',
      `¿Seguro que deseas cancelar la orden #${shortId}?`,
      [
        {
          text: 'No',
          style: 'cancel',
        },
        {
          text: 'Sí, cancelar',
          style: 'destructive',
          onPress: () => {
            void executeCancelOrder(orderId);
          },
        },
      ],
    );
  };

  const executeCancelOrder = async (
    orderId: string,
  ): Promise<void> => {
    try {
      await cancelOrder(orderId);

      removeOrderFromPendingList(orderId);

      if (editingOrderId === orderId) {
        clearEditingOrder();
      }
    } catch (error) {
      console.error(
        'Error al cancelar la orden:',
        error,
      );

      Alert.alert(
        '❌ Error',
        error instanceof Error
          ? error.message
          : 'No se pudo cancelar el pedido.',
      );
    }
  };

  const handleEditOrder = (
    order: KitchenOrder,
  ): void => {
    const groupedItems: Record<
      string,
      CartItem
    > = {};

    order.order_items.forEach((line) => {
      const cleanNotes = (
        line.notes ?? ''
      ).trim();

      const modifiers = line.modifiers ?? [];

      const modifierIdentifier = modifiers
        .map((modifier) => modifier.name)
        .sort()
        .join(',');

      const uniqueItemId = [
        line.product_id,
        cleanNotes,
        modifierIdentifier,
      ].join('-');

      const existingItem =
        groupedItems[uniqueItemId];

      if (existingItem) {
        existingItem.quantity += line.quantity;
        return;
      }

      groupedItems[uniqueItemId] = {
        id: uniqueItemId,
        product: createProductFromOrderItem(line),
        quantity: line.quantity,
        notes: cleanNotes,
        selectedModifiers: modifiers,
      };
    });

    setCart(Object.values(groupedItems));
    setEditingOrderId(order.id);
    setActiveTab('pos');
  };

  const removeOrderFromPendingList = (
    orderId: string,
  ): void => {
    setPendingOrders((currentOrders) =>
      currentOrders.filter(
        (order) => order.id !== orderId,
      ),
    );
  };

  const clearEditingOrder = (): void => {
    setCart([]);
    setEditingOrderId(null);
  };

  const renderOrderItem = (
    line: KitchenOrderItem,
  ) => (
    <View
      key={line.id}
      style={styles.itemRow}
    >
      <Text style={styles.itemText}>
        {line.quantity}x{' '}
        {line.products?.name ?? 'Producto'}
      </Text>

      {line.modifiers.length > 0 && (
        <View
          style={{
            paddingLeft: 12,
            marginVertical: 4,
          }}
        >
          {line.modifiers.map((modifier) => (
            <Text
              key={modifier.id}
              style={{
                color: '#FFBF00',
                fontSize: 13,
                fontWeight: '600',
              }}
            >
              • {modifier.name}
              {modifier.group_name
                ? ` (${modifier.group_name})`
                : ''}
            </Text>
          ))}
        </View>
      )}

      {line.notes ? (
        <Text style={styles.notesText}>
          ⚠️ {line.notes}
        </Text>
      ) : null}
    </View>
  );

  const renderOrder = ({
    item,
  }: {
    item: KitchenOrder;
  }) => (
    <View style={styles.orderCard}>
      <View style={{ flex: 1 }}>
        <View style={styles.cardHeader}>
          <Text style={styles.orderId}>
            Ticket #
            {item.id
              .slice(-4)
              .toUpperCase()}
          </Text>

          <Text style={styles.orderTotal}>
            ${Number(item.total).toFixed(2)}
          </Text>
        </View>

        <Text style={styles.timeText}>
          Ingresó:{' '}
          {new Date(
            item.created_at,
          ).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
          })}
        </Text>

        <View style={styles.itemsContainer}>
          {item.order_items.map(
            renderOrderItem,
          )}
        </View>
      </View>

      <View style={styles.actionBlock}>
        <View style={styles.actionButtonsRow}>
          <TouchableOpacity
            style={styles.editOrderButton}
            onPress={() =>
              handleEditOrder(item)
            }
          >
            <Text
              style={
                styles.editOrderButtonText
              }
            >
              Editar
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.deliverButton}
            onPress={() => {
              void handleDeliverOrder(
                item.id,
              );
            }}
          >
            <Text
              style={
                styles.deliverButtonText
              }
            >
              Entregar
            </Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={styles.cancelOrderButton}
          onPress={() =>
            handleCancelOrderPrompt(
              item.id,
            )
          }
        >
          <Text
            style={
              styles.cancelOrderButtonText
            }
          >
            ❌ Cancelar pedido
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  if (pendingOrders.length === 0) {
    return (
      <View style={styles.emptyKitchen}>
        <Text
          style={styles.emptyKitchenText}
        >
          🎉 ¡No hay órdenes pendientes!
          Todo despachado.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.kitchenContainer}>
      <FlatList
        data={pendingOrders}
        keyExtractor={(item) => item.id}
        horizontal
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingVertical: 20,
        }}
        renderItem={renderOrder}
      />
    </View>
  );
}

function createProductFromOrderItem(
  line: KitchenOrderItem,
): Product {
  if (line.products) {
    return {
      ...line.products,
      price: Number(
        line.price_at_purchase ??
          line.products.price,
      ),
    };
  }

  return {
    id: line.product_id,
    name: 'Producto',
    price: Number(
      line.price_at_purchase,
    ),
    category_id: '',
    description: null,
    is_active: true,
    created_at: '',
    image_url: null,
    is_available: true,
  };
}