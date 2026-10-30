import type {
  AttendanceEmployee,
  EmployeeScheduleDay
} from '../../../../services/attendanceService';

export type EmployeePlan = {
  employee: AttendanceEmployee;
  schedule: EmployeeScheduleDay[];
};

export type RiskLevel = 'normal' | 'watch' | 'high';
