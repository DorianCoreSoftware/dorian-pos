import { useBusiness } from '../../context/BusinessContext';

import React, {
  useEffect,
  useMemo,
  useState,
} from 'react';

import {
  Modal,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import {
  PaymentMethod,
} from '../../types';

import {
  calculateChange,
} from '../../services/paymentService';
import {
  styles,
  setBrandPrimaryColor,
} from './PaymentModal.styles';



import { useCurrency } from '../../hooks/useCurrency';

interface PaymentModalProps {
  visible: boolean;

  totalAmount: number;

  isProcessing?: boolean;

  onClose: () => void;

  onConfirm: (
    paymentMethod: PaymentMethod,
    amountReceived: number | null,
  ) => void;
}

export function PaymentModal({
  visible,
  totalAmount,
  isProcessing = false,
  onClose,
  onConfirm,
}: PaymentModalProps) {
  const { theme: businessTheme } = useBusiness();
    setBrandPrimaryColor(businessTheme.primary);

  const {
    formatCurrency,
  } = useCurrency();

  const [
    paymentMethod,
    setPaymentMethod,
  ] = useState<PaymentMethod>(
    'cash',
  );

  const [
    amountReceivedText,
    setAmountReceivedText,
  ] = useState('');

  useEffect(() => {
    if (!visible) {
      return;
    }

    setPaymentMethod('cash');
    setAmountReceivedText(totalAmount === 0 ? '0' : '');
  }, [visible, totalAmount]);

  const amountReceived =
    useMemo(() => {
      if (
        !amountReceivedText.trim()
      ) {
        return null;
      }

      const parsedValue =
        Number(
          amountReceivedText,
        );

      return Number.isFinite(
        parsedValue,
      )
        ? parsedValue
        : null;
    }, [amountReceivedText]);

  const changeAmount =
    useMemo(() => {
      if (
        paymentMethod !== 'cash' ||
        amountReceived === null ||
        amountReceived <
          totalAmount
      ) {
        return null;
      }

      return calculateChange(
        totalAmount,
        amountReceived,
      );
    }, [
      paymentMethod,
      amountReceived,
      totalAmount,
    ]);

  const isCashPaymentValid =
    paymentMethod === 'cash' &&
    amountReceived !== null &&
    amountReceived >= totalAmount;

  const canConfirm =
    !isProcessing &&
    (
      paymentMethod === 'card' ||
      isCashPaymentValid
    );

  const handleAmountChange = (
    value: string,
  ): void => {
    const sanitizedValue =
      value
        .replace(',', '.')
        .replace(
          /[^0-9.]/g,
          '',
        );

    const parts =
      sanitizedValue.split('.');

    if (parts.length > 2) {
      return;
    }

    if (
      parts[1] &&
      parts[1].length > 2
    ) {
      return;
    }

    setAmountReceivedText(
      sanitizedValue,
    );
  };

  const handleConfirm = (): void => {
    if (!canConfirm) {
      return;
    }

    onConfirm(
      paymentMethod,
      paymentMethod === 'cash'
        ? amountReceived
        : null,
    );
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View
          style={styles.container}
        >
          <View style={styles.header}>
            <Text style={styles.title}>
              Cobrar pedido
            </Text>

            <TouchableOpacity
              onPress={onClose}
              disabled={isProcessing}
              style={styles.closeButton}
            >
              <Text
                style={
                  styles.closeButtonText
                }
              >
                ✕
              </Text>
            </TouchableOpacity>
          </View>

          <View
            style={styles.totalSection}
          >
            <Text
              style={styles.totalLabel}
            >
              Total
            </Text>

            <Text
              style={styles.totalAmount}
            >
              {formatCurrency(
                Number(
                  totalAmount,
                ),
              )}
            </Text>
          </View>

          <Text
            style={styles.sectionLabel}
          >
            Método de pago
          </Text>

          <View
            style={
              styles.paymentMethodRow
            }
          >
            <TouchableOpacity
              style={[
                styles.paymentMethodButton,

                paymentMethod ===
                  'cash' &&
                  styles.paymentMethodButtonSelected,
              ]}
              disabled={isProcessing}
              onPress={() =>
                setPaymentMethod(
                  'cash',
                )
              }
            >
              <Text
                style={[
                  styles.paymentMethodText,

                  paymentMethod ===
                    'cash' &&
                    styles.paymentMethodTextSelected,
                ]}
              >
                💵 Efectivo
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.paymentMethodButton,

                paymentMethod ===
                  'card' &&
                  styles.paymentMethodButtonSelected,
              ]}
              disabled={isProcessing}
              onPress={() =>
                setPaymentMethod(
                  'card',
                )
              }
            >
              <Text
                style={[
                  styles.paymentMethodText,

                  paymentMethod ===
                    'card' &&
                    styles.paymentMethodTextSelected,
                ]}
              >
                💳 Tarjeta
              </Text>
            </TouchableOpacity>
          </View>

          {paymentMethod ===
          'cash' ? (
            <View
              style={
                styles.cashSection
              }
            >
              <Text
                style={
                  styles.inputLabel
                }
              >
                Cantidad recibida
              </Text>

              <TextInput
                value={
                  amountReceivedText
                }
                onChangeText={
                  handleAmountChange
                }
                editable={
                  !isProcessing
                }
                keyboardType="decimal-pad"
                placeholder="0.00"
                placeholderTextColor="#777777"
                style={styles.input}
              />

              {amountReceived !==
                null &&
              amountReceived <
                totalAmount ? (
                <Text
                  style={
                    styles.insufficientText
                  }
                >
                  Faltan{' '}
                  {formatCurrency(
                    totalAmount -
                      amountReceived,
                  )}
                </Text>
              ) : null}

              <View
                style={
                  styles.changeSection
                }
              >
                <Text
                  style={
                    styles.changeLabel
                  }
                >
                  Cambio
                </Text>

                <Text
                  style={
                    styles.changeAmount
                  }
                >
                  {formatCurrency(
                    changeAmount ?? 0,
                  )}
                </Text>
              </View>
            </View>
          ) : (
            <View
              style={
                styles.cardMessage
              }
            >
              <Text
                style={
                  styles.cardMessageText
                }
              >
                Confirma que el pago
                con tarjeta haya sido
                aprobado antes de
                continuar.
              </Text>
            </View>
          )}

          <View style={styles.footer}>
            <TouchableOpacity
              style={
                styles.cancelButton
              }
              disabled={isProcessing}
              onPress={onClose}
            >
              <Text
                style={
                  styles.cancelButtonText
                }
              >
                Cancelar
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.confirmButton,

                !canConfirm &&
                  styles.confirmButtonDisabled,
              ]}
              disabled={!canConfirm}
              onPress={
                handleConfirm
              }
            >
              <Text
                style={[
                  styles.confirmButtonText,

                  !canConfirm &&
                    styles.confirmButtonTextDisabled,
                ]}
              >
                {isProcessing
                  ? 'Procesando...'
                  : 'Cobrar'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}