import React from 'react';

import {
  StatusBar,
  View,
} from 'react-native';

import WebMenuScreen from './screens/WebMenuScreen';

import styles from './WebApp.styles';

export default function WebApp() {
  return (
    <View style={styles.safeArea}>
      <StatusBar
        barStyle="light-content"
        backgroundColor="#0F0F0F"
      />

      <View style={styles.container}>
        <WebMenuScreen />
      </View>
    </View>
  );
}