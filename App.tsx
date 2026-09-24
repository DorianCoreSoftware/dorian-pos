import React, {
  useEffect,
  useRef,
  useState,
} from 'react';

import {
  ActivityIndicator,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import {
  AuthProvider,
  useAuth,
} from './src/context/AuthContext';

import {
  BusinessProvider,
  useBusiness,
} from './src/context/BusinessContext';

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
  SalesScreen,
} from './src/screens/sales/SalesScreen';

import {
  CashClosingScreen,
} from './src/screens/cash-closing/CashClosingScreen';

import {
  DriverScreen,
} from './src/screens/driver/DriverScreen';

import {
  LoyaltyScreen,
} from './src/screens/loyalty/LoyaltyScreen';

import {
  AdminScreen,
} from './src/screens/admin/AdminScreen';

import {
  GlobalHeader,
  MainTab,
} from './src/components/header/GlobalHeader';

import {
  useInitialData,
} from './src/hooks/useInitialData';

import {
  useSessionInactivity,
} from './src/hooks/useSessionInactivity';

import {
  useAccountStatus,
} from './src/hooks/useAccountStatus';

import {
  Cart,
} from './src/types';

import {
  styles,
} from './App.styles';

import {
  canManageCash,
  canManageCatalog,
} from './src/Utils/permissions';

import {
  getLastPushNotificationResponse,
  isWebOrderNotification,
  listenToPushNotificationResponses,
  registerPosPushNotifications,
} from './src/services/pushNotificationService';

function MainApp() {
  const {
    business,
    theme,
  } = useBusiness();

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

    cashSession,
    setCashSession,

    isLoading,
    errorMessage,

    fetchCategories,
    fetchProducts,
    fetchKitchenOrders,
    fetchCashSession,
  } = useInitialData(user);

  const handledNotificationId =
    useRef<string | null>(
      null,
    );

  /*
   * ==========================================================
   * REGISTRO PUSH
   * ==========================================================
   */
  useEffect(() => {
    if (
      !user?.id
    ) {
      return;
    }

    void registerPosPushNotifications(
      user.id,
    );
  }, [
    user?.id,
  ]);

  /*
   * ==========================================================
   * TAP EN NOTIFICACIÓN
   * ==========================================================
   *
   * Funciona cuando:
   *
   * - la app está abierta
   * - está en segundo plano
   * - se abre tocando la notificación
   */
  useEffect(() => {
    if (
      !user?.id
    ) {
      return;
    }

    const openKitchenFromNotification =
      async (
        notificationId:
          string,
      ): Promise<void> => {
        /*
         * Si el negocio no usa Cocina,
         * una notificación no debe abrir
         * un módulo deshabilitado.
         */
        if (
          !business?.features.kitchenEnabled
        ) {
          return;
        }

        /*
         * Evitamos procesar dos veces
         * la misma notificación.
         */
        if (
          handledNotificationId
            .current ===
          notificationId
        ) {
          return;
        }

        handledNotificationId.current =
          notificationId;

        try {
          /*
           * Primero actualizamos la lista
           * de comandas.
           */
          await fetchKitchenOrders();

          /*
           * Después abrimos Cocina.
           */
          setActiveTab(
            'kitchen',
          );
        } catch (error) {
          console.error(
            '❌ Error abriendo pedido desde notificación:',
            error,
          );
        }
      };

    /*
     * --------------------------------------------------------
     * APP ABIERTA / SEGUNDO PLANO
     * --------------------------------------------------------
     */
    const subscription =
      listenToPushNotificationResponses(
        (data) => {
          console.log(
            '🍔 Pedido web abierto desde notificación:',
            data,
          );

          const notificationKey =
            data.orderId ??
            data.trackingCode ??
            'new_web_order';

          void openKitchenFromNotification(
            notificationKey,
          );
        },
      );

    /*
     * --------------------------------------------------------
     * APP CERRADA
     * --------------------------------------------------------
     *
     * Si Android abrió la aplicación
     * porque el usuario tocó la
     * notificación.
     */
    void (
      async () => {
        try {
          const response =
            await getLastPushNotificationResponse();

          if (
            !response
          ) {
            return;
          }

          const data =
            response
              .notification
              .request
              .content
              .data;

          if (
            !isWebOrderNotification(
              data,
            )
          ) {
            return;
          }

          console.log(
            '🍔 POS iniciado desde notificación:',
            data,
          );

          const notificationKey =
            data.orderId ??
            data.trackingCode ??
            response
              .notification
              .request
              .identifier;

          await openKitchenFromNotification(
            notificationKey,
          );
        } catch (error) {
          console.error(
            '❌ Error leyendo notificación inicial:',
            error,
          );
        }
      }
    )();

    return () => {
      subscription.remove();
    };
  }, [
    user?.id,
    fetchKitchenOrders,
    business?.features.kitchenEnabled,
  ]);

  /*
   * ==========================================================
   * PROTECCIÓN DE TABS POR FEATURE FLAGS
   * ==========================================================
   *
   * Si una configuración cambia mientras
   * el usuario está dentro de un módulo,
   * regresamos de forma segura al POS.
   */
  useEffect(() => {
    if (
      activeTab ===
        'kitchen' &&
      !business?.features.kitchenEnabled
    ) {
      setActiveTab(
        'pos',
      );

      return;
    }

    if (
      activeTab ===
        'loyalty' &&
      !business?.features.loyaltyEnabled
    ) {
      setActiveTab(
        'pos',
      );
    }
  }, [
    activeTab,
    business?.features.kitchenEnabled,
    business?.features.loyaltyEnabled,
  ]);

  const userCanManageCash =
    canManageCash(user);

  const userCanManageCatalog =
    canManageCatalog(user);

  const [
    modifiersVersion,
    setModifiersVersion,
  ] = useState(0);

  const handleModifiersChanged =
    (): Promise<void> => {
      setModifiersVersion(
        (current) =>
          current + 1,
      );

      return Promise.resolve();
    };

  if (isLoading) {
    return (
      <View
        style={[
          styles.containerLoading,
          {
            backgroundColor:
              theme.background,
          },
        ]}
      >
        <ActivityIndicator
          size="large"
          color={
            theme.primary
          }
        />

        <Text
          style={[
            styles.loadingText,
            {
              color:
                theme.text,
            },
          ]}
        >
          Conectando a{' '}
          {business?.identity.businessName ??
            'Dorian POS'}{' '}
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
            color:
              theme.danger,

            fontSize:
              24,

            fontWeight:
              'bold',
          }}
        >
          ⚠️ Error de conexión nube
        </Text>

        <Text
          style={{
            color:
              theme.text,

            marginTop:
              8,

            textAlign:
              'center',

            paddingHorizontal:
              20,
          }}
        >
          {errorMessage}
        </Text>
      </View>
    );
  }

  const renderCashRequired =
    () => {
      return (
        <View
          style={[
            styles.containerLoading,
            {
              backgroundColor:
                theme.background,
            },
          ]}
        >
          <Text
            style={{
              fontSize:
                48,

              marginBottom:
                14,
            }}
          >
            🔒
          </Text>

          <Text
            style={{
              color:
                theme.text,

              fontSize:
                24,

              fontWeight:
                '900',

              textAlign:
                'center',
            }}
          >
            Caja cerrada
          </Text>

          <Text
            style={{
              color:
                theme.textMuted,

              fontSize:
                14,

              marginTop:
                8,

              textAlign:
                'center',

              maxWidth:
                420,

              lineHeight:
                21,
            }}
          >
            Debe existir una caja
            abierta antes de comenzar
            a registrar ventas.
          </Text>

          {userCanManageCash ? (
            <TouchableOpacity
              style={{
                marginTop:
                  20,

                minHeight:
                  46,

                paddingHorizontal:
                  22,

                borderRadius:
                  8,

                alignItems:
                  'center',

                justifyContent:
                  'center',

                backgroundColor:
                  theme.primary,
              }}
              onPress={() =>
                setActiveTab(
                  'cash',
                )
              }
            >
              <Text
                style={{
                  color:
                    theme.onPrimary,

                  fontSize:
                    14,

                  fontWeight:
                    '900',
                }}
              >
                Abrir caja
              </Text>
            </TouchableOpacity>
          ) : (
            <Text
              style={{
                color:
                  theme.primary,

                fontSize:
                  13,

                fontWeight:
                  '700',

                marginTop:
                  18,

                textAlign:
                  'center',
              }}
            >
              Solicita a un
              administrador que abra
              la caja.
            </Text>
          )}
        </View>
      );
    };

  const renderRestricted =
    (
      message: string,
    ) => {
      return (
        <View
          style={[
            styles.containerLoading,
            {
              backgroundColor:
                theme.background,
            },
          ]}
        >
          <Text
            style={{
              fontSize:
                48,

              marginBottom:
                14,
            }}
          >
            🔐
          </Text>

          <Text
            style={{
              color:
                theme.text,

              fontSize:
                24,

              fontWeight:
                '900',
            }}
          >
            Acceso restringido
          </Text>

          <Text
            style={{
              color:
                theme.textMuted,

              fontSize:
                14,

              marginTop:
                8,

              textAlign:
                'center',
            }}
          >
            {message}
          </Text>
        </View>
      );
    };

  const renderActiveScreen =
    () => {
      if (
        activeTab ===
        'pos'
      ) {
        if (!cashSession) {
          return renderCashRequired();
        }

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
            cart={
              cart
            }
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
            modifiersVersion={
              modifiersVersion
            }
          />
        );
      }

      if (
        activeTab ===
        'kitchen'
      ) {
        if (
          !business?.features.kitchenEnabled
        ) {
          return null;
        }

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

      if (
        activeTab ===
        'sales'
      ) {
        return (
          <SalesScreen />
        );
      }

      if (
        activeTab ===
        'loyalty'
      ) {
        if (
          !business?.features.loyaltyEnabled
        ) {
          return null;
        }

        return (
          <LoyaltyScreen />
        );
      }

      if (
        activeTab ===
        'cash'
      ) {
        if (
          !userCanManageCash
        ) {
          return renderRestricted(
            'Solo un administrador puede administrar la caja.',
          );
        }

        return (
          <CashClosingScreen
            cashSession={
              cashSession
            }
            setCashSession={
              setCashSession
            }
            fetchCashSession={
              fetchCashSession
            }
            pendingOrdersCount={
              pendingOrders.length
            }
          />
        );
      }

      if (
        activeTab ===
        'admin'
      ) {
        if (
          !userCanManageCatalog
        ) {
          return renderRestricted(
            'Solo un administrador puede modificar el catálogo.',
          );
        }

        return (
          <AdminScreen
            onProductsChanged={
              fetchProducts
            }
            onCategoriesChanged={
              fetchCategories
            }
            onModifiersChanged={
              handleModifiersChanged
            }
          />
        );
      }

      return null;
    };

  return (
    <View
      style={[
        styles.mainContainer,
        {
          backgroundColor:
            theme.background,
        },
      ]}
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
        user={
          user
        }
        logout={
          logout
        }
      />

      {renderActiveScreen()}
    </View>
  );
}

function NavigationGateway() {
  const {
    user,
    loading,
    logout,
  } = useAuth();

  const {
    business,
    theme,
    isLoading:
      businessLoading,
  } = useBusiness();

  const {
    registerActivity,
  } = useSessionInactivity({
    userId:
      user?.id ?? null,

    logout,
  });

  useAccountStatus({
    userId:
      user?.id ?? null,

    logout,
  });

  if (
    loading ||
    businessLoading
  ) {
    return (
      <View
        style={[
          styles.containerLoading,
          {
            backgroundColor:
              theme.background,
          },
        ]}
      >
        <ActivityIndicator
          size="large"
          color={
            theme.primary
          }
        />

        <Text
          style={[
            styles.loadingText,
            {
              color:
                theme.text,
            },
          ]}
        >
          Verificando
          credenciales...
        </Text>
      </View>
    );
  }

  if (!user) {
    return (
      <LoginScreen />
    );
  }

  if (
    user.role ===
      'driver' &&
    !business?.features.deliveryEnabled
  ) {
    return (
      <View
        style={[
          styles.containerLoading,
          {
            backgroundColor:
              theme.background,
          },
        ]}
      >
        <Text
          style={{
            fontSize:
              48,

            marginBottom:
              14,
          }}
        >
          🚚
        </Text>

        <Text
          style={{
            color:
              theme.text,

            fontSize:
              24,

            fontWeight:
              '900',

            textAlign:
              'center',
          }}
        >
          Reparto deshabilitado
        </Text>

        <Text
          style={{
            color:
              theme.textMuted,

            fontSize:
              14,

            marginTop:
              8,

            textAlign:
              'center',

            maxWidth:
              420,

            lineHeight:
              21,
          }}
        >
          El módulo de reparto no está
          habilitado para este negocio.
        </Text>

        <TouchableOpacity
          style={{
            marginTop:
              20,

            minHeight:
              46,

            paddingHorizontal:
              22,

            borderRadius:
              8,

            alignItems:
              'center',

            justifyContent:
              'center',

            backgroundColor:
              theme.primary,
          }}
          onPress={
            logout
          }
        >
          <Text
            style={{
              color:
                theme.onPrimary,

              fontSize:
                14,

              fontWeight:
                '900',
            }}
          >
            Cerrar sesión
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View
      style={{
        flex:
          1,
      }}
      onTouchStart={
        registerActivity
      }
    >
      {user.role ===
      'driver' ? (
        <DriverScreen />
      ) : (
        <MainApp />
      )}
    </View>
  );
}

export default function App() {
  return (
    <BusinessProvider>
      <AuthProvider>
        <NavigationGateway />
      </AuthProvider>
    </BusinessProvider>
  );
}
