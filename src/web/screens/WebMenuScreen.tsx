import React, {
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';

import {
  ProductConfiguratorModal,
  ProductConfigurationResult,
} from '../../components/ProductConfigurator/ProductConfiguratorModal';

import {
  useModifiers,
} from '../../hooks/useModifiers';

import {
  getActiveCategories,
} from '../../services/categoryService';

import {
  getProductModifierMode,
  isKongBurger,
} from '../../services/modifierService';

import {
  getActiveProducts,
} from '../../services/products';

import {
  getActiveWeeklySauce,
  WeeklySauce,
} from '../../services/weeklySauceService';

import {
  isDeliveryProduct,
} from '../../Utils/delivery';

import {
  Cart,
  Category,
  DeliveryDetails,
  Product,
} from '../../types';

import WebCartButton from '../components/WebCartButton';
import WebCartModal from '../components/WebCartModal';
import WebCategoryTabs from '../components/WebCategoryTabs';
import WebCheckoutModal from '../components/WebCheckoutModal';
import WebHeader from '../components/WebHeader';
import WebOrderSuccessModal from '../components/WebOrderSuccessModal';
import WebProductCard from '../components/WebProductCard';

import {
  createWebOrder,
  WebFulfillmentType,
} from '../services/webOrderService';

import {
  addConfiguredProductToCart,
  getCartSummary,
  removeCartItem,
  updateCartQuantity,
} from '../utils/webCart';

import {
  createRequestId,
  createWebOrderFingerprint,
} from '../utils/webOrderRequest';

import styles from './WebMenuScreen.styles';

function getColumns(
  width: number,
): number {
  if (width >= 1100) {
    return 4;
  }

  if (width >= 760) {
    return 3;
  }

  if (width >= 520) {
    return 2;
  }

  return 1;
}

function normalizeText(
  value:
    | string
    | null
    | undefined,
): string {
  return (
    value ?? ''
  )
    .normalize('NFD')
    .replace(
      /[\u0300-\u036f]/g,
      '',
    )
    .trim()
    .toLocaleLowerCase(
      'es',
    );
}

export default function WebMenuScreen() {
  const {
    width: windowWidth,
  } = useWindowDimensions();

  const [
    categories,
    setCategories,
  ] = useState<Category[]>([]);

  const [
    products,
    setProducts,
  ] = useState<Product[]>([]);

  const [
    selectedCategoryId,
    setSelectedCategoryId,
  ] = useState<
    string | null
  >(null);

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    refreshing,
    setRefreshing,
  ] = useState(false);

  const [
    error,
    setError,
  ] = useState<
    string | null
  >(null);

  const [
    selectedProduct,
    setSelectedProduct,
  ] = useState<
    Product | null
  >(null);

  const [
    productNotes,
    setProductNotes,
  ] = useState('');

  const [
    isConfiguratorVisible,
    setIsConfiguratorVisible,
  ] = useState(false);

  const [
    cart,
    setCart,
  ] = useState<Cart>([]);

  const [
    isCartVisible,
    setIsCartVisible,
  ] = useState(false);

  const [
    isCheckoutVisible,
    setIsCheckoutVisible,
  ] = useState(false);

  const [
    weeklySauce,
    setWeeklySauce,
  ] = useState<
    WeeklySauce | null
  >(null);

  const [
    isSubmittingOrder,
    setIsSubmittingOrder,
  ] = useState(false);

  const [
    submitError,
    setSubmitError,
  ] = useState<
    string | null
  >(null);

  const [
    successfulOrderId,
    setSuccessfulOrderId,
  ] = useState<
    string | null
  >(null);

  const pendingWebOrderRequest =
    useRef<{
      id: string;
      fingerprint: string;
    } | null>(null);

  const {
    meats,
    sauces,
    isLoading:
      areModifiersLoading,
    error:
      modifiersError,
  } = useModifiers();

  const visibleCategories =
    useMemo(() => {
      const hiddenCategoryNames =
        [
          'Complementos de combo',
          'Domicilio',
        ].map(
          normalizeText,
        );

      return categories
        .filter(
          (category) =>
            !hiddenCategoryNames.includes(
              normalizeText(
                category.name,
              ),
            ),
        )
        .sort(
          (
            first,
            second,
          ) =>
            first.name.localeCompare(
              second.name,
              'es',
              {
                sensitivity:
                  'base',
              },
            ),
        );
    }, [categories]);

  const deliveryProduct =
    useMemo(
      () =>
        products.find(
          (product) =>
            isDeliveryProduct(
              product,
            ),
        ) ??
        null,
      [products],
    );

  const deliveryFee =
    deliveryProduct
      ? Number(
          deliveryProduct.price,
        )
      : 0;

  async function loadMenu(
    isRefresh = false,
  ) {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setError(null);

      const [
        loadedCategories,
        loadedProducts,
        loadedWeeklySauce,
      ] =
        await Promise.all([
          getActiveCategories(),
          getActiveProducts(),
          getActiveWeeklySauce()
            .catch(
              () => null,
            ),
        ]);

      setCategories(
        loadedCategories,
      );

      setProducts(
        loadedProducts,
      );

      setWeeklySauce(
        loadedWeeklySauce,
      );

      const hiddenCategoryNames =
        [
          'Complementos de combo',
          'Domicilio',
        ].map(
          normalizeText,
        );

      const firstVisibleCategory =
        loadedCategories
          .filter(
            (category) =>
              !hiddenCategoryNames.includes(
                normalizeText(
                  category.name,
                ),
              ),
          )
          .sort(
            (
              first,
              second,
            ) =>
              first.name.localeCompare(
                second.name,
                'es',
                {
                  sensitivity:
                    'base',
                },
              ),
          )[0] ??
        null;

      setSelectedCategoryId(
        (current) => {
          if (
            current &&
            loadedCategories.some(
              (category) =>
                category.id ===
                current &&
                !hiddenCategoryNames.includes(
                  normalizeText(
                    category.name,
                  ),
                ),
            )
          ) {
            return current;
          }

          return (
            firstVisibleCategory
              ?.id ?? null
          );
        },
      );
    } catch (loadError) {
      console.error(
        'Error cargando menú web:',
        loadError,
      );

      setError(
        'No pudimos cargar el menú. Intenta nuevamente.',
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    void loadMenu();
  }, []);

  const visibleProducts =
    useMemo(
      () =>
        selectedCategoryId
          ? products
              .filter(
                (product) =>
                  product.category_id ===
                    selectedCategoryId &&
                  !isDeliveryProduct(
                    product,
                  ),
              )
              .sort(
                (
                  first,
                  second,
                ) => {
                  const priceDifference =
                    Number(
                      first.price,
                    ) -
                    Number(
                      second.price,
                    );

                  if (
                    priceDifference !==
                    0
                  ) {
                    return priceDifference;
                  }

                  return first.name.localeCompare(
                    second.name,
                    'es',
                    {
                      sensitivity:
                        'base',
                    },
                  );
                },
              )
          : [],
      [
        products,
        selectedCategoryId,
      ],
    );

  const selectedProductCategory =
    categories.find(
      (category) =>
        category.id ===
        selectedProduct
          ?.category_id,
    ) ?? null;

  const modifierMode =
    getProductModifierMode(
      selectedProduct,
      selectedProductCategory
        ?.name,
    );

  const selectedProductIsKongBurger =
    isKongBurger(
      selectedProduct,
    );

  const cartSummary =
    useMemo(
      () =>
        getCartSummary(
          cart,
          weeklySauce,
        ),
      [
        cart,
        weeklySauce,
      ],
    );

  const columns =
    getColumns(
      windowWidth,
    );

  const availableWidth =
    Math.min(
      windowWidth,
      1180,
    ) - 40;

  const gap = 16;

  const cardWidth =
    Math.max(
      220,
      (
        availableWidth -
        gap *
          (columns - 1)
      ) /
        columns,
    );

  const handleProductPress = (
    product: Product,
  ) => {
    setSelectedProduct(
      product,
    );

    setProductNotes('');

    setIsConfiguratorVisible(
      true,
    );
  };

  const handleCloseConfigurator =
    () => {
      setIsConfiguratorVisible(
        false,
      );

      setSelectedProduct(
        null,
      );

      setProductNotes('');
    };

  const handleConfirmConfiguration =
    (
      configuration:
        ProductConfigurationResult,
    ) => {
      if (
        !selectedProduct
      ) {
        return;
      }

      setCart(
        (currentCart) =>
          addConfiguredProductToCart(
            currentCart,
            selectedProduct,
            productNotes,
            configuration,
          ),
      );

      pendingWebOrderRequest
        .current = null;

      handleCloseConfigurator();
    };

  function handleCartMutation(
    nextCart: Cart,
  ) {
    setCart(
      nextCart,
    );

    pendingWebOrderRequest
      .current = null;
  }

  async function handleSubmitWebOrder(
    data: {
      fulfillmentType:
        WebFulfillmentType;

      customerName: string;
      customerPhone: string;

      deliveryDetails:
        DeliveryDetails | null;
    },
  ) {
    if (
      cart.length === 0 ||
      isSubmittingOrder
    ) {
      return;
    }

    setSubmitError(null);

    const fingerprint =
      createWebOrderFingerprint(
        cart,
        data.fulfillmentType,
        data.customerName,
        data.customerPhone,
        data.deliveryDetails,
      );

    if (
      !pendingWebOrderRequest
        .current ||
      pendingWebOrderRequest
        .current
        .fingerprint !==
        fingerprint
    ) {
      pendingWebOrderRequest
        .current = {
        id:
          createRequestId(),

        fingerprint,
      };
    }

    const requestId =
      pendingWebOrderRequest
        .current.id;

    try {
      setIsSubmittingOrder(
        true,
      );

      const result =
        await createWebOrder({
          cart,

          customerName:
            data.customerName,

          customerPhone:
            data.customerPhone,

          fulfillmentType:
            data.fulfillmentType,

          deliveryDetails:
            data.deliveryDetails,

          clientRequestId:
            requestId,
        });

      setSuccessfulOrderId(
        result.orderId,
      );

      setCart([]);

      setIsCartVisible(
        false,
      );

      setIsCheckoutVisible(
        false,
      );

      pendingWebOrderRequest
        .current = null;
    } catch (orderError) {
      console.error(
        'Error creando pedido web:',
        orderError,
      );

      setSubmitError(
        orderError instanceof
          Error
          ? orderError.message
          : 'No se pudo crear el pedido. Intenta nuevamente.',
      );
    } finally {
      setIsSubmittingOrder(
        false,
      );
    }
  }

  return (
    <View style={styles.screen}>
      <WebHeader />

      {visibleCategories.length >
        0 && (
        <WebCategoryTabs
          categories={
            visibleCategories
          }
          selectedCategoryId={
            selectedCategoryId
          }
          onSelectCategory={
            setSelectedCategoryId
          }
        />
      )}

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.scrollContent,
          cartSummary.totalItems >
            0 &&
            styles.scrollContentWithCart,
        ]}
        refreshControl={
          <RefreshControl
            refreshing={
              refreshing
            }
            onRefresh={() =>
              void loadMenu(
                true,
              )
            }
            tintColor="#FFB000"
          />
        }
      >
        {loading ? (
          <View
            style={
              styles.centerState
            }
          >
            <ActivityIndicator
              size="large"
              color="#FFB000"
            />

            <Text
              style={
                styles.stateText
              }
            >
              Cargando menú...
            </Text>
          </View>
        ) : error ? (
          <View
            style={
              styles.centerState
            }
          >
            <Text
              style={
                styles.errorTitle
              }
            >
              Algo salió mal
            </Text>

            <Text
              style={
                styles.stateText
              }
            >
              {error}
            </Text>
          </View>
        ) : (
          <>
            <View
              style={
                styles.sectionHeader
              }
            >
              <Text
                style={
                  styles.sectionTitle
                }
              >
                {
                  visibleCategories.find(
                    (category) =>
                      category.id ===
                      selectedCategoryId,
                  )?.name ??
                  'Menú'
                }
              </Text>

              <Text
                style={
                  styles.productCount
                }
              >
                {
                  visibleProducts.length
                }{' '}
                producto
                {
                  visibleProducts.length ===
                  1
                    ? ''
                    : 's'
                }
              </Text>
            </View>

            {visibleProducts.length ===
            0 ? (
              <View
                style={
                  styles.centerState
                }
              >
                <Text
                  style={
                    styles.stateText
                  }
                >
                  No hay productos disponibles en esta categoría.
                </Text>
              </View>
            ) : (
              <View
                style={
                  styles.grid
                }
              >
                {visibleProducts.map(
                  (product) => (
                    <WebProductCard
                      key={
                        product.id
                      }
                      product={
                        product
                      }
                      width={
                        cardWidth
                      }
                      onPress={
                        handleProductPress
                      }
                    />
                  ),
                )}
              </View>
            )}
          </>
        )}
      </ScrollView>

      <WebCartButton
        totalItems={
          cartSummary.totalItems
        }
        total={
          cartSummary.total
        }
        onPress={() =>
          setIsCartVisible(
            true,
          )
        }
      />

      <ProductConfiguratorModal
        visible={
          isConfiguratorVisible
        }
        product={
          selectedProduct
        }
        products={
          products
        }
        categories={
          categories
        }
        notes={
          productNotes
        }
        mode={
          modifierMode
        }
        isKongBurger={
          selectedProductIsKongBurger
        }
        meats={
          meats
        }
        sauces={
          sauces
        }
        isLoading={
          areModifiersLoading
        }
        error={
          modifiersError
        }
        onNotesChange={
          setProductNotes
        }
        onClose={
          handleCloseConfigurator
        }
        onConfirm={
          handleConfirmConfiguration
        }
      />

      <WebCartModal
        visible={
          isCartVisible
        }
        cart={
          cart
        }
        subtotal={
          cartSummary.subtotal
        }
        weeklySauceDiscount={
          cartSummary
            .weeklySauceDiscount
        }
        total={
          cartSummary.total
        }
        onClose={() =>
          setIsCartVisible(
            false,
          )
        }
        onUpdateQuantity={
          (
            itemId,
            change,
          ) => {
            const nextCart =
              updateCartQuantity(
                cart,
                itemId,
                change,
              );

            handleCartMutation(
              nextCart,
            );
          }
        }
        onRemoveItem={
          (itemId) => {
            const nextCart =
              removeCartItem(
                cart,
                itemId,
              );

            handleCartMutation(
              nextCart,
            );
          }
        }
        onClearCart={() => {
          handleCartMutation(
            [],
          );

          setIsCartVisible(
            false,
          );
        }}
        onContinue={() => {
          setSubmitError(
            null,
          );

          setIsCartVisible(
            false,
          );

          setIsCheckoutVisible(
            true,
          );
        }}
      />

      <WebCheckoutModal
        visible={
          isCheckoutVisible
        }
        subtotal={
          cartSummary.subtotal
        }
        weeklySauceDiscount={
          cartSummary
            .weeklySauceDiscount
        }
        pickupTotal={
          cartSummary.total
        }
        deliveryFee={
          deliveryFee
        }
        submitting={
          isSubmittingOrder
        }
        submitError={
          submitError
        }
        onClose={() => {
          if (
            isSubmittingOrder
          ) {
            return;
          }

          setSubmitError(
            null,
          );

          setIsCheckoutVisible(
            false,
          );
        }}
        onSubmit={
          handleSubmitWebOrder
        }
      />

      <WebOrderSuccessModal
        visible={
          !!successfulOrderId
        }
        orderId={
          successfulOrderId
        }
        onClose={() =>
          setSuccessfulOrderId(
            null,
          )
        }
      />
    </View>
  );
}
