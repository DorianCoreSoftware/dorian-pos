import React, {
  useEffect,
  useState,
} from 'react';

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

import {
  isDeliveryProduct,
} from '../../Utils/delivery';

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
  const [
    isCollapsed,
    setIsCollapsed,
  ] = useState(false);

  const deliveryItem =
    cart.find(
      (item) =>
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
        Number(
          item.product.price,
        ) *
          item.quantity,
      0,
    );

  const cannotCheckout =
    regularItems.length === 0;

  const deliveryDetails =
    deliveryItem
      ?.deliveryDetails ??
    null;

  /*
   * Si el carrito queda completamente
   * vacío, lo dejamos expandido para que
   * la próxima orden comience normal.
   */
  useEffect(() => {
    if (cart.length === 0) {
      setIsCollapsed(false);
    }
  }, [cart.length]);

  /*
   * Carrito vacío:
   * no renderizamos absolutamente nada.
   */
  if (cart.length === 0) {
    return null;
  }

  /*
   * Vista compacta.
   */
  if (isCollapsed) {
    return (
      <TouchableOpacity
        style={
          styles.collapsedCart
        }
        activeOpacity={0.85}
        onPress={() =>
          setIsCollapsed(false)
        }
      >
        <View
          style={
            styles.collapsedCartLeft
          }
        >
          <Text
            style={
              styles.collapsedCartIcon
            }
          >
            🛒
          </Text>

          <View>
            <Text
              style={
                styles.collapsedCartTitle
              }
            >
              Orden Actual
            </Text>

            <Text
              style={
                styles.collapsedCartSubtitle
              }
            >
              {totalItems}{' '}
              {totalItems === 1
                ? 'producto'
                : 'productos'}
              {deliveryItem
                ? ' · 🚚 Domicilio'
                : ''}
            </Text>
          </View>
        </View>

        <View
          style={
            styles.collapsedCartRight
          }
        >
          <Text
            style={
              styles.collapsedCartTotal
            }
          >
            $
            {totalAmount.toFixed(
              2,
            )}
          </Text>

          <Text
            style={
              styles.collapsedCartArrow
            }
          >
            ‹
          </Text>
        </View>
      </TouchableOpacity>
    );
  }

  return (
    <View
      style={
        styles.cartSection
      }
    >
      <View
        style={
          styles.cartHeader
        }
      >
        <View
          style={
            styles.cartHeaderInfo
          }
        >
          <Text
            style={
              styles.cartHeaderTitle
            }
          >
            Orden Actual (
            {totalItems})
          </Text>

          {deliveryItem ? (
            <Text
              style={
                styles.cartHeaderDelivery
              }
            >
              🚚 A domicilio
            </Text>
          ) : null}
        </View>

        <View
          style={
            styles.cartHeaderActions
          }
        >
          <TouchableOpacity
            onPress={
              onClearCart
            }
          >
            <Text
              style={
                styles.clearCartText
              }
            >
              Vaciar
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={
              styles.collapseButton
            }
            onPress={() =>
              setIsCollapsed(true)
            }
          >
            <Text
              style={
                styles.collapseButtonText
              }
            >
              Ocultar ›
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* PEDIDO A DOMICILIO */}
      <View
        style={[
          styles.deliveryContainer,

          deliveryItem
            ? styles.deliveryContainerActive
            : null,
        ]}
      >
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={
            canToggleDelivery
              ? onToggleDelivery
              : undefined
          }
          disabled={
            !canToggleDelivery
          }
          style={[
            styles.deliveryToggle,

            !canToggleDelivery
              ? styles.deliveryToggleDisabled
              : null,
          ]}
        >
          <View
            style={[
              styles.deliveryCheckbox,

              deliveryItem
                ? styles.deliveryCheckboxActive
                : null,
            ]}
          >
            {deliveryItem ? (
              <Text
                style={
                  styles.deliveryCheck
                }
              >
                ✓
              </Text>
            ) : null}
          </View>

          <View
            style={
              styles.deliveryTextContainer
            }
          >
            <Text
              style={
                styles.deliveryTitle
              }
            >
              Pedido a domicilio
            </Text>

            <Text
              style={
                styles.deliverySubtitle
              }
            >
              {deliveryItem
                ? 'Datos de entrega capturados'
                : regularItems.length >
                    0
                  ? 'Activar entrega a domicilio'
                  : 'Agrega un producto para habilitarlo'}
            </Text>
          </View>
        </TouchableOpacity>

        {deliveryItem &&
        deliveryDetails ? (
          <View
            style={
              styles.deliveryDetails
            }
          >
            <Text
              style={
                styles.deliveryCustomer
              }
            >
              {
                deliveryDetails
                  .customerName
              }
            </Text>

            <Text
              style={
                styles.deliveryDetailText
              }
            >
              📞{' '}
              {
                deliveryDetails.phone
              }
            </Text>

            <Text
              style={
                styles.deliveryDetailText
              }
            >
              📍{' '}
              {buildDeliveryAddress(
                deliveryDetails,
              )}
            </Text>

            {deliveryDetails
              .deliveryReferences ? (
              <Text
                style={
                  styles.deliveryReferences
                }
              >
                Referencias:{' '}
                {
                  deliveryDetails
                    .deliveryReferences
                }
              </Text>
            ) : null}

            <View
              style={
                styles.deliveryActions
              }
            >
              <TouchableOpacity
                onPress={
                  onEditDelivery
                }
                style={
                  styles.editDeliveryButton
                }
              >
                <Text
                  style={
                    styles.editDeliveryText
                  }
                >
                  Editar datos
                </Text>
              </TouchableOpacity>

              <Text
                style={
                  styles.deliveryPrice
                }
              >
                $
                {Number(
                  deliveryItem
                    .product.price,
                ).toFixed(2)}
              </Text>
            </View>
          </View>
        ) : null}
      </View>

      {/* PRODUCTOS */}
      <ScrollView
        style={
          styles.cartScroll
        }
        contentContainerStyle={
          styles.cartScrollContent
        }
      >
        {regularItems.map(
          (item) => (
            <View
              key={
                item.id
              }
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
                  style={
                    styles.cartItemContent
                  }
                >
                  <Text
                    style={
                      styles.cartItemName
                    }
                  >
                    {
                      item.product
                        .name
                    }
                  </Text>

                  {/* MODIFICADORES */}
                  {item
                    .selectedModifiers
                    ?.length >
                  0 ? (
                    <View
                      style={
                        styles.modifiersContainer
                      }
                    >
                      {item.selectedModifiers.map(
                        (
                          modifier,
                          index,
                        ) => (
                          <View
                            key={`${item.id}-${modifier.id}-${index}`}
                            style={[
                              styles.modifierBadge,
                              {
                                borderColor:
                                  getModifierColor(
                                    modifier.group_name,
                                  ),
                              },
                            ]}
                          >
                            <Text
                              style={
                                styles.modifierText
                              }
                            >
                              {modifier.group_name
                                ? `${modifier.group_name}: `
                                : ''}
                              {
                                modifier.name
                              }
                            </Text>
                          </View>
                        ),
                      )}
                    </View>
                  ) : null}

                  {/* COMBO */}
                  {item
                    .comboComponents
                    ?.length ? (
                    <View
                      style={
                        styles.comboContainer
                      }
                    >
                      {item.comboComponents.map(
                        (
                          component,
                          componentIndex,
                        ) => (
                          <View
                            key={`${item.id}-${component.slotId}-${componentIndex}`}
                            style={
                              styles.comboComponent
                            }
                          >
                            <Text
                              style={
                                styles.comboProductName
                              }
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
                                style={
                                  styles.comboModifiers
                                }
                              >
                                {component.selectedModifiers.map(
                                  (
                                    modifier,
                                    modifierIndex,
                                  ) => (
                                    <Text
                                      key={`${component.slotId}-${modifier.id}-${modifierIndex}`}
                                      style={
                                        styles.comboModifierText
                                      }
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
                                style={
                                  styles.comboNotes
                                }
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

                  {/* NOTAS */}
                  {item.notes ? (
                    <Text
                      style={
                        styles.cartItemNotes
                      }
                    >
                      📝{' '}
                      {item.notes}
                    </Text>
                  ) : null}

                  <Text
                    style={
                      styles.cartItemPrice
                    }
                  >
                    $
                    {(
                      Number(
                        item.product
                          .price,
                      ) *
                      item.quantity
                    ).toFixed(2)}
                  </Text>
                </View>

                {/* CANTIDAD */}
                <View
                  style={
                    styles.cartItemControls
                  }
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
                      {
                        item.quantity
                      }
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
                    activeOpacity={
                      0.7
                    }
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

      {/* TOTAL */}
      <View
        style={
          styles.cartFooter
        }
      >
        <View
          style={
            styles.totalRow
          }
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
            $
            {totalAmount.toFixed(
              2,
            )}
          </Text>
        </View>

        <TouchableOpacity
          style={[
            styles.checkoutBtn,

            cannotCheckout &&
              styles.checkoutBtnDisabled,
          ]}
          disabled={
            cannotCheckout
          }
          onPress={() =>
            onCheckout(
              totalAmount,
            )
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
  deliveryDetails:
    NonNullable<
      CartItem[
        'deliveryDetails'
      ]
    >,
): string {
  const streetAndNumber = [
    deliveryDetails.street.trim(),

    deliveryDetails
      .exteriorNumber
      .trim(),

    deliveryDetails
      .interiorNumber
      .trim()
      ? `Int. ${deliveryDetails.interiorNumber.trim()}`
      : '',
  ]
    .filter(Boolean)
    .join(' ');

  const location = [
    deliveryDetails
      .neighborhood
      .trim(),

    deliveryDetails
      .postalCode
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