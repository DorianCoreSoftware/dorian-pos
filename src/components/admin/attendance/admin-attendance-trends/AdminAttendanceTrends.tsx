import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';

import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useBusiness } from '../../../../context/BusinessContext';
import { AttendanceEmployeeTrend, AttendanceTrendTeamSummary, AttendanceWeekdayPattern, syncAttendanceShiftExecution, getAttendanceTeamTrend, getAttendanceEmployeeTrends, getAttendanceWeekdayPatterns } from '../../../../services/attendanceService';

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
  return value === null ? 'N/A' : `${Math.round(value)}%`;
}

function deltaLabel(
  value: number | null,
  suffix = ' pp',
): string {
  if (value === null) return 'Sin periodo previo';
  const rounded = Math.round(value * 10) / 10;
  const sign = rounded > 0 ? '+' : '';
  return `${sign}${rounded}${suffix}`;
}

function countDeltaLabel(value: number | null): string {
  if (value === null) return 'Sin periodo previo';
  const rounded = Math.round(value);
  const sign = rounded > 0 ? '+' : '';
  return `${sign}${rounded}`;
}

function minutesLabel(value: number): string {
  const abs = Math.abs(value);
  const h = Math.floor(abs / 60);
  const m = abs % 60;
  if (!h) return `${m} min`;
  return m ? `${h} h ${m} min` : `${h} h`;
}

function trendLabel(
  value: AttendanceEmployeeTrend['trendDirection'],
): string {
  switch (value) {
    case 'improving':
      return 'MEJORANDO';
    case 'declining':
      return 'DETERIORO';
    case 'stable':
      return 'ESTABLE';
    case 'insufficient_data':
      return 'DATOS INSUFICIENTES';
  }
}

function trendSymbol(
  value: AttendanceEmployeeTrend['trendDirection'],
): string {
  switch (value) {
    case 'improving':
      return '↗';
    case 'declining':
      return '↘';
    case 'stable':
      return '→';
    case 'insufficient_data':
      return '·';
  }
}

export function AdminAttendanceTrends() {
  const { theme } = useBusiness();

  const [range, setRange] = useState<RangeKey>('30');
  const [loading, setLoading] = useState(true);
  const [team, setTeam] = useState<AttendanceTrendTeamSummary | null>(null);
  const [employees, setEmployees] = useState<AttendanceEmployeeTrend[]>([]);
  const [weekdays, setWeekdays] = useState<AttendanceWeekdayPattern[]>([]);

  const dates = useMemo(
    () => ({
      startDate: startDate(Number(range)),
      endDate: localDate(new Date()),
    }),
    [range],
  );

  const load = useCallback(async (): Promise<void> => {
    await syncAttendanceShiftExecution();

    const [teamData, employeeData, weekdayData] = await Promise.all([
      getAttendanceTeamTrend(dates),
      getAttendanceEmployeeTrends(dates),
      getAttendanceWeekdayPatterns(dates),
    ]);

    setTeam(teamData);
    setEmployees(employeeData);
    setWeekdays(weekdayData);
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

  const strongestDay = useMemo(() => {
    const valid = weekdays.filter(item => item.evaluatedShifts > 0);
    return [...valid].sort(
      (a, b) =>
        b.attendanceRate - a.attendanceRate ||
        b.punctualityRate - a.punctualityRate,
    )[0] ?? null;
  }, [weekdays]);

  const riskDay = useMemo(() => {
    const valid = weekdays.filter(item => item.evaluatedShifts > 0);
    return [...valid].sort(
      (a, b) =>
        (b.absenceCount + b.lateCount + b.earlyLeaveCount) -
        (a.absenceCount + a.lateCount + a.earlyLeaveCount),
    )[0] ?? null;
  }, [weekdays]);

  const improving = employees.filter(
    item => item.trendDirection === 'improving',
  ).length;

  const declining = employees.filter(
    item => item.trendDirection === 'declining',
  ).length;

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
            Tendencias y evolución
          </Text>
          <Text style={[styles.help, { color: theme.textMuted }]}>
            Compara el periodo actual con el periodo inmediatamente anterior
            del mismo tamaño y separa evolución temporal de patrones por día.
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
              {value} DÍAS VS {value} ANTERIORES
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {team ? (
        <>
          <View style={styles.metrics}>
            <View style={[styles.metric, { borderColor: theme.border }]}>
              <Text style={[styles.metricNumber, { color: theme.primary }]}>
                {percent(team.currentAttendanceRate)}
              </Text>
              <Text style={{ color: theme.textMuted }}>
                asistencia actual
              </Text>
              <Text
                style={{
                  color:
                    team.attendanceDelta !== null &&
                    team.attendanceDelta < 0
                      ? theme.danger
                      : theme.primary,
                  marginTop: 3,
                  fontWeight: '800',
                }}
              >
                {deltaLabel(team.attendanceDelta)}
              </Text>
            </View>

            <View style={[styles.metric, { borderColor: theme.border }]}>
              <Text style={[styles.metricNumber, { color: theme.primary }]}>
                {percent(team.currentPunctualityRate)}
              </Text>
              <Text style={{ color: theme.textMuted }}>
                puntualidad actual
              </Text>
              <Text
                style={{
                  color:
                    team.punctualityDelta !== null &&
                    team.punctualityDelta < 0
                      ? theme.danger
                      : theme.primary,
                  marginTop: 3,
                  fontWeight: '800',
                }}
              >
                {deltaLabel(team.punctualityDelta)}
              </Text>
            </View>

            <View style={[styles.metric, { borderColor: theme.border }]}>
              <Text style={[styles.metricNumber, { color: theme.danger }]}>
                {team.currentAbsences}
              </Text>
              <Text style={{ color: theme.textMuted }}>
                ausencias actuales
              </Text>
              <Text
                style={{
                  color:
                    team.absenceDelta !== null &&
                    team.absenceDelta > 0
                      ? theme.danger
                      : theme.primary,
                  marginTop: 3,
                  fontWeight: '800',
                }}
              >
                {countDeltaLabel(team.absenceDelta)}
              </Text>
            </View>

            <View style={[styles.metric, { borderColor: theme.border }]}>
              <Text style={[styles.metricNumber, { color: theme.primary }]}>
                {improving}
              </Text>
              <Text style={{ color: theme.textMuted }}>
                empleados mejorando
              </Text>
              <Text
                style={{
                  color: declining > 0 ? theme.danger : theme.textMuted,
                  marginTop: 3,
                  fontWeight: '800',
                }}
              >
                {declining} en deterioro
              </Text>
            </View>
          </View>

          <View
            style={[
              styles.contextBox,
              {
                borderColor: theme.border,
                backgroundColor: theme.background,
              },
            ]}
          >
            <Text style={{ color: theme.text, fontWeight: '900' }}>
              Lectura del periodo
            </Text>
            <Text style={[styles.contextText, { color: theme.textMuted }]}>
              Se evaluaron {team.currentEvaluatedShifts} turno(s) en el periodo
              actual y {team.previousEvaluatedShifts} en el anterior.
              {team.previousEvaluatedShifts === 0
                ? ' Todavía no hay base previa suficiente para calcular tendencia.'
                : ''}
            </Text>
          </View>
        </>
      ) : null}

      <Text style={[styles.sectionTitle, { color: theme.text }]}>
        Evolución por empleado
      </Text>

      {employees.length === 0 ? (
        <Text style={{ color: theme.textMuted }}>
          No hay datos suficientes para comparar empleados.
        </Text>
      ) : (
        <ScrollView horizontal showsHorizontalScrollIndicator>
          <View style={styles.employeeTable}>
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
              <Text style={[styles.trendCell, { color: theme.textMuted }]}>
                TENDENCIA
              </Text>
              <Text style={[styles.metricCell, { color: theme.textMuted }]}>
                ASISTENCIA
              </Text>
              <Text style={[styles.metricCell, { color: theme.textMuted }]}>
                PUNTUALIDAD
              </Text>
              <Text style={[styles.metricCell, { color: theme.textMuted }]}>
                AUSENCIAS
              </Text>
              <Text style={[styles.metricCell, { color: theme.textMuted }]}>
                RETARDOS
              </Text>
              <Text style={[styles.sampleCell, { color: theme.textMuted }]}>
                MUESTRA
              </Text>
            </View>

            {employees.map(item => (
              <View
                key={item.userId}
                style={[styles.row, { borderColor: theme.border }]}
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
                  </Text>
                </View>

                <View style={styles.trendCell}>
                  <Text
                    style={{
                      color:
                        item.trendDirection === 'declining'
                          ? theme.danger
                          : item.trendDirection === 'improving'
                            ? theme.primary
                            : theme.textMuted,
                      fontWeight: '900',
                    }}
                  >
                    {trendSymbol(item.trendDirection)}{' '}
                    {trendLabel(item.trendDirection)}
                  </Text>
                </View>

                <View style={styles.metricCell}>
                  <Text style={{ color: theme.text, fontWeight: '800' }}>
                    {percent(item.currentAttendanceRate)}
                  </Text>
                  <Text
                    style={{
                      color:
                        item.attendanceDelta !== null &&
                        item.attendanceDelta < 0
                          ? theme.danger
                          : theme.textMuted,
                      fontSize: 11,
                      marginTop: 2,
                    }}
                  >
                    {deltaLabel(item.attendanceDelta)}
                  </Text>
                </View>

                <View style={styles.metricCell}>
                  <Text style={{ color: theme.text, fontWeight: '800' }}>
                    {percent(item.currentPunctualityRate)}
                  </Text>
                  <Text
                    style={{
                      color:
                        item.punctualityDelta !== null &&
                        item.punctualityDelta < 0
                          ? theme.danger
                          : theme.textMuted,
                      fontSize: 11,
                      marginTop: 2,
                    }}
                  >
                    {deltaLabel(item.punctualityDelta)}
                  </Text>
                </View>

                <View style={styles.metricCell}>
                  <Text style={{ color: theme.text, fontWeight: '800' }}>
                    {item.currentAbsenceCount}
                  </Text>
                  <Text
                    style={{
                      color:
                        item.absenceDelta !== null &&
                        item.absenceDelta > 0
                          ? theme.danger
                          : theme.textMuted,
                      fontSize: 11,
                      marginTop: 2,
                    }}
                  >
                    {countDeltaLabel(item.absenceDelta)}
                  </Text>
                </View>

                <View style={styles.metricCell}>
                  <Text style={{ color: theme.text, fontWeight: '800' }}>
                    {item.currentLateCount}
                  </Text>
                  <Text
                    style={{
                      color:
                        item.lateDelta !== null &&
                        item.lateDelta > 0
                          ? theme.danger
                          : theme.textMuted,
                      fontSize: 11,
                      marginTop: 2,
                    }}
                  >
                    {countDeltaLabel(item.lateDelta)}
                  </Text>
                </View>

                <Text style={[styles.sampleCell, { color: theme.text }]}>
                  {item.currentEvaluatedShifts} vs {item.previousEvaluatedShifts}
                </Text>
              </View>
            ))}
          </View>
        </ScrollView>
      )}

      <View style={styles.patternHeader}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>
            Patrones por día de la semana
          </Text>
          <Text style={[styles.help, { color: theme.textMuted }]}>
            Usa solo el periodo actual. Sirve para identificar concentración
            de incidencias; no implica que el día sea la causa.
          </Text>
        </View>
      </View>

      <View style={styles.patternSummary}>
        <View
          style={[
            styles.smallSummary,
            { borderColor: theme.border },
          ]}
        >
          <Text style={{ color: theme.textMuted, fontSize: 11 }}>
            MEJOR COMPORTAMIENTO
          </Text>
          <Text style={{ color: theme.primary, fontWeight: '900', marginTop: 3 }}>
            {strongestDay
              ? `${strongestDay.dayName} · ${percent(strongestDay.attendanceRate)} asistencia`
              : 'Sin datos'}
          </Text>
        </View>

        <View
          style={[
            styles.smallSummary,
            { borderColor: theme.border },
          ]}
        >
          <Text style={{ color: theme.textMuted, fontSize: 11 }}>
            MÁS INCIDENCIAS
          </Text>
          <Text style={{ color: theme.danger, fontWeight: '900', marginTop: 3 }}>
            {riskDay
              ? `${riskDay.dayName} · ${
                  riskDay.absenceCount +
                  riskDay.lateCount +
                  riskDay.earlyLeaveCount
                } señal(es)`
              : 'Sin datos'}
          </Text>
        </View>
      </View>

      <View style={styles.weekdayGrid}>
        {weekdays.map(day => (
          <View
            key={day.dayOfWeek}
            style={[
              styles.dayCard,
              {
                borderColor: theme.border,
                backgroundColor: theme.background,
              },
            ]}
          >
            <Text style={{ color: theme.text, fontWeight: '900' }}>
              {day.dayName}
            </Text>
            <Text
              style={{
                color: theme.primary,
                marginTop: 5,
                fontWeight: '900',
              }}
            >
              {percent(day.attendanceRate)} asistencia
            </Text>
            <Text style={{ color: theme.textMuted, marginTop: 3, fontSize: 11 }}>
              {percent(day.punctualityRate)} puntualidad
            </Text>
            <Text style={{ color: theme.textMuted, marginTop: 3, fontSize: 11 }}>
              {day.evaluatedShifts} turnos · {day.absenceCount} aus. ·{' '}
              {day.lateCount} ret. · {day.earlyLeaveCount} sal. ant.
            </Text>
            <Text style={{ color: theme.textMuted, marginTop: 3, fontSize: 11 }}>
              Extra: {minutesLabel(day.overtimeMinutes)}
            </Text>
          </View>
        ))}
      </View>

      <Text style={[styles.footer, { color: theme.textMuted }]}>
        “Mejorando” y “deterioro” requieren datos en ambos periodos. La
        clasificación combina cambios en asistencia y puntualidad, y considera
        también el movimiento de ausencias y retardos. Es una señal de análisis,
        no una decisión automática.
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
    minWidth: 260,
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
  contextBox: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
  },
  contextText: {
    marginTop: 5,
    fontSize: 11,
    lineHeight: 17,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '900',
  },
  employeeTable: {
    minWidth: 1150,
  },
  row: {
    minHeight: 67,
    borderBottomWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerRow: {
    minHeight: 38,
  },
  employeeCell: {
    width: 220,
    paddingHorizontal: 8,
  },
  trendCell: {
    width: 165,
    paddingHorizontal: 8,
  },
  metricCell: {
    width: 135,
    paddingHorizontal: 8,
  },
  sampleCell: {
    width: 120,
    paddingHorizontal: 8,
  },
  patternHeader: {
    flexDirection: 'row',
    gap: 10,
  },
  patternSummary: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  smallSummary: {
    flexGrow: 1,
    flexBasis: 220,
    minWidth: 190,
    borderWidth: 1,
    borderRadius: 10,
    padding: 11,
  },
  weekdayGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  dayCard: {
    flexGrow: 1,
    flexBasis: 190,
    minWidth: 175,
    borderWidth: 1,
    borderRadius: 10,
    padding: 11,
  },
  footer: {
    fontSize: 10,
    lineHeight: 16,
  },
});
