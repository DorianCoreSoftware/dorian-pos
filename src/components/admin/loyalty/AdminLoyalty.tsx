import { useBusiness } from '../../../context/BusinessContext';

import React, {
  useCallback,
  useEffect,
  useState,
} from 'react';

import {
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';

import {
  createLoyaltyReward,
  getLoyaltyAdminConfig,
  LoyaltyAdminReward,
  saveLoyaltySettings,
  setLoyaltyRewardActive,
  updateLoyaltyReward,
} from '../../../services/adminLoyaltyService';
import { getAllProducts } from '../../../services/products';
import { Product } from '../../../types';
import {
  styles,
  setBrandPrimaryColor,
} from './AdminLoyalty.styles';

interface RewardForm {
  productId: string;

  name: string;

  description: string;

  requiredVisits: string;

  position: string;

  isActive: boolean;
}

const INITIAL_REWARD_FORM:
  RewardForm = {
  productId: '',

  name: '',

  description: '',

  requiredVisits: '',

  position: '0',

  isActive: true,
};

export function AdminLoyalty() {
  const { theme: businessTheme } = useBusiness();
    setBrandPrimaryColor(businessTheme.primary);

  const {
    width,
  } =
    useWindowDimensions();

  const isPhone =
    width < 700;

  const [
    isLoading,
    setIsLoading,
  ] =
    useState(true);

  const [
    isProcessing,
    setIsProcessing,
  ] =
    useState(false);

  const [
    errorMessage,
    setErrorMessage,
  ] =
    useState<string | null>(
      null,
    );

  const [
    rewards,
    setRewards,
  ] =
    useState<
      LoyaltyAdminReward[]
    >([]);


  const [
    products,
    setProducts,
  ] = useState<Product[]>([]);

  const [
    isEnabled,
    setIsEnabled,
  ] =
    useState(true);

  const [
    minimumPurchase,
    setMinimumPurchase,
  ] =
    useState('');

  const [
    cooldownMinutes,
    setCooldownMinutes,
  ] =
    useState('60');

  const [
    maxVisitsPerDay,
    setMaxVisitsPerDay,
  ] =
    useState('1');

  const [
    selectedReward,
    setSelectedReward,
  ] =
    useState<
      LoyaltyAdminReward | null
    >(null);

  const [
    rewardForm,
    setRewardForm,
  ] =
    useState<RewardForm>({
      ...INITIAL_REWARD_FORM,
    });

  const [
    modalVisible,
    setModalVisible,
  ] =
    useState(false);

  const loadData =
    useCallback(
      async (): Promise<void> => {
        try {
          setIsLoading(
            true,
          );

          setErrorMessage(
            null,
          );

          const [data, productData] =
            await Promise.all([
              getLoyaltyAdminConfig(),
              getAllProducts(),
            ]);

          setProducts(productData);

          setIsEnabled(
            data.settings.isEnabled,
          );

          setMinimumPurchase(
            data.settings
              .minimumPurchaseAmount !==
            null
              ? String(
                data.settings
                  .minimumPurchaseAmount,
              )
              : '',
          );

          setCooldownMinutes(
            String(
              data.settings
                .visitCooldownMinutes,
            ),
          );

          setMaxVisitsPerDay(
            String(
              data.settings
                .maxVisitsPerDay,
            ),
          );

          setRewards(
            data.rewards,
          );
        } catch (error) {
          console.error(
            'Error cargando Rewards:',
            error,
          );

          setErrorMessage(
            error instanceof Error
              ? error.message
              : 'No se pudo cargar Rewards.',
          );
        } finally {
          setIsLoading(
            false,
          );
        }
      },
      [],
    );

  useEffect(
    () => {
      void loadData();
    },
    [
      loadData,
    ],
  );

  const handleSaveSettings =
    async (): Promise<void> => {
      const cooldown =
        Number(
          cooldownMinutes,
        );

      const maxVisits =
        Number(
          maxVisitsPerDay,
        );

      const minimum =
        minimumPurchase.trim()
          ? Number(
            minimumPurchase,
          )
          : null;

      if (
        !Number.isInteger(
          cooldown,
        ) ||
        cooldown < 0
      ) {
        Alert.alert(
          'Dato inválido',
          'El tiempo entre visitas debe ser un número entero.',
        );

        return;
      }

      if (
        !Number.isInteger(
          maxVisits,
        ) ||
        maxVisits <= 0
      ) {
        Alert.alert(
          'Dato inválido',
          'El máximo de visitas debe ser mayor a cero.',
        );

        return;
      }

      if (
        minimum !== null &&
        (
          !Number.isFinite(
            minimum,
          ) ||
          minimum < 0
        )
      ) {
        Alert.alert(
          'Dato inválido',
          'La compra mínima no es válida.',
        );

        return;
      }

      try {
        setIsProcessing(
          true,
        );

        await saveLoyaltySettings({
          isEnabled,

          minimumPurchaseAmount:
            minimum,

          visitCooldownMinutes:
            cooldown,

          maxVisitsPerDay:
            maxVisits,
        });

        Alert.alert(
          'Listo',
          'Configuración guardada.',
        );

        await loadData();
      } catch (error) {
        Alert.alert(
          'Error',
          error instanceof Error
            ? error.message
            : 'No se pudo guardar.',
        );
      } finally {
        setIsProcessing(
          false,
        );
      }
    };

  const openCreateModal =
    (): void => {
      setSelectedReward(
        null,
      );

      setRewardForm({
        ...INITIAL_REWARD_FORM,
        position:
          String(
            rewards.length,
          ),
      });

      setModalVisible(
        true,
      );
    };

  const openEditModal =
    (
      reward:
        LoyaltyAdminReward,
    ): void => {
      setSelectedReward(
        reward,
      );

      setRewardForm({
        productId:
          reward.productId ?? '',

        name:
          reward.name,

        description:
          reward.description ??
          '',

        requiredVisits:
          String(
            reward.requiredVisits,
          ),

        position:
          String(
            reward.position,
          ),

        isActive:
          reward.isActive,
      });

      setModalVisible(
        true,
      );
    };

  const handleSaveReward =
    async (): Promise<void> => {
      const selectedProduct =
        products.find(product => product.id === rewardForm.productId) ?? null;

      const name =
        selectedProduct?.name.trim() ?? '';

      const requiredVisits =
        Number(
          rewardForm.requiredVisits,
        );

      const position =
        Number(
          rewardForm.position,
        );

      if (!selectedProduct) {
        Alert.alert(
          'Dato inválido',
          'Selecciona un producto del negocio para usarlo como premio.',
        );

        return;
      }

      if (
        !Number.isInteger(
          requiredVisits,
        ) ||
        requiredVisits <= 0
      ) {
        Alert.alert(
          'Dato inválido',
          'Las visitas requeridas deben ser mayores a cero.',
        );

        return;
      }

      if (
        !Number.isInteger(
          position,
        ) ||
        position < 0
      ) {
        Alert.alert(
          'Dato inválido',
          'La posición no es válida.',
        );

        return;
      }

      try {
        setIsProcessing(
          true,
        );

        const input = {
          productId: selectedProduct.id,

          name,

          description:
            rewardForm
              .description
              .trim() ||
            null,

          requiredVisits,

          position,

          isActive:
            rewardForm.isActive,
        };

        if (
          selectedReward
        ) {
          await updateLoyaltyReward(
            selectedReward.id,
            input,
          );
        } else {
          await createLoyaltyReward(
            input,
          );
        }

        setModalVisible(
          false,
        );

        await loadData();
      } catch (error) {
        Alert.alert(
          'Error',
          error instanceof Error
            ? error.message
            : 'No se pudo guardar la recompensa.',
        );
      } finally {
        setIsProcessing(
          false,
        );
      }
    };

  const handleToggleReward =
    async (
      reward:
        LoyaltyAdminReward,
      value:
        boolean,
    ): Promise<void> => {
      try {
        setIsProcessing(
          true,
        );

        await setLoyaltyRewardActive(
          reward,
          value,
        );

        await loadData();
      } catch (error) {
        Alert.alert(
          'Error',
          error instanceof Error
            ? error.message
            : 'No se pudo cambiar el estado.',
        );
      } finally {
        setIsProcessing(
          false,
        );
      }
    };

  if (
    isLoading
  ) {
    return (
      <View
        style={
          styles.loadingContainer
        }
      >
        <ActivityIndicator
          size="large"
          color={businessTheme.primary}
        />
      </View>
    );
  }

  return (
    <>
      <ScrollView
        style={
          styles.container
        }
        contentContainerStyle={
          styles.contentContainer
        }
      >
        <View
          style={
            styles.header
          }
        >
          <View>
            <Text
              style={
                styles.title
              }
            >
              Programa de recompensas
            </Text>

            <Text
              style={
                styles.subtitle
              }
            >
              Configura las visitas y los premios que pueden obtener tus clientes.
            </Text>
          </View>
        </View>

        {errorMessage ? (
          <Text
            style={
              styles.errorText
            }
          >
            {errorMessage}
          </Text>
        ) : null}

        <View
          style={
            styles.card
          }
        >
          <View
            style={
              styles.switchRow
            }
          >
            <View
              style={
                styles.switchTextContainer
              }
            >
              <Text
                style={
                  styles.cardTitle
                }
              >
                Programa Rewards
              </Text>

              <Text
                style={
                  styles.cardSubtitle
                }
              >
                Permite registrar clientes, visitas y canjear premios.
              </Text>
            </View>

            <Switch
              value={
                isEnabled
              }
              disabled={
                isProcessing
              }
              onValueChange={
                setIsEnabled
              }
            />
          </View>

          <View
            style={[
              styles.fieldsRow,

              isPhone &&
              styles.fieldsRowPhone,
            ]}
          >
            <View
              style={
                styles.field
              }
            >
              <Text
                style={
                  styles.label
                }
              >
                Máximo de visitas por día
              </Text>

              <TextInput
                style={
                  styles.input
                }
                keyboardType="numeric"
                value={
                  maxVisitsPerDay
                }
                onChangeText={
                  setMaxVisitsPerDay
                }
              />
            </View>

            <View
              style={
                styles.field
              }
            >
              <Text
                style={
                  styles.label
                }
              >
                Minutos entre visitas
              </Text>

              <TextInput
                style={
                  styles.input
                }
                keyboardType="numeric"
                value={
                  cooldownMinutes
                }
                onChangeText={
                  setCooldownMinutes
                }
              />
            </View>

            <View
              style={
                styles.field
              }
            >
              <Text
                style={
                  styles.label
                }
              >
                Compra mínima
              </Text>

              <TextInput
                style={
                  styles.input
                }
                keyboardType="decimal-pad"
                placeholder="Sin mínimo"
                placeholderTextColor="#666666"
                value={
                  minimumPurchase
                }
                onChangeText={
                  setMinimumPurchase
                }
              />
            </View>
          </View>

          <TouchableOpacity
            style={
              styles.primaryButton
            }
            disabled={
              isProcessing
            }
            onPress={() => {
              void handleSaveSettings();
            }}
          >
            <Text
              style={
                styles.primaryButtonText
              }
            >
              Guardar configuración
            </Text>
          </TouchableOpacity>
        </View>

        <View
          style={
            styles.rewardsHeader
          }
        >
          <View>
            <Text
              style={
                styles.sectionTitle
              }
            >
              Premios
            </Text>

            <Text
              style={
                styles.sectionSubtitle
              }
            >
              Define cuántas visitas necesita el cliente para cada recompensa.
            </Text>
          </View>

          <TouchableOpacity
            style={
              styles.addButton
            }
            onPress={
              openCreateModal
            }
          >
            <Text
              style={
                styles.addButtonText
              }
            >
              + Nuevo premio
            </Text>
          </TouchableOpacity>
        </View>

        {
          rewards.length ===
          0
            ? (
              <View
                style={
                  styles.emptyCard
                }
              >
                <Text
                  style={
                    styles.emptyText
                  }
                >
                  No hay premios configurados.
                </Text>
              </View>
            )
            : rewards.map(
              reward => (
                <View
                  key={
                    reward.id
                  }
                  style={
                    styles.rewardCard
                  }
                >
                  <View
                    style={
                      styles.rewardInfo
                    }
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
                      style={
                        styles.rewardVisits
                      }
                    >
                      {
                        reward.requiredVisits
                      }{' '}
                      visita
                      {
                        reward.requiredVisits ===
                        1
                          ? ''
                          : 's'
                      }
                    </Text>
                  </View>

                  <View
                    style={
                      styles.rewardActions
                    }
                  >
                    <Switch
                      value={
                        reward.isActive
                      }
                      disabled={
                        isProcessing
                      }
                      onValueChange={value => {
                        void handleToggleReward(
                          reward,
                          value,
                        );
                      }}
                    />

                    <TouchableOpacity
                      style={
                        styles.editButton
                      }
                      onPress={() =>
                        openEditModal(
                          reward,
                        )
                      }
                    >
                      <Text
                        style={
                          styles.editButtonText
                        }
                      >
                        EDITAR
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ),
            )
        }
      </ScrollView>

      <Modal
        visible={
          modalVisible
        }
        transparent
        animationType="fade"
        onRequestClose={() =>
          setModalVisible(
            false,
          )
        }
      >
        <View
          style={
            styles.modalOverlay
          }
        >
          <View
            style={
              styles.modalCard
            }
          >
            <ScrollView>
              <Text
                style={
                  styles.modalTitle
                }
              >
                {
                  selectedReward
                    ? 'Editar premio'
                    : 'Nuevo premio'
                }
              </Text>

              <Text
                style={
                  styles.label
                }
              >
                Producto del premio
              </Text>

              <View
                style={{
                  borderWidth: 1,
                  borderColor: '#444444',
                  borderRadius: 8,
                  backgroundColor: '#161616',
                  maxHeight: 220,
                  marginBottom: 16,
                }}
              >
                <ScrollView nestedScrollEnabled>
                  {products.map(product => {
                    const selected = product.id === rewardForm.productId;

                    return (
                      <TouchableOpacity
                        key={product.id}
                        onPress={() =>
                          setRewardForm(current => ({
                            ...current,
                            productId: product.id,
                            name: product.name,
                            description:
                              product.description?.trim() ?? '',
                          }))
                        }
                        style={{
                          paddingHorizontal: 12,
                          paddingVertical: 12,
                          borderBottomWidth: 1,
                          borderBottomColor: '#333333',
                          backgroundColor: selected ? businessTheme.primary : 'transparent',
                        }}
                      >
                        <Text
                          style={{
                            color: selected ? businessTheme.onPrimary : '#FFFFFF',
                            fontWeight: selected ? '800' : '500',
                          }}
                        >
                          {product.name}
                        </Text>
                        {!product.is_active ? (
                          <Text
                            style={{
                              color: selected ? businessTheme.onPrimary : '#888888',
                              fontSize: 11,
                              marginTop: 2,
                            }}
                          >
                            Producto inactivo
                          </Text>
                        ) : null}
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>

              <Text
                style={
                  styles.label
                }
              >
                Descripción
              </Text>

              <TextInput
                style={[
                  styles.input,
                  styles.multilineInput,
                ]}
                multiline
                value={
                  rewardForm.description
                }
                onChangeText={value =>
                  setRewardForm(
                    current => ({
                      ...current,
                      description:
                        value,
                    }),
                  )
                }
              />

              <Text
                style={
                  styles.label
                }
              >
                Visitas requeridas
              </Text>

              <TextInput
                style={
                  styles.input
                }
                keyboardType="numeric"
                value={
                  rewardForm.requiredVisits
                }
                onChangeText={value =>
                  setRewardForm(
                    current => ({
                      ...current,
                      requiredVisits:
                        value,
                    }),
                  )
                }
              />

              <Text
                style={
                  styles.label
                }
              >
                Orden
              </Text>

              <TextInput
                style={
                  styles.input
                }
                keyboardType="numeric"
                value={
                  rewardForm.position
                }
                onChangeText={value =>
                  setRewardForm(
                    current => ({
                      ...current,
                      position:
                        value,
                    }),
                  )
                }
              />

              <View
                style={
                  styles.switchRow
                }
              >
                <Text
                  style={
                    styles.label
                  }
                >
                  Premio activo
                </Text>

                <Switch
                  value={
                    rewardForm.isActive
                  }
                  onValueChange={value =>
                    setRewardForm(
                      current => ({
                        ...current,
                        isActive:
                          value,
                      }),
                    )
                  }
                />
              </View>

              <View
                style={
                  styles.modalActions
                }
              >
                <TouchableOpacity
                  style={
                    styles.cancelButton
                  }
                  disabled={
                    isProcessing
                  }
                  onPress={() =>
                    setModalVisible(
                      false,
                    )
                  }
                >
                  <Text
                    style={
                      styles.cancelButtonText
                    }
                  >
                    Cancelar
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={
                    styles.primaryButton
                  }
                  disabled={
                    isProcessing
                  }
                  onPress={() => {
                    void handleSaveReward();
                  }}
                >
                  {
                    isProcessing
                      ? (
                        <ActivityIndicator
                          color="#111111"
                        />
                      )
                      : (
                        <Text
                          style={
                            styles.primaryButtonText
                          }
                        >
                          Guardar
                        </Text>
                      )
                  }
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </>
  );
}