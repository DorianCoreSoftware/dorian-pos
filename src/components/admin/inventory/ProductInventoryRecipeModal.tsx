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
  getProductInventoryRecipe,
  saveProductInventoryRecipe,
} from '../../../services/productInventoryRecipeService';

import {
  getProductCosting,
  ProductCosting,
  ProductPricingMode,
  saveProductPricingMode,
} from '../../../services/productCostingService';

import {
  setBrandPrimaryColor,
  styles,
} from './ProductInventoryRecipeModal.styles';

import {
  getAllModifiers,
  ModifierWithGroup,
} from '../../../services/modifierService';

import {
  getProductModifierGroups,
  ProductModifierGroup,
} from '../../../services/productModifierGroupService';

import {
  getProductModifierOptions,
} from '../../../services/productModifierOptionService';

import {
  getModifierInventoryRecipe,
  ModifierInventoryRecipe,
} from '../../../services/modifierInventoryRecipeService';

import {
  ModifierInventoryRecipeModal,
} from '../modifiers/ModifierInventoryRecipeModal';

import {
  useBusiness,
} from '../../../context/BusinessContext';

interface ProductInventoryRecipeModalProps {
  visible: boolean;
  productId:
    | string
    | null;
  productName: string;
  productPrice: number;
  onClose: () => void;
}

interface RecipeLineForm {
  inventoryItemId: string;
  quantity: string;
}

interface ProductModifierConsumption {
  modifier: ModifierWithGroup;
  recipe: ModifierInventoryRecipe;
}

const UNIT_LABELS:
  Record<
    InventoryItem['baseUnit'],
    string
  > = {
    g: 'g',
    ml: 'ml',
    piece: 'pza',
  };

export function ProductInventoryRecipeModal({
  visible,
  productId,
  productName,
  productPrice,
  onClose,
}: ProductInventoryRecipeModalProps) {
  const {
    theme,
  } = useBusiness();

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
    recipeEnabled,
    setRecipeEnabled,
  ] =
    useState(false);

  const [
    lines,
    setLines,
  ] =
    useState<RecipeLineForm[]>(
      [],
    );

  const [
    isLoading,
    setIsLoading,
  ] =
    useState(false);

  const [
    isSaving,
    setIsSaving,
  ] =
    useState(false);

  const [
    pickerVisible,
    setPickerVisible,
  ] =
    useState(false);

  const [
    pickerSearch,
    setPickerSearch,
  ] =
    useState('');

  const [
    costing,
    setCosting,
  ] =
    useState<ProductCosting | null>(
      null,
    );

  const [
    pricingMode,
    setPricingMode,
  ] =
    useState<ProductPricingMode>(
      'manual',
    );


  const [
    modifierConsumption,
    setModifierConsumption,
  ] =
    useState<ProductModifierConsumption[]>(
      [],
    );

  const [
    productModifierGroups,
    setProductModifierGroups,
  ] =
    useState<ProductModifierGroup[]>(
      [],
    );

  const [
    modifierRecipeTarget,
    setModifierRecipeTarget,
  ] =
    useState<ModifierWithGroup | null>(
      null,
    );

  const [
    consumptionRefreshKey,
    setConsumptionRefreshKey,
  ] =
    useState(0);

  useEffect(
    () => {
      if (
        !visible ||
        !productId
      ) {
        return;
      }

      let cancelled =
        false;

      void (async () => {
        try {
          setIsLoading(
            true,
          );

          const [
            loadedItems,
            recipe,
            loadedCosting,
            productGroups,
            productOptions,
            allModifiers,
          ] =
            await Promise.all([
              getInventoryItems(),
              getProductInventoryRecipe(
                productId,
              ),
              getProductCosting(
                productId,
              ),
              getProductModifierGroups(
                productId,
              ),
              getProductModifierOptions(
                productId,
              ),
              getAllModifiers(),
            ]);

          if (cancelled) {
            return;
          }

          setProductModifierGroups(
            productGroups.filter(
              group =>
                group.isActive,
            ),
          );

          const activeGroupIds =
            new Set(
              productGroups
                .filter(
                  group =>
                    group.isActive,
                )
                .map(
                  group =>
                    group.modifierGroupId,
                ),
            );

          const explicitOptionIds =
            new Set(
              productOptions
                .filter(
                  option =>
                    option.isAvailable,
                )
                .map(
                  option =>
                    option.modifierId,
                ),
            );

          const explicitGroupIds =
            new Set(
              allModifiers
                .filter(
                  modifier =>
                    explicitOptionIds.has(
                      modifier.id,
                    ),
                )
                .map(
                  modifier =>
                    modifier.group_id,
                ),
            );

          const productModifiers =
            allModifiers
              .filter(
                modifier =>
                  activeGroupIds.has(
                    modifier.group_id,
                  ) &&
                  modifier.is_available &&
                  (
                    !explicitGroupIds.has(
                      modifier.group_id,
                    ) ||
                    explicitOptionIds.has(
                      modifier.id,
                    )
                  ),
              )
              .sort(
                (left, right) => {
                  const groupCompare =
                    (
                      left.group?.name ??
                      ''
                    ).localeCompare(
                      right.group?.name ??
                      '',
                      'es-MX',
                    );

                  return groupCompare !== 0
                    ? groupCompare
                    : left.name.localeCompare(
                        right.name,
                        'es-MX',
                      );
                },
              );

          const modifierRecipes =
            await Promise.all(
              productModifiers.map(
                modifier =>
                  getModifierInventoryRecipe(
                    modifier.id,
                  ),
              ),
            );

          if (cancelled) {
            return;
          }

          setModifierConsumption(
            productModifiers.map(
              (modifier, index) => ({
                modifier,
                recipe:
                  modifierRecipes[index],
              }),
            ),
          );

          setInventoryItems(
            loadedItems,
          );

          setRecipeEnabled(
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

          setCosting(
            loadedCosting,
          );

          setPricingMode(
            loadedCosting.pricingMode,
          );
        } catch (
          error
        ) {
          if (!cancelled) {
            Alert.alert(
              'Error',
              error instanceof Error
                ? error.message
                : 'No se pudo cargar la receta.',
            );

            onClose();
          }
        } finally {
          if (!cancelled) {
            setIsLoading(
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
      productId,
      onClose,
      consumptionRefreshKey,
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

  const availablePickerItems =
    useMemo(
      () => {
        const query =
          pickerSearch
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
        pickerSearch,
        selectedIds,
      ],
    );

  const liveRecipeCost =
    useMemo(
      () =>
        lines.reduce(
          (
            total,
            line,
          ) => {
            const item =
              inventoryItems.find(
                inventoryItem =>
                  inventoryItem.id ===
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

  const liveMinimumTotalCost =
    useMemo(
      () => {
        if (!costing) {
          return liveRecipeCost;
        }

        return Math.max(
          0,
          costing.minimumTotalCost -
          costing.baseRecipeCost +
          liveRecipeCost,
        );
      },
      [
        costing,
        liveRecipeCost,
      ],
    );

  const liveMaximumTotalCost =
    useMemo(
      () => {
        if (!costing) {
          return liveRecipeCost;
        }

        return Math.max(
          0,
          costing.maximumTotalCost -
          costing.baseRecipeCost +
          liveRecipeCost,
        );
      },
      [
        costing,
        liveRecipeCost,
      ],
    );

  const liveRecommendedPrice =
    useMemo(
      () => {
        const target =
          costing
            ?.targetFoodCostPercent ??
          35;

        const rounding =
          costing
            ?.roundingStep ??
          5;

        if (
          liveMaximumTotalCost <= 0 ||
          target <= 0 ||
          rounding <= 0
        ) {
          return 0;
        }

        const rawPrice =
          liveMaximumTotalCost /
          (
            target /
            100
          );

        return (
          Math.ceil(
            rawPrice /
            rounding,
          ) *
          rounding
        );
      },
      [
        costing,
        liveMaximumTotalCost,
      ],
    );

  const liveFoodCostPercent =
    useMemo(
      () =>
        productPrice > 0
          ? (
            liveMaximumTotalCost /
            productPrice
          ) *
          100
          : null,
      [
        liveMaximumTotalCost,
        productPrice,
      ],
    );

  const liveGrossMarginPercent =
    useMemo(
      () =>
        productPrice > 0
          ? (
            (
              productPrice -
              liveMaximumTotalCost
            ) /
            productPrice
          ) *
          100
          : null,
      [
        liveMaximumTotalCost,
        productPrice,
      ],
    );

  const baseInventoryIds =
    useMemo(
      () =>
        new Set(
          lines.map(
            line =>
              line.inventoryItemId,
          ),
        ),
      [lines],
    );

  const duplicateInventoryIds =
    useMemo(
      () => {
        const duplicates =
          new Set<string>();

        modifierConsumption.forEach(
          consumption => {
            if (
              !consumption.recipe.enabled
            ) {
              return;
            }

            consumption.recipe.items.forEach(
              item => {
                if (
                  baseInventoryIds.has(
                    item.inventoryItemId,
                  )
                ) {
                  duplicates.add(
                    item.inventoryItemId,
                  );
                }
              },
            );
          },
        );

        return duplicates;
      },
      [
        baseInventoryIds,
        modifierConsumption,
      ],
    );

  const groupCostSummary =
    useMemo(
      () =>
        productModifierGroups.map(
          group => {
            const options =
              modifierConsumption.filter(
                consumption =>
                  consumption.modifier.group_id ===
                  group.modifierGroupId,
              );

            const optionCosts =
              options
                .filter(
                  option =>
                    option.recipe.enabled &&
                    option.recipe.items.length > 0,
                )
                .map(
                  option =>
                    option.recipe.recipeCost,
                );

            const minOptionCost =
              optionCosts.length > 0
                ? Math.min(
                    ...optionCosts,
                  )
                : 0;

            const maxOptionCost =
              optionCosts.length > 0
                ? Math.max(
                    ...optionCosts,
                  )
                : 0;

            return {
              group,
              options,
              minOptionCost,
              maxOptionCost,
            };
          },
        ),
      [
        modifierConsumption,
        productModifierGroups,
      ],
    );

  function getItem(
    inventoryItemId: string,
  ): InventoryItem | undefined {
    return inventoryItems.find(
      item =>
        item.id ===
        inventoryItemId,
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

    setPickerSearch('');
  }

  function updateQuantity(
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
      !productId ||
      isSaving
    ) {
      return;
    }

    if (
      recipeEnabled &&
      lines.length === 0
    ) {
      Alert.alert(
        'Receta vacía',
        'Agrega al menos un insumo o desactiva la receta.',
      );

      return;
    }

    const parsedItems:
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

      parsedItems.push({
        inventoryItemId:
          line.inventoryItemId,
        quantity,
      });
    }

    try {
      setIsSaving(
        true,
      );

      await saveProductInventoryRecipe({
        productId,
        enabled:
          recipeEnabled,
        items:
          parsedItems,
      });

      const updatedCosting =
        await saveProductPricingMode(
          productId,
          pricingMode,
        );

      setCosting(
        updatedCosting,
      );

      Alert.alert(
        'Receta guardada',
        `La receta de inventario de "${productName}" fue actualizada.`,
      );

      onClose();
    } catch (
      error
    ) {
      Alert.alert(
        'Error',
        error instanceof Error
          ? error.message
          : 'No se pudo guardar la receta.',
      );
    } finally {
      setIsSaving(
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
          isSaving
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
                {productName}
                {' · '}
                Define qué insumos consume una unidad vendida de este producto.
              </Text>
            </View>

            {isLoading ? (
              <View
                style={{
                  minHeight: 260,
                  alignItems:
                    'center',
                  justifyContent:
                    'center',
                }}
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
                    styles.enabledRow
                  }
                >
                  <View
                    style={
                      styles.enabledTextBox
                    }
                  >
                    <Text
                      style={
                        styles.enabledTitle
                      }
                    >
                      Usar receta de inventario
                    </Text>

                    <Text
                      style={
                        styles.enabledSubtitle
                      }
                    >
                      Agrega aquí únicamente los insumos que SIEMPRE consume este producto. No agregues sabores, tamaños u opciones que cambian según un modificador: esos insumos deben configurarse en la receta del modificador. La receta base se suma a las opciones elegidas al vender.
                    </Text>
                  </View>

                  <Switch
                    value={
                      recipeEnabled
                    }
                    disabled={
                      isSaving
                    }
                    onValueChange={
                      setRecipeEnabled
                    }
                  />
                </View>

                <Text
                  style={
                    styles.sectionTitle
                  }
                >
                  Insumos consumidos por unidad
                </Text>

                {lines.length ===
                  0 ? (
                  <Text
                    style={
                      styles.emptyText
                    }
                  >
                    Este producto todavía no tiene insumos asociados.
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
                            styles.ingredientCard
                          }
                        >
                          <View
                            style={
                              styles.ingredientTop
                            }
                          >
                            <View
                              style={{
                                flex: 1,
                              }}
                            >
                              <Text
                                style={
                                  styles.ingredientName
                                }
                              >
                                {item.name}
                              </Text>

                              {!item.isActive && (
                                <Text
                                  style={
                                    styles.ingredientInactive
                                  }
                                >
                                  INSUMO INACTIVO
                                </Text>
                              )}
                            </View>

                            <TextInput
                              style={
                                styles.quantityInput
                              }
                              value={
                                line.quantity
                              }
                              keyboardType="decimal-pad"
                              placeholder="Cantidad"
                              placeholderTextColor="#777777"
                              onChangeText={
                                value =>
                                  updateQuantity(
                                    line.inventoryItemId,
                                    value,
                                  )
                              }
                            />

                            <Text
                              style={
                                styles.unitText
                              }
                            >
                              {UNIT_LABELS[
                                item.baseUnit
                              ]}
                            </Text>

                            <TouchableOpacity
                              style={
                                styles.removeButton
                              }
                              disabled={
                                isSaving
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
                  disabled={
                    isSaving
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
                    styles.consumptionMap
                  }
                >
                  <View
                    style={
                      styles.consumptionHeader
                    }
                  >
                    <View
                      style={{
                        flex: 1,
                      }}
                    >
                      <Text
                        style={
                          styles.costSummaryTitle
                        }
                      >
                        Mapa de consumo
                      </Text>

                      <Text
                        style={
                          styles.consumptionHelp
                        }
                      >
                        Aquí ves en un solo lugar qué descuenta siempre el producto y qué cambia según cada opción.
                      </Text>
                    </View>
                  </View>

                  <View
                    style={
                      styles.mapSection
                    }
                  >
                    <Text
                      style={
                        styles.mapSectionLabel
                      }
                    >
                      BASE · SIEMPRE SE CONSUME
                    </Text>

                    {lines.length === 0 ? (
                      <Text
                        style={
                          styles.mapEmpty
                        }
                      >
                        Sin consumo fijo. Esto es correcto para productos cuyo inventario depende totalmente de una opción, como sabores.
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

                          const duplicated =
                            duplicateInventoryIds.has(
                              line.inventoryItemId,
                            );

                          return (
                            <View
                              key={`map-base-${line.inventoryItemId}`}
                              style={[
                                styles.mapRow,
                                duplicated &&
                                styles.mapRowWarning,
                              ]}
                            >
                              <View
                                style={{
                                  flex: 1,
                                }}
                              >
                                <Text
                                  style={
                                    styles.mapItemName
                                  }
                                >
                                  {item.name}
                                </Text>

                                {duplicated ? (
                                  <Text
                                    style={
                                      styles.mapWarningText
                                    }
                                  >
                                    También aparece en una opción. Revisa posible doble descuento.
                                  </Text>
                                ) : null}
                              </View>

                              <Text
                                style={
                                  styles.mapQuantity
                                }
                              >
                                {line.quantity || '0'} {UNIT_LABELS[item.baseUnit]}
                              </Text>
                            </View>
                          );
                        },
                      )
                    )}
                  </View>

                  <View
                    style={
                      styles.mapSection
                    }
                  >
                    <Text
                      style={
                        styles.mapSectionLabel
                      }
                    >
                      SEGÚN OPCIÓN / MODIFICADOR
                    </Text>

                    {groupCostSummary.length === 0 ? (
                      <Text
                        style={
                          styles.mapEmpty
                        }
                      >
                        Este producto no tiene modificadores asociados.
                      </Text>
                    ) : (
                      groupCostSummary.map(
                        summary => {
                          const {
                            group,
                            options,
                            minOptionCost,
                            maxOptionCost,
                          } =
                            summary;

                          const groupLabel =
                            group.group?.name ??
                            'Grupo de opciones';

                          const isExclusive =
                            group.minSelections === 1 &&
                            group.maxSelections === 1 &&
                            !group.allowDuplicates;

                          return (
                            <View
                              key={
                                group.modifierGroupId
                              }
                              style={
                                styles.optionConsumptionCard
                              }
                            >
                              <View
                                style={
                                  styles.optionConsumptionTop
                                }
                              >
                                <View
                                  style={{
                                    flex: 1,
                                  }}
                                >
                                  <Text
                                    style={
                                      styles.optionGroupName
                                    }
                                  >
                                    {groupLabel}
                                  </Text>

                                  <Text
                                    style={
                                      styles.optionName
                                    }
                                  >
                                    {isExclusive
                                      ? 'Selecciona 1 · costo de una sola variante'
                                      : `Selecciona ${group.minSelections}–${group.maxSelections}`}
                                  </Text>
                                </View>
                              </View>

                              {isExclusive ? (
                                <Text
                                  style={
                                    styles.costDetail
                                  }
                                >
                                  Dorian NO suma todas las opciones. Para el costo mínimo toma la variante más barata (${minOptionCost.toFixed(2)}) y para el máximo la más cara (${maxOptionCost.toFixed(2)}).
                                </Text>
                              ) : (
                                <Text
                                  style={
                                    styles.costDetail
                                  }
                                >
                                  El costo considera la cantidad mínima y máxima de selecciones permitidas en este grupo.
                                </Text>
                              )}

                              <View
                                style={{
                                  marginTop: 10,
                                  gap: 8,
                                }}
                              >
                                {options.map(
                                  consumption => {
                                    const {
                                      modifier,
                                      recipe,
                                    } =
                                      consumption;

                                    const duplicatedItems =
                                      recipe.items.filter(
                                        item =>
                                          baseInventoryIds.has(
                                            item.inventoryItemId,
                                          ),
                                      );

                                    return (
                                      <View
                                        key={
                                          modifier.id
                                        }
                                        style={[
                                          styles.optionConsumptionCard,
                                          {
                                            marginTop: 0,
                                          },
                                          duplicatedItems.length > 0 &&
                                          styles.mapRowWarning,
                                        ]}
                                      >
                                        <View
                                          style={
                                            styles.optionConsumptionTop
                                          }
                                        >
                                          <View
                                            style={{
                                              flex: 1,
                                            }}
                                          >
                                            <Text
                                              style={
                                                styles.optionName
                                              }
                                            >
                                              {modifier.name}
                                            </Text>
                                          </View>

                                          <TouchableOpacity
                                            style={
                                              styles.editConsumptionButton
                                            }
                                            onPress={() =>
                                              setModifierRecipeTarget(
                                                modifier,
                                              )
                                            }
                                          >
                                            <Text
                                              style={
                                                styles.editConsumptionText
                                              }
                                            >
                                              Editar consumo
                                            </Text>
                                          </TouchableOpacity>
                                        </View>

                                        {!recipe.enabled ||
                                        recipe.items.length === 0 ? (
                                          <Text
                                            style={
                                              styles.mapEmpty
                                            }
                                          >
                                            Sin consumo configurado.
                                          </Text>
                                        ) : (
                                          <View
                                            style={{
                                              marginTop: 8,
                                              gap: 5,
                                            }}
                                          >
                                            {recipe.items.map(
                                              item => (
                                                <View
                                                  key={`${modifier.id}-${item.inventoryItemId}`}
                                                  style={
                                                    styles.optionRecipeRow
                                                  }
                                                >
                                                  <Text
                                                    style={
                                                      styles.optionRecipeItem
                                                    }
                                                  >
                                                    {item.inventoryItemName}
                                                  </Text>

                                                  <Text
                                                    style={
                                                      styles.optionRecipeQty
                                                    }
                                                  >
                                                    {item.quantity} {UNIT_LABELS[item.baseUnit]}
                                                  </Text>
                                                </View>
                                              ),
                                            )}

                                            <Text
                                              style={
                                                styles.optionCost
                                              }
                                            >
                                              Costo de esta variante: ${recipe.recipeCost.toFixed(2)}
                                            </Text>
                                          </View>
                                        )}

                                        {duplicatedItems.length > 0 ? (
                                          <Text
                                            style={
                                              styles.mapWarningText
                                            }
                                          >
                                            ⚠ {duplicatedItems.map(item => item.inventoryItemName).join(', ')} también está en la receta base.
                                          </Text>
                                        ) : null}
                                      </View>
                                    );
                                  },
                                )}
                              </View>
                            </View>
                          );
                        },
                      )
                    )}
                  </View>
                </View>

                <View
                  style={
                    styles.costSummary
                  }
                >
                  <Text
                    style={
                      styles.costSummaryTitle
                    }
                  >
                    Costeo y precio · vista previa
                  </Text>

                  <Text
                    style={
                      styles.costDetail
                    }
                  >
                    El costo máximo usa la combinación permitida más cara, no la suma de todas las variantes disponibles.
                  </Text>

                  <View
                    style={
                      styles.costGrid
                    }
                  >
                    <View
                      style={
                        styles.costMetric
                      }
                    >
                      <Text
                        style={
                          styles.costMetricLabel
                        }
                      >
                        Receta base
                      </Text>

                      <Text
                        style={
                          styles.costMetricValue
                        }
                      >
                        ${liveRecipeCost.toFixed(2)}
                      </Text>
                    </View>

                    <View
                      style={
                        styles.costMetric
                      }
                    >
                      <Text
                        style={
                          styles.costMetricLabel
                        }
                      >
                        Costo mínimo
                      </Text>

                      <Text
                        style={
                          styles.costMetricValue
                        }
                      >
                        ${liveMinimumTotalCost.toFixed(2)}
                      </Text>
                    </View>

                    <View
                      style={
                        styles.costMetric
                      }
                    >
                      <Text
                        style={
                          styles.costMetricLabel
                        }
                      >
                        Costo máximo
                      </Text>

                      <Text
                        style={
                          styles.costMetricValue
                        }
                      >
                        ${liveMaximumTotalCost.toFixed(2)}
                      </Text>
                    </View>

                    <View
                      style={
                        styles.costMetric
                      }
                    >
                      <Text
                        style={
                          styles.costMetricLabel
                        }
                      >
                        Recomendado
                      </Text>

                      <Text
                        style={
                          styles.recommendedValue
                        }
                      >
                        ${liveRecommendedPrice.toFixed(2)}
                      </Text>
                    </View>
                  </View>

                  <Text
                    style={
                      styles.costDetail
                    }
                  >
                    Precio actual: ${Number(productPrice).toFixed(2)}
                    {' · '}
                    Objetivo: {(costing?.targetFoodCostPercent ?? 35).toFixed(1)}%
                    {' · '}
                    Food cost protegido:{' '}
                    {liveFoodCostPercent ===
                    null
                      ? '—'
                      : `${liveFoodCostPercent.toFixed(1)}%`}
                    {' · '}
                    Margen bruto:{' '}
                    {liveGrossMarginPercent ===
                    null
                      ? '—'
                      : `${liveGrossMarginPercent.toFixed(1)}%`}
                  </Text>

                  {costing ? (
                    <Text
                      style={
                        styles.costDetail
                      }
                    >
                      Variantes/modificadores:{' '}
                      ${costing.variantMinCost.toFixed(2)}
                      {' – '}
                      ${costing.variantMaxCost.toFixed(2)}
                      {' · '}
                      Componentes de combo:{' '}
                      ${costing.comboMinCost.toFixed(2)}
                      {' – '}
                      ${costing.comboMaxCost.toFixed(2)}
                      {costing.isVariableCost
                        ? ' · costo variable'
                        : ''}
                    </Text>
                  ) : null}

                  <Text
                    style={
                      styles.sectionTitle
                    }
                  >
                    Modo de precio
                  </Text>

                  <View
                    style={
                      styles.pricingModeRow
                    }
                  >
                    {(
                      [
                        'manual',
                        'recommended',
                      ] as ProductPricingMode[]
                    ).map(
                      mode => {
                        const selected =
                          pricingMode ===
                          mode;

                        return (
                          <TouchableOpacity
                            key={
                              mode
                            }
                            style={[
                              styles.pricingModeButton,
                              selected &&
                              styles.pricingModeButtonSelected,
                            ]}
                            onPress={
                              () =>
                                setPricingMode(
                                  mode,
                                )
                            }
                          >
                            <Text
                              style={[
                                styles.pricingModeText,
                                selected &&
                                styles.pricingModeTextSelected,
                              ]}
                            >
                              {mode ===
                              'manual'
                                ? 'Precio manual'
                                : 'Usar recomendado'}
                            </Text>
                          </TouchableOpacity>
                        );
                      },
                    )}
                  </View>

                  <Text
                    style={
                      styles.costDetail
                    }
                  >
                    Los valores se recalculan mientras editas la receta. En modo recomendado, al guardar se aplicará el precio calculado con la receta ya persistida; en manual se conserva el precio actual.
                  </Text>
                </View>

                {lines.some(
                  line =>
                    getItem(
                      line.inventoryItemId,
                    )?.isActive ===
                    false,
                ) && (
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
                      La receta contiene uno o más insumos inactivos. Podrás guardar para corregir recetas existentes, pero antes de activar el descuento automático convendrá reemplazarlos o reactivarlos.
                    </Text>
                  </View>
                )}
              </ScrollView>
            )}

            <View
              style={
                styles.footer
              }
            >
              <TouchableOpacity
                style={[
                  styles.button,
                  styles.cancelButton,
                ]}
                disabled={
                  isSaving
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
                  styles.button,
                  styles.saveButton,
                  (
                    isSaving ||
                    isLoading
                  ) &&
                  styles.disabled,
                ]}
                disabled={
                  isSaving ||
                  isLoading
                }
                onPress={
                  () => {
                    void handleSave();
                  }
                }
              >
                {isSaving ? (
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

      <ModifierInventoryRecipeModal
        visible={
          modifierRecipeTarget !==
          null
        }
        modifierId={
          modifierRecipeTarget
            ?.id ??
          null
        }
        modifierName={
          modifierRecipeTarget
            ?.name ??
          ''
        }
        extraPrice={
          Number(
            modifierRecipeTarget
              ?.extra_price ??
            0,
          )
        }
        onClose={() => {
          setModifierRecipeTarget(
            null,
          );
          setConsumptionRefreshKey(
            current =>
              current + 1,
          );
        }}
      />

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
            styles.pickerOverlay
          }
        >
          <View
            style={
              styles.pickerCard
            }
          >
            <Text
              style={
                styles.pickerTitle
              }
            >
              Seleccionar insumo
            </Text>

            <TextInput
              style={
                styles.searchInput
              }
              value={
                pickerSearch
              }
              placeholder="Buscar insumo..."
              placeholderTextColor="#777777"
              onChangeText={
                setPickerSearch
              }
            />

            <ScrollView>
              {availablePickerItems.length ===
                0 ? (
                <Text
                  style={
                    styles.emptyText
                  }
                >
                  No hay más insumos activos disponibles.
                </Text>
              ) : (
                availablePickerItems.map(
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
                          styles.pickerItemName
                        }
                      >
                        {item.name}
                      </Text>

                      <Text
                        style={
                          styles.pickerItemMeta
                        }
                      >
                        {item.sku
                          ? `${item.sku} · `
                          : ''}
                        Unidad: {' '}
                        {UNIT_LABELS[
                          item.baseUnit
                        ]}
                      </Text>
                    </TouchableOpacity>
                  ),
                )
              )}
            </ScrollView>

            <TouchableOpacity
              style={[
                styles.button,
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
