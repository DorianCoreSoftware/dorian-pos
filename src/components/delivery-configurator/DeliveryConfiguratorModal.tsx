import React, {
  useEffect,
  useMemo,
  useState,
} from 'react';

import {
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
import { styles } from './DeliveryConfiguratorModal.styles';

interface DeliveryConfiguratorModalProps {
  visible: boolean;
  product: Product | null;

  initialValue?: DeliveryDetails | null;

  onClose: () => void;

  onConfirm: (
    deliveryDetails: DeliveryDetails,
  ) => void;
}

interface DeliveryFormErrors {
  customerName?: string;
  phone?: string;
  street?: string;
  exteriorNumber?: string;
  neighborhood?: string;
}

const EMPTY_DELIVERY_DETAILS:
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

export function DeliveryConfiguratorModal({
  visible,
  product,
  initialValue,
  onClose,
  onConfirm,
}: DeliveryConfiguratorModalProps) {
  const [
    form,
    setForm,
  ] = useState<DeliveryDetails>(
    EMPTY_DELIVERY_DETAILS,
  );

  const [
    errors,
    setErrors,
  ] = useState<DeliveryFormErrors>(
    {},
  );

  useEffect(() => {
    if (!visible) {
      return;
    }

    setForm(
      initialValue
        ? {
          ...initialValue,
        }
        : {
          ...EMPTY_DELIVERY_DETAILS,
        },
    );

    setErrors({});
  }, [
    visible,
    initialValue,
    product?.id,
  ]);

  const isFormValid = useMemo(
    () =>
      Boolean(
        form.customerName.trim() &&
        normalizePhone(
          form.phone,
        ).length === 10 &&
        form.street.trim() &&
        form.exteriorNumber.trim() &&
        form.neighborhood.trim(),
      ),
    [
      form.customerName,
      form.phone,
      form.street,
      form.exteriorNumber,
      form.neighborhood,
    ],
  );

  function updateField<
    Field extends keyof DeliveryDetails,
  >(
    field: Field,
    value: DeliveryDetails[Field],
  ): void {
    setForm(
      (currentForm) => ({
        ...currentForm,
        [field]: value,
      }),
    );

    if (
      field in errors &&
      typeof value === 'string' &&
      value.trim()
    ) {
      setErrors(
        (currentErrors) => ({
          ...currentErrors,
          [field]: undefined,
        }),
      );
    }
  }

  function validateForm():
    DeliveryFormErrors {
    const nextErrors:
      DeliveryFormErrors = {};

    if (!form.customerName.trim()) {
      nextErrors.customerName =
        'El nombre del cliente es obligatorio.';
    }

    const normalizedPhone =
      normalizePhone(form.phone);

    if (!normalizedPhone) {
      nextErrors.phone =
        'El teléfono es obligatorio.';
    } else if (
      normalizedPhone.length !== 10
    ) {
      nextErrors.phone =
        'El teléfono debe tener exactamente 10 dígitos.';
    }

    if (!form.street.trim()) {
      nextErrors.street =
        'La calle es obligatoria.';
    }

    if (!form.exteriorNumber.trim()) {
      nextErrors.exteriorNumber =
        'El número exterior es obligatorio.';
    }

    if (!form.neighborhood.trim()) {
      nextErrors.neighborhood =
        'La colonia es obligatoria.';
    }

    return nextErrors;
  }

  function handleConfirm(): void {
    const validationErrors =
      validateForm();

    setErrors(validationErrors);

    if (
      Object.keys(
        validationErrors,
      ).length > 0
    ) {
      return;
    }

    onConfirm({
      customerName:
        form.customerName.trim(),

      phone:
        normalizePhone(
          form.phone,
        ),

      street:
        form.street.trim(),

      exteriorNumber:
        form.exteriorNumber.trim(),

      interiorNumber:
        form.interiorNumber.trim(),

      neighborhood:
        form.neighborhood.trim(),

      postalCode:
        form.postalCode.trim(),

      deliveryReferences:
        form.deliveryReferences.trim(),

      latitude:
        form.latitude,

      longitude:
        form.longitude,
    });
  }

  function handleClose(): void {
    setErrors({});
    onClose();
  }

  if (!product) {
    return null;
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={
          Platform.OS === 'ios'
            ? 'padding'
            : undefined
        }
      >
        <View style={styles.modalContainer}>
          <View style={styles.header}>
            <View style={styles.headerTextContainer}>
              <Text style={styles.title}>
                Datos de entrega
              </Text>

              <Text style={styles.subtitle}>
                {product.name}
              </Text>
            </View>

            <TouchableOpacity
              style={styles.closeButton}
              onPress={handleClose}
              accessibilityRole="button"
              accessibilityLabel="Cerrar formulario"
            >
              <Text style={styles.closeButtonText}>
                ✕
              </Text>
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={
              styles.scrollContent
            }
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <SectionTitle>
              Datos del cliente
            </SectionTitle>

            <FormInput
              label="Nombre del cliente"
              value={form.customerName}
              placeholder="Ej. Juan Pérez"
              error={errors.customerName}
              autoCapitalize="words"
              maxLength={80}
              onChangeText={(value) =>
                updateField(
                  'customerName',
                  value,
                )
              }
            />

            <FormInput
              label="Teléfono"
              value={form.phone}
              placeholder="Ej. 5512345678"
              error={errors.phone}
              keyboardType="phone-pad"
              maxLength={10}
              onChangeText={(value) =>
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

            <FormInput
              label="Calle"
              value={form.street}
              placeholder="Ej. Avenida Central"
              error={errors.street}
              autoCapitalize="words"
              maxLength={100}
              onChangeText={(value) =>
                updateField(
                  'street',
                  value,
                )
              }
            />

            <View style={styles.row}>
              <View style={styles.rowField}>
                <FormInput
                  label="Número exterior"
                  value={
                    form.exteriorNumber
                  }
                  placeholder="Ej. 120"
                  error={
                    errors.exteriorNumber
                  }
                  maxLength={10}
                  autoCapitalize="characters"
                  onChangeText={(value) =>
                    updateField(
                      'exteriorNumber',
                      value,
                    )
                  }
                />
              </View>

              <View style={styles.rowField}>
                <FormInput
                  label="Número interior"
                  value={
                    form.interiorNumber
                  }
                  placeholder="Opcional"
                  maxLength={10}
                  autoCapitalize="characters"
                  onChangeText={(value) =>
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
              value={form.neighborhood}
              placeholder="Ej. Centro"
              error={errors.neighborhood}
              autoCapitalize="words"
              maxLength={100}
              onChangeText={(value) =>
                updateField(
                  'neighborhood',
                  value,
                )
              }
            />

            <FormInput
              label="Código postal"
              value={form.postalCode}
              placeholder="Opcional"
              keyboardType="number-pad"
              maxLength={5}
              onChangeText={(value) =>
                updateField(
                  'postalCode',
                  value.replace(
                    /\D/g,
                    '',
                  ),
                )
              }
            />

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
              maxLength={300}
              onChangeText={(value) =>
                updateField(
                  'deliveryReferences',
                  value,
                )
              }
            />

            <View style={styles.mapPlaceholder}>
              <Text style={styles.mapIcon}>
                📍
              </Text>

              <View style={styles.mapTextContainer}>
                <Text style={styles.mapTitle}>
                  Ubicación en el mapa
                </Text>

                <Text style={styles.mapDescription}>
                  Se integrará Google Maps en una
                  siguiente etapa.
                </Text>
              </View>
            </View>
          </ScrollView>

          <View style={styles.footer}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={handleClose}
            >
              <Text style={styles.cancelButtonText}>
                Cancelar
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.confirmButton,

                !isFormValid &&
                styles.confirmButtonDisabled,
              ]}
              disabled={!isFormValid}
              onPress={handleConfirm}
            >
              <Text
                style={[
                  styles.confirmButtonText,

                  !isFormValid &&
                  styles.confirmButtonTextDisabled,
                ]}
              >
                Agregar entrega
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

interface SectionTitleProps {
  children: React.ReactNode;
}

function SectionTitle({
  children,
}: SectionTitleProps) {
  return (
    <Text style={styles.sectionTitle}>
      {children}
    </Text>
  );
}

interface FormInputProps {
  label: string;
  value: string;
  placeholder: string;

  error?: string;

  multiline?: boolean;
  maxLength?: number;

  keyboardType?:
  | 'default'
  | 'phone-pad'
  | 'number-pad';

  autoCapitalize?:
  | 'none'
  | 'sentences'
  | 'words'
  | 'characters';

  onChangeText: (
    value: string,
  ) => void;
}

function FormInput({
  label,
  value,
  placeholder,
  error,
  multiline = false,
  maxLength,
  keyboardType = 'default',
  autoCapitalize = 'sentences',
  onChangeText,
}: FormInputProps) {
  return (
    <View style={styles.inputContainer}>
      <Text style={styles.inputLabel}>
        {label}
      </Text>

      <TextInput
        value={value}
        placeholder={placeholder}
        placeholderTextColor="#777777"
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
        multiline={multiline}
        maxLength={maxLength}
        textAlignVertical={
          multiline
            ? 'top'
            : 'center'
        }
        onChangeText={onChangeText}
        style={[
          styles.input,

          multiline &&
          styles.multilineInput,

          Boolean(error) &&
          styles.inputError,
        ]}
      />

      {error ? (
        <Text style={styles.errorText}>
          {error}
        </Text>
      ) : null}

      {multiline && maxLength ? (
        <Text style={styles.characterCounter}>
          {value.length}/{maxLength}
        </Text>
      ) : null}
    </View>
  );
}

function normalizePhone(
  value: string,
): string {
  return value.replace(
    /\D/g,
    '',
  );
}