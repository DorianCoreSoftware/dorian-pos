import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';

import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import {
  AttendanceShiftExecutionItem,
  getAdminShiftExecutionDashboard,
  reviewAttendanceShiftExecutionAlert,
  syncAttendanceShiftExecution,
} from '../../../services/attendanceService';

import { useBusiness } from '../../../context/BusinessContext';

type RangeKey = '7' | '14' | '30';

function localDate(date: Date): string {
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function rangeStart(days: number): string {
  const date = new Date();
  date.setHours(12, 0, 0, 0);
  date.setDate(date.getDate() - Math.max(0, days - 1));
  return localDate(date);
}

function statusLabel(
  status: AttendanceShiftExecutionItem['status'],
): string {
  switch (status) {
    case 'pending':
      return 'PENDIENTE';

    case 'in_progress':
      return 'EN CURSO';

    case 'completed':
      return 'CUMPLIDO';

    case 'missing_clock_in':
      return 'ENTRADA PENDIENTE';

    case 'absent':
      return 'AUSENCIA';

    case 'late':
      return 'RETARDO';

    case 'early_leave':
      return 'SALIDA ANTICIPADA';

    case 'late_early_leave':
      return 'RETARDO + SALIDA ANTICIPADA';

    case 'overtime':
      return 'HORAS EXTRA';

    case 'open_shift':
      return 'SALIDA PENDIENTE';

    case 'outside_shift':
      return 'FUERA DE TURNO';
  }
}

function formatDateTime(value: string | null): string {
  if (!value) return '—';
  return new Intl.DateTimeFormat('es-MX', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

function minutesLabel(value: number): string {
  const sign = value < 0 ? '−' : value > 0 ? '+' : '';
  const abs = Math.abs(value);
  const h = Math.floor(abs / 60);
  const m = abs % 60;
  if (!h) return `${sign}${m} min`;
  if (!m) return `${sign}${h} h`;
  return `${sign}${h} h ${m} min`;
}

function isIssue(item: AttendanceShiftExecutionItem): boolean {
  return Boolean(item.alertId);
}

export function AdminAttendanceExecution() {
  const { theme } = useBusiness();

  const [range, setRange] = useState<RangeKey>('14');
  const [onlyIssues, setOnlyIssues] = useState(true);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [rows, setRows] = useState<AttendanceShiftExecutionItem[]>([]);
  const [noteByAlert, setNoteByAlert] = useState<Record<string, string>>({});

  const load = useCallback(async (): Promise<void> => {
    const days = Number(range);
    const data = await getAdminShiftExecutionDashboard({
      startDate: rangeStart(days),
      endDate: localDate(new Date()),
      onlyIssues,
    });
    setRows(data);
  }, [range, onlyIssues]);

  useEffect(() => {
    void (async () => {
      try {
        setLoading(true);
        await syncAttendanceShiftExecution();
        await load();
      } catch (error) {
        console.error('Error cargando ejecución de turnos:', error);
        Alert.alert(
          'Ejecución de turnos',
          error instanceof Error
            ? error.message
            : 'No se pudo cargar la información.',
        );
      } finally {
        setLoading(false);
      }
    })();
  }, [load]);

  const summary = useMemo(() => {
    const issues = rows.filter(isIssue);
    return {
      total: rows.length,
      issues: issues.length,
      absences: rows.filter(item =>
        item.status === 'absent' ||
        item.alertType === 'coverage_no_show' ||
        item.alertType === 'swap_no_show',
      ).length,
      late: rows.filter(item =>
        item.status === 'late' ||
        item.status === 'late_early_leave',
      ).length,
      open: rows.filter(item => item.status === 'open_shift').length,
      completed: rows.filter(item => item.status === 'completed').length,
    };
  }, [rows]);

  const refresh = async (): Promise<void> => {
    try {
      setSyncing(true);
      await syncAttendanceShiftExecution();
      await load();
    } catch (error) {
      Alert.alert(
        'No se pudo actualizar',
        error instanceof Error ? error.message : 'Ocurrió un error.',
      );
    } finally {
      setSyncing(false);
    }
  };

  const markReviewed = async (
    item: AttendanceShiftExecutionItem,
  ): Promise<void> => {
    if (!item.alertId) return;

    try {
      await reviewAttendanceShiftExecutionAlert({
        alertId: item.alertId,
        note: noteByAlert[item.alertId] ?? '',
      });
      await load();
    } catch (error) {
      Alert.alert(
        'No se pudo marcar como revisada',
        error instanceof Error ? error.message : 'Ocurrió un error.',
      );
    }
  };

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={theme.primary} />
      </View>
    );
  }

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: theme.surface,
          borderColor: theme.border,
        },
      ]}
    >
      <View style={styles.header}>
        <View style={styles.headerText}>
          <Text style={[styles.title, { color: theme.text }]}>
            Ejecución real vs turno publicado
          </Text>
          <Text style={[styles.help, { color: theme.textMuted }]}>
            Detecta ausencias, retardos, salidas anticipadas, jornadas abiertas,
            entradas fuera de turno y coberturas/intercambios no cumplidos.
          </Text>
        </View>

        <TouchableOpacity
          disabled={syncing}
          onPress={() => void refresh()}
          style={[
            styles.button,
            {
              borderColor: theme.border,
              backgroundColor: theme.background,
              opacity: syncing ? 0.55 : 1,
            },
          ]}
        >
          <Text style={{ color: theme.text, fontWeight: '900' }}>
            {syncing ? 'ACTUALIZANDO...' : 'ACTUALIZAR'}
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.filters}>
        {(['7', '14', '30'] as RangeKey[]).map(value => (
          <TouchableOpacity
            key={value}
            onPress={() => setRange(value)}
            style={[
              styles.pill,
              {
                borderColor: range === value ? theme.primary : theme.border,
                backgroundColor:
                  range === value ? theme.surfaceAlt : theme.background,
              },
            ]}
          >
            <Text
              style={{
                color: range === value ? theme.primary : theme.textMuted,
                fontWeight: '900',
              }}
            >
              {value} DÍAS
            </Text>
          </TouchableOpacity>
        ))}

        <TouchableOpacity
          onPress={() => setOnlyIssues(value => !value)}
          style={[
            styles.pill,
            {
              borderColor: onlyIssues ? theme.primary : theme.border,
              backgroundColor:
                onlyIssues ? theme.surfaceAlt : theme.background,
            },
          ]}
        >
          <Text
            style={{
              color: onlyIssues ? theme.primary : theme.textMuted,
              fontWeight: '900',
            }}
          >
            {onlyIssues ? 'SOLO ALERTAS' : 'TODOS LOS TURNOS'}
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.metrics}>
        <View style={[styles.metric, { borderColor: theme.border }]}>
          <Text style={[styles.metricNumber, { color: theme.primary }]}>
            {summary.issues}
          </Text>
          <Text style={{ color: theme.textMuted }}>alertas activas</Text>
        </View>

        <View style={[styles.metric, { borderColor: theme.border }]}>
          <Text style={[styles.metricNumber, { color: theme.danger }]}>
            {summary.absences}
          </Text>
          <Text style={{ color: theme.textMuted }}>ausencias / no-show</Text>
        </View>

        <View style={[styles.metric, { borderColor: theme.border }]}>
          <Text style={[styles.metricNumber, { color: theme.primary }]}>
            {summary.late}
          </Text>
          <Text style={{ color: theme.textMuted }}>retardos</Text>
        </View>

        <View style={[styles.metric, { borderColor: theme.border }]}>
          <Text style={[styles.metricNumber, { color: theme.primary }]}>
            {summary.open}
          </Text>
          <Text style={{ color: theme.textMuted }}>salidas pendientes</Text>
        </View>
      </View>

      {rows.length === 0 ? (
        <Text style={{ color: theme.textMuted }}>
          No hay resultados para el periodo seleccionado.
        </Text>
      ) : (
        <ScrollView horizontal showsHorizontalScrollIndicator>
          <View style={styles.table}>
            <View
              style={[
                styles.tableRow,
                styles.tableHeader,
                { borderColor: theme.border },
              ]}
            >
              <Text style={[styles.employeeCell, { color: theme.textMuted }]}>
                EMPLEADO
              </Text>
              <Text style={[styles.dateCell, { color: theme.textMuted }]}>
                FECHA
              </Text>
              <Text style={[styles.timeCell, { color: theme.textMuted }]}>
                TURNO
              </Text>
              <Text style={[styles.timeCell, { color: theme.textMuted }]}>
                REAL
              </Text>
              <Text style={[styles.statusCell, { color: theme.textMuted }]}>
                RESULTADO
              </Text>
              <Text style={[styles.deltaCell, { color: theme.textMuted }]}>
                DIFERENCIA
              </Text>
              <Text style={[styles.actionCell, { color: theme.textMuted }]}>
                REVISIÓN
              </Text>
            </View>

            {rows.map(item => (
              <View
                key={item.publicationItemId}
                style={[
                  styles.tableRow,
                  {
                    borderColor: theme.border,
                    backgroundColor: item.alertId
                      ? theme.background
                      : 'transparent',
                  },
                ]}
              >
                <View style={styles.employeeCell}>
                  <Text style={{ color: theme.text, fontWeight: '900' }}>
                    {item.employeeName}
                  </Text>
                  <Text
                    style={{
                      color: theme.textMuted,
                      marginTop: 2,
                      fontSize: 11,
                    }}
                  >
                    {item.employeeRole}
                    {item.changeKind === 'coverage'
                      ? ' · COBERTURA'
                      : item.changeKind === 'swap'
                        ? ' · INTERCAMBIO'
                        : ''}
                  </Text>
                </View>

                <Text style={[styles.dateCell, { color: theme.text }]}>
                  {item.workDate}
                </Text>

                <View style={styles.timeCell}>
                  <Text style={{ color: theme.text }}>
                    {formatDateTime(item.expectedStart)}
                  </Text>
                  <Text style={{ color: theme.textMuted, marginTop: 2 }}>
                    a {formatDateTime(item.expectedEnd)}
                  </Text>
                </View>

                <View style={styles.timeCell}>
                  <Text style={{ color: theme.text }}>
                    {formatDateTime(item.clockIn)}
                  </Text>
                  <Text style={{ color: theme.textMuted, marginTop: 2 }}>
                    a {formatDateTime(item.clockOut)}
                  </Text>
                </View>

                <View style={styles.statusCell}>
                  <Text
                    style={{
                      color: item.alertId ? theme.danger : theme.text,
                      fontWeight: '900',
                    }}
                  >
                    {statusLabel(item.status)}
                  </Text>
                  {item.alertTitle ? (
                    <Text
                      style={{
                        color: theme.textMuted,
                        marginTop: 3,
                        fontSize: 11,
                      }}
                    >
                      {item.alertTitle}
                    </Text>
                  ) : null}
                </View>

                <View style={styles.deltaCell}>
                  <Text style={{ color: theme.text }}>
                    {minutesLabel(item.varianceMinutes)}
                  </Text>
                  {item.lateMinutes > 0 ? (
                    <Text style={{ color: theme.textMuted, fontSize: 11 }}>
                      retardo {item.lateMinutes} min
                    </Text>
                  ) : null}
                  {item.earlyLeaveMinutes > 0 ? (
                    <Text style={{ color: theme.textMuted, fontSize: 11 }}>
                      salida −{item.earlyLeaveMinutes} min
                    </Text>
                  ) : null}
                  {item.overtimeMinutes > 0 ? (
                    <Text style={{ color: theme.textMuted, fontSize: 11 }}>
                      extra +{item.overtimeMinutes} min
                    </Text>
                  ) : null}
                </View>

                <View style={styles.actionCell}>
                  {item.alertId ? (
                    item.alertReviewedAt ? (
                      <>
                        <Text
                          style={{
                            color: theme.primary,
                            fontWeight: '900',
                          }}
                        >
                          REVISADA
                        </Text>
                        <Text
                          style={{
                            color: theme.textMuted,
                            fontSize: 10,
                            marginTop: 3,
                          }}
                        >
                          {item.alertReviewedByName ?? ''}
                        </Text>
                      </>
                    ) : (
                      <>
                        <TextInput
                          value={noteByAlert[item.alertId] ?? ''}
                          onChangeText={value =>
                            setNoteByAlert(current => ({
                              ...current,
                              [item.alertId!]: value,
                            }))
                          }
                          placeholder="Nota opcional"
                          placeholderTextColor={theme.textMuted}
                          style={[
                            styles.noteInput,
                            {
                              color: theme.text,
                              borderColor: theme.border,
                              backgroundColor: theme.surface,
                            },
                          ]}
                        />
                        <TouchableOpacity
                          onPress={() => void markReviewed(item)}
                          style={[
                            styles.reviewButton,
                            { borderColor: theme.primary },
                          ]}
                        >
                          <Text
                            style={{
                              color: theme.primary,
                              fontWeight: '900',
                              fontSize: 11,
                            }}
                          >
                            MARCAR REVISADA
                          </Text>
                        </TouchableOpacity>
                      </>
                    )
                  ) : (
                    <Text style={{ color: theme.textMuted }}>—</Text>
                  )}
                </View>
              </View>
            ))}
          </View>
        </ScrollView>
      )}

      <Text style={[styles.footer, { color: theme.textMuted }]}>
        “Revisada” significa que Administración ya atendió la alerta; la
        desviación se conserva en el historial. Cuando el turno se normaliza,
        la alerta activa se resuelve automáticamente.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 18,
    gap: 13,
  },
  loading: {
    minHeight: 180,
    alignItems: 'center',
    justifyContent: 'center',
  },
  header: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  headerText: {
    flex: 1,
    minWidth: 250,
  },
  title: {
    fontSize: 18,
    fontWeight: '900',
  },
  help: {
    marginTop: 4,
    fontSize: 11,
    lineHeight: 17,
  },
  button: {
    minHeight: 40,
    borderWidth: 1,
    borderRadius: 9,
    paddingHorizontal: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filters: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  pill: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 11,
    paddingVertical: 8,
  },
  metrics: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  metric: {
    minWidth: 150,
    flexGrow: 1,
    flexBasis: 160,
    borderWidth: 1,
    borderRadius: 10,
    padding: 11,
  },
  metricNumber: {
    fontSize: 22,
    fontWeight: '900',
  },
  table: {
    minWidth: 1280,
  },
  tableRow: {
    minHeight: 72,
    borderBottomWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  tableHeader: {
    minHeight: 38,
  },
  employeeCell: {
    width: 210,
    paddingHorizontal: 8,
  },
  dateCell: {
    width: 110,
    paddingHorizontal: 8,
    fontSize: 12,
  },
  timeCell: {
    width: 180,
    paddingHorizontal: 8,
  },
  statusCell: {
    width: 210,
    paddingHorizontal: 8,
  },
  deltaCell: {
    width: 150,
    paddingHorizontal: 8,
  },
  actionCell: {
    width: 260,
    paddingHorizontal: 8,
  },
  noteInput: {
    minHeight: 34,
    borderWidth: 1,
    borderRadius: 7,
    paddingHorizontal: 8,
    fontSize: 11,
  },
  reviewButton: {
    marginTop: 5,
    minHeight: 30,
    borderWidth: 1,
    borderRadius: 7,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footer: {
    fontSize: 10,
    lineHeight: 16,
  },
});
