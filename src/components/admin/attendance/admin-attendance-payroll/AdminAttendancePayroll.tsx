import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  ScrollView,
  Share,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { useBusiness } from '../../../../context/BusinessContext';
import { DateCalendarField, DateTimeCalendarField } from '../../../common/date-calendar-field/DateCalendarField';
import {
  AttendancePayrollPreviewItem,
  AttendancePayrollRun,
  AttendancePayrollRunDetail,
  AttendancePayrollRunItem,
  AttendancePayrollSetting,
  PayrollPayBasis,
  PayrollPaymentMethod,
  closeAttendancePayrollRun,
  getAttendancePayrollPreview,
  getAttendancePayrollRunDetail,
  getAttendancePayrollRuns,
  getAttendancePayrollSettings,
  markAttendancePayrollItemPaid,
  saveAttendancePayrollSetting,
  sendPayrollReceiptEmail,
  voidAttendancePayrollRun,
} from '../../../../services/attendanceService';

function pad(value: number): string {
  return String(value).padStart(2, '0');
}

function dateInput(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function defaultStartDate(): string {
  const date = new Date();
  date.setDate(date.getDate() - 6);
  return dateInput(date);
}

function money(value: number, currency = 'MXN'): string {
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

function basisLabel(value: PayrollPayBasis): string {
  if (value === 'hourly') return 'POR HORA';
  if (value === 'weekly') return 'SEMANAL';
  return 'POR DÍA';
}

function statusLabel(value: string): string {
  if (value === 'paid') return 'PAGADO';
  if (value === 'partially_paid') return 'PARCIALMENTE PAGADO';
  if (value === 'voided') return 'ANULADO';
  return 'CERRADO';
}

function paymentMethodLabel(value: PayrollPaymentMethod | null): string {
  if (value === 'cash') return 'Efectivo';
  if (value === 'transfer') return 'Transferencia';
  if (value === 'card') return 'Tarjeta';
  if (value === 'other') return 'Otro';
  return 'Sin registrar';
}

function parseNumber(value: string, fallback = 0): number {
  const parsed = Number(value.replace(',', '.'));
  return Number.isFinite(parsed) ? parsed : fallback;
}

function formatDateTime(value: string | null): string {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString('es-MX');
}

export function AdminAttendancePayroll() {
  const { theme } = useBusiness();

  const [settings, setSettings] = useState<AttendancePayrollSetting[]>([]);
  const [settingsLoading, setSettingsLoading] = useState(true);
  const [savingUserId, setSavingUserId] = useState<string | null>(null);

  const [startDate, setStartDate] = useState(defaultStartDate());
  const [endDate, setEndDate] = useState(dateInput(new Date()));
  const [notes, setNotes] = useState('');
  const [preview, setPreview] = useState<AttendancePayrollPreviewItem[]>([]);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [closing, setClosing] = useState(false);

  const [runs, setRuns] = useState<AttendancePayrollRun[]>([]);
  const [selectedRun, setSelectedRun] = useState<AttendancePayrollRunDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [payingItemId, setPayingItemId] = useState<string | null>(null);
  const [paymentItemId, setPaymentItemId] = useState<string | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<PayrollPaymentMethod>('cash');
  const [paymentReference, setPaymentReference] = useState('');
  const [voidReason, setVoidReason] = useState('');
  const [voiding, setVoiding] = useState(false);
  const [emailingItemId, setEmailingItemId] = useState<string | null>(null);

  const loadSettings = async (): Promise<void> => {
    try {
      setSettingsLoading(true);
      setSettings(await getAttendancePayrollSettings());
    } catch (error) {
      Alert.alert('No se pudo cargar nómina', error instanceof Error ? error.message : 'Ocurrió un error.');
    } finally {
      setSettingsLoading(false);
    }
  };

  const loadRuns = async (): Promise<void> => {
    try {
      setRuns(await getAttendancePayrollRuns());
    } catch (error) {
      console.error('No se pudieron cargar los cortes de nómina:', error);
    }
  };

  const loadRunDetail = async (runId: string): Promise<void> => {
    try {
      setDetailLoading(true);
      setSelectedRun(await getAttendancePayrollRunDetail(runId));
      setPaymentItemId(null);
      setPaymentReference('');
      setVoidReason('');
    } catch (error) {
      Alert.alert('No se pudo abrir el corte', error instanceof Error ? error.message : 'Ocurrió un error.');
    } finally {
      setDetailLoading(false);
    }
  };

  useEffect(() => {
    void loadSettings();
    void loadRuns();
  }, []);

  const updateSetting = <K extends keyof AttendancePayrollSetting>(
    userId: string,
    key: K,
    value: AttendancePayrollSetting[K],
  ): void => {
    setSettings(current => current.map(item => item.userId === userId ? { ...item, [key]: value } : item));
  };

  const saveSetting = async (setting: AttendancePayrollSetting): Promise<void> => {
    if (setting.baseRate < 0) {
      Alert.alert('Sueldo inválido', 'El sueldo no puede ser negativo.');
      return;
    }
    if (setting.overtimeMultiplier < 1) {
      Alert.alert('Multiplicador inválido', 'Las horas extra deben usar un multiplicador de al menos 1.');
      return;
    }

    try {
      setSavingUserId(setting.userId);
      await saveAttendancePayrollSetting(setting);
      await loadSettings();
      setPreview([]);
      Alert.alert('Configuración guardada', `Nómina actualizada para ${setting.employeeName}.`);
    } catch (error) {
      Alert.alert('No se pudo guardar', error instanceof Error ? error.message : 'Ocurrió un error.');
    } finally {
      setSavingUserId(null);
    }
  };

  const generatePreview = async (): Promise<void> => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate) || !/^\d{4}-\d{2}-\d{2}$/.test(endDate)) {
      Alert.alert('Fechas inválidas', 'Selecciona un rango de fechas válido.');
      return;
    }
    if (endDate < startDate) {
      Alert.alert('Fechas inválidas', 'La fecha final debe ser igual o posterior a la inicial.');
      return;
    }

    try {
      setPreviewLoading(true);
      setPreview(await getAttendancePayrollPreview({ startDate, endDate }));
    } catch (error) {
      Alert.alert('No se pudo calcular la nómina', error instanceof Error ? error.message : 'Ocurrió un error.');
    } finally {
      setPreviewLoading(false);
    }
  };

  const totals = useMemo(() => preview.reduce(
    (acc, item) => ({
      scheduled: acc.scheduled + item.scheduledPay,
      deductions: acc.deductions + item.absenceDeduction + item.lateDeduction + item.earlyLeaveDeduction,
      overtime: acc.overtime + item.overtimePay,
      total: acc.total + item.totalPay,
    }),
    { scheduled: 0, deductions: 0, overtime: 0, total: 0 },
  ), [preview]);

  const currency = preview[0]?.currencyCode ?? 'MXN';
  const hasUnconfigured = preview.some(item => !item.configured);
  const openShifts = preview.reduce((sum, item) => sum + item.openShifts, 0);

  const closeRun = (): void => {
    if (preview.length === 0) {
      Alert.alert('Genera el corte', 'Primero genera la vista previa del periodo.');
      return;
    }
    if (hasUnconfigured) {
      Alert.alert('Configuración incompleta', 'Todos los empleados activos deben tener sueldo configurado.');
      return;
    }
    if (openShifts > 0) {
      Alert.alert('Hay jornadas abiertas', 'Corrige o cierra las jornadas abiertas antes de cerrar la nómina.');
      return;
    }

    Alert.alert(
      'Cerrar corte de nómina',
      `Se congelará el periodo ${startDate} a ${endDate} por ${money(totals.total, currency)}.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Cerrar corte',
          onPress: () => {
            void (async () => {
              try {
                setClosing(true);
                const runId = await closeAttendancePayrollRun({ startDate, endDate, notes });
                setNotes('');
                await loadRuns();
                await loadRunDetail(runId);
                Alert.alert('Corte cerrado', 'La nómina quedó congelada y ya puedes registrar los pagos individuales.');
              } catch (error) {
                Alert.alert('No se pudo cerrar el corte', error instanceof Error ? error.message : 'Ocurrió un error.');
              } finally {
                setClosing(false);
              }
            })();
          },
        },
      ],
    );
  };

  const beginPayment = (item: AttendancePayrollRunItem): void => {
    setPaymentItemId(item.itemId);
    setPaymentMethod('cash');
    setPaymentReference('');
  };

  const confirmPayment = async (item: AttendancePayrollRunItem): Promise<void> => {
    if (!selectedRun) return;
    try {
      setPayingItemId(item.itemId);
      await markAttendancePayrollItemPaid({
        itemId: item.itemId,
        paymentMethod,
        paymentReference,
      });
      await Promise.all([loadRunDetail(selectedRun.id), loadRuns()]);
      setPaymentItemId(null);
      setPaymentReference('');
      Alert.alert('Pago registrado', `El recibo de ${item.employeeName} quedó marcado como pagado.`);
    } catch (error) {
      Alert.alert('No se pudo registrar el pago', error instanceof Error ? error.message : 'Ocurrió un error.');
    } finally {
      setPayingItemId(null);
    }
  };

  const voidRun = (): void => {
    if (!selectedRun) return;
    if (voidReason.trim().length < 5) {
      Alert.alert('Motivo obligatorio', 'Escribe al menos 5 caracteres para explicar la anulación.');
      return;
    }

    Alert.alert(
      'Anular corte',
      'El corte permanecerá en el historial, pero quedará marcado como ANULADO. No se puede anular si ya tiene pagos.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Anular',
          style: 'destructive',
          onPress: () => {
            void (async () => {
              try {
                setVoiding(true);
                await voidAttendancePayrollRun({ payrollRunId: selectedRun.id, reason: voidReason });
                await Promise.all([loadRunDetail(selectedRun.id), loadRuns()]);
                setVoidReason('');
                Alert.alert('Corte anulado', 'La anulación quedó registrada con su motivo.');
              } catch (error) {
                Alert.alert('No se pudo anular', error instanceof Error ? error.message : 'Ocurrió un error.');
              } finally {
                setVoiding(false);
              }
            })();
          },
        },
      ],
    );
  };

  const receiptText = (item: AttendancePayrollRunItem): string => {
    if (!selectedRun) return '';
    return [
      'DORIAN POS · RECIBO DE NÓMINA',
      `Folio: ${selectedRun.id.slice(0, 8).toUpperCase()}-${item.itemId.slice(0, 8).toUpperCase()}`,
      `Periodo: ${selectedRun.startDate} a ${selectedRun.endDate}`,
      `Empleado: ${item.employeeName}`,
      `Puesto: ${item.employeeRole}`,
      `Sueldo base: ${money(item.baseRate, selectedRun.currencyCode)} (${basisLabel(item.payBasis)})`,
      `Días programados: ${item.scheduledDays}`,
      `Días trabajados: ${item.workedDays}`,
      `Ausencias pagadas: ${item.paidLeaveDays}`,
      `Faltas: ${item.absentDays}`,
      `Retardo: ${item.lateMinutes} min`,
      `Salida anticipada: ${item.earlyLeaveMinutes} min`,
      `Horas extra: ${item.overtimeMinutes} min`,
      `Pago programado: ${money(item.scheduledPay, selectedRun.currencyCode)}`,
      `Descuento faltas: -${money(item.absenceDeduction, selectedRun.currencyCode)}`,
      `Descuento retardos: -${money(item.lateDeduction, selectedRun.currencyCode)}`,
      `Descuento salidas anticipadas: -${money(item.earlyLeaveDeduction, selectedRun.currencyCode)}`,
      `Pago horas extra: +${money(item.overtimePay, selectedRun.currencyCode)}`,
      `TOTAL: ${money(item.totalPay, selectedRun.currencyCode)}`,
      `Estado: ${item.paymentStatus === 'paid' ? 'PAGADO' : 'PENDIENTE'}`,
      item.paidAt ? `Fecha de pago: ${formatDateTime(item.paidAt)}` : '',
      item.paymentMethod ? `Método: ${paymentMethodLabel(item.paymentMethod)}` : '',
      item.paymentReference ? `Referencia: ${item.paymentReference}` : '',
      item.paidByName ? `Registrado por: ${item.paidByName}` : '',
      '',
      'Firma del empleado: ______________________________',
    ].filter(Boolean).join('\n');
  };

  const resendReceiptEmail = async (item: AttendancePayrollRunItem): Promise<void> => {
    try {
      setEmailingItemId(item.itemId);
      await sendPayrollReceiptEmail(item.itemId);
      Alert.alert('Correo enviado', `El recibo se envió al correo de ${item.employeeName}.`);
    } catch (error) {
      Alert.alert('No se pudo enviar', error instanceof Error ? error.message : 'Ocurrió un error.');
    } finally {
      setEmailingItemId(null);
    }
  };

  const printOrShareReceipt = async (item: AttendancePayrollRunItem): Promise<void> => {
    if (!selectedRun) return;
    const receipt = receiptText(item);

    if (Platform.OS === 'web') {
      try {
        const browser = globalThis as any;
        const popup = browser.window?.open('', '_blank', 'width=760,height=900');
        if (!popup) throw new Error('El navegador bloqueó la ventana de impresión.');
        const escape = (value: string): string => value
          .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;').replace(/'/g, '&#039;');
        popup.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>Recibo ${escape(item.employeeName)}</title><style>body{font-family:Arial,sans-serif;margin:0;color:#111}.sheet{max-width:720px;margin:30px auto;padding:32px;border:1px solid #ddd}.top{display:flex;justify-content:space-between;border-bottom:2px solid #111;padding-bottom:14px;margin-bottom:20px}.brand{font-size:22px;font-weight:800}.muted{color:#666;font-size:12px}.row{display:flex;justify-content:space-between;gap:20px;padding:6px 0}.total{font-size:22px;font-weight:900;border-top:2px solid #111;margin-top:14px;padding-top:14px}.signature{margin-top:60px;border-top:1px solid #111;padding-top:8px;width:280px;text-align:center}@media print{.sheet{border:0;margin:0;max-width:none}.no-print{display:none}}</style></head><body><div class="sheet"><div class="top"><div><div class="brand">DORIAN POS</div><div>RECIBO DE NÓMINA</div></div><div class="muted">Folio ${escape(selectedRun.id.slice(0,8).toUpperCase())}-${escape(item.itemId.slice(0,8).toUpperCase())}</div></div><div class="row"><b>Empleado</b><span>${escape(item.employeeName)}</span></div><div class="row"><b>Puesto</b><span>${escape(item.employeeRole)}</span></div><div class="row"><b>Periodo</b><span>${escape(selectedRun.startDate)} a ${escape(selectedRun.endDate)}</span></div><div class="row"><b>Sueldo base</b><span>${escape(money(item.baseRate, selectedRun.currencyCode))} · ${escape(basisLabel(item.payBasis))}</span></div><hr/><div class="row"><span>Pago programado</span><span>${escape(money(item.scheduledPay, selectedRun.currencyCode))}</span></div><div class="row"><span>Descuento faltas</span><span>-${escape(money(item.absenceDeduction, selectedRun.currencyCode))}</span></div><div class="row"><span>Descuento retardos</span><span>-${escape(money(item.lateDeduction, selectedRun.currencyCode))}</span></div><div class="row"><span>Descuento salidas</span><span>-${escape(money(item.earlyLeaveDeduction, selectedRun.currencyCode))}</span></div><div class="row"><span>Horas extra (${item.overtimeMinutes} min)</span><span>+${escape(money(item.overtimePay, selectedRun.currencyCode))}</span></div><div class="row total"><span>TOTAL</span><span>${escape(money(item.totalPay, selectedRun.currencyCode))}</span></div><hr/><div class="row"><b>Estado</b><span>${item.paymentStatus === 'paid' ? 'PAGADO' : 'PENDIENTE'}</span></div>${item.paidAt ? `<div class="row"><span>Fecha de pago</span><span>${escape(formatDateTime(item.paidAt))}</span></div>` : ''}${item.paymentMethod ? `<div class="row"><span>Método</span><span>${escape(paymentMethodLabel(item.paymentMethod))}</span></div>` : ''}${item.paymentReference ? `<div class="row"><span>Referencia</span><span>${escape(item.paymentReference)}</span></div>` : ''}<div class="signature">Firma del empleado</div><p class="muted">Documento generado desde el snapshot histórico del corte. Imprimir o guardar como PDF desde el navegador.</p><button class="no-print" onclick="window.print()">Imprimir / Guardar PDF</button></div></body></html>`);
        popup.document.close();
        return;
      } catch (error) {
        Alert.alert('No se pudo imprimir', error instanceof Error ? error.message : 'Ocurrió un error.');
        return;
      }
    }

    try {
      await Share.share({ message: receipt, title: `Recibo ${item.employeeName}` });
    } catch (error) {
      Alert.alert('No se pudo compartir', error instanceof Error ? error.message : 'Ocurrió un error.');
    }
  };

  return (
    <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}> 
      <Text style={[styles.title, { color: theme.text }]}>Nómina</Text>
      <Text style={[styles.subtitle, { color: theme.textMuted }]}>Configura sueldos, congela cortes, registra pagos y conserva recibos históricos.</Text>

      <Text style={[styles.sectionTitle, { color: theme.text }]}>CONFIGURACIÓN POR EMPLEADO</Text>
      {settingsLoading ? (
        <ActivityIndicator color={theme.primary} />
      ) : (
        <ScrollView horizontal showsHorizontalScrollIndicator contentContainerStyle={styles.employeeList}>
          {settings.map(setting => (
            <View key={setting.userId} style={[styles.employeeCard, { backgroundColor: theme.background, borderColor: setting.configured ? theme.border : theme.primary }]}>
              <Text style={[styles.employeeName, { color: theme.text }]}>{setting.employeeName}</Text>
              <Text style={[styles.employeeRole, { color: theme.textMuted }]}>{setting.employeeRole.toUpperCase()} {setting.configured ? '· CONFIGURADO' : '· PENDIENTE'}</Text>

              <View style={styles.basisRow}>
                {(['hourly', 'daily', 'weekly'] as PayrollPayBasis[]).map(basis => (
                  <TouchableOpacity key={basis} onPress={() => updateSetting(setting.userId, 'payBasis', basis)} style={[styles.basisButton, { borderColor: setting.payBasis === basis ? theme.primary : theme.border, backgroundColor: setting.payBasis === basis ? theme.surfaceAlt : theme.surface }]}>
                    <Text style={{ color: setting.payBasis === basis ? theme.primary : theme.textMuted, fontWeight: '800', fontSize: 11 }}>{basisLabel(basis)}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={[styles.label, { color: theme.textMuted }]}>SUELDO BASE</Text>
              <TextInput keyboardType="decimal-pad" value={String(setting.baseRate)} onChangeText={value => updateSetting(setting.userId, 'baseRate', parseNumber(value))} style={[styles.input, { color: theme.text, borderColor: theme.border, backgroundColor: theme.surface }]} />

              {setting.payBasis === 'weekly' ? (
                <>
                  <Text style={[styles.label, { color: theme.textMuted }]}>DÍAS PAGADOS POR SEMANA</Text>
                  <TextInput keyboardType="number-pad" value={String(setting.weeklyPaidDays)} onChangeText={value => updateSetting(setting.userId, 'weeklyPaidDays', Math.max(1, Math.min(7, Math.round(parseNumber(value, 6)))))} style={[styles.input, { color: theme.text, borderColor: theme.border, backgroundColor: theme.surface }]} />
                </>
              ) : null}

              <Text style={[styles.label, { color: theme.textMuted }]}>MULTIPLICADOR HORA EXTRA</Text>
              <TextInput keyboardType="decimal-pad" value={String(setting.overtimeMultiplier)} onChangeText={value => updateSetting(setting.userId, 'overtimeMultiplier', parseNumber(value, 2))} style={[styles.input, { color: theme.text, borderColor: theme.border, backgroundColor: theme.surface }]} />

              {([
                ['deductAbsences', 'Descontar faltas'],
                ['deductLate', 'Descontar retardos'],
                ['deductEarlyLeave', 'Descontar salida anticipada'],
                ['payJustifiedAbsence', 'Pagar falta justificada'],
                ['payVacation', 'Pagar vacaciones'],
                ['payMedicalLeave', 'Pagar incapacidad'],
                ['payPermission', 'Pagar permiso'],
              ] as Array<[keyof AttendancePayrollSetting, string]>).map(([key, label]) => (
                <View key={String(key)} style={styles.switchRow}>
                  <Text style={[styles.switchLabel, { color: theme.text }]}>{label}</Text>
                  <Switch value={Boolean(setting[key])} onValueChange={value => updateSetting(setting.userId, key, value as never)} trackColor={{ true: theme.primary }} />
                </View>
              ))}

              <TouchableOpacity disabled={savingUserId === setting.userId} onPress={() => void saveSetting(setting)} style={[styles.saveButton, { backgroundColor: theme.primary, opacity: savingUserId === setting.userId ? 0.55 : 1 }]}>
                <Text style={{ color: theme.onPrimary, fontWeight: '900' }}>{savingUserId === setting.userId ? 'GUARDANDO...' : 'GUARDAR'}</Text>
              </TouchableOpacity>
            </View>
          ))}
        </ScrollView>
      )}

      <Text style={[styles.sectionTitle, { color: theme.text }]}>NUEVO CORTE</Text>
      <View style={styles.filtersRow}>
        <View style={styles.dateField}><DateCalendarField label="Desde" value={startDate} onChange={setStartDate} maximumDate={endDate} /></View>
        <View style={styles.dateField}><DateCalendarField label="Hasta" value={endDate} onChange={setEndDate} minimumDate={startDate} /></View>
        <TouchableOpacity disabled={previewLoading} onPress={() => void generatePreview()} style={[styles.generateButton, { backgroundColor: theme.primary, opacity: previewLoading ? 0.55 : 1 }]}><Text style={{ color: theme.onPrimary, fontWeight: '900' }}>{previewLoading ? 'CALCULANDO...' : 'CALCULAR'}</Text></TouchableOpacity>
      </View>

      {preview.length > 0 ? (
        <>
          <View style={styles.totalRow}>
            <Metric label="PROGRAMADO" value={money(totals.scheduled, currency)} theme={theme} />
            <Metric label="DESCUENTOS" value={money(totals.deductions, currency)} theme={theme} />
            <Metric label="HORAS EXTRA" value={money(totals.overtime, currency)} theme={theme} />
            <Metric label="TOTAL" value={money(totals.total, currency)} theme={theme} strong />
          </View>
          {hasUnconfigured ? <Text style={[styles.warning, { color: theme.primary }]}>⚠️ Hay empleados sin configuración de nómina.</Text> : null}
          {openShifts > 0 ? <Text style={[styles.warning, { color: theme.primary }]}>⚠️ Hay {openShifts} jornada(s) abierta(s).</Text> : null}

          {preview.map(item => (
            <View key={item.userId} style={[styles.previewRow, { borderColor: theme.border, backgroundColor: theme.background }]}>
              <View style={{ flex: 1, minWidth: 180 }}>
                <Text style={[styles.employeeName, { color: theme.text }]}>{item.employeeName}</Text>
                <Text style={[styles.employeeRole, { color: theme.textMuted }]}>{basisLabel(item.payBasis)} · base {money(item.baseRate, item.currencyCode)}</Text>
                <Text style={[styles.detail, { color: theme.textMuted }]}>{item.scheduledDays} programados · {item.workedDays} asistidos · {item.absentDays} faltas · {item.paidLeaveDays} incidencias pagadas</Text>
                <Text style={[styles.detail, { color: theme.textMuted }]}>Retardo {item.lateMinutes} min · salida anticipada {item.earlyLeaveMinutes} min · extra {item.overtimeMinutes} min</Text>
              </View>
              <MoneyBreakdown item={item} theme={theme} />
            </View>
          ))}

          <TextInput value={notes} onChangeText={setNotes} placeholder="Notas del corte (opcional)" placeholderTextColor={theme.textMuted} multiline style={[styles.notes, { color: theme.text, borderColor: theme.border, backgroundColor: theme.background }]} />
          <TouchableOpacity disabled={closing || hasUnconfigured || openShifts > 0} onPress={closeRun} style={[styles.closeButton, { backgroundColor: theme.primary, opacity: closing || hasUnconfigured || openShifts > 0 ? 0.5 : 1 }]}><Text style={{ color: theme.onPrimary, fontWeight: '900' }}>{closing ? 'CERRANDO...' : 'CERRAR Y CONGELAR CORTE'}</Text></TouchableOpacity>
        </>
      ) : null}

      <Text style={[styles.sectionTitle, { color: theme.text }]}>CORTES HISTÓRICOS</Text>
      {runs.length === 0 ? (
        <Text style={[styles.subtitle, { color: theme.textMuted }]}>Todavía no hay cortes cerrados.</Text>
      ) : runs.map(run => (
        <TouchableOpacity key={run.id} onPress={() => void loadRunDetail(run.id)} style={[styles.runRow, { borderColor: theme.border, backgroundColor: selectedRun?.id === run.id ? theme.surfaceAlt : 'transparent' }]}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.employeeName, { color: theme.text }]}>{run.startDate} → {run.endDate}</Text>
            <Text style={[styles.detail, { color: theme.textMuted }]}>{statusLabel(run.status)} · {run.paidEmployeeCount}/{run.employeeCount} pagados · creado por {run.createdByName}</Text>
            <Text style={[styles.detail, { color: theme.textMuted }]}>Pagado {money(run.paidAmount, run.currencyCode)} de {money(run.totalAmount, run.currencyCode)}</Text>
            {run.voidReason ? <Text style={[styles.warning, { color: theme.primary }]}>Motivo: {run.voidReason}</Text> : null}
          </View>
          <Text style={[styles.itemTotal, { color: theme.primary }]}>{money(run.totalAmount, run.currencyCode)}</Text>
        </TouchableOpacity>
      ))}

      {detailLoading ? <ActivityIndicator color={theme.primary} /> : null}

      {selectedRun ? (
        <View style={[styles.detailCard, { borderColor: theme.border, backgroundColor: theme.background }]}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>DETALLE DEL CORTE · {statusLabel(selectedRun.status)}</Text>
          <Text style={[styles.subtitle, { color: theme.textMuted }]}>{selectedRun.startDate} → {selectedRun.endDate} · {money(selectedRun.totalAmount, selectedRun.currencyCode)}</Text>
          <Text style={[styles.detail, { color: theme.textMuted }]}>Creado por {selectedRun.createdByName} · {formatDateTime(selectedRun.createdAt)}</Text>
          {selectedRun.notes ? <Text style={[styles.detail, { color: theme.textMuted }]}>Notas: {selectedRun.notes}</Text> : null}
          {selectedRun.status === 'voided' ? (
            <Text style={[styles.warning, { color: theme.primary }]}>Anulado por {selectedRun.voidedByName ?? 'administrador'} el {formatDateTime(selectedRun.voidedAt)} · {selectedRun.voidReason}</Text>
          ) : null}

          {selectedRun.items.map(item => (
            <View key={item.itemId} style={[styles.receiptRow, { borderColor: theme.border, backgroundColor: theme.surface }]}>
              <View style={{ flex: 1, minWidth: 210 }}>
                <Text style={[styles.employeeName, { color: theme.text }]}>{item.employeeName}</Text>
                <Text style={[styles.employeeRole, { color: theme.textMuted }]}>{item.employeeRole.toUpperCase()} · {basisLabel(item.payBasis)}</Text>
                <Text style={[styles.detail, { color: theme.textMuted }]}>{item.scheduledDays} programados · {item.workedDays} asistidos · {item.absentDays} faltas · {item.overtimeMinutes} min extra</Text>
                <Text style={[styles.detail, { color: item.paymentStatus === 'paid' ? theme.primary : theme.textMuted, fontWeight: '800' }]}>
                  {item.paymentStatus === 'paid' ? `PAGADO · ${formatDateTime(item.paidAt)} · ${paymentMethodLabel(item.paymentMethod)}` : 'PENDIENTE DE PAGO'}
                </Text>
                {item.paymentReference ? <Text style={[styles.detail, { color: theme.textMuted }]}>Referencia: {item.paymentReference}</Text> : null}
                {item.paidByName ? <Text style={[styles.detail, { color: theme.textMuted }]}>Registrado por: {item.paidByName}</Text> : null}
              </View>

              <View style={styles.moneyColumn}>
                <Text style={[styles.detail, { color: theme.textMuted }]}>Base: {money(item.scheduledPay, selectedRun.currencyCode)}</Text>
                <Text style={[styles.detail, { color: theme.textMuted }]}>Faltas: -{money(item.absenceDeduction, selectedRun.currencyCode)}</Text>
                <Text style={[styles.detail, { color: theme.textMuted }]}>Retardos: -{money(item.lateDeduction, selectedRun.currencyCode)}</Text>
                <Text style={[styles.detail, { color: theme.textMuted }]}>Salidas: -{money(item.earlyLeaveDeduction, selectedRun.currencyCode)}</Text>
                <Text style={[styles.detail, { color: theme.textMuted }]}>Extra: +{money(item.overtimePay, selectedRun.currencyCode)}</Text>
                <Text style={[styles.itemTotal, { color: theme.primary }]}>{money(item.totalPay, selectedRun.currencyCode)}</Text>
              </View>

              <View style={styles.actionRow}>
                <TouchableOpacity onPress={() => void printOrShareReceipt(item)} style={[styles.secondaryButton, { borderColor: theme.primary }]}><Text style={{ color: theme.primary, fontWeight: '900', fontSize: 11 }}>{Platform.OS === 'web' ? 'IMPRIMIR RECIBO' : 'COMPARTIR RECIBO'}</Text></TouchableOpacity>
                <TouchableOpacity disabled={emailingItemId === item.itemId} onPress={() => void resendReceiptEmail(item)} style={[styles.secondaryButton, { borderColor: theme.primary }]}><Text style={{ color: theme.primary, fontWeight: '900', fontSize: 11 }}>{emailingItemId === item.itemId ? 'ENVIANDO...' : 'ENVIAR POR CORREO'}</Text></TouchableOpacity>
                {selectedRun.status !== 'voided' && item.paymentStatus !== 'paid' ? (
                  <TouchableOpacity onPress={() => beginPayment(item)} style={[styles.primarySmallButton, { backgroundColor: theme.primary }]}><Text style={{ color: theme.onPrimary, fontWeight: '900', fontSize: 11 }}>REGISTRAR PAGO</Text></TouchableOpacity>
                ) : null}
              </View>

              {paymentItemId === item.itemId ? (
                <View style={[styles.paymentPanel, { borderColor: theme.border, backgroundColor: theme.background }]}>
                  <Text style={[styles.label, { color: theme.textMuted }]}>MÉTODO DE PAGO</Text>
                  <View style={styles.basisRow}>
                    {(['cash', 'transfer', 'card', 'other'] as PayrollPaymentMethod[]).map(method => (
                      <TouchableOpacity key={method} onPress={() => setPaymentMethod(method)} style={[styles.basisButton, { borderColor: paymentMethod === method ? theme.primary : theme.border, backgroundColor: paymentMethod === method ? theme.surfaceAlt : theme.surface }]}><Text style={{ color: paymentMethod === method ? theme.primary : theme.textMuted, fontWeight: '800', fontSize: 11 }}>{paymentMethodLabel(method)}</Text></TouchableOpacity>
                    ))}
                  </View>
                  <TextInput value={paymentReference} onChangeText={setPaymentReference} placeholder="Referencia / folio / nota (opcional)" placeholderTextColor={theme.textMuted} style={[styles.input, { color: theme.text, borderColor: theme.border, backgroundColor: theme.surface }]} />
                  <View style={styles.actionRow}>
                    <TouchableOpacity onPress={() => setPaymentItemId(null)} style={[styles.secondaryButton, { borderColor: theme.border }]}><Text style={{ color: theme.textMuted, fontWeight: '900' }}>CANCELAR</Text></TouchableOpacity>
                    <TouchableOpacity disabled={payingItemId === item.itemId} onPress={() => void confirmPayment(item)} style={[styles.primarySmallButton, { backgroundColor: theme.primary, opacity: payingItemId === item.itemId ? 0.5 : 1 }]}><Text style={{ color: theme.onPrimary, fontWeight: '900' }}>{payingItemId === item.itemId ? 'GUARDANDO...' : 'CONFIRMAR PAGO'}</Text></TouchableOpacity>
                  </View>
                </View>
              ) : null}
            </View>
          ))}

          {selectedRun.status === 'closed' ? (
            <View style={[styles.voidPanel, { borderColor: theme.border }]}>
              <Text style={[styles.label, { color: theme.textMuted }]}>ANULAR CORTE</Text>
              <Text style={[styles.detail, { color: theme.textMuted }]}>Solo puede anularse mientras ningún recibo haya sido pagado. El corte permanece en el historial.</Text>
              <TextInput value={voidReason} onChangeText={setVoidReason} placeholder="Motivo obligatorio" placeholderTextColor={theme.textMuted} multiline style={[styles.notes, { color: theme.text, borderColor: theme.border, backgroundColor: theme.surface }]} />
              <TouchableOpacity disabled={voiding} onPress={voidRun} style={[styles.dangerButton, { borderColor: theme.primary }]}><Text style={{ color: theme.primary, fontWeight: '900' }}>{voiding ? 'ANULANDO...' : 'ANULAR CORTE'}</Text></TouchableOpacity>
            </View>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

function MoneyBreakdown({ item, theme }: { item: AttendancePayrollPreviewItem; theme: any }) {
  return (
    <View style={styles.moneyColumn}>
      <Text style={[styles.detail, { color: theme.textMuted }]}>Base: {money(item.scheduledPay, item.currencyCode)}</Text>
      <Text style={[styles.detail, { color: theme.textMuted }]}>Faltas: -{money(item.absenceDeduction, item.currencyCode)}</Text>
      <Text style={[styles.detail, { color: theme.textMuted }]}>Retardos: -{money(item.lateDeduction, item.currencyCode)}</Text>
      <Text style={[styles.detail, { color: theme.textMuted }]}>Salidas: -{money(item.earlyLeaveDeduction, item.currencyCode)}</Text>
      <Text style={[styles.detail, { color: theme.textMuted }]}>Extra: +{money(item.overtimePay, item.currencyCode)}</Text>
      <Text style={[styles.itemTotal, { color: theme.primary }]}>{money(item.totalPay, item.currencyCode)}</Text>
    </View>
  );
}

function Metric({ label, value, theme, strong = false }: { label: string; value: string; theme: any; strong?: boolean }) {
  return (
    <View style={[styles.metric, { borderColor: theme.border, backgroundColor: theme.background }]}>
      <Text style={[styles.label, { color: theme.textMuted }]}>{label}</Text>
      <Text style={{ color: strong ? theme.primary : theme.text, fontSize: strong ? 20 : 16, fontWeight: '900' }}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: 1, borderRadius: 16, padding: 16, marginBottom: 18, gap: 12 },
  title: { fontSize: 22, fontWeight: '900' },
  subtitle: { fontSize: 13, lineHeight: 19 },
  sectionTitle: { marginTop: 8, fontSize: 13, fontWeight: '900', letterSpacing: 0.6 },
  employeeList: { gap: 12, paddingVertical: 4 },
  employeeCard: { width: 330, borderWidth: 1, borderRadius: 14, padding: 14, gap: 8 },
  employeeName: { fontSize: 15, fontWeight: '900' },
  employeeRole: { fontSize: 11, fontWeight: '700' },
  basisRow: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  basisButton: { paddingHorizontal: 10, paddingVertical: 8, borderWidth: 1, borderRadius: 8 },
  label: { fontSize: 10, fontWeight: '900', letterSpacing: 0.4 },
  input: { minHeight: 42, borderWidth: 1, borderRadius: 8, paddingHorizontal: 10 },
  switchRow: { minHeight: 34, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  switchLabel: { flex: 1, fontSize: 12, fontWeight: '700' },
  saveButton: { minHeight: 42, borderRadius: 8, alignItems: 'center', justifyContent: 'center', marginTop: 4 },
  filtersRow: { flexDirection: 'row', gap: 10, flexWrap: 'wrap', alignItems: 'flex-end' },
  dateField: { width: 150, gap: 5 },
  generateButton: { minHeight: 42, paddingHorizontal: 18, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  totalRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  metric: { minWidth: 155, flexGrow: 1, borderWidth: 1, borderRadius: 10, padding: 12, gap: 5 },
  warning: { fontSize: 12, fontWeight: '800', lineHeight: 18 },
  previewRow: { borderWidth: 1, borderRadius: 12, padding: 12, flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  detail: { fontSize: 11, lineHeight: 17 },
  moneyColumn: { minWidth: 190, alignItems: 'flex-end', gap: 2 },
  itemTotal: { fontSize: 18, fontWeight: '900', marginTop: 4 },
  notes: { minHeight: 70, borderWidth: 1, borderRadius: 10, padding: 10, textAlignVertical: 'top' },
  closeButton: { minHeight: 46, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  runRow: { borderWidth: 1, borderRadius: 10, padding: 10, flexDirection: 'row', alignItems: 'center', gap: 12 },
  detailCard: { borderWidth: 1, borderRadius: 14, padding: 14, gap: 10 },
  receiptRow: { borderWidth: 1, borderRadius: 12, padding: 12, flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  actionRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8 },
  secondaryButton: { minHeight: 38, paddingHorizontal: 12, borderWidth: 1, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  primarySmallButton: { minHeight: 38, paddingHorizontal: 12, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  paymentPanel: { width: '100%', borderWidth: 1, borderRadius: 10, padding: 10, gap: 8 },
  voidPanel: { borderTopWidth: 1, marginTop: 4, paddingTop: 12, gap: 8 },
  dangerButton: { minHeight: 42, paddingHorizontal: 14, borderWidth: 1, borderRadius: 8, alignItems: 'center', justifyContent: 'center', alignSelf: 'flex-start' },
});
