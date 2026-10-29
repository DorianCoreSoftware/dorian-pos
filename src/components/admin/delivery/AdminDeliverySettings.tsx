import { useBusiness } from '../../../context/BusinessContext';

import React, {
  useCallback,
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
  useWindowDimensions,
  View,
} from 'react-native';

import {
  createDeliveryZone,
  createFulfillmentScheduleWindow,
  deleteDeliveryZone,
  deleteFulfillmentScheduleWindow,
  DeliveryZone,
  FulfillmentScheduleWindow,
  FulfillmentType,
  getDeliverySettings,
  getDeliveryZones,
  getFulfillmentScheduleWindows,
  saveDeliverySettings,
  setDeliveryZoneActive,
  updateDeliveryZone,
} from '../../../services/adminDeliveryService';

import {
  GooglePlaceSearch,
} from '../../common/google-place-search/GooglePlaceSearch';

import {
  styles,
  setBrandPrimaryColor,
} from './AdminDeliverySettings.styles';

import {
  useCurrency,
} from '../../../hooks/useCurrency';

interface ZoneFormState {
  name: string;

  minDistanceKm: string;

  maxDistanceKm: string;

  extraFee: string;

  sortOrder: string;

  isActive: boolean;
}

const INITIAL_ZONE_FORM:
  ZoneFormState = {
  name: '',

  minDistanceKm:
    '0',

  maxDistanceKm:
    '',

  extraFee:
    '0',

  sortOrder:
    '0',

  isActive:
    true,
};

const DAY_NAMES = [
  'Domingo',
  'Lunes',
  'Martes',
  'Miércoles',
  'Jueves',
  'Viernes',
  'Sábado',
];

export function AdminDeliverySettings() {
  const { theme: businessTheme } = useBusiness();
    setBrandPrimaryColor(businessTheme.primary);

  const {
    formatCurrency,
  } = useCurrency();

  const {
    width,
  } =
    useWindowDimensions();

  const isPhone =
    width <
    700;

  const [
    zones,
    setZones,
  ] =
    useState<DeliveryZone[]>(
      [],
    );

  const [
    businessLatitude,
    setBusinessLatitude,
  ] =
    useState<number | null>(
      null,
    );

  const [
    businessLongitude,
    setBusinessLongitude,
  ] =
    useState<number | null>(
      null,
    );

  const [
    businessAddress,
    setBusinessAddress,
  ] =
    useState('');

  const [
    businessPlaceId,
    setBusinessPlaceId,
  ] =
    useState<string | null>(
      null,
    );

  const [
    deliveryEnabled,
    setDeliveryEnabled,
  ] =
    useState(
      true,
    );

  const [pickupEnabled, setPickupEnabled] =
    useState(true);

  const [pickupScheduleEnabled, setPickupScheduleEnabled] =
    useState(false);

  const [deliveryScheduleEnabled, setDeliveryScheduleEnabled] =
    useState(false);

  const [scheduleWindows, setScheduleWindows] =
    useState<FulfillmentScheduleWindow[]>([]);

  const [scheduleType, setScheduleType] =
    useState<FulfillmentType>('delivery');

  const [scheduleDayOfWeek, setScheduleDayOfWeek] =
    useState(1);

  const [scheduleStartTime, setScheduleStartTime] =
    useState('15:00');

  const [scheduleEndTime, setScheduleEndTime] =
    useState('19:00');

  const [
    isLoading,
    setIsLoading,
  ] =
    useState(
      true,
    );

  const [
    isProcessing,
    setIsProcessing,
  ] =
    useState(
      false,
    );

  const [
    errorMessage,
    setErrorMessage,
  ] =
    useState<string | null>(
      null,
    );

  const [
    selectedZone,
    setSelectedZone,
  ] =
    useState<DeliveryZone | null>(
      null,
    );

  const [
    zoneForm,
    setZoneForm,
  ] =
    useState<ZoneFormState>({
      ...INITIAL_ZONE_FORM,
    });

  const [
    isZoneModalVisible,
    setIsZoneModalVisible,
  ] =
    useState(
      false,
    );

  const loadData =
    useCallback(
      async (): Promise<void> => {
        try {
          setIsLoading(
            true,
          );

          setErrorMessage(
            null,
          );

          const [
            loadedSettings,
            loadedZones,
            loadedScheduleWindows,
          ] =
            await Promise.all([
              getDeliverySettings(),
              getDeliveryZones(),
              getFulfillmentScheduleWindows(),
            ]);

          setDeliveryEnabled(
            loadedSettings.isEnabled,
          );

          setPickupEnabled(
            loadedSettings.pickupEnabled,
          );

          setPickupScheduleEnabled(
            loadedSettings.pickupScheduleEnabled,
          );

          setDeliveryScheduleEnabled(
            loadedSettings.deliveryScheduleEnabled,
          );

          setBusinessLatitude(
            loadedSettings.businessLatitude,
          );

          setBusinessLongitude(
            loadedSettings.businessLongitude,
          );

          setBusinessAddress(
            loadedSettings.businessAddress ??
            '',
          );

          setBusinessPlaceId(
            loadedSettings.businessPlaceId,
          );

          setZones(
            loadedZones,
          );

          setScheduleWindows(
            loadedScheduleWindows,
          );
        } catch (
        error
        ) {
          console.error(
            'Error cargando configuración de entregas:',
            error,
          );

          setErrorMessage(
            error instanceof
              Error
              ? error.message
              : 'No se pudo cargar la configuración de entregas.',
          );
        } finally {
          setIsLoading(
            false,
          );
        }
      },
      [],
    );

  useEffect(
    () => {
      void loadData();
    },
    [
      loadData,
    ],
  );

  const sortedZones =
    useMemo(
      () =>
        [
          ...zones,
        ].sort(
          (
            zoneA,
            zoneB,
          ) => {
            if (
              zoneA.sortOrder !==
              zoneB.sortOrder
            ) {
              return (
                zoneA.sortOrder -
                zoneB.sortOrder
              );
            }

            return (
              zoneA.maxDistanceKm -
              zoneB.maxDistanceKm
            );
          },
        ),
      [
        zones,
      ],
    );

  async function handleSaveSettings():
    Promise<void> {
    if (
      isProcessing
    ) {
      return;
    }

    if (
      deliveryEnabled &&
      (
        businessLatitude === null ||
        businessLongitude === null ||
        !businessAddress.trim()
      )
    ) {
      Alert.alert(
        'Ubicación requerida',
        'Busca y selecciona la ubicación del negocio.',
      );

      return;
    }

    try {
      setIsProcessing(
        true,
      );

      await saveDeliverySettings({
        businessLatitude,

        businessLongitude,

        businessAddress:
          businessAddress.trim(),

        businessPlaceId,

        isEnabled:
          deliveryEnabled,

        pickupEnabled,

        pickupScheduleEnabled,

        deliveryScheduleEnabled,
      });

      Alert.alert(
        'Configuración guardada',
        'La ubicación y configuración de entregas se actualizaron correctamente.',
      );

      await loadData();
    } catch (
    error
    ) {
      Alert.alert(
        'Error',
        error instanceof
          Error
          ? error.message
          : 'No se pudo guardar la configuración.',
      );
    } finally {
      setIsProcessing(
        false,
      );
    }
  }

  async function handleAddScheduleWindow():
    Promise<void> {
    if (isProcessing) {
      return;
    }

    try {
      setIsProcessing(true);

      await createFulfillmentScheduleWindow({
        fulfillmentType: scheduleType,
        dayOfWeek: scheduleDayOfWeek,
        startTime: scheduleStartTime,
        endTime: scheduleEndTime,
      });

      await loadData();
    } catch (error) {
      Alert.alert(
        'Horario no guardado',
        error instanceof Error
          ? error.message
          : 'No se pudo guardar el horario.',
      );
    } finally {
      setIsProcessing(false);
    }
  }

  function confirmDeleteScheduleWindow(
    window: FulfillmentScheduleWindow,
  ): void {
    Alert.alert(
      'Eliminar horario',
      `¿Eliminar ${DAY_NAMES[window.dayOfWeek]} ${window.startTime}–${window.endTime}?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: () => {
            void (async () => {
              try {
                setIsProcessing(true);
                await deleteFulfillmentScheduleWindow(window.id);
                await loadData();
              } catch (error) {
                Alert.alert(
                  'Error',
                  error instanceof Error
                    ? error.message
                    : 'No se pudo eliminar el horario.',
                );
              } finally {
                setIsProcessing(false);
              }
            })();
          },
        },
      ],
    );
  }

  function openCreateZone():
    void {
    if (
      isProcessing
    ) {
      return;
    }

    const nextSortOrder =
      zones.length >
        0
        ? Math.max(
          ...zones.map(
            (
              zone,
            ) =>
              zone.sortOrder,
          ),
        ) +
        1
        : 1;

    const previousMax =
      zones.length >
        0
        ? Math.max(
          ...zones.map(
            (
              zone,
            ) =>
              zone.maxDistanceKm,
          ),
        )
        : 0;

    setSelectedZone(
      null,
    );

    setZoneForm({
      ...INITIAL_ZONE_FORM,

      minDistanceKm:
        String(
          previousMax,
        ),

      sortOrder:
        String(
          nextSortOrder,
        ),
    });

    setIsZoneModalVisible(
      true,
    );
  }

  function openEditZone(
    zone:
      DeliveryZone,
  ): void {
    if (
      isProcessing
    ) {
      return;
    }

    setSelectedZone(
      zone,
    );

    setZoneForm({
      name:
        zone.name,

      minDistanceKm:
        String(
          zone.minDistanceKm,
        ),

      maxDistanceKm:
        String(
          zone.maxDistanceKm,
        ),

      extraFee:
        String(
          zone.extraFee,
        ),

      sortOrder:
        String(
          zone.sortOrder,
        ),

      isActive:
        zone.isActive,
    });

    setIsZoneModalVisible(
      true,
    );
  }

  function closeZoneModal():
    void {
    if (
      isProcessing
    ) {
      return;
    }

    setIsZoneModalVisible(
      false,
    );

    setSelectedZone(
      null,
    );

    setZoneForm({
      ...INITIAL_ZONE_FORM,
    });
  }

  async function handleSaveZone():
    Promise<void> {
    if (
      isProcessing
    ) {
      return;
    }

    const cleanName =
      zoneForm.name
        .trim();

    const minDistance =
      Number(
        zoneForm.minDistanceKm,
      );

    const maxDistance =
      Number(
        zoneForm.maxDistanceKm,
      );

    const extraFee =
      Number(
        zoneForm.extraFee,
      );

    const sortOrder =
      Number(
        zoneForm.sortOrder,
      );

    if (
      !cleanName
    ) {
      Alert.alert(
        'Nombre requerido',
        'Ingresa un nombre para la zona.',
      );

      return;
    }

    if (
      !Number.isFinite(
        minDistance,
      ) ||
      minDistance <
      0
    ) {
      Alert.alert(
        'Distancia mínima inválida',
        'La distancia mínima debe ser 0 o mayor.',
      );

      return;
    }

    if (
      !Number.isFinite(
        maxDistance,
      ) ||
      maxDistance <=
      minDistance
    ) {
      Alert.alert(
        'Distancia máxima inválida',
        'La distancia máxima debe ser mayor a la distancia mínima.',
      );

      return;
    }

    if (
      !Number.isFinite(
        extraFee,
      ) ||
      extraFee <
      0
    ) {
      Alert.alert(
        'Tarifa inválida',
        'El cargo extra no puede ser negativo.',
      );

      return;
    }

    if (
      !Number.isInteger(
        sortOrder,
      ) ||
      sortOrder <
      0
    ) {
      Alert.alert(
        'Orden inválido',
        'El orden debe ser un número entero igual o mayor a 0.',
      );

      return;
    }

    try {
      setIsProcessing(
        true,
      );

      if (
        selectedZone
      ) {
        await updateDeliveryZone(
          selectedZone.id,
          {
            name:
              cleanName,

            minDistanceKm:
              minDistance,

            maxDistanceKm:
              maxDistance,

            extraFee,

            sortOrder,

            isActive:
              zoneForm.isActive,
          },
        );
      } else {
        await createDeliveryZone({
          name:
            cleanName,

          minDistanceKm:
            minDistance,

          maxDistanceKm:
            maxDistance,

          extraFee,

          sortOrder,

          isActive:
            zoneForm.isActive,
        });
      }

      const wasEditing =
        !!selectedZone;

      setIsZoneModalVisible(
        false,
      );

      setSelectedZone(
        null,
      );

      setZoneForm({
        ...INITIAL_ZONE_FORM,
      });

      await loadData();

      Alert.alert(
        wasEditing
          ? 'Zona actualizada'
          : 'Zona creada',

        wasEditing
          ? 'La zona de entrega fue actualizada correctamente.'
          : 'La zona de entrega fue creada correctamente.',
      );
    } catch (
    error
    ) {
      Alert.alert(
        'Error',
        error instanceof
          Error
          ? error.message
          : 'No se pudo guardar la zona.',
      );
    } finally {
      setIsProcessing(
        false,
      );
    }
  }

  function confirmToggleZone(
    zone:
      DeliveryZone,
  ): void {
    const nextState =
      !zone.isActive;

    Alert.alert(
      nextState
        ? 'Activar zona'
        : 'Desactivar zona',

      nextState
        ? `¿Deseas activar "${zone.name}"?`
        : `¿Deseas desactivar "${zone.name}"? Esta zona dejará de aceptar entregas.`,

      [
        {
          text:
            'Cancelar',

          style:
            'cancel',
        },

        {
          text:
            nextState
              ? 'Activar'
              : 'Desactivar',

          style:
            nextState
              ? 'default'
              : 'destructive',

          onPress:
            () => {
              void executeToggleZone(
                zone,
                nextState,
              );
            },
        },
      ],
    );
  }

  async function executeToggleZone(
    zone:
      DeliveryZone,

    isActive:
      boolean,
  ): Promise<void> {
    try {
      setIsProcessing(
        true,
      );

      await setDeliveryZoneActive(
        zone.id,
        isActive,
      );

      await loadData();
    } catch (
    error
    ) {
      Alert.alert(
        'Error',
        error instanceof
          Error
          ? error.message
          : 'No se pudo cambiar el estado de la zona.',
      );
    } finally {
      setIsProcessing(
        false,
      );
    }
  }

  function confirmDeleteZone(
    zone:
      DeliveryZone,
  ): void {
    Alert.alert(
      'Eliminar zona',
      `¿Deseas eliminar definitivamente "${zone.name}"?`,

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
              void executeDeleteZone(
                zone,
              );
            },
        },
      ],
    );
  }

  async function executeDeleteZone(
    zone:
      DeliveryZone,
  ): Promise<void> {
    try {
      setIsProcessing(
        true,
      );

      await deleteDeliveryZone(
        zone.id,
      );

      await loadData();
    } catch (
    error
    ) {
      Alert.alert(
        'Error',
        error instanceof
          Error
          ? error.message
          : 'No se pudo eliminar la zona.',
      );
    } finally {
      setIsProcessing(
        false,
      );
    }
  }

  if (
    isLoading
  ) {
    return (
      <View
        style={
          styles.centerContainer
        }
      >
        <ActivityIndicator
          size="large"
          color={businessTheme.primary}
        />

        <Text
          style={
            styles.loadingText
          }
        >
          Cargando configuración de entregas...
        </Text>
      </View>
    );
  }

  if (
    errorMessage
  ) {
    return (
      <View
        style={
          styles.centerContainer
        }
      >
        <Text
          style={
            styles.errorTitle
          }
        >
          ⚠️ Error
        </Text>

        <Text
          style={
            styles.errorMessage
          }
        >
          {
            errorMessage
          }
        </Text>

        <TouchableOpacity
          style={
            styles.retryButton
          }
          onPress={
            () => {
              void loadData();
            }
          }
        >
          <Text
            style={
              styles.retryButtonText
            }
          >
            Reintentar
          </Text>
        </TouchableOpacity>
      </View>
    );
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
      keyboardShouldPersistTaps="handled"
    >
      <View
        style={
          styles.sectionHeader
        }
      >
        <View
          style={
            styles.sectionHeaderText
          }
        >
          <Text
            style={
              styles.title
            }
          >
            Configuración de entregas
          </Text>

          <Text
            style={
              styles.subtitle
            }
          >
            Controla recoger, domicilio, horarios automáticos y zonas de reparto.
          </Text>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>
          Modalidades y horarios automáticos
        </Text>
        <Text style={styles.cardSubtitle}>
          El apagado manual siempre tiene prioridad. Si activas el horario automático, la modalidad solo estará disponible dentro de sus ventanas configuradas.
        </Text>

        <View style={styles.fulfillmentModeCard}>
          <View style={styles.fulfillmentModeInfo}>
            <Text style={styles.fulfillmentModeTitle}>🏪 Recoger</Text>
            <Text style={styles.fulfillmentModeSubtitle}>
              Permite que el cliente pase por su pedido.
            </Text>
          </View>
          <View style={styles.fulfillmentSwitches}>
            <View style={styles.compactSwitchRow}>
              <Text style={styles.compactSwitchLabel}>Manual</Text>
              <Switch
                value={pickupEnabled}
                disabled={isProcessing}
                onValueChange={setPickupEnabled}
              />
            </View>
            <View style={styles.compactSwitchRow}>
              <Text style={styles.compactSwitchLabel}>Horario</Text>
              <Switch
                value={pickupScheduleEnabled}
                disabled={isProcessing || !pickupEnabled}
                onValueChange={setPickupScheduleEnabled}
              />
            </View>
          </View>
        </View>

        <View style={styles.fulfillmentModeCard}>
          <View style={styles.fulfillmentModeInfo}>
            <Text style={styles.fulfillmentModeTitle}>🛵 Domicilio</Text>
            <Text style={styles.fulfillmentModeSubtitle}>
              Usa la ubicación y las zonas de reparto configuradas abajo.
            </Text>
          </View>
          <View style={styles.fulfillmentSwitches}>
            <View style={styles.compactSwitchRow}>
              <Text style={styles.compactSwitchLabel}>Manual</Text>
              <Switch
                value={deliveryEnabled}
                disabled={isProcessing}
                onValueChange={setDeliveryEnabled}
              />
            </View>
            <View style={styles.compactSwitchRow}>
              <Text style={styles.compactSwitchLabel}>Horario</Text>
              <Switch
                value={deliveryScheduleEnabled}
                disabled={isProcessing || !deliveryEnabled}
                onValueChange={setDeliveryScheduleEnabled}
              />
            </View>
          </View>
        </View>

        <View style={styles.scheduleBuilder}>
          <Text style={styles.inputLabel}>Agregar ventana</Text>

          <View style={styles.scheduleTypeRow}>
            {(['delivery', 'pickup'] as FulfillmentType[]).map((type) => (
              <TouchableOpacity
                key={type}
                style={[
                  styles.scheduleTypeButton,
                  scheduleType === type && styles.scheduleTypeButtonActive,
                ]}
                disabled={isProcessing}
                onPress={() => setScheduleType(type)}
              >
                <Text style={styles.scheduleTypeButtonText}>
                  {type === 'delivery' ? 'Domicilio' : 'Recoger'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.dayButtons}>
            {DAY_NAMES.map((day, index) => (
              <TouchableOpacity
                key={day}
                style={[
                  styles.dayButton,
                  scheduleDayOfWeek === index && styles.dayButtonActive,
                ]}
                disabled={isProcessing}
                onPress={() => setScheduleDayOfWeek(index)}
              >
                <Text style={styles.dayButtonText}>{day.slice(0, 3)}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={[styles.coordinatesRow, isPhone && styles.coordinatesRowPhone]}>
            <View style={styles.coordinateField}>
              <Text style={styles.inputLabel}>Desde</Text>
              <TextInput
                value={scheduleStartTime}
                onChangeText={setScheduleStartTime}
                placeholder="15:00"
                placeholderTextColor="#777777"
                maxLength={5}
                style={styles.input}
              />
            </View>
            <View style={styles.coordinateField}>
              <Text style={styles.inputLabel}>Hasta</Text>
              <TextInput
                value={scheduleEndTime}
                onChangeText={setScheduleEndTime}
                placeholder="19:00"
                placeholderTextColor="#777777"
                maxLength={5}
                style={styles.input}
              />
            </View>
          </View>

          <TouchableOpacity
            style={[styles.primaryButton, isProcessing && styles.buttonDisabled]}
            disabled={isProcessing}
            onPress={() => { void handleAddScheduleWindow(); }}
          >
            <Text style={styles.primaryButtonText}>+ Agregar horario</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.scheduleList}>
          {scheduleWindows.length === 0 ? (
            <Text style={styles.scheduleEmpty}>
              No hay ventanas configuradas. Si el horario automático está apagado, la modalidad depende únicamente del interruptor manual.
            </Text>
          ) : (
            scheduleWindows.map((window) => (
              <View key={window.id} style={styles.scheduleWindowRow}>
                <View style={styles.scheduleWindowInfo}>
                  <Text style={styles.scheduleWindowTitle}>
                    {window.fulfillmentType === 'delivery' ? '🛵 Domicilio' : '🏪 Recoger'} · {DAY_NAMES[window.dayOfWeek]}
                  </Text>
                  <Text style={styles.scheduleWindowTime}>
                    {window.startTime}–{window.endTime}
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.scheduleDeleteButton}
                  disabled={isProcessing}
                  onPress={() => confirmDeleteScheduleWindow(window)}
                >
                  <Text style={styles.scheduleDeleteButtonText}>Eliminar</Text>
                </TouchableOpacity>
              </View>
            ))
          )}
        </View>

        <TouchableOpacity
          style={[styles.primaryButton, isProcessing && styles.buttonDisabled]}
          disabled={isProcessing}
          onPress={() => { void handleSaveSettings(); }}
        >
          <Text style={styles.primaryButtonText}>
            Guardar disponibilidad
          </Text>
        </TouchableOpacity>
      </View>

      <View
        style={
          styles.card
        }
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
              style={
                styles.cardTitle
              }
            >
              Ubicación del negocio
            </Text>

            <Text
              style={
                styles.cardSubtitle
              }
            >
              Busca el negocio o su dirección. Esta ubicación se utiliza como origen para calcular la distancia de entrega.
            </Text>
          </View>

        </View>

        <GooglePlaceSearch
          initialValue=""
          disabled={
            isProcessing
          }
          placeholder={
            businessAddress
              ? 'Buscar otra ubicación...'
              : 'Buscar negocio o dirección...'
          }
          onPlaceSelected={(
            place,
          ) => {
            setBusinessLatitude(
              place.latitude,
            );

            setBusinessLongitude(
              place.longitude,
            );

            setBusinessAddress(
              place.formattedAddress ||
              place.displayName,
            );

            setBusinessPlaceId(
              place.placeId,
            );
          }}
        />

        {!!businessAddress &&
          businessLatitude !==
          null &&
          businessLongitude !==
          null && (
            <View
              style={
                styles.locationHint
              }
            >
              <Text
                style={
                  styles.locationHintTitle
                }
              >
                ✓ Ubicación seleccionada
              </Text>

              <Text
                style={
                  styles.locationHintText
                }
              >
                {
                  businessAddress
                }
              </Text>
            </View>
          )}

        <TouchableOpacity
          style={[
            styles.primaryButton,

            isProcessing &&
            styles.buttonDisabled,
          ]}
          disabled={
            isProcessing
          }
          onPress={
            () => {
              void handleSaveSettings();
            }
          }
        >
          {isProcessing ? (
            <ActivityIndicator
              size="small"
              color="#171717"
            />
          ) : (
            <Text
              style={
                styles.primaryButtonText
              }
            >
              Guardar ubicación y configuración
            </Text>
          )}
        </TouchableOpacity>
      </View>

      <View
        style={
          styles.zonesHeader
        }
      >
        <View>
          <Text
            style={
              styles.cardTitle
            }
          >
            Zonas de entrega
          </Text>

          <Text
            style={
              styles.cardSubtitle
            }
          >
            Configura los rangos de distancia y el cargo adicional.
          </Text>
        </View>

        <TouchableOpacity
          style={
            styles.createButton
          }
          disabled={
            isProcessing
          }
          onPress={
            openCreateZone
          }
        >
          <Text
            style={
              styles.createButtonText
            }
          >
            + Nueva zona
          </Text>
        </TouchableOpacity>
      </View>

      {sortedZones.length ===
        0 ? (
        <View
          style={
            styles.emptyContainer
          }
        >
          <Text
            style={
              styles.emptyIcon
            }
          >
            🛵
          </Text>

          <Text
            style={
              styles.emptyTitle
            }
          >
            No hay zonas configuradas
          </Text>

          <Text
            style={
              styles.emptyText
            }
          >
            Agrega la primera zona de reparto.
          </Text>
        </View>
      ) : (
        sortedZones.map(
          (
            zone,
          ) => (
            <View
              key={
                zone.id
              }
              style={[
                styles.zoneCard,

                !zone.isActive &&
                styles.zoneCardInactive,
              ]}
            >
              <View
                style={
                  styles.zoneInfo
                }
              >
                <View
                  style={
                    styles.zoneTitleRow
                  }
                >
                  <Text
                    style={
                      styles.zoneName
                    }
                  >
                    {
                      zone.name
                    }
                  </Text>

                  <View
                    style={[
                      styles.statusBadge,

                      zone.isActive
                        ? styles.statusBadgeActive
                        : styles.statusBadgeInactive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.statusText,

                        zone.isActive
                          ? styles.statusTextActive
                          : styles.statusTextInactive,
                      ]}
                    >
                      {zone.isActive
                        ? 'ACTIVA'
                        : 'INACTIVA'}
                    </Text>
                  </View>
                </View>

                <Text
                  style={
                    styles.zoneRange
                  }
                >
                  {zone.minDistanceKm.toFixed(
                    2,
                  )}{' '}
                  km –{' '}
                  {zone.maxDistanceKm.toFixed(
                    2,
                  )}{' '}
                  km
                </Text>

                <View
                  style={
                    styles.zoneMetaRow
                  }
                >
                  <Text
                    style={
                      styles.zoneFee
                    }
                  >
                    {zone.extraFee >
                      0
                      ? `+${formatCurrency(
                        zone.extraFee,
                      )}`
                      : 'Sin cargo extra'}
                  </Text>

                  <Text
                    style={
                      styles.zoneOrder
                    }
                  >
                    Orden:{' '}
                    {
                      zone.sortOrder
                    }
                  </Text>
                </View>
              </View>

              <View
                style={[
                  styles.zoneActions,

                  isPhone &&
                  styles.zoneActionsPhone,
                ]}
              >
                <TouchableOpacity
                  style={
                    styles.editButton
                  }
                  disabled={
                    isProcessing
                  }
                  onPress={
                    () =>
                      openEditZone(
                        zone,
                      )
                  }
                >
                  <Text
                    style={
                      styles.editButtonText
                    }
                  >
                    Editar
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.stateButton,

                    zone.isActive
                      ? styles.deactivateButton
                      : styles.activateButton,
                  ]}
                  disabled={
                    isProcessing
                  }
                  onPress={
                    () =>
                      confirmToggleZone(
                        zone,
                      )
                  }
                >
                  <Text
                    style={
                      styles.stateButtonText
                    }
                  >
                    {zone.isActive
                      ? 'Desactivar'
                      : 'Activar'}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={
                    styles.deleteButton
                  }
                  disabled={
                    isProcessing
                  }
                  onPress={
                    () =>
                      confirmDeleteZone(
                        zone,
                      )
                  }
                >
                  <Text
                    style={
                      styles.deleteButtonText
                    }
                  >
                    Eliminar
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          ),
        )
      )}

      <Modal
        visible={
          isZoneModalVisible
        }
        transparent
        animationType="fade"
        onRequestClose={
          closeZoneModal
        }
      >
        <View
          style={
            styles.modalOverlay
          }
        >
          <ScrollView
            style={
              styles.modalScroll
            }
            contentContainerStyle={
              styles.modalScrollContent
            }
            keyboardShouldPersistTaps="handled"
          >
            <View
              style={
                styles.modalContent
              }
            >
              <Text
                style={
                  styles.modalTitle
                }
              >
                {selectedZone
                  ? 'Editar zona'
                  : 'Nueva zona'}
              </Text>

              <Text
                style={
                  styles.inputLabel
                }
              >
                Nombre
              </Text>

              <TextInput
                value={
                  zoneForm.name
                }
                onChangeText={
                  (
                    value,
                  ) =>
                    setZoneForm(
                      (
                        current,
                      ) => ({
                        ...current,

                        name:
                          value,
                      }),
                    )
                }
                style={
                  styles.input
                }
                placeholder="Ej. Zona cercana"
                placeholderTextColor="#777777"
                editable={
                  !isProcessing
                }
              />

              <View
                style={[
                  styles.modalRow,

                  isPhone &&
                  styles.modalRowPhone,
                ]}
              >
                <View
                  style={
                    styles.modalField
                  }
                >
                  <Text
                    style={
                      styles.inputLabel
                    }
                  >
                    Desde km
                  </Text>

                  <TextInput
                    value={
                      zoneForm.minDistanceKm
                    }
                    onChangeText={
                      (
                        value,
                      ) =>
                        setZoneForm(
                          (
                            current,
                          ) => ({
                            ...current,

                            minDistanceKm:
                              sanitizePositiveDecimal(
                                value,
                              ),
                          }),
                        )
                    }
                    style={
                      styles.input
                    }
                    keyboardType="decimal-pad"
                    placeholder="0.00"
                    placeholderTextColor="#777777"
                    editable={
                      !isProcessing
                    }
                  />
                </View>

                <View
                  style={
                    styles.modalField
                  }
                >
                  <Text
                    style={
                      styles.inputLabel
                    }
                  >
                    Hasta km
                  </Text>

                  <TextInput
                    value={
                      zoneForm.maxDistanceKm
                    }
                    onChangeText={
                      (
                        value,
                      ) =>
                        setZoneForm(
                          (
                            current,
                          ) => ({
                            ...current,

                            maxDistanceKm:
                              sanitizePositiveDecimal(
                                value,
                              ),
                          }),
                        )
                    }
                    style={
                      styles.input
                    }
                    keyboardType="decimal-pad"
                    placeholder="2.50"
                    placeholderTextColor="#777777"
                    editable={
                      !isProcessing
                    }
                  />
                </View>
              </View>

              <View
                style={[
                  styles.modalRow,

                  isPhone &&
                  styles.modalRowPhone,
                ]}
              >
                <View
                  style={
                    styles.modalField
                  }
                >
                  <Text
                    style={
                      styles.inputLabel
                    }
                  >
                    Cargo extra
                  </Text>

                  <TextInput
                    value={
                      zoneForm.extraFee
                    }
                    onChangeText={
                      (
                        value,
                      ) =>
                        setZoneForm(
                          (
                            current,
                          ) => ({
                            ...current,

                            extraFee:
                              sanitizePositiveDecimal(
                                value,
                              ),
                          }),
                        )
                    }
                    style={
                      styles.input
                    }
                    keyboardType="decimal-pad"
                    placeholder="0.00"
                    placeholderTextColor="#777777"
                    editable={
                      !isProcessing
                    }
                  />
                </View>

                <View
                  style={
                    styles.modalField
                  }
                >
                  <Text
                    style={
                      styles.inputLabel
                    }
                  >
                    Orden
                  </Text>

                  <TextInput
                    value={
                      zoneForm.sortOrder
                    }
                    onChangeText={
                      (
                        value,
                      ) =>
                        setZoneForm(
                          (
                            current,
                          ) => ({
                            ...current,

                            sortOrder:
                              value.replace(
                                /\D/g,
                                '',
                              ),
                          }),
                        )
                    }
                    style={
                      styles.input
                    }
                    keyboardType="number-pad"
                    placeholder="1"
                    placeholderTextColor="#777777"
                    editable={
                      !isProcessing
                    }
                  />
                </View>
              </View>

              <View
                style={
                  styles.activeRow
                }
              >
                <View>
                  <Text
                    style={
                      styles.activeTitle
                    }
                  >
                    Zona activa
                  </Text>

                  <Text
                    style={
                      styles.activeSubtitle
                    }
                  >
                    Solo las zonas activas aceptan entregas.
                  </Text>
                </View>

                <Switch
                  value={
                    zoneForm.isActive
                  }
                  disabled={
                    isProcessing
                  }
                  onValueChange={
                    (
                      value,
                    ) =>
                      setZoneForm(
                        (
                          current,
                        ) => ({
                          ...current,

                          isActive:
                            value,
                        }),
                      )
                  }
                />
              </View>

              <View
                style={
                  styles.modalActions
                }
              >
                <TouchableOpacity
                  style={[
                    styles.modalButton,

                    styles.cancelButton,
                  ]}
                  disabled={
                    isProcessing
                  }
                  onPress={
                    closeZoneModal
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
                    styles.modalButton,

                    styles.saveButton,

                    isProcessing &&
                    styles.buttonDisabled,
                  ]}
                  disabled={
                    isProcessing
                  }
                  onPress={
                    () => {
                      void handleSaveZone();
                    }
                  }
                >
                  {isProcessing ? (
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
                      {selectedZone
                        ? 'Guardar cambios'
                        : 'Crear zona'}
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </View>
      </Modal>
    </ScrollView>
  );
}

function sanitizePositiveDecimal(
  value:
    string,
): string {
  const normalized =
    value
      .replace(
        ',',
        '.',
      )
      .replace(
        /[^0-9.]/g,
        '',
      );

  const parts =
    normalized.split(
      '.',
    );

  if (
    parts.length >
    2
  ) {
    return value;
  }

  if (
    parts[1] &&
    parts[1].length >
    2
  ) {
    return value;
  }

  return normalized;
}