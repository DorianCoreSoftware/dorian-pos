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

import { useState } from 'react';

import {
  signInWithIdentifier,
} from '../../services/authService';

import {
  useBusiness,
} from '../../context/BusinessContext';

import {
  styles,
} from './Login.styles';

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

  const {
    business,
    theme,
  } = useBusiness();

  const businessName =
    business?.identity.businessName ??
    'Dorian POS';

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
      style={[
        styles.container,
        {
          backgroundColor:
            theme.background,
        },
      ]}
    >
      <View
        style={[
          styles.card,
          {
            backgroundColor:
              theme.surface,

            shadowColor:
              theme.secondary,
          },
        ]}
      >
        <Text
          style={[
            styles.logo,
            {
              color:
                theme.primary,
            },
          ]}
        >
          {businessName}
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
          Panel de Control & Comandas
        </Text>

        <TextInput
          style={[
            styles.input,
            {
              backgroundColor:
                theme.surfaceAlt,

              color:
                theme.text,

              borderColor:
                theme.border,
            },
          ]}
          placeholder="Correo o usuario"
          placeholderTextColor={
            theme.textMuted
          }
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
          style={[
            styles.input,
            {
              backgroundColor:
                theme.surfaceAlt,

              color:
                theme.text,

              borderColor:
                theme.border,
            },
          ]}
          placeholder="Contraseña"
          placeholderTextColor={
            theme.textMuted
          }
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
            {
              backgroundColor:
                theme.primary,
            },
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
              color={
                theme.onPrimary
              }
            />
          ) : (
            <Text
              style={[
                styles.buttonText,
                {
                  color:
                    theme.onPrimary,
                },
              ]}
            >
              Iniciar Sesión
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
};