import React, {
  useEffect,
  useMemo,
  useState,
} from 'react';

import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';

import {
  useBusiness,
} from '../../../context/BusinessContext';

import {
  getPublicEventCatalog,
  PublicEventCatalog,
  PublicEventExtra,
  PublicEventPackage,
} from '../../services/web-events/webEventsService';

import styles from './WebEventsScreen.styles';
import WebEventRequestSection from './WebEventRequestSection';

interface Props {
  onBack: () => void;
}

interface ExtraSelection {
  selected: boolean;
  quantity: number;
}

function formatMoney(
  value: number,
  currencyCode: string,
): string {
  try {
    return new Intl.NumberFormat(
      'es-MX',
      {
        style: 'currency',
        currency: currencyCode,
        minimumFractionDigits: 2,
      },
    ).format(value);
  } catch {
    return `$${value.toFixed(2)}`;
  }
}

function formatDuration(
  minutes: number,
): string {
  if (minutes % 60 === 0) {
    const hours = minutes / 60;
    return `${hours} ${hours === 1 ? 'hora' : 'horas'}`;
  }

  return `${minutes} min`;
}

function addDaysIso(
  days: number,
): string {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  date.setDate(
    date.getDate() + days,
  );

  const year = date.getFullYear();
  const month = String(
    date.getMonth() + 1,
  ).padStart(2, '0');
  const day = String(
    date.getDate(),
  ).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

function isIsoDate(
  value: string,
): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(
    value,
  );
}

export default function WebEventsScreen({
  onBack,
}: Props) {
  const {
    width,
  } = useWindowDimensions();

  const {
    business,
    theme,
  } = useBusiness();

  const isPhone = width < 700;

  const [
    catalog,
    setCatalog,
  ] = useState<PublicEventCatalog | null>(
    null,
  );
  const [
    loading,
    setLoading,
  ] = useState(true);
  const [
    error,
    setError,
  ] = useState<string | null>(null);
  const [
    selectedTypeId,
    setSelectedTypeId,
  ] = useState<string | null>(null);
  const [
    selectedPackageId,
    setSelectedPackageId,
  ] = useState<string | null>(null);
  const [
    guestCount,
    setGuestCount,
  ] = useState(1);
  const [
    guestInput,
    setGuestInput,
  ] = useState('1');
  const [
    eventDate,
    setEventDate,
  ] = useState('');
  const [
    extraSelections,
    setExtraSelections,
  ] = useState<Record<string, ExtraSelection>>({});

  useEffect(() => {
    let mounted = true;

    const load =
      async (): Promise<void> => {
        try {
          setLoading(true);
          setError(null);

          const result =
            await getPublicEventCatalog();

          if (!mounted) {
            return;
          }

          setCatalog(result);
          setGuestCount(
            result.settings.minGuests,
          );
          setGuestInput(
            String(
              result.settings.minGuests,
            ),
          );

          const firstType =
            result.types[0] ?? null;
          setSelectedTypeId(
            firstType?.id ?? null,
          );
        } catch (loadError) {
          if (!mounted) {
            return;
          }

          setError(
            loadError instanceof Error
              ? loadError.message
              : 'No se pudo cargar el cotizador de eventos.',
          );
        } finally {
          if (mounted) {
            setLoading(false);
          }
        }
      };

    void load();

    return () => {
      mounted = false;
    };
  }, []);

  const businessName =
    business?.identity.businessName ??
    'Dorian POS';
  const currencyCode =
    business?.identity.currencyCode ??
    'MXN';

  const packages =
    useMemo(
      () =>
        (catalog?.packages ?? []).filter(
          item =>
            item.eventTypeId ===
            selectedTypeId,
        ),
      [
        catalog?.packages,
        selectedTypeId,
      ],
    );

  const selectedPackage =
    useMemo<PublicEventPackage | null>(
      () =>
        packages.find(
          item =>
            item.id ===
            selectedPackageId,
        ) ?? null,
      [
        packages,
        selectedPackageId,
      ],
    );

  useEffect(() => {
    setSelectedPackageId(
      packages[0]?.id ?? null,
    );
    setExtraSelections({});
  }, [selectedTypeId]);

  useEffect(() => {
    setExtraSelections({});
  }, [selectedPackageId]);

  const availableExtras =
    useMemo<PublicEventExtra[]>(
      () => {
        if (!selectedPackage) {
          return [];
        }

        const allowed =
          new Set(
            selectedPackage.extraIds,
          );

        return (
          catalog?.extras ?? []
        ).filter(
          extra =>
            allowed.has(
              extra.id,
            ),
        );
      },
      [
        catalog?.extras,
        selectedPackage,
      ],
    );

  const additionalGuests =
    selectedPackage
      ? Math.max(
        0,
        guestCount -
        selectedPackage.includedGuests,
      )
      : 0;

  const additionalGuestsTotal =
    selectedPackage
      ? additionalGuests *
        selectedPackage.extraGuestPrice
      : 0;

  const extraBreakdown =
    useMemo(
      () =>
        availableExtras
          .map(
            extra => {
              const selection =
                extraSelections[extra.id];

              if (
                !selection?.selected
              ) {
                return null;
              }

              const quantity =
                extra.pricingType ===
                  'per_guest'
                  ? guestCount
                  : extra.pricingType ===
                    'per_unit'
                    ? Math.max(
                      1,
                      selection.quantity,
                    )
                    : 1;

              return {
                extra,
                quantity,
                subtotal:
                  extra.price * quantity,
              };
            },
          )
          .filter(
            (
              item,
            ): item is {
              extra: PublicEventExtra;
              quantity: number;
              subtotal: number;
            } => !!item,
          ),
      [
        availableExtras,
        extraSelections,
        guestCount,
      ],
    );

  const extrasTotal =
    extraBreakdown.reduce(
      (
        total,
        item,
      ) =>
        total + item.subtotal,
      0,
    );

  const estimatedTotal =
    (selectedPackage?.basePrice ?? 0) +
    additionalGuestsTotal +
    extrasTotal;

  const minimumDate =
    catalog
      ? addDaysIso(
        Math.ceil(
          catalog.settings.minAdvanceHours /
          24,
        ),
      )
      : '';

  const maximumDate =
    catalog
      ? addDaysIso(
        catalog.settings.maxAdvanceDays,
      )
      : '';

  const dateError =
    eventDate &&
    (
      !isIsoDate(eventDate) ||
      (
        minimumDate &&
        eventDate < minimumDate
      ) ||
      (
        maximumDate &&
        eventDate > maximumDate
      )
    );

  function applyGuestCount(
    value: number,
  ): void {
    if (!catalog) {
      return;
    }

    const nextValue =
      Math.min(
        catalog.settings.maxGuests,
        Math.max(
          catalog.settings.minGuests,
          Math.round(value),
        ),
      );

    setGuestCount(nextValue);
    setGuestInput(
      String(nextValue),
    );
  }

  function changeGuests(
    delta: number,
  ): void {
    applyGuestCount(
      guestCount + delta,
    );
  }

  function changeGuestInput(
    value: string,
  ): void {
    const digitsOnly =
      value.replace(
        /[^0-9]/g,
        '',
      );

    setGuestInput(
      digitsOnly,
    );

    if (!digitsOnly || !catalog) {
      return;
    }

    const numericValue =
      Number(digitsOnly);

    if (
      Number.isInteger(
        numericValue,
      ) &&
      numericValue >=
        catalog.settings.minGuests &&
      numericValue <=
        catalog.settings.maxGuests
    ) {
      setGuestCount(
        numericValue,
      );
    }
  }

  function normalizeGuestInput(): void {
    if (!catalog) {
      return;
    }

    const numericValue =
      Number(guestInput);

    applyGuestCount(
      Number.isFinite(
        numericValue,
      ) &&
      guestInput !== ''
        ? numericValue
        : guestCount,
    );
  }

  function toggleExtra(
    extra: PublicEventExtra,
  ): void {
    setExtraSelections(
      current => {
        const previous =
          current[extra.id];

        return {
          ...current,
          [extra.id]: {
            selected:
              !previous?.selected,
            quantity:
              previous?.quantity ?? 1,
          },
        };
      },
    );
  }

  function changeExtraQuantity(
    extraId: string,
    delta: number,
  ): void {
    setExtraSelections(
      current => {
        const previous =
          current[extraId] ?? {
            selected: true,
            quantity: 1,
          };

        return {
          ...current,
          [extraId]: {
            selected: true,
            quantity:
              Math.max(
                1,
                previous.quantity + delta,
              ),
          },
        };
      },
    );
  }

  if (loading) {
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
          color={theme.primary}
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
          Cargando cotizador de eventos...
        </Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={[
        styles.container,
        {
          backgroundColor:
            theme.background,
        },
      ]}
      contentContainerStyle={
        styles.content
      }
      keyboardShouldPersistTaps="handled"
    >
      <View
        style={styles.header}
      >
        <Pressable
          style={styles.backButton}
          onPress={onBack}
        >
          <Text
            style={[
              styles.backButtonText,
              {
                color:
                  theme.primary,
              },
            ]}
          >
            ← Menú
          </Text>
        </Pressable>

        <Text
          style={[
            styles.brand,
            {
              color:
                theme.primary,
            },
          ]}
        >
          {businessName}
        </Text>

        <Text
          style={[
            styles.title,
            isPhone &&
              styles.phoneTitle,
            {
              color:
                theme.text,
            },
          ]}
        >
          Cotiza tu evento
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
          Arma una cotización estimada con los paquetes y extras disponibles.
        </Text>
      </View>

      {error ? (
        <View
          style={[
            styles.card,
            isPhone &&
              styles.phoneCard,
            {
              backgroundColor:
                theme.surface,
              borderColor:
                theme.border,
            },
          ]}
        >
          <Text
            style={[
              styles.sectionTitle,
              {
                color:
                  theme.text,
              },
            ]}
          >
            Eventos no disponibles
          </Text>
          <Text
            style={[
              styles.errorText,
              {
                color:
                  theme.danger,
              },
            ]}
          >
            {error}
          </Text>
        </View>
      ) : !catalog?.enabled ? (
        <View
          style={[
            styles.card,
            isPhone &&
              styles.phoneCard,
            {
              backgroundColor:
                theme.surface,
              borderColor:
                theme.border,
            },
          ]}
        >
          <Text
            style={[
              styles.sectionTitle,
              {
                color:
                  theme.text,
              },
            ]}
          >
            Cotizador no disponible
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
            El negocio no tiene publicado el cotizador de eventos en este momento.
          </Text>
        </View>
      ) : (
        <>
          <View
            style={[
              styles.card,
              isPhone &&
                styles.phoneCard,
              {
                backgroundColor:
                  theme.surface,
                borderColor:
                  theme.border,
              },
            ]}
          >
            <Text
              style={[
                styles.sectionTitle,
                {
                  color:
                    theme.text,
                },
              ]}
            >
              1. Tipo de evento
            </Text>
            <Text
              style={[
                styles.sectionSubtitle,
                {
                  color:
                    theme.textMuted,
                },
              ]}
            >
              Selecciona la opción que más se acerque a lo que estás planeando.
            </Text>

            <View
              style={styles.optionGrid}
            >
              {catalog.types.map(
                type => {
                  const selected =
                    selectedTypeId ===
                    type.id;

                  return (
                    <Pressable
                      key={type.id}
                      style={[
                        styles.typeOption,
                        {
                          backgroundColor:
                            selected
                              ? theme.surfaceAlt
                              : theme.background,
                          borderColor:
                            selected
                              ? theme.primary
                              : theme.border,
                        },
                      ]}
                      onPress={() =>
                        setSelectedTypeId(
                          type.id,
                        )
                      }
                    >
                      <Text
                        style={[
                          styles.typeName,
                          {
                            color:
                              selected
                                ? theme.primary
                                : theme.text,
                          },
                        ]}
                      >
                        {type.name}
                      </Text>
                      {!!type.description && (
                        <Text
                          style={[
                            styles.typeDescription,
                            {
                              color:
                                theme.textMuted,
                            },
                          ]}
                        >
                          {type.description}
                        </Text>
                      )}
                    </Pressable>
                  );
                },
              )}
            </View>
          </View>

          <View
            style={[
              styles.card,
              isPhone &&
                styles.phoneCard,
              {
                backgroundColor:
                  theme.surface,
                borderColor:
                  theme.border,
              },
            ]}
          >
            <Text
              style={[
                styles.sectionTitle,
                {
                  color:
                    theme.text,
                },
              ]}
            >
              2. Elige un paquete
            </Text>
            <Text
              style={[
                styles.sectionSubtitle,
                {
                  color:
                    theme.textMuted,
                },
              ]}
            >
              El precio base incluye las personas indicadas en cada paquete.
            </Text>

            {packages.length === 0 ? (
              <Text
                style={[
                  styles.emptyText,
                  {
                    color:
                      theme.textMuted,
                  },
                ]}
              >
                No hay paquetes disponibles para este tipo de evento.
              </Text>
            ) : (
              <View
                style={styles.packageGrid}
              >
                {packages.map(
                  item => {
                    const selected =
                      selectedPackageId ===
                      item.id;

                    return (
                      <Pressable
                        key={item.id}
                        style={[
                          styles.packageCard,
                          isPhone &&
                            styles.phonePackageCard,
                          {
                            backgroundColor:
                              selected
                                ? theme.surfaceAlt
                                : theme.background,
                            borderColor:
                              selected
                                ? theme.primary
                                : theme.border,
                          },
                        ]}
                        onPress={() =>
                          setSelectedPackageId(
                            item.id,
                          )
                        }
                      >
                        <Text
                          style={[
                            styles.packageName,
                            {
                              color:
                                selected
                                  ? theme.primary
                                  : theme.text,
                            },
                          ]}
                        >
                          {item.name}
                        </Text>
                        {!!item.description && (
                          <Text
                            style={[
                              styles.packageDescription,
                              {
                                color:
                                  theme.textMuted,
                              },
                            ]}
                          >
                            {item.description}
                          </Text>
                        )}
                        <Text
                          style={[
                            styles.packageMeta,
                            {
                              color:
                                theme.textMuted,
                            },
                          ]}
                        >
                          Incluye {item.includedGuests} personas · {formatDuration(item.durationMinutes)}
                          {'\n'}Persona adicional: {formatMoney(item.extraGuestPrice, currencyCode)}
                        </Text>
                        <Text
                          style={[
                            styles.packagePrice,
                            {
                              color:
                                theme.primary,
                            },
                          ]}
                        >
                          {formatMoney(item.basePrice, currencyCode)}
                        </Text>
                      </Pressable>
                    );
                  },
                )}
              </View>
            )}
          </View>

          <View
            style={[
              styles.card,
              isPhone &&
                styles.phoneCard,
              {
                backgroundColor:
                  theme.surface,
                borderColor:
                  theme.border,
              },
            ]}
          >
            <Text
              style={[
                styles.sectionTitle,
                {
                  color:
                    theme.text,
                },
              ]}
            >
              3. Fecha y personas
            </Text>
            <Text
              style={[
                styles.sectionSubtitle,
                {
                  color:
                    theme.textMuted,
                },
              ]}
            >
              Ajusta la cantidad de invitados y una fecha tentativa para tu evento.
            </Text>

            <Text
              style={[
                styles.fieldLabel,
                {
                  color:
                    theme.textMuted,
                },
              ]}
            >
              Fecha tentativa
            </Text>
            {React.createElement(
              'input',
              {
                type: 'date',
                value: eventDate,
                min: minimumDate,
                max: maximumDate,
                onChange: (
                  event: React.ChangeEvent<HTMLInputElement>,
                ) =>
                  setEventDate(
                    event.target.value,
                  ),
                'aria-label':
                  'Fecha tentativa del evento',
                style: {
                  width: '100%',
                  minHeight: 48,
                  boxSizing: 'border-box',
                  borderWidth: 1,
                  borderStyle: 'solid',
                  borderColor:
                    dateError
                      ? theme.danger
                      : theme.border,
                  borderRadius: 10,
                  backgroundColor:
                    theme.background,
                  color: theme.text,
                  paddingLeft: 14,
                  paddingRight: 14,
                  fontSize: 15,
                  fontFamily: 'inherit',
                  colorScheme: 'dark',
                } as React.CSSProperties,
              },
            )}
            <Text
              style={[
                styles.helperText,
                {
                  color:
                    dateError
                      ? theme.danger
                      : theme.textMuted,
                },
              ]}
            >
              {dateError
                ? `La fecha debe estar entre ${minimumDate} y ${maximumDate}.`
                : `Cotizable desde ${minimumDate} hasta ${maximumDate}. Anticipación mínima: ${catalog.settings.minAdvanceHours} h.`}
            </Text>

            <Text
              style={[
                styles.fieldLabel,
                {
                  color:
                    theme.textMuted,
                  marginTop: 18,
                },
              ]}
            >
              Personas
            </Text>
            <View
              style={styles.guestRow}
            >
              <Pressable
                style={[
                  styles.stepperButton,
                  {
                    backgroundColor:
                      theme.background,
                    borderColor:
                      theme.border,
                  },
                ]}
                onPress={() =>
                  changeGuests(-1)
                }
              >
                <Text
                  style={[
                    styles.stepperText,
                    {
                      color:
                        theme.text,
                    },
                  ]}
                >
                  −
                </Text>
              </Pressable>

              <TextInput
                value={guestInput}
                onChangeText={
                  changeGuestInput
                }
                onBlur={
                  normalizeGuestInput
                }
                onSubmitEditing={
                  normalizeGuestInput
                }
                keyboardType="number-pad"
                inputMode="numeric"
                selectTextOnFocus
                maxLength={6}
                style={[
                  styles.guestValue,
                  {
                    backgroundColor:
                      theme.background,
                    borderColor:
                      theme.border,
                    color:
                      theme.text,
                  },
                ]}
                accessibilityLabel="Número de personas"
              />

              <Pressable
                style={[
                  styles.stepperButton,
                  {
                    backgroundColor:
                      theme.background,
                    borderColor:
                      theme.border,
                  },
                ]}
                onPress={() =>
                  changeGuests(1)
                }
              >
                <Text
                  style={[
                    styles.stepperText,
                    {
                      color:
                        theme.text,
                    },
                  ]}
                >
                  +
                </Text>
              </Pressable>
            </View>
            <Text
              style={[
                styles.helperText,
                {
                  color:
                    theme.textMuted,
                },
              ]}
            >
              Permitido por el negocio: {catalog.settings.minGuests} a {catalog.settings.maxGuests} personas.
            </Text>
          </View>

          <View
            style={[
              styles.card,
              isPhone &&
                styles.phoneCard,
              {
                backgroundColor:
                  theme.surface,
                borderColor:
                  theme.border,
              },
            ]}
          >
            <Text
              style={[
                styles.sectionTitle,
                {
                  color:
                    theme.text,
                },
              ]}
            >
              4. Extras
            </Text>
            <Text
              style={[
                styles.sectionSubtitle,
                {
                  color:
                    theme.textMuted,
                },
              ]}
            >
              Agrega solo lo que necesites. Los extras dependen del paquete seleccionado.
            </Text>

            {availableExtras.length === 0 ? (
              <Text
                style={[
                  styles.emptyText,
                  {
                    color:
                      theme.textMuted,
                  },
                ]}
              >
                Este paquete no tiene extras configurados.
              </Text>
            ) : (
              <View
                style={styles.extrasList}
              >
                {availableExtras.map(
                  extra => {
                    const selection =
                      extraSelections[extra.id];
                    const selected =
                      !!selection?.selected;
                    const quantity =
                      Math.max(
                        1,
                        selection?.quantity ?? 1,
                      );

                    const priceLabel =
                      extra.pricingType ===
                        'per_guest'
                        ? `${formatMoney(extra.price, currencyCode)} por persona`
                        : extra.pricingType ===
                          'per_unit'
                          ? `${formatMoney(extra.price, currencyCode)} por unidad`
                          : `${formatMoney(extra.price, currencyCode)} fijo`;

                    return (
                      <View
                        key={extra.id}
                        style={[
                          styles.extraRow,
                          {
                            backgroundColor:
                              selected
                                ? theme.surfaceAlt
                                : theme.background,
                            borderColor:
                              selected
                                ? theme.primary
                                : theme.border,
                          },
                        ]}
                      >
                        <Pressable
                          style={styles.extraRowTop}
                          onPress={() =>
                            toggleExtra(extra)
                          }
                        >
                          <View
                            style={[
                              styles.checkbox,
                              {
                                backgroundColor:
                                  selected
                                    ? theme.primary
                                    : theme.background,
                                borderColor:
                                  selected
                                    ? theme.primary
                                    : theme.border,
                              },
                            ]}
                          >
                            <Text
                              style={[
                                styles.checkboxText,
                                {
                                  color:
                                    selected
                                      ? theme.onPrimary
                                      : theme.textMuted,
                                },
                              ]}
                            >
                              {selected ? '✓' : ''}
                            </Text>
                          </View>

                          <View
                            style={styles.extraContent}
                          >
                            <Text
                              style={[
                                styles.extraName,
                                {
                                  color:
                                    theme.text,
                                },
                              ]}
                            >
                              {extra.name}
                            </Text>
                            {!!extra.description && (
                              <Text
                                style={[
                                  styles.extraDescription,
                                  {
                                    color:
                                      theme.textMuted,
                                  },
                                ]}
                              >
                                {extra.description}
                              </Text>
                            )}
                            <Text
                              style={[
                                styles.extraPrice,
                                {
                                  color:
                                    theme.primary,
                                },
                              ]}
                            >
                              {priceLabel}
                            </Text>
                          </View>
                        </Pressable>

                        {selected &&
                          extra.pricingType ===
                            'per_unit' && (
                            <View
                              style={styles.unitRow}
                            >
                              <Pressable
                                style={[
                                  styles.smallStepperButton,
                                  {
                                    borderColor:
                                      theme.border,
                                    backgroundColor:
                                      theme.background,
                                  },
                                ]}
                                onPress={() =>
                                  changeExtraQuantity(
                                    extra.id,
                                    -1,
                                  )
                                }
                              >
                                <Text
                                  style={[
                                    styles.smallStepperText,
                                    {
                                      color:
                                        theme.text,
                                    },
                                  ]}
                                >
                                  −
                                </Text>
                              </Pressable>
                              <Text
                                style={[
                                  styles.unitValue,
                                  {
                                    color:
                                      theme.text,
                                  },
                                ]}
                              >
                                {quantity}
                              </Text>
                              <Pressable
                                style={[
                                  styles.smallStepperButton,
                                  {
                                    borderColor:
                                      theme.border,
                                    backgroundColor:
                                      theme.background,
                                  },
                                ]}
                                onPress={() =>
                                  changeExtraQuantity(
                                    extra.id,
                                    1,
                                  )
                                }
                              >
                                <Text
                                  style={[
                                    styles.smallStepperText,
                                    {
                                      color:
                                        theme.text,
                                    },
                                  ]}
                                >
                                  +
                                </Text>
                              </Pressable>
                            </View>
                          )}
                      </View>
                    );
                  },
                )}
              </View>
            )}
          </View>

          <View
            style={[
              styles.card,
              isPhone &&
                styles.phoneCard,
              {
                backgroundColor:
                  theme.surface,
                borderColor:
                  theme.primary,
              },
            ]}
          >
            <Text
              style={[
                styles.sectionTitle,
                {
                  color:
                    theme.text,
                },
              ]}
            >
              Cotización estimada
            </Text>

            {selectedPackage ? (
              <>
                <View
                  style={styles.summaryRow}
                >
                  <Text
                    style={[
                      styles.summaryLabel,
                      {
                        color:
                          theme.textMuted,
                      },
                    ]}
                  >
                    {selectedPackage.name}
                  </Text>
                  <Text
                    style={[
                      styles.summaryValue,
                      {
                        color:
                          theme.text,
                      },
                    ]}
                  >
                    {formatMoney(selectedPackage.basePrice, currencyCode)}
                  </Text>
                </View>

                {additionalGuests > 0 && (
                  <View
                    style={styles.summaryRow}
                  >
                    <Text
                      style={[
                        styles.summaryLabel,
                        {
                          color:
                            theme.textMuted,
                        },
                      ]}
                    >
                      {additionalGuests} personas adicionales × {formatMoney(selectedPackage.extraGuestPrice, currencyCode)}
                    </Text>
                    <Text
                      style={[
                        styles.summaryValue,
                        {
                          color:
                            theme.text,
                        },
                      ]}
                    >
                      {formatMoney(additionalGuestsTotal, currencyCode)}
                    </Text>
                  </View>
                )}

                {extraBreakdown.map(
                  item => (
                    <View
                      key={item.extra.id}
                      style={styles.summaryRow}
                    >
                      <Text
                        style={[
                          styles.summaryLabel,
                          {
                            color:
                              theme.textMuted,
                          },
                        ]}
                      >
                        {item.extra.name}
                        {item.quantity > 1
                          ? ` × ${item.quantity}`
                          : ''}
                      </Text>
                      <Text
                        style={[
                          styles.summaryValue,
                          {
                            color:
                              theme.text,
                          },
                        ]}
                      >
                        {formatMoney(item.subtotal, currencyCode)}
                      </Text>
                    </View>
                  ),
                )}

                <View
                  style={[
                    styles.divider,
                    {
                      backgroundColor:
                        theme.border,
                    },
                  ]}
                />

                <View
                  style={styles.summaryRow}
                >
                  <Text
                    style={[
                      styles.totalLabel,
                      {
                        color:
                          theme.text,
                      },
                    ]}
                  >
                    Total estimado
                  </Text>
                  <Text
                    style={[
                      styles.totalValue,
                      {
                        color:
                          theme.primary,
                      },
                    ]}
                  >
                    {formatMoney(estimatedTotal, currencyCode)}
                  </Text>
                </View>
              </>
            ) : (
              <Text
                style={[
                  styles.emptyText,
                  {
                    color:
                      theme.textMuted,
                  },
                ]}
              >
                Selecciona un paquete para calcular tu evento.
              </Text>
            )}

            {!!catalog.settings.quoteDisclaimer && (
              <Text
                style={[
                  styles.disclaimer,
                  {
                    color:
                      theme.textMuted,
                  },
                ]}
              >
                {catalog.settings.quoteDisclaimer}
              </Text>
            )}

            {!!catalog.settings.terms && (
              <Text
                style={[
                  styles.terms,
                  {
                    color:
                      theme.textMuted,
                  },
                ]}
              >
                {catalog.settings.terms}
              </Text>
            )}
          </View>

          <WebEventRequestSection
            eventTypeId={selectedTypeId}
            packageId={selectedPackageId}
            eventDate={eventDate}
            guestCount={guestCount}
            estimatedTotal={estimatedTotal}
            currencyCode={currencyCode}
            isDateValid={!!eventDate && !dateError}
            extras={extraBreakdown.map(item => ({
              extraId: item.extra.id,
              quantity: item.quantity,
            }))}
          />
        </>
      )}
    </ScrollView>
  );
}
