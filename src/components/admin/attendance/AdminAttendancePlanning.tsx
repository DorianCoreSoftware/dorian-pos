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
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import {
  AttendanceEmployee,
  AttendancePeriodReportItem,
  AttendancePreventionSettings,
  EmployeeScheduleDay,
  getAttendanceEmployees,
  getAttendancePeriodReport,
  getAttendancePreventionSettings,
  getEmployeeSchedule,
  saveAttendancePreventionSettings,
} from '../../../services/attendanceService';

import {
  useBusiness,
} from '../../../context/BusinessContext';

type EmployeePlan = {
  employee: AttendanceEmployee;
  schedule: EmployeeScheduleDay[];
};

type RiskLevel = 'normal' | 'watch' | 'high';

const DEFAULT_SETTINGS: AttendancePreventionSettings = {
  historyDays: 28,
  lookaheadDays: 14,
  minimumStaffPerDay: 2,
  overtimeRiskMinutes: 180,
  absenceRiskDays: 2,
  lateRiskDays: 3,
  negativeBalanceRiskMinutes: 240,
};

const DAY_NAMES = [
  'Dom',
  'Lun',
  'Mar',
  'Mié',
  'Jue',
  'Vie',
  'Sáb',
];

function localDateInput(date: Date): string {
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function dateFromLocal(value: string): Date {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, month - 1, day, 12, 0, 0, 0);
}

function historyStart(days: number): string {
  const date = new Date();
  date.setHours(12, 0, 0, 0);
  date.setDate(date.getDate() - Math.max(1, days - 1));
  return localDateInput(date);
}

function minutesLabel(minutes: number): string {
  const value = Math.max(0, Math.round(minutes));
  const hours = Math.floor(value / 60);
  const rest = value % 60;
  return hours > 0 ? `${hours} h ${rest} min` : `${rest} min`;
}

function signedMinutesLabel(minutes: number): string {
  const sign = minutes > 0 ? '+' : minutes < 0 ? '−' : '';
  return `${sign}${minutesLabel(Math.abs(minutes))}`;
}

function parseInteger(value: string, fallback: number): number {
  const parsed = Number(value.replace(/[^0-9]/g, ''));
  return Number.isFinite(parsed) ? parsed : fallback;
}

function findScheduleDay(
  schedule: EmployeeScheduleDay[],
  dayOfWeek: number,
): EmployeeScheduleDay | null {
  return schedule.find(item => item.dayOfWeek === dayOfWeek) ?? null;
}

export function AdminAttendancePlanning() {
  const { theme } = useBusiness();

  const [settings, setSettings] = useState<AttendancePreventionSettings>(DEFAULT_SETTINGS);
  const [plans, setPlans] = useState<EmployeePlan[]>([]);
  const [history, setHistory] = useState<AttendancePeriodReportItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async (): Promise<void> => {
    try {
      setLoading(true);
      const loadedSettings = await getAttendancePreventionSettings();
      setSettings(loadedSettings);

      const employees = (await getAttendanceEmployees()).filter(item => item.isActive);
      const [historyRows, schedules] = await Promise.all([
        getAttendancePeriodReport({
          startDate: historyStart(loadedSettings.historyDays),
          endDate: localDateInput(new Date()),
        }),
        Promise.all(
          employees.map(async employee => ({
            employee,
            schedule: await getEmployeeSchedule(employee.userId),
          })),
        ),
      ]);

      setHistory(historyRows);
      setPlans(schedules);
    } catch (error) {
      console.error('Error cargando planeación de asistencia:', error);
      Alert.alert(
        'Planeación preventiva',
        error instanceof Error ? error.message : 'No se pudo cargar la información.',
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const riskByUser = useMemo(() => {
    const map = new Map<string, {
      score: number;
      level: RiskLevel;
      reasons: string[];
      source: AttendancePeriodReportItem;
    }>();

    for (const item of history) {
      const reasons: string[] = [];
      if (item.absentDays >= settings.absenceRiskDays) {
        reasons.push(`${item.absentDays} falta(s) no justificadas`);
      }
      if (item.lateDays >= settings.lateRiskDays) {
        reasons.push(`${item.lateDays} retardos`);
      }
      if (item.totalOvertimeMinutes >= settings.overtimeRiskMinutes) {
        reasons.push(`${minutesLabel(item.totalOvertimeMinutes)} extra`);
      }
      if (item.balanceMinutes <= -settings.negativeBalanceRiskMinutes) {
        reasons.push(`${signedMinutesLabel(item.balanceMinutes)} de balance`);
      }

      const score = reasons.length;
      map.set(item.userId, {
        score,
        level: score >= 2 ? 'high' : score === 1 ? 'watch' : 'normal',
        reasons,
        source: item,
      });
    }

    return map;
  }, [history, settings]);

  const upcoming = useMemo(() => {
    const rows: Array<{
      key: string;
      date: string;
      label: string;
      scheduledCount: number;
      names: string[];
      highRiskCount: number;
      isUnderstaffed: boolean;
    }> = [];

    const today = new Date();
    today.setHours(12, 0, 0, 0);

    for (let offset = 1; offset <= settings.lookaheadDays; offset += 1) {
      const date = new Date(today);
      date.setDate(today.getDate() + offset);
      const dayOfWeek = date.getDay();

      const scheduled = plans.filter(plan => {
        const day = findScheduleDay(plan.schedule, dayOfWeek);
        return Boolean(day?.isWorking);
      });

      const highRiskCount = scheduled.filter(plan =>
        (riskByUser.get(plan.employee.userId)?.level ?? 'normal') === 'high',
      ).length;

      rows.push({
        key: localDateInput(date),
        date: localDateInput(date),
        label: `${DAY_NAMES[dayOfWeek]} ${date.getDate()}/${date.getMonth() + 1}`,
        scheduledCount: scheduled.length,
        names: scheduled.map(plan => plan.employee.employeeName),
        highRiskCount,
        isUnderstaffed: scheduled.length < settings.minimumStaffPerDay,
      });
    }

    return rows;
  }, [plans, riskByUser, settings.lookaheadDays, settings.minimumStaffPerDay]);

  const riskEmployees = useMemo(() => {
    return history
      .map(item => ({
        item,
        risk: riskByUser.get(item.userId),
      }))
      .filter(row => (row.risk?.score ?? 0) > 0)
      .sort((a, b) => {
        const score = (b.risk?.score ?? 0) - (a.risk?.score ?? 0);
        if (score !== 0) return score;
        return a.item.employeeName.localeCompare(b.item.employeeName, 'es');
      });
  }, [history, riskByUser]);

  const recommendations = useMemo(() => {
    const items: string[] = [];
    const understaffed = upcoming.filter(item => item.isUnderstaffed);
    const daysWithHighRisk = upcoming.filter(item => item.highRiskCount > 0);
    const overtimeRisks = riskEmployees.filter(row =>
      row.item.totalOvertimeMinutes >= settings.overtimeRiskMinutes,
    );

    if (understaffed.length > 0) {
      items.push(
        `Revisar cobertura en ${understaffed.length} día(s): hay menos de ${settings.minimumStaffPerDay} persona(s) programadas.`,
      );
    }
    if (daysWithHighRisk.length > 0) {
      items.push(
        `Revisar respaldo en ${daysWithHighRisk.length} día(s) donde hay personal programado con dos o más señales históricas de riesgo.`,
      );
    }
    if (overtimeRisks.length > 0) {
      items.push(
        `Redistribuir carga si es posible: ${overtimeRisks.length} empleado(s) superaron el umbral de horas extra en el periodo histórico.`,
      );
    }
    if (riskEmployees.length === 0 && understaffed.length === 0) {
      items.push('No se detectan alertas preventivas relevantes con los umbrales actuales.');
    }

    return items;
  }, [riskEmployees, settings, upcoming]);

  const handleSave = async (): Promise<void> => {
    try {
      setSaving(true);
      await saveAttendancePreventionSettings(settings);
      await load();
      Alert.alert('Planeación preventiva', 'Los umbrales se guardaron correctamente.');
    } catch (error) {
      Alert.alert(
        'No se pudo guardar',
        error instanceof Error ? error.message : 'Ocurrió un error.',
      );
    } finally {
      setSaving(false);
    }
  };

  const numberField = (
    label: string,
    value: number,
    onChange: (value: number) => void,
    help: string,
  ) => (
    <View style={styles.field}>
      <Text style={[styles.fieldLabel, { color: theme.textMuted }]}>{label}</Text>
      <TextInput
        keyboardType="number-pad"
        value={String(value)}
        onChangeText={text => onChange(parseInteger(text, value))}
        style={[
          styles.input,
          {
            color: theme.text,
            borderColor: theme.border,
            backgroundColor: theme.background,
          },
        ]}
      />
      <Text style={[styles.fieldHelp, { color: theme.textMuted }]}>{help}</Text>
    </View>
  );

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
          <Text style={[styles.title, { color: theme.text }]}>Planeación y prevención</Text>
          <Text style={[styles.subtitle, { color: theme.textMuted }]}> 
            Proyección de cobertura basada en horarios configurados y señales del historial reciente.
          </Text>
        </View>

        <TouchableOpacity
          disabled={loading}
          onPress={() => void load()}
          style={[styles.outlineButton, { borderColor: theme.primary, opacity: loading ? 0.5 : 1 }]}
        >
          <Text style={{ color: theme.primary, fontWeight: '900' }}>ACTUALIZAR</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator size="large" color={theme.primary} />
        </View>
      ) : (
        <>
          <View style={styles.settingsGrid}>
            {numberField('HISTORIAL · DÍAS', settings.historyDays, value => setSettings(current => ({ ...current, historyDays: value })), 'Ventana usada para detectar patrones recientes.')}
            {numberField('PROYECCIÓN · DÍAS', settings.lookaheadDays, value => setSettings(current => ({ ...current, lookaheadDays: value })), 'Entre 7 y 28 días hacia adelante.')}
            {numberField('MÍNIMO PERSONAL / DÍA', settings.minimumStaffPerDay, value => setSettings(current => ({ ...current, minimumStaffPerDay: value })), 'Marca cobertura baja cuando hay menos personas programadas.')}
            {numberField('RIESGO EXTRA · MIN', settings.overtimeRiskMinutes, value => setSettings(current => ({ ...current, overtimeRiskMinutes: value })), 'Horas extra acumuladas que activan una señal.')}
            {numberField('RIESGO AUSENCIAS · DÍAS', settings.absenceRiskDays, value => setSettings(current => ({ ...current, absenceRiskDays: value })), 'Solo faltas no justificadas.')}
            {numberField('RIESGO RETARDOS · DÍAS', settings.lateRiskDays, value => setSettings(current => ({ ...current, lateRiskDays: value })), 'Cantidad de días con retardo en el historial.')}
            {numberField('RIESGO BALANCE − · MIN', settings.negativeBalanceRiskMinutes, value => setSettings(current => ({ ...current, negativeBalanceRiskMinutes: value })), 'Diferencia negativa entre trabajado y programado.')}
          </View>

          <TouchableOpacity
            disabled={saving}
            onPress={() => void handleSave()}
            style={[styles.primaryButton, { backgroundColor: theme.primary, opacity: saving ? 0.55 : 1 }]}
          >
            <Text style={{ color: theme.onPrimary, fontWeight: '900' }}>
              {saving ? 'GUARDANDO...' : 'GUARDAR UMBRALES'}
            </Text>
          </TouchableOpacity>

          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Cobertura planificada</Text>
            <Text style={[styles.sectionSubtitle, { color: theme.textMuted }]}> 
              Usa los horarios individuales efectivos. No representa demanda de clientes ni sustituye la programación de turnos.
            </Text>

            <View style={styles.coverageGrid}>
              {upcoming.map(item => (
                <View
                  key={item.key}
                  style={[
                    styles.coverageCard,
                    {
                      borderColor: item.isUnderstaffed ? theme.danger : theme.border,
                      backgroundColor: theme.surfaceAlt,
                    },
                  ]}
                >
                  <Text style={[styles.coverageDate, { color: theme.text }]}>{item.label}</Text>
                  <Text style={[styles.coverageCount, { color: item.isUnderstaffed ? theme.danger : theme.primary }]}>
                    {item.scheduledCount}
                  </Text>
                  <Text style={[styles.coverageLabel, { color: theme.textMuted }]}>programados</Text>
                  {item.highRiskCount > 0 ? (
                    <Text style={[styles.riskHint, { color: theme.textMuted }]}> 
                      {item.highRiskCount} con 2+ señales recientes
                    </Text>
                  ) : null}
                  {item.isUnderstaffed ? (
                    <Text style={[styles.warningText, { color: theme.danger }]}>COBERTURA BAJA</Text>
                  ) : null}
                </View>
              ))}
            </View>
          </View>

          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Señales por empleado</Text>
            <Text style={[styles.sectionSubtitle, { color: theme.textMuted }]}> 
              Se calculan sobre los últimos {settings.historyDays} días. Son indicadores para revisión, no una sanción automática.
            </Text>

            {riskEmployees.length === 0 ? (
              <Text style={[styles.emptyText, { color: theme.textMuted }]}>No hay empleados por encima de los umbrales actuales.</Text>
            ) : riskEmployees.map(({ item, risk }) => (
              <View
                key={item.userId}
                style={[
                  styles.riskCard,
                  {
                    borderColor: risk?.level === 'high' ? theme.danger : theme.border,
                    backgroundColor: theme.surfaceAlt,
                  },
                ]}
              >
                <View style={styles.riskHeader}>
                  <View style={styles.riskText}>
                    <Text style={[styles.riskName, { color: theme.text }]}>{item.employeeName}</Text>
                    <Text style={[styles.riskRole, { color: theme.textMuted }]}>{item.employeeRole}</Text>
                  </View>
                  <Text style={{ color: risk?.level === 'high' ? theme.danger : theme.primary, fontWeight: '900' }}>
                    {risk?.level === 'high' ? 'RIESGO ALTO' : 'REVISAR'}
                  </Text>
                </View>
                <Text style={[styles.riskReasons, { color: theme.textMuted }]}> 
                  {(risk?.reasons ?? []).join(' · ')}
                </Text>
              </View>
            ))}
          </View>

          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Recomendaciones operativas</Text>
            {recommendations.map((item, index) => (
              <View key={`${index}-${item}`} style={[styles.recommendation, { borderColor: theme.border, backgroundColor: theme.surfaceAlt }]}>
                <Text style={[styles.recommendationIndex, { color: theme.primary }]}>{index + 1}</Text>
                <Text style={[styles.recommendationText, { color: theme.text }]}>{item}</Text>
              </View>
            ))}
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
  loadingBox: { minHeight: 180, alignItems: 'center', justifyContent: 'center' },
  settingsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  field: { flexGrow: 1, flexBasis: 180, minWidth: 160 },
  fieldLabel: { marginBottom: 5, fontSize: 10, fontWeight: '900' },
  input: { minHeight: 42, borderWidth: 1, borderRadius: 9, paddingHorizontal: 11 },
  fieldHelp: { marginTop: 4, fontSize: 10, lineHeight: 14 },
  primaryButton: { alignSelf: 'flex-start', minHeight: 42, borderRadius: 9, paddingHorizontal: 16, alignItems: 'center', justifyContent: 'center' },
  section: { gap: 10, marginTop: 2 },
  sectionTitle: { fontSize: 16, fontWeight: '900' },
  sectionSubtitle: { marginTop: -6, fontSize: 11, lineHeight: 16 },
  coverageGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 9 },
  coverageCard: { width: 132, minHeight: 124, borderWidth: 1, borderRadius: 10, padding: 11 },
  coverageDate: { fontSize: 12, fontWeight: '900' },
  coverageCount: { marginTop: 8, fontSize: 28, fontWeight: '900' },
  coverageLabel: { marginTop: -2, fontSize: 10, fontWeight: '700' },
  riskHint: { marginTop: 7, fontSize: 9, lineHeight: 13 },
  warningText: { marginTop: 6, fontSize: 9, fontWeight: '900' },
  riskCard: { borderWidth: 1, borderRadius: 10, padding: 12 },
  riskHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 },
  riskText: { flex: 1 },
  riskName: { fontSize: 13, fontWeight: '900' },
  riskRole: { marginTop: 2, fontSize: 10 },
  riskReasons: { marginTop: 7, fontSize: 11, lineHeight: 16 },
  emptyText: { paddingVertical: 10, fontSize: 12 },
  recommendation: { flexDirection: 'row', gap: 10, alignItems: 'flex-start', borderWidth: 1, borderRadius: 10, padding: 11 },
  recommendationIndex: { width: 22, fontSize: 16, fontWeight: '900' },
  recommendationText: { flex: 1, fontSize: 11, lineHeight: 17 },
});
