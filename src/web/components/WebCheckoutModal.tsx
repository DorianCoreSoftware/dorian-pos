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

  const [
    errors,
    setErrors,
  ] = useState<FormErrors>({});

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

    setErrors({});
  }, [visible]);

  const finalTotal =
    useMemo(
      () =>
        pickupTotal +
        (
          fulfillmentType ===
            'delivery'
            ? deliveryFee
            : 0
        ),
      [
        pickupTotal,
        fulfillmentType,
        deliveryFee,
      ],
    );

  function updateDeliveryField<
    Field extends keyof DeliveryDetails,
  >(
    field: Field,
    value:
      DeliveryDetails[Field],
  ) {
    setDelivery(
      (current) => ({
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
        (current) => ({
          ...current,
          [field]:
            undefined,
        }),
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

  function handleSubmit() {
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
                onPress={() =>
                  setFulfillmentType(
                    'pickup',
                  )
                }
              />

              <ChoiceButton
                title="Domicilio"
                subtitle={
                  deliveryFee > 0
                    ? `+ ${formatPrice(
                      deliveryFee,
                    )}`
                    : 'Entrega a domicilio'
                }
                selected={
                  fulfillmentType ===
                  'delivery'
                }
                onPress={() =>
                  setFulfillmentType(
                    'delivery',
                  )
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
                  <SummaryRow
                    label="Envío a domicilio"
                    value={
                      formatPrice(
                        deliveryFee,
                      )
                    }
                  />
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
                submitting
              }
              onPress={
                handleSubmit
              }
              style={({ pressed }) => [
                styles.confirmButton,
                pressed &&
                !submitting &&
                styles.confirmButtonPressed,
                submitting &&
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
      style={({ pressed }) => [
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
