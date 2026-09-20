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

import {
  signInWithIdentifier,
} from '../../services/authService';

import {
  styles,
} from './Login.styles';
import { useState } from 'react';

export const LoginScreen = () => {
  const [
    identifier,
    setIdentifier,
  ] = useState('');

  const [
    password,
    setPassword,
  ] = useState('');

  const [
    isLoading,
    setIsLoading,
  ] = useState(false);

  const handleLogin =
    async (): Promise<void> => {
      const cleanIdentifier =
        identifier.trim();

      if (
        !cleanIdentifier ||
        !password.trim()
      ) {
        Alert.alert(
          'Campos incompletos',
          'Por favor ingresa tu correo o usuario y contraseña.',
        );

        return;
      }

      try {
        setIsLoading(
          true,
        );

        await signInWithIdentifier(
          cleanIdentifier,
          password,
        );
      } catch (error) {
        console.error(
          'Error en Login:',
          error,
        );

        Alert.alert(
          'Error de acceso',
          'El usuario, correo o contraseña son incorrectos.',
        );
      } finally {
        setIsLoading(
          false,
        );
      }
    };

  return (
    <KeyboardAvoidingView
      behavior={
        Platform.OS === 'ios'
          ? 'padding'
          : 'height'
      }
      style={
        styles.container
      }
    >
      <View
        style={
          styles.card
        }
      >
        <Text
          style={
            styles.logo
          }
        >
          Burger Kong
        </Text>

        <Text
          style={
            styles.subtitle
          }
        >
          Panel de Control & Comandas
        </Text>

        <TextInput
          style={
            styles.input
          }
          placeholder="Correo o usuario"
          placeholderTextColor="#888"
          value={
            identifier
          }
          onChangeText={
            setIdentifier
          }
          autoCapitalize="none"
          autoCorrect={
            false
          }
          editable={
            !isLoading
          }
          returnKeyType="next"
        />

        <TextInput
          style={
            styles.input
          }
          placeholder="Contraseña"
          placeholderTextColor="#888"
          value={
            password
          }
          onChangeText={
            setPassword
          }
          secureTextEntry
          autoCapitalize="none"
          autoCorrect={
            false
          }
          editable={
            !isLoading
          }
          returnKeyType="done"
          onSubmitEditing={() => {
            void handleLogin();
          }}
        />

        <TouchableOpacity
          style={[
            styles.button,

            isLoading && {
              opacity:
                0.65,
            },
          ]}
          onPress={() => {
            void handleLogin();
          }}
          disabled={
            isLoading
          }
        >
          {isLoading ? (
            <ActivityIndicator
              color="#121212"
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
