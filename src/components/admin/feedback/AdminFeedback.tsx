import React, {
  useEffect,
  useMemo,
  useState,
} from 'react';

import {
  ActivityIndicator,
  Alert,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import {
  CustomerFeedback,
  CustomerFeedbackStatus,
  getCustomerFeedback,
  updateCustomerFeedbackStatus,
} from '../../../services/customerFeedbackService';

import {
  styles,
} from './AdminFeedback.styles';

const TYPE_LABELS = {
  suggestion:
    'Sugerencia',

  complaint:
    'Queja',

  compliment:
    'Felicitación',

  other:
    'Otro',
};

const STATUS_LABELS = {
  new:
    'Nueva',

  reviewed:
    'Revisada',

  resolved:
    'Resuelta',
};

export function AdminFeedback() {
  const [
    items,
    setItems,
  ] = useState<
    CustomerFeedback[]
  >([]);

  const [
    isLoading,
    setIsLoading,
  ] = useState(
    true,
  );

  const [
    error,
    setError,
  ] = useState<
    string | null
  >(null);

  const [
    updatingId,
    setUpdatingId,
  ] = useState<
    string | null
  >(null);

  const newCount =
    useMemo(
      () =>
        items.filter(
          item =>
            item.status ===
            'new',
        ).length,
      [
        items,
      ],
    );

  useEffect(
    () => {
      void load();
    },
    [],
  );

  async function load():
    Promise<void> {
    try {
      setIsLoading(
        true,
      );

      setError(
        null,
      );

      setItems(
        await getCustomerFeedback(),
      );
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : 'No se pudo cargar el buzón.',
      );
    } finally {
      setIsLoading(
        false,
      );
    }
  }

  async function changeStatus(
    item: CustomerFeedback,
    status:
      CustomerFeedbackStatus,
  ): Promise<void> {
    if (
      updatingId
    ) {
      return;
    }

    try {
      setUpdatingId(
        item.id,
      );

      await updateCustomerFeedbackStatus(
        item.id,
        status,
      );

      setItems(
        current =>
          current.map(
            currentItem =>
              currentItem.id ===
              item.id
                ? {
                    ...currentItem,
                    status,
                  }
                : currentItem,
          ),
      );
    } catch (updateError) {
      Alert.alert(
        'Error',
        updateError instanceof Error
          ? updateError.message
          : 'No se pudo actualizar el comentario.',
      );
    } finally {
      setUpdatingId(
        null,
      );
    }
  }

  if (isLoading) {
    return (
      <View
        style={
          styles.center
        }
      >
        <ActivityIndicator
          size="large"
          color="#FFBF00"
        />

        <Text
          style={
            styles.centerText
          }
        >
          Cargando buzón...
        </Text>
      </View>
    );
  }

  if (error) {
    return (
      <View
        style={
          styles.center
        }
      >
        <Text
          style={
            styles.errorTitle
          }
        >
          No se pudo cargar el buzón
        </Text>

        <Text
          style={
            styles.centerText
          }
        >
          {error}
        </Text>

        <TouchableOpacity
          onPress={() => {
            void load();
          }}
          style={
            styles.reloadButton
          }
        >
          <Text
            style={
              styles.reloadButtonText
            }
          >
            Reintentar
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
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
            Buzón
          </Text>

          <Text
            style={
              styles.subtitle
            }
          >
            Comentarios enviados desde la web.
          </Text>
        </View>

        <View
          style={
            styles.counterBadge
          }
        >
          <Text
            style={
              styles.counterBadgeText
            }
          >
            {newCount} nuevas
          </Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={
          styles.content
        }
        showsVerticalScrollIndicator={
          false
        }
      >
        {items.length ===
        0 ? (
          <Text
            style={
              styles.emptyText
            }
          >
            Aún no hay mensajes.
          </Text>
        ) : (
          items.map(
            item => (
              <View
                key={
                  item.id
                }
                style={[
                  styles.card,

                  item.status ===
                    'new' &&
                  styles.cardNew,
                ]}
              >
                <View
                  style={
                    styles.cardTop
                  }
                >
                  <View
                    style={
                      styles.cardInfo
                    }
                  >
                    <Text
                      style={
                        styles.type
                      }
                    >
                      {
                        TYPE_LABELS[
                          item.feedbackType
                        ]
                      }
                    </Text>

                    <Text
                      style={
                        styles.date
                      }
                    >
                      {formatDateTime(
                        item.createdAt,
                      )}
                    </Text>
                  </View>

                  <Text
                    style={[
                      styles.status,

                      item.status ===
                        'new' &&
                      styles.statusNew,

                      item.status ===
                        'reviewed' &&
                      styles.statusReviewed,

                      item.status ===
                        'resolved' &&
                      styles.statusResolved,
                    ]}
                  >
                    {
                      STATUS_LABELS[
                        item.status
                      ]
                    }
                  </Text>
                </View>

                <Text
                  style={
                    styles.message
                  }
                >
                  {item.message}
                </Text>

                {(item.customerName ||
                  item.customerPhone) && (
                  <View
                    style={
                      styles.customerBox
                    }
                  >
                    {!!item.customerName && (
                      <Text
                        style={
                          styles.customerText
                        }
                      >
                        Nombre: {
                          item.customerName
                        }
                      </Text>
                    )}

                    {!!item.customerPhone && (
                      <Text
                        style={
                          styles.customerText
                        }
                      >
                        Tel: {
                          item.customerPhone
                        }
                      </Text>
                    )}
                  </View>
                )}

                <View
                  style={
                    styles.actions
                  }
                >
                  {item.status ===
                    'new' && (
                    <TouchableOpacity
                      disabled={
                        updatingId ===
                        item.id
                      }
                      onPress={() => {
                        void changeStatus(
                          item,
                          'reviewed',
                        );
                      }}
                      style={
                        styles.secondaryButton
                      }
                    >
                      <Text
                        style={
                          styles.secondaryButtonText
                        }
                      >
                        Marcar revisada
                      </Text>
                    </TouchableOpacity>
                  )}

                  {item.status !==
                    'resolved' && (
                    <TouchableOpacity
                      disabled={
                        updatingId ===
                        item.id
                      }
                      onPress={() => {
                        void changeStatus(
                          item,
                          'resolved',
                        );
                      }}
                      style={
                        styles.primaryButton
                      }
                    >
                      <Text
                        style={
                          styles.primaryButtonText
                        }
                      >
                        Resolver
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            ),
          )
        )}
      </ScrollView>
    </View>
  );
}

function formatDateTime(
  value: string,
): string {
  const date =
    new Date(
      value,
    );

  return new Intl.DateTimeFormat(
    'es-MX',
    {
      dateStyle:
        'medium',

      timeStyle:
        'short',
    },
  ).format(
    date,
  );
}
