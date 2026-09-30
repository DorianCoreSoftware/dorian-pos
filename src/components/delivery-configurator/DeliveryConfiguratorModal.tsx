import { useBusiness } from '../../context/BusinessContext';

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
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import {
  DeliveryDetails,
  Product,
} from '../../types';

import {
  DeliveryQuote,
  getDeliveryQuote,
} from '../../services/deliveryService';

import {
  GooglePlaceSearch,
} from '../common/GooglePlaceSearch';

import {
  GooglePlaceSelection,
} from '../../services/googlePlacesService';

import {
  styles,
  setBrandPrimaryColor,
} from './DeliveryConfiguratorModal.styles';

import {
  useCurrency,
} from '../../hooks/useCurrency';

interface DeliveryConfiguratorModalProps {
  visible:
  boolean;

  product:
  Product | null;

  initialValue?:
  DeliveryDetails | null;

  onClose:
  () => void;

  onConfirm:
  (
    deliveryDetails:
      DeliveryDetails,

    deliveryFee:
      number,
  ) => void;
}

interface DeliveryFormErrors {
  customerName?:
  string;

  phone?:
  string;

  street?:
  string;

  exteriorNumber?:
  string;

  neighborhood?:
  string;
}

const EMPTY_DELIVERY_DETAILS:
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

export function DeliveryConfiguratorModal({
  visible,
  product,
  initialValue,
  onClose,
  onConfirm,
}: DeliveryConfiguratorModalProps) {
  const { theme: businessTheme } = useBusiness();
    setBrandPrimaryColor(businessTheme.primary);

  const {
    formatCurrency,
  } = useCurrency();

  const [
    form,
    setForm,
  ] =
    useState<DeliveryDetails>(
      EMPTY_DELIVERY_DETAILS,
    );

  const [
    errors,
    setErrors,
  ] =
    useState<DeliveryFormErrors>(
      {},
    );

  const [
    deliveryQuote,
    setDeliveryQuote,
  ] =
    useState<DeliveryQuote | null>(
      null,
    );

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

  useEffect(
    () => {
      if (
        !visible
      ) {
        return;
      }

      const nextForm =
        initialValue
          ? {
            ...initialValue,
          }
          : {
            ...EMPTY_DELIVERY_DETAILS,
          };

      setForm(
        nextForm,
      );

      setErrors(
        {},
      );

      setDeliveryQuote(
        null,
      );

      setDeliveryQuoteError(
        null,
      );

      setIsQuotingDelivery(
        false,
      );

      /*
       * Si estamos editando una entrega
       * existente y ya tenemos coordenadas,
       * recalculamos automáticamente
       * la cobertura actual.
       */
      if (
        initialValue?.latitude !==
        null &&
        initialValue?.latitude !==
        undefined &&
        initialValue?.longitude !==
        null &&
        initialValue?.longitude !==
        undefined
      ) {
        void loadExistingDeliveryQuote(
          initialValue.latitude,
          initialValue.longitude,
        );
      }
    },
    [
      visible,
      initialValue,
      product?.id,
    ],
  );

  const hasSelectedPlace =
    form.latitude !==
    null &&
    form.longitude !==
    null;

  const baseDeliveryFee =
    Number(
      product?.price ??
      0,
    );

  const totalDeliveryFee =
    useMemo(
      () => {
        const extraFee =
          deliveryQuote
            ?.available
            ? deliveryQuote
              .extraFee
            : 0;

        return (
          baseDeliveryFee +
          extraFee
        );
      },
      [
        baseDeliveryFee,
        deliveryQuote,
      ],
    );

  const isFormValid =
    useMemo(
      () =>
        Boolean(
          form.customerName
            .trim() &&
          normalizePhone(
            form.phone,
          ).length ===
          10 &&
          form.street
            .trim() &&
          form.exteriorNumber
            .trim() &&
          form.neighborhood
            .trim() &&
          hasSelectedPlace &&
          deliveryQuote &&
          deliveryQuote.available &&
          !isQuotingDelivery
        ),
      [
        form.customerName,
        form.phone,
        form.street,
        form.exteriorNumber,
        form.neighborhood,
        hasSelectedPlace,
        deliveryQuote,
        isQuotingDelivery,
      ],
    );

  function updateField<
    Field extends keyof DeliveryDetails,
  >(
    field:
      Field,

    value:
      DeliveryDetails[Field],
  ): void {
    setForm(
      (
        currentForm,
      ) => ({
        ...currentForm,

        [field]:
          value,
      }),
    );

    if (
      field in errors &&
      typeof value ===
      'string' &&
      value.trim()
    ) {
      setErrors(
        (
          currentErrors,
        ) => ({
          ...currentErrors,

          [field]:
            undefined,
        }),
      );
    }
  }

  async function loadExistingDeliveryQuote(
    latitude:
      number,

    longitude:
      number,
  ): Promise<void> {
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
      console.error(
        'Error recalculando cobertura:',
        error,
      );

      setDeliveryQuote(
        null,
      );

      setDeliveryQuoteError(
        error instanceof
          Error
          ? error.message
          : 'No se pudo calcular la cobertura.',
      );
    } finally {
      setIsQuotingDelivery(
        false,
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

    setForm(
      (
        current,
      ) => ({
        ...current,

        street:
          place.street ??
          '',

        exteriorNumber:
          place.exteriorNumber ??
          '',

        neighborhood:
          place.neighborhood ??
          '',

        postalCode:
          place.postalCode ??
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
      console.error(
        'Error calculando cobertura:',
        error,
      );

      setDeliveryQuote(
        null,
      );

      setDeliveryQuoteError(
        error instanceof
          Error
          ? error.message
          : 'No se pudo calcular la cobertura.',
      );
    } finally {
      setIsQuotingDelivery(
        false,
      );
    }
  }

  function validateForm():
    DeliveryFormErrors {
    const nextErrors:
      DeliveryFormErrors = {};

    if (
      !form.customerName
        .trim()
    ) {
      nextErrors.customerName =
        'El nombre del cliente es obligatorio.';
    }

    const normalizedPhone =
      normalizePhone(
        form.phone,
      );

    if (
      !normalizedPhone
    ) {
      nextErrors.phone =
        'El teléfono es obligatorio.';
    } else if (
      normalizedPhone.length !==
      10
    ) {
      nextErrors.phone =
        'El teléfono debe tener exactamente 10 dígitos.';
    }

    if (
      !form.street
        .trim()
    ) {
      nextErrors.street =
        'Selecciona una dirección válida.';
    }

    if (
      !form.exteriorNumber
        .trim()
    ) {
      nextErrors.exteriorNumber =
        'La dirección seleccionada no contiene número exterior.';
    }

    if (
      !form.neighborhood
        .trim()
    ) {
      nextErrors.neighborhood =
        'La dirección seleccionada no contiene colonia.';
    }

    return nextErrors;
  }

  function handleConfirm():
    void {
    const validationErrors =
      validateForm();

    setErrors(
      validationErrors,
    );

    if (
      Object.keys(
        validationErrors,
      ).length >
      0
    ) {
      return;
    }

    if (
      form.latitude ===
      null ||
      form.longitude ===
      null
    ) {
      setDeliveryQuoteError(
        'Selecciona una dirección válida.',
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
      !deliveryQuote.available
    ) {
      setDeliveryQuoteError(
        'Esta ubicación está fuera de nuestra zona de reparto.',
      );

      return;
    }

    onConfirm(
      {
        customerName:
          form.customerName
            .trim(),

        phone:
          normalizePhone(
            form.phone,
          ),

        street:
          form.street
            .trim(),

        exteriorNumber:
          form.exteriorNumber
            .trim(),

        interiorNumber:
          form.interiorNumber
            .trim(),

        neighborhood:
          form.neighborhood
            .trim(),

        postalCode:
          form.postalCode
            .trim(),

        deliveryReferences:
          form.deliveryReferences
            .trim(),

        latitude:
          form.latitude,

        longitude:
          form.longitude,
      },

      totalDeliveryFee,
    );
  }

  function handleClose():
    void {
    setErrors(
      {},
    );

    setDeliveryQuote(
      null,
    );

    setDeliveryQuoteError(
      null,
    );

    onClose();
  }

  if (
    !product
  ) {
    return null;
  }

  return (
    <Modal
      visible={
        visible
      }
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={
        handleClose
      }
    >
      <KeyboardAvoidingView
        style={
          styles.overlay
        }
        behavior={
          Platform.OS ===
            'ios'
            ? 'padding'
            : undefined
        }
        keyboardVerticalOffset={
          Platform.OS ===
            'ios'
            ? 20
            : 0
        }
      >
        <View
          style={
            styles.modalContainer
          }
        >
          <View
            style={
              styles.header
            }
          >
            <View
              style={
                styles.headerTextContainer
              }
            >
              <Text
                style={
                  styles.title
                }
              >
                Datos de entrega
              </Text>

              <Text
                style={
                  styles.subtitle
                }
              >
                {
                  product.name
                }
              </Text>
            </View>

            <TouchableOpacity
              style={
                styles.closeButton
              }
              onPress={
                handleClose
              }
              accessibilityRole="button"
              accessibilityLabel="Cerrar formulario"
            >
              <Text
                style={
                  styles.closeButtonText
                }
              >
                ✕
              </Text>
            </TouchableOpacity>
          </View>

          <ScrollView
            style={
              styles.scrollView
            }
            contentContainerStyle={
              styles.scrollContent
            }
            keyboardShouldPersistTaps="always"
            keyboardDismissMode="none"
            showsVerticalScrollIndicator={
              false
            }
            nestedScrollEnabled
          >
            <SectionTitle>
              Datos del cliente
            </SectionTitle>

            <FormInput
              label="Nombre del cliente"
              value={
                form.customerName
              }
              placeholder="Ej. Juan Pérez"
              error={
                errors.customerName
              }
              autoCapitalize="words"
              maxLength={
                80
              }
              onChangeText={(
                value,
              ) =>
                updateField(
                  'customerName',
                  value,
                )
              }
            />

            <FormInput
              label="Teléfono"
              value={
                form.phone
              }
              placeholder="Ej. 5512345678"
              error={
                errors.phone
              }
              keyboardType="phone-pad"
              maxLength={
                10
              }
              onChangeText={(
                value,
              ) =>
                updateField(
                  'phone',
                  value.replace(
                    /\D/g,
                    '',
                  ),
                )
              }
            />

            <SectionTitle>
              Dirección
            </SectionTitle>

            <GooglePlaceSearch
              initialValue=""
              disabled={
                isQuotingDelivery
              }
              dropdownDirection="up"
              placeholder="Buscar negocio o dirección..."
              onPlaceSelected={
                handleGooglePlaceSelected
              }
            />

            {isQuotingDelivery && (
              <View
                style={
                  styles.quotingBox
                }
              >
                <ActivityIndicator
                  size="small"
                  color="#FFB000"
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

            {hasSelectedPlace && (
              <>
                <FormInput
                  label="Calle"
                  value={
                    form.street
                  }
                  placeholder=""
                  error={
                    errors.street
                  }
                  maxLength={
                    100
                  }
                  editable={
                    false
                  }
                  onChangeText={() => { }}
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
                        form.exteriorNumber
                      }
                      placeholder=""
                      error={
                        errors.exteriorNumber
                      }
                      maxLength={
                        10
                      }
                      editable={
                        false
                      }
                      onChangeText={() => { }}
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
                        form.interiorNumber
                      }
                      placeholder="Opcional"
                      maxLength={
                        10
                      }
                      autoCapitalize="characters"
                      onChangeText={(
                        value,
                      ) =>
                        updateField(
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
                    form.neighborhood
                  }
                  placeholder=""
                  error={
                    errors.neighborhood
                  }
                  maxLength={
                    100
                  }
                  editable={
                    false
                  }
                  onChangeText={() => { }}
                />

                <FormInput
                  label="Código postal"
                  value={
                    form.postalCode
                  }
                  placeholder=""
                  maxLength={
                    5
                  }
                  editable={
                    false
                  }
                  onChangeText={() => { }}
                />

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

                    {deliveryQuote.distanceKm !==
                      null && (
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
                            baseDeliveryFee,
                          )}
                        </Text>

                        {deliveryQuote.extraFee >
                          0 ? (
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
                            totalDeliveryFee,
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
                      {
                        deliveryQuoteError
                      }
                    </Text>
                  </View>
                )}

                <SectionTitle>
                  Referencias de entrega
                </SectionTitle>

                <FormInput
                  label="Referencias"
                  value={
                    form.deliveryReferences
                  }
                  placeholder="Ej. Portón negro, tocar el timbre"
                  multiline
                  maxLength={
                    300
                  }
                  onChangeText={(
                    value,
                  ) =>
                    updateField(
                      'deliveryReferences',
                      value,
                    )
                  }
                />
              </>
            )}
          </ScrollView>

          <View
            style={
              styles.footer
            }
          >
            <TouchableOpacity
              style={
                styles.cancelButton
              }
              onPress={
                handleClose
              }
            >
              <Text
                style={
                  styles.cancelButtonText
                }
              >
                Cancelar
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.confirmButton,

                !isFormValid &&
                styles.confirmButtonDisabled,
              ]}
              disabled={
                !isFormValid
              }
              onPress={
                handleConfirm
              }
            >
              <Text
                style={[
                  styles.confirmButtonText,

                  !isFormValid &&
                  styles.confirmButtonTextDisabled,
                ]}
              >
                {isQuotingDelivery
                  ? 'Calculando...'
                  : deliveryQuote &&
                    !deliveryQuote.available
                    ? 'Fuera de cobertura'
                    : !hasSelectedPlace
                      ? 'Selecciona dirección'
                      : `Agregar entrega · ${formatCurrency(
                        totalDeliveryFee,
                      )}`}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

interface SectionTitleProps {
  children:
  React.ReactNode;
}

function SectionTitle({
  children,
}: SectionTitleProps) {
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

interface FormInputProps {
  label:
  string;

  value:
  string;

  placeholder:
  string;

  error?:
  string;

  multiline?:
  boolean;

  maxLength?:
  number;

  editable?:
  boolean;

  keyboardType?:
  | 'default'
  | 'phone-pad'
  | 'number-pad';

  autoCapitalize?:
  | 'none'
  | 'sentences'
  | 'words'
  | 'characters';

  onChangeText:
  (
    value:
      string,
  ) => void;
}

function FormInput({
  label,
  value,
  placeholder,
  error,
  multiline = false,
  maxLength,
  editable = true,
  keyboardType = 'default',
  autoCapitalize = 'sentences',
  onChangeText,
}: FormInputProps) {
  return (
    <View
      style={
        styles.inputContainer
      }
    >
      <Text
        style={[
          styles.inputLabel,

          !editable &&
          styles.inputLabelDisabled,
        ]}
      >
        {
          label
        }
      </Text>

      <TextInput
        value={
          value
        }
        placeholder={
          placeholder
        }
        placeholderTextColor="#777777"
        keyboardType={
          keyboardType
        }
        autoCapitalize={
          autoCapitalize
        }
        multiline={
          multiline
        }
        maxLength={
          maxLength
        }
        editable={
          editable
        }
        textAlignVertical={
          multiline
            ? 'top'
            : 'center'
        }
        onChangeText={
          onChangeText
        }
        style={[
          styles.input,

          multiline &&
          styles.multilineInput,

          !editable &&
          styles.inputDisabled,

          Boolean(
            error,
          ) &&
          styles.inputError,
        ]}
      />

      {error ? (
        <Text
          style={
            styles.errorText
          }
        >
          {
            error
          }
        </Text>
      ) : null}

      {multiline &&
        maxLength ? (
        <Text
          style={
            styles.characterCounter
          }
        >
          {value.length}/
          {maxLength}
        </Text>
      ) : null}
    </View>
  );
}

function normalizePhone(
  value:
    string,
): string {
  return value.replace(
    /\D/g,
    '',
  );
}
