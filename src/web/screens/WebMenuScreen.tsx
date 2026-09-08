import React, {
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import {
  ActivityIndicator,
  Alert,
  Pressable,
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
  getOrderTrackingCode,
} from '../../Utils/orderTracking';

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
import { WebOrderTrackingModal } from '../components/WebOrderTrackingModal';
import WebProductCard from '../components/WebProductCard';

import {
  createWebOrder,
  WebFulfillmentType,
} from '../services/webOrderService';

import {
  getPublicBusinessStatus,
  PublicBusinessStatus,
} from '../services/webBusinessHoursService';

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

import {
  getLastWebOrderTrackingCode,
  saveLastWebOrderTrackingCode,
} from '../utils/webOrderHistory';

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

function getTrackingCodeFromPath():
  | string
  | null {
  if (
    typeof window ===
    'undefined'
  ) {
    return null;
  }

  const match =
    window.location.pathname.match(
      /^\/pedido\/([0-9a-fA-F]{8})\/?$/,
    );

  return match?.[1]
    ? match[1].toUpperCase()
    : null;
}

function updateTrackingPath(
  trackingCode:
    | string
    | null,
): void {
  if (
    typeof window ===
    'undefined'
  ) {
    return;
  }

  const nextPath =
    trackingCode
      ? `/pedido/${trackingCode}`
      : '/';

  if (
    window.location.pathname ===
    nextPath
  ) {
    return;
  }

  window.history.pushState(
    {},
    '',
    nextPath,
  );
}

function formatBusinessTime(
  value:
    | string
    | null
    | undefined,
): string {
  if (!value) {
    return '';
  }

  const [
    hourText,
    minuteText,
  ] = value
    .slice(
      0,
      5,
    )
    .split(':');

  const hour =
    Number(
      hourText,
    );

  if (
    !Number.isFinite(
      hour,
    )
  ) {
    return value;
  }

  const suffix =
    hour >= 12
      ? 'PM'
      : 'AM';

  const hour12 =
    hour % 12 ||
    12;

  return `${hour12}:${minuteText} ${suffix}`;
}

function getBusinessAvailabilityText(
  status:
    | PublicBusinessStatus
    | null,
): string {
  if (!status) {
    return 'No pudimos confirmar el horario.';
  }

  if (!status.webOrdersEnabled) {
    return (
      status.pauseMessage?.trim() ||
      'Los pedidos web están pausados temporalmente.'
    );
  }

  if (!status.todayIsOpen) {
    return 'Hoy no laboramos.';
  }

  if (!status.isWithinBusinessHours) {
    return `Horario de hoy: ${formatBusinessTime(
      status.todayOpenTime,
    )} - ${formatBusinessTime(
      status.todayCloseTime,
    )}`;
  }

  return `Horario de hoy: ${formatBusinessTime(
    status.todayOpenTime,
  )} - ${formatBusinessTime(
    status.todayCloseTime,
  )}`;
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

  const [
    lastTrackingCode,
    setLastTrackingCode,
  ] = useState<
    string | null
  >(null);

  const [
    isTrackingVisible,
    setIsTrackingVisible,
  ] = useState(false);

  const [
    trackingInitialCode,
    setTrackingInitialCode,
  ] = useState<
    string | null
  >(null);

  const [
    businessStatus,
    setBusinessStatus,
  ] = useState<
    PublicBusinessStatus | null
  >(null);

  const [
    isBusinessStatusLoading,
    setIsBusinessStatusLoading,
  ] = useState(true);

  const [
    businessStatusError,
    setBusinessStatusError,
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

  async function loadBusinessStatus():
    Promise<
      PublicBusinessStatus | null
    > {
    try {
      setBusinessStatusError(
        null,
      );

      const status =
        await getPublicBusinessStatus();

      setBusinessStatus(
        status,
      );

      return status;
    } catch (statusError) {
      console.error(
        'Error cargando horario del negocio:',
        statusError,
      );

      setBusinessStatusError(
        'No pudimos confirmar si estamos abiertos.',
      );

      setBusinessStatus(
        null,
      );

      return null;
    } finally {
      setIsBusinessStatusLoading(
        false,
      );
    }
  }

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
        loadedBusinessStatus,
      ] =
        await Promise.all([
          getActiveCategories(),
          getActiveProducts(),
          getActiveWeeklySauce()
            .catch(
              () => null,
            ),
          getPublicBusinessStatus()
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

      setBusinessStatus(
        loadedBusinessStatus,
      );

      setBusinessStatusError(
        loadedBusinessStatus
          ? null
          : 'No pudimos confirmar si estamos abiertos.',
      );

      setIsBusinessStatusLoading(
        false,
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

  useEffect(() => {
    const intervalId =
      setInterval(
        () => {
          void loadBusinessStatus();
        },
        60_000,
      );

    return () => {
      clearInterval(
        intervalId,
      );
    };
  }, []);

  useEffect(() => {
    setLastTrackingCode(
      getLastWebOrderTrackingCode(),
    );
  }, []);

  useEffect(() => {
    const syncTrackingFromPath =
      () => {
        const code =
          getTrackingCodeFromPath();

        if (code) {
          setTrackingInitialCode(
            code,
          );

          setIsTrackingVisible(
            true,
          );

          return;
        }

        setIsTrackingVisible(
          false,
        );

        setTrackingInitialCode(
          null,
        );
      };

    syncTrackingFromPath();

    if (
      typeof window ===
      'undefined'
    ) {
      return;
    }

    window.addEventListener(
      'popstate',
      syncTrackingFromPath,
    );

    return () => {
      window.removeEventListener(
        'popstate',
        syncTrackingFromPath,
      );
    };
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

  const canCheckout =
    businessStatus?.isOpen ===
    true;

  const businessScheduleText =
    getBusinessAvailabilityText(
      businessStatus,
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

  function handleContinueToCheckout():
    void {
    if (
      isBusinessStatusLoading
    ) {
      Alert.alert(
        'Verificando horario',
        'Espera un momento mientras confirmamos si estamos recibiendo pedidos.',
      );

      return;
    }

    if (
      !canCheckout
    ) {
      Alert.alert(
        'Pedidos no disponibles',
        businessStatusError ??
        (
          businessStatus
            ? `En este momento estamos cerrados. ${businessScheduleText}`
            : 'No pudimos confirmar el horario. Intenta nuevamente en un momento.'
        ),
      );

      return;
    }

    setSubmitError(
      null,
    );

    setIsCartVisible(
      false,
    );

    setIsCheckoutVisible(
      true,
    );
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

    const latestBusinessStatus =
      await loadBusinessStatus();

    if (
      !latestBusinessStatus
        ?.isOpen
    ) {
      setSubmitError(
        latestBusinessStatus
          ? `En este momento estamos cerrados. ${getBusinessAvailabilityText(
            latestBusinessStatus,
          )}`
          : 'No pudimos confirmar el horario de atención. Intenta nuevamente.',
      );

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

      const trackingCode =
        getOrderTrackingCode(
          result.orderId,
        );

      saveLastWebOrderTrackingCode(
        trackingCode,
      );

      setLastTrackingCode(
        trackingCode,
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

  function handleOpenLastOrderTracking() {
    if (
      !lastTrackingCode
    ) {
      return;
    }

    updateTrackingPath(
      lastTrackingCode,
    );

    setTrackingInitialCode(
      lastTrackingCode,
    );

    setIsTrackingVisible(
      true,
    );
  }

  function handleOpenManualTracking() {
    updateTrackingPath(
      null,
    );

    setTrackingInitialCode(
      null,
    );

    setIsTrackingVisible(
      true,
    );
  }

  function handleTrackSuccessfulOrder() {
    if (
      !successfulOrderId
    ) {
      return;
    }

    const trackingCode =
      getOrderTrackingCode(
        successfulOrderId,
      );

    updateTrackingPath(
      trackingCode,
    );

    setTrackingInitialCode(
      trackingCode,
    );

    setSuccessfulOrderId(
      null,
    );

    setIsTrackingVisible(
      true,
    );
  }

  function handleCloseTracking() {
    updateTrackingPath(
      null,
    );

    setIsTrackingVisible(
      false,
    );

    setTrackingInitialCode(
      null,
    );
  }

  return (
    <View style={styles.screen}>
      <WebHeader />

      <View
        style={{
          width: '100%',
          maxWidth: 1180,
          alignSelf: 'center',
          paddingHorizontal: 20,
          paddingTop: 12,
          flexDirection: 'row',
          justifyContent: 'flex-end',
          alignItems: 'center',
          gap: 10,
          flexWrap: 'wrap',
        }}
      >
        {lastTrackingCode ? (
          <Pressable
            onPress={
              handleOpenLastOrderTracking
            }
            style={({ pressed }) => ({
              borderWidth: 1,
              borderColor: '#444',
              borderRadius: 10,
              paddingHorizontal: 14,
              paddingVertical: 9,
              backgroundColor:
                pressed
                  ? '#242424'
                  : '#151515',
            })}
          >
            <Text
              style={{
                color: '#FFFFFF',
                fontWeight: '800',
                fontSize: 13,
              }}
            >
              Último pedido #{lastTrackingCode}
            </Text>
          </Pressable>
        ) : null}

        <Pressable
          onPress={
            handleOpenManualTracking
          }
          style={({ pressed }) => ({
            borderWidth: 1,
            borderColor: '#FFB000',
            borderRadius: 10,
            paddingHorizontal: 14,
            paddingVertical: 9,
            backgroundColor:
              pressed
                ? '#2B250C'
                : '#151515',
          })}
        >
          <Text
            style={{
              color: '#FFB000',
              fontWeight: '900',
              fontSize: 13,
            }}
          >
            Seguir pedido
          </Text>
        </Pressable>
      </View>

      <View
        style={
          styles.businessStatusOuter
        }
      >
        <View
          style={[
            styles.businessStatusCard,

            canCheckout
              ? styles.businessStatusCardOpen
              : styles.businessStatusCardClosed,
          ]}
        >
          <View
            style={
              styles.businessStatusMain
            }
          >
            <Text
              style={
                styles.businessStatusIcon
              }
            >
              {isBusinessStatusLoading
                ? '⏳'
                : canCheckout
                  ? '🟢'
                  : '🔴'}
            </Text>

            <View
              style={
                styles.businessStatusTextBox
              }
            >
              <Text
                style={[
                  styles.businessStatusTitle,

                  canCheckout
                    ? styles.businessStatusTitleOpen
                    : styles.businessStatusTitleClosed,
                ]}
              >
                {isBusinessStatusLoading
                  ? 'Verificando horario'
                  : canCheckout
                    ? 'Abierto · Estamos recibiendo pedidos'
                    : businessStatus?.webOrdersEnabled === false
                      ? 'Pedidos web pausados'
                      : 'Cerrado · Pedidos no disponibles'}
              </Text>

              <Text
                style={
                  styles.businessStatusSubtitle
                }
              >
                {isBusinessStatusLoading
                  ? 'Consultando el horario de atención...'
                  : businessStatusError ??
                  businessScheduleText}
              </Text>
            </View>
          </View>

          {!canCheckout &&
            !isBusinessStatusLoading && (
              <Text
                style={
                  styles.businessStatusNotice
                }
              >
                Puedes consultar el menú y preparar tu carrito, pero el checkout
                estará disponible cuando el negocio esté abierto.
              </Text>
            )}
        </View>
      </View>

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
        canCheckout={
          canCheckout
        }
        checkoutDisabledMessage={
          isBusinessStatusLoading
            ? 'Estamos verificando el horario de atención.'
            : businessStatusError ??
            (
              businessStatus
                ? businessScheduleText
                : 'No pudimos confirmar el horario de atención. Intenta nuevamente en un momento.'
            )
        }
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
        onContinue={
          handleContinueToCheckout
        }
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
        onTrackOrder={
          handleTrackSuccessfulOrder
        }
        onClose={() =>
          setSuccessfulOrderId(
            null,
          )
        }
      />

      <WebOrderTrackingModal
        visible={
          isTrackingVisible
        }
        initialTrackingCode={
          trackingInitialCode
        }
        onClose={
          handleCloseTracking
        }
      />
    </View>
  );
}