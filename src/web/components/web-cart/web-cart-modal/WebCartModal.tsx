import React from 'react';

import {
  Modal,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';

import {
  Cart,
} from '../../../../types';

import {
  QuantityPromotionDiscountLine,
} from '../../../../services/quantityPromotionService';
import {
  PricingPromotionDiscountLine,
} from '../../../../services/pricingPromotionService';

import styles, {
  setBrandPrimaryColor,
} from './WebCartModal.styles';

import {
  useBusiness,
} from '../../../../context/BusinessContext';

import {
  useCurrency,
} from '../../../../hooks/useCurrency';

interface WebCartModalProps {
  visible: boolean;
  cart: Cart;
  subtotal: number;
  modifierPromotionDiscount: number;
  modifierPromotionName: string | null;
  quantityPromotionLines: QuantityPromotionDiscountLine[];
  pricingPromotionLines: PricingPromotionDiscountLine[];
  total: number;

  canCheckout: boolean;

  checkoutDisabledMessage:
    | string
    | null;

  onClose: () => void;

  onUpdateQuantity:
    (
      itemId: string,
      change: number,
    ) => void;

  onRemoveItem:
    (itemId: string) => void;

  onClearCart: () => void;

  onContinue: () => void;
}

export default function WebCartModal({
  visible,
  cart,
  subtotal,
  modifierPromotionDiscount,
  modifierPromotionName,
  quantityPromotionLines,
  pricingPromotionLines,
  total,
  canCheckout,
  checkoutDisabledMessage,
  onClose,
  onUpdateQuantity,
  onRemoveItem,
  onClearCart,
  onContinue,
}: WebCartModalProps) {
  const {
    formatCurrency,
  } = useCurrency();

  const {
    theme,
  } = useBusiness();

  setBrandPrimaryColor(
    theme.primary,
  );

  return (
    <Modal
      transparent
      visible={visible}
      animationType="fade"
      onRequestClose={
        onClose
      }
    >
      <View
        style={
          styles.backdrop
        }
      >
        <Pressable
          style={
            styles.dismissArea
          }
          onPress={
            onClose
          }
        />

        <View
          style={
            styles.panel
          }
        >
          <View
            style={
              styles.header
            }
          >
            <View>
              <Text
                style={
                  styles.title
                }
              >
                Tu pedido
              </Text>

              <Text
                style={
                  styles.subtitle
                }
              >
                Revisa tus productos antes de continuar
              </Text>
            </View>

            <Pressable
              onPress={
                onClose
              }
              style={
                styles.closeButton
              }
            >
              <Text
                style={
                  styles.closeText
                }
              >
                ×
              </Text>
            </Pressable>
          </View>

          <ScrollView
            style={
              styles.itemsScroll
            }
            contentContainerStyle={
              styles.itemsContent
            }
            showsVerticalScrollIndicator={
              false
            }
          >
            {cart.map(
              (item) => (
                <View
                  key={
                    item.id
                  }
                  style={
                    styles.item
                  }
                >
                  <View
                    style={
                      styles.itemTop
                    }
                  >
                    <View
                      style={
                        styles.itemInfo
                      }
                    >
                      <Text
                        style={
                          styles.itemName
                        }
                      >
                        {
                          item.product
                            .name
                        }
                      </Text>

                      <Text
                        style={
                          styles.itemPrice
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
                    </View>

                    <Pressable
                      onPress={() =>
                        onRemoveItem(
                          item.id,
                        )
                      }
                      style={
                        styles.removeButton
                      }
                    >
                      <Text
                        style={
                          styles.removeText
                        }
                      >
                        Eliminar
                      </Text>
                    </Pressable>
                  </View>

                  {item.selectedModifiers
                    .length >
                    0 && (
                    <Text
                      style={
                        styles.detailText
                      }
                    >
                      {item.selectedModifiers
                        .map(
                          (
                            modifier,
                          ) =>
                            modifier.name,
                        )
                        .join(', ')}
                    </Text>
                  )}

                  {(item.selectedProductChecks ?? []).length > 0 && (
                    <Text style={styles.detailText}>
                      {(item.selectedProductChecks ?? []).map(check =>
                        check.isSelected
                          ? `✓ ${check.groupName}: ${check.optionName}`
                          : `✕ ${check.groupName}: Sin ${check.optionName}`
                      ).join(' · ')}
                    </Text>
                  )}

                  {(item.comboComponents ??
                    []).map(
                    (
                      component,
                    ) => (
                      <View
                        key={
                          component.slotId
                        }
                        style={
                          styles.component
                        }
                      >
                        <Text
                          style={
                            styles.componentText
                          }
                        >
                          {component.label}:{' '}
                          {
                            component
                              .product
                              .name
                          }
                        </Text>

                        {component
                          .selectedModifiers
                          .length >
                          0 && (
                          <Text
                            style={
                              styles.componentModifierText
                            }
                          >
                            {component
                              .selectedModifiers
                              .map(
                                (
                                  modifier,
                                ) =>
                                  modifier.name,
                              )
                              .join(
                                ', ',
                              )}
                          </Text>
                        )}

                        {!!component.notes && (
                          <Text
                            style={
                              styles.noteText
                            }
                          >
                            Nota:{' '}
                            {
                              component.notes
                            }
                          </Text>
                        )}
                      </View>
                    ),
                  )}

                  {!!item.notes && (
                    <Text
                      style={
                        styles.noteText
                      }
                    >
                      Nota:{' '}
                      {item.notes}
                    </Text>
                  )}

                  <View
                    style={
                      styles.quantityRow
                    }
                  >
                    <Pressable
                      onPress={() =>
                        onUpdateQuantity(
                          item.id,
                          -1,
                        )
                      }
                      style={
                        styles.quantityButton
                      }
                    >
                      <Text
                        style={
                          styles.quantityButtonText
                        }
                      >
                        −
                      </Text>
                    </Pressable>

                    <Text
                      style={
                        styles.quantityText
                      }
                    >
                      {item.quantity}
                    </Text>

                    <Pressable
                      onPress={() =>
                        onUpdateQuantity(
                          item.id,
                          1,
                        )
                      }
                      style={
                        styles.quantityButton
                      }
                    >
                      <Text
                        style={
                          styles.quantityButtonText
                        }
                      >
                        +
                      </Text>
                    </Pressable>
                  </View>
                </View>
              ),
            )}
          </ScrollView>

          <View
            style={
              styles.summary
            }
          >
            <View
              style={
                styles.summaryRow
              }
            >
              <Text
                style={
                  styles.summaryLabel
                }
              >
                Subtotal
              </Text>

              <Text
                style={
                  styles.summaryValue
                }
              >
                {formatCurrency(
                  subtotal,
                )}
              </Text>
            </View>

            {modifierPromotionDiscount >
              0 && (
              <View
                style={
                  styles.summaryRow
                }
              >
                <Text
                  style={
                    styles.discountLabel
                  }
                >
                  {modifierPromotionName ?? 'Promoción'}
                </Text>

                <Text
                  style={
                    styles.discountValue
                  }
                >
                  -
                  {formatCurrency(
                    modifierPromotionDiscount,
                  )}
                </Text>
              </View>
            )}

            {quantityPromotionLines.map(
              line => (
                <View
                  key={
                    line.promotionId
                  }
                  style={
                    styles.summaryRow
                  }
                >
                  <Text
                    style={
                      styles.discountLabel
                    }
                  >
                    {line.label}
                  </Text>

                  <Text
                    style={
                      styles.discountValue
                    }
                  >
                    -
                    {formatCurrency(
                      line.discountAmount,
                    )}
                  </Text>
                </View>
              ),
            )}

            {pricingPromotionLines.map(
              line => (
                <View
                  key={
                    line.promotionId
                  }
                  style={
                    styles.summaryRow
                  }
                >
                  <Text
                    style={
                      styles.discountLabel
                    }
                  >
                    {line.label}
                  </Text>

                  <Text
                    style={
                      styles.discountValue
                    }
                  >
                    -
                    {formatCurrency(
                      line.discountAmount,
                    )}
                  </Text>
                </View>
              ),
            )}


            <View
              style={[
                styles.summaryRow,
                styles.totalRow,
              ]}
            >
              <Text
                style={
                  styles.totalLabel
                }
              >
                Total
              </Text>

              <Text
                style={
                  styles.totalValue
                }
              >
                {formatCurrency(
                  total,
                )}
              </Text>
            </View>

            <Pressable
              onPress={
                onClearCart
              }
              style={
                styles.clearButton
              }
            >
              <Text
                style={
                  styles.clearButtonText
                }
              >
                Vaciar carrito
              </Text>
            </Pressable>

            {!canCheckout &&
              checkoutDisabledMessage && (
                <View
                  style={
                    styles.closedNotice
                  }
                >
                  <Text
                    style={
                      styles.closedNoticeTitle
                    }
                  >
                    🔴 No estamos recibiendo pedidos
                  </Text>

                  <Text
                    style={
                      styles.closedNoticeText
                    }
                  >
                    {
                      checkoutDisabledMessage
                    }
                  </Text>
                </View>
              )}

            <Pressable
              disabled={
                !canCheckout
              }
              onPress={
                onContinue
              }
              style={({ pressed }) => [
                styles.checkoutButton,

                !canCheckout &&
                  styles.checkoutButtonDisabled,

                pressed &&
                  canCheckout &&
                  styles.checkoutButtonPressed,
              ]}
            >
              <Text
                style={[
                  styles.checkoutButtonText,

                  !canCheckout &&
                    styles.checkoutButtonTextDisabled,
                ]}
              >
                {canCheckout
                  ? 'Continuar'
                  : 'Pedidos no disponibles'}
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}