import { withAlpha } from '../../theme/brandStyles';

import { useBusiness } from '../../context/BusinessContext';

import React, {
  useEffect,
  useState,
} from 'react';

import {
  Alert,
  FlatList,
  Modal,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';



import {
  fetchOrderPaymentByOrderId,
} from '../../repositories/PaymentRepository';

import {
  cancelOrder,
  deliverOrder,
  markOrderReady,
  setOrderItemPrepared,
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
import { useCurrency } from '../../hooks/useCurrency';
import { PaymentModal } from '../../components/payment-modal/PaymentModal';

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
  const { theme: businessTheme } = useBusiness();

  const {
    currencyCode,
    formatCurrency,
  } = useCurrency();

  const [
    paymentOrder,
    setPaymentOrder,
  ] =
    useState<KitchenOrder | null>(
      null,
    );

  const [
    paymentIntent,
    setPaymentIntent,
  ] = useState<
    'advance' | 'final'
  >('final');

  const [
    productInfo,
    setProductInfo,
  ] = useState<{
    name: string;
    description:
      string | null;
  } | null>(
    null,
  );

  const [
    isProcessingPayment,
    setIsProcessingPayment,
  ] =
    useState(false);

  const [
    preparationItemIds,
    setPreparationItemIds,
  ] = useState<Set<string>>(
    () => new Set(),
  );

  const [
    paidOrderIds,
    setPaidOrderIds,
  ] = useState<Set<string>>(
    () => new Set(),
  );

  useEffect(() => {
    let active = true;

    const refreshPaidOrders =
      async (): Promise<void> => {
        const results =
          await Promise.all(
            pendingOrders.map(
              async order => {
                try {
                  const payment =
                    await fetchOrderPaymentByOrderId(
                      order.id,
                    );

                  return payment
                    ? order.id
                    : null;
                } catch (error) {
                  console.error(
                    'No se pudo consultar el pago de la orden:',
                    order.id,
                    error,
                  );

                  return null;
                }
              },
            ),
          );

        if (!active) {
          return;
        }

        setPaidOrderIds(
          new Set(
            results.filter(
              (
                orderId,
              ): orderId is string =>
                Boolean(orderId),
            ),
          ),
        );
      };

    void refreshPaidOrders();

    return () => {
      active = false;
    };
  }, [pendingOrders]);

  const isOrderFullyPrepared = (
    order: KitchenOrder,
  ): boolean =>
    order.order_items.length > 0 &&
    order.order_items.every(
      line => line.is_prepared,
    );

  const handleToggleOrderItemPrepared =
    async (
      line: KitchenOrderItem,
    ): Promise<void> => {
      if (
        preparationItemIds.has(
          line.id,
        )
      ) {
        return;
      }

      const nextPrepared =
        !line.is_prepared;

      setPreparationItemIds(
        current => {
          const next =
            new Set(current);
          next.add(line.id);
          return next;
        },
      );

      try {
        await setOrderItemPrepared(
          line.id,
          nextPrepared,
        );

        setPendingOrders(
          currentOrders =>
            currentOrders.map(
              order =>
                order.id ===
                line.order_id
                  ? {
                      ...order,
                      order_items:
                        order.order_items.map(
                          item =>
                            item.id ===
                            line.id
                              ? {
                                  ...item,
                                  is_prepared:
                                    nextPrepared,
                                  prepared_at:
                                    nextPrepared
                                      ? new Date().toISOString()
                                      : null,
                                  prepared_by:
                                    null,
                                }
                              : item,
                        ),
                    }
                  : order,
            ),
        );
      } catch (error) {
        console.error(
          'Error al actualizar preparación:',
          error,
        );

        Alert.alert(
          'No se pudo actualizar',
          error instanceof Error
            ? error.message
            : 'No se pudo actualizar la preparación del producto.',
        );
      } finally {
        setPreparationItemIds(
          current => {
            const next =
              new Set(current);
            next.delete(line.id);
            return next;
          },
        );
      }
    };

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

        setPaidOrderIds(
          current => {
            const next =
              new Set(current);

            next.delete(
              order.id,
            );

            return next;
          },
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
      intent:
        'advance' | 'final',
    ): Promise<void> => {
      const alreadyPaid =
        paidOrderIds.has(
          order.id,
        );

      if (alreadyPaid) {
        if (
          intent === 'final'
        ) {
          await handleDeliverPaidOrder(
            order,
          );
        } else {
          Alert.alert(
            'Orden ya pagada',
            'Esta orden ya tiene un pago registrado.',
          );
        }

        return;
      }

      if (
        intent === 'final' &&
        !isOrderFullyPrepared(
          order,
        )
      ) {
        Alert.alert(
          'Pedido incompleto',
          'Marca todos los productos como preparados antes de cobrar y entregar la orden.',
        );
        return;
      }

      try {
        const existingPayment =
          await fetchOrderPaymentByOrderId(
            order.id,
          );

        if (existingPayment) {
          setPaidOrderIds(
            current =>
              new Set([
                ...current,
                order.id,
              ]),
          );

          if (
            intent === 'final'
          ) {
            await handleDeliverPaidOrder(
              order,
            );
          } else {
            Alert.alert(
              'Orden ya pagada',
              'Esta orden ya tiene un pago registrado.',
            );
          }

          return;
        }

        setPaymentIntent(
          intent,
        );

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

      setPaymentIntent(
        'final',
      );
    };

  const handleConfirmPayment =
    async (
      paymentMethod:
        PaymentMethod,

      amountReceived:
        number | null,

      paymentReference:
        string | null,
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

              paymentReference,

              paymentTiming:
                paymentIntent ===
                'advance'
                  ? 'advance'
                  : 'final',

              currencyCode,
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

        let ticketPrinted =
          true;

        try {
          await printOrderTicket({
            order:
              orderToPay,

            paymentMethod,

            amountReceived,

            promoCoupon,

            currencyCode,
          });
        } catch (error) {
          ticketPrinted =
            false;

          console.error(
            'Pago registrado, pero falló la impresión del ticket:',
            error,
          );

          Alert.alert(
            'Pago registrado',
            'El cobro se guardó correctamente, pero no se pudo imprimir el ticket.\n\nPuedes continuar con la entrega.',
          );
        }

        setPaidOrderIds(
          current =>
            new Set([
              ...current,
              orderToPay.id,
            ]),
        );

        setPaymentOrder(
          null,
        );

        if (
          paymentIntent ===
          'final'
        ) {
          setPaymentIntent(
            'final',
          );

          await handleDeliverPaidOrder(
            orderToPay,
          );

          return;
        }

        setPaymentIntent(
          'final',
        );

        Alert.alert(
          'Pago anticipado registrado',
          ticketPrinted
            ? 'El cobro se guardó y el ticket fue generado. La orden conservará su estado actual y seguirá visible en cocina.'
            : 'El cobro se guardó. La orden conservará su estado actual y seguirá visible en cocina.',
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

      return paidOrderIds.has(
        order.id,
      )
        ? 'Entregar'
        : 'Cobrar / Entregar';
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

                  cookingMethod:
                    component.cooking_method ??
                    null,
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

  const handleOpenProductInfo = (
    name: string,
    description:
      string | null | undefined,
  ): void => {
    setProductInfo({
      name:
        name.trim() ||
        'Producto',
      description:
        description
          ?.trim() ||
        null,
    });
  };

  const handleCloseProductInfo =
    (): void => {
      setProductInfo(
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
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel={`Ver descripción de ${
            component.products
              ?.name ??
            component.label
          }`}
          onPress={() =>
            handleOpenProductInfo(
              component.products
                ?.name ??
                component.label,
              component.products
                ?.description,
            )
          }
          activeOpacity={
            0.65
          }
          style={{
            alignSelf:
              'flex-start',
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

              textDecorationLine:
                'underline',

              textDecorationStyle:
                'dotted',
            }}
          >
            ↳{' '}
            {component.quantity}
            x{' '}
            {component.products
              ?.name ??
              component.label}
          </Text>
        </TouchableOpacity>

        {component.cooking_method ? (
          <Text
            style={{
              color:
                component.cooking_method === 'air_fryer'
                  ? businessTheme.primary
                  : '#BBBBBB',
              fontSize: 12,
              fontWeight: '700',
              paddingLeft: 12,
              marginTop: 3,
            }}
          >
            {component.cooking_method === 'air_fryer'
              ? '♨ Freidora de aire'
              : '🔥 Aceite'}
          </Text>
        ) : null}

        {modifiers.map(
          (
            modifier,
          ) => (
            <Text
              key={`${component.id}-${modifier.id}`}
              style={{
                color:
                  businessTheme.primary,

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
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 10,
          }}
        >
          <TouchableOpacity
            accessibilityRole="checkbox"
            accessibilityState={{
              checked:
                line.is_prepared,
              disabled:
                preparationItemIds.has(
                  line.id,
                ),
            }}
            accessibilityLabel={`Marcar ${line.products?.name ?? 'producto'} como preparado`}
            disabled={
              preparationItemIds.has(
                line.id,
              )
            }
            onPress={() => {
              void handleToggleOrderItemPrepared(
                line,
              );
            }}
            style={{
              width: 28,
              height: 28,
              borderRadius: 7,
              borderWidth: 2,
              borderColor:
                line.is_prepared
                  ? businessTheme.primary
                  : '#686868',
              backgroundColor:
                line.is_prepared
                  ? businessTheme.primary
                  : '#1C1C1C',
              alignItems: 'center',
              justifyContent: 'center',
              opacity:
                preparationItemIds.has(
                  line.id,
                )
                  ? 0.5
                  : 1,
            }}
          >
            {line.is_prepared ? (
              <Text
                style={{
                  color:
                    businessTheme.onPrimary,
                  fontSize: 17,
                  fontWeight: '900',
                }}
              >
                ✓
              </Text>
            ) : null}
          </TouchableOpacity>

          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel={`Ver descripción de ${
              line.products
                ?.name ??
              'Producto'
            }`}
            onPress={() =>
              handleOpenProductInfo(
                line.products
                  ?.name ??
                  'Producto',
                line.products
                  ?.description,
              )
            }
            activeOpacity={
              0.65
            }
            style={{
              flex: 1,
            }}
          >
            <Text
              style={[
                styles.itemText,
                {
                  opacity:
                    line.is_prepared
                      ? 0.72
                      : 1,

                  textDecorationLine:
                    'underline',

                  textDecorationStyle:
                    'dotted',
                },
              ]}
            >
              {line.quantity}
              x{' '}
              {line.products
                ?.name ??
                'Producto'}
              {line.reward_source
                ? ' · PREMIO $0'
                : ''}
            </Text>
          </TouchableOpacity>
        </View>

        {line.cooking_method ? (
          <Text
            style={{
              color:
                line.cooking_method === 'air_fryer'
                  ? businessTheme.primary
                  : '#BBBBBB',
              fontSize: 12,
              fontWeight: '800',
              marginTop: 4,
              paddingLeft: 44,
            }}
          >
            {line.cooking_method === 'air_fryer'
              ? '♨ Freidora de aire'
              : '🔥 Aceite'}
          </Text>
        ) : null}

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
                        businessTheme.primary,

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
            businessTheme.primary,
        }}
      >
        <Text
          style={{
            color:
              businessTheme.primary,
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
          {formatCurrency(
            Number(
              item.total,
            ),
          )}
          {paidOrderIds.has(
            item.id,
          ) ? (
            <Text
              style={
                styles.orderPaidText
              }
            >
              {' '}(Pagado)
            </Text>
          ) : null}
        </Text>
      </View>

      <View
        style={{
          alignSelf: 'flex-start',

          backgroundColor:
            item.orderSource ===
              'web'
              ? withAlpha(businessTheme.primary, 0.12)
              : '#262626',

          borderWidth: 1,

          borderColor:
            item.orderSource ===
              'web'
              ? businessTheme.primary
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
                ? businessTheme.primary
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

      {item.orderSource === 'web' && item.requestedPaymentMethod ? (
        <View
          style={{
            alignSelf: 'flex-start',
            backgroundColor: item.requestedPaymentMethod === 'transfer' ? '#182C20' : '#202020',
            borderWidth: 1,
            borderColor: item.requestedPaymentMethod === 'transfer' ? '#4CAF50' : '#666',
            borderRadius: 8,
            paddingHorizontal: 10,
            paddingVertical: 5,
            marginTop: 4,
            marginBottom: 2,
          }}
        >
          <Text style={{ color: item.requestedPaymentMethod === 'transfer' ? '#81C784' : '#D0D0D0', fontSize: 11, fontWeight: '900' }}>
            PAGO SOLICITADO · {item.requestedPaymentMethod === 'transfer' ? 'TRANSFERENCIA' : 'AL RECIBIR'}
          </Text>
        </View>
      ) : null}

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
        {!paidOrderIds.has(
          item.id,
        ) &&
        item.status !== 'ready' &&
        item.status !== 'on_the_way' ? (
          <TouchableOpacity
            style={
              styles.advancePaymentLink
            }
            onPress={() => {
              void handleOpenPayment(
                item,
                'advance',
              );
            }}
          >
            <Text
              style={
                styles.advancePaymentLinkText
              }
            >
              ¿Pago anticipado?
            </Text>
          </TouchableOpacity>
        ) : null}

        {item.status !== 'pending' &&
        !isOrderFullyPrepared(
          item,
        ) ? (
          <Text
            style={{
              color: '#FFB74D',
              fontSize: 12,
              fontWeight: '700',
              marginBottom: 9,
              textAlign: 'center',
            }}
          >
            ⏳ Marca todos los productos como preparados para continuar.
          </Text>
        ) : null}

        <TouchableOpacity
          style={[
            styles.deliverButton,
            styles.primaryStatusButton,
            item.status !== 'pending' &&
            !isOrderFullyPrepared(
              item,
            )
              ? { opacity: 0.4 }
              : null,
          ]}
          disabled={
            item.status !== 'pending' &&
            !isOrderFullyPrepared(
              item,
            )
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
                'final',
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

        <View
          style={
            styles.secondaryActionsRow
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
              Cancelar pedido
            </Text>
          </TouchableOpacity>
        </View>
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

      <Modal
        visible={
          productInfo !==
          null
        }
        transparent
        animationType="fade"
        onRequestClose={
          handleCloseProductInfo
        }
      >
        <View
          style={{
            flex: 1,
            backgroundColor:
              'rgba(0,0,0,0.72)',
            alignItems:
              'center',
            justifyContent:
              'center',
            padding: 24,
          }}
        >
          <TouchableOpacity
            activeOpacity={
              1
            }
            onPress={
              handleCloseProductInfo
            }
            style={{
              position:
                'absolute',
              top: 0,
              right: 0,
              bottom: 0,
              left: 0,
            }}
          />

          <View
            style={{
              width:
                '100%',
              maxWidth:
                520,
              maxHeight:
                '78%',
              backgroundColor:
                '#1E1E1E',
              borderRadius:
                18,
              borderWidth:
                1,
              borderColor:
                '#4A4A4A',
              overflow:
                'hidden',
            }}
          >
            <View
              style={{
                paddingHorizontal:
                  20,
                paddingTop:
                  20,
                paddingBottom:
                  16,
                borderBottomWidth:
                  1,
                borderBottomColor:
                  '#353535',
              }}
            >
              <Text
                style={{
                  color:
                    '#FFFFFF',
                  fontSize:
                    22,
                  fontWeight:
                    '900',
                  paddingRight:
                    44,
                }}
              >
                {productInfo
                  ?.name ??
                  'Producto'}
              </Text>

              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel="Cerrar descripción"
                onPress={
                  handleCloseProductInfo
                }
                style={{
                  position:
                    'absolute',
                  top: 14,
                  right: 14,
                  width: 38,
                  height: 38,
                  borderRadius:
                    19,
                  backgroundColor:
                    '#2A2A2A',
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
                      22,
                    fontWeight:
                      '700',
                  }}
                >
                  ×
                </Text>
              </TouchableOpacity>
            </View>

            <ScrollView
              style={{
                maxHeight:
                  420,
              }}
              contentContainerStyle={{
                padding:
                  20,
              }}
              showsVerticalScrollIndicator={
                false
              }
            >
              <Text
                style={{
                  color:
                    businessTheme.primary,
                  fontSize:
                    12,
                  fontWeight:
                    '900',
                  letterSpacing:
                    0.7,
                  marginBottom:
                    8,
                }}
              >
                DESCRIPCIÓN / INGREDIENTES
              </Text>

              <Text
                selectable
                style={{
                  color:
                    productInfo
                      ?.description
                      ? '#F2F2F2'
                      : '#A5A5A5',
                  fontSize:
                    16,
                  lineHeight:
                    24,
                }}
              >
                {productInfo
                  ?.description ??
                  'Este producto todavía no tiene una descripción registrada.'}
              </Text>
            </ScrollView>

            <View
              style={{
                padding:
                  16,
                borderTopWidth:
                  1,
                borderTopColor:
                  '#353535',
              }}
            >
              <TouchableOpacity
                onPress={
                  handleCloseProductInfo
                }
                style={{
                  minHeight:
                    48,
                  borderRadius:
                    10,
                  backgroundColor:
                    businessTheme.primary,
                  alignItems:
                    'center',
                  justifyContent:
                    'center',
                  paddingHorizontal:
                    18,
                }}
              >
                <Text
                  style={{
                    color:
                      businessTheme.onPrimary,
                    fontSize:
                      15,
                    fontWeight:
                      '900',
                  }}
                >
                  CERRAR
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <PaymentModal
        visible={
          paymentOrder !==
          null
        }
        initialPaymentMethod={
          paymentOrder?.requestedPaymentMethod === 'transfer'
            ? 'transfer'
            : 'cash'
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
          paymentReference,
        ) => {
          void handleConfirmPayment(
            paymentMethod,
            amountReceived,
            paymentReference,
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