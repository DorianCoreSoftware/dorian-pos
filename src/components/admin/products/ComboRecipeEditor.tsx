import React from 'react';

import {
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

let componentSequence = 0;

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
  const availableProducts =
    products.filter(
      product =>
        product.is_active !== false &&
        product.id !== currentProductId,
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

  const toggleAllowedProduct = (
    component:
      ComboRecipeFormComponent,
    productId: string,
  ): void => {
    const selected =
      component.allowedProductIds.includes(
        productId,
      );

    updateComponent(
      component.clientId,
      {
        allowedProductIds:
          selected
            ? component.allowedProductIds.filter(
                id =>
                  id !== productId,
              )
            : [
                ...component.allowedProductIds,
                productId,
              ],
      },
    );
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
            Actívalo si este producto está compuesto por otros productos del catálogo.
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
                      marginBottom: 8,
                    }}
                  >
                    <Text
                      style={{
                        color:
                          '#FFBF00',
                        fontSize: 12,
                        fontWeight:
                          '900',
                      }}
                    >
                      Componente{' '}
                      {index + 1}
                    </Text>

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
                      updateComponent(
                        component.clientId,
                        { label },
                      )
                    }
                    editable={!disabled}
                    placeholder="Ej. Hamburguesa"
                    placeholderTextColor="#777777"
                    style={inputStyle}
                  />

                  <Text
                    style={labelStyle}
                  >
                    Tipo interno
                  </Text>

                  <TextInput
                    value={
                      component.type
                    }
                    onChangeText={type =>
                      updateComponent(
                        component.clientId,
                        { type },
                      )
                    }
                    editable={!disabled}
                    autoCapitalize="none"
                    autoCorrect={false}
                    placeholder="Ej. burger, drink, dessert"
                    placeholderTextColor="#777777"
                    style={inputStyle}
                  />

                  <Text
                    style={labelStyle}
                  >
                    Selección
                  </Text>

                  <View
                    style={{
                      flexDirection:
                        'row',
                      gap: 8,
                    }}
                  >
                    {(
                      [
                        'fixed',
                        'selectable',
                      ] as ComboSelectionMode[]
                    ).map(mode => {
                      const selected =
                        component.selectionMode ===
                        mode;

                      return (
                        <TouchableOpacity
                          key={mode}
                          disabled={
                            disabled
                          }
                          onPress={() =>
                            updateComponent(
                              component.clientId,
                              {
                                selectionMode:
                                  mode,
                                fixedProductId:
                                  '',
                                selectableCategoryId:
                                  '',
                                allowedProductIds:
                                  [],
                              },
                            )
                          }
                          style={{
                            flex: 1,
                            minHeight: 38,
                            alignItems:
                              'center',
                            justifyContent:
                              'center',
                            borderRadius: 7,
                            borderWidth: 1,
                            borderColor:
                              selected
                                ? '#FFBF00'
                                : '#444444',
                            backgroundColor:
                              selected
                                ? '#302800'
                                : '#1E1E1E',
                          }}
                        >
                          <Text
                            style={{
                              color:
                                selected
                                  ? '#FFBF00'
                                  : '#AAAAAA',
                              fontSize: 11,
                              fontWeight:
                                '800',
                            }}
                          >
                            {mode ===
                            'fixed'
                              ? 'Producto fijo'
                              : 'Cliente elige'}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>

                  {component.selectionMode ===
                  'fixed' ? (
                    <>
                      <Text
                        style={labelStyle}
                      >
                        Producto incluido
                      </Text>

                      <View
                        style={chipContainerStyle}
                      >
                        {availableProducts.map(
                          product => {
                            const selected =
                              component.fixedProductId ===
                              product.id;

                            return (
                              <TouchableOpacity
                                key={
                                  product.id
                                }
                                disabled={
                                  disabled
                                }
                                onPress={() =>
                                  updateComponent(
                                    component.clientId,
                                    {
                                      fixedProductId:
                                        product.id,
                                    },
                                  )
                                }
                                style={
                                  getChipStyle(
                                    selected,
                                  )
                                }
                              >
                                <Text
                                  style={
                                    getChipTextStyle(
                                      selected,
                                    )
                                  }
                                >
                                  {
                                    product.name
                                  }
                                </Text>
                              </TouchableOpacity>
                            );
                          },
                        )}
                      </View>
                    </>
                  ) : (
                    <>
                      <Text
                        style={labelStyle}
                      >
                        Categoría de opciones
                      </Text>

                      <View
                        style={chipContainerStyle}
                      >
                        {categories
                          .filter(
                            category =>
                              category.is_active !==
                              false,
                          )
                          .map(
                            category => {
                              const selected =
                                component.selectableCategoryId ===
                                category.id;

                              return (
                                <TouchableOpacity
                                  key={
                                    category.id
                                  }
                                  disabled={
                                    disabled
                                  }
                                  onPress={() =>
                                    updateComponent(
                                      component.clientId,
                                      {
                                        selectableCategoryId:
                                          category.id,
                                        allowedProductIds:
                                          [],
                                      },
                                    )
                                  }
                                  style={
                                    getChipStyle(
                                      selected,
                                    )
                                  }
                                >
                                  <Text
                                    style={
                                      getChipTextStyle(
                                        selected,
                                      )
                                    }
                                  >
                                    {
                                      category.name
                                    }
                                  </Text>
                                </TouchableOpacity>
                              );
                            },
                          )}
                      </View>

                      {component.selectableCategoryId ? (
                        <>
                          <Text
                            style={labelStyle}
                          >
                            Productos permitidos
                          </Text>

                          <Text
                            style={{
                              color:
                                '#777777',
                              fontSize: 9,
                              marginBottom: 7,
                            }}
                          >
                            Selecciona los productos que el cliente podrá elegir dentro de este componente.
                          </Text>

                          <View
                            style={chipContainerStyle}
                          >
                            {selectableProducts.map(
                              product => {
                                const selected =
                                  component.allowedProductIds.includes(
                                    product.id,
                                  );

                                return (
                                  <TouchableOpacity
                                    key={
                                      product.id
                                    }
                                    disabled={
                                      disabled
                                    }
                                    onPress={() =>
                                      toggleAllowedProduct(
                                        component,
                                        product.id,
                                      )
                                    }
                                    style={
                                      getChipStyle(
                                        selected,
                                      )
                                    }
                                  >
                                    <Text
                                      style={
                                        getChipTextStyle(
                                          selected,
                                        )
                                      }
                                    >
                                      {selected
                                        ? '✓ '
                                        : ''}
                                      {
                                        product.name
                                      }
                                    </Text>
                                  </TouchableOpacity>
                                );
                              },
                            )}
                          </View>

                          {selectableProducts.length ===
                          0 ? (
                            <Text
                              style={{
                                color:
                                  '#FF8A80',
                                fontSize: 10,
                              }}
                            >
                              No hay productos activos en esta categoría.
                            </Text>
                          ) : null}
                        </>
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
              borderColor: '#FFBF00',
              backgroundColor:
                '#292300',
            }}
          >
            <Text
              style={{
                color: '#FFBF00',
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

const chipContainerStyle = {
  flexDirection: 'row' as const,
  flexWrap: 'wrap' as const,
  gap: 6,
};

function getChipStyle(
  selected: boolean,
) {
  return {
    minHeight: 34,
    paddingHorizontal: 9,
    alignItems:
      'center' as const,
    justifyContent:
      'center' as const,
    borderRadius: 7,
    borderWidth: 1,
    borderColor:
      selected
        ? '#FFBF00'
        : '#444444',
    backgroundColor:
      selected
        ? '#302800'
        : '#1E1E1E',
  };
}

function getChipTextStyle(
  selected: boolean,
) {
  return {
    color:
      selected
        ? '#FFBF00'
        : '#AAAAAA',
    fontSize: 10,
    fontWeight:
      '700' as const,
  };
}
