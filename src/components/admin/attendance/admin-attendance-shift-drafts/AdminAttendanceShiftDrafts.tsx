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
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useBusiness } from '../../../../context/BusinessContext';
import { TimeSelect } from '../../../common/time-select/TimeSelect';
import { AttendanceEmployee, EmployeeScheduleDay, AttendanceShiftDraftSettings, AttendanceSalesHourlyProfile, AttendanceSalesPlanningSettings, AttendanceShiftDraft, AttendanceShiftDraftItem, AttendanceShiftPublicationStatus, getAttendanceShiftDraftSettings, getAttendanceSalesPlanningSettings, getAttendanceEmployees, getAttendanceShiftDrafts, getEmployeeSchedule, getAttendanceSalesHourlyProfile, createAttendanceShiftDraft, getAttendanceShiftDraftItems, getAttendanceShiftPublicationStatus, updateApprovedAttendanceShiftItem, updateAttendanceShiftDraftItem, approveAttendanceShiftDraft, publishAttendanceShiftPlan, discardAttendanceShiftDraft, saveAttendanceShiftDraftSettings } from '../../../../services/attendanceService';

import { styles } from './AdminAttendanceShiftDrafts.styles';




import type { EmployeePlan, GeneratedShift } from './AdminAttendanceShiftDrafts.types';
const DEFAULT_DRAFT_SETTINGS: AttendanceShiftDraftSettings = {
  maxWeeklyHours: 48,
  maxDailyHours: 10,
  minimumShiftHours: 4,
  maximumShiftHours: 10,
};

const DAY_NAMES = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

function localDate(date: Date): string {
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function nextMonday(): Date {
  const date = new Date();
  date.setHours(12, 0, 0, 0);
  const day = date.getDay();
  const days = day === 0 ? 1 : 8 - day;
  date.setDate(date.getDate() + days);
  return date;
}

function dateAdd(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function minutes(value: string): number {
  const [h, m] = value.slice(0, 5).split(':').map(Number);
  return (Number.isFinite(h) ? h : 0) * 60 + (Number.isFinite(m) ? m : 0);
}

function hhmm(totalMinutes: number): string {
  const normalized = ((totalMinutes % 1440) + 1440) % 1440;
  const h = Math.floor(normalized / 60);
  const m = normalized % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function shiftMinutes(start: string, end: string): number {
  const s = minutes(start);
  const e = minutes(end);
  return e > s ? e - s : 1440 - s + e;
}

function scheduleForDay(
  plan: EmployeePlan,
  dayOfWeek: number,
): EmployeeScheduleDay | null {
  return plan.schedule.find(item => item.dayOfWeek === dayOfWeek) ?? null;
}

function hourInsideSchedule(
  schedule: EmployeeScheduleDay,
  hour: number,
): boolean {
  if (!schedule.isWorking) return false;
  const point = hour * 60 + 30;
  const start = minutes(schedule.startTime);
  const end = minutes(schedule.endTime);
  if (end > start) return point >= start && point < end;
  return point >= start || point < end;
}

function recommendedStaff(
  profile: AttendanceSalesHourlyProfile,
  settings: AttendanceSalesPlanningSettings,
): number {
  const hasDemand = profile.averageOrders > 0.05 || profile.averageRevenue > 1;
  if (!hasDemand) return 0;
  return Math.max(
    settings.minimumStaffPerHour,
    Math.ceil(profile.averageOrders / Math.max(0.1, settings.ordersPerStaffHour)),
    Math.ceil(profile.averageRevenue / Math.max(1, settings.revenuePerStaffHour)),
  );
}

function statusLabel(status: AttendanceShiftDraft['status']): string {
  if (status === 'approved') return 'APROBADO';
  if (status === 'discarded') return 'DESCARTADO';
  return 'BORRADOR';
}

export function AdminAttendanceShiftDrafts() {
  const { theme } = useBusiness();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [draftSettings, setDraftSettings] =
    useState<AttendanceShiftDraftSettings>(DEFAULT_DRAFT_SETTINGS);
  const [salesSettings, setSalesSettings] =
    useState<AttendanceSalesPlanningSettings | null>(null);
  const [profile, setProfile] = useState<AttendanceSalesHourlyProfile[]>([]);
  const [plans, setPlans] = useState<EmployeePlan[]>([]);
  const [drafts, setDrafts] = useState<AttendanceShiftDraft[]>([]);
  const [generated, setGenerated] = useState<GeneratedShift[]>([]);
  const [selectedDraft, setSelectedDraft] = useState<AttendanceShiftDraft | null>(null);
  const [selectedItems, setSelectedItems] = useState<AttendanceShiftDraftItem[]>([]);
  const [publicationStatus, setPublicationStatus] =
    useState<AttendanceShiftPublicationStatus | null>(null);
  const [editingItem, setEditingItem] = useState<AttendanceShiftDraftItem | null>(null);
  const [editStart, setEditStart] = useState('');
  const [editEnd, setEditEnd] = useState('');
  const [notes, setNotes] = useState('');

  const weekStart = useMemo(() => nextMonday(), []);
  const weekStartText = localDate(weekStart);
  const weekEndText = localDate(dateAdd(weekStart, 6));

  const load = useCallback(async (): Promise<void> => {
    try {
      setLoading(true);
      const [draftCfg, salesCfg, employees, draftList] = await Promise.all([
        getAttendanceShiftDraftSettings(),
        getAttendanceSalesPlanningSettings(),
        getAttendanceEmployees(),
        getAttendanceShiftDrafts(),
      ]);

      const active = employees.filter(item => item.isActive);
      const employeePlans = await Promise.all(
        active.map(async employee => ({
          employee,
          schedule: await getEmployeeSchedule(employee.userId),
        })),
      );

      const historyEnd = new Date();
      historyEnd.setHours(12, 0, 0, 0);
      const historyStart = new Date(historyEnd);
      historyStart.setDate(
        historyEnd.getDate() - Math.max(14, salesCfg.historyDays) + 1,
      );

      const salesProfile = await getAttendanceSalesHourlyProfile({
        startDate: localDate(historyStart),
        endDate: localDate(historyEnd),
      });

      setDraftSettings(draftCfg);
      setSalesSettings(salesCfg);
      setPlans(employeePlans);
      setProfile(salesProfile);
      setDrafts(draftList);
    } catch (error) {
      console.error('Error cargando borradores inteligentes:', error);
      Alert.alert(
        'Borradores de turnos',
        error instanceof Error ? error.message : 'No se pudo cargar la información.',
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const profileMap = useMemo(() => {
    const map = new Map<string, AttendanceSalesHourlyProfile>();
    for (const item of profile) {
      map.set(`${item.dayOfWeek}-${item.hourOfDay}`, item);
    }
    return map;
  }, [profile]);

  const generate = (): void => {
    if (!salesSettings) return;

    const weeklyMinutes = new Map<string, number>();
    const dailyMinutes = new Map<string, number>();
    const assignments = new Map<string, Set<number>>();
    let uncovered = 0;

    for (let offset = 0; offset < 7; offset += 1) {
      const date = dateAdd(weekStart, offset);
      const dateText = localDate(date);
      const dow = date.getDay();

      for (let hour = 0; hour < 24; hour += 1) {
        const p = profileMap.get(`${dow}-${hour}`);
        if (!p) continue;
        const required = recommendedStaff(p, salesSettings);
        if (required <= 0) continue;

        const candidates = plans
          .filter(plan => {
            const day = scheduleForDay(plan, dow);
            if (!day || !hourInsideSchedule(day, hour)) return false;
            const weekly = weeklyMinutes.get(plan.employee.userId) ?? 0;
            const daily = dailyMinutes.get(`${plan.employee.userId}-${dateText}`) ?? 0;
            return weekly + 60 <= draftSettings.maxWeeklyHours * 60 &&
              daily + 60 <= draftSettings.maxDailyHours * 60;
          })
          .sort((a, b) => {
            const aw = weeklyMinutes.get(a.employee.userId) ?? 0;
            const bw = weeklyMinutes.get(b.employee.userId) ?? 0;
            if (aw !== bw) return aw - bw;
            const ad = dailyMinutes.get(`${a.employee.userId}-${dateText}`) ?? 0;
            const bd = dailyMinutes.get(`${b.employee.userId}-${dateText}`) ?? 0;
            return ad - bd;
          });

        const chosen = candidates.slice(0, required);
        uncovered += Math.max(0, required - chosen.length);

        for (const plan of chosen) {
          const key = `${plan.employee.userId}-${dateText}`;
          const set = assignments.get(key) ?? new Set<number>();
          set.add(hour);
          assignments.set(key, set);
          weeklyMinutes.set(
            plan.employee.userId,
            (weeklyMinutes.get(plan.employee.userId) ?? 0) + 60,
          );
          dailyMinutes.set(
            key,
            (dailyMinutes.get(key) ?? 0) + 60,
          );
        }
      }
    }

    const shifts: GeneratedShift[] = [];
    for (const [key, hours] of assignments.entries()) {
      const splitAt = key.lastIndexOf('-');
      const dateText = key.slice(splitAt - 7);
      const userId = key.slice(0, splitAt - 7);
      const plan = plans.find(item => item.employee.userId === userId);
      if (!plan) continue;

      const sorted = [...hours].sort((a, b) => a - b);
      const minHour = sorted[0];
      const maxHour = sorted[sorted.length - 1] + 1;
      const dow = new Date(`${dateText}T12:00:00`).getDay();
      const availability = scheduleForDay(plan, dow);
      if (!availability) continue;

      let start = minHour * 60;
      let end = maxHour * 60;
      let duration = end - start;

      const minMinutes = draftSettings.minimumShiftHours * 60;
      const maxMinutes = Math.min(
        draftSettings.maximumShiftHours,
        draftSettings.maxDailyHours,
      ) * 60;

      const availableStart = minutes(availability.startTime);
      let availableEnd = minutes(availability.endTime);
      if (availableEnd <= availableStart) availableEnd += 1440;
      if (end <= start) end += 1440;
      while (start < availableStart) start += 1440;
      while (end < start) end += 1440;

      if (duration < minMinutes) {
        const missing = minMinutes - duration;
        const left = Math.min(missing, Math.max(0, start - availableStart));
        start -= left;
        end = Math.min(availableEnd, end + (missing - left));
      }

      if (end - start > maxMinutes) {
        end = start + maxMinutes;
      }

      duration = Math.max(60, end - start);
      const demandCovered = sorted.length;

      shifts.push({
        userId,
        employeeName: plan.employee.employeeName,
        workDate: dateText,
        startTime: hhmm(start),
        endTime: hhmm(start + duration),
        demandHoursCovered: demandCovered,
        rationale: `Cubre ${demandCovered} hora(s) de demanda estimada. Carga semanal proyectada: ${((weeklyMinutes.get(userId) ?? 0) / 60).toFixed(1)} h.`,
      });
    }

    shifts.sort((a, b) =>
      a.workDate.localeCompare(b.workDate) ||
      a.startTime.localeCompare(b.startTime) ||
      a.employeeName.localeCompare(b.employeeName),
    );

    setGenerated(shifts);
    Alert.alert(
      'Borrador generado',
      uncovered > 0
        ? `Se generaron ${shifts.length} turnos. Quedaron ${uncovered} hora(s)-persona sin cobertura por falta de disponibilidad o límites de carga.`
        : `Se generaron ${shifts.length} turnos sin déficit detectable.`,
    );
  };

  const saveGenerated = async (): Promise<void> => {
    if (generated.length === 0) {
      Alert.alert('Borrador', 'Primero genera una propuesta.');
      return;
    }
    try {
      setSaving(true);
      await createAttendanceShiftDraft({
        weekStart: weekStartText,
        notes,
        items: generated.map(item => ({
          userId: item.userId,
          workDate: item.workDate,
          startTime: item.startTime,
          endTime: item.endTime,
          demandHoursCovered: item.demandHoursCovered,
          rationale: item.rationale,
        })),
      });
      setGenerated([]);
      setNotes('');
      await load();
      Alert.alert('Borrador', 'La propuesta se guardó correctamente.');
    } catch (error) {
      Alert.alert(
        'No se pudo guardar',
        error instanceof Error ? error.message : 'Ocurrió un error.',
      );
    } finally {
      setSaving(false);
    }
  };

  const openDraft = async (draft: AttendanceShiftDraft): Promise<void> => {
    try {
      const [items, publication] = await Promise.all([
        getAttendanceShiftDraftItems(draft.id),
        draft.status === 'approved'
          ? getAttendanceShiftPublicationStatus(draft.id)
          : Promise.resolve(null),
      ]);
      setSelectedDraft(draft);
      setSelectedItems(items);
      setPublicationStatus(publication);
    } catch (error) {
      Alert.alert(
        'Borrador',
        error instanceof Error ? error.message : 'No se pudo abrir el borrador.',
      );
    }
  };

  const saveEdit = async (): Promise<void> => {
    if (!editingItem) return;
    try {
      setSaving(true);
      if (selectedDraft?.status === 'approved') {
        await updateApprovedAttendanceShiftItem({
          itemId: editingItem.id,
          startTime: editStart,
          endTime: editEnd,
          rationale: editingItem.rationale,
        });
      } else {
        await updateAttendanceShiftDraftItem({
          itemId: editingItem.id,
          startTime: editStart,
          endTime: editEnd,
          rationale: editingItem.rationale,
        });
      }

      const items = await getAttendanceShiftDraftItems(editingItem.draftId);
      setSelectedItems(items);

      if (selectedDraft?.status === 'approved') {
        setPublicationStatus(
          await getAttendanceShiftPublicationStatus(selectedDraft.id),
        );
      }

      setEditingItem(null);
    } catch (error) {
      Alert.alert(
        'No se pudo editar',
        error instanceof Error ? error.message : 'Ocurrió un error.',
      );
    } finally {
      setSaving(false);
    }
  };

  const approve = async (): Promise<void> => {
    if (!selectedDraft) return;
    Alert.alert(
      'Aprobar plan semanal',
      `¿Confirmar la semana ${selectedDraft.weekStart} a ${selectedDraft.weekEnd}?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Aprobar',
          onPress: () => void (async () => {
            try {
              setSaving(true);
              await approveAttendanceShiftDraft(selectedDraft.id);
              setSelectedDraft(null);
              setSelectedItems([]);
              await load();
            } catch (error) {
              Alert.alert('No se pudo aprobar', error instanceof Error ? error.message : 'Ocurrió un error.');
            } finally {
              setSaving(false);
            }
          })(),
        },
      ],
    );
  };

  const publishPlan = async (): Promise<void> => {
    if (!selectedDraft || selectedDraft.status !== 'approved') return;

    Alert.alert(
      publicationStatus?.publishedRevision
        ? 'Republicar horario'
        : 'Publicar horario',
      publicationStatus?.publishedRevision
        ? 'Se notificará a los empleados afectados y deberán confirmar nuevamente que revisaron esta versión.'
        : 'Los empleados podrán ver su horario y recibirán una notificación push.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Publicar',
          onPress: () => void (async () => {
            try {
              setSaving(true);
              await publishAttendanceShiftPlan(selectedDraft.id);
              setPublicationStatus(
                await getAttendanceShiftPublicationStatus(selectedDraft.id),
              );
              Alert.alert(
                'Horario publicado',
                'La versión vigente ya está disponible para los empleados.',
              );
            } catch (error) {
              Alert.alert(
                'No se pudo publicar',
                error instanceof Error ? error.message : 'Ocurrió un error.',
              );
            } finally {
              setSaving(false);
            }
          })(),
        },
      ],
    );
  };

  const discard = async (): Promise<void> => {
    if (!selectedDraft) return;
    try {
      setSaving(true);
      await discardAttendanceShiftDraft(selectedDraft.id);
      setSelectedDraft(null);
      setSelectedItems([]);
      await load();
    } catch (error) {
      Alert.alert('No se pudo descartar', error instanceof Error ? error.message : 'Ocurrió un error.');
    } finally {
      setSaving(false);
    }
  };

  const saveSettings = async (): Promise<void> => {
    try {
      setSaving(true);
      await saveAttendanceShiftDraftSettings(draftSettings);
      Alert.alert('Borradores', 'Los límites se guardaron correctamente.');
    } catch (error) {
      Alert.alert('No se pudo guardar', error instanceof Error ? error.message : 'Ocurrió un error.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={theme.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
      <View style={styles.header}>
        <View style={styles.headerText}>
          <Text style={[styles.title, { color: theme.text }]}>Borradores de turnos inteligentes</Text>
          <Text style={[styles.subtitle, { color: theme.textMuted }]}>Genera una propuesta para la siguiente semana usando ventas históricas, disponibilidad base y límites de carga. Admin debe revisarla y aprobarla.</Text>
        </View>
        <TouchableOpacity onPress={() => void load()} style={[styles.secondaryButton, { borderColor: theme.border, backgroundColor: theme.background }]}>
          <Text style={{ color: theme.text, fontWeight: '800' }}>ACTUALIZAR</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.settingsGrid}>
        {[
          ['MAX. H/SEMANA', 'maxWeeklyHours'],
          ['MAX. H/DÍA', 'maxDailyHours'],
          ['MÍN. TURNO · H', 'minimumShiftHours'],
          ['MAX. TURNO · H', 'maximumShiftHours'],
        ].map(([label, key]) => (
          <View style={styles.field} key={key}>
            <Text style={[styles.label, { color: theme.textMuted }]}>{label}</Text>
            <TextInput
              keyboardType="decimal-pad"
              value={String(draftSettings[key as keyof AttendanceShiftDraftSettings])}
              onChangeText={value => {
                const parsed = Number(value.replace(/[^0-9.]/g, ''));
                if (!Number.isFinite(parsed)) return;
                setDraftSettings(current => ({ ...current, [key]: parsed }));
              }}
              style={[styles.input, { color: theme.text, borderColor: theme.border, backgroundColor: theme.background }]}
            />
          </View>
        ))}
      </View>

      <View style={styles.actions}>
        <TouchableOpacity disabled={saving} onPress={() => void saveSettings()} style={[styles.secondaryButton, { borderColor: theme.border, backgroundColor: theme.background }]}>
          <Text style={{ color: theme.text, fontWeight: '800' }}>GUARDAR LÍMITES</Text>
        </TouchableOpacity>
        <TouchableOpacity disabled={saving} onPress={generate} style={[styles.primaryButton, { backgroundColor: theme.primary }]}>
          <Text style={{ color: theme.onPrimary, fontWeight: '900' }}>GENERAR {weekStartText} → {weekEndText}</Text>
        </TouchableOpacity>
      </View>

      {generated.length > 0 ? (
        <View style={[styles.preview, { borderColor: theme.border, backgroundColor: theme.background }]}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Vista previa · {generated.length} turnos</Text>
          {generated.map((item, index) => (
            <View key={`${item.userId}-${item.workDate}-${index}`} style={[styles.shiftRow, { borderColor: theme.border }]}>
              <View style={styles.shiftMain}>
                <Text style={{ color: theme.text, fontWeight: '900' }}>{item.employeeName}</Text>
                <Text style={{ color: theme.textMuted }}>{item.workDate} · {item.startTime}–{item.endTime}</Text>
              </View>
              <Text style={[styles.reason, { color: theme.textMuted }]}>{item.rationale}</Text>
            </View>
          ))}
          <TextInput
            value={notes}
            onChangeText={setNotes}
            placeholder="Notas opcionales del borrador"
            placeholderTextColor={theme.textMuted}
            style={[styles.input, { color: theme.text, borderColor: theme.border, backgroundColor: theme.surface }]}
          />
          <TouchableOpacity disabled={saving} onPress={() => void saveGenerated()} style={[styles.primaryButton, { backgroundColor: theme.primary, alignSelf: 'flex-start' }]}>
            <Text style={{ color: theme.onPrimary, fontWeight: '900' }}>{saving ? 'GUARDANDO...' : 'GUARDAR BORRADOR'}</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      <Text style={[styles.sectionTitle, { color: theme.text }]}>Historial de borradores</Text>
      {drafts.length === 0 ? (
        <Text style={{ color: theme.textMuted }}>Todavía no hay borradores guardados.</Text>
      ) : drafts.map(draft => (
        <TouchableOpacity
          key={draft.id}
          onPress={() => void openDraft(draft)}
          style={[styles.draftRow, { borderColor: theme.border, backgroundColor: theme.background }]}
        >
          <View>
            <Text style={{ color: theme.text, fontWeight: '900' }}>{draft.weekStart} → {draft.weekEnd} · v{draft.version}</Text>
            <Text style={{ color: theme.textMuted, marginTop: 3 }}>Generado por {draft.generatedBy || 'Admin'} · {draft.generatedAt ? new Date(draft.generatedAt).toLocaleString('es-MX') : ''}</Text>
          </View>
          <Text style={{ color: draft.status === 'approved' ? theme.primary : theme.textMuted, fontWeight: '900' }}>{statusLabel(draft.status)}</Text>
        </TouchableOpacity>
      ))}

      <Modal
        visible={Boolean(selectedDraft)}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedDraft(null)}
      >
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <Text style={[styles.modalTitle, { color: theme.text }]}>Plan semanal</Text>
            <Text style={[styles.subtitle, { color: theme.textMuted }]}>{selectedDraft?.weekStart} → {selectedDraft?.weekEnd} · {selectedDraft ? statusLabel(selectedDraft.status) : ''}</Text>
            {selectedDraft?.status === 'approved' && publicationStatus ? (
              <View style={[styles.publicationBox, { borderColor: theme.border, backgroundColor: theme.background }]}>
                <Text style={{ color: theme.text, fontWeight: '900' }}>
                  Revisión actual v{publicationStatus.currentRevision}
                  {publicationStatus.publishedRevision > 0
                    ? ` · publicada v${publicationStatus.publishedRevision}`
                    : ' · todavía sin publicar'}
                </Text>
                <Text style={{ color: theme.textMuted, marginTop: 4, fontSize: 12 }}>
                  {publicationStatus.publishedRevision > 0
                    ? `${publicationStatus.acknowledgedCount}/${publicationStatus.employeesCount} empleado(s) confirmaron lectura`
                    : `${publicationStatus.employeesCount} empleado(s) recibirán el horario al publicarlo`}
                </Text>
                {publicationStatus.currentRevision > publicationStatus.publishedRevision ? (
                  <Text style={{ color: theme.danger, marginTop: 4, fontSize: 12, fontWeight: '800' }}>
                    Hay cambios pendientes de publicar.
                  </Text>
                ) : null}
              </View>
            ) : null}
            <ScrollView style={styles.modalList}>
              {selectedItems.map(item => (
                <View key={item.id} style={[styles.shiftRow, { borderColor: theme.border }]}>
                  <View style={styles.shiftMain}>
                    <Text style={{ color: theme.text, fontWeight: '900' }}>{item.employeeName}</Text>
                    <Text style={{ color: theme.textMuted }}>{item.workDate} · {item.startTime}–{item.endTime} · {(item.plannedMinutes / 60).toFixed(1)} h</Text>
                  </View>
                  {selectedDraft?.status === 'draft' || selectedDraft?.status === 'approved' ? (
                    <TouchableOpacity
                      onPress={() => {
                        setEditingItem(item);
                        setEditStart(item.startTime);
                        setEditEnd(item.endTime);
                      }}
                      style={[styles.smallButton, { borderColor: theme.primary }]}
                    >
                      <Text style={{ color: theme.primary, fontWeight: '900' }}>EDITAR</Text>
                    </TouchableOpacity>
                  ) : null}
                </View>
              ))}
            </ScrollView>
            <View style={styles.modalActions}>
              {selectedDraft?.status === 'draft' ? (
                <>
                  <TouchableOpacity disabled={saving} onPress={() => void discard()} style={[styles.secondaryButton, { borderColor: theme.danger }]}>
                    <Text style={{ color: theme.danger, fontWeight: '900' }}>DESCARTAR</Text>
                  </TouchableOpacity>
                  <TouchableOpacity disabled={saving} onPress={() => void approve()} style={[styles.primaryButton, { backgroundColor: theme.primary }]}>
                    <Text style={{ color: theme.onPrimary, fontWeight: '900' }}>APROBAR SEMANA</Text>
                  </TouchableOpacity>
                </>
              ) : null}
              {selectedDraft?.status === 'approved' ? (
                <TouchableOpacity
                  disabled={
                    saving ||
                    Boolean(
                      publicationStatus &&
                      publicationStatus.currentRevision ===
                        publicationStatus.publishedRevision,
                    )
                  }
                  onPress={() => void publishPlan()}
                  style={[
                    styles.primaryButton,
                    {
                      backgroundColor: theme.primary,
                      opacity:
                        saving ||
                        Boolean(
                          publicationStatus &&
                          publicationStatus.currentRevision ===
                            publicationStatus.publishedRevision,
                        )
                          ? 0.5
                          : 1,
                    },
                  ]}
                >
                  <Text style={{ color: theme.onPrimary, fontWeight: '900' }}>
                    {publicationStatus?.publishedRevision
                      ? 'PUBLICAR CAMBIOS'
                      : 'PUBLICAR A EMPLEADOS'}
                  </Text>
                </TouchableOpacity>
              ) : null}
              <TouchableOpacity onPress={() => { setSelectedDraft(null); setPublicationStatus(null); }} style={[styles.secondaryButton, { borderColor: theme.border }]}>
                <Text style={{ color: theme.text, fontWeight: '800' }}>CERRAR</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={Boolean(editingItem)}
        transparent
        animationType="fade"
        onRequestClose={() => setEditingItem(null)}
      >
        <View style={styles.modalBackdrop}>
          <View style={[styles.editCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <Text style={[styles.modalTitle, { color: theme.text }]}>Editar turno</Text>
            <Text style={[styles.subtitle, { color: theme.textMuted }]}>{editingItem?.employeeName} · {editingItem?.workDate}</Text>
            <Text style={[styles.label, { color: theme.textMuted }]}>ENTRADA</Text>
            <TimeSelect value={editStart || '08:00'} onChange={setEditStart} />
            <Text style={[styles.label, { color: theme.textMuted }]}>SALIDA</Text>
            <TimeSelect value={editEnd || '17:00'} onChange={setEditEnd} />
            <View style={styles.modalActions}>
              <TouchableOpacity onPress={() => setEditingItem(null)} style={[styles.secondaryButton, { borderColor: theme.border }]}>
                <Text style={{ color: theme.text, fontWeight: '800' }}>CANCELAR</Text>
              </TouchableOpacity>
              <TouchableOpacity disabled={saving} onPress={() => void saveEdit()} style={[styles.primaryButton, { backgroundColor: theme.primary }]}>
                <Text style={{ color: theme.onPrimary, fontWeight: '900' }}>GUARDAR</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Text style={[styles.note, { color: theme.textMuted }]}>Los turnos se generan únicamente dentro de la disponibilidad/horario base configurado. Si no existe personal suficiente, el sistema deja déficit en lugar de asignar fuera de disponibilidad.</Text>
    </View>
  );
}
