import React from 'react';

import {
  Modal,
  Pressable,
  Text,
  View,
} from 'react-native';

import {
  useBusiness,
} from '../../../context/BusinessContext';

import styles from './WebOrderEntryChoiceModal.styles';

interface WebOrderEntryChoiceModalProps {
  visible: boolean;
  onContinueAsGuest: () => void;
  onLogin: () => void;
}

export default function WebOrderEntryChoiceModal({
  visible,
  onContinueAsGuest,
  onLogin,
}: WebOrderEntryChoiceModalProps) {
  const {
    theme,
  } = useBusiness();

  return (
    <Modal
      visible={
        visible
      }
      transparent
      animationType="fade"
      onRequestClose={() => {
        // La elección es intencional: no cerramos el modal
        // hasta que el cliente elija cómo continuar.
      }}
    >
      <View
        style={
          styles.overlay
        }
      >
        <View
          style={[
            styles.card,
            {
              backgroundColor:
                theme.surface,
              borderColor:
                theme.border,
            },
          ]}
        >
          <Text
            style={[
              styles.title,
              {
                color:
                  theme.text,
              },
            ]}
          >
            ¿Cómo quieres comprar?
          </Text>

          <Text
            style={[
              styles.description,
              {
                color:
                  theme.textMuted,
              },
            ]}
          >
            Puedes continuar como invitado o iniciar sesión para conservar tus pedidos en tu cuenta.
          </Text>

          <Pressable
            onPress={
              onLogin
            }
            style={({
              pressed,
            }) => [
              styles.primaryButton,
              {
                backgroundColor:
                  theme.primary,
                opacity:
                  pressed
                    ? 0.85
                    : 1,
              },
            ]}
          >
            <Text
              style={[
                styles.primaryButtonText,
                {
                  color:
                    theme.onPrimary,
                },
              ]}
            >
              Iniciar sesión / Crear cuenta
            </Text>
          </Pressable>

          <Pressable
            onPress={
              onContinueAsGuest
            }
            style={({
              pressed,
            }) => [
              styles.secondaryButton,
              {
                borderColor:
                  theme.border,
                backgroundColor:
                  pressed
                    ? theme.surfaceAlt
                    : theme.surface,
              },
            ]}
          >
            <Text
              style={[
                styles.secondaryButtonText,
                {
                  color:
                    theme.text,
                },
              ]}
            >
              Continuar como invitado
            </Text>
          </Pressable>

          <Text
            style={[
              styles.hint,
              {
                color:
                  theme.textMuted,
              },
            ]}
          >
            Tu carrito se conservará aunque recargues la página o vayas a iniciar sesión.
          </Text>
        </View>
      </View>
    </Modal>
  );
}
