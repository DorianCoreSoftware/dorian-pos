import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { useBusiness } from '../../context/BusinessContext';
import {
  AttendanceNotificationItem,
  AttendanceNotificationPreferences,
  getAttendanceNotificationPreferences,
  getMyAttendanceNotifications,
  markAllAttendanceNotificationsRead,
  saveAttendanceNotificationPreferences,
  markAttendanceNotificationRead,
  syncAttendanceNotifications,
} from '../../services/attendanceService';

type NotificationDateFilter = 'today' | '7d' | '30d' | 'all';
type NotificationReadFilter = 'all' | 'unread' | 'read';
type NotificationCategoryFilter =
  | 'all'
  | 'attendance'
  | 'requests'
  | 'payroll'
  | 'shifts';

function formatDate(value: string): string {
  return new Intl.DateTimeFormat('es-MX', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

function iconFor(item: AttendanceNotificationItem): string {
  switch (item.notificationType) {
    case 'shift_start_soon': return '⏳';
    case 'clock_in_pending': return '⏰';
    case 'clock_out_pending': return '🕐';
    case 'employee_request_new': return '📩';
    case 'employee_request_approved': return '✅';
    case 'employee_request_rejected': return '⚠️';
    case 'payroll_paid': return '💵';
    case 'shift_schedule_published': return '📅';
    case 'shift_schedule_updated': return '🔄';
    case 'shift_change_request_new': return '🔁';
    case 'shift_change_offer_new': return '🙋';
    case 'shift_change_approved': return '✅';
    case 'shift_change_rejected': return '❌';
    case 'shift_execution_alert': return '⚠️';
    case 'admin_missing_clock_in': return '👤';
    case 'admin_open_shift': return '🚨';
    default: return '🔔';
  }
}

function categoryFor(
  notificationType: string,
): Exclude<NotificationCategoryFilter, 'all'> {
  if (
    notificationType === 'shift_start_soon' ||
    notificationType === 'clock_in_pending' ||
    notificationType === 'clock_out_pending' ||
    notificationType === 'admin_missing_clock_in' ||
    notificationType === 'admin_open_shift'
  ) {
    return 'attendance';
  }

  if (notificationType.startsWith('employee_request_')) {
    return 'requests';
  }

  if (notificationType === 'payroll_paid') {
    return 'payroll';
  }

  return 'shifts';
}

function isInsideDateFilter(
  value: string,
  filter: NotificationDateFilter,
): boolean {
  if (filter === 'all') return true;

  const created = new Date(value).getTime();
  if (!Number.isFinite(created)) return false;

  const now = new Date();

  if (filter === 'today') {
    const start = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
    ).getTime();
    return created >= start;
  }

  const days = filter === '7d' ? 7 : 30;
  return created >= Date.now() - days * 24 * 60 * 60 * 1000;
}

export function AttendanceNotificationCenter() {
  const { theme } = useBusiness();
  const [items, setItems] = useState<AttendanceNotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [employeeFilter, setEmployeeFilter] = useState('');
  const [dateFilter, setDateFilter] = useState<NotificationDateFilter>('7d');
  const [readFilter, setReadFilter] = useState<NotificationReadFilter>('all');
  const [categoryFilter, setCategoryFilter] =
    useState<NotificationCategoryFilter>('all');
  const [visibleLimit, setVisibleLimit] = useState(20);

  const [preferences, setPreferences] =
    useState<AttendanceNotificationPreferences>({
      clockReminders: true,
      shiftStartReminders: true,
      requestUpdates: true,
      payrollUpdates: true,
      shiftUpdates: true,
    });

  const [savingPreferences, setSavingPreferences] =
    useState(false);

  const unreadCount = useMemo(
    () => items.filter(item => !item.readAt).length,
    [items],
  );

  const filteredItems = useMemo(() => {
    const employeeQuery = employeeFilter
      .trim()
      .toLocaleLowerCase('es-MX');

    return items.filter(item => {
      if (
        employeeQuery &&
        !(item.relatedUserName ?? '')
          .toLocaleLowerCase('es-MX')
          .includes(employeeQuery)
      ) {
        return false;
      }

      if (!isInsideDateFilter(item.createdAt, dateFilter)) {
        return false;
      }

      if (readFilter === 'unread' && item.readAt) {
        return false;
      }

      if (readFilter === 'read' && !item.readAt) {
        return false;
      }

      if (
        categoryFilter !== 'all' &&
        categoryFor(item.notificationType) !== categoryFilter
      ) {
        return false;
      }

      return true;
    });
  }, [
    categoryFilter,
    dateFilter,
    employeeFilter,
    items,
    readFilter,
  ]);

  const visibleItems = useMemo(
    () => filteredItems.slice(0, visibleLimit),
    [filteredItems, visibleLimit],
  );

  useEffect(() => {
    setVisibleLimit(20);
  }, [employeeFilter, dateFilter, readFilter, categoryFilter]);

  const load = useCallback(async (sync = true): Promise<void> => {
    if (sync) {
      await syncAttendanceNotifications();
    }

    const [
      notifications,
      currentPreferences,
    ] = await Promise.all([
      getMyAttendanceNotifications(200),
      getAttendanceNotificationPreferences(),
    ]);

    setItems(notifications);
    setPreferences(currentPreferences);
  }, []);

  useEffect(() => {
    void (async () => {
      try {
        await load(true);
      } catch (error) {
        console.error('Error cargando notificaciones laborales:', error);
      } finally {
        setLoading(false);
      }
    })();
  }, [load]);

  const refresh = async (): Promise<void> => {
    try {
      setRefreshing(true);
      await load(true);
    } catch (error) {
      Alert.alert('Notificaciones', 'No se pudieron actualizar las notificaciones.');
    } finally {
      setRefreshing(false);
    }
  };

  const markRead = async (item: AttendanceNotificationItem): Promise<void> => {
    if (item.readAt) return;
    try {
      await markAttendanceNotificationRead(item.id);
      setItems(current => current.map(value =>
        value.id === item.id
          ? { ...value, readAt: new Date().toISOString() }
          : value,
      ));
    } catch (error) {
      console.error('Error marcando notificación:', error);
    }
  };

  const markAll = async (): Promise<void> => {
    try {
      await markAllAttendanceNotificationsRead();
      const now = new Date().toISOString();
      setItems(current => current.map(item => ({
        ...item,
        readAt: item.readAt ?? now,
      })));
    } catch (error) {
      Alert.alert('Notificaciones', 'No se pudieron marcar como leídas.');
    }
  };

  const updatePreference = async (
    key: keyof AttendanceNotificationPreferences,
    value: boolean,
  ): Promise<void> => {
    const previous = preferences;
    const next = {
      ...preferences,
      [key]: value,
    };

    setPreferences(next);

    try {
      setSavingPreferences(true);
      await saveAttendanceNotificationPreferences(next);
    } catch (error) {
      console.error(
        'Error guardando preferencias de notificación:',
        error,
      );
      setPreferences(previous);
      Alert.alert(
        'Preferencias',
        'No se pudo guardar el cambio.',
      );
    } finally {
      setSavingPreferences(false);
    }
  };

  const renderFilterButton = <T extends string>(
    value: T,
    selected: T,
    label: string,
    onPress: (value: T) => void,
  ) => {
    const active = value === selected;
    return (
      <TouchableOpacity
        key={value}
        onPress={() => onPress(value)}
        style={[
          styles.filterChip,
          {
            borderColor: active ? theme.primary : theme.border,
            backgroundColor: active ? theme.primary : theme.background,
          },
        ]}
      >
        <Text
          style={[
            styles.filterChipText,
            { color: active ? theme.onPrimary : theme.text },
          ]}
        >
          {label}
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.wrapper}>
      <View style={styles.headingRow}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.title, { color: theme.text }]}>Centro de notificaciones</Text>
          <Text style={[styles.subtitle, { color: theme.textMuted }]}>Avisos de asistencia, solicitudes, nómina y turnos.</Text>
        </View>
        {unreadCount > 0 ? (
          <View style={[styles.badge, { backgroundColor: theme.primary }]}> 
            <Text style={[styles.badgeText, { color: theme.onPrimary }]}>{unreadCount}</Text>
          </View>
        ) : null}
      </View>

      <View
        style={[
          styles.preferencesCard,
          {
            backgroundColor: theme.surface,
            borderColor: theme.border,
          },
        ]}
      >
        <View style={{ flex: 1 }}>
          <Text style={[styles.preferenceTitle, { color: theme.text }]}>Preferencias de push</Text>
          <Text style={[styles.preferenceHint, { color: theme.textMuted }]}>Los avisos seguirán guardándose aquí aunque desactives el push.</Text>
        </View>

        {([
          ['shiftStartReminders', 'Aviso antes del turno'],
          ['clockReminders', 'Entrada / salida'],
          ['requestUpdates', 'Solicitudes'],
          ['payrollUpdates', 'Recibos / pagos'],
          ['shiftUpdates', 'Actualizaciones de turno'],
        ] as Array<[keyof AttendanceNotificationPreferences, string]>).map(([key, label]) => (
          <View key={key} style={styles.preferenceRow}>
            <Text style={[styles.preferenceLabel, { color: theme.text }]}>{label}</Text>
            <Switch
              value={preferences[key]}
              disabled={savingPreferences}
              onValueChange={value => void updatePreference(key, value)}
              trackColor={{ true: theme.primary }}
            />
          </View>
        ))}
      </View>

      <View style={styles.actions}>
        <TouchableOpacity
          onPress={() => void refresh()}
          disabled={refreshing}
          style={[styles.secondaryButton, { borderColor: theme.border }]}
        >
          <Text style={[styles.secondaryButtonText, { color: theme.text }]}>
            {refreshing ? 'ACTUALIZANDO...' : 'ACTUALIZAR'}
          </Text>
        </TouchableOpacity>
        {unreadCount > 0 ? (
          <TouchableOpacity
            onPress={() => void markAll()}
            style={[styles.secondaryButton, { borderColor: theme.border }]}
          >
            <Text style={[styles.secondaryButtonText, { color: theme.text }]}>MARCAR TODO LEÍDO</Text>
          </TouchableOpacity>
        ) : null}
      </View>

      <View
        style={[
          styles.historyPanel,
          { backgroundColor: theme.surface, borderColor: theme.border },
        ]}
      >
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={() => setHistoryOpen(current => !current)}
          style={styles.historyHeader}
        >
          <View style={{ flex: 1 }}>
            <Text style={[styles.historyTitle, { color: theme.text }]}>Historial de notificaciones</Text>
            <Text style={[styles.historySubtitle, { color: theme.textMuted }]}>Filtra por empleado, fecha, categoría y estado.</Text>
          </View>
          <Text style={[styles.historyCount, { color: theme.primary }]}>{items.length}</Text>
          <Text style={[styles.chevron, { color: theme.primary }]}>{historyOpen ? '−' : '+'}</Text>
        </TouchableOpacity>

        {historyOpen ? (
          <View style={styles.historyContent}>
            <TextInput
              value={employeeFilter}
              onChangeText={setEmployeeFilter}
              placeholder="Filtrar por empleado..."
              placeholderTextColor={theme.textMuted}
              style={[
                styles.searchInput,
                {
                  color: theme.text,
                  borderColor: theme.border,
                  backgroundColor: theme.background,
                },
              ]}
            />

            <View style={styles.filterGroup}>
              <Text style={[styles.filterLabel, { color: theme.textMuted }]}>FECHA</Text>
              <View style={styles.filterRow}>
                {renderFilterButton('today', dateFilter, 'Hoy', setDateFilter)}
                {renderFilterButton('7d', dateFilter, '7 días', setDateFilter)}
                {renderFilterButton('30d', dateFilter, '30 días', setDateFilter)}
                {renderFilterButton('all', dateFilter, 'Todo', setDateFilter)}
              </View>
            </View>

            <View style={styles.filterGroup}>
              <Text style={[styles.filterLabel, { color: theme.textMuted }]}>TIPO</Text>
              <View style={styles.filterRow}>
                {renderFilterButton('all', categoryFilter, 'Todos', setCategoryFilter)}
                {renderFilterButton('attendance', categoryFilter, 'Asistencia', setCategoryFilter)}
                {renderFilterButton('requests', categoryFilter, 'Solicitudes', setCategoryFilter)}
                {renderFilterButton('payroll', categoryFilter, 'Pagos', setCategoryFilter)}
                {renderFilterButton('shifts', categoryFilter, 'Turnos', setCategoryFilter)}
              </View>
            </View>

            <View style={styles.filterGroup}>
              <Text style={[styles.filterLabel, { color: theme.textMuted }]}>ESTADO</Text>
              <View style={styles.filterRow}>
                {renderFilterButton('all', readFilter, 'Todas', setReadFilter)}
                {renderFilterButton('unread', readFilter, 'No leídas', setReadFilter)}
                {renderFilterButton('read', readFilter, 'Leídas', setReadFilter)}
              </View>
            </View>

            <Text style={[styles.resultCount, { color: theme.textMuted }]}> 
              {filteredItems.length} resultado{filteredItems.length === 1 ? '' : 's'}
            </Text>

            {loading ? (
              <View style={styles.loading}>
                <ActivityIndicator color={theme.primary} />
              </View>
            ) : filteredItems.length === 0 ? (
              <View style={[styles.empty, { borderColor: theme.border, backgroundColor: theme.background }]}> 
                <Text style={{ color: theme.textMuted }}>No hay notificaciones con estos filtros.</Text>
              </View>
            ) : (
              <>
                {visibleItems.map(item => {
                  const unread = !item.readAt;
                  return (
                    <TouchableOpacity
                      key={item.id}
                      activeOpacity={0.8}
                      onPress={() => void markRead(item)}
                      style={[
                        styles.card,
                        {
                          borderColor: unread ? theme.primary : theme.border,
                          backgroundColor: theme.background,
                        },
                      ]}
                    >
                      <View style={styles.icon}><Text style={styles.iconText}>{iconFor(item)}</Text></View>
                      <View style={{ flex: 1 }}>
                        <View style={styles.cardTitleRow}>
                          <Text style={[styles.cardTitle, { color: theme.text }]}>{item.title}</Text>
                          {unread ? <View style={[styles.dot, { backgroundColor: theme.primary }]} /> : null}
                        </View>
                        {item.relatedUserName ? (
                          <Text style={[styles.employeeName, { color: theme.primary }]}>{item.relatedUserName}</Text>
                        ) : null}
                        <Text style={[styles.message, { color: theme.textMuted }]}>{item.message}</Text>
                        <Text style={[styles.date, { color: theme.textMuted }]}>{formatDate(item.createdAt)}</Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}

                {visibleItems.length < filteredItems.length ? (
                  <TouchableOpacity
                    onPress={() => setVisibleLimit(current => current + 20)}
                    style={[styles.loadMoreButton, { borderColor: theme.border }]}
                  >
                    <Text style={[styles.secondaryButtonText, { color: theme.text }]}>MOSTRAR 20 MÁS</Text>
                  </TouchableOpacity>
                ) : null}
              </>
            )}
          </View>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { gap: 10 },
  headingRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  title: { fontSize: 18, fontWeight: '900' },
  subtitle: { marginTop: 3, fontSize: 12, fontWeight: '600' },
  badge: { minWidth: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 8 },
  badgeText: { fontSize: 12, fontWeight: '900' },
  preferencesCard: { borderWidth: 1, borderRadius: 12, padding: 14, gap: 8 },
  preferenceTitle: { fontSize: 14, fontWeight: '900' },
  preferenceHint: { marginTop: 3, fontSize: 11, fontWeight: '600' },
  preferenceRow: { minHeight: 38, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  preferenceLabel: { flex: 1, fontSize: 13, fontWeight: '800' },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  secondaryButton: { minHeight: 38, borderWidth: 1, borderRadius: 9, paddingHorizontal: 12, alignItems: 'center', justifyContent: 'center' },
  secondaryButtonText: { fontSize: 11, fontWeight: '900' },
  historyPanel: { borderWidth: 1, borderRadius: 12, overflow: 'hidden' },
  historyHeader: { minHeight: 66, paddingHorizontal: 14, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', gap: 10 },
  historyTitle: { fontSize: 15, fontWeight: '900' },
  historySubtitle: { marginTop: 3, fontSize: 11, fontWeight: '600' },
  historyCount: { minWidth: 28, textAlign: 'center', fontSize: 13, fontWeight: '900' },
  chevron: { width: 24, textAlign: 'center', fontSize: 22, fontWeight: '900' },
  historyContent: { padding: 14, paddingTop: 4, gap: 10 },
  searchInput: { minHeight: 42, borderWidth: 1, borderRadius: 9, paddingHorizontal: 12 },
  filterGroup: { gap: 6 },
  filterLabel: { fontSize: 10, fontWeight: '900' },
  filterRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  filterChip: { minHeight: 34, borderWidth: 1, borderRadius: 17, paddingHorizontal: 11, alignItems: 'center', justifyContent: 'center' },
  filterChipText: { fontSize: 10, fontWeight: '900' },
  resultCount: { fontSize: 11, fontWeight: '700' },
  loading: { padding: 24, alignItems: 'center' },
  empty: { padding: 18, borderWidth: 1, borderRadius: 12 },
  card: { flexDirection: 'row', gap: 12, borderWidth: 1, borderRadius: 12, padding: 14 },
  icon: { width: 34, alignItems: 'center', paddingTop: 1 },
  iconText: { fontSize: 20 },
  cardTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  cardTitle: { flex: 1, fontSize: 14, fontWeight: '900' },
  employeeName: { marginTop: 3, fontSize: 11, fontWeight: '900' },
  dot: { width: 8, height: 8, borderRadius: 4 },
  message: { marginTop: 4, fontSize: 13, lineHeight: 18 },
  date: { marginTop: 7, fontSize: 11, fontWeight: '700' },
  loadMoreButton: { alignSelf: 'center', minHeight: 38, borderWidth: 1, borderRadius: 9, paddingHorizontal: 14, alignItems: 'center', justifyContent: 'center' },
});
