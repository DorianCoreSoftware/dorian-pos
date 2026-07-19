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
import { ModifierModal } from '../../components/modifier-modal/ModifierModal';

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
  Category,
  Product,
  SelectedModifier,
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
      selectedProductCategory,
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
    selectedModifiers: SelectedModifier[],
  ): void => {
    if (!selectedProduct) {
      return;
    }

    const productToAdd = selectedProduct;
    const cleanNotes =
      productNotes.trim();

    const modifierIdentifier =
      selectedModifiers
        .map(
          (modifier) => modifier.id,
        )
        .sort()
        .join(',');

    const cartItemId = [
      productToAdd.id,
      cleanNotes,
      modifierIdentifier,
    ].join('-');

    setCart((currentCart) => {
      const existingItemIndex =
        currentCart.findIndex(
          (item) =>
            item.id === cartItemId,
        );

      if (existingItemIndex === -1) {
        return [
          ...currentCart,
          {
            id: cartItemId,
            product: productToAdd,
            quantity: 1,
            notes: cleanNotes,
            selectedModifiers: [
              ...selectedModifiers,
            ],
          },
        ];
      }

      return currentCart.map(
        (item, index) =>
          index === existingItemIndex
            ? {
              ...item,
              quantity:
                item.quantity + 1,
            }
            : item,
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
        .map((item) =>
          item.id === itemId
            ? {
              ...item,
              quantity:
                item.quantity +
                quantityChange,
            }
            : item,
        )
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

      <ModifierModal
        visible={
          isModifierModalVisible
        }
        product={selectedProduct}
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