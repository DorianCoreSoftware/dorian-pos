import React, {
  useEffect,
  useState,
} from 'react';

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

import {
  BusinessHour,
  BusinessHourException,
  deleteBusinessHourException,
  getBusinessHourExceptions,
  getBusinessHours,
  getBusinessSettings,
  saveBusinessHourException,
  saveBusinessHours,
  saveWebOrderSettings,
  WebOrderSettings,
} from '../../../services/businessHoursService';


import {
  styles,
} from './AdminBusinessHours.styles';
import { DateCalendarSelect, TimeSelect } from './AdminBusinessHoursSelectors';

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

interface ExceptionForm {
  id:
    | string
    | null;
  exceptionDate: string;
  isOpen: boolean;
  openTime: string;
  closeTime: string;
  reason: string;
}

const EMPTY_EXCEPTION_FORM:
  ExceptionForm = {
    id:
      null,
    exceptionDate:
      '',
    isOpen:
      false,
    openTime:
      '17:00',
    closeTime:
      '23:00',
    reason:
      '',
  };

export function AdminBusinessHours() {
  const [
    hours,
    setHours,
  ] = useState<
    BusinessHour[]
  >([]);

  const [
    timezone,
    setTimezone,
  ] = useState(
    'America/Mexico_City',
  );

  const [
    webOrderSettings,
    setWebOrderSettings,
  ] = useState<
    WebOrderSettings
  >({
    webOrdersEnabled:
      true,

    webOrdersPauseMessage:
      DEFAULT_PAUSE_MESSAGE,
  });

  const [
    exceptions,
    setExceptions,
  ] = useState<
    BusinessHourException[]
  >([]);

  const [
    exceptionForm,
    setExceptionForm,
  ] = useState<
    ExceptionForm
  >(
    EMPTY_EXCEPTION_FORM,
  );

  const [
    isLoading,
    setIsLoading,
  ] = useState(
    true,
  );

  const [
    isSaving,
    setIsSaving,
  ] = useState(
    false,
  );

  const [
    isSavingException,
    setIsSavingException,
  ] = useState(
    false,
  );

  const [
    error,
    setError,
  ] = useState<
    string | null
  >(null);

  useEffect(
    () => {
      void loadData();
    },
    [],
  );

  async function loadData():
    Promise<void> {
    try {
      setIsLoading(
        true,
      );

      setError(
        null,
      );

      const [
        loadedHours,
        loadedSettings,
        loadedExceptions,
      ] = await Promise.all([
        getBusinessHours(),
        getBusinessSettings(),
        getBusinessHourExceptions(),
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

      setExceptions(
        loadedExceptions,
      );
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : 'No se pudo cargar la configuración.',
      );
    } finally {
      setIsLoading(
        false,
      );
    }
  }

  function updateHour(
    dayOfWeek: number,
    changes:
      Partial<BusinessHour>,
  ): void {
    setHours(
      (current) =>
        current.map(
          (hour) =>
            hour.dayOfWeek ===
            dayOfWeek
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
    if (isSaving) {
      return;
    }

    try {
      setIsSaving(
        true,
      );

      setError(
        null,
      );

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
      setIsSaving(
        false,
      );
    }
  }

  async function handleSaveException():
    Promise<void> {
    if (
      isSavingException
    ) {
      return;
    }

    try {
      setIsSavingException(
        true,
      );

      await saveBusinessHourException({
        id:
          exceptionForm.id ??
          undefined,

        exceptionDate:
          exceptionForm.exceptionDate,

        isOpen:
          exceptionForm.isOpen,

        openTime:
          exceptionForm.openTime,

        closeTime:
          exceptionForm.closeTime,

        reason:
          exceptionForm.reason,
      });

      const loadedExceptions =
        await getBusinessHourExceptions();

      setExceptions(
        loadedExceptions,
      );

      setExceptionForm(
        EMPTY_EXCEPTION_FORM,
      );

      Alert.alert(
        'Excepción guardada',
        'La excepción de horario se guardó correctamente.',
      );
    } catch (e) {
      Alert.alert(
        'Error',
        e instanceof Error
          ? e.message
          : 'No se pudo guardar la excepción.',
      );
    } finally {
      setIsSavingException(
        false,
      );
    }
  }

  function handleEditException(
    exception:
      BusinessHourException,
  ): void {
    setExceptionForm({
      id:
        exception.id,

      exceptionDate:
        exception.exceptionDate,

      isOpen:
        exception.isOpen,

      openTime:
        exception.openTime,

      closeTime:
        exception.closeTime,

      reason:
        exception.reason,
    });
  }

  function handleDeleteException(
    exception:
      BusinessHourException,
  ): void {
    Alert.alert(
      'Eliminar excepción',
      `¿Eliminar la excepción del ${formatDate(
        exception.exceptionDate,
      )}?`,
      [
        {
          text:
            'Cancelar',

          style:
            'cancel',
        },

        {
          text:
            'Eliminar',

          style:
            'destructive',

          onPress:
            () => {
              void confirmDeleteException(
                exception.id,
              );
            },
        },
      ],
    );
  }

  async function confirmDeleteException(
    id: string,
  ): Promise<void> {
    try {
      await deleteBusinessHourException(
        id,
      );

      setExceptions(
        (current) =>
          current.filter(
            (exception) =>
              exception.id !==
              id,
          ),
      );

      if (
        exceptionForm.id ===
        id
      ) {
        setExceptionForm(
          EMPTY_EXCEPTION_FORM,
        );
      }
    } catch (e) {
      Alert.alert(
        'Error',
        e instanceof Error
          ? e.message
          : 'No se pudo eliminar la excepción.',
      );
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
          Configura el horario semanal, pausas y días especiales.
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
            Pausa temporalmente los pedidos web sin modificar horarios.
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

        <Text
          style={
            styles.groupTitle
          }
        >
          HORARIO SEMANAL
        </Text>

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

                      <TimeSelect
                        value={
                          hour.openTime
                        }
                        disabled={
                          isSaving
                        }
                        onChange={
                          (value) =>
                            updateHour(
                              hour.dayOfWeek,
                              {
                                openTime:
                                  value,
                              },
                            )
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

                      <TimeSelect
                        value={
                          hour.closeTime
                        }
                        disabled={
                          isSaving
                        }
                        onChange={
                          (value) =>
                            updateHour(
                              hour.dayOfWeek,
                              {
                                closeTime:
                                  value,
                              },
                            )
                        }
                      />
                    </View>
                  </View>

                  <Text
                    style={
                      styles.hint
                    }
                  >
                    Formato 24 horas. Soporta cierres después de medianoche.
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

        <View
          style={
            styles.divider
          }
        />

        <Text
          style={
            styles.groupTitle
          }
        >
          EXCEPCIONES POR FECHA
        </Text>

        <Text
          style={
            styles.groupDescription
          }
        >
          Una excepción reemplaza únicamente el horario de esa fecha. Sirve para festivos, cierres o horarios especiales.
        </Text>

        <View
          style={
            styles.exceptionFormCard
          }
        >
          <Text
            style={
              styles.exceptionFormTitle
            }
          >
            {exceptionForm.id
              ? 'Editar excepción'
              : 'Nueva excepción'}
          </Text>

          <Text
            style={
              styles.exceptionLabel
            }
          >
            FECHA
          </Text>

          <DateCalendarSelect
            value={
              exceptionForm.exceptionDate
            }
            disabled={
              isSavingException
            }
            onChange={
              (value) =>
                setExceptionForm(
                  (current) => ({
                    ...current,
                    exceptionDate:
                      value,
                  }),
                )
            }
          />

          <View
            style={
              styles.exceptionOpenRow
            }
          >
            <View>
              <Text
                style={
                  styles.exceptionLabel
                }
              >
                OPERACIÓN ESE DÍA
              </Text>

              <Text
                style={
                  styles.exceptionOpenStatus
                }
              >
                {exceptionForm.isOpen
                  ? 'Horario especial'
                  : 'Cerrado todo el día'}
              </Text>
            </View>

            <Switch
              value={
                exceptionForm.isOpen
              }
              disabled={
                isSavingException
              }
              onValueChange={
                (value) =>
                  setExceptionForm(
                    (current) => ({
                      ...current,
                      isOpen:
                        value,
                    }),
                  )
              }
            />
          </View>

          {exceptionForm.isOpen && (
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

                <TimeSelect
                  value={
                    exceptionForm.openTime
                  }
                  disabled={
                    isSavingException
                  }
                  onChange={
                    (value) =>
                      setExceptionForm(
                        (current) => ({
                          ...current,
                          openTime:
                            value,
                        }),
                      )
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

                <TimeSelect
                  value={
                    exceptionForm.closeTime
                  }
                  disabled={
                    isSavingException
                  }
                  onChange={
                    (value) =>
                      setExceptionForm(
                        (current) => ({
                          ...current,
                          closeTime:
                            value,
                        }),
                      )
                  }
                />
              </View>
            </View>
          )}

          <Text
            style={[
              styles.exceptionLabel,
              styles.exceptionReasonLabel,
            ]}
          >
            MOTIVO / MENSAJE OPCIONAL
          </Text>

          <TextInput
            value={
              exceptionForm.reason
            }
            onChangeText={
              (value) =>
                setExceptionForm(
                  (current) => ({
                    ...current,
                    reason:
                      value,
                  }),
                )
            }
            editable={
              !isSavingException
            }
            multiline
            maxLength={
              120
            }
            placeholder="Ej. Navidad, evento especial, mantenimiento..."
            placeholderTextColor="#666666"
            style={[
              styles.exceptionInput,
              styles.exceptionReasonInput,
            ]}
          />

          <View
            style={
              styles.exceptionActions
            }
          >
            {exceptionForm.id && (
              <TouchableOpacity
                style={
                  styles.exceptionCancelButton
                }
                disabled={
                  isSavingException
                }
                onPress={() =>
                  setExceptionForm(
                    EMPTY_EXCEPTION_FORM,
                  )
                }
              >
                <Text
                  style={
                    styles.exceptionCancelText
                  }
                >
                  Cancelar edición
                </Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={[
                styles.exceptionSaveButton,

                isSavingException &&
                styles.saveButtonDisabled,
              ]}
              disabled={
                isSavingException
              }
              onPress={() => {
                void handleSaveException();
              }}
            >
              {isSavingException ? (
                <ActivityIndicator
                  size="small"
                  color="#171717"
                />
              ) : (
                <Text
                  style={
                    styles.exceptionSaveText
                  }
                >
                  {exceptionForm.id
                    ? 'Actualizar excepción'
                    : 'Agregar excepción'}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {exceptions.length ===
        0 ? (
          <Text
            style={
              styles.emptyExceptionsText
            }
          >
            No hay excepciones configuradas.
          </Text>
        ) : (
          exceptions.map(
            (exception) => (
              <View
                key={
                  exception.id
                }
                style={
                  styles.exceptionCard
                }
              >
                <View
                  style={
                    styles.exceptionCardTop
                  }
                >
                  <View
                    style={
                      styles.exceptionCardInfo
                    }
                  >
                    <Text
                      style={
                        styles.exceptionDate
                      }
                    >
                      {formatDate(
                        exception.exceptionDate,
                      )}
                    </Text>

                    <Text
                      style={[
                        styles.exceptionStatus,

                        exception.isOpen
                          ? styles.exceptionStatusOpen
                          : styles.exceptionStatusClosed,
                      ]}
                    >
                      {exception.isOpen
                        ? `${exception.openTime} - ${exception.closeTime}`
                        : 'Cerrado'}
                    </Text>

                    {!!exception.reason && (
                      <Text
                        style={
                          styles.exceptionReason
                        }
                      >
                        {
                          exception.reason
                        }
                      </Text>
                    )}
                  </View>

                  <View
                    style={
                      styles.exceptionCardActions
                    }
                  >
                    <TouchableOpacity
                      onPress={() =>
                        handleEditException(
                          exception,
                        )
                      }
                      style={
                        styles.exceptionEditButton
                      }
                    >
                      <Text
                        style={
                          styles.exceptionEditText
                        }
                      >
                        Editar
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      onPress={() =>
                        handleDeleteException(
                          exception,
                        )
                      }
                      style={
                        styles.exceptionDeleteButton
                      }
                    >
                      <Text
                        style={
                          styles.exceptionDeleteText
                        }
                      >
                        Eliminar
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            ),
          )
        )}
      </ScrollView>
    </View>
  );
}


function formatDate(
  value: string,
): string {
  const [
    year,
    month,
    day,
  ] = value.split('-');

  return `${day}/${month}/${year}`;
}
