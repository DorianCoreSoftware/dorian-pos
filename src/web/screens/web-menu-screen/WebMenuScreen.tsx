import { useBusiness } from '../../../context/BusinessContext';

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
} from '../../../components/ProductConfigurator/ProductConfiguratorModal';
import {
  getActiveCategories,
} from '../../../services/categoryService';
import {
  getActiveProducts,
} from '../../../services/products';
import {
  getActiveModifierPromotion,
  ModifierPromotion,
} from '../../../services/modifierPromotionService';
import {
  isDeliveryProduct,
} from '../../../Utils/delivery';
import {
  getOrderTrackingCode,
} from '../../../Utils/orderTracking';
import {
  Cart,
  Category,
  DeliveryDetails,
  Product,
} from '../../../types';
import {
  createWebOrder,
  WebFulfillmentType,
} from '../../services/web-order/webOrderService';
import {
  getPublicBusinessStatus,
  PublicBusinessStatus,
} from '../../services/web-business-hours/webBusinessHoursService';
import {
  getPublicWebBanners,
  WebBanner,
} from '../../../services/webBannerService';
import {
  addConfiguredProductToCart,
  getCartSummary,
  removeCartItem,
  updateCartQuantity,
} from '../../utils/webCart';
import {
  createRequestId,
  createWebOrderFingerprint,
} from '../../utils/webOrderRequest';
import {
  getRecentWebOrderTrackingCodes,
  saveWebOrderTrackingCode,
} from '../../utils/webOrderHistory';
import styles, {
  setBrandPrimaryColor,
} from './WebMenuScreen.styles';
import WebCartButton from '../../components/web-cart/web-cart-button/WebCartButton';
import WebCartModal from '../../components/web-cart/web-cart-modal/WebCartModal';
import WebCategoryTabs from '../../components/web-category-tabs/WebCategoryTabs';
import WebCheckoutModal from '../../components/web-checkout-modal/WebCheckoutModal';
import { WebFeedbackModal } from '../../components/web-feedback-modal/WebFeedbackModal';
import WebHeader from '../../components/web-header/WebHeader';
import WebOrderSuccessModal from '../../components/web-order-success-modal/WebOrderSuccessModal';
import { WebOrderTrackingModal } from '../../components/web-order-tracking-modal/WebOrderTrackingModal';
import WebProductCard from '../../components/web-product-card/WebProductCard';
import WebOrderEntryChoiceModal from '../../components/web-order-entry-choice-modal/WebOrderEntryChoiceModal';
import WebBannerCarousel from '../../components/web-banner-carousel/WebBannerCarousel';
import {
  getSavedWebCart,
  getSavedWebOrderMode,
  saveWebCart,
  saveWebOrderMode,
  clearSavedWebOrderMode,
} from '../../utils/webCartStorage';
import {
  clearSavedWebCustomerSessionToken,
  getSavedWebCustomerSessionToken,
} from '../../utils/webCustomerStorage';
import {
  getMyWebCustomer,
  isInvalidWebCustomerSessionError,
  WebCustomerProfile,
} from '../../services/web-customer/webCustomerService';

interface WebMenuScreenProps {
  onRewardsPress?: () => void;
  onAccountPress?: () => void;
  onEventsPress?: () => void;
}

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
const MARKETING_TRACKING_STORAGE_KEY =
  'dorian_marketing_tracking_token';

function getMarketingTrackingToken():
  | string
  | null {
  if (
    typeof window ===
    'undefined'
  ) {
    return null;
  }

  const urlToken =
    new URLSearchParams(
      window.location.search,
    )
      .get('mkt')
      ?.trim() ||
    null;

  if (urlToken) {
    try {
      window.sessionStorage.setItem(
        MARKETING_TRACKING_STORAGE_KEY,
        urlToken,
      );
    } catch {
      // sessionStorage puede estar bloqueado.
    }

    return urlToken;
  }

  try {
    return (
      window.sessionStorage.getItem(
        MARKETING_TRACKING_STORAGE_KEY,
      )
        ?.trim() ||
      null
    );
  } catch {
    return null;
  }
}

function clearMarketingTrackingToken():
void {
  if (
    typeof window ===
    'undefined'
  ) {
    return;
  }

  try {
    window.sessionStorage.removeItem(
      MARKETING_TRACKING_STORAGE_KEY,
    );
  } catch {
    // sessionStorage puede estar bloqueado.
  }
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
  if (
    status.todayIsException &&
    !status.todayIsOpen
  ) {
    return (
      status.exceptionReason?.trim() ||
      'Hoy no laboramos.'
    );
  }
  if (!status.todayIsOpen) {
    return 'Hoy no laboramos.';
  }
  const schedule =
    `Horario de hoy: ${formatBusinessTime(
      status.todayOpenTime,
    )} - ${formatBusinessTime(
      status.todayCloseTime,
    )}`;
  if (
    status.todayIsException &&
    status.exceptionReason?.trim()
  ) {
    return `${status.exceptionReason.trim()} · ${schedule}`;
  }
  return schedule;
}

interface SocialLinkItem {
  key: string;
  label: string;
  icon: string;
  url: string;
}

function openExternalUrl(
  url: string,
): void {
  if (
    typeof window ===
    'undefined'
  ) {
    return;
  }

  window.open(
    url,
    '_blank',
    'noopener,noreferrer',
  );
}

export default function WebMenuScreen({
  onRewardsPress,
  onAccountPress,
  onEventsPress,
}: WebMenuScreenProps) {
  const {
    business,
    theme: businessTheme,
  } = useBusiness();
  setBrandPrimaryColor(businessTheme.primary);

  const [
    isFeedbackVisible,
    setIsFeedbackVisible,
  ] = useState(false);
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
    webBanners,
    setWebBanners,
  ] = useState<WebBanner[]>([]);
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
  ] = useState<Cart>(
    () =>
      getSavedWebCart(),
  );
  const [
    isOrderEntryChoiceVisible,
    setIsOrderEntryChoiceVisible,
  ] = useState(false);
  const [
    isCartVisible,
    setIsCartVisible,
  ] = useState(false);

  const [
    webCustomerProfile,
    setWebCustomerProfile,
  ] = useState<WebCustomerProfile | null>(
    null,
  );

  useEffect(
    () => {
      let mounted = true;

      const restoreCustomer =
        async (): Promise<void> => {
          const token =
            getSavedWebCustomerSessionToken();

          if (!token) {
            if (mounted) {
              setWebCustomerProfile(
                null,
              );
            }
            return;
          }

          try {
            const customer =
              await getMyWebCustomer(
                token,
              );

            if (mounted) {
              setWebCustomerProfile(
                customer,
              );
            }
          } catch (error) {
            console.error(
              'Error restaurando cliente web en menú:',
              error,
            );

            if (
              isInvalidWebCustomerSessionError(
                error,
              )
            ) {
              clearSavedWebCustomerSessionToken();

              if (mounted) {
                setWebCustomerProfile(
                  null,
                );
              }
            }
          }
        };

      void restoreCustomer();

      return () => {
        mounted = false;
      };
    },
    [],
  );

  useEffect(
    () => {
      saveWebCart(
        cart,
      );

      if (
        cart.length === 0
      ) {
        clearSavedWebOrderMode();
      }
    },
    [cart],
  );
  const [
    isCheckoutVisible,
    setIsCheckoutVisible,
  ] = useState(false);
  const [
    modifierPromotion,
    setModifierPromotion,
  ] = useState<
    ModifierPromotion | null
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
    recentTrackingCodes,
    setRecentTrackingCodes,
  ] = useState<string[]>([]);
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
    marketingTrackingToken,
  ] = useState<
    string | null
  >(
    () =>
      getMarketingTrackingToken(),
  );
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
  const menuScrollRef =
    useRef<ScrollView | null>(
      null,
    );
  const productSectionTopRef =
    useRef(0);
  const pendingWebOrderRequest =
    useRef<{
      id: string;
      fingerprint: string;
    } | null>(null);

  const socialLinks =
    useMemo<SocialLinkItem[]>(
      () => {
        const links =
          business?.socialLinks;

        if (!links) {
          return [];
        }

        return [
          {
            key: 'facebook',
            label: 'Facebook',
            icon: 'f',
            url: links.facebookUrl,
          },
          {
            key: 'instagram',
            label: 'Instagram',
            icon: '◎',
            url: links.instagramUrl,
          },
          {
            key: 'tiktok',
            label: 'TikTok',
            icon: '♪',
            url: links.tiktokUrl,
          },
          {
            key: 'whatsapp',
            label: 'WhatsApp',
            icon: '◉',
            url: links.whatsapp,
          },
          {
            key: 'website',
            label: 'Sitio web',
            icon: '↗',
            url: links.websiteUrl,
          },
        ].filter(
          link =>
            !!link.url.trim(),
        );
      },
      [business?.socialLinks],
    );
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
        loadedModifierPromotion,
        loadedBusinessStatus,
        loadedWebBanners,
      ] =
        await Promise.all([
          getActiveCategories(),
          getActiveProducts(),
          getActiveModifierPromotion()
            .catch(
              () => null,
            ),
          getPublicBusinessStatus()
            .catch(
              () => null,
            ),
          getPublicWebBanners()
            .catch(
              () => [],
            ),
        ]);
      setCategories(
        loadedCategories,
      );
      setProducts(
        loadedProducts,
      );
      setModifierPromotion(
        loadedModifierPromotion,
      );
      setBusinessStatus(
        loadedBusinessStatus,
      );
      setWebBanners(
        loadedWebBanners,
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
    setRecentTrackingCodes(
      getRecentWebOrderTrackingCodes(),
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
  const cartSummary =
    useMemo(
      () =>
        getCartSummary(
          cart,
          modifierPromotion,
        ),
      [
        cart,
        modifierPromotion,
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
  function handleCategorySelect(
    categoryId: string,
  ): void {
    setSelectedCategoryId(
      categoryId,
    );
    requestAnimationFrame(
      () => {
        menuScrollRef.current?.scrollTo({
          y:
            productSectionTopRef.current,
          animated:
            true,
        });
      },
    );
  }
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

      const nextCart =
        addConfiguredProductToCart(
          cart,
          selectedProduct,
          productNotes,
          configuration,
        );

      setCart(
        nextCart,
      );

      const hasCustomerSession =
        !!getSavedWebCustomerSessionToken();

      const hasGuestChoice =
        getSavedWebOrderMode() ===
        'guest';

      if (
        !hasCustomerSession &&
        !hasGuestChoice
      ) {
        setIsOrderEntryChoiceVisible(
          true,
        );
      }

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
      marketingCode: string;
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
          customerSessionToken:
            getSavedWebCustomerSessionToken(),
          marketingCode:
            data.marketingCode,
          marketingToken:
            marketingTrackingToken,
        });
      setSuccessfulOrderId(
        result.orderId,
      );

      if (
        marketingTrackingToken ||
        data.marketingCode
          .trim()
      ) {
        clearMarketingTrackingToken();
      }

      const trackingCode =
        getOrderTrackingCode(
          result.orderId,
        );
      saveWebOrderTrackingCode(
        trackingCode,
      );
      setRecentTrackingCodes(
        getRecentWebOrderTrackingCodes(),
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
  function handleOpenOrderTracking(
    trackingCode: string,
  ): void {
    updateTrackingPath(
      trackingCode,
    );
    setTrackingInitialCode(
      trackingCode,
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
      <WebHeader
        onRewardsPress={
          onRewardsPress
        }
        onAccountPress={
          onAccountPress
        }
      />
      <ScrollView
        ref={
          menuScrollRef
        }
        style={
          styles.scroll
        }
        contentContainerStyle={[
          styles.scrollContent,
          cartSummary.totalItems >
          0 &&
          styles.scrollContentWithCart,
        ]}
        stickyHeaderIndices={[
          3,
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
            tintColor={businessTheme.primary}
          />
        }
      >
        <View
          style={
            styles.topArea
          }
        >
          {recentTrackingCodes.length >
            0 && (
              <View
                style={
                  styles.recentOrdersBlock
                }
              >
                <Text
                  style={
                    styles.recentOrdersLabel
                  }
                >
                  PEDIDOS RECIENTES
                </Text>
                <View
                  style={
                    styles.recentOrdersRow
                  }
                >
                  {recentTrackingCodes.map(
                    trackingCode => (
                      <Pressable
                        key={
                          trackingCode
                        }
                        onPress={() =>
                          handleOpenOrderTracking(
                            trackingCode,
                          )
                        }
                        style={({
                          pressed,
                        }) => [
                            styles.recentOrderButton,
                            pressed &&
                            styles.recentOrderButtonPressed,
                          ]}
                      >
                        <Text
                          style={
                            styles.recentOrderButtonText
                          }
                        >
                          #{trackingCode}
                        </Text>
                      </Pressable>
                    ),
                  )}
                </View>
              </View>
            )}
          <View
            style={
              styles.topActionsRow
            }
          >
            <Pressable
              onPress={
                handleOpenManualTracking
              }
              style={({
                pressed,
              }) => [
                  styles.topActionPrimary,
                  pressed &&
                  styles.topActionPressed,
                ]}
            >
              <Text
                style={
                  styles.topActionPrimaryText
                }
              >
                Seguir pedido
              </Text>
            </Pressable>
            <Pressable
              onPress={() =>
                setIsFeedbackVisible(
                  true,
                )
              }
              style={({
                pressed,
              }) => [
                  styles.topActionSecondary,
                  pressed &&
                  styles.topActionPressed,
                ]}
            >
              <Text
                style={
                  styles.topActionSecondaryText
                }
              >
                💬 Sugerencias
              </Text>
            </Pressable>
          </View>
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
        <WebBannerCarousel
          banners={
            webBanners
          }
        />
        <View
          style={
            styles.categorySticky
          }
        >
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
                  handleCategorySelect
                }
              />
            )}
        </View>
        <View
          onLayout={
            event => {
              productSectionTopRef.current =
                event.nativeEvent.layout.y;
            }
          }
          style={
            styles.productSection
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
                color={businessTheme.primary}
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
        </View>

        {socialLinks.length > 0 && (
          <View
            style={{
              width: '100%',
              maxWidth: 1180,
              alignSelf: 'center',
              marginTop: 28,
              marginBottom: 12,
              paddingHorizontal: 20,
              paddingTop: 22,
              paddingBottom: 24,
              borderTopWidth: 1,
              borderTopColor: businessTheme.border,
            }}
          >
            <Text
              style={{
                color: businessTheme.text,
                textAlign: 'center',
                fontSize: 15,
                fontWeight: '800',
              }}
            >
              Síguenos en nuestras redes sociales
            </Text>

            <View
              style={{
                flexDirection: 'row',
                flexWrap: 'wrap',
                justifyContent: 'center',
                gap: 10,
                marginTop: 14,
              }}
            >
              {socialLinks.map(
                link => (
                  <Pressable
                    key={link.key}
                    accessibilityRole="link"
                    accessibilityLabel={`Abrir ${link.label}`}
                    onPress={() =>
                      openExternalUrl(
                        link.url,
                      )
                    }
                    style={({
                      pressed,
                    }) => ({
                      minHeight: 42,
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 8,
                      paddingHorizontal: 14,
                      borderRadius: 999,
                      borderWidth: 1,
                      borderColor: businessTheme.border,
                      backgroundColor: businessTheme.surface,
                      opacity: pressed ? 0.72 : 1,
                    })}
                  >
                    <Text
                      style={{
                        color: businessTheme.primary,
                        fontSize: 16,
                        fontWeight: '900',
                      }}
                    >
                      {link.icon}
                    </Text>

                    <Text
                      style={{
                        color: businessTheme.text,
                        fontSize: 12,
                        fontWeight: '800',
                      }}
                    >
                      {link.label}
                    </Text>
                  </Pressable>
                ),
              )}
            </View>
          </View>
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
        notes={
          productNotes
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
        modifierPromotionDiscount={
          cartSummary
            .modifierPromotionDiscount
        }
        modifierPromotionName={
          modifierPromotion
            ?.display_name ?? null
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
        modifierPromotionDiscount={
          cartSummary
            .modifierPromotionDiscount
        }
        modifierPromotionName={
          modifierPromotion
            ?.display_name ?? null
        }
        pickupTotal={
          cartSummary.total
        }
        deliveryFee={
          deliveryFee
        }
        initialCustomerName={
          webCustomerProfile?.name ?? ''
        }
        initialCustomerPhone={
          webCustomerProfile?.phone ?? ''
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
      <WebOrderEntryChoiceModal
        visible={
          isOrderEntryChoiceVisible
        }
        onContinueAsGuest={() => {
          saveWebOrderMode(
            'guest',
          );
          setIsOrderEntryChoiceVisible(
            false,
          );
        }}
        onLogin={() => {
          setIsOrderEntryChoiceVisible(
            false,
          );
          onAccountPress?.();
        }}
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
      <WebFeedbackModal
        visible={
          isFeedbackVisible
        }
        onClose={() =>
          setIsFeedbackVisible(
            false,
          )
        }
      />
    </View>
  );
}
