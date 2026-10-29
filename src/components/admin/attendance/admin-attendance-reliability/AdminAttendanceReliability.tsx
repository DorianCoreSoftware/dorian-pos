import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';

import {
  ActivityIndicator,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useBusiness } from '../../../../context/BusinessContext';
import { AttendanceEmployeeReliabilityDetail, AttendanceEmployeeReliabilitySummary, syncAttendanceShiftExecution, getAttendanceEmployeeReliabilitySummary, getAttendanceEmployeeReliabilityDetail } from '../../../../services/attendanceService';


type RangeKey = '14' | '30' | '45';

function localDate(date: Date): string {
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function startDate(days: number): string {
  const date = new Date();
  date.setHours(12, 0, 0, 0);
  date.setDate(date.getDate() - Math.max(0, days - 1));
  return localDate(date);
}

function percent(value: number | null): string {
  if (value === null) return 'N/A';
  return `${Math.round(value)}%`;
}

function minutesLabel(value: number): string {
  const hours = Math.floor(Math.abs(value) / 60);
  const minutes = Math.abs(value) % 60;
  const sign = value < 0 ? '−' : value > 0 ? '+' : '';
  if (!hours) return `${sign}${minutes} min`;
  if (!minutes) return `${sign}${hours} h`;
  return `${sign}${hours} h ${minutes} min`;
}

function statusLabel(value: AttendanceEmployeeReliabilityDetail['status']): string {
  switch (value) {
    case 'pending': return 'PENDIENTE';
    case 'in_progress': return 'EN CURSO';
    case 'completed': return 'CUMPLIDO';
    case 'missing_clock_in': return 'ENTRADA PENDIENTE';
    case 'absent': return 'AUSENCIA';
    case 'late': return 'RETARDO';
    case 'early_leave': return 'SALIDA ANTICIPADA';
    case 'late_early_leave': return 'RETARDO + SALIDA ANTICIPADA';
    case 'overtime': return 'HORAS EXTRA';
    case 'open_shift': return 'SALIDA PENDIENTE';
    case 'outside_shift': return 'FUERA DE TURNO';
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

export function AdminAttendanceReliability() {
  const { theme } = useBusiness();

  const [range, setRange] = useState<RangeKey>('30');
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<AttendanceEmployeeReliabilitySummary[]>([]);
  const [selected, setSelected] =
    useState<AttendanceEmployeeReliabilitySummary | null>(null);
  const [detail, setDetail] = useState<AttendanceEmployeeReliabilityDetail[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);

  const dates = useMemo(() => ({
    startDate: startDate(Number(range)),
    endDate: localDate(new Date()),
  }), [range]);

  const load = useCallback(async (): Promise<void> => {
    await syncAttendanceShiftExecution();
    setRows(
      await getAttendanceEmployeeReliabilitySummary({
        startDate: dates.startDate,
        endDate: dates.endDate,
      }),
    );
  }, [dates]);

  useEffect(() => {
    void (async () => {
      try {
        setLoading(true);
        await load();
      } finally {
        setLoading(false);
      }
    })();
  }, [load]);

  const openEmployee = async (
    employee: AttendanceEmployeeReliabilitySummary,
  ): Promise<void> => {
    setSelected(employee);
    setDetailLoading(true);
    try {
      setDetail(
        await getAttendanceEmployeeReliabilityDetail({
          userId: employee.userId,
          startDate: dates.startDate,
          endDate: dates.endDate,
        }),
      );
    } finally {
      setDetailLoading(false);
    }
  };

  const team = useMemo(() => {
    if (rows.length === 0) {
      return {
        averageIndex: 0,
        attendanceRate: 0,
        punctualityRate: 0,
        absences: 0,
        coverage: 0,
      };
    }

    const weighted = (key: 'attendanceRate' | 'punctualityRate') => {
      const valid = rows.filter(row => row.evaluatedShifts > 0);
      if (!valid.length) return 0;
      return valid.reduce((sum, row) => sum + row[key], 0) / valid.length;
    };

    return {
      averageIndex:
        rows.reduce((sum, row) => sum + row.reliabilityIndex, 0) / rows.length,
      attendanceRate: weighted('attendanceRate'),
      punctualityRate: weighted('punctualityRate'),
      absences: rows.reduce((sum, row) => sum + row.absenceCount, 0),
      coverage: rows.reduce((sum, row) => sum + row.coverageAssignments, 0),
    };
  }, [rows]);

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
            Indicadores de confiabilidad operativa
          </Text>

          <Text style={[styles.help, { color: theme.textMuted }]}>
            Resume cumplimiento de turnos publicados. Es una herramienta de
            análisis administrativo; no aplica sanciones ni toma decisiones
            automáticas sobre empleados.
          </Text>
        </View>

        <TouchableOpacity
          onPress={() => void load()}
          style={[
            styles.button,
            {
              borderColor: theme.border,
              backgroundColor: theme.background,
            },
          ]}
        >
          <Text style={{ color: theme.text, fontWeight: '900' }}>
            ACTUALIZAR
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.filters}>
        {(['14', '30', '45'] as RangeKey[]).map(value => (
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
      </View>

      <View style={styles.metrics}>
        <View style={[styles.metric, { borderColor: theme.border }]}>
          <Text style={[styles.metricNumber, { color: theme.primary }]}>
            {Math.round(team.averageIndex)}
          </Text>
          <Text style={{ color: theme.textMuted }}>
            índice orientativo del equipo
          </Text>
        </View>

        <View style={[styles.metric, { borderColor: theme.border }]}>
          <Text style={[styles.metricNumber, { color: theme.primary }]}>
            {percent(team.attendanceRate)}
          </Text>
          <Text style={{ color: theme.textMuted }}>
            asistencia
          </Text>
        </View>

        <View style={[styles.metric, { borderColor: theme.border }]}>
          <Text style={[styles.metricNumber, { color: theme.primary }]}>
            {percent(team.punctualityRate)}
          </Text>
          <Text style={{ color: theme.textMuted }}>
            puntualidad
          </Text>
        </View>

        <View style={[styles.metric, { borderColor: theme.border }]}>
          <Text style={[styles.metricNumber, { color: theme.danger }]}>
            {team.absences}
          </Text>
          <Text style={{ color: theme.textMuted }}>
            ausencias
          </Text>
        </View>
      </View>

      <View
        style={[
          styles.formulaBox,
          {
            borderColor: theme.border,
            backgroundColor: theme.background,
          },
        ]}
      >
        <Text style={{ color: theme.text, fontWeight: '900' }}>
          Cómo se calcula el índice
        </Text>
        <Text style={[styles.formulaText, { color: theme.textMuted }]}>
          35% asistencia + 20% puntualidad + 20% finalización del turno +
          10% consistencia de horas + 15% cumplimiento de coberturas/intercambios.
          Si una persona no tuvo coberturas, ese 15% se elimina del denominador
          y el resto se normaliza a 100. Las horas extra se muestran por separado
          y no suben ni bajan el índice.
        </Text>
      </View>

      {rows.length === 0 ? (
        <Text style={{ color: theme.textMuted }}>
          Todavía no hay turnos ejecutados suficientes para este periodo.
        </Text>
      ) : (
        <ScrollView horizontal showsHorizontalScrollIndicator>
          <View style={styles.table}>
            <View
              style={[
                styles.row,
                styles.headerRow,
                { borderColor: theme.border },
              ]}
            >
              <Text style={[styles.employeeCell, { color: theme.textMuted }]}>
                EMPLEADO
              </Text>
              <Text style={[styles.indexCell, { color: theme.textMuted }]}>
                ÍNDICE
              </Text>
              <Text style={[styles.rateCell, { color: theme.textMuted }]}>
                ASISTENCIA
              </Text>
              <Text style={[styles.rateCell, { color: theme.textMuted }]}>
                PUNTUALIDAD
              </Text>
              <Text style={[styles.rateCell, { color: theme.textMuted }]}>
                FINALIZACIÓN
              </Text>
              <Text style={[styles.rateCell, { color: theme.textMuted }]}>
                CONSISTENCIA
              </Text>
              <Text style={[styles.rateCell, { color: theme.textMuted }]}>
                COBERTURAS
              </Text>
              <Text style={[styles.incidentCell, { color: theme.textMuted }]}>
                SEÑALES
              </Text>
            </View>

            {rows.map(item => (
              <TouchableOpacity
                key={item.userId}
                onPress={() => void openEmployee(item)}
                style={[
                  styles.row,
                  { borderColor: theme.border },
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
                    {item.employeeRole} · {item.evaluatedShifts} turno(s) evaluado(s)
                  </Text>
                </View>

                <Text
                  style={[
                    styles.indexCell,
                    {
                      color: theme.primary,
                      fontWeight: '900',
                      fontSize: 18,
                    },
                  ]}
                >
                  {Math.round(item.reliabilityIndex)}
                </Text>

                <Text style={[styles.rateCell, { color: theme.text }]}>
                  {percent(item.attendanceRate)}
                </Text>

                <Text style={[styles.rateCell, { color: theme.text }]}>
                  {percent(item.punctualityRate)}
                </Text>

                <Text style={[styles.rateCell, { color: theme.text }]}>
                  {percent(item.completionRate)}
                </Text>

                <Text style={[styles.rateCell, { color: theme.text }]}>
                  {percent(item.consistencyRate)}
                </Text>

                <Text style={[styles.rateCell, { color: theme.text }]}>
                  {item.coverageAssignments > 0
                    ? `${item.coverageFulfilled}/${item.coverageAssignments} · ${percent(item.coverageRate)}`
                    : 'N/A'}
                </Text>

                <View style={styles.incidentCell}>
                  <Text style={{ color: theme.text }}>
                    Ausencias {item.absenceCount} · Retardos {item.lateCount}
                  </Text>
                  <Text
                    style={{
                      color: theme.textMuted,
                      marginTop: 2,
                      fontSize: 11,
                    }}
                  >
                    Salidas anticipadas {item.earlyLeaveCount} · Extra{' '}
                    {minutesLabel(item.overtimeMinutes)}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      )}

      <Modal
        visible={Boolean(selected)}
        transparent
        animationType="fade"
        onRequestClose={() => setSelected(null)}
      >
        <View style={styles.backdrop}>
          <View
            style={[
              styles.modal,
              {
                backgroundColor: theme.surface,
                borderColor: theme.border,
              },
            ]}
          >
            <View style={styles.modalHeader}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.modalTitle, { color: theme.text }]}>
                  {selected?.employeeName}
                </Text>
                <Text style={{ color: theme.textMuted, marginTop: 3 }}>
                  {dates.startDate} → {dates.endDate}
                </Text>
              </View>

              <TouchableOpacity
                onPress={() => setSelected(null)}
                style={[styles.button, { borderColor: theme.border }]}
              >
                <Text style={{ color: theme.text, fontWeight: '900' }}>
                  CERRAR
                </Text>
              </TouchableOpacity>
            </View>

            {selected ? (
              <View style={styles.detailMetrics}>
                <View style={[styles.detailMetric, { borderColor: theme.border }]}>
                  <Text style={[styles.detailValue, { color: theme.primary }]}>
                    {Math.round(selected.reliabilityIndex)}
                  </Text>
                  <Text style={{ color: theme.textMuted }}>índice</Text>
                </View>
                <View style={[styles.detailMetric, { borderColor: theme.border }]}>
                  <Text style={[styles.detailValue, { color: theme.text }]}>
                    {selected.attendedShifts}/{selected.evaluatedShifts}
                  </Text>
                  <Text style={{ color: theme.textMuted }}>asistidos</Text>
                </View>
                <View style={[styles.detailMetric, { borderColor: theme.border }]}>
                  <Text style={[styles.detailValue, { color: theme.text }]}>
                    {minutesLabel(selected.overtimeMinutes)}
                  </Text>
                  <Text style={{ color: theme.textMuted }}>tiempo extra</Text>
                </View>
              </View>
            ) : null}

            {detailLoading ? (
              <View style={styles.loading}>
                <ActivityIndicator color={theme.primary} />
              </View>
            ) : (
              <ScrollView>
                {detail.map(item => (
                  <View
                    key={item.publicationItemId}
                    style={[
                      styles.detailRow,
                      { borderColor: theme.border },
                    ]}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: theme.text, fontWeight: '900' }}>
                        {item.workDate} · {statusLabel(item.status)}
                      </Text>
                      <Text style={{ color: theme.textMuted, marginTop: 3 }}>
                        Publicado: {formatDateTime(item.expectedStart)} a{' '}
                        {formatDateTime(item.expectedEnd)}
                      </Text>
                      <Text style={{ color: theme.textMuted, marginTop: 2 }}>
                        Real: {formatDateTime(item.clockIn)} a{' '}
                        {formatDateTime(item.clockOut)}
                      </Text>
                      {item.changeKind ? (
                        <Text style={{ color: theme.primary, marginTop: 3 }}>
                          {item.changeKind === 'coverage'
                            ? 'Cobertura aprobada'
                            : 'Intercambio aprobado'}
                        </Text>
                      ) : null}
                      {item.alertTitle ? (
                        <Text style={{ color: theme.danger, marginTop: 3 }}>
                          {item.alertTitle}
                        </Text>
                      ) : null}
                    </View>

                    <View style={styles.detailDelta}>
                      <Text style={{ color: theme.text, fontWeight: '900' }}>
                        {minutesLabel(item.varianceMinutes)}
                      </Text>
                      <Text style={{ color: theme.textMuted, fontSize: 10 }}>
                        vs planeado
                      </Text>
                    </View>
                  </View>
                ))}

                {detail.length === 0 ? (
                  <Text style={{ color: theme.textMuted }}>
                    No hay turnos evaluados para este empleado en el periodo.
                  </Text>
                ) : null}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
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
    minHeight: 150,
    alignItems: 'center',
    justifyContent: 'center',
  },
  header: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    alignItems: 'flex-start',
    justifyContent: 'space-between',
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
    borderRadius: 8,
    paddingHorizontal: 12,
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
    flexGrow: 1,
    flexBasis: 150,
    minWidth: 145,
    borderWidth: 1,
    borderRadius: 10,
    padding: 11,
  },
  metricNumber: {
    fontSize: 22,
    fontWeight: '900',
  },
  formulaBox: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
  },
  formulaText: {
    marginTop: 5,
    fontSize: 11,
    lineHeight: 17,
  },
  table: {
    minWidth: 1240,
  },
  row: {
    minHeight: 68,
    borderBottomWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerRow: {
    minHeight: 38,
  },
  employeeCell: {
    width: 230,
    paddingHorizontal: 8,
  },
  indexCell: {
    width: 90,
    paddingHorizontal: 8,
  },
  rateCell: {
    width: 120,
    paddingHorizontal: 8,
    fontSize: 12,
  },
  incidentCell: {
    width: 260,
    paddingHorizontal: 8,
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  modal: {
    width: '100%',
    maxWidth: 900,
    maxHeight: '90%',
    borderWidth: 1,
    borderRadius: 14,
    padding: 18,
  },
  modalHeader: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'flex-start',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '900',
  },
  detailMetrics: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginVertical: 12,
  },
  detailMetric: {
    minWidth: 140,
    borderWidth: 1,
    borderRadius: 9,
    padding: 10,
  },
  detailValue: {
    fontSize: 18,
    fontWeight: '900',
  },
  detailRow: {
    borderTopWidth: 1,
    paddingVertical: 10,
    flexDirection: 'row',
    gap: 10,
  },
  detailDelta: {
    width: 100,
    alignItems: 'flex-end',
  },
});
