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
  View,
} from 'react-native';

import {
  Product,
  SelectedModifier,
} from '../../types';

import { ProductModifierMode } from '../../services/modifierService';

import { styles } from './ModifierModal.styles';

interface ModifierModalProps {
  visible: boolean;
  product: Product | null;
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
    selectedModifiers: SelectedModifier[],
  ) => void;
}

export const ModifierModal: React.FC<
  ModifierModalProps
> = ({
  visible,
  product,
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
    const [
      selectedMeatIds,
      setSelectedMeatIds,
    ] = useState<string[]>([]);

    const [
      selectedSauceId,
      setSelectedSauceId,
    ] = useState<string | null>(null);

    const isBurger = mode === 'burger';
    const isWings = mode === 'wings';
    const isBoneless = mode === 'boneless';

    const requiresSauce =
      isWings || isBoneless;

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

        const selectedSauce =
          selectedSauceId
            ? sauces.find(
              (modifier) =>
                modifier.id ===
                selectedSauceId,
            )
            : undefined;

        return selectedSauce
          ? [...selectedMeats, selectedSauce]
          : selectedMeats;
      }, [
        selectedMeatIds,
        selectedSauceId,
        meats,
        sauces,
      ]);

    const isSelectionValid =
      useMemo(() => {
        if (isLoading || error) {
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
          !selectedSauceId
        ) {
          return false;
        }

        return true;
      }, [
        isLoading,
        error,
        isBurger,
        requiresSauce,
        selectedMeatIds,
        selectedSauceId,
      ]);

    useEffect(() => {
      if (!visible) {
        return;
      }

      setSelectedMeatIds([]);
      setSelectedSauceId(null);
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
              (id) => id !== modifierId,
            );
          }

          if (
            maximumMeats === 1
          ) {
            return [modifierId];
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

    const handleConfirm = (): void => {
      if (!isSelectionValid) {
        return;
      }

      onConfirm(selectedModifiers);
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
        <View style={styles.modalBackdrop}>
          <View
            style={[
              styles.modalContent,
              {
                maxHeight: '85%',
              },
            ]}
          >
            <Text style={styles.modalTitle}>
              Ajustes de {product.name}
            </Text>

            <Text
              style={styles.modalSubtitle}
            >
              {isKongBurger
                ? 'Selecciona hasta 2 tipos de carne para tu Kong Burger:'
                : isBurger || requiresSauce
                  ? 'Selecciona las opciones obligatorias:'
                  : 'Agrega notas adicionales a tu producto:'}
            </Text>

            <ScrollView
              contentContainerStyle={{
                paddingVertical: 10,
              }}
              showsVerticalScrollIndicator={
                false
              }
            >
              {isLoading && (
                <View
                  style={{
                    paddingVertical: 24,
                    alignItems: 'center',
                  }}
                >
                  <ActivityIndicator
                    size="large"
                    color="#FFBF00"
                  />

                  <Text
                    style={{
                      marginTop: 10,
                      color: '#FFFFFF',
                    }}
                  >
                    Cargando opciones...
                  </Text>
                </View>
              )}

              {!isLoading && error && (
                <Text
                  style={{
                    color: '#FF5252',
                    textAlign: 'center',
                    marginVertical: 16,
                  }}
                >
                  {error}
                </Text>
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
                      style={
                        styles.optionsContainerHorizontal
                      }
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
                            selectedCount > 0;

                          return (
                            <TouchableOpacity
                              key={modifier.id}
                              style={[
                                styles.optionButtonChip,
                                isSelected &&
                                styles.optionButtonSelected,
                                {
                                  minWidth:
                                    '45%',
                                  alignItems:
                                    'center',
                                },
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
                          style={{
                            marginTop: 8,
                          }}
                          onPress={() =>
                            handleDoubleMeat(
                              selectedSingleMeat.id,
                            )
                          }
                        >
                          <Text
                            style={{
                              color:
                                '#FFBF00',
                              fontSize: 13,
                              textDecorationLine:
                                'underline',
                            }}
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
                    <Text style={styles.sectionLabel}>
                      {isBoneless
                        ? 'Salsa de los boneless'
                        : 'Salsa de las alitas'}{' '}
                      * (Obligatorio)
                    </Text>

                    <View
                      style={
                        styles.optionsContainerHorizontal
                      }
                    >
                      {sauces.map(
                        (modifier) => {
                          const isSelected =
                            selectedSauceId ===
                            modifier.id;

                          return (
                            <TouchableOpacity
                              key={modifier.id}
                              style={[
                                styles.optionButtonChip,
                                isSelected &&
                                styles.optionButtonSelected,
                              ]}
                              onPress={() =>
                                setSelectedSauceId(
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
                                  isSelected &&
                                  styles.optionTextSelected,
                                ]}
                              >
                                {modifier.name}
                              </Text>
                            </TouchableOpacity>
                          );
                        },
                      )}
                    </View>
                  </View>
                )}

              <Text
                style={[
                  styles.sectionLabel,
                  {
                    marginTop: 16,
                  },
                ]}
              >
                Notas adicionales
                (opcional)
              </Text>

              <TextInput
                style={styles.notesInput}
                placeholder="Ej: Sin cebolla, extra aderezo, aderezo aparte..."
                placeholderTextColor="#666"
                value={notes}
                onChangeText={
                  onNotesChange
                }
                multiline
                numberOfLines={3}
              />
            </ScrollView>

            <View
              style={
                styles.modalActions
              }
            >
              <TouchableOpacity
                style={
                  styles.modalCancelBtn
                }
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
          </View>
        </View>
      </Modal>
    );
  };