import React, { useState } from 'react';
import { View, ActivityIndicator, Text } from 'react-native';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import { LoginScreen } from './src/components/login/LoginScreen';
import { GlobalHeader } from './src/components/header/GlobalHeader';
import { useInitialData } from './src/hooks/useInitialData';
import { styles } from './App.styles';
import { POSScreen } from './src/components/pos/PosScreen';
import { KitchenScreen } from './src/components/kitchen/KitchenScreen';

function MainApp() {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState<'pos' | 'kitchen'>('pos');
  const [editingOrderId, setEditingOrderId] = useState<string | null>(null);
  const [cart, setCart] = useState<any[]>([]);

  // Hook personalizado opcional para no saturar de useEffects la raíz
  const { categorias, productos, setProductos, pendingOrders, setPendingOrders, isLoading, errorMsg, fetchProducts, fetchKitchenOrders } = useInitialData(user);

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
      </View>
    );
  }

  return (
    <View style={styles.mainContainer}>
      <GlobalHeader 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        editingOrderId={editingOrderId} 
        pendingOrdersCount={pendingOrders.length}
        user={user}
        logout={logout}
      />

      {activeTab === 'pos' ? (
        <POSScreen 
          categorias={categorias}
          productos={productos}
          fetchProducts={fetchProducts}
          cart={cart}
          setCart={setCart}
          editingOrderId={editingOrderId}
          setEditingOrderId={setEditingOrderId}
          fetchKitchenOrders={fetchKitchenOrders}
        />
      ) : (
        <KitchenScreen 
          pendingOrders={pendingOrders}
          setPendingOrders={setPendingOrders}
          editingOrderId={editingOrderId}
          setEditingOrderId={setEditingOrderId}
          setCart={setCart}
          setActiveTab={setActiveTab}
          fetchKitchenOrders={fetchKitchenOrders}
        />
      )}
    </View>
  );
}

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
  return !user ? <LoginScreen /> : <MainApp />;
};

export default function App() {
  return (
    <AuthProvider>
      <NavigationGateway />
    </AuthProvider>
  );
}