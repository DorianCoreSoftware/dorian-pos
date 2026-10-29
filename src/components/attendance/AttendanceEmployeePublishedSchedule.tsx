import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';

import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import {
  MyPublishedShift,
  acknowledgeAttendanceShiftPublication,
  getMyPublishedAttendanceSchedule,
} from '../../services/attendanceService';

import {
  useBusiness,
} from '../../context/BusinessContext';

function dayLabel(dateText: string): string {
  const [y, m, d] = dateText.split('-').map(Number);
  const date = new Date(y, (m ?? 1) - 1, d ?? 1, 12, 0, 0, 0);
  return new Intl.DateTimeFormat('es-MX', {
    weekday: 'long',
    day: '2-digit',
    month: 'short',
  }).format(date);
}

function duration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m ? `${h} h ${m} min` : `${h} h`;
}

type PublicationGroup = {
  publicationId: string;
  draftId: string;
  revision: number;
  publishedAt: string;
  weekStart: string;
  weekEnd: string;
  acknowledgedAt: string | null;
  shifts: MyPublishedShift[];
};

export function AttendanceEmployeePublishedSchedule() {
  const { theme } = useBusiness();
  const [rows, setRows] = useState<MyPublishedShift[]>([]);
  const [loading, setLoading] = useState(true);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);

  const load = useCallback(async (): Promise<void> => {
    setRows(await getMyPublishedAttendanceSchedule(60));
  }, []);

  useEffect(() => {
    void (async () => {
      try {
        await load();
      } catch (error) {
        console.error('Error cargando horario publicado:', error);
      } finally {
        setLoading(false);
      }
    })();
  }, [load]);

  const groups = useMemo<PublicationGroup[]>(() => {
    const map = new Map<string, PublicationGroup>();

    for (const row of rows) {
      const current = map.get(row.publicationId) ?? {
        publicationId: row.publicationId,
        draftId: row.draftId,
        revision: row.revision,
        publishedAt: row.publishedAt,
        weekStart: row.weekStart,
        weekEnd: row.weekEnd,
        acknowledgedAt: row.acknowledgedAt,
        shifts: [],
      };

      current.shifts.push(row);
      current.acknowledgedAt =
        current.acknowledgedAt ?? row.acknowledgedAt;

      map.set(row.publicationId, current);
    }

    return [...map.values()]
      .sort((a, b) => a.weekStart.localeCompare(b.weekStart));
  }, [rows]);

  const confirm = async (publicationId: string): Promise<void> => {
    try {
      setConfirmingId(publicationId);
      await acknowledgeAttendanceShiftPublication(publicationId);
      await load();
      Alert.alert(
        'Horario confirmado',
        'Administración ya puede ver que revisaste esta versión.',
      );
    } catch (error) {
      Alert.alert(
        'No se pudo confirmar',
        error instanceof Error ? error.message : 'Ocurrió un error.',
      );
    } finally {
      setConfirmingId(null);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={theme.primary} />
        <Text style={{ color: theme.textMuted, marginTop: 8 }}>
          Cargando horario...
        </Text>
      </View>
    );
  }

  if (groups.length === 0) {
    return (
      <View
        style={[
          styles.empty,
          {
            backgroundColor: theme.surface,
            borderColor: theme.border,
          },
        ]}
      >
        <Text style={{ color: theme.text, fontWeight: '900' }}>
          Aún no tienes horarios publicados.
        </Text>
        <Text style={{ color: theme.textMuted, marginTop: 5 }}>
          Cuando Administración publique una semana aparecerá aquí.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      {groups.map(group => (
        <View
          key={group.publicationId}
          style={[
            styles.weekCard,
            {
              backgroundColor: theme.surface,
              borderColor: theme.border,
            },
          ]}
        >
          <View style={styles.weekHeader}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.weekTitle, { color: theme.text }]}>
                {group.weekStart} → {group.weekEnd}
              </Text>
              <Text style={[styles.version, { color: theme.textMuted }]}>
                Revisión publicada v{group.revision} ·{' '}
                {new Date(group.publishedAt).toLocaleString('es-MX')}
              </Text>
            </View>

            <Text
              style={{
                color: group.acknowledgedAt
                  ? theme.primary
                  : theme.textMuted,
                fontWeight: '900',
                fontSize: 11,
              }}
            >
              {group.acknowledgedAt ? 'REVISADO' : 'PENDIENTE'}
            </Text>
          </View>

          {group.shifts
            .sort((a, b) =>
              a.workDate.localeCompare(b.workDate) ||
              a.startTime.localeCompare(b.startTime),
            )
            .map(item => (
              <View
                key={`${item.publicationId}-${item.workDate}`}
                style={[
                  styles.shiftRow,
                  { borderColor: theme.border },
                ]}
              >
                <View style={{ flex: 1 }}>
                  <Text style={{ color: theme.text, fontWeight: '900' }}>
                    {dayLabel(item.workDate)}
                  </Text>
                  <Text style={{ color: theme.textMuted, marginTop: 3 }}>
                    {item.startTime} – {item.endTime} · {duration(item.plannedMinutes)}
                  </Text>
                </View>
              </View>
            ))}

          {!group.acknowledgedAt ? (
            <TouchableOpacity
              disabled={confirmingId === group.publicationId}
              onPress={() => void confirm(group.publicationId)}
              style={[
                styles.confirmButton,
                {
                  backgroundColor: theme.primary,
                  opacity:
                    confirmingId === group.publicationId ? 0.55 : 1,
                },
              ]}
            >
              <Text style={{ color: theme.onPrimary, fontWeight: '900' }}>
                {confirmingId === group.publicationId
                  ? 'CONFIRMANDO...'
                  : 'CONFIRMAR QUE REVISÉ MI HORARIO'}
              </Text>
            </TouchableOpacity>
          ) : (
            <Text style={[styles.confirmed, { color: theme.textMuted }]}>
              Confirmado el{' '}
              {new Date(group.acknowledgedAt).toLocaleString('es-MX')}
            </Text>
          )}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: 12 },
  center: { padding: 24, alignItems: 'center' },
  empty: { borderWidth: 1, borderRadius: 12, padding: 16 },
  weekCard: { borderWidth: 1, borderRadius: 12, padding: 14, gap: 8 },
  weekHeader: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  weekTitle: { fontSize: 16, fontWeight: '900' },
  version: { marginTop: 3, fontSize: 11, fontWeight: '600' },
  shiftRow: { minHeight: 54, borderTopWidth: 1, paddingTop: 9, marginTop: 2 },
  confirmButton: {
    minHeight: 44,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    marginTop: 4,
  },
  confirmed: { fontSize: 11, fontWeight: '700', marginTop: 4 },
});
