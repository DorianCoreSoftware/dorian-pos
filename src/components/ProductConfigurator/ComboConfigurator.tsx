import { useBusiness } from '../../context/BusinessContext';

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
  ComboProductOption,
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

import {
  getAvailableModifiersByGroupId,
  ModifierWithGroup,
} from '../../services/modifierService';

import {
  getActiveProductModifierGroups,
  ProductModifierGroup,
} from '../../services/productModifierGroupService';

import {
  ModifierPromotion,
} from '../../services/modifierPromotionService';

import {
  useCurrency,
} from '../../hooks/useCurrency';

export interface ComboConfiguratorSelection {
  components: ComboComponentSelection[];
  isValid: boolean;
}

interface ComboConfiguratorProps {
  product: Product;

  modifierPromotion:
    | ModifierPromotion
    | null;

  onSelectionChange?: (
    selection: ComboConfiguratorSelection,
  ) => void;
}

type ProductModifierGroupsByProductId = Record<
  string,
  ProductModifierGroup[]
>;

type ModifiersByGroupId = Record<
  string,
  ModifierWithGroup[]
>;

type SelectedModifierIdsByComponent = Record<
  string,
  Record<string, string[]>
>;

export const ComboConfigurator: React.FC<
  ComboConfiguratorProps
> = ({
  product,
  modifierPromotion,
  onSelectionChange,
}) => {
  const { theme: businessTheme } = useBusiness();

    const {
      formatCurrency,
    } = useCurrency();

  const [
    recipe,
    setRecipe,
  ] = useState<ComboRecipe | null>(null);

  const [
    selectedOptionIds,
    setSelectedOptionIds,
  ] = useState<Record<string, string>>({});

  const [
    componentNotes,
    setComponentNotes,
  ] = useState<Record<string, string>>({});

  const [
    modifierGroupsByProductId,
    setModifierGroupsByProductId,
  ] = useState<ProductModifierGroupsByProductId>({});

  const [
    modifiersByGroupId,
    setModifiersByGroupId,
  ] = useState<ModifiersByGroupId>({});

  const [
    selectedModifierIdsByComponent,
    setSelectedModifierIdsByComponent,
  ] = useState<SelectedModifierIdsByComponent>({});

  const [
    loadedModifierProductIds,
    setLoadedModifierProductIds,
  ] = useState<Record<string, boolean>>({});

  const [
    isLoading,
    setIsLoading,
  ] = useState(false);

  const [
    areModifiersLoading,
    setAreModifiersLoading,
  ] = useState(false);

  const [
    error,
    setError,
  ] = useState<string | null>(null);

  function getSelectedProduct(
    component: ComboRecipeComponent,
  ): ComboProductOption | null {
    if (
      component.selectionMode ===
      'fixed'
    ) {
      return component.fixedProduct;
    }

    const selectedOptionId =
      selectedOptionIds[
        component.id
      ];

    if (!selectedOptionId) {
      return null;
    }

    return (
      component.options.find(
        option =>
          option.id ===
          selectedOptionId,
      ) ?? null
    );
  }

  useEffect(() => {
    let isMounted = true;

    async function loadRecipe(): Promise<void> {
      try {
        setIsLoading(true);
        setError(null);
        setRecipe(null);
        setSelectedOptionIds({});
        setComponentNotes({});
        setModifierGroupsByProductId({});
        setModifiersByGroupId({});
        setSelectedModifierIdsByComponent({});
        setLoadedModifierProductIds({});

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

  const selectedProducts =
    useMemo(() => {
      if (!recipe) {
        return [];
      }

      return recipe.components
        .map(
          component =>
            getSelectedProduct(
              component,
            ),
        )
        .filter(
          (
            selectedProduct,
          ): selectedProduct is ComboProductOption =>
            selectedProduct !== null,
        );
    }, [
      recipe,
      selectedOptionIds,
    ]);

  useEffect(() => {
    if (!recipe) {
      return;
    }

    const uniqueProductIds =
      Array.from(
        new Set(
          selectedProducts.map(
            selectedProduct =>
              selectedProduct.id,
          ),
        ),
      );

    const productIdsToLoad =
      uniqueProductIds.filter(
        productId =>
          !loadedModifierProductIds[
            productId
          ],
      );

    if (
      productIdsToLoad.length ===
      0
    ) {
      return;
    }

    let isMounted = true;

    async function loadModifierData(): Promise<void> {
      try {
        setAreModifiersLoading(true);

        const productEntries =
          await Promise.all(
            productIdsToLoad.map(
              async productId => {
                const groups =
                  await getActiveProductModifierGroups(
                    productId,
                  );

                return [
                  productId,
                  groups,
                ] as const;
              },
            ),
          );

        const uniqueGroupIds =
          Array.from(
            new Set(
              productEntries.flatMap(
                ([, groups]) =>
                  groups.map(
                    group =>
                      group.modifierGroupId,
                  ),
              ),
            ),
          );

        const groupIdsToLoad =
          uniqueGroupIds.filter(
            groupId =>
              !Object.prototype.hasOwnProperty.call(
                modifiersByGroupId,
                groupId,
              ),
          );

        const groupEntries =
          await Promise.all(
            groupIdsToLoad.map(
              async groupId => {
                const modifiers =
                  await getAvailableModifiersByGroupId(
                    groupId,
                  );

                return [
                  groupId,
                  modifiers,
                ] as const;
              },
            ),
          );

        if (!isMounted) {
          return;
        }

        setModifierGroupsByProductId(
          current => ({
            ...current,
            ...Object.fromEntries(
              productEntries,
            ),
          }),
        );

        if (
          groupEntries.length >
          0
        ) {
          setModifiersByGroupId(
            current => ({
              ...current,
              ...Object.fromEntries(
                groupEntries,
              ),
            }),
          );
        }

        setLoadedModifierProductIds(
          current => ({
            ...current,
            ...Object.fromEntries(
              productIdsToLoad.map(
                productId => [
                  productId,
                  true,
                ],
              ),
            ),
          }),
        );
      } catch (modifierLoadError) {
        if (!isMounted) {
          return;
        }

        console.error(
          'Error cargando modificadores del combo:',
          modifierLoadError,
        );

        setError(
          modifierLoadError instanceof Error
            ? modifierLoadError.message
            : 'No se pudieron cargar las opciones del combo.',
        );
      } finally {
        if (isMounted) {
          setAreModifiersLoading(false);
        }
      }
    }

    void loadModifierData();

    return () => {
      isMounted = false;
    };
  }, [
    recipe,
    selectedProducts,
    loadedModifierProductIds,
    modifiersByGroupId,
  ]);

  const isSelectionValid =
    useMemo(() => {
      if (
        !recipe ||
        isLoading ||
        areModifiersLoading ||
        error
      ) {
        return false;
      }

      return recipe.components.every(
        component => {
          const selectedProduct =
            getSelectedProduct(
              component,
            );

          if (!selectedProduct) {
            return false;
          }

          if (
            !loadedModifierProductIds[
              selectedProduct.id
            ]
          ) {
            return false;
          }

          const groups =
            modifierGroupsByProductId[
              selectedProduct.id
            ] ?? [];

          return groups.every(
            group => {
              const selectedCount =
                (
                  selectedModifierIdsByComponent[
                    component.id
                  ]?.[
                    group.modifierGroupId
                  ] ?? []
                ).length;

              const minimum =
                group.isRequired
                  ? Math.max(
                      1,
                      group.minSelections,
                    )
                  : group.minSelections;

              return (
                selectedCount >=
                  minimum &&
                selectedCount <=
                  group.maxSelections
              );
            },
          );
        },
      );
    }, [
      recipe,
      isLoading,
      areModifiersLoading,
      error,
      selectedOptionIds,
      loadedModifierProductIds,
      modifierGroupsByProductId,
      selectedModifierIdsByComponent,
    ]);

  const selectedComponents =
    useMemo<
      ComboComponentSelection[]
    >(() => {
      if (!recipe) {
        return [];
      }

      return recipe.components.flatMap(
        component => {
          const selectedProduct =
            getSelectedProduct(
              component,
            );

          if (!selectedProduct) {
            return [];
          }

          const groups =
            modifierGroupsByProductId[
              selectedProduct.id
            ] ?? [];

          const selectedModifiers:
            SelectedModifier[] =
            groups.flatMap(
              group => {
                const selectedIds =
                  selectedModifierIdsByComponent[
                    component.id
                  ]?.[
                    group.modifierGroupId
                  ] ?? [];

                const availableModifiers =
                  modifiersByGroupId[
                    group.modifierGroupId
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
                    }),
                  );
              },
            );

          return [
            {
              slotId:
                component.id,
              type:
                component.type,
              label:
                component.label,
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
    }, [
      recipe,
      selectedOptionIds,
      componentNotes,
      modifierGroupsByProductId,
      modifiersByGroupId,
      selectedModifierIdsByComponent,
    ]);

  useEffect(() => {
    onSelectionChange?.({
      components:
        selectedComponents,
      isValid:
        isSelectionValid,
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
      currentSelections => ({
        ...currentSelections,
        [componentId]:
          optionId,
      }),
    );

    setSelectedModifierIdsByComponent(
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

  function selectModifier(
    componentId: string,
    group: ProductModifierGroup,
    modifierId: string,
  ): void {
    setSelectedModifierIdsByComponent(
      current => {
        const componentSelections =
          current[
            componentId
          ] ?? {};

        const currentSelections =
          componentSelections[
            group.modifierGroupId
          ] ?? [];

        let nextSelections:
          string[];

        if (
          currentSelections.includes(
            modifierId,
          )
        ) {
          nextSelections =
            currentSelections.filter(
              id =>
                id !==
                modifierId,
            );
        } else if (
          group.maxSelections ===
          1
        ) {
          nextSelections = [
            modifierId,
          ];
        } else if (
          currentSelections.length >=
          group.maxSelections
        ) {
          return current;
        } else {
          nextSelections = [
            ...currentSelections,
            modifierId,
          ];
        }

        return {
          ...current,
          [componentId]: {
            ...componentSelections,
            [group.modifierGroupId]:
              nextSelections,
          },
        };
      },
    );
  }

  function duplicateModifier(
    componentId: string,
    group: ProductModifierGroup,
    modifierId: string,
  ): void {
    if (!group.allowDuplicates) {
      return;
    }

    setSelectedModifierIdsByComponent(
      current => {
        const componentSelections =
          current[
            componentId
          ] ?? {};

        const currentSelections =
          componentSelections[
            group.modifierGroupId
          ] ?? [];

        if (
          currentSelections.length >=
          group.maxSelections
        ) {
          return current;
        }

        return {
          ...current,
          [componentId]: {
            ...componentSelections,
            [group.modifierGroupId]: [
              ...currentSelections,
              modifierId,
            ],
          },
        };
      },
    );
  }

  function updateComponentNotes(
    componentId: string,
    notes: string,
  ): void {
    setComponentNotes(
      currentNotes => ({
        ...currentNotes,
        [componentId]:
          notes,
      }),
    );
  }

  function mapComboProductToProduct(
    comboProduct: ComboProductOption,
  ): Product {
    return {
      id:
        comboProduct.id,
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
          onChangeText={
            notes =>
              updateComponentNotes(
                component.id,
                notes,
              )
          }
          placeholder="Agregar indicaciones"
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
          {
            component.fixedProduct.name
          }
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
            option => {
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
                        ? businessTheme.primary
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
      </View>
    );
  }

  function renderModifierGroups(
    component: ComboRecipeComponent,
  ): React.ReactNode {
    const selectedProduct =
      getSelectedProduct(
        component,
      );

    if (!selectedProduct) {
      return null;
    }

    if (
      !loadedModifierProductIds[
        selectedProduct.id
      ]
    ) {
      return (
        <View
          style={{
            marginTop: 12,
            alignItems: 'center',
          }}
        >
          <ActivityIndicator
            size="small"
            color={businessTheme.primary}
          />
        </View>
      );
    }

    const groups =
      modifierGroupsByProductId[
        selectedProduct.id
      ] ?? [];

    if (groups.length === 0) {
      return null;
    }

    return (
      <>
        {groups.map(
          group => {
            const modifiers =
              modifiersByGroupId[
                group.modifierGroupId
              ] ?? [];

            const selectedIds =
              selectedModifierIdsByComponent[
                component.id
              ]?.[
                group.modifierGroupId
              ] ?? [];

            const minimum =
              group.isRequired
                ? Math.max(
                    1,
                    group.minSelections,
                  )
                : group.minSelections;

            const groupName =
              group.group?.name ??
              'Opciones';

            return (
              <View
                key={
                  group.modifierGroupId
                }
                style={{
                  marginTop: 12,
                }}
              >
                <Text
                  style={{
                    color: '#FFFFFF',
                    fontSize: 15,
                    fontWeight: '700',
                    marginBottom: 4,
                  }}
                >
                  {groupName}
                  {minimum > 0
                    ? ' *'
                    : ''}
                </Text>

                <Text
                  style={{
                    color: '#AAAAAA',
                    fontSize: 11,
                    marginBottom: 8,
                  }}
                >
                  {group.maxSelections ===
                  1
                    ? minimum > 0
                      ? 'Selecciona una opción'
                      : 'Selecciona hasta una opción'
                    : `Selecciona de ${minimum} a ${group.maxSelections}`}
                </Text>

                {modifiers.length ===
                0 ? (
                  <Text
                    style={{
                      color: '#FF5252',
                    }}
                  >
                    No hay opciones disponibles para {groupName}.
                  </Text>
                ) : (
                  modifiers.map(
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
                          key={modifier.id}
                          onPress={() =>
                            selectModifier(
                              component.id,
                              group,
                              modifier.id,
                            )
                          }
                          style={{
                            padding: 12,
                            borderRadius: 8,
                            borderWidth:
                              isModifierPromotion
                                ? 2
                                : 1,
                            marginBottom: 8,
                            borderColor:
                              isSelected ||
                              isModifierPromotion
                                ? businessTheme.primary
                                : '#555555',
                            backgroundColor:
                              isSelected
                                ? '#463800'
                                : '#292929',
                          }}
                        >
                          <Text
                            style={{
                              color:
                                isModifierPromotion
                                  ? businessTheme.primary
                                  : '#FFFFFF',
                              fontWeight:
                                isSelected ||
                                isModifierPromotion
                                  ? '700'
                                  : '400',
                            }}
                          >
                            {isModifierPromotion
                              ? '🌶️ '
                              : ''}
                            {modifier.name}
                            {selectedCountForModifier >
                              1
                              ? ` (x${selectedCountForModifier})`
                              : ''}
                          </Text>

                          {isModifierPromotion &&
                            modifierPromotion && (
                              <Text
                                style={{
                                  color: '#D6C98A',
                                  fontSize: 10,
                                  marginTop: 3,
                                }}
                              >
                                {modifierPromotion.display_name} · Ahorra{' '}
                                {formatCurrency(
                                  modifierPromotion.discount_amount,
                                )}
                              </Text>
                            )}

                          {group.allowDuplicates &&
                            isSelected &&
                            selectedIds.length <
                              group.maxSelections && (
                              <TouchableOpacity
                                onPress={() =>
                                  duplicateModifier(
                                    component.id,
                                    group,
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
                                <Text
                                  style={{
                                    color: '#FFFFFF',
                                    fontSize: 10,
                                    fontWeight: '700',
                                    textAlign: 'center',
                                  }}
                                >
                                  + Agregar otra
                                </Text>
                              </TouchableOpacity>
                            )}
                        </TouchableOpacity>
                      );
                    },
                  )
                )}
              </View>
            );
          },
        )}
      </>
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
          color={businessTheme.primary}
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

            {component.selectionMode ===
            'fixed'
              ? renderFixedComponent(
                  component,
                )
              : renderSelectableComponent(
                  component,
                )}

            {renderModifierGroups(
              component,
            )}

            {renderComponentNotes(
              component,
            )}
          </View>
        ),
      )}

      {areModifiersLoading && (
        <Text
          style={{
            color: '#AAAAAA',
            fontSize: 12,
            textAlign: 'center',
            marginTop: 4,
          }}
        >
          Cargando opciones...
        </Text>
      )}
    </View>
  );
};
