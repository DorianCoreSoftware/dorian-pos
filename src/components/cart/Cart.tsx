import { withAlpha } from '../../theme/brandStyles';

import { useBusiness } from '../../context/BusinessContext';

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
} from '../../types/cart/cart-item';

import {
  styles,
  setBrandPrimaryColor,
} from './Cart.styles';

import {
  isDeliveryProduct,
} from '../../Utils/delivery';

import {
  getActiveModifierPromotion,
  ModifierPromotion,
} from '../../services/modifierPromotionService';
import { getModifierGroupLabel } from '../../Utils/modifierGroup';
import { useCurrency } from '../../hooks/useCurrency';
import { CartProps } from '../../types/cart/cart-props';

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
  isMobile = false,
}) => {
    const { theme: businessTheme } = useBusiness();
    setBrandPrimaryColor(businessTheme.primary);

    const {
      formatCurrency,
    } = useCurrency();

    const [
      isCollapsed,
      setIsCollapsed,
    ] = useState(false);

    const [
      modifierPromotion,
      setModifierPromotion,
    ] = useState<
      ModifierPromotion | null
    >(null);

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

    const subtotalAmount =
      cart.reduce(
        (sum, item) =>
          sum +
          Number(
            item.product.price,
          ) *
          item.quantity,
        0,
      );

    const modifierPromotionDiscount =
      modifierPromotion
        ? regularItems.reduce(
          (sum, item) =>
            sum +
            getModifierPromotionDiscountForItem(
              item,
              modifierPromotion,
            ),
          0,
        )
        : 0;

    const totalAmount =
      Math.max(
        0,
        subtotalAmount -
        modifierPromotionDiscount,
      );

    const cannotCheckout =
      regularItems.length === 0;

    const deliveryDetails =
      deliveryItem
        ?.deliveryDetails ??
      null;

    useEffect(() => {
      let isMounted = true;

      const loadModifierPromotion =
        async () => {
          try {
            const data =
              await getActiveModifierPromotion();

            if (isMounted) {
              setModifierPromotion(
                data,
              );
            }
          } catch (error) {
            console.error(
              'Error loading modifier promotion in cart:',
              error,
            );

            if (isMounted) {
              setModifierPromotion(
                null,
              );
            }
          }
        };

      void loadModifierPromotion();

      return () => {
        isMounted = false;
      };
    }, []);

    useEffect(() => {
      if (cart.length === 0) {
        setIsCollapsed(false);
      }
    }, [cart.length]);

    if (cart.length === 0) {
      return null;
    }

    if (
      isCollapsed &&
      !isMobile
    ) {
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
              {formatCurrency(
                totalAmount,
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
        style={[
          styles.cartSection,

          isMobile &&
          styles.cartSectionMobile,
        ]}
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

            {!isMobile ? (
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
            ) : null}
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
                  {formatCurrency(
                    Number(
                      deliveryItem
                        .product.price,
                    ),
                  )}
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
                  style={[
                    styles.cartItemMain,

                    isMobile &&
                    styles.cartItemMainMobile,
                  ]}
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
                              style={
                                styles.modifierBadge
                              }
                            >
                              <Text
                                style={
                                  styles.modifierText
                                }
                              >
                                {getModifierGroupLabel(
                                  modifier,
                                )
                                  ? `${getModifierGroupLabel(
                                    modifier,
                                  )}: `
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
                      {formatCurrency(
                        Number(
                          item.product
                            .price,
                        ) *
                        item.quantity,
                      )}
                    </Text>

                    {modifierPromotion &&
                      getModifierPromotionDiscountForItem(
                        item,
                        modifierPromotion,
                      ) >
                      0 ? (
                      <View
                        style={{
                          marginTop: 6,
                          alignSelf:
                            'flex-start',
                          paddingVertical: 5,
                          paddingHorizontal: 8,
                          borderRadius: 6,
                          borderWidth: 1,
                          borderColor:
                            withAlpha(businessTheme.primary, 0.53),
                          backgroundColor:
                            withAlpha(businessTheme.primary, 0.14),
                        }}
                      >
                        <Text
                          style={{
                            color:
                              businessTheme.primary,
                            fontSize: 10,
                            fontWeight:
                              '900',
                          }}
                        >
                          🏷️ {modifierPromotion.display_name}
                        </Text>

                        <Text
                          style={{
                            color:
                              '#D6C98A',
                            fontSize: 10,
                            marginTop: 2,
                          }}
                        >
                          {modifierPromotion.modifier_name}
                          {' '}· {formatCurrency(
                            -getModifierPromotionDiscountForItem(
                              item,
                              modifierPromotion,
                            ),
                          )}
                        </Text>
                      </View>
                    ) : null}
                  </View>

                  {/* CANTIDAD */}
                  <View
                    style={[
                      styles.cartItemControls,

                      isMobile &&
                      styles.cartItemControlsMobile,
                    ]}
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
          {modifierPromotionDiscount >
            0 ? (
            <>
              <View
                style={{
                  flexDirection:
                    'row',
                  alignItems:
                    'center',
                  justifyContent:
                    'space-between',
                  marginBottom:
                    6,
                }}
              >
                <Text
                  style={{
                    color:
                      '#AAAAAA',
                    fontSize:
                      12,
                  }}
                >
                  Subtotal
                </Text>

                <Text
                  style={{
                    color:
                      '#CCCCCC',
                    fontSize:
                      12,
                    fontWeight:
                      '700',
                  }}
                >
                  {formatCurrency(
                    subtotalAmount,
                  )}
                </Text>
              </View>

              <View
                style={{
                  flexDirection:
                    'row',
                  alignItems:
                    'center',
                  justifyContent:
                    'space-between',
                  marginBottom:
                    8,
                }}
              >
                <Text
                  style={{
                    color:
                      businessTheme.primary,
                    fontSize:
                      12,
                    fontWeight:
                      '800',
                  }}
                >
                  🏷️ {modifierPromotion?.display_name}
                </Text>

                <Text
                  style={{
                    color:
                      businessTheme.primary,
                    fontSize:
                      12,
                    fontWeight:
                      '900',
                  }}
                >
                  {formatCurrency(
                    -modifierPromotionDiscount,
                  )}
                </Text>
              </View>
            </>
          ) : null}

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
              {formatCurrency(
                totalAmount,
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


function getModifierPromotionDiscountForItem(
  item: CartItem,
  modifierPromotion: ModifierPromotion,
): number {
  const discountPerEligibleUnit =
    Number(
      modifierPromotion.discount_amount,
    );

  if (
    !Number.isFinite(
      discountPerEligibleUnit,
    ) ||
    discountPerEligibleUnit <=
    0
  ) {
    return 0;
  }

  const hasDirectModifierPromotion =
    item.selectedModifiers?.some(
      (modifier) =>
        modifier.id ===
        modifierPromotion.modifier_id,
    ) ??
    false;

  const directEligibleUnits =
    hasDirectModifierPromotion
      ? item.quantity
      : 0;

  const comboEligibleUnits =
    (
      item.comboComponents ??
      []
    ).reduce(
      (
        total,
        component,
      ) => {
        const hasModifierPromotion =
          component
            .selectedModifiers
            ?.some(
              (modifier) =>
                modifier.id ===
                modifierPromotion.modifier_id,
            ) ??
          false;

        if (!hasModifierPromotion) {
          return total;
        }

        const componentQuantity =
          Number(
            component.quantity ??
            1,
          );

        return (
          total +
          (
            Number.isFinite(
              componentQuantity,
            ) &&
              componentQuantity >
              0
              ? componentQuantity
              : 1
          )
        );
      },
      0,
    );

  const eligibleUnits =
    directEligibleUnits +
    comboEligibleUnits *
    item.quantity;

  return (
    eligibleUnits *
    discountPerEligibleUnit
  );
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