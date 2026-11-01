import React, {
  useEffect,
  useRef,
  useState,
} from 'react';

import {
  ActivityIndicator,
  Alert,
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
  EventsScreen,
} from './src/screens/events/EventsScreen';

import {
  AttendanceScreen,
} from './src/screens/attendance/AttendanceScreen';

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
  setBrandPrimaryColor,
} from './App.styles';

import {
  canAccessAdminPanel,
  canAccessDriverOrders,
  canManageCash,
  canManageCatalog,
} from './src/Utils/permissions';

import {
  getLastPushNotificationResponse,
  isEventRequestNotification,
  isWebOrderNotification,
  listenToPushNotificationResponses,
  listenToPushNotificationsReceived,
  registerPosPushNotifications,
} from './src/services/pushNotificationService';

import {
  configureAttendanceNotificationChannel,
  getAttendanceNotificationTarget,
  isAttendanceNotification,
  listenToAttendanceNotificationResponses,
} from './src/services/attendancePushNavigationService';

import {
  getEventRequestsAdmin,
} from './src/services/adminEventsService';

import {
  AttendanceStatus,
  getAttendanceStatus,
  syncAttendanceNotifications,
} from './src/services/attendanceService';

import {
  getDriverOrders,
  listenToDriverOrderChanges,
} from './src/services/driverService';

function MainApp() {
  const {
    business,
    theme,
  } = useBusiness();

  setBrandPrimaryColor(
    theme.primary,
  );

  const {
    user,
    logout,
  } = useAuth();

  const [
    activeTab,
    setActiveTab,
  ] = useState<MainTab>(
    user?.role === 'accountant'
      ? 'admin'
      : user?.role === 'driver'
        ? 'driver'
        : 'pos',
  );

  const [
    attendanceFocus,
    setAttendanceFocus,
  ] = useState<
    | 'attendance'
    | 'notifications'
    | 'requests'
    | 'receipts'
    | 'schedule'
    | null
  >(null);

  const [
    attendanceFocusToken,
    setAttendanceFocusToken,
  ] = useState(0);

  const openAttendanceFromNotification =
    (data: {
      type: 'attendance_notification';
      category?: string;
    }): void => {
      setAttendanceFocus(
        getAttendanceNotificationTarget(data),
      );
      setAttendanceFocusToken(
        current => current + 1,
      );
      setActiveTab('attendance');
    };

  const [
    newEventRequestsCount,
    setNewEventRequestsCount,
  ] = useState(0);

  const [
    driverOrdersCount,
    setDriverOrdersCount,
  ] = useState(0);

  const refreshDriverOrdersCount =
    async (): Promise<void> => {
      if (
        !user?.id ||
        !business?.features.deliveryEnabled ||
        !canAccessDriverOrders(user)
      ) {
        setDriverOrdersCount(0);
        return;
      }

      try {
        const orders =
          await getDriverOrders();

        setDriverOrdersCount(
          orders.length,
        );
      } catch (error) {
        console.error(
          'Error actualizando contador de reparto:',
          error,
        );
      }
    };

  const [
    attendanceStatus,
    setAttendanceStatus,
  ] = useState<AttendanceStatus | null>(null);

  const lastAttendanceAlertAt =
    useRef(0);

  const refreshAttendanceStatus =
    async (): Promise<void> => {
      if (!user?.id) {
        setAttendanceStatus(null);
        return;
      }

      try {
        const status =
          await getAttendanceStatus();
        setAttendanceStatus(status);

        try {
          await syncAttendanceNotifications();
        } catch (notificationError) {
          console.warn(
            'No se pudo sincronizar el monitoreo de asistencia:',
            notificationError,
          );
        }
      } catch (error) {
        console.error(
          'Error actualizando estado de asistencia:',
          error,
        );
      }
    };

  const refreshNewEventRequestsCount =
    async (): Promise<void> => {
      if (
        !user?.id ||
        !business?.features.eventsEnabled ||
        !canManageCatalog(user)
      ) {
        setNewEventRequestsCount(0);
        return;
      }

      try {
        const requests = await getEventRequestsAdmin();
        setNewEventRequestsCount(
          requests.filter(item => item.status === 'new').length,
        );
      } catch (error) {
        console.error(
          'Error actualizando contador de eventos:',
          error,
        );
      }
    };

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

  useEffect(() => {
    void refreshNewEventRequestsCount();

    if (
      !user?.id ||
      !business?.features.eventsEnabled ||
      !canManageCatalog(user)
    ) {
      return;
    }

    const interval = setInterval(() => {
      void refreshNewEventRequestsCount();
    }, 30000);

    return () => {
      clearInterval(interval);
    };
  }, [
    user?.id,
    user?.role,
    business?.features.eventsEnabled,
  ]);

  useEffect(() => {
    void refreshDriverOrdersCount();

    if (
      !user?.id ||
      !business?.features.deliveryEnabled ||
      !canAccessDriverOrders(user)
    ) {
      return;
    }

    const unsubscribe =
      listenToDriverOrderChanges(
        () => {
          void refreshDriverOrdersCount();
        },
      );

    return unsubscribe;
  }, [
    user?.id,
    user?.role,
    business?.features.deliveryEnabled,
  ]);

  useEffect(() => {
    void refreshAttendanceStatus();

    if (!user?.id) {
      return;
    }

    const interval = setInterval(() => {
      void refreshAttendanceStatus();
    }, 60000);

    return () => {
      clearInterval(interval);
    };
  }, [user?.id]);

  useEffect(() => {
    void refreshAttendanceStatus();
    void refreshDriverOrdersCount();
  }, [activeTab]);

  useEffect(() => {
    if (
      !attendanceStatus ||
      activeTab === 'attendance'
    ) {
      return;
    }

    const shouldWarn =
      attendanceStatus.needsClockInReminder ||
      attendanceStatus.needsClockOutReminder;

    if (!shouldWarn) {
      return;
    }

    const now = Date.now();
    const intervalMs = Math.max(
      1,
      attendanceStatus.settings.reminderIntervalMinutes,
    ) * 60000;

    if (
      lastAttendanceAlertAt.current > 0 &&
      now - lastAttendanceAlertAt.current < intervalMs
    ) {
      return;
    }

    lastAttendanceAlertAt.current = now;

    Alert.alert(
      attendanceStatus.needsClockOutReminder
        ? 'Salida pendiente'
        : 'Entrada pendiente',
      attendanceStatus.needsClockOutReminder
        ? 'Tu jornada sigue abierta después del horario del negocio. Registra tu salida cuando termines.'
        : 'Estás usando el sistema dentro de la ventana laboral y todavía no has registrado tu entrada.',
      [
        {
          text: 'Ir a asistencia',
          onPress: () => setActiveTab('attendance'),
        },
        {
          text: 'Recordarme después',
          style: 'cancel',
        },
      ],
    );
  }, [attendanceStatus, activeTab]);

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


  useEffect(() => {
    if (!user?.id) {
      return;
    }

    void configureAttendanceNotificationChannel();
  }, [user?.id]);

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
        data => {
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
        data => {
          if (
            business?.features.eventsEnabled &&
            canManageCatalog(user)
          ) {
            console.log(
              '🎉 Solicitud de evento abierta desde notificación:',
              data,
            );
            setActiveTab('events');
            void refreshNewEventRequestsCount();
          }
        },
      );

    const attendanceSubscription =
      listenToAttendanceNotificationResponses(
        data => {
          console.log(
            '🕐 Notificación laboral abierta:',
            data,
          );
          openAttendanceFromNotification(data);
        },
      );

    const receivedSubscription =
      listenToPushNotificationsReceived(
        () => {
          void refreshNewEventRequestsCount();
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

          if (isAttendanceNotification(data)) {
            console.log(
              '🕐 POS iniciado desde notificación laboral:',
              data,
            );
            openAttendanceFromNotification(data);
            return;
          }

          if (isEventRequestNotification(data)) {
            if (
              business?.features.eventsEnabled &&
              canManageCatalog(user)
            ) {
              console.log(
                '🎉 POS iniciado desde solicitud de evento:',
                data,
              );
              setActiveTab('events');
              await refreshNewEventRequestsCount();
            }
            return;
          }

          if (!isWebOrderNotification(data)) {
            return;
          }

          console.log(
            '🍔 POS iniciado desde notificación:',
            data,
          );

          const notificationKey =
            data.orderId ??
            data.trackingCode ??
            response.notification.request.identifier;

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
      attendanceSubscription.remove();
      receivedSubscription.remove();
    };
  }, [
    user?.id,
    fetchKitchenOrders,
    business?.features.kitchenEnabled,
    business?.features.eventsEnabled,
    user?.role,
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


    if (
      activeTab === 'events' &&
      (
        !business?.features.eventsEnabled ||
        !canManageCatalog(user)
      )
    ) {
      setActiveTab('pos');
    }
  }, [
    activeTab,
    business?.features.kitchenEnabled,
    business?.features.loyaltyEnabled,
    business?.features.eventsEnabled,
    user?.role,
  ]);

  useEffect(() => {
    if (
      user?.role === 'accountant' &&
      activeTab !== 'admin' &&
      activeTab !== 'attendance'
    ) {
      setActiveTab('admin');
    }
  }, [
    activeTab,
    user?.role,
  ]);

  const userCanManageCash =
    canManageCash(user);

  const userCanManageCatalog =
    canManageCatalog(user);

  const userCanAccessAdminPanel =
    canAccessAdminPanel(user);

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
        'driver'
      ) {
        if (
          !canAccessDriverOrders(user) ||
          !business?.features.deliveryEnabled
        ) {
          return null;
        }

        return (
          <DriverScreen />
        );
      }

      if (
        activeTab ===
        'attendance'
      ) {
        return (
          <AttendanceScreen
            focusTarget={attendanceFocus}
            focusToken={attendanceFocusToken}
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
        activeTab === 'events'
      ) {
        if (
          !business?.features.eventsEnabled ||
          !userCanManageCatalog
        ) {
          return renderRestricted(
            'Solo un administrador puede gestionar solicitudes de eventos.',
          );
        }

        return (
          <EventsScreen
            onRequestsChanged={refreshNewEventRequestsCount}
          />
        );
      }

      if (
        activeTab ===
        'admin'
      ) {
        if (
          !userCanAccessAdminPanel
        ) {
          return renderRestricted(
            'No tienes permisos para acceder al panel administrativo.',
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
        newEventRequestsCount={
          newEventRequestsCount
        }
        driverOrdersCount={
          driverOrdersCount
        }
        user={
          user
        }
        logout={
          logout
        }
      />

      {activeTab !== 'attendance' &&
        (attendanceStatus?.needsClockInReminder ||
          attendanceStatus?.needsClockOutReminder) ? (
        <TouchableOpacity
          onPress={() => setActiveTab('attendance')}
          style={{
            minHeight: 44,
            paddingHorizontal: 16,
            paddingVertical: 10,
            backgroundColor: attendanceStatus.needsClockOutReminder
              ? theme.danger
              : theme.primary,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Text
            style={{
              color: attendanceStatus.needsClockOutReminder
                ? '#FFFFFF'
                : theme.onPrimary,
              fontSize: 13,
              fontWeight: '900',
              textAlign: 'center',
            }}
          >
            {attendanceStatus.needsClockOutReminder
              ? '⚠️ Tu jornada sigue abierta. Toca para registrar salida.'
              : '⚠️ No has registrado tu entrada. Toca para ir a Asistencia.'}
          </Text>
        </TouchableOpacity>
      ) : null}

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
      <MainApp />
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
