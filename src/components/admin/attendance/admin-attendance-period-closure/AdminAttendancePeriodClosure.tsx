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
  Share,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useBusiness } from '../../../../context/BusinessContext';
import { AttendancePeriodClosureSnapshot, AttendancePeriodClosureStatus, getAttendancePeriodClosureSnapshots, getAttendancePeriodClosureStatus, lockAttendancePeriod, createAttendancePeriodClosureSnapshot, getAttendancePeriodClosureSnapshot } from '../../../../services/attendanceService';
import { DateCalendarField } from '../../../common/date-calendar-field/DateCalendarField';



import { styles } from './AdminAttendancePeriodClosure.styles';
function localDate(date: Date): string {
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function csvCell(value: unknown): string {
  if (value === null || value === undefined) return '';
  const text =
    typeof value === 'object'
      ? JSON.stringify(value)
      : String(value);
  return `"${text.replace(/"/g, '""')}"`;
}

function rowsToCsv(
  title: string,
  rows: Record<string, unknown>[],
): string {
  const lines: string[] = [];
  lines.push(csvCell(title));

  if (rows.length === 0) {
    lines.push(csvCell('Sin registros'));
    return lines.join('\r\n');
  }

  const keys = Array.from(
    rows.reduce<Set<string>>((set, row) => {
      Object.keys(row).forEach(key => set.add(key));
      return set;
    }, new Set<string>()),
  );

  lines.push(keys.map(csvCell).join(','));
  for (const row of rows) {
    lines.push(keys.map(key => csvCell(row[key])).join(','));
  }

  return lines.join('\r\n');
}

function buildClosureCsv(
  snapshot: AttendancePeriodClosureSnapshot,
): string {
  const sections: string[] = [];

  sections.push(
    [
      csvCell('CIERRE ADMINISTRATIVO DE ASISTENCIA'),
      `${csvCell('Periodo')},${csvCell(
        `${snapshot.startDate} a ${snapshot.endDate}`,
      )}`,
      `${csvCell('Generado')},${csvCell(snapshot.createdAt)}`,
      `${csvCell('Generado por')},${csvCell(snapshot.createdByName)}`,
      `${csvCell('Snapshot ID')},${csvCell(snapshot.id)}`,
    ].join('\r\n'),
  );

  sections.push(
    rowsToCsv(
      'RESUMEN',
      [snapshot.summary],
    ),
  );

  sections.push(
    rowsToCsv(
      'REPORTE POR EMPLEADO',
      snapshot.employeeReport,
    ),
  );

  sections.push(rowsToCsv('INCIDENCIAS', snapshot.incidents));
  sections.push(rowsToCsv('SOLICITUDES', snapshot.requests));
  sections.push(rowsToCsv('CAMBIOS DE TURNO', snapshot.shiftChanges));
  sections.push(rowsToCsv('ALERTAS DE EJECUCIÓN', snapshot.executionAlerts));
  sections.push(rowsToCsv('NÓMINA', snapshot.payrollRuns));
  sections.push(rowsToCsv('AUDITORÍA', snapshot.auditLog));

  return `\uFEFF${sections.join('\r\n\r\n')}`;
}

async function exportCsv(
  snapshot: AttendancePeriodClosureSnapshot,
): Promise<void> {
  const csv = buildClosureCsv(snapshot);
  const filename =
    `cierre_asistencia_${snapshot.startDate}_${snapshot.endDate}.csv`;

  if (Platform.OS === 'web') {
    const blob = new Blob([csv], {
      type: 'text/csv;charset=utf-8;',
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
    return;
  }

  await Share.share({
    title: filename,
    message: csv,
  });
}

function readinessItems(
  status: AttendancePeriodClosureStatus,
): Array<{
  label: string;
  ok: boolean;
  detail: string;
}> {
  return [
    {
      label: 'Periodo terminado',
      ok: status.periodEnded,
      detail: status.periodEnded
        ? 'El rango ya terminó.'
        : 'La fecha final todavía no ha terminado.',
    },
    {
      label: 'Periodo bloqueado',
      ok: status.periodLocked,
      detail: status.periodLocked
        ? 'Los datos están protegidos por cierre operativo.'
        : 'Debes bloquear el periodo antes del snapshot final.',
    },
    {
      label: 'Jornadas abiertas',
      ok: status.openAttendanceCount === 0,
      detail: `${status.openAttendanceCount} jornada(s) abierta(s).`,
    },
    {
      label: 'Incidencias pendientes',
      ok: status.pendingIncidentCount === 0,
      detail: `${status.pendingIncidentCount} incidencia(s) pendiente(s).`,
    },
    {
      label: 'Solicitudes pendientes',
      ok: status.pendingRequestCount === 0,
      detail: `${status.pendingRequestCount} solicitud(es) pendiente(s).`,
    },
    {
      label: 'Cambios de turno abiertos',
      ok: status.openShiftChangeCount === 0,
      detail: `${status.openShiftChangeCount} cambio(s) abierto(s).`,
    },
    {
      label: 'Alertas de ejecución sin resolver',
      ok: status.unresolvedExecutionAlertCount === 0,
      detail: `${status.unresolvedExecutionAlertCount} alerta(s) activa(s).`,
    },
  ];
}

export function AdminAttendancePeriodClosure() {
  const { theme } = useBusiness();

  const today = useMemo(() => new Date(), []);
  const monthStart = useMemo(
    () =>
      localDate(
        new Date(
          today.getFullYear(),
          today.getMonth(),
          1,
          12,
        ),
      ),
    [today],
  );

  const yesterday = useMemo(() => {
    const date = new Date(today);
    date.setDate(date.getDate() - 1);
    return localDate(date);
  }, [today]);

  const [startDate, setStartDate] = useState(monthStart);
  const [endDate, setEndDate] = useState(yesterday);
  const [lockReason, setLockReason] = useState(
    'Cierre administrativo del periodo',
  );

  const [loading, setLoading] = useState(false);
  const [status, setStatus] =
    useState<AttendancePeriodClosureStatus | null>(null);
  const [snapshots, setSnapshots] =
    useState<AttendancePeriodClosureSnapshot[]>([]);

  const loadSnapshots = useCallback(async (): Promise<void> => {
    setSnapshots(await getAttendancePeriodClosureSnapshots());
  }, []);

  useEffect(() => {
    void loadSnapshots().catch(error => {
      console.error('Error cargando cierres administrativos:', error);
    });
  }, [loadSnapshots]);

  const validate = async (): Promise<void> => {
    try {
      setLoading(true);
      const next = await getAttendancePeriodClosureStatus({
        startDate,
        endDate,
      });
      setStatus(next);
    } catch (error) {
      Alert.alert(
        'No se pudo validar',
        error instanceof Error ? error.message : 'Ocurrió un error.',
      );
    } finally {
      setLoading(false);
    }
  };

  const lockPeriod = async (): Promise<void> => {
    if (lockReason.trim().length < 3) {
      Alert.alert(
        'Motivo requerido',
        'Escribe un motivo de al menos 3 caracteres.',
      );
      return;
    }

    Alert.alert(
      'Bloquear periodo',
      `Se bloqueará ${startDate} a ${endDate}. Después solo podrá reabrirse desde Auditoría.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Bloquear',
          onPress: () =>
            void (async () => {
              try {
                setLoading(true);
                await lockAttendancePeriod({
                  startDate,
                  endDate,
                  reason: lockReason,
                });
                const next =
                  await getAttendancePeriodClosureStatus({
                    startDate,
                    endDate,
                  });
                setStatus(next);
              } catch (error) {
                Alert.alert(
                  'No se pudo bloquear',
                  error instanceof Error
                    ? error.message
                    : 'Ocurrió un error.',
                );
              } finally {
                setLoading(false);
              }
            })(),
        },
      ],
    );
  };

  const createSnapshot = async (): Promise<void> => {
    if (!status?.readyToClose) {
      Alert.alert(
        'Periodo no listo',
        'Corrige primero los puntos pendientes antes de generar el cierre final.',
      );
      return;
    }

    Alert.alert(
      'Generar cierre final',
      'Se guardará una instantánea inmutable de este periodo para consulta y exportación posterior.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Generar',
          onPress: () =>
            void (async () => {
              try {
                setLoading(true);
                const snapshotId =
                  await createAttendancePeriodClosureSnapshot({
                    startDate,
                    endDate,
                  });
                await loadSnapshots();

                const snapshot =
                  await getAttendancePeriodClosureSnapshot(snapshotId);

                Alert.alert(
                  'Cierre generado',
                  'El snapshot quedó guardado. Ahora puedes exportarlo.',
                  [
                    { text: 'Cerrar' },
                    {
                      text: 'Exportar CSV',
                      onPress: () => void exportCsv(snapshot),
                    },
                  ],
                );
              } catch (error) {
                Alert.alert(
                  'No se pudo generar',
                  error instanceof Error
                    ? error.message
                    : 'Ocurrió un error.',
                );
              } finally {
                setLoading(false);
              }
            })(),
        },
      ],
    );
  };

  const openExport = async (
    snapshotId: string,
  ): Promise<void> => {
    try {
      setLoading(true);
      const snapshot =
        await getAttendancePeriodClosureSnapshot(snapshotId);
      await exportCsv(snapshot);
    } catch (error) {
      Alert.alert(
        'No se pudo exportar',
        error instanceof Error ? error.message : 'Ocurrió un error.',
      );
    } finally {
      setLoading(false);
    }
  };

  const checks = status ? readinessItems(status) : [];

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
      <View>
        <Text style={[styles.title, { color: theme.text }]}>
          Cierre administrativo del periodo
        </Text>
        <Text style={[styles.help, { color: theme.textMuted }]}>
          Valida pendientes, bloquea el rango, genera un snapshot inmutable y
          exporta el consolidado administrativo en CSV.
        </Text>
      </View>

      <View style={styles.dateRow}>
        <View style={styles.field}>
          <DateCalendarField label="Desde" value={startDate} maximumDate={endDate} onChange={value => { setStartDate(value); setStatus(null); }} />
        </View>

        <View style={styles.field}>
          <DateCalendarField label="Hasta" value={endDate} minimumDate={startDate} onChange={value => { setEndDate(value); setStatus(null); }} />
        </View>

        <TouchableOpacity
          disabled={loading}
          onPress={() => void validate()}
          style={[
            styles.primaryButton,
            {
              backgroundColor: theme.primary,
              opacity: loading ? 0.55 : 1,
            },
          ]}
        >
          <Text style={{ color: theme.onPrimary, fontWeight: '900' }}>
            VALIDAR PERIODO
          </Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.loading}>
          <ActivityIndicator color={theme.primary} />
        </View>
      ) : null}

      {status ? (
        <>
          <View
            style={[
              styles.statusBox,
              {
                borderColor: status.readyToClose
                  ? theme.primary
                  : theme.border,
                backgroundColor: theme.background,
              },
            ]}
          >
            <Text
              style={{
                color: status.readyToClose
                  ? theme.primary
                  : theme.text,
                fontWeight: '900',
                fontSize: 15,
              }}
            >
              {status.readyToClose
                ? 'PERIODO LISTO PARA CIERRE FINAL'
                : 'HAY PUNTOS PENDIENTES'}
            </Text>

            {checks.map(item => (
              <View
                key={item.label}
                style={[
                  styles.checkRow,
                  { borderColor: theme.border },
                ]}
              >
                <Text
                  style={{
                    color: item.ok ? theme.primary : theme.danger,
                    fontWeight: '900',
                    width: 24,
                  }}
                >
                  {item.ok ? '✓' : '!'}
                </Text>

                <View style={{ flex: 1 }}>
                  <Text style={{ color: theme.text, fontWeight: '800' }}>
                    {item.label}
                  </Text>
                  <Text
                    style={{
                      color: theme.textMuted,
                      marginTop: 2,
                      fontSize: 11,
                    }}
                  >
                    {item.detail}
                  </Text>
                </View>
              </View>
            ))}
          </View>

          {!status.periodLocked && status.periodEnded ? (
            <View
              style={[
                styles.lockBox,
                {
                  borderColor: theme.border,
                  backgroundColor: theme.background,
                },
              ]}
            >
              <Text style={{ color: theme.text, fontWeight: '900' }}>
                Bloqueo operativo
              </Text>

              <TextInput
                value={lockReason}
                onChangeText={setLockReason}
                placeholder="Motivo del bloqueo"
                placeholderTextColor={theme.textMuted}
                style={[
                  styles.input,
                  {
                    color: theme.text,
                    borderColor: theme.border,
                    backgroundColor: theme.surface,
                  },
                ]}
              />

              <TouchableOpacity
                disabled={loading}
                onPress={() => void lockPeriod()}
                style={[
                  styles.secondaryButton,
                  { borderColor: theme.primary },
                ]}
              >
                <Text style={{ color: theme.primary, fontWeight: '900' }}>
                  BLOQUEAR PERIODO
                </Text>
              </TouchableOpacity>
            </View>
          ) : null}

          <TouchableOpacity
            disabled={loading || !status.readyToClose}
            onPress={() => void createSnapshot()}
            style={[
              styles.primaryButton,
              {
                backgroundColor: theme.primary,
                opacity:
                  loading || !status.readyToClose ? 0.45 : 1,
              },
            ]}
          >
            <Text style={{ color: theme.onPrimary, fontWeight: '900' }}>
              GENERAR CIERRE FINAL
            </Text>
          </TouchableOpacity>
        </>
      ) : null}

      <View style={styles.historyHeader}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>
            Cierres guardados
          </Text>
          <Text style={[styles.help, { color: theme.textMuted }]}>
            Los snapshots son inmutables y pueden volver a exportarse.
          </Text>
        </View>

        <TouchableOpacity
          onPress={() => void loadSnapshots()}
          style={[
            styles.secondaryButton,
            { borderColor: theme.border },
          ]}
        >
          <Text style={{ color: theme.text, fontWeight: '800' }}>
            ACTUALIZAR
          </Text>
        </TouchableOpacity>
      </View>

      {snapshots.length === 0 ? (
        <Text style={{ color: theme.textMuted }}>
          Aún no hay cierres administrativos guardados.
        </Text>
      ) : (
        snapshots.map(item => (
          <View
            key={item.id}
            style={[
              styles.snapshotRow,
              { borderColor: theme.border },
            ]}
          >
            <View style={{ flex: 1 }}>
              <Text style={{ color: theme.text, fontWeight: '900' }}>
                {item.startDate} → {item.endDate}
              </Text>
              <Text
                style={{
                  color: theme.textMuted,
                  marginTop: 3,
                  fontSize: 11,
                }}
              >
                {new Date(item.createdAt).toLocaleString('es-MX')} ·{' '}
                {item.createdByName}
              </Text>
            </View>

            <TouchableOpacity
              disabled={loading}
              onPress={() => void openExport(item.id)}
              style={[
                styles.secondaryButton,
                { borderColor: theme.primary },
              ]}
            >
              <Text style={{ color: theme.primary, fontWeight: '900' }}>
                EXPORTAR CSV
              </Text>
            </TouchableOpacity>
          </View>
        ))
      )}

      <Text style={[styles.footer, { color: theme.textMuted }]}>
        El CSV incluye resumen, reporte por empleado, incidencias,
        solicitudes, cambios de turno, alertas de ejecución, nómina y
        auditoría. El snapshot no se modifica aunque después se reabra otro
        periodo o cambien configuraciones futuras.
      </Text>
    </View>
  );
}
