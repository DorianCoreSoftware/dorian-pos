import React, {
  useEffect,
  useState,
} from 'react';

import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';

import {
  useBusiness,
} from '../../context/BusinessContext';

import {
  getMyWebCustomer,
  getMyWebOrders,
  isInvalidWebCustomerSessionError,
  loginWebCustomer,
  logoutWebCustomer,
  registerWebCustomer,
  WebCustomerOrder,
  WebCustomerProfile,
} from '../services/webCustomerService';

import {
  clearSavedWebCustomerSessionToken,
  getSavedWebCustomerSessionToken,
  saveWebCustomerSessionToken,
} from '../utils/webCustomerStorage';

import styles from './WebAccountScreen.styles';

interface Props {
  onBack: () => void;
  onRewardsPress: () => void;
}

type AuthMode =
  | 'login'
  | 'register';

function formatMoney(
  value: number,
): string {
  return new Intl.NumberFormat(
    'es-MX',
    {
      style: 'currency',
      currency: 'MXN',
    },
  ).format(
    Number(value) || 0,
  );
}


function formatOrderStatus(
  value: string,
): string {
  const normalized =
    value
      .trim()
      .toLowerCase();

  const labels: Record<string, string> = {
    pending: 'Pendiente',
    confirmed: 'Confirmado',
    preparing: 'En preparación',
    ready: 'Listo',
    ready_for_pickup: 'Listo para recoger',
    out_for_delivery: 'En camino',
    delivering: 'En reparto',
    delivered: 'Entregado',
    completed: 'Completado',
    cancelled: 'Cancelado',
    canceled: 'Cancelado',
    rejected: 'Rechazado',
    refunded: 'Devuelto',
    partially_refunded: 'Devolución parcial',
  };

  return (
    labels[normalized] ??
    value
  );
}

function formatDate(
  value: string,
): string {
  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    return value;
  }

  return new Intl.DateTimeFormat(
    'es-MX',
    {
      dateStyle: 'medium',
      timeStyle: 'short',
    },
  ).format(date);
}

export default function WebAccountScreen({
  onBack,
  onRewardsPress,
}: Props) {
  const {
    business,
    theme,
  } = useBusiness();

  const [
    authMode,
    setAuthMode,
  ] = useState<AuthMode>(
    'login',
  );

  const [
    name,
    setName,
  ] = useState('');

  const [
    phone,
    setPhone,
  ] = useState('');

  const [
    email,
    setEmail,
  ] = useState('');

  const [
    pin,
    setPin,
  ] = useState('');

  const [
    confirmPin,
    setConfirmPin,
  ] = useState('');

  const [
    sessionToken,
    setSessionToken,
  ] = useState<string | null>(
    null,
  );

  const [
    profile,
    setProfile,
  ] = useState<WebCustomerProfile | null>(
    null,
  );

  const [
    orders,
    setOrders,
  ] = useState<WebCustomerOrder[]>([]);

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    saving,
    setSaving,
  ] = useState(false);

  const [
    errorMessage,
    setErrorMessage,
  ] = useState<string | null>(
    null,
  );

  const businessName =
    business?.identity.businessName ??
    'Dorian POS';

  const loadAccount =
    async (
      token: string,
    ): Promise<void> => {
      const [
        customer,
        customerOrders,
      ] = await Promise.all([
        getMyWebCustomer(
          token,
        ),
        getMyWebOrders(
          token,
        ),
      ]);

      setSessionToken(
        token,
      );

      setProfile(
        customer,
      );

      setOrders(
        customerOrders,
      );
    };

  useEffect(
    () => {
      const bootstrap =
        async (): Promise<void> => {
          const savedToken =
            getSavedWebCustomerSessionToken();

          if (!savedToken) {
            setLoading(
              false,
            );
            return;
          }

          try {
            await loadAccount(
              savedToken,
            );
          } catch (error) {
            console.error(
              'Error restaurando cuenta web:',
              error,
            );

            if (
              isInvalidWebCustomerSessionError(
                error,
              )
            ) {
              clearSavedWebCustomerSessionToken();
            } else {
              setErrorMessage(
                'No se pudo cargar tu cuenta. Revisa tu conexión e intenta nuevamente.',
              );
            }
          } finally {
            setLoading(
              false,
            );
          }
        };

      void bootstrap();
    },
    [],
  );

  const handleLogin =
    async (): Promise<void> => {
      try {
        setSaving(true);
        setErrorMessage(null);

        const result =
          await loginWebCustomer(
            phone,
            pin,
          );

        saveWebCustomerSessionToken(
          result.sessionToken,
        );

        await loadAccount(
          result.sessionToken,
        );

        setPin('');
      } catch (error) {
        setErrorMessage(
          error instanceof Error
            ? error.message
            : 'No se pudo iniciar sesión.',
        );
      } finally {
        setSaving(false);
      }
    };

  const handleRegister =
    async (): Promise<void> => {
      if (
        pin !== confirmPin
      ) {
        setErrorMessage(
          'Los PIN no coinciden.',
        );
        return;
      }

      try {
        setSaving(true);
        setErrorMessage(null);

        const result =
          await registerWebCustomer(
            name,
            phone,
            email,
            pin,
          );

        saveWebCustomerSessionToken(
          result.sessionToken,
        );

        await loadAccount(
          result.sessionToken,
        );

        setPin('');
        setConfirmPin('');
      } catch (error) {
        setErrorMessage(
          error instanceof Error
            ? error.message
            : 'No se pudo crear tu cuenta.',
        );
      } finally {
        setSaving(false);
      }
    };

  const handleLogout =
    async (): Promise<void> => {
      const token =
        sessionToken;

      clearSavedWebCustomerSessionToken();
      setSessionToken(null);
      setProfile(null);
      setOrders([]);
      setErrorMessage(null);

      if (!token) {
        return;
      }

      try {
        await logoutWebCustomer(
          token,
        );
      } catch (error) {
        console.error(
          'Error cerrando sesión web:',
          error,
        );
      }
    };

  if (loading) {
    return (
      <View
        style={[
          styles.screen,
          styles.loadingWrap,
          {
            backgroundColor:
              theme.background,
          },
        ]}
      >
        <ActivityIndicator
          size="large"
          color={theme.primary}
        />
      </View>
    );
  }

  return (
    <View
      style={[
        styles.screen,
        {
          backgroundColor:
            theme.background,
        },
      ]}
    >
      <View
        style={[
          styles.header,
          {
            backgroundColor:
              theme.surface,
            borderBottomColor:
              theme.border,
          },
        ]}
      >
        <Pressable
          style={[
            styles.backButton,
            {
              borderColor:
                theme.border,
            },
          ]}
          onPress={onBack}
        >
          <Text
            style={[
              styles.backButtonText,
              {
                color: theme.text,
              },
            ]}
          >
            ← Menú
          </Text>
        </Pressable>

        <View
          style={styles.headerCopy}
        >
          <Text
            style={[
              styles.headerTitle,
              {
                color: theme.primary,
              },
            ]}
          >
            Mi cuenta
          </Text>

          <Text
            style={[
              styles.headerSubtitle,
              {
                color: theme.textMuted,
              },
            ]}
          >
            {businessName}
          </Text>
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={
          styles.content
        }
      >
        {!profile ? (
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
                styles.cardTitle,
                {
                  color: theme.text,
                },
              ]}
            >
              {authMode === 'login'
                ? 'Inicia sesión'
                : 'Crea tu cuenta'}
            </Text>

            <Text
              style={[
                styles.cardSubtitle,
                {
                  color:
                    theme.textMuted,
                },
              ]}
            >
              Guarda tus pedidos y consulta tu historial desde cualquier visita.
            </Text>

            <View
              style={styles.modeRow}
            >
              <Pressable
                style={[
                  styles.modeButton,
                  {
                    borderColor:
                      theme.primary,
                    backgroundColor:
                      authMode === 'login'
                        ? theme.primary
                        : theme.surface,
                  },
                ]}
                onPress={() => {
                  setAuthMode('login');
                  setErrorMessage(null);
                }}
              >
                <Text
                  style={[
                    styles.modeButtonText,
                    {
                      color:
                        authMode === 'login'
                          ? theme.onPrimary
                          : theme.primary,
                    },
                  ]}
                >
                  Iniciar sesión
                </Text>
              </Pressable>

              <Pressable
                style={[
                  styles.modeButton,
                  {
                    borderColor:
                      theme.primary,
                    backgroundColor:
                      authMode === 'register'
                        ? theme.primary
                        : theme.surface,
                  },
                ]}
                onPress={() => {
                  setAuthMode('register');
                  setErrorMessage(null);
                }}
              >
                <Text
                  style={[
                    styles.modeButtonText,
                    {
                      color:
                        authMode === 'register'
                          ? theme.onPrimary
                          : theme.primary,
                    },
                  ]}
                >
                  Crear cuenta
                </Text>
              </Pressable>
            </View>

            {authMode === 'register' ? (
              <>
                <Text
                  style={[
                    styles.label,
                    { color: theme.text },
                  ]}
                >
                  Nombre
                </Text>

                <TextInput
                  value={name}
                  onChangeText={setName}
                  placeholder="Tu nombre"
                  placeholderTextColor={
                    theme.textMuted
                  }
                  style={[
                    styles.input,
                    {
                      color: theme.text,
                      borderColor:
                        theme.border,
                      backgroundColor:
                        theme.background,
                    },
                  ]}
                />
              </>
            ) : null}

            <Text
              style={[
                styles.label,
                { color: theme.text },
              ]}
            >
              Teléfono
            </Text>

            <TextInput
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
              maxLength={14}
              placeholder="10 dígitos"
              placeholderTextColor={
                theme.textMuted
              }
              style={[
                styles.input,
                {
                  color: theme.text,
                  borderColor:
                    theme.border,
                  backgroundColor:
                    theme.background,
                },
              ]}
            />

            {authMode === 'register' ? (
              <>
                <Text
                  style={[
                    styles.label,
                    { color: theme.text },
                  ]}
                >
                  Correo (opcional)
                </Text>

                <TextInput
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  placeholder="correo@ejemplo.com"
                  placeholderTextColor={
                    theme.textMuted
                  }
                  style={[
                    styles.input,
                    {
                      color: theme.text,
                      borderColor:
                        theme.border,
                      backgroundColor:
                        theme.background,
                    },
                  ]}
                />
              </>
            ) : null}

            <Text
              style={[
                styles.label,
                { color: theme.text },
              ]}
            >
              PIN de 6 dígitos
            </Text>

            <TextInput
              value={pin}
              onChangeText={setPin}
              keyboardType="number-pad"
              secureTextEntry
              maxLength={6}
              placeholder="••••••"
              placeholderTextColor={
                theme.textMuted
              }
              style={[
                styles.input,
                {
                  color: theme.text,
                  borderColor:
                    theme.border,
                  backgroundColor:
                    theme.background,
                },
              ]}
            />

            {authMode === 'register' ? (
              <>
                <Text
                  style={[
                    styles.label,
                    { color: theme.text },
                  ]}
                >
                  Confirma tu PIN
                </Text>

                <TextInput
                  value={confirmPin}
                  onChangeText={setConfirmPin}
                  keyboardType="number-pad"
                  secureTextEntry
                  maxLength={6}
                  placeholder="••••••"
                  placeholderTextColor={
                    theme.textMuted
                  }
                  style={[
                    styles.input,
                    {
                      color: theme.text,
                      borderColor:
                        theme.border,
                      backgroundColor:
                        theme.background,
                    },
                  ]}
                />
              </>
            ) : null}

            {errorMessage ? (
              <Text
                style={[
                  styles.error,
                  {
                    color: theme.danger,
                  },
                ]}
              >
                {errorMessage}
              </Text>
            ) : null}

            <Pressable
              disabled={saving}
              style={[
                styles.primaryButton,
                {
                  backgroundColor:
                    theme.primary,
                  opacity:
                    saving ? 0.65 : 1,
                },
              ]}
              onPress={() =>
                void (
                  authMode === 'login'
                    ? handleLogin()
                    : handleRegister()
                )
              }
            >
              {saving ? (
                <ActivityIndicator
                  color={theme.onPrimary}
                />
              ) : (
                <Text
                  style={[
                    styles.primaryButtonText,
                    {
                      color:
                        theme.onPrimary,
                    },
                  ]}
                >
                  {authMode === 'login'
                    ? 'Entrar'
                    : 'Crear mi cuenta'}
                </Text>
              )}
            </Pressable>
          </View>
        ) : (
          <>
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
                  styles.profileName,
                  {
                    color: theme.text,
                  },
                ]}
              >
                Hola, {profile.name}
              </Text>

              <Text
                style={[
                  styles.profileLine,
                  {
                    color:
                      theme.textMuted,
                  },
                ]}
              >
                📱 {profile.phone}
              </Text>

              {profile.email ? (
                <Text
                  style={[
                    styles.profileLine,
                    {
                      color:
                        theme.textMuted,
                    },
                  ]}
                >
                  ✉️ {profile.email}
                </Text>
              ) : null}

              {business?.features.loyaltyEnabled ? (
                <Pressable
                  style={[
                    styles.primaryButton,
                    {
                      backgroundColor:
                        theme.primary,
                    },
                  ]}
                  onPress={onRewardsPress}
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
                    🎁 Ver recompensas
                  </Text>
                </Pressable>
              ) : null}

              <Pressable
                style={[
                  styles.secondaryButton,
                  {
                    borderColor:
                      theme.border,
                  },
                ]}
                onPress={() =>
                  void handleLogout()
                }
              >
                <Text
                  style={[
                    styles.secondaryButtonText,
                    {
                      color: theme.text,
                    },
                  ]}
                >
                  Cerrar sesión
                </Text>
              </Pressable>
            </View>

            <Text
              style={[
                styles.sectionTitle,
                {
                  color: theme.text,
                },
              ]}
            >
              Mis pedidos
            </Text>

            {orders.length === 0 ? (
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
                    styles.emptyText,
                    {
                      color:
                        theme.textMuted,
                    },
                  ]}
                >
                  Aún no tienes pedidos vinculados a esta cuenta.
                </Text>
              </View>
            ) : (
              orders.map(
                order => (
                  <View
                    key={order.id}
                    style={[
                      styles.orderCard,
                      {
                        backgroundColor:
                          theme.surface,
                        borderColor:
                          theme.border,
                      },
                    ]}
                  >
                    <View
                      style={styles.orderTopRow}
                    >
                      <Text
                        style={[
                          styles.orderCode,
                          {
                            color:
                              theme.text,
                          },
                        ]}
                      >
                        Pedido #{order.trackingCode}
                      </Text>

                      <Text
                        style={[
                          styles.orderStatus,
                          {
                            color:
                              theme.primary,
                          },
                        ]}
                      >
                        {formatOrderStatus(order.status)}
                      </Text>
                    </View>

                    <Text
                      style={[
                        styles.orderMeta,
                        {
                          color:
                            theme.textMuted,
                        },
                      ]}
                    >
                      {formatDate(order.createdAt)}
                    </Text>

                    {order.items.map(
                      item => (
                        <Text
                          key={item.id}
                          style={[
                            styles.orderItem,
                            {
                              color:
                                theme.text,
                            },
                          ]}
                        >
                          {item.quantity} × {item.productName}
                        </Text>
                      ),
                    )}

                    <Text
                      style={[
                        styles.orderTotal,
                        {
                          color:
                            theme.primary,
                        },
                      ]}
                    >
                      Total: {formatMoney(order.total)}
                    </Text>
                  </View>
                ),
              )
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}
