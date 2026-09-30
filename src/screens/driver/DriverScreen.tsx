import React, {
  useCallback,
  useEffect,
  useState,
} from 'react';

import {
  ActivityIndicator,
  Alert,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import {
  PaymentModal,
} from '../../components/payment-modal';

import {
  useAuth,
} from '../../context/AuthContext';

import {
  useBusiness,
} from '../../context/BusinessContext';

import {
  completeDriverDelivery,
  DriverOrder,
  getDriverOrders,
  listenToDriverOrderChanges,
  registerDriverPayment,
  startDriverDelivery,
} from '../../services/driverService';

import {
  getLastPushNotificationResponse,
  isDeliveryReadyNotification,
  listenToDriverNotificationResponses,
  registerDriverPushNotifications,
} from '../../services/pushNotificationService';

import {
  PaymentMethod,
} from '../../types';

import {
  getOrderTrackingCode,
} from '../../Utils/orderTracking';

import {
  useCurrency,
} from '../../hooks/useCurrency';

export function DriverScreen() {
  const {
    formatCurrency,
  } = useCurrency();

  const {
    user,
    logout,
  } = useAuth();

  const {
    business,
    theme: businessTheme,
  } = useBusiness();

  const businessName =
    business?.identity.businessName ??
    'Dorian POS';

  const [
    orders,
    setOrders,
  ] = useState<DriverOrder[]>(
    [],
  );

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    refreshing,
    setRefreshing,
  ] = useState(false);

  const [
    processingOrderId,
    setProcessingOrderId,
  ] = useState<string | null>(
    null,
  );

  const [
    errorMessage,
    setErrorMessage,
  ] = useState('');

  const [
    paymentOrder,
    setPaymentOrder,
  ] = useState<DriverOrder | null>(
    null,
  );

  const [
    isProcessingPayment,
    setIsProcessingPayment,
  ] = useState(false);

  /*
   * ==========================================================
   * CARGAR ENTREGAS
   * ==========================================================
   */
  const loadOrders =
    useCallback(
      async (
        showLoading = false,
      ): Promise<void> => {
        try {
          if (
            showLoading
          ) {
            setLoading(
              true,
            );
          }

          setErrorMessage(
            '',
          );

          const result =
            await getDriverOrders();

          setOrders(
            result,
          );
        } catch (error) {
          console.error(
            '❌ Error cargando entregas:',
            error,
          );

          setErrorMessage(
            error instanceof Error
              ? error.message
              : 'No se pudieron cargar las entregas.',
          );
        } finally {
          if (
            showLoading
          ) {
            setLoading(
              false,
            );
          }
        }
      },
      [],
    );

  /*
   * ==========================================================
   * REGISTRO PUSH DEL REPARTIDOR
   * ==========================================================
   */
  useEffect(() => {
    if (
      !user?.id
    ) {
      return;
    }

    void registerDriverPushNotifications(
      user.id,
    );
  }, [
    user?.id,
  ]);

  /*
   * ==========================================================
   * CARGA INICIAL
   * ==========================================================
   */
  useEffect(() => {
    void loadOrders(
      true,
    );
  }, [
    loadOrders,
  ]);

  /*
   * ==========================================================
   * REALTIME
   * ==========================================================
   *
   * Cuando cambia una orden delivery,
   * volvemos a consultar el RPC seguro.
   */
  useEffect(() => {
    const unsubscribe =
      listenToDriverOrderChanges(
        () => {
          void loadOrders();
        },
      );

    return unsubscribe;
  }, [
    loadOrders,
  ]);

  /*
   * ==========================================================
   * TAP EN PUSH
   * ==========================================================
   */
  useEffect(() => {
    const subscription =
      listenToDriverNotificationResponses(
        () => {
          void loadOrders();
        },
      );

    /*
     * Si la app estaba completamente
     * cerrada y se abrió tocando el push.
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
            !isDeliveryReadyNotification(
              data,
            )
          ) {
            return;
          }

          await loadOrders();
        } catch (error) {
          console.error(
            '❌ Error leyendo push inicial del repartidor:',
            error,
          );
        }
      }
    )();

    return () => {
      subscription.remove();
    };
  }, [
    loadOrders,
  ]);

  /*
   * ==========================================================
   * REFRESH MANUAL
   * ==========================================================
   */
  const handleRefresh =
    async (): Promise<void> => {
      setRefreshing(
        true,
      );

      try {
        await loadOrders();
      } finally {
        setRefreshing(
          false,
        );
      }
    };

  /*
   * ==========================================================
   * TOMAR ENTREGA
   * ==========================================================
   */
  const handleStartDelivery =
    (
      order:
        DriverOrder,
    ): void => {
      Alert.alert(
        'Iniciar entrega',
        `¿Quieres tomar el pedido #${getOrderTrackingCode(
          order.id,
        )} de ${order.customerName}?`,
        [
          {
            text:
              'Cancelar',

            style:
              'cancel',
          },
          {
            text:
              'Tomar entrega',

            onPress:
              () => {
                void executeStartDelivery(
                  order,
                );
              },
          },
        ],
      );
    };

  const executeStartDelivery =
    async (
      order:
        DriverOrder,
    ): Promise<void> => {
      if (
        processingOrderId
      ) {
        return;
      }

      setProcessingOrderId(
        order.id,
      );

      try {
        await startDriverDelivery(
          order.id,
        );

        await loadOrders();
      } catch (error) {
        console.error(
          '❌ Error tomando entrega:',
          error,
        );

        Alert.alert(
          'No se pudo iniciar',
          error instanceof Error
            ? error.message
            : 'No se pudo iniciar la entrega.',
        );

        await loadOrders();
      } finally {
        setProcessingOrderId(
          null,
        );
      }
    };

  /*
   * ==========================================================
   * ABRIR PAGO
   * ==========================================================
   */
  const handleOpenPayment =
    (
      order:
        DriverOrder,
    ): void => {
      if (
        processingOrderId ||
        isProcessingPayment
      ) {
        return;
      }

      setPaymentOrder(
        order,
      );
    };

  /*
   * ==========================================================
   * CERRAR PAGO
   * ==========================================================
   */
  const handleClosePayment =
    (): void => {
      if (
        isProcessingPayment
      ) {
        return;
      }

      setPaymentOrder(
        null,
      );
    };

  /*
   * ==========================================================
   * COBRAR Y ENTREGAR
   * ==========================================================
   */
  const handleConfirmPayment =
    async (
      paymentMethod:
        PaymentMethod,

      amountReceived:
        number | null,
    ): Promise<void> => {
      if (
        !paymentOrder ||
        isProcessingPayment
      ) {
        return;
      }

      const order =
        paymentOrder;

      try {
        setIsProcessingPayment(
          true,
        );

        /*
         * PASO 1:
         * registrar pago.
         */
        await registerDriverPayment(
          order.id,
          paymentMethod,
          amountReceived,
        );

        /*
         * PASO 2:
         * marcar delivered.
         *
         * El RPC vuelve a verificar
         * que exista pago.
         */
        await completeDriverDelivery(
          order.id,
        );

        setPaymentOrder(
          null,
        );

        await loadOrders();

        Alert.alert(
          'Pedido entregado',
          'El pago y la entrega fueron registrados correctamente.',
        );
      } catch (error) {
        console.error(
          '❌ Error cobrando entrega:',
          error,
        );

        Alert.alert(
          'No se pudo completar',
          error instanceof Error
            ? error.message
            : 'No se pudo registrar el pago y completar la entrega.',
        );
      } finally {
        setIsProcessingPayment(
          false,
        );
      }
    };

  /*
   * ==========================================================
   * DIRECCIÓN
   * ==========================================================
   */
  const formatAddress =
    (
      order:
        DriverOrder,
    ): string => {
      const number =
        order.interiorNumber
          ? `${order.exteriorNumber} Int. ${order.interiorNumber}`
          : order.exteriorNumber;

      return [
        [
          order.street,
          number,
        ]
          .filter(Boolean)
          .join(' '),

        order.neighborhood
          ? `Col. ${order.neighborhood}`
          : '',

        order.postalCode
          ? `C.P. ${order.postalCode}`
          : '',
      ]
        .filter(Boolean)
        .join(', ');
    };

  /*
   * ==========================================================
   * DINERO
   * ==========================================================
   */
  /*
   * ==========================================================
   * FECHA
   * ==========================================================
   */
  const formatTime =
    (
      date:
        string,
    ): string => {
      try {
        return new Intl.DateTimeFormat(
          'es-MX',
          {
            hour:
              '2-digit',

            minute:
              '2-digit',

            day:
              '2-digit',

            month:
              '2-digit',
          },
        ).format(
          new Date(
            date,
          ),
        );
      } catch {
        return '';
      }
    };

  /*
   * ==========================================================
   * ENTREGA ACTIVA
   * ==========================================================
   */
  const activeDelivery =
    orders.find(
      (
        order,
      ) =>
        order.status ===
        'on_the_way',
    );

  /*
   * ==========================================================
   * PEDIDOS DISPONIBLES
   * ==========================================================
   */
  const availableOrders =
    orders.filter(
      (
        order,
      ) =>
        order.status ===
        'ready',
    );

  /*
   * ==========================================================
   * LOADING
   * ==========================================================
   */
  if (
    loading
  ) {
    return (
      <SafeAreaView
        style={{
          flex:
            1,

          backgroundColor:
            '#171717',
        }}
      >
        <View
          style={{
            flex:
              1,

            alignItems:
              'center',

            justifyContent:
              'center',
          }}
        >
          <ActivityIndicator
            size="large"
            color={businessTheme.primary}
          />

          <Text
            style={{
              color:
                '#FFFFFF',

              marginTop:
                12,

              fontWeight:
                '700',
            }}
          >
            Cargando entregas...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  /*
   * ==========================================================
   * RENDER
   * ==========================================================
   */
  return (
    <SafeAreaView
      style={{
        flex:
          1,

        backgroundColor:
          '#171717',
      }}
    >
      <View
        style={{
          flex:
            1,

          backgroundColor:
            '#171717',
        }}
      >
        {/*
         * ====================================================
         * HEADER
         * ====================================================
         */}
        <View
          style={{
            paddingHorizontal:
              18,

            paddingTop:
              14,

            paddingBottom:
              14,

            backgroundColor:
              '#202020',

            borderBottomWidth:
              1,

            borderBottomColor:
              '#333333',
          }}
        >
          <View
            style={{
              flexDirection:
                'row',

              alignItems:
                'center',

              justifyContent:
                'space-between',

              gap:
                12,
            }}
          >
            <View
              style={{
                flex:
                  1,
              }}
            >
              <Text
                style={{
                  color:
                    businessTheme.primary,

                  fontSize:
                    22,

                  fontWeight:
                    '900',
                }}
              >
                {businessName}
              </Text>

              <Text
                style={{
                  color:
                    '#FFFFFF',

                  fontSize:
                    15,

                  fontWeight:
                    '700',

                  marginTop:
                    3,
                }}
              >
                Repartidor
              </Text>

              <Text
                style={{
                  color:
                    '#AAAAAA',

                  fontSize:
                    12,

                  marginTop:
                    2,
                }}
                numberOfLines={
                  1
                }
              >
                {user?.fullName}
              </Text>
            </View>

            <TouchableOpacity
              onPress={() => {
                void logout();
              }}
              style={{
                minHeight:
                  42,

                paddingHorizontal:
                  14,

                borderRadius:
                  8,

                borderWidth:
                  1,

                borderColor:
                  '#555555',

                alignItems:
                  'center',

                justifyContent:
                  'center',
              }}
            >
              <Text
                style={{
                  color:
                    '#FFFFFF',

                  fontSize:
                    13,

                  fontWeight:
                    '800',
                }}
              >
                Salir
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/*
         * ====================================================
         * CONTENIDO
         * ====================================================
         */}
        <ScrollView
          style={{
            flex:
              1,
          }}
          contentContainerStyle={{
            padding:
              18,

            paddingBottom:
              40,
          }}
          refreshControl={
            <RefreshControl
              refreshing={
                refreshing
              }
              onRefresh={
                handleRefresh
              }
              tintColor={businessTheme.primary}
            />
          }
        >
          <Text
            style={{
              color:
                '#FFFFFF',

              fontSize:
                24,

              fontWeight:
                '900',
            }}
          >
            Entregas
          </Text>

          <Text
            style={{
              color:
                '#AAAAAA',

              fontSize:
                14,

              marginTop:
                5,

              marginBottom:
                18,
            }}
          >
            Los pedidos se actualizan
            automáticamente.
          </Text>

          {/*
           * ==================================================
           * ERROR
           * ==================================================
           */}
          {errorMessage ? (
            <View
              style={{
                backgroundColor:
                  '#351C1C',

                borderWidth:
                  1,

                borderColor:
                  '#7A3030',

                borderRadius:
                  10,

                padding:
                  14,

                marginBottom:
                  18,
              }}
            >
              <Text
                style={{
                  color:
                    '#FF8A80',

                  fontWeight:
                    '800',
                }}
              >
                {errorMessage}
              </Text>

              <TouchableOpacity
                onPress={() => {
                  void loadOrders(
                    true,
                  );
                }}
                style={{
                  marginTop:
                    12,

                  minHeight:
                    40,

                  borderRadius:
                    8,

                  backgroundColor:
                    businessTheme.primary,

                  alignItems:
                    'center',

                  justifyContent:
                    'center',
                }}
              >
                <Text
                  style={{
                    color:
                      '#171717',

                    fontWeight:
                      '900',
                  }}
                >
                  Reintentar
                </Text>
              </TouchableOpacity>
            </View>
          ) : null}

          {/*
           * ==================================================
           * ENTREGA EN CURSO
           * ==================================================
           */}
          {activeDelivery ? (
            <>
              <Text
                style={{
                  color:
                    businessTheme.primary,

                  fontSize:
                    16,

                  fontWeight:
                    '900',

                  marginBottom:
                    10,
                }}
              >
                ENTREGA EN CURSO
              </Text>

              <DriverOrderCard
                order={
                  activeDelivery
                }
                processing={
                  processingOrderId ===
                  activeDelivery.id
                }
                address={
                  formatAddress(
                    activeDelivery,
                  )
                }
                formattedTotal={
                  formatCurrency(
                    activeDelivery.total,
                  )
                }
                formattedTime={
                  formatTime(
                    activeDelivery.createdAt,
                  )
                }
                onAction={() =>
                  handleOpenPayment(
                    activeDelivery,
                  )
                }
              />
            </>
          ) : null}

          {/*
           * ==================================================
           * PEDIDOS DISPONIBLES
           * ==================================================
           */}
          {availableOrders.length >
          0 ? (
            <>
              <Text
                style={{
                  color:
                    '#FFFFFF',

                  fontSize:
                    16,

                  fontWeight:
                    '900',

                  marginTop:
                    activeDelivery
                      ? 22
                      : 0,

                  marginBottom:
                    10,
                }}
              >
                PEDIDOS LISTOS
              </Text>

              {availableOrders.map(
                (
                  order,
                ) => (
                  <DriverOrderCard
                    key={
                      order.id
                    }
                    order={
                      order
                    }
                    processing={
                      processingOrderId ===
                      order.id
                    }
                    address={
                      formatAddress(
                        order,
                      )
                    }
                    formattedTotal={
                      formatCurrency(
                        order.total,
                      )
                    }
                    formattedTime={
                      formatTime(
                        order.createdAt,
                      )
                    }
                    onAction={() =>
                      handleStartDelivery(
                        order,
                      )
                    }
                  />
                ),
              )}
            </>
          ) : null}

          {/*
           * ==================================================
           * SIN ENTREGAS
           * ==================================================
           */}
          {!activeDelivery &&
          availableOrders.length ===
            0 &&
          !errorMessage ? (
            <View
              style={{
                marginTop:
                  10,

                padding:
                  24,

                borderRadius:
                  12,

                backgroundColor:
                  '#222222',

                borderWidth:
                  1,

                borderColor:
                  '#333333',

                alignItems:
                  'center',
              }}
            >
              <Text
                style={{
                  fontSize:
                    42,
                }}
              >
                🛵
              </Text>

              <Text
                style={{
                  color:
                    '#FFFFFF',

                  fontSize:
                    17,

                  fontWeight:
                    '800',

                  marginTop:
                    12,

                  textAlign:
                    'center',
                }}
              >
                Sin entregas pendientes
              </Text>

              <Text
                style={{
                  color:
                    '#888888',

                  fontSize:
                    13,

                  marginTop:
                    6,

                  textAlign:
                    'center',

                  lineHeight:
                    19,
                }}
              >
                Cuando Cocina marque un
                pedido a domicilio como
                listo, aparecerá aquí.
              </Text>
            </View>
          ) : null}
        </ScrollView>

        {/*
         * ====================================================
         * PAYMENT MODAL
         * ====================================================
         */}
        <PaymentModal
          visible={
            paymentOrder !==
            null
          }
          totalAmount={
            paymentOrder
              ? paymentOrder.total
              : 0
          }
          isProcessing={
            isProcessingPayment
          }
          onClose={
            handleClosePayment
          }
          onConfirm={
            handleConfirmPayment
          }
        />
      </View>
    </SafeAreaView>
  );
}

/*
 * ============================================================
 * TARJETA
 * ============================================================
 */

interface DriverOrderCardProps {
  order:
    DriverOrder;

  processing:
    boolean;

  address:
    string;

  formattedTotal:
    string;

  formattedTime:
    string;

  onAction:
    () => void;
}

function DriverOrderCard({
  order,
  processing,
  address,
  formattedTotal,
  formattedTime,
  onAction,
}: DriverOrderCardProps) {
  const { theme: businessTheme } = useBusiness();
  const isOnTheWay =
    order.status ===
    'on_the_way';

  const trackingCode =
    getOrderTrackingCode(
      order.id,
    );

  return (
    <View
      style={{
        backgroundColor:
          '#222222',

        borderWidth:
          1,

        borderColor:
          isOnTheWay
            ? businessTheme.primary
            : '#3B3B3B',

        borderRadius:
          12,

        padding:
          16,

        marginBottom:
          14,
      }}
    >
      <View
        style={{
          flexDirection:
            'row',

          justifyContent:
            'space-between',

          alignItems:
            'flex-start',

          gap:
            12,
        }}
      >
        <View
          style={{
            flex:
              1,
          }}
        >
          <Text
            style={{
              color:
                '#FFFFFF',

              fontSize:
                19,

              fontWeight:
                '900',
            }}
          >
            {order.customerName}
          </Text>

          <Text
            style={{
              color:
                businessTheme.primary,

              fontSize:
                14,

              fontWeight:
                '900',

              marginTop:
                4,
            }}
          >
            Pedido #{trackingCode}
          </Text>

          <Text
            style={{
              color:
                '#8F8F8F',

              fontSize:
                12,

              marginTop:
                4,
            }}
          >
            {formattedTime}
          </Text>
        </View>

        <View
          style={{
            borderRadius:
              20,

            paddingHorizontal:
              10,

            paddingVertical:
              5,

            backgroundColor:
              isOnTheWay
                ? businessTheme.primary
                : '#333333',
          }}
        >
          <Text
            style={{
              color:
                isOnTheWay
                  ? '#171717'
                  : '#FFFFFF',

              fontSize:
                11,

              fontWeight:
                '900',
            }}
          >
            {isOnTheWay
              ? 'EN CAMINO'
              : 'LISTO'}
          </Text>
        </View>
      </View>

      {order.customerPhone ? (
        <InfoRow
          label="Teléfono"
          value={
            order.customerPhone
          }
        />
      ) : null}

      <InfoRow
        label="Dirección"
        value={
          address ||
          'Sin dirección'
        }
      />

      {order.deliveryReferences ? (
        <InfoRow
          label="Referencias"
          value={
            order.deliveryReferences
          }
        />
      ) : null}

      {order.deliveryZoneName ? (
        <InfoRow
          label="Zona"
          value={
            order.deliveryDistanceKm !==
            null
              ? `${order.deliveryZoneName} · ${order.deliveryDistanceKm.toFixed(
                  2,
                )} km`
              : order.deliveryZoneName
          }
        />
      ) : null}

      <View
        style={{
          marginTop:
            16,

          paddingTop:
            14,

          borderTopWidth:
            1,

          borderTopColor:
            '#383838',
        }}
      >
        <Text
          style={{
            color:
              '#AAAAAA',

            fontSize:
              12,

            fontWeight:
              '700',
          }}
        >
          TOTAL A COBRAR
        </Text>

        <Text
          style={{
            color:
              businessTheme.primary,

            fontSize:
              28,

            fontWeight:
              '900',

            marginTop:
              2,
          }}
        >
          {formattedTotal}
        </Text>
      </View>

      <TouchableOpacity
        disabled={
          processing
        }
        onPress={
          onAction
        }
        style={{
          marginTop:
            16,

          minHeight:
            50,

          borderRadius:
            9,

          backgroundColor:
            processing
              ? '#555555'
              : isOnTheWay
                ? '#44C767'
                : businessTheme.primary,

          alignItems:
            'center',

          justifyContent:
            'center',

          paddingHorizontal:
            14,
        }}
      >
        {processing ? (
          <ActivityIndicator
            color="#FFFFFF"
          />
        ) : (
          <Text
            style={{
              color:
                isOnTheWay
                  ? '#FFFFFF'
                  : '#171717',

              fontSize:
                15,

              fontWeight:
                '900',
            }}
          >
            {isOnTheWay
              ? '💵 Cobrar / Entregar'
              : '🛵 Tomar entrega'}
          </Text>
        )}
      </TouchableOpacity>
    </View>
  );
}

/*
 * ============================================================
 * INFO ROW
 * ============================================================
 */

interface InfoRowProps {
  label:
    string;

  value:
    string;
}

function InfoRow({
  label,
  value,
}: InfoRowProps) {
  return (
    <View
      style={{
        marginTop:
          14,
      }}
    >
      <Text
        style={{
          color:
            '#888888',

          fontSize:
            11,

          fontWeight:
            '800',

          textTransform:
            'uppercase',
        }}
      >
        {label}
      </Text>

      <Text
        style={{
          color:
            '#FFFFFF',

          fontSize:
            14,

          fontWeight:
            '600',

          marginTop:
            3,

          lineHeight:
            20,
        }}
      >
        {value}
      </Text>
    </View>
  );
}