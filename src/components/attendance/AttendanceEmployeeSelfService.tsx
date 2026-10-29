import React, { useCallback, useEffect, useMemo, useState } from 'react';
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

import { useBusiness } from '../../context/BusinessContext';
import { AttendanceEmployeePublishedSchedule } from './AttendanceEmployeePublishedSchedule';
import { AttendanceShiftChanges } from './AttendanceShiftChanges';
import {
  AttendanceEmployeeRequest,
  AttendanceEmployeeRequestType,
  AttendanceIncident,
  MyPayrollReceipt,
  cancelMyAttendanceRequest,
  createMyAttendanceRequest,
  getMyAttendanceIncidents,
  getMyAttendanceRequests,
  getMyPayrollReceipts,
  sendPayrollReceiptEmail,
} from '../../services/attendanceService';

export type AttendanceEmployeeSelfServiceSection =
  | 'summary'
  | 'schedule'
  | 'shiftChanges'
  | 'requests'
  | 'receipts';

type Section = AttendanceEmployeeSelfServiceSection;

const REQUEST_OPTIONS: Array<{ key: AttendanceEmployeeRequestType; label: string }> = [
  { key: 'permission', label: 'Permiso' },
  { key: 'vacation', label: 'Vacaciones' },
  { key: 'medical_leave', label: 'Incapacidad' },
  { key: 'absence_justified', label: 'Justificar falta' },
  { key: 'late_justified', label: 'Justificar retardo' },
  { key: 'early_leave_justified', label: 'Justificar salida anticipada' },
  { key: 'other', label: 'Otra' },
];

function money(value: number, currency = 'MXN'): string {
  return new Intl.NumberFormat('es-MX', { style: 'currency', currency }).format(value);
}

function statusLabel(value: string): string {
  switch (value) {
    case 'approved': return 'APROBADA';
    case 'rejected': return 'RECHAZADA';
    case 'cancelled': return 'CANCELADA';
    case 'paid': return 'PAGADO';
    default: return 'PENDIENTE';
  }
}

function typeLabel(value: string): string {
  return REQUEST_OPTIONS.find(item => item.key === value)?.label ?? value;
}

function receiptText(item: MyPayrollReceipt): string {
  return [
    'DORIAN POS · RECIBO DE NÓMINA',
    `Periodo: ${item.startDate} a ${item.endDate}`,
    `Empleado: ${item.employeeName}`,
    `Puesto: ${item.employeeRole}`,
    `Pago programado: ${money(item.scheduledPay, item.currencyCode)}`,
    `Descuento faltas: -${money(item.absenceDeduction, item.currencyCode)}`,
    `Descuento retardos: -${money(item.lateDeduction, item.currencyCode)}`,
    `Descuento salidas: -${money(item.earlyLeaveDeduction, item.currencyCode)}`,
    `Horas extra: +${money(item.overtimePay, item.currencyCode)}`,
    `TOTAL: ${money(item.totalPay, item.currencyCode)}`,
    `Estado: ${statusLabel(item.paymentStatus)}`,
    item.paidAt ? `Pagado: ${new Date(item.paidAt).toLocaleString('es-MX')}` : '',
    item.paymentReference ? `Referencia: ${item.paymentReference}` : '',
  ].filter(Boolean).join('\n');
}

interface AttendanceEmployeeSelfServiceProps {
  initialSection?: Section | null;
  focusToken?: number;
}

export function AttendanceEmployeeSelfService({
  initialSection = null,
  focusToken = 0,
}: AttendanceEmployeeSelfServiceProps) {
  const { theme } = useBusiness();
  const [section, setSection] = useState<Section>('summary');
  const [loading, setLoading] = useState(true);
  const [incidents, setIncidents] = useState<AttendanceIncident[]>([]);
  const [requests, setRequests] = useState<AttendanceEmployeeRequest[]>([]);
  const [receipts, setReceipts] = useState<MyPayrollReceipt[]>([]);
  const [requestType, setRequestType] = useState<AttendanceEmployeeRequestType>('permission');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [emailingId, setEmailingId] = useState<string | null>(null);


  useEffect(() => {
    if (!initialSection || focusToken <= 0) {
      return;
    }

    setSection(initialSection);
  }, [
    initialSection,
    focusToken,
  ]);

  const load = useCallback(async () => {
    const [incidentRows, requestRows, receiptRows] = await Promise.all([
      getMyAttendanceIncidents(),
      getMyAttendanceRequests(),
      getMyPayrollReceipts(),
    ]);
    setIncidents(incidentRows);
    setRequests(requestRows);
    setReceipts(receiptRows);
  }, []);

  useEffect(() => {
    void (async () => {
      try { await load(); }
      catch (error) { console.error(error); }
      finally { setLoading(false); }
    })();
  }, [load]);

  const counts = useMemo(() => ({
    pending: requests.filter(item => item.status === 'pending').length,
    approved: requests.filter(item => item.status === 'approved').length,
    paid: receipts.filter(item => item.paymentStatus === 'paid').length,
  }), [requests, receipts]);

  const submitRequest = async (): Promise<void> => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate) || !/^\d{4}-\d{2}-\d{2}$/.test(endDate)) {
      Alert.alert('Fechas inválidas', 'Usa AAAA-MM-DD.'); return;
    }
    if (endDate < startDate) { Alert.alert('Fechas inválidas', 'La fecha final no puede ser anterior.'); return; }
    if (note.trim().length < 3) { Alert.alert('Descripción requerida', 'Explica brevemente tu solicitud.'); return; }
    try {
      setSaving(true);
      await createMyAttendanceRequest({ startDate, endDate, requestType, note });
      setStartDate(''); setEndDate(''); setNote('');
      await load();
      Alert.alert('Solicitud enviada', 'Administración podrá aprobarla o rechazarla.');
    } catch (error) {
      Alert.alert('No se pudo enviar', error instanceof Error ? error.message : 'Ocurrió un error.');
    } finally { setSaving(false); }
  };

  const resend = async (item: MyPayrollReceipt): Promise<void> => {
    try {
      setEmailingId(item.payrollItemId);
      await sendPayrollReceiptEmail(item.payrollItemId);
      await load();
      Alert.alert('Correo enviado', 'El recibo se envió al correo asociado a tu cuenta.');
    } catch (error) {
      Alert.alert('No se pudo enviar', error instanceof Error ? error.message : 'Ocurrió un error.');
    } finally { setEmailingId(null); }
  };

  const shareReceipt = async (item: MyPayrollReceipt): Promise<void> => {
    const text = receiptText(item);
    if (Platform.OS === 'web') {
      const win = window.open('', '_blank');
      if (win) {
        win.document.write(`<pre style="font:14px sans-serif;white-space:pre-wrap">${text.replace(/&/g,'&amp;').replace(/</g,'&lt;')}</pre>`);
        win.document.close();
        win.print();
      }
      return;
    }
    await Share.share({ message: text, title: 'Recibo de nómina' });
  };

  if (loading) {
    return <View style={styles.center}><ActivityIndicator color={theme.primary} /><Text style={{ color: theme.textMuted }}>Cargando autoservicio...</Text></View>;
  }

  return (
    <View style={styles.root}>
      <Text style={[styles.title, { color: theme.text }]}>Mi expediente</Text>
      <View style={styles.tabs}>
        {([
          ['summary', 'RESUMEN'],
          ['schedule', 'MI HORARIO'],
          ['shiftChanges', 'CAMBIOS / COBERTURAS'],
          ['requests', `SOLICITUDES (${counts.pending})`],
          ['receipts', `RECIBOS (${counts.paid})`],
        ] as Array<[Section, string]>).map(([key, label]) => (
          <TouchableOpacity key={key} onPress={() => setSection(key)} style={[styles.tab, { borderColor: section === key ? theme.primary : theme.border, backgroundColor: section === key ? theme.surfaceAlt : theme.surface }]}> 
            <Text style={{ color: section === key ? theme.primary : theme.textMuted, fontWeight: '900' }}>{label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {section === 'summary' ? (
        <View style={styles.grid}>
          <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}><Text style={[styles.metric, { color: theme.primary }]}>{incidents.length}</Text><Text style={{ color: theme.text }}>Incidencias registradas</Text></View>
          <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}><Text style={[styles.metric, { color: theme.primary }]}>{counts.approved}</Text><Text style={{ color: theme.text }}>Solicitudes aprobadas</Text></View>
          <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}><Text style={[styles.metric, { color: theme.primary }]}>{receipts.length}</Text><Text style={{ color: theme.text }}>Recibos disponibles</Text></View>
        </View>
      ) : null}

      {section === 'schedule' ? (
        <AttendanceEmployeePublishedSchedule />
      ) : null}

      {section === 'shiftChanges' ? (
        <AttendanceShiftChanges />
      ) : null}

      {section === 'requests' ? (
        <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}> 
          <Text style={[styles.cardTitle, { color: theme.text }]}>Nueva solicitud</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.typeRow}>
            {REQUEST_OPTIONS.map(option => <TouchableOpacity key={option.key} onPress={() => setRequestType(option.key)} style={[styles.chip, { borderColor: requestType === option.key ? theme.primary : theme.border }]}><Text style={{ color: requestType === option.key ? theme.primary : theme.textMuted, fontWeight: '800' }}>{option.label}</Text></TouchableOpacity>)}
          </ScrollView>
          <View style={styles.dateRow}>
            <TextInput value={startDate} onChangeText={setStartDate} placeholder="Desde AAAA-MM-DD" placeholderTextColor={theme.textMuted} style={[styles.input, { color: theme.text, borderColor: theme.border, backgroundColor: theme.background }]} />
            <TextInput value={endDate} onChangeText={setEndDate} placeholder="Hasta AAAA-MM-DD" placeholderTextColor={theme.textMuted} style={[styles.input, { color: theme.text, borderColor: theme.border, backgroundColor: theme.background }]} />
          </View>
          <TextInput value={note} onChangeText={setNote} multiline placeholder="Motivo / explicación" placeholderTextColor={theme.textMuted} style={[styles.input, styles.note, { color: theme.text, borderColor: theme.border, backgroundColor: theme.background }]} />
          <TouchableOpacity disabled={saving} onPress={() => void submitRequest()} style={[styles.primary, { backgroundColor: theme.primary }]}><Text style={{ color: theme.onPrimary, fontWeight: '900' }}>{saving ? 'ENVIANDO...' : 'ENVIAR SOLICITUD'}</Text></TouchableOpacity>

          <Text style={[styles.cardTitle, { color: theme.text, marginTop: 18 }]}>Mis solicitudes</Text>
          {requests.map(item => <View key={item.id} style={[styles.row, { borderColor: theme.border }]}><View style={{ flex: 1 }}><Text style={{ color: theme.text, fontWeight: '800' }}>{typeLabel(item.requestType)} · {item.startDate}{item.endDate !== item.startDate ? ` a ${item.endDate}` : ''}</Text><Text style={{ color: theme.textMuted }}>{item.note}</Text>{item.adminNote ? <Text style={{ color: theme.textMuted }}>Admin: {item.adminNote}</Text> : null}</View><View style={styles.right}><Text style={{ color: item.status === 'approved' ? theme.primary : item.status === 'rejected' ? theme.danger : theme.textMuted, fontWeight: '900' }}>{statusLabel(item.status)}</Text>{item.status === 'pending' ? <TouchableOpacity onPress={() => void (async()=>{await cancelMyAttendanceRequest(item.id); await load();})()}><Text style={{ color: theme.danger, fontWeight: '800', marginTop: 6 }}>CANCELAR</Text></TouchableOpacity> : null}</View></View>)}
        </View>
      ) : null}

      {section === 'receipts' ? (
        <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}> 
          <Text style={[styles.cardTitle, { color: theme.text }]}>Mis recibos</Text>
          {receipts.length === 0 ? <Text style={{ color: theme.textMuted }}>Todavía no tienes recibos de nómina.</Text> : receipts.map(item => <View key={item.payrollItemId} style={[styles.row, { borderColor: theme.border }]}><View style={{ flex: 1 }}><Text style={{ color: theme.text, fontWeight: '900' }}>{item.startDate} → {item.endDate}</Text><Text style={[styles.receiptTotal, { color: theme.primary }]}>{money(item.totalPay, item.currencyCode)}</Text><Text style={{ color: theme.textMuted }}>{statusLabel(item.paymentStatus)}{item.emailSentAt ? ` · correo ${new Date(item.emailSentAt).toLocaleString('es-MX')}` : ' · correo pendiente'}</Text></View><View style={styles.right}><TouchableOpacity onPress={() => void shareReceipt(item)} style={[styles.smallButton, { borderColor: theme.border }]}><Text style={{ color: theme.text, fontWeight: '800' }}>VER / IMPRIMIR</Text></TouchableOpacity><TouchableOpacity disabled={emailingId === item.payrollItemId} onPress={() => void resend(item)} style={[styles.smallButton, { borderColor: theme.primary }]}><Text style={{ color: theme.primary, fontWeight: '800' }}>{emailingId === item.payrollItemId ? 'ENVIANDO...' : 'REENVIAR CORREO'}</Text></TouchableOpacity></View></View>)}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { marginTop: 26, gap: 14 }, center: { minHeight: 180, alignItems: 'center', justifyContent: 'center', gap: 8 }, title: { fontSize: 22, fontWeight: '900' },
  tabs: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 }, tab: { borderWidth: 1, borderRadius: 9, minHeight: 40, paddingHorizontal: 13, alignItems: 'center', justifyContent: 'center' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 }, card: { borderWidth: 1, borderRadius: 14, padding: 16, flexGrow: 1, minWidth: 220 }, metric: { fontSize: 28, fontWeight: '900' }, cardTitle: { fontSize: 17, fontWeight: '900', marginBottom: 10 },
  typeRow: { gap: 8, paddingBottom: 8 }, chip: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8 }, dateRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 }, input: { borderWidth: 1, borderRadius: 9, minHeight: 44, paddingHorizontal: 12, paddingVertical: 10, flexGrow: 1, minWidth: 180 }, note: { minHeight: 85, textAlignVertical: 'top', marginTop: 8 }, primary: { alignSelf: 'flex-start', marginTop: 10, minHeight: 44, paddingHorizontal: 18, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  row: { borderTopWidth: 1, paddingVertical: 13, flexDirection: 'row', gap: 12, alignItems: 'center' }, right: { alignItems: 'flex-end', gap: 6 }, receiptTotal: { fontSize: 20, fontWeight: '900', marginVertical: 3 }, smallButton: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8 },
});
