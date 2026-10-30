import type {
  AttendanceEmployee,
  EmployeeScheduleDay
} from '../../../../services/attendanceService';

export type EmployeePlan = {
  employee: AttendanceEmployee;
  schedule: EmployeeScheduleDay[];
};

export type ForecastHour = {
  key: string;
  date: string;
  dayOfWeek: number;
  hour: number;
  averageOrders: number;
  averageRevenue: number;
  scheduledStaff: number;
  recommendedStaff: number;
  deficit: number;
  utilizationPercent: number;
  hasHistory: boolean;
};
