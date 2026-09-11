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

import {
  DeliveryDetails,
} from '../../types';

import {
  DeliveryQuote,
  getDeliveryQuote,
} from '../../services/deliveryService';

import {
  WebFulfillmentType,
} from '../services/webOrderService';

import styles from './WebCheckoutModal.styles';

interface CheckoutData {
  fulfillmentType:
    WebFulfillmentType;

  customerName: string;
  customerPhone: string;

  deliveryDetails:
    DeliveryDetails | null;
}

interface WebCheckoutModalProps {
  visible: boolean;

  subtotal: number;
  weeklySauceDiscount: number;
  pickupTotal: number;

  /**
   * Tarifa base configurada en el
   * producto "Envío a domicilio".
   */
  deliveryFee: number;

  submitting: boolean;

  submitError:
    string | null;

  onClose: () => void;

  onSubmit:
    (data: CheckoutData) => void;
}

interface FormErrors {
  customerName?: string;
  customerPhone?: string;

  street?: string;
  exteriorNumber?: string;
  neighborhood?: string;
}

const EMPTY_DELIVERY:
  DeliveryDetails = {
    customerName: '',
    phone: '',

    street: '',
    exteriorNumber: '',
    interiorNumber: '',

    neighborhood: '',
    postalCode: '',

    deliveryReferences: '',

    latitude: null,
    longitude: null,
  };

function formatPrice(
  value: number,
): string {
  return new Intl.NumberFormat(
    'es-MX',
    {
      style: 'currency',
      currency: 'MXN',
    },
  ).format(value);
}

export default function WebCheckoutModal({
  visible,
  subtotal,
  weeklySauceDiscount,
  pickupTotal,
  deliveryFee,
  submitting,
  submitError,
  onClose,
  onSubmit,
}: WebCheckoutModalProps) {
  const [
    fulfillmentType,
    setFulfillmentType,
  ] = useState<WebFulfillmentType>(
    'pickup',
  );

  const [
    customerName,
    setCustomerName,
  ] = useState('');

  const [
    customerPhone,
    setCustomerPhone,
  ] = useState('');

  const [
    delivery,
    setDelivery,
  ] = useState<DeliveryDetails>({
    ...EMPTY_DELIVERY,
  });

  /*
   * Strings separados para permitir
   * escribir correctamente coordenadas
   * negativas, decimales, etc.
   *
   * Esto será temporal hasta conectar
   * Google Maps.
   */
  const [
    latitudeText,
    setLatitudeText,
  ] = useState('');

  const [
    longitudeText,
    setLongitudeText,
  ] = useState('');

  const [
    deliveryQuote,
    setDeliveryQuote,
  ] = useState<DeliveryQuote | null>(
    null,
  );

  const [
    isQuotingDelivery,
    setIsQuotingDelivery,
  ] = useState(false);

  const [
    deliveryQuoteError,
    setDeliveryQuoteError,
  ] = useState<string | null>(
    null,
  );

  const [
    errors,
    setErrors,
  ] = useState<FormErrors>({});

  /*
   * Limpia completamente el checkout
   * cuando se cierra.
   */
  useEffect(() => {
    if (visible) {
      return;
    }

    setFulfillmentType(
      'pickup',
    );

    setCustomerName('');

    setCustomerPhone('');

    setDelivery({
      ...EMPTY_DELIVERY,
    });

    setLatitudeText('');

    setLongitudeText('');

    setDeliveryQuote(
      null,
    );

    setDeliveryQuoteError(
      null,
    );

    setIsQuotingDelivery(
      false,
    );

    setErrors({});
  }, [visible]);

  /*
   * Precio final del envío:
   *
   * tarifa base
   * +
   * cargo adicional de zona
   */
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
            ? deliveryQuote.extraFee
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

  function invalidateDeliveryQuote():
    void {
    setDeliveryQuote(
      null,
    );

    setDeliveryQuoteError(
      null,
    );
  }

  function updateDeliveryField<
    Field extends keyof DeliveryDetails,
  >(
    field: Field,
    value:
      DeliveryDetails[Field],
  ): void {
    setDelivery(
      (current) => ({
        ...current,
        [field]:
          value,
      }),
    );

    /*
     * Si cambia cualquier dato de la
     * dirección, obligamos a cotizar
     * nuevamente.
     */
    if (
      field === 'street' ||
      field ===
        'exteriorNumber' ||
      field ===
        'interiorNumber' ||
      field ===
        'neighborhood' ||
      field ===
        'postalCode'
    ) {
      invalidateDeliveryQuote();
    }

    if (
      typeof value ===
      'string' &&
      value.trim()
    ) {
      setErrors(
        (current) => ({
          ...current,

          [field]:
            undefined,
        }),
      );
    }
  }

  function handleLatitudeChange(
    value: string,
  ): void {
    const sanitized =
      sanitizeCoordinate(
        value,
      );

    setLatitudeText(
      sanitized,
    );

    setDelivery(
      (current) => ({
        ...current,

        latitude:
          null,
      }),
    );

    invalidateDeliveryQuote();
  }

  function handleLongitudeChange(
    value: string,
  ): void {
    const sanitized =
      sanitizeCoordinate(
        value,
      );

    setLongitudeText(
      sanitized,
    );

    setDelivery(
      (current) => ({
        ...current,

        longitude:
          null,
      }),
    );

    invalidateDeliveryQuote();
  }

  async function quoteDelivery():
    Promise<void> {
    const latitude =
      Number(
        latitudeText,
      );

    const longitude =
      Number(
        longitudeText,
      );

    if (
      !latitudeText.trim() ||
      !Number.isFinite(
        latitude,
      ) ||
      latitude < -90 ||
      latitude > 90
    ) {
      setDeliveryQuote(
        null,
      );

      setDeliveryQuoteError(
        'Ingresa una latitud válida.',
      );

      return;
    }

    if (
      !longitudeText.trim() ||
      !Number.isFinite(
        longitude,
      ) ||
      longitude < -180 ||
      longitude > 180
    ) {
      setDeliveryQuote(
        null,
      );

      setDeliveryQuoteError(
        'Ingresa una longitud válida.',
      );

      return;
    }

    try {
      setIsQuotingDelivery(
        true,
      );

      setDeliveryQuoteError(
        null,
      );

      const quote =
        await getDeliveryQuote(
          latitude,
          longitude,
        );

      /*
       * Guardamos las coordenadas
       * solamente después de haberlas
       * validado.
       */
      setDelivery(
        (current) => ({
          ...current,

          latitude,
          longitude,
        }),
      );

      setDeliveryQuote(
        quote,
      );

      if (!quote.available) {
        setDeliveryQuoteError(
          'Esta ubicación está fuera de nuestra zona de reparto.',
        );
      }
    } catch (error) {
      setDeliveryQuote(
        null,
      );

      setDeliveryQuoteError(
        error instanceof Error
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
      FormErrors = {};

    if (
      !customerName.trim()
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
      phone.length !== 10
    ) {
      next.customerPhone =
        'El teléfono debe tener exactamente 10 dígitos.';
    }

    if (
      fulfillmentType ===
      'delivery'
    ) {
      if (
        !delivery.street.trim()
      ) {
        next.street =
          'La calle es obligatoria.';
      }

      if (
        !delivery
          .exteriorNumber
          .trim()
      ) {
        next.exteriorNumber =
          'El número exterior es obligatorio.';
      }

      if (
        !delivery
          .neighborhood
          .trim()
      ) {
        next.neighborhood =
          'La colonia es obligatoria.';
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
      Object.keys(
        nextErrors,
      ).length > 0
    ) {
      return;
    }

    /*
     * Para domicilio, no permitimos
     * continuar sin una cotización
     * válida.
     */
    if (
      fulfillmentType ===
      'delivery'
    ) {
      if (
        !deliveryQuote
      ) {
        setDeliveryQuoteError(
          'Calcula primero la zona de entrega.',
        );

        return;
      }

      if (
        !deliveryQuote.available
      ) {
        setDeliveryQuoteError(
          'Esta ubicación está fuera de nuestra zona de reparto.',
        );

        return;
      }

      if (
        delivery.latitude ===
          null ||
        delivery.longitude ===
          null
      ) {
        setDeliveryQuoteError(
          'La ubicación de entrega no es válida.',
        );

        return;
      }
    }

    const normalizedName =
      customerName.trim();

    const normalizedPhone =
      customerPhone.replace(
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
                delivery.street
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
    setFulfillmentType(
      'delivery',
    );
  }

  return (
    <Modal
      transparent
      visible={visible}
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
                  deliveryFee > 0
                    ? `Desde ${formatPrice(
                        deliveryFee,
                      )}`
                    : 'Entrega a domicilio'
                }
                selected={
                  fulfillmentType ===
                  'delivery'
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
              maxLength={80}
              autoCapitalize="words"
              error={
                errors.customerName
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
              maxLength={10}
              error={
                errors.customerPhone
              }
              onChangeText={
                (value) =>
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

                <FormInput
                  label="Calle"
                  value={
                    delivery.street
                  }
                  placeholder="Ej. Avenida Central"
                  maxLength={100}
                  autoCapitalize="words"
                  error={
                    errors.street
                  }
                  onChangeText={
                    (value) =>
                      updateDeliveryField(
                        'street',
                        value,
                      )
                  }
                />

                <View
                  style={
                    styles.row
                  }
                >
                  <View
                    style={
                      styles.rowField
                    }
                  >
                    <FormInput
                      label="Número exterior"
                      value={
                        delivery
                          .exteriorNumber
                      }
                      placeholder="Ej. 120"
                      maxLength={10}
                      autoCapitalize="characters"
                      error={
                        errors
                          .exteriorNumber
                      }
                      onChangeText={
                        (value) =>
                          updateDeliveryField(
                            'exteriorNumber',
                            value,
                          )
                      }
                    />
                  </View>

                  <View
                    style={
                      styles.rowField
                    }
                  >
                    <FormInput
                      label="Número interior"
                      value={
                        delivery
                          .interiorNumber
                      }
                      placeholder="Opcional"
                      maxLength={10}
                      autoCapitalize="characters"
                      onChangeText={
                        (value) =>
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
                    delivery
                      .neighborhood
                  }
                  placeholder="Ej. Centro"
                  maxLength={100}
                  autoCapitalize="words"
                  error={
                    errors.neighborhood
                  }
                  onChangeText={
                    (value) =>
                      updateDeliveryField(
                        'neighborhood',
                        value,
                      )
                  }
                />

                <FormInput
                  label="Código postal"
                  value={
                    delivery
                      .postalCode
                  }
                  placeholder="Opcional"
                  keyboardType="number-pad"
                  maxLength={5}
                  onChangeText={
                    (value) =>
                      updateDeliveryField(
                        'postalCode',
                        value.replace(
                          /\D/g,
                          '',
                        ),
                      )
                  }
                />

                {/*
                  Temporal:
                  después estos campos serán
                  reemplazados por Google Maps.
                */}

                <SectionTitle>
                  Ubicación para entrega
                </SectionTitle>

                <FormInput
                  label="Latitud"
                  value={
                    latitudeText
                  }
                  placeholder="Ej. 20.034801"
                  keyboardType="decimal-pad"
                  autoCapitalize="none"
                  onChangeText={
                    handleLatitudeChange
                  }
                />

                <FormInput
                  label="Longitud"
                  value={
                    longitudeText
                  }
                  placeholder="Ej. -100.723608"
                  keyboardType="decimal-pad"
                  autoCapitalize="none"
                  onChangeText={
                    handleLongitudeChange
                  }
                />

                <Pressable
                  disabled={
                    isQuotingDelivery ||
                    submitting
                  }
                  onPress={() => {
                    void quoteDelivery();
                  }}
                  style={({
                    pressed,
                  }) => ({
                    minHeight: 48,
                    borderRadius: 12,
                    alignItems:
                      'center',
                    justifyContent:
                      'center',

                    backgroundColor:
                      '#FFB000',

                    opacity:
                      isQuotingDelivery ||
                      submitting
                        ? 0.55
                        : pressed
                          ? 0.8
                          : 1,

                    marginBottom: 14,
                  })}
                >
                  {isQuotingDelivery ? (
                    <ActivityIndicator
                      color="#111111"
                    />
                  ) : (
                    <Text
                      style={{
                        color:
                          '#111111',

                        fontSize: 15,

                        fontWeight:
                          '800',
                      }}
                    >
                      Calcular zona de entrega
                    </Text>
                  )}
                </Pressable>

                {deliveryQuote ? (
                  <View
                    style={{
                      backgroundColor:
                        deliveryQuote
                          .available
                          ? '#142218'
                          : '#2A1717',

                      borderWidth: 1,

                      borderColor:
                        deliveryQuote
                          .available
                          ? '#2E6B3A'
                          : '#7D3030',

                      borderRadius: 12,

                      padding: 14,

                      marginBottom: 14,
                    }}
                  >
                    <Text
                      style={{
                        color:
                          deliveryQuote
                            .available
                            ? '#73D887'
                            : '#FF8A8A',

                        fontSize: 15,

                        fontWeight:
                          '800',

                        marginBottom: 4,
                      }}
                    >
                      {deliveryQuote
                        .available
                        ? '✓ Entrega disponible'
                        : '✕ Fuera de cobertura'}
                    </Text>

                    {deliveryQuote
                      .distanceKm !==
                      null ? (
                      <Text
                        style={{
                          color:
                            '#D0D0D0',

                          fontSize: 13,
                        }}
                      >
                        Distancia aproximada:{' '}
                        {deliveryQuote
                          .distanceKm
                          .toFixed(
                            2,
                          )}{' '}
                        km
                      </Text>
                    ) : null}

                    {deliveryQuote
                      .available ? (
                      <>
                        <Text
                          style={{
                            color:
                              '#D0D0D0',

                            fontSize: 13,

                            marginTop: 3,
                          }}
                        >
                          Zona:{' '}
                          {deliveryQuote
                            .zoneName ??
                            'Cobertura local'}
                        </Text>

                        <Text
                          style={{
                            color:
                              '#D0D0D0',

                            fontSize: 13,

                            marginTop: 3,
                          }}
                        >
                          Tarifa base:{' '}
                          {formatPrice(
                            deliveryFee,
                          )}
                        </Text>

                        {deliveryQuote
                          .extraFee >
                          0 ? (
                          <Text
                            style={{
                              color:
                                '#FFB000',

                              fontSize: 13,

                              fontWeight:
                                '700',

                              marginTop: 3,
                            }}
                          >
                            Cargo por zona: +
                            {formatPrice(
                              deliveryQuote
                                .extraFee,
                            )}
                          </Text>
                        ) : (
                          <Text
                            style={{
                              color:
                                '#73D887',

                              fontSize: 13,

                              marginTop: 3,
                            }}
                          >
                            Sin cargo adicional por zona
                          </Text>
                        )}

                        <Text
                          style={{
                            color:
                              '#FFFFFF',

                            fontSize: 15,

                            fontWeight:
                              '800',

                            marginTop: 6,
                          }}
                        >
                          Envío:{' '}
                          {formatPrice(
                            calculatedDeliveryFee,
                          )}
                        </Text>
                      </>
                    ) : null}
                  </View>
                ) : null}

                {!!deliveryQuoteError && (
                  <View
                    style={{
                      backgroundColor:
                        '#2A1717',

                      borderWidth: 1,

                      borderColor:
                        '#7D3030',

                      borderRadius: 10,

                      padding: 12,

                      marginBottom: 14,
                    }}
                  >
                    <Text
                      style={{
                        color:
                          '#FF8A8A',

                        fontSize: 13,

                        lineHeight: 18,
                      }}
                    >
                      {
                        deliveryQuoteError
                      }
                    </Text>
                  </View>
                )}

                <FormInput
                  label="Referencias"
                  value={
                    delivery
                      .deliveryReferences
                  }
                  placeholder="Ej. Portón negro, tocar el timbre"
                  multiline
                  maxLength={300}
                  onChangeText={
                    (value) =>
                      updateDeliveryField(
                        'deliveryReferences',
                        value,
                      )
                  }
                />
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
                  formatPrice(
                    subtotal,
                  )
                }
              />

              {weeklySauceDiscount >
                0 && (
                <SummaryRow
                  label="Salsa de la Semana"
                  value={`-${formatPrice(
                    weeklySauceDiscount,
                  )}`}
                  discount
                />
              )}

              {fulfillmentType ===
                'delivery' && (
                <>
                  <SummaryRow
                    label="Envío base"
                    value={
                      formatPrice(
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
                        value={`+${formatPrice(
                          deliveryQuote
                            .extraFee,
                        )}`}
                      />
                    )}

                  <SummaryRow
                    label="Envío a domicilio"
                    value={
                      formatPrice(
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
                  formatPrice(
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
                  {submitError}
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
                submitting ||
                isQuotingDelivery
              }
              onPress={
                handleSubmit
              }
              style={({
                pressed,
              }) => [
                styles.confirmButton,

                pressed &&
                !submitting &&
                !isQuotingDelivery &&
                styles.confirmButtonPressed,

                (
                  submitting ||
                  isQuotingDelivery
                ) &&
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
                  Confirmar pedido ·{' '}
                  {formatPrice(
                    finalTotal,
                  )}
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
  onPress,
}: {
  title: string;
  subtitle: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={
        onPress
      }
      style={({
        pressed,
      }) => [
        styles.choiceButton,

        selected &&
        styles.choiceButtonSelected,

        pressed &&
        styles.choiceButtonPressed,
      ]}
    >
      <Text
        style={[
          styles.choiceTitle,

          selected &&
          styles.choiceTitleSelected,
        ]}
      >
        {title}
      </Text>

      <Text
        style={[
          styles.choiceSubtitle,

          selected &&
          styles.choiceSubtitleSelected,
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
      {children}
    </Text>
  );
}

function FormInput({
  label,
  error,
  multiline,
  ...props
}: React.ComponentProps<
  typeof TextInput
> & {
  label: string;
  error?: string;
}) {
  return (
    <View
      style={
        styles.field
      }
    >
      <Text
        style={
          styles.label
        }
      >
        {label}
      </Text>

      <TextInput
        {...props}
        multiline={
          multiline
        }
        placeholderTextColor="#6F6F6F"
        style={[
          styles.input,

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
          {error}
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
  label: string;
  value: string;
  discount?: boolean;
  total?: boolean;
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
        {label}
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
        {value}
      </Text>
    </View>
  );
}

function sanitizeCoordinate(
  value: string,
): string {
  let result =
    value
      .replace(
        ',',
        '.',
      )
      .replace(
        /[^0-9.-]/g,
        '',
      );

  /*
   * Solo permite un signo negativo,
   * y únicamente al principio.
   */
  const isNegative =
    result.startsWith(
      '-',
    );

  result =
    result.replace(
      /-/g,
      '',
    );

  if (isNegative) {
    result =
      `-${result}`;
  }

  /*
   * Solo permite un punto decimal.
   */
  const firstDot =
    result.indexOf(
      '.',
    );

  if (firstDot >= 0) {
    result =
      result.slice(
        0,
        firstDot + 1,
      ) +
      result
        .slice(
          firstDot + 1,
        )
        .replace(
          /\./g,
          '',
        );
  }

  return result;
}