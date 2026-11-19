import React, {
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
  View,
} from 'react-native';

import {
  getInventoryItems,
  InventoryItem,
} from '../../../services/inventoryService';

import {
  getModifierInventoryRecipe,
  saveModifierInventoryRecipe,
} from '../../../services/modifierInventoryRecipeService';

import {
  useBusiness,
} from '../../../context/BusinessContext';

import {
  setBrandPrimaryColor,
  styles,
} from './ModifierInventoryRecipeModal.styles';

interface ModifierInventoryRecipeModalProps {
  visible: boolean;
  modifierId:
    | string
    | null;
  modifierName: string;
  extraPrice: number;
  onClose: () => void;
}

interface RecipeLine {
  inventoryItemId: string;
  quantity: string;
}

const UNIT_LABEL:
  Record<
    InventoryItem['baseUnit'],
    string
  > = {
    g: 'g',
    ml: 'ml',
    piece: 'pza',
  };

export function ModifierInventoryRecipeModal({
  visible,
  modifierId,
  modifierName,
  extraPrice,
  onClose,
}: ModifierInventoryRecipeModalProps) {
  const {
    theme,
  } =
    useBusiness();

  setBrandPrimaryColor(
    theme.primary,
  );

  const [
    inventoryItems,
    setInventoryItems,
  ] =
    useState<InventoryItem[]>(
      [],
    );

  const [
    enabled,
    setEnabled,
  ] =
    useState(false);

  const [
    lines,
    setLines,
  ] =
    useState<RecipeLine[]>(
      [],
    );

  const [
    loading,
    setLoading,
  ] =
    useState(false);

  const [
    saving,
    setSaving,
  ] =
    useState(false);

  const [
    pickerVisible,
    setPickerVisible,
  ] =
    useState(false);

  const [
    search,
    setSearch,
  ] =
    useState('');

  useEffect(
    () => {
      if (
        !visible ||
        !modifierId
      ) {
        return;
      }

      let cancelled =
        false;

      void (async () => {
        try {
          setLoading(
            true,
          );

          const [
            items,
            recipe,
          ] =
            await Promise.all([
              getInventoryItems(),
              getModifierInventoryRecipe(
                modifierId,
              ),
            ]);

          if (cancelled) {
            return;
          }

          setInventoryItems(
            items,
          );

          setEnabled(
            recipe.enabled,
          );

          setLines(
            recipe.items.map(
              item => ({
                inventoryItemId:
                  item.inventoryItemId,
                quantity:
                  String(
                    item.quantity,
                  ),
              }),
            ),
          );
        } catch (error) {
          if (!cancelled) {
            Alert.alert(
              'Error',
              error instanceof Error
                ? error.message
                : 'No se pudo cargar la receta del modificador.',
            );

            onClose();
          }
        } finally {
          if (!cancelled) {
            setLoading(
              false,
            );
          }
        }
      })();

      return () => {
        cancelled =
          true;
      };
    },
    [
      visible,
      modifierId,
      onClose,
    ],
  );

  const selectedIds =
    useMemo(
      () =>
        new Set(
          lines.map(
            line =>
              line.inventoryItemId,
          ),
        ),
      [
        lines,
      ],
    );

  const availableItems =
    useMemo(
      () => {
        const query =
          search
            .trim()
            .toLocaleLowerCase(
              'es-MX',
            );

        return inventoryItems
          .filter(
            item =>
              item.isActive &&
              !selectedIds.has(
                item.id,
              ),
          )
          .filter(
            item =>
              !query ||
              item.name
                .toLocaleLowerCase(
                  'es-MX',
                )
                .includes(
                  query,
                ) ||
              (
                item.sku ??
                ''
              )
                .toLocaleLowerCase(
                  'es-MX',
                )
                .includes(
                  query,
                ),
          );
      },
      [
        inventoryItems,
        search,
        selectedIds,
      ],
    );

  const recipeCost =
    useMemo(
      () =>
        lines.reduce(
          (
            total,
            line,
          ) => {
            const item =
              inventoryItems.find(
                current =>
                  current.id ===
                  line.inventoryItemId,
              );

            const quantity =
              Number(
                line.quantity,
              );

            if (
              !item ||
              !Number.isFinite(
                quantity,
              ) ||
              quantity <= 0
            ) {
              return total;
            }

            return (
              total +
              quantity *
              item.unitCost
            );
          },
          0,
        ),
      [
        inventoryItems,
        lines,
      ],
    );

  const marginAmount =
    extraPrice -
    recipeCost;

  const marginPercent =
    extraPrice > 0
      ? (
        marginAmount /
        extraPrice
      ) *
      100
      : null;

  function getItem(
    id: string,
  ): InventoryItem | undefined {
    return inventoryItems.find(
      item =>
        item.id === id,
    );
  }

  function addItem(
    item: InventoryItem,
  ): void {
    setLines(
      current => [
        ...current,
        {
          inventoryItemId:
            item.id,
          quantity:
            '1',
        },
      ],
    );

    setPickerVisible(
      false,
    );

    setSearch('');
  }

  function setQuantity(
    inventoryItemId: string,
    value: string,
  ): void {
    setLines(
      current =>
        current.map(
          line =>
            line.inventoryItemId ===
              inventoryItemId
              ? {
                ...line,
                quantity:
                  value.replace(
                    ',',
                    '.',
                  ),
              }
              : line,
        ),
    );
  }

  function removeItem(
    inventoryItemId: string,
  ): void {
    setLines(
      current =>
        current.filter(
          line =>
            line.inventoryItemId !==
            inventoryItemId,
        ),
    );
  }

  async function handleSave():
    Promise<void> {
    if (
      !modifierId ||
      saving
    ) {
      return;
    }

    if (
      enabled &&
      lines.length === 0
    ) {
      Alert.alert(
        'Receta vacía',
        'Agrega al menos un insumo o desactiva la receta.',
      );

      return;
    }

    const parsed:
      Array<{
        inventoryItemId:
          string;
        quantity:
          number;
      }> = [];

    for (
      const line of
      lines
    ) {
      const quantity =
        Number(
          line.quantity,
        );

      if (
        !Number.isFinite(
          quantity,
        ) ||
        quantity <= 0
      ) {
        const item =
          getItem(
            line.inventoryItemId,
          );

        Alert.alert(
          'Cantidad inválida',
          `Revisa la cantidad de "${item?.name ?? 'insumo'}".`,
        );

        return;
      }

      parsed.push({
        inventoryItemId:
          line.inventoryItemId,
        quantity,
      });
    }

    try {
      setSaving(
        true,
      );

      await saveModifierInventoryRecipe(
        modifierId,
        enabled,
        parsed,
      );

      Alert.alert(
        'Receta guardada',
        `La receta de "${modifierName}" fue actualizada.`,
      );

      onClose();
    } catch (error) {
      Alert.alert(
        'Error',
        error instanceof Error
          ? error.message
          : 'No se pudo guardar la receta.',
      );
    } finally {
      setSaving(
        false,
      );
    }
  }

  return (
    <>
      <Modal
        transparent
        visible={
          visible
        }
        animationType="fade"
        onRequestClose={
          saving
            ? undefined
            : onClose
        }
      >
        <View
          style={
            styles.overlay
          }
        >
          <View
            style={
              styles.card
            }
          >
            <View
              style={
                styles.header
              }
            >
              <Text
                style={
                  styles.title
                }
              >
                Receta de inventario
              </Text>

              <Text
                style={
                  styles.subtitle
                }
              >
                {modifierName}
              </Text>
            </View>

            {loading ? (
              <View
                style={
                  styles.loadingBox
                }
              >
                <ActivityIndicator
                  size="large"
                  color={
                    theme.primary
                  }
                />
              </View>
            ) : (
              <ScrollView
                style={
                  styles.body
                }
                keyboardShouldPersistTaps="handled"
              >
                <View
                  style={
                    styles.switchRow
                  }
                >
                  <View
                    style={{
                      flex: 1,
                    }}
                  >
                    <Text
                      style={
                        styles.switchTitle
                      }
                    >
                      Consumir inventario
                    </Text>

                    <Text
                      style={
                        styles.switchSubtitle
                      }
                    >
                      Agrega sólo los insumos que se consumen por elegir esta opción. No repitas aquí insumos que ya estén en la receta base del producto. Ejemplo: para “Fresa”, agrega únicamente el Boing Fresa que reemplaza la elección genérica.
                    </Text>
                  </View>

                  <Switch
                    value={
                      enabled
                    }
                    onValueChange={
                      setEnabled
                    }
                  />
                </View>

                <Text
                  style={
                    styles.sectionTitle
                  }
                >
                  Insumos
                </Text>

                {lines.length ===
                  0 ? (
                  <Text
                    style={
                      styles.emptyText
                    }
                  >
                    Este modificador todavía no tiene insumos asociados.
                  </Text>
                ) : (
                  lines.map(
                    line => {
                      const item =
                        getItem(
                          line.inventoryItemId,
                        );

                      if (!item) {
                        return null;
                      }

                      return (
                        <View
                          key={
                            line.inventoryItemId
                          }
                          style={
                            styles.lineCard
                          }
                        >
                          <View
                            style={
                              styles.lineTop
                            }
                          >
                            <View
                              style={{
                                flex: 1,
                              }}
                            >
                              <Text
                                style={
                                  styles.itemName
                                }
                              >
                                {item.name}
                              </Text>

                              <Text
                                style={
                                  styles.itemCost
                                }
                              >
                                ${item.unitCost.toFixed(4)}/{UNIT_LABEL[
                                  item.baseUnit
                                ]}
                              </Text>
                            </View>

                            <TextInput
                              style={
                                styles.quantityInput
                              }
                              value={
                                line.quantity
                              }
                              keyboardType="decimal-pad"
                              onChangeText={
                                value =>
                                  setQuantity(
                                    line.inventoryItemId,
                                    value,
                                  )
                              }
                            />

                            <Text
                              style={
                                styles.unit
                              }
                            >
                              {UNIT_LABEL[
                                item.baseUnit
                              ]}
                            </Text>

                            <TouchableOpacity
                              style={
                                styles.removeButton
                              }
                              onPress={
                                () =>
                                  removeItem(
                                    line.inventoryItemId,
                                  )
                              }
                            >
                              <Text
                                style={
                                  styles.removeText
                                }
                              >
                                Quitar
                              </Text>
                            </TouchableOpacity>
                          </View>
                        </View>
                      );
                    },
                  )
                )}

                <TouchableOpacity
                  style={
                    styles.addButton
                  }
                  onPress={
                    () =>
                      setPickerVisible(
                        true,
                      )
                  }
                >
                  <Text
                    style={
                      styles.addButtonText
                    }
                  >
                    + Agregar insumo
                  </Text>
                </TouchableOpacity>

                <View
                  style={
                    styles.costPanel
                  }
                >
                  <Text
                    style={
                      styles.costTitle
                    }
                  >
                    Costeo · vista previa
                  </Text>

                  <View
                    style={
                      styles.costRow
                    }
                  >
                    <View
                      style={
                        styles.metric
                      }
                    >
                      <Text
                        style={
                          styles.metricLabel
                        }
                      >
                        Costo receta
                      </Text>

                      <Text
                        style={
                          styles.metricValue
                        }
                      >
                        ${recipeCost.toFixed(2)}
                      </Text>
                    </View>

                    <View
                      style={
                        styles.metric
                      }
                    >
                      <Text
                        style={
                          styles.metricLabel
                        }
                      >
                        Precio extra
                      </Text>

                      <Text
                        style={
                          styles.metricValue
                        }
                      >
                        ${extraPrice.toFixed(2)}
                      </Text>
                    </View>

                    <View
                      style={
                        styles.metric
                      }
                    >
                      <Text
                        style={
                          styles.metricLabel
                        }
                      >
                        Diferencia
                      </Text>

                      <Text
                        style={
                          marginAmount >= 0
                            ? styles.metricValue
                            : styles.negativeValue
                        }
                      >
                        ${marginAmount.toFixed(2)}
                      </Text>
                    </View>
                  </View>

                  <Text
                    style={
                      styles.costDetail
                    }
                  >
                    Margen sobre el precio extra:{' '}
                    {marginPercent ===
                    null
                      ? '—'
                      : `${marginPercent.toFixed(1)}%`}
                  </Text>

                  {extraPrice === 0 &&
                  recipeCost > 0 ? (
                    <Text
                      style={
                        styles.warningText
                      }
                    >
                      Este modificador tiene costo pero no cobra precio extra. El costo se absorberá dentro del precio base del producto.
                    </Text>
                  ) : null}
                </View>
              </ScrollView>
            )}

            <View
              style={
                styles.footer
              }
            >
              <TouchableOpacity
                style={[
                  styles.footerButton,
                  styles.cancelButton,
                ]}
                disabled={
                  saving
                }
                onPress={
                  onClose
                }
              >
                <Text
                  style={
                    styles.cancelText
                  }
                >
                  Cancelar
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.footerButton,
                  styles.saveButton,
                  saving &&
                  styles.disabled,
                ]}
                disabled={
                  saving ||
                  loading
                }
                onPress={
                  () => {
                    void handleSave();
                  }
                }
              >
                {saving ? (
                  <ActivityIndicator
                    size="small"
                    color="#171717"
                  />
                ) : (
                  <Text
                    style={
                      styles.saveText
                    }
                  >
                    Guardar receta
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
          pickerVisible
        }
        animationType="fade"
        onRequestClose={
          () =>
            setPickerVisible(
              false,
            )
        }
      >
        <View
          style={
            styles.overlay
          }
        >
          <View
            style={
              styles.pickerCard
            }
          >
            <Text
              style={
                styles.title
              }
            >
              Seleccionar insumo
            </Text>

            <TextInput
              style={
                styles.searchInput
              }
              value={
                search
              }
              placeholder="Buscar insumo..."
              placeholderTextColor="#777777"
              onChangeText={
                setSearch
              }
            />

            <ScrollView>
              {availableItems.map(
                item => (
                  <TouchableOpacity
                    key={
                      item.id
                    }
                    style={
                      styles.pickerItem
                    }
                    onPress={
                      () =>
                        addItem(
                          item,
                        )
                    }
                  >
                    <Text
                      style={
                        styles.itemName
                      }
                    >
                      {item.name}
                    </Text>

                    <Text
                      style={
                        styles.itemCost
                      }
                    >
                      {item.sku
                        ? `${item.sku} · `
                        : ''}
                      ${item.unitCost.toFixed(4)}/{UNIT_LABEL[
                        item.baseUnit
                      ]}
                    </Text>
                  </TouchableOpacity>
                ),
              )}

              {availableItems.length ===
              0 ? (
                <Text
                  style={
                    styles.emptyText
                  }
                >
                  No hay más insumos activos disponibles.
                </Text>
              ) : null}
            </ScrollView>

            <TouchableOpacity
              style={[
                styles.footerButton,
                styles.cancelButton,
                {
                  alignSelf:
                    'flex-end',
                  marginTop: 8,
                },
              ]}
              onPress={
                () =>
                  setPickerVisible(
                    false,
                  )
              }
            >
              <Text
                style={
                  styles.cancelText
                }
              >
                Cerrar
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  );
}
