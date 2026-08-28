import React, {
  useEffect,
  useMemo,
  useState,
} from 'react';

import {
  ActivityIndicator,
  Modal,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';

import {
  Category,
  ComboComponentSelection,
  Product,
  SelectedModifier,
} from '../../types';

import {
  ProductModifierMode,
} from '../../services/modifierService';

import {
  getActiveWeeklySauce,
  WeeklySauce,
} from '../../services/weeklySauceService';

import {
  styles,
} from '../modifier-modal/ModifierModal.styles';

import {
  ComboConfigurator,
  ComboConfiguratorSelection,
} from './ComboConfigurator';

export interface ProductConfigurationResult {
  selectedModifiers: SelectedModifier[];
  comboComponents: ComboComponentSelection[];
}

interface ProductConfiguratorModalProps {
  visible: boolean;
  product: Product | null;

  products: Product[];
  categories: Category[];

  notes: string;

  mode: ProductModifierMode;
  isKongBurger: boolean;

  meats: SelectedModifier[];
  sauces: SelectedModifier[];

  isLoading: boolean;
  error: string | null;

  onNotesChange: (text: string) => void;
  onClose: () => void;

  onConfirm: (
    configuration: ProductConfigurationResult,
  ) => void;
}

export const ProductConfiguratorModal: React.FC<
  ProductConfiguratorModalProps
> = ({
  visible,
  product,
  products,
  categories,
  notes,
  mode,
  isKongBurger,
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

  const MAXIMUM_SAUCES = 3;

  const [
    selectedSauceIds,
    setSelectedSauceIds,
  ] = useState<string[]>([]);

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

  const isBurger =
    mode === 'burger';

  const isWings =
    mode === 'wings';

  const isBoneless =
    mode === 'boneless';

  const isCombo =
    mode === 'combo';

  const requiresSauce =
    isWings ||
    isBoneless;

  const maximumMeats =
    isKongBurger ? 2 : 1;

  const selectedModifiers =
    useMemo<SelectedModifier[]>(() => {
      const selectedMeats =
        selectedMeatIds
          .map((modifierId) =>
            meats.find(
              (modifier) =>
                modifier.id === modifierId,
            ),
          )
          .filter(
            (
              modifier,
            ): modifier is SelectedModifier =>
              modifier !== undefined,
          );

      const selectedSauces =
        selectedSauceIds
          .map((modifierId) =>
            sauces.find(
              (modifier) =>
                modifier.id === modifierId,
            ),
          )
          .filter(
            (
              modifier,
            ): modifier is SelectedModifier =>
              modifier !== undefined,
          );

      return [
        ...selectedMeats,
        ...selectedSauces,
      ];
    }, [
      selectedMeatIds,
      selectedSauceIds,
      meats,
      sauces,
    ]);

  const isSelectionValid =
    useMemo(() => {
      if (isCombo) {
        return (
          comboSelection?.isValid ??
          false
        );
      }

      if (
        isLoading ||
        error
      ) {
        return false;
      }

      if (
        isBurger &&
        selectedMeatIds.length === 0
      ) {
        return false;
      }

      if (
        requiresSauce &&
        selectedSauceIds.length === 0
      ) {
        return false;
      }

      return true;
    }, [
      isCombo,
      comboSelection,
      isLoading,
      error,
      isBurger,
      requiresSauce,
      selectedMeatIds,
      selectedSauceIds,
    ]);

  useEffect(() => {
    if (!visible) {
      return;
    }

    setSelectedMeatIds([]);
    setSelectedSauceIds([]);
    setComboSelection(null);

    let isMounted = true;

    const loadWeeklySauce =
      async () => {
        try {
          const data =
            await getActiveWeeklySauce();

          if (isMounted) {
            setWeeklySauce(
              data,
            );
          }
        } catch (weeklySauceError) {
          console.error(
            'Error loading weekly sauce:',
            weeklySauceError,
          );

          if (isMounted) {
            setWeeklySauce(
              null,
            );
          }
        }
      };

    void loadWeeklySauce();

    return () => {
      isMounted = false;
    };
  }, [
    visible,
    product?.id,
  ]);

  if (!product) {
    return null;
  }

  const handleMeatPress = (
    modifierId: string,
  ): void => {
    setSelectedMeatIds(
      (currentSelection) => {
        if (
          currentSelection.includes(
            modifierId,
          )
        ) {
          return currentSelection.filter(
            (id) =>
              id !== modifierId,
          );
        }

        if (
          maximumMeats === 1
        ) {
          return [
            modifierId,
          ];
        }

        if (
          currentSelection.length >=
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
      (currentSelection) => {
        if (
          !isKongBurger ||
          currentSelection.length !== 1
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
      (currentSelection) => {
        if (
          currentSelection.includes(
            modifierId,
          )
        ) {
          return currentSelection.filter(
            (id) =>
              id !== modifierId,
          );
        }

        if (
          currentSelection.length >=
          MAXIMUM_SAUCES
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

  const handleConfirm = (): void => {
    if (!isSelectionValid) {
      return;
    }

    if (isCombo) {
      if (
        !comboSelection ||
        !comboSelection.isValid
      ) {
        return;
      }

      onConfirm({
        selectedModifiers: [],
        comboComponents: [
          ...comboSelection.components,
        ],
      });

      return;
    }

    onConfirm({
      selectedModifiers,
      comboComponents: [],
    });
  };

  const selectedSingleMeat =
    selectedMeatIds.length === 1
      ? meats.find(
          (modifier) =>
            modifier.id ===
            selectedMeatIds[0],
        )
      : undefined;

  return (
    <Modal
      animationType="fade"
      transparent
      visible={visible}
      onRequestClose={onClose}
    >
      <View
        style={[
          styles.modalBackdrop,

          isPhone &&
          styles.modalBackdropPhone,
        ]}
      >
        <View
          style={[
            styles.modalContent,

            isPhone &&
            styles.modalContentPhone,

            isSmallPhone &&
            styles.modalContentSmallPhone,

            isShortScreen &&
            styles.modalContentShort,
          ]}
        >
          <Text
            style={[
              styles.modalTitle,

              isPhone &&
              styles.modalTitlePhone,
            ]}
          >
            Ajustes de {product.name}
          </Text>

          <Text
            style={[
              styles.modalSubtitle,

              isPhone &&
              styles.modalSubtitlePhone,
            ]}
          >
            {isCombo
              ? 'Configura los productos incluidos en el combo:'
              : isKongBurger
                ? 'Selecciona hasta 2 tipos de carne para tu Kong Burger:'
                : isBurger || requiresSauce
                  ? 'Selecciona las opciones obligatorias:'
                  : 'Agrega notas adicionales a tu producto:'}
          </Text>

          {weeklySauce &&
            requiresSauce && (
              <View
                style={{
                  marginTop: 10,
                  paddingVertical: 9,
                  paddingHorizontal: 12,
                  borderRadius: 8,
                  borderWidth: 1,
                  borderColor: '#8A6A00',
                  backgroundColor: '#302800',
                }}
              >
                <Text
                  style={{
                    color: '#FFBF00',
                    fontSize: 12,
                    fontWeight: '900',
                  }}
                >
                  🌶️ Salsa de la Semana: {weeklySauce.modifier_name}
                </Text>

                <Text
                  style={{
                    color: '#D6C98A',
                    fontSize: 11,
                    marginTop: 3,
                  }}
                >
                  Ahorra ${weeklySauce.discount_amount.toFixed(2)}
                  {' '}al seleccionarla.
                </Text>
              </View>
            )}

          <ScrollView
            style={
              styles.modalScroll
            }
            contentContainerStyle={
              styles.modalScrollContent
            }
            showsVerticalScrollIndicator={
              false
            }
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
          >
            {!isCombo &&
              isLoading && (
                <View
                  style={
                    styles.loadingContainer
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
                    Cargando opciones...
                  </Text>
                </View>
              )}

            {!isCombo &&
              !isLoading &&
              error && (
                <Text
                  style={
                    styles.errorText
                  }
                >
                  {error}
                </Text>
              )}

            {isCombo && (
              <ComboConfigurator
                product={product}
                meats={meats}
                sauces={sauces}
                weeklySauce={weeklySauce}
                onSelectionChange={
                  setComboSelection
                }
              />
            )}

            {!isLoading &&
              !error &&
              isBurger && (
                <View
                  style={
                    styles.requiredSection
                  }
                >
                  <Text
                    style={
                      styles.sectionLabel
                    }
                  >
                    Tipo de carne *{' '}
                    {isKongBurger
                      ? '(Selecciona 1 o 2)'
                      : '(Obligatorio)'}
                  </Text>

                  <View
                    style={[
                      styles.optionsContainerHorizontal,

                      isPhone &&
                      styles.optionsContainerPhone,
                    ]}
                  >
                    {meats.map(
                      (modifier) => {
                        const selectedCount =
                          selectedMeatIds.filter(
                            (id) =>
                              id ===
                              modifier.id,
                          ).length;

                        const isSelected =
                          selectedCount >
                          0;

                        return (
                          <TouchableOpacity
                            key={
                              modifier.id
                            }
                            style={[
                              styles.optionButtonChip,

                              isPhone
                                ? styles.optionButtonChipPhone
                                : styles.optionButtonChipTablet,

                              isSelected &&
                              styles.optionButtonSelected,
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
                                styles.optionText,

                                isPhone &&
                                styles.optionTextPhone,

                                isSelected &&
                                styles.optionTextSelected,
                              ]}
                            >
                              {modifier.name}
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

                  {isKongBurger &&
                    selectedSingleMeat && (
                      <TouchableOpacity
                        style={
                          styles.doubleMeatButton
                        }
                        onPress={() =>
                          handleDoubleMeat(
                            selectedSingleMeat.id,
                          )
                        }
                      >
                        <Text
                          style={
                            styles.doubleMeatText
                          }
                        >
                          ¿Hacerla doble de{' '}
                          {
                            selectedSingleMeat.name
                          }
                          ?
                        </Text>
                      </TouchableOpacity>
                    )}
                </View>
              )}

            {!isLoading &&
              !error &&
              requiresSauce && (
                <View
                  style={
                    styles.requiredSection
                  }
                >
                  <Text
                    style={
                      styles.sectionLabel
                    }
                  >
                    {isBoneless
                      ? 'Salsas de los boneless'
                      : 'Salsas de las alitas'}{' '}
                    * (Selecciona de 1 a 3)
                  </Text>

                  <Text
                    style={{
                      color: '#AAAAAA',
                      fontSize: 12,
                      marginBottom: 8,
                    }}
                  >
                    {selectedSauceIds.length}/
                    {MAXIMUM_SAUCES}{' '}
                    seleccionadas
                  </Text>

                  <View
                    style={[
                      styles.optionsContainerHorizontal,

                      isPhone &&
                      styles.optionsContainerPhone,
                    ]}
                  >
                    {sauces.map(
                      (modifier) => {
                        const isSelected =
                          selectedSauceIds.includes(
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
                              styles.optionButtonChip,

                              isPhone
                                ? styles.optionButtonChipPhone
                                : styles.optionButtonChipTablet,

                              isSelected &&
                              styles.optionButtonSelected,

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
                              style={[
                                styles.optionText,

                                isPhone &&
                                styles.optionTextPhone,

                                isSelected &&
                                styles.optionTextSelected,

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
                              {modifier.name}
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
                                Ahorra $
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

            {!isCombo && (
              <>
                <Text
                  style={[
                    styles.sectionLabel,
                    styles.notesLabel,
                  ]}
                >
                  Notas adicionales
                  (opcional)
                </Text>

                <TextInput
                  style={[
                    styles.notesInput,

                    isPhone &&
                    styles.notesInputPhone,
                  ]}
                  placeholder="Ej: Sin cebolla, extra aderezo, aderezo aparte..."
                  placeholderTextColor="#666"
                  value={notes}
                  onChangeText={
                    onNotesChange
                  }
                  multiline
                  numberOfLines={3}
                />
              </>
            )}
          </ScrollView>

          {!isCombo && (
            <View
              style={[
                styles.modalActions,

                isSmallPhone &&
                styles.modalActionsPhone,
              ]}
            >
              <TouchableOpacity
                style={[
                  styles.modalCancelBtn,

                  isSmallPhone &&
                  styles.modalActionButtonPhone,
                ]}
                onPress={onClose}
                activeOpacity={0.7}
              >
                <Text
                  style={
                    styles.modalCancelText
                  }
                >
                  Cancelar
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.modalAddBtn,

                  isSmallPhone &&
                  styles.modalActionButtonPhone,

                  !isSelectionValid &&
                  styles.modalAddBtnDisabled,
                ]}
                onPress={handleConfirm}
                disabled={
                  !isSelectionValid
                }
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.modalAddText,

                    !isSelectionValid &&
                    styles.modalAddTextDisabled,
                  ]}
                >
                  Agregar al ticket
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {isCombo && (
            <View
              style={[
                styles.modalActions,

                isSmallPhone &&
                styles.modalActionsPhone,
              ]}
            >
              <TouchableOpacity
                style={[
                  styles.modalCancelBtn,

                  isSmallPhone &&
                  styles.modalActionButtonPhone,
                ]}
                onPress={onClose}
                activeOpacity={0.7}
              >
                <Text
                  style={
                    styles.modalCancelText
                  }
                >
                  Cancelar
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.modalAddBtn,

                  isSmallPhone &&
                  styles.modalActionButtonPhone,

                  !isSelectionValid &&
                  styles.modalAddBtnDisabled,
                ]}
                disabled={
                  !isSelectionValid
                }
                activeOpacity={0.7}
                onPress={
                  handleConfirm
                }
              >
                <Text
                  style={[
                    styles.modalAddText,

                    !isSelectionValid &&
                    styles.modalAddTextDisabled,
                  ]}
                >
                  Agregar al ticket
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
};