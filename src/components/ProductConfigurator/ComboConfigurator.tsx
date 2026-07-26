import React, {
  useEffect,
  useMemo,
  useState,
} from 'react';

import {
  ActivityIndicator,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import {
  ComboRecipe,
  ComboRecipeComponent,
} from '../../domain/entities/ComboRecipe';

import {
  Product,
  SelectedModifier,
} from '../../types';

import {
  ComboComponentSelection,
} from '../../types/combo';

import {
  getComboRecipeByProductId,
} from '../../services/comboService';

export interface ComboConfiguratorSelection {
  components: ComboComponentSelection[];
  isValid: boolean;
}

interface ComboConfiguratorProps {
  product: Product;

  meats: SelectedModifier[];

  onSelectionChange?: (
    selection: ComboConfiguratorSelection,
  ) => void;
}

export const ComboConfigurator: React.FC<
  ComboConfiguratorProps
> = ({
  product,
  meats,
  onSelectionChange,
}) => {
  const [
    recipe,
    setRecipe,
  ] = useState<ComboRecipe | null>(null);

  const [
    selectedOptionIds,
    setSelectedOptionIds,
  ] = useState<Record<string, string>>(
    {},
  );

  const [
    selectedFlavorIds,
    setSelectedFlavorIds,
  ] = useState<Record<string, string>>(
    {},
  );

  const [
    selectedMeatIds,
    setSelectedMeatIds,
  ] = useState<Record<string, string>>(
    {},
  );

  const [
    componentNotes,
    setComponentNotes,
  ] = useState<Record<string, string>>(
    {},
  );

  const [
    isLoading,
    setIsLoading,
  ] = useState(false);

  const [
    error,
    setError,
  ] = useState<string | null>(null);

  const isSelectionValid =
    useMemo(() => {
      if (!recipe) {
        return false;
      }

      return recipe.components.every(
        (component) => {
          /*
           * Si el componente requiere tipo de
           * carne, debe existir una selección.
           *
           * Si no hay carnes disponibles, no se
           * bloquea para evitar dejar inutilizable
           * el combo por un catálogo vacío.
           */
          if (
            component.requiresMeat &&
            meats.length > 0 &&
            !selectedMeatIds[
              component.id
            ]
          ) {
            return false;
          }

          if (
            component.selectionMode ===
            'fixed'
          ) {
            return Boolean(
              component.fixedProduct?.id,
            );
          }

          const selectedOptionId =
            selectedOptionIds[
              component.id
            ];

          if (!selectedOptionId) {
            return false;
          }

          const selectedOption =
            component.options.find(
              (option) =>
                option.id ===
                selectedOptionId,
            );

          if (!selectedOption) {
            return false;
          }

          if (
            !component
              .requiresDrinkFlavor
          ) {
            return true;
          }

          const availableFlavors =
            selectedOption.flavors ?? [];

          /*
           * El componente pide sabor, pero la
           * opción concreta no maneja sabores.
           */
          if (
            availableFlavors.length === 0
          ) {
            return true;
          }

          const selectedFlavorId =
            selectedFlavorIds[
              component.id
            ];

          if (!selectedFlavorId) {
            return false;
          }

          return availableFlavors.some(
            (flavor) =>
              flavor.id ===
              selectedFlavorId,
          );
        },
      );
    }, [
      recipe,
      meats,
      selectedOptionIds,
      selectedFlavorIds,
      selectedMeatIds,
    ]);

  useEffect(() => {
    let isMounted = true;

    async function loadRecipe(): Promise<void> {
      try {
        setIsLoading(true);
        setError(null);
        setRecipe(null);

        setSelectedOptionIds({});
        setSelectedFlavorIds({});
        setSelectedMeatIds({});
        setComponentNotes({});

        const loadedRecipe =
          await getComboRecipeByProductId(
            product.id,
          );

        if (!isMounted) {
          return;
        }

        if (!loadedRecipe) {
          setError(
            `No existe una receta activa para "${product.name}".`,
          );

          return;
        }

        setRecipe(loadedRecipe);
      } catch (loadError) {
        if (!isMounted) {
          return;
        }

        setError(
          loadError instanceof Error
            ? loadError.message
            : 'No se pudo cargar el combo.',
        );
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void loadRecipe();

    return () => {
      isMounted = false;
    };
  }, [
    product.id,
    product.name,
  ]);

  const selectedComponents =
    useMemo<ComboComponentSelection[]>(
      () => {
        if (!recipe) {
          return [];
        }

        return recipe.components.flatMap(
          (component) => {
            const selectedProduct =
              component.selectionMode ===
              'fixed'
                ? component.fixedProduct
                : component.options.find(
                    (option) =>
                      option.id ===
                      selectedOptionIds[
                        component.id
                      ],
                  );

            if (!selectedProduct) {
              return [];
            }

            const selectedFlavorId =
              selectedFlavorIds[
                component.id
              ];

            const selectedFlavor =
              (
                selectedProduct.flavors ??
                []
              ).find(
                (flavor) =>
                  flavor.id ===
                  selectedFlavorId,
              );

            const selectedMeatId =
              selectedMeatIds[
                component.id
              ];

            const selectedMeat =
              meats.find(
                (meat) =>
                  meat.id ===
                  selectedMeatId,
              );

            const selectedModifiers:
              SelectedModifier[] = [];

            /*
             * Agrega primero la carne.
             */
            if (
              component.requiresMeat &&
              selectedMeat
            ) {
              selectedModifiers.push({
                ...selectedMeat,
              });
            }

            /*
             * Agrega después el sabor,
             * cuando corresponda.
             */
            if (selectedFlavor) {
              selectedModifiers.push({
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
              });
            }

            return [
              {
                slotId: component.id,

                type: component.type,

                label: component.label,

                product:
                  mapComboProductToProduct(
                    selectedProduct,
                  ),

                quantity: 1,

                notes:
                  componentNotes[
                    component.id
                  ]?.trim() ?? '',

                selectedModifiers,
              },
            ];
          },
        );
      },
      [
        recipe,
        meats,
        selectedOptionIds,
        selectedFlavorIds,
        selectedMeatIds,
        componentNotes,
      ],
    );

  useEffect(() => {
    onSelectionChange?.({
      components: selectedComponents,
      isValid: isSelectionValid,
    });
  }, [
    selectedComponents,
    isSelectionValid,
    onSelectionChange,
  ]);

  function selectOption(
    componentId: string,
    optionId: string,
  ): void {
    setSelectedOptionIds(
      (currentSelections) => ({
        ...currentSelections,
        [componentId]: optionId,
      }),
    );

    /*
     * Al cambiar la opción seleccionada,
     * se elimina cualquier sabor anterior.
     */
    setSelectedFlavorIds(
      (currentSelections) => {
        const nextSelections = {
          ...currentSelections,
        };

        delete nextSelections[
          componentId
        ];

        return nextSelections;
      },
    );
  }

  function selectFlavor(
    componentId: string,
    flavorId: string,
  ): void {
    setSelectedFlavorIds(
      (currentSelections) => ({
        ...currentSelections,
        [componentId]: flavorId,
      }),
    );
  }

  function selectMeat(
    componentId: string,
    meatId: string,
  ): void {
    setSelectedMeatIds(
      (currentSelections) => ({
        ...currentSelections,
        [componentId]: meatId,
      }),
    );
  }

  function updateComponentNotes(
    componentId: string,
    notes: string,
  ): void {
    setComponentNotes(
      (currentNotes) => ({
        ...currentNotes,
        [componentId]: notes,
      }),
    );
  }

  function mapComboProductToProduct(
    comboProduct: {
      id: string;
      categoryId: string;
      name: string;
      description: string | null;
      price: number;
      imageUrl: string | null;
      isAvailable: boolean;
      isActive: boolean;
      isComboOption: boolean;
    },
  ): Product {
    return {
      id: comboProduct.id,

      category_id:
        comboProduct.categoryId,

      name:
        comboProduct.name,

      description:
        comboProduct.description,

      price:
        comboProduct.price,

      image_url:
        comboProduct.imageUrl,

      is_available:
        comboProduct.isAvailable,

      is_active:
        comboProduct.isActive,

      created_at:
        new Date().toISOString(),
    };
  }

  function getNotesPlaceholder(
    component: ComboRecipeComponent,
  ): string {
    switch (component.type) {
      case 'burger':
        return 'Ej. sin cebolla';

      case 'hotdog':
        return 'Ej. sin jitomate';

      default:
        return 'Agregar indicaciones';
    }
  }

  function renderComponentNotes(
    component: ComboRecipeComponent,
  ): React.ReactNode {
    if (!component.allowsNotes) {
      return null;
    }

    return (
      <View
        style={{
          marginTop: 12,
        }}
      >
        <Text
          style={{
            color: '#FFFFFF',
            fontSize: 14,
            fontWeight: '700',
            marginBottom: 8,
          }}
        >
          Indicaciones
        </Text>

        <TextInput
          value={
            componentNotes[
              component.id
            ] ?? ''
          }
          onChangeText={(notes) =>
            updateComponentNotes(
              component.id,
              notes,
            )
          }
          placeholder={
            getNotesPlaceholder(
              component,
            )
          }
          placeholderTextColor="#888888"
          multiline
          maxLength={250}
          textAlignVertical="top"
          style={{
            minHeight: 74,
            paddingVertical: 10,
            paddingHorizontal: 12,
            borderRadius: 8,
            borderWidth: 1,
            borderColor: '#555555',
            backgroundColor: '#202020',
            color: '#FFFFFF',
            fontSize: 14,
          }}
        />

        <Text
          style={{
            color: '#888888',
            fontSize: 11,
            marginTop: 4,
            textAlign: 'right',
          }}
        >
          {
            (
              componentNotes[
                component.id
              ] ?? ''
            ).length
          }
          /250
        </Text>
      </View>
    );
  }

  function renderMeatSelector(
    component: ComboRecipeComponent,
  ): React.ReactNode {
    if (!component.requiresMeat) {
      return null;
    }

    if (meats.length === 0) {
      return (
        <Text
          style={{
            color: '#FF5252',
            marginTop: 12,
          }}
        >
          No hay tipos de carne disponibles.
        </Text>
      );
    }

    const selectedMeatId =
      selectedMeatIds[
        component.id
      ];

    return (
      <View
        style={{
          marginTop: 12,
        }}
      >
        <Text
          style={{
            color: '#FFFFFF',
            fontSize: 15,
            fontWeight: '700',
            marginBottom: 8,
          }}
        >
          Elige el tipo de carne
        </Text>

        {meats.map((meat) => {
          const isSelected =
            selectedMeatId === meat.id;

          return (
            <TouchableOpacity
              key={meat.id}
              onPress={() =>
                selectMeat(
                  component.id,
                  meat.id,
                )
              }
              style={{
                padding: 12,
                borderRadius: 8,
                borderWidth: 1,
                marginBottom: 8,

                borderColor:
                  isSelected
                    ? '#FFBF00'
                    : '#555555',

                backgroundColor:
                  isSelected
                    ? '#463800'
                    : '#292929',
              }}
            >
              <Text
                style={{
                  color: '#FFFFFF',

                  fontWeight:
                    isSelected
                      ? '700'
                      : '400',
                }}
              >
                {meat.name}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    );
  }

  function renderFixedComponent(
    component: ComboRecipeComponent,
  ): React.ReactNode {
    if (!component.fixedProduct) {
      return (
        <Text
          style={{
            color: '#FF5252',
            marginTop: 6,
          }}
        >
          Producto fijo no disponible.
        </Text>
      );
    }

    return (
      <View
        style={{
          marginTop: 8,
          padding: 12,
          borderRadius: 8,
          backgroundColor: '#292929',
        }}
      >
        <Text
          style={{
            color: '#FFFFFF',
            fontWeight: '600',
          }}
        >
          {component.fixedProduct.name}
        </Text>
      </View>
    );
  }

  function renderSelectableComponent(
    component: ComboRecipeComponent,
  ): React.ReactNode {
    const selectedOptionId =
      selectedOptionIds[
        component.id
      ];

    const selectedOption =
      component.options.find(
        (option) =>
          option.id ===
          selectedOptionId,
      );

    const flavors =
      selectedOption?.flavors ?? [];

    return (
      <View
        style={{
          marginTop: 8,
          gap: 8,
        }}
      >
        {component.options.length ===
        0 ? (
          <Text
            style={{
              color: '#FF5252',
            }}
          >
            No hay opciones disponibles.
          </Text>
        ) : (
          component.options.map(
            (option) => {
              const isSelected =
                selectedOptionId ===
                option.id;

              return (
                <TouchableOpacity
                  key={option.id}
                  onPress={() =>
                    selectOption(
                      component.id,
                      option.id,
                    )
                  }
                  style={{
                    padding: 12,
                    borderRadius: 8,
                    borderWidth: 1,

                    borderColor:
                      isSelected
                        ? '#FFBF00'
                        : '#555555',

                    backgroundColor:
                      isSelected
                        ? '#463800'
                        : '#292929',
                  }}
                >
                  <Text
                    style={{
                      color: '#FFFFFF',

                      fontWeight:
                        isSelected
                          ? '700'
                          : '400',
                    }}
                  >
                    {option.name}
                  </Text>
                </TouchableOpacity>
              );
            },
          )
        )}

        {component
          .requiresDrinkFlavor &&
          selectedOption &&
          flavors.length > 0 && (
            <View
              style={{
                marginTop: 12,
              }}
            >
              <Text
                style={{
                  color: '#FFFFFF',
                  fontSize: 15,
                  fontWeight: '700',
                  marginBottom: 8,
                }}
              >
                Elige el sabor
              </Text>

              {flavors.map(
                (flavor) => {
                  const isFlavorSelected =
                    selectedFlavorIds[
                      component.id
                    ] === flavor.id;

                  return (
                    <TouchableOpacity
                      key={flavor.id}
                      onPress={() =>
                        selectFlavor(
                          component.id,
                          flavor.id,
                        )
                      }
                      style={{
                        padding: 12,
                        borderRadius: 8,
                        borderWidth: 1,
                        marginBottom: 8,

                        borderColor:
                          isFlavorSelected
                            ? '#FFBF00'
                            : '#555555',

                        backgroundColor:
                          isFlavorSelected
                            ? '#463800'
                            : '#292929',
                      }}
                    >
                      <Text
                        style={{
                          color: '#FFFFFF',

                          fontWeight:
                            isFlavorSelected
                              ? '700'
                              : '400',
                        }}
                      >
                        {flavor.name}
                      </Text>
                    </TouchableOpacity>
                  );
                },
              )}
            </View>
          )}
      </View>
    );
  }

  if (isLoading) {
    return (
      <View
        style={{
          paddingVertical: 30,
          alignItems: 'center',
        }}
      >
        <ActivityIndicator
          size="large"
          color="#FFBF00"
        />

        <Text
          style={{
            color: '#FFFFFF',
            marginTop: 12,
          }}
        >
          Cargando configuración del combo...
        </Text>
      </View>
    );
  }

  if (error) {
    return (
      <View
        style={{
          paddingVertical: 20,
        }}
      >
        <Text
          style={{
            color: '#FF5252',
            textAlign: 'center',
          }}
        >
          {error}
        </Text>
      </View>
    );
  }

  if (!recipe) {
    return null;
  }

  return (
    <View
      style={{
        paddingVertical: 16,
      }}
    >
      <Text
        style={{
          color: '#FFFFFF',
          fontSize: 18,
          fontWeight: '700',
          textAlign: 'center',
          marginBottom: 16,
        }}
      >
        Configura {product.name}
      </Text>

      {recipe.components.map(
        (component) => (
          <View
            key={component.id}
            style={{
              paddingVertical: 12,
              paddingHorizontal: 14,
              marginBottom: 12,
              borderWidth: 1,
              borderColor: '#555555',
              borderRadius: 8,
            }}
          >
            <Text
              style={{
                color: '#FFFFFF',
                fontSize: 15,
                fontWeight: '700',
              }}
            >
              {component.label}
            </Text>

            <Text
              style={{
                color: '#AAAAAA',
                fontSize: 12,
                marginTop: 3,
              }}
            >
              {component.selectionMode ===
              'fixed'
                ? 'Incluido en el combo'
                : 'Selecciona una opción'}
            </Text>

            {component.selectionMode ===
            'fixed'
              ? renderFixedComponent(
                  component,
                )
              : renderSelectableComponent(
                  component,
                )}

            {renderMeatSelector(
              component,
            )}

            {renderComponentNotes(
              component,
            )}
          </View>
        ),
      )}
    </View>
  );
};