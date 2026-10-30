import type {
  AttendanceEmployee,
  EmployeeScheduleDay
} from '../../../../services/attendanceService';

export type EmployeePlan = {
  employee: AttendanceEmployee;
  schedule: EmployeeScheduleDay[];
};

export type GeneratedShift = {
  userId: string;
  employeeName: string;
  workDate: string;
  startTime: string;
  endTime: string;
  demandHoursCovered: number;
  rationale: string;
};
