import { withAlpha } from '../../../theme/brandStyles';

import { useBusiness } from '../../../context/BusinessContext';

import React, {
  useMemo,
  useState,
} from 'react';

import {
  Modal,
  Pressable,
  ScrollView,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import {
  Category,
  Product,
} from '../../../types';

import {
  ComboSelectionMode,
} from '../../../domain/entities/ComboRecipe';

export interface ComboRecipeFormComponent {
  clientId: string;
  slotKey: string;
  type: string;
  label: string;
  selectionMode: ComboSelectionMode;
  fixedProductId: string;
  selectableCategoryId: string;
  allowsNotes: boolean;
  allowedProductIds: string[];
}

export interface ComboRecipeFormState {
  enabled: boolean;
  components: ComboRecipeFormComponent[];
}

interface ComboRecipeEditorProps {
  value: ComboRecipeFormState;
  onChange: (
    value: ComboRecipeFormState,
  ) => void;
  products: Product[];
  categories: Category[];
  currentProductId?: string | null;
  disabled?: boolean;
}

interface SelectOption {
  value: string;
  label: string;
  subtitle?: string;
}

interface CompactSelectProps {
  label: string;
  value: string;
  options: SelectOption[];
  placeholder: string;
  onChange: (
    value: string,
  ) => void;
  disabled?: boolean;
  emptyMessage?: string;
}

interface CompactMultiSelectProps {
  label: string;
  values: string[];
  options: SelectOption[];
  placeholder: string;
  onChange: (
    values: string[],
  ) => void;
  disabled?: boolean;
  emptyMessage?: string;
}

let componentSequence = 0;

function normalizeInternalKey(
  value: string,
): string {
  return value
    .normalize('NFD')
    .replace(
      /[\u0300-\u036f]/g,
      '',
    )
    .trim()
    .toLocaleLowerCase('es')
    .replace(
      /[^a-z0-9]+/g,
      '_',
    )
    .replace(
      /^_+|_+$/g,
      '',
    );
}

export function createEmptyComboComponent(
  position: number,
): ComboRecipeFormComponent {
  componentSequence += 1;

  return {
    clientId:
      `combo-component-${Date.now()}-${componentSequence}`,
    slotKey:
      `component_${position + 1}_${componentSequence}`,
    type: 'item',
    label: '',
    selectionMode: 'fixed',
    fixedProductId: '',
    selectableCategoryId: '',
    allowsNotes: false,
    allowedProductIds: [],
  };
}

export const INITIAL_COMBO_RECIPE_FORM:
ComboRecipeFormState = {
  enabled: false,
  components: [],
};

export function ComboRecipeEditor({
  value,
  onChange,
  products,
  categories,
  currentProductId,
  disabled = false,
}: ComboRecipeEditorProps) {
  const { theme: businessTheme } = useBusiness();

  const availableProducts =
    useMemo(
      () =>
        products.filter(
          product =>
            product.is_active !== false &&
            product.id !== currentProductId,
        ),
      [
        products,
        currentProductId,
      ],
    );

  const activeCategories =
    useMemo(
      () =>
        categories.filter(
          category =>
            category.is_active !== false,
        ),
      [categories],
    );

  const updateComponent = (
    clientId: string,
    changes:
      Partial<ComboRecipeFormComponent>,
  ): void => {
    onChange({
      ...value,
      components:
        value.components.map(
          component =>
            component.clientId ===
            clientId
              ? {
                  ...component,
                  ...changes,
                }
              : component,
        ),
    });
  };

  const updateComponentLabel = (
    component:
      ComboRecipeFormComponent,
    label: string,
  ): void => {
    const previousNormalizedLabel =
      normalizeInternalKey(
        component.label,
      );

    const nextNormalizedLabel =
      normalizeInternalKey(
        label,
      );

    const shouldUpdateType =
      !component.type.trim() ||
      component.type === 'item' ||
      component.type ===
        previousNormalizedLabel;

    updateComponent(
      component.clientId,
      {
        label,
        ...(shouldUpdateType &&
        nextNormalizedLabel
          ? {
              type:
                nextNormalizedLabel,
            }
          : {}),
      },
    );
  };

  const removeComponent = (
    clientId: string,
  ): void => {
    onChange({
      ...value,
      components:
        value.components.filter(
          component =>
            component.clientId !==
            clientId,
        ),
    });
  };

  const addComponent = (): void => {
    onChange({
      ...value,
      components: [
        ...value.components,
        createEmptyComboComponent(
          value.components.length,
        ),
      ],
    });
  };

  return (
    <View
      style={{
        marginTop: 16,
        padding: 12,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: '#3A3A3A',
        backgroundColor: '#202020',
      }}
    >
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent:
            'space-between',
          gap: 12,
        }}
      >
        <View
          style={{
            flex: 1,
          }}
        >
          <Text
            style={{
              color: '#FFFFFF',
              fontSize: 14,
              fontWeight: '900',
            }}
          >
            Configuración de combo
          </Text>

          <Text
            style={{
              color: '#888888',
              fontSize: 10,
              marginTop: 3,
            }}
          >
            Define qué productos incluye y cuáles puede elegir el cliente.
          </Text>
        </View>

        <Switch
          value={value.enabled}
          disabled={disabled}
          onValueChange={enabled =>
            onChange({
              ...value,
              enabled,
              components:
                enabled &&
                value.components.length ===
                  0
                  ? [
                      createEmptyComboComponent(
                        0,
                      ),
                    ]
                  : value.components,
            })
          }
        />
      </View>

      {value.enabled ? (
        <View
          style={{
            marginTop: 12,
            gap: 10,
          }}
        >
          {value.components.map(
            (component, index) => {
              const selectableProducts =
                availableProducts.filter(
                  product =>
                    !component
                      .selectableCategoryId ||
                    product.category_id ===
                      component
                        .selectableCategoryId,
                );

              const fixedProductOptions:
                SelectOption[] =
                availableProducts.map(
                  product => ({
                    value: product.id,
                    label: product.name,
                  }),
                );

              const categoryOptions:
                SelectOption[] =
                activeCategories.map(
                  category => ({
                    value: category.id,
                    label: category.name,
                  }),
                );

              const selectableProductOptions:
                SelectOption[] =
                selectableProducts.map(
                  product => ({
                    value: product.id,
                    label: product.name,
                  }),
                );

              return (
                <View
                  key={
                    component.clientId
                  }
                  style={{
                    padding: 12,
                    borderRadius: 9,
                    borderWidth: 1,
                    borderColor:
                      '#4A4A4A',
                    backgroundColor:
                      '#252525',
                  }}
                >
                  <View
                    style={{
                      flexDirection:
                        'row',
                      alignItems:
                        'center',
                      justifyContent:
                        'space-between',
                      marginBottom: 2,
                    }}
                  >
                    <View
                      style={{
                        flex: 1,
                        paddingRight: 12,
                      }}
                    >
                      <Text
                        style={{
                          color:
                            businessTheme.primary,
                          fontSize: 12,
                          fontWeight:
                            '900',
                        }}
                      >
                        Componente{' '}
                        {index + 1}
                      </Text>

                      {component.label.trim() ? (
                        <Text
                          numberOfLines={1}
                          style={{
                            color:
                              '#9A9A9A',
                            fontSize: 9,
                            marginTop: 2,
                          }}
                        >
                          {component.label.trim()}
                        </Text>
                      ) : null}
                    </View>

                    <TouchableOpacity
                      disabled={disabled}
                      onPress={() =>
                        removeComponent(
                          component.clientId,
                        )
                      }
                    >
                      <Text
                        style={{
                          color:
                            '#FF8A80',
                          fontSize: 11,
                          fontWeight:
                            '800',
                        }}
                      >
                        Eliminar
                      </Text>
                    </TouchableOpacity>
                  </View>

                  <Text
                    style={labelStyle}
                  >
                    Nombre visible
                  </Text>

                  <TextInput
                    value={
                      component.label
                    }
                    onChangeText={label =>
                      updateComponentLabel(
                        component,
                        label,
                      )
                    }
                    editable={!disabled}
                    placeholder="Ej. Hamburguesa"
                    placeholderTextColor="#777777"
                    style={inputStyle}
                  />

                  <CompactSelect
                    label="Selección"
                    value={
                      component.selectionMode
                    }
                    options={[
                      {
                        value: 'fixed',
                        label:
                          'Producto fijo',
                        subtitle:
                          'El combo siempre incluye el mismo producto.',
                      },
                      {
                        value:
                          'selectable',
                        label:
                          'Cliente elige',
                        subtitle:
                          'El cliente escoge entre los productos permitidos.',
                      },
                    ]}
                    placeholder="Selecciona el tipo"
                    disabled={disabled}
                    onChange={mode =>
                      updateComponent(
                        component.clientId,
                        {
                          selectionMode:
                            mode as ComboSelectionMode,
                          fixedProductId:
                            '',
                          selectableCategoryId:
                            '',
                          allowedProductIds:
                            [],
                        },
                      )
                    }
                  />

                  {component.selectionMode ===
                  'fixed' ? (
                    <CompactSelect
                      label="Producto incluido"
                      value={
                        component.fixedProductId
                      }
                      options={
                        fixedProductOptions
                      }
                      placeholder="Seleccionar producto"
                      emptyMessage="No hay productos activos disponibles."
                      disabled={disabled}
                      onChange={productId =>
                        updateComponent(
                          component.clientId,
                          {
                            fixedProductId:
                              productId,
                          },
                        )
                      }
                    />
                  ) : (
                    <>
                      <CompactSelect
                        label="Categoría de opciones"
                        value={
                          component.selectableCategoryId
                        }
                        options={
                          categoryOptions
                        }
                        placeholder="Seleccionar categoría"
                        emptyMessage="No hay categorías activas."
                        disabled={disabled}
                        onChange={categoryId =>
                          updateComponent(
                            component.clientId,
                            {
                              selectableCategoryId:
                                categoryId,
                              allowedProductIds:
                                [],
                            },
                          )
                        }
                      />

                      {component.selectableCategoryId ? (
                        <CompactMultiSelect
                          label="Productos permitidos"
                          values={
                            component.allowedProductIds
                          }
                          options={
                            selectableProductOptions
                          }
                          placeholder="Seleccionar productos"
                          emptyMessage="No hay productos activos en esta categoría."
                          disabled={disabled}
                          onChange={productIds =>
                            updateComponent(
                              component.clientId,
                              {
                                allowedProductIds:
                                  productIds,
                              },
                            )
                          }
                        />
                      ) : null}
                    </>
                  )}

                  <View
                    style={{
                      flexDirection:
                        'row',
                      alignItems:
                        'center',
                      justifyContent:
                        'space-between',
                      marginTop: 12,
                    }}
                  >
                    <View
                      style={{
                        flex: 1,
                        paddingRight: 10,
                      }}
                    >
                      <Text
                        style={{
                          color:
                            '#FFFFFF',
                          fontSize: 11,
                          fontWeight:
                            '800',
                        }}
                      >
                        Permitir indicaciones
                      </Text>

                      <Text
                        style={{
                          color:
                            '#777777',
                          fontSize: 9,
                          marginTop: 2,
                        }}
                      >
                        Ej. “sin cebolla” o instrucciones especiales.
                      </Text>
                    </View>

                    <Switch
                      value={
                        component.allowsNotes
                      }
                      disabled={disabled}
                      onValueChange={
                        allowsNotes =>
                          updateComponent(
                            component.clientId,
                            {
                              allowsNotes,
                            },
                          )
                      }
                    />
                  </View>
                </View>
              );
            },
          )}

          <TouchableOpacity
            disabled={disabled}
            onPress={addComponent}
            style={{
              minHeight: 40,
              alignItems: 'center',
              justifyContent:
                'center',
              borderRadius: 8,
              borderWidth: 1,
              borderColor: businessTheme.primary,
              backgroundColor:
                withAlpha(businessTheme.primary, 0.11),
            }}
          >
            <Text
              style={{
                color: businessTheme.primary,
                fontSize: 11,
                fontWeight: '900',
              }}
            >
              + Agregar componente
            </Text>
          </TouchableOpacity>
        </View>
      ) : null}
    </View>
  );
}

function CompactSelect({
  label,
  value,
  options,
  placeholder,
  onChange,
  disabled = false,
  emptyMessage = 'No hay opciones disponibles.',
}: CompactSelectProps) {
  const { theme: businessTheme } = useBusiness();

  const [
    visible,
    setVisible,
  ] = useState(false);

  const selectedOption =
    options.find(
      option =>
        option.value === value,
    ) ?? null;

  const open = (): void => {
    if (
      disabled ||
      options.length === 0
    ) {
      return;
    }

    setVisible(true);
  };

  return (
    <>
      <Text
        style={labelStyle}
      >
        {label}
      </Text>

      <TouchableOpacity
        disabled={disabled}
        onPress={open}
        style={[
          selectButtonStyle,
          disabled
            ? selectButtonDisabledStyle
            : null,
        ]}
      >
        <Text
          numberOfLines={1}
          style={{
            flex: 1,
            color:
              selectedOption
                ? '#FFFFFF'
                : '#777777',
            fontSize: 11,
          }}
        >
          {selectedOption?.label ??
            placeholder}
        </Text>

        <Text
          style={[
            selectChevronStyle,
            { color: businessTheme.primary },
          ]}
        >
          ▾
        </Text>
      </TouchableOpacity>

      {options.length === 0 ? (
        <Text
          style={emptyTextStyle}
        >
          {emptyMessage}
        </Text>
      ) : null}

      <Modal
        transparent
        visible={visible}
        animationType="fade"
        onRequestClose={() =>
          setVisible(false)
        }
      >
        <View
          style={modalBackdropStyle}
        >
          <Pressable
            style={modalDismissStyle}
            onPress={() =>
              setVisible(false)
            }
          />

          <View
            style={modalCardStyle}
          >
            <View
              style={modalHeaderStyle}
            >
              <Text
                style={modalTitleStyle}
              >
                {label}
              </Text>

              <TouchableOpacity
                onPress={() =>
                  setVisible(false)
                }
              >
                <Text
                  style={[
                    modalCloseStyle,
                    { color: businessTheme.primary },
                  ]}
                >
                  Cerrar
                </Text>
              </TouchableOpacity>
            </View>

            <ScrollView
              style={{
                maxHeight: 380,
              }}
              contentContainerStyle={{
                paddingBottom: 4,
              }}
            >
              {options.map(
                option => {
                  const selected =
                    option.value ===
                    value;

                  return (
                    <TouchableOpacity
                      key={
                        option.value
                      }
                      onPress={() => {
                        onChange(
                          option.value,
                        );
                        setVisible(
                          false,
                        );
                      }}
                      style={
                        getOptionRowStyle(
                          selected,
                          businessTheme.primary,
                        )
                      }
                    >
                      <View
                        style={{
                          flex: 1,
                          paddingRight: 10,
                        }}
                      >
                        <Text
                          style={
                            getOptionTextStyle(
                              selected,
                              businessTheme.primary,
                            )
                          }
                        >
                          {option.label}
                        </Text>

                        {option.subtitle ? (
                          <Text
                            style={{
                              color:
                                '#888888',
                              fontSize: 9,
                              marginTop: 3,
                            }}
                          >
                            {option.subtitle}
                          </Text>
                        ) : null}
                      </View>

                      {selected ? (
                        <Text
                          style={{
                            color:
                              businessTheme.primary,
                            fontSize: 15,
                            fontWeight:
                              '900',
                          }}
                        >
                          ✓
                        </Text>
                      ) : null}
                    </TouchableOpacity>
                  );
                },
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </>
  );
}

function CompactMultiSelect({
  label,
  values,
  options,
  placeholder,
  onChange,
  disabled = false,
  emptyMessage = 'No hay opciones disponibles.',
}: CompactMultiSelectProps) {
  const { theme: businessTheme } = useBusiness();

  const [
    visible,
    setVisible,
  ] = useState(false);

  const selectedOptions =
    options.filter(
      option =>
        values.includes(
          option.value,
        ),
    );

  const summary =
    selectedOptions.length === 0
      ? placeholder
      : selectedOptions.length === 1
        ? selectedOptions[0].label
        : `${selectedOptions.length} seleccionados`;

  const open = (): void => {
    if (
      disabled ||
      options.length === 0
    ) {
      return;
    }

    setVisible(true);
  };

  const toggleValue = (
    optionValue: string,
  ): void => {
    if (
      values.includes(
        optionValue,
      )
    ) {
      onChange(
        values.filter(
          value =>
            value !==
            optionValue,
        ),
      );

      return;
    }

    onChange([
      ...values,
      optionValue,
    ]);
  };

  return (
    <>
      <Text
        style={labelStyle}
      >
        {label}
      </Text>

      <TouchableOpacity
        disabled={disabled}
        onPress={open}
        style={[
          selectButtonStyle,
          disabled
            ? selectButtonDisabledStyle
            : null,
        ]}
      >
        <Text
          numberOfLines={1}
          style={{
            flex: 1,
            color:
              selectedOptions.length >
              0
                ? '#FFFFFF'
                : '#777777',
            fontSize: 11,
          }}
        >
          {summary}
        </Text>

        <Text
          style={[
            selectChevronStyle,
            { color: businessTheme.primary },
          ]}
        >
          ▾
        </Text>
      </TouchableOpacity>

      {selectedOptions.length > 1 ? (
        <Text
          numberOfLines={2}
          style={{
            color: '#777777',
            fontSize: 9,
            marginTop: 5,
            lineHeight: 13,
          }}
        >
          {selectedOptions
            .map(
              option =>
                option.label,
            )
            .join(', ')}
        </Text>
      ) : null}

      {options.length === 0 ? (
        <Text
          style={emptyTextStyle}
        >
          {emptyMessage}
        </Text>
      ) : null}

      <Modal
        transparent
        visible={visible}
        animationType="fade"
        onRequestClose={() =>
          setVisible(false)
        }
      >
        <View
          style={modalBackdropStyle}
        >
          <Pressable
            style={modalDismissStyle}
            onPress={() =>
              setVisible(false)
            }
          />

          <View
            style={modalCardStyle}
          >
            <View
              style={modalHeaderStyle}
            >
              <View
                style={{
                  flex: 1,
                  paddingRight: 10,
                }}
              >
                <Text
                  style={modalTitleStyle}
                >
                  {label}
                </Text>

                <Text
                  style={{
                    color: '#888888',
                    fontSize: 9,
                    marginTop: 2,
                  }}
                >
                  {values.length}{' '}
                  seleccionados
                </Text>
              </View>

              <TouchableOpacity
                onPress={() =>
                  setVisible(false)
                }
              >
                <Text
                  style={[
                    modalCloseStyle,
                    { color: businessTheme.primary },
                  ]}
                >
                  Listo
                </Text>
              </TouchableOpacity>
            </View>

            <ScrollView
              style={{
                maxHeight: 380,
              }}
              contentContainerStyle={{
                paddingBottom: 4,
              }}
            >
              {options.map(
                option => {
                  const selected =
                    values.includes(
                      option.value,
                    );

                  return (
                    <TouchableOpacity
                      key={
                        option.value
                      }
                      onPress={() =>
                        toggleValue(
                          option.value,
                        )
                      }
                      style={
                        getOptionRowStyle(
                          selected,
                          businessTheme.primary,
                        )
                      }
                    >
                      <View
                        style={{
                          flex: 1,
                          paddingRight: 10,
                        }}
                      >
                        <Text
                          style={
                            getOptionTextStyle(
                              selected,
                              businessTheme.primary,
                            )
                          }
                        >
                          {option.label}
                        </Text>
                      </View>

                      <Text
                        style={{
                          color:
                            selected
                              ? businessTheme.primary
                              : '#777777',
                          fontSize: 16,
                          fontWeight:
                            '900',
                        }}
                      >
                        {selected
                          ? '☑'
                          : '☐'}
                      </Text>
                    </TouchableOpacity>
                  );
                },
              )}
            </ScrollView>

            {values.length > 0 ? (
              <TouchableOpacity
                onPress={() =>
                  onChange([])
                }
                style={{
                  marginTop: 8,
                  minHeight: 36,
                  alignItems:
                    'center',
                  justifyContent:
                    'center',
                  borderRadius: 7,
                  borderWidth: 1,
                  borderColor:
                    '#555555',
                }}
              >
                <Text
                  style={{
                    color: '#AAAAAA',
                    fontSize: 10,
                    fontWeight: '800',
                  }}
                >
                  Limpiar selección
                </Text>
              </TouchableOpacity>
            ) : null}
          </View>
        </View>
      </Modal>
    </>
  );
}

const labelStyle = {
  color: '#CCCCCC',
  fontSize: 10,
  fontWeight: '700' as const,
  marginTop: 10,
  marginBottom: 5,
};

const inputStyle = {
  minHeight: 40,
  paddingHorizontal: 10,
  borderRadius: 7,
  borderWidth: 1,
  borderColor: '#444444',
  color: '#FFFFFF',
  backgroundColor: '#1E1E1E',
  fontSize: 12,
};

const selectButtonStyle = {
  minHeight: 40,
  paddingHorizontal: 10,
  flexDirection: 'row' as const,
  alignItems: 'center' as const,
  borderRadius: 7,
  borderWidth: 1,
  borderColor: '#444444',
  backgroundColor: '#1E1E1E',
};

const selectButtonDisabledStyle = {
  opacity: 0.55,
};

const selectChevronStyle = {
  fontSize: 15,
  fontWeight: '900' as const,
  marginLeft: 8,
};

const emptyTextStyle = {
  color: '#FF8A80',
  fontSize: 9,
  marginTop: 5,
};

const modalBackdropStyle = {
  flex: 1,
  backgroundColor:
    'rgba(0, 0, 0, 0.72)',
  alignItems: 'center' as const,
  justifyContent: 'center' as const,
  padding: 18,
};

const modalDismissStyle = {
  position: 'absolute' as const,
  top: 0,
  right: 0,
  bottom: 0,
  left: 0,
};

const modalCardStyle = {
  width: '100%' as const,
  maxWidth: 520,
  maxHeight: '78%' as const,
  padding: 14,
  borderRadius: 12,
  borderWidth: 1,
  borderColor: '#484848',
  backgroundColor: '#202020',
};

const modalHeaderStyle = {
  flexDirection: 'row' as const,
  alignItems: 'center' as const,
  justifyContent:
    'space-between' as const,
  paddingBottom: 10,
  marginBottom: 4,
  borderBottomWidth: 1,
  borderBottomColor: '#383838',
};

const modalTitleStyle = {
  color: '#FFFFFF',
  fontSize: 13,
  fontWeight: '900' as const,
};

const modalCloseStyle = {
  fontSize: 11,
  fontWeight: '900' as const,
};

function getOptionRowStyle(
  selected: boolean,
  primaryColor: string,
) {
  return {
    minHeight: 44,
    paddingVertical: 10,
    paddingHorizontal: 10,
    flexDirection:
      'row' as const,
    alignItems:
      'center' as const,
    borderRadius: 8,
    borderWidth: 1,
    borderColor:
      selected
        ? primaryColor
        : '#3D3D3D',
    backgroundColor:
      selected
        ? withAlpha(primaryColor, 0.14)
        : '#252525',
    marginTop: 7,
  };
}

function getOptionTextStyle(
  selected: boolean,
  primaryColor: string,
) {
  return {
    color:
      selected
        ? primaryColor
        : '#FFFFFF',
    fontSize: 11,
    fontWeight:
      selected
        ? '800' as const
        : '600' as const,
  };
}
