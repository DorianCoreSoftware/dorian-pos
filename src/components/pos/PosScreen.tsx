import React, { useState } from 'react';
import { View, Alert } from 'react-native';
import { CategoryTabs } from '../../components/category-tabs/CategoryTabs';
import { MenuList } from '../../components/menu-list/MenuList';
import { Cart } from '../../components/cart/Cart';
import { ModifierModal } from '../../components/modifier-modal/ModifierModal';
import { createKitchenOrder } from '../../services/orders';
import { supabase } from '../../services/supabase';
import { Product, Category } from '../../types';
import { CartItem } from '../../types/cart-item';
import { styles } from '../../../App.styles';


interface POSProps {
  categorias: Category[];
  productos: Product[];
  fetchProducts: () => Promise<void>;
  cart: CartItem[];
  setCart: React.Dispatch<React.SetStateAction<CartItem[]>>;
  editingOrderId: string | null;
  setEditingOrderId: (id: string | null) => void;
  fetchKitchenOrders: () => Promise<void>;
}

export function POSScreen({
  categorias,
  productos,
  fetchProducts,
  cart,
  setCart,
  editingOrderId,
  setEditingOrderId,
  fetchKitchenOrders
}: POSProps) {
  const [categoriaSeleccionada, setCategoriaSeleccionada] = useState(categorias[0]?.id || '');
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [productNotes, setProductNotes] = useState('');

  const handleProductPress = (product: Product) => {
    setSelectedProduct(product);
    setProductNotes('');
    setModalVisible(true);
  };

  const handleConfirmAddToCart = () => {
    if (!selectedProduct) return;
    setCart((currentCart) => {
      const notasLimpias = productNotes.trim();
      const uniqueItemId = `${selectedProduct.id}-${notasLimpias}`;
      const existingItemIndex = currentCart.findIndex(item => item.id === uniqueItemId);

      if (existingItemIndex > -1) {
        const newCart = [...currentCart];
        newCart[existingItemIndex].quantity += 1;
        return newCart;
      }
      return [...currentCart, { id: uniqueItemId, product: selectedProduct, quantity: 1, notes: notasLimpias }];
    });
    setModalVisible(false);
  };

  const updateQuantity = (itemId: string, change: number) => {
    setCart(current => current.map(item => item.id === itemId ? { ...item, quantity: item.quantity + change } : item).filter(item => item.quantity > 0));
  };

  const handleCheckout = async (totalAmount: number) => {
    if (cart.length === 0) return;
    try {
      if (editingOrderId) {
        // Lógica de actualización de orden existente
        await supabase.from('order_items').delete().eq('order_id', editingOrderId);
        await supabase.from('orders').update({ total: totalAmount }).eq('id', editingOrderId);
        
        const payload = cart.map(item => ({
          order_id: editingOrderId,
          product_id: item.product.id,
          quantity: item.quantity,
          price_at_purchase: item.product.price,
          notes: item.notes || null
        }));
        await supabase.from('order_items').insert(payload);
        await fetchKitchenOrders();
        Alert.alert("🍳 ¡Pedido Actualizado!");
      } else {
        // Crear orden nueva
        const result = await createKitchenOrder(cart, totalAmount);
        if (result.success) Alert.alert("🍳 ¡Pedido enviado!");
      }
      setCart([]);
      setEditingOrderId(null);
    } catch (e) {
      Alert.alert("⚠️ Error al procesar");
    }
  };

  const productosFiltrados = productos.filter(p => String(p.category_id) === String(categoriaSeleccionada));

  return (
    <View style={styles.contentRow}>
      <View style={styles.menuSection}>
        <CategoryTabs
          categorias={categorias}
          categoriaSeleccionada={categoriaSeleccionada}
          onSelectCategoria={setCategoriaSeleccionada}
        />
        <MenuList
          productos={productosFiltrados}
          onProductPress={handleProductPress}
          onRefreshMenu={fetchProducts}
        />
      </View>

      <Cart
        cart={cart}
        onUpdateQuantity={updateQuantity}
        onRemoveItem={(id) => setCart(c => c.filter(i => i.id !== id))}
        onClearCart={() => { setCart([]); setEditingOrderId(null); }}
        onCheckout={handleCheckout}
      />

      <ModifierModal
        visible={modalVisible}
        product={selectedProduct}
        notes={productNotes}
        onNotesChange={setProductNotes}
        onClose={() => setModalVisible(false)}
        onConfirm={handleConfirmAddToCart}
      />
    </View>
  );
}