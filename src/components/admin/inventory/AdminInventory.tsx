import React, {
  useCallback,
  useEffect,
  useMemo,
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

import { useBusiness } from '../../../context/BusinessContext';

import {
  useSafeAreaInsets,
} from 'react-native-safe-area-context';

import {
  createInventoryItem,
  getInventoryItems,
  getInventoryMovements,
  InventoryBaseUnit,
  InventoryItem,
  InventoryMovement,
  RegisterInventoryMovementInput,
  registerInventoryMovement,
  setInventoryItemActive,
  updateInventoryItem,
  setInventoryItemCost,
} from '../../../services/inventoryService';

import {
  InventoryCostingSettingsCard,
} from './InventoryCostingSettingsCard';

import {
  setBrandPrimaryColor,
  styles,
} from './AdminInventory.styles';

interface ItemFormState {
  sku: string;
  name: string;
  baseUnit: InventoryBaseUnit;
  initialStock: string;
  minimumStock: string;
  notes: string;
  purchaseCost: string;
  purchaseBaseQuantity: string;
}

interface MovementFormState {
  movementType:
    RegisterInventoryMovementInput['movementType'];
  quantity: string;
  reason: string;
}

const INITIAL_ITEM_FORM:
  ItemFormState = {
    sku: '',
    name: '',
    baseUnit: 'piece',
    initialStock: '0',
    minimumStock: '0',
    notes: '',
    purchaseCost: '0',
    purchaseBaseQuantity: '1',
  };

const INITIAL_MOVEMENT_FORM:
  MovementFormState = {
    movementType: 'entry',
    quantity: '',
    reason: '',
  };

const UNIT_LABELS:
  Record<
    InventoryBaseUnit,
    string
  > = {
    g: 'g',
    ml: 'ml',
    piece: 'pza',
  };

const MOVEMENT_LABELS:
  Record<
    InventoryMovement['movementType'],
    string
  > = {
    initial: 'Existencia inicial',
    entry: 'Entrada',
    exit: 'Salida',
    adjustment: 'Ajuste',
    waste: 'Merma',
    sale: 'Venta',
    purchase_reversal: 'Reversa compra',
  };

function formatQuantity(
  value: number,
  unit: InventoryBaseUnit,
): string {
  const decimals =
    Number.isInteger(value)
      ? 0
      : 3;

  return `${value.toLocaleString(
    'es-MX',
    {
      minimumFractionDigits: 0,
      maximumFractionDigits: decimals,
    },
  )} ${UNIT_LABELS[unit]}`;
}

function formatDateTime(
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

  return date.toLocaleString(
    'es-MX',
    {
      dateStyle: 'short',
      timeStyle: 'short',
    },
  );
}

export function AdminInventory() {
  const {
    theme,
  } = useBusiness();

  setBrandPrimaryColor(
    theme.primary,
  );

  const {
    width,
    height:
      windowHeight,
  } =
    useWindowDimensions();

  const insets =
    useSafeAreaInsets();

  const isPhone =
    width < 700;

  const [
    items,
    setItems,
  ] =
    useState<InventoryItem[]>(
      [],
    );

  const [
    movements,
    setMovements,
  ] =
    useState<InventoryMovement[]>(
      [],
    );

  const [
    searchText,
    setSearchText,
  ] =
    useState('');

  const [
    showInactive,
    setShowInactive,
  ] =
    useState(true);

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
    itemModalVisible,
    setItemModalVisible,
  ] =
    useState(false);

  const [
    movementModalVisible,
    setMovementModalVisible,
  ] =
    useState(false);

  const [
    selectedItem,
    setSelectedItem,
  ] =
    useState<InventoryItem | null>(
      null,
    );

  const [
    itemForm,
    setItemForm,
  ] =
    useState<ItemFormState>({
      ...INITIAL_ITEM_FORM,
    });

  const [
    movementForm,
    setMovementForm,
  ] =
    useState<MovementFormState>({
      ...INITIAL_MOVEMENT_FORM,
    });

  const loadData =
    useCallback(
      async (): Promise<void> => {
        try {
          setIsLoading(true);
          setErrorMessage(null);

          const [
            loadedItems,
            loadedMovements,
          ] =
            await Promise.all([
              getInventoryItems(),
              getInventoryMovements(
                100,
              ),
            ]);

          setItems(
            loadedItems,
          );

          setMovements(
            loadedMovements,
          );
        } catch (
          error
        ) {
          console.error(
            'Error cargando inventario:',
            error,
          );

          setErrorMessage(
            error instanceof Error
              ? error.message
              : 'No se pudo cargar el inventario.',
          );
        } finally {
          setIsLoading(false);
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

  const visibleItems =
    useMemo(
      () => {
        const query =
          searchText
            .trim()
            .toLocaleLowerCase(
              'es-MX',
            );

        return items.filter(
          item => {
            if (
              !showInactive &&
              !item.isActive
            ) {
              return false;
            }

            if (!query) {
              return true;
            }

            return (
              item.name
                .toLocaleLowerCase(
                  'es-MX',
                )
                .includes(query) ||
              (
                item.sku ??
                ''
              )
                .toLocaleLowerCase(
                  'es-MX',
                )
                .includes(query)
            );
          },
        );
      },
      [
        items,
        searchText,
        showInactive,
      ],
    );

  const activeCount =
    items.filter(
      item =>
        item.isActive,
    ).length;

  const lowStockCount =
    items.filter(
      item =>
        item.isActive &&
        item.currentStock <=
        item.minimumStock,
    ).length;

  function openCreateItem():
    void {
    setSelectedItem(null);

    setItemForm({
      ...INITIAL_ITEM_FORM,
    });

    setItemModalVisible(
      true,
    );
  }

  function openEditItem(
    item: InventoryItem,
  ): void {
    setSelectedItem(
      item,
    );

    setItemForm({
      sku:
        item.sku ?? '',
      name:
        item.name,
      baseUnit:
        item.baseUnit,
      initialStock:
        String(
          item.currentStock,
        ),
      minimumStock:
        String(
          item.minimumStock,
        ),
      notes:
        item.notes,
      purchaseCost:
        String(
          item.purchaseCost,
        ),
      purchaseBaseQuantity:
        String(
          item.purchaseBaseQuantity,
        ),
    });

    setItemModalVisible(
      true,
    );
  }

  function closeItemModal():
    void {
    if (isProcessing) {
      return;
    }

    setItemModalVisible(
      false,
    );

    setSelectedItem(
      null,
    );

    setItemForm({
      ...INITIAL_ITEM_FORM,
    });
  }

  function openMovement(
    item: InventoryItem,
  ): void {
    setSelectedItem(
      item,
    );

    setMovementForm({
      ...INITIAL_MOVEMENT_FORM,
    });

    setMovementModalVisible(
      true,
    );
  }

  function closeMovementModal():
    void {
    if (isProcessing) {
      return;
    }

    setMovementModalVisible(
      false,
    );

    setSelectedItem(
      null,
    );

    setMovementForm({
      ...INITIAL_MOVEMENT_FORM,
    });
  }

  const livePurchaseCost =
    Number(
      itemForm.purchaseCost,
    );

  const livePurchaseBaseQuantity =
    Number(
      itemForm.purchaseBaseQuantity,
    );

  const liveUnitCost =
    Number.isFinite(
      livePurchaseCost,
    ) &&
    livePurchaseCost >= 0 &&
    Number.isFinite(
      livePurchaseBaseQuantity,
    ) &&
    livePurchaseBaseQuantity > 0
      ? livePurchaseCost /
        livePurchaseBaseQuantity
      : null;

  const unitFormLabel =
    UNIT_LABELS[
      itemForm.baseUnit
    ];

  async function handleSaveItem():
    Promise<void> {
    if (isProcessing) {
      return;
    }

    const initialStock =
      Number(
        itemForm.initialStock,
      );

    const minimumStock =
      Number(
        itemForm.minimumStock,
      );

    const purchaseCost =
      Number(
        itemForm.purchaseCost,
      );

    const purchaseBaseQuantity =
      Number(
        itemForm.purchaseBaseQuantity,
      );

    if (
      !itemForm.name.trim()
    ) {
      Alert.alert(
        'Nombre requerido',
        'Ingresa el nombre del insumo.',
      );

      return;
    }

    if (
      !Number.isFinite(
        minimumStock,
      ) ||
      minimumStock < 0
    ) {
      Alert.alert(
        'Stock mínimo inválido',
        'Ingresa un stock mínimo igual o mayor a 0.',
      );

      return;
    }

    if (
      !Number.isFinite(
        purchaseCost,
      ) ||
      purchaseCost < 0 ||
      !Number.isFinite(
        purchaseBaseQuantity,
      ) ||
      purchaseBaseQuantity <= 0
    ) {
      Alert.alert(
        'Costo inválido',
        'Revisa el costo de compra y el contenido de la presentación.',
      );

      return;
    }

    if (
      !selectedItem &&
      (
        !Number.isFinite(
          initialStock,
        ) ||
        initialStock < 0
      )
    ) {
      Alert.alert(
        'Existencia inicial inválida',
        'Ingresa una existencia inicial igual o mayor a 0.',
      );

      return;
    }

    try {
      setIsProcessing(
        true,
      );

      let savedItemId:
        string;

      if (selectedItem) {
        savedItemId =
          selectedItem.id;

        await updateInventoryItem(
          selectedItem.id,
          {
            sku:
              itemForm.sku,
            name:
              itemForm.name,
            baseUnit:
              itemForm.baseUnit,
            minimumStock,
            notes:
              itemForm.notes,
          },
        );
      } else {
        savedItemId =
          await createInventoryItem({
            sku:
              itemForm.sku,
            name:
              itemForm.name,
            baseUnit:
              itemForm.baseUnit,
            initialStock,
            minimumStock,
            notes:
              itemForm.notes,
          });
      }

      await setInventoryItemCost(
        savedItemId,
        purchaseCost,
        purchaseBaseQuantity,
        selectedItem
          ? 'Actualización manual de costo'
          : 'Costo inicial del insumo',
      );

      closeItemModal();

      await loadData();
    } catch (
      error
    ) {
      Alert.alert(
        'Error',
        error instanceof Error
          ? error.message
          : 'No se pudo guardar el insumo.',
      );
    } finally {
      setIsProcessing(
        false,
      );
    }
  }

  async function handleMovement():
    Promise<void> {
    if (
      isProcessing ||
      !selectedItem
    ) {
      return;
    }

    const quantity =
      Number(
        movementForm.quantity,
      );

    if (
      !Number.isFinite(
        quantity,
      ) ||
      quantity === 0 ||
      (
        movementForm
          .movementType !==
          'adjustment' &&
        quantity < 0
      )
    ) {
      Alert.alert(
        'Cantidad inválida',
        movementForm
          .movementType ===
          'adjustment'
          ? 'El ajuste debe ser distinto de 0. Usa un valor positivo para aumentar o negativo para reducir.'
          : 'Ingresa una cantidad mayor a 0.',
      );

      return;
    }

    if (
      !movementForm.reason
        .trim()
    ) {
      Alert.alert(
        'Motivo requerido',
        'Escribe por qué se realiza este movimiento.',
      );

      return;
    }

    try {
      setIsProcessing(
        true,
      );

      await registerInventoryMovement({
        inventoryItemId:
          selectedItem.id,
        movementType:
          movementForm
            .movementType,
        quantity,
        reason:
          movementForm.reason,
      });

      closeMovementModal();

      await loadData();
    } catch (
      error
    ) {
      Alert.alert(
        'Error',
        error instanceof Error
          ? error.message
          : 'No se pudo registrar el movimiento.',
      );
    } finally {
      setIsProcessing(
        false,
      );
    }
  }

  function confirmToggle(
    item: InventoryItem,
  ): void {
    const next =
      !item.isActive;

    Alert.alert(
      next
        ? 'Activar insumo'
        : 'Desactivar insumo',
      next
        ? `¿Deseas activar "${item.name}"?`
        : `¿Deseas desactivar "${item.name}"? El historial se conservará.`,
      [
        {
          text: 'Cancelar',
          style: 'cancel',
        },
        {
          text:
            next
              ? 'Activar'
              : 'Desactivar',
          style:
            next
              ? 'default'
              : 'destructive',
          onPress:
            () => {
              void (async () => {
                try {
                  setIsProcessing(
                    true,
                  );

                  await setInventoryItemActive(
                    item.id,
                    next,
                  );

                  await loadData();
                } catch (
                  error
                ) {
                  Alert.alert(
                    'Error',
                    error instanceof Error
                      ? error.message
                      : 'No se pudo cambiar el estado del insumo.',
                  );
                } finally {
                  setIsProcessing(
                    false,
                  );
                }
              })();
            },
        },
      ],
    );
  }

  if (isLoading) {
    return (
      <View
        style={
          styles.centerContainer
        }
      >
        <ActivityIndicator
          size="large"
          color={
            theme.primary
          }
        />

        <Text
          style={
            styles.loadingText
          }
        >
          Cargando inventario...
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
          ⚠️ Inventario
        </Text>

        <Text
          style={
            styles.errorText
          }
        >
          {errorMessage}
        </Text>

        <TouchableOpacity
          style={
            styles.primaryButton
          }
          onPress={
            () => {
              void loadData();
            }
          }
        >
          <Text
            style={
              styles.primaryButtonText
            }
          >
            Reintentar
          </Text>
        </TouchableOpacity>
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
          styles.content
        }
        showsVerticalScrollIndicator={
          false
        }
        keyboardShouldPersistTaps="handled"
      >
        <View
          style={
            styles.header
          }
        >
          <View
            style={
              styles.headerText
            }
          >
            <Text
              style={
                styles.title
              }
            >
              Inventario e insumos
            </Text>

            <Text
              style={
                styles.subtitle
              }
            >
              Controla existencias mediante movimientos auditables. Las recetas y el descuento automático por venta se agregarán en la siguiente fase.
            </Text>
          </View>

          <TouchableOpacity
            style={[
              styles.primaryButton,
              isProcessing &&
              styles.disabled,
            ]}
            disabled={
              isProcessing
            }
            onPress={
              openCreateItem
            }
          >
            <Text
              style={
                styles.primaryButtonText
              }
            >
              + Nuevo insumo
            </Text>
          </TouchableOpacity>
        </View>

        <View
          style={
            styles.statsRow
          }
        >
          <View
            style={
              styles.statCard
            }
          >
            <Text
              style={
                styles.statLabel
              }
            >
              Insumos activos
            </Text>

            <Text
              style={
                styles.statValue
              }
            >
              {activeCount}
            </Text>
          </View>

          <View
            style={
              styles.statCard
            }
          >
            <Text
              style={
                styles.statLabel
              }
            >
              Stock bajo
            </Text>

            <Text
              style={[
                styles.statValue,
                lowStockCount >
                  0 &&
                styles.lowStatValue,
              ]}
            >
              {lowStockCount}
            </Text>
          </View>

          <View
            style={
              styles.statCard
            }
          >
            <Text
              style={
                styles.statLabel
              }
            >
              Movimientos recientes
            </Text>

            <Text
              style={
                styles.statValue
              }
            >
              {movements.length}
            </Text>
          </View>
        </View>

        <InventoryCostingSettingsCard />

        <View
          style={[
            styles.toolbar,
            isPhone &&
            styles.toolbarPhone,
          ]}
        >
          <TextInput
            style={
              styles.searchInput
            }
            value={
              searchText
            }
            placeholder="Buscar por nombre o SKU..."
            placeholderTextColor="#777777"
            onChangeText={
              setSearchText
            }
          />

          <View
            style={
              styles.switchRow
            }
          >
            <Text
              style={
                styles.switchText
              }
            >
              Mostrar inactivos
            </Text>

            <Switch
              value={
                showInactive
              }
              onValueChange={
                setShowInactive
              }
            />
          </View>
        </View>

        <Text
          style={
            styles.sectionTitle
          }
        >
          Insumos
        </Text>

        {visibleItems.length ===
          0 ? (
          <View
            style={
              styles.emptyBox
            }
          >
            <Text
              style={
                styles.emptyTitle
              }
            >
              No hay insumos
            </Text>

            <Text
              style={
                styles.emptyText
              }
            >
              Crea tu primer insumo para comenzar a controlar existencias.
            </Text>
          </View>
        ) : (
          visibleItems.map(
            item => {
              const lowStock =
                item.currentStock <=
                item.minimumStock;

              return (
                <View
                  key={
                    item.id
                  }
                  style={[
                    styles.itemCard,
                    !item.isActive &&
                    styles.itemInactive,
                  ]}
                >
                  <View
                    style={
                      styles.itemHeader
                    }
                  >
                    <View
                      style={
                        styles.itemInfo
                      }
                    >
                      <Text
                        style={
                          styles.itemName
                        }
                      >
                        {item.name}
                      </Text>

                      {!!item.sku && (
                        <Text
                          style={
                            styles.itemSku
                          }
                        >
                          SKU: {item.sku}
                        </Text>
                      )}

                      <View
                        style={
                          styles.badgeRow
                        }
                      >
                        <View
                          style={[
                            styles.badge,
                            item.isActive
                              ? styles.activeBadge
                              : styles.inactiveBadge,
                          ]}
                        >
                          <Text
                            style={
                              styles.badgeText
                            }
                          >
                            {item.isActive
                              ? 'ACTIVO'
                              : 'INACTIVO'}
                          </Text>
                        </View>

                        {lowStock &&
                          item.isActive && (
                            <View
                              style={[
                                styles.badge,
                                styles.lowBadge,
                              ]}
                            >
                              <Text
                                style={
                                  styles.badgeText
                                }
                              >
                                STOCK BAJO
                              </Text>
                            </View>
                          )}
                      </View>
                    </View>

                    <View
                      style={
                        styles.stockBlock
                      }
                    >
                      <Text
                        style={[
                          styles.stockValue,
                          lowStock &&
                          styles.stockLow,
                        ]}
                      >
                        {formatQuantity(
                          item.currentStock,
                          item.baseUnit,
                        )}
                      </Text>

                      <Text
                        style={
                          styles.stockMin
                        }
                      >
                        mínimo{' '}
                        {formatQuantity(
                          item.minimumStock,
                          item.baseUnit,
                        )}
                      </Text>

                      <Text
                        style={
                          styles.stockCost
                        }
                      >
                        costo {item.unitCost.toLocaleString(
                          'es-MX',
                          {
                            style:
                              'currency',
                            currency:
                              'MXN',
                            minimumFractionDigits:
                              2,
                            maximumFractionDigits:
                              4,
                          },
                        )}/{UNIT_LABELS[
                          item.baseUnit
                        ]}
                      </Text>
                    </View>
                  </View>

                  {!!item.notes && (
                    <Text
                      style={
                        styles.itemNotes
                      }
                    >
                      {item.notes}
                    </Text>
                  )}

                  <View
                    style={
                      styles.actionRow
                    }
                  >
                    <TouchableOpacity
                      style={[
                        styles.secondaryButton,
                        styles.movementButton,
                      ]}
                      disabled={
                        isProcessing ||
                        !item.isActive
                      }
                      onPress={
                        () =>
                          openMovement(
                            item,
                          )
                      }
                    >
                      <Text
                        style={[
                          styles.secondaryButtonText,
                          styles.movementButtonText,
                        ]}
                      >
                        Movimiento
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={
                        styles.secondaryButton
                      }
                      disabled={
                        isProcessing
                      }
                      onPress={
                        () =>
                          openEditItem(
                            item,
                          )
                      }
                    >
                      <Text
                        style={
                          styles.secondaryButtonText
                        }
                      >
                        Editar
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[
                        styles.secondaryButton,
                        item.isActive
                          ? styles.dangerButton
                          : styles.activateButton,
                      ]}
                      disabled={
                        isProcessing
                      }
                      onPress={
                        () =>
                          confirmToggle(
                            item,
                          )
                      }
                    >
                      <Text
                        style={[
                          styles.secondaryButtonText,
                          item.isActive
                            ? styles.dangerButtonText
                            : styles.activateButtonText,
                        ]}
                      >
                        {item.isActive
                          ? 'Desactivar'
                          : 'Activar'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            },
          )
        )}

        <Text
          style={
            styles.sectionTitle
          }
        >
          Historial reciente
        </Text>

        {movements.length ===
          0 ? (
          <View
            style={
              styles.emptyBox
            }
          >
            <Text
              style={
                styles.emptyTitle
              }
            >
              Sin movimientos
            </Text>

            <Text
              style={
                styles.emptyText
              }
            >
              Los cambios de existencia aparecerán aquí.
            </Text>
          </View>
        ) : (
          movements.map(
            movement => (
              <View
                key={
                  movement.id
                }
                style={
                  styles.historyCard
                }
              >
                <View
                  style={
                    styles.historyTop
                  }
                >
                  <Text
                    style={
                      styles.historyItem
                    }
                  >
                    {movement.itemName} ·{' '}
                    {MOVEMENT_LABELS[
                      movement.movementType
                    ]}
                  </Text>

                  <Text
                    style={[
                      styles.historyDelta,
                      movement.quantityDelta >
                        0
                        ? styles.positive
                        : styles.negative,
                    ]}
                  >
                    {movement.quantityDelta >
                      0
                      ? '+'
                      : ''}
                    {formatQuantity(
                      movement.quantityDelta,
                      movement.baseUnit,
                    )}
                  </Text>
                </View>

                <Text
                  style={
                    styles.historyMeta
                  }
                >
                  {formatQuantity(
                    movement.stockBefore,
                    movement.baseUnit,
                  )}{' → '}
                  {formatQuantity(
                    movement.stockAfter,
                    movement.baseUnit,
                  )}{' · '}
                  {movement.reason}{' · '}
                  {movement.createdByName ??
                    'Usuario'}{' · '}
                  {formatDateTime(
                    movement.createdAt,
                  )}
                </Text>
              </View>
            ),
          )
        )}
      </ScrollView>

      <Modal
        transparent
        visible={
          itemModalVisible
        }
        animationType="fade"
        onRequestClose={
          closeItemModal
        }
      >
        <View
          style={[
            styles.modalOverlay,
            {
              paddingTop:
                Math.max(
                  12,
                  insets.top + 6,
                ),
              paddingBottom:
                Math.max(
                  12,
                  insets.bottom + 8,
                ),
            },
          ]}
        >
          <View
            style={[
              styles.modalCard,
              {
                height:
                  Math.max(
                    360,
                    windowHeight -
                    Math.max(
                      24,
                      insets.top +
                      insets.bottom +
                      28,
                    ),
                  ),
              },
            ]}
          >
            <View
              style={
                styles.modalHeader
              }
            >
              <Text
                style={
                  styles.modalTitle
                }
              >
                {selectedItem
                  ? 'Editar insumo'
                  : 'Nuevo insumo'}
              </Text>

              <Text
                style={
                  styles.modalSubtitle
                }
              >
                Define cómo compras y controlas este insumo. El costo por {unitFormLabel} se calcula automáticamente.
              </Text>
            </View>

            <ScrollView
              style={
                styles.modalBodyScroll
              }
              contentContainerStyle={
                styles.modalBodyContent
              }
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator
            >

            <Text
              style={
                styles.label
              }
            >
              Nombre
            </Text>

            <TextInput
              style={
                styles.input
              }
              value={
                itemForm.name
              }
              placeholder="Ej. Diezmillo"
              placeholderTextColor="#777777"
              maxLength={100}
              onChangeText={
                value =>
                  setItemForm(
                    current => ({
                      ...current,
                      name: value,
                    }),
                  )
              }
            />

            <Text
              style={
                styles.label
              }
            >
              SKU / código (opcional)
            </Text>

            <TextInput
              style={
                styles.input
              }
              value={
                itemForm.sku
              }
              placeholder="Ej. CARNE-DIEZ"
              placeholderTextColor="#777777"
              maxLength={50}
              autoCapitalize="characters"
              onChangeText={
                value =>
                  setItemForm(
                    current => ({
                      ...current,
                      sku: value,
                    }),
                  )
              }
            />

            <Text
              style={
                styles.label
              }
            >
              Unidad base
            </Text>

            <View
              style={
                styles.unitRow
              }
            >
              {(
                [
                  'g',
                  'ml',
                  'piece',
                ] as InventoryBaseUnit[]
              ).map(
                unit => {
                  const selected =
                    itemForm.baseUnit ===
                    unit;

                  return (
                    <TouchableOpacity
                      key={
                        unit
                      }
                      style={[
                        styles.optionButton,
                        selected &&
                        styles.optionButtonSelected,
                      ]}
                      onPress={
                        () =>
                          setItemForm(
                            current => ({
                              ...current,
                              baseUnit:
                                unit,
                            }),
                          )
                      }
                    >
                      <Text
                        style={[
                          styles.optionText,
                          selected &&
                          styles.optionTextSelected,
                        ]}
                      >
                        {unit === 'g'
                          ? 'Gramos'
                          : unit === 'ml'
                            ? 'Mililitros'
                            : 'Piezas'}
                      </Text>
                    </TouchableOpacity>
                  );
                },
              )}
            </View>

            {!selectedItem && (
              <>
                <Text
                  style={
                    styles.label
                  }
                >
                  Existencia inicial
                </Text>

                <TextInput
                  style={
                    styles.input
                  }
                  value={
                    itemForm.initialStock
                  }
                  keyboardType="decimal-pad"
                  placeholder="0"
                  placeholderTextColor="#777777"
                  onChangeText={
                    value =>
                      setItemForm(
                        current => ({
                          ...current,
                          initialStock:
                            value.replace(
                              ',',
                              '.',
                            ),
                        }),
                      )
                  }
                />
              </>
            )}

            <Text
              style={
                styles.label
              }
            >
              Stock mínimo
            </Text>

            <TextInput
              style={
                styles.input
              }
              value={
                itemForm.minimumStock
              }
              keyboardType="decimal-pad"
              placeholder="0"
              placeholderTextColor="#777777"
              onChangeText={
                value =>
                  setItemForm(
                    current => ({
                      ...current,
                      minimumStock:
                        value.replace(
                          ',',
                          '.',
                        ),
                    }),
                  )
              }
            />

            <Text
              style={
                styles.helpText
              }
            >
              Cuando la existencia sea igual o menor a este valor, el insumo aparecerá como stock bajo.
            </Text>

            <Text
              style={
                styles.label
              }
            >
              Costo de compra
            </Text>

            <TextInput
              style={
                styles.input
              }
              value={
                itemForm.purchaseCost
              }
              keyboardType="decimal-pad"
              placeholder="Ej. 240"
              placeholderTextColor="#777777"
              onChangeText={
                value =>
                  setItemForm(
                    current => ({
                      ...current,
                      purchaseCost:
                        value.replace(
                          ',',
                          '.',
                        ),
                    }),
                  )
              }
            />

            <Text
              style={
                styles.label
              }
            >
              Contenido de la presentación en unidad base
            </Text>

            <TextInput
              style={
                styles.input
              }
              value={
                itemForm.purchaseBaseQuantity
              }
              keyboardType="decimal-pad"
              placeholder="Ej. 1000"
              placeholderTextColor="#777777"
              onChangeText={
                value =>
                  setItemForm(
                    current => ({
                      ...current,
                      purchaseBaseQuantity:
                        value.replace(
                          ',',
                          '.',
                        ),
                    }),
                  )
              }
            />

            <Text
              style={
                styles.helpText
              }
            >
              Ejemplos: 1 kg de carne = 1000 g; botella de 3.8 L = 3800 ml; paquete de 8 panes = 8 piezas.
            </Text>

            <View
              style={
                styles.costPreviewCard
              }
            >
              <Text
                style={
                  styles.costPreviewLabel
                }
              >
                COSTO UNITARIO CALCULADO
              </Text>

              <Text
                style={
                  styles.costPreviewValue
                }
              >
                {liveUnitCost === null
                  ? '—'
                  : liveUnitCost.toLocaleString(
                      'es-MX',
                      {
                        style: 'currency',
                        currency: 'MXN',
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 4,
                      },
                    )}
                {liveUnitCost === null
                  ? ''
                  : ` / ${unitFormLabel}`}
              </Text>

              <Text
                style={
                  styles.costPreviewHelp
                }
              >
                Ejemplo: si pagas $190 por una caja con 10 piezas, Dorian calcula $19 por pieza.
              </Text>
            </View>

            <Text
              style={
                styles.label
              }
            >
              Notas
            </Text>

            <TextInput
              style={[
                styles.input,
                styles.multiline,
              ]}
              value={
                itemForm.notes
              }
              multiline
              maxLength={500}
              placeholder="Ej. Presentación habitual, conservación, observaciones..."
              placeholderTextColor="#777777"
              onChangeText={
                value =>
                  setItemForm(
                    current => ({
                      ...current,
                      notes: value,
                    }),
                  )
              }
            />

            </ScrollView>

            <View
              style={
                styles.modalActions
              }
            >
              <TouchableOpacity
                style={[
                  styles.secondaryButton,
                  styles.modalActionButton,
                ]}
                disabled={
                  isProcessing
                }
                onPress={
                  closeItemModal
                }
              >
                <Text
                  style={
                    styles.secondaryButtonText
                  }
                >
                  Cancelar
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.primaryButton,
                  styles.modalActionButton,
                  isProcessing &&
                  styles.disabled,
                ]}
                disabled={
                  isProcessing
                }
                onPress={
                  () => {
                    void handleSaveItem();
                  }
                }
              >
                {isProcessing ? (
                  <ActivityIndicator
                    size="small"
                    color="#171717"
                  />
                ) : (
                  <Text
                    style={
                      styles.primaryButtonText
                    }
                  >
                    Guardar insumo
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        transparent
        visible={
          movementModalVisible
        }
        animationType="fade"
        onRequestClose={
          closeMovementModal
        }
      >
        <View
          style={[
            styles.modalOverlay,
            {
              paddingTop:
                Math.max(
                  12,
                  insets.top + 6,
                ),
              paddingBottom:
                Math.max(
                  12,
                  insets.bottom + 8,
                ),
            },
          ]}
        >
          <View
            style={[
              styles.modalCard,
              {
                height:
                  Math.max(
                    360,
                    Math.min(
                      640,
                      windowHeight -
                      Math.max(
                        24,
                        insets.top +
                        insets.bottom +
                        28,
                      ),
                    ),
                  ),
              },
            ]}
          >
            <View
              style={
                styles.modalHeader
              }
            >
              <Text
                style={
                  styles.modalTitle
                }
              >
                Movimiento de inventario
              </Text>

              <Text
                style={
                  styles.modalSubtitle
                }
              >
                {selectedItem
                  ? `${selectedItem.name} · existencia actual ${formatQuantity(
                      selectedItem.currentStock,
                      selectedItem.baseUnit,
                    )}`
                  : ''}
              </Text>
            </View>

            <ScrollView
              style={
                styles.modalBodyScroll
              }
              contentContainerStyle={
                styles.modalBodyContent
              }
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator
            >

            <Text
              style={
                styles.label
              }
            >
              Tipo
            </Text>

            <View
              style={
                styles.unitRow
              }
            >
              {(
                [
                  'entry',
                  'exit',
                  'waste',
                  'adjustment',
                ] as RegisterInventoryMovementInput['movementType'][]
              ).map(
                type => {
                  const selected =
                    movementForm
                      .movementType ===
                    type;

                  const label =
                    type === 'entry'
                      ? 'Entrada'
                      : type === 'exit'
                        ? 'Salida'
                        : type === 'waste'
                          ? 'Merma'
                          : 'Ajuste +/-';

                  return (
                    <TouchableOpacity
                      key={
                        type
                      }
                      style={[
                        styles.optionButton,
                        selected &&
                        styles.optionButtonSelected,
                      ]}
                      onPress={
                        () =>
                          setMovementForm(
                            current => ({
                              ...current,
                              movementType:
                                type,
                              quantity: '',
                            }),
                          )
                      }
                    >
                      <Text
                        style={[
                          styles.optionText,
                          selected &&
                          styles.optionTextSelected,
                        ]}
                      >
                        {label}
                      </Text>
                    </TouchableOpacity>
                  );
                },
              )}
            </View>

            <Text
              style={
                styles.label
              }
            >
              Cantidad
            </Text>

            <TextInput
              style={
                styles.input
              }
              value={
                movementForm.quantity
              }
              keyboardType="numbers-and-punctuation"
              placeholder={
                movementForm
                  .movementType ===
                  'adjustment'
                  ? 'Ej. -250 o 500'
                  : 'Ej. 1000'
              }
              placeholderTextColor="#777777"
              onChangeText={
                value =>
                  setMovementForm(
                    current => ({
                      ...current,
                      quantity:
                        value.replace(
                          ',',
                          '.',
                        ),
                    }),
                  )
              }
            />

            {movementForm
              .movementType ===
              'adjustment' && (
                <Text
                  style={
                    styles.helpText
                  }
                >
                  El ajuste es una diferencia: usa +500 para sumar 500 o -250 para restar 250. No representa la existencia final.
                </Text>
              )}

            <Text
              style={
                styles.label
              }
            >
              Motivo
            </Text>

            <TextInput
              style={[
                styles.input,
                styles.multiline,
              ]}
              value={
                movementForm.reason
              }
              multiline
              maxLength={300}
              placeholder="Ej. Compra semanal, conteo físico, producto dañado..."
              placeholderTextColor="#777777"
              onChangeText={
                value =>
                  setMovementForm(
                    current => ({
                      ...current,
                      reason: value,
                    }),
                  )
              }
            />

            </ScrollView>

            <View
              style={
                styles.modalActions
              }
            >
              <TouchableOpacity
                style={[
                  styles.secondaryButton,
                  styles.modalActionButton,
                ]}
                disabled={
                  isProcessing
                }
                onPress={
                  closeMovementModal
                }
              >
                <Text
                  style={
                    styles.secondaryButtonText
                  }
                >
                  Cancelar
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.primaryButton,
                  styles.modalActionButton,
                  isProcessing &&
                  styles.disabled,
                ]}
                disabled={
                  isProcessing
                }
                onPress={
                  () => {
                    void handleMovement();
                  }
                }
              >
                {isProcessing ? (
                  <ActivityIndicator
                    size="small"
                    color="#171717"
                  />
                ) : (
                  <Text
                    style={
                      styles.primaryButtonText
                    }
                  >
                    Registrar
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}
