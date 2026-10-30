export type PresetDays = 30 | 90 | 180 | 365;

export type MonthlyTrend = {
  key: string;
  label: string;
  scheduledDays: number;
  workedDays: number;
  absentDays: number;
  lateDays: number;
  overtimeMinutes: number;
};
