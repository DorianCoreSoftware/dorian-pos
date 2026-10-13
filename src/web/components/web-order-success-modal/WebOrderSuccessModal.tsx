import React from 'react';

import {
  Modal,
  Pressable,
  Text,
  View,
} from 'react-native';

import styles, {
  setBrandPrimaryColor,
} from './WebOrderSuccessModal.styles';
import { useBusiness } from '../../../context/BusinessContext';
import { getOrderTrackingCode } from '../../../Utils/orderTracking';

interface WebOrderSuccessModalProps {
  visible: boolean;

  orderId:
  | string
  | null;

  onClose: () => void;

  onTrackOrder: () => void;
}

export default function WebOrderSuccessModal({
  visible,
  orderId,
  onClose,
  onTrackOrder,
}: WebOrderSuccessModalProps) {
  const {
    business,
    theme,
  } = useBusiness();

  setBrandPrimaryColor(
    theme.primary,
  );

  const businessName =
    business?.identity.businessName ??
    'Dorian POS';

  const shortId =
    orderId
      ? getOrderTrackingCode(
        orderId,
      )
      : '';

  return (
    <Modal
      transparent
      visible={
        visible
      }
      animationType="fade"
      onRequestClose={
        onClose
      }
    >
      <View
        style={
          styles.backdrop
        }
      >
        <View
          style={
            styles.card
          }
        >
          <View
            style={
              styles.iconCircle
            }
          >
            <Text
              style={
                styles.icon
              }
            >
              ✓
            </Text>
          </View>

          <Text
            style={
              styles.title
            }
          >
            ¡Pedido recibido!
          </Text>

          <Text
            style={
              styles.message
            }
          >
            Tu pedido ya fue enviado a {businessName}.
          </Text>

          {!!shortId && (
            <View
              style={
                styles.orderBox
              }
            >
              <Text
                style={
                  styles.orderLabel
                }
              >
                Pedido
              </Text>

              <Text
                style={
                  styles.orderId
                }
              >
                #{shortId}
              </Text>
            </View>
          )}

          <Text
            style={
              styles.hint
            }
          >
            Guarda este número para consultar el estado de tu pedido.
          </Text>

          {!!shortId && (
            <Pressable
              onPress={
                onTrackOrder
              }
              style={({ pressed }) => [
                styles.button,
                pressed &&
                styles.buttonPressed,
              ]}
            >
              <Text
                style={
                  styles.buttonText
                }
              >
                Ver estado de mi pedido
              </Text>
            </Pressable>
          )}

          <Pressable
            onPress={
              onClose
            }
            style={({ pressed }) => ({
              width: '100%',
              marginTop: 10,
              minHeight: 46,
              borderRadius: 10,
              borderWidth: 1,
              borderColor: theme.primary,
              alignItems: 'center',
              justifyContent: 'center',
              paddingHorizontal: 16,
              opacity:
                pressed
                  ? 0.75
                  : 1,
            })}
          >
            <Text
              style={{
                color: theme.primary,
                fontWeight: '900',
                fontSize: 15,
              }}
            >
              Volver al menú
            </Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}