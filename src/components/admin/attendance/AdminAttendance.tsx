import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';

import {
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { useBusiness } from '../../../context/BusinessContext';
import { AdminAttendanceSchedules } from './AdminAttendanceSchedules';
import { AdminAttendanceIncidents } from './AdminAttendanceIncidents';
import { AdminAttendanceReports } from './AdminAttendanceReports';
import { AdminAttendancePayroll } from './AdminAttendancePayroll';
import { AdminAttendanceEmployeeDossier } from './AdminAttendanceEmployeeDossier';
import { AdminAttendanceRequests } from './AdminAttendanceRequests';
import { AdminAttendanceAudit } from './AdminAttendanceAudit';
import { AdminAttendanceAnalytics } from './AdminAttendanceAnalytics';
import { AdminAttendancePlanning } from './AdminAttendancePlanning';
import { AdminAttendanceSalesPlanning } from './AdminAttendanceSalesPlanning';
import { AdminAttendanceShiftDrafts } from './AdminAttendanceShiftDrafts';
import { AdminAttendanceShiftChanges } from './AdminAttendanceShiftChanges';
import { AdminAttendanceExecution } from './AdminAttendanceExecution';
import { AdminAttendanceReliability } from './AdminAttendanceReliability';
import { AdminAttendanceTrends } from './AdminAttendanceTrends';
import { AdminAttendancePeriodClosure } from './AdminAttendancePeriodClosure';
import { AdminAttendanceHealth } from './AdminAttendanceHealth';
import {
  AdminAttendanceRecord,
  AttendanceSettings,
  correctAttendance,
  getAdminAttendance,
  getAttendanceSettings,
  saveAttendanceSettings,
} from '../../../services/attendanceService';

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

function durationLabel(record: AdminAttendanceRecord): string {
  const end = record.clock_out
    ? new Date(record.clock_out).getTime()
    : Date.now();

  const start = new Date(record.clock_in).getTime();
  const minutes = Math.max(0, Math.floor((end - start) / 60000));
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;

  return `${hours} h ${rest} min${record.clock_out ? '' : ' · en curso'}`;
}


function attendanceMetricsLabel(record: AdminAttendanceRecord): string {
  if (!record.clock_out) return 'En curso';
  const parts: string[] = [];
  if ((record.late_minutes ?? 0) > 0) parts.push(`Retardo ${record.late_minutes} min`);
  if ((record.early_leave_minutes ?? 0) > 0) parts.push(`Salida anticipada ${record.early_leave_minutes} min`);
  if ((record.overtime_minutes ?? 0) > 0) parts.push(`Extra ${record.overtime_minutes} min`);
  return parts.length > 0 ? parts.join(' · ') : 'Sin incidencias';
}

function toEditorValue(value: string | null): string {
  if (!value) {
    return '';
  }

  const date = new Date(value);
  const pad = (n: number) => String(n).padStart(2, '0');

  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function parseEditorValue(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  const match = trimmed.match(
    /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})$/,
  );

  if (!match) {
    throw new Error('Usa el formato AAAA-MM-DD HH:mm.');
  }

  const [, year, month, day, hour, minute] = match;
  const date = new Date(
    Number(year),
    Number(month) - 1,
    Number(day),
    Number(hour),
    Number(minute),
    0,
    0,
  );

  if (Number.isNaN(date.getTime())) {
    throw new Error('La fecha u hora no es válida.');
  }

  return date.toISOString();
}

export function AdminAttendance() {
  const { theme } = useBusiness();

  const [records, setRecords] = useState<AdminAttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [onlyOpen, setOnlyOpen] = useState(false);

  const [editing, setEditing] = useState<AdminAttendanceRecord | null>(null);
  const [clockInValue, setClockInValue] = useState('');
  const [clockOutValue, setClockOutValue] = useState('');
  const [reason, setReason] = useState('');

  const [attendanceSettings, setAttendanceSettings] =
    useState<AttendanceSettings>({
      remindersEnabled: true,
      earlyClockInMinutes: 60,
      reminderIntervalMinutes: 15,
      afterCloseGraceMinutes: 60,
      lateToleranceMinutes: 10,
      earlyLeaveToleranceMinutes: 5,
      overtimeToleranceMinutes: 10,
    });
  const [settingsLoading, setSettingsLoading] = useState(true);
  const [settingsSaving, setSettingsSaving] = useState(false);

  const load = useCallback(async (): Promise<void> => {
    const data = await getAdminAttendance(300);
    setRecords(data);
  }, []);

  useEffect(() => {
    void (async () => {
      try {
        const [settings] = await Promise.all([
          getAttendanceSettings(),
          load(),
        ]);
        setAttendanceSettings(settings);
      } catch (error) {
        console.error('Error cargando asistencia admin:', error);
        Alert.alert('Asistencia', 'No se pudo cargar el módulo de asistencia.');
      } finally {
        setLoading(false);
        setSettingsLoading(false);
      }
    })();
  }, [load]);

  const updateNumericSetting = (
    key:
      | 'earlyClockInMinutes'
      | 'reminderIntervalMinutes'
      | 'afterCloseGraceMinutes'
      | 'lateToleranceMinutes'
      | 'earlyLeaveToleranceMinutes'
      | 'overtimeToleranceMinutes',
    value: string,
  ): void => {
    const digits = value.replace(/[^0-9]/g, '');
    const parsed = digits ? Number(digits) : 0;
    setAttendanceSettings(current => ({
      ...current,
      [key]: parsed,
    }));
  };

  const saveSettings = async (): Promise<void> => {
    try {
      setSettingsSaving(true);
      const saved = await saveAttendanceSettings(attendanceSettings);
      setAttendanceSettings(saved);
      Alert.alert('Asistencia', 'La configuración se guardó correctamente.');
    } catch (error) {
      Alert.alert(
        'No se pudo guardar',
        error instanceof Error ? error.message : 'Ocurrió un error.',
      );
    } finally {
      setSettingsSaving(false);
    }
  };

  const workingNow = useMemo(
    () => records.filter(item => !item.clock_out),
    [records],
  );

  const filtered = useMemo(() => {
    const query = search.trim().toLocaleLowerCase('es-MX');

    return records.filter(item => {
      if (onlyOpen && item.clock_out) {
        return false;
      }

      if (!query) {
        return true;
      }

      return (
        item.employee_name.toLocaleLowerCase('es-MX').includes(query) ||
        item.employee_role.toLocaleLowerCase('es-MX').includes(query)
      );
    });
  }, [onlyOpen, records, search]);

  const openEditor = (record: AdminAttendanceRecord): void => {
    setEditing(record);
    setClockInValue(toEditorValue(record.clock_in));
    setClockOutValue(toEditorValue(record.clock_out));
    setReason('');
  };

  const closeEditor = (): void => {
    if (saving) {
      return;
    }

    setEditing(null);
    setReason('');
  };

  const saveCorrection = async (): Promise<void> => {
    if (!editing) {
      return;
    }

    if (!reason.trim()) {
      Alert.alert('Motivo requerido', 'Escribe el motivo de la corrección.');
      return;
    }

    try {
      const clockIn = parseEditorValue(clockInValue);
      const clockOut = parseEditorValue(clockOutValue);

      if (!clockIn) {
        throw new Error('La hora de entrada es obligatoria.');
      }

      if (clockOut && new Date(clockOut) <= new Date(clockIn)) {
        throw new Error('La salida debe ser posterior a la entrada.');
      }

      setSaving(true);

      await correctAttendance({
        attendanceId: editing.id,
        clockIn,
        clockOut,
        reason,
      });

      await load();
      setEditing(null);
      setReason('');
    } catch (error) {
      Alert.alert(
        'No se pudo corregir',
        error instanceof Error ? error.message : 'Ocurrió un error.',
      );
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={localStyles.center}>
        <ActivityIndicator size="large" color={theme.primary} />
      </View>
    );
  }

  return (
    <ScrollView
      style={localStyles.scrollContainer}
      contentContainerStyle={localStyles.container}
      showsVerticalScrollIndicator
      nestedScrollEnabled
      keyboardShouldPersistTaps="handled"
    >
      <View>
        <Text style={[localStyles.title, { color: theme.text }]}>Asistencia</Text>
        <Text style={[localStyles.subtitle, { color: theme.textMuted }]}> 
          Consulta entradas y salidas. Las correcciones quedan auditadas.
        </Text>
      </View>

      <View
        style={[
          localStyles.settingsCard,
          { backgroundColor: theme.surface, borderColor: theme.border },
        ]}
      >
        <View style={localStyles.settingsHeader}>
          <View style={localStyles.settingsHeaderText}>
            <Text style={[localStyles.settingsTitle, { color: theme.text }]}>
              Reglas del checador
            </Text>
            <Text style={[localStyles.settingsSubtitle, { color: theme.textMuted }]}>
              Estas reglas usan el horario efectivo del negocio y sus excepciones.
            </Text>
          </View>
          <Switch
            disabled={settingsLoading || settingsSaving}
            value={attendanceSettings.remindersEnabled}
            onValueChange={value =>
              setAttendanceSettings(current => ({
                ...current,
                remindersEnabled: value,
              }))
            }
          />
        </View>

        <View style={localStyles.settingsGrid}>
          <View style={localStyles.settingField}>
            <Text style={[localStyles.fieldLabel, { color: theme.textMuted }]}>
              ENTRADA ANTICIPADA · MIN
            </Text>
            <TextInput
              keyboardType="number-pad"
              value={String(attendanceSettings.earlyClockInMinutes)}
              onChangeText={value => updateNumericSetting('earlyClockInMinutes', value)}
              style={[localStyles.input, { color: theme.text, borderColor: theme.border, backgroundColor: theme.background }]}
            />
            <Text style={[localStyles.settingHelp, { color: theme.textMuted }]}>
              Cuánto antes de abrir puede registrarse una entrada.
            </Text>
          </View>

          <View style={localStyles.settingField}>
            <Text style={[localStyles.fieldLabel, { color: theme.textMuted }]}>
              REPETIR RECORDATORIO · MIN
            </Text>
            <TextInput
              keyboardType="number-pad"
              value={String(attendanceSettings.reminderIntervalMinutes)}
              onChangeText={value => updateNumericSetting('reminderIntervalMinutes', value)}
              style={[localStyles.input, { color: theme.text, borderColor: theme.border, backgroundColor: theme.background }]}
            />
            <Text style={[localStyles.settingHelp, { color: theme.textMuted }]}>
              Frecuencia del aviso si usa el sistema sin registrar entrada.
            </Text>
          </View>

          <View style={localStyles.settingField}>
            <Text style={[localStyles.fieldLabel, { color: theme.textMuted }]}>
              GRACIA DESPUÉS DEL CIERRE · MIN
            </Text>
            <TextInput
              keyboardType="number-pad"
              value={String(attendanceSettings.afterCloseGraceMinutes)}
              onChangeText={value => updateNumericSetting('afterCloseGraceMinutes', value)}
              style={[localStyles.input, { color: theme.text, borderColor: theme.border, backgroundColor: theme.background }]}
            />
            <Text style={[localStyles.settingHelp, { color: theme.textMuted }]}>
              Después de este tiempo se recuerda registrar la salida.
            </Text>
          </View>

          <View style={localStyles.settingField}>
            <Text style={[localStyles.fieldLabel, { color: theme.textMuted }]}>TOLERANCIA DE RETARDO · MIN</Text>
            <TextInput keyboardType="number-pad" value={String(attendanceSettings.lateToleranceMinutes)} onChangeText={value => updateNumericSetting('lateToleranceMinutes', value)} style={[localStyles.input, { color: theme.text, borderColor: theme.border, backgroundColor: theme.background }]} />
            <Text style={[localStyles.settingHelp, { color: theme.textMuted }]}>Minutos posteriores al inicio que todavía cuentan como puntualidad.</Text>
          </View>

          <View style={localStyles.settingField}>
            <Text style={[localStyles.fieldLabel, { color: theme.textMuted }]}>TOLERANCIA SALIDA ANTICIPADA · MIN</Text>
            <TextInput keyboardType="number-pad" value={String(attendanceSettings.earlyLeaveToleranceMinutes)} onChangeText={value => updateNumericSetting('earlyLeaveToleranceMinutes', value)} style={[localStyles.input, { color: theme.text, borderColor: theme.border, backgroundColor: theme.background }]} />
            <Text style={[localStyles.settingHelp, { color: theme.textMuted }]}>Margen permitido antes de la salida programada.</Text>
          </View>

          <View style={localStyles.settingField}>
            <Text style={[localStyles.fieldLabel, { color: theme.textMuted }]}>UMBRAL HORAS EXTRA · MIN</Text>
            <TextInput keyboardType="number-pad" value={String(attendanceSettings.overtimeToleranceMinutes)} onChangeText={value => updateNumericSetting('overtimeToleranceMinutes', value)} style={[localStyles.input, { color: theme.text, borderColor: theme.border, backgroundColor: theme.background }]} />
            <Text style={[localStyles.settingHelp, { color: theme.textMuted }]}>El tiempo posterior a este margen se contabiliza como extra.</Text>
          </View>
        </View>

        <TouchableOpacity
          disabled={settingsLoading || settingsSaving}
          onPress={() => void saveSettings()}
          style={[
            localStyles.saveSettingsButton,
            {
              backgroundColor: theme.primary,
              opacity: settingsLoading || settingsSaving ? 0.55 : 1,
            },
          ]}
        >
          <Text style={{ color: theme.onPrimary, fontWeight: '900' }}>
            {settingsSaving ? 'GUARDANDO...' : 'GUARDAR REGLAS'}
          </Text>
        </TouchableOpacity>
      </View>

      <AdminAttendanceRequests />

      <AdminAttendanceEmployeeDossier />

      <AdminAttendanceReports />

      <AdminAttendancePayroll />

      <AdminAttendanceAudit />

      <AdminAttendanceAnalytics />

      <AdminAttendancePlanning />

      <AdminAttendanceSalesPlanning />

      <AdminAttendanceShiftDrafts />

      <AdminAttendanceShiftChanges />

      <AdminAttendanceExecution />

      <AdminAttendanceReliability />

      <AdminAttendanceTrends />

      <AdminAttendancePeriodClosure />

      <AdminAttendanceHealth />

      <AdminAttendanceSchedules />

      <AdminAttendanceIncidents />

      <View
        style={[
          localStyles.summaryCard,
          { backgroundColor: theme.surface, borderColor: theme.border },
        ]}
      >
        <Text style={[localStyles.summaryNumber, { color: theme.primary }]}> 
          {workingNow.length}
        </Text>
        <Text style={[localStyles.summaryText, { color: theme.text }]}> 
          trabajando ahora
        </Text>
        {workingNow.map(item => (
          <Text key={item.id} style={[localStyles.workerLine, { color: theme.textMuted }]}> 
            • {item.employee_name} · desde {formatDateTime(item.clock_in)}
          </Text>
        ))}
      </View>

      <View style={localStyles.filtersRow}>
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Buscar empleado..."
          placeholderTextColor={theme.textMuted}
          style={[
            localStyles.searchInput,
            {
              color: theme.text,
              backgroundColor: theme.surface,
              borderColor: theme.border,
            },
          ]}
        />

        <TouchableOpacity
          onPress={() => setOnlyOpen(current => !current)}
          style={[
            localStyles.filterButton,
            {
              borderColor: onlyOpen ? theme.primary : theme.border,
              backgroundColor: onlyOpen ? theme.surfaceAlt : theme.surface,
            },
          ]}
        >
          <Text style={{ color: onlyOpen ? theme.primary : theme.textMuted, fontWeight: '800' }}>
            {onlyOpen ? 'MOSTRANDO ACTIVOS' : 'SOLO ACTIVOS'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => void load()}
          style={[
            localStyles.filterButton,
            { borderColor: theme.border, backgroundColor: theme.surface },
          ]}
        >
          <Text style={{ color: theme.text, fontWeight: '800' }}>ACTUALIZAR</Text>
        </TouchableOpacity>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator>
        <View style={localStyles.table}>
          <View style={[localStyles.tableRow, localStyles.tableHeader, { borderColor: theme.border }]}> 
            <Text style={[localStyles.cellEmployee, { color: theme.textMuted }]}>EMPLEADO</Text>
            <Text style={[localStyles.cellDate, { color: theme.textMuted }]}>ENTRADA</Text>
            <Text style={[localStyles.cellDate, { color: theme.textMuted }]}>SALIDA</Text>
            <Text style={[localStyles.cellDuration, { color: theme.textMuted }]}>TIEMPO</Text>
            <Text style={[localStyles.cellIncident, { color: theme.textMuted }]}>INCIDENCIA</Text>
            <Text style={[localStyles.cellAction, { color: theme.textMuted }]}>ACCIÓN</Text>
          </View>

          {filtered.map(item => (
            <View key={item.id} style={[localStyles.tableRow, { borderColor: theme.border }]}> 
              <View style={localStyles.cellEmployee}>
                <Text style={{ color: theme.text, fontWeight: '800' }}>{item.employee_name}</Text>
                <Text style={{ color: theme.textMuted, fontSize: 12 }}>{item.employee_role}</Text>
              </View>
              <Text style={[localStyles.cellDate, { color: theme.text }]}>{formatDateTime(item.clock_in)}</Text>
              <Text style={[localStyles.cellDate, { color: item.clock_out ? theme.text : theme.primary }]}>{formatDateTime(item.clock_out)}</Text>
              <Text style={[localStyles.cellDuration, { color: theme.text }]}>{durationLabel(item)}</Text>
              <Text style={[localStyles.cellIncident, { color: (item.late_minutes ?? 0) > 0 || (item.early_leave_minutes ?? 0) > 0 ? theme.danger : theme.text }]}>{attendanceMetricsLabel(item)}</Text>
              <View style={localStyles.cellAction}>
                <TouchableOpacity
                  onPress={() => openEditor(item)}
                  style={[localStyles.editButton, { borderColor: theme.primary }]}
                >
                  <Text style={{ color: theme.primary, fontWeight: '900' }}>CORREGIR</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>

      <Modal
        visible={Boolean(editing)}
        transparent
        animationType="fade"
        onRequestClose={closeEditor}
      >
        <View style={localStyles.modalBackdrop}>
          <View
            style={[
              localStyles.modalCard,
              { backgroundColor: theme.surface, borderColor: theme.border },
            ]}
          >
            <Text style={[localStyles.modalTitle, { color: theme.text }]}>Corregir asistencia</Text>
            <Text style={[localStyles.modalSubtitle, { color: theme.textMuted }]}> 
              {editing?.employee_name}
            </Text>

            <Text style={[localStyles.fieldLabel, { color: theme.textMuted }]}>ENTRADA · AAAA-MM-DD HH:mm</Text>
            <TextInput
              value={clockInValue}
              onChangeText={setClockInValue}
              style={[localStyles.input, { color: theme.text, borderColor: theme.border, backgroundColor: theme.background }]}
            />

            <Text style={[localStyles.fieldLabel, { color: theme.textMuted }]}>SALIDA · vacío = turno abierto</Text>
            <TextInput
              value={clockOutValue}
              onChangeText={setClockOutValue}
              style={[localStyles.input, { color: theme.text, borderColor: theme.border, backgroundColor: theme.background }]}
            />

            <Text style={[localStyles.fieldLabel, { color: theme.textMuted }]}>MOTIVO OBLIGATORIO</Text>
            <TextInput
              value={reason}
              onChangeText={setReason}
              multiline
              placeholder="Ej. El empleado olvidó registrar su salida."
              placeholderTextColor={theme.textMuted}
              style={[
                localStyles.input,
                localStyles.reasonInput,
                { color: theme.text, borderColor: theme.border, backgroundColor: theme.background },
              ]}
            />

            <View style={localStyles.modalActions}>
              <TouchableOpacity
                disabled={saving}
                onPress={closeEditor}
                style={[localStyles.modalButton, { borderColor: theme.border }]}
              >
                <Text style={{ color: theme.text, fontWeight: '800' }}>CANCELAR</Text>
              </TouchableOpacity>
              <TouchableOpacity
                disabled={saving}
                onPress={() => void saveCorrection()}
                style={[localStyles.modalButton, { borderColor: theme.primary, backgroundColor: theme.primary }]}
              >
                <Text style={{ color: theme.onPrimary, fontWeight: '900' }}>{saving ? 'GUARDANDO...' : 'GUARDAR'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const localStyles = StyleSheet.create({
  center: { minHeight: 300, alignItems: 'center', justifyContent: 'center' },
  scrollContainer: { flex: 1, width: '100%' },
  container: { gap: 18, paddingBottom: 36 },
  title: { fontSize: 24, fontWeight: '900' },
  subtitle: { marginTop: 4, fontSize: 13, fontWeight: '600' },
  settingsCard: { borderWidth: 1, borderRadius: 14, padding: 18, gap: 14 },
  settingsHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 14 },
  settingsHeaderText: { flex: 1 },
  settingsTitle: { fontSize: 18, fontWeight: '900' },
  settingsSubtitle: { marginTop: 4, fontSize: 12, lineHeight: 18 },
  settingsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  settingField: { flexGrow: 1, flexBasis: 190, minWidth: 180 },
  settingHelp: { marginTop: 5, fontSize: 11, lineHeight: 16 },
  saveSettingsButton: { alignSelf: 'flex-start', minHeight: 42, borderRadius: 9, paddingHorizontal: 16, alignItems: 'center', justifyContent: 'center' },
  summaryCard: { borderWidth: 1, borderRadius: 14, padding: 18 },
  summaryNumber: { fontSize: 30, fontWeight: '900' },
  summaryText: { marginTop: -2, marginBottom: 8, fontSize: 15, fontWeight: '800' },
  workerLine: { marginTop: 4, fontSize: 13 },
  filtersRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  searchInput: { minWidth: 240, flexGrow: 1, borderWidth: 1, borderRadius: 9, paddingHorizontal: 12, minHeight: 44 },
  filterButton: { minHeight: 44, borderWidth: 1, borderRadius: 9, paddingHorizontal: 14, alignItems: 'center', justifyContent: 'center' },
  table: { minWidth: 1220 },
  tableRow: { flexDirection: 'row', alignItems: 'center', minHeight: 64, borderBottomWidth: 1 },
  tableHeader: { minHeight: 42 },
  cellEmployee: { width: 220, paddingHorizontal: 10 },
  cellDate: { width: 220, paddingHorizontal: 10, fontSize: 13 },
  cellDuration: { width: 170, paddingHorizontal: 10, fontSize: 13 },
  cellIncident: { width: 240, paddingHorizontal: 10, fontSize: 13 },
  cellAction: { width: 130, paddingHorizontal: 10 },
  editButton: { borderWidth: 1, borderRadius: 8, minHeight: 36, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 10 },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center', padding: 18 },
  modalCard: { width: '100%', maxWidth: 560, borderWidth: 1, borderRadius: 16, padding: 20 },
  modalTitle: { fontSize: 22, fontWeight: '900' },
  modalSubtitle: { marginTop: 4, marginBottom: 18, fontSize: 14 },
  fieldLabel: { marginTop: 12, marginBottom: 6, fontSize: 11, fontWeight: '900' },
  input: { borderWidth: 1, borderRadius: 9, minHeight: 44, paddingHorizontal: 12, paddingVertical: 10 },
  reasonInput: { minHeight: 90, textAlignVertical: 'top' },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 20 },
  modalButton: { minHeight: 44, borderWidth: 1, borderRadius: 9, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 18 },
});
