import { withAlpha } from '../../theme/brandStyles';

import { useBusiness } from '../../context/BusinessContext';

import React, {
  useEffect,
  useMemo,
  useState,
} from 'react';
import {
  ActivityIndicator,
  Modal,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import {
  ComboComponentSelection,
  Product,
  ProductCookingMethod,
  SelectedModifier,
  ProductCheckAssignment,
  SelectedProductCheck,
} from '../../types';
import {
  getAvailableModifiersByGroupId,
  ModifierWithGroup,
} from '../../services/modifierService';
import {
  hasActiveComboRecipe,
} from '../../services/comboService';
import {
  getActiveProductModifierGroups,
  ProductModifierGroup,
} from '../../services/productModifierGroupService';
import {
  getActiveModifierPromotion,
  ModifierPromotion,
} from '../../services/modifierPromotionService';

import {
  styles,
  setBrandPrimaryColor,
} from '../modifier-modal/ModifierModal.styles';
import {
  ComboConfigurator,
  ComboConfiguratorSelection,
} from './ComboConfigurator';
import { getAvailableProductModifierOptions } from '../../services/productModifierOptionService';
import { useCurrency } from '../../hooks/useCurrency';
import { getEnabledProductPersonalizationGroups } from '../../services/productCheckService';
export interface ProductConfigurationResult {
  selectedModifiers: SelectedModifier[];
  selectedProductChecks: SelectedProductCheck[];
  comboComponents: ComboComponentSelection[];
  cookingMethod: ProductCookingMethod | null;
}
interface ProductConfiguratorModalProps {
  visible: boolean;
  product: Product | null;
  notes: string;
  onNotesChange: (
    text: string,
  ) => void;
  onClose: () => void;
  onConfirm: (
    configuration:
      ProductConfigurationResult,
  ) => void;
}
export const ProductConfiguratorModal:
  React.FC<
    ProductConfiguratorModalProps
  > = ({
    visible,
    product,
    notes,
    onNotesChange,
    onClose,
    onConfirm,
  }) => {
  const { theme: businessTheme } = useBusiness();
    setBrandPrimaryColor(businessTheme.primary);

    const {
      formatCurrency,
    } = useCurrency();

    const {
      width,
      height,
    } = useWindowDimensions();
    const isPhone =
      width < 700;
    const isSmallPhone =
      width < 430;
    const isShortScreen =
      height < 700;
    const [
      productModifierGroups,
      setProductModifierGroups,
    ] = useState<ProductModifierGroup[]>([]);
    const [
      modifiersByGroup,
      setModifiersByGroup,
    ] = useState<
      Record<string, ModifierWithGroup[]>
    >({});
    const [
      selectedModifierIdsByGroup,
      setSelectedModifierIdsByGroup,
    ] = useState<
      Record<string, string[]>
    >({});
    const [
      productCheckGroups,
      setProductCheckGroups,
    ] = useState<ProductCheckAssignment[]>([]);
    const [
      selectedProductCheckIdsByGroup,
      setSelectedProductCheckIdsByGroup,
    ] = useState<Record<string, string[]>>({});

    const [
      expandedPersonalizationGroupIds,
      setExpandedPersonalizationGroupIds,
    ] = useState<Record<string, boolean>>({});

    const [
      expandedExtraGroupIds,
      setExpandedExtraGroupIds,
    ] = useState<
      Record<string, boolean>
    >({});
    const [
      extraSearchByGroupId,
      setExtraSearchByGroupId,
    ] = useState<
      Record<string, string>
    >({});
    const [
      expandedOptionGroupIds,
      setExpandedOptionGroupIds,
    ] = useState<Record<string, boolean>>({});
    const [
      optionSearchByGroupId,
      setOptionSearchByGroupId,
    ] = useState<Record<string, string>>({});
    const [
      areProductGroupsLoading,
      setAreProductGroupsLoading,
    ] = useState(false);
    const [
      productGroupsError,
      setProductGroupsError,
    ] = useState<
      string | null
    >(null);
    const [
      comboSelection,
      setComboSelection,
    ] = useState<
      ComboConfiguratorSelection | null
    >(null);
    const [
      modifierPromotion,
      setModifierPromotion,
    ] = useState<
      ModifierPromotion | null
    >(null);
    const [
      isCombo,
      setIsCombo,
    ] = useState(false);
    const [
      comboCheckedProductId,
      setComboCheckedProductId,
    ] = useState<
      string | null
    >(null);
    const [
      comboDetectionError,
      setComboDetectionError,
    ] = useState<
      string | null
    >(null);
    const [
      selectedCookingMethod,
      setSelectedCookingMethod,
    ] = useState<
      ProductCookingMethod | null
    >(null);
    const notesPlaceholder =
      'Ej: Indicaciones especiales para tu producto...';

    const configurableProductModifierGroups =
      useMemo(
        () => productModifierGroups,
        [productModifierGroups],
      );

    const maxTotalExtras =
      Math.max(
        0,
        Number(
          product?.max_extra_items ??
          5,
        ),
      );

    const selectedExtraCount =
      useMemo(
        () =>
          configurableProductModifierGroups
            .filter(
              association =>
                association.group?.kind ===
                'extra',
            )
            .reduce(
              (total, association) =>
                total +
                (
                  selectedModifierIdsByGroup[
                    association.modifierGroupId
                  ] ?? []
                ).length,
              0,
            ),
        [
          configurableProductModifierGroups,
          selectedModifierIdsByGroup,
        ],
      );

    const selectedModifiers =
      useMemo<
        SelectedModifier[]
      >(() => {
        return configurableProductModifierGroups
          .flatMap(
            association => {
              const selectedIds =
                selectedModifierIdsByGroup[
                association.modifierGroupId
                ] ?? [];

              const availableModifiers =
                modifiersByGroup[
                association.modifierGroupId
                ] ?? [];

              return selectedIds
                .map(
                  modifierId =>
                    availableModifiers.find(
                      modifier =>
                        modifier.id ===
                        modifierId,
                    ),
                )
                .filter(
                  (
                    modifier,
                  ): modifier is ModifierWithGroup =>
                    modifier !==
                    undefined,
                )
                .map(
                  modifier => ({
                    id: modifier.id,
                    name: modifier.name,
                    extra_price:
                      modifier.extra_price,
                    group_id:
                      modifier.group_id,
                    group:
                      modifier.group
                        ? {
                          id: modifier.group.id,
                          code: modifier.group.code,
                          name: modifier.group.name,
                        }
                        : null,
                    is_available:
                      modifier.is_available,
                  }) as SelectedModifier,
                );
            },
          );
      }, [
        configurableProductModifierGroups,
        selectedModifierIdsByGroup,
        modifiersByGroup,
      ]);

    const isSelectionValid =
      useMemo(() => {
        if (
          !product?.id ||
          comboCheckedProductId !==
          product.id ||
          comboDetectionError
        ) {
          return false;
        }

        if (isCombo) {
          return (
            comboSelection
              ?.isValid ??
            false
          );
        }

        if (
          areProductGroupsLoading ||
          productGroupsError
        ) {
          return false;
        }

        const cookingChoiceRequired =
          product.allows_oil_fryer === true &&
          product.allows_air_fryer === true;

        if (
          cookingChoiceRequired &&
          !selectedCookingMethod
        ) {
          return false;
        }

        if (
          selectedExtraCount >
          maxTotalExtras
        ) {
          return false;
        }

        for (
          const association of
          configurableProductModifierGroups
        ) {
          const selectedCount =
            (
              selectedModifierIdsByGroup[
              association.modifierGroupId
              ] ?? []
            ).length;

          const minimum =
            association.isRequired
              ? Math.max(
                1,
                association.minSelections,
              )
              : association.minSelections;

          if (
            selectedCount <
            minimum
          ) {
            return false;
          }

          if (
            selectedCount >
            association.maxSelections
          ) {
            return false;
          }
        }

        return true;
      }, [
        product?.id,
        comboCheckedProductId,
        comboDetectionError,
        isCombo,
        comboSelection,
        areProductGroupsLoading,
        productGroupsError,
        configurableProductModifierGroups,
        selectedModifierIdsByGroup,
        selectedCookingMethod,
        selectedExtraCount,
        maxTotalExtras,
      ]);

    useEffect(() => {
      if (
        !visible ||
        !product?.id
      ) {
        setIsCombo(false);
        setComboCheckedProductId(
          null,
        );
        setComboDetectionError(
          null,
        );
        return;
      }
      let isMounted =
        true;
      setIsCombo(false);
      setComboCheckedProductId(
        null,
      );
      setComboDetectionError(
        null,
      );

      const allowsOil =
        product.allows_oil_fryer ===
        true;

      const allowsAir =
        product.allows_air_fryer ===
        true;

      setSelectedCookingMethod(
        allowsOil &&
        !allowsAir
          ? 'oil'
          : allowsAir &&
            !allowsOil
            ? 'air_fryer'
            : null,
      );

      const detectCombo =
        async () => {
          try {
            const hasRecipe =
              await hasActiveComboRecipe(
                product.id,
              );
            if (!isMounted) {
              return;
            }
            setIsCombo(
              hasRecipe,
            );
            setComboCheckedProductId(
              product.id,
            );
          } catch (
          comboError
          ) {
            console.error(
              'Error detecting combo recipe:',
              comboError,
            );
            if (!isMounted) {
              return;
            }
            setIsCombo(false);
            setComboCheckedProductId(
              product.id,
            );
            setComboDetectionError(
              comboError
                instanceof Error
                ? comboError.message
                : 'No se pudo comprobar la configuración del producto.',
            );
          }
        };
      void detectCombo();
      return () => {
        isMounted =
          false;
      };
    }, [
      visible,
      product?.id,
    ]);
    useEffect(() => {
      if (!visible) {
        return;
      }
      setComboSelection(
        null,
      );
      setProductModifierGroups(
        [],
      );
      setModifiersByGroup(
        {},
      );
      setSelectedModifierIdsByGroup(
        {},
      );
      setProductGroupsError(
        null,
      );
      let isMounted =
        true;
      const loadModifierPromotion =
        async () => {
          try {
            const data =
              await getActiveModifierPromotion();
            if (
              isMounted
            ) {
              setModifierPromotion(
                data,
              );
            }
          } catch (
          modifierPromotionError
          ) {
            console.error(
              'Error loading modifier promotion:',
              modifierPromotionError,
            );
            if (
              isMounted
            ) {
              setModifierPromotion(
                null,
              );
            }
          }
        };
      const loadProductChecks =
        async () => {
          if (!product?.id || isCombo) {
            setProductCheckGroups([]);
            return;
          }
          try {
            const groups = await getEnabledProductPersonalizationGroups(product.id);
            if (!isMounted) return;
            setProductCheckGroups(groups);
            setSelectedProductCheckIdsByGroup(
              Object.fromEntries(
                groups.map(group => [
                  group.groupId,
                  group.options
                    .filter(option => option.defaultSelected)
                    .map(option => option.id),
                ]),
              ),
            );
            setExpandedPersonalizationGroupIds(
              Object.fromEntries(
                groups.map(group => [
                  group.groupId,
                  false,
                ]),
              ),
            );
          } catch (checkError) {
            console.error('Error loading product checks:', checkError);
            if (isMounted) setProductCheckGroups([]);
          }
        };
      const loadProductModifierGroups =
        async () => {
          if (
            !product?.id ||
            comboCheckedProductId !==
            product.id ||
            isCombo
          ) {
            return;
          }
          try {
            setAreProductGroupsLoading(
              true,
            );
            const associations =
              await getActiveProductModifierGroups(
                product.id,
              );
            if (
              !isMounted
            ) {
              return;
            }
            setProductModifierGroups(
              associations,
            );
            if (
              associations.length ===
              0
            ) {
              setModifiersByGroup(
                {},
              );
              return;
            }

            const [
              productOptions,
              rawGroupEntries,
            ] = await Promise.all([
              getAvailableProductModifierOptions(
                product.id,
              ),
              Promise.all(
                associations.map(
                  async association => {
                    const modifiers =
                      await getAvailableModifiersByGroupId(
                        association.modifierGroupId,
                      );
                    return [
                      association.modifierGroupId,
                      modifiers,
                    ] as const;
                  },
                ),
              ),
            ]);

            const optionPositionByModifierId =
              new Map(
                productOptions.map(
                  option => [
                    option.modifierId,
                    option.position,
                  ] as const,
                ),
              );

            const groupEntries =
              rawGroupEntries.map(
                ([groupId, modifiers]) => {
                  const configured =
                    modifiers
                      .filter(modifier =>
                        optionPositionByModifierId.has(
                          modifier.id,
                        ),
                      )
                      .sort(
                        (left, right) =>
                          (optionPositionByModifierId.get(
                            left.id,
                          ) ?? 0) -
                          (optionPositionByModifierId.get(
                            right.id,
                          ) ?? 0),
                      );

                  return [
                    groupId,
                    configured.length > 0
                      ? configured
                      : modifiers,
                  ] as const;
                },
              );
            if (
              !isMounted
            ) {
              return;
            }
            setModifiersByGroup(
              Object.fromEntries(
                groupEntries,
              ),
            );
          } catch (
          groupLoadError
          ) {
            console.error(
              'Error loading product modifier groups:',
              groupLoadError,
            );
            if (
              !isMounted
            ) {
              return;
            }
            setProductGroupsError(
              groupLoadError
                instanceof Error
                ? groupLoadError.message
                : 'No se pudieron cargar las opciones del producto.',
            );
          } finally {
            if (
              isMounted
            ) {
              setAreProductGroupsLoading(
                false,
              );
            }
          }
        };
      void loadModifierPromotion();
      void loadProductChecks();
      void loadProductModifierGroups();
      return () => {
        isMounted =
          false;
      };
    }, [
      visible,
      product?.id,
      comboCheckedProductId,
      isCombo,
    ]);
    const selectedProductChecks =
      useMemo<SelectedProductCheck[]>(() =>
        productCheckGroups.flatMap(group => {
          const selectedIds =
            selectedProductCheckIdsByGroup[
              group.groupId
            ] ?? [];

          return group.options.map(option => ({
            groupId: group.groupId,
            groupName: group.group.name,
            optionId: option.id,
            optionName: option.name,
            isSelected: selectedIds.includes(option.id),
            defaultSelected: option.defaultSelected,
          }));
        }),
      [productCheckGroups, selectedProductCheckIdsByGroup],
    );

    const areProductChecksValid = true;

    const toggleProductCheck = (group: ProductCheckAssignment, optionId: string): void => {
      setSelectedProductCheckIdsByGroup(current => {
        const selected = current[group.groupId] ?? [];
        if (selected.includes(optionId)) return { ...current, [group.groupId]: selected.filter(id => id !== optionId) };
        if (selected.length >= group.maxSelections) return current;
        return { ...current, [group.groupId]: [...selected, optionId] };
      });
    };

    const togglePersonalizationGroup = (group: ProductCheckAssignment): void => {
      setSelectedProductCheckIdsByGroup(current => {
        const selected = current[group.groupId] ?? [];
        const allIds = group.options.map(option => option.id);
        const allSelected = allIds.length > 0 && allIds.every(id => selected.includes(id));

        return {
          ...current,
          [group.groupId]: allSelected ? [] : allIds,
        };
      });
    };

    const togglePersonalizationExpanded = (groupId: string): void => {
      setExpandedPersonalizationGroupIds(current => ({
        ...current,
        [groupId]: !current[groupId],
      }));
    };

    if (!product) {
      return null;
    }
    const handleGenericModifierPress = (
      association:
        ProductModifierGroup,
      modifierId: string,
    ): void => {
      setSelectedModifierIdsByGroup(
        current => {
          const currentSelection =
            current[
            association.modifierGroupId
            ] ?? [];
          if (
            currentSelection.includes(
              modifierId,
            )
          ) {
            return {
              ...current,
              [association.modifierGroupId]:
                currentSelection.filter(
                  id =>
                    id !==
                    modifierId,
                ),
            };
          }
          if (
            association.maxSelections ===
            1
          ) {
            return {
              ...current,
              [association.modifierGroupId]:
                [
                  modifierId,
                ],
            };
          }
          if (
            currentSelection.length >=
            association.maxSelections
          ) {
            return current;
          }
          return {
            ...current,
            [association.modifierGroupId]:
              [
                ...currentSelection,
                modifierId,
              ],
          };
        },
      );
    };
    const handleDuplicateModifier = (
      association:
        ProductModifierGroup,
      modifierId: string,
    ): void => {
      if (
        !association.allowDuplicates
      ) {
        return;
      }

      setSelectedModifierIdsByGroup(
        current => {
          const currentSelection =
            current[
            association.modifierGroupId
            ] ?? [];

          if (
            currentSelection.length >=
            association.maxSelections
          ) {
            return current;
          }

          return {
            ...current,
            [association.modifierGroupId]:
              [
                ...currentSelection,
                modifierId,
              ],
          };
        },
      );
    };

    const handleIncrementExtra = (
      association: ProductModifierGroup,
      modifierId: string,
    ): void => {
      setSelectedModifierIdsByGroup(
        current => {
          const currentSelection =
            current[association.modifierGroupId] ?? [];

          const totalSelectedExtras =
            configurableProductModifierGroups
              .filter(
                group =>
                  group.group?.kind ===
                  'extra',
              )
              .reduce(
                (total, group) =>
                  total +
                  (
                    current[
                      group.modifierGroupId
                    ] ?? []
                  ).length,
                0,
              );

          if (
            currentSelection.length >= association.maxSelections ||
            totalSelectedExtras >= maxTotalExtras ||
            (!association.allowDuplicates &&
              currentSelection.includes(modifierId))
          ) {
            return current;
          }

          return {
            ...current,
            [association.modifierGroupId]: [
              ...currentSelection,
              modifierId,
            ],
          };
        },
      );
    };

    const handleDecrementExtra = (
      association: ProductModifierGroup,
      modifierId: string,
    ): void => {
      setSelectedModifierIdsByGroup(
        current => {
          const currentSelection =
            current[association.modifierGroupId] ?? [];
          const index =
            currentSelection.lastIndexOf(modifierId);

          if (index < 0) {
            return current;
          }

          const next = [...currentSelection];
          next.splice(index, 1);

          return {
            ...current,
            [association.modifierGroupId]: next,
          };
        },
      );
    };

    const toggleExtraGroup = (
      groupId: string,
    ): void => {
      setExpandedExtraGroupIds(
        current => ({
          ...current,
          [groupId]:
            !current[groupId],
        }),
      );
    };

    const toggleOptionGroup = (
      groupId: string,
    ): void => {
      setExpandedOptionGroupIds(
        current => ({
          ...current,
          [groupId]: !current[groupId],
        }),
      );
    };

    const handleConfirm =
      (): void => {
        if (
          (!isSelectionValid || !areProductChecksValid)
        ) {
          return;
        }
        if (isCombo) {
          if (
            !comboSelection ||
            !comboSelection
              .isValid
          ) {
            return;
          }
          onConfirm({
            selectedModifiers:
              [],
            selectedProductChecks: [],
            comboComponents: [
              ...comboSelection
                .components,
            ],
            cookingMethod:
              null,
          });
          return;
        }
        onConfirm({
          selectedModifiers,
          selectedProductChecks,
          comboComponents:
            [],
          cookingMethod:
            selectedCookingMethod,
        });
      };
    return (
      <Modal
        animationType="fade"
        transparent
        visible={
          visible
        }
        onRequestClose={
          onClose
        }
      >
        <View
          style={[
            styles
              .modalBackdrop,
            isPhone &&
            styles
              .modalBackdropPhone,
          ]}
        >
          <View
            style={[
              styles
                .modalContent,
              isPhone &&
              styles
                .modalContentPhone,
              isSmallPhone &&
              styles
                .modalContentSmallPhone,
              isShortScreen &&
              styles
                .modalContentShort,
            ]}
          >
            {product?.id &&
              comboCheckedProductId !==
              product.id && (
                <View
                  style={{
                    paddingVertical:
                      24,
                    alignItems:
                      'center',
                  }}
                >
                  <ActivityIndicator
                    size="large"
                    color={businessTheme.primary}
                  />
                  <Text
                    style={{
                      color:
                        '#FFFFFF',
                      marginTop:
                        10,
                    }}
                  >
                    Cargando configuración...
                  </Text>
                </View>
              )}
            {comboDetectionError && (
              <Text
                style={{
                  color:
                    '#FF5252',
                  textAlign:
                    'center',
                  marginBottom:
                    12,
                }}
              >
                {comboDetectionError}
              </Text>
            )}
            <Text
              style={[
                styles
                  .modalTitle,
                isPhone &&
                styles
                  .modalTitlePhone,
              ]}
            >
              Ajustes de{' '}
              {product.name}
            </Text>
            <Text
              style={[
                styles
                  .modalSubtitle,
                isPhone &&
                styles
                  .modalSubtitlePhone,
              ]}
            >
              {isCombo
                ? 'Configura los productos incluidos en el combo:'
                : productModifierGroups.length > 0
                  ? 'Selecciona las opciones para este producto:'
                  : 'Agrega indicaciones si lo necesitas:'}
            </Text>
            {modifierPromotion &&
              configurableProductModifierGroups.some(
                association =>
                  (
                    modifiersByGroup[
                    association.modifierGroupId
                    ] ?? []
                  ).some(
                    modifier =>
                      modifier.id ===
                      modifierPromotion.modifier_id,
                  ),
              ) && (
                <View
                  style={{
                    marginTop: 10,
                    paddingVertical:
                      9,
                    paddingHorizontal:
                      12,
                    borderRadius:
                      8,
                    borderWidth:
                      1,
                    borderColor:
                      '#8A6A00',
                    backgroundColor:
                      withAlpha(businessTheme.primary, 0.14),
                  }}
                >
                  <Text
                    style={{
                      color:
                        businessTheme.primary,
                      fontSize:
                        12,
                      fontWeight:
                        '900',
                    }}
                  >
                    🏷️ {modifierPromotion.display_name}:{' '}
                    {modifierPromotion.modifier_name}
                  </Text>
                  <Text
                    style={{
                      color:
                        '#D6C98A',
                      fontSize:
                        11,
                      marginTop:
                        3,
                    }}
                  >
                    Ahorra $
                    {modifierPromotion
                      .discount_amount
                      .toFixed(
                        2,
                      )}{' '}
                    al
                    seleccionarla.
                  </Text>
                </View>
              )}
            <ScrollView
              style={
                styles
                  .modalScroll
              }
              contentContainerStyle={
                styles
                  .modalScrollContent
              }
              showsVerticalScrollIndicator={
                false
              }
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="on-drag"
            >
              {comboCheckedProductId === product.id && isCombo && (
                <ComboConfigurator
                  product={
                    product
                  }
                  modifierPromotion={
                    modifierPromotion
                  }
                  onSelectionChange={
                    setComboSelection
                  }
                />
              )}
              {comboCheckedProductId === product.id && !isCombo &&
                areProductGroupsLoading && (
                  <View
                    style={
                      styles
                        .loadingContainer
                    }
                  >
                    <ActivityIndicator
                      size="small"
                      color={businessTheme.primary}
                    />
                    <Text
                      style={
                        styles
                          .loadingText
                      }
                    >
                      Cargando
                      opciones...
                    </Text>
                  </View>
                )}
              {comboCheckedProductId === product.id && !isCombo &&
                !areProductGroupsLoading &&
                productGroupsError && (
                  <Text
                    style={
                      styles
                        .errorText
                    }
                  >
                    {
                      productGroupsError
                    }
                  </Text>
                )}
                            {comboCheckedProductId === product.id && !isCombo &&
                !areProductGroupsLoading &&
                !productGroupsError &&
                configurableProductModifierGroups.map(
                  association => {
                    const groupName =
                      association.group
                        ?.name ??
                      'Opciones';
                    const groupModifiers =
                      modifiersByGroup[
                      association.modifierGroupId
                      ] ?? [];
                    const isExtraGroup =
                      association.group?.kind === 'extra';
                    const isLongOptionGroup =
                      !isExtraGroup &&
                      groupModifiers.length > 6;
                    const groupSearchText =
                      isExtraGroup
                        ? (extraSearchByGroupId[
                            association.modifierGroupId
                          ] ?? '')
                        : isLongOptionGroup
                          ? (optionSearchByGroupId[
                              association.modifierGroupId
                            ] ?? '')
                          : '';
                    const normalizedGroupSearch =
                      groupSearchText
                        .trim()
                        .toLocaleLowerCase('es');
                    const visibleGroupModifiers =
                      (isExtraGroup || isLongOptionGroup) &&
                      normalizedGroupSearch
                        ? groupModifiers.filter(
                            modifier =>
                              modifier.name
                                .toLocaleLowerCase('es')
                                .includes(normalizedGroupSearch),
                          )
                        : groupModifiers;
                    const selectedIds =
                      selectedModifierIdsByGroup[
                      association.modifierGroupId
                      ] ?? [];
                    const selectedCount =
                      selectedIds.length;
                    const effectiveExtraLimit =
                      isExtraGroup
                        ? Math.min(
                            association.maxSelections,
                            maxTotalExtras,
                          )
                        : association.maxSelections;
                    const isGroupCollapsible =
                      isExtraGroup || isLongOptionGroup;
                    const isGroupExpanded =
                      isExtraGroup
                        ? expandedExtraGroupIds[
                            association.modifierGroupId
                          ] === true
                        : isLongOptionGroup
                          ? expandedOptionGroupIds[
                              association.modifierGroupId
                            ] === true
                          : true;
                    return (
                      <View
                        key={association.id}
                        style={[
                          styles.requiredSection,
                          isGroupCollapsible
                            ? {
                                borderWidth: 1,
                                borderColor: '#444444',
                                borderRadius: 10,
                                backgroundColor: '#1B1B1B',
                                padding: 10,
                                marginBottom: 10,
                              }
                            : null,
                        ]}
                      >
                        <TouchableOpacity
                          disabled={!isGroupCollapsible}
                          onPress={() => {
                            if (isExtraGroup) {
                              toggleExtraGroup(
                                association.modifierGroupId,
                              );
                            } else if (isLongOptionGroup) {
                              toggleOptionGroup(
                                association.modifierGroupId,
                              );
                            }
                          }}
                          style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: 10,
                            marginBottom: 6,
                          }}
                        >
                          <Text
                            style={[
                              styles.sectionLabel,
                              {
                                flex: 1,
                                marginBottom: 0,
                              },
                            ]}
                          >
                            {isExtraGroup
                              ? 'Extras'
                              : groupName}
                            {association.isRequired ||
                              association.minSelections > 0
                              ? ' *'
                              : ''}{' '}
                            {isExtraGroup
                              ? `(${selectedCount}/${effectiveExtraLimit})`
                              : association.minSelections === association.maxSelections
                                  ? `(Selecciona ${association.maxSelections})`
                                  : `(Selecciona de ${association.minSelections} a ${association.maxSelections})`}
                          </Text>

                          {isGroupCollapsible ? (
                            <Text
                              style={{
                                color: businessTheme.primary,
                                fontSize: 16,
                                fontWeight: '900',
                              }}
                            >
                              {isGroupExpanded ? '▲' : '▼'}
                            </Text>
                          ) : null}
                        </TouchableOpacity>

                        {isLongOptionGroup && !isGroupExpanded ? (
                          <Text
                            style={{
                              color: selectedCount > 0
                                ? businessTheme.primary
                                : '#8F8F8F',
                              fontSize: 11,
                              fontWeight: selectedCount > 0 ? '800' : '600',
                              marginBottom: 2,
                            }}
                          >
                            {selectedCount > 0
                              ? `${selectedCount} seleccionada${selectedCount === 1 ? '' : 's'}`
                              : 'Toca para ver opciones'}
                          </Text>
                        ) : null}

                        {isGroupExpanded &&
                        !isExtraGroup &&
                        association.maxSelections >
                          1 && (
                            <Text
                              style={{
                                color:
                                  '#AAAAAA',
                                fontSize:
                                  12,
                                marginBottom:
                                  8,
                              }}
                            >
                              {selectedCount}/
                              {
                                association.maxSelections
                              }{' '}
                              seleccionadas
                            </Text>
                          )}
                        {isExtraGroup && isGroupExpanded ? (
                          <View
                            style={{
                              marginBottom: 10,
                              padding: 9,
                              borderRadius: 8,
                              borderWidth: 1,
                              borderColor: '#50471F',
                              backgroundColor: '#1E1B10',
                            }}
                          >
                            <Text
                              style={{
                                color: businessTheme.primary,
                                fontSize: 11,
                                fontWeight: '900',
                              }}
                            >
                              Límite: {effectiveExtraLimit} extras
                            </Text>
                            <Text
                              style={{
                                color: '#9A9A9A',
                                fontSize: 9,
                                marginTop: 2,
                                lineHeight: 13,
                              }}
                            >
                              Puedes agregar hasta {effectiveExtraLimit} extras en este producto.
                            </Text>
                          </View>
                        ) : null}

                        {isGroupCollapsible && isGroupExpanded ? (
                          <View style={{ marginBottom: 10 }}>
                            <TextInput
                              value={groupSearchText}
                              onChangeText={value => {
                                if (isExtraGroup) {
                                  setExtraSearchByGroupId(current => ({
                                    ...current,
                                    [association.modifierGroupId]: value,
                                  }));
                                } else {
                                  setOptionSearchByGroupId(current => ({
                                    ...current,
                                    [association.modifierGroupId]: value,
                                  }));
                                }
                              }}
                              placeholder={
                                isExtraGroup
                                  ? 'Buscar extra...'
                                  : `Buscar en ${groupName}...`
                              }
                              placeholderTextColor="#777777"
                              autoCapitalize="none"
                              autoCorrect={false}
                              style={{
                                minHeight: 44,
                                borderWidth: 1,
                                borderColor: '#4B4B4B',
                                borderRadius: 9,
                                backgroundColor: '#171717',
                                color: '#FFFFFF',
                                paddingHorizontal: 12,
                                fontSize: 13,
                              }}
                            />
                            {normalizedGroupSearch &&
                            visibleGroupModifiers.length === 0 ? (
                              <Text
                                style={{
                                  color: '#888888',
                                  fontSize: 11,
                                  marginTop: 7,
                                }}
                              >
                                No hay opciones que coincidan con “{groupSearchText.trim()}”.
                              </Text>
                            ) : null}
                          </View>
                        ) : null}
                        {!isGroupExpanded ? null :
                        groupModifiers.length ===
                          0 ? (
                          <Text
                            style={{
                              color:
                                '#888888',
                              fontSize:
                                11,
                              marginBottom:
                                8,
                            }}
                          >
                            No hay opciones disponibles para este grupo.
                          </Text>
                        ) : (
                          <View
                            style={[
                              styles
                                .optionsContainerHorizontal,
                              isPhone &&
                              styles
                                .optionsContainerPhone,
                            ]}
                          >
                            {visibleGroupModifiers.map(
                              modifier => {
                                const selectedCountForModifier =
                                  selectedIds.filter(
                                    id =>
                                      id ===
                                      modifier.id,
                                  ).length;

                                const isSelected =
                                  selectedCountForModifier >
                                  0;

                                const isModifierPromotion =
                                  modifierPromotion
                                    ?.modifier_id ===
                                  modifier.id;

                                if (isExtraGroup) {
                                  const canAdd =
                                    selectedIds.length <
                                      association.maxSelections &&
                                    selectedExtraCount <
                                      maxTotalExtras &&
                                    (association.allowDuplicates ||
                                      !isSelected);

                                  return (
                                    <View
                                      key={modifier.id}
                                      style={{
                                        width: '100%',
                                        minHeight: 58,
                                        borderRadius: 10,
                                        borderWidth: 1,
                                        borderColor: isSelected
                                          ? businessTheme.primary
                                          : '#555555',
                                        backgroundColor: isSelected
                                          ? withAlpha(businessTheme.primary, 0.12)
                                          : '#202020',
                                        paddingHorizontal: 12,
                                        paddingVertical: 9,
                                        flexDirection: 'row',
                                        alignItems: 'center',
                                        gap: 10,
                                      }}
                                    >
                                      <View style={{ flex: 1 }}>
                                        <Text
                                          style={{
                                            color: '#FFFFFF',
                                            fontSize: 13,
                                            fontWeight: '800',
                                          }}
                                        >
                                          {modifier.name}
                                        </Text>
                                        <Text
                                          style={{
                                            color: businessTheme.primary,
                                            fontSize: 11,
                                            fontWeight: '800',
                                            marginTop: 3,
                                          }}
                                        >
                                          +{formatCurrency(
                                            Number(modifier.extra_price ?? 0),
                                          )} c/u
                                        </Text>
                                      </View>

                                      <TouchableOpacity
                                        disabled={selectedCountForModifier === 0}
                                        onPress={() =>
                                          handleDecrementExtra(
                                            association,
                                            modifier.id,
                                          )
                                        }
                                        style={{
                                          width: 38,
                                          height: 38,
                                          borderRadius: 8,
                                          borderWidth: 1,
                                          borderColor: '#666666',
                                          alignItems: 'center',
                                          justifyContent: 'center',
                                          opacity: selectedCountForModifier === 0 ? 0.35 : 1,
                                        }}
                                      >
                                        <Text style={{ color: '#FFFFFF', fontSize: 20, fontWeight: '900' }}>−</Text>
                                      </TouchableOpacity>

                                      <Text
                                        style={{
                                          minWidth: 24,
                                          color: '#FFFFFF',
                                          fontSize: 16,
                                          fontWeight: '900',
                                          textAlign: 'center',
                                        }}
                                      >
                                        {selectedCountForModifier}
                                      </Text>

                                      <TouchableOpacity
                                        disabled={!canAdd}
                                        onPress={() =>
                                          handleIncrementExtra(
                                            association,
                                            modifier.id,
                                          )
                                        }
                                        style={{
                                          width: 38,
                                          height: 38,
                                          borderRadius: 8,
                                          backgroundColor: businessTheme.primary,
                                          alignItems: 'center',
                                          justifyContent: 'center',
                                          opacity: canAdd ? 1 : 0.35,
                                        }}
                                      >
                                        <Text style={{ color: '#111111', fontSize: 20, fontWeight: '900' }}>+</Text>
                                      </TouchableOpacity>
                                    </View>
                                  );
                                }

                                return (
                                  <TouchableOpacity
                                    key={modifier.id}
                                    style={[
                                      styles.optionButtonChip,
                                      isPhone
                                        ? styles.optionButtonChipPhone
                                        : styles.optionButtonChipTablet,
                                      {
                                        flexBasis: isPhone ? '100%' : '48%',
                                        flexGrow: 1,
                                        flexShrink: 1,
                                        minHeight: 46,
                                        justifyContent: 'center',
                                        alignItems: 'center',
                                      },
                                      isSelected && styles.optionButtonSelected,
                                      isModifierPromotion && {
                                        borderColor: businessTheme.primary,
                                        borderWidth: 2,
                                      },
                                    ]}
                                    onPress={() =>
                                      handleGenericModifierPress(
                                        association,
                                        modifier.id,
                                      )
                                    }
                                    activeOpacity={0.8}
                                  >
                                    <Text
                                      numberOfLines={2}
                                      style={[
                                        styles.optionText,
                                        { width: '100%', textAlign: 'center' },
                                        isPhone && styles.optionTextPhone,
                                        isSelected && styles.optionTextSelected,
                                      ]}
                                    >
                                      {isModifierPromotion ? '🌶️ ' : ''}
                                      {modifier.name}
                                      {selectedCountForModifier > 1
                                        ? ` (x${selectedCountForModifier})`
                                        : ''}
                                      {Number(modifier.extra_price) > 0
                                        ? ` (+${formatCurrency(Number(modifier.extra_price))})`
                                        : ''}
                                    </Text>

                                    {association.allowDuplicates &&
                                      isSelected &&
                                      selectedIds.length < association.maxSelections && (
                                        <TouchableOpacity
                                          onPress={() =>
                                            handleDuplicateModifier(
                                              association,
                                              modifier.id,
                                            )
                                          }
                                          style={{
                                            marginTop: 6,
                                            paddingVertical: 5,
                                            paddingHorizontal: 8,
                                            borderRadius: 6,
                                            borderWidth: 1,
                                            borderColor: '#777777',
                                          }}
                                        >
                                          <Text style={{ color: '#FFFFFF', fontSize: 10, fontWeight: '700', textAlign: 'center' }}>
                                            + Agregar otra
                                          </Text>
                                        </TouchableOpacity>
                                      )}
                                  </TouchableOpacity>
                                );
                              },
                            )}
                          </View>
                        )}
                      </View>
                    );
                  },
                )}
              {comboCheckedProductId === product.id &&
              !isCombo &&
              productCheckGroups.length > 0 ? (
                <View style={styles.requiredSection}>
                  <Text style={styles.sectionLabel}>
                    Personaliza tu producto
                  </Text>

                  <Text
                    style={{
                      color: '#AAAAAA',
                      fontSize: 11,
                      lineHeight: 16,
                      marginBottom: 10,
                    }}
                  >
                    Marca el grupo completo para incluir todo o despliega sus opciones para quitar/agregar elementos individuales.
                  </Text>

                  <View style={{ gap: 9 }}>
                    {productCheckGroups.map(group => {
                      const selected =
                        selectedProductCheckIdsByGroup[
                          group.groupId
                        ] ?? [];

                      const allIds =
                        group.options.map(
                          option => option.id,
                        );

                      const allSelected =
                        allIds.length > 0 &&
                        allIds.every(id =>
                          selected.includes(id),
                        );

                      const someSelected =
                        selected.length > 0 &&
                        !allSelected;

                      const expanded =
                        expandedPersonalizationGroupIds[
                          group.groupId
                        ] === true;

                      return (
                        <View
                          key={group.groupId}
                          style={{
                            borderRadius: 10,
                            borderWidth: 1,
                            borderColor: allSelected || someSelected
                              ? businessTheme.primary
                              : '#444444',
                            backgroundColor: '#1D1D1D',
                            overflow: 'hidden',
                          }}
                        >
                          <View
                            style={{
                              minHeight: 54,
                              paddingHorizontal: 11,
                              flexDirection: 'row',
                              alignItems: 'center',
                              gap: 10,
                            }}
                          >
                            <TouchableOpacity
                              onPress={() =>
                                togglePersonalizationGroup(
                                  group,
                                )
                              }
                              activeOpacity={0.8}
                              style={{
                                width: 26,
                                height: 26,
                                borderRadius: 6,
                                borderWidth: 2,
                                borderColor:
                                  allSelected || someSelected
                                    ? businessTheme.primary
                                    : '#707070',
                                backgroundColor: allSelected
                                  ? businessTheme.primary
                                  : 'transparent',
                                alignItems: 'center',
                                justifyContent: 'center',
                              }}
                            >
                              <Text
                                style={{
                                  color: allSelected
                                    ? '#111111'
                                    : businessTheme.primary,
                                  fontSize: 15,
                                  fontWeight: '900',
                                }}
                              >
                                {allSelected
                                  ? '✓'
                                  : someSelected
                                    ? '−'
                                    : ''}
                              </Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                              onPress={() =>
                                togglePersonalizationExpanded(
                                  group.groupId,
                                )
                              }
                              style={{
                                flex: 1,
                                minHeight: 54,
                                justifyContent: 'center',
                              }}
                            >
                              <Text
                                style={{
                                  color: '#FFFFFF',
                                  fontSize: 13,
                                  fontWeight: '900',
                                }}
                              >
                                {group.group.name}
                              </Text>
                              <Text
                                style={{
                                  color: '#8F8F8F',
                                  fontSize: 10,
                                  marginTop: 2,
                                }}
                              >
                                {allSelected
                                  ? 'Todo incluido'
                                  : selected.length === 0
                                    ? 'Nada incluido'
                                    : `${selected.length} de ${group.options.length} incluidos`}
                              </Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                              onPress={() =>
                                togglePersonalizationExpanded(
                                  group.groupId,
                                )
                              }
                              style={{
                                width: 38,
                                height: 38,
                                alignItems: 'center',
                                justifyContent: 'center',
                              }}
                            >
                              <Text
                                style={{
                                  color: businessTheme.primary,
                                  fontSize: 15,
                                  fontWeight: '900',
                                }}
                              >
                                {expanded ? '▲' : '▼'}
                              </Text>
                            </TouchableOpacity>
                          </View>

                          {expanded ? (
                            <View
                              style={{
                                borderTopWidth: 1,
                                borderTopColor: '#343434',
                                padding: 9,
                                gap: 7,
                              }}
                            >
                              {group.options.map(option => {
                                const isSelected =
                                  selected.includes(
                                    option.id,
                                  );

                                return (
                                  <TouchableOpacity
                                    key={option.id}
                                    onPress={() =>
                                      toggleProductCheck(
                                        group,
                                        option.id,
                                      )
                                    }
                                    activeOpacity={0.8}
                                    style={{
                                      minHeight: 46,
                                      borderRadius: 8,
                                      borderWidth: 1,
                                      borderColor: isSelected
                                        ? businessTheme.primary
                                        : '#424242',
                                      backgroundColor: isSelected
                                        ? withAlpha(
                                            businessTheme.primary,
                                            0.08,
                                          )
                                        : '#202020',
                                      paddingHorizontal: 10,
                                      flexDirection: 'row',
                                      alignItems: 'center',
                                      gap: 10,
                                    }}
                                  >
                                    <View
                                      style={{
                                        width: 22,
                                        height: 22,
                                        borderRadius: 5,
                                        borderWidth: 2,
                                        borderColor: isSelected
                                          ? businessTheme.primary
                                          : '#707070',
                                        backgroundColor: isSelected
                                          ? businessTheme.primary
                                          : 'transparent',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                      }}
                                    >
                                      {isSelected ? (
                                        <Text
                                          style={{
                                            color: '#111111',
                                            fontSize: 13,
                                            fontWeight: '900',
                                          }}
                                        >
                                          ✓
                                        </Text>
                                      ) : null}
                                    </View>

                                    <Text
                                      style={{
                                        flex: 1,
                                        color: '#FFFFFF',
                                        fontSize: 12,
                                        fontWeight: '700',
                                      }}
                                    >
                                      {option.name}
                                    </Text>
                                  </TouchableOpacity>
                                );
                              })}
                            </View>
                          ) : null}
                        </View>
                      );
                    })}
                  </View>
                </View>
              ) : null}


              {comboCheckedProductId === product.id &&
              !isCombo &&
              (
                product.allows_oil_fryer === true ||
                product.allows_air_fryer === true
              ) ? (
                <View
                  style={
                    styles.cookingSection
                  }
                >
                  <Text
                    style={
                      styles.sectionLabel
                    }
                  >
                    Método de cocción
                  </Text>

                  <View
                    style={
                      styles.cookingOptions
                    }
                  >
                    {product.allows_oil_fryer === true ? (
                      <TouchableOpacity
                        style={[
                          styles.cookingOption,
                          selectedCookingMethod === 'oil' &&
                          styles.optionButtonSelected,
                        ]}
                        onPress={() =>
                          setSelectedCookingMethod(
                            'oil',
                          )
                        }
                      >
                        <Text
                          style={[
                            styles.optionText,
                            selectedCookingMethod === 'oil' &&
                            styles.optionTextSelected,
                          ]}
                        >
                          Aceite
                        </Text>
                      </TouchableOpacity>
                    ) : null}

                    {product.allows_air_fryer === true ? (
                      <TouchableOpacity
                        style={[
                          styles.cookingOption,
                          selectedCookingMethod === 'air_fryer' &&
                          styles.optionButtonSelected,
                        ]}
                        onPress={() =>
                          setSelectedCookingMethod(
                            'air_fryer',
                          )
                        }
                      >
                        <Text
                          style={[
                            styles.optionText,
                            selectedCookingMethod === 'air_fryer' &&
                            styles.optionTextSelected,
                          ]}
                        >
                          Freidora de aire
                        </Text>
                      </TouchableOpacity>
                    ) : null}
                  </View>

                  {selectedCookingMethod === 'air_fryer' ? (
                    <Text
                      style={
                        styles.airFryerWarning
                      }
                    >
                      Puede tardar aproximadamente{' '}
                      {Math.max(
                        0,
                        Number(
                          product.air_fryer_extra_minutes ??
                          0,
                        ),
                      )}{' '}
                      min adicionales.
                    </Text>
                  ) : null}
                </View>
              ) : null}

              {comboCheckedProductId === product.id && !isCombo && (
                <>
                  <Text
                    style={[
                      styles
                        .sectionLabel,
                      styles
                        .notesLabel,
                    ]}
                  >
                    Notas
                    adicionales
                    (opcional)
                  </Text>
                  <TextInput
                    style={[
                      styles
                        .notesInput,
                      isPhone &&
                      styles
                        .notesInputPhone,
                      Platform.OS ===
                      'web' &&
                      isPhone && {
                        fontSize:
                          16,
                      },
                    ]}
                    placeholder={
                      notesPlaceholder
                    }
                    placeholderTextColor="#666"
                    value={
                      notes
                    }
                    onChangeText={
                      onNotesChange
                    }
                    multiline
                    numberOfLines={
                      3
                    }
                  />
                </>
              )}
            </ScrollView>
            {comboCheckedProductId === product.id && !isCombo && (
              <View
                style={[
                  styles
                    .modalActions,
                  isSmallPhone &&
                  styles
                    .modalActionsPhone,
                ]}
              >
                <TouchableOpacity
                  style={[
                    styles
                      .modalCancelBtn,
                    isSmallPhone &&
                    styles
                      .modalActionButtonPhone,
                  ]}
                  onPress={
                    onClose
                  }
                  activeOpacity={
                    0.7
                  }
                >
                  <Text
                    style={
                      styles
                        .modalCancelText
                    }
                  >
                    Cancelar
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles
                      .modalAddBtn,
                    isSmallPhone &&
                    styles
                      .modalActionButtonPhone,
                    !isSelectionValid &&
                    styles
                      .modalAddBtnDisabled,
                  ]}
                  onPress={
                    handleConfirm
                  }
                  disabled={
                    !isSelectionValid
                  }
                  activeOpacity={
                    0.7
                  }
                >
                  <Text
                    style={[
                      styles
                        .modalAddText,
                      !isSelectionValid &&
                      styles
                        .modalAddTextDisabled,
                    ]}
                  >
                    Agregar al
                    ticket
                  </Text>
                </TouchableOpacity>
              </View>
            )}
            {comboCheckedProductId === product.id && isCombo && (
              <View
                style={[
                  styles
                    .modalActions,
                  isSmallPhone &&
                  styles
                    .modalActionsPhone,
                ]}
              >
                <TouchableOpacity
                  style={[
                    styles
                      .modalCancelBtn,
                    isSmallPhone &&
                    styles
                      .modalActionButtonPhone,
                  ]}
                  onPress={
                    onClose
                  }
                  activeOpacity={
                    0.7
                  }
                >
                  <Text
                    style={
                      styles
                        .modalCancelText
                    }
                  >
                    Cancelar
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles
                      .modalAddBtn,
                    isSmallPhone &&
                    styles
                      .modalActionButtonPhone,
                    !isSelectionValid &&
                    styles
                      .modalAddBtnDisabled,
                  ]}
                  disabled={
                    !isSelectionValid
                  }
                  activeOpacity={
                    0.7
                  }
                  onPress={
                    handleConfirm
                  }
                >
                  <Text
                    style={[
                      styles
                        .modalAddText,
                      !isSelectionValid &&
                      styles
                        .modalAddTextDisabled,
                    ]}
                  >
                    Agregar al
                    ticket
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </Modal>
    );
  };
