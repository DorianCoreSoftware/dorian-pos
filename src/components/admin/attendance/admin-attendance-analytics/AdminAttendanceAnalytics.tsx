import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';

import {
  ActivityIndicator,
  Alert,
  Platform,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import {
  AttendancePeriodReportItem,
  AttendanceReportDay,
  getAttendancePeriodReport,
  getAttendanceReportDays,
} from '../../../../services/attendanceService';

import {
  useBusiness,
} from '../../../../context/BusinessContext';
import { DateCalendarField } from '../../../common/date-calendar-field/DateCalendarField';

type PresetDays = 30 | 90 | 180 | 365;

type MonthlyTrend = {
  key: string;
  label: string;
  scheduledDays: number;
  workedDays: number;
  absentDays: number;
  lateDays: number;
  overtimeMinutes: number;
};

function localDateInput(date: Date): string {
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function presetStart(days: PresetDays): string {
  const date = new Date();
  date.setDate(date.getDate() - (days - 1));
  return localDateInput(date);
}

function minutesLabel(minutes: number): string {
  const safe = Math.max(0, Math.round(minutes));
  const hours = Math.floor(safe / 60);
  const rest = safe % 60;
  if (hours <= 0) return `${rest} min`;
  return `${hours} h ${rest} min`;
}

function signedMinutesLabel(minutes: number): string {
  const sign = minutes > 0 ? '+' : minutes < 0 ? '−' : '';
  return `${sign}${minutesLabel(Math.abs(minutes))}`;
}

function pct(value: number, total: number): number {
  if (total <= 0) return 0;
  return Math.max(0, Math.min(100, (value / total) * 100));
}

function csvCell(value: unknown): string {
  const text = String(value ?? '');
  return `"${text.replace(/"/g, '""')}"`;
}

async function exportCsv(filename: string, rows: string[][]): Promise<void> {
  const content = rows.map(row => row.map(csvCell).join(',')).join('\n');

  if (Platform.OS === 'web') {
    const scope = globalThis as any;
    if (!scope?.document || !scope?.URL || !scope?.Blob) {
      throw new Error('El navegador no permite descargar el archivo.');
    }

    const blob = new scope.Blob([`\uFEFF${content}`], {
      type: 'text/csv;charset=utf-8;',
    });
    const url = scope.URL.createObjectURL(blob);
    const anchor = scope.document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    scope.document.body.appendChild(anchor);
    anchor.click();
    scope.document.body.removeChild(anchor);
    scope.URL.revokeObjectURL(url);
    return;
  }

  await Share.share({
    title: filename,
    message: content,
  });
}

function MetricCard({
  label,
  value,
  help,
  theme,
}: {
  label: string;
  value: string;
  help?: string;
  theme: any;
}) {
  return (
    <View
      style={[
        styles.metricCard,
        {
          backgroundColor: theme.surfaceAlt,
          borderColor: theme.border,
        },
      ]}
    >
      <Text style={[styles.metricLabel, { color: theme.textMuted }]}>{label}</Text>
      <Text style={[styles.metricValue, { color: theme.text }]}>{value}</Text>
      {help ? (
        <Text style={[styles.metricHelp, { color: theme.textMuted }]}>{help}</Text>
      ) : null}
    </View>
  );
}

export function AdminAttendanceAnalytics() {
  const { theme } = useBusiness();

  const [startDate, setStartDate] = useState(presetStart(90));
  const [endDate, setEndDate] = useState(localDateInput(new Date()));
  const [preset, setPreset] = useState<PresetDays | null>(90);
  const [summary, setSummary] = useState<AttendancePeriodReportItem[]>([]);
  const [days, setDays] = useState<AttendanceReportDay[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  const load = useCallback(async (): Promise<void> => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate) || !/^\d{4}-\d{2}-\d{2}$/.test(endDate)) {
      Alert.alert('Analítica', 'Selecciona un rango de fechas válido.');
      return;
    }

    if (startDate > endDate) {
      Alert.alert('Analítica', 'La fecha inicial no puede ser posterior a la final.');
      return;
    }

    try {
      setLoading(true);
      const [report, detail] = await Promise.all([
        getAttendancePeriodReport({ startDate, endDate }),
        getAttendanceReportDays({ startDate, endDate }),
      ]);
      setSummary(report);
      setDays(detail);
    } catch (error) {
      console.error('Error cargando analítica de asistencia:', error);
      Alert.alert(
        'No se pudo cargar la analítica',
        error instanceof Error ? error.message : 'Ocurrió un error.',
      );
    } finally {
      setLoading(false);
    }
  }, [endDate, startDate]);

  useEffect(() => {
    void load();
  }, [load]);

  const totals = useMemo(() => {
    return summary.reduce(
      (acc, item) => ({
        employees: acc.employees + 1,
        scheduledDays: acc.scheduledDays + item.scheduledDays,
        workedDays: acc.workedDays + item.workedDays,
        absentDays: acc.absentDays + item.absentDays,
        justifiedAbsenceDays: acc.justifiedAbsenceDays + item.justifiedAbsenceDays,
        lateDays: acc.lateDays + item.lateDays,
        lateMinutes: acc.lateMinutes + item.totalLateMinutes,
        earlyLeaveDays: acc.earlyLeaveDays + item.earlyLeaveDays,
        overtimeMinutes: acc.overtimeMinutes + item.totalOvertimeMinutes,
        workedMinutes: acc.workedMinutes + item.totalWorkedMinutes,
        scheduledMinutes: acc.scheduledMinutes + item.totalScheduledMinutes,
        balanceMinutes: acc.balanceMinutes + item.balanceMinutes,
      }),
      {
        employees: 0,
        scheduledDays: 0,
        workedDays: 0,
        absentDays: 0,
        justifiedAbsenceDays: 0,
        lateDays: 0,
        lateMinutes: 0,
        earlyLeaveDays: 0,
        overtimeMinutes: 0,
        workedMinutes: 0,
        scheduledMinutes: 0,
        balanceMinutes: 0,
      },
    );
  }, [summary]);

  const attendanceRate = pct(
    Math.max(0, totals.scheduledDays - totals.absentDays),
    totals.scheduledDays,
  );
  const punctualityRate = pct(
    Math.max(0, totals.workedDays - totals.lateDays),
    totals.workedDays,
  );

  const monthly = useMemo<MonthlyTrend[]>(() => {
    const map = new Map<string, MonthlyTrend>();

    for (const item of days) {
      const key = item.workDate.slice(0, 7);
      let row = map.get(key);
      if (!row) {
        const [year, month] = key.split('-').map(Number);
        row = {
          key,
          label: new Intl.DateTimeFormat('es-MX', {
            month: 'short',
            year: 'numeric',
          }).format(new Date(year, month - 1, 1)),
          scheduledDays: 0,
          workedDays: 0,
          absentDays: 0,
          lateDays: 0,
          overtimeMinutes: 0,
        };
        map.set(key, row);
      }

      if (item.isWorking) row.scheduledDays += 1;
      if (item.clockIn) row.workedDays += 1;
      if (item.dayStatus === 'absent') row.absentDays += 1;
      if (item.lateMinutes > 0) row.lateDays += 1;
      row.overtimeMinutes += item.overtimeMinutes ?? 0;
    }

    return Array.from(map.values()).sort((a, b) => a.key.localeCompare(b.key));
  }, [days]);

  const employeeRows = useMemo(() => {
    return summary
      .map(item => ({
        ...item,
        attendanceRate: pct(Math.max(0, item.scheduledDays - item.absentDays), item.scheduledDays),
        punctualityRate: pct(Math.max(0, item.workedDays - item.lateDays), item.workedDays),
      }))
      .sort((a, b) => {
        if (a.absentDays !== b.absentDays) return b.absentDays - a.absentDays;
        if (a.lateDays !== b.lateDays) return b.lateDays - a.lateDays;
        return a.employeeName.localeCompare(b.employeeName, 'es');
      });
  }, [summary]);

  const patterns = useMemo(() => {
    const alerts: Array<{
      key: string;
      title: string;
      detail: string;
      severity: 'warning' | 'danger' | 'info';
    }> = [];

    for (const item of employeeRows) {
      if (item.absentDays >= 2) {
        alerts.push({
          key: `${item.userId}-absence`,
          title: `${item.employeeName} · ausencias recurrentes`,
          detail: `${item.absentDays} ausencia(s) no justificada(s) en el periodo.`,
          severity: 'danger',
        });
      }

      if (item.lateDays >= 3) {
        alerts.push({
          key: `${item.userId}-late`,
          title: `${item.employeeName} · retardos recurrentes`,
          detail: `${item.lateDays} día(s) con retardo · ${minutesLabel(item.totalLateMinutes)} acumulados.`,
          severity: 'warning',
        });
      }

      if (item.totalOvertimeMinutes >= 240) {
        alerts.push({
          key: `${item.userId}-overtime`,
          title: `${item.employeeName} · horas extra elevadas`,
          detail: `${minutesLabel(item.totalOvertimeMinutes)} de tiempo extra en el periodo.`,
          severity: 'info',
        });
      }

      if (item.balanceMinutes <= -240) {
        alerts.push({
          key: `${item.userId}-balance`,
          title: `${item.employeeName} · balance negativo`,
          detail: `${signedMinutesLabel(item.balanceMinutes)} entre tiempo trabajado y programado.`,
          severity: 'warning',
        });
      }
    }

    return alerts.slice(0, 20);
  }, [employeeRows]);

  const applyPreset = (value: PresetDays): void => {
    setPreset(value);
    setStartDate(presetStart(value));
    setEndDate(localDateInput(new Date()));
  };

  const handleExport = async (): Promise<void> => {
    try {
      setExporting(true);
      const rows: string[][] = [
        [
          'Empleado',
          'Rol',
          'Dias programados',
          'Dias trabajados',
          'Ausencias no justificadas',
          'Ausencias justificadas',
          'Dias con retardo',
          'Minutos retardo',
          'Salidas anticipadas',
          'Minutos horas extra',
          'Minutos trabajados',
          'Minutos programados',
          'Balance minutos',
          'Asistencia %',
          'Puntualidad %',
        ],
        ...employeeRows.map(item => [
          item.employeeName,
          item.employeeRole,
          String(item.scheduledDays),
          String(item.workedDays),
          String(item.absentDays),
          String(item.justifiedAbsenceDays),
          String(item.lateDays),
          String(item.totalLateMinutes),
          String(item.earlyLeaveDays),
          String(item.totalOvertimeMinutes),
          String(item.totalWorkedMinutes),
          String(item.totalScheduledMinutes),
          String(item.balanceMinutes),
          item.attendanceRate.toFixed(1),
          item.punctualityRate.toFixed(1),
        ]),
      ];

      await exportCsv(
        `analitica-asistencia-${startDate}-a-${endDate}.csv`,
        rows,
      );
    } catch (error) {
      Alert.alert(
        'No se pudo exportar',
        error instanceof Error ? error.message : 'Ocurrió un error.',
      );
    } finally {
      setExporting(false);
    }
  };

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
      <View style={styles.headerRow}>
        <View style={styles.headerText}>
          <Text style={[styles.title, { color: theme.text }]}>Analítica de asistencia</Text>
          <Text style={[styles.subtitle, { color: theme.textMuted }]}> 
            Tendencias, comparativa por empleado y patrones que requieren revisión.
          </Text>
        </View>

        <TouchableOpacity
          disabled={loading || exporting}
          onPress={() => void handleExport()}
          style={[
            styles.outlineButton,
            {
              borderColor: theme.primary,
              opacity: loading || exporting ? 0.5 : 1,
            },
          ]}
        >
          <Text style={{ color: theme.primary, fontWeight: '900' }}>
            {exporting ? 'EXPORTANDO...' : 'EXPORTAR CSV'}
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.presetRow}>
        {([30, 90, 180, 365] as PresetDays[]).map(value => {
          const active = preset === value;
          return (
            <TouchableOpacity
              key={value}
              onPress={() => applyPreset(value)}
              style={[
                styles.presetButton,
                {
                  borderColor: active ? theme.primary : theme.border,
                  backgroundColor: active ? theme.surfaceAlt : theme.surface,
                },
              ]}
            >
              <Text style={{ color: active ? theme.primary : theme.textMuted, fontWeight: '800' }}>
                {value} DÍAS
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <View style={styles.filtersRow}>
        <View style={styles.dateField}>
          <DateCalendarField label="Desde" value={startDate} maximumDate={endDate} onChange={value => { setPreset(null); setStartDate(value); }} />
        </View>

        <View style={styles.dateField}>
          <DateCalendarField label="Hasta" value={endDate} minimumDate={startDate} onChange={value => { setPreset(null); setEndDate(value); }} />
        </View>

        <TouchableOpacity
          disabled={loading}
          onPress={() => void load()}
          style={[styles.primaryButton, { backgroundColor: theme.primary, opacity: loading ? 0.55 : 1 }]}
        >
          <Text style={{ color: theme.onPrimary, fontWeight: '900' }}>
            {loading ? 'CARGANDO...' : 'ACTUALIZAR'}
          </Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator size="large" color={theme.primary} />
        </View>
      ) : (
        <>
          <View style={styles.metricsGrid}>
            <MetricCard label="EMPLEADOS" value={String(totals.employees)} theme={theme} />
            <MetricCard label="ASISTENCIA" value={`${attendanceRate.toFixed(1)}%`} help={`${totals.absentDays} ausencia(s) no justificadas`} theme={theme} />
            <MetricCard label="PUNTUALIDAD" value={`${punctualityRate.toFixed(1)}%`} help={`${totals.lateDays} día(s) con retardo`} theme={theme} />
            <MetricCard label="RETARDO ACUMULADO" value={minutesLabel(totals.lateMinutes)} theme={theme} />
            <MetricCard label="HORAS EXTRA" value={minutesLabel(totals.overtimeMinutes)} theme={theme} />
            <MetricCard label="BALANCE" value={signedMinutesLabel(totals.balanceMinutes)} help="Trabajado vs programado" theme={theme} />
          </View>

          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Tendencia mensual</Text>
            <Text style={[styles.sectionSubtitle, { color: theme.textMuted }]}>Cada barra muestra la proporción de días con asistencia dentro de los días programados.</Text>

            {monthly.length === 0 ? (
              <Text style={[styles.emptyText, { color: theme.textMuted }]}>No hay datos en este periodo.</Text>
            ) : monthly.map(item => {
              const rate = pct(Math.max(0, item.scheduledDays - item.absentDays), item.scheduledDays);
              return (
                <View key={item.key} style={styles.trendRow}>
                  <View style={styles.trendHeader}>
                    <Text style={[styles.trendLabel, { color: theme.text }]}>{item.label}</Text>
                    <Text style={[styles.trendValue, { color: theme.textMuted }]}> 
                      {rate.toFixed(1)}% · {item.absentDays} faltas · {item.lateDays} retardos · {minutesLabel(item.overtimeMinutes)} extra
                    </Text>
                  </View>
                  <View style={[styles.track, { backgroundColor: theme.background, borderColor: theme.border }]}>
                    <View style={[styles.fill, { width: `${rate}%`, backgroundColor: theme.primary }]} />
                  </View>
                </View>
              );
            })}
          </View>

          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Patrones a revisar</Text>
            <Text style={[styles.sectionSubtitle, { color: theme.textMuted }]}>Son señales estadísticas; no sustituyen una revisión de incidencias o contexto laboral.</Text>

            {patterns.length === 0 ? (
              <Text style={[styles.emptyText, { color: theme.textMuted }]}>No detectamos patrones relevantes con los umbrales actuales.</Text>
            ) : patterns.map(item => {
              const borderColor = item.severity === 'danger'
                ? theme.danger
                : item.severity === 'warning'
                  ? theme.primary
                  : theme.border;
              return (
                <View key={item.key} style={[styles.patternCard, { borderColor, backgroundColor: theme.surfaceAlt }]}>
                  <Text style={[styles.patternTitle, { color: theme.text }]}>{item.title}</Text>
                  <Text style={[styles.patternDetail, { color: theme.textMuted }]}>{item.detail}</Text>
                </View>
              );
            })}
          </View>

          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Comparativa por empleado</Text>
            <Text style={[styles.sectionSubtitle, { color: theme.textMuted }]}>Ordenada primero por ausencias no justificadas y después por retardos.</Text>

            <ScrollView horizontal showsHorizontalScrollIndicator>
              <View style={styles.table}>
                <View style={[styles.tableRow, styles.tableHeader, { borderColor: theme.border }]}>
                  <Text style={[styles.employeeCell, styles.headerCell, { color: theme.textMuted }]}>EMPLEADO</Text>
                  <Text style={[styles.numberCell, styles.headerCell, { color: theme.textMuted }]}>ASIST.</Text>
                  <Text style={[styles.numberCell, styles.headerCell, { color: theme.textMuted }]}>PUNT.</Text>
                  <Text style={[styles.numberCell, styles.headerCell, { color: theme.textMuted }]}>FALTAS</Text>
                  <Text style={[styles.numberCell, styles.headerCell, { color: theme.textMuted }]}>RETARDOS</Text>
                  <Text style={[styles.timeCell, styles.headerCell, { color: theme.textMuted }]}>RETARDO</Text>
                  <Text style={[styles.timeCell, styles.headerCell, { color: theme.textMuted }]}>EXTRA</Text>
                  <Text style={[styles.timeCell, styles.headerCell, { color: theme.textMuted }]}>BALANCE</Text>
                </View>

                {employeeRows.map(item => (
                  <View key={item.userId} style={[styles.tableRow, { borderColor: theme.border }]}>
                    <View style={styles.employeeCell}>
                      <Text style={{ color: theme.text, fontWeight: '800' }}>{item.employeeName}</Text>
                      <Text style={{ color: theme.textMuted, fontSize: 11 }}>{item.employeeRole}</Text>
                    </View>
                    <Text style={[styles.numberCell, { color: theme.text }]}>{item.attendanceRate.toFixed(1)}%</Text>
                    <Text style={[styles.numberCell, { color: theme.text }]}>{item.punctualityRate.toFixed(1)}%</Text>
                    <Text style={[styles.numberCell, { color: item.absentDays > 0 ? theme.danger : theme.text }]}>{item.absentDays}</Text>
                    <Text style={[styles.numberCell, { color: item.lateDays > 0 ? theme.primary : theme.text }]}>{item.lateDays}</Text>
                    <Text style={[styles.timeCell, { color: theme.text }]}>{minutesLabel(item.totalLateMinutes)}</Text>
                    <Text style={[styles.timeCell, { color: theme.text }]}>{minutesLabel(item.totalOvertimeMinutes)}</Text>
                    <Text style={[styles.timeCell, { color: item.balanceMinutes < 0 ? theme.danger : theme.text }]}>{signedMinutesLabel(item.balanceMinutes)}</Text>
                  </View>
                ))}
              </View>
            </ScrollView>
          </View>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: 1, borderRadius: 14, padding: 18, gap: 16 },
  headerRow: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 },
  headerText: { flexGrow: 1, flexBasis: 280 },
  title: { fontSize: 20, fontWeight: '900' },
  subtitle: { marginTop: 4, fontSize: 12, lineHeight: 18 },
  outlineButton: { minHeight: 42, borderWidth: 1, borderRadius: 9, paddingHorizontal: 14, alignItems: 'center', justifyContent: 'center' },
  presetRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  presetButton: { minHeight: 38, borderWidth: 1, borderRadius: 9, paddingHorizontal: 12, alignItems: 'center', justifyContent: 'center' },
  filtersRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, alignItems: 'flex-end' },
  dateField: { flexGrow: 1, flexBasis: 180, minWidth: 160 },
  fieldLabel: { marginBottom: 5, fontSize: 11, fontWeight: '900' },
  input: { minHeight: 42, borderWidth: 1, borderRadius: 9, paddingHorizontal: 11 },
  primaryButton: { minHeight: 42, borderRadius: 9, paddingHorizontal: 16, alignItems: 'center', justifyContent: 'center' },
  loadingBox: { minHeight: 180, alignItems: 'center', justifyContent: 'center' },
  metricsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  metricCard: { flexGrow: 1, flexBasis: 170, minWidth: 150, borderWidth: 1, borderRadius: 11, padding: 13 },
  metricLabel: { fontSize: 10, fontWeight: '900' },
  metricValue: { marginTop: 5, fontSize: 22, fontWeight: '900' },
  metricHelp: { marginTop: 4, fontSize: 10, lineHeight: 14 },
  section: { gap: 10, marginTop: 2 },
  sectionTitle: { fontSize: 16, fontWeight: '900' },
  sectionSubtitle: { marginTop: -6, fontSize: 11, lineHeight: 16 },
  emptyText: { paddingVertical: 10, fontSize: 12 },
  trendRow: { gap: 6 },
  trendHeader: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 6 },
  trendLabel: { fontSize: 12, fontWeight: '900', textTransform: 'capitalize' },
  trendValue: { fontSize: 11 },
  track: { height: 10, borderWidth: 1, borderRadius: 5, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 5 },
  patternCard: { borderWidth: 1, borderRadius: 10, padding: 12 },
  patternTitle: { fontSize: 12, fontWeight: '900' },
  patternDetail: { marginTop: 3, fontSize: 11, lineHeight: 16 },
  table: { minWidth: 970 },
  tableRow: { flexDirection: 'row', alignItems: 'center', minHeight: 52, borderBottomWidth: 1 },
  tableHeader: { minHeight: 38 },
  headerCell: { fontSize: 10, fontWeight: '900' },
  employeeCell: { width: 220, paddingHorizontal: 8 },
  numberCell: { width: 90, paddingHorizontal: 8, fontSize: 12, textAlign: 'center' },
  timeCell: { width: 120, paddingHorizontal: 8, fontSize: 12, textAlign: 'right' },
});
