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
  SelectedModifier,
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
export interface ProductConfigurationResult {
  selectedModifiers: SelectedModifier[];
  comboComponents: ComboComponentSelection[];
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
    const notesPlaceholder =
      'Ej: Indicaciones especiales para tu producto...';

    const configurableProductModifierGroups =
      useMemo(
        () => productModifierGroups,
        [productModifierGroups],
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

    const handleConfirm =
      (): void => {
        if (
          !isSelectionValid
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
            comboComponents: [
              ...comboSelection
                .components,
            ],
          });
          return;
        }
        onConfirm({
          selectedModifiers,
          comboComponents:
            [],
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
                    const selectedIds =
                      selectedModifierIdsByGroup[
                      association.modifierGroupId
                      ] ?? [];
                    const selectedCount =
                      selectedIds.length;
                    return (
                      <View
                        key={
                          association.id
                        }
                        style={
                          styles
                            .requiredSection
                        }
                      >
                        <Text
                          style={
                            styles
                              .sectionLabel
                          }
                        >
                          {groupName}
                          {association.isRequired ||
                            association.minSelections >
                            0
                            ? ' *'
                            : ''}{' '}
                          {association.minSelections ===
                            association.maxSelections
                            ? `(Selecciona ${association.maxSelections})`
                            : `(Selecciona de ${association.minSelections} a ${association.maxSelections})`}
                        </Text>
                        {association.maxSelections >
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
                        {groupModifiers.length ===
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
                            {groupModifiers.map(
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

                                return (
                                  <TouchableOpacity
                                    key={
                                      modifier.id
                                    }
                                    style={[
                                      styles
                                        .optionButtonChip,
                                      isPhone
                                        ? styles
                                          .optionButtonChipPhone
                                        : styles
                                          .optionButtonChipTablet,
                                      {
                                        flexBasis:
                                          isPhone
                                            ? '100%'
                                            : '48%',
                                        flexGrow:
                                          1,
                                        flexShrink:
                                          1,
                                        minHeight:
                                          46,
                                        justifyContent:
                                          'center',
                                        alignItems:
                                          'center',
                                      },
                                      isSelected &&
                                      styles
                                        .optionButtonSelected,
                                      isModifierPromotion && {
                                        borderColor:
                                          businessTheme.primary,
                                        borderWidth:
                                          2,
                                      },
                                    ]}
                                    onPress={() =>
                                      handleGenericModifierPress(
                                        association,
                                        modifier.id,
                                      )
                                    }
                                    activeOpacity={
                                      0.8
                                    }
                                  >
                                    <Text
                                      numberOfLines={
                                        2
                                      }
                                      style={[
                                        styles
                                          .optionText,
                                        {
                                          width:
                                            '100%',
                                          textAlign:
                                            'center',
                                        },
                                        isPhone &&
                                        styles
                                          .optionTextPhone,
                                        isSelected &&
                                        styles
                                          .optionTextSelected,
                                      ]}
                                    >
                                      {isModifierPromotion
                                        ? '🌶️ '
                                        : ''}
                                      {
                                        modifier.name
                                      }
                                      {selectedCountForModifier >
                                        1
                                        ? ` (x${selectedCountForModifier})`
                                        : ''}
                                      {Number(
                                        modifier.extra_price,
                                      ) >
                                        0
                                        ? ` (+${formatCurrency(
                                          Number(
                                            modifier.extra_price,
                                          ),
                                        )})`
                                        : ''}
                                    </Text>

                                    {isModifierPromotion &&
                                      modifierPromotion && (
                                        <Text
                                          style={{
                                            color:
                                              '#D6C98A',
                                            fontSize:
                                              9,
                                            fontWeight:
                                              '800',
                                            marginTop:
                                              3,
                                            textAlign:
                                              'center',
                                          }}
                                        >
                                          Ahorra $
                                          {modifierPromotion
                                            .discount_amount
                                            .toFixed(
                                              2,
                                            )}
                                        </Text>
                                      )}

                                    {association.allowDuplicates &&
                                      isSelected &&
                                      selectedIds.length <
                                      association.maxSelections && (
                                        <TouchableOpacity
                                          onPress={() =>
                                            handleDuplicateModifier(
                                              association,
                                              modifier.id,
                                            )
                                          }
                                          style={{
                                            marginTop:
                                              6,
                                            paddingVertical:
                                              5,
                                            paddingHorizontal:
                                              8,
                                            borderRadius:
                                              6,
                                            borderWidth:
                                              1,
                                            borderColor:
                                              '#777777',
                                          }}
                                        >
                                          <Text
                                            style={{
                                              color:
                                                '#FFFFFF',
                                              fontSize:
                                                10,
                                              fontWeight:
                                                '700',
                                              textAlign:
                                                'center',
                                            }}
                                          >
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
