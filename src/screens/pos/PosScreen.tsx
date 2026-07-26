import React, {
  useEffect,
  useMemo,
  useState,
} from 'react';

import {
  Alert,
  View,
} from 'react-native';

import { CategoryTabs } from '../../components/category-tabs/CategoryTabs';
import { MenuList } from '../../components/menu-list/MenuList';
import { Cart as CartComponent } from '../../components/cart/Cart';

import {
  ProductConfiguratorModal,
  ProductConfigurationResult,
} from '../../components/ProductConfigurator/ProductConfiguratorModal';

import { useModifiers } from '../../hooks/useModifiers';

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
  Product,
} from '../../types';

import { styles } from '../../../App.styles';

interface POSScreenProps {
  categories: Category[];
  products: Product[];
  fetchProducts: () => Promise<void>;

  cart: Cart;

  setCart: React.Dispatch<
    React.SetStateAction<Cart>
  >;

  editingOrderId: string | null;

  setEditingOrderId: React.Dispatch<
    React.SetStateAction<string | null>
  >;

  fetchKitchenOrders: () => Promise<void>;
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
}: POSScreenProps) {
  const [
    selectedCategoryId,
    setSelectedCategoryId,
  ] = useState<string>(
    categories[0]?.id ?? '',
  );

  const [
    isModifierModalVisible,
    setIsModifierModalVisible,
  ] = useState(false);

  const [
    selectedProduct,
    setSelectedProduct,
  ] = useState<Product | null>(null);

  const [
    productNotes,
    setProductNotes,
  ] = useState('');

  const [
    isProcessingOrder,
    setIsProcessingOrder,
  ] = useState(false);

  const {
    meats,
    sauces,
    isLoading: areModifiersLoading,
    error: modifiersError,
  } = useModifiers();

  useEffect(() => {
    if (categories.length === 0) {
      setSelectedCategoryId('');
      return;
    }

    const categoryStillExists =
      categories.some(
        (category) =>
          String(category.id) ===
          String(selectedCategoryId),
      );

    if (!categoryStillExists) {
      setSelectedCategoryId(
        categories[0].id,
      );
    }
  }, [
    categories,
    selectedCategoryId,
  ]);

  const filteredProducts = useMemo(
    () =>
      products.filter(
        (product) =>
          String(product.category_id) ===
          String(selectedCategoryId),
      ),
    [
      products,
      selectedCategoryId,
    ],
  );

  const selectedProductCategory =
    useMemo(
      () =>
        categories.find(
          (category) =>
            String(category.id) ===
            String(
              selectedProduct?.category_id,
            ),
        ) ?? null,
      [
        categories,
        selectedProduct?.category_id,
      ],
    );

  const modifierMode = useMemo(
    () =>
      getProductModifierMode(
        selectedProduct,
        selectedProductCategory?.name,
      ),
    [
      selectedProduct,
      selectedProductCategory?.name,
    ],
  );

  const selectedProductIsKongBurger =
    useMemo(
      () =>
        isKongBurger(selectedProduct),
      [selectedProduct],
    );

  const handleProductPress = (
    product: Product,
  ): void => {
    const category = categories.find(
      (item) =>
        String(item.id) ===
        String(product.category_id),
    );

    console.log(
      'Producto seleccionado:',
      {
        id: product.id,
        name: product.name,
        categoryName: category?.name,
        categoryId:
          product.category_id,
      },
    );

    setSelectedProduct(product);
    setProductNotes('');
    setIsModifierModalVisible(true);
  };

  const handleCloseModifierModal =
    (): void => {
      setIsModifierModalVisible(false);
      setSelectedProduct(null);
      setProductNotes('');
    };

  const handleConfirmAddToCart = (
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

    /*
     * Copia independiente de la configuración.
     *
     * Evita conservar referencias internas del modal que
     * puedan modificarse o limpiarse cuando el modal cierre.
     */
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

    const itemToAdd: CartItem = {
      id: cartItemId,
      product: {
        ...productToAdd,
      },
      quantity: 1,
      notes: cleanNotes,

      selectedModifiers:
        selectedModifiers.map(
          (modifier) => ({
            ...modifier,
          }),
        ),

      comboComponents:
        normalizedComponents.length > 0
          ? normalizedComponents
          : undefined,
    };

    console.log(
      '🧩 Item preparado para agregar:',
      JSON.stringify(
        {
          id: itemToAdd.id,
          product:
            itemToAdd.product.name,
          quantity:
            itemToAdd.quantity,
          comboComponents:
            itemToAdd.comboComponents,
        },
        null,
        2,
      ),
    );

    setCart((currentCart) => {
      const existingItemIndex =
        currentCart.findIndex(
          (item) =>
            item.id === cartItemId,
        );

      if (existingItemIndex === -1) {
        return [
          ...currentCart,
          itemToAdd,
        ];
      }

      return currentCart.map(
        (item, index) => {
          if (
            index !== existingItemIndex
          ) {
            return item;
          }

          /*
           * Mantiene la configuración que ya tenía el
           * elemento agrupado.
           *
           * Si por alguna razón estaba vacía, recupera
           * la configuración del nuevo elemento.
           */
          const preservedComponents =
            item.comboComponents &&
            item.comboComponents.length > 0
              ? cloneComboComponents(
                  item.comboComponents,
                )
              : cloneComboComponents(
                  itemToAdd
                    .comboComponents ?? [],
                );

          return {
            ...item,

            quantity:
              item.quantity +
              itemToAdd.quantity,

            selectedModifiers:
              item.selectedModifiers
                .length > 0
                ? item.selectedModifiers.map(
                    (modifier) => ({
                      ...modifier,
                    }),
                  )
                : itemToAdd
                    .selectedModifiers
                    .map(
                      (modifier) => ({
                        ...modifier,
                      }),
                    ),

            comboComponents:
              preservedComponents.length >
              0
                ? preservedComponents
                : undefined,
          };
        },
      );
    });

    handleCloseModifierModal();
  };

  const handleUpdateQuantity = (
    itemId: string,
    quantityChange: number,
  ): void => {
    setCart((currentCart) =>
      currentCart
        .map((item) => {
          if (item.id !== itemId) {
            return item;
          }

          /*
           * El spread mantiene comboComponents,
           * selectedModifiers, notas y producto.
           */
          return {
            ...item,
            quantity:
              item.quantity +
              quantityChange,
          };
        })
        .filter(
          (item) => item.quantity > 0,
        ),
    );
  };

  const handleRemoveCartItem = (
    itemId: string,
  ): void => {
    setCart((currentCart) =>
      currentCart.filter(
        (item) => item.id !== itemId,
      ),
    );
  };

  const handleClearCart = (): void => {
    setCart([]);
    setEditingOrderId(null);
  };

  const handleCheckout = async (
    totalAmount: number,
  ): Promise<void> => {
    if (
      cart.length === 0 ||
      isProcessingOrder
    ) {
      return;
    }

    console.log(
      '🛒 Carrito antes de guardar:',
      JSON.stringify(
        cart.map((item) => ({
          id: item.id,
          product:
            item.product.name,
          quantity:
            item.quantity,
          comboComponents:
            item.comboComponents,
        })),
        null,
        2,
      ),
    );

    try {
      setIsProcessingOrder(true);

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
        const result =
          await createKitchenOrder(
            cart,
            totalAmount,
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
      setIsProcessingOrder(false);
    }
  };

  return (
    <View style={styles.contentRow}>
      <View style={styles.menuSection}>
        <CategoryTabs
          categorias={categories}
          categoriaSeleccionada={
            selectedCategoryId
          }
          onSelectCategoria={
            setSelectedCategoryId
          }
        />

        <MenuList
          products={filteredProducts}
          onProductPress={
            handleProductPress
          }
          onRefreshMenu={
            fetchProducts
          }
        />
      </View>

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
      />

      <ProductConfiguratorModal
        visible={
          isModifierModalVisible
        }
        product={selectedProduct}
        products={products}
        categories={categories}
        notes={productNotes}
        mode={modifierMode}
        isKongBurger={
          selectedProductIsKongBurger
        }
        meats={meats}
        sauces={sauces}
        isLoading={
          areModifiersLoading
        }
        error={modifiersError}
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
    </View>
  );
}

/**
 * Crea una copia independiente de los componentes
 * seleccionados para un combo.
 *
 * Esto evita que el estado del modal y el carrito
 * compartan las mismas referencias.
 */
function cloneComboComponents(
  components:
    | ComboComponentSelection[]
    | undefined,
): ComboComponentSelection[] {
  return (components ?? []).map(
    (component) => ({
      ...component,

      product: {
        ...component.product,
      },

      selectedModifiers: (
        component.selectedModifiers ??
        []
      ).map((modifier) => ({
        ...modifier,
      })),
    }),
  );
}

/**
 * Genera una firma estable para los modificadores
 * directos de un producto.
 */
function createModifierIdentifier(
  modifiers:
    ProductConfigurationResult[
      'selectedModifiers'
    ],
): string {
  return (modifiers ?? [])
    .map((modifier) => modifier.id)
    .sort()
    .join(',');
}

/**
 * Genera una firma estable para toda la selección
 * del combo.
 *
 * Dos combos solamente se agrupan cuando contienen
 * exactamente los mismos productos, modificadores,
 * notas, cantidades y tipos.
 */
function createComboIdentifier(
  components:
    | ComboComponentSelection[]
    | undefined,
): string {
  return (components ?? [])
    .map((component) => {
      const modifierIds = (
        component.selectedModifiers ??
        []
      )
        .map(
          (modifier) => modifier.id,
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
    })
    .sort()
    .join('|');
}