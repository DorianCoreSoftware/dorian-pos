import React, {
  useState,
} from 'react';

import {
  Alert,
  FlatList,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import {
  PaymentModal,
} from '../../components/payment-modal';

import {
  fetchOrderPaymentByOrderId,
} from '../../repositories/PaymentRepository';

import {
  cancelOrder,
  deliverOrder,
  markOrderReady,
  startPreparingOrder,
} from '../../services/orderService';

import {
  registerOrderPayment,
} from '../../services/paymentService';

import {
  getOrCreateOrderPromoCoupon,
  PromoCoupon,
} from '../../services/promoService';

import {
  printOrderTicket,
} from '../../services/printerService';

import {
  Cart,
  CartItem,
  KitchenOrder,
  KitchenOrderItem,
  KitchenOrderItemComponent,
  PaymentMethod,
  Product,
} from '../../types';

import {
  isDeliveryProduct,
} from '../../Utils/delivery';

import {
  getOrderTrackingCode,
} from '../../Utils/orderTracking';



import {
  styles,
} from '../../../App.styles';
import { getModifierGroupLabel } from '../../Utils/modifierGroup';

interface KitchenProps {
  pendingOrders:
  KitchenOrder[];

  setPendingOrders:
  React.Dispatch<
    React.SetStateAction<
      KitchenOrder[]
    >
  >;

  editingOrderId:
  string | null;

  setEditingOrderId:
  React.Dispatch<
    React.SetStateAction<
      string | null
    >
  >;

  setCart:
  React.Dispatch<
    React.SetStateAction<
      Cart
    >
  >;

  setActiveTab: (
    tab:
      | 'pos'
      | 'kitchen',
  ) => void;
}

export function KitchenScreen({
  pendingOrders,
  setPendingOrders,
  editingOrderId,
  setEditingOrderId,
  setCart,
  setActiveTab,
}: KitchenProps) {
  const [
    paymentOrder,
    setPaymentOrder,
  ] =
    useState<KitchenOrder | null>(
      null,
    );

  const [
    isProcessingPayment,
    setIsProcessingPayment,
  ] =
    useState(false);

  const handleDeliverPaidOrder =
    async (
      order: KitchenOrder,
    ): Promise<void> => {
      try {
        await deliverOrder(
          order.id,
        );

        removeOrderFromPendingList(
          order.id,
        );

        if (
          editingOrderId ===
          order.id
        ) {
          clearEditingOrder();
        }
      } catch (error) {
        console.error(
          'Error al entregar la orden pagada:',
          error,
        );

        Alert.alert(
          'Error',
          error instanceof Error
            ? error.message
            : 'No se pudo entregar la orden.',
        );
      }
    };

  const handleOpenPayment =
    async (
      order: KitchenOrder,
    ): Promise<void> => {
      try {
        const existingPayment =
          await fetchOrderPaymentByOrderId(
            order.id,
          );

        if (existingPayment) {
          Alert.alert(
            'Orden ya pagada',

            existingPayment
              .paymentMethod ===
              'cash'
              ? `Esta orden ya fue pagada en efectivo.\n\nRecibido: $${(
                existingPayment
                  .amountReceived ??
                0
              ).toFixed(
                2,
              )}\nCambio: $${(
                existingPayment
                  .changeAmount ??
                0
              ).toFixed(
                2,
              )}`
              : 'Esta orden ya fue pagada con tarjeta.',

            [
              {
                text:
                  'Cancelar',

                style:
                  'cancel',
              },
              {
                text:
                  'Entregar',

                onPress:
                  () => {
                    void handleDeliverPaidOrder(
                      order,
                    );
                  },
              },
            ],
          );

          return;
        }

        setPaymentOrder(
          order,
        );
      } catch (error) {
        console.error(
          'Error al consultar el pago:',
          error,
        );

        Alert.alert(
          'Error',
          error instanceof Error
            ? error.message
            : 'No se pudo consultar el estado del pago.',
        );
      }
    };

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

      const orderToPay =
        paymentOrder;

      try {
        setIsProcessingPayment(
          true,
        );

        try {
          await registerOrderPayment(
            {
              orderId:
                orderToPay.id,

              paymentMethod,

              totalAmount:
                Number(
                  orderToPay.total,
                ),

              amountReceived,
            },
          );
        } catch (error) {
          console.error(
            'Error al registrar el pago:',
            error,
          );

          Alert.alert(
            'Error al cobrar',
            error instanceof Error
              ? error.message
              : 'No se pudo registrar el pago.',
          );

          return;
        }

        let promoCoupon:
          PromoCoupon | null =
          null;

        try {
          promoCoupon =
            await getOrCreateOrderPromoCoupon(
              orderToPay.id,
            );

          if (promoCoupon) {
            console.log(
              'Cupón promocional:',
              promoCoupon,
            );
          }
        } catch (error) {
          console.error(
            'Pago registrado, pero no se pudo generar la promoción:',
            error,
          );
        }

        try {
          await printOrderTicket({
            order:
              orderToPay,

            paymentMethod,

            amountReceived,

            promoCoupon,
          });
        } catch (error) {
          console.error(
            'Pago registrado, pero falló la impresión del ticket:',
            error,
          );

          Alert.alert(
            'Pago registrado',
            'El cobro se guardó correctamente, pero no se pudo imprimir el ticket.\n\nPuedes continuar con la entrega.',
          );
        }

        try {
          await deliverOrder(
            orderToPay.id,
          );
        } catch (error) {
          console.error(
            'Pago registrado, pero no se pudo entregar la orden:',
            error,
          );

          setPaymentOrder(
            null,
          );

          Alert.alert(
            'Pago registrado',
            'El pago se guardó correctamente, pero no se pudo marcar la orden como entregada.\n\nLa orden seguirá apareciendo como pendiente. Presiona "Cobrar / Entregar" nuevamente para completar la entrega.',
          );

          return;
        }

        removeOrderFromPendingList(
          orderToPay.id,
        );

        if (
          editingOrderId ===
          orderToPay.id
        ) {
          clearEditingOrder();
        }

        setPaymentOrder(
          null,
        );
      } finally {
        setIsProcessingPayment(
          false,
        );
      }
    };

  const updateOrderInPendingList =
    (
      orderId: string,
      status: KitchenOrder['status'],
    ): void => {
      setPendingOrders(
        (
          currentOrders,
        ) =>
          currentOrders.map(
            (
              order,
            ) =>
              order.id ===
                orderId
                ? {
                  ...order,
                  status,
                }
                : order,
          ),
      );
    };

  const handleAdvanceOrderStatus =
    async (
      order: KitchenOrder,
    ): Promise<void> => {
      try {
        if (
          order.status ===
          'pending'
        ) {
          await startPreparingOrder(
            order.id,
          );

          updateOrderInPendingList(
            order.id,
            'preparing',
          );

          return;
        }

        if (
          order.status ===
          'preparing'
        ) {
          await markOrderReady(
            order.id,
          );

          updateOrderInPendingList(
            order.id,
            'ready',
          );

          return;
        }
      } catch (error) {
        console.error(
          'Error al actualizar el estado de la orden:',
          error,
        );

        Alert.alert(
          'Error',
          error instanceof Error
            ? error.message
            : 'No se pudo actualizar el estado del pedido.',
        );
      }
    };

  const getOrderStatusLabel =
    (
      order: KitchenOrder,
    ): string => {
      switch (
      order.status
      ) {
        case 'pending':
          return 'PEDIDO RECIBIDO';

        case 'preparing':
          return 'EN PREPARACIÓN';

        case 'ready':
          return order.fulfillmentType ===
            'delivery'
            ? 'LISTO PARA REPARTO'
            : 'LISTO PARA RECOGER';

        case 'on_the_way':
          return 'EN CAMINO';

        case 'delivered':
          return 'ENTREGADO';

        case 'cancelled':
          return 'CANCELADO';

        default:
          return String(
            order.status,
          ).toUpperCase();
      }
    };

  const getPrimaryActionLabel =
    (
      order: KitchenOrder,
    ): string => {
      if (
        order.status ===
        'pending'
      ) {
        return 'Iniciar preparación';
      }

      if (
        order.status ===
        'preparing'
      ) {
        return order.fulfillmentType ===
          'delivery'
          ? 'Listo para reparto'
          : 'Listo para recoger';
      }

      return 'Cobrar / Entregar';
    };

  const handleCancelOrderPrompt =
    (
      orderId: string,
    ): void => {
      const shortId =
        getOrderTrackingCode(
          orderId,
        );

      Alert.alert(
        '🚨 Cancelar pedido',
        `¿Seguro que deseas cancelar la orden #${shortId}?`,
        [
          {
            text:
              'No',

            style:
              'cancel',
          },
          {
            text:
              'Sí, cancelar',

            style:
              'destructive',

            onPress:
              () => {
                void executeCancelOrder(
                  orderId,
                );
              },
          },
        ],
      );
    };

  const executeCancelOrder =
    async (
      orderId: string,
    ): Promise<void> => {
      try {
        await cancelOrder(
          orderId,
        );

        removeOrderFromPendingList(
          orderId,
        );

        if (
          editingOrderId ===
          orderId
        ) {
          clearEditingOrder();
        }
      } catch (error) {
        console.error(
          'Error al cancelar la orden:',
          error,
        );

        Alert.alert(
          '❌ Error',
          error instanceof Error
            ? error.message
            : 'No se pudo cancelar el pedido.',
        );
      }
    };

  const handleEditOrder = (
    order: KitchenOrder,
  ): void => {
    const groupedItems:
      Record<
        string,
        CartItem
      > = {};

    order.order_items.forEach(
      (
        line,
      ) => {
        const cleanNotes =
          (
            line.notes ??
            ''
          ).trim();

        const modifiers =
          line.modifiers ??
          [];

        const components =
          line.components ??
          [];

        const modifierIdentifier =
          modifiers
            .map(
              (
                modifier,
              ) =>
                modifier.id,
            )
            .sort()
            .join(
              ',',
            );

        const componentIdentifier =
          components
            .map(
              (
                component,
              ) => {
                const componentModifiers =
                  component.modifiers ??
                  [];

                return [
                  component.component_type,

                  component.product_id,

                  (
                    component.notes ??
                    ''
                  ).trim(),

                  componentModifiers
                    .map(
                      (
                        modifier,
                      ) =>
                        modifier.id,
                    )
                    .sort()
                    .join(
                      ',',
                    ),
                ].join(
                  ':',
                );
              },
            )
            .sort()
            .join(
              '|',
            );

        const product =
          createProductFromOrderItem(
            line,
          );

        const isDeliveryItem =
          isDeliveryProduct(
            product,
          );

        const uniqueItemId =
          isDeliveryItem
            ? `${product.id}-delivery`
            : [
              line.product_id,
              cleanNotes,
              modifierIdentifier,
              componentIdentifier,
            ].join(
              '-',
            );

        const existingItem =
          groupedItems[
          uniqueItemId
          ];

        if (
          existingItem &&
          !isDeliveryItem
        ) {
          existingItem.quantity +=
            line.quantity;

          return;
        }

        groupedItems[
          uniqueItemId
        ] = {
          id:
            uniqueItemId,

          product,

          quantity:
            isDeliveryItem
              ? 1
              : line.quantity,

          notes:
            cleanNotes,

          selectedModifiers:
            modifiers.map(
              (
                modifier,
              ) => ({
                ...modifier,
              }),
            ),

          comboComponents:
            components.length >
              0
              ? components.map(
                (
                  component,
                ) => ({
                  slotId:
                    component
                      .slot_id ??
                    component.id,

                  type:
                    component.component_type,

                  label:
                    component.label,

                  product:
                    createProductFromComponent(
                      component,
                    ),

                  quantity:
                    component.quantity,

                  notes:
                    (
                      component.notes ??
                      ''
                    ).trim(),

                  selectedModifiers:
                    (
                      component.modifiers ??
                      []
                    ).map(
                      (
                        modifier,
                      ) => ({
                        ...modifier,
                      }),
                    ),
                }),
              )
              : undefined,

          deliveryDetails:
            isDeliveryItem &&
              order.deliveryDetails
              ? {
                customerName:
                  order
                    .deliveryDetails
                    .customerName,

                phone:
                  order
                    .deliveryDetails
                    .phone,

                street:
                  order
                    .deliveryDetails
                    .street,

                exteriorNumber:
                  order
                    .deliveryDetails
                    .exteriorNumber,

                interiorNumber:
                  order
                    .deliveryDetails
                    .interiorNumber ??
                  '',

                neighborhood:
                  order
                    .deliveryDetails
                    .neighborhood,

                postalCode:
                  order
                    .deliveryDetails
                    .postalCode ??
                  '',

                deliveryReferences:
                  order
                    .deliveryDetails
                    .deliveryReferences ??
                  '',

                latitude:
                  order
                    .deliveryDetails
                    .latitude,

                longitude:
                  order
                    .deliveryDetails
                    .longitude,
              }
              : undefined,
        };
      },
    );

    setCart(
      Object.values(
        groupedItems,
      ),
    );

    setEditingOrderId(
      order.id,
    );

    setActiveTab(
      'pos',
    );
  };

  const removeOrderFromPendingList =
    (
      orderId: string,
    ): void => {
      setPendingOrders(
        (
          currentOrders,
        ) =>
          currentOrders.filter(
            (
              order,
            ) =>
              order.id !==
              orderId,
          ),
      );
    };

  const clearEditingOrder =
    (): void => {
      setCart(
        [],
      );

      setEditingOrderId(
        null,
      );
    };

  const renderComboComponent = (
    component:
      KitchenOrderItemComponent,
  ) => {
    const modifiers =
      component.modifiers ??
      [];

    return (
      <View
        key={
          component.id
        }
        style={{
          marginTop:
            5,

          paddingLeft:
            14,
        }}
      >
        <Text
          style={{
            color:
              '#FFFFFF',

            fontSize:
              13,

            fontWeight:
              '600',
          }}
        >
          ↳{' '}
          {component.quantity}
          x{' '}
          {component.products
            ?.name ??
            component.label}
        </Text>

        {modifiers.map(
          (
            modifier,
          ) => (
            <Text
              key={`${component.id}-${modifier.id}`}
              style={{
                color:
                  '#FFBF00',

                fontSize:
                  12,

                fontWeight:
                  '600',

                paddingLeft:
                  12,

                marginTop:
                  2,
              }}
            >
              •{' '}
              {modifier.name}

              {getModifierGroupLabel(
                modifier,
              )
                ? ` (${getModifierGroupLabel(
                  modifier,
                )})`
                : ''}
            </Text>
          ),
        )}

        {component.notes ? (
          <Text
            style={{
              ...styles.notesText,

              paddingLeft:
                12,
            }}
          >
            ⚠️{' '}
            {component.notes}
          </Text>
        ) : null}
      </View>
    );
  };

  const renderOrderItem = (
    line:
      KitchenOrderItem,
  ) => {
    const modifiers =
      line.modifiers ??
      [];

    const components =
      line.components ??
      [];

    return (
      <View
        key={
          line.id
        }
        style={
          styles.itemRow
        }
      >
        <Text
          style={
            styles.itemText
          }
        >
          {line.quantity}
          x{' '}
          {line.products
            ?.name ??
            'Producto'}
        </Text>

        {modifiers.length >
          0 && (
            <View
              style={{
                paddingLeft:
                  12,

                marginVertical:
                  4,
              }}
            >
              {modifiers.map(
                (
                  modifier,
                ) => (
                  <Text
                    key={
                      modifier.id
                    }
                    style={{
                      color:
                        '#FFBF00',

                      fontSize:
                        13,

                      fontWeight:
                        '600',
                    }}
                  >
                    •{' '}
                    {modifier.name}

                    {getModifierGroupLabel(
                      modifier,
                    )
                      ? ` (${getModifierGroupLabel(
                        modifier,
                      )})`
                      : ''}
                  </Text>
                ),
              )}
            </View>
          )}

        {components.length >
          0 && (
            <View
              style={{
                marginTop:
                  5,

                marginBottom:
                  4,
              }}
            >
              <Text
                style={{
                  color:
                    '#AFAFAF',

                  fontSize:
                    12,

                  fontWeight:
                    '700',

                  paddingLeft:
                    12,

                  textTransform:
                    'uppercase',
                }}
              >
                Detalle del combo
              </Text>

              {components.map(
                renderComboComponent,
              )}
            </View>
          )}

        {line.notes ? (
          <Text
            style={
              styles.notesText
            }
          >
            ⚠️{' '}
            {line.notes}
          </Text>
        ) : null}
      </View>
    );
  };

  const renderCustomerDetails = (
    order:
      KitchenOrder,
  ) => {
    if (
      order.orderSource !==
      'web' ||
      order.fulfillmentType ===
      'delivery'
    ) {
      return null;
    }

    if (
      !order.customerName &&
      !order.customerPhone
    ) {
      return null;
    }

    return (
      <View
        style={{
          marginBottom: 12,
          padding: 10,
          borderRadius: 8,
          backgroundColor:
            '#202020',
          borderWidth: 1,
          borderColor:
            '#FFB000',
        }}
      >
        <Text
          style={{
            color:
              '#FFB000',
            fontWeight:
              'bold',
            fontSize:
              13,
            marginBottom:
              6,
          }}
        >
          👤 DATOS DEL CLIENTE
        </Text>

        {order.customerName ? (
          <Text
            style={{
              color:
                '#FFF',
              marginBottom:
                2,
            }}
          >
            👤{' '}
            {
              order.customerName
            }
          </Text>
        ) : null}

        {order.customerPhone ? (
          <Text
            style={{
              color:
                '#FFF',
            }}
          >
            📞{' '}
            {
              order.customerPhone
            }
          </Text>
        ) : null}
      </View>
    );
  };

  const renderDeliveryDetails =
    (
      order:
        KitchenOrder,
    ) => {
      const delivery =
        order.deliveryDetails;

      if (!delivery) {
        return null;
      }

      return (
        <View
          style={{
            marginBottom:
              14,

            padding:
              12,

            borderRadius:
              8,

            backgroundColor:
              '#202020',

            borderWidth:
              1,

            borderColor:
              '#4CAF50',
          }}
        >
          <Text
            style={{
              color:
                '#4CAF50',

              fontWeight:
                'bold',

              fontSize:
                16,

              marginBottom:
                8,
            }}
          >
            🏠 PEDIDO A
            DOMICILIO
          </Text>

          <Text
            style={{
              color:
                '#FFF',

              marginBottom:
                2,
            }}
          >
            👤{' '}
            {
              delivery.customerName
            }
          </Text>

          <Text
            style={{
              color:
                '#FFF',

              marginBottom:
                8,
            }}
          >
            📞{' '}
            {delivery.phone}
          </Text>

          <Text
            style={{
              color:
                '#FFF',
            }}
          >
            📍{' '}
            {delivery.street}{' '}
            #
            {
              delivery.exteriorNumber
            }

            {delivery.interiorNumber
              ? ` Int. ${delivery.interiorNumber}`
              : ''}
          </Text>

          <Text
            style={{
              color:
                '#FFF',

              marginBottom:
                8,
            }}
          >
            {
              delivery.neighborhood
            }

            {delivery.postalCode
              ? ` C.P. ${delivery.postalCode}`
              : ''}
          </Text>

          {delivery.deliveryReferences ? (
            <Text
              style={{
                color:
                  '#FFD54F',
              }}
            >
              🚩{' '}
              {
                delivery.deliveryReferences
              }
            </Text>
          ) : null}
        </View>
      );
    };

  const renderDriverDetails =
    (
      order:
        KitchenOrder,
    ) => {
      if (
        order.fulfillmentType !==
        'delivery' ||
        order.status !==
        'on_the_way' ||
        !order.driverName
      ) {
        return null;
      }

      return (
        <View
          style={{
            alignSelf:
              'flex-start',

            backgroundColor:
              '#182C20',

            borderWidth:
              1,

            borderColor:
              '#4CAF50',

            borderRadius:
              8,

            paddingHorizontal:
              10,

            paddingVertical:
              7,

            marginTop:
              4,

            marginBottom:
              8,
          }}
        >
          <Text
            style={{
              color:
                '#81C784',

              fontSize:
                11,

              fontWeight:
                '800',
            }}
          >
            🛵 REPARTIDOR
          </Text>

          <Text
            style={{
              color:
                '#FFFFFF',

              fontSize:
                13,

              fontWeight:
                '700',

              marginTop:
                2,
            }}
          >
            {order.driverName}
          </Text>
        </View>
      );
    };

  const renderOrder = ({
    item,
  }: {
    item: KitchenOrder;
  }) => (
    <View style={styles.orderCard}>
      <View style={styles.cardHeader}>
        <Text style={styles.orderId}>
          Pedido #
          {getOrderTrackingCode(
            item.id,
          )}
        </Text>

        <Text style={styles.orderTotal}>
          $
          {Number(
            item.total,
          ).toFixed(2)}
        </Text>
      </View>

      <View
        style={{
          alignSelf: 'flex-start',

          backgroundColor:
            item.orderSource ===
              'web'
              ? '#2B250C'
              : '#262626',

          borderWidth: 1,

          borderColor:
            item.orderSource ===
              'web'
              ? '#FFB000'
              : '#454545',

          borderRadius: 8,

          paddingHorizontal: 10,
          paddingVertical: 5,

          marginTop: 8,
          marginBottom: 4,
        }}
      >
        <Text
          style={{
            color:
              item.orderSource ===
                'web'
                ? '#FFB000'
                : '#D0D0D0',

            fontSize: 12,
            fontWeight: '800',
          }}
        >
          {item.orderSource ===
            'web'
            ? '🌐 WEB'
            : '🧾 POS'}
          {' · '}
          {item.fulfillmentType ===
            'delivery'
            ? 'DOMICILIO'
            : 'RECOGER'}
        </Text>
      </View>

      <View
        style={{
          alignSelf: 'flex-start',
          backgroundColor: '#202020',
          borderWidth: 1,
          borderColor: '#666',
          borderRadius: 8,
          paddingHorizontal: 10,
          paddingVertical: 5,
          marginTop: 4,
          marginBottom: 6,
        }}
      >
        <Text
          style={{
            color: '#FFFFFF',
            fontSize: 12,
            fontWeight: '800',
          }}
        >
          ESTADO ·{' '}
          {getOrderStatusLabel(
            item,
          )}
        </Text>
      </View>

      {renderDriverDetails(
        item,
      )}

      <Text style={styles.timeText}>
        Ingresó:{' '}
        {new Date(
          item.created_at,
        ).toLocaleTimeString(
          [],
          {
            hour: '2-digit',
            minute: '2-digit',
          },
        )}
      </Text>

      <ScrollView
        style={{
          flex: 1,
        }}
        contentContainerStyle={{
          paddingBottom: 12,
        }}
        showsVerticalScrollIndicator
        nestedScrollEnabled
      >
        {renderCustomerDetails(
          item,
        )}

        {renderDeliveryDetails(
          item,
        )}

        <View
          style={
            styles.itemsContainer
          }
        >
          {item.order_items.map(
            renderOrderItem,
          )}
        </View>
      </ScrollView>

      <View
        style={
          styles.actionBlock
        }
      >
        <View
          style={
            styles.actionButtonsRow
          }
        >
          <TouchableOpacity
            style={
              styles.editOrderButton
            }
            onPress={() =>
              handleEditOrder(
                item,
              )
            }
          >
            <Text
              style={
                styles.editOrderButtonText
              }
            >
              Editar
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={
              styles.deliverButton
            }
            onPress={() => {
              if (
                item.status ===
                'ready' ||
                item.status ===
                'on_the_way'
              ) {
                void handleOpenPayment(
                  item,
                );

                return;
              }

              void handleAdvanceOrderStatus(
                item,
              );
            }}
          >
            <Text
              style={
                styles.deliverButtonText
              }
            >
              {getPrimaryActionLabel(
                item,
              )}
            </Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={
            styles.cancelOrderButton
          }
          onPress={() =>
            handleCancelOrderPrompt(
              item.id,
            )
          }
        >
          <Text
            style={
              styles.cancelOrderButtonText
            }
          >
            ❌ Cancelar pedido
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  if (
    pendingOrders.length ===
    0
  ) {
    return (
      <View
        style={
          styles.emptyKitchen
        }
      >
        <Text
          style={
            styles.emptyKitchenText
          }
        >
          🎉 ¡No hay órdenes
          pendientes! Todo
          despachado.
        </Text>
      </View>
    );
  }

  return (
    <View
      style={
        styles.kitchenContainer
      }
    >
      <FlatList
        data={
          pendingOrders
        }
        keyExtractor={(
          item,
        ) =>
          item.id
        }
        horizontal
        contentContainerStyle={{
          paddingHorizontal:
            16,

          paddingVertical:
            20,
        }}
        renderItem={
          renderOrder
        }
      />

      <PaymentModal
        visible={
          paymentOrder !==
          null
        }
        totalAmount={
          paymentOrder
            ? Number(
              paymentOrder.total,
            )
            : 0
        }
        isProcessing={
          isProcessingPayment
        }
        onClose={
          handleClosePayment
        }
        onConfirm={(
          paymentMethod,
          amountReceived,
        ) => {
          void handleConfirmPayment(
            paymentMethod,
            amountReceived,
          );
        }}
      />
    </View>
  );
}

function createProductFromOrderItem(
  line:
    KitchenOrderItem,
): Product {
  if (
    line.products
  ) {
    return {
      ...line.products,

      price:
        Number(
          line.price_at_purchase ??
          line.products
            .price,
        ),
    };
  }

  return {
    id:
      line.product_id,

    name:
      'Producto',

    price:
      Number(
        line.price_at_purchase,
      ),

    category_id:
      '',

    description:
      null,

    is_active:
      true,

    created_at:
      '',

    image_url:
      null,

    is_available:
      true,
  };
}

function createProductFromComponent(
  component:
    KitchenOrderItemComponent,
): Product {
  if (
    component.products
  ) {
    return {
      ...component.products,

      price:
        Number(
          component.products
            .price,
        ),
    };
  }

  return {
    id:
      component.product_id,

    name:
      component.label ||
      'Componente',

    price:
      0,

    category_id:
      '',

    description:
      null,

    is_active:
      true,

    created_at:
      '',

    image_url:
      null,

    is_available:
      true,
  };
}