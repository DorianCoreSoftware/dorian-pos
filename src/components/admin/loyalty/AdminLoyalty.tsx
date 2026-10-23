import { useBusiness } from '../../../context/BusinessContext';

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import {
  ActivityIndicator,
  Alert,
  Animated,
  LayoutChangeEvent,
  Modal,
  PanResponder,
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
  reorderLoyaltyRewards,
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


  isActive: boolean;
}

const INITIAL_REWARD_FORM:
  RewardForm = {
  productId: '',

  name: '',

  description: '',

  requiredVisits: '',


  isActive: true,
};


interface RewardCardLayout {
  y: number;
  height: number;
}

interface SortableRewardCardProps {
  reward: LoyaltyAdminReward;
  isDisabled: boolean;
  isDragging: boolean;
  onLayout: (
    rewardId: string,
    event: LayoutChangeEvent,
  ) => void;
  onDragStart: (
    rewardId: string,
  ) => void;
  onDragEnd: (
    rewardId: string,
    offsetY: number,
  ) => void;
  onToggle: (
    reward: LoyaltyAdminReward,
    value: boolean,
  ) => void;
  onEdit: (
    reward: LoyaltyAdminReward,
  ) => void;
}

function SortableRewardCard({
  reward,
  isDisabled,
  isDragging,
  onLayout,
  onDragStart,
  onDragEnd,
  onToggle,
  onEdit,
}: SortableRewardCardProps) {
  const translateY =
    useRef(
      new Animated.Value(0),
    ).current;

  const onDragStartRef =
    useRef(onDragStart);

  const onDragEndRef =
    useRef(onDragEnd);

  onDragStartRef.current =
    onDragStart;

  onDragEndRef.current =
    onDragEnd;

  const panResponder =
    useMemo(
      () =>
        PanResponder.create({
          onStartShouldSetPanResponder:
            () => !isDisabled,
          onMoveShouldSetPanResponder:
            () => !isDisabled,
          onPanResponderGrant: () => {
            if (isDisabled) {
              return;
            }

            onDragStartRef.current(
              reward.id,
            );
          },
          onPanResponderMove: (
            _event,
            gestureState,
          ) => {
            if (isDisabled) {
              return;
            }

            translateY.setValue(
              gestureState.dy,
            );
          },
          onPanResponderRelease: (
            _event,
            gestureState,
          ) => {
            translateY.setValue(0);

            if (isDisabled) {
              return;
            }

            onDragEndRef.current(
              reward.id,
              gestureState.dy,
            );
          },
          onPanResponderTerminate: () => {
            translateY.setValue(0);

            onDragEndRef.current(
              reward.id,
              0,
            );
          },
          onPanResponderTerminationRequest:
            () => false,
          onShouldBlockNativeResponder:
            () => true,
        }),
      [
        isDisabled,
        reward.id,
        translateY,
      ],
    );

  return (
    <Animated.View
      onLayout={event =>
        onLayout(
          reward.id,
          event,
        )
      }
      style={[
        styles.rewardCard,
        isDragging &&
        styles.rewardCardDragging,
        {
          transform: [
            {
              translateY,
            },
          ],
          zIndex:
            isDragging
              ? 20
              : 0,
        },
      ]}
    >
      <View
        style={
          styles.rewardDragColumn
        }
      >
        <View
          {...panResponder.panHandlers}
          style={[
            styles.dragHandleButton,
            isDragging &&
            styles.dragHandleButtonActive,
          ]}
        >
          <Text
            style={
              styles.dragHandle
            }
          >
            ≡
          </Text>
        </View>
      </View>

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
          {reward.name}
        </Text>

        {reward.description ? (
          <Text
            style={
              styles.rewardDescription
            }
          >
            {reward.description}
          </Text>
        ) : null}

        <Text
          style={
            styles.rewardVisits
          }
        >
          {reward.requiredVisits}{' '}
          visita
          {reward.requiredVisits === 1
            ? ''
            : 's'}
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
            isDisabled
          }
          onValueChange={value => {
            onToggle(
              reward,
              value,
            );
          }}
        />

        <TouchableOpacity
          style={
            styles.editButton
          }
          disabled={
            isDisabled
          }
          onPress={() =>
            onEdit(
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
    </Animated.View>
  );
}

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
    isReordering,
    setIsReordering,
  ] = useState(false);

  const [
    draggedRewardId,
    setDraggedRewardId,
  ] = useState<string | null>(
    null,
  );

  const rewardLayouts =
    useRef<Record<string, RewardCardLayout>>(
      {},
    );

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

        isActive:
          reward.isActive,
      });

      setModalVisible(
        true,
      );
    };

  const visitsConflict =
    useMemo(
      () => {
        const requiredVisits =
          Number(
            rewardForm.requiredVisits,
          );

        if (
          !Number.isInteger(
            requiredVisits,
          ) ||
          requiredVisits <= 0
        ) {
          return null;
        }

        return (
          rewards.find(
            reward =>
              reward.id !==
              selectedReward?.id &&
              reward.requiredVisits ===
              requiredVisits,
          ) ?? null
        );
      },
      [
        rewardForm.requiredVisits,
        rewards,
        selectedReward?.id,
      ],
    );

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
        selectedReward?.position ??
        (
          rewards.length > 0
            ? Math.max(
              ...rewards.map(
                reward =>
                  reward.position,
              ),
            ) + 1
            : 0
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

      if (visitsConflict) {
        Alert.alert(
          'Visitas ya asignadas',
          `${requiredVisits} visita${requiredVisits === 1 ? '' : 's'} ya ${requiredVisits === 1 ? 'está ligada' : 'están ligadas'} al premio "${visitsConflict.name}". Elige otro número de visitas.`,
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

  async function persistRewardOrder(
    nextRewards: LoyaltyAdminReward[],
  ): Promise<void> {
    const previous = rewards;
    const originalVisits =
      rewards.map(
        reward =>
          reward.requiredVisits,
      );

    const normalized =
      nextRewards.map(
        (reward, index) => ({
          ...reward,
          position: index,
          requiredVisits:
            originalVisits[index] ??
            reward.requiredVisits,
        }),
      );

    setRewards(normalized);

    try {
      setIsReordering(true);

      await reorderLoyaltyRewards(
        normalized.map(
          reward => reward.id,
        ),
      );
    } catch (error) {
      setRewards(previous);

      Alert.alert(
        'No se pudo reordenar',
        error instanceof Error
          ? error.message
          : 'No se pudo guardar el nuevo orden de los premios.',
      );
    } finally {
      setIsReordering(false);
      setDraggedRewardId(null);
    }
  }

  function handleRewardLayout(
    rewardId: string,
    event: LayoutChangeEvent,
  ): void {
    const {
      y,
      height,
    } = event.nativeEvent.layout;

    rewardLayouts.current[
      rewardId
    ] = {
      y,
      height,
    };
  }

  function handleDragStart(
    rewardId: string,
  ): void {
    if (
      isProcessing ||
      isReordering
    ) {
      return;
    }

    setDraggedRewardId(
      rewardId,
    );
  }

  function handleDragEnd(
    rewardId: string,
    offsetY: number,
  ): void {
    setDraggedRewardId(null);

    if (
      isProcessing ||
      isReordering ||
      Math.abs(offsetY) < 8
    ) {
      return;
    }

    const draggedLayout =
      rewardLayouts.current[
        rewardId
      ];

    if (!draggedLayout) {
      return;
    }

    const draggedCenter =
      draggedLayout.y +
      draggedLayout.height / 2 +
      offsetY;

    const remainingRewards =
      rewards.filter(
        reward =>
          reward.id !== rewardId,
      );

    let insertionIndex = 0;

    remainingRewards.forEach(
      reward => {
        const layout =
          rewardLayouts.current[
            reward.id
          ];

        if (!layout) {
          return;
        }

        const center =
          layout.y +
          layout.height / 2;

        if (
          draggedCenter > center
        ) {
          insertionIndex += 1;
        }
      },
    );

    const currentIndex =
      rewards.findIndex(
        reward =>
          reward.id === rewardId,
      );

    if (
      currentIndex < 0 ||
      insertionIndex === currentIndex
    ) {
      return;
    }

    const nextRewards =
      [...rewards];

    const [draggedReward] =
      nextRewards.splice(
        currentIndex,
        1,
      );

    nextRewards.splice(
      insertionIndex,
      0,
      draggedReward,
    );

    void persistRewardOrder(
      nextRewards,
    );
  }

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
        scrollEnabled={
          !draggedRewardId
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
          style={[
            styles.rewardsHeader,
            isPhone &&
            styles.rewardsHeaderPhone,
          ]}
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
              Arrastra los premios para cambiar su orden. Las visitas se intercambian con la posición.
            </Text>
          </View>

          <TouchableOpacity
            style={[
              styles.addButton,
              isPhone &&
              styles.addButtonPhone,
            ]}
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
                <SortableRewardCard
                  key={
                    reward.id
                  }
                  reward={
                    reward
                  }
                  isDisabled={
                    isProcessing ||
                    isReordering
                  }
                  isDragging={
                    draggedRewardId ===
                    reward.id
                  }
                  onLayout={
                    handleRewardLayout
                  }
                  onDragStart={
                    handleDragStart
                  }
                  onDragEnd={
                    handleDragEnd
                  }
                  onToggle={(
                    currentReward,
                    value,
                  ) => {
                    void handleToggleReward(
                      currentReward,
                      value,
                    );
                  }}
                  onEdit={
                    openEditModal
                  }
                />
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

              {visitsConflict ? (
                <View
                  style={
                    styles.warningBox
                  }
                >
                  <Text
                    style={
                      styles.warningText
                    }
                  >
                    ⚠ {rewardForm.requiredVisits} visita{rewardForm.requiredVisits === '1' ? '' : 's'} ya {rewardForm.requiredVisits === '1' ? 'está ligada' : 'están ligadas'} a "{visitsConflict.name}". Elige otro número.
                  </Text>
                </View>
              ) : null}

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
                    isProcessing ||
                    !!visitsConflict
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