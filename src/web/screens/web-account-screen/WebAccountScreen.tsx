import React, {
  useEffect,
  useState,
} from 'react';

import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';

import * as ImagePicker from 'expo-image-picker';
import {
  manipulateAsync,
  SaveFormat,
} from 'expo-image-manipulator';

import styles from './WebAccountScreen.styles';
import { useBusiness } from '../../../context/BusinessContext';
import {
  WebCustomerProfile,
  WebCustomerOrder,
  WebCustomerPromotionCode,
  WebCustomerAddress,
  getMyWebCustomer,
  getMyWebCustomerProfileDetails,
  getMyDefaultWebCustomerAddress,
  getMyWebOrders,
  getMyWebPromotionCodes,
  updateMyWebCustomerProfile,
  uploadMyWebCustomerAvatar,
  removeMyWebCustomerAvatar,
  deleteMyDefaultWebCustomerAddress,
  isInvalidWebCustomerSessionError,
  loginWebCustomer,
  registerWebCustomer,
  logoutWebCustomer,
} from '../../services/web-customer/webCustomerService';
import { getSavedWebCustomerSessionToken, clearSavedWebCustomerSessionToken, saveWebCustomerSessionToken } from '../../utils/webCustomerStorage';

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
    on_the_way: 'En camino',
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


function getPromotionCodeStatusLabel(
  code: WebCustomerPromotionCode,
): string {
  if (
    code.status ===
    'redeemed'
  ) {
    return 'Usado';
  }

  if (
    code.status ===
    'voided'
  ) {
    return 'Anulado';
  }

  return 'Disponible';
}

function getPromotionCodeStatusColor(
  code: WebCustomerPromotionCode,
  colors: {
    primary: string;
    textMuted: string;
    danger: string;
  },
): string {
  if (
    code.status ===
    'redeemed'
  ) {
    return colors.textMuted;
  }

  if (
    code.status ===
    'voided'
  ) {
    return colors.danger;
  }

  return colors.primary;
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
    promotionCodes,
    setPromotionCodes,
  ] = useState<WebCustomerPromotionCode[]>([]);

  const [
    savedAddress,
    setSavedAddress,
  ] = useState<WebCustomerAddress | null>(
    null,
  );

  const [
    isEditingProfile,
    setIsEditingProfile,
  ] = useState(false);

  const [
    editName,
    setEditName,
  ] = useState('');

  const [
    editPhone,
    setEditPhone,
  ] = useState('');

  const [
    editEmail,
    setEditEmail,
  ] = useState('');

  const [
    avatarBusy,
    setAvatarBusy,
  ] = useState(false);

  const [
    profileSaveMessage,
    setProfileSaveMessage,
  ] = useState<string | null>(
    null,
  );

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
        customerDetails,
        customerOrders,
        customerPromotionCodes,
        customerAddress,
      ] = await Promise.all([
        getMyWebCustomer(
          token,
        ),
        getMyWebCustomerProfileDetails(
          token,
        ),
        getMyWebOrders(
          token,
        ),
        getMyWebPromotionCodes(
          token,
        ),
        getMyDefaultWebCustomerAddress(
          token,
        ),
      ]);

      const completeCustomer:
        WebCustomerProfile = {
        ...customer,
        avatarUrl:
          customerDetails.avatarUrl,
        createdAt:
          customerDetails.createdAt,
      };

      setSessionToken(
        token,
      );

      setProfile(
        completeCustomer,
      );

      setEditName(
        completeCustomer.name,
      );
      setEditPhone(
        completeCustomer.phone,
      );
      setEditEmail(
        completeCustomer.email ??
        '',
      );

      setOrders(
        customerOrders,
      );

      setPromotionCodes(
        customerPromotionCodes,
      );

      setSavedAddress(
        customerAddress,
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
      setPromotionCodes([]);
      setSavedAddress(null);
      setIsEditingProfile(false);
      setProfileSaveMessage(null);
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

  const handleSaveProfile =
    async (): Promise<void> => {
      if (
        !sessionToken
      ) {
        return;
      }

      try {
        setSaving(true);
        setErrorMessage(null);
        setProfileSaveMessage(null);

        const updated =
          await updateMyWebCustomerProfile(
            sessionToken,
            {
              name:
                editName,
              phone:
                editPhone,
              email:
                editEmail,
            },
          );

        setProfile(
          current => ({
            ...updated,
            avatarUrl:
              current?.avatarUrl ??
              null,
            createdAt:
              current?.createdAt ??
              null,
          }),
        );

        setEditName(
          updated.name,
        );
        setEditPhone(
          updated.phone,
        );
        setEditEmail(
          updated.email ??
          '',
        );

        setIsEditingProfile(
          false,
        );
        setProfileSaveMessage(
          'Tus datos se actualizaron correctamente.',
        );
      } catch (error) {
        setErrorMessage(
          error instanceof Error
            ? error.message
            : 'No se pudo actualizar tu perfil.',
        );
      } finally {
        setSaving(false);
      }
    };

  const handleChooseAvatar =
    async (): Promise<void> => {
      if (
        !sessionToken ||
        avatarBusy
      ) {
        return;
      }

      try {
        setAvatarBusy(true);
        setErrorMessage(null);
        setProfileSaveMessage(null);

        const permission =
          await ImagePicker
            .requestMediaLibraryPermissionsAsync();

        if (
          !permission.granted
        ) {
          throw new Error(
            'Necesitamos permiso para elegir una foto.',
          );
        }

        const result =
          await ImagePicker
            .launchImageLibraryAsync({
              mediaTypes: [
                'images',
              ],
              allowsEditing:
                true,
              aspect:
                [1, 1],
              quality:
                0.9,
            });

        if (
          result.canceled ||
          !result.assets[0]
        ) {
          return;
        }

        const processed =
          await manipulateAsync(
            result.assets[0].uri,
            [
              {
                resize: {
                  width: 512,
                },
              },
            ],
            {
              compress:
                1,
              format:
                SaveFormat.PNG,
              base64:
                true,
            },
          );

        if (
          !processed.base64
        ) {
          throw new Error(
            'No se pudo preparar la foto seleccionada.',
          );
        }

        const avatarUrl =
          await uploadMyWebCustomerAvatar(
            sessionToken,
            processed.base64,
            'image/png',
          );

        setProfile(
          current =>
            current
              ? {
                  ...current,
                  avatarUrl,
                }
              : current,
        );

        setProfileSaveMessage(
          'Foto de perfil actualizada.',
        );
      } catch (error) {
        setErrorMessage(
          error instanceof Error
            ? error.message
            : 'No se pudo actualizar la foto.',
        );
      } finally {
        setAvatarBusy(false);
      }
    };

  const handleRemoveAvatar =
    async (): Promise<void> => {
      if (
        !sessionToken ||
        !profile?.avatarUrl ||
        avatarBusy
      ) {
        return;
      }

      try {
        setAvatarBusy(true);
        setErrorMessage(null);
        setProfileSaveMessage(null);

        await removeMyWebCustomerAvatar(
          sessionToken,
        );

        setProfile(
          current =>
            current
              ? {
                  ...current,
                  avatarUrl:
                    null,
                }
              : current,
        );

        setProfileSaveMessage(
          'Foto de perfil eliminada.',
        );
      } catch (error) {
        setErrorMessage(
          error instanceof Error
            ? error.message
            : 'No se pudo eliminar la foto.',
        );
      } finally {
        setAvatarBusy(false);
      }
    };

  const handleDeleteAddress =
    async (): Promise<void> => {
      if (
        !sessionToken ||
        !savedAddress
      ) {
        return;
      }

      try {
        setSaving(true);
        setErrorMessage(null);
        setProfileSaveMessage(null);

        await deleteMyDefaultWebCustomerAddress(
          sessionToken,
        );

        setSavedAddress(
          null,
        );

        setProfileSaveMessage(
          'Dirección principal eliminada.',
        );
      } catch (error) {
        setErrorMessage(
          error instanceof Error
            ? error.message
            : 'No se pudo eliminar la dirección.',
        );
      } finally {
        setSaving(false);
      }
    };

  const availableCodesCount =
    promotionCodes.filter(
      item =>
        item.status ===
        'available',
    ).length;

  const customerSince =
    profile?.createdAt
      ? formatDate(
          profile.createdAt,
        )
      : null;

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
                styles.profileCard,
                {
                  backgroundColor:
                    theme.surface,
                  borderColor:
                    theme.border,
                },
              ]}
            >
              <View
                style={
                  styles.profileHero
                }
              >
                <View
                  style={[
                    styles.avatarWrap,
                    {
                      borderColor:
                        theme.primary,
                      backgroundColor:
                        theme.background,
                    },
                  ]}
                >
                  {profile.avatarUrl ? (
                    <Image
                      source={{
                        uri:
                          profile.avatarUrl,
                      }}
                      style={
                        styles.avatarImage
                      }
                    />
                  ) : (
                    <Text
                      style={[
                        styles.avatarInitial,
                        {
                          color:
                            theme.primary,
                        },
                      ]}
                    >
                      {profile.name
                        .trim()
                        .charAt(0)
                        .toUpperCase() ||
                        'C'}
                    </Text>
                  )}

                  {avatarBusy ? (
                    <View
                      style={
                        styles.avatarLoading
                      }
                    >
                      <ActivityIndicator
                        color={
                          theme.primary
                        }
                      />
                    </View>
                  ) : null}
                </View>

                <View
                  style={
                    styles.profileHeroCopy
                  }
                >
                  <Text
                    style={[
                      styles.profileName,
                      {
                        color:
                          theme.text,
                      },
                    ]}
                  >
                    {profile.name}
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

                  <Text
                    style={[
                      styles.profileLine,
                      {
                        color:
                          theme.textMuted,
                      },
                    ]}
                  >
                    ✉️ {profile.email || 'Sin correo registrado'}
                  </Text>

                  {customerSince ? (
                    <Text
                      style={[
                        styles.profileSince,
                        {
                          color:
                            theme.textMuted,
                        },
                      ]}
                    >
                      Miembro desde {customerSince}
                    </Text>
                  ) : null}
                </View>
              </View>

              <View
                style={
                  styles.avatarActions
                }
              >
                <Pressable
                  disabled={
                    avatarBusy
                  }
                  style={[
                    styles.smallActionButton,
                    {
                      borderColor:
                        theme.primary,
                    },
                  ]}
                  onPress={() =>
                    void handleChooseAvatar()
                  }
                >
                  <Text
                    style={[
                      styles.smallActionText,
                      {
                        color:
                          theme.primary,
                      },
                    ]}
                  >
                    {profile.avatarUrl
                      ? 'Cambiar foto'
                      : 'Subir foto'}
                  </Text>
                </Pressable>

                {profile.avatarUrl ? (
                  <Pressable
                    disabled={
                      avatarBusy
                    }
                    style={[
                      styles.smallActionButton,
                      {
                        borderColor:
                          theme.border,
                      },
                    ]}
                    onPress={() =>
                      void handleRemoveAvatar()
                    }
                  >
                    <Text
                      style={[
                        styles.smallActionText,
                        {
                          color:
                            theme.textMuted,
                        },
                      ]}
                    >
                      Quitar
                    </Text>
                  </Pressable>
                ) : null}
              </View>

              <View
                style={
                  styles.statsRow
                }
              >
                <View
                  style={[
                    styles.statCard,
                    {
                      borderColor:
                        theme.border,
                      backgroundColor:
                        theme.background,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.statValue,
                      {
                        color:
                          theme.primary,
                      },
                    ]}
                  >
                    {orders.length}
                  </Text>
                  <Text
                    style={[
                      styles.statLabel,
                      {
                        color:
                          theme.textMuted,
                      },
                    ]}
                  >
                    Pedidos
                  </Text>
                </View>

                <View
                  style={[
                    styles.statCard,
                    {
                      borderColor:
                        theme.border,
                      backgroundColor:
                        theme.background,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.statValue,
                      {
                        color:
                          theme.primary,
                      },
                    ]}
                  >
                    {availableCodesCount}
                  </Text>
                  <Text
                    style={[
                      styles.statLabel,
                      {
                        color:
                          theme.textMuted,
                      },
                    ]}
                  >
                    Códigos
                  </Text>
                </View>

                <View
                  style={[
                    styles.statCard,
                    {
                      borderColor:
                        theme.border,
                      backgroundColor:
                        theme.background,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.statValue,
                      {
                        color:
                          profile.rewardsActive
                            ? theme.primary
                            : theme.textMuted,
                      },
                    ]}
                  >
                    {profile.rewardsActive
                      ? 'Sí'
                      : 'No'}
                  </Text>
                  <Text
                    style={[
                      styles.statLabel,
                      {
                        color:
                          theme.textMuted,
                      },
                    ]}
                  >
                    Recompensas
                  </Text>
                </View>
              </View>

              {isEditingProfile ? (
                <View
                  style={[
                    styles.editProfileBox,
                    {
                      borderColor:
                        theme.border,
                      backgroundColor:
                        theme.background,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.label,
                      {
                        color:
                          theme.text,
                      },
                    ]}
                  >
                    Nombre
                  </Text>

                  <TextInput
                    value={
                      editName
                    }
                    onChangeText={
                      setEditName
                    }
                    maxLength={80}
                    placeholder="Tu nombre"
                    placeholderTextColor={
                      theme.textMuted
                    }
                    style={[
                      styles.input,
                      {
                        color:
                          theme.text,
                        borderColor:
                          theme.border,
                        backgroundColor:
                          theme.surface,
                      },
                    ]}
                  />

                  <Text
                    style={[
                      styles.label,
                      {
                        color:
                          theme.text,
                      },
                    ]}
                  >
                    Teléfono
                  </Text>

                  <TextInput
                    value={
                      editPhone
                    }
                    onChangeText={
                      setEditPhone
                    }
                    keyboardType="phone-pad"
                    maxLength={14}
                    placeholder="10 dígitos"
                    placeholderTextColor={
                      theme.textMuted
                    }
                    style={[
                      styles.input,
                      {
                        color:
                          theme.text,
                        borderColor:
                          theme.border,
                        backgroundColor:
                          theme.surface,
                      },
                    ]}
                  />

                  <Text
                    style={[
                      styles.label,
                      {
                        color:
                          theme.text,
                      },
                    ]}
                  >
                    Correo
                  </Text>

                  <TextInput
                    value={
                      editEmail
                    }
                    onChangeText={
                      setEditEmail
                    }
                    keyboardType="email-address"
                    autoCapitalize="none"
                    maxLength={160}
                    placeholder="correo@ejemplo.com"
                    placeholderTextColor={
                      theme.textMuted
                    }
                    style={[
                      styles.input,
                      {
                        color:
                          theme.text,
                        borderColor:
                          theme.border,
                        backgroundColor:
                          theme.surface,
                      },
                    ]}
                  />

                  <View
                    style={
                      styles.editActions
                    }
                  >
                    <Pressable
                      disabled={
                        saving
                      }
                      style={[
                        styles.editActionButton,
                        {
                          backgroundColor:
                            theme.primary,
                        },
                      ]}
                      onPress={() =>
                        void handleSaveProfile()
                      }
                    >
                      {saving ? (
                        <ActivityIndicator
                          color={
                            theme.onPrimary
                          }
                        />
                      ) : (
                        <Text
                          style={[
                            styles.editActionButtonText,
                            {
                              color:
                                theme.onPrimary,
                            },
                          ]}
                        >
                          Guardar cambios
                        </Text>
                      )}
                    </Pressable>

                    <Pressable
                      disabled={
                        saving
                      }
                      style={[
                        styles.editActionButton,
                        {
                          borderWidth:
                            1,
                          borderColor:
                            theme.border,
                        },
                      ]}
                      onPress={() => {
                        setEditName(
                          profile.name,
                        );
                        setEditPhone(
                          profile.phone,
                        );
                        setEditEmail(
                          profile.email ??
                          '',
                        );
                        setIsEditingProfile(
                          false,
                        );
                      }}
                    >
                      <Text
                        style={[
                          styles.editActionButtonText,
                          {
                            color:
                              theme.text,
                          },
                        ]}
                      >
                        Cancelar
                      </Text>
                    </Pressable>
                  </View>
                </View>
              ) : (
                <Pressable
                  style={[
                    styles.secondaryButton,
                    {
                      borderColor:
                        theme.primary,
                    },
                  ]}
                  onPress={() => {
                    setProfileSaveMessage(
                      null,
                    );
                    setErrorMessage(
                      null,
                    );
                    setIsEditingProfile(
                      true,
                    );
                  }}
                >
                  <Text
                    style={[
                      styles.secondaryButtonText,
                      {
                        color:
                          theme.primary,
                      },
                    ]}
                  >
                    ✏️ Editar mis datos
                  </Text>
                </Pressable>
              )}

              {profileSaveMessage ? (
                <Text
                  style={[
                    styles.successMessage,
                    {
                      color:
                        theme.primary,
                    },
                  ]}
                >
                  {profileSaveMessage}
                </Text>
              ) : null}

              {errorMessage ? (
                <Text
                  style={[
                    styles.error,
                    {
                      color:
                        theme.danger,
                    },
                  ]}
                >
                  {errorMessage}
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
                  onPress={
                    onRewardsPress
                  }
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
                      color:
                        theme.text,
                    },
                  ]}
                >
                  Cerrar sesión
                </Text>
              </Pressable>
            </View>

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
              <View
                style={
                  styles.addressHeader
                }
              >
                <View
                  style={{
                    flex: 1,
                  }}
                >
                  <Text
                    style={[
                      styles.cardTitle,
                      {
                        color:
                          theme.text,
                      },
                    ]}
                  >
                    📍 Dirección principal
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
                    La usamos para autocompletar futuros pedidos a domicilio.
                  </Text>
                </View>
              </View>

              {savedAddress ? (
                <>
                  <Text
                    style={[
                      styles.addressMain,
                      {
                        color:
                          theme.text,
                      },
                    ]}
                  >
                    {savedAddress.street}{' '}
                    {savedAddress.exteriorNumber}
                    {savedAddress.interiorNumber
                      ? ` Int. ${savedAddress.interiorNumber}`
                      : ''}
                  </Text>

                  <Text
                    style={[
                      styles.addressLine,
                      {
                        color:
                          theme.textMuted,
                      },
                    ]}
                  >
                    {savedAddress.neighborhood}
                    {savedAddress.postalCode
                      ? ` · C.P. ${savedAddress.postalCode}`
                      : ''}
                  </Text>

                  {savedAddress.deliveryReferences ? (
                    <Text
                      style={[
                        styles.addressLine,
                        {
                          color:
                            theme.textMuted,
                        },
                      ]}
                    >
                      Referencias: {savedAddress.deliveryReferences}
                    </Text>
                  ) : null}

                  <Pressable
                    disabled={
                      saving
                    }
                    style={[
                      styles.secondaryButton,
                      {
                        borderColor:
                          theme.border,
                      },
                    ]}
                    onPress={() =>
                      void handleDeleteAddress()
                    }
                  >
                    <Text
                      style={[
                        styles.secondaryButtonText,
                        {
                          color:
                            theme.textMuted,
                        },
                      ]}
                    >
                      Eliminar dirección guardada
                    </Text>
                  </Pressable>
                </>
              ) : (
                <Text
                  style={[
                    styles.emptyText,
                    {
                      color:
                        theme.textMuted,
                    },
                  ]}
                >
                  Aún no has guardado una dirección. Puedes hacerlo al realizar tu próximo pedido a domicilio.
                </Text>
              )}
            </View>

            <View
              style={
                styles.sectionHeaderRow
              }
            >
              <View
                style={{
                  flex: 1,
                }}
              >
                <Text
                  style={[
                    styles.sectionTitle,
                    {
                      color:
                        theme.text,
                    },
                  ]}
                >
                  Mis códigos
                </Text>

                <Text
                  style={[
                    styles.sectionSubtitle,
                    {
                      color:
                        theme.textMuted,
                    },
                  ]}
                >
                  Aquí puedes recuperar los códigos de promociones que recibiste en tus pedidos.
                </Text>
              </View>

              {promotionCodes.length > 0 ? (
                <View
                  style={[
                    styles.codeCountBadge,
                    {
                      borderColor:
                        theme.border,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.codeCountText,
                      {
                        color:
                          theme.textMuted,
                      },
                    ]}
                  >
                    {promotionCodes.filter(
                      item =>
                        item.status ===
                        'available',
                    ).length}{' '}
                    disponibles
                  </Text>
                </View>
              ) : null}
            </View>

            {promotionCodes.length === 0 ? (
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
                  Aún no tienes códigos promocionales vinculados a tus pedidos.
                </Text>
              </View>
            ) : (
              promotionCodes.map(
                promoCode => {
                  const statusColor =
                    getPromotionCodeStatusColor(
                      promoCode,
                      {
                        primary:
                          theme.primary,
                        textMuted:
                          theme.textMuted,
                        danger:
                          theme.danger,
                      },
                    );

                  return (
                    <View
                      key={
                        promoCode.id
                      }
                      style={[
                        styles.promoCodeCard,
                        {
                          backgroundColor:
                            theme.surface,
                          borderColor:
                            promoCode.status ===
                            'available'
                              ? theme.primary
                              : theme.border,
                        },
                      ]}
                    >
                      <View
                        style={
                          styles.promoCodeTopRow
                        }
                      >
                        <View
                          style={{
                            flex: 1,
                          }}
                        >
                          <Text
                            style={[
                              styles.promoProgramName,
                              {
                                color:
                                  theme.text,
                              },
                            ]}
                          >
                            {promoCode.programName}
                          </Text>

                          <Text
                            style={[
                              styles.promoOrderMeta,
                              {
                                color:
                                  theme.textMuted,
                              },
                            ]}
                          >
                            Pedido #{promoCode.orderTrackingCode} · {formatDate(promoCode.createdAt)}
                          </Text>
                        </View>

                        <Text
                          style={[
                            styles.promoStatus,
                            {
                              color:
                                statusColor,
                            },
                          ]}
                        >
                          {getPromotionCodeStatusLabel(
                            promoCode,
                          )}
                        </Text>
                      </View>

                      <View
                        style={[
                          styles.promoCodeBox,
                          {
                            borderColor:
                              promoCode.status ===
                              'available'
                                ? theme.primary
                                : theme.border,
                            backgroundColor:
                              theme.background,
                          },
                        ]}
                      >
                        <Text
                          selectable
                          style={[
                            styles.promoCodeText,
                            {
                              color:
                                promoCode.status ===
                                'available'
                                  ? theme.primary
                                  : theme.text,
                            },
                          ]}
                        >
                          {promoCode.code}
                        </Text>
                      </View>

                      {promoCode.status ===
                      'available' ? (
                        <Text
                          style={[
                            styles.promoHint,
                            {
                              color:
                                theme.textMuted,
                            },
                          ]}
                        >
                          Presenta este código o selecciónalo para copiarlo manualmente.
                        </Text>
                      ) : null}

                      {promoCode.redeemedAt ? (
                        <Text
                          style={[
                            styles.promoHistoryMeta,
                            {
                              color:
                                theme.textMuted,
                            },
                          ]}
                        >
                          Usado: {formatDate(promoCode.redeemedAt)}
                        </Text>
                      ) : null}

                      {promoCode.voidedAt ? (
                        <Text
                          style={[
                            styles.promoHistoryMeta,
                            {
                              color:
                                theme.textMuted,
                            },
                          ]}
                        >
                          Anulado: {formatDate(promoCode.voidedAt)}
                        </Text>
                      ) : null}
                    </View>
                  );
                },
              )
            )}

            <Text
              style={[
                styles.sectionTitle,
                styles.ordersSectionTitle,
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
