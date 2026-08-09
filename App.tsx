import React, {
  useState,
} from 'react';

import {
  ActivityIndicator,
  Text,
  View,
} from 'react-native';

import {
  AuthProvider,
  useAuth,
} from './src/context/AuthContext';

import {
  LoginScreen,
} from './src/screens/login/LoginScreen';

import {
  POSScreen,
} from './src/screens/pos/PosScreen';

import {
  KitchenScreen,
} from './src/screens/kitchen/KitchenScreen';

import {
  GlobalHeader,
  MainTab,
} from './src/components/header/GlobalHeader';

import {
  useInitialData,
} from './src/hooks/useInitialData';

import {
  Cart,
} from './src/types';

import {
  styles,
} from './App.styles';
import { SalesScreen } from './src/screens/sales/SalesScreen';

function MainApp() {
  const {
    user,
    logout,
  } = useAuth();

  const [
    activeTab,
    setActiveTab,
  ] = useState<MainTab>(
    'pos',
  );

  const [
    editingOrderId,
    setEditingOrderId,
  ] = useState<string | null>(
    null,
  );

  const [
    cart,
    setCart,
  ] = useState<Cart>([]);

  const {
    categories,
    products,
    pendingOrders,
    setPendingOrders,
    isLoading,
    errorMessage,
    fetchProducts,
    fetchKitchenOrders,
  } = useInitialData(user);

  if (isLoading) {
    return (
      <View
        style={
          styles.containerLoading
        }
      >
        <ActivityIndicator
          size="large"
          color="#FFBF00"
        />

        <Text
          style={
            styles.loadingText
          }
        >
          Conectando a Burger Kong
          Cloud...
        </Text>
      </View>
    );
  }

  if (errorMessage) {
    return (
      <View
        style={[
          styles.containerLoading,
          {
            backgroundColor:
              '#2C1414',
          },
        ]}
      >
        <Text
          style={{
            color: '#FF5252',
            fontSize: 24,
            fontWeight: 'bold',
          }}
        >
          ⚠️ Error de conexión nube
        </Text>

        <Text
          style={{
            color: '#FFF',
            marginTop: 8,
            textAlign: 'center',
            paddingHorizontal: 20,
          }}
        >
          {errorMessage}
        </Text>
      </View>
    );
  }

  const renderActiveScreen =
    () => {
      if (
        activeTab === 'pos'
      ) {
        return (
          <POSScreen
            categories={
              categories
            }
            products={
              products
            }
            fetchProducts={
              fetchProducts
            }
            cart={cart}
            setCart={
              setCart
            }
            editingOrderId={
              editingOrderId
            }
            setEditingOrderId={
              setEditingOrderId
            }
            fetchKitchenOrders={
              fetchKitchenOrders
            }
          />
        );
      }

      if (
        activeTab ===
        'kitchen'
      ) {
        return (
          <KitchenScreen
            pendingOrders={
              pendingOrders
            }
            setPendingOrders={
              setPendingOrders
            }
            editingOrderId={
              editingOrderId
            }
            setEditingOrderId={
              setEditingOrderId
            }
            setCart={
              setCart
            }
            setActiveTab={
              setActiveTab
            }
          />
        );
      }

      return (
        <SalesScreen />
      );
    };

  return (
    <View
      style={
        styles.mainContainer
      }
    >
      <GlobalHeader
        activeTab={
          activeTab
        }
        setActiveTab={
          setActiveTab
        }
        editingOrderId={
          editingOrderId
        }
        pendingOrdersCount={
          pendingOrders.length
        }
        user={user}
        logout={logout}
      />

      {renderActiveScreen()}
    </View>
  );
}

function NavigationGateway() {
  const {
    user,
    loading,
  } = useAuth();

  if (loading) {
    return (
      <View
        style={
          styles.containerLoading
        }
      >
        <ActivityIndicator
          size="large"
          color="#FFBF00"
        />

        <Text
          style={
            styles.loadingText
          }
        >
          Verificando
          credenciales...
        </Text>
      </View>
    );
  }

  return user ? (
    <MainApp />
  ) : (
    <LoginScreen />
  );
}

export default function App() {
  return (
    <AuthProvider>
      <NavigationGateway />
    </AuthProvider>
  );
}