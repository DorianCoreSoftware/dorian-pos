import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';

import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import {
  createModifier,
  getAllModifiers,
  setModifierAvailable,
  updateModifier,
} from '../../../services/modifierService';

import {
  Modifier,
} from '../../../types';

import {
  ModifierGroup,
} from '../../../repositories/ModifierRepository';

import {
  styles,
} from './AdminModifiers.styles';

type ModifierFilter =
  | 'all'
  | 'Carne'
  | 'Salsa'
  | 'Sabor';

interface ModifierFormState {
  name: string;
  extraPrice: string;
  groupName: ModifierGroup;
  isAvailable: boolean;
}

const INITIAL_FORM:
  ModifierFormState = {
  name: '',
  extraPrice: '0',
  groupName: 'Carne',
  isAvailable: true,
};

export function AdminModifiers() {
  const [
    modifiers,
    setModifiers,
  ] = useState<Modifier[]>([]);

  const [
    selectedModifier,
    setSelectedModifier,
  ] = useState<Modifier | null>(
    null,
  );

  const [
    form,
    setForm,
  ] = useState<ModifierFormState>(
    INITIAL_FORM,
  );

  const [
    activeFilter,
    setActiveFilter,
  ] = useState<ModifierFilter>(
    'all',
  );

  const [
    searchText,
    setSearchText,
  ] = useState('');

  const [
    showUnavailable,
    setShowUnavailable,
  ] = useState(true);

  const [
    isModalVisible,
    setIsModalVisible,
  ] = useState(false);

  const [
    isLoading,
    setIsLoading,
  ] = useState(true);

  const [
    isProcessing,
    setIsProcessing,
  ] = useState(false);

  const [
    errorMessage,
    setErrorMessage,
  ] = useState<string | null>(
    null,
  );

  const loadData =
    useCallback(
      async (): Promise<void> => {
        try {
          setIsLoading(true);
          setErrorMessage(null);

          const data =
            await getAllModifiers();

          setModifiers(
            data,
          );
        } catch (error) {
          console.error(
            'Error cargando modificadores administrativos:',
            error,
          );

          setErrorMessage(
            error instanceof Error
              ? error.message
              : 'No se pudieron cargar los modificadores.',
          );
        } finally {
          setIsLoading(false);
        }
      },
      [],
    );

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const visibleModifiers =
    useMemo(() => {
      const normalizedSearch =
        normalizeText(
          searchText,
        );

      return modifiers
        .filter(
          (modifier) => {
            if (
              !showUnavailable &&
              modifier.is_available ===
                false
            ) {
              return false;
            }

            if (
              activeFilter !==
                'all' &&
              modifier.group_name !==
                activeFilter
            ) {
              return false;
            }

            if (!normalizedSearch) {
              return true;
            }

            return normalizeText(
              modifier.name,
            ).includes(
              normalizedSearch,
            );
          },
        )
        .sort(
          (
            modifierA,
            modifierB,
          ) => {
            const groupComparison =
              String(
                modifierA.group_name ??
                  '',
              ).localeCompare(
                String(
                  modifierB.group_name ??
                    '',
                ),
                'es',
                {
                  sensitivity:
                    'base',
                },
              );

            if (
              groupComparison !==
              0
            ) {
              return groupComparison;
            }

            return modifierA.name.localeCompare(
              modifierB.name,
              'es',
              {
                sensitivity:
                  'base',
              },
            );
          },
        );
    }, [
      modifiers,
      activeFilter,
      searchText,
      showUnavailable,
    ]);

  const openCreateModal =
    (): void => {
      setSelectedModifier(
        null,
      );

      setForm(
        INITIAL_FORM,
      );

      setIsModalVisible(
        true,
      );
    };

  const openEditModal = (
    modifier: Modifier,
  ): void => {
    setSelectedModifier(
      modifier,
    );

    setForm({
      name:
        modifier.name,

      extraPrice:
        String(
          modifier.extra_price,
        ),

      groupName:
        modifier.group_name,

      isAvailable:
        modifier.is_available !==
        false,
    });

    setIsModalVisible(
      true,
    );
  };

  const closeModal =
    (): void => {
      if (isProcessing) {
        return;
      }

      setIsModalVisible(
        false,
      );

      setSelectedModifier(
        null,
      );

      setForm(
        INITIAL_FORM,
      );
    };

  const handleSave =
    async (): Promise<void> => {
      if (isProcessing) {
        return;
      }

      const cleanName =
        form.name.trim();

      const parsedExtraPrice =
        Number(
          form.extraPrice,
        );

      if (!cleanName) {
        Alert.alert(
          'Campo requerido',
          'Ingresa el nombre del modificador.',
        );

        return;
      }

      if (
        !Number.isFinite(
          parsedExtraPrice,
        ) ||
        parsedExtraPrice < 0
      ) {
        Alert.alert(
          'Precio inválido',
          'El precio extra no puede ser negativo.',
        );

        return;
      }

      try {
        setIsProcessing(true);

        if (
          selectedModifier
        ) {
          await updateModifier(
            selectedModifier.id,
            {
              name:
                cleanName,

              extraPrice:
                parsedExtraPrice,

              groupName:
                form.groupName,

              isAvailable:
                form.isAvailable,
            },
          );

          Alert.alert(
            'Modificador actualizado',
            `${cleanName} fue actualizado correctamente.`,
          );
        } else {
          await createModifier({
            name:
              cleanName,

            extraPrice:
              parsedExtraPrice,

            groupName:
              form.groupName,
          });

          Alert.alert(
            'Modificador creado',
            `${cleanName} fue agregado correctamente.`,
          );
        }

        setIsModalVisible(
          false,
        );

        setSelectedModifier(
          null,
        );

        setForm(
          INITIAL_FORM,
        );

        await loadData();
      } catch (error) {
        Alert.alert(
          'Error',
          error instanceof Error
            ? error.message
            : 'No se pudo guardar el modificador.',
        );
      } finally {
        setIsProcessing(false);
      }
    };

  const handleToggleAvailable = (
    modifier: Modifier,
  ): void => {
    const willActivate =
      modifier.is_available ===
      false;

    Alert.alert(
      willActivate
        ? 'Activar modificador'
        : 'Desactivar modificador',

      willActivate
        ? `¿Deseas volver a activar "${modifier.name}"?`
        : `¿Deseas desactivar "${modifier.name}"? Ya no estará disponible para nuevos pedidos.`,

      [
        {
          text: 'Cancelar',
          style: 'cancel',
        },

        {
          text:
            willActivate
              ? 'Activar'
              : 'Desactivar',

          style:
            willActivate
              ? 'default'
              : 'destructive',

          onPress: () => {
            void executeToggleAvailable(
              modifier,
              willActivate,
            );
          },
        },
      ],
    );
  };

  const executeToggleAvailable =
    async (
      modifier: Modifier,
      isAvailable: boolean,
    ): Promise<void> => {
      try {
        setIsProcessing(true);

        await setModifierAvailable(
          modifier.id,
          isAvailable,
        );

        await loadData();
      } catch (error) {
        Alert.alert(
          'Error',
          error instanceof Error
            ? error.message
            : 'No se pudo cambiar el estado del modificador.',
        );
      } finally {
        setIsProcessing(false);
      }
    };

  const renderModifier = ({
    item,
  }: {
    item: Modifier;
  }) => {
    const isAvailable =
      item.is_available !==
      false;

    return (
      <View
        style={[
          styles.modifierCard,

          !isAvailable &&
            styles.modifierCardInactive,
        ]}
      >
        <View
          style={
            styles.modifierInfo
          }
        >
          <View
            style={
              styles.modifierTitleRow
            }
          >
            <Text
              style={
                styles.modifierName
              }
            >
              {item.name}
            </Text>

            <View
              style={[
                styles.groupBadge,

                item.group_name ===
                  'Carne'
                  ? styles.groupBadgeMeat
                  : item.group_name ===
                      'Salsa'
                    ? styles.groupBadgeSauce
                    : item.group_name ===
                        'Sabor'
                      ? styles.groupBadgeFlavor
                      : styles.groupBadgeOther,
              ]}
            >
              <Text
                style={
                  styles.groupBadgeText
                }
              >
                {item.group_name ??
                  'Otro'}
              </Text>
            </View>

            <View
              style={[
                styles.statusBadge,

                isAvailable
                  ? styles.statusBadgeActive
                  : styles.statusBadgeInactive,
              ]}
            >
              <Text
                style={[
                  styles.statusText,

                  isAvailable
                    ? styles.statusTextActive
                    : styles.statusTextInactive,
                ]}
              >
                {isAvailable
                  ? 'DISPONIBLE'
                  : 'INACTIVO'}
              </Text>
            </View>
          </View>

          <Text
            style={
              styles.extraPriceText
            }
          >
            Precio extra: $
            {Number(
              item.extra_price,
            ).toFixed(2)}
          </Text>
        </View>

        <View
          style={
            styles.modifierActions
          }
        >
          <TouchableOpacity
            style={
              styles.editButton
            }
            onPress={() =>
              openEditModal(
                item,
              )
            }
          >
            <Text
              style={
                styles.editButtonText
              }
            >
              Editar
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.stateButton,

              isAvailable
                ? styles.deactivateButton
                : styles.activateButton,
            ]}
            disabled={
              isProcessing
            }
            onPress={() =>
              handleToggleAvailable(
                item,
              )
            }
          >
            <Text
              style={
                styles.stateButtonText
              }
            >
              {isAvailable
                ? 'Desactivar'
                : 'Activar'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  if (isLoading) {
    return (
      <View
        style={
          styles.centerContainer
        }
      >
        <ActivityIndicator
          size="large"
          color="#FFBF00"
        />

        <Text
          style={
            styles.loadingText
          }
        >
          Cargando modificadores...
        </Text>
      </View>
    );
  }

  if (errorMessage) {
    return (
      <View
        style={
          styles.centerContainer
        }
      >
        <Text
          style={
            styles.errorTitle
          }
        >
          ⚠️ Error
        </Text>

        <Text
          style={
            styles.errorMessage
          }
        >
          {errorMessage}
        </Text>

        <TouchableOpacity
          style={
            styles.retryButton
          }
          onPress={() => {
            void loadData();
          }}
        >
          <Text
            style={
              styles.retryButtonText
            }
          >
            Reintentar
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View
      style={
        styles.container
      }
    >
      <View
        style={
          styles.toolbar
        }
      >
        <View
          style={
            styles.searchContainer
          }
        >
          <Text
            style={
              styles.searchIcon
            }
          >
            🔎
          </Text>

          <TextInput
            value={
              searchText
            }
            onChangeText={
              setSearchText
            }
            style={
              styles.searchInput
            }
            placeholder="Buscar modificador..."
            placeholderTextColor="#777777"
            autoCorrect={false}
          />

          {searchText ? (
            <TouchableOpacity
              onPress={() =>
                setSearchText('')
              }
            >
              <Text
                style={
                  styles.clearSearchText
                }
              >
                ✕
              </Text>
            </TouchableOpacity>
          ) : null}
        </View>

        <View
          style={
            styles.unavailableFilter
          }
        >
          <Text
            style={
              styles.unavailableFilterText
            }
          >
            Mostrar inactivos
          </Text>

          <Switch
            value={
              showUnavailable
            }
            onValueChange={
              setShowUnavailable
            }
          />
        </View>

        <TouchableOpacity
          style={
            styles.createButton
          }
          onPress={
            openCreateModal
          }
        >
          <Text
            style={
              styles.createButtonText
            }
          >
            + Nuevo modificador
          </Text>
        </TouchableOpacity>
      </View>

      <View
        style={
          styles.filterTabs
        }
      >
        {(
          [
            ['all', 'TODOS'],
            ['Carne', 'CARNES'],
            ['Salsa', 'SALSAS'],
            ['Sabor', 'SABORES'],
          ] as Array<
            [
              ModifierFilter,
              string,
            ]
          >
        ).map(
          ([
            value,
            label,
          ]) => {
            const selected =
              activeFilter ===
              value;

            return (
              <TouchableOpacity
                key={value}
                style={[
                  styles.filterButton,

                  selected &&
                    styles.filterButtonActive,
                ]}
                onPress={() =>
                  setActiveFilter(
                    value,
                  )
                }
              >
                <Text
                  style={[
                    styles.filterButtonText,

                    selected &&
                      styles.filterButtonTextActive,
                  ]}
                >
                  {label}
                </Text>
              </TouchableOpacity>
            );
          },
        )}
      </View>

      <View
        style={
          styles.listHeader
        }
      >
        <Text
          style={
            styles.listTitle
          }
        >
          Modificadores
        </Text>

        <Text
          style={
            styles.modifierCount
          }
        >
          {
            visibleModifiers.length
          }{' '}
          {visibleModifiers.length ===
          1
            ? 'modificador'
            : 'modificadores'}
        </Text>
      </View>

      {visibleModifiers.length ===
      0 ? (
        <View
          style={
            styles.emptyContainer
          }
        >
          <Text
            style={
              styles.emptyIcon
            }
          >
            🧂
          </Text>

          <Text
            style={
              styles.emptyTitle
            }
          >
            No hay modificadores
          </Text>

          <Text
            style={
              styles.emptyText
            }
          >
            Cambia los filtros o
            agrega un nuevo modificador.
          </Text>
        </View>
      ) : (
        <FlatList
          data={
            visibleModifiers
          }
          keyExtractor={
            (item) =>
              item.id
          }
          renderItem={
            renderModifier
          }
          contentContainerStyle={
            styles.listContent
          }
          showsVerticalScrollIndicator={
            false
          }
        />
      )}

      <Modal
        visible={
          isModalVisible
        }
        transparent
        animationType="fade"
        onRequestClose={
          closeModal
        }
      >
        <View
          style={
            styles.modalOverlay
          }
        >
          <View
            style={
              styles.modalContent
            }
          >
            <Text
              style={
                styles.modalTitle
              }
            >
              {selectedModifier
                ? 'Editar modificador'
                : 'Nuevo modificador'}
            </Text>

            <Text
              style={
                styles.inputLabel
              }
            >
              Nombre
            </Text>

            <TextInput
              value={
                form.name
              }
              onChangeText={(
                value,
              ) =>
                setForm(
                  (
                    current,
                  ) => ({
                    ...current,
                    name: value,
                  }),
                )
              }
              style={
                styles.input
              }
              placeholder="Ej. Carne extra"
              placeholderTextColor="#777777"
              editable={
                !isProcessing
              }
            />

            <Text
              style={
                styles.inputLabel
              }
            >
              Precio extra
            </Text>

            <TextInput
              value={
                form.extraPrice
              }
              onChangeText={(
                value,
              ) =>
                setForm(
                  (
                    current,
                  ) => ({
                    ...current,

                    extraPrice:
                      sanitizeMoney(
                        value,
                      ),
                  }),
                )
              }
              style={
                styles.input
              }
              keyboardType="decimal-pad"
              placeholder="0.00"
              placeholderTextColor="#777777"
              editable={
                !isProcessing
              }
            />

            <Text
              style={
                styles.inputLabel
              }
            >
              Grupo
            </Text>

            <View
              style={
                styles.groupsContainer
              }
            >
              {(
                [
                  'Carne',
                  'Salsa',
                  'Sabor',
                ] as ModifierGroup[]
              ).map(
                (group) => {
                  const selected =
                    form.groupName ===
                    group;

                  return (
                    <TouchableOpacity
                      key={
                        group ??
                        'other'
                      }
                      style={[
                        styles.groupButton,

                        selected &&
                          styles.groupButtonSelected,
                      ]}
                      onPress={() =>
                        setForm(
                          (
                            current,
                          ) => ({
                            ...current,

                            groupName:
                              group,
                          }),
                        )
                      }
                    >
                      <Text
                        style={[
                          styles.groupButtonText,

                          selected &&
                            styles.groupButtonTextSelected,
                        ]}
                      >
                        {group}
                      </Text>
                    </TouchableOpacity>
                  );
                },
              )}
            </View>

            {selectedModifier ? (
              <View
                style={
                  styles.availableRow
                }
              >
                <View>
                  <Text
                    style={
                      styles.availableTitle
                    }
                  >
                    Disponible
                  </Text>

                  <Text
                    style={
                      styles.availableSubtitle
                    }
                  >
                    Define si puede usarse
                    en nuevos pedidos.
                  </Text>
                </View>

                <Switch
                  value={
                    form.isAvailable
                  }
                  onValueChange={(
                    value,
                  ) =>
                    setForm(
                      (
                        current,
                      ) => ({
                        ...current,

                        isAvailable:
                          value,
                      }),
                    )
                  }
                />
              </View>
            ) : null}

            <View
              style={
                styles.modalActions
              }
            >
              <TouchableOpacity
                style={[
                  styles.modalButton,
                  styles.cancelButton,
                ]}
                disabled={
                  isProcessing
                }
                onPress={
                  closeModal
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
                style={[
                  styles.modalButton,
                  styles.saveButton,

                  isProcessing &&
                    styles.buttonDisabled,
                ]}
                disabled={
                  isProcessing
                }
                onPress={() => {
                  void handleSave();
                }}
              >
                {isProcessing ? (
                  <ActivityIndicator
                    size="small"
                    color="#171717"
                  />
                ) : (
                  <Text
                    style={
                      styles.saveButtonText
                    }
                  >
                    {selectedModifier
                      ? 'Guardar cambios'
                      : 'Crear modificador'}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function normalizeText(
  value:
    | string
    | null
    | undefined,
): string {
  return (
    value ?? ''
  )
    .normalize('NFD')
    .replace(
      /[\u0300-\u036f]/g,
      '',
    )
    .trim()
    .toLocaleLowerCase(
      'es',
    );
}

function sanitizeMoney(
  value: string,
): string {
  const sanitized =
    value
      .replace(',', '.')
      .replace(
        /[^0-9.]/g,
        '',
      );

  const parts =
    sanitized.split('.');

  if (parts.length > 2) {
    return value;
  }

  if (
    parts[1] &&
    parts[1].length > 2
  ) {
    return value;
  }

  return sanitized;
}