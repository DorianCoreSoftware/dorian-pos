import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ActivityIndicator,
  Alert,
  Image,
  TouchableOpacity,
  FlatList
} from 'react-native';

// Servicios y Tipos
import { getCategories, getActiveProducts } from './src/services/products';
import { Product, Category } from './src/types';
import { createKitchenOrder, getPendingOrders } from './src/services/orders';
import { supabase } from './src/services/supabase'; // Cliente para Realtime
import { CartItem } from './src/types/cart-item';

// Componentes Modulares
import { CategoryTabs } from './src/components/category-tabs/CategoryTabs';
import { MenuList } from './src/components/menu-list/MenuList';
import { Cart } from './src/components/cart/Cart';
import { ModifierModal } from './src/components/modifier-modal/ModifierModal';

// --- NUEVAS IMPORTACIONES DE AUTENTICACIÓN ---
import { AuthProvider, useAuth } from './src/context/AuthContext';
import { LoginScreen } from './src/components/login/LoginScreen';


function MainApp() {
  const { user, logout } = useAuth(); // Recuperamos sesión actual y rol ('admin' o 'seller')
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Control de Pantalla Activa: 'pos' o 'kitchen'
  const [activeTab, setActiveTab] = useState<'pos' | 'kitchen'>('pos');

  // Estados de datos de la base de datos
  const [categorias, setCategorias] = useState<Category[]>([]);
  const [productos, setProductos] = useState<Product[]>([]);
  const [categoriaSeleccionada, setCategoriaSeleccionada] = useState<string>('');

  // Estado de Órdenes Pendientes (Cocina)
  const [pendingOrders, setPendingOrders] = useState<any[]>([]);

  // Estado del Carrito de Ventas
  const [cart, setCart] = useState<CartItem[]>([]);

  // Estados para el Modal de Modificadores
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [productNotes, setProductNotes] = useState('');

  // 1. Carga inicial de datos desde Supabase
  useEffect(() => {
    async function loadMenuFromCloud() {
      try {
        setIsLoading(true);

        const [catsResult, prodsResult] = await Promise.all([
          getCategories(),
          getActiveProducts()
        ]);

        setCategorias(catsResult);
        setProductos(prodsResult);

        if (catsResult.length > 0) {
          setCategoriaSeleccionada(catsResult[0].id);
        }

        // Cargamos comandas iniciales
        await fetchKitchenOrders();

        setIsLoading(false);
      } catch (error: any) {
        console.error("Error al conectar con Supabase:", error);
        setErrorMsg(error?.message || "Error al conectar con el servidor en la nube");
        setIsLoading(false);
      }
    }

    // Solo cargamos el menú si tenemos sesión de usuario válida
    if (user) {
      loadMenuFromCloud();
    }
  }, [user]);

  // 2. Suscripción en Tiempo Real para Cocina (Realtime)
  useEffect(() => {
    if (!user) return;

    // Escucha cualquier inserción o cambio en la tabla 'orders'
    const channel = supabase
      .channel('orders-live-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => {
        // Cuando cambie algo en la BD, actualizamos automáticamente la lista
        fetchKitchenOrders();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  // Función para jalar las órdenes pendientes de la BD
  const fetchKitchenOrders = async () => {
    try {
      const ordersData = await getPendingOrders();
      setPendingOrders(ordersData || []);
    } catch (error) {
      console.error("Error actualizando comandas:", error);
    }
  };

  // Función para marcar como completada/entregada
  const handleDeliverOrder = async (orderId: string) => {
    try {
      const { data, error } = await supabase
        .from('orders')
        .update({ status: 'entregado' }) 
        .eq('id', orderId)
        .select(); 

      if (error) throw error;

      if (!data || data.length === 0) {
        console.warn("⚠️ Advertencia: Supabase respondió OK, pero NINGUNA fila fue actualizada. Revisa el RLS o el ID.");
      } else {
        console.log(`✅ Orden ${orderId} actualizada con éxito en la nube:`, data);
      }

    } catch (error) {
      console.error('Error al entregar la orden:', error);
      Alert.alert('Error', 'No se pudo marcar la orden como entregada.');
    }
  };

  // --- LÓGICA DEL CARRITO ---

  const handleProductPress = (product: Product) => {
    setSelectedProduct(product);
    setProductNotes('');
    setModalVisible(true);
  };

  const fetchProducts = async () => {
  const { data, error } = await supabase.from('products').select('*');
  if (data) setProductos(data); // o el estado que use tu App.tsx
};

useEffect(() => {
  fetchProducts();
}, []);

  const handleConfirmAddToCart = () => {
    if (!selectedProduct) return;

    setCart((currentCart) => {
      const uniqueItemId = `${selectedProduct.id}-${productNotes.trim()}`;
      const existingItemIndex = currentCart.findIndex(item => item.id === uniqueItemId);

      if (existingItemIndex > -1) {
        const newCart = [...currentCart];
        newCart[existingItemIndex].quantity += 1;
        return newCart;
      }

      return [
        ...currentCart,
        {
          id: uniqueItemId,
          product: selectedProduct,
          quantity: 1,
          notes: productNotes.trim(),
        }
      ];
    });

    setModalVisible(false);
    setSelectedProduct(null);
  };

  const updateQuantity = (itemId: string, change: number) => {
    setCart((currentCart) => {
      return currentCart.map(item => {
        if (item.id === itemId) {
          const newQty = item.quantity + change;
          return newQty > 0 ? { ...item, quantity: newQty } : item;
        }
        return item;
      }).filter(item => item.quantity > 0);
    });
  };

  const removeLineItem = (itemId: string) => {
    setCart(currentCart => currentCart.filter(item => item.id !== itemId));
  };

  const clearCart = () => setCart([]);

  const handleCheckout = async (totalAmount: number) => {
    if (cart.length === 0) return;

    try {
      setIsLoading(true);
      const result = await createKitchenOrder(cart, totalAmount);

      if (result.success) {
        Alert.alert(
          "🍳 ¡Pedido enviado!",
          `La orden #${result.orderId.slice(-6).toUpperCase()} ya está en la fila de cocina.`
        );
        clearCart();
      }
    } catch (error: any) {
      Alert.alert(
        "⚠️ Error en cocina",
        `No se pudo enviar la orden: ${error.message}`
      );
    } finally {
      setIsLoading(false);
    }
  };

  // Pantallas de Estado de Carga / Errores
  if (isLoading) {
    return (
      <View style={styles.containerLoading}>
        <ActivityIndicator size="large" color="#FFBF00" />
        <Text style={styles.loadingText}>Conectando a Burger Kong Cloud...</Text>
      </View>
    );
  }

  if (errorMsg) {
    return (
      <View style={[styles.containerLoading, { backgroundColor: '#2C1414' }]}>
        <Text style={{ color: '#FF5252', fontSize: 24, fontWeight: 'bold' }}>⚠️ Error de Conexión Nube</Text>
        <Text style={{ color: '#FFF', marginTop: 8, textAlign: 'center', paddingHorizontal: 20 }}>{errorMsg}</Text>
        <Text style={{ color: '#AAA', marginTop: 12, fontSize: 13 }}>Revisa tus credenciales .env o conexión a internet</Text>
      </View>
    );
  }

  // Filtrar los productos según la pestaña seleccionada
  const productosFiltrados = productos.filter(p => String(p.category_id) === String(categoriaSeleccionada));

  return (
    <View style={styles.mainContainer}>
      
      {/* HEADER GLOBAL SUPERIOR */}
      <View style={styles.header}>
        <View style={styles.headerBrandContainer}>
          <Image
            source={require('./assets/OnlyBurgerKong.png')}
            style={styles.headerLogo}
            resizeMode="contain"
          />
          <Image
            source={require('./assets/logo.png')}
            style={styles.headerLogoLetters}
            resizeMode="contain"
          />
        </View>

        {/* SELECTOR DE PANTALLAS (Pestañas POS / Cocina) */}
        <View style={styles.tabContainer}>
          <TouchableOpacity 
            style={[styles.tabButton, activeTab === 'pos' && styles.tabActiveButton]} 
            onPress={() => setActiveTab('pos')}
          >
            <Text style={[styles.tabText, activeTab === 'pos' && styles.tabActiveText]}>🛒 CAJA / POS</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.tabButton, activeTab === 'kitchen' && styles.tabActiveButton]} 
            onPress={() => setActiveTab('kitchen')}
          >
            <Text style={[styles.tabText, activeTab === 'kitchen' && styles.tabActiveText]}>
              🍳 COCINA ({pendingOrders.length})
            </Text>
          </TouchableOpacity>
        </View>

        {/* Muestra Info del usuario y Botón de Salida */}
        <View style={styles.userContainer}>
          <Text style={styles.userName}>{user?.fullName} ({user?.role === 'admin' ? 'Admin' : 'Caja'})</Text>
          <TouchableOpacity onPress={logout} style={styles.logoutButton}>
            <Text style={styles.logoutText}>Salir</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* --- RENDERIZADO CONDICIONAL DE PANTALLAS --- */}

      {activeTab === 'pos' ? (
        /* VISTA DE CAJA / PUNTO DE VENTA */
        <View style={styles.contentRow}>
          {/* SECCIÓN IZQUIERDA: MENÚ DE PRODUCTOS */}
          <View style={styles.menuSection}>
            <CategoryTabs
              categorias={categorias}
              categoriaSeleccionada={categoriaSeleccionada}
              onSelectCategoria={setCategoriaSeleccionada}
            />
            <MenuList
        productos={productosFiltrados}
        onProductPress={handleProductPress}
        onRefreshMenu={fetchProducts} // <--- ¡AQUÍ! Reemplaza 'fetchProducts' por el nombre de tu función que recarga los productos en App.tsx
      />
          </View>

          {/* SECCIÓN DERECHA: TICKET / CARRITO FIJO */}
          <Cart
            cart={cart}
            onUpdateQuantity={updateQuantity}
            onRemoveItem={removeLineItem}
            onClearCart={clearCart}
            onCheckout={handleCheckout}
          />
        </View>
      ) : (
        /* VISTA DE MONITOR DE COCINA (KDS) */
        <View style={styles.kitchenContainer}>
          {pendingOrders.length === 0 ? (
            <View style={styles.emptyKitchen}>
              <Text style={styles.emptyKitchenText}>🎉 ¡No hay órdenes pendientes! Todo despachado.</Text>
            </View>
          ) : (
            <FlatList
              data={pendingOrders}
              keyExtractor={(item) => item.id}
              horizontal 
              contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 20 }}
              renderItem={({ item }) => (
                <View style={styles.orderCard}>
                  <View>
                    <View style={styles.cardHeader}>
                      <Text style={styles.orderId}>Ticket #{item.id.slice(-4).toUpperCase()}</Text>
                      <Text style={styles.orderTotal}>${item.total}</Text>
                    </View>
                    
                    <Text style={styles.timeText}>
                      Ingresó: {new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </Text>
                    
                    {/* Contenedor de Platillos e instrucciones */}
                    <View style={styles.itemsContainer}>
                      {item.order_items?.map((line: any) => (
                        <View key={line.id} style={styles.itemRow}>
                          <Text style={styles.itemText}>
                            {line.quantity}x {line.products?.name || 'Producto'}
                          </Text>
                          {line.notes ? (
                            <Text style={styles.notesText}>⚠️ {line.notes}</Text>
                          ) : null}
                        </View>
                      ))}
                    </View>
                  </View>

                  {/* Botón para despachar */}
                  <TouchableOpacity 
                    style={styles.deliverButton} 
                    onPress={() => handleDeliverOrder(item.id)} 
                  >
                    <Text style={styles.deliverButtonText}>Entregar Comanda</Text>
                  </TouchableOpacity>
                </View>
              )}
            />
          )}
        </View>
      )}

      {/* MODAL PARA CONFIGURAR NOTAS */}
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

// --- GATEWAY DE NAVEGACIÓN PRINCIPAL ---
const NavigationGateway = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <View style={styles.containerLoading}>
        <ActivityIndicator size="large" color="#FFBF00" />
        <Text style={styles.loadingText}>Verificando Credenciales...</Text>
      </View>
    );
  }

  if (!user) {
    return <LoginScreen />;
  }

  return <MainApp />;
};

// Exportación única por defecto que envuelve el Gateway en el AuthProvider
export default function App() {
  return (
    <AuthProvider>
      <NavigationGateway />
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  mainContainer: {
    flex: 1,
    backgroundColor: '#121212',
    paddingTop: 40,
  },
  contentRow: {
    flex: 1,
    flexDirection: 'row',
  },
  containerLoading: {
    flex: 1,
    backgroundColor: '#121212',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    color: '#FFF',
    marginTop: 12,
    fontSize: 16,
  },
  menuSection: {
    flex: 0.7,
    borderRightWidth: 1,
    borderRightColor: '#222',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#222',
    backgroundColor: '#1A1A1A'
  },
  headerBrandContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  headerLogo: {
    width: 60,
    height: 60,
  },
  headerLogoLetters: {
    width: 70,
    height: 40,
  },
  // Estilos del Switch de Pestañas
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#262626',
    borderRadius: 8,
    padding: 4,
  },
  tabButton: {
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderRadius: 6,
  },
  tabActiveButton: {
    backgroundColor: '#FFBF00',
  },
  tabText: {
    color: '#AAA',
    fontWeight: '700',
    fontSize: 14,
  },
  tabActiveText: {
    color: '#000',
  },
  // Contenedor del Usuario Logueado en Header
  userContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  userName: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
  },
  logoutButton: {
    backgroundColor: '#333',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#444',
  },
  logoutText: {
    color: '#FF5252',
    fontWeight: 'bold',
    fontSize: 12,
  },
  // Estilos de la Cocina
  kitchenContainer: {
    flex: 1,
    backgroundColor: '#161616',
  },
  emptyKitchen: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyKitchenText: {
    color: '#888',
    fontSize: 18,
    fontWeight: '600',
  },
  orderCard: {
    backgroundColor: '#1E1E1E',
    width: 300,
    borderRadius: 12,
    padding: 16,
    marginRight: 16,
    borderWidth: 1,
    borderColor: '#333',
    justifyContent: 'space-between',
    height: '95%', 
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#2A2A2A',
    paddingBottom: 8,
    marginBottom: 6,
  },
  orderId: {
    color: '#FFBF00',
    fontSize: 18,
    fontWeight: 'bold',
  },
  orderTotal: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
  },
  timeText: {
    color: '#777',
    fontSize: 13,
    marginBottom: 12,
  },
  itemsContainer: {
    marginBottom: 16,
  },
  itemRow: {
    backgroundColor: '#262626',
    padding: 10,
    borderRadius: 6,
    marginBottom: 8,
  },
  itemText: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '600',
  },
  notesText: {
    color: '#FFBF00',
    fontSize: 13,
    fontStyle: 'italic',
    marginTop: 4,
    fontWeight: '500',
  },
  deliverButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 'auto',
  },
  deliverButtonText: {
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: 15,
    letterSpacing: 0.5,
  },
});