import React, {
  useState,
} from 'react';

import {
  ActivityIndicator,
  Alert,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import {
  addLoyaltyVisit,
  getLoyaltyStatus,
  redeemReward,
} from '../../services/loyaltyService';

import {
  LoyaltyStatus,
} from '../../types/loyalty';

import {
  styles,
} from './LoyaltyScreen.styles';

export function LoyaltyScreen() {
  const [
    qrToken,
    setQrToken,
  ] = useState(
    '45eb07d6-d822-4476-8e62-47722d7609bf',
  );

  const [
    status,
    setStatus,
  ] = useState<LoyaltyStatus | null>(
    null,
  );

  const [
    loading,
    setLoading,
  ] = useState(false);

  const [
    errorMessage,
    setErrorMessage,
  ] = useState<string | null>(
    null,
  );

  const [
    successMessage,
    setSuccessMessage,
  ] = useState<string | null>(
    null,
  );

  const loadStatus =
    async (): Promise<void> => {
      const token =
        qrToken.trim();

      if (!token) {
        setErrorMessage(
          'Ingresa un QR válido.',
        );

        return;
      }

      try {
        setLoading(true);
        setErrorMessage(null);
        setSuccessMessage(null);

        const result =
          await getLoyaltyStatus(
            token,
          );

        setStatus(
          result,
        );
      } catch (error) {
        console.error(
          'Error consultando cliente:',
          error,
        );

        setStatus(null);

        setErrorMessage(
          error instanceof Error
            ? error.message
            : 'No se pudo consultar el cliente.',
        );
      } finally {
        setLoading(false);
      }
    };

  const handleRegisterVisit =
    async (): Promise<void> => {
      const token =
        qrToken.trim();

      if (!token) {
        return;
      }

      try {
        setLoading(true);
        setErrorMessage(null);
        setSuccessMessage(null);

        const result =
          await addLoyaltyVisit(
            token,
          );

        setSuccessMessage(
          `Visita registrada. Total: ${result.totalVisits}`,
        );

        const refreshed =
          await getLoyaltyStatus(
            token,
          );

        setStatus(
          refreshed,
        );
      } catch (error) {
        console.error(
          'Error registrando visita:',
          error,
        );

        setErrorMessage(
          error instanceof Error
            ? error.message
            : 'No se pudo registrar la visita.',
        );
      } finally {
        setLoading(false);
      }
    };

  const handleRedeem =
    (
      rewardId: string,
      rewardName: string,
    ): void => {
      Alert.alert(
        'Canjear recompensa',
        `¿Confirmas el canje de "${rewardName}"?`,
        [
          {
            text: 'Cancelar',
            style: 'cancel',
          },
          {
            text: 'Canjear',
            onPress: () => {
              void performRedeem(
                rewardId,
                rewardName,
              );
            },
          },
        ],
      );
    };

  const performRedeem =
    async (
      rewardId: string,
      rewardName: string,
    ): Promise<void> => {
      const token =
        qrToken.trim();

      try {
        setLoading(true);
        setErrorMessage(null);
        setSuccessMessage(null);

        await redeemReward(
          token,
          rewardId,
        );

        setSuccessMessage(
          `Recompensa canjeada: ${rewardName}`,
        );

        const refreshed =
          await getLoyaltyStatus(
            token,
          );

        setStatus(
          refreshed,
        );
      } catch (error) {
        console.error(
          'Error canjeando recompensa:',
          error,
        );

        setErrorMessage(
          error instanceof Error
            ? error.message
            : 'No se pudo canjear la recompensa.',
        );
      } finally {
        setLoading(false);
      }
    };

  return (
    <ScrollView
      style={
        styles.container
      }
      contentContainerStyle={{
        paddingBottom: 40,
      }}
    >
      <Text
        style={
          styles.title
        }
      >
        Recompensas
      </Text>

      <Text
        style={
          styles.subtitle
        }
      >
        Consulta clientes,
        registra visitas y
        canjea premios.
      </Text>

      <View
        style={
          styles.card
        }
      >
        <Text
          style={
            styles.label
          }
        >
          Token QR
        </Text>

        <TextInput
          style={
            styles.input
          }
          value={
            qrToken
          }
          onChangeText={
            setQrToken
          }
          placeholder="Escanea o ingresa el QR"
          placeholderTextColor="#666666"
          autoCapitalize="none"
          autoCorrect={false}
        />

        <TouchableOpacity
          style={[
            styles.primaryButton,

            loading &&
            styles.primaryButtonDisabled,
          ]}
          disabled={
            loading
          }
          onPress={() => {
            void loadStatus();
          }}
        >
          {loading ? (
            <ActivityIndicator
              color="#111111"
            />
          ) : (
            <Text
              style={
                styles.primaryButtonText
              }
            >
              Consultar cliente
            </Text>
          )}
        </TouchableOpacity>

        {errorMessage ? (
          <Text
            style={
              styles.errorText
            }
          >
            {errorMessage}
          </Text>
        ) : null}

        {successMessage ? (
          <Text
            style={
              styles.successText
            }
          >
            {successMessage}
          </Text>
        ) : null}
      </View>

      {status ? (
        <>
          <View
            style={
              styles.card
            }
          >
            <Text
              style={
                styles.customerName
              }
            >
              {
                status
                  .customer
                  .name
              }
            </Text>

            <Text
              style={
                styles.visits
              }
            >
              {
                status
                  .customer
                  .totalVisits
              }{' '}
              visita
              {
                status
                  .customer
                  .totalVisits ===
                1
                  ? ''
                  : 's'
              }
            </Text>

            <TouchableOpacity
              style={[
                styles.secondaryButton,

                loading &&
                styles.primaryButtonDisabled,
              ]}
              disabled={
                loading
              }
              onPress={() => {
                void handleRegisterVisit();
              }}
            >
              <Text
                style={
                  styles.secondaryButtonText
                }
              >
                + Registrar visita
              </Text>
            </TouchableOpacity>
          </View>

          <View
            style={
              styles.card
            }
          >
            <Text
              style={
                styles.rewardsTitle
              }
            >
              Recompensas
            </Text>

            {
              status
                .rewards
                .length === 0
                ? (
                  <Text
                    style={
                      styles.emptyText
                    }
                  >
                    No hay recompensas
                    configuradas.
                  </Text>
                )
                : status
                  .rewards
                  .map(
                    reward => {
                      const isAvailable =
                        reward.status ===
                        'available';

                      const isRedeemed =
                        reward.status ===
                        'redeemed';

                      return (
                        <View
                          key={
                            reward.id
                          }
                          style={[
                            styles.rewardCard,

                            isAvailable &&
                            styles.rewardAvailable,

                            isRedeemed &&
                            styles.rewardRedeemed,
                          ]}
                        >
                          <Text
                            style={
                              styles.rewardName
                            }
                          >
                            {
                              reward.name
                            }
                          </Text>

                          {
                            reward.description
                              ? (
                                <Text
                                  style={
                                    styles.rewardDescription
                                  }
                                >
                                  {
                                    reward.description
                                  }
                                </Text>
                              )
                              : null
                          }

                          <Text
                            style={[
                              styles.rewardStatus,

                              isAvailable &&
                              styles.availableText,

                              isRedeemed &&
                              styles.redeemedText,
                            ]}
                          >
                            {
                              reward.status ===
                              'locked'
                                ? `🔒 Faltan ${reward.visitsRemaining} visita${reward.visitsRemaining === 1 ? '' : 's'}`
                                : reward.status ===
                                  'available'
                                  ? '🎁 Disponible para canjear'
                                  : '✓ Canjeada'
                            }
                          </Text>

                          {isAvailable ? (
                            <TouchableOpacity
                              style={
                                styles.redeemButton
                              }
                              disabled={
                                loading
                              }
                              onPress={() =>
                                handleRedeem(
                                  reward.id,
                                  reward.name,
                                )
                              }
                            >
                              <Text
                                style={
                                  styles.redeemButtonText
                                }
                              >
                                Canjear
                              </Text>
                            </TouchableOpacity>
                          ) : null}
                        </View>
                      );
                    },
                  )
            }
          </View>
        </>
      ) : null}
    </ScrollView>
  );
}