import React, {
  useEffect,
  useMemo,
  useState,
  useRef,
} from 'react';

import {
  Alert,
  Modal,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import {
  CategoryTabs,
} from '../../components/category-tabs/CategoryTabs';

import {
  MenuList,
} from '../../components/menu-list/MenuList';

import {
  Cart as CartComponent,
} from '../../components/cart/Cart';

import {
  ProductConfiguratorModal,
  ProductConfigurationResult,
} from '../../components/ProductConfigurator/ProductConfiguratorModal';

import {
  useModifiers,
} from '../../hooks/useModifiers';

import {
  createKitchenOrder,
  updateKitchenOrder,
} from '../../services/orders';

import {
  getProductModifierMode,
  isKongBurger,
} from '../../services/modifierService';

import {
  Cart,
  CartItem,
  Category,
  ComboComponentSelection,
  DeliveryDetails,
  Product,
} from '../../types';

import {
  styles,
} from '../../../App.styles';

import {
  DeliveryConfiguratorModal,
} from '../../components/delivery-configurator';

import {
  isDeliveryProduct,
} from '../../Utils/delivery';
import { useResponsiveLayout } from '../../hooks/useResponsiveLayout';

interface POSScreenProps {
  categories: Category[];
  products: Product[];

  fetchProducts:
  () => Promise<void>;

  cart: Cart;

  setCart: React.Dispatch<
    React.SetStateAction<Cart>
  >;

  editingOrderId:
  string | null;

  setEditingOrderId:
  React.Dispatch<
    React.SetStateAction<
      string | null
    >
  >;

  fetchKitchenOrders:
  () => Promise<void>;

  modifiersVersion: number;
}

export function POSScreen({
  categories,
  products,
  fetchProducts,
  cart,
  setCart,
  editingOrderId,
  setEditingOrderId,
  fetchKitchenOrders,
  modifiersVersion,
}: POSScreenProps) {
  const visibleCategories =
    useMemo(
      () => {
        const hiddenCategoryNames =
          [
            'Complementos de combo',
            'Domicilio',
          ].map(
            normalizeText,
          );

        return categories
          .filter(
            (category) =>
              !hiddenCategoryNames.includes(
                normalizeText(
                  category.name,
                ),
              ),
          )
          .sort(
            (
              categoryA,
              categoryB,
            ) =>
              categoryA.name.localeCompare(
                categoryB.name,
                'es',
                {
                  sensitivity:
                    'base',
                },
              ),
          );
      },
      [categories],
    );

  const [
    selectedCategoryId,
    setSelectedCategoryId,
  ] = useState<string>(
    visibleCategories[0]?.id ??
    '',
  );

  const [
    searchText,
    setSearchText,
  ] = useState('');

  const [
    isModifierModalVisible,
    setIsModifierModalVisible,
  ] = useState(false);

  const [
    selectedProduct,
    setSelectedProduct,
  ] = useState<Product | null>(
    null,
  );

  const [
    productNotes,
    setProductNotes,
  ] = useState('');

  const [
    isProcessingOrder,
    setIsProcessingOrder,
  ] = useState(false);

  const {
    isPhone,
  } = useResponsiveLayout();

  const [
    isMobileCartVisible,
    setIsMobileCartVisible,
  ] = useState(false);

  const [
    isMobileCartReady,
    setIsMobileCartReady,
  ] = useState(false);

  const mobileCartSummary =
    useMemo(() => {
      const totalItems =
        cart.reduce(
          (
            total,
            item,
          ) =>
            isDeliveryProduct(
              item.product,
            )
              ? total
              : total +
              item.quantity,
          0,
        );

      const totalAmount =
        cart.reduce(
          (
            total,
            item,
          ) =>
            total +
            Number(
              item.product.price,
            ) *
            item.quantity,
          0,
        );

      return {
        totalItems,
        totalAmount,
      };
    }, [cart]);

  const pendingOrderRequest =
    useRef<{
      id: string;
      fingerprint: string;
    } | null>(null);

  const {
    meats,
    sauces,
    isLoading:
    areModifiersLoading,
    error:
    modifiersError,
    fetchModifiers,
  } = useModifiers();

  useEffect(() => {
    if (
      modifiersVersion <= 0
    ) {
      return;
    }

    void fetchModifiers();
  }, [
    modifiersVersion,
    fetchModifiers,
  ]);

  const [
    isDeliveryModalVisible,
    setIsDeliveryModalVisible,
  ] = useState(false);

  const [
    selectedDeliveryProduct,
    setSelectedDeliveryProduct,
  ] = useState<Product | null>(
    null,
  );

  useEffect(() => {
    if (
      visibleCategories.length ===
      0
    ) {
      setSelectedCategoryId(
        '',
      );

      return;
    }

    const categoryStillExists =
      visibleCategories.some(
        (category) =>
          String(
            category.id,
          ) ===
          String(
            selectedCategoryId,
          ),
      );

    if (!categoryStillExists) {
      setSelectedCategoryId(
        visibleCategories[0].id,
      );
    }
  }, [
    visibleCategories,
    selectedCategoryId,
  ]);

  const filteredProducts =
    useMemo(() => {
      const normalizedSearch =
        normalizeText(
          searchText,
        );

      return products
        .filter(
          (product) => {
            if (
              normalizedSearch
            ) {
              /*
               * Búsqueda global:
               * ignora la categoría
               * seleccionada.
               */
              return normalizeText(
                product.name,
              ).includes(
                normalizedSearch,
              );
            }

            /*
             * Sin búsqueda:
             * comportamiento normal
             * por categoría.
             */
            return (
              String(
                product.category_id,
              ) ===
              String(
                selectedCategoryId,
              )
            );
          },
        )
        .sort(
          (
            productA,
            productB,
          ) => {
            const priceDifference =
              Number(
                productA.price,
              ) -
              Number(
                productB.price,
              );

            if (
              priceDifference !==
              0
            ) {
              return priceDifference;
            }

            return productA.name.localeCompare(
              productB.name,
              'es',
              {
                sensitivity:
                  'base',
              },
            );
          },
        );
    }, [
      products,
      selectedCategoryId,
      searchText,
    ]);

  const selectedProductCategory =
    categories.find(
      (category) =>
        String(
          category.id,
        ) ===
        String(
          selectedProduct
            ?.category_id,
        ),
    ) ?? null;

  const modifierMode =
    getProductModifierMode(
      selectedProduct,
      selectedProductCategory
        ?.name,
    );

  const selectedProductIsKongBurger =
    isKongBurger(
      selectedProduct,
    );

  const deliveryProduct =
    products.find(
      (product) =>
        isDeliveryProduct(
          product,
        ),
    ) ?? null;

  const currentDeliveryItem =
    cart.find(
      (item) =>
        isDeliveryProduct(
          item.product,
        ),
    ) ?? null;

  const currentDeliveryDetails =
    currentDeliveryItem
      ?.deliveryDetails ?? null;

  const handleToggleDelivery =
    (): void => {
      if (
        currentDeliveryItem
      ) {
        setCart(
          (
            currentCart,
          ) =>
            currentCart.filter(
              (item) =>
                !isDeliveryProduct(
                  item.product,
                ),
            ),
        );

        return;
      }

      const hasRegularProducts =
        cart.some(
          (item) =>
            !isDeliveryProduct(
              item.product,
            ),
        );

      if (
        !hasRegularProducts
      ) {
        Alert.alert(
          'Orden vacía',
          'Agrega al menos un producto antes de activar el envío a domicilio.',
        );

        return;
      }

      if (!deliveryProduct) {
        Alert.alert(
          'Producto no disponible',
          'No se encontró el producto Envío a domicilio.',
        );

        return;
      }

      setSelectedDeliveryProduct(
        deliveryProduct,
      );

      setIsDeliveryModalVisible(
        true,
      );
    };

  const handleEditDelivery =
    (): void => {
      if (!deliveryProduct) {
        Alert.alert(
          'Producto no disponible',
          'No se encontró el producto Envío a domicilio.',
        );

        return;
      }

      setSelectedDeliveryProduct(
        deliveryProduct,
      );

      setIsDeliveryModalVisible(
        true,
      );
    };

  const handleProductPress = (
    product: Product,
  ): void => {
    if (
      isDeliveryProduct(
        product,
      )
    ) {
      setSelectedDeliveryProduct(
        product,
      );

      setIsDeliveryModalVisible(
        true,
      );

      return;
    }

    setSelectedProduct(
      product,
    );

    setProductNotes('');

    setIsModifierModalVisible(
      true,
    );
  };

  const handleCloseModifierModal =
    (): void => {
      setIsModifierModalVisible(
        false,
      );

      setSelectedProduct(null);

      setProductNotes('');
    };

  const handleCloseDeliveryModal =
    (): void => {
      setIsDeliveryModalVisible(
        false,
      );

      setSelectedDeliveryProduct(
        null,
      );
    };

  const handleConfirmDelivery = (
    deliveryDetails:
      DeliveryDetails,
  ): void => {
    if (
      !selectedDeliveryProduct
    ) {
      return;
    }

    const deliveryItemId =
      `${selectedDeliveryProduct.id}-delivery`;

    const deliveryItem:
      CartItem = {
      id: deliveryItemId,

      product: {
        ...selectedDeliveryProduct,
      },

      quantity: 1,

      notes: '',

      selectedModifiers: [],

      deliveryDetails: {
        ...deliveryDetails,
      },
    };

    setCart(
      (
        currentCart,
      ) => {
        const existingDeliveryIndex =
          currentCart.findIndex(
            (item) =>
              isDeliveryProduct(
                item.product,
              ),
          );

        if (
          existingDeliveryIndex ===
          -1
        ) {
          return [
            ...currentCart,
            deliveryItem,
          ];
        }

        return currentCart.map(
          (
            item,
            index,
          ) =>
            index ===
              existingDeliveryIndex
              ? deliveryItem
              : item,
        );
      },
    );

    handleCloseDeliveryModal();
  };

  const handleConfirmAddToCart =
    (
      configuration:
        ProductConfigurationResult,
    ): void => {
      if (!selectedProduct) {
        return;
      }

      const {
        selectedModifiers = [],
        comboComponents = [],
      } = configuration;

      const productToAdd =
        selectedProduct;

      const cleanNotes =
        productNotes.trim();

      const normalizedComponents =
        cloneComboComponents(
          comboComponents,
        );

      const modifierIdentifier =
        createModifierIdentifier(
          selectedModifiers,
        );

      const comboIdentifier =
        createComboIdentifier(
          normalizedComponents,
        );

      const cartItemId = [
        productToAdd.id,
        cleanNotes,
        modifierIdentifier,
        comboIdentifier,
      ].join('-');

      const itemToAdd:
        CartItem = {
        id: cartItemId,

        product: {
          ...productToAdd,
        },

        quantity: 1,

        notes:
          cleanNotes,

        selectedModifiers:
          selectedModifiers.map(
            (modifier) => ({
              ...modifier,
            }),
          ),

        comboComponents:
          normalizedComponents
            .length > 0
            ? normalizedComponents
            : undefined,
      };

      setCart(
        (
          currentCart,
        ) => {
          const existingItemIndex =
            currentCart.findIndex(
              (item) =>
                item.id ===
                cartItemId,
            );

          if (
            existingItemIndex ===
            -1
          ) {
            return [
              ...currentCart,
              itemToAdd,
            ];
          }

          return currentCart.map(
            (
              item,
              index,
            ) => {
              if (
                index !==
                existingItemIndex
              ) {
                return item;
              }

              const preservedComponents =
                item.comboComponents &&
                  item
                    .comboComponents
                    .length > 0
                  ? cloneComboComponents(
                    item.comboComponents,
                  )
                  : cloneComboComponents(
                    itemToAdd
                      .comboComponents ??
                    [],
                  );

              return {
                ...item,

                quantity:
                  item.quantity +
                  itemToAdd.quantity,

                selectedModifiers:
                  item
                    .selectedModifiers
                    .length > 0
                    ? item
                      .selectedModifiers
                      .map(
                        (
                          modifier,
                        ) => ({
                          ...modifier,
                        }),
                      )
                    : itemToAdd
                      .selectedModifiers
                      .map(
                        (
                          modifier,
                        ) => ({
                          ...modifier,
                        }),
                      ),

                comboComponents:
                  preservedComponents
                    .length > 0
                    ? preservedComponents
                    : undefined,
              };
            },
          );
        },
      );

      handleCloseModifierModal();
    };

  const handleUpdateQuantity = (
    itemId: string,
    quantityChange: number,
  ): void => {
    setCart(
      (
        currentCart,
      ) =>
        currentCart
          .map((item) => {
            if (
              item.id !== itemId
            ) {
              return item;
            }

            if (
              isDeliveryProduct(
                item.product,
              )
            ) {
              if (
                quantityChange > 0
              ) {
                return {
                  ...item,
                  quantity: 1,
                };
              }

              return {
                ...item,
                quantity: 0,
              };
            }

            return {
              ...item,

              quantity:
                item.quantity +
                quantityChange,
            };
          })
          .filter(
            (item) =>
              item.quantity > 0,
          ),
    );
  };

  const handleRemoveCartItem = (
    itemId: string,
  ): void => {
    setCart(
      (
        currentCart,
      ) =>
        currentCart.filter(
          (item) =>
            item.id !==
            itemId,
        ),
    );
  };

  const handleClearCart =
    (): void => {
      setCart([]);

      setEditingOrderId(null);
    };

  const handleCheckout = async (
    totalAmount: number,
  ): Promise<void> => {
    const hasRegularProducts =
      cart.some(
        (item) =>
          !isDeliveryProduct(
            item.product,
          ),
      );

    if (
      !hasRegularProducts ||
      isProcessingOrder
    ) {
      return;
    }
    const orderFingerprint =
      createOrderFingerprint(
        cart,
        totalAmount,
      );
    try {
      setIsProcessingOrder(
        true,
      );

      if (editingOrderId) {
        await updateKitchenOrder(
          editingOrderId,
          cart,
          totalAmount,
        );

        Alert.alert(
          '🍳 ¡Pedido actualizado!',
          'Los cambios fueron enviados a cocina.',
        );
      } else {
        /*
         * Si es exactamente el mismo
         * carrito que falló antes,
         * reutilizamos la misma clave.
         *
         * Si el carrito cambió,
         * generamos una nueva.
         */
        if (
          !pendingOrderRequest.current ||
          pendingOrderRequest.current
            .fingerprint !==
          orderFingerprint
        ) {
          pendingOrderRequest.current = {
            id:
              createRequestId(),

            fingerprint:
              orderFingerprint,
          };
        }

        const result =
          await createKitchenOrder(
            cart,
            totalAmount,
            pendingOrderRequest.current.id,
          );

        if (
          result &&
          'success' in result &&
          !result.success
        ) {
          throw new Error(
            'No se pudo crear la orden.',
          );
        }

        /*
         * Ya tenemos confirmación de que
         * Supabase recibió la solicitud.
         * La clave deja de ser necesaria.
         */
        pendingOrderRequest.current =
          null;

        Alert.alert(
          '🍳 ¡Pedido enviado!',
          'La orden fue enviada a cocina.',
        );
      }

      setCart([]);

      setEditingOrderId(null);

      await fetchKitchenOrders();
    } catch (error) {
      console.error(
        '❌ Error al guardar el pedido:',
        error,
      );

      Alert.alert(
        '⚠️ Error al procesar',
        error instanceof Error
          ? error.message
          : 'No se pudo guardar el pedido.',
      );
    } finally {
      setIsProcessingOrder(
        false,
      );
    }
  };

  return (
    <View
      style={
        isPhone
          ? styles.phoneContainer
          : styles.contentRow
      }
    >
      <View
        style={
          isPhone
            ? styles.phoneMenuSection
            : styles.menuSection
        }
      >
        <View
          style={
            styles.productSearchContainer
          }
        >
          <Text
            style={
              styles.productSearchIcon
            }
          >
            🔎
          </Text>

          <TextInput
            value={
              searchText
            }
            onChangeText={
              setSearchText
            }
            placeholder="Buscar producto..."
            placeholderTextColor="#777777"
            style={
              styles.productSearchInput
            }
            autoCorrect={false}
            autoCapitalize="none"
            returnKeyType="search"
          />

          {searchText.length >
            0 ? (
            <TouchableOpacity
              style={
                styles.productSearchClear
              }
              onPress={() =>
                setSearchText('')
              }
            >
              <Text
                style={
                  styles.productSearchClearText
                }
              >
                ✕
              </Text>
            </TouchableOpacity>
          ) : null}
        </View>

        <CategoryTabs
          categorias={
            visibleCategories
          }
          categoriaSeleccionada={
            selectedCategoryId
          }
          onSelectCategoria={
            setSelectedCategoryId
          }
        />

        <MenuList
          products={
            filteredProducts
          }
          onProductPress={
            handleProductPress
          }
          onRefreshMenu={
            fetchProducts
          }
        />
      </View>

      {!isPhone ? (
        <CartComponent
          cart={cart}
          onUpdateQuantity={
            handleUpdateQuantity
          }
          onRemoveItem={
            handleRemoveCartItem
          }
          onClearCart={
            handleClearCart
          }
          onCheckout={
            handleCheckout
          }
          onToggleDelivery={
            handleToggleDelivery
          }
          onEditDelivery={
            handleEditDelivery
          }
        />
      ) : null}

      {isPhone &&
        cart.length > 0 ? (
        <TouchableOpacity
          style={
            styles.mobileCartBar
          }
          activeOpacity={0.9}
          onPress={() => {
            setIsMobileCartReady(false);
            setIsMobileCartVisible(true);
          }}
        >
          <View
            style={
              styles.mobileCartBarLeft
            }
          >
            <Text
              style={
                styles.mobileCartIcon
              }
            >
              🛒
            </Text>

            <View>
              <Text
                style={
                  styles.mobileCartTitle
                }
              >
                Ver orden
              </Text>

              <Text
                style={
                  styles.mobileCartSubtitle
                }
              >
                {
                  mobileCartSummary.totalItems
                }{' '}
                {mobileCartSummary.totalItems ===
                  1
                  ? 'producto'
                  : 'productos'}
              </Text>
            </View>
          </View>

          <View
            style={
              styles.mobileCartBarRight
            }
          >
            <Text
              style={
                styles.mobileCartTotal
              }
            >
              $
              {mobileCartSummary.totalAmount.toFixed(
                2,
              )}
            </Text>

            <Text
              style={
                styles.mobileCartArrow
              }
            >
              ↑
            </Text>
          </View>
        </TouchableOpacity>
      ) : null}

      <Modal
        visible={
          isPhone &&
          isMobileCartVisible
        }
        animationType="slide"
        presentationStyle="fullScreen"
        onShow={() => {
          setIsMobileCartReady(true);
        }}
        onRequestClose={() => {
          setIsMobileCartReady(false);
          setIsMobileCartVisible(false);
        }}
      >
        <View
          style={
            styles.mobileCartModal
          }
        >
          <View
            style={
              styles.mobileCartModalHeader
            }
          >
            <View>
              <Text
                style={
                  styles.mobileCartModalTitle
                }
              >
                Orden actual
              </Text>

              <Text
                style={
                  styles.mobileCartModalSubtitle
                }
              >
                {
                  mobileCartSummary.totalItems
                }{' '}
                {mobileCartSummary.totalItems ===
                  1
                  ? 'producto'
                  : 'productos'}
              </Text>
            </View>

            <TouchableOpacity
              style={
                styles.mobileCartCloseButton
              }
              onPress={() => {
                setIsMobileCartReady(false);
                setIsMobileCartVisible(false);
              }}
            >
              <Text
                style={
                  styles.mobileCartCloseText
                }
              >
                ✕
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.mobileCartContent}>
            {isMobileCartReady ? (
              <CartComponent
                cart={cart}
                isMobile
                onUpdateQuantity={
                  handleUpdateQuantity
                }
                onRemoveItem={
                  handleRemoveCartItem
                }
                onClearCart={() => {
                  handleClearCart();

                  setIsMobileCartReady(
                    false,
                  );

                  setIsMobileCartVisible(
                    false,
                  );
                }}
                onCheckout={async (
                  totalAmount,
                ) => {
                  await handleCheckout(
                    totalAmount,
                  );

                  setIsMobileCartReady(
                    false,
                  );

                  setIsMobileCartVisible(
                    false,
                  );
                }}
                onToggleDelivery={
                  handleToggleDelivery
                }
                onEditDelivery={
                  handleEditDelivery
                }
              />
            ) : null}
          </View>
        </View>
      </Modal>

      <ProductConfiguratorModal
        visible={
          isModifierModalVisible
        }
        product={
          selectedProduct
        }
        products={
          products
        }
        categories={
          categories
        }
        notes={
          productNotes
        }
        mode={
          modifierMode
        }
        isKongBurger={
          selectedProductIsKongBurger
        }
        meats={
          meats
        }
        sauces={
          sauces
        }
        isLoading={
          areModifiersLoading
        }
        error={
          modifiersError
        }
        onNotesChange={
          setProductNotes
        }
        onClose={
          handleCloseModifierModal
        }
        onConfirm={
          handleConfirmAddToCart
        }
      />

      <DeliveryConfiguratorModal
        visible={
          isDeliveryModalVisible
        }
        product={
          selectedDeliveryProduct
        }
        initialValue={
          currentDeliveryDetails
        }
        onClose={
          handleCloseDeliveryModal
        }
        onConfirm={
          handleConfirmDelivery
        }
      />
    </View>
  );
}

function cloneComboComponents(
  components:
    | ComboComponentSelection[]
    | undefined,
): ComboComponentSelection[] {
  return (
    components ?? []
  ).map(
    (component) => ({
      ...component,

      product: {
        ...component.product,
      },

      selectedModifiers: (
        component
          .selectedModifiers ??
        []
      ).map(
        (modifier) => ({
          ...modifier,
        }),
      ),
    }),
  );
}

function createModifierIdentifier(
  modifiers:
    ProductConfigurationResult[
    'selectedModifiers'
    ],
): string {
  return (
    modifiers ?? []
  )
    .map(
      (modifier) =>
        modifier.id,
    )
    .sort()
    .join(',');
}

function createComboIdentifier(
  components:
    | ComboComponentSelection[]
    | undefined,
): string {
  return (
    components ?? []
  )
    .map(
      (component) => {
        const modifierIds = (
          component
            .selectedModifiers ??
          []
        )
          .map(
            (modifier) =>
              modifier.id,
          )
          .sort()
          .join(',');

        return [
          component.slotId,
          component.type,
          component.product.id,
          component.quantity,
          component.notes.trim(),
          modifierIds,
        ].join(':');
      },
    )
    .sort()
    .join('|');
}

function normalizeText(
  value:
    | string
    | null
    | undefined,
): string {
  return (
    value ?? ''
  )
    .normalize('NFD')
    .replace(
      /[\u0300-\u036f]/g,
      '',
    )
    .trim()
    .toLocaleLowerCase(
      'es',
    );
}

function createOrderFingerprint(
  cart: Cart,
  totalAmount: number,
): string {
  return JSON.stringify({
    total:
      Number(
        totalAmount,
      ).toFixed(2),

    items:
      cart.map(
        (item) => ({
          id:
            item.id,

          productId:
            item.product.id,

          quantity:
            item.quantity,

          notes:
            item.notes.trim(),

          modifiers: (
            item.selectedModifiers ??
            []
          )
            .map(
              (modifier) =>
                modifier.id,
            )
            .sort(),

          components: (
            item.comboComponents ??
            []
          ).map(
            (component) => ({
              slotId:
                component.slotId,

              productId:
                component.product.id,

              quantity:
                component.quantity,

              notes:
                component.notes.trim(),

              modifiers: (
                component
                  .selectedModifiers ??
                []
              )
                .map(
                  (modifier) =>
                    modifier.id,
                )
                .sort(),
            }),
          ),

          delivery:
            item.deliveryDetails ??
            null,
        }),
      ),
  });
}

function createRequestId(): string {
  const cryptoObject =
    globalThis.crypto;

  if (
    cryptoObject &&
    typeof cryptoObject.randomUUID ===
    'function'
  ) {
    return cryptoObject.randomUUID();
  }

  /*
   * Fallback UUID v4 para
   * ambientes donde randomUUID
   * no esté disponible.
   *
   * Esta clave se usa únicamente
   * para idempotencia, no para
   * seguridad criptográfica.
   */
  return (
    'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'
  ).replace(
    /[xy]/g,
    (character) => {
      const random =
        Math.floor(
          Math.random() * 16,
        );

      const value =
        character === 'x'
          ? random
          : (
            random & 0x3
          ) | 0x8;

      return value.toString(
        16,
      );
    },
  );
}