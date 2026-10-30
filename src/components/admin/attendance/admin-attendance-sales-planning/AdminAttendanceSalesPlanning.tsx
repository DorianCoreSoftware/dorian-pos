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
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import {
  AttendanceEmployee,
  AttendanceSalesHourlyProfile,
  AttendanceSalesPlanningSettings,
  EmployeeScheduleDay,
  getAttendanceEmployees,
  getAttendanceSalesHourlyProfile,
  getAttendanceSalesPlanningSettings,
  getEmployeeSchedule,
  saveAttendanceSalesPlanningSettings,
} from '../../../../services/attendanceService';

import {
  useBusiness,
} from '../../../../context/BusinessContext';

import { styles } from './AdminAttendanceSalesPlanning.styles';




import type { EmployeePlan, ForecastHour } from './AdminAttendanceSalesPlanning.types';
const DEFAULT_SETTINGS: AttendanceSalesPlanningSettings = {
  historyDays: 56,
  lookaheadDays: 14,
  minimumStaffPerHour: 1,
  ordersPerStaffHour: 8,
  revenuePerStaffHour: 600,
};

const DAY_NAMES = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

function localDateInput(date: Date): string {
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function historyStart(days: number): string {
  const date = new Date();
  date.setHours(12, 0, 0, 0);
  date.setDate(date.getDate() - Math.max(1, days - 1));
  return localDateInput(date);
}

function parseNumberInput(
  value: string,
  fallback: number,
  allowDecimal = false,
): number {
  const cleaned = allowDecimal
    ? value.replace(/[^0-9.]/g, '')
    : value.replace(/[^0-9]/g, '');
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function currency(value: number): string {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    maximumFractionDigits: 0,
  }).format(value);
}

function timeLabel(hour: number): string {
  const next = (hour + 1) % 24;
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${pad(hour)}:00–${pad(next)}:00`;
}

function timeToMinutes(value: string): number {
  const [hour, minute] = value.slice(0, 5).split(':').map(Number);
  return (Number.isFinite(hour) ? hour : 0) * 60 +
    (Number.isFinite(minute) ? minute : 0);
}

function scheduleCoversHour(
  schedule: EmployeeScheduleDay[],
  dayOfWeek: number,
  hour: number,
): boolean {
  const minute = hour * 60 + 30;

  const current = schedule.find(item => item.dayOfWeek === dayOfWeek);
  if (current?.isWorking) {
    const start = timeToMinutes(current.startTime);
    const end = timeToMinutes(current.endTime);

    if (end > start) {
      if (minute >= start && minute < end) return true;
    } else if (end < start) {
      if (minute >= start) return true;
    }
  }

  const previousDay = (dayOfWeek + 6) % 7;
  const previous = schedule.find(item => item.dayOfWeek === previousDay);
  if (previous?.isWorking) {
    const start = timeToMinutes(previous.startTime);
    const end = timeToMinutes(previous.endTime);

    if (end < start && minute < end) {
      return true;
    }
  }

  return false;
}

function recommendedStaff(
  profile: AttendanceSalesHourlyProfile,
  settings: AttendanceSalesPlanningSettings,
): number {
  const hasDemand =
    profile.averageOrders > 0.05 ||
    profile.averageRevenue > 1;

  if (!hasDemand) return 0;

  const byOrders = Math.ceil(
    profile.averageOrders /
      Math.max(0.1, settings.ordersPerStaffHour),
  );

  const byRevenue = Math.ceil(
    profile.averageRevenue /
      Math.max(1, settings.revenuePerStaffHour),
  );

  return Math.max(
    settings.minimumStaffPerHour,
    byOrders,
    byRevenue,
  );
}

export function AdminAttendanceSalesPlanning() {
  const { theme } = useBusiness();

  const [settings, setSettings] =
    useState<AttendanceSalesPlanningSettings>(DEFAULT_SETTINGS);
  const [profile, setProfile] =
    useState<AttendanceSalesHourlyProfile[]>([]);
  const [plans, setPlans] =
    useState<EmployeePlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async (): Promise<void> => {
    try {
      setLoading(true);

      const loadedSettings =
        await getAttendanceSalesPlanningSettings();

      setSettings(loadedSettings);

      const employees =
        (await getAttendanceEmployees())
          .filter(item => item.isActive);

      const [salesProfile, schedules] =
        await Promise.all([
          getAttendanceSalesHourlyProfile({
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

      setProfile(salesProfile);
      setPlans(schedules);
    } catch (error) {
      console.error(
        'Error cargando planeación ventas/asistencia:',
        error,
      );
      Alert.alert(
        'Planeación por ventas',
        error instanceof Error
          ? error.message
          : 'No se pudo cargar la información.',
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
    for (const row of profile) {
      map.set(`${row.dayOfWeek}-${row.hourOfDay}`, row);
    }
    return map;
  }, [profile]);

  const forecast = useMemo(() => {
    const rows: ForecastHour[] = [];
    const today = new Date();
    today.setHours(12, 0, 0, 0);

    for (
      let offset = 1;
      offset <= settings.lookaheadDays;
      offset += 1
    ) {
      const date = new Date(today);
      date.setDate(today.getDate() + offset);

      const dayOfWeek = date.getDay();
      const dateKey = localDateInput(date);

      for (let hour = 0; hour < 24; hour += 1) {
        const historical =
          profileMap.get(`${dayOfWeek}-${hour}`) ?? {
            dayOfWeek,
            hourOfDay: hour,
            sampleDays: 0,
            ordersTotal: 0,
            revenueTotal: 0,
            averageOrders: 0,
            averageRevenue: 0,
          };

        const scheduledStaff =
          plans.filter(plan =>
            scheduleCoversHour(
              plan.schedule,
              dayOfWeek,
              hour,
            ),
          ).length;

        const recommended =
          recommendedStaff(historical, settings);

        if (
          recommended === 0 &&
          scheduledStaff === 0
        ) {
          continue;
        }

        const orderCapacity =
          scheduledStaff *
          Math.max(0.1, settings.ordersPerStaffHour);

        const revenueCapacity =
          scheduledStaff *
          Math.max(1, settings.revenuePerStaffHour);

        const utilization =
          scheduledStaff <= 0
            ? recommended > 0
              ? 999
              : 0
            : Math.max(
                historical.averageOrders /
                  Math.max(0.1, orderCapacity),
                historical.averageRevenue /
                  Math.max(1, revenueCapacity),
              ) * 100;

        rows.push({
          key: `${dateKey}-${hour}`,
          date: dateKey,
          dayOfWeek,
          hour,
          averageOrders: historical.averageOrders,
          averageRevenue: historical.averageRevenue,
          scheduledStaff,
          recommendedStaff: recommended,
          deficit: Math.max(
            0,
            recommended - scheduledStaff,
          ),
          utilizationPercent:
            Math.round(utilization),
          hasHistory: historical.sampleDays > 0,
        });
      }
    }

    return rows;
  }, [
    plans,
    profileMap,
    settings,
  ]);

  const peakProfile = useMemo(() => {
    return [...profile]
      .filter(item =>
        item.averageOrders > 0 ||
        item.averageRevenue > 0,
      )
      .sort((a, b) =>
        b.averageRevenue - a.averageRevenue ||
        b.averageOrders - a.averageOrders,
      )
      .slice(0, 12);
  }, [profile]);

  const problemHours = useMemo(() => {
    return forecast
      .filter(item =>
        item.deficit > 0 &&
        item.recommendedStaff > 0,
      )
      .sort((a, b) =>
        b.deficit - a.deficit ||
        b.utilizationPercent - a.utilizationPercent,
      );
  }, [forecast]);

  const dailySummary = useMemo(() => {
    const map = new Map<string, {
      date: string;
      dayOfWeek: number;
      demandHours: number;
      deficitHours: number;
      maxRecommended: number;
      maxScheduled: number;
      projectedRevenue: number;
      projectedOrders: number;
    }>();

    for (const row of forecast) {
      const current = map.get(row.date) ?? {
        date: row.date,
        dayOfWeek: row.dayOfWeek,
        demandHours: 0,
        deficitHours: 0,
        maxRecommended: 0,
        maxScheduled: 0,
        projectedRevenue: 0,
        projectedOrders: 0,
      };

      if (row.recommendedStaff > 0) {
        current.demandHours += 1;
      }
      if (row.deficit > 0) {
        current.deficitHours += 1;
      }

      current.maxRecommended = Math.max(
        current.maxRecommended,
        row.recommendedStaff,
      );
      current.maxScheduled = Math.max(
        current.maxScheduled,
        row.scheduledStaff,
      );
      current.projectedRevenue += row.averageRevenue;
      current.projectedOrders += row.averageOrders;

      map.set(row.date, current);
    }

    return [...map.values()]
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [forecast]);

  const save = async (): Promise<void> => {
    try {
      setSaving(true);
      await saveAttendanceSalesPlanningSettings(settings);
      await load();
      Alert.alert(
        'Planeación por ventas',
        'La configuración se guardó correctamente.',
      );
    } catch (error) {
      Alert.alert(
        'No se pudo guardar',
        error instanceof Error
          ? error.message
          : 'Ocurrió un error.',
      );
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator
          size="large"
          color={theme.primary}
        />
      </View>
    );
  }

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
      <View style={styles.header}>
        <View style={styles.headerText}>
          <Text
            style={[
              styles.title,
              { color: theme.text },
            ]}
          >
            Planeación por ventas reales
          </Text>

          <Text
            style={[
              styles.subtitle,
              { color: theme.textMuted },
            ]}
          >
            Cruza el historial de ventas por hora con los horarios
            configurados. Las cifras son recomendaciones; no modifican
            turnos automáticamente.
          </Text>
        </View>

        <TouchableOpacity
          onPress={() => void load()}
          style={[
            styles.secondaryButton,
            {
              borderColor: theme.border,
              backgroundColor: theme.background,
            },
          ]}
        >
          <Text
            style={{
              color: theme.text,
              fontWeight: '800',
            }}
          >
            ACTUALIZAR
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.settingsGrid}>
        <View style={styles.field}>
          <Text style={[styles.label, { color: theme.textMuted }]}>
            HISTORIAL · DÍAS
          </Text>
          <TextInput
            keyboardType="number-pad"
            value={String(settings.historyDays)}
            onChangeText={value =>
              setSettings(current => ({
                ...current,
                historyDays: parseNumberInput(
                  value,
                  current.historyDays,
                ),
              }))
            }
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

        <View style={styles.field}>
          <Text style={[styles.label, { color: theme.textMuted }]}>
            PROYECCIÓN · DÍAS
          </Text>
          <TextInput
            keyboardType="number-pad"
            value={String(settings.lookaheadDays)}
            onChangeText={value =>
              setSettings(current => ({
                ...current,
                lookaheadDays: parseNumberInput(
                  value,
                  current.lookaheadDays,
                ),
              }))
            }
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

        <View style={styles.field}>
          <Text style={[styles.label, { color: theme.textMuted }]}>
            MÍNIMO PERSONAL / HORA
          </Text>
          <TextInput
            keyboardType="number-pad"
            value={String(settings.minimumStaffPerHour)}
            onChangeText={value =>
              setSettings(current => ({
                ...current,
                minimumStaffPerHour: parseNumberInput(
                  value,
                  current.minimumStaffPerHour,
                ),
              }))
            }
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

        <View style={styles.field}>
          <Text style={[styles.label, { color: theme.textMuted }]}>
            ÓRDENES / PERSONA / HORA
          </Text>
          <TextInput
            keyboardType="decimal-pad"
            value={String(settings.ordersPerStaffHour)}
            onChangeText={value =>
              setSettings(current => ({
                ...current,
                ordersPerStaffHour: parseNumberInput(
                  value,
                  current.ordersPerStaffHour,
                  true,
                ),
              }))
            }
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

        <View style={styles.field}>
          <Text style={[styles.label, { color: theme.textMuted }]}>
            VENTAS / PERSONA / HORA
          </Text>
          <TextInput
            keyboardType="decimal-pad"
            value={String(settings.revenuePerStaffHour)}
            onChangeText={value =>
              setSettings(current => ({
                ...current,
                revenuePerStaffHour: parseNumberInput(
                  value,
                  current.revenuePerStaffHour,
                  true,
                ),
              }))
            }
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
      </View>

      <View style={styles.actions}>
        <TouchableOpacity
          disabled={saving}
          onPress={() => void save()}
          style={[
            styles.primaryButton,
            {
              backgroundColor: theme.primary,
              opacity: saving ? 0.55 : 1,
            },
          ]}
        >
          <Text
            style={{
              color: theme.onPrimary,
              fontWeight: '900',
            }}
          >
            {saving ? 'GUARDANDO...' : 'GUARDAR PARÁMETROS'}
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.metricsRow}>
        <View style={[styles.metric, { borderColor: theme.border }]}>
          <Text style={[styles.metricNumber, { color: theme.primary }]}>
            {profile.reduce((sum, item) => sum + item.ordersTotal, 0)}
          </Text>
          <Text style={[styles.metricLabel, { color: theme.textMuted }]}>
            órdenes analizadas
          </Text>
        </View>

        <View style={[styles.metric, { borderColor: theme.border }]}>
          <Text style={[styles.metricNumber, { color: theme.primary }]}>
            {currency(
              profile.reduce(
                (sum, item) => sum + item.revenueTotal,
                0,
              ),
            )}
          </Text>
          <Text style={[styles.metricLabel, { color: theme.textMuted }]}>
            ventas analizadas
          </Text>
        </View>

        <View style={[styles.metric, { borderColor: theme.border }]}>
          <Text
            style={[
              styles.metricNumber,
              {
                color:
                  problemHours.length > 0
                    ? theme.danger
                    : theme.primary,
              },
            ]}
          >
            {problemHours.length}
          </Text>
          <Text style={[styles.metricLabel, { color: theme.textMuted }]}>
            horas futuras con déficit
          </Text>
        </View>
      </View>

      <Text style={[styles.sectionTitle, { color: theme.text }]}>
        Próximos días
      </Text>

      <ScrollView horizontal showsHorizontalScrollIndicator>
        <View style={styles.table}>
          <View
            style={[
              styles.row,
              styles.headerRow,
              { borderColor: theme.border },
            ]}
          >
            <Text style={[styles.dayCell, { color: theme.textMuted }]}>DÍA</Text>
            <Text style={[styles.smallCell, { color: theme.textMuted }]}>ÓRDENES EST.</Text>
            <Text style={[styles.moneyCell, { color: theme.textMuted }]}>VENTAS EST.</Text>
            <Text style={[styles.smallCell, { color: theme.textMuted }]}>HORAS DEMANDA</Text>
            <Text style={[styles.smallCell, { color: theme.textMuted }]}>HORAS DÉFICIT</Text>
            <Text style={[styles.smallCell, { color: theme.textMuted }]}>PICO IDEAL</Text>
            <Text style={[styles.smallCell, { color: theme.textMuted }]}>PICO PROGRAMADO</Text>
          </View>

          {dailySummary.map(item => (
            <View
              key={item.date}
              style={[
                styles.row,
                { borderColor: theme.border },
              ]}
            >
              <View style={styles.dayCell}>
                <Text style={{ color: theme.text, fontWeight: '800' }}>
                  {DAY_NAMES[item.dayOfWeek]} · {item.date}
                </Text>
              </View>

              <Text style={[styles.smallCell, { color: theme.text }]}>
                {item.projectedOrders.toFixed(1)}
              </Text>

              <Text style={[styles.moneyCell, { color: theme.text }]}>
                {currency(item.projectedRevenue)}
              </Text>

              <Text style={[styles.smallCell, { color: theme.text }]}>
                {item.demandHours}
              </Text>

              <Text
                style={[
                  styles.smallCell,
                  {
                    color:
                      item.deficitHours > 0
                        ? theme.danger
                        : theme.text,
                    fontWeight:
                      item.deficitHours > 0
                        ? '900'
                        : '600',
                  },
                ]}
              >
                {item.deficitHours}
              </Text>

              <Text style={[styles.smallCell, { color: theme.text }]}>
                {item.maxRecommended}
              </Text>

              <Text style={[styles.smallCell, { color: theme.text }]}>
                {item.maxScheduled}
              </Text>
            </View>
          ))}
        </View>
      </ScrollView>

      <Text style={[styles.sectionTitle, { color: theme.text }]}>
        Horas con déficit de cobertura
      </Text>

      {problemHours.length === 0 ? (
        <Text style={[styles.empty, { color: theme.textMuted }]}>
          No se detectaron déficits con los parámetros actuales.
        </Text>
      ) : (
        problemHours.slice(0, 30).map(item => (
          <View
            key={item.key}
            style={[
              styles.alertRow,
              {
                borderColor: theme.border,
                backgroundColor: theme.background,
              },
            ]}
          >
            <View style={styles.alertText}>
              <Text style={{ color: theme.text, fontWeight: '900' }}>
                {DAY_NAMES[item.dayOfWeek]} {item.date} · {timeLabel(item.hour)}
              </Text>
              <Text style={{ color: theme.textMuted, marginTop: 3 }}>
                Promedio histórico: {item.averageOrders.toFixed(1)} órdenes ·{' '}
                {currency(item.averageRevenue)}
              </Text>
            </View>

            <View style={styles.alertNumbers}>
              <Text style={{ color: theme.danger, fontWeight: '900' }}>
                {item.scheduledStaff} programado(s) / {item.recommendedStaff} recomendado(s)
              </Text>
              <Text style={{ color: theme.textMuted, marginTop: 3 }}>
                Déficit {item.deficit} · carga estimada {item.utilizationPercent}%
              </Text>
            </View>
          </View>
        ))
      )}

      <Text style={[styles.sectionTitle, { color: theme.text }]}>
        Franjas históricas más fuertes
      </Text>

      <View style={styles.peakGrid}>
        {peakProfile.map(item => (
          <View
            key={`${item.dayOfWeek}-${item.hourOfDay}`}
            style={[
              styles.peakCard,
              {
                borderColor: theme.border,
                backgroundColor: theme.background,
              },
            ]}
          >
            <Text style={{ color: theme.text, fontWeight: '900' }}>
              {DAY_NAMES[item.dayOfWeek]} · {timeLabel(item.hourOfDay)}
            </Text>
            <Text style={{ color: theme.textMuted, marginTop: 4 }}>
              {item.averageOrders.toFixed(1)} órdenes/h · {currency(item.averageRevenue)}/h
            </Text>
            <Text style={{ color: theme.textMuted, marginTop: 3, fontSize: 11 }}>
              Promedio de {item.sampleDays} semana(s)/día(s) comparables
            </Text>
          </View>
        ))}
      </View>

      <Text style={[styles.note, { color: theme.textMuted }]}>
        La proyección usa el promedio histórico del mismo día de la semana y hora.
        Pedidos cancelados se excluyen. No sustituye el criterio operativo del administrador.
      </Text>
    </View>
  );
}
