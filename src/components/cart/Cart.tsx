import React from 'react';

import {
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import {
  CartItem,
} from '../../types/cart-item';



import {
  styles,
} from './Cart.styles';
import { isDeliveryProduct } from '../../Utils/delivery';


interface CartProps {
  cart: CartItem[];

  onUpdateQuantity: (
    itemId: string,
    change: number,
  ) => void;

  onRemoveItem: (
    itemId: string,
  ) => void;

  onClearCart: () => void;

  onCheckout: (
    totalAmount: number,
  ) => void;

  onToggleDelivery: () => void;

  onEditDelivery: () => void;
}

export const Cart: React.FC<
  CartProps
> = ({
  cart,
  onUpdateQuantity,
  onRemoveItem,
  onClearCart,
  onCheckout,
  onToggleDelivery,
  onEditDelivery,
}) => {
    const deliveryItem =
      cart.find((item) =>
        isDeliveryProduct(
          item.product,
        ),
      ) ?? null;

    const regularItems =
      cart.filter(
        (item) =>
          !isDeliveryProduct(
            item.product,
          ),
      );

    const canToggleDelivery =
      regularItems.length > 0 ||
      Boolean(deliveryItem);

    const totalItems =
      regularItems.reduce(
        (sum, item) =>
          sum + item.quantity,
        0,
      );

    const totalAmount =
      cart.reduce(
        (sum, item) =>
          sum +
          Number(item.product.price) *
          item.quantity,
        0,
      );

    const cannotCheckout =
      regularItems.length === 0;

    const deliveryDetails =
      deliveryItem?.deliveryDetails ??
      null;

    return (
      <View style={styles.cartSection}>
        <View style={styles.cartHeader}>
          <Text
            style={
              styles.cartHeaderTitle
            }
          >
            Orden Actual ({totalItems})
          </Text>

          {cart.length > 0 ? (
            <TouchableOpacity
              onPress={onClearCart}
            >
              <Text
                style={
                  styles.clearCartText
                }
              >
                Vaciar
              </Text>
            </TouchableOpacity>
          ) : null}
        </View>

        {/* OPCIÓN DE PEDIDO A DOMICILIO */}
        <View
          style={{
            marginHorizontal: 12,
            marginTop: 10,
            marginBottom: 8,
            padding: 12,
            borderRadius: 10,
            borderWidth: 1,
            borderColor: deliveryItem
              ? '#FFBF00'
              : '#444444',
            backgroundColor:
              deliveryItem
                ? '#302800'
                : '#202020',
          }}
        >
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={
              canToggleDelivery
                ? onToggleDelivery
                : undefined
            }
            disabled={!canToggleDelivery}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              opacity:
                canToggleDelivery
                  ? 1
                  : 0.45,
            }}
          >
            <View
              style={{
                width: 24,
                height: 24,
                marginRight: 10,
                borderRadius: 5,
                borderWidth: 2,
                borderColor:
                  deliveryItem
                    ? '#FFBF00'
                    : '#777777',
                backgroundColor:
                  deliveryItem
                    ? '#FFBF00'
                    : 'transparent',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {deliveryItem ? (
                <Text
                  style={{
                    color: '#171717',
                    fontSize: 16,
                    fontWeight: '900',
                  }}
                >
                  ✓
                </Text>
              ) : null}
            </View>

            <View style={{ flex: 1 }}>
              <Text
                style={{
                  color: '#FFFFFF',
                  fontSize: 15,
                  fontWeight: '700',
                }}
              >
                Pedido a domicilio
              </Text>

              <Text
                style={{
                  color: '#AAAAAA',
                  fontSize: 11,
                  marginTop: 2,
                }}
              >
                {deliveryItem
                  ? 'Datos de entrega capturados'
                  : regularItems.length > 0
                    ? 'Activar entrega a domicilio'
                    : 'Agrega un producto para habilitarlo'}
              </Text>
            </View>
          </TouchableOpacity>

          {deliveryItem &&
            deliveryDetails ? (
            <View
              style={{
                marginTop: 12,
                paddingTop: 12,
                borderTopWidth: 1,
                borderTopColor:
                  '#5A4A00',
              }}
            >
              <Text
                style={{
                  color: '#FFFFFF',
                  fontSize: 14,
                  fontWeight: '700',
                }}
              >
                {
                  deliveryDetails
                    .customerName
                }
              </Text>

              <Text
                style={{
                  color: '#DDDDDD',
                  fontSize: 12,
                  marginTop: 6,
                }}
              >
                📞 {deliveryDetails.phone}
              </Text>

              <Text
                style={{
                  color: '#DDDDDD',
                  fontSize: 12,
                  marginTop: 4,
                }}
              >
                📍{' '}
                {buildDeliveryAddress(
                  deliveryDetails,
                )}
              </Text>

              {deliveryDetails
                .deliveryReferences ? (
                <Text
                  style={{
                    color: '#BBBBBB',
                    fontSize: 11,
                    marginTop: 5,
                    fontStyle: 'italic',
                  }}
                >
                  Referencias:{' '}
                  {
                    deliveryDetails
                      .deliveryReferences
                  }
                </Text>
              ) : null}

              <View
                style={{
                  marginTop: 10,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent:
                    'space-between',
                  gap: 10,
                }}
              >
                <TouchableOpacity
                  onPress={
                    onEditDelivery
                  }
                  style={{
                    paddingVertical: 8,
                    paddingHorizontal: 12,
                    borderRadius: 7,
                    borderWidth: 1,
                    borderColor:
                      '#FFBF00',
                    backgroundColor:
                      '#292300',
                  }}
                >
                  <Text
                    style={{
                      color: '#FFBF00',
                      fontSize: 12,
                      fontWeight: '700',
                    }}
                  >
                    Editar datos
                  </Text>
                </TouchableOpacity>

                <Text
                  style={{
                    color: '#FFFFFF',
                    fontSize: 14,
                    fontWeight: '800',
                  }}
                >
                  $
                  {Number(
                    deliveryItem.product
                      .price,
                  ).toFixed(2)}
                </Text>
              </View>
            </View>
          ) : null}
        </View>

        {/* PRODUCTOS DE LA ORDEN */}
        {regularItems.length === 0 ? (
          <View
            style={
              styles.emptyCartContainer
            }
          >
            <Text
              style={
                styles.emptyCartIcon
              }
            >
              🛒
            </Text>

            <Text
              style={
                styles.emptyCartText
              }
            >
              El carrito está vacío
            </Text>

            <Text
              style={
                styles.emptyCartSubtext
              }
            >
              Selecciona un producto del
              menú de la izquierda para
              comenzar
            </Text>
          </View>
        ) : (
          <ScrollView
            style={styles.cartScroll}
            contentContainerStyle={{
              paddingBottom: 10,
            }}
          >
            {regularItems.map(
              (item) => (
                <View
                  key={item.id}
                  style={
                    styles.cartItemCard
                  }
                >
                  <View
                    style={
                      styles.cartItemMain
                    }
                  >
                    <View
                      style={{
                        flex: 1,
                        paddingRight: 8,
                      }}
                    >
                      <Text
                        style={
                          styles.cartItemName
                        }
                      >
                        {item.product.name}
                      </Text>

                      {/* MODIFICADORES DEL PRODUCTO */}
                      {item
                        .selectedModifiers
                        ?.length > 0 ? (
                        <View
                          style={{
                            flexDirection:
                              'row',
                            flexWrap: 'wrap',
                            gap: 4,
                            marginTop: 5,
                            marginBottom: 4,
                          }}
                        >
                          {item.selectedModifiers.map(
                            (
                              modifier,
                              index,
                            ) => (
                              <View
                                key={`${item.id}-${modifier.id}-${index}`}
                                style={{
                                  paddingHorizontal: 8,
                                  paddingVertical: 3,
                                  borderRadius: 4,
                                  borderWidth: 1,

                                  borderColor:
                                    getModifierColor(
                                      modifier
                                        .group_name,
                                    ),

                                  backgroundColor:
                                    '#1E1E1E',
                                }}
                              >
                                <Text
                                  style={{
                                    color:
                                      '#FFFFFF',
                                    fontSize: 11,
                                    fontWeight:
                                      '700',
                                  }}
                                >
                                  {modifier.group_name
                                    ? `${modifier.group_name}: `
                                    : ''}
                                  {modifier.name}
                                </Text>
                              </View>
                            ),
                          )}
                        </View>
                      ) : null}

                      {/* COMPONENTES DEL COMBO */}
                      {item.comboComponents
                        ?.length ? (
                        <View
                          style={{
                            marginTop: 7,
                            paddingLeft: 8,
                            borderLeftWidth: 2,
                            borderLeftColor:
                              '#555555',
                          }}
                        >
                          {item.comboComponents.map(
                            (
                              component,
                              componentIndex,
                            ) => (
                              <View
                                key={`${item.id}-${component.slotId}-${componentIndex}`}
                                style={{
                                  marginBottom: 7,
                                }}
                              >
                                <Text
                                  style={{
                                    color:
                                      '#DDDDDD',
                                    fontSize: 12,
                                    fontWeight:
                                      '600',
                                  }}
                                >
                                  ↳{' '}
                                  {
                                    component
                                      .product
                                      .name
                                  }
                                </Text>

                                {component
                                  .selectedModifiers
                                  ?.length >
                                  0 ? (
                                  <View
                                    style={{
                                      paddingLeft:
                                        12,
                                      marginTop: 2,
                                    }}
                                  >
                                    {component.selectedModifiers.map(
                                      (
                                        modifier,
                                        modifierIndex,
                                      ) => (
                                        <Text
                                          key={`${component.slotId}-${modifier.id}-${modifierIndex}`}
                                          style={{
                                            color:
                                              '#FFBF00',
                                            fontSize: 11,
                                            marginTop: 1,
                                          }}
                                        >
                                          •{' '}
                                          {
                                            modifier.name
                                          }
                                        </Text>
                                      ),
                                    )}
                                  </View>
                                ) : null}

                                {component.notes ? (
                                  <Text
                                    style={{
                                      color:
                                        '#FFB3B3',
                                      fontSize: 11,
                                      marginTop: 2,
                                      paddingLeft: 12,
                                    }}
                                  >
                                    📝{' '}
                                    {
                                      component.notes
                                    }
                                  </Text>
                                ) : null}
                              </View>
                            ),
                          )}
                        </View>
                      ) : null}

                      {/* NOTAS DEL PRODUCTO */}
                      {item.notes ? (
                        <Text
                          style={[
                            styles.cartItemNotes,
                            {
                              marginTop: 4,
                            },
                          ]}
                        >
                          📝 {item.notes}
                        </Text>
                      ) : null}

                      <Text
                        style={[
                          styles.cartItemPrice,
                          {
                            marginTop: 5,
                          },
                        ]}
                      >
                        $
                        {(
                          Number(
                            item.product
                              .price,
                          ) * item.quantity
                        ).toFixed(2)}
                      </Text>
                    </View>

                    {/* CANTIDAD Y ELIMINAR */}
                    <View
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 10,
                      }}
                    >
                      <View
                        style={
                          styles.qtyContainer
                        }
                      >
                        <TouchableOpacity
                          style={
                            styles.qtyBtn
                          }
                          onPress={() =>
                            onUpdateQuantity(
                              item.id,
                              -1,
                            )
                          }
                        >
                          <Text
                            style={
                              styles.qtyBtnText
                            }
                          >
                            -
                          </Text>
                        </TouchableOpacity>

                        <Text
                          style={
                            styles.qtyVal
                          }
                        >
                          {item.quantity}
                        </Text>

                        <TouchableOpacity
                          style={
                            styles.qtyBtn
                          }
                          onPress={() =>
                            onUpdateQuantity(
                              item.id,
                              1,
                            )
                          }
                        >
                          <Text
                            style={
                              styles.qtyBtnText
                            }
                          >
                            +
                          </Text>
                        </TouchableOpacity>
                      </View>

                      <TouchableOpacity
                        style={
                          styles.deleteItemBtn
                        }
                        onPress={() =>
                          onRemoveItem(
                            item.id,
                          )
                        }
                        activeOpacity={0.7}
                      >
                        <Text
                          style={
                            styles.deleteItemIcon
                          }
                        >
                          🗑️
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              ),
            )}
          </ScrollView>
        )}

        {/* TOTAL Y ENVÍO A COCINA */}
        <View style={styles.cartFooter}>
          <View
            style={styles.totalRow}
          >
            <Text
              style={
                styles.totalLabel
              }
            >
              Total:
            </Text>

            <Text
              style={
                styles.totalVal
              }
            >
              ${totalAmount.toFixed(2)}
            </Text>
          </View>

          <TouchableOpacity
            style={[
              styles.checkoutBtn,

              cannotCheckout &&
              styles.checkoutBtnDisabled,
            ]}
            disabled={cannotCheckout}
            onPress={() =>
              onCheckout(totalAmount)
            }
          >
            <Text
              style={
                styles.checkoutBtnText
              }
            >
              ENVIAR A COCINA
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

function getModifierColor(
  groupName:
    | string
    | null
    | undefined,
): string {
  switch (groupName) {
    case 'Carne':
      return '#FFBF00';

    case 'Salsa':
      return '#FF4D4D';

    case 'Sabor':
      return '#4DA6FF';

    default:
      return '#777777';
  }
}

function buildDeliveryAddress(
  deliveryDetails: NonNullable<
    CartItem['deliveryDetails']
  >,
): string {
  const streetAndNumber = [
    deliveryDetails.street.trim(),

    deliveryDetails.exteriorNumber
      .trim(),

    deliveryDetails.interiorNumber
      .trim()
      ? `Int. ${deliveryDetails.interiorNumber.trim()}`
      : '',
  ]
    .filter(Boolean)
    .join(' ');

  const location = [
    deliveryDetails.neighborhood
      .trim(),

    deliveryDetails.postalCode
      .trim()
      ? `C.P. ${deliveryDetails.postalCode.trim()}`
      : '',
  ]
    .filter(Boolean)
    .join(', ');

  return [
    streetAndNumber,
    location,
  ]
    .filter(Boolean)
    .join(', ');
}