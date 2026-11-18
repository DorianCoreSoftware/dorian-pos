import React, {
  useState,
} from 'react';

import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import {
  styles,
  setBrandPrimaryColor,
} from './WebFeedbackModal.styles';
import { useBusiness } from '../../../context/BusinessContext';
import { WebFeedbackType, submitWebFeedback } from '../../services/web-feedback/webFeedbackService';

interface WebFeedbackModalProps {
  visible: boolean;
  onClose: () => void;
}

const TYPES: Array<{
  value: WebFeedbackType;
  label: string;
}> = [
    {
      value: 'suggestion',
      label: 'Sugerencia',
    },
    {
      value: 'complaint',
      label: 'Queja',
    },
    {
      value: 'compliment',
      label: 'Felicitación',
    },
    {
      value: 'other',
      label: 'Otro',
    },
  ];

export function WebFeedbackModal({
  visible,
  onClose,
}: WebFeedbackModalProps) {
  const { theme: businessTheme } = useBusiness();
  setBrandPrimaryColor(businessTheme.primary);

  const {
    business,
  } = useBusiness();

  const businessName =
    business?.identity.businessName ??
    'Dorian POS';

  const [
    type,
    setType,
  ] = useState<WebFeedbackType>(
    'suggestion',
  );

  const [
    name,
    setName,
  ] = useState('');

  const [
    phone,
    setPhone,
  ] = useState('');

  const [
    message,
    setMessage,
  ] = useState('');

  const [
    isSubmitting,
    setIsSubmitting,
  ] = useState(false);

  const [
    error,
    setError,
  ] = useState<string | null>(
    null,
  );

  const [
    success,
    setSuccess,
  ] = useState(false);

  function reset():
    void {
    setType(
      'suggestion',
    );

    setName('');

    setPhone('');

    setMessage('');

    setError(
      null,
    );

    setSuccess(
      false,
    );
  }

  function handleClose():
    void {
    if (isSubmitting) {
      return;
    }

    reset();

    onClose();
  }

  async function handleSubmit():
    Promise<void> {
    if (isSubmitting) {
      return;
    }

    const normalizedMessage =
      message.trim();

    const normalizedName =
      name.trim();

    const normalizedPhone =
      phone.replace(
        /\D/g,
        '',
      );

    if (
      normalizedName.length >
      80
    ) {
      setError(
        'El nombre no puede superar 80 caracteres.',
      );

      return;
    }

    if (
      normalizedPhone &&
      normalizedPhone.length !==
        10
    ) {
      setError(
        'Si agregas un teléfono, debe tener exactamente 10 dígitos.',
      );

      return;
    }

    if (
      normalizedMessage.length <
      5
    ) {
      setError(
        'Escribe un mensaje de al menos 5 caracteres.',
      );

      return;
    }

    try {
      setIsSubmitting(
        true,
      );

      setError(
        null,
      );

      await submitWebFeedback({
        type,

        message:
          normalizedMessage,

        customerName:
          normalizedName,

        customerPhone:
          normalizedPhone,
      });

      setSuccess(
        true,
      );

      setMessage('');
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : 'No se pudo enviar tu mensaje.',
      );
    } finally {
      setIsSubmitting(
        false,
      );
    }
  }

  return (
    <Modal
      transparent
      visible={
        visible
      }
      animationType="fade"
      onRequestClose={
        handleClose
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
            handleClose
          }
        />

        <View
          style={
            styles.modalCard
          }
        >
          <View
            style={
              styles.header
            }
          >
            <View
              style={
                styles.headerText
              }
            >
              <Text
                style={
                  styles.title
                }
              >
                💬 Buzón {businessName}
              </Text>

              <Text
                style={
                  styles.subtitle
                }
              >
                Tu opinión nos ayuda a mejorar.
              </Text>
            </View>

            <TouchableOpacity
              disabled={
                isSubmitting
              }
              onPress={
                handleClose
              }
              style={
                styles.closeButton
              }
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
            contentContainerStyle={
              styles.content
            }
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={
              false
            }
          >
            {success ? (
              <View
                style={
                  styles.successBox
                }
              >
                <Text
                  style={
                    styles.successTitle
                  }
                >
                  ¡Gracias por escribirnos!
                </Text>

                <Text
                  style={
                    styles.successText
                  }
                >
                  Tu mensaje fue recibido correctamente.
                </Text>

                <TouchableOpacity
                  onPress={
                    handleClose
                  }
                  style={
                    styles.primaryButton
                  }
                >
                  <Text
                    style={
                      styles.primaryButtonText
                    }
                  >
                    Cerrar
                  </Text>
                </TouchableOpacity>
              </View>
            ) : (
              <>
                <Text
                  style={
                    styles.label
                  }
                >
                  TIPO DE MENSAJE
                </Text>

                <View
                  style={
                    styles.typeRow
                  }
                >
                  {TYPES.map(
                    option => {
                      const selected =
                        option.value ===
                        type;

                      return (
                        <TouchableOpacity
                          key={
                            option.value
                          }
                          onPress={() =>
                            setType(
                              option.value,
                            )
                          }
                          style={[
                            styles.typeButton,

                            selected &&
                            styles.typeButtonSelected,
                          ]}
                        >
                          <Text
                            style={[
                              styles.typeButtonText,

                              selected &&
                              styles.typeButtonTextSelected,
                            ]}
                          >
                            {
                              option.label
                            }
                          </Text>
                        </TouchableOpacity>
                      );
                    },
                  )}
                </View>

                <Text
                  style={
                    styles.label
                  }
                >
                  NOMBRE (OPCIONAL)
                </Text>

                <TextInput
                  value={
                    name
                  }
                  onChangeText={
                    setName
                  }
                  editable={
                    !isSubmitting
                  }
                  maxLength={
                    80
                  }
                  placeholder="Tu nombre"
                  placeholderTextColor="#666666"
                  style={
                    styles.input
                  }
                />

                <Text
                  style={
                    styles.counter
                  }
                >
                  {name.length}/80
                </Text>

                <Text
                  style={
                    styles.label
                  }
                >
                  TELÉFONO (OPCIONAL)
                </Text>

                <TextInput
                  value={
                    phone
                  }
                  onChangeText={(
                    value,
                  ) =>
                    setPhone(
                      value
                        .replace(
                          /\D/g,
                          '',
                        )
                        .slice(
                          0,
                          10,
                        ),
                    )
                  }
                  editable={
                    !isSubmitting
                  }
                  keyboardType="phone-pad"
                  maxLength={
                    10
                  }
                  placeholder="Ej. 4171234567"
                  placeholderTextColor="#666666"
                  style={
                    styles.input
                  }
                />

                <Text
                  style={
                    styles.counter
                  }
                >
                  {phone.length}/10 dígitos
                </Text>

                <Text
                  style={
                    styles.label
                  }
                >
                  MENSAJE
                </Text>

                <TextInput
                  value={
                    message
                  }
                  onChangeText={
                    setMessage
                  }
                  editable={
                    !isSubmitting
                  }
                  multiline
                  maxLength={
                    500
                  }
                  placeholder="Cuéntanos qué podemos mejorar..."
                  placeholderTextColor="#666666"
                  style={[
                    styles.input,
                    styles.messageInput,
                  ]}
                />

                <Text
                  style={
                    styles.counter
                  }
                >
                  {
                    message.length
                  }
                  /500
                </Text>

                {!!error && (
                  <Text
                    style={
                      styles.errorText
                    }
                  >
                    {error}
                  </Text>
                )}

                <TouchableOpacity
                  disabled={
                    isSubmitting
                  }
                  onPress={() => {
                    void handleSubmit();
                  }}
                  style={[
                    styles.primaryButton,

                    isSubmitting &&
                    styles.primaryButtonDisabled,
                  ]}
                >
                  {isSubmitting ? (
                    <ActivityIndicator
                      size="small"
                      color="#151515"
                    />
                  ) : (
                    <Text
                      style={
                        styles.primaryButtonText
                      }
                    >
                      Enviar
                    </Text>
                  )}
                </TouchableOpacity>
              </>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}