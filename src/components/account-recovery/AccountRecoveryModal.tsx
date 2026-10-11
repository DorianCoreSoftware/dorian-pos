import {
  ActivityIndicator,
  Modal,
  Pressable,
  Text,
  TextInput,
  View,
} from 'react-native';

import {
  useEffect,
  useState,
} from 'react';

import {
  AccountRecoveryType,
  completeAccountRecovery,
  requestAccountRecovery,
  verifyAccountRecovery,
} from '../../services/accountRecoveryService';

import {
  useBusiness,
} from '../../context/BusinessContext';

import {
  styles,
} from './AccountRecoveryModal.styles';
import { RecoveryStep } from '../../types/account-recovery/recovery-step';
import { RecoveryProps } from '../../types/account-recovery/recovery-props';

export function AccountRecoveryModal({
  visible,
  type,
  initialIdentifier = '',
  onClose,
}: RecoveryProps) {
  const {
    business,
    theme,
  } = useBusiness();

  const [
    step,
    setStep,
  ] = useState<RecoveryStep>('identifier');

  const [
    identifier,
    setIdentifier,
  ] = useState(initialIdentifier);

  const [
    code,
    setCode,
  ] = useState('');

  const [
    completionToken,
    setCompletionToken,
  ] = useState('');

  const [
    newSecret,
    setNewSecret,
  ] = useState('');

  const [
    confirmSecret,
    setConfirmSecret,
  ] = useState('');

  const [
    busy,
    setBusy,
  ] = useState(false);

  const [
    error,
    setError,
  ] = useState<string | null>(null);

  const [
    message,
    setMessage,
  ] = useState<string | null>(null);

  const isRewards =
    type === 'rewards_pin';

  const businessName =
    business?.identity.businessName ??
    'Dorian POS';

  useEffect(
    () => {
      if (!visible) {
        return;
      }

      setStep('identifier');
      setIdentifier(initialIdentifier);
      setCode('');
      setCompletionToken('');
      setNewSecret('');
      setConfirmSecret('');
      setError(null);
      setMessage(null);
      setBusy(false);
    },
    [
      visible,
      initialIdentifier,
      type,
    ],
  );

  const handleRequest =
    async (): Promise<void> => {
      try {
        setBusy(true);
        setError(null);

        const result =
          await requestAccountRecovery(
            type,
            identifier,
          );

        setMessage(result);
        setStep('code');
      } catch (requestError) {
        setError(
          requestError instanceof Error
            ? requestError.message
            : 'No se pudo solicitar la recuperación.',
        );
      } finally {
        setBusy(false);
      }
    };

  const handleVerify =
    async (): Promise<void> => {
      try {
        setBusy(true);
        setError(null);

        const token =
          await verifyAccountRecovery(
            type,
            identifier,
            code,
          );

        setCompletionToken(token);
        setMessage(null);
        setStep('secret');
      } catch (verifyError) {
        setError(
          verifyError instanceof Error
            ? verifyError.message
            : 'No se pudo verificar el código.',
        );
      } finally {
        setBusy(false);
      }
    };

  const handleComplete =
    async (): Promise<void> => {
      if (
        newSecret !==
        confirmSecret
      ) {
        setError(
          isRewards
            ? 'Los PIN no coinciden.'
            : 'Las contraseñas no coinciden.',
        );
        return;
      }

      try {
        setBusy(true);
        setError(null);

        const result =
          await completeAccountRecovery(
            type,
            identifier,
            completionToken,
            newSecret,
          );

        setMessage(result);
        setStep('success');
      } catch (completeError) {
        setError(
          completeError instanceof Error
            ? completeError.message
            : 'No se pudo completar la recuperación.',
        );
      } finally {
        setBusy(false);
      }
    };

  const title =
    isRewards
      ? 'Recuperar PIN'
      : 'Recuperar contraseña';

  const isCodeComplete =
    /^\d{6}$/.test(code);

  const isPrimaryDisabled =
    busy ||
    (
      step === 'code' &&
      !isCodeComplete
    );

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View
        style={styles.overlay}
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
          {step !== 'success' && (
            <Pressable
              style={styles.closeButton}
              disabled={busy}
              onPress={onClose}
              hitSlop={12}
            >
              <Text
                style={[
                  styles.closeButtonText,
                  {
                    color:
                      theme.textMuted,
                  },
                ]}
              >
                ✕
              </Text>
            </Pressable>
          )}
          {step === 'success' ? (
            <>
              <Text
                style={styles.successIcon}
              >
                ✓
              </Text>

              <Text
                style={[
                  styles.title,
                  {
                    color:
                      theme.text,
                    textAlign:
                      'center',
                  },
                ]}
              >
                Recuperación completada
              </Text>

              <Text
                style={[
                  styles.description,
                  {
                    color:
                      theme.textMuted,
                    textAlign:
                      'center',
                  },
                ]}
              >
                {message}
              </Text>

              <View
                style={styles.actions}
              >
                <Pressable
                  style={[
                    styles.button,
                    {
                      backgroundColor:
                        theme.primary,
                    },
                  ]}
                  onPress={onClose}
                >
                  <Text
                    style={[
                      styles.buttonText,
                      {
                        color:
                          theme.onPrimary,
                      },
                    ]}
                  >
                    Listo
                  </Text>
                </Pressable>
              </View>
            </>
          ) : (
            <>
              <Text
                style={[
                  styles.title,
                  {
                    color:
                      theme.text,
                  },
                ]}
              >
                {title}
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
                {step === 'identifier'
                  ? isRewards
                    ? `Ingresa el teléfono registrado en ${businessName} Rewards. Si la cuenta tiene correo, enviaremos un código de 6 dígitos.`
                    : `Ingresa tu correo o usuario de ${businessName}. Enviaremos un código de 6 dígitos al correo registrado.`
                  : step === 'code'
                    ? 'Ingresa el código que recibiste por correo. Tiene una vigencia de 10 minutos.'
                    : isRewards
                      ? 'Crea un nuevo PIN de 6 dígitos.'
                      : 'Crea una nueva contraseña de al menos 8 caracteres.'}
              </Text>

              {step === 'identifier' ? (
                <>
                  <Text
                    style={[
                      styles.label,
                      {
                        color:
                          theme.textMuted,
                      },
                    ]}
                  >
                    {isRewards
                      ? 'Teléfono'
                      : 'Correo o usuario'}
                  </Text>

                  <TextInput
                    style={[
                      styles.input,
                      {
                        borderColor:
                          theme.border,
                        backgroundColor:
                          theme.background,
                        color:
                          theme.text,
                      },
                    ]}
                    value={identifier}
                    onChangeText={value =>
                      setIdentifier(
                        isRewards
                          ? value.replace(/\D/g, '').slice(0, 10)
                          : value,
                      )
                    }
                    placeholder={
                      isRewards
                        ? '10 dígitos'
                        : 'correo@ejemplo.com o usuario'
                    }
                    placeholderTextColor={theme.textMuted}
                    keyboardType={
                      isRewards
                        ? 'phone-pad'
                        : 'email-address'
                    }
                    autoCapitalize="none"
                    autoCorrect={false}
                    editable={!busy}
                  />
                </>
              ) : null}

              {step === 'code' ? (
                <>
                  <Text
                    style={[
                      styles.label,
                      {
                        color:
                          theme.textMuted,
                      },
                    ]}
                  >
                    Código de recuperación
                  </Text>

                  <TextInput
                    style={[
                      styles.input,
                      styles.codeInput,
                      {
                        borderColor:
                          theme.border,
                        backgroundColor:
                          theme.background,
                        color:
                          theme.text,
                      },
                    ]}
                    value={code}
                    onChangeText={value =>
                      setCode(
                        value.replace(/\D/g, '').slice(0, 6),
                      )
                    }
                    placeholder="000000"
                    placeholderTextColor={theme.textMuted}
                    keyboardType="number-pad"
                    maxLength={6}
                    editable={!busy}
                  />
                </>
              ) : null}

              {step === 'secret' ? (
                <>
                  <Text
                    style={[
                      styles.label,
                      {
                        color:
                          theme.textMuted,
                      },
                    ]}
                  >
                    {isRewards
                      ? 'Nuevo PIN'
                      : 'Nueva contraseña'}
                  </Text>

                  <TextInput
                    style={[
                      styles.input,
                      {
                        borderColor:
                          theme.border,
                        backgroundColor:
                          theme.background,
                        color:
                          theme.text,
                      },
                    ]}
                    value={newSecret}
                    onChangeText={value =>
                      setNewSecret(
                        isRewards
                          ? value.replace(/\D/g, '').slice(0, 6)
                          : value,
                      )
                    }
                    secureTextEntry
                    keyboardType={
                      isRewards
                        ? 'number-pad'
                        : 'default'
                    }
                    maxLength={
                      isRewards
                        ? 6
                        : undefined
                    }
                    editable={!busy}
                  />

                  <Text
                    style={[
                      styles.label,
                      {
                        color:
                          theme.textMuted,
                      },
                    ]}
                  >
                    Confirmar
                  </Text>

                  <TextInput
                    style={[
                      styles.input,
                      {
                        borderColor:
                          theme.border,
                        backgroundColor:
                          theme.background,
                        color:
                          theme.text,
                      },
                    ]}
                    value={confirmSecret}
                    onChangeText={value =>
                      setConfirmSecret(
                        isRewards
                          ? value.replace(/\D/g, '').slice(0, 6)
                          : value,
                      )
                    }
                    secureTextEntry
                    keyboardType={
                      isRewards
                        ? 'number-pad'
                        : 'default'
                    }
                    maxLength={
                      isRewards
                        ? 6
                        : undefined
                    }
                    editable={!busy}
                  />
                </>
              ) : null}

              {message && step === 'code' ? (
                <Text
                  style={[
                    styles.message,
                    {
                      color:
                        theme.textMuted,
                    },
                  ]}
                >
                  {message}
                </Text>
              ) : null}

              {error ? (
                <Text
                  style={[
                    styles.error,
                    {
                      color:
                        theme.danger,
                    },
                  ]}
                >
                  {error}
                </Text>
              ) : null}

              <View
                style={styles.actions}
              >
                {step === 'code' && (
                  <Pressable
                    disabled={busy}
                    onPress={() => {
                      void handleRequest();
                    }}
                    hitSlop={8}
                  >
                    <Text
                      style={[
                        styles.resendText,
                        {
                          color:
                            busy
                              ? theme.textMuted
                              : theme.primary,
                        },
                      ]}
                    >
                      Reenviar código
                    </Text>
                  </Pressable>
                )}

                <Pressable
                  style={[
                    styles.button,
                    styles.primaryButton,
                    {
                      backgroundColor:
                        theme.primary,
                      opacity:
                        isPrimaryDisabled
                          ? 0.4
                          : 1,
                    },
                  ]}
                  disabled={
                    isPrimaryDisabled
                  }
                  onPress={() => {
                    if (
                      step ===
                      'identifier'
                    ) {
                      void handleRequest();
                    } else if (
                      step === 'code'
                    ) {
                      void handleVerify();
                    } else {
                      void handleComplete();
                    }
                  }}
                >
                  {busy ? (
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
                      {step ===
                        'identifier'
                        ? 'Enviar código'
                        : step ===
                          'code'
                          ? 'Verificar'
                          : 'Guardar'}
                    </Text>
                  )}
                </Pressable>
              </View>
            </>
          )}
        </View>
      </View>
    </Modal>
  );
}
