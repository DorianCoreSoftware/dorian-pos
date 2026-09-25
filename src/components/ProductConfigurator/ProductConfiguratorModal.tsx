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
  getActiveProductModifierGroups,
  ProductModifierGroup,
} from '../../services/productModifierGroupService';
import {
  getActiveWeeklySauce,
  WeeklySauce,
} from '../../services/weeklySauceService';
import {
  getAvailableProductFlavors,
  ProductFlavor,
} from '../../services/productFlavorService';
import {
  styles,
} from '../modifier-modal/ModifierModal.styles';
import {
  ComboConfigurator,
  ComboConfiguratorSelection,
} from './ComboConfigurator';
import { hasActiveComboRecipe } from '../../services/comboService';
export interface ProductConfigurationResult {
  selectedModifiers: SelectedModifier[];
  comboComponents: ComboComponentSelection[];
}
interface ProductConfiguratorModalProps {
  visible: boolean;
  product: Product | null;
  notes: string;
  meats: SelectedModifier[];
  sauces: SelectedModifier[];
  isLoading: boolean;
  error: string | null;
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
    meats,
    sauces,
    isLoading,
    error,
    onNotesChange,
    onClose,
    onConfirm,
  }) => {
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
      selectedMeatIds,
      setSelectedMeatIds,
    ] = useState<string[]>([]);
    const [
      selectedSauceIds,
      setSelectedSauceIds,
    ] = useState<string[]>([]);
    const [
      productFlavors,
      setProductFlavors,
    ] = useState<ProductFlavor[]>([]);
    const [
      selectedFlavorId,
      setSelectedFlavorId,
    ] = useState<
      string | null
    >(null);
    const [
      areFlavorsLoading,
      setAreFlavorsLoading,
    ] = useState(false);
    const [
      flavorsError,
      setFlavorsError,
    ] = useState<
      string | null
    >(null);
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
      weeklySauce,
      setWeeklySauce,
    ] = useState<
      WeeklySauce | null
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
    const meatGroupAssociation =
      useMemo(
        () =>
          productModifierGroups.find(
            association =>
              association.group
                ?.code ===
              'meat',
          ) ?? null,
        [
          productModifierGroups,
        ],
      );
    const sauceGroupAssociation =
      useMemo(
        () =>
          productModifierGroups.find(
            association =>
              association.group
                ?.code ===
              'sauce',
          ) ?? null,
        [
          productModifierGroups,
        ],
      );
    const minimumMeats =
      meatGroupAssociation
        ?.minSelections ??
      0;
    const maximumMeats =
      meatGroupAssociation
        ?.maxSelections ??
      0;
    const requiresMeat =
      Boolean(
        meatGroupAssociation &&
        (
          meatGroupAssociation
            .isRequired ||
          minimumMeats > 0
        ),
      );
    const allowsMultipleMeats =
      maximumMeats > 1;
    const minimumSauces =
      sauceGroupAssociation
        ?.minSelections ??
      0;
    const maximumSauces =
      sauceGroupAssociation
        ?.maxSelections ??
      0;
    const requiresSauce =
      Boolean(
        sauceGroupAssociation &&
        (
          sauceGroupAssociation
            .isRequired ||
          minimumSauces > 0
        ),
      );
    const notesPlaceholder =
      'Ej: Indicaciones especiales para tu producto...';
    /**
     * Estos grupos son los que todavía maneja
     * el configurador legacy para no duplicarlos.
     *
     * Cualquier otro grupo asociado al producto
     * se renderiza de forma genérica.
     */
    const genericProductModifierGroups =
      useMemo(
        () =>
          productModifierGroups.filter(
            association => {
              const code =
                association.group
                  ?.code;
              return (
                code !== 'meat' &&
                code !== 'sauce' &&
                code !== 'drink_flavor'
              );
            },
          ),
        [
          productModifierGroups,
        ],
      );
    const selectedModifiers =
      useMemo<
        SelectedModifier[]
      >(() => {
        const selectedMeats =
          selectedMeatIds
            .map(
              (modifierId) =>
                meats.find(
                  (
                    modifier,
                  ) =>
                    modifier.id ===
                    modifierId,
                ),
            )
            .filter(
              (
                modifier,
              ): modifier is SelectedModifier =>
                modifier !==
                undefined,
            );
        const selectedSauces =
          selectedSauceIds
            .map(
              (modifierId) =>
                sauces.find(
                  (
                    modifier,
                  ) =>
                    modifier.id ===
                    modifierId,
                ),
            )
            .filter(
              (
                modifier,
              ): modifier is SelectedModifier =>
                modifier !==
                undefined,
            );
        const selectedFlavor =
          selectedFlavorId
            ? productFlavors.find(
              (flavor) =>
                flavor.id ===
                selectedFlavorId,
            )
            : undefined;
        const flavorModifier:
          SelectedModifier | null =
          selectedFlavor
            ? {
              id:
                selectedFlavor
                  .modifierId,
              name:
                selectedFlavor.name,
              extra_price:
                '0.00',
              group_name:
                'Sabor',
              is_available:
                selectedFlavor
                  .isAvailable,
            }
            : null;
        const genericModifiers =
          genericProductModifierGroups
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
                      id:
                        modifier.id,
                      name:
                        modifier.name,
                      extra_price:
                        modifier.extra_price,
                      group_name:
                        modifier.group_name,
                      is_available:
                        modifier.is_available,
                    }) as SelectedModifier,
                  );
              },
            );
        return [
          ...selectedMeats,
          ...selectedSauces,
          ...genericModifiers,
          ...(flavorModifier
            ? [
              flavorModifier,
            ]
            : []),
        ];
      }, [
        selectedMeatIds,
        selectedSauceIds,
        selectedFlavorId,
        productFlavors,
        meats,
        sauces,
        genericProductModifierGroups,
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
          isLoading ||
          error ||
          areFlavorsLoading ||
          flavorsError ||
          areProductGroupsLoading ||
          productGroupsError
        ) {
          return false;
        }
        if (
          meatGroupAssociation &&
          (
            selectedMeatIds.length <
              minimumMeats ||
            selectedMeatIds.length >
              maximumMeats
          )
        ) {
          return false;
        }
        if (
          requiresMeat &&
          selectedMeatIds.length ===
          0
        ) {
          return false;
        }
        if (
          sauceGroupAssociation &&
          (
            selectedSauceIds.length <
              minimumSauces ||
            selectedSauceIds.length >
              maximumSauces
          )
        ) {
          return false;
        }
        if (
          requiresSauce &&
          selectedSauceIds.length ===
          0
        ) {
          return false;
        }
        if (
          productFlavors.length >
          0 &&
          !selectedFlavorId
        ) {
          return false;
        }
        for (
          const association of
          genericProductModifierGroups
        ) {
          const selectedCount =
            (
              selectedModifierIdsByGroup[
                association.modifierGroupId
              ] ?? []
            ).length;
          if (
            selectedCount <
            association.minSelections
          ) {
            return false;
          }
          if (
            selectedCount >
            association.maxSelections
          ) {
            return false;
          }
          if (
            association.isRequired &&
            selectedCount ===
            0
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
        isLoading,
        error,
        areFlavorsLoading,
        flavorsError,
        meatGroupAssociation,
        minimumMeats,
        maximumMeats,
        requiresMeat,
        sauceGroupAssociation,
        minimumSauces,
        maximumSauces,
        requiresSauce,
        selectedMeatIds,
        selectedSauceIds,
        productFlavors,
        selectedFlavorId,
        areProductGroupsLoading,
        productGroupsError,
        genericProductModifierGroups,
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
      setSelectedMeatIds([]);
      setSelectedSauceIds([]);
      setSelectedFlavorId(
        null,
      );
      setProductFlavors([]);
      setComboSelection(
        null,
      );
      setFlavorsError(
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
      const loadWeeklySauce =
        async () => {
          try {
            const data =
              await getActiveWeeklySauce();
            if (
              isMounted
            ) {
              setWeeklySauce(
                data,
              );
            }
          } catch (
          weeklySauceError
          ) {
            console.error(
              'Error loading weekly sauce:',
              weeklySauceError,
            );
            if (
              isMounted
            ) {
              setWeeklySauce(
                null,
              );
            }
          }
        };
      const loadProductFlavors =
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
            setAreFlavorsLoading(
              true,
            );
            const flavors =
              await getAvailableProductFlavors(
                product.id,
              );
            if (
              !isMounted
            ) {
              return;
            }
            setProductFlavors(
              flavors,
            );
          } catch (
          flavorLoadError
          ) {
            console.error(
              'Error loading product flavors:',
              flavorLoadError,
            );
            if (
              !isMounted
            ) {
              return;
            }
            setFlavorsError(
              flavorLoadError
                instanceof Error
                ? flavorLoadError
                  .message
                : 'No se pudieron cargar los sabores.',
            );
          } finally {
            if (
              isMounted
            ) {
              setAreFlavorsLoading(
                false,
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
            const genericAssociations =
              associations.filter(
                association => {
                  const code =
                    association.group
                      ?.code;
                  return (
                    code !== 'meat' &&
                    code !== 'sauce' &&
                    code !== 'drink_flavor'
                  );
                },
              );
            setProductModifierGroups(
              associations,
            );
            if (
              genericAssociations.length ===
              0
            ) {
              setModifiersByGroup(
                {},
              );
              return;
            }
            const groupEntries =
              await Promise.all(
                genericAssociations.map(
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
      void loadWeeklySauce();
      void loadProductFlavors();
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
    const handleMeatPress = (
      modifierId: string,
    ): void => {
      setSelectedMeatIds(
        (
          currentSelection,
        ) => {
          if (
            currentSelection
              .includes(
                modifierId,
              )
          ) {
            return currentSelection
              .filter(
                (id) =>
                  id !==
                  modifierId,
              );
          }
          if (
            maximumMeats ===
            1
          ) {
            return [
              modifierId,
            ];
          }
          if (
            currentSelection
              .length >=
            maximumMeats
          ) {
            return currentSelection;
          }
          return [
            ...currentSelection,
            modifierId,
          ];
        },
      );
    };
    const handleDoubleMeat = (
      modifierId: string,
    ): void => {
      setSelectedMeatIds(
        (
          currentSelection,
        ) => {
          if (
            !allowsMultipleMeats ||
            currentSelection
              .length !==
            1
          ) {
            return currentSelection;
          }
          return [
            modifierId,
            modifierId,
          ];
        },
      );
    };
    const handleSaucePress = (
      modifierId: string,
    ): void => {
      setSelectedSauceIds(
        (
          currentSelection,
        ) => {
          if (
            currentSelection
              .includes(
                modifierId,
              )
          ) {
            return currentSelection
              .filter(
                (id) =>
                  id !==
                  modifierId,
              );
          }
          if (
            maximumSauces <= 0 ||
            currentSelection
              .length >=
            maximumSauces
          ) {
            return currentSelection;
          }
          return [
            ...currentSelection,
            modifierId,
          ];
        },
      );
    };
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
    const selectedSingleMeat =
      selectedMeatIds
        .length === 1
        ? meats.find(
          (
            modifier,
          ) =>
            modifier.id ===
            selectedMeatIds[0],
        )
        : undefined;
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
                    color="#FFBF00"
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
                : requiresMeat
                  ? maximumMeats > 1
                    ? `Selecciona entre ${minimumMeats || 1} y ${maximumMeats} opciones de ${meatGroupAssociation?.group?.name ?? 'este grupo'}:`
                    : `Selecciona ${meatGroupAssociation?.group?.name ?? 'la opción'} obligatoria:`
                  : sauceGroupAssociation
                    ? maximumSauces > 1
                      ? `Selecciona entre ${minimumSauces} y ${maximumSauces} opciones de ${sauceGroupAssociation.group?.name ?? 'este grupo'}:`
                      : requiresSauce
                        ? `Selecciona ${sauceGroupAssociation.group?.name ?? 'la opción'} obligatoria:`
                        : `Selecciona ${sauceGroupAssociation.group?.name ?? 'una opción'} si lo deseas:`
                    : ''}
            </Text>
            {weeklySauce &&
              sauceGroupAssociation && (
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
                      '#302800',
                  }}
                >
                  <Text
                    style={{
                      color:
                        '#FFBF00',
                      fontSize:
                        12,
                      fontWeight:
                        '900',
                    }}
                  >
                    🌶️ Salsa de
                    la Semana:{' '}
                    {
                      weeklySauce
                        .modifier_name
                    }
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
                    {weeklySauce
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
              {comboCheckedProductId === product.id && !isCombo &&
                isLoading && (
                  <View
                    style={
                      styles
                        .loadingContainer
                    }
                  >
                    <ActivityIndicator
                      size="large"
                      color="#FFBF00"
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
                !isLoading &&
                error && (
                  <Text
                    style={
                      styles
                        .errorText
                    }
                  >
                    {error}
                  </Text>
                )}
              {comboCheckedProductId === product.id && isCombo && (
                <ComboConfigurator
                  product={
                    product
                  }
                  weeklySauce={
                    weeklySauce
                  }
                  onSelectionChange={
                    setComboSelection
                  }
                />
              )}
              {!isLoading &&
                !error &&
                meatGroupAssociation && (
                  <View
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
                      {meatGroupAssociation
                        ?.group
                        ?.name ??
                        'Opciones'}{' '}
                      {requiresMeat
                        ? '* '
                        : ''}
                      {maximumMeats > 1
                        ? `(Selecciona de ${minimumMeats} a ${maximumMeats})`
                        : requiresMeat
                          ? '(Obligatorio)'
                          : '(Opcional)'}
                    </Text>
                    <View
                      style={[
                        styles
                          .optionsContainerHorizontal,
                        isPhone &&
                        styles
                          .optionsContainerPhone,
                      ]}
                    >
                      {meats.map(
                        (
                          modifier,
                        ) => {
                          const selectedCount =
                            selectedMeatIds
                              .filter(
                                (
                                  id,
                                ) =>
                                  id ===
                                  modifier.id,
                              )
                              .length;
                          const isSelected =
                            selectedCount >
                            0;
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
                                isSelected &&
                                styles
                                  .optionButtonSelected,
                              ]}
                              onPress={() =>
                                handleMeatPress(
                                  modifier.id,
                                )
                              }
                              activeOpacity={
                                0.8
                              }
                            >
                              <Text
                                style={[
                                  styles
                                    .optionText,
                                  isPhone &&
                                  styles
                                    .optionTextPhone,
                                  isSelected &&
                                  styles
                                    .optionTextSelected,
                                ]}
                              >
                                {
                                  modifier.name
                                }
                                {selectedCount >
                                  1
                                  ? ` (x${selectedCount})`
                                  : ''}
                              </Text>
                            </TouchableOpacity>
                          );
                        },
                      )}
                    </View>
                    {allowsMultipleMeats &&
                      selectedSingleMeat && (
                        <TouchableOpacity
                          style={
                            styles
                              .doubleMeatButton
                          }
                          onPress={() =>
                            handleDoubleMeat(
                              selectedSingleMeat.id,
                            )
                          }
                        >
                          <Text
                            style={
                              styles
                                .doubleMeatText
                            }
                          >
                            Duplicar{' '}
                            {
                              selectedSingleMeat
                                .name
                            }
                            ?
                          </Text>
                        </TouchableOpacity>
                      )}
                  </View>
                )}
              {!isLoading &&
                !error &&
                sauceGroupAssociation && (
                  <View
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
                      {
                        sauceGroupAssociation
                          .group?.name ??
                        'Opciones'
                      }{' '}
                      {requiresSauce
                        ? '*'
                        : ''}{' '}
                      {maximumSauces > 1
                        ? `(Selecciona de ${minimumSauces} a ${maximumSauces})`
                        : requiresSauce
                          ? '(Obligatorio)'
                          : '(Opcional)'}
                    </Text>
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
                      {
                        selectedSauceIds
                          .length
                      }
                      /
                      {
                        maximumSauces
                      }{' '}
                      seleccionadas
                    </Text>
                    <View
                      style={[
                        styles
                          .optionsContainerHorizontal,
                        isPhone &&
                        styles
                          .optionsContainerPhone,
                      ]}
                    >
                      {sauces.map(
                        (
                          modifier,
                        ) => {
                          const isSelected =
                            selectedSauceIds
                              .includes(
                                modifier.id,
                              );
                          const isWeeklySauce =
                            weeklySauce
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
                                  paddingHorizontal:
                                    10,
                                },
                                isSelected &&
                                styles
                                  .optionButtonSelected,
                                isWeeklySauce && {
                                  borderColor:
                                    '#FFBF00',
                                  borderWidth:
                                    2,
                                },
                              ]}
                              onPress={() =>
                                handleSaucePress(
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
                                  isWeeklySauce && {
                                    color:
                                      '#FFBF00',
                                    fontWeight:
                                      '900',
                                  },
                                ]}
                              >
                                {isWeeklySauce
                                  ? '🌶️ '
                                  : ''}
                                {
                                  modifier.name
                                }
                              </Text>
                              {isWeeklySauce && (
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
                                  Ahorra
                                  $
                                  {weeklySauce
                                    .discount_amount
                                    .toFixed(
                                      2,
                                    )}
                                </Text>
                              )}
                            </TouchableOpacity>
                          );
                        },
                      )}
                    </View>
                  </View>
                )}
              {comboCheckedProductId === product.id && !isCombo &&
                areFlavorsLoading && (
                  <View
                    style={
                      styles
                        .loadingContainer
                    }
                  >
                    <ActivityIndicator
                      size="small"
                      color="#FFBF00"
                    />
                    <Text
                      style={
                        styles
                          .loadingText
                      }
                    >
                      Cargando
                      sabores...
                    </Text>
                  </View>
                )}
              {comboCheckedProductId === product.id && !isCombo &&
                !areFlavorsLoading &&
                flavorsError && (
                  <Text
                    style={
                      styles
                        .errorText
                    }
                  >
                    {
                      flavorsError
                    }
                  </Text>
                )}
              {comboCheckedProductId === product.id && !isCombo &&
                !areFlavorsLoading &&
                !flavorsError &&
                productFlavors.length >
                0 && (
                  <View
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
                      Sabor *
                      (Obligatorio)
                    </Text>
                    <View
                      style={[
                        styles
                          .optionsContainerHorizontal,
                        isPhone &&
                        styles
                          .optionsContainerPhone,
                      ]}
                    >
                      {productFlavors.map(
                        (
                          flavor,
                        ) => {
                          const isSelected =
                            selectedFlavorId ===
                            flavor.id;
                          return (
                            <TouchableOpacity
                              key={
                                flavor.id
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
                              ]}
                              onPress={() =>
                                setSelectedFlavorId(
                                  flavor.id,
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
                                {
                                  flavor.name
                                }
                              </Text>
                            </TouchableOpacity>
                          );
                        },
                      )}
                    </View>
                  </View>
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
                      color="#FFBF00"
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
                genericProductModifierGroups.map(
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
                                const isSelected =
                                  selectedIds.includes(
                                    modifier.id,
                                  );
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
                                      {
                                        modifier.name
                                      }
                                      {Number(
                                        modifier.extra_price,
                                      ) >
                                      0
                                        ? ` (+$${Number(
                                          modifier.extra_price,
                                        ).toFixed(
                                          2,
                                        )})`
                                        : ''}
                                    </Text>
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
