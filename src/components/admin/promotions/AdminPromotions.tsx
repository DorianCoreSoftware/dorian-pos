import React, {
  useEffect,
  useMemo,
  useState,
} from 'react';

import {
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import {
  getPromotionSettings,
  PromotionSettings,
  updatePromotionSettings,
} from '../../../services/promotionService';

import {
  getAvailableSauces,
  getWeeklySauceSettings,
  SauceOption,
  saveWeeklySauceSettings,
} from '../../../services/weeklySauceService';

import {
  useBusiness,
} from '../../../context/BusinessContext';

import {
  DateCalendarSelect,
} from '../business-hours/AdminBusinessHoursSelectors';

import {
  styles,
} from './AdminPromotions.styles';

function formatLocalDate(
  date: Date,
): string {
  const year =
    date.getFullYear();

  const month =
    String(
      date.getMonth() + 1,
    ).padStart(
      2,
      '0',
    );

  const day =
    String(
      date.getDate(),
    ).padStart(
      2,
      '0',
    );

  return `${year}-${month}-${day}`;
}

function getDefaultWeeklySauceDates() {
  const start =
    new Date();

  const end =
    new Date(start);

  end.setDate(
    end.getDate() + 6,
  );

  return {
    startsAt:
      formatLocalDate(
        start,
      ),

    endsAt:
      formatLocalDate(
        end,
      ),
  };
}

function isValidDateInput(
  value: string,
): boolean {
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(
      value,
    )
  ) {
    return false;
  }

  const [
    year,
    month,
    day,
  ] =
    value
      .split('-')
      .map(Number);

  const date =
    new Date(
      year,
      month - 1,
      day,
    );

  return (
    date.getFullYear() ===
      year &&
    date.getMonth() ===
      month - 1 &&
    date.getDate() ===
      day
  );
}

export function AdminPromotions() {
  const {
    business,
    theme,
  } =
    useBusiness();

  const promotionsEnabled =
    business?.features
      .promotionsEnabled ??
    false;

  const currencyCode =
    business?.identity
      .currencyCode ??
    'MXN';

  const defaultDates =
    useMemo(
      () =>
        getDefaultWeeklySauceDates(),
      [],
    );

  const [
    settings,
    setSettings,
  ] =
    useState<
      PromotionSettings | null
    >(null);

  const [
    kongEnabled,
    setKongEnabled,
  ] =
    useState(true);

  const [
    requiredKongs,
    setRequiredKongs,
  ] =
    useState('5');

  const [
    luckyDorianEnabled,
    setLuckyDorianEnabled,
  ] =
    useState(true);

  const [
    luckyDorianChance,
    setLuckyDorianChance,
  ] =
    useState('100');

  const [
    weeklySauceSettingsId,
    setWeeklySauceSettingsId,
  ] =
    useState<
      string | null
    >(null);

  const [
    weeklySauceEnabled,
    setWeeklySauceEnabled,
  ] =
    useState(false);

  const [
    weeklySauceModifierId,
    setWeeklySauceModifierId,
  ] =
    useState<
      string | null
    >(null);

  const [
    weeklySauceDiscount,
    setWeeklySauceDiscount,
  ] =
    useState('5.00');

  const [
    weeklySauceStartsAt,
    setWeeklySauceStartsAt,
  ] =
    useState(
      defaultDates.startsAt,
    );

  const [
    weeklySauceEndsAt,
    setWeeklySauceEndsAt,
  ] =
    useState(
      defaultDates.endsAt,
    );

  const [
    sauces,
    setSauces,
  ] =
    useState<
      SauceOption[]
    >([]);

  const [
    sauceSelectorVisible,
    setSauceSelectorVisible,
  ] =
    useState(false);

  const [
    isLoading,
    setIsLoading,
  ] =
    useState(true);

  const [
    isSaving,
    setIsSaving,
  ] =
    useState(false);

  const [
    errorMessage,
    setErrorMessage,
  ] =
    useState<
      string | null
    >(null);

  const selectedSauce =
    useMemo(
      () =>
        sauces.find(
          sauce =>
            sauce.id ===
            weeklySauceModifierId,
        ) ?? null,
      [
        sauces,
        weeklySauceModifierId,
      ],
    );

  useEffect(() => {
    if (
      !promotionsEnabled
    ) {
      setIsLoading(
        false,
      );

      setErrorMessage(
        null,
      );

      setSauceSelectorVisible(
        false,
      );

      return;
    }

    const loadSettings =
      async (): Promise<void> => {
        try {
          setIsLoading(
            true,
          );

          setErrorMessage(
            null,
          );

          const [
            promotionData,
            weeklySauceData,
            sauceOptions,
          ] =
            await Promise.all([
              getPromotionSettings(),
              getWeeklySauceSettings(),
              getAvailableSauces(),
            ]);

          setSettings(
            promotionData,
          );

          setKongEnabled(
            promotionData
              .kong_enabled,
          );

          setRequiredKongs(
            String(
              promotionData
                .required_kongs,
            ),
          );

          setLuckyDorianEnabled(
            promotionData
              .lucky_dorian_enabled,
          );

          setLuckyDorianChance(
            String(
              promotionData
                .lucky_dorian_chance,
            ),
          );

          setSauces(
            sauceOptions,
          );

          if (
            weeklySauceData
          ) {
            setWeeklySauceSettingsId(
              weeklySauceData.id,
            );

            setWeeklySauceEnabled(
              weeklySauceData
                .is_enabled,
            );

            setWeeklySauceModifierId(
              weeklySauceData
                .modifier_id,
            );

            setWeeklySauceDiscount(
              Number(
                weeklySauceData
                  .discount_amount ??
                5,
              ).toFixed(
                2,
              ),
            );

            setWeeklySauceStartsAt(
              weeklySauceData
                .starts_at ??
              defaultDates
                .startsAt,
            );

            setWeeklySauceEndsAt(
              weeklySauceData
                .ends_at ??
              defaultDates
                .endsAt,
            );
          }
        } catch (error) {
          console.error(
            'Error loading promotion settings:',
            error,
          );

          setErrorMessage(
            error instanceof Error
              ? error.message
              : 'No se pudo cargar la configuración de promociones.',
          );
        } finally {
          setIsLoading(
            false,
          );
        }
      };

    void loadSettings();
  }, [
    defaultDates.endsAt,
    defaultDates.startsAt,
    promotionsEnabled,
  ]);

  const handleSave =
    async (): Promise<void> => {
      if (
        !promotionsEnabled ||
        !settings
      ) {
        return;
      }

      const parsedRequiredKongs =
        Number(
          requiredKongs,
        );

      const parsedDorianChance =
        Number(
          luckyDorianChance,
        );

      const parsedWeeklySauceDiscount =
        Number(
          weeklySauceDiscount,
        );

      if (
        !Number.isInteger(
          parsedRequiredKongs,
        ) ||
        parsedRequiredKongs <
          1
      ) {
        Alert.alert(
          'Dato inválido',
          'La cantidad de Kongs requeridos debe ser un número entero mayor a 0.',
        );

        return;
      }

      if (
        luckyDorianEnabled &&
        (
          !Number.isInteger(
            parsedDorianChance,
          ) ||
          parsedDorianChance <
            1 ||
          parsedDorianChance >
            100
        )
      ) {
        Alert.alert(
          'Dato inválido',
          'Dorian debe usar un valor entero entre 1 y 100. Ejemplo: 1 = siempre, 10 = 1 de cada 10 ventas, 100 = 1 de cada 100 ventas.',
        );

        return;
      }

      if (
        weeklySauceEnabled &&
        !weeklySauceModifierId
      ) {
        Alert.alert(
          'Salsa requerida',
          'Selecciona la Salsa de la Semana.',
        );

        return;
      }

      if (
        !Number.isFinite(
          parsedWeeklySauceDiscount,
        ) ||
        parsedWeeklySauceDiscount <
          0
      ) {
        Alert.alert(
          'Descuento inválido',
          'El descuento de la Salsa de la Semana debe ser mayor o igual a 0.',
        );

        return;
      }

      if (
        weeklySauceEnabled &&
        !isValidDateInput(
          weeklySauceStartsAt,
        )
      ) {
        Alert.alert(
          'Fecha inválida',
          'La fecha de inicio debe tener el formato AAAA-MM-DD.',
        );

        return;
      }

      if (
        weeklySauceEnabled &&
        !isValidDateInput(
          weeklySauceEndsAt,
        )
      ) {
        Alert.alert(
          'Fecha inválida',
          'La fecha de fin debe tener el formato AAAA-MM-DD.',
        );

        return;
      }

      if (
        weeklySauceEnabled &&
        weeklySauceEndsAt <
          weeklySauceStartsAt
      ) {
        Alert.alert(
          'Vigencia inválida',
          'La fecha de fin no puede ser anterior a la fecha de inicio.',
        );

        return;
      }

      try {
        setIsSaving(
          true,
        );

        await updatePromotionSettings(
          settings.id,
          {
            kong_enabled:
              kongEnabled,

            required_kongs:
              parsedRequiredKongs,

            lucky_dorian_enabled:
              luckyDorianEnabled,

            lucky_dorian_chance:
              parsedDorianChance,
          },
        );

        const weeklySauceId =
          await saveWeeklySauceSettings(
            weeklySauceSettingsId,
            {
              modifier_id:
                weeklySauceModifierId,

              discount_amount:
                parsedWeeklySauceDiscount,

              is_enabled:
                weeklySauceEnabled,

              starts_at:
                weeklySauceStartsAt ||
                null,

              ends_at:
                weeklySauceEndsAt ||
                null,
            },
          );

        setWeeklySauceSettingsId(
          weeklySauceId,
        );

        setSettings({
          ...settings,

          kong_enabled:
            kongEnabled,

          required_kongs:
            parsedRequiredKongs,

          lucky_dorian_enabled:
            luckyDorianEnabled,

          lucky_dorian_chance:
            parsedDorianChance,
        });

        Alert.alert(
          'Promociones',
          'La configuración se guardó correctamente.',
        );
      } catch (error) {
        console.error(
          'Error saving promotion settings:',
          error,
        );

        Alert.alert(
          'Error',
          error instanceof Error
            ? error.message
            : 'No se pudo guardar la configuración de promociones.',
        );
      } finally {
        setIsSaving(
          false,
        );
      }
    };

  if (
    !promotionsEnabled
  ) {
    return (
      <View
        style={[
          styles.errorContainer,
          {
            backgroundColor:
              theme.background,
          },
        ]}
      >
        <Text
          style={{
            fontSize:
              46,

            marginBottom:
              12,
          }}
        >
          🎟️
        </Text>

        <Text
          style={[
            styles.title,
            {
              color:
                theme.text,

              textAlign:
                'center',
            },
          ]}
        >
          Promociones deshabilitadas
        </Text>

        <Text
          style={[
            styles.errorText,
            {
              color:
                theme.textMuted,

              marginTop:
                8,

              maxWidth:
                420,
            },
          ]}
        >
          Este negocio no tiene
          habilitado el módulo de
          promociones.
        </Text>
      </View>
    );
  }

  if (
    isLoading
  ) {
    return (
      <View
        style={[
          styles.loadingContainer,
          {
            backgroundColor:
              theme.background,
          },
        ]}
      >
        <ActivityIndicator
          size="large"
          color={
            theme.primary
          }
        />

        <Text
          style={[
            styles.loadingText,
            {
              color:
                theme.textMuted,
            },
          ]}
        >
          Cargando promociones...
        </Text>
      </View>
    );
  }

  if (
    errorMessage ||
    !settings
  ) {
    return (
      <View
        style={[
          styles.errorContainer,
          {
            backgroundColor:
              theme.background,
          },
        ]}
      >
        <Text
          style={[
            styles.errorTitle,
            {
              color:
                theme.danger,
            },
          ]}
        >
          No se pudieron cargar
          las promociones
        </Text>

        <Text
          style={[
            styles.errorText,
            {
              color:
                theme.textMuted,
            },
          ]}
        >
          {errorMessage ??
            'No existe una configuración activa.'}
        </Text>
      </View>
    );
  }

  return (
    <>
      <ScrollView
        style={[
          styles.container,
          {
            backgroundColor:
              theme.background,
          },
        ]}
        contentContainerStyle={
          styles.scrollContent
        }
        showsVerticalScrollIndicator
        keyboardShouldPersistTaps="handled"
      >
        <View
          style={
            styles.header
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
            Promociones
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
            Activa, desactiva y configura
            las promociones del punto de venta.
          </Text>
        </View>

        {/* KONGS */}
        <View
          style={[
            styles.card,
            {
              backgroundColor:
                theme.surface,

              borderColor:
                theme.border,
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
                styles.cardHeaderText
              }
            >
              <Text
                style={[
                  styles.cardTitle,
                  {
                    color:
                      theme.text,
                  },
                ]}
              >
                Kongs
              </Text>

              <Text
                style={[
                  styles.cardDescription,
                  {
                    color:
                      theme.textMuted,
                  },
                ]}
              >
                Controla la acumulación y canje
                de cupones Kong.
              </Text>
            </View>

            <Switch
              value={
                kongEnabled
              }
              onValueChange={
                setKongEnabled
              }
              trackColor={{
                false:
                  theme.border,

                true:
                  theme.primary,
              }}
              thumbColor={
                kongEnabled
                  ? theme.onPrimary
                  : theme.textMuted
              }
            />
          </View>

          <View
            style={[
              styles.fieldContainer,
              {
                borderTopColor:
                  theme.border,
              },
            ]}
          >
            <Text
              style={[
                styles.fieldLabel,
                {
                  color:
                    theme.text,
                },
              ]}
            >
              Kongs necesarios para premio
            </Text>

            <TextInput
              value={
                requiredKongs
              }
              onChangeText={
                setRequiredKongs
              }
              keyboardType="number-pad"
              editable={
                kongEnabled
              }
              maxLength={2}
              style={[
                styles.input,
                {
                  borderColor:
                    theme.border,

                  backgroundColor:
                    theme.surfaceAlt,

                  color:
                    theme.text,
                },

                !kongEnabled &&
                styles.inputDisabled,
              ]}
            />

            <Text
              style={[
                styles.fieldHelp,
                {
                  color:
                    theme.textMuted,
                },
              ]}
            >
              Actualmente el cliente necesita
              {` ${requiredKongs || '0'} `}
              cupones Kong para completar la promoción.
            </Text>
          </View>
        </View>

        {/* DORIAN */}
        <View
          style={[
            styles.card,
            {
              backgroundColor:
                theme.surface,

              borderColor:
                theme.border,
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
                styles.cardHeaderText
              }
            >
              <Text
                style={[
                  styles.cardTitle,
                  {
                    color:
                      theme.text,
                  },
                ]}
              >
                Dorian de la Suerte
              </Text>

              <Text
                style={[
                  styles.cardDescription,
                  {
                    color:
                      theme.textMuted,
                  },
                ]}
              >
                Controla si las ventas pueden
                generar un Dorian de la Suerte.
              </Text>
            </View>

            <Switch
              value={
                luckyDorianEnabled
              }
              onValueChange={
                setLuckyDorianEnabled
              }
              trackColor={{
                false:
                  theme.border,

                true:
                  theme.primary,
              }}
              thumbColor={
                luckyDorianEnabled
                  ? theme.onPrimary
                  : theme.textMuted
              }
            />
          </View>

          <View
            style={[
              styles.fieldContainer,
              {
                borderTopColor:
                  theme.border,
              },
            ]}
          >
            <Text
              style={[
                styles.fieldLabel,
                {
                  color:
                    theme.text,
                },
              ]}
            >
              1 oportunidad entre
            </Text>

            <View
              style={
                styles.inlineFieldRow
              }
            >
              <TextInput
                value={
                  luckyDorianChance
                }
                onChangeText={
                  setLuckyDorianChance
                }
                keyboardType="number-pad"
                editable={
                  luckyDorianEnabled
                }
                maxLength={3}
                style={[
                  styles.input,
                  styles.compactInput,
                  {
                    borderColor:
                      theme.border,

                    backgroundColor:
                      theme.surfaceAlt,

                    color:
                      theme.text,
                  },

                  !luckyDorianEnabled &&
                  styles.inputDisabled,
                ]}
              />

              <Text
                style={[
                  styles.inlineSuffix,
                  {
                    color:
                      theme.primary,
                  },
                ]}
              >
                ventas
              </Text>
            </View>

            <Text
              style={[
                styles.fieldHelp,
                {
                  color:
                    theme.textMuted,
                },
              ]}
            >
              1 = 100%, 2 = 50%, 10 = 10% y
              100 = 1% de probabilidad.
            </Text>
          </View>
        </View>

        {/* SALSA DE LA SEMANA */}
        <View
          style={[
            styles.card,
            {
              backgroundColor:
                theme.surface,

              borderColor:
                theme.border,
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
                styles.cardHeaderText
              }
            >
              <Text
                style={[
                  styles.cardTitle,
                  {
                    color:
                      theme.text,
                  },
                ]}
              >
                🌶️ Salsa de la Semana
              </Text>

              <Text
                style={[
                  styles.cardDescription,
                  {
                    color:
                      theme.textMuted,
                  },
                ]}
              >
                Destaca una salsa de baja rotación
                y ofrece un descuento cuando el
                cliente la elija.
              </Text>
            </View>

            <Switch
              value={
                weeklySauceEnabled
              }
              onValueChange={
                setWeeklySauceEnabled
              }
              trackColor={{
                false:
                  theme.border,

                true:
                  theme.primary,
              }}
              thumbColor={
                weeklySauceEnabled
                  ? theme.onPrimary
                  : theme.textMuted
              }
            />
          </View>

          <View
            style={[
              styles.fieldContainer,
              {
                borderTopColor:
                  theme.border,
              },
            ]}
          >
            <Text
              style={[
                styles.fieldLabel,
                {
                  color:
                    theme.text,
                },
              ]}
            >
              Salsa
            </Text>

            <TouchableOpacity
              style={[
                styles.selector,
                {
                  borderColor:
                    theme.border,

                  backgroundColor:
                    theme.surfaceAlt,
                },

                !weeklySauceEnabled &&
                styles.inputDisabled,
              ]}
              disabled={
                !weeklySauceEnabled
              }
              onPress={() =>
                setSauceSelectorVisible(
                  true,
                )
              }
            >
              <Text
                style={[
                  styles.selectorText,
                  {
                    color:
                      theme.text,
                  },

                  !selectedSauce &&
                  styles.selectorPlaceholder,
                ]}
              >
                {selectedSauce?.name ??
                  'Seleccionar salsa'}
              </Text>

              <Text
                style={[
                  styles.selectorArrow,
                  {
                    color:
                      theme.primary,
                  },
                ]}
              >
                ▼
              </Text>
            </TouchableOpacity>

            <Text
              style={[
                styles.fieldHelp,
                {
                  color:
                    theme.textMuted,
                },
              ]}
            >
              Solo se muestran salsas disponibles
              del catálogo.
            </Text>
          </View>

          <View
            style={[
              styles.fieldContainer,
              {
                borderTopColor:
                  theme.border,
              },
            ]}
          >
            <Text
              style={[
                styles.fieldLabel,
                {
                  color:
                    theme.text,
                },
              ]}
            >
              Descuento
            </Text>

            <View
              style={
                styles.inlineFieldRow
              }
            >
              <Text
                style={[
                  styles.currencySymbol,
                  {
                    color:
                      theme.primary,
                  },
                ]}
              >
                $
              </Text>

              <TextInput
                value={
                  weeklySauceDiscount
                }
                onChangeText={
                  value =>
                    setWeeklySauceDiscount(
                      value.replace(
                        ',',
                        '.',
                      ),
                    )
                }
                keyboardType="decimal-pad"
                editable={
                  weeklySauceEnabled
                }
                style={[
                  styles.input,
                  styles.discountInput,
                  {
                    borderColor:
                      theme.border,

                    backgroundColor:
                      theme.surfaceAlt,

                    color:
                      theme.text,
                  },

                  !weeklySauceEnabled &&
                  styles.inputDisabled,
                ]}
              />

              <Text
                style={[
                  styles.inlineSuffix,
                  {
                    color:
                      theme.primary,
                  },
                ]}
              >
                {currencyCode}
              </Text>
            </View>

            <Text
              style={[
                styles.fieldHelp,
                {
                  color:
                    theme.textMuted,
                },
              ]}
            >
              Este descuento se aplicará una sola
              vez por producto elegible.
            </Text>
          </View>

          <View
            style={[
              styles.fieldContainer,
              {
                borderTopColor:
                  theme.border,
              },
            ]}
          >
            <Text
              style={[
                styles.fieldLabel,
                {
                  color:
                    theme.text,
                },
              ]}
            >
              Vigencia
            </Text>

            <View
              style={
                styles.dateRow
              }
            >
              <View
                style={
                  styles.dateField
                }
              >
                <Text
                  style={[
                    styles.dateLabel,
                    {
                      color:
                        theme.textMuted,
                    },
                  ]}
                >
                  Inicio
                </Text>

                <DateCalendarSelect
                  value={
                    weeklySauceStartsAt
                  }
                  disabled={
                    !weeklySauceEnabled
                  }
                  onChange={
                    setWeeklySauceStartsAt
                  }
                />
              </View>

              <View
                style={
                  styles.dateField
                }
              >
                <Text
                  style={[
                    styles.dateLabel,
                    {
                      color:
                        theme.textMuted,
                    },
                  ]}
                >
                  Fin
                </Text>

                <DateCalendarSelect
                  value={
                    weeklySauceEndsAt
                  }
                  disabled={
                    !weeklySauceEnabled
                  }
                  onChange={
                    setWeeklySauceEndsAt
                  }
                />
              </View>
            </View>
          </View>

          {weeklySauceEnabled &&
            selectedSauce && (
              <View
                style={[
                  styles.weeklySaucePreview,
                  {
                    borderColor:
                      theme.primary,

                    backgroundColor:
                      theme.surfaceAlt,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.weeklySaucePreviewTitle,
                    {
                      color:
                        theme.primary,
                    },
                  ]}
                >
                  🌶️ {selectedSauce.name}
                </Text>

                <Text
                  style={[
                    styles.weeklySaucePreviewText,
                    {
                      color:
                        theme.textMuted,
                    },
                  ]}
                >
                  El cliente recibe $
                  {Number(
                    weeklySauceDiscount ||
                    0,
                  ).toFixed(
                    2,
                  )}{' '}
                  de descuento al elegir esta salsa.
                </Text>
              </View>
            )}
        </View>

        <TouchableOpacity
          style={[
            styles.saveButton,
            {
              backgroundColor:
                theme.primary,
            },

            isSaving &&
            styles.saveButtonDisabled,
          ]}
          disabled={
            isSaving
          }
          onPress={
            handleSave
          }
        >
          <Text
            style={[
              styles.saveButtonText,
              {
                color:
                  theme.onPrimary,
              },
            ]}
          >
            {isSaving
              ? 'GUARDANDO...'
              : 'GUARDAR CONFIGURACIÓN'}
          </Text>
        </TouchableOpacity>
      </ScrollView>

      <Modal
        visible={
          sauceSelectorVisible
        }
        transparent
        animationType="fade"
        onRequestClose={() =>
          setSauceSelectorVisible(
            false,
          )
        }
      >
        <View
          style={
            styles.modalBackdrop
          }
        >
          <View
            style={[
              styles.modalCard,
              {
                borderColor:
                  theme.border,

                backgroundColor:
                  theme.surface,
              },
            ]}
          >
            <View
              style={[
                styles.modalHeader,
                {
                  borderBottomColor:
                    theme.border,
                },
              ]}
            >
              <View
                style={
                  styles.modalHeaderText
                }
              >
                <Text
                  style={[
                    styles.modalTitle,
                    {
                      color:
                        theme.text,
                    },
                  ]}
                >
                  Seleccionar salsa
                </Text>

                <Text
                  style={[
                    styles.modalSubtitle,
                    {
                      color:
                        theme.textMuted,
                    },
                  ]}
                >
                  Elige la salsa que tendrá
                  descuento esta semana.
                </Text>
              </View>

              <TouchableOpacity
                style={[
                  styles.modalCloseButton,
                  {
                    backgroundColor:
                      theme.surfaceAlt,
                  },
                ]}
                onPress={() =>
                  setSauceSelectorVisible(
                    false,
                  )
                }
              >
                <Text
                  style={[
                    styles.modalCloseText,
                    {
                      color:
                        theme.text,
                    },
                  ]}
                >
                  ✕
                </Text>
              </TouchableOpacity>
            </View>

            <ScrollView
              style={
                styles.sauceList
              }
              contentContainerStyle={
                styles.sauceListContent
              }
              keyboardShouldPersistTaps="handled"
            >
              {sauces.map(
                sauce => {
                  const selected =
                    sauce.id ===
                    weeklySauceModifierId;

                  return (
                    <TouchableOpacity
                      key={
                        sauce.id
                      }
                      style={[
                        styles.sauceOption,
                        {
                          borderColor:
                            selected
                              ? theme.primary
                              : theme.border,

                          backgroundColor:
                            selected
                              ? theme.surfaceAlt
                              : theme.surfaceAlt,
                        },
                      ]}
                      onPress={() => {
                        setWeeklySauceModifierId(
                          sauce.id,
                        );

                        setSauceSelectorVisible(
                          false,
                        );
                      }}
                    >
                      <Text
                        style={[
                          styles.sauceOptionText,
                          {
                            color:
                              selected
                                ? theme.primary
                                : theme.text,
                          },
                        ]}
                      >
                        {sauce.name}
                      </Text>

                      {selected && (
                        <Text
                          style={[
                            styles.sauceOptionCheck,
                            {
                              color:
                                theme.primary,
                            },
                          ]}
                        >
                          ✓
                        </Text>
                      )}
                    </TouchableOpacity>
                  );
                },
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </>
  );
}
