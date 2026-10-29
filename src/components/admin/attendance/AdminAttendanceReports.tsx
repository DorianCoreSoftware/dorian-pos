import React, {
  useEffect,
  useMemo,
  useState,
} from 'react';

import {
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { useBusiness } from '../../../context/BusinessContext';
import {
  AttendancePeriodReportItem,
  AttendanceReportDay,
  getAttendancePeriodReport,
  getAttendanceReportDays,
} from '../../../services/attendanceService';

function pad(value: number): string {
  return String(value).padStart(2, '0');
}

function toDateInput(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function defaultStartDate(): string {
  const date = new Date();
  date.setDate(date.getDate() - 13);
  return toDateInput(date);
}

function validateDate(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function formatMinutes(total: number): string {
  const absolute = Math.abs(total);
  const hours = Math.floor(absolute / 60);
  const minutes = absolute % 60;
  const sign = total < 0 ? '-' : total > 0 ? '+' : '';
  return `${sign}${hours} h ${minutes} min`;
}

function formatDate(value: string): string {
  const [year, month, day] = value.split('-').map(Number);
  return new Intl.DateTimeFormat('es-MX', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(year, month - 1, day));
}

function formatTime(value: string | null): string {
  if (!value) return '—';
  return new Intl.DateTimeFormat('es-MX', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

function statusLabel(status: string): string {
  const labels: Record<string, string> = {
    off: 'DESCANSO',
    scheduled: 'PROGRAMADO',
    pending_entry: 'ENTRADA PENDIENTE',
    working: 'TRABAJANDO',
    completed: 'COMPLETADO',
    absent: 'FALTA',
    absence_justified: 'FALTA JUSTIFICADA',
    late_justified: 'RETARDO JUSTIFICADO',
    early_leave_justified: 'SALIDA JUSTIFICADA',
    permission: 'PERMISO',
    vacation: 'VACACIONES',
    medical_leave: 'INCAPACIDAD',
  };

  return labels[status] ?? status.toUpperCase().replace(/_/g, ' ');
}

function csvEscape(value: string | number): string {
  const text = String(value ?? '');
  return `"${text.replace(/"/g, '""')}"`;
}

function buildCsv(
  rows: AttendancePeriodReportItem[],
  startDate: string,
  endDate: string,
): string {
  const headers = [
    'Periodo inicio',
    'Periodo fin',
    'Empleado',
    'Rol',
    'Días programados',
    'Días con asistencia',
    'Turnos completos',
    'Turnos abiertos',
    'Faltas',
    'Faltas justificadas',
    'Vacaciones',
    'Incapacidades',
    'Permisos',
    'Días con retardo',
    'Retardos justificados',
    'Minutos de retardo',
    'Salidas anticipadas',
    'Salidas justificadas',
    'Minutos salida anticipada',
    'Días con horas extra',
    'Minutos extra',
    'Minutos trabajados',
    'Minutos programados',
    'Balance minutos',
  ];

  const lines = [headers.map(csvEscape).join(',')];

  rows.forEach(row => {
    lines.push([
      startDate,
      endDate,
      row.employeeName,
      row.employeeRole,
      row.scheduledDays,
      row.workedDays,
      row.completedDays,
      row.openShifts,
      row.absentDays,
      row.justifiedAbsenceDays,
      row.vacationDays,
      row.medicalLeaveDays,
      row.permissionDays,
      row.lateDays,
      row.justifiedLateDays,
      row.totalLateMinutes,
      row.earlyLeaveDays,
      row.justifiedEarlyLeaveDays,
      row.totalEarlyLeaveMinutes,
      row.overtimeDays,
      row.totalOvertimeMinutes,
      row.totalWorkedMinutes,
      row.totalScheduledMinutes,
      row.balanceMinutes,
    ].map(csvEscape).join(','));
  });

  return `\uFEFF${lines.join('\n')}`;
}

async function exportCsv(
  rows: AttendancePeriodReportItem[],
  startDate: string,
  endDate: string,
): Promise<void> {
  const csv = buildCsv(rows, startDate, endDate);
  const filename = `asistencia_${startDate}_${endDate}.csv`;

  if (Platform.OS === 'web') {
    const runtime = globalThis as any;
    const BlobCtor = runtime.Blob;
    const URLApi = runtime.URL;
    const documentApi = runtime.document;

    if (!BlobCtor || !URLApi || !documentApi) {
      throw new Error('El navegador no permite descargar el archivo.');
    }

    const blob = new BlobCtor([csv], {
      type: 'text/csv;charset=utf-8;',
    });
    const url = URLApi.createObjectURL(blob);
    const anchor = documentApi.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    documentApi.body.appendChild(anchor);
    anchor.click();
    documentApi.body.removeChild(anchor);
    URLApi.revokeObjectURL(url);
    return;
  }

  await Share.share({
    title: filename,
    message: csv,
  });
}

export function AdminAttendanceReports() {
  const { theme } = useBusiness();

  const [startDate, setStartDate] = useState(defaultStartDate());
  const [endDate, setEndDate] = useState(toDateInput(new Date()));
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [rows, setRows] = useState<AttendancePeriodReportItem[]>([]);
  const [detailEmployee, setDetailEmployee] = useState<AttendancePeriodReportItem | null>(null);
  const [detailRows, setDetailRows] = useState<AttendanceReportDay[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);

  const loadReport = async (): Promise<void> => {
    if (!validateDate(startDate) || !validateDate(endDate)) {
      Alert.alert('Fechas inválidas', 'Usa el formato AAAA-MM-DD.');
      return;
    }

    if (endDate < startDate) {
      Alert.alert('Fechas inválidas', 'La fecha final debe ser igual o posterior a la inicial.');
      return;
    }

    try {
      setLoading(true);
      const data = await getAttendancePeriodReport({
        startDate,
        endDate,
      });
      setRows(data);
    } catch (error) {
      Alert.alert(
        'No se pudo generar el reporte',
        error instanceof Error ? error.message : 'Ocurrió un error.',
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadReport();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filteredRows = useMemo(() => {
    const query = search.trim().toLocaleLowerCase('es-MX');
    if (!query) return rows;

    return rows.filter(row =>
      row.employeeName.toLocaleLowerCase('es-MX').includes(query) ||
      row.employeeRole.toLocaleLowerCase('es-MX').includes(query),
    );
  }, [rows, search]);

  const totals = useMemo(() => rows.reduce(
    (acc, row) => ({
      scheduledDays: acc.scheduledDays + row.scheduledDays,
      workedDays: acc.workedDays + row.workedDays,
      absentDays: acc.absentDays + row.absentDays,
      lateMinutes: acc.lateMinutes + row.totalLateMinutes,
      overtimeMinutes: acc.overtimeMinutes + row.totalOvertimeMinutes,
      workedMinutes: acc.workedMinutes + row.totalWorkedMinutes,
    }),
    {
      scheduledDays: 0,
      workedDays: 0,
      absentDays: 0,
      lateMinutes: 0,
      overtimeMinutes: 0,
      workedMinutes: 0,
    },
  ), [rows]);

  const openDetail = async (employee: AttendancePeriodReportItem): Promise<void> => {
    setDetailEmployee(employee);
    setDetailRows([]);

    try {
      setDetailLoading(true);
      const data = await getAttendanceReportDays({
        startDate,
        endDate,
        userId: employee.userId,
      });
      setDetailRows(data);
    } catch (error) {
      setDetailEmployee(null);
      Alert.alert(
        'No se pudo cargar el detalle',
        error instanceof Error ? error.message : 'Ocurrió un error.',
      );
    } finally {
      setDetailLoading(false);
    }
  };

  const handleExport = async (): Promise<void> => {
    if (rows.length === 0) {
      Alert.alert('Reporte vacío', 'No hay datos para exportar.');
      return;
    }

    try {
      setExporting(true);
      await exportCsv(rows, startDate, endDate);
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
          <Text style={[styles.title, { color: theme.text }]}>Reportes de asistencia</Text>
          <Text style={[styles.subtitle, { color: theme.textMuted }]}> 
            Consolida jornadas, faltas, incidencias, retardos y horas extra por periodo.
          </Text>
        </View>
      </View>

      <View style={styles.filters}>
        <View style={styles.dateField}>
          <Text style={[styles.label, { color: theme.textMuted }]}>DESDE · AAAA-MM-DD</Text>
          <TextInput
            value={startDate}
            onChangeText={setStartDate}
            style={[styles.input, { color: theme.text, borderColor: theme.border, backgroundColor: theme.background }]}
          />
        </View>

        <View style={styles.dateField}>
          <Text style={[styles.label, { color: theme.textMuted }]}>HASTA · AAAA-MM-DD</Text>
          <TextInput
            value={endDate}
            onChangeText={setEndDate}
            style={[styles.input, { color: theme.text, borderColor: theme.border, backgroundColor: theme.background }]}
          />
        </View>

        <TouchableOpacity
          disabled={loading}
          onPress={() => void loadReport()}
          style={[styles.actionButton, { backgroundColor: theme.primary, opacity: loading ? 0.6 : 1 }]}
        >
          <Text style={{ color: theme.onPrimary, fontWeight: '900' }}>
            {loading ? 'GENERANDO...' : 'GENERAR REPORTE'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          disabled={exporting || loading || rows.length === 0}
          onPress={() => void handleExport()}
          style={[styles.actionButton, { borderColor: theme.primary, borderWidth: 1, opacity: exporting || rows.length === 0 ? 0.55 : 1 }]}
        >
          <Text style={{ color: theme.primary, fontWeight: '900' }}>
            {exporting ? 'EXPORTANDO...' : 'EXPORTAR CSV'}
          </Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator color={theme.primary} />
        </View>
      ) : (
        <>
          <View style={styles.kpiGrid}>
            <Kpi label="DÍAS PROGRAMADOS" value={String(totals.scheduledDays)} theme={theme} />
            <Kpi label="DÍAS CON ASISTENCIA" value={String(totals.workedDays)} theme={theme} />
            <Kpi label="FALTAS" value={String(totals.absentDays)} theme={theme} danger={totals.absentDays > 0} />
            <Kpi label="RETARDO TOTAL" value={formatMinutes(totals.lateMinutes)} theme={theme} />
            <Kpi label="HORAS EXTRA" value={formatMinutes(totals.overtimeMinutes)} theme={theme} />
            <Kpi label="TIEMPO TRABAJADO" value={formatMinutes(totals.workedMinutes)} theme={theme} />
          </View>

          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Buscar empleado..."
            placeholderTextColor={theme.textMuted}
            style={[styles.search, { color: theme.text, borderColor: theme.border, backgroundColor: theme.background }]}
          />

          <ScrollView horizontal showsHorizontalScrollIndicator>
            <View style={styles.table}>
              <View style={[styles.row, styles.header, { borderColor: theme.border }]}> 
                <Text style={[styles.employeeCell, { color: theme.textMuted }]}>EMPLEADO</Text>
                <Text style={[styles.smallCell, { color: theme.textMuted }]}>PROGRAMADOS</Text>
                <Text style={[styles.smallCell, { color: theme.textMuted }]}>ASISTENCIAS</Text>
                <Text style={[styles.smallCell, { color: theme.textMuted }]}>FALTAS</Text>
                <Text style={[styles.mediumCell, { color: theme.textMuted }]}>RETARDOS</Text>
                <Text style={[styles.mediumCell, { color: theme.textMuted }]}>SALIDAS ANT.</Text>
                <Text style={[styles.mediumCell, { color: theme.textMuted }]}>HORAS EXTRA</Text>
                <Text style={[styles.mediumCell, { color: theme.textMuted }]}>TRABAJADO</Text>
                <Text style={[styles.mediumCell, { color: theme.textMuted }]}>BALANCE</Text>
                <Text style={[styles.actionCell, { color: theme.textMuted }]}>DETALLE</Text>
              </View>

              {filteredRows.map(row => (
                <View key={row.userId} style={[styles.row, { borderColor: theme.border }]}> 
                  <View style={styles.employeeCell}>
                    <Text style={{ color: theme.text, fontWeight: '900' }}>{row.employeeName}</Text>
                    <Text style={{ color: theme.textMuted, fontSize: 11 }}>{row.employeeRole}</Text>
                    {(row.vacationDays + row.medicalLeaveDays + row.permissionDays + row.justifiedAbsenceDays) > 0 ? (
                      <Text style={{ color: theme.textMuted, fontSize: 11, marginTop: 3 }}>
                        Justificados: {row.justifiedAbsenceDays} · Vac: {row.vacationDays} · Inc: {row.medicalLeaveDays} · Perm: {row.permissionDays}
                      </Text>
                    ) : null}
                  </View>
                  <Text style={[styles.smallCell, { color: theme.text }]}>{row.scheduledDays}</Text>
                  <Text style={[styles.smallCell, { color: theme.text }]}>{row.workedDays}</Text>
                  <Text style={[styles.smallCell, { color: row.absentDays > 0 ? theme.danger : theme.text }]}>{row.absentDays}</Text>
                  <Text style={[styles.mediumCell, { color: row.totalLateMinutes > 0 ? theme.danger : theme.text }]}>
                    {row.lateDays} · {formatMinutes(row.totalLateMinutes)}{row.justifiedLateDays ? ` · ${row.justifiedLateDays} just.` : ''}
                  </Text>
                  <Text style={[styles.mediumCell, { color: row.totalEarlyLeaveMinutes > 0 ? theme.danger : theme.text }]}>
                    {row.earlyLeaveDays} · {formatMinutes(row.totalEarlyLeaveMinutes)}{row.justifiedEarlyLeaveDays ? ` · ${row.justifiedEarlyLeaveDays} just.` : ''}
                  </Text>
                  <Text style={[styles.mediumCell, { color: theme.text }]}>{formatMinutes(row.totalOvertimeMinutes)}</Text>
                  <Text style={[styles.mediumCell, { color: theme.text }]}>{formatMinutes(row.totalWorkedMinutes)}</Text>
                  <Text style={[styles.mediumCell, { color: row.balanceMinutes < 0 ? theme.danger : theme.primary }]}>{formatMinutes(row.balanceMinutes)}</Text>
                  <View style={styles.actionCell}>
                    <TouchableOpacity
                      onPress={() => void openDetail(row)}
                      style={[styles.detailButton, { borderColor: theme.primary }]}
                    >
                      <Text style={{ color: theme.primary, fontWeight: '900' }}>VER</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))}

              {filteredRows.length === 0 ? (
                <Text style={[styles.empty, { color: theme.textMuted }]}>No hay empleados que coincidan con el filtro.</Text>
              ) : null}
            </View>
          </ScrollView>
        </>
      )}

      <Modal
        visible={Boolean(detailEmployee)}
        transparent
        animationType="fade"
        onRequestClose={() => setDetailEmployee(null)}
      >
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalCard, { backgroundColor: theme.surface, borderColor: theme.border }]}> 
            <View style={styles.modalHeader}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.modalTitle, { color: theme.text }]}>{detailEmployee?.employeeName}</Text>
                <Text style={[styles.modalSubtitle, { color: theme.textMuted }]}> 
                  {formatDate(startDate)} — {formatDate(endDate)}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setDetailEmployee(null)}
                style={[styles.closeButton, { borderColor: theme.border }]}
              >
                <Text style={{ color: theme.text, fontWeight: '900' }}>✕</Text>
              </TouchableOpacity>
            </View>

            {detailLoading ? (
              <View style={styles.loadingBox}>
                <ActivityIndicator color={theme.primary} />
              </View>
            ) : (
              <ScrollView horizontal showsHorizontalScrollIndicator>
                <ScrollView style={{ maxHeight: 520 }}>
                  <View style={styles.detailTable}>
                    <View style={[styles.detailRow, styles.header, { borderColor: theme.border }]}> 
                      <Text style={[styles.detailDate, { color: theme.textMuted }]}>FECHA</Text>
                      <Text style={[styles.detailStatus, { color: theme.textMuted }]}>ESTADO</Text>
                      <Text style={[styles.detailTime, { color: theme.textMuted }]}>HORARIO</Text>
                      <Text style={[styles.detailTime, { color: theme.textMuted }]}>ENTRADA / SALIDA</Text>
                      <Text style={[styles.detailMetric, { color: theme.textMuted }]}>TRABAJADO</Text>
                      <Text style={[styles.detailMetric, { color: theme.textMuted }]}>RETARDO</Text>
                      <Text style={[styles.detailMetric, { color: theme.textMuted }]}>SALIDA ANT.</Text>
                      <Text style={[styles.detailMetric, { color: theme.textMuted }]}>EXTRA</Text>
                    </View>

                    {detailRows.map(day => (
                      <View key={`${day.userId}-${day.workDate}`} style={[styles.detailRow, { borderColor: theme.border }]}> 
                        <Text style={[styles.detailDate, { color: theme.text }]}>{formatDate(day.workDate)}</Text>
                        <View style={styles.detailStatus}>
                          <Text style={{ color: day.dayStatus === 'absent' ? theme.danger : theme.text, fontWeight: '800', fontSize: 12 }}>
                            {statusLabel(day.dayStatus)}
                          </Text>
                          {day.incidentNote ? (
                            <Text numberOfLines={2} style={{ color: theme.textMuted, fontSize: 10, marginTop: 2 }}>{day.incidentNote}</Text>
                          ) : null}
                        </View>
                        <Text style={[styles.detailTime, { color: theme.text }]}>
                          {formatTime(day.expectedStart)} — {formatTime(day.expectedEnd)}
                        </Text>
                        <Text style={[styles.detailTime, { color: theme.text }]}>
                          {formatTime(day.clockIn)} — {formatTime(day.clockOut)}
                        </Text>
                        <Text style={[styles.detailMetric, { color: theme.text }]}>{formatMinutes(day.workedMinutes)}</Text>
                        <Text style={[styles.detailMetric, { color: day.lateMinutes > 0 ? theme.danger : theme.text }]}>{day.lateMinutes} min</Text>
                        <Text style={[styles.detailMetric, { color: day.earlyLeaveMinutes > 0 ? theme.danger : theme.text }]}>{day.earlyLeaveMinutes} min</Text>
                        <Text style={[styles.detailMetric, { color: theme.text }]}>{day.overtimeMinutes} min</Text>
                      </View>
                    ))}
                  </View>
                </ScrollView>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

function Kpi({
  label,
  value,
  theme,
  danger = false,
}: {
  label: string;
  value: string;
  theme: any;
  danger?: boolean;
}) {
  return (
    <View style={[styles.kpi, { backgroundColor: theme.background, borderColor: theme.border }]}> 
      <Text style={[styles.kpiLabel, { color: theme.textMuted }]}>{label}</Text>
      <Text style={[styles.kpiValue, { color: danger ? theme.danger : theme.text }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: 1, borderRadius: 14, padding: 18, gap: 16 },
  headerRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 },
  headerText: { flex: 1 },
  title: { fontSize: 18, fontWeight: '900' },
  subtitle: { marginTop: 4, fontSize: 12, lineHeight: 18 },
  filters: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, alignItems: 'flex-end' },
  dateField: { minWidth: 180, flexGrow: 1, flexBasis: 180 },
  label: { marginBottom: 6, fontSize: 10, fontWeight: '900' },
  input: { minHeight: 42, borderWidth: 1, borderRadius: 8, paddingHorizontal: 10 },
  actionButton: { minHeight: 42, borderRadius: 8, paddingHorizontal: 14, alignItems: 'center', justifyContent: 'center' },
  loadingBox: { minHeight: 120, alignItems: 'center', justifyContent: 'center' },
  kpiGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  kpi: { minWidth: 150, flexGrow: 1, flexBasis: 150, borderWidth: 1, borderRadius: 10, padding: 12 },
  kpiLabel: { fontSize: 10, fontWeight: '900' },
  kpiValue: { marginTop: 5, fontSize: 18, fontWeight: '900' },
  search: { minHeight: 42, borderWidth: 1, borderRadius: 8, paddingHorizontal: 11 },
  table: { minWidth: 1440 },
  row: { flexDirection: 'row', alignItems: 'center', minHeight: 68, borderBottomWidth: 1 },
  header: { minHeight: 40 },
  employeeCell: { width: 250, paddingHorizontal: 9 },
  smallCell: { width: 105, paddingHorizontal: 8, fontSize: 12 },
  mediumCell: { width: 165, paddingHorizontal: 8, fontSize: 12 },
  actionCell: { width: 90, paddingHorizontal: 8 },
  detailButton: { minHeight: 34, borderWidth: 1, borderRadius: 7, alignItems: 'center', justifyContent: 'center' },
  empty: { paddingVertical: 20, paddingHorizontal: 10 },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.65)', alignItems: 'center', justifyContent: 'center', padding: 16 },
  modalCard: { width: '100%', maxWidth: 1180, maxHeight: '88%', borderWidth: 1, borderRadius: 16, padding: 18 },
  modalHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 14 },
  modalTitle: { fontSize: 20, fontWeight: '900' },
  modalSubtitle: { marginTop: 3, fontSize: 12 },
  closeButton: { minWidth: 40, minHeight: 40, borderWidth: 1, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  detailTable: { minWidth: 1120 },
  detailRow: { flexDirection: 'row', alignItems: 'center', minHeight: 58, borderBottomWidth: 1 },
  detailDate: { width: 125, paddingHorizontal: 8, fontSize: 12 },
  detailStatus: { width: 180, paddingHorizontal: 8 },
  detailTime: { width: 175, paddingHorizontal: 8, fontSize: 12 },
  detailMetric: { width: 115, paddingHorizontal: 8, fontSize: 12 },
});
