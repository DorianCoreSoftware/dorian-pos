import React from 'react';

import {
  SafeAreaView,
  StatusBar,
  View,
} from 'react-native';

import WebMenuScreen from './screens/WebMenuScreen';
import styles from './WebApp.styles';

export default function WebApp() {
  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar
        barStyle="light-content"
        backgroundColor="#0F0F0F"
      />

      <View style={styles.container}>
        <WebMenuScreen />
      </View>
    </SafeAreaView>
  );
}
