import React, {
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import {
  ActivityIndicator,
  Alert,
  Animated,
  LayoutChangeEvent,
  Modal,
  PanResponder,
  ScrollView,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';

import { useBusiness } from '../../../context/BusinessContext';
import {
  DEFAULT_EVENT_SETTINGS,
  EventExtraAdmin,
  EventExtraPricingType,
  EventPackageAdmin,
  EventSettings,
  EventTypeAdmin,
  getEventAdminCatalog,
  getEventSettings,
  reorderEventExtras,
  reorderEventPackages,
  reorderEventTypes,
  saveEventExtra,
  saveEventPackage,
  saveEventSettings,
  processEventRemindersAdmin,
  saveEventType,
  setEventExtraActive,
  setEventPackageActive,
  setEventTypeActive,
} from '../../../services/adminEventsService';
import { styles } from './AdminEvents.styles';
import { AdminEventAvailability } from './AdminEventAvailability';

type EventsTab =
  | 'settings'
  | 'availability'
  | 'types'
  | 'packages'
  | 'extras';

type SortableKind =
  | 'types'
  | 'packages'
  | 'extras';

interface CardLayout {
  y: number;
  height: number;
}

interface EventSettingsForm {
  publicQuoteEnabled: boolean;
  minGuests: string;
  maxGuests: string;
  minAdvanceHours: string;
  maxAdvanceDays: string;
  quoteDisclaimer: string;
  terms: string;
  depositEnabled: boolean;
  depositType: 'percentage' | 'fixed';
  depositValue: string;
  depositDueDays: string;
  portalBaseUrl: string;
  remindersEnabled: boolean;
  depositReminderDaysBefore: string;
  eventReminderHoursBefore: string;
  balanceReminderHoursBefore: string;
  checklistReminderHoursBefore: string;
}

interface EventTypeForm {
  name: string;
  description: string;
  isActive: boolean;
}

interface EventPackageForm {
  eventTypeId: string | null;
  name: string;
  description: string;
  basePrice: string;
  includedGuests: string;
  extraGuestPrice: string;
  durationMinutes: string;
  extraIds: string[];
  isActive: boolean;
}

interface EventExtraForm {
  name: string;
  description: string;
  pricingType: EventExtraPricingType;
  price: string;
  isActive: boolean;
}

const EMPTY_TYPE_FORM: EventTypeForm = {
  name: '',
  description: '',
  isActive: true,
};

const EMPTY_PACKAGE_FORM: EventPackageForm = {
  eventTypeId: null,
  name: '',
  description: '',
  basePrice: '',
  includedGuests: '20',
  extraGuestPrice: '',
  durationMinutes: '120',
  extraIds: [],
  isActive: true,
};

const EMPTY_EXTRA_FORM: EventExtraForm = {
  name: '',
  description: '',
  pricingType: 'fixed',
  price: '',
  isActive: true,
};

const toSettingsForm = (
  settings: EventSettings,
): EventSettingsForm => ({
  publicQuoteEnabled: settings.publicQuoteEnabled,
  minGuests: String(settings.minGuests),
  maxGuests: String(settings.maxGuests),
  minAdvanceHours: String(settings.minAdvanceHours),
  maxAdvanceDays: String(settings.maxAdvanceDays),
  quoteDisclaimer: settings.quoteDisclaimer,
  terms: settings.terms,
  depositEnabled: settings.depositEnabled,
  depositType: settings.depositType,
  depositValue: String(settings.depositValue),
  depositDueDays: String(settings.depositDueDays),
  portalBaseUrl: settings.portalBaseUrl,
  remindersEnabled: settings.remindersEnabled,
  depositReminderDaysBefore: String(settings.depositReminderDaysBefore),
  eventReminderHoursBefore: String(settings.eventReminderHoursBefore),
  balanceReminderHoursBefore: String(settings.balanceReminderHoursBefore),
  checklistReminderHoursBefore: String(settings.checklistReminderHoursBefore),
});

interface SortableCardProps {
  id: string;
  isDisabled: boolean;
  isDragging: boolean;
  theme: {
    surface: string;
    surfaceAlt: string;
    border: string;
    text: string;
    textMuted: string;
    primary: string;
  };
  onLayout: (
    id: string,
    event: LayoutChangeEvent,
  ) => void;
  onDragStart: (id: string) => void;
  onDragEnd: (
    id: string,
    offsetY: number,
  ) => void;
  children: React.ReactNode;
}

function SortableCard({
  id,
  isDisabled,
  isDragging,
  theme,
  onLayout,
  onDragStart,
  onDragEnd,
  children,
}: SortableCardProps) {
  const translateY = useRef(
    new Animated.Value(0),
  ).current;

  const onDragStartRef = useRef(onDragStart);
  const onDragEndRef = useRef(onDragEnd);
  onDragStartRef.current = onDragStart;
  onDragEndRef.current = onDragEnd;

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder:
          () => !isDisabled,
        onMoveShouldSetPanResponder:
          () => !isDisabled,
        onPanResponderGrant: () => {
          if (!isDisabled) {
            onDragStartRef.current(id);
          }
        },
        onPanResponderMove: (
          _event,
          gestureState,
        ) => {
          if (!isDisabled) {
            translateY.setValue(
              gestureState.dy,
            );
          }
        },
        onPanResponderRelease: (
          _event,
          gestureState,
        ) => {
          translateY.setValue(0);
          if (!isDisabled) {
            onDragEndRef.current(
              id,
              gestureState.dy,
            );
          }
        },
        onPanResponderTerminate: () => {
          translateY.setValue(0);
          onDragEndRef.current(id, 0);
        },
        onPanResponderTerminationRequest:
          () => false,
        onShouldBlockNativeResponder:
          () => true,
      }),
    [
      id,
      isDisabled,
      translateY,
    ],
  );

  return (
    <Animated.View
      onLayout={event =>
        onLayout(id, event)
      }
      style={[
        styles.catalogCard,
        {
          backgroundColor: theme.surface,
          borderColor: isDragging
            ? theme.primary
            : theme.border,
          transform: [{ translateY }],
          zIndex: isDragging ? 20 : 0,
        },
        isDragging &&
          styles.catalogCardDragging,
      ]}
    >
      <View
        {...panResponder.panHandlers}
        style={[
          styles.dragHandleButton,
          {
            backgroundColor:
              isDragging
                ? theme.surfaceAlt
                : 'transparent',
          },
        ]}
      >
        <Text
          style={[
            styles.dragHandle,
            {
              color: theme.textMuted,
            },
          ]}
        >
          ≡
        </Text>
      </View>

      <View style={styles.catalogCardContent}>
        {children}
      </View>
    </Animated.View>
  );
}

export function AdminEvents() {
  const { width } = useWindowDimensions();
  const { theme } = useBusiness();
  const isPhone = width < 700;

  const [activeTab, setActiveTab] =
    useState<EventsTab>('settings');
  const [settingsForm, setSettingsForm] =
    useState<EventSettingsForm>(
      toSettingsForm(DEFAULT_EVENT_SETTINGS),
    );
  const [types, setTypes] =
    useState<EventTypeAdmin[]>([]);
  const [packages, setPackages] =
    useState<EventPackageAdmin[]>([]);
  const [extras, setExtras] =
    useState<EventExtraAdmin[]>([]);
  const [isLoading, setIsLoading] =
    useState(true);
  const [isProcessing, setIsProcessing] =
    useState(false);
  const [isReordering, setIsReordering] =
    useState(false);
  const [draggedId, setDraggedId] =
    useState<string | null>(null);
  const [dragKind, setDragKind] =
    useState<SortableKind | null>(null);

  const layouts = useRef<
    Record<SortableKind, Record<string, CardLayout>>
  >({
    types: {},
    packages: {},
    extras: {},
  });

  const [typeModalVisible, setTypeModalVisible] =
    useState(false);
  const [packageModalVisible, setPackageModalVisible] =
    useState(false);
  const [extraModalVisible, setExtraModalVisible] =
    useState(false);
  const [selectedType, setSelectedType] =
    useState<EventTypeAdmin | null>(null);
  const [selectedPackage, setSelectedPackage] =
    useState<EventPackageAdmin | null>(null);
  const [selectedExtra, setSelectedExtra] =
    useState<EventExtraAdmin | null>(null);
  const [typeForm, setTypeForm] =
    useState<EventTypeForm>(EMPTY_TYPE_FORM);
  const [packageForm, setPackageForm] =
    useState<EventPackageForm>(EMPTY_PACKAGE_FORM);
  const [extraForm, setExtraForm] =
    useState<EventExtraForm>(EMPTY_EXTRA_FORM);

  const loadData = async (): Promise<void> => {
    try {
      setIsLoading(true);
      const [settings, catalog] = await Promise.all([
        getEventSettings(),
        getEventAdminCatalog(),
      ]);
      setSettingsForm(toSettingsForm(settings));
      setTypes(catalog.types);
      setPackages(catalog.packages);
      setExtras(catalog.extras);
    } catch (error) {
      Alert.alert(
        'Error',
        error instanceof Error
          ? error.message
          : 'No se pudo cargar el módulo de eventos.',
      );
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  const handleSaveSettings = async (): Promise<void> => {
    try {
      setIsProcessing(true);
      await saveEventSettings({
        publicQuoteEnabled:
          settingsForm.publicQuoteEnabled,
        minGuests:
          Number(settingsForm.minGuests),
        maxGuests:
          Number(settingsForm.maxGuests),
        minAdvanceHours:
          Number(settingsForm.minAdvanceHours),
        maxAdvanceDays:
          Number(settingsForm.maxAdvanceDays),
        quoteDisclaimer:
          settingsForm.quoteDisclaimer,
        terms:
          settingsForm.terms,
          depositEnabled: settingsForm.depositEnabled,
          depositType: settingsForm.depositType,
          depositValue: Number(settingsForm.depositValue),
          depositDueDays: Number(settingsForm.depositDueDays),
          portalBaseUrl: settingsForm.portalBaseUrl,
          remindersEnabled: settingsForm.remindersEnabled,
          depositReminderDaysBefore: Number(settingsForm.depositReminderDaysBefore),
          eventReminderHoursBefore: Number(settingsForm.eventReminderHoursBefore),
          balanceReminderHoursBefore: Number(settingsForm.balanceReminderHoursBefore),
          checklistReminderHoursBefore: Number(settingsForm.checklistReminderHoursBefore),
      });
      Alert.alert(
        'Configuración guardada',
        'La configuración base de Eventos fue actualizada.',
      );
      await loadData();
    } catch (error) {
      Alert.alert(
        'Error',
        error instanceof Error
          ? error.message
          : 'No se pudo guardar la configuración.',
      );
    } finally {
      setIsProcessing(false);
    }
  };

  const handleProcessReminders = async (): Promise<void> => {
    try {
      setIsProcessing(true);
      await processEventRemindersAdmin();
      Alert.alert('Recordatorios procesados', 'Se revisaron los eventos y se despacharon los avisos pendientes.');
    } catch (error) {
      Alert.alert('Recordatorios', error instanceof Error ? error.message : 'No se pudieron procesar los recordatorios.');
    } finally {
      setIsProcessing(false);
    }
  };

  function handleLayout(
    kind: SortableKind,
    id: string,
    event: LayoutChangeEvent,
  ): void {
    const { y, height } = event.nativeEvent.layout;
    layouts.current[kind][id] = { y, height };
  }

  function handleDragStart(
    kind: SortableKind,
    id: string,
  ): void {
    if (isProcessing || isReordering) {
      return;
    }
    setDragKind(kind);
    setDraggedId(id);
  }

  async function persistOrder(
    kind: SortableKind,
    ids: string[],
  ): Promise<void> {
    if (kind === 'types') {
      await reorderEventTypes(ids);
      return;
    }
    if (kind === 'packages') {
      await reorderEventPackages(ids);
      return;
    }
    await reorderEventExtras(ids);
  }

  function handleDragEnd(
    kind: SortableKind,
    id: string,
    offsetY: number,
  ): void {
    setDraggedId(null);
    setDragKind(null);

    if (
      isProcessing ||
      isReordering ||
      Math.abs(offsetY) < 8
    ) {
      return;
    }

    const source =
      kind === 'types'
        ? types
        : kind === 'packages'
          ? packages
          : extras;
    const draggedLayout =
      layouts.current[kind][id];

    if (!draggedLayout) {
      return;
    }

    const draggedCenter =
      draggedLayout.y +
      draggedLayout.height / 2 +
      offsetY;
    const remaining = source.filter(
      item => item.id !== id,
    );
    let insertionIndex = 0;

    remaining.forEach(item => {
      const layout =
        layouts.current[kind][item.id];
      if (!layout) {
        return;
      }
      const center =
        layout.y + layout.height / 2;
      if (draggedCenter > center) {
        insertionIndex += 1;
      }
    });

    const currentIndex = source.findIndex(
      item => item.id === id,
    );
    if (
      currentIndex < 0 ||
      insertionIndex === currentIndex
    ) {
      return;
    }

    const next = [...source];
    const [dragged] = next.splice(currentIndex, 1);
    next.splice(insertionIndex, 0, dragged);

    if (kind === 'types') {
      setTypes(
        (next as EventTypeAdmin[]).map(
          (item, index) => ({
            ...item,
            position: index,
          }),
        ),
      );
    } else if (kind === 'packages') {
      setPackages(
        (next as EventPackageAdmin[]).map(
          (item, index) => ({
            ...item,
            position: index,
          }),
        ),
      );
    } else {
      setExtras(
        (next as EventExtraAdmin[]).map(
          (item, index) => ({
            ...item,
            position: index,
          }),
        ),
      );
    }

    void (async () => {
      try {
        setIsReordering(true);
        await persistOrder(
          kind,
          next.map(item => item.id),
        );
      } catch (error) {
        Alert.alert(
          'No se pudo reordenar',
          error instanceof Error
            ? error.message
            : 'No se pudo guardar el nuevo orden.',
        );
        await loadData();
      } finally {
        setIsReordering(false);
      }
    })();
  }

  const openCreateType = (): void => {
    setSelectedType(null);
    setTypeForm({ ...EMPTY_TYPE_FORM });
    setTypeModalVisible(true);
  };

  const openEditType = (
    item: EventTypeAdmin,
  ): void => {
    setSelectedType(item);
    setTypeForm({
      name: item.name,
      description: item.description,
      isActive: item.isActive,
    });
    setTypeModalVisible(true);
  };

  const handleSaveType = async (): Promise<void> => {
    try {
      setIsProcessing(true);
      await saveEventType({
        id: selectedType?.id,
        ...typeForm,
      });
      setTypeModalVisible(false);
      await loadData();
    } catch (error) {
      Alert.alert(
        'Error',
        error instanceof Error
          ? error.message
          : 'No se pudo guardar el tipo de evento.',
      );
    } finally {
      setIsProcessing(false);
    }
  };

  const openCreatePackage = (): void => {
    setSelectedPackage(null);
    setPackageForm({
      ...EMPTY_PACKAGE_FORM,
      eventTypeId:
        types.find(item => item.isActive)?.id ?? null,
    });
    setPackageModalVisible(true);
  };

  const openEditPackage = (
    item: EventPackageAdmin,
  ): void => {
    setSelectedPackage(item);
    setPackageForm({
      eventTypeId: item.eventTypeId,
      name: item.name,
      description: item.description,
      basePrice: String(item.basePrice),
      includedGuests: String(item.includedGuests),
      extraGuestPrice: String(item.extraGuestPrice),
      durationMinutes: String(item.durationMinutes),
      extraIds: [...item.extraIds],
      isActive: item.isActive,
    });
    setPackageModalVisible(true);
  };

  const handleSavePackage = async (): Promise<void> => {
    try {
      setIsProcessing(true);
      await saveEventPackage({
        id: selectedPackage?.id,
        eventTypeId: packageForm.eventTypeId,
        name: packageForm.name,
        description: packageForm.description,
        basePrice: Number(packageForm.basePrice),
        includedGuests: Number(packageForm.includedGuests),
        extraGuestPrice: Number(packageForm.extraGuestPrice),
        durationMinutes: Number(packageForm.durationMinutes),
        extraIds: packageForm.extraIds,
        isActive: packageForm.isActive,
      });
      setPackageModalVisible(false);
      await loadData();
    } catch (error) {
      Alert.alert(
        'Error',
        error instanceof Error
          ? error.message
          : 'No se pudo guardar el paquete.',
      );
    } finally {
      setIsProcessing(false);
    }
  };

  const openCreateExtra = (): void => {
    setSelectedExtra(null);
    setExtraForm({ ...EMPTY_EXTRA_FORM });
    setExtraModalVisible(true);
  };

  const openEditExtra = (
    item: EventExtraAdmin,
  ): void => {
    setSelectedExtra(item);
    setExtraForm({
      name: item.name,
      description: item.description,
      pricingType: item.pricingType,
      price: String(item.price),
      isActive: item.isActive,
    });
    setExtraModalVisible(true);
  };

  const handleSaveExtra = async (): Promise<void> => {
    try {
      setIsProcessing(true);
      await saveEventExtra({
        id: selectedExtra?.id,
        name: extraForm.name,
        description: extraForm.description,
        pricingType: extraForm.pricingType,
        price: Number(extraForm.price),
        isActive: extraForm.isActive,
      });
      setExtraModalVisible(false);
      await loadData();
    } catch (error) {
      Alert.alert(
        'Error',
        error instanceof Error
          ? error.message
          : 'No se pudo guardar el extra.',
      );
    } finally {
      setIsProcessing(false);
    }
  };

  const toggleType = async (
    item: EventTypeAdmin,
    value: boolean,
  ): Promise<void> => {
    try {
      setIsProcessing(true);
      await setEventTypeActive(item.id, value);
      await loadData();
    } catch (error) {
      Alert.alert(
        'Error',
        error instanceof Error
          ? error.message
          : 'No se pudo actualizar el tipo.',
      );
    } finally {
      setIsProcessing(false);
    }
  };

  const togglePackage = async (
    item: EventPackageAdmin,
    value: boolean,
  ): Promise<void> => {
    try {
      setIsProcessing(true);
      await setEventPackageActive(item.id, value);
      await loadData();
    } catch (error) {
      Alert.alert(
        'Error',
        error instanceof Error
          ? error.message
          : 'No se pudo actualizar el paquete.',
      );
    } finally {
      setIsProcessing(false);
    }
  };

  const toggleExtra = async (
    item: EventExtraAdmin,
    value: boolean,
  ): Promise<void> => {
    try {
      setIsProcessing(true);
      await setEventExtraActive(item.id, value);
      await loadData();
    } catch (error) {
      Alert.alert(
        'Error',
        error instanceof Error
          ? error.message
          : 'No se pudo actualizar el extra.',
      );
    } finally {
      setIsProcessing(false);
    }
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator
          size="large"
          color={theme.primary}
        />
        <Text
          style={[
            styles.loadingText,
            { color: theme.textMuted },
          ]}
        >
          Cargando eventos...
        </Text>
      </View>
    );
  }

  const tabs: Array<{
    key: EventsTab;
    label: string;
  }> = [
    { key: 'settings', label: 'CONFIGURACIÓN' },
    { key: 'availability', label: 'DISPONIBILIDAD' },
    { key: 'types', label: `TIPOS (${types.length})` },
    { key: 'packages', label: `PAQUETES (${packages.length})` },
    { key: 'extras', label: `EXTRAS (${extras.length})` },
  ];

  return (
    <>
      <ScrollView
        style={styles.container}
        contentContainerStyle={[
          styles.content,
          isPhone && styles.contentPhone,
        ]}
        keyboardShouldPersistTaps="handled"
        scrollEnabled={!draggedId}
      >
        <View style={styles.header}>
          <Text
            style={[
              styles.title,
              isPhone && styles.titlePhone,
              { color: theme.text },
            ]}
          >
            Eventos
          </Text>
          <Text
            style={[
              styles.subtitle,
              { color: theme.textMuted },
            ]}
          >
            Configura el cotizador, los tipos de evento, paquetes y extras disponibles para tus clientes.
          </Text>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabs}
        >
          {tabs.map(tab => {
            const selected = activeTab === tab.key;
            return (
              <TouchableOpacity
                key={tab.key}
                style={[
                  styles.tabButton,
                  {
                    borderColor: selected
                      ? theme.primary
                      : theme.border,
                    backgroundColor: selected
                      ? theme.surfaceAlt
                      : theme.surface,
                  },
                ]}
                onPress={() => setActiveTab(tab.key)}
              >
                <Text
                  style={[
                    styles.tabButtonText,
                    {
                      color: selected
                        ? theme.primary
                        : theme.textMuted,
                    },
                  ]}
                >
                  {tab.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>


        {activeTab === 'settings' ? (
          <SettingsSection
            form={settingsForm}
            setForm={setSettingsForm}
            isPhone={isPhone}
            isProcessing={isProcessing}
            theme={theme}
            onSave={handleSaveSettings}
            onProcessReminders={handleProcessReminders}
          />
        ) : null}

        {activeTab === 'availability' ? (
          <AdminEventAvailability isPhone={isPhone} />
        ) : null}

        {activeTab === 'types' ? (
          <CatalogSectionHeader
            title="Tipos de evento"
            subtitle="Ej. cumpleaños, evento empresarial, reunión familiar. Arrastra ≡ para cambiar el orden."
            buttonLabel="+ Nuevo tipo"
            isPhone={isPhone}
            theme={theme}
            onPress={openCreateType}
          />
        ) : null}

        {activeTab === 'types' && types.length === 0 ? (
          <EmptyState
            text="Todavía no hay tipos de evento."
            theme={theme}
          />
        ) : null}

        {activeTab === 'types'
          ? types.map(item => (
              <SortableCard
                key={item.id}
                id={item.id}
                isDisabled={isProcessing || isReordering}
                isDragging={
                  dragKind === 'types' &&
                  draggedId === item.id
                }
                theme={theme}
                onLayout={(id, event) =>
                  handleLayout('types', id, event)
                }
                onDragStart={id =>
                  handleDragStart('types', id)
                }
                onDragEnd={(id, offsetY) =>
                  handleDragEnd('types', id, offsetY)
                }
              >
                <CatalogBody
                  title={item.name}
                  description={item.description}
                  meta={`Posición ${item.position + 1}`}
                  isPhone={isPhone}
                  isActive={item.isActive}
                  isDisabled={isProcessing || isReordering}
                  theme={theme}
                  onToggle={(value: boolean) => {
                    void toggleType(item, value);
                  }}
                  onEdit={() => openEditType(item)}
                />
              </SortableCard>
            ))
          : null}

        {activeTab === 'packages' ? (
          <CatalogSectionHeader
            title="Paquetes"
            subtitle="Define el precio base, personas incluidas, duración y costo por persona adicional."
            buttonLabel="+ Nuevo paquete"
            isPhone={isPhone}
            theme={theme}
            onPress={openCreatePackage}
          />
        ) : null}

        {activeTab === 'packages' && packages.length === 0 ? (
          <EmptyState
            text="Todavía no hay paquetes de evento."
            theme={theme}
          />
        ) : null}

        {activeTab === 'packages'
          ? packages.map(item => (
              <SortableCard
                key={item.id}
                id={item.id}
                isDisabled={isProcessing || isReordering}
                isDragging={
                  dragKind === 'packages' &&
                  draggedId === item.id
                }
                theme={theme}
                onLayout={(id, event) =>
                  handleLayout('packages', id, event)
                }
                onDragStart={id =>
                  handleDragStart('packages', id)
                }
                onDragEnd={(id, offsetY) =>
                  handleDragEnd('packages', id, offsetY)
                }
              >
                <CatalogBody
                  title={item.name}
                  description={item.description}
                  meta={`${item.eventTypeName || 'Todos los tipos'} · $${item.basePrice.toFixed(2)} · ${item.includedGuests} personas · ${item.durationMinutes} min · ${item.extraIds.length} ${item.extraIds.length === 1 ? 'extra' : 'extras'}`}
                  isPhone={isPhone}
                  isActive={item.isActive}
                  isDisabled={isProcessing || isReordering}
                  theme={theme}
                  onToggle={(value: boolean) => {
                    void togglePackage(item, value);
                  }}
                  onEdit={() => openEditPackage(item)}
                />
              </SortableCard>
            ))
          : null}

        {activeTab === 'extras' ? (
          <CatalogSectionHeader
            title="Extras"
            subtitle="Agrega servicios o complementos opcionales y después selecciónalos dentro de cada paquete."
            buttonLabel="+ Nuevo extra"
            isPhone={isPhone}
            theme={theme}
            onPress={openCreateExtra}
          />
        ) : null}

        {activeTab === 'extras' && extras.length === 0 ? (
          <EmptyState
            text="Todavía no hay extras configurados."
            theme={theme}
          />
        ) : null}

        {activeTab === 'extras'
          ? extras.map(item => (
              <SortableCard
                key={item.id}
                id={item.id}
                isDisabled={isProcessing || isReordering}
                isDragging={
                  dragKind === 'extras' &&
                  draggedId === item.id
                }
                theme={theme}
                onLayout={(id, event) =>
                  handleLayout('extras', id, event)
                }
                onDragStart={id =>
                  handleDragStart('extras', id)
                }
                onDragEnd={(id, offsetY) =>
                  handleDragEnd('extras', id, offsetY)
                }
              >
                <CatalogBody
                  title={item.name}
                  description={item.description}
                  meta={`${pricingLabel(item.pricingType)} · $${item.price.toFixed(2)}`}
                  isPhone={isPhone}
                  isActive={item.isActive}
                  isDisabled={isProcessing || isReordering}
                  theme={theme}
                  onToggle={(value: boolean) => {
                    void toggleExtra(item, value);
                  }}
                  onEdit={() => openEditExtra(item)}
                />
              </SortableCard>
            ))
          : null}
      </ScrollView>

      <SimpleModal
        visible={typeModalVisible}
        title={selectedType ? 'Editar tipo' : 'Nuevo tipo'}
        theme={theme}
        isPhone={isPhone}
        isProcessing={isProcessing}
        onClose={() => setTypeModalVisible(false)}
        onSave={() => {
          void handleSaveType();
        }}
      >
        <Field
          label="Nombre"
          value={typeForm.name}
          onChangeText={(value: string) =>
            setTypeForm(current => ({
              ...current,
              name: value,
            }))
          }
          placeholder="Ej. Cumpleaños"
          theme={theme}
        />
        <Field
          label="Descripción"
          value={typeForm.description}
          onChangeText={(value: string) =>
            setTypeForm(current => ({
              ...current,
              description: value,
            }))
          }
          placeholder="Descripción opcional"
          theme={theme}
          multiline
        />
        <ActiveSwitch
          value={typeForm.isActive}
          onChange={(value: boolean) =>
            setTypeForm(current => ({
              ...current,
              isActive: value,
            }))
          }
          theme={theme}
        />
      </SimpleModal>

      <SimpleModal
        visible={packageModalVisible}
        title={selectedPackage ? 'Editar paquete' : 'Nuevo paquete'}
        theme={theme}
        isPhone={isPhone}
        isProcessing={isProcessing}
        onClose={() => setPackageModalVisible(false)}
        onSave={() => {
          void handleSavePackage();
        }}
      >
        <Text style={[styles.label, { color: theme.textMuted }]}>
          Tipo de evento
        </Text>
        <View style={styles.choiceWrap}>
          <Choice
            selected={packageForm.eventTypeId === null}
            label="Todos"
            theme={theme}
            onPress={() =>
              setPackageForm(current => ({
                ...current,
                eventTypeId: null,
              }))
            }
          />
          {types.map(item => (
            <Choice
              key={item.id}
              selected={packageForm.eventTypeId === item.id}
              label={item.name}
              theme={theme}
              onPress={() =>
                setPackageForm(current => ({
                  ...current,
                  eventTypeId: item.id,
                }))
              }
            />
          ))}
        </View>
        <Field
          label="Nombre"
          value={packageForm.name}
          onChangeText={(value: string) =>
            setPackageForm(current => ({
              ...current,
              name: value,
            }))
          }
          placeholder="Ej. Paquete Kong"
          theme={theme}
        />
        <Field
          label="Descripción"
          value={packageForm.description}
          onChangeText={(value: string) =>
            setPackageForm(current => ({
              ...current,
              description: value,
            }))
          }
          placeholder="Qué incluye este paquete"
          theme={theme}
          multiline
        />
        <View style={[styles.twoColumns, isPhone && styles.twoColumnsPhone]}>
          <View style={styles.column}>
            <Field
              label="Precio base"
              value={packageForm.basePrice}
              onChangeText={(value: string) =>
                setPackageForm(current => ({
                  ...current,
                  basePrice: value,
                }))
              }
              placeholder="0.00"
              theme={theme}
              keyboardType="numeric"
            />
          </View>
          <View style={styles.column}>
            <Field
              label="Personas incluidas"
              value={packageForm.includedGuests}
              onChangeText={(value: string) =>
                setPackageForm(current => ({
                  ...current,
                  includedGuests: value,
                }))
              }
              placeholder="20"
              theme={theme}
              keyboardType="numeric"
            />
          </View>
        </View>
        <View style={[styles.twoColumns, isPhone && styles.twoColumnsPhone]}>
          <View style={styles.column}>
            <Field
              label="Precio persona adicional"
              value={packageForm.extraGuestPrice}
              onChangeText={(value: string) =>
                setPackageForm(current => ({
                  ...current,
                  extraGuestPrice: value,
                }))
              }
              placeholder="0.00"
              theme={theme}
              keyboardType="numeric"
            />
          </View>
          <View style={styles.column}>
            <Field
              label="Duración (minutos)"
              value={packageForm.durationMinutes}
              onChangeText={(value: string) =>
                setPackageForm(current => ({
                  ...current,
                  durationMinutes: value,
                }))
              }
              placeholder="120"
              theme={theme}
              keyboardType="numeric"
            />
          </View>
        </View>
        <Text style={[styles.label, { color: theme.textMuted }]}>
          Extras disponibles para este paquete
        </Text>
        <Text style={[styles.helperText, { color: theme.textMuted }]}>
          Selecciona los extras que el cliente podrá agregar cuando elija este paquete.
        </Text>
        {extras.length === 0 ? (
          <View style={[styles.inlineEmpty, { borderColor: theme.border }]}>
            <Text style={[styles.inlineEmptyText, { color: theme.textMuted }]}>
              Primero crea al menos un extra en la pestaña EXTRAS.
            </Text>
          </View>
        ) : (
          <View style={styles.extraSelectionList}>
            {extras.map(extra => {
              const selected = packageForm.extraIds.includes(extra.id);
              return (
                <TouchableOpacity
                  key={extra.id}
                  style={[
                    styles.extraSelectionItem,
                    {
                      borderColor: selected ? theme.primary : theme.border,
                      backgroundColor: selected ? theme.surfaceAlt : theme.surface,
                    },
                    !extra.isActive && styles.extraSelectionItemDisabled,
                  ]}
                  onPress={() =>
                    setPackageForm(current => ({
                      ...current,
                      extraIds: selected
                        ? current.extraIds.filter(id => id !== extra.id)
                        : [...current.extraIds, extra.id],
                    }))
                  }
                >
                  <View style={styles.extraSelectionInfo}>
                    <Text style={[styles.extraSelectionName, { color: theme.text }]}>
                      {selected ? '✓ ' : ''}{extra.name}
                    </Text>
                    <Text style={[styles.extraSelectionMeta, { color: theme.textMuted }]}>
                      {pricingLabel(extra.pricingType)} · ${extra.price.toFixed(2)}
                      {!extra.isActive ? ' · INACTIVO' : ''}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        )}
        <ActiveSwitch
          value={packageForm.isActive}
          onChange={(value: boolean) =>
            setPackageForm(current => ({
              ...current,
              isActive: value,
            }))
          }
          theme={theme}
        />
      </SimpleModal>

      <SimpleModal
        visible={extraModalVisible}
        title={selectedExtra ? 'Editar extra' : 'Nuevo extra'}
        theme={theme}
        isPhone={isPhone}
        isProcessing={isProcessing}
        onClose={() => setExtraModalVisible(false)}
        onSave={() => {
          void handleSaveExtra();
        }}
      >
        <Field
          label="Nombre"
          value={extraForm.name}
          onChangeText={(value: string) =>
            setExtraForm(current => ({
              ...current,
              name: value,
            }))
          }
          placeholder="Ej. Mesa de postres"
          theme={theme}
        />
        <Field
          label="Descripción"
          value={extraForm.description}
          onChangeText={(value: string) =>
            setExtraForm(current => ({
              ...current,
              description: value,
            }))
          }
          placeholder="Descripción opcional"
          theme={theme}
          multiline
        />
        <Text style={[styles.label, { color: theme.textMuted }]}>
          Forma de cobro
        </Text>
        <View style={styles.choiceWrap}>
          {(
            [
              ['fixed', 'Precio fijo'],
              ['per_guest', 'Por persona'],
              ['per_unit', 'Por unidad'],
            ] as Array<[EventExtraPricingType, string]>
          ).map(([value, label]) => (
            <Choice
              key={value}
              selected={extraForm.pricingType === value}
              label={label}
              theme={theme}
              onPress={() =>
                setExtraForm(current => ({
                  ...current,
                  pricingType: value,
                }))
              }
            />
          ))}
        </View>
        <Field
          label="Precio"
          value={extraForm.price}
          onChangeText={(value: string) =>
            setExtraForm(current => ({
              ...current,
              price: value,
            }))
          }
          placeholder="0.00"
          theme={theme}
          keyboardType="numeric"
        />
        <ActiveSwitch
          value={extraForm.isActive}
          onChange={(value: boolean) =>
            setExtraForm(current => ({
              ...current,
              isActive: value,
            }))
          }
          theme={theme}
        />
      </SimpleModal>
    </>
  );
}

function SettingsSection({
  form,
  setForm,
  isPhone,
  isProcessing,
  theme,
  onSave,
  onProcessReminders,
}: {
  form: EventSettingsForm;
  setForm: React.Dispatch<React.SetStateAction<EventSettingsForm>>;
  isPhone: boolean;
  isProcessing: boolean;
  theme: any;
  onSave: () => Promise<void>;
  onProcessReminders: () => Promise<void>;
}) {
  return (
    <>
      <View
        style={[
          styles.card,
          isPhone && styles.cardPhone,
          {
            backgroundColor: theme.surface,
            borderColor: theme.border,
          },
        ]}
      >
        <Text style={[styles.cardTitle, { color: theme.text }]}>Cotizador público</Text>
        <Text style={[styles.cardSubtitle, { color: theme.textMuted }]}>
          Controla si el cliente puede iniciar una cotización de evento desde la web.
        </Text>
        <View style={styles.switchRow}>
          <View style={styles.switchText}>
            <Text style={{ color: theme.text, fontWeight: '800' }}>Publicar cotizador</Text>
            <Text style={{ color: theme.textMuted, marginTop: 3, fontSize: 12 }}>
              El módulo Eventos puede estar contratado aunque el cotizador permanezca temporalmente oculto.
            </Text>
          </View>
          <Switch
            value={form.publicQuoteEnabled}
            onValueChange={(value: boolean) =>
              setForm(current => ({ ...current, publicQuoteEnabled: value }))
            }
          />
        </View>
      </View>

      <View
        style={[
          styles.card,
          isPhone && styles.cardPhone,
          { backgroundColor: theme.surface, borderColor: theme.border },
        ]}
      >
        <Text style={[styles.cardTitle, { color: theme.text }]}>Límites de cotización</Text>
        <Text style={[styles.cardSubtitle, { color: theme.textMuted }]}>
          Define el rango de personas y la anticipación permitida para una solicitud.
        </Text>
        <View style={[styles.twoColumns, isPhone && styles.twoColumnsPhone]}>
          <View style={styles.column}>
            <Field
              label="Mínimo de personas"
              value={form.minGuests}
              onChangeText={(value: string) => setForm(current => ({ ...current, minGuests: value }))}
              placeholder="1"
              theme={theme}
              keyboardType="numeric"
            />
          </View>
          <View style={styles.column}>
            <Field
              label="Máximo de personas"
              value={form.maxGuests}
              onChangeText={(value: string) => setForm(current => ({ ...current, maxGuests: value }))}
              placeholder="200"
              theme={theme}
              keyboardType="numeric"
            />
          </View>
        </View>
        <View style={[styles.twoColumns, isPhone && styles.twoColumnsPhone]}>
          <View style={styles.column}>
            <Field
              label="Anticipación mínima (horas)"
              value={form.minAdvanceHours}
              onChangeText={(value: string) => setForm(current => ({ ...current, minAdvanceHours: value }))}
              placeholder="24"
              theme={theme}
              keyboardType="numeric"
            />
          </View>
          <View style={styles.column}>
            <Field
              label="Máximo hacia adelante (días)"
              value={form.maxAdvanceDays}
              onChangeText={(value: string) => setForm(current => ({ ...current, maxAdvanceDays: value }))}
              placeholder="180"
              theme={theme}
              keyboardType="numeric"
            />
          </View>
        </View>
      </View>

      <View
        style={[
          styles.card,
          isPhone && styles.cardPhone,
          { backgroundColor: theme.surface, borderColor: theme.border },
        ]}
      >
        <Text style={[styles.cardTitle, { color: theme.text }]}>Anticipo y confirmación</Text>
        <Text style={[styles.cardSubtitle, { color: theme.textMuted }]}>Configura cuánto debe pagar el cliente para que una solicitud aceptada pase a evento confirmado.</Text>
        <View style={styles.switchRow}>
          <View style={styles.switchText}>
            <Text style={{ color: theme.text, fontWeight: '800' }}>Solicitar anticipo</Text>
            <Text style={{ color: theme.textMuted, marginTop: 3, fontSize: 12 }}>El anticipo se congela al aceptar la solicitud y los pagos se registran como movimientos históricos.</Text>
          </View>
          <Switch
            value={form.depositEnabled}
            onValueChange={(value: boolean) => setForm(current => ({ ...current, depositEnabled: value }))}
          />
        </View>

        {form.depositEnabled ? (
          <>
            <Text style={[styles.label, { color: theme.textMuted, marginTop: 12 }]}>Tipo de anticipo</Text>
            <View style={styles.choiceWrap}>
              {[
                { value: 'percentage' as const, label: 'PORCENTAJE' },
                { value: 'fixed' as const, label: 'MONTO FIJO' },
              ].map(option => {
                const selected = form.depositType === option.value;
                return (
                  <TouchableOpacity
                    key={option.value}
                    style={[
                      styles.choice,
                      {
                        borderColor: selected ? theme.primary : theme.border,
                        backgroundColor: selected ? theme.surfaceAlt : theme.surface,
                      },
                    ]}
                    onPress={() => setForm(current => ({ ...current, depositType: option.value }))}
                  >
                    <Text style={[styles.choiceText, { color: selected ? theme.primary : theme.textMuted }]}>{option.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            <View style={[styles.twoColumns, isPhone && styles.twoColumnsPhone]}>
              <View style={styles.column}>
                <Field
                  label={form.depositType === 'percentage' ? 'Anticipo (%)' : 'Anticipo fijo'}
                  value={form.depositValue}
                  onChangeText={(value: string) => setForm(current => ({ ...current, depositValue: value }))}
                  placeholder={form.depositType === 'percentage' ? '50' : '1000'}
                  theme={theme}
                  keyboardType="decimal-pad"
                />
              </View>
              <View style={styles.column}>
                <Field
                  label="Plazo para pagar (días)"
                  value={form.depositDueDays}
                  onChangeText={(value: string) => setForm(current => ({ ...current, depositDueDays: value }))}
                  placeholder="2"
                  theme={theme}
                  keyboardType="numeric"
                />
              </View>
            </View>
          </>
        ) : null}
      </View>

      <View
        style={[
          styles.card,
          isPhone && styles.cardPhone,
          { backgroundColor: theme.surface, borderColor: theme.border },
        ]}
      >
        <Text style={[styles.cardTitle, { color: theme.text }]}>Recordatorios automáticos</Text>
        <Text style={[styles.cardSubtitle, { color: theme.textMuted }]}>
          Envía avisos internos al POS para anticipos, eventos próximos, saldos pendientes y checklist operativo.
        </Text>
        <View style={styles.switchRow}>
          <View style={styles.switchText}>
            <Text style={{ color: theme.text, fontWeight: '800' }}>Activar recordatorios</Text>
            <Text style={{ color: theme.textMuted, marginTop: 3, fontSize: 12 }}>Se procesan automáticamente y cada aviso se registra una sola vez por evento.</Text>
          </View>
          <Switch
            value={form.remindersEnabled}
            onValueChange={(value: boolean) => setForm(current => ({ ...current, remindersEnabled: value }))}
          />
        </View>
        {form.remindersEnabled ? (
          <>
            <TouchableOpacity
              style={[styles.secondaryButton, { borderColor: theme.border, backgroundColor: theme.surfaceAlt, marginTop: 12 }]}
              disabled={isProcessing}
              onPress={() => { void onProcessReminders(); }}
            >
              <Text style={[styles.secondaryButtonText, { color: theme.text }]}>PROCESAR RECORDATORIOS AHORA</Text>
            </TouchableOpacity>
            <View style={[styles.twoColumns, isPhone && styles.twoColumnsPhone]}>
              <View style={styles.column}>
                <Field
                  label="Anticipo: días antes del vencimiento"
                  value={form.depositReminderDaysBefore}
                  onChangeText={(value: string) => setForm(current => ({ ...current, depositReminderDaysBefore: value }))}
                  placeholder="1"
                  theme={theme}
                  keyboardType="numeric"
                />
              </View>
              <View style={styles.column}>
                <Field
                  label="Evento próximo: horas antes"
                  value={form.eventReminderHoursBefore}
                  onChangeText={(value: string) => setForm(current => ({ ...current, eventReminderHoursBefore: value }))}
                  placeholder="24"
                  theme={theme}
                  keyboardType="numeric"
                />
              </View>
            </View>
            <View style={[styles.twoColumns, isPhone && styles.twoColumnsPhone]}>
              <View style={styles.column}>
                <Field
                  label="Saldo pendiente: horas antes"
                  value={form.balanceReminderHoursBefore}
                  onChangeText={(value: string) => setForm(current => ({ ...current, balanceReminderHoursBefore: value }))}
                  placeholder="24"
                  theme={theme}
                  keyboardType="numeric"
                />
              </View>
              <View style={styles.column}>
                <Field
                  label="Checklist incompleto: horas antes"
                  value={form.checklistReminderHoursBefore}
                  onChangeText={(value: string) => setForm(current => ({ ...current, checklistReminderHoursBefore: value }))}
                  placeholder="6"
                  theme={theme}
                  keyboardType="numeric"
                />
              </View>
            </View>
          </>
        ) : null}
      </View>

      <View
        style={[
          styles.card,
          isPhone && styles.cardPhone,
          { backgroundColor: theme.surface, borderColor: theme.border },
        ]}
      >
        <Text style={[styles.cardTitle, { color: theme.text }]}>Portal del cliente</Text>
        <Text style={[styles.cardSubtitle, { color: theme.textMuted }]}>
          Dominio público usado para generar enlaces seguros de cotización desde el POS. En producción usa la URL pública del sitio del cliente.
        </Text>
        <Field
          label="URL pública base"
          value={form.portalBaseUrl}
          onChangeText={(value: string) => setForm(current => ({ ...current, portalBaseUrl: value }))}
          placeholder="https://eventos.tunegocio.com"
          theme={theme}
        />
        <Text style={{ color: theme.textMuted, fontSize: 11, lineHeight: 17 }}>
          Ejemplo de enlace: {form.portalBaseUrl.trim() || 'https://tu-dominio.com'}/eventos/cotizacion/...
        </Text>
      </View>

      <View
        style={[
          styles.card,
          isPhone && styles.cardPhone,
          { backgroundColor: theme.surface, borderColor: theme.border },
        ]}
      >
        <Text style={[styles.cardTitle, { color: theme.text }]}>Mensajes y condiciones</Text>
        <Text style={[styles.cardSubtitle, { color: theme.textMuted }]}>
          Estos textos se mostrarán en el flujo público del cotizador.
        </Text>
        <Field
          label="Aviso de cotización"
          value={form.quoteDisclaimer}
          onChangeText={(value: string) => setForm(current => ({ ...current, quoteDisclaimer: value }))}
          placeholder="La cotización es estimada..."
          theme={theme}
          multiline
        />
        <Field
          label="Condiciones generales"
          value={form.terms}
          onChangeText={(value: string) => setForm(current => ({ ...current, terms: value }))}
          placeholder="Condiciones opcionales"
          theme={theme}
          multiline
        />
      </View>

      <TouchableOpacity
        style={[
          styles.saveButton,
          { backgroundColor: theme.primary },
          isProcessing && styles.saveButtonDisabled,
        ]}
        disabled={isProcessing}
        onPress={() => { void onSave(); }}
      >
        <Text style={[styles.saveButtonText, { color: theme.onPrimary }]}>
          {isProcessing ? 'Guardando...' : 'Guardar configuración'}
        </Text>
      </TouchableOpacity>
    </>
  );
}

function CatalogSectionHeader({
  title,
  subtitle,
  buttonLabel,
  isPhone,
  theme,
  onPress,
}: any) {
  return (
    <View style={[styles.catalogHeader, isPhone && styles.catalogHeaderPhone]}>
      <View style={styles.catalogHeaderText}>
        <Text style={[styles.cardTitle, { color: theme.text }]}>{title}</Text>
        <Text style={[styles.catalogSubtitle, { color: theme.textMuted }]}>{subtitle}</Text>
      </View>
      <TouchableOpacity
        style={[
          styles.primaryButton,
          isPhone && styles.primaryButtonPhone,
          { backgroundColor: theme.primary },
        ]}
        onPress={onPress}
      >
        <Text style={[styles.primaryButtonText, { color: theme.onPrimary }]}>
          {buttonLabel}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

function CatalogBody({
  title,
  description,
  meta,
  isPhone,
  isActive,
  isDisabled,
  theme,
  onToggle,
  onEdit,
}: any) {
  return (
    <View style={[styles.catalogBody, isPhone && styles.catalogBodyPhone]}>
      <View style={styles.catalogInfo}>
        <View style={styles.catalogTitleRow}>
          <Text style={[styles.catalogTitle, { color: theme.text }]}>{title}</Text>
          <View
            style={[
              styles.statusBadge,
              { backgroundColor: isActive ? theme.surfaceAlt : theme.border },
            ]}
          >
            <Text style={[styles.statusBadgeText, { color: isActive ? theme.primary : theme.textMuted }]}>
              {isActive ? 'ACTIVO' : 'INACTIVO'}
            </Text>
          </View>
        </View>
        {description ? (
          <Text style={[styles.catalogDescription, { color: theme.textMuted }]}>
            {description}
          </Text>
        ) : null}
        <Text style={[styles.catalogMeta, { color: theme.textMuted }]}>{meta}</Text>
      </View>
      <View style={[styles.catalogActions, isPhone && styles.catalogActionsPhone]}>
        <Switch
          value={isActive}
          disabled={isDisabled}
          onValueChange={onToggle}
        />
        <TouchableOpacity
          style={[styles.secondaryButton, { borderColor: theme.border, backgroundColor: theme.surfaceAlt }]}
          disabled={isDisabled}
          onPress={onEdit}
        >
          <Text style={[styles.secondaryButtonText, { color: theme.text }]}>EDITAR</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function EmptyState({ text, theme }: any) {
  return (
    <View style={[styles.emptyState, { borderColor: theme.border, backgroundColor: theme.surface }]}>
      <Text style={[styles.emptyStateText, { color: theme.textMuted }]}>{text}</Text>
    </View>
  );
}

function Field({
  label,
  value,
  onChangeText,
  placeholder,
  theme,
  multiline = false,
  keyboardType = 'default',
}: any) {
  return (
    <View style={styles.field}>
      <Text style={[styles.label, { color: theme.textMuted }]}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#707070"
        keyboardType={keyboardType}
        multiline={multiline}
        style={[
          styles.input,
          multiline && styles.multiline,
          {
            color: theme.text,
            borderColor: theme.border,
            backgroundColor: theme.surfaceAlt,
          },
        ]}
      />
    </View>
  );
}

function Choice({ selected, label, theme, onPress }: any) {
  return (
    <TouchableOpacity
      style={[
        styles.choice,
        {
          borderColor: selected ? theme.primary : theme.border,
          backgroundColor: selected ? theme.surfaceAlt : theme.surface,
        },
      ]}
      onPress={onPress}
    >
      <Text style={[styles.choiceText, { color: selected ? theme.primary : theme.textMuted }]}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

function ActiveSwitch({ value, onChange, theme }: any) {
  return (
    <View style={styles.activeSwitchRow}>
      <View style={styles.switchText}>
        <Text style={{ color: theme.text, fontWeight: '800' }}>Activo</Text>
        <Text style={{ color: theme.textMuted, marginTop: 3, fontSize: 12 }}>
          Los elementos inactivos no se mostrarán en el cotizador público.
        </Text>
      </View>
      <Switch value={value} onValueChange={onChange} />
    </View>
  );
}

function SimpleModal({
  visible,
  title,
  theme,
  isPhone,
  isProcessing,
  onClose,
  onSave,
  children,
}: any) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalBackdrop}>
        <View
          style={[
            styles.modalCard,
            isPhone && styles.modalCardPhone,
            { backgroundColor: theme.surface, borderColor: theme.border },
          ]}
        >
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: theme.text }]}>{title}</Text>
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <Text style={[styles.closeButtonText, { color: theme.textMuted }]}>✕</Text>
            </TouchableOpacity>
          </View>
          <ScrollView
            style={styles.modalScroll}
            contentContainerStyle={styles.modalContent}
            keyboardShouldPersistTaps="handled"
          >
            {children}
          </ScrollView>
          <View style={[styles.modalFooter, { borderTopColor: theme.border }]}>
            <TouchableOpacity
              style={[styles.modalCancelButton, { borderColor: theme.border }]}
              disabled={isProcessing}
              onPress={onClose}
            >
              <Text style={[styles.modalCancelText, { color: theme.text }]}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modalSaveButton, { backgroundColor: theme.primary }, isProcessing && styles.saveButtonDisabled]}
              disabled={isProcessing}
              onPress={onSave}
            >
              <Text style={[styles.modalSaveText, { color: theme.onPrimary }]}>
                {isProcessing ? 'Guardando...' : 'Guardar'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function pricingLabel(
  value: EventExtraPricingType,
): string {
  if (value === 'per_guest') {
    return 'Por persona';
  }
  if (value === 'per_unit') {
    return 'Por unidad';
  }
  return 'Precio fijo';
}
