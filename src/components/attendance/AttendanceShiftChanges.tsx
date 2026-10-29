import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';

import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import {
  AttendanceCoverageAvailabilityDay,
  AttendanceShiftChangeRequest,
  AttendanceShiftChangeType,
  MyPublishedShift,
  cancelMyShiftChangeRequest,
  createMyShiftChangeRequest,
  getAvailableShiftCoverageRequests,
  getMyCoverageAvailability,
  getMyPublishedAttendanceSchedule,
  getMyShiftChangeRequests,
  offerShiftCoverage,
  saveMyCoverageAvailability,
} from '../../services/attendanceService';

import { useBusiness } from '../../context/BusinessContext';

const DAY_NAMES = [
  'Domingo',
  'Lunes',
  'Martes',
  'Miércoles',
  'Jueves',
  'Viernes',
  'Sábado',
];

const DEFAULT_AVAILABILITY: AttendanceCoverageAvailabilityDay[] =
  DAY_NAMES.map((_, dayOfWeek) => ({
    dayOfWeek,
    isAvailable: false,
    startTime: '08:00',
    endTime: '23:00',
  }));

function typeLabel(type: AttendanceShiftChangeType): string {
  if (type === 'change') return 'Cambio de horario';
  if (type === 'release') return 'Liberar / cubrir';
  return 'Intercambio';
}

function statusLabel(status: string): string {
  if (status === 'approved') return 'APROBADA';
  if (status === 'rejected') return 'RECHAZADA';
  if (status === 'cancelled') return 'CANCELADA';
  return 'ABIERTA';
}

function dateLabel(value: string): string {
  const [y, m, d] = value.split('-').map(Number);
  return new Intl.DateTimeFormat('es-MX', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
  }).format(new Date(y, (m ?? 1) - 1, d ?? 1, 12));
}

export function AttendanceShiftChanges() {
  const { theme } = useBusiness();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [published, setPublished] = useState<MyPublishedShift[]>([]);
  const [mine, setMine] = useState<AttendanceShiftChangeRequest[]>([]);
  const [market, setMarket] = useState<AttendanceShiftChangeRequest[]>([]);
  const [availability, setAvailability] =
    useState<AttendanceCoverageAvailabilityDay[]>(DEFAULT_AVAILABILITY);

  const [selectedShift, setSelectedShift] =
    useState<MyPublishedShift | null>(null);
  const [requestType, setRequestType] =
    useState<AttendanceShiftChangeType>('release');
  const [reason, setReason] = useState('');
  const [desiredStart, setDesiredStart] = useState('');
  const [desiredEnd, setDesiredEnd] = useState('');

  const [swapRequestId, setSwapRequestId] = useState<string | null>(null);
  const [swapShiftId, setSwapShiftId] = useState<string | null>(null);

  const load = useCallback(async (): Promise<void> => {
    const [schedule, requests, marketplace, availabilityRows] =
      await Promise.all([
        getMyPublishedAttendanceSchedule(90),
        getMyShiftChangeRequests(),
        getAvailableShiftCoverageRequests(),
        getMyCoverageAvailability(),
      ]);

    setPublished(schedule);
    setMine(requests);
    setMarket(marketplace);

    const byDay = new Map(
      availabilityRows.map(item => [item.dayOfWeek, item]),
    );
    setAvailability(
      DEFAULT_AVAILABILITY.map(item => byDay.get(item.dayOfWeek) ?? item),
    );
  }, []);

  useEffect(() => {
    void (async () => {
      try {
        await load();
      } catch (error) {
        console.error('Error cargando cambios de turno:', error);
      } finally {
        setLoading(false);
      }
    })();
  }, [load]);

  const futureShifts = useMemo(
    () =>
      [...published]
        .filter(item => item.workDate >= new Date().toISOString().slice(0, 10))
        .sort((a, b) =>
          a.workDate.localeCompare(b.workDate) ||
          a.startTime.localeCompare(b.startTime),
        ),
    [published],
  );

  const submit = async (): Promise<void> => {
    if (!selectedShift) {
      Alert.alert('Turno requerido', 'Selecciona el turno que quieres modificar.');
      return;
    }
    if (reason.trim().length < 3) {
      Alert.alert('Motivo requerido', 'Explica brevemente el motivo.');
      return;
    }
    if (requestType === 'change') {
      if (
        !/^\d{2}:\d{2}$/.test(desiredStart) ||
        !/^\d{2}:\d{2}$/.test(desiredEnd) ||
        desiredStart === desiredEnd
      ) {
        Alert.alert('Horario inválido', 'Usa HH:mm y una entrada/salida diferentes.');
        return;
      }
    }

    try {
      setSaving(true);
      await createMyShiftChangeRequest({
        publicationItemId:
          // publication item ID is the stable row represented by publicationId+date
          // Fase 17 service receives it from the extended RPC field below.
          (selectedShift as any).publicationItemId,
        requestType,
        reason,
        desiredStartTime:
          requestType === 'change' ? desiredStart : null,
        desiredEndTime:
          requestType === 'change' ? desiredEnd : null,
      });

      setSelectedShift(null);
      setReason('');
      setDesiredStart('');
      setDesiredEnd('');
      await load();

      Alert.alert(
        'Solicitud enviada',
        requestType === 'change'
          ? 'Administración revisará el cambio solicitado.'
          : 'La solicitud ya está visible para posibles coberturas.',
      );
    } catch (error) {
      Alert.alert(
        'No se pudo enviar',
        error instanceof Error ? error.message : 'Ocurrió un error.',
      );
    } finally {
      setSaving(false);
    }
  };

  const saveAvailability = async (): Promise<void> => {
    try {
      setSaving(true);
      await saveMyCoverageAvailability(availability);
      Alert.alert(
        'Disponibilidad guardada',
        'Se usará para validar coberturas e intercambios.',
      );
    } catch (error) {
      Alert.alert(
        'No se pudo guardar',
        error instanceof Error ? error.message : 'Ocurrió un error.',
      );
    } finally {
      setSaving(false);
    }
  };

  const offer = async (
    request: AttendanceShiftChangeRequest,
  ): Promise<void> => {
    if (
      request.requestType === 'swap' &&
      swapRequestId === request.id &&
      !swapShiftId
    ) {
      Alert.alert(
        'Selecciona tu turno',
        'Elige cuál de tus turnos quieres ofrecer a cambio.',
      );
      return;
    }

    if (
      request.requestType === 'swap' &&
      swapRequestId !== request.id
    ) {
      setSwapRequestId(request.id);
      setSwapShiftId(null);
      return;
    }

    try {
      setSaving(true);
      await offerShiftCoverage({
        requestId: request.id,
        offeredPublicationItemId:
          request.requestType === 'swap'
            ? swapShiftId
            : null,
      });
      setSwapRequestId(null);
      setSwapShiftId(null);
      await load();
      Alert.alert(
        'Propuesta enviada',
        'Administración tendrá la decisión final.',
      );
    } catch (error) {
      Alert.alert(
        'No se pudo ofrecer',
        error instanceof Error ? error.message : 'Ocurrió un error.',
      );
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={theme.primary} />
        <Text style={{ color: theme.textMuted, marginTop: 8 }}>
          Cargando cambios y coberturas...
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <View
        style={[
          styles.card,
          {
            backgroundColor: theme.surface,
            borderColor: theme.border,
          },
        ]}
      >
        <Text style={[styles.title, { color: theme.text }]}>
          Disponibilidad para coberturas
        </Text>
        <Text style={[styles.help, { color: theme.textMuted }]}>
          Solo podrás tomar turnos dentro de estas ventanas. Esto no cambia
          tu horario normal.
        </Text>

        {availability.map(day => (
          <View
            key={day.dayOfWeek}
            style={[styles.availabilityRow, { borderColor: theme.border }]}
          >
            <Text style={[styles.dayName, { color: theme.text }]}>
              {DAY_NAMES[day.dayOfWeek]}
            </Text>
            <Switch
              value={day.isAvailable}
              onValueChange={value =>
                setAvailability(current =>
                  current.map(item =>
                    item.dayOfWeek === day.dayOfWeek
                      ? { ...item, isAvailable: value }
                      : item,
                  ),
                )
              }
            />
            <TextInput
              editable={day.isAvailable}
              value={day.startTime}
              onChangeText={value =>
                setAvailability(current =>
                  current.map(item =>
                    item.dayOfWeek === day.dayOfWeek
                      ? { ...item, startTime: value }
                      : item,
                  ),
                )
              }
              style={[
                styles.timeInput,
                {
                  color: theme.text,
                  borderColor: theme.border,
                  backgroundColor: theme.background,
                  opacity: day.isAvailable ? 1 : 0.45,
                },
              ]}
            />
            <Text style={{ color: theme.textMuted }}>a</Text>
            <TextInput
              editable={day.isAvailable}
              value={day.endTime}
              onChangeText={value =>
                setAvailability(current =>
                  current.map(item =>
                    item.dayOfWeek === day.dayOfWeek
                      ? { ...item, endTime: value }
                      : item,
                  ),
                )
              }
              style={[
                styles.timeInput,
                {
                  color: theme.text,
                  borderColor: theme.border,
                  backgroundColor: theme.background,
                  opacity: day.isAvailable ? 1 : 0.45,
                },
              ]}
            />
          </View>
        ))}

        <TouchableOpacity
          disabled={saving}
          onPress={() => void saveAvailability()}
          style={[styles.primary, { backgroundColor: theme.primary }]}
        >
          <Text style={{ color: theme.onPrimary, fontWeight: '900' }}>
            GUARDAR DISPONIBILIDAD
          </Text>
        </TouchableOpacity>
      </View>

      <View
        style={[
          styles.card,
          {
            backgroundColor: theme.surface,
            borderColor: theme.border,
          },
        ]}
      >
        <Text style={[styles.title, { color: theme.text }]}>
          Solicitar cambio de mi turno
        </Text>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chips}
        >
          {futureShifts.map(item => {
            const itemId = (item as any).publicationItemId as string;
            const active =
              selectedShift &&
              (selectedShift as any).publicationItemId === itemId;

            return (
              <TouchableOpacity
                key={itemId}
                onPress={() => {
                  setSelectedShift(item);
                  setDesiredStart(item.startTime);
                  setDesiredEnd(item.endTime);
                }}
                style={[
                  styles.chip,
                  {
                    borderColor: active ? theme.primary : theme.border,
                    backgroundColor: active
                      ? theme.surfaceAlt
                      : theme.background,
                  },
                ]}
              >
                <Text
                  style={{
                    color: active ? theme.primary : theme.text,
                    fontWeight: '800',
                  }}
                >
                  {dateLabel(item.workDate)} · {item.startTime}-{item.endTime}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        <View style={styles.chips}>
          {(
            [
              ['release', 'LIBERAR / CUBRIR'],
              ['swap', 'INTERCAMBIAR'],
              ['change', 'CAMBIAR HORARIO'],
            ] as Array<[AttendanceShiftChangeType, string]>
          ).map(([key, label]) => (
            <TouchableOpacity
              key={key}
              onPress={() => setRequestType(key)}
              style={[
                styles.chip,
                {
                  borderColor:
                    requestType === key ? theme.primary : theme.border,
                },
              ]}
            >
              <Text
                style={{
                  color:
                    requestType === key
                      ? theme.primary
                      : theme.textMuted,
                  fontWeight: '900',
                }}
              >
                {label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {requestType === 'change' ? (
          <View style={styles.timeRow}>
            <TextInput
              value={desiredStart}
              onChangeText={setDesiredStart}
              placeholder="Entrada HH:mm"
              placeholderTextColor={theme.textMuted}
              style={[
                styles.input,
                {
                  color: theme.text,
                  borderColor: theme.border,
                  backgroundColor: theme.background,
                },
              ]}
            />
            <TextInput
              value={desiredEnd}
              onChangeText={setDesiredEnd}
              placeholder="Salida HH:mm"
              placeholderTextColor={theme.textMuted}
              style={[
                styles.input,
                {
                  color: theme.text,
                  borderColor: theme.border,
                  backgroundColor: theme.background,
                },
              ]}
            />
          </View>
        ) : null}

        <TextInput
          value={reason}
          onChangeText={setReason}
          multiline
          placeholder="Motivo"
          placeholderTextColor={theme.textMuted}
          style={[
            styles.input,
            styles.reason,
            {
              color: theme.text,
              borderColor: theme.border,
              backgroundColor: theme.background,
            },
          ]}
        />

        <TouchableOpacity
          disabled={saving || !selectedShift}
          onPress={() => void submit()}
          style={[
            styles.primary,
            {
              backgroundColor: theme.primary,
              opacity: saving || !selectedShift ? 0.5 : 1,
            },
          ]}
        >
          <Text style={{ color: theme.onPrimary, fontWeight: '900' }}>
            ENVIAR SOLICITUD
          </Text>
        </TouchableOpacity>

        <Text style={[styles.subtitle, { color: theme.text }]}>
          Mis solicitudes
        </Text>

        {mine.length === 0 ? (
          <Text style={{ color: theme.textMuted }}>
            No tienes solicitudes de turno.
          </Text>
        ) : (
          mine.map(item => (
            <View
              key={item.id}
              style={[styles.requestRow, { borderColor: theme.border }]}
            >
              <View style={{ flex: 1 }}>
                <Text style={{ color: theme.text, fontWeight: '900' }}>
                  {typeLabel(item.requestType)} · {dateLabel(item.workDate)}
                </Text>
                <Text style={{ color: theme.textMuted, marginTop: 3 }}>
                  {item.startTime}-{item.endTime}
                  {item.desiredStartTime
                    ? ` → ${item.desiredStartTime}-${item.desiredEndTime}`
                    : ''}
                </Text>
                <Text style={{ color: theme.textMuted, marginTop: 3 }}>
                  {item.reason}
                </Text>
                {item.offersCount > 0 ? (
                  <Text style={{ color: theme.primary, marginTop: 3 }}>
                    {item.offersCount} propuesta(s) de compañero(s)
                  </Text>
                ) : null}
                {item.adminNote ? (
                  <Text style={{ color: theme.textMuted, marginTop: 3 }}>
                    Admin: {item.adminNote}
                  </Text>
                ) : null}
              </View>

              <View style={{ alignItems: 'flex-end', gap: 8 }}>
                <Text
                  style={{
                    color:
                      item.status === 'approved'
                        ? theme.primary
                        : item.status === 'rejected'
                          ? theme.danger
                          : theme.textMuted,
                    fontWeight: '900',
                  }}
                >
                  {statusLabel(item.status)}
                </Text>

                {item.status === 'open' ? (
                  <TouchableOpacity
                    onPress={() =>
                      void (async () => {
                        try {
                          await cancelMyShiftChangeRequest(item.id);
                          await load();
                        } catch (error) {
                          Alert.alert(
                            'No se pudo cancelar',
                            error instanceof Error
                              ? error.message
                              : 'Ocurrió un error.',
                          );
                        }
                      })()
                    }
                  >
                    <Text style={{ color: theme.danger, fontWeight: '800' }}>
                      CANCELAR
                    </Text>
                  </TouchableOpacity>
                ) : null}
              </View>
            </View>
          ))
        )}
      </View>

      <View
        style={[
          styles.card,
          {
            backgroundColor: theme.surface,
            borderColor: theme.border,
          },
        ]}
      >
        <Text style={[styles.title, { color: theme.text }]}>
          Turnos que necesitan cobertura
        </Text>
        <Text style={[styles.help, { color: theme.textMuted }]}>
          Solo se mostrarán propuestas abiertas de otros empleados.
          Administración debe aprobar cualquier cambio.
        </Text>

        {market.length === 0 ? (
          <Text style={{ color: theme.textMuted }}>
            No hay turnos abiertos para cobertura o intercambio.
          </Text>
        ) : (
          market.map(item => (
            <View
              key={item.id}
              style={[styles.marketRow, { borderColor: theme.border }]}
            >
              <View style={{ flex: 1 }}>
                <Text style={{ color: theme.text, fontWeight: '900' }}>
                  {item.requesterName} · {dateLabel(item.workDate)}
                </Text>
                <Text style={{ color: theme.textMuted, marginTop: 3 }}>
                  {item.startTime}-{item.endTime} · {typeLabel(item.requestType)}
                </Text>
                <Text style={{ color: theme.textMuted, marginTop: 3 }}>
                  {item.reason}
                </Text>
              </View>

              {item.requestType === 'swap' &&
              swapRequestId === item.id ? (
                <View style={styles.swapPicker}>
                  <Text style={{ color: theme.textMuted, fontSize: 11 }}>
                    Ofrece uno de tus turnos:
                  </Text>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.chips}
                  >
                    {futureShifts.map(shift => {
                      const id = (shift as any).publicationItemId as string;
                      return (
                        <TouchableOpacity
                          key={id}
                          onPress={() => setSwapShiftId(id)}
                          style={[
                            styles.chip,
                            {
                              borderColor:
                                swapShiftId === id
                                  ? theme.primary
                                  : theme.border,
                            },
                          ]}
                        >
                          <Text
                            style={{
                              color:
                                swapShiftId === id
                                  ? theme.primary
                                  : theme.text,
                              fontWeight: '800',
                            }}
                          >
                            {dateLabel(shift.workDate)} · {shift.startTime}-{shift.endTime}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                </View>
              ) : null}

              <TouchableOpacity
                disabled={saving}
                onPress={() => void offer(item)}
                style={[
                  styles.secondary,
                  { borderColor: theme.primary },
                ]}
              >
                <Text style={{ color: theme.primary, fontWeight: '900' }}>
                  {item.requestType === 'swap'
                    ? swapRequestId === item.id
                      ? 'ENVIAR INTERCAMBIO'
                      : 'PROPONER INTERCAMBIO'
                    : 'OFRECERME A CUBRIR'}
                </Text>
              </TouchableOpacity>
            </View>
          ))
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: 14 },
  center: {
    minHeight: 180,
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 16,
    gap: 10,
  },
  title: { fontSize: 17, fontWeight: '900' },
  subtitle: { marginTop: 8, fontSize: 15, fontWeight: '900' },
  help: { fontSize: 11, lineHeight: 17 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 11,
    paddingVertical: 8,
  },
  availabilityRow: {
    minHeight: 48,
    borderTopWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingTop: 7,
  },
  dayName: { width: 90, fontWeight: '800' },
  timeInput: {
    width: 72,
    minHeight: 38,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 8,
    textAlign: 'center',
  },
  timeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  input: {
    minHeight: 44,
    borderWidth: 1,
    borderRadius: 9,
    paddingHorizontal: 11,
    paddingVertical: 9,
    flexGrow: 1,
    minWidth: 150,
  },
  reason: { minHeight: 76, textAlignVertical: 'top' },
  primary: {
    alignSelf: 'flex-start',
    minHeight: 42,
    borderRadius: 9,
    paddingHorizontal: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondary: {
    minHeight: 38,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  requestRow: {
    borderTopWidth: 1,
    paddingTop: 10,
    flexDirection: 'row',
    gap: 10,
  },
  marketRow: {
    borderTopWidth: 1,
    paddingTop: 11,
    gap: 8,
  },
  swapPicker: { gap: 6 },
});
