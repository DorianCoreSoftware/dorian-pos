import React from 'react';

import {
  Modal,
  Pressable,
  Text,
  View,
} from 'react-native';

import styles from './WebOrderSuccessModal.styles';
import { getOrderTrackingCode } from '../../Utils/orderTracking';

interface WebOrderSuccessModalProps {
  visible: boolean;
  orderId: string | null;
  onClose: () => void;
}

export default function WebOrderSuccessModal({
  visible,
  orderId,
  onClose,
}: WebOrderSuccessModalProps) {
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
            Tu pedido ya fue enviado a Burger Kong.
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
            Guarda este número por si necesitas identificar tu pedido.
          </Text>

          <Pressable
            onPress={
              onClose
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
              Volver al menú
            </Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}
