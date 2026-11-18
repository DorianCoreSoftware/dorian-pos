import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import { useBusiness } from '../../../../context/BusinessContext';
import { TimeSelect } from '../../../common/time-select/TimeSelect';
import { AttendanceDailySummaryItem, AttendanceEmployee, EmployeeScheduleDay, getAttendanceEmployees, getEmployeeSchedule, getAttendanceDailySummary, saveEmployeeSchedule } from '../../../../services/attendanceService';


import { styles } from './AdminAttendanceSchedules.styles';
const DAY_NAMES: Record<number, string> = {
  0: 'Domingo',
  1: 'Lunes',
  2: 'Martes',
  3: 'Miércoles',
  4: 'Jueves',
  5: 'Viernes',
  6: 'Sábado',
};

function localDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function formatTime(value: string | null): string {
  if (!value) return '—';
  return new Intl.DateTimeFormat('es-MX', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

function incidentLabel(item: AttendanceDailySummaryItem): string {
  if (item.dayStatus === 'absence_justified') return 'FALTA JUSTIFICADA';
  if (item.dayStatus === 'vacation') return 'VACACIONES';
  if (item.dayStatus === 'medical_leave') return 'INCAPACIDAD';
  if (item.dayStatus === 'permission') return 'PERMISO';
  if (item.dayStatus === 'late_justified') return `RETARDO JUSTIFICADO · ${item.lateMinutes} min`;
  if (item.dayStatus === 'early_leave_justified') return `SALIDA JUSTIFICADA · ${item.earlyLeaveMinutes} min`;
  if (item.dayStatus === 'absent') return 'FALTA';
  if (item.dayStatus === 'pending_entry') return 'ENTRADA PENDIENTE';
  if (item.dayStatus === 'working') return 'TRABAJANDO';
  if (item.lateMinutes > 0 && item.earlyLeaveMinutes > 0) return 'RETARDO + SALIDA ANTICIPADA';
  if (item.lateMinutes > 0) return `RETARDO · ${item.lateMinutes} min`;
  if (item.earlyLeaveMinutes > 0) return `SALIDA ANTICIPADA · ${item.earlyLeaveMinutes} min`;
  if (item.overtimeMinutes > 0) return `HORAS EXTRA · ${item.overtimeMinutes} min`;
  return 'SIN INCIDENCIA';
}

export function AdminAttendanceSchedules() {
  const { width } = useWindowDimensions();
  const compactIncidents = width < 760;
  const { theme } = useBusiness();

  const {
    width: windowWidth,
  } = useWindowDimensions();

  const isPhone =
    windowWidth < 700;
  const [employees, setEmployees] = useState<AttendanceEmployee[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [schedule, setSchedule] = useState<EmployeeScheduleDay[]>([]);
  const [useBusinessSchedule, setUseBusinessSchedule] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [incidents, setIncidents] = useState<AttendanceDailySummaryItem[]>([]);
  const [incidentsLoading, setIncidentsLoading] = useState(false);

  const selectedEmployee = useMemo(
    () => employees.find(item => item.userId === selectedUserId) ?? null,
    [employees, selectedUserId],
  );

  const loadEmployees = useCallback(async () => {
    const rows = await getAttendanceEmployees();
    setEmployees(rows);
    setSelectedUserId(current => current ?? rows.find(item => item.isActive)?.userId ?? rows[0]?.userId ?? null);
  }, []);

  const loadSchedule = useCallback(async (userId: string) => {
    const rows = await getEmployeeSchedule(userId);
    setSchedule(rows);
    setUseBusinessSchedule(rows[0]?.useBusinessSchedule ?? true);
  }, []);

  const loadIncidents = useCallback(async () => {
    try {
      setIncidentsLoading(true);
      const end = new Date();
      const start = new Date();
      start.setDate(end.getDate() - 13);
      const rows = await getAttendanceDailySummary(localDateKey(start), localDateKey(end));
      setIncidents(
        rows.filter(item =>
          item.dayStatus === 'absent' ||
          item.dayStatus === 'absence_justified' ||
          item.dayStatus === 'vacation' ||
          item.dayStatus === 'medical_leave' ||
          item.dayStatus === 'permission' ||
          item.dayStatus === 'late_justified' ||
          item.dayStatus === 'early_leave_justified' ||
          item.dayStatus === 'pending_entry' ||
          item.lateMinutes > 0 ||
          item.earlyLeaveMinutes > 0 ||
          item.overtimeMinutes > 0,
        ),
      );
    } catch (error) {
      console.error('Error cargando incidencias:', error);
    } finally {
      setIncidentsLoading(false);
    }
  }, []);

  useEffect(() => {
    void (async () => {
      try {
        await Promise.all([loadEmployees(), loadIncidents()]);
      } catch (error) {
        Alert.alert('Asistencia', 'No se pudieron cargar los horarios de empleados.');
      } finally {
        setLoading(false);
      }
    })();
  }, [loadEmployees, loadIncidents]);

  useEffect(() => {
    if (!selectedUserId) return;
    void loadSchedule(selectedUserId).catch(error => {
      console.error('Error cargando horario:', error);
      Alert.alert('Horario', 'No se pudo cargar el horario del empleado.');
    });
  }, [selectedUserId, loadSchedule]);

  const updateDay = (dayOfWeek: number, patch: Partial<EmployeeScheduleDay>) => {
    setSchedule(current => current.map(day => day.dayOfWeek === dayOfWeek ? { ...day, ...patch } : day));
  };

  const handleSave = async () => {
    if (!selectedUserId) return;
    try {
      setSaving(true);
      await saveEmployeeSchedule({ userId: selectedUserId, useBusinessSchedule, schedule });
      await Promise.all([loadSchedule(selectedUserId), loadEmployees(), loadIncidents()]);
      Alert.alert('Horario guardado', 'La configuración del empleado se actualizó correctamente.');
    } catch (error) {
      Alert.alert(
        'No se pudo guardar',
        error instanceof Error ? error.message : 'Ocurrió un error guardando el horario.',
      );
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="small" color={theme.primary} />
        <Text style={{ color: theme.textMuted }}>Cargando horarios...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}> 
        <Text style={[styles.title, { color: theme.text }]}>Horarios por empleado</Text>
        <Text style={[styles.subtitle, { color: theme.textMuted }]}> 
          Por defecto cada usuario hereda el horario del negocio. Activa horario personalizado solo cuando su jornada sea distinta.
        </Text>

        <ScrollView horizontal showsHorizontalScrollIndicator contentContainerStyle={styles.employeeRow}>
          {employees.map(employee => {
            const active = employee.userId === selectedUserId;
            return (
              <TouchableOpacity
                key={employee.userId}
                onPress={() => setSelectedUserId(employee.userId)}
                style={[
                  styles.employeeButton,
                  {
                    borderColor: active ? theme.primary : theme.border,
                    backgroundColor: active ? theme.surfaceAlt : theme.background,
                    opacity: employee.isActive ? 1 : 0.55,
                  },
                ]}
              >
                <Text style={{ color: active ? theme.primary : theme.text, fontWeight: '900' }}>{employee.employeeName || 'Sin nombre'}</Text>
                <Text style={{ color: theme.textMuted, fontSize: 11 }}>{employee.employeeRole}{employee.isActive ? '' : ' · inactivo'}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {selectedEmployee ? (
          <>
            <View style={styles.modeRow}>
              <View style={{ flex: 1 }}>
                <Text style={{ color: theme.text, fontWeight: '900' }}>Usar horario del negocio</Text>
                <Text style={{ color: theme.textMuted, fontSize: 12, marginTop: 3 }}>
                  {useBusinessSchedule ? 'El empleado heredará automáticamente apertura, cierre y excepciones.' : 'El empleado usará su jornada semanal personalizada.'}
                </Text>
              </View>
              <Switch
                value={useBusinessSchedule}
                onValueChange={setUseBusinessSchedule}
                trackColor={{ true: theme.primary }}
              />
            </View>

            <View style={{ gap: 8 }}>
              {schedule.map(day => (
                <View
                  key={day.dayOfWeek}
                  style={[
                    styles.dayRow,
                    isPhone
                      ? styles.dayRowPhone
                      : null,
                    {
                      borderColor:
                        theme.border,
                    },
                  ]}
                >
                  {isPhone ? (
                    <>
                      <View
                        style={
                          styles.dayTopRowPhone
                        }
                      >
                        <View
                          style={
                            styles.dayNameWrapPhone
                          }
                        >
                          <Text
                            style={{
                              color:
                                theme.text,
                              fontWeight:
                                '800',
                            }}
                          >
                            {DAY_NAMES[day.dayOfWeek]}
                          </Text>

                          <Text
                            style={{
                              color:
                                theme.textMuted,
                              fontSize:
                                11,
                            }}
                          >
                            {day.isWorking
                              ? 'Trabaja'
                              : 'Descanso'}
                          </Text>
                        </View>

                        <Switch
                          disabled={
                            useBusinessSchedule
                          }
                          value={
                            day.isWorking
                          }
                          onValueChange={value =>
                            updateDay(
                              day.dayOfWeek,
                              {
                                isWorking:
                                  value,
                              },
                            )
                          }
                          trackColor={{
                            false:
                              useBusinessSchedule
                                ? '#4A4A4A'
                                : '#5A5A5A',

                            true:
                              useBusinessSchedule
                                ? '#4A4A4A'
                                : theme.primary,
                          }}
                        />
                      </View>

                      <View
                        style={
                          styles.timeRowPhone
                        }
                      >
                        <View
                          style={
                            styles.timeFieldPhone
                          }
                        >
                          <Text
                            style={[
                              styles.timeLabel,
                              {
                                color:
                                  theme.textMuted,
                              },
                            ]}
                          >
                            Entrada
                          </Text>

                          <TimeSelect
                            disabled={
                              useBusinessSchedule ||
                              !day.isWorking
                            }
                            value={
                              day.startTime
                            }
                            onChange={value =>
                              updateDay(
                                day.dayOfWeek,
                                {
                                  startTime:
                                    value,
                                },
                              )
                            }
                          />
                        </View>

                        <View
                          style={
                            styles.timeSeparatorPhone
                          }
                        >
                          <Text
                            style={{
                              color:
                                theme.textMuted,
                            }}
                          >
                            a
                          </Text>
                        </View>

                        <View
                          style={
                            styles.timeFieldPhone
                          }
                        >
                          <Text
                            style={[
                              styles.timeLabel,
                              {
                                color:
                                  theme.textMuted,
                              },
                            ]}
                          >
                            Salida
                          </Text>

                          <TimeSelect
                            disabled={
                              useBusinessSchedule ||
                              !day.isWorking
                            }
                            value={
                              day.endTime
                            }
                            onChange={value =>
                              updateDay(
                                day.dayOfWeek,
                                {
                                  endTime:
                                    value,
                                },
                              )
                            }
                          />
                        </View>
                      </View>
                    </>
                  ) : (
                    <>
                      <View
                        style={
                          styles.dayNameWrap
                        }
                      >
                        <Text
                          style={{
                            color:
                              theme.text,
                            fontWeight:
                              '800',
                          }}
                        >
                          {DAY_NAMES[day.dayOfWeek]}
                        </Text>

                        <Text
                          style={{
                            color:
                              theme.textMuted,
                            fontSize:
                              11,
                          }}
                        >
                          {day.isWorking
                            ? 'Trabaja'
                            : 'Descanso'}
                        </Text>
                      </View>

                      <Switch
                        disabled={
                          useBusinessSchedule
                        }
                        value={
                          day.isWorking
                        }
                        onValueChange={value =>
                          updateDay(
                            day.dayOfWeek,
                            {
                              isWorking:
                                value,
                            },
                          )
                        }
                        trackColor={{
                          false:
                            useBusinessSchedule
                              ? '#4A4A4A'
                              : '#5A5A5A',

                          true:
                            useBusinessSchedule
                              ? '#4A4A4A'
                              : theme.primary,
                        }}
                      />

                      <View
                        style={
                          styles.timeSelector
                        }
                      >
                        <TimeSelect
                          disabled={
                            useBusinessSchedule ||
                            !day.isWorking
                          }
                          value={
                            day.startTime
                          }
                          onChange={value =>
                            updateDay(
                              day.dayOfWeek,
                              {
                                startTime:
                                  value,
                              },
                            )
                          }
                        />
                      </View>

                      <Text
                        style={{
                          color:
                            theme.textMuted,
                        }}
                      >
                        a
                      </Text>

                      <View
                        style={
                          styles.timeSelector
                        }
                      >
                        <TimeSelect
                          disabled={
                            useBusinessSchedule ||
                            !day.isWorking
                          }
                          value={
                            day.endTime
                          }
                          onChange={value =>
                            updateDay(
                              day.dayOfWeek,
                              {
                                endTime:
                                  value,
                              },
                            )
                          }
                        />
                      </View>
                    </>
                  )}
                </View>
              ))}
            </View>

            <TouchableOpacity
              disabled={saving}
              onPress={() => void handleSave()}
              style={[styles.saveButton, { backgroundColor: theme.primary, opacity: saving ? 0.55 : 1 }]}
            >
              <Text style={{ color: theme.onPrimary, fontWeight: '900' }}>{saving ? 'GUARDANDO...' : 'GUARDAR HORARIO DEL EMPLEADO'}</Text>
            </TouchableOpacity>
          </>
        ) : null}
      </View>

      <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}> 
        <View style={styles.incidentHeader}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.title, { color: theme.text }]}>Incidencias recientes</Text>
            <Text style={[styles.subtitle, { color: theme.textMuted }]}>Últimos 14 días: faltas, retardos, salidas anticipadas y horas extra.</Text>
          </View>
          <TouchableOpacity onPress={() => void loadIncidents()} style={[styles.refreshButton, { borderColor: theme.border }]}> 
            <Text style={{ color: theme.text, fontWeight: '800' }}>ACTUALIZAR</Text>
          </TouchableOpacity>
        </View>

        {incidentsLoading ? (
          <ActivityIndicator size="small" color={theme.primary} />
        ) : incidents.length === 0 ? (
          <Text style={{ color: theme.textMuted }}>No hay incidencias en el periodo.</Text>
        ) : (
          incidents.slice(0, 80).map((item, index) => (
            <View
              key={`${item.workDate}-${item.userId}-${index}`}
              style={[
                styles.incidentRow,
                compactIncidents && styles.incidentRowCompact,
                { borderColor: theme.border },
              ]}
            >
              <View style={compactIncidents ? styles.incidentEmployeeCompact : styles.incidentEmployee}>
                <Text numberOfLines={1} style={{ color: theme.text, fontWeight: '900' }}>{item.employeeName}</Text>
                <Text numberOfLines={1} style={{ color: theme.textMuted, fontSize: 12 }}>{item.workDate} · {item.employeeRole}</Text>
              </View>
              <View style={compactIncidents ? styles.incidentTimeCompact : styles.incidentTime}>
                <Text style={{ color: theme.textMuted, fontSize: 11 }}>ESPERADO</Text>
                <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.78} style={{ color: theme.text }}>
                  {formatTime(item.expectedStart)} – {formatTime(item.expectedEnd)}
                </Text>
              </View>
              <View style={compactIncidents ? styles.incidentTimeCompact : styles.incidentTime}>
                <Text style={{ color: theme.textMuted, fontSize: 11 }}>REGISTRADO</Text>
                <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.78} style={{ color: theme.text }}>
                  {formatTime(item.clockIn)} – {formatTime(item.clockOut)}
                </Text>
              </View>
              <View style={compactIncidents ? styles.incidentStatusCompact : styles.incidentStatus}>
                <Text numberOfLines={2} style={{ color: item.dayStatus === 'absent' ? theme.danger : theme.primary, fontWeight: '900' }}>{incidentLabel(item)}</Text>
              </View>
            </View>
          ))
        )}
      </View>
    </View>
  );
}
