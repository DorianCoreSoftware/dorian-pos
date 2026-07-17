import React, { useEffect, useState } from 'react';
import {
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

// --- AUTENTICACIÓN ---
import { AuthProvider, useAuth } from './src/context/AuthContext';
import { LoginScreen } from './src/components/login/LoginScreen';

// --- ESTILOS EXTERNOS ---
import { styles } from './App.styles';

function MainApp() {
  const { user, logout } = useAuth(); // Sesión actual y rol ('admin' o 'seller')
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

  // --- CONTROL DE ORDEN EN EDICIÓN ---
  const [editingOrderId, setEditingOrderId] = useState<string | null>(null);

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

    if (user) {
      loadMenuFromCloud();
    }
  }, [user]);

  // 2. Suscripción en Tiempo Real para Cocina (Realtime)
 // 2. Suscripción en Tiempo Real para Cocina (Realtime)
useEffect(() => {
  if (!user) return;

  const channel = supabase
    .channel('orders-live-changes')
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'orders' },
      () => {
        // Un pequeño delay de 300ms da tiempo a que terminen de insertarse los order_items 
        setTimeout(() => {
          fetchKitchenOrders();
        }, 300);
      }
    )
    .on(
      'postgres_changes',
      { event: 'UPDATE', schema: 'public', table: 'orders' },
      () => {
        // 🔥 CRÍTICO: También agregamos delay aquí. Al editar, el DELETE e INSERT de ítems
        // toma unos milisegundos. Sin este delay, la cocina jala datos intermedios (duplicados).
        setTimeout(() => {
          fetchKitchenOrders();
        }, 400); // 400ms es ideal para cambios de estructura en subtablas
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}, [user]);

  // Función para jalar las órdenes de la BD asegurando que solo queden las 'pendiente'
  const fetchKitchenOrders = async () => {
    try {
      const ordersData = await getPendingOrders();

      // 1. Filtro de seguridad: Solo las que sigan pendientes
      const onlyPending = (ordersData || []).filter((order: any) => order.status === 'pending');

      // 2. 🔥 ELIMINAR DUPLICADOS DE RAÍZ: Evita que ráfagas de Realtime dupliquen la tarjeta
      const uniqueOrdersMap = new Map();
      onlyPending.forEach((order: any) => {
        if (!uniqueOrdersMap.has(order.id)) {
          uniqueOrdersMap.set(order.id, order);
        }
      });

      // Convertimos el mapa de nuevo a un arreglo limpio
      setPendingOrders(Array.from(uniqueOrdersMap.values()));
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
        // Removemos inmediatamente del estado local para feedback rápido antes del realtime
        setPendingOrders((prevOrders) => prevOrders.filter(order => order.id !== orderId));
      }

    } catch (error) {
      console.error('Error al entregar la orden:', error);
      Alert.alert('Error', 'No se pudo marcar la orden como entregada.');
    }
  };

  // --- CANCELAR PEDIDO TOTALMENTE ---
  const handleCancelOrderPrompt = (orderId: string) => {
    const shortId = orderId.slice(-6).toUpperCase();
    Alert.alert(
      '🚨 Cancelar Pedido',
      `¿Estás seguro de que deseas cancelar por completo la orden #${shortId}? Esto la removerá de la pantalla de cocina.`,
      [
        { text: 'No, mantener pedido', style: 'cancel' },
        {
          text: 'Sí, Cancelar Todo',
          style: 'destructive',
          onPress: () => executeCancelOrder(orderId)
        }
      ]
    );
  };

  const executeCancelOrder = async (orderId: string) => {
    try {
      // 1. Actualizamos el estado directamente en la tabla de Supabase
      const { error } = await supabase
        .from('orders')
        .update({ status: 'cancelado' })
        .eq('id', orderId);

      if (error) throw error;

      // 2. ACTUALIZACIÓN DEL FRONTEND: Removemos la orden cancelada
      setPendingOrders((prevOrders: any[]) => prevOrders.filter(order => order.id !== orderId));

      // 3. Si estabas editando ese pedido en el POS, limpiamos el carrito
      if (editingOrderId === orderId) {
        setCart([]);
        setEditingOrderId(null);
      }

      Alert.alert('✅ Éxito', 'El pedido ha sido cancelado por completo.');

    } catch (error: any) {
      console.error("Error al cancelar el pedido en Supabase:", error);
      Alert.alert(
        '❌ Error',
        'No se pudo cancelar el pedido en el servidor. Revisa tu conexión.'
      );
    }
  };

  // --- LÓGICA DEL CARRITO ---
  const handleEditOrder = (order: any) => {
    if (cart.length > 0 && editingOrderId !== order.id) {
      Alert.alert(
        'Carrito ocupado',
        'Tienes productos en el carrito actual. ¿Deseas descartarlos para editar este pedido?',
        [
          { text: 'Cancelar', style: 'cancel' },
          { text: 'Descartar y Editar', style: 'destructive', onPress: () => loadOrderIntoCart(order) }
        ]
      );
    } else {
      loadOrderIntoCart(order);
    }
  };

  const loadOrderIntoCart = (order: any) => {
    // Agrupamos por producto y notas desde la carga de la orden original por si viene fragmentada
    const itemsAgrupados: { [key: string]: CartItem } = {};

    order.order_items.forEach((line: any) => {
      const notasLimpias = (line.notes || '').trim();
      const uniqueItemId = `${line.product_id}-${notasLimpias}`;

      if (itemsAgrupados[uniqueItemId]) {
        itemsAgrupados[uniqueItemId].quantity += line.quantity;
      } else {
        const prodBase: Product = {
          id: line.product_id,
          name: line.products?.name || 'Producto',
          price: line.price_at_purchase || line.products?.price || 0,
          category_id: line.products?.category_id || '',
          description: line.products?.description || null,
          is_active: line.products?.is_active ?? true,
          created_at: line.products?.created_at || '',
          image_url: line.products?.image_url || null,
          is_available: line.products?.is_available ?? true,
        };

        itemsAgrupados[uniqueItemId] = {
          id: uniqueItemId,
          product: prodBase,
          quantity: line.quantity,
          notes: notasLimpias,
        };
      }
    });

    setCart(Object.values(itemsAgrupados));
    setEditingOrderId(order.id);
    setActiveTab('pos');
  };

  const handleProductPress = (product: Product) => {
    setSelectedProduct(product);
    setProductNotes('');
    setModalVisible(true);
  };

  const fetchProducts = async () => {
    const { data, error } = await supabase.from('products').select('*');
    if (data) setProductos(data);
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const handleConfirmAddToCart = () => {
    if (!selectedProduct) return;

    setCart((currentCart) => {
      const notasLimpias = productNotes.trim();
      const uniqueItemId = `${selectedProduct.id}-${notasLimpias}`;
      const existingItemIndex = currentCart.findIndex(item => item.id === uniqueItemId);

      if (existingItemIndex > -1) {
        const newCart = [...currentCart];
        newCart[existingItemIndex] = {
          ...newCart[existingItemIndex],
          quantity: newCart[existingItemIndex].quantity + 1
        };
        return newCart;
      }

      return [
        ...currentCart,
        {
          id: uniqueItemId,
          product: selectedProduct,
          quantity: 1,
          notes: notasLimpias,
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

  const clearCart = () => {
    setCart([]);
    setEditingOrderId(null);
  };

  const handleCheckout = async (totalAmount: number) => {
    if (cart.length === 0) return;

    try {
      setIsLoading(true);

      if (editingOrderId) {
  // 1. Forzamos el borrado y ESPERAMOS a que la BD confirme cuántas filas borró
  const { data: deleteData, error: deleteItemsError } = await supabase
    .from('order_items')
    .delete()
    .eq('order_id', editingOrderId)
    .select(); // Agregamos .select() para debuguear en consola cuántas borró

  if (deleteItemsError) throw deleteItemsError;
  
  // Imprime esto en tu consola para comprobar si el RLS te está bloqueando:
  console.log("Filas borradas reales en la BD:", deleteData?.length);

  // 2. Una vez confirmado el borrado, actualizamos el total de la orden principal
  const { error: updateOrderError } = await supabase
    .from('orders')
    .update({ total: totalAmount })
    .eq('id', editingOrderId);

  if (updateOrderError) throw updateOrderError;

  // 3. Preparamos e insertamos el nuevo set limpio de productos
  const orderItemsPayload = cart.map(item => ({
    order_id: editingOrderId,
    product_id: item.product.id,
    quantity: item.quantity,
    price_at_purchase: item.product.price,
    notes: item.notes || null
  }));

  const { error: insertItemsError } = await supabase
    .from('order_items')
    .insert(orderItemsPayload);

  if (insertItemsError) throw insertItemsError;

  // 4. Actualizamos el estado local inmediatamente
  await fetchKitchenOrders();

  Alert.alert(
    "🍳 ¡Pedido Actualizado!",
    `La orden #${editingOrderId.slice(-6).toUpperCase()} fue modificada con éxito.`
  );
  clearCart();
      } else {
        const result = await createKitchenOrder(cart, totalAmount);

        if (result.success) {
          Alert.alert(
            "🍳 ¡Pedido enviado!",
            `La orden #${result.orderId.slice(-6).toUpperCase()} ya está en la fila de cocina.`
          );
          clearCart();
        }
      }
    } catch (error: any) {
      Alert.alert(
        "⚠️ Error al procesar el pedido",
        `No se pudo completar la operación: ${error.message}`
      );
    } finally {
      setIsLoading(false);
    }
  };

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

        {/* SELECTOR DE PANTALLAS */}
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tabButton, activeTab === 'pos' && styles.tabActiveButton]}
            onPress={() => setActiveTab('pos')}
          >
            <Text style={[styles.tabText, activeTab === 'pos' && styles.tabActiveText]}>
              🛒 MENÚ {editingOrderId ? '⚠️ (Modificando)' : ''}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabButton, activeTab === 'kitchen' && styles.tabActiveButton]}
            onPress={() => setActiveTab('kitchen')}
          >
            <Text style={[styles.tabText, activeTab === 'kitchen' && styles.tabActiveText]}>
              🍳 PEDIDOS ({pendingOrders.length})
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.userContainer}>
          <Text style={styles.userName}>
            {user?.fullName} ({user?.role === 'admin' ? 'Admin' : 'Caja'})
          </Text>
          <TouchableOpacity onPress={logout} style={styles.logoutButton}>
            <Text style={styles.logoutText}>Salir</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* RENDERIZADO CONDICIONAL DE PANTALLAS */}
      {activeTab === 'pos' ? (
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
            onRemoveItem={removeLineItem}
            onClearCart={clearCart}
            onCheckout={handleCheckout}
          />
        </View>
      ) : (
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
                  <View style={{ flex: 1 }}>
                    <View style={styles.cardHeader}>
                      <Text style={styles.orderId}>Ticket #{item.id.slice(-4).toUpperCase()}</Text>
                      <Text style={styles.orderTotal}>${item.total}</Text>
                    </View>

                    <Text style={styles.timeText}>
                      Ingresó: {new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </Text>

                    <View style={styles.itemsContainer}>
                      {(() => {
                        // 1. Agrupamos los productos repetidos en un objeto temporal
                        const itemsAgrupados: { [key: string]: any } = {};

                        item.order_items?.forEach((line: any) => {
                          const notasLimpias = (line.notes || '').trim();
                          // Creamos una llave única por producto y notas por si piden cosas con modificadores distintos
                          const uniqueKey = `${line.product_id}-${notasLimpias}`;

                          if (itemsAgrupados[uniqueKey]) {
                            // Si ya existe en la tarjeta de la cocina, sumamos la cantidad
                            itemsAgrupados[uniqueKey].quantity += line.quantity;
                          } else {
                            // Si es nuevo, lo clonamos para no mutar el estado original directamente
                            itemsAgrupados[uniqueKey] = { ...line, notes: notasLimpias };
                          }
                        });

                        // 2. Mapeamos el arreglo ya limpio y agrupado
                        return Object.values(itemsAgrupados).map((line: any, index: number) => (
                          <View key={`${line.id || index}-${line.product_id}`} style={styles.itemRow}>
                            <Text style={styles.itemText}>
                              {line.quantity}x {line.products?.name || 'Producto'}
                            </Text>
                            {line.notes ? (
                              <Text style={styles.notesText}>⚠️ {line.notes}</Text>
                            ) : null}
                          </View>
                        ));
                      })()}
                    </View>
                  </View>

                  <View style={styles.actionBlock}>
                    <View style={styles.actionButtonsRow}>
                      <TouchableOpacity
                        style={styles.editOrderButton}
                        onPress={() => handleEditOrder(item)}
                      >
                        <Text style={styles.editOrderButtonText}>Editar</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.deliverButton}
                        onPress={() => handleDeliverOrder(item.id)}
                      >
                        <Text style={styles.deliverButtonText}>Entregar</Text>
                      </TouchableOpacity>
                    </View>

                    <TouchableOpacity
                      style={styles.cancelOrderButton}
                      onPress={() => handleCancelOrderPrompt(item.id)}
                    >
                      <Text style={styles.cancelOrderButtonText}>❌ Cancelar Pedido</Text>
                    </TouchableOpacity>
                  </View>
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

export default function App() {
  return (
    <AuthProvider>
      <NavigationGateway />
    </AuthProvider>
  );
}