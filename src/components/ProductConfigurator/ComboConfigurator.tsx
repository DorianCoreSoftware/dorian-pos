import React, {
  useEffect,
  useState,
} from 'react';

import {
  ActivityIndicator,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import {
  ComboRecipe,
  ComboRecipeComponent,
} from '../../domain/entities/ComboRecipe';

import { Product } from '../../types';

import {
  getComboRecipeByProductId,
} from '../../services/comboService';

interface ComboConfiguratorProps {
  product: Product;
}

export const ComboConfigurator: React.FC<
  ComboConfiguratorProps
> = ({ product }) => {
  const [
    recipe,
    setRecipe,
  ] = useState<ComboRecipe | null>(null);

  const [
    selectedOptionIds,
    setSelectedOptionIds,
  ] = useState<Record<string, string>>({});

  const [
    selectedFlavorIds,
    setSelectedFlavorIds,
  ] = useState<Record<string, string>>({});

  const [
    isLoading,
    setIsLoading,
  ] = useState(false);

  const [
    error,
    setError,
  ] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadRecipe(): Promise<void> {
      try {
        setIsLoading(true);
        setError(null);
        setRecipe(null);
        setSelectedOptionIds({});
        setSelectedFlavorIds({});

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

        console.log(
          '🍹 Receta recibida en ComboConfigurator:',
          JSON.stringify(
            loadedRecipe,
            null,
            2,
          ),
        );

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

  function selectOption(
    componentId: string,
    optionId: string,
  ): void {
    setSelectedOptionIds(
      currentSelections => ({
        ...currentSelections,
        [componentId]: optionId,
      }),
    );

    /*
     * Al cambiar el producto seleccionado,
     * eliminamos cualquier sabor anterior.
     */
    setSelectedFlavorIds(
      currentSelections => {
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
      currentSelections => ({
        ...currentSelections,
        [componentId]: flavorId,
      }),
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
      selectedOptionIds[component.id];

    const selectedOption =
      component.options.find(
        option =>
          option.id === selectedOptionId,
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
        {component.options.length === 0 ? (
          <Text
            style={{
              color: '#FF5252',
            }}
          >
            No hay opciones disponibles.
          </Text>
        ) : (
          component.options.map(option => {
            const isSelected =
              selectedOptionId === option.id;

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
                  borderColor: isSelected
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
                    fontWeight: isSelected
                      ? '700'
                      : '400',
                  }}
                >
                  {option.name}
                </Text>
              </TouchableOpacity>
            );
          })
        )}

        {component.requiresDrinkFlavor &&
          selectedOption && (
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

              {flavors.length === 0 ? (
                <Text
                  style={{
                    color: '#FF5252',
                  }}
                >
                  No hay sabores disponibles.
                </Text>
              ) : (
                flavors.map(flavor => {
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
                })
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
        component => (
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
          </View>
        ),
      )}
    </View>
  );
};