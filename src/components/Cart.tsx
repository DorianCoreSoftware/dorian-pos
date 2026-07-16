import React from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { CartItem } from '../types/cart-item';

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

const styles = StyleSheet.create({
  cartSection: {
    flex: 0.3,
    backgroundColor: '#181818',
    justifyContent: 'space-between',
  },
  cartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#222',
  },
  cartHeaderTitle: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  clearCartText: {
    color: '#FF5252',
    fontSize: 14,
    fontWeight: '600',
  },
  cartScroll: {
    flex: 1,
    padding: 12,
  },
  cartItemCard: {
    backgroundColor: '#222',
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#2D2D2D',
  },
  cartItemMain: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cartItemName: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  cartItemNotes: {
    color: '#A0A0A0',
    fontSize: 12,
    marginTop: 2,
    fontStyle: 'italic',
  },
  cartItemPrice: {
    color: '#FFBF00',
    fontSize: 14,
    fontWeight: '600',
    marginTop: 4,
  },
  qtyContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E1E1E',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#333',
    padding: 2,
  },
  qtyBtn: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qtyBtnText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  qtyVal: {
    color: '#FFF',
    paddingHorizontal: 8,
    fontWeight: 'bold',
    fontSize: 14,
  },
  emptyCartContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyCartIcon: {
    fontSize: 40,
    marginBottom: 10,
  },
  emptyCartText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  emptyCartSubtext: {
    color: '#666',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 6,
  },
  cartFooter: {
    padding: 20,
    backgroundColor: '#1C1C1C',
    borderTopWidth: 1,
    borderTopColor: '#282828',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  totalLabel: {
    color: '#888',
    fontSize: 16,
  },
  totalVal: {
    color: '#FFBF00',
    fontSize: 24,
    fontWeight: 'bold',
  },
  checkoutBtn: {
    backgroundColor: '#FFBF00',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  checkoutBtnDisabled: {
    backgroundColor: '#333',
  },
  checkoutBtnText: {
    color: '#000',
    fontWeight: 'bold',
    fontSize: 16,
  },
  deleteItemBtn: {
    backgroundColor: '#2C1414',
    width: 34,
    height: 34,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#522222',
  },
  deleteItemIcon: {
    fontSize: 14,
  },
});