import React, {
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';

import {
  getPublicOrderTracking,
  normalizeTrackingCode,
  PublicOrderTracking,
  PublicOrderTrackingStatus,
  subscribeToPublicOrderStatus,
} from '../services/webOrderTrackingService';

import {
  styles,
} from './WebOrderTrackingModal.styles';

interface WebOrderTrackingModalProps {
  visible: boolean;
  initialTrackingCode?: string | null;
  onClose: () => void;
}

interface TrackingStep {
  key:
  PublicOrderTrackingStatus;
  label: string;
}

export function WebOrderTrackingModal({
  visible,
  initialTrackingCode = null,
  onClose,
}: WebOrderTrackingModalProps) {
  const [
    trackingCode,
    setTrackingCode,
  ] = useState(
    initialTrackingCode ?? '',
  );

  const [
    order,
    setOrder,
  ] =
    useState<PublicOrderTracking | null>(
      null,
    );

  const [
    isLoading,
    setIsLoading,
  ] =
    useState(false);

  const [
    errorMessage,
    setErrorMessage,
  ] =
    useState<string | null>(
      null,
    );

  const requestInFlight =
    useRef(false);

  const searchOrder =
    async (
      explicitCode?: string,
      silent = false,
    ): Promise<void> => {
      const code =
        normalizeTrackingCode(
          explicitCode ??
          trackingCode,
        );

      if (!code) {
        if (!silent) {
          setErrorMessage(
            'Ingresa tu código de pedido.',
          );
        }

        return;
      }

      if (
        requestInFlight.current
      ) {
        return;
      }

      try {
        requestInFlight.current =
          true;

        if (!silent) {
          setIsLoading(
            true,
          );

          setErrorMessage(
            null,
          );

          setOrder(
            null,
          );
        }

        const result =
          await getPublicOrderTracking(
            code,
          );

        if (!result) {
          if (!silent) {
            setErrorMessage(
              'No encontramos un pedido web con ese código.',
            );
          }

          return;
        }

        setTrackingCode(
          result.trackingCode,
        );

        setOrder(
          result,
        );

        if (!silent) {
          setErrorMessage(
            null,
          );
        }
      } catch (error) {
        if (silent) {
          console.warn(
            'No se pudo actualizar automáticamente el estado del pedido:',
            error,
          );

          return;
        }

        setErrorMessage(
          error instanceof Error
            ? error.message
            : 'No se pudo consultar el pedido.',
        );
      } finally {
        requestInFlight.current =
          false;

        if (!silent) {
          setIsLoading(
            false,
          );
        }
      }
    };

  useEffect(() => {
    if (!visible) {
      return;
    }

    const code =
      normalizeTrackingCode(
        initialTrackingCode ??
        '',
      );

    setTrackingCode(
      code,
    );

    setOrder(
      null,
    );

    setErrorMessage(
      null,
    );

    if (code) {
      void searchOrder(
        code,
      );
    }
  }, [
    visible,
    initialTrackingCode,
  ]);

  useEffect(() => {
    if (
      !visible ||
      !order ||
      order.status ===
      'delivered' ||
      order.status ===
      'cancelled'
    ) {
      return;
    }

    const unsubscribe =
      subscribeToPublicOrderStatus(
        order.trackingCode,
        payload => {
          setOrder(
            currentOrder => {
              if (!currentOrder) {
                return currentOrder;
              }

              return {
                ...currentOrder,
                status:
                  payload.status,
                updatedAt:
                  payload.updatedAt,
              };
            },
          );
        },
      );

    return unsubscribe;
  }, [
    visible,
    order?.trackingCode,
    order?.status,
  ]);

  useEffect(() => {
    if (
      !visible ||
      !order ||
      order.status ===
      'delivered' ||
      order.status ===
      'cancelled'
    ) {
      return;
    }

    const intervalId =
      setInterval(
        () => {
          void searchOrder(
            order.trackingCode,
            true,
          );
        },
        60000,
      );

    return () => {
      clearInterval(
        intervalId,
      );
    };
  }, [
    visible,
    order?.trackingCode,
    order?.status,
  ]);

  const steps =
    useMemo(
      () =>
        buildTrackingSteps(
          order,
        ),
      [
        order,
      ],
    );

  return (
    <Modal
      visible={
        visible
      }
      transparent
      animationType="fade"
      onRequestClose={
        onClose
      }
    >
      <View
        style={
          styles.overlay
        }
      >
        <View
          style={
            styles.container
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
                Sigue tu pedido
              </Text>

              <Text
                style={
                  styles.subtitle
                }
              >
                Consulta el estado con tu código de 8 caracteres.
              </Text>
            </View>

            <Pressable
              onPress={
                onClose
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
                ×
              </Text>
            </Pressable>
          </View>

          <ScrollView
            contentContainerStyle={
              styles.content
            }
            keyboardShouldPersistTaps="handled"
          >
            <View
              style={
                styles.searchRow
              }
            >
              <TextInput
                value={
                  trackingCode
                }
                onChangeText={(
                  value,
                ) => {
                  setTrackingCode(
                    normalizeTrackingCode(
                      value,
                    ).slice(
                      0,
                      8,
                    ),
                  );

                  setErrorMessage(
                    null,
                  );
                }}
                placeholder="Ej. BC4AFE12"
                placeholderTextColor="#777"
                autoCapitalize="characters"
                autoCorrect={
                  false
                }
                maxLength={
                  8
                }
                style={
                  styles.input
                }
                onSubmitEditing={() => {
                  void searchOrder();
                }}
              />

              <Pressable
                onPress={() => {
                  void searchOrder();
                }}
                disabled={
                  isLoading
                }
                style={[
                  styles.searchButton,

                  isLoading
                    ? styles.searchButtonDisabled
                    : null,
                ]}
              >
                <Text
                  style={
                    styles.searchButtonText
                  }
                >
                  Consultar
                </Text>
              </Pressable>
            </View>

            {isLoading ? (
              <View
                style={
                  styles.centerState
                }
              >
                <ActivityIndicator
                  size="large"
                />

                <Text
                  style={
                    styles.loadingText
                  }
                >
                  Consultando pedido...
                </Text>
              </View>
            ) : null}

            {errorMessage &&
              !isLoading ? (
              <View
                style={
                  styles.errorBox
                }
              >
                <Text
                  style={
                    styles.errorText
                  }
                >
                  {errorMessage}
                </Text>
              </View>
            ) : null}

            {order &&
              !isLoading ? (
              <>
                <View
                  style={
                    styles.orderHeader
                  }
                >
                  <Text
                    style={
                      styles.orderCode
                    }
                  >
                    Pedido #
                    {
                      order.trackingCode
                    }
                  </Text>

                  <Text
                    style={
                      styles.orderMeta
                    }
                  >
                    {
                      order.fulfillmentType ===
                        'delivery'
                        ? 'Domicilio'
                        : 'Recoger'
                    }
                  </Text>

                  <Text
                    style={
                      styles.orderMeta
                    }
                  >
                    Pedido creado:{' '}
                    {formatOrderDate(
                      order.createdAt,
                    )}
                  </Text>

                  <Text
                    style={
                      styles.orderMeta
                    }
                  >
                    Última actualización:{' '}
                    {formatOrderDate(
                      order.updatedAt,
                    )}
                  </Text>

                  {order.customerName ? (
                    <Text
                      style={
                        styles.customerName
                      }
                    >
                      {
                        order.customerName
                      }
                    </Text>
                  ) : null}
                </View>

                {order.status ===
                  'cancelled' ? (
                  <View
                    style={
                      styles.cancelledBox
                    }
                  >
                    <Text
                      style={
                        styles.cancelledTitle
                      }
                    >
                      Pedido cancelado
                    </Text>

                    <Text
                      style={
                        styles.cancelledText
                      }
                    >
                      Este pedido fue cancelado y ya no continuará en preparación.
                    </Text>
                  </View>
                ) : (
                  <View
                    style={
                      styles.timeline
                    }
                  >
                    {steps.map(
                      (
                        step,
                        index,
                      ) => (
                        <TrackingStepRow
                          key={
                            step.key
                          }
                          label={
                            step.label
                          }
                          state={
                            getStepState(
                              order,
                              step.key,
                              steps,
                            )
                          }
                          isLast={
                            index ===
                            steps.length -
                            1
                          }
                        />
                      ),
                    )}
                  </View>
                )}

                {order.status !==
                  'delivered' &&
                  order.status !==
                  'cancelled' ? (
                  <Text
                    style={
                      styles.loadingText
                    }
                  >
                    El estado se actualiza automáticamente en tiempo real.
                  </Text>
                ) : null}

                <Pressable
                  onPress={() => {
                    void searchOrder(
                      order.trackingCode,
                    );
                  }}
                  style={
                    styles.refreshButton
                  }
                >
                  <Text
                    style={
                      styles.refreshButtonText
                    }
                  >
                    Actualizar estado
                  </Text>
                </Pressable>
              </>
            ) : null}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

function TrackingStepRow({
  label,
  state,
  isLast,
}: {
  label: string;

  state:
  | 'complete'
  | 'current'
  | 'pending';

  isLast: boolean;
}) {
  return (
    <View
      style={
        styles.stepRow
      }
    >
      <View
        style={
          styles.stepIndicatorColumn
        }
      >
        <View
          style={[
            styles.stepDot,

            state ===
              'complete'
              ? styles.stepDotComplete
              : null,

            state ===
              'current'
              ? styles.stepDotCurrent
              : null,
          ]}
        />

        {!isLast ? (
          <View
            style={[
              styles.stepLine,

              state ===
                'complete'
                ? styles.stepLineComplete
                : null,
            ]}
          />
        ) : null}
      </View>

      <View
        style={
          styles.stepTextContainer
        }
      >
        <Text
          style={[
            styles.stepLabel,

            state ===
              'pending'
              ? styles.stepLabelPending
              : null,
          ]}
        >
          {label}
        </Text>

        {state ===
          'current' ? (
          <Text
            style={
              styles.currentLabel
            }
          >
            Estado actual
          </Text>
        ) : null}
      </View>
    </View>
  );
}

function buildTrackingSteps(
  order:
    PublicOrderTracking | null,
): TrackingStep[] {
  if (
    order?.fulfillmentType ===
    'delivery'
  ) {
    return [
      {
        key:
          'pending',
        label:
          'Pedido recibido',
      },
      {
        key:
          'preparing',
        label:
          'En preparación',
      },
      {
        key:
          'ready',
        label:
          'Listo para reparto',
      },
      {
        key:
          'on_the_way',
        label:
          'En camino',
      },
      {
        key:
          'delivered',
        label:
          'Entregado',
      },
    ];
  }

  return [
    {
      key:
        'pending',
      label:
        'Pedido recibido',
    },
    {
      key:
        'preparing',
      label:
        'En preparación',
    },
    {
      key:
        'ready',
      label:
        'Listo para recoger',
    },
    {
      key:
        'delivered',
      label:
        'Entregado',
    },
  ];
}

function getStepState(
  order:
    PublicOrderTracking,
  stepStatus:
    PublicOrderTrackingStatus,
  steps:
    TrackingStep[],
):
  | 'complete'
  | 'current'
  | 'pending' {
  const currentIndex =
    steps.findIndex(
      (
        step,
      ) =>
        step.key ===
        order.status,
    );

  const stepIndex =
    steps.findIndex(
      (
        step,
      ) =>
        step.key ===
        stepStatus,
    );

  if (
    stepIndex <
    currentIndex
  ) {
    return 'complete';
  }

  if (
    stepIndex ===
    currentIndex
  ) {
    return 'current';
  }

  return 'pending';
}

function formatOrderDate(
  value: string,
): string {
  const date =
    new Date(
      value,
    );

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    return '';
  }

  return date.toLocaleString(
    'es-MX',
    {
      day:
        '2-digit',

      month:
        '2-digit',

      year:
        'numeric',

      hour:
        '2-digit',

      minute:
        '2-digit',
    },
  );
}