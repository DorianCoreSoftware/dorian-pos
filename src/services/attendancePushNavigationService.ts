import {
  Platform,
} from 'react-native';

import * as Notifications
  from 'expo-notifications';

export interface AttendanceNotificationData {
  type: 'attendance_notification';
  notificationId?: string;
  category?: string;
  requestId?: string | null;
  payrollItemId?: string | null;
  attendanceRecordId?: string | null;
  workDate?: string | null;
}

export type AttendanceNotificationTarget =
  | 'attendance'
  | 'notifications'
  | 'requests'
  | 'receipts'
  | 'schedule';

export function isAttendanceNotification(
  data: unknown,
): data is AttendanceNotificationData {
  if (!data || typeof data !== 'object') {
    return false;
  }

  return (
    (data as { type?: unknown }).type ===
    'attendance_notification'
  );
}

export function getAttendanceNotificationTarget(
  data: AttendanceNotificationData,
): AttendanceNotificationTarget {
  switch (data.category) {
    case 'payroll_paid':
      return 'receipts';

    case 'employee_request_approved':
    case 'employee_request_rejected':
      return 'requests';

    case 'shift_schedule_published':
    case 'shift_schedule_updated':
    case 'shift_change_request_new':
    case 'shift_change_offer_new':
    case 'shift_change_approved':
    case 'shift_change_rejected':
      return 'schedule';

    case 'shift_execution_alert':
      return 'notifications';

    case 'clock_in_pending':
    case 'clock_out_pending':
      return 'attendance';

    default:
      return 'notifications';
  }
}

export async function configureAttendanceNotificationChannel():
  Promise<void> {
  if (Platform.OS !== 'android') {
    return;
  }

  await Notifications.setNotificationChannelAsync(
    'attendance',
    {
      name: 'Asistencia y nómina',
      description:
        'Recordatorios de asistencia, solicitudes, recibos de nómina y horarios.',
      importance:
        Notifications.AndroidImportance.HIGH,
      sound: 'default',
      vibrationPattern: [0, 250, 150, 250],
      enableVibrate: true,
      enableLights: true,
      lockscreenVisibility:
        Notifications.AndroidNotificationVisibility.PUBLIC,
    },
  );
}

export function listenToAttendanceNotificationResponses(
  onPressed:
    (data: AttendanceNotificationData) => void,
): Notifications.EventSubscription {
  return Notifications
    .addNotificationResponseReceivedListener(
      response => {
        const data =
          response.notification.request.content.data;

        if (isAttendanceNotification(data)) {
          onPressed(data);
        }
      },
    );
}
