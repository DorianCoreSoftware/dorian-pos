import React, { useEffect, useMemo, useState } from 'react';
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

import { useBusiness } from '../../../../context/BusinessContext';
import { DateCalendarField, DateTimeCalendarField } from '../../../common/date-calendar-field/DateCalendarField';
import {
  AttendanceDailySummaryItem,
  AttendanceEmployee,
  AttendanceEmployeePayrollHistoryItem,
  AttendanceIncident,
  AttendancePeriodReportItem,
  getAttendanceDailySummary,
  getAttendanceEmployeePayrollHistory,
  getAttendanceEmployees,
  getAttendanceIncidents,
  getAttendancePeriodReport,
} from '../../../../services/attendanceService';

function pad(value: number): string {
  return String(value).padStart(2, '0');
}

function dateInput(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function defaultStartDate(): string {
  const date = new Date();
  date.setDate(date.getDate() - 89);
  return dateInput(date);
}

function minutesLabel(value: number): string {
  const safe = Math.max(0, Math.round(value));
  return `${Math.floor(safe / 60)} h ${safe % 60} min`;
}

function money(value: number, currency: string): string {
  try {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency,
      maximumFractionDigits: 2,
    }).format(value);
  } catch {
    return `${currency} ${value.toFixed(2)}`;
  }
}

function paymentLabel(value: string | null): string {
  if (value === 'cash') return 'Efectivo';
  if (value === 'transfer') return 'Transferencia';
  if (value === 'card') return 'Tarjeta';
  if (value === 'other') return 'Otro';
  return '—';
}

function dateTime(value: string | null): string {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString('es-MX');
}

function errorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;

  if (error && typeof error === 'object' && 'message' in error) {
    const value = (error as { message?: unknown }).message;
    if (typeof value === 'string' && value.trim()) return value;
  }

  return 'Ocurrió un error inesperado.';
}

export function AdminAttendanceEmployeeDossier() {
  const { theme } = useBusiness();
  const [employees, setEmployees] = useState<AttendanceEmployee[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [startDate, setStartDate] = useState(defaultStartDate());
  const [endDate, setEndDate] = useState(dateInput(new Date()));
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState<AttendancePeriodReportItem | null>(null);
  const [days, setDays] = useState<AttendanceDailySummaryItem[]>([]);
  const [incidents, setIncidents] = useState<AttendanceIncident[]>([]);
  const [payroll, setPayroll] = useState<AttendanceEmployeePayrollHistoryItem[]>([]);

  useEffect(() => {
    void (async () => {
      try {
        const rows = await getAttendanceEmployees();
        setEmployees(rows);
      } catch (error) {
        Alert.alert('Expediente', errorMessage(error));
      }
    })();
  }, []);

  const employee = useMemo(
    () => employees.find(item => item.userId === userId) ?? null,
    [employees, userId],
  );

  const payrollTotals = useMemo(() => payroll.reduce(
    (acc, item) => {
      if (item.runStatus === 'voided') return acc;
      acc.total += item.totalPay;
      if (item.paymentStatus === 'paid') acc.paid += item.totalPay;
      else acc.pending += item.totalPay;
      acc.overtime += item.overtimePay;
      acc.deductions += item.absenceDeduction + item.lateDeduction + item.earlyLeaveDeduction;
      return acc;
    },
    { total: 0, paid: 0, pending: 0, overtime: 0, deductions: 0 },
  ), [payroll]);

  const currency = payroll.find(item => item.runStatus !== 'voided')?.currencyCode ?? 'MXN';

  const loadDossier = async (): Promise<void> => {
    if (!userId) return;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate) || !/^\d{4}-\d{2}-\d{2}$/.test(endDate) || endDate < startDate) {
      Alert.alert('Periodo inválido', 'Selecciona un rango válido y verifica que la fecha final no sea anterior a la inicial.');
      return;
    }

    try {
      setLoading(true);
      const [reportRows, dailyRows, incidentRows, payrollRows] = await Promise.all([
        getAttendancePeriodReport({ startDate, endDate, userId }),
        getAttendanceDailySummary(startDate, endDate),
        getAttendanceIncidents({ startDate, endDate, userId }),
        getAttendanceEmployeePayrollHistory({ userId, startDate, endDate }),
      ]);
      setSummary(reportRows.find(item => item.userId === userId) ?? null);
      setDays(dailyRows.filter(item => item.userId === userId));
      setIncidents(incidentRows);
      setPayroll(payrollRows);
    } catch (error) {
      Alert.alert('No se pudo abrir el expediente', errorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}> 
      <Text style={[styles.title, { color: theme.text }]}>Expediente del empleado</Text>
      <Text style={[styles.subtitle, { color: theme.textMuted }]}>Consulta en una sola vista asistencia, incidencias y nómina histórica.</Text>
      {!userId ? (
        <Text style={[styles.subtitle, { color: theme.textMuted, marginTop: 8 }]}>
          Selecciona un empleado y después pulsa ACTUALIZAR para abrir su expediente.
        </Text>
      ) : null}

      <ScrollView horizontal showsHorizontalScrollIndicator contentContainerStyle={styles.employeeRow}>
        {employees.map(item => {
          const active = item.userId === userId;
          return (
            <TouchableOpacity
              key={item.userId}
              onPress={() => {
                setUserId(item.userId);
                setSummary(null);
                setDays([]);
                setIncidents([]);
                setPayroll([]);
              }}
              style={[styles.employeeButton, { borderColor: active ? theme.primary : theme.border, backgroundColor: active ? theme.surfaceAlt : theme.background }]}
            >
              <Text style={{ color: active ? theme.primary : theme.text, fontWeight: '900' }}>{item.employeeName}</Text>
              <Text style={{ color: theme.textMuted, fontSize: 10 }}>{item.employeeRole.toUpperCase()} · {item.isActive ? 'ACTIVO' : 'INACTIVO'}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <View style={styles.filters}>
        <View style={styles.dateField}><DateCalendarField label="Desde" value={startDate} onChange={setStartDate} maximumDate={endDate} /></View>
        <View style={styles.dateField}><DateCalendarField label="Hasta" value={endDate} onChange={setEndDate} minimumDate={startDate} /></View>
        <TouchableOpacity disabled={!userId || loading} onPress={() => void loadDossier()} style={[styles.primaryButton, { backgroundColor: theme.primary, opacity: !userId || loading ? 0.55 : 1 }]}><Text style={{ color: theme.onPrimary, fontWeight: '900' }}>{loading ? 'CARGANDO...' : 'ACTUALIZAR'}</Text></TouchableOpacity>
      </View>

      {loading ? <ActivityIndicator color={theme.primary} /> : null}

      {employee && summary ? (
        <>
          <View style={[styles.profile, { backgroundColor: theme.background, borderColor: theme.border }]}> 
            <View style={{ flex: 1 }}><Text style={[styles.employeeName, { color: theme.text }]}>{employee.employeeName}</Text><Text style={[styles.subtitle, { color: theme.textMuted }]}>{employee.employeeRole.toUpperCase()} · {employee.isActive ? 'Empleado activo' : 'Empleado inactivo'}</Text></View>
            <Text style={{ color: employee.useBusinessSchedule ? theme.textMuted : theme.primary, fontWeight: '900', fontSize: 11 }}>{employee.useBusinessSchedule ? 'HEREDA HORARIO DEL NEGOCIO' : 'HORARIO PERSONALIZADO'}</Text>
          </View>

          <View style={styles.metrics}>
            <Metric label="DÍAS PROGRAMADOS" value={String(summary.scheduledDays)} theme={theme} />
            <Metric label="DÍAS TRABAJADOS" value={String(summary.workedDays)} theme={theme} />
            <Metric label="FALTAS" value={String(summary.absentDays)} theme={theme} />
            <Metric label="RETARDO" value={minutesLabel(summary.totalLateMinutes)} theme={theme} />
            <Metric label="SALIDA ANTICIPADA" value={minutesLabel(summary.totalEarlyLeaveMinutes)} theme={theme} />
            <Metric label="HORAS EXTRA" value={minutesLabel(summary.totalOvertimeMinutes)} theme={theme} />
            <Metric label="TIEMPO TRABAJADO" value={minutesLabel(summary.totalWorkedMinutes)} theme={theme} />
            <Metric label="VACACIONES / INCAP. / PERMISOS" value={`${summary.vacationDays} / ${summary.medicalLeaveDays} / ${summary.permissionDays}`} theme={theme} />
          </View>

          <Text style={[styles.sectionTitle, { color: theme.text }]}>NÓMINA DEL PERIODO</Text>
          <View style={styles.metrics}>
            <Metric label="TOTAL EN CORTES" value={money(payrollTotals.total, currency)} theme={theme} strong />
            <Metric label="PAGADO" value={money(payrollTotals.paid, currency)} theme={theme} />
            <Metric label="PENDIENTE" value={money(payrollTotals.pending, currency)} theme={theme} />
            <Metric label="HORAS EXTRA PAGADAS" value={money(payrollTotals.overtime, currency)} theme={theme} />
            <Metric label="DESCUENTOS" value={money(payrollTotals.deductions, currency)} theme={theme} />
          </View>

          <Text style={[styles.sectionTitle, { color: theme.text }]}>RECIBOS / CORTES</Text>
          {payroll.length === 0 ? <Text style={[styles.subtitle, { color: theme.textMuted }]}>No hay recibos en este periodo.</Text> : payroll.map(item => (
            <View key={item.payrollItemId} style={[styles.row, { borderColor: theme.border, backgroundColor: theme.background }]}> 
              <View style={{ flex: 1 }}><Text style={{ color: theme.text, fontWeight: '900' }}>{item.startDate} → {item.endDate}</Text><Text style={[styles.detail, { color: theme.textMuted }]}>{item.runStatus === 'voided' ? 'CORTE ANULADO' : item.paymentStatus === 'paid' ? `PAGADO · ${dateTime(item.paidAt)} · ${paymentLabel(item.paymentMethod)}` : 'PENDIENTE DE PAGO'}</Text>{item.paymentReference ? <Text style={[styles.detail, { color: theme.textMuted }]}>Referencia: {item.paymentReference}</Text> : null}</View>
              <Text style={{ color: theme.primary, fontWeight: '900', fontSize: 17 }}>{money(item.totalPay, item.currencyCode)}</Text>
            </View>
          ))}

          <Text style={[styles.sectionTitle, { color: theme.text }]}>INCIDENCIAS</Text>
          {incidents.length === 0 ? <Text style={[styles.subtitle, { color: theme.textMuted }]}>Sin incidencias registradas en el periodo.</Text> : incidents.map(item => (
            <View key={item.id} style={[styles.row, { borderColor: theme.border, backgroundColor: theme.background }]}> 
              <View style={{ flex: 1 }}><Text style={{ color: theme.text, fontWeight: '900' }}>{item.incidentType.toUpperCase()} · {item.status.toUpperCase()}</Text><Text style={[styles.detail, { color: theme.textMuted }]}>{item.startDate}{item.endDate !== item.startDate ? ` → ${item.endDate}` : ''} · {item.note}</Text>{item.adminNote ? <Text style={[styles.detail, { color: theme.textMuted }]}>Admin: {item.adminNote}</Text> : null}</View>
            </View>
          ))}

          <Text style={[styles.sectionTitle, { color: theme.text }]}>ASISTENCIA DIARIA</Text>
          {days.length === 0 ? <Text style={[styles.subtitle, { color: theme.textMuted }]}>Sin días en el periodo.</Text> : days.slice(0, 120).map(item => (
            <View key={`${item.userId}-${item.workDate}`} style={[styles.row, { borderColor: theme.border, backgroundColor: theme.background }]}> 
              <View style={{ flex: 1 }}><Text style={{ color: theme.text, fontWeight: '900' }}>{item.workDate} · {item.dayStatus.replace(/_/g, ' ').toUpperCase()}</Text><Text style={[styles.detail, { color: theme.textMuted }]}>Esperado: {dateTime(item.expectedStart)} → {dateTime(item.expectedEnd)}</Text><Text style={[styles.detail, { color: theme.textMuted }]}>Real: {dateTime(item.clockIn)} → {dateTime(item.clockOut)}</Text></View>
              <View style={{ alignItems: 'flex-end' }}><Text style={[styles.detail, { color: theme.textMuted }]}>Retardo {item.lateMinutes} min</Text><Text style={[styles.detail, { color: theme.textMuted }]}>Salida {item.earlyLeaveMinutes} min</Text><Text style={[styles.detail, { color: theme.textMuted }]}>Extra {item.overtimeMinutes} min</Text></View>
            </View>
          ))}
        </>
      ) : null}
    </View>
  );
}

function Metric({ label, value, theme, strong = false }: { label: string; value: string; theme: any; strong?: boolean }) {
  return <View style={[styles.metric, { borderColor: theme.border, backgroundColor: theme.background }]}><Text style={[styles.label, { color: theme.textMuted }]}>{label}</Text><Text style={{ color: strong ? theme.primary : theme.text, fontSize: strong ? 18 : 15, fontWeight: '900' }}>{value}</Text></View>;
}

const styles = StyleSheet.create({
  card: { borderWidth: 1, borderRadius: 16, padding: 16, marginBottom: 18, gap: 12 },
  title: { fontSize: 22, fontWeight: '900' },
  subtitle: { fontSize: 12, lineHeight: 18 },
  employeeRow: { gap: 8, paddingVertical: 2 },
  employeeButton: { minWidth: 180, borderWidth: 1, borderRadius: 10, padding: 10, gap: 3 },
  filters: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignItems: 'flex-end' },
  dateField: { width: 150, gap: 4 },
  label: { fontSize: 10, fontWeight: '900', letterSpacing: 0.4 },
  input: { minHeight: 42, borderWidth: 1, borderRadius: 8, paddingHorizontal: 10 },
  primaryButton: { minHeight: 42, paddingHorizontal: 16, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  profile: { borderWidth: 1, borderRadius: 12, padding: 12, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 12 },
  employeeName: { fontSize: 18, fontWeight: '900' },
  metrics: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  metric: { minWidth: 145, flexGrow: 1, borderWidth: 1, borderRadius: 10, padding: 10, gap: 5 },
  sectionTitle: { marginTop: 4, fontSize: 13, fontWeight: '900', letterSpacing: 0.5 },
  row: { borderWidth: 1, borderRadius: 10, padding: 10, flexDirection: 'row', flexWrap: 'wrap', gap: 10, alignItems: 'center' },
  detail: { fontSize: 11, lineHeight: 17 },
});
