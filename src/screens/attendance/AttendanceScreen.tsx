import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import {
  ActivityIndicator,
  Alert,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { useAuth } from '../../context/AuthContext';
import { useBusiness } from '../../context/BusinessContext';
import { AttendanceEmployeeSelfService } from '../../components/attendance/AttendanceEmployeeSelfService';
import { AttendanceNotificationCenter } from '../../components/attendance/AttendanceNotificationCenter';
import {
  AttendanceRecord,
  AttendanceStatus,
  getAttendanceStatus,
  getMyAttendanceHistory,
  getMyOpenAttendance,
  registerAttendanceEntry,
  registerAttendanceExit,
} from '../../services/attendanceService';

function formatDateTime(value: string | null): string {
  if (!value) {
    return '—';
  }

  return new Intl.DateTimeFormat('es-MX', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

function formatTime(value: string | null): string {
  if (!value) {
    return '—';
  }

  return new Intl.DateTimeFormat('es-MX', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

function formatWorkedTime(record: AttendanceRecord): string {
  if (!record.clock_out) {
    return 'En curso';
  }

  const diff = Math.max(
    0,
    new Date(record.clock_out).getTime() -
      new Date(record.clock_in).getTime(),
  );

  const totalMinutes = Math.floor(diff / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  return `${hours} h ${minutes} min`;
}


function attendanceResultLabel(record: AttendanceRecord): string | null {
  if (!record.clock_out) {
    return null;
  }

  const parts: string[] = [];
  if ((record.late_minutes ?? 0) > 0) {
    parts.push(`Retardo ${record.late_minutes} min`);
  }
  if ((record.early_leave_minutes ?? 0) > 0) {
    parts.push(`Salida anticipada ${record.early_leave_minutes} min`);
  }
  if ((record.overtime_minutes ?? 0) > 0) {
    parts.push(`Extra ${record.overtime_minutes} min`);
  }

  return parts.length > 0 ? parts.join(' · ') : 'Sin incidencias';
}

function getScheduleMessage(status: AttendanceStatus | null): string {
  if (!status) {
    return 'Consultando horario del negocio...';
  }

  if (!status.scheduleIsOpen) {
    return status.scheduleReason
      ? `Sin jornada disponible: ${status.scheduleReason}`
      : 'No tienes una jornada programada para este turno.';
  }

  if (status.hasOpenAttendance) {
    if (status.needsClockOutReminder) {
      return 'El horario del negocio ya terminó y tu jornada sigue abierta.';
    }

    return 'Tu jornada está abierta. La salida puede registrarse cuando termines.';
  }

  if (status.beforeClockInWindow) {
    return `La entrada estará disponible desde ${formatTime(status.entryWindowStart)}.`;
  }

  if (status.afterBusinessClose) {
    return 'Tu horario de este turno ya terminó. Solicita una corrección a un administrador si trabajaste fuera de horario.';
  }

  if (status.withinClockInWindow && !status.withinBusinessHours) {
    return `Puedes registrar entrada anticipada. Tu jornada inicia a las ${formatTime(status.scheduleOpenAt)}.`;
  }

  if (status.withinBusinessHours) {
    return 'Estás dentro de tu horario programado.';
  }

  return 'La entrada no está disponible en este momento.';
}

export type AttendanceFocusTarget =
  | 'attendance'
  | 'notifications'
  | 'requests'
  | 'receipts'
  | 'schedule';

interface AttendanceScreenProps {
  focusTarget?: AttendanceFocusTarget | null;
  focusToken?: number;
}

export function AttendanceScreen({
  focusTarget = null,
  focusToken = 0,
}: AttendanceScreenProps) {
  const { user } = useAuth();
  const { theme } = useBusiness();

  const [openAttendance, setOpenAttendance] =
    useState<AttendanceRecord | null>(null);
  const [history, setHistory] = useState<AttendanceRecord[]>([]);
  const [status, setStatus] = useState<AttendanceStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);

  const scrollRef =
    useRef<ScrollView | null>(null);

  const [notificationSectionY, setNotificationSectionY] =
    useState(0);

  const [selfServiceSectionY, setSelfServiceSectionY] =
    useState(0);

  const loadData = useCallback(async (): Promise<void> => {
    if (!user?.id) {
      setOpenAttendance(null);
      setHistory([]);
      setStatus(null);
      return;
    }

    const [open, recent, currentStatus] = await Promise.all([
      getMyOpenAttendance(user.id),
      getMyAttendanceHistory(user.id, 20),
      getAttendanceStatus(),
    ]);

    setOpenAttendance(open);
    setHistory(recent);
    setStatus(currentStatus);
  }, [user?.id]);

  useEffect(() => {
    void (async () => {
      try {
        await loadData();
      } catch (error) {
        console.error('Error cargando asistencia:', error);
        Alert.alert(
          'Asistencia',
          'No se pudo cargar tu información de asistencia.',
        );
      } finally {
        setLoading(false);
      }
    })();
  }, [loadData]);

  const onRefresh = useCallback(async (): Promise<void> => {
    try {
      setRefreshing(true);
      await loadData();
    } catch (error) {
      console.error('Error actualizando asistencia:', error);
    } finally {
      setRefreshing(false);
    }
  }, [loadData]);

  const handleRegister = async (): Promise<void> => {
    try {
      setSaving(true);

      if (openAttendance) {
        await registerAttendanceExit();
      } else {
        await registerAttendanceEntry();
      }

      await loadData();
    } catch (error) {
      console.error('Error registrando asistencia:', error);
      Alert.alert(
        'No se pudo registrar',
        error instanceof Error
          ? error.message
          : 'Ocurrió un error al guardar el registro.',
      );
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    if (!focusTarget || focusToken <= 0) {
      return;
    }

    const timer = setTimeout(() => {
      let y = 0;

      if (focusTarget === 'notifications') {
        y = notificationSectionY;
      }

      if (
        focusTarget === 'requests' ||
        focusTarget === 'receipts' ||
        focusTarget === 'schedule'
      ) {
        y = selfServiceSectionY;
      }

      scrollRef.current?.scrollTo({
        y: Math.max(0, y - 12),
        animated: true,
      });
    }, 250);

    return () => clearTimeout(timer);
  }, [
    focusTarget,
    focusToken,
    notificationSectionY,
    selfServiceSectionY,
  ]);

  const currentStatus = useMemo(
    () =>
      openAttendance
        ? `Entrada: ${formatDateTime(openAttendance.clock_in)}`
        : 'No tienes una asistencia abierta.',
    [openAttendance],
  );

  const canClockIn = Boolean(
    status?.scheduleIsOpen &&
    status?.withinClockInWindow,
  );

  const registerDisabled = saving || (!openAttendance && !canClockIn);

  if (loading) {
    return (
      <View
        style={[
          localStyles.center,
          { backgroundColor: theme.background },
        ]}
      >
        <ActivityIndicator size="large" color={theme.primary} />
        <Text style={[localStyles.loadingText, { color: theme.textMuted }]}> 
          Cargando asistencia...
        </Text>
      </View>
    );
  }

  return (
    <ScrollView
      ref={scrollRef}
      style={{ flex: 1, backgroundColor: theme.background }}
      contentContainerStyle={localStyles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      <View>
        <Text style={[localStyles.title, { color: theme.text }]}>Asistencia</Text>
        <Text style={[localStyles.subtitle, { color: theme.textMuted }]}> 
          {user?.fullName ?? 'Usuario'}
        </Text>
      </View>

      <View
        style={[
          localStyles.scheduleCard,
          {
            backgroundColor: theme.surface,
            borderColor: theme.border,
          },
        ]}
      >
        <Text style={[localStyles.statusLabel, { color: theme.textMuted }]}> 
          TU HORARIO DE HOY
        </Text>
        <Text style={[localStyles.scheduleValue, { color: theme.text }]}> 
          {status?.scheduleIsOpen
            ? `${formatTime(status.scheduleOpenAt)} – ${formatTime(status.scheduleCloseAt)}`
            : 'Cerrado'}
        </Text>
        <Text style={[localStyles.statusDetail, { color: theme.textMuted }]}> 
          {getScheduleMessage(status)}
        </Text>
        {status?.scheduleIsException ? (
          <Text style={[localStyles.exceptionText, { color: theme.primary }]}> 
            Horario especial{status.scheduleReason ? ` · ${status.scheduleReason}` : ''}
          </Text>
        ) : null}
        {status?.scheduleSource ? (
          <Text style={[localStyles.exceptionText, { color: theme.textMuted }]}> 
            {status.scheduleSource === 'business' ? 'Horario heredado del negocio' : status.scheduleSource === 'custom' ? 'Horario personalizado' : 'Sin jornada programada'}
            {status.adjustedToBusinessHours ? ' · ajustado por horario especial del negocio' : ''}
          </Text>
        ) : null}
      </View>

      <View
        style={[
          localStyles.statusCard,
          {
            backgroundColor: theme.surface,
            borderColor: theme.border,
          },
        ]}
      >
        <Text style={[localStyles.statusLabel, { color: theme.textMuted }]}> 
          ESTADO ACTUAL
        </Text>
        <Text style={[localStyles.statusValue, { color: theme.text }]}> 
          {openAttendance ? 'Trabajando' : 'Fuera de turno'}
        </Text>
        <Text style={[localStyles.statusDetail, { color: theme.textMuted }]}> 
          {currentStatus}
        </Text>

        <TouchableOpacity
          disabled={registerDisabled}
          onPress={() => void handleRegister()}
          style={[
            localStyles.primaryButton,
            {
              backgroundColor: openAttendance
                ? theme.danger
                : theme.primary,
              opacity: registerDisabled ? 0.45 : 1,
            },
          ]}
        >
          <Text
            style={[
              localStyles.primaryButtonText,
              { color: openAttendance ? '#FFFFFF' : theme.onPrimary },
            ]}
          >
            {saving
              ? 'GUARDANDO...'
              : openAttendance
                ? 'REGISTRAR SALIDA'
                : 'REGISTRAR ENTRADA'}
          </Text>
        </TouchableOpacity>

        {!openAttendance && !canClockIn ? (
          <Text style={[localStyles.disabledHint, { color: theme.textMuted }]}> 
            La entrada está bloqueada por la validación de horario.
          </Text>
        ) : null}
      </View>

      <View>
        <Text style={[localStyles.sectionTitle, { color: theme.text }]}> 
          Historial reciente
        </Text>

        {history.length === 0 ? (
          <View
            style={[
              localStyles.emptyCard,
              {
                backgroundColor: theme.surface,
                borderColor: theme.border,
              },
            ]}
          >
            <Text style={{ color: theme.textMuted }}>
              Todavía no tienes registros de asistencia.
            </Text>
          </View>
        ) : (
          history.map(record => (
            <View
              key={record.id}
              style={[
                localStyles.historyCard,
                {
                  backgroundColor: theme.surface,
                  borderColor: theme.border,
                },
              ]}
            >
              <View style={localStyles.historyRow}>
                <Text style={[localStyles.historyLabel, { color: theme.textMuted }]}>Entrada</Text>
                <Text style={[localStyles.historyValue, { color: theme.text }]}>{formatDateTime(record.clock_in)}</Text>
              </View>
              <View style={localStyles.historyRow}>
                <Text style={[localStyles.historyLabel, { color: theme.textMuted }]}>Salida</Text>
                <Text style={[localStyles.historyValue, { color: theme.text }]}>{formatDateTime(record.clock_out)}</Text>
              </View>
              <View style={localStyles.historyRow}>
                <Text style={[localStyles.historyLabel, { color: theme.textMuted }]}>Tiempo</Text>
                <Text style={[localStyles.historyValue, { color: record.clock_out ? theme.text : theme.primary }]}>{formatWorkedTime(record)}</Text>
              </View>
              {record.scheduled_start && record.scheduled_end ? (
                <View style={localStyles.historyRow}>
                  <Text style={[localStyles.historyLabel, { color: theme.textMuted }]}>Horario esperado</Text>
                  <Text style={[localStyles.historyValue, { color: theme.text }]}>{formatTime(record.scheduled_start)} – {formatTime(record.scheduled_end)}</Text>
                </View>
              ) : null}
              {record.clock_out ? (
                <View style={localStyles.historyRow}>
                  <Text style={[localStyles.historyLabel, { color: theme.textMuted }]}>Resultado</Text>
                  <Text style={[localStyles.historyValue, { color: (record.late_minutes ?? 0) > 0 || (record.early_leave_minutes ?? 0) > 0 ? theme.danger : theme.primary }]}>{attendanceResultLabel(record)}</Text>
                </View>
              ) : null}
            </View>
          ))
        )}
      </View>

      <View
        onLayout={event =>
          setNotificationSectionY(
            event.nativeEvent.layout.y,
          )
        }
      >
        <AttendanceNotificationCenter />
      </View>

      <View
        onLayout={event =>
          setSelfServiceSectionY(
            event.nativeEvent.layout.y,
          )
        }
      >
        <AttendanceEmployeeSelfService
          initialSection={
            focusTarget === 'schedule'
              ? 'schedule'
              : focusTarget === 'requests'
                ? 'requests'
                : focusTarget === 'receipts'
                  ? 'receipts'
                  : null
          }
          focusToken={focusToken}
        />
      </View>
    </ScrollView>
  );
}

const localStyles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    fontWeight: '600',
  },
  container: {
    padding: 20,
    gap: 18,
    maxWidth: 900,
    width: '100%',
    alignSelf: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: '900',
  },
  subtitle: {
    marginTop: 4,
    fontSize: 14,
    fontWeight: '600',
  },
  scheduleCard: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 18,
  },
  scheduleValue: {
    marginTop: 6,
    fontSize: 20,
    fontWeight: '900',
  },
  exceptionText: {
    marginTop: 8,
    fontSize: 12,
    fontWeight: '800',
  },
  statusCard: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 20,
  },
  statusLabel: {
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1,
  },
  statusValue: {
    marginTop: 6,
    fontSize: 24,
    fontWeight: '900',
  },
  statusDetail: {
    marginTop: 6,
    fontSize: 14,
    lineHeight: 20,
  },
  primaryButton: {
    marginTop: 20,
    minHeight: 50,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
  },
  primaryButtonText: {
    fontSize: 14,
    fontWeight: '900',
  },
  disabledHint: {
    marginTop: 8,
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '600',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '900',
    marginBottom: 10,
  },
  emptyCard: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 18,
  },
  historyCard: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    marginBottom: 10,
  },
  historyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 16,
    paddingVertical: 4,
  },
  historyLabel: {
    fontSize: 13,
    fontWeight: '700',
  },
  historyValue: {
    flexShrink: 1,
    textAlign: 'right',
    fontSize: 13,
    fontWeight: '700',
  },
});
