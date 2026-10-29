import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useBusiness } from '../../../../context/BusinessContext';
import { AttendanceEmployee, AttendanceIncident, getAttendanceEmployees, getAttendanceIncidents, createAttendanceIncident, reviewAttendanceIncident } from '../../../../services/attendanceService';
import { DateCalendarField } from '../../../common/date-calendar-field/DateCalendarField';



const INCIDENT_TYPES = [
  ['absence_justified', 'Falta justificada'],
  ['late_justified', 'Retardo justificado'],
  ['early_leave_justified', 'Salida anticipada justificada'],
  ['permission', 'Permiso'],
  ['vacation', 'Vacaciones'],
  ['medical_leave', 'Incapacidad'],
  ['other', 'Otra incidencia'],
] as const;

function dateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function typeLabel(value: string): string {
  return INCIDENT_TYPES.find(item => item[0] === value)?.[1] ?? value;
}

function statusLabel(value: string): string {
  if (value === 'approved') return 'APROBADA';
  if (value === 'rejected') return 'RECHAZADA';
  if (value === 'cancelled') return 'CANCELADA';
  return 'PENDIENTE';
}

export function AdminAttendanceIncidents() {
  const { theme } = useBusiness();
  const [employees, setEmployees] = useState<AttendanceEmployee[]>([]);
  const [incidents, setIncidents] = useState<AttendanceIncident[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [incidentType, setIncidentType] = useState<string>('absence_justified');
  const [startDate, setStartDate] = useState(dateKey(new Date()));
  const [endDate, setEndDate] = useState(dateKey(new Date()));
  const [note, setNote] = useState('');
  const [status, setStatus] = useState<'pending' | 'approved'>('approved');
  const [adminNote, setAdminNote] = useState('');

  const load = useCallback(async () => {
    const [employeeRows, incidentRows] = await Promise.all([
      getAttendanceEmployees(),
      getAttendanceIncidents(),
    ]);
    setEmployees(employeeRows);
    setIncidents(incidentRows);
    setSelectedUserId(current => current ?? employeeRows.find(item => item.isActive)?.userId ?? employeeRows[0]?.userId ?? null);
  }, []);

  useEffect(() => {
    void load()
      .catch(error => {
        console.error('Error cargando incidencias:', error);
        Alert.alert('Incidencias', 'No se pudieron cargar las incidencias.');
      })
      .finally(() => setLoading(false));
  }, [load]);

  const selectedEmployee = useMemo(
    () => employees.find(item => item.userId === selectedUserId) ?? null,
    [employees, selectedUserId],
  );

  const openCreate = (): void => {
    setStartDate(dateKey(new Date()));
    setEndDate(dateKey(new Date()));
    setIncidentType('absence_justified');
    setNote('');
    setAdminNote('');
    setStatus('approved');
    setModalVisible(true);
  };

  const saveIncident = async (): Promise<void> => {
    if (!selectedUserId) {
      Alert.alert('Empleado requerido', 'Selecciona un empleado.');
      return;
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate) || !/^\d{4}-\d{2}-\d{2}$/.test(endDate)) {
      Alert.alert('Fecha inválida', 'Selecciona un rango de fechas válido.');
      return;
    }
    if (endDate < startDate) {
      Alert.alert('Rango inválido', 'La fecha final no puede ser anterior a la inicial.');
      return;
    }
    if (note.trim().length < 3) {
      Alert.alert('Descripción requerida', 'Escribe el motivo o detalle de la incidencia.');
      return;
    }

    try {
      setSaving(true);
      await createAttendanceIncident({
        userId: selectedUserId,
        startDate,
        endDate,
        incidentType,
        note,
        status,
        adminNote,
      });
      await load();
      setModalVisible(false);
    } catch (error) {
      Alert.alert(
        'No se pudo guardar',
        error instanceof Error ? error.message : 'Ocurrió un error.',
      );
    } finally {
      setSaving(false);
    }
  };

  const changeStatus = async (
    incident: AttendanceIncident,
    nextStatus: 'approved' | 'rejected' | 'cancelled',
  ): Promise<void> => {
    try {
      await reviewAttendanceIncident({
        incidentId: incident.id,
        status: nextStatus,
        adminNote: incident.adminNote,
      });
      await load();
    } catch (error) {
      Alert.alert(
        'No se pudo actualizar',
        error instanceof Error ? error.message : 'Ocurrió un error.',
      );
    }
  };

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="small" color={theme.primary} />
        <Text style={{ color: theme.textMuted }}>Cargando incidencias...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}> 
      <View style={styles.headerRow}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.title, { color: theme.text }]}>Incidencias y justificaciones</Text>
          <Text style={[styles.subtitle, { color: theme.textMuted }]}> 
            Registra faltas justificadas, permisos, vacaciones, incapacidades y justificaciones de retardo o salida anticipada.
          </Text>
        </View>
        <TouchableOpacity
          onPress={openCreate}
          style={[styles.primaryButton, { backgroundColor: theme.primary }]}
        >
          <Text style={{ color: theme.onPrimary, fontWeight: '900' }}>NUEVA INCIDENCIA</Text>
        </TouchableOpacity>
      </View>

      {incidents.length === 0 ? (
        <Text style={{ color: theme.textMuted }}>No hay incidencias registradas.</Text>
      ) : (
        <ScrollView horizontal showsHorizontalScrollIndicator>
          <View style={styles.table}>
            <View style={[styles.row, styles.header, { borderColor: theme.border }]}> 
              <Text style={[styles.employee, { color: theme.textMuted }]}>EMPLEADO</Text>
              <Text style={[styles.period, { color: theme.textMuted }]}>PERIODO</Text>
              <Text style={[styles.type, { color: theme.textMuted }]}>TIPO</Text>
              <Text style={[styles.status, { color: theme.textMuted }]}>ESTADO</Text>
              <Text style={[styles.note, { color: theme.textMuted }]}>MOTIVO</Text>
              <Text style={[styles.actions, { color: theme.textMuted }]}>ACCIÓN</Text>
            </View>

            {incidents.map(item => (
              <View key={item.id} style={[styles.row, { borderColor: theme.border }]}> 
                <View style={styles.employee}>
                  <Text style={{ color: theme.text, fontWeight: '900' }}>{item.employeeName}</Text>
                  <Text style={{ color: theme.textMuted, fontSize: 11 }}>{item.employeeRole}</Text>
                </View>
                <Text style={[styles.period, { color: theme.text }]}>
                  {item.startDate === item.endDate ? item.startDate : `${item.startDate} → ${item.endDate}`}
                </Text>
                <Text style={[styles.type, { color: theme.text }]}>{typeLabel(item.incidentType)}</Text>
                <Text style={[styles.status, { color: item.status === 'approved' ? theme.primary : item.status === 'rejected' ? theme.danger : theme.textMuted }]}>{statusLabel(item.status)}</Text>
                <View style={styles.note}>
                  <Text style={{ color: theme.text }}>{item.note}</Text>
                  {item.adminNote ? <Text style={{ color: theme.textMuted, fontSize: 11, marginTop: 4 }}>Admin: {item.adminNote}</Text> : null}
                </View>
                <View style={[styles.actions, styles.actionRow]}>
                  {item.status !== 'approved' ? (
                    <TouchableOpacity onPress={() => void changeStatus(item, 'approved')} style={[styles.smallButton, { borderColor: theme.primary }]}>
                      <Text style={{ color: theme.primary, fontWeight: '900' }}>APROBAR</Text>
                    </TouchableOpacity>
                  ) : null}
                  {item.status !== 'rejected' && item.status !== 'cancelled' ? (
                    <TouchableOpacity onPress={() => void changeStatus(item, 'rejected')} style={[styles.smallButton, { borderColor: theme.danger }]}>
                      <Text style={{ color: theme.danger, fontWeight: '900' }}>RECHAZAR</Text>
                    </TouchableOpacity>
                  ) : null}
                  {item.status !== 'cancelled' ? (
                    <TouchableOpacity onPress={() => void changeStatus(item, 'cancelled')} style={[styles.smallButton, { borderColor: theme.border }]}>
                      <Text style={{ color: theme.textMuted, fontWeight: '900' }}>CANCELAR</Text>
                    </TouchableOpacity>
                  ) : null}
                </View>
              </View>
            ))}
          </View>
        </ScrollView>
      )}

      <Modal visible={modalVisible} transparent animationType="fade" onRequestClose={() => setModalVisible(false)}>
        <View style={styles.backdrop}>
          <View style={[styles.modal, { backgroundColor: theme.surface, borderColor: theme.border }]}> 
            <Text style={[styles.modalTitle, { color: theme.text }]}>Nueva incidencia</Text>
            <Text style={[styles.label, { color: theme.textMuted }]}>EMPLEADO</Text>
            <ScrollView horizontal contentContainerStyle={styles.employeePicker}>
              {employees.map(employee => {
                const active = employee.userId === selectedUserId;
                return (
                  <TouchableOpacity
                    key={employee.userId}
                    onPress={() => setSelectedUserId(employee.userId)}
                    style={[styles.pill, { borderColor: active ? theme.primary : theme.border, backgroundColor: active ? theme.surfaceAlt : theme.background }]}
                  >
                    <Text style={{ color: active ? theme.primary : theme.text, fontWeight: '800' }}>{employee.employeeName}</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
            {selectedEmployee ? <Text style={{ color: theme.textMuted, marginTop: 4 }}>{selectedEmployee.employeeRole}</Text> : null}

            <Text style={[styles.label, { color: theme.textMuted }]}>TIPO</Text>
            <View style={styles.wrap}>
              {INCIDENT_TYPES.map(([key, label]) => {
                const active = incidentType === key;
                return (
                  <TouchableOpacity key={key} onPress={() => setIncidentType(key)} style={[styles.pill, { borderColor: active ? theme.primary : theme.border, backgroundColor: active ? theme.surfaceAlt : theme.background }]}> 
                    <Text style={{ color: active ? theme.primary : theme.text, fontWeight: '800' }}>{label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <View style={styles.dateRow}>
              <View style={{ flex: 1 }}><DateCalendarField label="Desde" value={startDate} onChange={setStartDate} maximumDate={endDate} /></View>
              <View style={{ flex: 1 }}><DateCalendarField label="Hasta" value={endDate} onChange={setEndDate} minimumDate={startDate} /></View>
            </View>

            <Text style={[styles.label, { color: theme.textMuted }]}>DESCRIPCIÓN / JUSTIFICACIÓN</Text>
            <TextInput multiline value={note} onChangeText={setNote} style={[styles.input, styles.multiline, { color: theme.text, borderColor: theme.border, backgroundColor: theme.background }]} />

            <Text style={[styles.label, { color: theme.textMuted }]}>NOTA ADMINISTRATIVA · OPCIONAL</Text>
            <TextInput multiline value={adminNote} onChangeText={setAdminNote} style={[styles.input, styles.multilineSmall, { color: theme.text, borderColor: theme.border, backgroundColor: theme.background }]} />

            <Text style={[styles.label, { color: theme.textMuted }]}>ESTADO INICIAL</Text>
            <View style={styles.wrap}>
              {(['approved', 'pending'] as const).map(item => (
                <TouchableOpacity key={item} onPress={() => setStatus(item)} style={[styles.pill, { borderColor: status === item ? theme.primary : theme.border, backgroundColor: status === item ? theme.surfaceAlt : theme.background }]}> 
                  <Text style={{ color: status === item ? theme.primary : theme.text, fontWeight: '800' }}>{item === 'approved' ? 'APROBADA' : 'PENDIENTE'}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity disabled={saving} onPress={() => setModalVisible(false)} style={[styles.modalButton, { borderColor: theme.border }]}> 
                <Text style={{ color: theme.text, fontWeight: '800' }}>CANCELAR</Text>
              </TouchableOpacity>
              <TouchableOpacity disabled={saving} onPress={() => void saveIncident()} style={[styles.modalButton, { borderColor: theme.primary, backgroundColor: theme.primary }]}> 
                <Text style={{ color: theme.onPrimary, fontWeight: '900' }}>{saving ? 'GUARDANDO...' : 'GUARDAR'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  loading: { minHeight: 100, alignItems: 'center', justifyContent: 'center', gap: 8 },
  card: { borderWidth: 1, borderRadius: 14, padding: 18, gap: 14 },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 12, flexWrap: 'wrap' },
  title: { fontSize: 18, fontWeight: '900' },
  subtitle: { marginTop: 4, fontSize: 12, lineHeight: 18 },
  primaryButton: { minHeight: 42, borderRadius: 9, paddingHorizontal: 14, alignItems: 'center', justifyContent: 'center' },
  table: { minWidth: 1280 },
  row: { minHeight: 66, borderBottomWidth: 1, flexDirection: 'row', alignItems: 'center' },
  header: { minHeight: 42 },
  employee: { width: 200, paddingHorizontal: 8 },
  period: { width: 190, paddingHorizontal: 8, fontSize: 12 },
  type: { width: 210, paddingHorizontal: 8, fontSize: 12 },
  status: { width: 120, paddingHorizontal: 8, fontSize: 12, fontWeight: '900' },
  note: { width: 320, paddingHorizontal: 8 },
  actions: { width: 240, paddingHorizontal: 8 },
  actionRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  smallButton: { borderWidth: 1, borderRadius: 7, minHeight: 32, paddingHorizontal: 8, alignItems: 'center', justifyContent: 'center' },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center', padding: 18 },
  modal: { width: '100%', maxWidth: 760, maxHeight: '92%', borderWidth: 1, borderRadius: 16, padding: 18 },
  modalTitle: { fontSize: 22, fontWeight: '900' },
  label: { marginTop: 12, marginBottom: 6, fontSize: 11, fontWeight: '900' },
  employeePicker: { gap: 8 },
  pill: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 11, minHeight: 36, alignItems: 'center', justifyContent: 'center' },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  dateRow: { flexDirection: 'row', gap: 10 },
  input: { borderWidth: 1, borderRadius: 9, minHeight: 44, paddingHorizontal: 12, paddingVertical: 10 },
  multiline: { minHeight: 90, textAlignVertical: 'top' },
  multilineSmall: { minHeight: 70, textAlignVertical: 'top' },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 18 },
  modalButton: { minHeight: 44, borderWidth: 1, borderRadius: 9, paddingHorizontal: 18, alignItems: 'center', justifyContent: 'center' },
});
