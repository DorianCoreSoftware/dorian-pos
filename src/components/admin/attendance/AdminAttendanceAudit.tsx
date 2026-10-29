import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Platform,
  ScrollView,
  Share,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { useBusiness } from '../../../context/BusinessContext';
import {
  AttendanceAuditLogItem,
  AttendancePeriodLock,
  getAttendanceAuditLog,
  getAttendancePeriodLocks,
  lockAttendancePeriod,
  reopenAttendancePeriod,
} from '../../../services/attendanceService';

function errorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (error && typeof error === 'object' && 'message' in error) {
    return String((error as { message?: unknown }).message ?? 'Ocurrió un error.');
  }
  return 'Ocurrió un error.';
}

function formatDateTime(value: string | null): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('es-MX');
}

function csvEscape(value: unknown): string {
  const text = value == null ? '' : String(value);
  return `"${text.replace(/"/g, '""')}"`;
}

function auditCsv(rows: AttendanceAuditLogItem[]): string {
  const header = [
    'Fecha/hora', 'Actor', 'Entidad', 'ID entidad', 'Acción',
    'Fecha laboral', 'Empleado', 'Motivo', 'Antes', 'Después',
  ];
  const lines = rows.map(row => [
    row.occurredAt,
    row.actorName,
    row.entityType,
    row.entityId ?? '',
    row.action,
    row.workDate ?? '',
    row.employeeName ?? '',
    row.reason ?? '',
    row.oldData ? JSON.stringify(row.oldData) : '',
    row.newData ? JSON.stringify(row.newData) : '',
  ].map(csvEscape).join(','));
  return [header.map(csvEscape).join(','), ...lines].join('\n');
}

export function AdminAttendanceAudit() {
  const { theme } = useBusiness();
  const [locks, setLocks] = useState<AttendancePeriodLock[]>([]);
  const [audit, setAudit] = useState<AttendanceAuditLogItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [reason, setReason] = useState('');
  const [reopenReason, setReopenReason] = useState('');
  const [selectedLockId, setSelectedLockId] = useState<string | null>(null);

  const selectedLock = useMemo(
    () => locks.find(item => item.id === selectedLockId) ?? null,
    [locks, selectedLockId],
  );

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [nextLocks, nextAudit] = await Promise.all([
        getAttendancePeriodLocks(),
        getAttendanceAuditLog({ limit: 500 }),
      ]);
      setLocks(nextLocks);
      setAudit(nextAudit);
    } catch (error) {
      Alert.alert('No se pudo cargar auditoría', errorMessage(error));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const handleLock = async () => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate) || !/^\d{4}-\d{2}-\d{2}$/.test(endDate)) {
      Alert.alert('Fechas inválidas', 'Usa el formato AAAA-MM-DD.');
      return;
    }
    if (reason.trim().length < 3) {
      Alert.alert('Falta motivo', 'Escribe el motivo del cierre.');
      return;
    }
    try {
      setLoading(true);
      await lockAttendancePeriod({ startDate, endDate, reason });
      setReason('');
      await load();
      Alert.alert('Periodo cerrado', 'La asistencia de ese periodo quedó protegida.');
    } catch (error) {
      Alert.alert('No se pudo cerrar el periodo', errorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  const handleReopen = async () => {
    if (!selectedLock) return;
    if (reopenReason.trim().length < 3) {
      Alert.alert('Falta motivo', 'Escribe el motivo de reapertura.');
      return;
    }
    try {
      setLoading(true);
      await reopenAttendancePeriod({ lockId: selectedLock.id, reason: reopenReason });
      setSelectedLockId(null);
      setReopenReason('');
      await load();
      Alert.alert('Periodo reabierto', 'Ya se pueden realizar correcciones nuevamente.');
    } catch (error) {
      Alert.alert('No se pudo reabrir', errorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  const exportCsv = async () => {
    const content = auditCsv(audit);
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `auditoria-asistencia-${new Date().toISOString().slice(0,10)}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      return;
    }
    await Share.share({ message: content, title: 'Auditoría de asistencia' });
  };

  const card = {
    borderWidth: 1,
    borderColor: theme.border,
    backgroundColor: theme.surface,
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
  } as const;

  const input = {
    borderWidth: 1,
    borderColor: theme.border,
    backgroundColor: theme.background,
    color: theme.text,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 8,
  } as const;

  return (
    <View style={{ marginTop: 18 }}>
      <Text style={{ color: theme.text, fontSize: 20, fontWeight: '800', marginBottom: 4 }}>
        Auditoría y cierre operativo
      </Text>
      <Text style={{ color: theme.textMuted, marginBottom: 14 }}>
        Protege periodos ya terminados y conserva el historial de modificaciones.
      </Text>

      <View style={card}>
        <Text style={{ color: theme.text, fontWeight: '800', marginBottom: 10 }}>Cerrar periodo</Text>
        <TextInput value={startDate} onChangeText={setStartDate} placeholder="Inicio AAAA-MM-DD" placeholderTextColor={theme.textMuted} style={input} autoCapitalize="none" />
        <TextInput value={endDate} onChangeText={setEndDate} placeholder="Fin AAAA-MM-DD" placeholderTextColor={theme.textMuted} style={input} autoCapitalize="none" />
        <TextInput value={reason} onChangeText={setReason} placeholder="Motivo del cierre" placeholderTextColor={theme.textMuted} style={input} />
        <TouchableOpacity disabled={loading} onPress={() => void handleLock()} style={{ backgroundColor: theme.primary, borderRadius: 10, padding: 12, alignItems: 'center', opacity: loading ? 0.6 : 1 }}>
          <Text style={{ color: '#111', fontWeight: '900' }}>CERRAR Y PROTEGER PERIODO</Text>
        </TouchableOpacity>
      </View>

      <View style={card}>
        <Text style={{ color: theme.text, fontWeight: '800', marginBottom: 10 }}>Periodos</Text>
        {locks.length === 0 ? (
          <Text style={{ color: theme.textMuted }}>Aún no hay periodos cerrados.</Text>
        ) : locks.map(item => (
          <TouchableOpacity key={item.id} onPress={() => item.isLocked && setSelectedLockId(item.id)} style={{ borderTopWidth: 1, borderTopColor: theme.border, paddingVertical: 10 }}>
            <Text style={{ color: theme.text, fontWeight: '700' }}>{item.startDate} → {item.endDate}</Text>
            <Text style={{ color: item.isLocked ? theme.primary : theme.textMuted, fontWeight: '800' }}>{item.isLocked ? 'CERRADO' : 'REABIERTO'}</Text>
            <Text style={{ color: theme.textMuted }}>{item.reason}</Text>
            <Text style={{ color: theme.textMuted, fontSize: 12 }}>{item.lockedByName} · {formatDateTime(item.lockedAt)}</Text>
            {!item.isLocked && item.reopenReason ? <Text style={{ color: theme.textMuted, fontSize: 12 }}>Reapertura: {item.reopenReason}</Text> : null}
          </TouchableOpacity>
        ))}
      </View>

      {selectedLock ? (
        <View style={card}>
          <Text style={{ color: theme.text, fontWeight: '800', marginBottom: 8 }}>Reabrir {selectedLock.startDate} → {selectedLock.endDate}</Text>
          <TextInput value={reopenReason} onChangeText={setReopenReason} placeholder="Motivo obligatorio" placeholderTextColor={theme.textMuted} style={input} />
          <TouchableOpacity disabled={loading} onPress={() => void handleReopen()} style={{ borderWidth: 1, borderColor: theme.primary, borderRadius: 10, padding: 12, alignItems: 'center' }}>
            <Text style={{ color: theme.primary, fontWeight: '900' }}>REABRIR PERIODO</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      <View style={card}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, gap: 8 }}>
          <Text style={{ color: theme.text, fontWeight: '800' }}>Bitácora de auditoría</Text>
          <TouchableOpacity onPress={() => void exportCsv()} style={{ borderWidth: 1, borderColor: theme.primary, borderRadius: 9, paddingHorizontal: 10, paddingVertical: 7 }}>
            <Text style={{ color: theme.primary, fontWeight: '800' }}>EXPORTAR CSV</Text>
          </TouchableOpacity>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator>
          <View style={{ minWidth: 980 }}>
            {audit.length === 0 ? (
              <Text style={{ color: theme.textMuted }}>No hay movimientos auditados todavía.</Text>
            ) : audit.map(row => (
              <View key={row.id} style={{ flexDirection: 'row', borderTopWidth: 1, borderTopColor: theme.border, paddingVertical: 8 }}>
                <Text style={{ color: theme.textMuted, width: 160 }}>{formatDateTime(row.occurredAt)}</Text>
                <Text style={{ color: theme.text, width: 160 }}>{row.actorName}</Text>
                <Text style={{ color: theme.text, width: 170 }}>{row.entityType}</Text>
                <Text style={{ color: theme.text, width: 90 }}>{row.action}</Text>
                <Text style={{ color: theme.text, width: 140 }}>{row.employeeName ?? '—'}</Text>
                <Text style={{ color: theme.textMuted, width: 240 }}>{row.reason ?? row.workDate ?? '—'}</Text>
              </View>
            ))}
          </View>
        </ScrollView>
      </View>
    </View>
  );
}
