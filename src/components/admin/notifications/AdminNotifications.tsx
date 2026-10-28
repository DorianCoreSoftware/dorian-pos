import React, {
  useCallback,
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
  getPosNotifications,
  markAllPosNotificationsRead,
  markPosNotificationRead,
  PosNotification,
} from '../../../services/notificationCenterService';

import {
  useBusiness,
} from '../../../context/BusinessContext';

import {
  styles,
} from './AdminNotifications.styles';

type Filter =
  | 'active'
  | 'history';

const SEVERITY_LABEL:
Record<
  PosNotification['severity'],
  string
> = {
  info: 'INFO',
  warning: 'ATENCIÓN',
  critical: 'CRÍTICA',
};

interface Props {
  onNavigateToInventory?:
    () => void;
}

export function AdminNotifications({
  onNavigateToInventory,
}: Props) {
  const {
    theme,
  } =
    useBusiness();

  const [
    notifications,
    setNotifications,
  ] =
    useState<PosNotification[]>(
      [],
    );

  const [
    filter,
    setFilter,
  ] =
    useState<Filter>(
      'active',
    );

  const [
    loading,
    setLoading,
  ] =
    useState(true);

  const [
    mutating,
    setMutating,
  ] =
    useState(false);

  const load =
    useCallback(
      async (): Promise<void> => {
        try {
          setLoading(
            true,
          );

          const data =
            await getPosNotifications(
              filter ===
                'active',
              200,
            );

          setNotifications(
            data,
          );
        } catch (error) {
          Alert.alert(
            'Notificaciones',
            error instanceof Error
              ? error.message
              : 'No se pudieron cargar las notificaciones.',
          );
        } finally {
          setLoading(
            false,
          );
        }
      },
      [
        filter,
      ],
    );

  useEffect(
    () => {
      void load();
    },
    [
      load,
    ],
  );

  const counts =
    useMemo(
      () => ({
        unread:
          notifications.filter(
            notification =>
              notification.isActive &&
              !notification.readAt,
          ).length,
        critical:
          notifications.filter(
            notification =>
              notification.isActive &&
              notification.severity ===
                'critical',
          ).length,
        warning:
          notifications.filter(
            notification =>
              notification.isActive &&
              notification.severity ===
                'warning',
          ).length,
      }),
      [
        notifications,
      ],
    );

  async function handleRead(
    notification:
      PosNotification,
  ): Promise<void> {
    if (notification.readAt) {
      return;
    }

    try {
      setMutating(
        true,
      );

      await markPosNotificationRead(
        notification.id,
      );

      await load();
    } catch (error) {
      Alert.alert(
        'Notificación',
        error instanceof Error
          ? error.message
          : 'No se pudo actualizar.',
      );
    } finally {
      setMutating(
        false,
      );
    }
  }

  async function handleReadAll():
  Promise<void> {
    try {
      setMutating(
        true,
      );

      await markAllPosNotificationsRead();

      await load();
    } catch (error) {
      Alert.alert(
        'Notificaciones',
        error instanceof Error
          ? error.message
          : 'No se pudieron actualizar.',
      );
    } finally {
      setMutating(
        false,
      );
    }
  }

  function handleOpenSource(
    notification:
      PosNotification,
  ): void {
    void handleRead(
      notification,
    );

    if (
      notification.actionTarget ===
        'inventory' &&
      onNavigateToInventory
    ) {
      onNavigateToInventory();
    }
  }

  return (
    <ScrollView
      style={
        styles.container
      }
      contentContainerStyle={
        styles.content
      }
      showsVerticalScrollIndicator={
        false
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
            style={[
              styles.title,
              {
                color:
                  theme.text,
              },
            ]}
          >
            Centro de notificaciones
          </Text>

          <Text
            style={[
              styles.subtitle,
              {
                color:
                  theme.textMuted,
              },
            ]}
          >
            Alertas operativas que requieren atención. En esta primera fase se generan automáticamente desde Inventario.
          </Text>
        </View>
      </View>

      <View
        style={
          styles.countRow
        }
      >
        <CountCard
          label="Sin leer"
          value={
            counts.unread
          }
          theme={
            theme
          }
        />

        <CountCard
          label="Críticas"
          value={
            counts.critical
          }
          theme={
            theme
          }
        />

        <CountCard
          label="Stock bajo"
          value={
            counts.warning
          }
          theme={
            theme
          }
        />
      </View>

      <View
        style={
          styles.toolbar
        }
      >
        {[
          {
            id:
              'active' as Filter,
            label:
              'ACTIVAS',
          },
          {
            id:
              'history' as Filter,
            label:
              'HISTORIAL',
          },
        ].map(
          option => {
            const selected =
              filter ===
              option.id;

            return (
              <TouchableOpacity
                key={
                  option.id
                }
                style={[
                  styles.tab,
                  {
                    borderColor:
                      selected
                        ? theme.primary
                        : theme.border,
                    backgroundColor:
                      selected
                        ? theme.surfaceAlt
                        : theme.surface,
                  },
                ]}
                onPress={
                  () =>
                    setFilter(
                      option.id,
                    )
                }
              >
                <Text
                  style={[
                    styles.tabText,
                    {
                      color:
                        selected
                          ? theme.primary
                          : theme.textMuted,
                    },
                  ]}
                >
                  {option.label}
                </Text>
              </TouchableOpacity>
            );
          },
        )}

        {filter ===
          'active' &&
        counts.unread >
          0 ? (
          <TouchableOpacity
            disabled={
              mutating
            }
            style={[
              styles.actionButton,
              {
                backgroundColor:
                  theme.primary,
                opacity:
                  mutating
                    ? 0.55
                    : 1,
              },
            ]}
            onPress={
              () => {
                void handleReadAll();
              }
            }
          >
            <Text
              style={[
                styles.actionButtonText,
                {
                  color:
                    theme.onPrimary,
                },
              ]}
            >
              MARCAR TODAS LEÍDAS
            </Text>
          </TouchableOpacity>
        ) : null}
      </View>

      {loading ? (
        <ActivityIndicator
          color={
            theme.primary
          }
        />
      ) : (
        <View
          style={
            styles.list
          }
        >
          {notifications.map(
            notification => {
              const unread =
                notification.isActive &&
                !notification.readAt;

              const accent =
                notification.severity ===
                  'critical'
                  ? theme.danger
                  : notification.severity ===
                      'warning'
                    ? theme.primary
                    : theme.textMuted;

              return (
                <View
                  key={
                    notification.id
                  }
                  style={[
                    styles.card,
                    unread
                      ? styles.unreadCard
                      : null,
                    {
                      borderColor:
                        unread
                          ? accent
                          : theme.border,
                      backgroundColor:
                        theme.surface,
                      opacity:
                        notification.isActive
                          ? 1
                          : 0.6,
                    },
                  ]}
                >
                  <View
                    style={
                      styles.cardHeader
                    }
                  >
                    <View
                      style={
                        styles.cardInfo
                      }
                    >
                      <View
                        style={
                          styles.cardTitleRow
                        }
                      >
                        {unread ? (
                          <View
                            style={[
                              styles.unreadDot,
                              {
                                backgroundColor:
                                  accent,
                              },
                            ]}
                          />
                        ) : null}

                        <Text
                          style={[
                            styles.cardTitle,
                            {
                              color:
                                theme.text,
                            },
                          ]}
                        >
                          {notification.title}
                        </Text>
                      </View>

                      <Text
                        style={[
                          styles.message,
                          {
                            color:
                              theme.textMuted,
                          },
                        ]}
                      >
                        {notification.message}
                      </Text>

                      <Text
                        style={[
                          styles.date,
                          {
                            color:
                              theme.textMuted,
                          },
                        ]}
                      >
                        Actualizada:{' '}
                        {new Date(
                          notification.updatedAt,
                        ).toLocaleString(
                          'es-MX',
                        )}
                        {!notification.isActive
                          ? ' · Resuelta'
                          : ''}
                      </Text>
                    </View>

                    <View
                      style={[
                        styles.badge,
                        {
                          borderColor:
                            accent,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.badgeText,
                          {
                            color:
                              accent,
                          },
                        ]}
                      >
                        {SEVERITY_LABEL[
                          notification.severity
                        ]}
                      </Text>
                    </View>
                  </View>

                  <View
                    style={
                      styles.actions
                    }
                  >
                    {unread ? (
                      <TouchableOpacity
                        disabled={
                          mutating
                        }
                        onPress={
                          () => {
                            void handleRead(
                              notification,
                            );
                          }
                        }
                      >
                        <Text
                          style={[
                            styles.linkText,
                            {
                              color:
                                theme.textMuted,
                            },
                          ]}
                        >
                          Marcar leída
                        </Text>
                      </TouchableOpacity>
                    ) : null}

                    {notification.actionTarget ===
                      'inventory' &&
                    onNavigateToInventory ? (
                      <TouchableOpacity
                        onPress={
                          () =>
                            handleOpenSource(
                              notification,
                            )
                        }
                      >
                        <Text
                          style={[
                            styles.linkText,
                            {
                              color:
                                theme.primary,
                            },
                          ]}
                        >
                          Ver inventario
                        </Text>
                      </TouchableOpacity>
                    ) : null}
                  </View>
                </View>
              );
            },
          )}

          {notifications.length ===
          0 ? (
            <View
              style={
                styles.empty
              }
            >
              <Text
                style={
                  styles.emptyIcon
                }
              >
                🔔
              </Text>

              <Text
                style={[
                  styles.emptyTitle,
                  {
                    color:
                      theme.text,
                  },
                ]}
              >
                Sin alertas
              </Text>

              <Text
                style={[
                  styles.emptyText,
                  {
                    color:
                      theme.textMuted,
                  },
                ]}
              >
                Cuando un insumo llegue a su mínimo o tenga stock negativo aparecerá aquí automáticamente.
              </Text>
            </View>
          ) : null}
        </View>
      )}
    </ScrollView>
  );
}

function CountCard({
  label,
  value,
  theme,
}: {
  label: string;
  value: number;
  theme: {
    text: string;
    textMuted: string;
    border: string;
    surface: string;
  };
}) {
  return (
    <View
      style={[
        styles.countCard,
        {
          borderColor:
            theme.border,
          backgroundColor:
            theme.surface,
        },
      ]}
    >
      <Text
        style={[
          styles.countLabel,
          {
            color:
              theme.textMuted,
          },
        ]}
      >
        {label}
      </Text>

      <Text
        style={[
          styles.countValue,
          {
            color:
              theme.text,
          },
        ]}
      >
        {value}
      </Text>
    </View>
  );
}
