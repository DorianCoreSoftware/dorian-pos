

import React, {
  useEffect,
  useMemo,
  useState,
} from 'react';

import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';

import styles, {
  setBrandPrimaryColor,
} from './WebCheckoutModal.styles';

import { useBusiness } from '../../../context/BusinessContext';
import { useCurrency } from '../../../hooks/useCurrency';
import {
  DeliveryQuote,
  FulfillmentAvailability,
  getDeliveryQuote,
  getFulfillmentAvailability,
} from '../../../services/deliveryService';
import { DeliveryDetails } from '../../../types';
import { WebFulfillmentType } from '../../services/web-order/webOrderService';
import { GooglePlaceSelection } from '../../models/google-place-autocomplete/google-place-selection';
import { BusinessTransferSettings, getPublicBusinessTransferSettings } from '../../../services/paymentAccountService';
import {
  QuantityPromotionDiscountLine,
} from '../../../services/quantityPromotionService';
import {
  PricingPromotionDiscountLine,
} from '../../../services/pricingPromotionService';
import GooglePlaceAutocomplete from '../google-place/GooglePlaceAutocomplete';
import {
  WebCustomerAddress,
} from '../../services/web-customer/webCustomerService';


interface CheckoutData {
  paymentMethod: 'cash' | 'transfer';

  fulfillmentType:
  WebFulfillmentType;

  customerName:
  string;

  customerPhone:
  string;

  marketingCode:
  string;

  deliveryDetails:
  DeliveryDetails | null;

  saveDeliveryAddress:
  boolean;
}

interface WebCheckoutModalProps {
  visible:
  boolean;

  subtotal:
  number;

  modifierPromotionDiscount:
  number;

  modifierPromotionName:
  string | null;

  quantityPromotionLines:
  QuantityPromotionDiscountLine[];

  pricingPromotionLines:
  PricingPromotionDiscountLine[];

  pickupTotal:
  number;

  deliveryFee:
  number;

  initialCustomerName?:
  string;

  initialCustomerPhone?:
  string;

  savedAddress?:
  WebCustomerAddress | null;

  canSaveAddress?:
  boolean;

  submitting:
  boolean;

  submitError:
  string | null;

  onClose:
  () => void;

  onSubmit:
  (
    data:
      CheckoutData,
  ) => void;
}

interface FormErrors {
  customerName?:
  string;

  customerPhone?:
  string;

  street?:
  string;

  exteriorNumber?:
  string;

  neighborhood?:
  string;
}

const EMPTY_DELIVERY:
  DeliveryDetails = {
  customerName:
    '',

  phone:
    '',

  street:
    '',

  exteriorNumber:
    '',

  interiorNumber:
    '',

  neighborhood:
    '',

  postalCode:
    '',

  deliveryReferences:
    '',

  latitude:
    null,

  longitude:
    null,
};

export default function WebCheckoutModal({
  visible,
  subtotal,
  modifierPromotionDiscount,
  modifierPromotionName,
  quantityPromotionLines,
  pricingPromotionLines,
  pickupTotal,
  deliveryFee,
  initialCustomerName = '',
  initialCustomerPhone = '',
  savedAddress = null,
  canSaveAddress = false,
  submitting,
  submitError,
  onClose,
  onSubmit,
}: WebCheckoutModalProps) {
  const { theme: businessTheme } = useBusiness();
  setBrandPrimaryColor(businessTheme.primary);

  const {
    formatCurrency,
  } = useCurrency();

  const [
    fulfillmentType,
    setFulfillmentType,
  ] =
    useState<WebFulfillmentType>(
      'pickup',
    );

  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'transfer'>('cash');
  const [transferSettings, setTransferSettings] = useState<BusinessTransferSettings | null>(null);
  const [transferLoading, setTransferLoading] = useState(false);

  const [
    customerName,
    setCustomerName,
  ] =
    useState('');

  const [
    customerPhone,
    setCustomerPhone,
  ] =
    useState('');

  const [
    marketingCode,
    setMarketingCode,
  ] =
    useState('');

  const [
    delivery,
    setDelivery,
  ] =
    useState<DeliveryDetails>({
      ...EMPTY_DELIVERY,
    });

  const [
    saveDeliveryAddress,
    setSaveDeliveryAddress,
  ] =
    useState(false);

  const [
    deliveryQuote,
    setDeliveryQuote,
  ] =
    useState<DeliveryQuote | null>(
      null,
    );

  const hasSelectedGooglePlace =
    delivery.latitude !== null &&
    delivery.longitude !== null;

  const [
    isQuotingDelivery,
    setIsQuotingDelivery,
  ] =
    useState(
      false,
    );

  const [
    deliveryQuoteError,
    setDeliveryQuoteError,
  ] =
    useState<string | null>(
      null,
    );

  const [
    fulfillmentAvailability,
    setFulfillmentAvailability,
  ] =
    useState<FulfillmentAvailability | null>(
      null,
    );

  const [
    isLoadingFulfillmentAvailability,
    setIsLoadingFulfillmentAvailability,
  ] =
    useState(false);

  const [
    errors,
    setErrors,
  ] =
    useState<FormErrors>(
      {},
    );

  useEffect(
    () => {
      if (
        visible
      ) {
        const cleanName =
          initialCustomerName.trim();

        const cleanPhone =
          initialCustomerPhone.replace(
            /\D/g,
            '',
          );

        setCustomerName(
          cleanName,
        );

        setPaymentMethod('cash');
        void (async () => {
          try {
            setTransferLoading(true);
            setTransferSettings(await getPublicBusinessTransferSettings());
          } catch (error) {
            console.warn('No se pudieron cargar los datos de transferencia:', error);
            setTransferSettings(null);
          } finally {
            setTransferLoading(false);
          }
        })();

        setCustomerPhone(
          cleanPhone,
        );

        setSaveDeliveryAddress(
          false,
        );

        setDelivery(
          (current) => ({
            ...current,
            customerName:
              cleanName,
            phone:
              cleanPhone,
          }),
        );

        return;
      }

      setFulfillmentType(
        'pickup',
      );

      setPaymentMethod('cash');

      setCustomerName(
        '',
      );

      setCustomerPhone(
        '',
      );

      setMarketingCode(
        '',
      );

      setSaveDeliveryAddress(
        false,
      );

      setDelivery({
        ...EMPTY_DELIVERY,
      });

      setDeliveryQuote(
        null,
      );

      setDeliveryQuoteError(
        null,
      );

      setFulfillmentAvailability(
        null,
      );

      setIsQuotingDelivery(
        false,
      );

      setErrors(
        {},
      );
    },
    [
      visible,
      initialCustomerName,
      initialCustomerPhone,
    ],
  );

  useEffect(
    () => {
      if (!visible) {
        return;
      }

      let cancelled =
        false;

      void (async () => {
        try {
          setIsLoadingFulfillmentAvailability(
            true,
          );

          const availability =
            await getFulfillmentAvailability();

          if (cancelled) {
            return;
          }

          setFulfillmentAvailability(
            availability,
          );

          if (
            availability.pickupAvailable
          ) {
            setFulfillmentType(
              'pickup',
            );
          } else if (
            availability.deliveryAvailable
          ) {
            setFulfillmentType(
              'delivery',
            );
          } else {
            setFulfillmentType(
              'pickup',
            );
          }

          if (
            !availability.deliveryAvailable
          ) {
            setDeliveryQuote(
              null,
            );

            setDeliveryQuoteError(
              null,
            );
          }
        } catch (error) {
          console.error(
            'Error consultando disponibilidad de entrega/recoger:',
            error,
          );

          if (!cancelled) {
            setFulfillmentAvailability(
              {
                pickupAvailable:
                  false,
                deliveryAvailable:
                  false,
                pickupReason:
                  'No se pudo confirmar la disponibilidad para recoger.',
                deliveryReason:
                  'No se pudo confirmar la disponibilidad a domicilio.',
                pickupNextWindow:
                  null,
                deliveryNextWindow:
                  null,
              },
            );
          }
        } finally {
          if (!cancelled) {
            setIsLoadingFulfillmentAvailability(
              false,
            );
          }
        }
      })();

      return () => {
        cancelled =
          true;
      };
    },
    [
      visible,
    ],
  );

  const calculatedDeliveryFee =
    useMemo(
      () => {
        if (
          fulfillmentType !==
          'delivery'
        ) {
          return 0;
        }

        const extraFee =
          deliveryQuote
            ?.available
            ? deliveryQuote
              .extraFee
            : 0;

        return (
          deliveryFee +
          extraFee
        );
      },
      [
        fulfillmentType,
        deliveryFee,
        deliveryQuote,
      ],
    );

  const finalTotal =
    useMemo(
      () =>
        pickupTotal +
        calculatedDeliveryFee,
      [
        pickupTotal,
        calculatedDeliveryFee,
      ],
    );

  const pickupAvailable =
    fulfillmentAvailability
      ?.pickupAvailable ===
    true;

  const deliveryAvailable =
    fulfillmentAvailability
      ?.deliveryAvailable ===
    true;

  const isSelectedFulfillmentAvailable =
    fulfillmentType ===
      'pickup'
      ? pickupAvailable
      : deliveryAvailable;

  const isConfirmDisabled =
    submitting ||
    isLoadingFulfillmentAvailability ||
    !isSelectedFulfillmentAvailable ||
    isQuotingDelivery ||
    (paymentMethod === 'transfer' && (!transferSettings?.enabled || transferLoading)) ||
    (
      fulfillmentType ===
      'delivery' &&
      (
        !hasSelectedGooglePlace ||
        !deliveryQuote ||
        !deliveryQuote.available
      )
    );

  function updateDeliveryField<
    Field extends keyof DeliveryDetails,
  >(
    field:
      Field,

    value:
      DeliveryDetails[Field],
  ): void {
    setDelivery(
      (
        current,
      ) => ({
        ...current,

        [field]:
          value,
      }),
    );

    if (
      typeof value ===
      'string' &&
      value.trim()
    ) {
      setErrors(
        (
          current,
        ) => ({
          ...current,

          [field]:
            undefined,
        }),
      );
    }
  }

  async function handleGooglePlaceSelected(
    place:
      GooglePlaceSelection,
  ): Promise<void> {
    setDeliveryQuote(
      null,
    );

    setDeliveryQuoteError(
      null,
    );

    setErrors(
      (
        current,
      ) => ({
        ...current,

        street:
          undefined,

        exteriorNumber:
          undefined,

        neighborhood:
          undefined,
      }),
    );

    /*
     * Nunca conservamos partes
     * de la dirección anterior.
     */
    setDelivery(
      (
        current,
      ) => ({
        ...current,

        street:
          place.street ??
          '',

        exteriorNumber:
          place
            .exteriorNumber ??
          '',

        neighborhood:
          place
            .neighborhood ??
          '',

        postalCode:
          place
            .postalCode ??
          '',

        latitude:
          place.latitude,

        longitude:
          place.longitude,
      }),
    );

    try {
      setIsQuotingDelivery(
        true,
      );

      const quote =
        await getDeliveryQuote(
          place.latitude,
          place.longitude,
        );

      setDeliveryQuote(
        quote,
      );

      if (
        !quote.available
      ) {
        setDeliveryQuoteError(
          'Esta ubicación está fuera de nuestra zona de reparto.',
        );
      }
    } catch (
    error
    ) {
      setDeliveryQuote(
        null,
      );

      setDeliveryQuoteError(
        error instanceof
          Error
          ? error.message
          : 'No se pudo calcular el envío.',
      );
    } finally {
      setIsQuotingDelivery(
        false,
      );
    }
  }

  async function handleUseSavedAddress():
    Promise<void> {
    if (
      !savedAddress
    ) {
      return;
    }

    const nextDelivery:
      DeliveryDetails = {
      ...delivery,

      street:
        savedAddress.street,

      exteriorNumber:
        savedAddress.exteriorNumber,

      interiorNumber:
        savedAddress.interiorNumber,

      neighborhood:
        savedAddress.neighborhood,

      postalCode:
        savedAddress.postalCode,

      deliveryReferences:
        savedAddress.deliveryReferences,

      latitude:
        savedAddress.latitude,

      longitude:
        savedAddress.longitude,
    };

    setDelivery(
      nextDelivery,
    );

    setErrors(
      current => ({
        ...current,
        street:
          undefined,
        exteriorNumber:
          undefined,
        neighborhood:
          undefined,
      }),
    );

    setSaveDeliveryAddress(
      false,
    );

    setDeliveryQuote(
      null,
    );

    setDeliveryQuoteError(
      null,
    );

    try {
      setIsQuotingDelivery(
        true,
      );

      const quote =
        await getDeliveryQuote(
          savedAddress.latitude,
          savedAddress.longitude,
        );

      setDeliveryQuote(
        quote,
      );

      if (
        !quote.available
      ) {
        setDeliveryQuoteError(
          'Tu dirección guardada está fuera de nuestra zona de reparto actual.',
        );
      }
    } catch (error) {
      setDeliveryQuote(
        null,
      );

      setDeliveryQuoteError(
        error instanceof Error
          ? error.message
          : 'No se pudo validar tu dirección guardada.',
      );
    } finally {
      setIsQuotingDelivery(
        false,
      );
    }
  }

  function validate():
    FormErrors {
    const next:
      FormErrors =
      {};

    if (
      !customerName
        .trim()
    ) {
      next.customerName =
        'El nombre es obligatorio.';
    }

    const phone =
      customerPhone.replace(
        /\D/g,
        '',
      );

    if (
      phone.length !==
      10
    ) {
      next.customerPhone =
        'El teléfono debe tener exactamente 10 dígitos.';
    }

    if (
      fulfillmentType ===
      'delivery'
    ) {
      if (
        !delivery
          .street
          .trim()
      ) {
        next.street =
          'Selecciona una dirección válida en Google Maps.';
      }

      if (
        !delivery
          .exteriorNumber
          .trim()
      ) {
        next.exteriorNumber =
          'La dirección seleccionada no contiene número exterior.';
      }

      if (
        !delivery
          .neighborhood
          .trim()
      ) {
        next.neighborhood =
          'La dirección seleccionada no contiene colonia.';
      }
    }

    return next;
  }

  function handleSubmit():
    void {
    const nextErrors =
      validate();

    setErrors(
      nextErrors,
    );

    if (
      !isSelectedFulfillmentAvailable
    ) {
      return;
    }

    if (
      Object.keys(
        nextErrors,
      ).length >
      0
    ) {
      return;
    }

    if (
      fulfillmentType ===
      'delivery'
    ) {
      if (
        delivery.latitude ===
        null ||
        delivery.longitude ===
        null
      ) {
        setDeliveryQuoteError(
          'Selecciona una dirección válida en Google Maps.',
        );

        return;
      }

      if (
        !deliveryQuote
      ) {
        setDeliveryQuoteError(
          'No se pudo validar la cobertura de esta dirección. Selecciónala nuevamente.',
        );

        return;
      }

      if (
        !deliveryQuote
          .available
      ) {
        setDeliveryQuoteError(
          'Esta ubicación está fuera de nuestra zona de reparto.',
        );

        return;
      }
    }

    const normalizedName =
      customerName
        .trim();

    const normalizedPhone =
      customerPhone
        .replace(
          /\D/g,
          '',
        );

    onSubmit({
      paymentMethod,

      fulfillmentType,

      customerName:
        normalizedName,

      customerPhone:
        normalizedPhone,

      marketingCode:
        marketingCode
          .trim()
          .toUpperCase(),

      saveDeliveryAddress:
        fulfillmentType ===
          'delivery' &&
        canSaveAddress &&
        saveDeliveryAddress,

      deliveryDetails:
        fulfillmentType ===
          'delivery'
          ? {
            ...delivery,

            customerName:
              normalizedName,

            phone:
              normalizedPhone,

            street:
              delivery
                .street
                .trim(),

            exteriorNumber:
              delivery
                .exteriorNumber
                .trim(),

            interiorNumber:
              delivery
                .interiorNumber
                .trim(),

            neighborhood:
              delivery
                .neighborhood
                .trim(),

            postalCode:
              delivery
                .postalCode
                .trim(),

            deliveryReferences:
              delivery
                .deliveryReferences
                .trim(),
          }
          : null,
    });
  }

  function handlePickupPress():
    void {
    if (
      !pickupAvailable ||
      isLoadingFulfillmentAvailability
    ) {
      return;
    }

    setFulfillmentType(
      'pickup',
    );

    setDeliveryQuoteError(
      null,
    );
  }

  function handleDeliveryPress():
    void {
    if (
      !deliveryAvailable ||
      isLoadingFulfillmentAvailability
    ) {
      return;
    }

    setFulfillmentType(
      'delivery',
    );
  }

  return (
    <Modal
      transparent
      visible={
        visible
      }
      animationType="fade"
      onRequestClose={
        submitting
          ? undefined
          : onClose
      }
    >
      <KeyboardAvoidingView
        style={
          styles.backdrop
        }
        behavior={
          Platform.OS ===
            'ios'
            ? 'padding'
            : undefined
        }
      >
        <Pressable
          style={
            styles.dismissArea
          }
          onPress={
            submitting
              ? undefined
              : onClose
          }
        />

        <View
          style={
            styles.modal
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
                Finalizar pedido
              </Text>

              <Text
                style={
                  styles.subtitle
                }
              >
                ¿Cómo quieres recibirlo?
              </Text>
            </View>

            <Pressable
              disabled={
                submitting
              }
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
              styles.scroll
            }
            contentContainerStyle={
              styles.content
            }
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator
          >
            <View
              style={
                styles.deliveryModeRow
              }
            >
              <ChoiceButton
                title="Recoger"
                subtitle={
                  isLoadingFulfillmentAvailability
                    ? 'Consultando disponibilidad...'
                    : pickupAvailable
                      ? 'Paso por mi pedido'
                      : fulfillmentAvailability
                          ?.pickupNextWindow
                        ? `No disponible · ${fulfillmentAvailability.pickupNextWindow}`
                        : fulfillmentAvailability
                            ?.pickupReason ||
                          'Servicio no disponible por el momento'
                }
                selected={
                  fulfillmentType ===
                  'pickup'
                }
                disabled={
                  !pickupAvailable ||
                  isLoadingFulfillmentAvailability
                }
                onPress={
                  handlePickupPress
                }
              />

              <ChoiceButton
                title="Domicilio"
                subtitle={
                  isLoadingFulfillmentAvailability
                    ? 'Consultando disponibilidad...'
                    : !deliveryAvailable
                      ? fulfillmentAvailability
                          ?.deliveryNextWindow
                        ? `No disponible · ${fulfillmentAvailability.deliveryNextWindow}`
                        : fulfillmentAvailability
                            ?.deliveryReason ||
                          'Servicio no disponible por el momento'
                      : deliveryFee > 0
                        ? `Desde ${formatCurrency(
                          deliveryFee,
                        )}`
                        : 'Entrega a domicilio'
                }
                selected={
                  fulfillmentType ===
                  'delivery'
                }
                disabled={
                  !deliveryAvailable ||
                  isLoadingFulfillmentAvailability
                }
                onPress={
                  handleDeliveryPress
                }
              />
            </View>

            {!isLoadingFulfillmentAvailability &&
              fulfillmentAvailability &&
              !pickupAvailable &&
              !deliveryAvailable ? (
                <View
                  style={
                    styles.deliveryUnavailableBox
                  }
                >
                  <Text
                    style={
                      styles.deliveryUnavailableTitle
                    }
                  >
                    No hay modalidad disponible en este momento
                  </Text>
                  <Text
                    style={
                      styles.deliveryInfoText
                    }
                  >
                    {[
                      fulfillmentAvailability.pickupNextWindow
                        ? `Recoger: ${fulfillmentAvailability.pickupNextWindow}`
                        : fulfillmentAvailability.pickupReason,
                      fulfillmentAvailability.deliveryNextWindow
                        ? `Domicilio: ${fulfillmentAvailability.deliveryNextWindow}`
                        : fulfillmentAvailability.deliveryReason,
                    ]
                      .filter(Boolean)
                      .join(' · ')}
                  </Text>
                </View>
              ) : null}

            <SectionTitle>
              Tus datos
            </SectionTitle>

            <FormInput
              label="Nombre"
              value={
                customerName
              }
              placeholder="Ej. Juan Pérez"
              maxLength={
                80
              }
              autoCapitalize="words"
              error={
                errors
                  .customerName
              }
              onChangeText={
                setCustomerName
              }
            />

            <FormInput
              label="Teléfono"
              value={
                customerPhone
              }
              placeholder="Ej. 4171234567"
              keyboardType="phone-pad"
              maxLength={
                10
              }
              error={
                errors
                  .customerPhone
              }
              onChangeText={
                (
                  value,
                ) =>
                  setCustomerPhone(
                    value.replace(
                      /\D/g,
                      '',
                    ),
                  )
              }
            />

            <FormInput
              label="Código de campaña (opcional)"
              value={
                marketingCode
              }
              placeholder="Ej. VIPNOV26"
              maxLength={
                40
              }
              onChangeText={
                (
                  value,
                ) =>
                  setMarketingCode(
                    value
                      .toUpperCase()
                      .replace(
                        /[^A-Z0-9_-]/g,
                        '',
                      ),
                  )
              }
            />

            <Text
              style={{
                marginTop:
                  -2,
                marginBottom:
                  10,
                color:
                  businessTheme.textMuted,
                fontSize:
                  11,
                lineHeight:
                  16,
              }}
            >
              Si recibiste un código de una campaña, escríbelo aquí. No modifica el precio salvo que la promoción correspondiente lo indique por separado.
            </Text>

            {fulfillmentType ===
              'delivery' && (
                <>
                  <SectionTitle>
                    Dirección
                  </SectionTitle>

                  {canSaveAddress &&
                    savedAddress ? (
                      <Pressable
                        disabled={
                          submitting ||
                          isQuotingDelivery
                        }
                        onPress={() => {
                          void handleUseSavedAddress();
                        }}
                        style={({
                          pressed,
                        }) => [
                          styles.savedAddressCard,
                          pressed &&
                          styles.savedAddressCardPressed,
                        ]}
                      >
                        <View
                          style={
                            styles.savedAddressHeader
                          }
                        >
                          <Text
                            style={
                              styles.savedAddressTitle
                            }
                          >
                            📍 Usar mi dirección guardada
                          </Text>

                          <Text
                            style={
                              styles.savedAddressAction
                            }
                          >
                            AUTOCOMPLETAR
                          </Text>
                        </View>

                        <Text
                          style={
                            styles.savedAddressText
                          }
                        >
                          {savedAddress.street}{' '}
                          {savedAddress.exteriorNumber}
                          {savedAddress.interiorNumber
                            ? ` Int. ${savedAddress.interiorNumber}`
                            : ''}
                          {' · '}
                          {savedAddress.neighborhood}
                          {savedAddress.postalCode
                            ? ` · C.P. ${savedAddress.postalCode}`
                            : ''}
                        </Text>
                      </Pressable>
                    ) : null}

                  <View
                    style={{
                      position:
                        'relative',

                      zIndex:
                        1000,

                      elevation:
                        1000,
                    }}
                  >
                    <GooglePlaceAutocomplete
                      disabled={
                        submitting ||
                        isQuotingDelivery
                      }
                      onPlaceSelected={
                        handleGooglePlaceSelected
                      }
                    />
                  </View>

                  {isQuotingDelivery && (
                    <View
                      style={
                        styles.quotingBox
                      }
                    >
                      <ActivityIndicator
                        size="small"
                        color={businessTheme.primary}
                      />

                      <Text
                        style={
                          styles.quotingText
                        }
                      >
                        Calculando cobertura...
                      </Text>
                    </View>
                  )}

                  {hasSelectedGooglePlace && (
                    <>
                      <FormInput
                        label="Calle"
                        value={delivery.street}
                        maxLength={100}
                        error={errors.street}
                        editable={false}
                      />

                      <View
                        style={styles.row}
                      >
                        <View
                          style={styles.rowField}
                        >
                          <FormInput
                            label="Número exterior"
                            value={
                              delivery.exteriorNumber
                            }
                            maxLength={10}
                            error={
                              errors.exteriorNumber
                            }
                            editable={false}
                          />
                        </View>

                        <View
                          style={styles.rowField}
                        >
                          <FormInput
                            label="Número interior"
                            value={
                              delivery.interiorNumber
                            }
                            placeholder="Opcional"
                            maxLength={10}
                            autoCapitalize="characters"
                            onChangeText={(value) =>
                              updateDeliveryField(
                                'interiorNumber',
                                value,
                              )
                            }
                          />
                        </View>
                      </View>

                      <FormInput
                        label="Colonia"
                        value={
                          delivery.neighborhood
                        }
                        maxLength={100}
                        error={
                          errors.neighborhood
                        }
                        editable={false}
                      />

                      <FormInput
                        label="Código postal"
                        value={
                          delivery.postalCode
                        }
                        maxLength={5}
                        editable={false}
                      />

                      {isQuotingDelivery && (
                        <View
                          style={
                            styles.quotingBox
                          }
                        >
                          <ActivityIndicator
                            size="small"
                            color={businessTheme.primary}
                          />

                          <Text
                            style={
                              styles.quotingText
                            }
                          >
                            Calculando cobertura...
                          </Text>
                        </View>
                      )}

                      {deliveryQuote ? (
                        <View
                          style={
                            deliveryQuote.available
                              ? styles.deliveryAvailableBox
                              : styles.deliveryUnavailableBox
                          }
                        >
                          <Text
                            style={
                              deliveryQuote.available
                                ? styles.deliveryAvailableTitle
                                : styles.deliveryUnavailableTitle
                            }
                          >
                            {deliveryQuote.available
                              ? '✓ Entrega disponible'
                              : '✕ Fuera de cobertura'}
                          </Text>

                          {deliveryQuote.distanceKm !== null && (
                            <Text
                              style={
                                styles.deliveryInfoText
                              }
                            >
                              Distancia aproximada:{' '}
                              {deliveryQuote.distanceKm.toFixed(
                                2,
                              )}{' '}
                              km
                            </Text>
                          )}

                          {deliveryQuote.available && (
                            <>
                              <Text
                                style={
                                  styles.deliveryInfoText
                                }
                              >
                                Zona:{' '}
                                {deliveryQuote.zoneName ??
                                  'Cobertura local'}
                              </Text>

                              <Text
                                style={
                                  styles.deliveryInfoText
                                }
                              >
                                Tarifa base:{' '}
                                {formatCurrency(
                                  deliveryFee,
                                )}
                              </Text>

                              {deliveryQuote.extraFee > 0 ? (
                                <Text
                                  style={
                                    styles.deliveryExtraText
                                  }
                                >
                                  Cargo por zona: +
                                  {formatCurrency(
                                    deliveryQuote.extraFee,
                                  )}
                                </Text>
                              ) : (
                                <Text
                                  style={
                                    styles.deliveryFreeExtraText
                                  }
                                >
                                  Sin cargo adicional por zona
                                </Text>
                              )}

                              <Text
                                style={
                                  styles.deliveryTotalText
                                }
                              >
                                Envío:{' '}
                                {formatCurrency(
                                  calculatedDeliveryFee,
                                )}
                              </Text>
                            </>
                          )}
                        </View>
                      ) : null}

                      {!!deliveryQuoteError && (
                        <View
                          style={
                            styles.deliveryErrorBox
                          }
                        >
                          <Text
                            style={
                              styles.deliveryErrorText
                            }
                          >
                            {deliveryQuoteError}
                          </Text>
                        </View>
                      )}

                      <FormInput
                        label="Referencias"
                        value={
                          delivery.deliveryReferences
                        }
                        placeholder="Ej. Portón negro, tocar el timbre"
                        multiline
                        maxLength={300}
                        onChangeText={(value) =>
                          updateDeliveryField(
                            'deliveryReferences',
                            value,
                          )
                        }
                      />

                      {canSaveAddress ? (
                        <Pressable
                          disabled={
                            submitting
                          }
                          onPress={() =>
                            setSaveDeliveryAddress(
                              current =>
                                !current,
                            )
                          }
                          style={({
                            pressed,
                          }) => [
                            styles.saveAddressRow,
                            pressed &&
                            styles.saveAddressRowPressed,
                          ]}
                        >
                          <View
                            style={[
                              styles.checkbox,
                              saveDeliveryAddress &&
                              styles.checkboxChecked,
                            ]}
                          >
                            {saveDeliveryAddress ? (
                              <Text
                                style={
                                  styles.checkboxMark
                                }
                              >
                                ✓
                              </Text>
                            ) : null}
                          </View>

                          <View
                            style={
                              styles.saveAddressTextBox
                            }
                          >
                            <Text
                              style={
                                styles.saveAddressTitle
                              }
                            >
                              Guardar esta dirección para futuros pedidos
                            </Text>

                            <Text
                              style={
                                styles.saveAddressHint
                              }
                            >
                              Se guardará como tu dirección principal y podrás reutilizarla en tu próximo pedido.
                            </Text>
                          </View>
                        </Pressable>
                      ) : null}
                    </>
                  )}
                </>
              )}

            <SectionTitle>
              Método de pago
            </SectionTitle>

            <View style={styles.deliveryModeRow}>
              <ChoiceButton
                title="Pagar al recibir"
                subtitle="Efectivo o tarjeta al recoger/recibir."
                selected={paymentMethod === 'cash'}
                onPress={() => setPaymentMethod('cash')}
              />
              <ChoiceButton
                title="Transferencia"
                subtitle={transferSettings?.enabled ? 'Transfiere antes de que se entregue el pedido.' : 'No disponible por el momento.'}
                selected={paymentMethod === 'transfer'}
                disabled={!transferSettings?.enabled || transferLoading}
                onPress={() => setPaymentMethod('transfer')}
              />
            </View>

            {paymentMethod === 'transfer' && transferSettings?.enabled ? (
              <View style={styles.summaryBox}>
                <Text style={styles.sectionTitle}>Datos para transferencia</Text>
                <SummaryRow label="Banco" value={transferSettings.bankName} />
                <SummaryRow label="Titular" value={transferSettings.accountHolder} />
                <SummaryRow label="CLABE" value={transferSettings.clabe} />
                {transferSettings.accountNumber ? <SummaryRow label="Cuenta" value={transferSettings.accountNumber} /> : null}
                {transferSettings.instructions ? <Text style={styles.serverPriceHint}>{transferSettings.instructions}</Text> : null}
                <Text style={styles.serverPriceHint}>La selección de transferencia no marca el pedido como pagado. El negocio confirmará el depósito antes de registrar el cobro.</Text>
              </View>
            ) : null}

            <SectionTitle>
              Resumen
            </SectionTitle>

            <View
              style={
                styles.summaryBox
              }
            >
              <SummaryRow
                label="Productos"
                value={
                  formatCurrency(
                    subtotal,
                  )
                }
              />

              {modifierPromotionDiscount >
                0 && (
                  <SummaryRow
                    label={modifierPromotionName ?? 'Promoción'}
                    value={formatCurrency(
                      -modifierPromotionDiscount,
                    )}
                    discount
                  />
                )}

              {quantityPromotionLines.map(
                line => (
                  <SummaryRow
                    key={
                      line.promotionId
                    }
                    label={
                      line.label
                    }
                    value={formatCurrency(
                      -line.discountAmount,
                    )}
                    discount
                  />
                ),
              )}

              {pricingPromotionLines.map(
                line => (
                  <SummaryRow
                    key={
                      line.promotionId
                    }
                    label={
                      line.label
                    }
                    value={formatCurrency(
                      -line.discountAmount,
                    )}
                    discount
                  />
                ),
              )}

              {fulfillmentType ===
                'delivery' && (
                  <>
                    <SummaryRow
                      label="Envío base"
                      value={
                        formatCurrency(
                          deliveryFee,
                        )
                      }
                    />

                    {deliveryQuote
                      ?.available &&
                      deliveryQuote
                        .extraFee >
                      0 && (
                        <SummaryRow
                          label="Cargo por zona"
                          value={`+${formatCurrency(
                            deliveryQuote
                              .extraFee,
                          )}`}
                        />
                      )}

                    <SummaryRow
                      label="Envío a domicilio"
                      value={
                        formatCurrency(
                          calculatedDeliveryFee,
                        )
                      }
                    />
                  </>
                )}

              <View
                style={
                  styles.totalDivider
                }
              />

              <SummaryRow
                label="Total estimado"
                value={
                  formatCurrency(
                    finalTotal,
                  )
                }
                total
              />

              <Text
                style={
                  styles.serverPriceHint
                }
              >
                El total final se valida nuevamente al confirmar el pedido.
              </Text>
            </View>

            {!!submitError && (
              <View
                style={
                  styles.errorBox
                }
              >
                <Text
                  style={
                    styles.errorBoxText
                  }
                >
                  {
                    submitError
                  }
                </Text>
              </View>
            )}
          </ScrollView>

          <View
            style={
              styles.footer
            }
          >
            <Pressable
              disabled={
                isConfirmDisabled
              }
              onPress={
                handleSubmit
              }
              style={({
                pressed,
              }) => [
                  styles.confirmButton,

                  pressed &&
                  !isConfirmDisabled &&
                  styles.confirmButtonPressed,

                  isConfirmDisabled &&
                  styles.confirmButtonDisabled,
                ]}
            >
              {submitting ? (
                <ActivityIndicator
                  color="#111111"
                />
              ) : (
                <Text
                  style={
                    styles.confirmButtonText
                  }
                >
                  {fulfillmentType ===
                    'delivery' &&
                    deliveryQuote &&
                    !deliveryQuote.available
                    ? 'Fuera de cobertura'
                    : fulfillmentType ===
                      'delivery' &&
                      !hasSelectedGooglePlace
                      ? 'Selecciona una dirección'
                      : isQuotingDelivery
                        ? 'Calculando cobertura...'
                        : `Confirmar pedido · ${formatCurrency(
                          finalTotal,
                        )}`}
                </Text>
              )}
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function ChoiceButton({
  title,
  subtitle,
  selected,
  disabled = false,
  onPress,
}: {
  title:
  string;

  subtitle:
  string;

  selected:
  boolean;

  disabled?:
  boolean;

  onPress:
  () => void;
}) {
  return (
    <Pressable
      disabled={
        disabled
      }
      onPress={
        onPress
      }
      style={({
        pressed,
      }) => [
          styles.choiceButton,

          selected &&
          styles.choiceButtonSelected,

          disabled &&
          styles.choiceButtonDisabled,

          pressed &&
          !disabled &&
          styles.choiceButtonPressed,
        ]}
    >
      <Text
        style={[
          styles.choiceTitle,

          selected &&
          styles.choiceTitleSelected,

          disabled &&
          styles.choiceTitleDisabled,
        ]}
      >
        {title}
      </Text>

      <Text
        style={[
          styles.choiceSubtitle,

          selected &&
          styles.choiceSubtitleSelected,

          disabled &&
          styles.choiceSubtitleDisabled,
        ]}
      >
        {subtitle}
      </Text>
    </Pressable>
  );
}

function SectionTitle({
  children,
}: {
  children:
  React.ReactNode;
}) {
  return (
    <Text
      style={
        styles.sectionTitle
      }
    >
      {
        children
      }
    </Text>
  );
}

function FormInput({
  label,
  error,
  multiline,
  editable = true,
  ...props
}: React.ComponentProps<
  typeof TextInput
> & {
  label:
  string;

  error?:
  string;
}) {
  return (
    <View
      style={
        styles.field
      }
    >
      <Text
        style={[
          styles.label,

          !editable &&
          styles.labelDisabled,
        ]}
      >
        {
          label
        }
      </Text>

      <TextInput
        {...props}
        editable={
          editable
        }
        multiline={
          multiline
        }
        placeholderTextColor="#6F6F6F"
        style={[
          styles.input,

          !editable &&
          styles.inputDisabled,

          multiline &&
          styles.inputMultiline,

          !!error &&
          styles.inputError,
        ]}
      />

      {!!error && (
        <Text
          style={
            styles.fieldError
          }
        >
          {
            error
          }
        </Text>
      )}
    </View>
  );
}

function SummaryRow({
  label,
  value,
  discount = false,
  total = false,
}: {
  label:
  string;

  value:
  string;

  discount?:
  boolean;

  total?:
  boolean;
}) {
  return (
    <View
      style={
        styles.summaryRow
      }
    >
      <Text
        style={[
          styles.summaryLabel,

          discount &&
          styles.discountText,

          total &&
          styles.totalText,
        ]}
      >
        {
          label
        }
      </Text>

      <Text
        style={[
          styles.summaryValue,

          discount &&
          styles.discountText,

          total &&
          styles.totalValue,
        ]}
      >
        {
          value
        }
      </Text>
    </View>
  );
}