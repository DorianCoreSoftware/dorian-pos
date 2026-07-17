import React from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { CartItem } from '../../types/cart-item';
import { styles } from './Cart.styles';

interface CartProps {
  cart: CartItem[];
  onUpdateQuantity: (itemId: string, change: number) => void;
  onRemoveItem: (itemId: string) => void;
  onClearCart: () => void;
  onCheckout: (totalAmount: number) => void;
}

export const Cart: React.FC<CartProps> = ({
  cart,
  onUpdateQuantity,
  onRemoveItem,
  onClearCart,
  onCheckout,
}) => {
  const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
  const totalAmount = cart.reduce((sum, item) => sum + (item.product.price * item.quantity), 0);

  return (
    <View style={styles.cartSection}>
      <View style={styles.cartHeader}>
        <Text style={styles.cartHeaderTitle}>Orden Actual ({totalItems})</Text>
        {cart.length > 0 && (
          <TouchableOpacity onPress={onClearCart}>
            <Text style={styles.clearCartText}>Vaciar</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* ITEMS EN EL TICKET */}
      {cart.length === 0 ? (
        <View style={styles.emptyCartContainer}>
          <Text style={styles.emptyCartIcon}>🛒</Text>
          <Text style={styles.emptyCartText}>El carrito está vacío</Text>
          <Text style={styles.emptyCartSubtext}>
            Selecciona un producto del menú de la izquierda para comenzar
          </Text>
        </View>
      ) : (
        <ScrollView style={styles.cartScroll}>
          {cart.map((item) => (
            <View key={item.id} style={styles.cartItemCard}>
              <View style={styles.cartItemMain}>
                <View style={{ flex: 1, paddingRight: 8 }}>
                  <Text style={styles.cartItemName}>{item.product.name}</Text>
                  {item.notes ? (
                    <Text style={styles.cartItemNotes}>📝 {item.notes}</Text>
                  ) : null}
                  <Text style={styles.cartItemPrice}>
                    ${(item.product.price * item.quantity).toFixed(2)}
                  </Text>
                </View>

                {/* CONTROLES DE CANTIDAD Y ELIMINAR */}
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <View style={styles.qtyContainer}>
                    <TouchableOpacity style={styles.qtyBtn} onPress={() => onUpdateQuantity(item.id, -1)}>
                      <Text style={styles.qtyBtnText}>-</Text>
                    </TouchableOpacity>
                    <Text style={styles.qtyVal}>{item.quantity}</Text>
                    <TouchableOpacity style={styles.qtyBtn} onPress={() => onUpdateQuantity(item.id, 1)}>
                      <Text style={styles.qtyBtnText}>+</Text>
                    </TouchableOpacity>
                  </View>

                  {/* BOTÓN ELIMINAR LÍNEA INDIVIDUAL */}
                  <TouchableOpacity
                    style={styles.deleteItemBtn}
                    onPress={() => onRemoveItem(item.id)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.deleteItemIcon}>🗑️</Text>
                  </TouchableOpacity>
                </View>

              </View>
            </View>
          ))}
        </ScrollView>
      )}

      {/* PIE DEL TICKET */}
      <View style={styles.cartFooter}>
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Total:</Text>
          <Text style={styles.totalVal}>${totalAmount.toFixed(2)}</Text>
        </View>
        <TouchableOpacity
          style={[styles.checkoutBtn, cart.length === 0 && styles.checkoutBtnDisabled]}
          disabled={cart.length === 0}
          onPress={() => onCheckout(totalAmount)}
        >
          <Text style={styles.checkoutBtnText}>ENVIAR A COCINA 🍳</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};