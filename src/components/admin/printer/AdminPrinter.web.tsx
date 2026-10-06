import React from 'react';

import {
  Text,
  View,
} from 'react-native';

import {
  useBusiness,
} from '../../../context/BusinessContext';

import {
  styles,
} from './AdminPrinter.styles';

export function AdminPrinter() {
  const {
    theme,
  } = useBusiness();

  return (
    <View
      style={
        styles.container
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
          Impresora de tickets
        </Text>

        <Text
          style={[
            styles.subtitle,
            {
              color:
                theme.textMuted,
            },
          ]}
        >
          La conexión Bluetooth y la impresión de prueba se administran desde la app Android de Dorian POS.
        </Text>

        <Text
          style={[
            styles.subtitle,
            {
              color:
                theme.textMuted,
              marginTop: 12,
            },
          ]}
        >
          El panel web puede consultar y administrar el negocio, pero el hardware local permanece vinculado al dispositivo del punto de venta.
        </Text>
      </View>
    </View>
  );
}
