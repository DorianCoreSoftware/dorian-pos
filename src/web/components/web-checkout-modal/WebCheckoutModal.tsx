

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
import { DeliveryQuote, getDeliveryQuote, getDeliveryServiceStatus } from '../../../services/deliveryService';
import { DeliveryDetails } from '../../../types';
import { WebFulfillmentType } from '../../services/webOrderService';
import GooglePlaceAutocomplete, { GooglePlaceSelection } from '../google-place/GooglePlaceAutocomplete';

interface CheckoutData {
  fulfillmentType:
  WebFulfillmentType;

  customerName:
  string;

  customerPhone:
  string;

  deliveryDetails:
  DeliveryDetails | null;
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

  pickupTotal:
  number;

  deliveryFee:
  number;

  initialCustomerName?:
  string;

  initialCustomerPhone?:
  string;

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
  pickupTotal,
  deliveryFee,
  initialCustomerName = '',
  initialCustomerPhone = '',
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
    delivery,
    setDelivery,
  ] =
    useState<DeliveryDetails>({
      ...EMPTY_DELIVERY,
    });

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
    deliveryEnabled,
    setDeliveryEnabled,
  ] =
    useState(true);

  const [
    isLoadingDeliveryStatus,
    setIsLoadingDeliveryStatus,
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

        setCustomerPhone(
          cleanPhone,
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

      setCustomerName(
        '',
      );

      setCustomerPhone(
        '',
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
          setIsLoadingDeliveryStatus(
            true,
          );

          const enabled =
            await getDeliveryServiceStatus();

          if (cancelled) {
            return;
          }

          setDeliveryEnabled(
            enabled,
          );

          if (!enabled) {
            setFulfillmentType(
              'pickup',
            );

            setDeliveryQuote(
              null,
            );

            setDeliveryQuoteError(
              null,
            );
          }
        } catch (error) {
          console.error(
            'Error consultando estado de reparto:',
            error,
          );

          /*
           * Fail closed:
           * si no podemos saber si reparto está activo,
           * no permitimos generar un delivery.
           */
          if (!cancelled) {
            setDeliveryEnabled(
              false,
            );

            setFulfillmentType(
              'pickup',
            );
          }
        } finally {
          if (!cancelled) {
            setIsLoadingDeliveryStatus(
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

  const isConfirmDisabled =
    submitting ||
    isQuotingDelivery ||
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
      fulfillmentType ===
      'delivery' &&
      !deliveryEnabled
    ) {
      setFulfillmentType(
        'pickup',
      );

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
      fulfillmentType,

      customerName:
        normalizedName,

      customerPhone:
        normalizedPhone,

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
      !deliveryEnabled ||
      isLoadingDeliveryStatus
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
            style={[
              styles.scroll,

              {
                overflow:
                  'visible',
              },
            ]}
            contentContainerStyle={[
              styles.content,

              {
                overflow:
                  'visible',
              },
            ]}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={
              false
            }
          >
            <View
              style={
                styles.deliveryModeRow
              }
            >
              <ChoiceButton
                title="Recoger"
                subtitle="Paso por mi pedido"
                selected={
                  fulfillmentType ===
                  'pickup'
                }
                onPress={
                  handlePickupPress
                }
              />

              <ChoiceButton
                title="Domicilio"
                subtitle={
                  isLoadingDeliveryStatus
                    ? 'Consultando disponibilidad...'
                    : !deliveryEnabled
                      ? 'Servicio no disponible por el momento'
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
                  !deliveryEnabled ||
                  isLoadingDeliveryStatus
                }
                onPress={
                  handleDeliveryPress
                }
              />
            </View>

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

            {fulfillmentType ===
              'delivery' && (
                <>
                  <SectionTitle>
                    Dirección
                  </SectionTitle>

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
                    </>
                  )}
                </>
              )}

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