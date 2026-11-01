import React, { useEffect, useState } from 'react';

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
import { BusinessTransferSettings, getPublicBusinessTransferSettings } from '../../../services/paymentAccountService';
import { openWhatsAppSupport } from '../../utils/whatsappSupport';

interface WebOrderSuccessModalProps {
  visible: boolean;

  orderId:
  | string
  | null;

  paymentMethod: 'cash' | 'transfer' | null;

  onClose: () => void;

  onTrackOrder: () => void;
}

export default function WebOrderSuccessModal({
  visible,
  orderId,
  paymentMethod,
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

  const [transferSettings, setTransferSettings] = useState<BusinessTransferSettings | null>(null);

  useEffect(() => {
    if (!visible || paymentMethod !== 'transfer') {
      setTransferSettings(null);
      return;
    }

    void getPublicBusinessTransferSettings()
      .then(setTransferSettings)
      .catch(() => setTransferSettings(null));
  }, [visible, paymentMethod]);

  const businessName =
    business?.identity.businessName ??
    'Dorian POS';

  const shortId =
    orderId
      ? getOrderTrackingCode(
        orderId,
      )
      : '';

  const whatsapp =
    business?.socialLinks.whatsapp
      ?.trim() ??
    '';

  const handleWhatsAppSupport =
    (): void => {
      if (!shortId) {
        return;
      }

      openWhatsAppSupport(
        whatsapp,
        `Hola, tengo una duda sobre mi pedido ${shortId}.`,
      );
    };

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

          {paymentMethod === 'transfer' && transferSettings?.enabled ? (
            <View style={styles.transferBox}>
              <Text style={styles.transferTitle}>DATOS PARA TRANSFERENCIA</Text>
              <Text style={styles.transferText}>Banco: {transferSettings.bankName}</Text>
              <Text style={styles.transferText}>Titular: {transferSettings.accountHolder}</Text>
              <Text style={styles.transferClabe}>CLABE: {transferSettings.clabe}</Text>
              {transferSettings.accountNumber ? <Text style={styles.transferText}>Cuenta: {transferSettings.accountNumber}</Text> : null}
              {transferSettings.instructions ? <Text style={styles.transferHint}>{transferSettings.instructions}</Text> : null}
              <Text style={styles.transferHint}>Tu pedido queda pendiente de verificación hasta que el negocio confirme la transferencia.</Text>
            </View>
          ) : null}

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

          {!!shortId && !!whatsapp ? (
            <Pressable
              onPress={
                handleWhatsAppSupport
              }
              style={({ pressed }) => [
                styles.whatsappButton,
                pressed
                  ? styles.whatsappButtonPressed
                  : null,
              ]}
            >
              <Text
                style={
                  styles.whatsappButtonText
                }
              >
                Contactar por WhatsApp
              </Text>
            </Pressable>
          ) : null}

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