import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Switch,
  Text,
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

export function AttendanceNotificationCenter() {
  const { theme } = useBusiness();
  const [items, setItems] = useState<AttendanceNotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [preferences, setPreferences] =
    useState<AttendanceNotificationPreferences>({
      clockReminders: true,
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

  const load = useCallback(async (sync = true): Promise<void> => {
    if (sync) {
      await syncAttendanceNotifications();
    }

    const [
      notifications,
      currentPreferences,
    ] = await Promise.all([
      getMyAttendanceNotifications(80),
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
      setPreferences(preferences);
      Alert.alert(
        'Preferencias',
        'No se pudo guardar el cambio.',
      );
    } finally {
      setSavingPreferences(false);
    }
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

      {loading ? (
        <View style={styles.loading}>
          <ActivityIndicator color={theme.primary} />
        </View>
      ) : items.length === 0 ? (
        <View style={[styles.empty, { borderColor: theme.border, backgroundColor: theme.surface }]}> 
          <Text style={{ color: theme.textMuted }}>No tienes notificaciones laborales.</Text>
        </View>
      ) : (
        items.map(item => {
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
                  backgroundColor: theme.surface,
                },
              ]}
            >
              <View style={styles.icon}><Text style={styles.iconText}>{iconFor(item)}</Text></View>
              <View style={{ flex: 1 }}>
                <View style={styles.cardTitleRow}>
                  <Text style={[styles.cardTitle, { color: theme.text }]}>{item.title}</Text>
                  {unread ? <View style={[styles.dot, { backgroundColor: theme.primary }]} /> : null}
                </View>
                <Text style={[styles.message, { color: theme.textMuted }]}>{item.message}</Text>
                <Text style={[styles.date, { color: theme.textMuted }]}>{formatDate(item.createdAt)}</Text>
              </View>
            </TouchableOpacity>
          );
        })
      )}
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
  loading: { padding: 24, alignItems: 'center' },
  empty: { padding: 18, borderWidth: 1, borderRadius: 12 },
  card: { flexDirection: 'row', gap: 12, borderWidth: 1, borderRadius: 12, padding: 14 },
  icon: { width: 34, alignItems: 'center', paddingTop: 1 },
  iconText: { fontSize: 20 },
  cardTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  cardTitle: { flex: 1, fontSize: 14, fontWeight: '900' },
  dot: { width: 8, height: 8, borderRadius: 4 },
  message: { marginTop: 4, fontSize: 13, lineHeight: 18 },
  date: { marginTop: 7, fontSize: 11, fontWeight: '700' },
});
