import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { useBusiness } from '../../context/BusinessContext';
import { useCurrency } from '../../hooks/useCurrency';
import { getPendingOrders } from '../../services/orderService';
import { KitchenOrder } from '../../types';

interface RewardOrderLinkModalProps {
  visible: boolean;
  rewardName: string;
  isProcessing?: boolean;
  onClose: () => void;
  onSelect: (orderId: string | null) => void;
}

export function RewardOrderLinkModal({
  visible,
  rewardName,
  isProcessing = false,
  onClose,
  onSelect,
}: RewardOrderLinkModalProps) {
  const { theme } = useBusiness();
  const { formatCurrency } = useCurrency();
  const [orders, setOrders] = useState<KitchenOrder[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) return;

    let mounted = true;

    void (async () => {
      try {
        setIsLoading(true);
        setErrorMessage(null);
        const result = await getPendingOrders();

        if (mounted) {
          setOrders(
            result.filter(order =>
              ['pending', 'preparing', 'ready'].includes(order.status),
            ),
          );
        }
      } catch (error) {
        if (mounted) {
          setErrorMessage(
            error instanceof Error
              ? error.message
              : 'No se pudieron consultar las órdenes activas.',
          );
        }
      } finally {
        if (mounted) setIsLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [visible]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View
        style={{
          flex: 1,
          backgroundColor: 'rgba(0,0,0,0.7)',
          justifyContent: 'center',
          padding: 18,
        }}
      >
        <View
          style={{
            width: '100%',
            maxWidth: 560,
            maxHeight: '82%',
            alignSelf: 'center',
            backgroundColor: theme.surface,
            borderRadius: 16,
            borderWidth: 1,
            borderColor: theme.border,
            overflow: 'hidden',
          }}
        >
          <View
            style={{
              padding: 16,
              borderBottomWidth: 1,
              borderBottomColor: theme.border,
            }}
          >
            <Text style={{ color: theme.text, fontSize: 20, fontWeight: '800' }}>
              Vincular premio a una orden
            </Text>
            <Text style={{ color: theme.textMuted, marginTop: 6 }}>{rewardName}</Text>
          </View>

          <ScrollView contentContainerStyle={{ padding: 16, gap: 10 }}>
            <TouchableOpacity
              disabled={isProcessing}
              onPress={() => onSelect(null)}
              style={{
                padding: 14,
                borderRadius: 10,
                borderWidth: 1,
                borderColor: theme.primary,
                backgroundColor: theme.surfaceAlt,
              }}
            >
              <Text style={{ color: theme.primary, fontWeight: '800' }}>
                Canje independiente
              </Text>
              <Text style={{ color: theme.textMuted, marginTop: 4 }}>
                Se creará una orden nueva de $0 y aparecerá en Cocina.
              </Text>
            </TouchableOpacity>

            {isLoading ? (
              <ActivityIndicator color={theme.primary} style={{ marginVertical: 18 }} />
            ) : null}

            {errorMessage ? <Text style={{ color: theme.danger }}>{errorMessage}</Text> : null}

            {!isLoading && !errorMessage && orders.length === 0 ? (
              <Text style={{ color: theme.textMuted }}>No hay órdenes activas para vincular.</Text>
            ) : null}

            {orders.map(order => (
              <TouchableOpacity
                key={order.id}
                disabled={isProcessing}
                onPress={() => onSelect(order.id)}
                style={{
                  padding: 14,
                  borderRadius: 10,
                  borderWidth: 1,
                  borderColor: theme.border,
                  backgroundColor: theme.surfaceAlt,
                }}
              >
                <Text style={{ color: theme.text, fontWeight: '800' }}>
                  Orden #{order.id.slice(0, 8).toUpperCase()}
                </Text>
                <Text style={{ color: theme.textMuted, marginTop: 4 }}>
                  {order.customerName?.trim() || 'Cliente sin nombre'} · {formatCurrency(Number(order.total))}
                </Text>
                <Text style={{ color: theme.textMuted, marginTop: 2 }}>
                  {order.order_items.length} producto{order.order_items.length === 1 ? '' : 's'} · {order.status}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <View style={{ padding: 12, borderTopWidth: 1, borderTopColor: theme.border }}>
            <TouchableOpacity
              disabled={isProcessing}
              onPress={onClose}
              style={{ minHeight: 44, alignItems: 'center', justifyContent: 'center' }}
            >
              <Text style={{ color: theme.primary, fontWeight: '800' }}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}
