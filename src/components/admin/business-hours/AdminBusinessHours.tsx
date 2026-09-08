import React, { useEffect, useState } from 'react';

import {
  ActivityIndicator,
  Alert,
  ScrollView,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { styles } from './AdminBusinessHours.styles';

import {
  BusinessHour,
  getBusinessHours,
  getBusinessSettings,
  saveBusinessHours,
  saveWebOrderSettings,
  WebOrderSettings,
} from '../../../services/businessHoursService';

const DAY_NAMES: Record<number, string> = {
  0: 'Domingo',
  1: 'Lunes',
  2: 'Martes',
  3: 'Miércoles',
  4: 'Jueves',
  5: 'Viernes',
  6: 'Sábado',
};

const DEFAULT_PAUSE_MESSAGE =
  'Estamos saturados por el momento. Intenta nuevamente más tarde.';

export function AdminBusinessHours() {
  const [hours, setHours] =
    useState<BusinessHour[]>([]);

  const [timezone, setTimezone] =
    useState('America/Mexico_City');

  const [
    webOrderSettings,
    setWebOrderSettings,
  ] = useState<WebOrderSettings>({
    webOrdersEnabled: true,
    webOrdersPauseMessage:
      DEFAULT_PAUSE_MESSAGE,
  });

  const [isLoading, setIsLoading] =
    useState(true);

  const [isSaving, setIsSaving] =
    useState(false);

  const [error, setError] =
    useState<string | null>(null);

  useEffect(() => {
    void loadData();
  }, []);

  async function loadData(): Promise<void> {
    try {
      setIsLoading(true);
      setError(null);

      const [
        loadedHours,
        loadedSettings,
      ] = await Promise.all([
        getBusinessHours(),
        getBusinessSettings(),
      ]);

      setHours(
        loadedHours,
      );

      setTimezone(
        loadedSettings.timezone,
      );

      setWebOrderSettings({
        webOrdersEnabled:
          loadedSettings
            .webOrderSettings
            .webOrdersEnabled,

        webOrdersPauseMessage:
          loadedSettings
            .webOrderSettings
            .webOrdersPauseMessage ||
          DEFAULT_PAUSE_MESSAGE,
      });
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : 'No se pudieron cargar los horarios.',
      );
    } finally {
      setIsLoading(false);
    }
  }

  function updateHour(
    dayOfWeek: number,
    changes: Partial<BusinessHour>,
  ): void {
    setHours((current) =>
      current.map((hour) =>
        hour.dayOfWeek === dayOfWeek
          ? {
              ...hour,
              ...changes,
            }
          : hour,
      ),
    );
  }

  async function handleSave():
    Promise<void> {
    if (isSaving) return;

    try {
      setIsSaving(true);
      setError(null);

      await Promise.all([
        saveBusinessHours(
          hours,
        ),

        saveWebOrderSettings(
          webOrderSettings,
        ),
      ]);

      Alert.alert(
        'Configuración actualizada',
        'Los horarios y la configuración de pedidos web se guardaron correctamente.',
      );
    } catch (e) {
      const message =
        e instanceof Error
          ? e.message
          : 'No se pudo guardar la configuración.';

      setError(
        message,
      );

      Alert.alert(
        'Error',
        message,
      );
    } finally {
      setIsSaving(false);
    }
  }

  if (isLoading) {
    return (
      <View
        style={
          styles.loadingContainer
        }
      >
        <ActivityIndicator
          size="large"
          color="#FFBF00"
        />

        <Text
          style={
            styles.loadingText
          }
        >
          Cargando horarios...
        </Text>
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
        <Text
          style={
            styles.title
          }
        >
          Horarios de atención
        </Text>

        <Text
          style={
            styles.subtitle
          }
        >
          Define cuándo Burger Kong acepta pedidos desde la web.
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={
          styles.content
        }
        showsVerticalScrollIndicator={
          false
        }
        keyboardShouldPersistTaps="handled"
      >
        <View
          style={
            styles.webOrdersCard
          }
        >
          <View
            style={
              styles.webOrdersHeader
            }
          >
            <View
              style={
                styles.webOrdersHeaderText
              }
            >
              <Text
                style={
                  styles.webOrdersTitle
                }
              >
                Pedidos web
              </Text>

              <Text
                style={[
                  styles.webOrdersStatus,

                  webOrderSettings
                    .webOrdersEnabled
                    ? styles.webOrdersStatusEnabled
                    : styles.webOrdersStatusDisabled,
                ]}
              >
                {webOrderSettings
                  .webOrdersEnabled
                  ? 'Recibiendo pedidos'
                  : 'Pedidos pausados'}
              </Text>
            </View>

            <Switch
              value={
                webOrderSettings
                  .webOrdersEnabled
              }
              disabled={
                isSaving
              }
              onValueChange={
                (value) =>
                  setWebOrderSettings(
                    (current) => ({
                      ...current,
                      webOrdersEnabled:
                        value,
                    }),
                  )
              }
            />
          </View>

          <Text
            style={
              styles.webOrdersDescription
            }
          >
            Usa este control para pausar temporalmente los pedidos web sin modificar los horarios semanales.
          </Text>

          {!webOrderSettings
            .webOrdersEnabled && (
            <View
              style={
                styles.pauseMessageContainer
              }
            >
              <Text
                style={
                  styles.pauseMessageLabel
                }
              >
                MENSAJE PARA EL CLIENTE
              </Text>

              <TextInput
                value={
                  webOrderSettings
                    .webOrdersPauseMessage
                }
                onChangeText={
                  (value) =>
                    setWebOrderSettings(
                      (current) => ({
                        ...current,
                        webOrdersPauseMessage:
                          value,
                      }),
                    )
                }
                editable={
                  !isSaving
                }
                multiline
                maxLength={
                  250
                }
                placeholder={
                  DEFAULT_PAUSE_MESSAGE
                }
                placeholderTextColor="#666666"
                style={
                  styles.pauseMessageInput
                }
              />

              <Text
                style={
                  styles.pauseMessageCounter
                }
              >
                {
                  webOrderSettings
                    .webOrdersPauseMessage
                    .length
                }
                /250
              </Text>
            </View>
          )}
        </View>

        <View
          style={
            styles.timezoneCard
          }
        >
          <Text
            style={
              styles.timezoneLabel
            }
          >
            ZONA HORARIA DEL NEGOCIO
          </Text>

          <Text
            style={
              styles.timezoneValue
            }
          >
            {timezone}
          </Text>
        </View>

        {!!error && (
          <Text
            style={
              styles.errorText
            }
          >
            {error}
          </Text>
        )}

        {hours.map(
          (hour) => (
            <View
              key={
                hour.id
              }
              style={
                styles.dayCard
              }
            >
              <View
                style={
                  styles.dayHeader
                }
              >
                <View>
                  <Text
                    style={
                      styles.dayName
                    }
                  >
                    {
                      DAY_NAMES[
                        hour.dayOfWeek
                      ]
                    }
                  </Text>

                  <Text
                    style={[
                      styles.dayStatus,

                      hour.isOpen &&
                      styles.dayStatusOpen,
                    ]}
                  >
                    {hour.isOpen
                      ? 'Abierto'
                      : 'Cerrado'}
                  </Text>
                </View>

                <Switch
                  value={
                    hour.isOpen
                  }
                  disabled={
                    isSaving
                  }
                  onValueChange={
                    (value) =>
                      updateHour(
                        hour.dayOfWeek,
                        {
                          isOpen:
                            value,
                        },
                      )
                  }
                />
              </View>

              {hour.isOpen && (
                <>
                  <View
                    style={
                      styles.timeRow
                    }
                  >
                    <View
                      style={
                        styles.timeField
                      }
                    >
                      <Text
                        style={
                          styles.timeLabel
                        }
                      >
                        ABRE
                      </Text>

                      <TextInput
                        value={
                          hour.openTime
                        }
                        onChangeText={
                          (value) =>
                            updateHour(
                              hour.dayOfWeek,
                              {
                                openTime:
                                  sanitizeTime(
                                    value,
                                  ),
                              },
                            )
                        }
                        editable={
                          !isSaving
                        }
                        maxLength={
                          5
                        }
                        keyboardType="number-pad"
                        placeholder="17:00"
                        placeholderTextColor="#666666"
                        style={
                          styles.timeInput
                        }
                      />
                    </View>

                    <Text
                      style={
                        styles.arrow
                      }
                    >
                      →
                    </Text>

                    <View
                      style={
                        styles.timeField
                      }
                    >
                      <Text
                        style={
                          styles.timeLabel
                        }
                      >
                        CIERRA
                      </Text>

                      <TextInput
                        value={
                          hour.closeTime
                        }
                        onChangeText={
                          (value) =>
                            updateHour(
                              hour.dayOfWeek,
                              {
                                closeTime:
                                  sanitizeTime(
                                    value,
                                  ),
                              },
                            )
                        }
                        editable={
                          !isSaving
                        }
                        maxLength={
                          5
                        }
                        keyboardType="number-pad"
                        placeholder="23:00"
                        placeholderTextColor="#666666"
                        style={
                          styles.timeInput
                        }
                      />
                    </View>
                  </View>

                  <Text
                    style={
                      styles.hint
                    }
                  >
                    Formato 24 horas. También soporta cierres después de medianoche, por ejemplo 18:00 → 02:00.
                  </Text>
                </>
              )}
            </View>
          ),
        )}

        <TouchableOpacity
          style={[
            styles.saveButton,

            isSaving &&
            styles.saveButtonDisabled,
          ]}
          disabled={
            isSaving
          }
          onPress={() => {
            void handleSave();
          }}
        >
          {isSaving ? (
            <ActivityIndicator
              size="small"
              color="#171717"
            />
          ) : (
            <Text
              style={
                styles.saveButtonText
              }
            >
              Guardar configuración
            </Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

function sanitizeTime(
  value: string,
): string {
  const digits =
    value.replace(
      /\D/g,
      '',
    );

  if (
    digits.length <= 2
  ) {
    return digits;
  }

  return `${digits.slice(
    0,
    2,
  )}:${digits.slice(
    2,
    4,
  )}`;
}