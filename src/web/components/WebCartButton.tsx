import React from 'react';

import {
  Pressable,
  Text,
  View,
} from 'react-native';

import styles from './WebCartButton.styles';

interface WebCartButtonProps {
  totalItems: number;
  total: number;
  onPress: () => void;
}

function formatPrice(
  value: number,
): string {
  return new Intl.NumberFormat(
    'es-MX',
    {
      style: 'currency',
      currency: 'MXN',
    },
  ).format(value);
}

export default function WebCartButton({
  totalItems,
  total,
  onPress,
}: WebCartButtonProps) {
  if (
    totalItems <= 0
  ) {
    return null;
  }

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        pressed &&
          styles.buttonPressed,
      ]}
    >
      <View>
        <Text style={styles.title}>
          Ver carrito
        </Text>

        <Text style={styles.subtitle}>
          {totalItems}{' '}
          {totalItems === 1
            ? 'producto'
            : 'productos'}
        </Text>
      </View>

      <Text style={styles.total}>
        {formatPrice(total)}
      </Text>
    </Pressable>
  );
}
