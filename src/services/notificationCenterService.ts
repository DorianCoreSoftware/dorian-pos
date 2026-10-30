import {
  supabase,
} from './supabase';

export type PosNotificationSeverity =
  | 'info'
  | 'warning'
  | 'critical';

export interface PosNotification {
  id: string;
  key: string;
  type: string;
  severity: PosNotificationSeverity;
  title: string;
  message: string;
  sourceType: string | null;
  sourceId: string | null;
  actionTarget: string | null;
  metadata: Record<string, unknown>;
  isActive: boolean;
  readAt: string | null;
  resolvedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

interface NotificationRow {
  id: string;
  notification_key: string;
  notification_type: string;
  severity: PosNotificationSeverity;
  title: string;
  message: string;
  source_type: string | null;
  source_id: string | null;
  action_target: string | null;
  metadata: Record<string, unknown> | null;
  is_active: boolean;
  read_at: string | null;
  resolved_at: string | null;
  created_at: string;
  updated_at: string;
}

export async function getPosNotifications(
  activeOnly = true,
  limit = 100,
): Promise<PosNotification[]> {
  const {
    data,
    error,
  } =
    await supabase.rpc(
      'get_pos_notifications_admin',
      {
        p_active_only:
          activeOnly,
        p_limit:
          limit,
      },
    );

  if (error) {
    throw new Error(
      error.message ||
      'No se pudieron cargar las notificaciones.',
    );
  }

  return (
    (
      data ??
      []
    ) as NotificationRow[]
  ).map(
    row => ({
      id:
        row.id,
      key:
        row.notification_key,
      type:
        row.notification_type,
      severity:
        row.severity,
      title:
        row.title,
      message:
        row.message,
      sourceType:
        row.source_type,
      sourceId:
        row.source_id,
      actionTarget:
        row.action_target,
      metadata:
        row.metadata ??
        {},
      isActive:
        row.is_active,
      readAt:
        row.read_at,
      resolvedAt:
        row.resolved_at,
      createdAt:
        row.created_at,
      updatedAt:
        row.updated_at,
    }),
  );
}

export async function markPosNotificationRead(
  notificationId: string,
): Promise<void> {
  const {
    error,
  } =
    await supabase.rpc(
      'mark_pos_notification_read_admin',
      {
        p_notification_id:
          notificationId,
      },
    );

  if (error) {
    throw new Error(
      error.message ||
      'No se pudo marcar la notificación como leída.',
    );
  }
}

export async function markAllPosNotificationsRead():
Promise<void> {
  const {
    error,
  } =
    await supabase.rpc(
      'mark_all_pos_notifications_read_admin',
    );

  if (error) {
    throw new Error(
      error.message ||
      'No se pudieron marcar las notificaciones como leídas.',
    );
  }
}
