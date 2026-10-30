import { supabase } from './supabase';

export interface AttendanceRecord {
  id: string;
  user_id: string;
  clock_in: string;
  clock_out: string | null;
  created_at: string;
  updated_at: string;
  schedule_date?: string | null;
  scheduled_start?: string | null;
  scheduled_end?: string | null;
  schedule_source?: string | null;
  late_minutes?: number;
  early_leave_minutes?: number;
  overtime_minutes?: number;
  attendance_result?: string | null;
}

export interface AdminAttendanceRecord extends AttendanceRecord {
  employee_name: string;
  employee_role: string;
}

export interface AttendanceSettings {
  remindersEnabled: boolean;
  earlyClockInMinutes: number;
  reminderIntervalMinutes: number;
  afterCloseGraceMinutes: number;
  lateToleranceMinutes: number;
  earlyLeaveToleranceMinutes: number;
  overtimeToleranceMinutes: number;
}

export interface AttendanceStatus {
  hasOpenAttendance: boolean;
  openAttendanceId: string | null;
  openClockIn: string | null;
  timezone: string;
  localNow: string;
  scheduleDate: string | null;
  scheduleIsOpen: boolean;
  scheduleOpenAt: string | null;
  scheduleCloseAt: string | null;
  entryWindowStart: string | null;
  withinBusinessHours: boolean;
  withinClockInWindow: boolean;
  beforeClockInWindow: boolean;
  afterBusinessClose: boolean;
  scheduleIsException: boolean;
  scheduleReason: string | null;
  scheduleSource: string | null;
  adjustedToBusinessHours: boolean;
  needsClockInReminder: boolean;
  needsClockOutReminder: boolean;
  settings: AttendanceSettings;
}

export interface AttendanceEmployee {
  userId: string;
  employeeName: string;
  employeeRole: string;
  isActive: boolean;
  useBusinessSchedule: boolean;
}

export interface EmployeeScheduleDay {
  dayOfWeek: number;
  isWorking: boolean;
  startTime: string;
  endTime: string;
  useBusinessSchedule: boolean;
}

export interface AttendanceDailySummaryItem {
  workDate: string;
  userId: string;
  employeeName: string;
  employeeRole: string;
  expectedStart: string | null;
  expectedEnd: string | null;
  clockIn: string | null;
  clockOut: string | null;
  lateMinutes: number;
  earlyLeaveMinutes: number;
  overtimeMinutes: number;
  dayStatus: string;
  incidentId: string | null;
  incidentType: string | null;
  incidentStatus: string | null;
  incidentNote: string | null;
}

export interface AttendanceIncident {
  id: string;
  userId: string;
  employeeName: string;
  employeeRole: string;
  startDate: string;
  endDate: string;
  incidentType: string;
  status: string;
  note: string;
  adminNote: string | null;
  createdBy: string;
  createdByName: string;
  reviewedBy: string | null;
  reviewedByName: string | null;
  reviewedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

interface AttendanceStatusRpc {
  has_open_attendance?: boolean;
  open_attendance_id?: string | null;
  open_clock_in?: string | null;
  timezone?: string;
  local_now?: string;
  schedule_date?: string | null;
  schedule_is_open?: boolean;
  schedule_open_at?: string | null;
  schedule_close_at?: string | null;
  entry_window_start?: string | null;
  within_business_hours?: boolean;
  within_clock_in_window?: boolean;
  before_clock_in_window?: boolean;
  after_business_close?: boolean;
  schedule_is_exception?: boolean;
  schedule_reason?: string | null;
  schedule_source?: string | null;
  adjusted_to_business_hours?: boolean;
  needs_clock_in_reminder?: boolean;
  needs_clock_out_reminder?: boolean;
  reminders_enabled?: boolean;
  early_clock_in_minutes?: number;
  reminder_interval_minutes?: number;
  after_close_grace_minutes?: number;
  late_tolerance_minutes?: number;
  early_leave_tolerance_minutes?: number;
  overtime_tolerance_minutes?: number;
}

const DEFAULT_SETTINGS: AttendanceSettings = {
  remindersEnabled: true,
  earlyClockInMinutes: 60,
  reminderIntervalMinutes: 15,
  afterCloseGraceMinutes: 60,
  lateToleranceMinutes: 10,
  earlyLeaveToleranceMinutes: 5,
  overtimeToleranceMinutes: 10,
};

function normalizeSettings(row: {
  reminders_enabled?: boolean;
  early_clock_in_minutes?: number;
  reminder_interval_minutes?: number;
  after_close_grace_minutes?: number;
  late_tolerance_minutes?: number;
  early_leave_tolerance_minutes?: number;
  overtime_tolerance_minutes?: number;
} | null): AttendanceSettings {
  return {
    remindersEnabled: row?.reminders_enabled ?? DEFAULT_SETTINGS.remindersEnabled,
    earlyClockInMinutes: row?.early_clock_in_minutes ?? DEFAULT_SETTINGS.earlyClockInMinutes,
    reminderIntervalMinutes: row?.reminder_interval_minutes ?? DEFAULT_SETTINGS.reminderIntervalMinutes,
    afterCloseGraceMinutes: row?.after_close_grace_minutes ?? DEFAULT_SETTINGS.afterCloseGraceMinutes,
    lateToleranceMinutes: row?.late_tolerance_minutes ?? DEFAULT_SETTINGS.lateToleranceMinutes,
    earlyLeaveToleranceMinutes: row?.early_leave_tolerance_minutes ?? DEFAULT_SETTINGS.earlyLeaveToleranceMinutes,
    overtimeToleranceMinutes: row?.overtime_tolerance_minutes ?? DEFAULT_SETTINGS.overtimeToleranceMinutes,
  };
}

function normalizeStatus(value: AttendanceStatusRpc | null): AttendanceStatus {
  const row = value ?? {};
  return {
    hasOpenAttendance: Boolean(row.has_open_attendance),
    openAttendanceId: row.open_attendance_id ?? null,
    openClockIn: row.open_clock_in ?? null,
    timezone: row.timezone ?? 'America/Mexico_City',
    localNow: row.local_now ?? new Date().toISOString(),
    scheduleDate: row.schedule_date ?? null,
    scheduleIsOpen: Boolean(row.schedule_is_open),
    scheduleOpenAt: row.schedule_open_at ?? null,
    scheduleCloseAt: row.schedule_close_at ?? null,
    entryWindowStart: row.entry_window_start ?? null,
    withinBusinessHours: Boolean(row.within_business_hours),
    withinClockInWindow: Boolean(row.within_clock_in_window),
    beforeClockInWindow: Boolean(row.before_clock_in_window),
    afterBusinessClose: Boolean(row.after_business_close),
    scheduleIsException: Boolean(row.schedule_is_exception),
    scheduleReason: row.schedule_reason ?? null,
    scheduleSource: row.schedule_source ?? null,
    adjustedToBusinessHours: Boolean(row.adjusted_to_business_hours),
    needsClockInReminder: Boolean(row.needs_clock_in_reminder),
    needsClockOutReminder: Boolean(row.needs_clock_out_reminder),
    settings: normalizeSettings(row),
  };
}

export async function getAttendanceStatus(): Promise<AttendanceStatus> {
  const { data, error } = await supabase.rpc('attendance_get_status');
  if (error) throw error;
  const row = Array.isArray(data) ? data[0] : data;
  return normalizeStatus((row ?? null) as AttendanceStatusRpc | null);
}

export async function getMyOpenAttendance(userId: string): Promise<AttendanceRecord | null> {
  const { data, error } = await supabase
    .from('attendance_records')
    .select('*')
    .eq('user_id', userId)
    .is('clock_out', null)
    .order('clock_in', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data ?? null;
}

export async function getMyAttendanceHistory(userId: string, limit = 20): Promise<AttendanceRecord[]> {
  const { data, error } = await supabase
    .from('attendance_records')
    .select('*')
    .eq('user_id', userId)
    .order('clock_in', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data ?? [];
}

export async function registerAttendanceEntry(): Promise<AttendanceRecord> {
  const { data, error } = await supabase.rpc('attendance_clock_in');
  if (error) throw error;
  return data as AttendanceRecord;
}

export async function registerAttendanceExit(): Promise<AttendanceRecord> {
  const { data, error } = await supabase.rpc('attendance_clock_out');
  if (error) throw error;
  return data as AttendanceRecord;
}

export async function getAdminAttendance(limit = 250): Promise<AdminAttendanceRecord[]> {
  const { data, error } = await supabase.rpc('attendance_admin_list', { p_limit: limit });
  if (error) throw error;
  return (data ?? []) as AdminAttendanceRecord[];
}

export async function correctAttendance(params: {
  attendanceId: string;
  clockIn: string;
  clockOut: string | null;
  reason: string;
}): Promise<AdminAttendanceRecord> {
  const { data, error } = await supabase.rpc('attendance_admin_correct', {
    p_attendance_id: params.attendanceId,
    p_clock_in: params.clockIn,
    p_clock_out: params.clockOut,
    p_reason: params.reason.trim(),
  });
  if (error) throw error;
  return data as AdminAttendanceRecord;
}

export async function getAttendanceSettings(): Promise<AttendanceSettings> {
  const { data, error } = await supabase.rpc('attendance_admin_get_settings');
  if (error) throw error;
  const row = (Array.isArray(data) ? data[0] : data) as Record<string, unknown> | null;
  return normalizeSettings(row as any);
}

export async function saveAttendanceSettings(settings: AttendanceSettings): Promise<AttendanceSettings> {
  const { data, error } = await supabase.rpc('attendance_admin_save_settings', {
    p_reminders_enabled: settings.remindersEnabled,
    p_early_clock_in_minutes: settings.earlyClockInMinutes,
    p_reminder_interval_minutes: settings.reminderIntervalMinutes,
    p_after_close_grace_minutes: settings.afterCloseGraceMinutes,
    p_late_tolerance_minutes: settings.lateToleranceMinutes,
    p_early_leave_tolerance_minutes: settings.earlyLeaveToleranceMinutes,
    p_overtime_tolerance_minutes: settings.overtimeToleranceMinutes,
  });
  if (error) throw error;
  const row = (Array.isArray(data) ? data[0] : data) as Record<string, unknown> | null;
  return normalizeSettings(row as any);
}

export async function getAttendanceEmployees(): Promise<AttendanceEmployee[]> {
  const { data, error } = await supabase.rpc('attendance_admin_list_employees');
  if (error) throw error;
  return ((data ?? []) as Array<{
    user_id: string;
    employee_name: string;
    employee_role: string;
    is_active: boolean;
    use_business_schedule: boolean;
  }>).map(row => ({
    userId: row.user_id,
    employeeName: row.employee_name,
    employeeRole: row.employee_role,
    isActive: row.is_active,
    useBusinessSchedule: row.use_business_schedule,
  }));
}

export async function getEmployeeSchedule(userId: string): Promise<EmployeeScheduleDay[]> {
  const { data, error } = await supabase.rpc('attendance_admin_get_employee_schedule', {
    p_user_id: userId,
  });
  if (error) throw error;
  return ((data ?? []) as Array<{
    day_of_week: number;
    is_working: boolean;
    start_time: string | null;
    end_time: string | null;
    use_business_schedule: boolean;
  }>).map(row => ({
    dayOfWeek: row.day_of_week,
    isWorking: row.is_working,
    startTime: row.start_time?.slice(0, 5) ?? '17:00',
    endTime: row.end_time?.slice(0, 5) ?? '23:00',
    useBusinessSchedule: row.use_business_schedule,
  }));
}

export async function saveEmployeeSchedule(params: {
  userId: string;
  useBusinessSchedule: boolean;
  schedule: EmployeeScheduleDay[];
}): Promise<void> {
  const { error } = await supabase.rpc('attendance_admin_save_employee_schedule', {
    p_user_id: params.userId,
    p_use_business_schedule: params.useBusinessSchedule,
    p_schedule: params.schedule.map(day => ({
      dayOfWeek: day.dayOfWeek,
      isWorking: day.isWorking,
      startTime: day.startTime,
      endTime: day.endTime,
    })),
  });
  if (error) throw error;
}

export async function getAttendanceDailySummary(
  startDate: string,
  endDate: string,
): Promise<AttendanceDailySummaryItem[]> {
  const { data, error } = await supabase.rpc('attendance_admin_daily_summary', {
    p_start_date: startDate,
    p_end_date: endDate,
  });
  if (error) throw error;
  return ((data ?? []) as Array<{
    work_date: string;
    user_id: string;
    employee_name: string;
    employee_role: string;
    expected_start: string | null;
    expected_end: string | null;
    clock_in: string | null;
    clock_out: string | null;
    late_minutes: number;
    early_leave_minutes: number;
    overtime_minutes: number;
    day_status: string;
    incident_id: string | null;
    incident_type: string | null;
    incident_status: string | null;
    incident_note: string | null;
  }>).map(row => ({
    workDate: row.work_date,
    userId: row.user_id,
    employeeName: row.employee_name,
    employeeRole: row.employee_role,
    expectedStart: row.expected_start,
    expectedEnd: row.expected_end,
    clockIn: row.clock_in,
    clockOut: row.clock_out,
    lateMinutes: row.late_minutes ?? 0,
    earlyLeaveMinutes: row.early_leave_minutes ?? 0,
    overtimeMinutes: row.overtime_minutes ?? 0,
    dayStatus: row.day_status,
    incidentId: row.incident_id ?? null,
    incidentType: row.incident_type ?? null,
    incidentStatus: row.incident_status ?? null,
    incidentNote: row.incident_note ?? null,
  }));
}

export async function getAttendanceIncidents(params?: {
  startDate?: string | null;
  endDate?: string | null;
  userId?: string | null;
}): Promise<AttendanceIncident[]> {
  const { data, error } = await supabase.rpc('attendance_admin_list_incidents', {
    p_start_date: params?.startDate ?? null,
    p_end_date: params?.endDate ?? null,
    p_user_id: params?.userId ?? null,
  });
  if (error) throw error;
  return ((data ?? []) as Array<{
    id: string;
    user_id: string;
    employee_name: string;
    employee_role: string;
    start_date: string;
    end_date: string;
    incident_type: string;
    status: string;
    note: string;
    admin_note: string | null;
    created_by: string;
    created_by_name: string;
    reviewed_by: string | null;
    reviewed_by_name: string | null;
    reviewed_at: string | null;
    created_at: string;
    updated_at: string;
  }>).map(row => ({
    id: row.id,
    userId: row.user_id,
    employeeName: row.employee_name,
    employeeRole: row.employee_role,
    startDate: row.start_date,
    endDate: row.end_date,
    incidentType: row.incident_type,
    status: row.status,
    note: row.note,
    adminNote: row.admin_note,
    createdBy: row.created_by,
    createdByName: row.created_by_name,
    reviewedBy: row.reviewed_by,
    reviewedByName: row.reviewed_by_name,
    reviewedAt: row.reviewed_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));
}

export async function createAttendanceIncident(params: {
  userId: string;
  startDate: string;
  endDate: string;
  incidentType: string;
  note: string;
  status: 'pending' | 'approved';
  adminNote?: string | null;
}): Promise<void> {
  const { error } = await supabase.rpc('attendance_admin_create_incident', {
    p_user_id: params.userId,
    p_start_date: params.startDate,
    p_end_date: params.endDate,
    p_incident_type: params.incidentType,
    p_note: params.note.trim(),
    p_status: params.status,
    p_admin_note: params.adminNote?.trim() || null,
  });
  if (error) throw error;
}

export async function reviewAttendanceIncident(params: {
  incidentId: string;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';
  adminNote?: string | null;
}): Promise<void> {
  const { error } = await supabase.rpc('attendance_admin_review_incident', {
    p_incident_id: params.incidentId,
    p_status: params.status,
    p_admin_note: params.adminNote?.trim() || null,
  });
  if (error) throw error;
}

export interface AttendancePeriodReportItem {
  userId: string;
  employeeName: string;
  employeeRole: string;
  scheduledDays: number;
  workedDays: number;
  completedDays: number;
  openShifts: number;
  absentDays: number;
  justifiedAbsenceDays: number;
  vacationDays: number;
  medicalLeaveDays: number;
  permissionDays: number;
  lateDays: number;
  justifiedLateDays: number;
  totalLateMinutes: number;
  earlyLeaveDays: number;
  justifiedEarlyLeaveDays: number;
  totalEarlyLeaveMinutes: number;
  overtimeDays: number;
  totalOvertimeMinutes: number;
  totalWorkedMinutes: number;
  totalScheduledMinutes: number;
  balanceMinutes: number;
}

export interface AttendanceReportDay {
  workDate: string;
  userId: string;
  employeeName: string;
  employeeRole: string;
  isWorking: boolean;
  expectedStart: string | null;
  expectedEnd: string | null;
  clockIn: string | null;
  clockOut: string | null;
  workedMinutes: number;
  scheduledMinutes: number;
  lateMinutes: number;
  earlyLeaveMinutes: number;
  overtimeMinutes: number;
  dayStatus: string;
  incidentType: string | null;
  incidentStatus: string | null;
  incidentNote: string | null;
}

export async function getAttendancePeriodReport(params: {
  startDate: string;
  endDate: string;
  userId?: string | null;
}): Promise<AttendancePeriodReportItem[]> {
  const { data, error } = await supabase.rpc('attendance_admin_period_report', {
    p_start_date: params.startDate,
    p_end_date: params.endDate,
    p_user_id: params.userId ?? null,
  });
  if (error) throw error;

  return ((data ?? []) as Array<{
    user_id: string;
    employee_name: string;
    employee_role: string;
    scheduled_days: number;
    worked_days: number;
    completed_days: number;
    open_shifts: number;
    absent_days: number;
    justified_absence_days: number;
    vacation_days: number;
    medical_leave_days: number;
    permission_days: number;
    late_days: number;
    justified_late_days: number;
    total_late_minutes: number;
    early_leave_days: number;
    justified_early_leave_days: number;
    total_early_leave_minutes: number;
    overtime_days: number;
    total_overtime_minutes: number;
    total_worked_minutes: number;
    total_scheduled_minutes: number;
    balance_minutes: number;
  }>).map(row => ({
    userId: row.user_id,
    employeeName: row.employee_name,
    employeeRole: row.employee_role,
    scheduledDays: row.scheduled_days ?? 0,
    workedDays: row.worked_days ?? 0,
    completedDays: row.completed_days ?? 0,
    openShifts: row.open_shifts ?? 0,
    absentDays: row.absent_days ?? 0,
    justifiedAbsenceDays: row.justified_absence_days ?? 0,
    vacationDays: row.vacation_days ?? 0,
    medicalLeaveDays: row.medical_leave_days ?? 0,
    permissionDays: row.permission_days ?? 0,
    lateDays: row.late_days ?? 0,
    justifiedLateDays: row.justified_late_days ?? 0,
    totalLateMinutes: row.total_late_minutes ?? 0,
    earlyLeaveDays: row.early_leave_days ?? 0,
    justifiedEarlyLeaveDays: row.justified_early_leave_days ?? 0,
    totalEarlyLeaveMinutes: row.total_early_leave_minutes ?? 0,
    overtimeDays: row.overtime_days ?? 0,
    totalOvertimeMinutes: row.total_overtime_minutes ?? 0,
    totalWorkedMinutes: row.total_worked_minutes ?? 0,
    totalScheduledMinutes: row.total_scheduled_minutes ?? 0,
    balanceMinutes: row.balance_minutes ?? 0,
  }));
}

export async function getAttendanceReportDays(params: {
  startDate: string;
  endDate: string;
  userId?: string | null;
}): Promise<AttendanceReportDay[]> {
  const { data, error } = await supabase.rpc('attendance_admin_report_days', {
    p_start_date: params.startDate,
    p_end_date: params.endDate,
    p_user_id: params.userId ?? null,
  });
  if (error) throw error;

  return ((data ?? []) as Array<{
    work_date: string;
    user_id: string;
    employee_name: string;
    employee_role: string;
    is_working: boolean;
    expected_start: string | null;
    expected_end: string | null;
    clock_in: string | null;
    clock_out: string | null;
    worked_minutes: number;
    scheduled_minutes: number;
    late_minutes: number;
    early_leave_minutes: number;
    overtime_minutes: number;
    day_status: string;
    incident_type: string | null;
    incident_status: string | null;
    incident_note: string | null;
  }>).map(row => ({
    workDate: row.work_date,
    userId: row.user_id,
    employeeName: row.employee_name,
    employeeRole: row.employee_role,
    isWorking: Boolean(row.is_working),
    expectedStart: row.expected_start,
    expectedEnd: row.expected_end,
    clockIn: row.clock_in,
    clockOut: row.clock_out,
    workedMinutes: row.worked_minutes ?? 0,
    scheduledMinutes: row.scheduled_minutes ?? 0,
    lateMinutes: row.late_minutes ?? 0,
    earlyLeaveMinutes: row.early_leave_minutes ?? 0,
    overtimeMinutes: row.overtime_minutes ?? 0,
    dayStatus: row.day_status,
    incidentType: row.incident_type,
    incidentStatus: row.incident_status,
    incidentNote: row.incident_note,
  }));
}

export type PayrollPayBasis = 'hourly' | 'daily' | 'weekly';

export interface AttendancePayrollSetting {
  userId: string;
  employeeName: string;
  employeeRole: string;
  isActive: boolean;
  configured: boolean;
  payBasis: PayrollPayBasis;
  baseRate: number;
  overtimeMultiplier: number;
  weeklyPaidDays: number;
  deductAbsences: boolean;
  deductLate: boolean;
  deductEarlyLeave: boolean;
  payJustifiedAbsence: boolean;
  payVacation: boolean;
  payMedicalLeave: boolean;
  payPermission: boolean;
}

export interface AttendancePayrollPreviewItem {
  userId: string;
  employeeName: string;
  employeeRole: string;
  configured: boolean;
  payBasis: PayrollPayBasis;
  baseRate: number;
  overtimeMultiplier: number;
  currencyCode: string;
  scheduledDays: number;
  workedDays: number;
  paidLeaveDays: number;
  absentDays: number;
  lateMinutes: number;
  earlyLeaveMinutes: number;
  overtimeMinutes: number;
  openShifts: number;
  scheduledPay: number;
  absenceDeduction: number;
  lateDeduction: number;
  earlyLeaveDeduction: number;
  overtimePay: number;
  totalPay: number;
}

export interface AttendancePayrollRun {
  id: string;
  startDate: string;
  endDate: string;
  status: string;
  currencyCode: string;
  totalAmount: number;
  employeeCount: number;
  paidEmployeeCount: number;
  paidAmount: number;
  notes: string | null;
  createdByName: string;
  createdAt: string;
  voidedAt: string | null;
  voidReason: string | null;
}

export type PayrollPaymentMethod = 'cash' | 'transfer' | 'card' | 'other';

export interface AttendancePayrollRunItem {
  itemId: string;
  userId: string;
  employeeName: string;
  employeeRole: string;
  payBasis: PayrollPayBasis;
  baseRate: number;
  overtimeMultiplier: number;
  scheduledDays: number;
  workedDays: number;
  paidLeaveDays: number;
  absentDays: number;
  lateMinutes: number;
  earlyLeaveMinutes: number;
  overtimeMinutes: number;
  scheduledPay: number;
  absenceDeduction: number;
  lateDeduction: number;
  earlyLeaveDeduction: number;
  overtimePay: number;
  totalPay: number;
  paymentStatus: 'pending' | 'paid';
  paidAt: string | null;
  paymentMethod: PayrollPaymentMethod | null;
  paymentReference: string | null;
  paidByName: string | null;
}

export interface AttendancePayrollRunDetail {
  id: string;
  startDate: string;
  endDate: string;
  status: string;
  currencyCode: string;
  totalAmount: number;
  notes: string | null;
  createdByName: string;
  createdAt: string;
  voidedByName: string | null;
  voidedAt: string | null;
  voidReason: string | null;
  items: AttendancePayrollRunItem[];
}

export async function getAttendancePayrollSettings(): Promise<AttendancePayrollSetting[]> {
  const { data, error } = await supabase.rpc('attendance_admin_get_payroll_settings');
  if (error) throw error;
  return ((data ?? []) as Array<any>).map(row => ({
    userId: row.user_id,
    employeeName: row.employee_name,
    employeeRole: row.employee_role,
    isActive: Boolean(row.is_active),
    configured: Boolean(row.configured),
    payBasis: row.pay_basis as PayrollPayBasis,
    baseRate: Number(row.base_rate ?? 0),
    overtimeMultiplier: Number(row.overtime_multiplier ?? 2),
    weeklyPaidDays: Number(row.weekly_paid_days ?? 6),
    deductAbsences: Boolean(row.deduct_absences),
    deductLate: Boolean(row.deduct_late),
    deductEarlyLeave: Boolean(row.deduct_early_leave),
    payJustifiedAbsence: Boolean(row.pay_justified_absence),
    payVacation: Boolean(row.pay_vacation),
    payMedicalLeave: Boolean(row.pay_medical_leave),
    payPermission: Boolean(row.pay_permission),
  }));
}

export async function saveAttendancePayrollSetting(
  setting: AttendancePayrollSetting,
): Promise<void> {
  const { error } = await supabase.rpc('attendance_admin_save_payroll_setting', {
    p_user_id: setting.userId,
    p_pay_basis: setting.payBasis,
    p_base_rate: setting.baseRate,
    p_overtime_multiplier: setting.overtimeMultiplier,
    p_weekly_paid_days: setting.weeklyPaidDays,
    p_deduct_absences: setting.deductAbsences,
    p_deduct_late: setting.deductLate,
    p_deduct_early_leave: setting.deductEarlyLeave,
    p_pay_justified_absence: setting.payJustifiedAbsence,
    p_pay_vacation: setting.payVacation,
    p_pay_medical_leave: setting.payMedicalLeave,
    p_pay_permission: setting.payPermission,
  });
  if (error) throw error;
}

export async function getAttendancePayrollPreview(params: {
  startDate: string;
  endDate: string;
  userId?: string | null;
}): Promise<AttendancePayrollPreviewItem[]> {
  const { data, error } = await supabase.rpc('attendance_admin_payroll_preview', {
    p_start_date: params.startDate,
    p_end_date: params.endDate,
    p_user_id: params.userId ?? null,
  });
  if (error) throw error;
  return ((data ?? []) as Array<any>).map(row => ({
    userId: row.user_id,
    employeeName: row.employee_name,
    employeeRole: row.employee_role,
    configured: Boolean(row.configured),
    payBasis: row.pay_basis as PayrollPayBasis,
    baseRate: Number(row.base_rate ?? 0),
    overtimeMultiplier: Number(row.overtime_multiplier ?? 2),
    currencyCode: row.currency_code ?? 'MXN',
    scheduledDays: Number(row.scheduled_days ?? 0),
    workedDays: Number(row.worked_days ?? 0),
    paidLeaveDays: Number(row.paid_leave_days ?? 0),
    absentDays: Number(row.absent_days ?? 0),
    lateMinutes: Number(row.late_minutes ?? 0),
    earlyLeaveMinutes: Number(row.early_leave_minutes ?? 0),
    overtimeMinutes: Number(row.overtime_minutes ?? 0),
    openShifts: Number(row.open_shifts ?? 0),
    scheduledPay: Number(row.scheduled_pay ?? 0),
    absenceDeduction: Number(row.absence_deduction ?? 0),
    lateDeduction: Number(row.late_deduction ?? 0),
    earlyLeaveDeduction: Number(row.early_leave_deduction ?? 0),
    overtimePay: Number(row.overtime_pay ?? 0),
    totalPay: Number(row.total_pay ?? 0),
  }));
}

export async function closeAttendancePayrollRun(params: {
  startDate: string;
  endDate: string;
  notes?: string;
}): Promise<string> {
  const { data, error } = await supabase.rpc('attendance_admin_close_payroll_run', {
    p_start_date: params.startDate,
    p_end_date: params.endDate,
    p_notes: params.notes?.trim() || null,
  });
  if (error) throw error;
  return String(data);
}

export async function getAttendancePayrollRuns(limit = 20): Promise<AttendancePayrollRun[]> {
  const { data, error } = await supabase.rpc('attendance_admin_list_payroll_runs', {
    p_limit: limit,
  });
  if (error) throw error;
  return ((data ?? []) as Array<any>).map(row => ({
    id: row.id,
    startDate: row.start_date,
    endDate: row.end_date,
    status: row.status,
    currencyCode: row.currency_code ?? 'MXN',
    totalAmount: Number(row.total_amount ?? 0),
    employeeCount: Number(row.employee_count ?? 0),
    paidEmployeeCount: Number(row.paid_employee_count ?? 0),
    paidAmount: Number(row.paid_amount ?? 0),
    notes: row.notes ?? null,
    createdByName: row.created_by_name,
    createdAt: row.created_at,
    voidedAt: row.voided_at ?? null,
    voidReason: row.void_reason ?? null,
  }));
}

export async function getAttendancePayrollRunDetail(
  payrollRunId: string,
): Promise<AttendancePayrollRunDetail> {
  const { data, error } = await supabase.rpc('attendance_admin_get_payroll_run_detail', {
    p_payroll_run_id: payrollRunId,
  });
  if (error) throw error;

  const rows = (data ?? []) as Array<any>;
  if (rows.length === 0) {
    throw new Error('No se encontró el corte de nómina.');
  }

  const first = rows[0];
  return {
    id: first.run_id,
    startDate: first.start_date,
    endDate: first.end_date,
    status: first.run_status,
    currencyCode: first.currency_code ?? 'MXN',
    totalAmount: Number(first.run_total_amount ?? 0),
    notes: first.run_notes ?? null,
    createdByName: first.created_by_name,
    createdAt: first.created_at,
    voidedByName: first.voided_by_name ?? null,
    voidedAt: first.voided_at ?? null,
    voidReason: first.void_reason ?? null,
    items: rows.map(row => ({
      itemId: row.item_id,
      userId: row.user_id,
      employeeName: row.employee_name,
      employeeRole: row.employee_role,
      payBasis: row.pay_basis as PayrollPayBasis,
      baseRate: Number(row.base_rate ?? 0),
      overtimeMultiplier: Number(row.overtime_multiplier ?? 0),
      scheduledDays: Number(row.scheduled_days ?? 0),
      workedDays: Number(row.worked_days ?? 0),
      paidLeaveDays: Number(row.paid_leave_days ?? 0),
      absentDays: Number(row.absent_days ?? 0),
      lateMinutes: Number(row.late_minutes ?? 0),
      earlyLeaveMinutes: Number(row.early_leave_minutes ?? 0),
      overtimeMinutes: Number(row.overtime_minutes ?? 0),
      scheduledPay: Number(row.scheduled_pay ?? 0),
      absenceDeduction: Number(row.absence_deduction ?? 0),
      lateDeduction: Number(row.late_deduction ?? 0),
      earlyLeaveDeduction: Number(row.early_leave_deduction ?? 0),
      overtimePay: Number(row.overtime_pay ?? 0),
      totalPay: Number(row.total_pay ?? 0),
      paymentStatus: row.payment_status === 'paid' ? 'paid' : 'pending',
      paidAt: row.paid_at ?? null,
      paymentMethod: (row.payment_method ?? null) as PayrollPaymentMethod | null,
      paymentReference: row.payment_reference ?? null,
      paidByName: row.paid_by_name ?? null,
    })),
  };
}

export async function markAttendancePayrollItemPaid(params: {
  itemId: string;
  paymentMethod: PayrollPaymentMethod;
  paymentReference?: string;
  paidAt?: string | null;
}): Promise<void> {
  const { error } = await supabase.rpc('attendance_admin_mark_payroll_item_paid', {
    p_item_id: params.itemId,
    p_payment_method: params.paymentMethod,
    p_payment_reference: params.paymentReference?.trim() || null,
    p_paid_at: params.paidAt ?? null,
  });
  if (error) throw error;

  // El pago no se revierte si el correo falla; queda disponible para reenvío manual.
  const emailResult = await supabase.functions.invoke('attendance-email', {
    body: { action: 'payroll_receipt', itemId: params.itemId },
  });
  if (emailResult.error) {
    console.warn('Pago registrado, pero no se pudo enviar el recibo:', emailResult.error);
  }

  await invokeAttendancePush({
    action: 'payroll',
    itemId: params.itemId,
  });
}

export async function voidAttendancePayrollRun(params: {
  payrollRunId: string;
  reason: string;
}): Promise<void> {
  const { error } = await supabase.rpc('attendance_admin_void_payroll_run', {
    p_payroll_run_id: params.payrollRunId,
    p_reason: params.reason.trim(),
  });
  if (error) throw error;
}

export interface AttendanceEmployeePayrollHistoryItem {
  payrollRunId: string;
  payrollItemId: string;
  startDate: string;
  endDate: string;
  runStatus: string;
  currencyCode: string;
  employeeName: string;
  employeeRole: string;
  payBasis: PayrollPayBasis;
  baseRate: number;
  scheduledDays: number;
  workedDays: number;
  paidLeaveDays: number;
  absentDays: number;
  lateMinutes: number;
  earlyLeaveMinutes: number;
  overtimeMinutes: number;
  scheduledPay: number;
  absenceDeduction: number;
  lateDeduction: number;
  earlyLeaveDeduction: number;
  overtimePay: number;
  totalPay: number;
  paymentStatus: 'pending' | 'paid';
  paidAt: string | null;
  paymentMethod: PayrollPaymentMethod | null;
  paymentReference: string | null;
  paidByName: string | null;
  runCreatedAt: string;
}

export async function getAttendanceEmployeePayrollHistory(params: {
  userId: string;
  startDate?: string | null;
  endDate?: string | null;
}): Promise<AttendanceEmployeePayrollHistoryItem[]> {
  const { data, error } = await supabase.rpc('attendance_admin_employee_payroll_history', {
    p_user_id: params.userId,
    p_start_date: params.startDate ?? null,
    p_end_date: params.endDate ?? null,
  });
  if (error) throw error;
  return ((data ?? []) as Array<any>).map(row => ({
    payrollRunId: row.payroll_run_id,
    payrollItemId: row.payroll_item_id,
    startDate: row.start_date,
    endDate: row.end_date,
    runStatus: row.run_status,
    currencyCode: row.currency_code ?? 'MXN',
    employeeName: row.employee_name,
    employeeRole: row.employee_role,
    payBasis: row.pay_basis as PayrollPayBasis,
    baseRate: Number(row.base_rate ?? 0),
    scheduledDays: Number(row.scheduled_days ?? 0),
    workedDays: Number(row.worked_days ?? 0),
    paidLeaveDays: Number(row.paid_leave_days ?? 0),
    absentDays: Number(row.absent_days ?? 0),
    lateMinutes: Number(row.late_minutes ?? 0),
    earlyLeaveMinutes: Number(row.early_leave_minutes ?? 0),
    overtimeMinutes: Number(row.overtime_minutes ?? 0),
    scheduledPay: Number(row.scheduled_pay ?? 0),
    absenceDeduction: Number(row.absence_deduction ?? 0),
    lateDeduction: Number(row.late_deduction ?? 0),
    earlyLeaveDeduction: Number(row.early_leave_deduction ?? 0),
    overtimePay: Number(row.overtime_pay ?? 0),
    totalPay: Number(row.total_pay ?? 0),
    paymentStatus: row.payment_status === 'paid' ? 'paid' : 'pending',
    paidAt: row.paid_at ?? null,
    paymentMethod: (row.payment_method ?? null) as PayrollPaymentMethod | null,
    paymentReference: row.payment_reference ?? null,
    paidByName: row.paid_by_name ?? null,
    runCreatedAt: row.run_created_at,
  }));
}

/* ============================================================
 * FASE 8 · AUTOSERVICIO DEL EMPLEADO
 * ============================================================ */
export type AttendanceEmployeeRequestType =
  | 'absence_justified'
  | 'late_justified'
  | 'early_leave_justified'
  | 'permission'
  | 'vacation'
  | 'medical_leave'
  | 'other';

export interface AttendanceEmployeeRequest {
  id: string;
  userId: string;
  employeeName: string;
  employeeRole: string;
  startDate: string;
  endDate: string;
  requestType: AttendanceEmployeeRequestType;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';
  note: string;
  adminNote: string | null;
  incidentId: string | null;
  reviewedByName: string | null;
  reviewedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface MyPayrollReceipt {
  payrollRunId: string;
  payrollItemId: string;
  startDate: string;
  endDate: string;
  runStatus: string;
  currencyCode: string;
  employeeName: string;
  employeeRole: string;
  payBasis: PayrollPayBasis;
  baseRate: number;
  scheduledPay: number;
  absenceDeduction: number;
  lateDeduction: number;
  earlyLeaveDeduction: number;
  overtimePay: number;
  totalPay: number;
  paymentStatus: 'pending' | 'paid';
  paidAt: string | null;
  paymentMethod: PayrollPaymentMethod | null;
  paymentReference: string | null;
  emailSentAt: string | null;
}

function mapEmployeeRequest(row: any): AttendanceEmployeeRequest {
  return {
    id: row.id,
    userId: row.user_id,
    employeeName: row.employee_name ?? '',
    employeeRole: row.employee_role ?? '',
    startDate: row.start_date,
    endDate: row.end_date,
    requestType: row.request_type as AttendanceEmployeeRequestType,
    status: row.status,
    note: row.note,
    adminNote: row.admin_note ?? null,
    incidentId: row.incident_id ?? null,
    reviewedByName: row.reviewed_by_name ?? null,
    reviewedAt: row.reviewed_at ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function getMyAttendanceIncidents(): Promise<AttendanceIncident[]> {
  const { data: authData } = await supabase.auth.getUser();
  const userId = authData.user?.id;
  if (!userId) throw new Error('No hay una sesión activa.');

  const { data, error } = await supabase
    .from('attendance_incidents')
    .select('id,user_id,start_date,end_date,incident_type,status,note,admin_note,created_by,reviewed_by,reviewed_at,created_at,updated_at')
    .eq('user_id', userId)
    .order('start_date', { ascending: false })
    .limit(100);
  if (error) throw error;

  return (data ?? []).map((row: any) => ({
    id: row.id,
    userId: row.user_id,
    employeeName: '',
    employeeRole: '',
    startDate: row.start_date,
    endDate: row.end_date,
    incidentType: row.incident_type,
    status: row.status,
    note: row.note,
    adminNote: row.admin_note ?? null,
    createdBy: row.created_by,
    createdByName: '',
    reviewedBy: row.reviewed_by ?? null,
    reviewedByName: null,
    reviewedAt: row.reviewed_at ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));
}

export async function getMyAttendanceRequests(): Promise<AttendanceEmployeeRequest[]> {
  const { data, error } = await supabase.rpc('attendance_my_requests');
  if (error) throw error;
  return (data ?? []).map(mapEmployeeRequest);
}

export async function createMyAttendanceRequest(params: {
  startDate: string;
  endDate: string;
  requestType: AttendanceEmployeeRequestType;
  note: string;
}): Promise<void> {
  const { data, error } = await supabase.rpc('attendance_create_my_request', {
    p_start_date: params.startDate,
    p_end_date: params.endDate,
    p_request_type: params.requestType,
    p_note: params.note.trim(),
  });
  if (error) throw error;

  if (data) {
    await invokeAttendancePush({
      action: 'request',
      requestId: String(data),
    });
  }
}

export async function cancelMyAttendanceRequest(requestId: string): Promise<void> {
  const { error } = await supabase.rpc('attendance_cancel_my_request', {
    p_request_id: requestId,
  });
  if (error) throw error;
}

export async function getAdminAttendanceRequests(): Promise<AttendanceEmployeeRequest[]> {
  const { data, error } = await supabase.rpc('attendance_admin_list_requests');
  if (error) throw error;
  return (data ?? []).map(mapEmployeeRequest);
}

export async function reviewAttendanceEmployeeRequest(params: {
  requestId: string;
  status: 'approved' | 'rejected';
  adminNote?: string;
}): Promise<void> {
  const { error } = await supabase.rpc('attendance_admin_review_request', {
    p_request_id: params.requestId,
    p_status: params.status,
    p_admin_note: params.adminNote?.trim() || null,
  });
  if (error) throw error;

  const emailResult = await supabase.functions.invoke('attendance-email', {
    body: { action: 'request_status', requestId: params.requestId },
  });
  if (emailResult.error) {
    console.warn('Solicitud resuelta, pero no se pudo enviar el correo:', emailResult.error);
  }

  await invokeAttendancePush({
    action: 'request',
    requestId: params.requestId,
  });
}

export async function getMyPayrollReceipts(): Promise<MyPayrollReceipt[]> {
  const { data, error } = await supabase.rpc('attendance_my_payroll_receipts');
  if (error) throw error;
  return ((data ?? []) as any[]).map(row => ({
    payrollRunId: row.payroll_run_id,
    payrollItemId: row.payroll_item_id,
    startDate: row.start_date,
    endDate: row.end_date,
    runStatus: row.run_status,
    currencyCode: row.currency_code ?? 'MXN',
    employeeName: row.employee_name,
    employeeRole: row.employee_role,
    payBasis: row.pay_basis as PayrollPayBasis,
    baseRate: Number(row.base_rate ?? 0),
    scheduledPay: Number(row.scheduled_pay ?? 0),
    absenceDeduction: Number(row.absence_deduction ?? 0),
    lateDeduction: Number(row.late_deduction ?? 0),
    earlyLeaveDeduction: Number(row.early_leave_deduction ?? 0),
    overtimePay: Number(row.overtime_pay ?? 0),
    totalPay: Number(row.total_pay ?? 0),
    paymentStatus: row.payment_status === 'paid' ? 'paid' : 'pending',
    paidAt: row.paid_at ?? null,
    paymentMethod: (row.payment_method ?? null) as PayrollPaymentMethod | null,
    paymentReference: row.payment_reference ?? null,
    emailSentAt: row.email_sent_at ?? null,
  }));
}

export async function sendPayrollReceiptEmail(itemId: string): Promise<void> {
  const { error } = await supabase.functions.invoke('attendance-email', {
    body: { action: 'payroll_receipt', itemId },
  });
  if (error) throw error;
}

/* ============================================================
 * FASE 9 · CENTRO DE NOTIFICACIONES LABORALES
 * ============================================================ */
export type AttendanceNotificationSeverity =
  | 'info'
  | 'success'
  | 'warning'
  | 'danger';

export interface AttendanceNotificationItem {
  id: string;
  notificationType: string;
  title: string;
  message: string;
  severity: AttendanceNotificationSeverity;
  relatedUserId: string | null;
  requestId: string | null;
  payrollItemId: string | null;
  attendanceRecordId: string | null;
  workDate: string | null;
  readAt: string | null;
  pushedAt: string | null;
  createdAt: string;
}

function mapAttendanceNotification(row: any): AttendanceNotificationItem {
  return {
    id: row.id,
    notificationType: row.notification_type,
    title: row.title,
    message: row.message,
    severity: (row.severity ?? 'info') as AttendanceNotificationSeverity,
    relatedUserId: row.related_user_id ?? null,
    requestId: row.request_id ?? null,
    payrollItemId: row.payroll_item_id ?? null,
    attendanceRecordId: row.attendance_record_id ?? null,
    workDate: row.work_date ?? null,
    readAt: row.read_at ?? null,
    pushedAt: row.pushed_at ?? null,
    createdAt: row.created_at,
  };
}

async function invokeAttendancePush(body: Record<string, unknown>): Promise<void> {
  const result = await supabase.functions.invoke('attendance-push', { body });
  if (result.error) {
    console.warn('La notificación quedó guardada, pero el push no pudo enviarse:', result.error);
  }
}

export async function syncAttendanceNotifications(): Promise<void> {
  const { error: executionError } = await supabase.rpc(
    'attendance_sync_shift_execution_alerts',
  );
  if (executionError) throw executionError;

  const { error } = await supabase.rpc('attendance_sync_notifications');
  if (error) throw error;

  await invokeAttendancePush({ action: 'my_pending' });
}

export async function getMyAttendanceNotifications(
  limit = 80,
): Promise<AttendanceNotificationItem[]> {
  const { data, error } = await supabase.rpc('attendance_my_notifications', {
    p_limit: limit,
  });
  if (error) throw error;
  return ((data ?? []) as any[]).map(mapAttendanceNotification);
}

export async function markAttendanceNotificationRead(
  notificationId: string,
): Promise<void> {
  const { error } = await supabase.rpc('attendance_mark_notification_read', {
    p_notification_id: notificationId,
  });
  if (error) throw error;
}

export async function markAllAttendanceNotificationsRead(): Promise<void> {
  const { error } = await supabase.rpc('attendance_mark_all_notifications_read');
  if (error) throw error;
}

/* ============================================================
 * FASE 10 · PREFERENCIAS DE PUSH LABORAL
 * ============================================================ */
export interface AttendanceNotificationPreferences {
  clockReminders: boolean;
  requestUpdates: boolean;
  payrollUpdates: boolean;
  shiftUpdates: boolean;
}

export async function getAttendanceNotificationPreferences():
  Promise<AttendanceNotificationPreferences> {
  const { data, error } =
    await supabase.rpc(
      'attendance_get_notification_preferences',
    );

  if (error) {
    throw error;
  }

  const row =
    Array.isArray(data)
      ? data[0]
      : data;

  return {
    clockReminders:
      row?.clock_reminders !== false,
    requestUpdates:
      row?.request_updates !== false,
    payrollUpdates:
      row?.payroll_updates !== false,
    shiftUpdates:
      row?.shift_updates !== false,
  };
}

export async function saveAttendanceNotificationPreferences(
  preferences:
    AttendanceNotificationPreferences,
): Promise<void> {
  const { error } =
    await supabase.rpc(
      'attendance_save_notification_preferences',
      {
        p_clock_reminders:
          preferences.clockReminders,
        p_request_updates:
          preferences.requestUpdates,
        p_payroll_updates:
          preferences.payrollUpdates,
        p_shift_updates:
          preferences.shiftUpdates,
      },
    );

  if (error) {
    throw error;
  }
}

/* ============================================================
 * FASE 11 · AUDITORÍA Y CIERRE OPERATIVO
 * ============================================================ */
export interface AttendancePeriodLock {
  id: string;
  startDate: string;
  endDate: string;
  reason: string;
  isLocked: boolean;
  lockedByName: string;
  lockedAt: string;
  reopenedByName: string | null;
  reopenedAt: string | null;
  reopenReason: string | null;
}

export interface AttendanceAuditLogItem {
  id: number;
  occurredAt: string;
  actorUserId: string | null;
  actorName: string;
  entityType: string;
  entityId: string | null;
  action: string;
  workDate: string | null;
  employeeUserId: string | null;
  employeeName: string | null;
  reason: string | null;
  oldData: Record<string, unknown> | null;
  newData: Record<string, unknown> | null;
  metadata: Record<string, unknown>;
}

export async function getAttendancePeriodLocks(): Promise<AttendancePeriodLock[]> {
  const { data, error } = await supabase.rpc('attendance_admin_list_period_locks');
  if (error) throw error;
  return ((data ?? []) as any[]).map(row => ({
    id: row.id,
    startDate: row.start_date,
    endDate: row.end_date,
    reason: row.reason,
    isLocked: Boolean(row.is_locked),
    lockedByName: row.locked_by_name ?? 'Administrador',
    lockedAt: row.locked_at,
    reopenedByName: row.reopened_by_name ?? null,
    reopenedAt: row.reopened_at ?? null,
    reopenReason: row.reopen_reason ?? null,
  }));
}

export async function lockAttendancePeriod(params: {
  startDate: string;
  endDate: string;
  reason: string;
}): Promise<string> {
  const { data, error } = await supabase.rpc('attendance_admin_lock_period', {
    p_start_date: params.startDate,
    p_end_date: params.endDate,
    p_reason: params.reason.trim(),
  });
  if (error) throw error;
  return String(data);
}

export async function reopenAttendancePeriod(params: {
  lockId: string;
  reason: string;
}): Promise<void> {
  const { error } = await supabase.rpc('attendance_admin_reopen_period', {
    p_lock_id: params.lockId,
    p_reason: params.reason.trim(),
  });
  if (error) throw error;
}

export async function getAttendanceAuditLog(params?: {
  startAt?: string | null;
  endAt?: string | null;
  employeeUserId?: string | null;
  entityType?: string | null;
  limit?: number;
}): Promise<AttendanceAuditLogItem[]> {
  const { data, error } = await supabase.rpc('attendance_admin_audit_log', {
    p_start_at: params?.startAt ?? null,
    p_end_at: params?.endAt ?? null,
    p_employee_user_id: params?.employeeUserId ?? null,
    p_entity_type: params?.entityType ?? null,
    p_limit: params?.limit ?? 500,
  });
  if (error) throw error;
  return ((data ?? []) as any[]).map(row => ({
    id: Number(row.id),
    occurredAt: row.occurred_at,
    actorUserId: row.actor_user_id ?? null,
    actorName: row.actor_name ?? 'Sistema',
    entityType: row.entity_type,
    entityId: row.entity_id ?? null,
    action: row.action,
    workDate: row.work_date ?? null,
    employeeUserId: row.employee_user_id ?? null,
    employeeName: row.employee_name ?? null,
    reason: row.reason ?? null,
    oldData: row.old_data ?? null,
    newData: row.new_data ?? null,
    metadata: row.metadata ?? {},
  }));
}

/* ============================================================
 * FASE 13 · PLANEACIÓN Y PREVENCIÓN
 * ============================================================ */
export interface AttendancePreventionSettings {
  historyDays: number;
  lookaheadDays: number;
  minimumStaffPerDay: number;
  overtimeRiskMinutes: number;
  absenceRiskDays: number;
  lateRiskDays: number;
  negativeBalanceRiskMinutes: number;
}

export async function getAttendancePreventionSettings():
  Promise<AttendancePreventionSettings> {
  const { data, error } = await supabase.rpc(
    'attendance_admin_get_prevention_settings',
  );
  if (error) throw error;

  const row = Array.isArray(data) ? data[0] : data;
  return {
    historyDays: Number(row?.history_days ?? 28),
    lookaheadDays: Number(row?.lookahead_days ?? 14),
    minimumStaffPerDay: Number(row?.minimum_staff_per_day ?? 2),
    overtimeRiskMinutes: Number(row?.overtime_risk_minutes ?? 180),
    absenceRiskDays: Number(row?.absence_risk_days ?? 2),
    lateRiskDays: Number(row?.late_risk_days ?? 3),
    negativeBalanceRiskMinutes: Number(row?.negative_balance_risk_minutes ?? 240),
  };
}

export async function saveAttendancePreventionSettings(
  settings: AttendancePreventionSettings,
): Promise<void> {
  const { error } = await supabase.rpc(
    'attendance_admin_save_prevention_settings',
    {
      p_history_days: settings.historyDays,
      p_lookahead_days: settings.lookaheadDays,
      p_minimum_staff_per_day: settings.minimumStaffPerDay,
      p_overtime_risk_minutes: settings.overtimeRiskMinutes,
      p_absence_risk_days: settings.absenceRiskDays,
      p_late_risk_days: settings.lateRiskDays,
      p_negative_balance_risk_minutes: settings.negativeBalanceRiskMinutes,
    },
  );
  if (error) throw error;
}

/* ============================================================
 * FASE 14 · PLANEACIÓN DE PERSONAL BASADA EN VENTAS
 * ============================================================ */
export interface AttendanceSalesPlanningSettings {
  historyDays: number;
  lookaheadDays: number;
  minimumStaffPerHour: number;
  ordersPerStaffHour: number;
  revenuePerStaffHour: number;
}

export interface AttendanceSalesHourlyProfile {
  dayOfWeek: number;
  hourOfDay: number;
  sampleDays: number;
  ordersTotal: number;
  revenueTotal: number;
  averageOrders: number;
  averageRevenue: number;
}

export async function getAttendanceSalesPlanningSettings():
  Promise<AttendanceSalesPlanningSettings> {
  const { data, error } = await supabase.rpc(
    'attendance_admin_get_sales_planning_settings',
  );
  if (error) throw error;

  const row = Array.isArray(data) ? data[0] : data;
  return {
    historyDays: Number(row?.history_days ?? 56),
    lookaheadDays: Number(row?.lookahead_days ?? 14),
    minimumStaffPerHour: Number(row?.minimum_staff_per_hour ?? 1),
    ordersPerStaffHour: Number(row?.orders_per_staff_hour ?? 8),
    revenuePerStaffHour: Number(row?.revenue_per_staff_hour ?? 600),
  };
}

export async function saveAttendanceSalesPlanningSettings(
  settings: AttendanceSalesPlanningSettings,
): Promise<void> {
  const { error } = await supabase.rpc(
    'attendance_admin_save_sales_planning_settings',
    {
      p_history_days: settings.historyDays,
      p_lookahead_days: settings.lookaheadDays,
      p_minimum_staff_per_hour: settings.minimumStaffPerHour,
      p_orders_per_staff_hour: settings.ordersPerStaffHour,
      p_revenue_per_staff_hour: settings.revenuePerStaffHour,
    },
  );
  if (error) throw error;
}

export async function getAttendanceSalesHourlyProfile(params: {
  startDate: string;
  endDate: string;
}): Promise<AttendanceSalesHourlyProfile[]> {
  const { data, error } = await supabase.rpc(
    'attendance_admin_sales_hourly_profile',
    {
      p_start_date: params.startDate,
      p_end_date: params.endDate,
    },
  );
  if (error) throw error;

  return ((data ?? []) as Array<{
    day_of_week: number;
    hour_of_day: number;
    sample_days: number;
    orders_total: number | string;
    revenue_total: number | string;
    average_orders: number | string;
    average_revenue: number | string;
  }>).map(row => ({
    dayOfWeek: Number(row.day_of_week),
    hourOfDay: Number(row.hour_of_day),
    sampleDays: Number(row.sample_days ?? 0),
    ordersTotal: Number(row.orders_total ?? 0),
    revenueTotal: Number(row.revenue_total ?? 0),
    averageOrders: Number(row.average_orders ?? 0),
    averageRevenue: Number(row.average_revenue ?? 0),
  }));
}

/* ============================================================
 * FASE 15 · BORRADORES DE TURNOS INTELIGENTES
 * ============================================================ */
export interface AttendanceShiftDraftSettings {
  maxWeeklyHours: number;
  maxDailyHours: number;
  minimumShiftHours: number;
  maximumShiftHours: number;
}

export type AttendanceShiftDraftStatus =
  | 'draft'
  | 'approved'
  | 'discarded';

export interface AttendanceShiftDraft {
  id: string;
  weekStart: string;
  weekEnd: string;
  version: number;
  status: AttendanceShiftDraftStatus;
  generatedAt: string;
  generatedBy: string;
  approvedAt: string | null;
  approvedBy: string | null;
  discardedAt: string | null;
  discardedBy: string | null;
  notes: string;
}

export interface AttendanceShiftDraftItem {
  id: string;
  draftId: string;
  userId: string;
  employeeName: string;
  employeeRole: string;
  workDate: string;
  startTime: string;
  endTime: string;
  plannedMinutes: number;
  demandHoursCovered: number;
  rationale: string;
}

export async function getAttendanceShiftDraftSettings():
  Promise<AttendanceShiftDraftSettings> {
  const { data, error } = await supabase.rpc(
    'attendance_admin_get_shift_draft_settings',
  );
  if (error) throw error;
  const row = Array.isArray(data) ? data[0] : data;
  return {
    maxWeeklyHours: Number(row?.max_weekly_hours ?? 48),
    maxDailyHours: Number(row?.max_daily_hours ?? 10),
    minimumShiftHours: Number(row?.minimum_shift_hours ?? 4),
    maximumShiftHours: Number(row?.maximum_shift_hours ?? 10),
  };
}

export async function saveAttendanceShiftDraftSettings(
  settings: AttendanceShiftDraftSettings,
): Promise<void> {
  const { error } = await supabase.rpc(
    'attendance_admin_save_shift_draft_settings',
    {
      p_max_weekly_hours: settings.maxWeeklyHours,
      p_max_daily_hours: settings.maxDailyHours,
      p_minimum_shift_hours: settings.minimumShiftHours,
      p_maximum_shift_hours: settings.maximumShiftHours,
    },
  );
  if (error) throw error;
}

export async function createAttendanceShiftDraft(params: {
  weekStart: string;
  notes?: string;
  items: Array<{
    userId: string;
    workDate: string;
    startTime: string;
    endTime: string;
    demandHoursCovered: number;
    rationale: string;
  }>;
}): Promise<string> {
  const { data, error } = await supabase.rpc(
    'attendance_admin_create_shift_draft',
    {
      p_week_start: params.weekStart,
      p_notes: params.notes?.trim() || null,
      p_items: params.items.map(item => ({
        userId: item.userId,
        workDate: item.workDate,
        startTime: item.startTime,
        endTime: item.endTime,
        demandHoursCovered: item.demandHoursCovered,
        rationale: item.rationale,
      })),
    },
  );
  if (error) throw error;
  return String(data);
}

export async function getAttendanceShiftDrafts(): Promise<AttendanceShiftDraft[]> {
  const { data, error } = await supabase.rpc(
    'attendance_admin_list_shift_drafts',
  );
  if (error) throw error;
  return ((data ?? []) as any[]).map(row => ({
    id: row.id,
    weekStart: row.week_start,
    weekEnd: row.week_end,
    version: Number(row.version ?? 1),
    status: row.status as AttendanceShiftDraftStatus,
    generatedAt: row.generated_at,
    generatedBy: row.generated_by_name ?? '',
    approvedAt: row.approved_at ?? null,
    approvedBy: row.approved_by_name ?? null,
    discardedAt: row.discarded_at ?? null,
    discardedBy: row.discarded_by_name ?? null,
    notes: row.notes ?? '',
  }));
}

export async function getAttendanceShiftDraftItems(
  draftId: string,
): Promise<AttendanceShiftDraftItem[]> {
  const { data, error } = await supabase.rpc(
    'attendance_admin_get_shift_draft_items',
    { p_draft_id: draftId },
  );
  if (error) throw error;
  return ((data ?? []) as any[]).map(row => ({
    id: row.id,
    draftId: row.draft_id,
    userId: row.user_id,
    employeeName: row.employee_name,
    employeeRole: row.employee_role,
    workDate: row.work_date,
    startTime: String(row.start_time ?? '').slice(0, 5),
    endTime: String(row.end_time ?? '').slice(0, 5),
    plannedMinutes: Number(row.planned_minutes ?? 0),
    demandHoursCovered: Number(row.demand_hours_covered ?? 0),
    rationale: row.rationale ?? '',
  }));
}

export async function updateAttendanceShiftDraftItem(params: {
  itemId: string;
  startTime: string;
  endTime: string;
  rationale?: string;
}): Promise<void> {
  const { error } = await supabase.rpc(
    'attendance_admin_update_shift_draft_item',
    {
      p_item_id: params.itemId,
      p_start_time: params.startTime,
      p_end_time: params.endTime,
      p_rationale: params.rationale?.trim() || null,
    },
  );
  if (error) throw error;
}

export async function approveAttendanceShiftDraft(
  draftId: string,
): Promise<void> {
  const { error } = await supabase.rpc(
    'attendance_admin_approve_shift_draft',
    { p_draft_id: draftId },
  );
  if (error) throw error;
}

export async function discardAttendanceShiftDraft(
  draftId: string,
): Promise<void> {
  const { error } = await supabase.rpc(
    'attendance_admin_discard_shift_draft',
    { p_draft_id: draftId },
  );
  if (error) throw error;
}

export async function getApprovedAttendanceWeeklyPlan(params: {
  startDate: string;
  endDate: string;
}): Promise<AttendanceShiftDraftItem[]> {
  const { data, error } = await supabase.rpc(
    'attendance_admin_list_approved_weekly_plan',
    {
      p_start_date: params.startDate,
      p_end_date: params.endDate,
    },
  );
  if (error) throw error;
  return ((data ?? []) as any[]).map(row => ({
    id: row.id,
    draftId: row.draft_id,
    userId: row.user_id,
    employeeName: row.employee_name,
    employeeRole: row.employee_role,
    workDate: row.work_date,
    startTime: String(row.start_time ?? '').slice(0, 5),
    endTime: String(row.end_time ?? '').slice(0, 5),
    plannedMinutes: Number(row.planned_minutes ?? 0),
    demandHoursCovered: Number(row.demand_hours_covered ?? 0),
    rationale: row.rationale ?? '',
  }));
}

/* ============================================================
 * FASE 16 · PUBLICACIÓN Y COMUNICACIÓN DE TURNOS
 * ============================================================ */
export interface AttendanceShiftPublicationStatus {
  currentRevision: number;
  publishedRevision: number;
  publishedAt: string | null;
  publishedBy: string | null;
  employeesCount: number;
  acknowledgedCount: number;
}

export interface MyPublishedShift {
  publicationId: string;
  publicationItemId: string;
  draftId: string;
  revision: number;
  publishedAt: string;
  weekStart: string;
  weekEnd: string;
  workDate: string;
  startTime: string;
  endTime: string;
  plannedMinutes: number;
  rationale: string;
  acknowledgedAt: string | null;
}

export async function getAttendanceShiftPublicationStatus(
  draftId: string,
): Promise<AttendanceShiftPublicationStatus> {
  const { data, error } = await supabase.rpc(
    'attendance_admin_get_shift_publication_status',
    { p_draft_id: draftId },
  );
  if (error) throw error;

  const row = Array.isArray(data) ? data[0] : data;

  return {
    currentRevision: Number(row?.current_revision ?? 1),
    publishedRevision: Number(row?.published_revision ?? 0),
    publishedAt: row?.published_at ?? null,
    publishedBy: row?.published_by_name ?? null,
    employeesCount: Number(row?.employees_count ?? 0),
    acknowledgedCount: Number(row?.acknowledged_count ?? 0),
  };
}

export async function publishAttendanceShiftPlan(
  draftId: string,
): Promise<void> {
  const { error } = await supabase.rpc(
    'attendance_admin_publish_shift_plan',
    { p_draft_id: draftId },
  );
  if (error) throw error;

  /* El plan ya quedó publicado aunque el push falle. */
  try {
    const { error: pushError } = await supabase.functions.invoke(
      'attendance-push',
      {
        body: {
          action: 'shift_plan',
          draftId,
        },
      },
    );

    if (pushError) {
      console.warn(
        'El plan se publicó, pero no se pudo enviar el push:',
        pushError,
      );
    }
  } catch (pushError) {
    console.warn(
      'El plan se publicó, pero falló el envío de push:',
      pushError,
    );
  }
}

export async function updateApprovedAttendanceShiftItem(params: {
  itemId: string;
  startTime: string;
  endTime: string;
  rationale?: string;
}): Promise<void> {
  const { error } = await supabase.rpc(
    'attendance_admin_update_approved_shift_item',
    {
      p_item_id: params.itemId,
      p_start_time: params.startTime,
      p_end_time: params.endTime,
      p_rationale: params.rationale?.trim() || null,
    },
  );
  if (error) throw error;
}

export async function getMyPublishedAttendanceSchedule(
  daysAhead = 60,
): Promise<MyPublishedShift[]> {
  const today = new Date();
  const pad = (value: number) => String(value).padStart(2, '0');
  const toDate = (date: Date) =>
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

  const end = new Date(today);
  end.setDate(end.getDate() + Math.max(7, Math.min(daysAhead, 180)));

  const { data, error } = await supabase.rpc(
    'attendance_my_published_schedule',
    {
      p_from_date: toDate(today),
      p_to_date: toDate(end),
    },
  );
  if (error) throw error;

  return ((data ?? []) as any[]).map(row => ({
    publicationId: row.publication_id,
    publicationItemId: row.publication_item_id,
    draftId: row.draft_id,
    revision: Number(row.revision ?? 1),
    publishedAt: row.published_at,
    weekStart: row.week_start,
    weekEnd: row.week_end,
    workDate: row.work_date,
    startTime: String(row.start_time ?? '').slice(0, 5),
    endTime: String(row.end_time ?? '').slice(0, 5),
    plannedMinutes: Number(row.planned_minutes ?? 0),
    rationale: row.rationale ?? '',
    acknowledgedAt: row.acknowledged_at ?? null,
  }));
}

export async function acknowledgeAttendanceShiftPublication(
  publicationId: string,
): Promise<void> {
  const { error } = await supabase.rpc(
    'attendance_my_acknowledge_shift_publication',
    { p_publication_id: publicationId },
  );
  if (error) throw error;
}

/* ============================================================
 * FASE 17 · CAMBIOS DE TURNO Y COBERTURAS
 * ============================================================ */
export type AttendanceShiftChangeType =
  | 'change'
  | 'release'
  | 'swap';

export type AttendanceShiftChangeStatus =
  | 'open'
  | 'approved'
  | 'rejected'
  | 'cancelled';

export interface AttendanceCoverageAvailabilityDay {
  dayOfWeek: number;
  isAvailable: boolean;
  startTime: string;
  endTime: string;
}

export interface AttendanceShiftChangeRequest {
  id: string;
  requestType: AttendanceShiftChangeType;
  status: AttendanceShiftChangeStatus;
  requesterUserId: string;
  requesterName: string;
  sourcePublicationId: string;
  sourcePublicationItemId: string;
  sourceDraftId: string;
  workDate: string;
  startTime: string;
  endTime: string;
  desiredStartTime: string | null;
  desiredEndTime: string | null;
  reason: string;
  adminNote: string;
  selectedOfferId: string | null;
  selectedOffererName: string | null;
  offersCount: number;
  createdAt: string;
  reviewedAt: string | null;
}

export interface AttendanceShiftChangeOffer {
  id: string;
  requestId: string;
  offeredBy: string;
  offererName: string;
  offeredPublicationItemId: string | null;
  offeredWorkDate: string | null;
  offeredStartTime: string | null;
  offeredEndTime: string | null;
  createdAt: string;
}

function mapShiftChangeRequest(row: any): AttendanceShiftChangeRequest {
  return {
    id: row.id,
    requestType: row.request_type as AttendanceShiftChangeType,
    status: row.status as AttendanceShiftChangeStatus,
    requesterUserId: row.requester_user_id,
    requesterName: row.requester_name ?? '',
    sourcePublicationId: row.source_publication_id,
    sourcePublicationItemId: row.source_publication_item_id,
    sourceDraftId: row.source_draft_id,
    workDate: row.work_date,
    startTime: String(row.start_time ?? '').slice(0, 5),
    endTime: String(row.end_time ?? '').slice(0, 5),
    desiredStartTime: row.desired_start_time
      ? String(row.desired_start_time).slice(0, 5)
      : null,
    desiredEndTime: row.desired_end_time
      ? String(row.desired_end_time).slice(0, 5)
      : null,
    reason: row.reason ?? '',
    adminNote: row.admin_note ?? '',
    selectedOfferId: row.selected_offer_id ?? null,
    selectedOffererName: row.selected_offerer_name ?? null,
    offersCount: Number(row.offers_count ?? 0),
    createdAt: row.created_at,
    reviewedAt: row.reviewed_at ?? null,
  };
}

function mapShiftChangeOffer(row: any): AttendanceShiftChangeOffer {
  return {
    id: row.id,
    requestId: row.request_id,
    offeredBy: row.offered_by,
    offererName: row.offerer_name ?? '',
    offeredPublicationItemId: row.offered_publication_item_id ?? null,
    offeredWorkDate: row.offered_work_date ?? null,
    offeredStartTime: row.offered_start_time
      ? String(row.offered_start_time).slice(0, 5)
      : null,
    offeredEndTime: row.offered_end_time
      ? String(row.offered_end_time).slice(0, 5)
      : null,
    createdAt: row.created_at,
  };
}

export async function getMyCoverageAvailability():
  Promise<AttendanceCoverageAvailabilityDay[]> {
  const { data, error } = await supabase.rpc(
    'attendance_my_get_coverage_availability',
  );
  if (error) throw error;

  return ((data ?? []) as any[]).map(row => ({
    dayOfWeek: Number(row.day_of_week),
    isAvailable: Boolean(row.is_available),
    startTime: String(row.start_time ?? '08:00').slice(0, 5),
    endTime: String(row.end_time ?? '23:00').slice(0, 5),
  }));
}

export async function saveMyCoverageAvailability(
  schedule: AttendanceCoverageAvailabilityDay[],
): Promise<void> {
  const { error } = await supabase.rpc(
    'attendance_my_save_coverage_availability',
    {
      p_schedule: schedule.map(day => ({
        dayOfWeek: day.dayOfWeek,
        isAvailable: day.isAvailable,
        startTime: day.startTime,
        endTime: day.endTime,
      })),
    },
  );
  if (error) throw error;
}

export async function createMyShiftChangeRequest(params: {
  publicationItemId: string;
  requestType: AttendanceShiftChangeType;
  reason: string;
  desiredStartTime?: string | null;
  desiredEndTime?: string | null;
}): Promise<string> {
  const { data, error } = await supabase.rpc(
    'attendance_my_create_shift_change_request',
    {
      p_publication_item_id: params.publicationItemId,
      p_request_type: params.requestType,
      p_reason: params.reason.trim(),
      p_desired_start_time: params.desiredStartTime || null,
      p_desired_end_time: params.desiredEndTime || null,
    },
  );
  if (error) throw error;

  const requestId = String(data);

  try {
    await supabase.functions.invoke('attendance-push', {
      body: { action: 'shift_change', requestId },
    });
  } catch (pushError) {
    console.warn('Solicitud creada, pero falló el push:', pushError);
  }

  return requestId;
}

export async function cancelMyShiftChangeRequest(
  requestId: string,
): Promise<void> {
  const { error } = await supabase.rpc(
    'attendance_my_cancel_shift_change_request',
    { p_request_id: requestId },
  );
  if (error) throw error;
}

export async function getMyShiftChangeRequests():
  Promise<AttendanceShiftChangeRequest[]> {
  const { data, error } = await supabase.rpc(
    'attendance_my_shift_change_requests',
  );
  if (error) throw error;
  return ((data ?? []) as any[]).map(mapShiftChangeRequest);
}

export async function getAvailableShiftCoverageRequests():
  Promise<AttendanceShiftChangeRequest[]> {
  const { data, error } = await supabase.rpc(
    'attendance_shift_change_marketplace',
  );
  if (error) throw error;
  return ((data ?? []) as any[]).map(mapShiftChangeRequest);
}

export async function offerShiftCoverage(params: {
  requestId: string;
  offeredPublicationItemId?: string | null;
}): Promise<void> {
  const { error } = await supabase.rpc(
    'attendance_my_offer_shift_change',
    {
      p_request_id: params.requestId,
      p_offered_publication_item_id:
        params.offeredPublicationItemId || null,
    },
  );
  if (error) throw error;

  try {
    await supabase.functions.invoke('attendance-push', {
      body: {
        action: 'shift_change',
        requestId: params.requestId,
      },
    });
  } catch (pushError) {
    console.warn('Oferta registrada, pero falló el push:', pushError);
  }
}

export async function getAdminShiftChangeRequests():
  Promise<AttendanceShiftChangeRequest[]> {
  const { data, error } = await supabase.rpc(
    'attendance_admin_shift_change_requests',
  );
  if (error) throw error;
  return ((data ?? []) as any[]).map(mapShiftChangeRequest);
}

export async function getShiftChangeOffers(
  requestId: string,
): Promise<AttendanceShiftChangeOffer[]> {
  const { data, error } = await supabase.rpc(
    'attendance_admin_shift_change_offers',
    { p_request_id: requestId },
  );
  if (error) throw error;
  return ((data ?? []) as any[]).map(mapShiftChangeOffer);
}

export async function reviewShiftChangeRequest(params: {
  requestId: string;
  approve: boolean;
  selectedOfferId?: string | null;
  adminNote?: string;
}): Promise<{ draftId: string | null }> {
  const { data, error } = await supabase.rpc(
    'attendance_admin_review_shift_change_request',
    {
      p_request_id: params.requestId,
      p_approve: params.approve,
      p_selected_offer_id: params.selectedOfferId || null,
      p_admin_note: params.adminNote?.trim() || null,
    },
  );
  if (error) throw error;

  const row = Array.isArray(data) ? data[0] : data;
  const draftId = row?.draft_id ?? null;

  try {
    await supabase.functions.invoke('attendance-push', {
      body: {
        action: 'shift_change',
        requestId: params.requestId,
      },
    });

    if (params.approve && draftId) {
      await supabase.functions.invoke('attendance-push', {
        body: {
          action: 'shift_plan',
          draftId,
        },
      });
    }
  } catch (pushError) {
    console.warn(
      'El cambio quedó resuelto, pero falló algún push:',
      pushError,
    );
  }

  return { draftId };
}

/* ============================================================
 * FASE 18 · EJECUCIÓN REAL VS TURNO PUBLICADO
 * ============================================================ */
export type AttendanceShiftExecutionStatus =
  | 'pending'
  | 'in_progress'
  | 'completed'
  | 'missing_clock_in'
  | 'absent'
  | 'late'
  | 'early_leave'
  | 'late_early_leave'
  | 'overtime'
  | 'open_shift'
  | 'outside_shift';

export interface AttendanceShiftExecutionItem {
  publicationItemId: string;
  publicationId: string;
  draftId: string;
  userId: string;
  employeeName: string;
  employeeRole: string;
  workDate: string;
  expectedStart: string;
  expectedEnd: string;
  clockIn: string | null;
  clockOut: string | null;
  status: AttendanceShiftExecutionStatus;
  lateMinutes: number;
  earlyLeaveMinutes: number;
  overtimeMinutes: number;
  plannedMinutes: number;
  workedMinutes: number;
  varianceMinutes: number;
  changeKind: 'coverage' | 'swap' | null;
  alertId: string | null;
  alertType: string | null;
  alertSeverity: string | null;
  alertTitle: string | null;
  alertMessage: string | null;
  alertReviewedAt: string | null;
  alertReviewedByName: string | null;
  alertAdminNote: string | null;
}

export async function syncAttendanceShiftExecution(): Promise<void> {
  const { error } = await supabase.rpc(
    'attendance_sync_shift_execution_alerts',
  );
  if (error) throw error;
}

export async function getAdminShiftExecutionDashboard(params: {
  startDate: string;
  endDate: string;
  onlyIssues?: boolean;
}): Promise<AttendanceShiftExecutionItem[]> {
  const { data, error } = await supabase.rpc(
    'attendance_admin_shift_execution_dashboard',
    {
      p_start_date: params.startDate,
      p_end_date: params.endDate,
      p_only_issues: params.onlyIssues ?? false,
    },
  );
  if (error) throw error;

  return ((data ?? []) as any[]).map(row => ({
    publicationItemId: row.publication_item_id,
    publicationId: row.publication_id,
    draftId: row.draft_id,
    userId: row.user_id,
    employeeName: row.employee_name ?? '',
    employeeRole: row.employee_role ?? '',
    workDate: row.work_date,
    expectedStart: row.expected_start,
    expectedEnd: row.expected_end,
    clockIn: row.clock_in ?? null,
    clockOut: row.clock_out ?? null,
    status: row.execution_status as AttendanceShiftExecutionStatus,
    lateMinutes: Number(row.late_minutes ?? 0),
    earlyLeaveMinutes: Number(row.early_leave_minutes ?? 0),
    overtimeMinutes: Number(row.overtime_minutes ?? 0),
    plannedMinutes: Number(row.planned_minutes ?? 0),
    workedMinutes: Number(row.worked_minutes ?? 0),
    varianceMinutes: Number(row.variance_minutes ?? 0),
    changeKind:
      row.change_kind === 'coverage' || row.change_kind === 'swap'
        ? row.change_kind
        : null,
    alertId: row.alert_id ?? null,
    alertType: row.alert_type ?? null,
    alertSeverity: row.alert_severity ?? null,
    alertTitle: row.alert_title ?? null,
    alertMessage: row.alert_message ?? null,
    alertReviewedAt: row.alert_reviewed_at ?? null,
    alertReviewedByName: row.alert_reviewed_by_name ?? null,
    alertAdminNote: row.alert_admin_note ?? null,
  }));
}

export async function reviewAttendanceShiftExecutionAlert(params: {
  alertId: string;
  note?: string;
}): Promise<void> {
  const { error } = await supabase.rpc(
    'attendance_admin_review_shift_execution_alert',
    {
      p_alert_id: params.alertId,
      p_note: params.note?.trim() || null,
    },
  );
  if (error) throw error;
}

/* ============================================================
 * FASE 19 · INDICADORES DE CONFIABILIDAD OPERATIVA
 * ============================================================ */
export interface AttendanceEmployeeReliabilitySummary {
  userId: string;
  employeeName: string;
  employeeRole: string;
  evaluatedShifts: number;
  attendedShifts: number;
  completedShifts: number;
  absenceCount: number;
  lateCount: number;
  earlyLeaveCount: number;
  outsideShiftCount: number;
  openShiftCount: number;
  overtimeMinutes: number;
  coverageAssignments: number;
  coverageFulfilled: number;
  attendanceRate: number;
  punctualityRate: number;
  completionRate: number;
  coverageRate: number | null;
  consistencyRate: number;
  reliabilityIndex: number;
}

export interface AttendanceEmployeeReliabilityDetail {
  publicationItemId: string;
  workDate: string;
  expectedStart: string;
  expectedEnd: string;
  clockIn: string | null;
  clockOut: string | null;
  status: AttendanceShiftExecutionStatus;
  lateMinutes: number;
  earlyLeaveMinutes: number;
  overtimeMinutes: number;
  plannedMinutes: number;
  workedMinutes: number;
  varianceMinutes: number;
  changeKind: 'coverage' | 'swap' | null;
  alertType: string | null;
  alertTitle: string | null;
  alertReviewedAt: string | null;
}

export async function getAttendanceEmployeeReliabilitySummary(params: {
  startDate: string;
  endDate: string;
}): Promise<AttendanceEmployeeReliabilitySummary[]> {
  const { data, error } = await supabase.rpc(
    'attendance_admin_employee_reliability_summary',
    {
      p_start_date: params.startDate,
      p_end_date: params.endDate,
    },
  );
  if (error) throw error;

  return ((data ?? []) as any[]).map(row => ({
    userId: row.user_id,
    employeeName: row.employee_name ?? '',
    employeeRole: row.employee_role ?? '',
    evaluatedShifts: Number(row.evaluated_shifts ?? 0),
    attendedShifts: Number(row.attended_shifts ?? 0),
    completedShifts: Number(row.completed_shifts ?? 0),
    absenceCount: Number(row.absence_count ?? 0),
    lateCount: Number(row.late_count ?? 0),
    earlyLeaveCount: Number(row.early_leave_count ?? 0),
    outsideShiftCount: Number(row.outside_shift_count ?? 0),
    openShiftCount: Number(row.open_shift_count ?? 0),
    overtimeMinutes: Number(row.overtime_minutes ?? 0),
    coverageAssignments: Number(row.coverage_assignments ?? 0),
    coverageFulfilled: Number(row.coverage_fulfilled ?? 0),
    attendanceRate: Number(row.attendance_rate ?? 0),
    punctualityRate: Number(row.punctuality_rate ?? 0),
    completionRate: Number(row.completion_rate ?? 0),
    coverageRate:
      row.coverage_rate === null || row.coverage_rate === undefined
        ? null
        : Number(row.coverage_rate),
    consistencyRate: Number(row.consistency_rate ?? 0),
    reliabilityIndex: Number(row.reliability_index ?? 0),
  }));
}

export async function getAttendanceEmployeeReliabilityDetail(params: {
  userId: string;
  startDate: string;
  endDate: string;
}): Promise<AttendanceEmployeeReliabilityDetail[]> {
  const { data, error } = await supabase.rpc(
    'attendance_admin_employee_reliability_detail',
    {
      p_user_id: params.userId,
      p_start_date: params.startDate,
      p_end_date: params.endDate,
    },
  );
  if (error) throw error;

  return ((data ?? []) as any[]).map(row => ({
    publicationItemId: row.publication_item_id,
    workDate: row.work_date,
    expectedStart: row.expected_start,
    expectedEnd: row.expected_end,
    clockIn: row.clock_in ?? null,
    clockOut: row.clock_out ?? null,
    status: row.execution_status as AttendanceShiftExecutionStatus,
    lateMinutes: Number(row.late_minutes ?? 0),
    earlyLeaveMinutes: Number(row.early_leave_minutes ?? 0),
    overtimeMinutes: Number(row.overtime_minutes ?? 0),
    plannedMinutes: Number(row.planned_minutes ?? 0),
    workedMinutes: Number(row.worked_minutes ?? 0),
    varianceMinutes: Number(row.variance_minutes ?? 0),
    changeKind:
      row.change_kind === 'coverage' || row.change_kind === 'swap'
        ? row.change_kind
        : null,
    alertType: row.alert_type ?? null,
    alertTitle: row.alert_title ?? null,
    alertReviewedAt: row.alert_reviewed_at ?? null,
  }));
}

/* ============================================================
 * FASE 20 · TENDENCIAS Y EVOLUCIÓN
 * ============================================================ */
export interface AttendanceTrendTeamSummary {
  currentEvaluatedShifts: number;
  previousEvaluatedShifts: number;
  currentAttendanceRate: number;
  previousAttendanceRate: number | null;
  attendanceDelta: number | null;
  currentPunctualityRate: number;
  previousPunctualityRate: number | null;
  punctualityDelta: number | null;
  currentAbsences: number;
  previousAbsences: number | null;
  absenceDelta: number | null;
  currentLateCount: number;
  previousLateCount: number | null;
  lateDelta: number | null;
  currentEarlyLeaveCount: number;
  previousEarlyLeaveCount: number | null;
  earlyLeaveDelta: number | null;
  currentOvertimeMinutes: number;
  previousOvertimeMinutes: number | null;
  overtimeDeltaMinutes: number | null;
}

export interface AttendanceEmployeeTrend {
  userId: string;
  employeeName: string;
  employeeRole: string;
  currentEvaluatedShifts: number;
  previousEvaluatedShifts: number;
  currentAttendanceRate: number;
  previousAttendanceRate: number | null;
  attendanceDelta: number | null;
  currentPunctualityRate: number;
  previousPunctualityRate: number | null;
  punctualityDelta: number | null;
  currentAbsenceCount: number;
  previousAbsenceCount: number | null;
  absenceDelta: number | null;
  currentLateCount: number;
  previousLateCount: number | null;
  lateDelta: number | null;
  trendDirection: 'improving' | 'stable' | 'declining' | 'insufficient_data';
}

export interface AttendanceWeekdayPattern {
  dayOfWeek: number;
  dayName: string;
  evaluatedShifts: number;
  absenceCount: number;
  lateCount: number;
  earlyLeaveCount: number;
  overtimeMinutes: number;
  attendanceRate: number;
  punctualityRate: number;
}

export async function getAttendanceTeamTrend(params: {
  startDate: string;
  endDate: string;
}): Promise<AttendanceTrendTeamSummary> {
  const { data, error } = await supabase.rpc(
    'attendance_admin_team_trend_summary',
    {
      p_start_date: params.startDate,
      p_end_date: params.endDate,
    },
  );
  if (error) throw error;

  const row = Array.isArray(data) ? data[0] : data;

  const nullableNumber = (value: unknown): number | null =>
    value === null || value === undefined ? null : Number(value);

  return {
    currentEvaluatedShifts: Number(row?.current_evaluated_shifts ?? 0),
    previousEvaluatedShifts: Number(row?.previous_evaluated_shifts ?? 0),
    currentAttendanceRate: Number(row?.current_attendance_rate ?? 0),
    previousAttendanceRate: nullableNumber(row?.previous_attendance_rate),
    attendanceDelta: nullableNumber(row?.attendance_delta),
    currentPunctualityRate: Number(row?.current_punctuality_rate ?? 0),
    previousPunctualityRate: nullableNumber(row?.previous_punctuality_rate),
    punctualityDelta: nullableNumber(row?.punctuality_delta),
    currentAbsences: Number(row?.current_absences ?? 0),
    previousAbsences: nullableNumber(row?.previous_absences),
    absenceDelta: nullableNumber(row?.absence_delta),
    currentLateCount: Number(row?.current_late_count ?? 0),
    previousLateCount: nullableNumber(row?.previous_late_count),
    lateDelta: nullableNumber(row?.late_delta),
    currentEarlyLeaveCount: Number(row?.current_early_leave_count ?? 0),
    previousEarlyLeaveCount: nullableNumber(row?.previous_early_leave_count),
    earlyLeaveDelta: nullableNumber(row?.early_leave_delta),
    currentOvertimeMinutes: Number(row?.current_overtime_minutes ?? 0),
    previousOvertimeMinutes: nullableNumber(row?.previous_overtime_minutes),
    overtimeDeltaMinutes: nullableNumber(row?.overtime_delta_minutes),
  };
}

export async function getAttendanceEmployeeTrends(params: {
  startDate: string;
  endDate: string;
}): Promise<AttendanceEmployeeTrend[]> {
  const { data, error } = await supabase.rpc(
    'attendance_admin_employee_trends',
    {
      p_start_date: params.startDate,
      p_end_date: params.endDate,
    },
  );
  if (error) throw error;

  const nullableNumber = (value: unknown): number | null =>
    value === null || value === undefined ? null : Number(value);

  return ((data ?? []) as any[]).map(row => ({
    userId: row.user_id,
    employeeName: row.employee_name ?? '',
    employeeRole: row.employee_role ?? '',
    currentEvaluatedShifts: Number(row.current_evaluated_shifts ?? 0),
    previousEvaluatedShifts: Number(row.previous_evaluated_shifts ?? 0),
    currentAttendanceRate: Number(row.current_attendance_rate ?? 0),
    previousAttendanceRate: nullableNumber(row.previous_attendance_rate),
    attendanceDelta: nullableNumber(row.attendance_delta),
    currentPunctualityRate: Number(row.current_punctuality_rate ?? 0),
    previousPunctualityRate: nullableNumber(row.previous_punctuality_rate),
    punctualityDelta: nullableNumber(row.punctuality_delta),
    currentAbsenceCount: Number(row.current_absence_count ?? 0),
    previousAbsenceCount: nullableNumber(row.previous_absence_count),
    absenceDelta: nullableNumber(row.absence_delta),
    currentLateCount: Number(row.current_late_count ?? 0),
    previousLateCount: nullableNumber(row.previous_late_count),
    lateDelta: nullableNumber(row.late_delta),
    trendDirection:
      row.trend_direction === 'improving' ||
      row.trend_direction === 'declining' ||
      row.trend_direction === 'stable'
        ? row.trend_direction
        : 'insufficient_data',
  }));
}

export async function getAttendanceWeekdayPatterns(params: {
  startDate: string;
  endDate: string;
}): Promise<AttendanceWeekdayPattern[]> {
  const { data, error } = await supabase.rpc(
    'attendance_admin_weekday_patterns',
    {
      p_start_date: params.startDate,
      p_end_date: params.endDate,
    },
  );
  if (error) throw error;

  return ((data ?? []) as any[]).map(row => ({
    dayOfWeek: Number(row.day_of_week),
    dayName: row.day_name ?? '',
    evaluatedShifts: Number(row.evaluated_shifts ?? 0),
    absenceCount: Number(row.absence_count ?? 0),
    lateCount: Number(row.late_count ?? 0),
    earlyLeaveCount: Number(row.early_leave_count ?? 0),
    overtimeMinutes: Number(row.overtime_minutes ?? 0),
    attendanceRate: Number(row.attendance_rate ?? 0),
    punctualityRate: Number(row.punctuality_rate ?? 0),
  }));
}

/* ============================================================
 * FASE 21 · CIERRE ADMINISTRATIVO CONSOLIDADO
 * ============================================================ */
export interface AttendancePeriodClosureStatus {
  startDate: string;
  endDate: string;
  periodEnded: boolean;
  periodLocked: boolean;
  openAttendanceCount: number;
  pendingIncidentCount: number;
  pendingRequestCount: number;
  openShiftChangeCount: number;
  unresolvedExecutionAlertCount: number;
  readyToClose: boolean;
}

export interface AttendancePeriodClosureSnapshot {
  id: string;
  startDate: string;
  endDate: string;
  createdAt: string;
  createdByName: string;
  summary: Record<string, unknown>;
  employeeReport: Record<string, unknown>[];
  incidents: Record<string, unknown>[];
  requests: Record<string, unknown>[];
  shiftChanges: Record<string, unknown>[];
  executionAlerts: Record<string, unknown>[];
  payrollRuns: Record<string, unknown>[];
  auditLog: Record<string, unknown>[];
}

export async function getAttendancePeriodClosureStatus(params: {
  startDate: string;
  endDate: string;
}): Promise<AttendancePeriodClosureStatus> {
  const { data, error } = await supabase.rpc(
    'attendance_admin_period_closure_status',
    {
      p_start_date: params.startDate,
      p_end_date: params.endDate,
    },
  );
  if (error) throw error;

  const row = Array.isArray(data) ? data[0] : data;

  return {
    startDate: row?.start_date ?? params.startDate,
    endDate: row?.end_date ?? params.endDate,
    periodEnded: Boolean(row?.period_ended),
    periodLocked: Boolean(row?.period_locked),
    openAttendanceCount: Number(row?.open_attendance_count ?? 0),
    pendingIncidentCount: Number(row?.pending_incident_count ?? 0),
    pendingRequestCount: Number(row?.pending_request_count ?? 0),
    openShiftChangeCount: Number(row?.open_shift_change_count ?? 0),
    unresolvedExecutionAlertCount: Number(
      row?.unresolved_execution_alert_count ?? 0,
    ),
    readyToClose: Boolean(row?.ready_to_close),
  };
}

export async function createAttendancePeriodClosureSnapshot(params: {
  startDate: string;
  endDate: string;
}): Promise<string> {
  const { data, error } = await supabase.rpc(
    'attendance_admin_create_period_closure_snapshot',
    {
      p_start_date: params.startDate,
      p_end_date: params.endDate,
    },
  );
  if (error) throw error;
  return String(data);
}

export async function getAttendancePeriodClosureSnapshots():
  Promise<AttendancePeriodClosureSnapshot[]> {
  const { data, error } = await supabase.rpc(
    'attendance_admin_list_period_closure_snapshots',
  );
  if (error) throw error;

  return ((data ?? []) as any[]).map(row => ({
    id: row.id,
    startDate: row.start_date,
    endDate: row.end_date,
    createdAt: row.created_at,
    createdByName: row.created_by_name ?? 'Administrador',
    summary: row.summary ?? {},
    employeeReport: row.employee_report ?? [],
    incidents: row.incidents ?? [],
    requests: row.requests ?? [],
    shiftChanges: row.shift_changes ?? [],
    executionAlerts: row.execution_alerts ?? [],
    payrollRuns: row.payroll_runs ?? [],
    auditLog: row.audit_log ?? [],
  }));
}

export async function getAttendancePeriodClosureSnapshot(
  snapshotId: string,
): Promise<AttendancePeriodClosureSnapshot> {
  const { data, error } = await supabase.rpc(
    'attendance_admin_get_period_closure_snapshot',
    { p_snapshot_id: snapshotId },
  );
  if (error) throw error;

  const row = Array.isArray(data) ? data[0] : data;
  if (!row?.id) {
    throw new Error('No se encontró el cierre administrativo.');
  }

  return {
    id: row.id,
    startDate: row.start_date,
    endDate: row.end_date,
    createdAt: row.created_at,
    createdByName: row.created_by_name ?? 'Administrador',
    summary: row.summary ?? {},
    employeeReport: row.employee_report ?? [],
    incidents: row.incidents ?? [],
    requests: row.requests ?? [],
    shiftChanges: row.shift_changes ?? [],
    executionAlerts: row.execution_alerts ?? [],
    payrollRuns: row.payroll_runs ?? [],
    auditLog: row.audit_log ?? [],
  };
}

/* ============================================================
 * FASE 22 · HARDENING Y DIAGNÓSTICO FINAL
 * ============================================================ */
export type AttendanceModuleHealthStatus =
  | 'ok'
  | 'warning'
  | 'error';

export interface AttendanceModuleHealthCheck {
  checkKey: string;
  label: string;
  status: AttendanceModuleHealthStatus;
  affectedCount: number;
  detail: string;
}

export async function getAttendanceModuleHealth():
  Promise<AttendanceModuleHealthCheck[]> {
  const { data, error } = await supabase.rpc(
    'attendance_admin_module_health',
  );

  if (error) throw error;

  return ((data ?? []) as any[]).map(row => ({
    checkKey: row.check_key,
    label: row.label,
    status:
      row.status === 'error'
        ? 'error'
        : row.status === 'warning'
          ? 'warning'
          : 'ok',
    affectedCount: Number(row.affected_count ?? 0),
    detail: row.detail ?? '',
  }));
}

