import React from 'react';

import {
  Image,
  Text,
  View,
} from 'react-native';

import styles from './WebHeader.styles';

export default function WebHeader() {
  return (
    <View style={styles.header}>
      <View style={styles.inner}>
        <Image
          source={require('../../../assets/BurgerKongWOFondo.png')}
          style={styles.logo}
          resizeMode="contain"
        />

        <View style={styles.copy}>
          <Text style={styles.title}>
            Burger Kong
          </Text>

          <Text style={styles.subtitle}>
            Ordena en línea
          </Text>
        </View>
      </View>
    </View>
  );
}
