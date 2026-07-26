import React, { useState } from 'react';

import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { signInWithEmail } from '../../services/authService';
import { styles } from './Login.styles';

export const LoginScreen = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (): Promise<void> => {
    const cleanEmail = email.trim();

    if (!cleanEmail || !password.trim()) {
      Alert.alert(
        'Campos incompletos',
        'Por favor ingresa tu correo y contraseña.',
      );

      return;
    }

    try {
      setIsLoading(true);

      await signInWithEmail(
        cleanEmail,
        password,
      );
    } catch (error) {
      console.error(
        'Error en Login:',
        error,
      );

      Alert.alert(
        'Error de acceso',
        'El correo o contraseña son incorrectos.',
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={
        Platform.OS === 'ios'
          ? 'padding'
          : 'height'
      }
      style={styles.container}
    >
      <View style={styles.card}>
        <Text style={styles.logo}>
          Burger Kong
        </Text>

        <Text style={styles.subtitle}>
          Panel de Control & Comandas
        </Text>

        <TextInput
          style={styles.input}
          placeholder="Correo Electrónico"
          placeholderTextColor="#888"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="email-address"
          editable={!isLoading}
        />

        <TextInput
          style={styles.input}
          placeholder="Contraseña"
          placeholderTextColor="#888"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoCapitalize="none"
          autoCorrect={false}
          editable={!isLoading}
          onSubmitEditing={() => {
            void handleLogin();
          }}
        />

        <TouchableOpacity
          style={styles.button}
          onPress={() => {
            void handleLogin();
          }}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator
              color="#fff"
            />
          ) : (
            <Text
              style={
                styles.buttonText
              }
            >
              Iniciar Sesión
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
};