import {
  Platform,
} from 'react-native';

import * as Notifications
  from 'expo-notifications';

import Constants
  from 'expo-constants';

import {
  getBusinessSettings,
} from './businessHoursService';

import {
  supabase,
} from './supabase';

const WEB_ORDERS_CHANNEL_ID =
  'web-orders';

const DELIVERY_ORDERS_CHANNEL_ID =
  'delivery-orders';

const EVENT_REQUESTS_CHANNEL_ID =
  'event-requests';

type PushDeviceType =
  | 'pos'
  | 'driver';

/*
 * ============================================================
 * NOTIFICACIONES EN FOREGROUND
 * ============================================================
 */
Notifications.setNotificationHandler({
  handleNotification:
    async () => ({
      shouldPlaySound:
        true,

      shouldSetBadge:
        false,

      shouldShowBanner:
        true,

      shouldShowList:
        true,
    }),
});

/*
 * ============================================================
 * CANALES ANDROID
 * ============================================================
 */
async function configureAndroidNotificationChannels():
  Promise<void> {
  if (
    Platform.OS !==
    'android'
  ) {
    return;
  }

  /*
   * Pedidos web para POS.
   */
  await Notifications
    .setNotificationChannelAsync(
      WEB_ORDERS_CHANNEL_ID,
      {
        name:
          'Pedidos web',

        description:
          'Avisos de nuevos pedidos recibidos desde el menú web.',

        importance:
          Notifications
            .AndroidImportance
            .MAX,

        sound:
          'default',

        vibrationPattern: [
          0,
          300,
          200,
          300,
        ],

        enableVibrate:
          true,

        enableLights:
          true,

        lockscreenVisibility:
          Notifications
            .AndroidNotificationVisibility
            .PUBLIC,
      },
    );

  /*
   * Pedidos listos para reparto.
   */
  await Notifications
    .setNotificationChannelAsync(
      DELIVERY_ORDERS_CHANNEL_ID,
      {
        name:
          'Entregas',

        description:
          'Pedidos listos para salir a reparto.',

        importance:
          Notifications
            .AndroidImportance
            .MAX,

        sound:
          'default',

        vibrationPattern: [
          0,
          300,
          200,
          300,
        ],

        enableVibrate:
          true,

        enableLights:
          true,

        lockscreenVisibility:
          Notifications
            .AndroidNotificationVisibility
            .PUBLIC,
      },
    );

  /*
   * Solicitudes de eventos para POS.
   */
  await Notifications
    .setNotificationChannelAsync(
      EVENT_REQUESTS_CHANNEL_ID,
      {
        name:
          'Eventos',

        description:
          'Avisos de nuevas solicitudes de eventos recibidas desde la web.',

        importance:
          Notifications
            .AndroidImportance
            .MAX,

        sound:
          'default',

        vibrationPattern: [
          0,
          300,
          200,
          300,
        ],

        enableVibrate:
          true,

        enableLights:
          true,

        lockscreenVisibility:
          Notifications
            .AndroidNotificationVisibility
            .PUBLIC,
      },
    );
}


/*
 * ============================================================
 * PERMISOS
 * ============================================================
 */
async function requestNotificationPermission():
  Promise<boolean> {
  const current =
    await Notifications
      .getPermissionsAsync();

  if (
    current.status ===
    'granted'
  ) {
    return true;
  }

  const requested =
    await Notifications
      .requestPermissionsAsync();

  return (
    requested.status ===
    'granted'
  );
}

/*
 * ============================================================
 * EAS PROJECT ID
 * ============================================================
 */
function getExpoProjectId():
  string {
  const projectId =
    Constants
      .expoConfig
      ?.extra
      ?.eas
      ?.projectId ??
    Constants
      .easConfig
      ?.projectId;

  if (
    !projectId
  ) {
    throw new Error(
      'No se encontró el projectId de EAS.',
    );
  }

  return projectId;
}

/*
 * ============================================================
 * EXPO PUSH TOKEN
 * ============================================================
 */
async function getExpoPushToken():
  Promise<string> {
  const projectId =
    getExpoProjectId();

  const result =
    await Notifications
      .getExpoPushTokenAsync({
        projectId,
      });

  return result.data;
}

/*
 * ============================================================
 * GUARDAR DISPOSITIVO
 * ============================================================
 */
async function savePushDevice(
  expoPushToken:
    string,

  userId:
    | string
    | null,

  deviceType:
    PushDeviceType,
): Promise<void> {
  let businessShortName =
    'Dorian';

  try {
    const settings =
      await getBusinessSettings();

    businessShortName =
      settings.identity.shortName ||
      settings.identity.businessName ||
      businessShortName;
  } catch (error) {
    console.warn(
      'No se pudo obtener el nombre del negocio para registrar el dispositivo push:',
      error,
    );
  }

  const {
    error,
  } = await supabase
    .from(
      'pos_push_devices',
    )
    .upsert(
      {
        user_id:
          userId,

        expo_push_token:
          expoPushToken,

        device_type:
          deviceType,

        platform:
          Platform.OS ===
          'ios'
            ? 'ios'
            : 'android',

        device_name:
          deviceType ===
          'driver'
            ? `${businessShortName} Repartidor`
            : `${businessShortName} POS`,

        app_version:
          Constants
            .expoConfig
            ?.version ??
          null,

        is_active:
          true,

        last_seen_at:
          new Date()
            .toISOString(),
      },
      {
        onConflict:
          'expo_push_token',
      },
    );

  if (
    error
  ) {
    throw new Error(
      `No se pudo registrar el dispositivo para notificaciones: ${error.message}`,
    );
  }
}

/*
 * ============================================================
 * REGISTRO GENÉRICO
 * ============================================================
 */
async function registerPushNotifications(
  userId:
    | string
    | null,

  deviceType:
    PushDeviceType,
): Promise<
  | string
  | null
> {
  try {
    if (
      Platform.OS ===
      'web'
    ) {
      return null;
    }

    await configureAndroidNotificationChannels();

    const hasPermission =
      await requestNotificationPermission();

    if (
      !hasPermission
    ) {
      console.warn(
        'El usuario no concedió permiso para notificaciones.',
      );

      return null;
    }

    const expoPushToken =
      await getExpoPushToken();

    await savePushDevice(
      expoPushToken,
      userId,
      deviceType,
    );

    console.log(
      `✅ Dispositivo ${deviceType} registrado para Push Notifications:`,
      expoPushToken,
    );

    return expoPushToken;
  } catch (error) {
    console.error(
      '❌ Error configurando Push Notifications:',
      error,
    );

    return null;
  }
}

/*
 * ============================================================
 * POS
 * ============================================================
 */
export async function registerPosPushNotifications(
  userId:
    | string
    | null,
): Promise<
  | string
  | null
> {
  return registerPushNotifications(
    userId,
    'pos',
  );
}

/*
 * ============================================================
 * DRIVER
 * ============================================================
 */
export async function registerDriverPushNotifications(
  userId:
    | string
    | null,
): Promise<
  | string
  | null
> {
  return registerPushNotifications(
    userId,
    'driver',
  );
}

/*
 * ============================================================
 * NOTIFICACIÓN DE NUEVO PEDIDO WEB
 * ============================================================
 */
export interface WebOrderNotificationData {
  type:
    'new_web_order';

  orderId?:
    string;

  trackingCode?:
    string;
}

export function isWebOrderNotification(
  data:
    unknown,
): data is WebOrderNotificationData {
  if (
    !data ||
    typeof data !==
      'object'
  ) {
    return false;
  }

  const notificationData =
    data as {
      type?:
        unknown;

      orderId?:
        unknown;

      trackingCode?:
        unknown;
    };

  return (
    notificationData.type ===
    'new_web_order'
  );
}

/*
 * ============================================================
 * NOTIFICACIÓN DE ENTREGA LISTA
 * ============================================================
 */
export interface DeliveryReadyNotificationData {
  type:
    'delivery_ready';

  orderId?:
    string;

  trackingCode?:
    string;
}

export function isDeliveryReadyNotification(
  data:
    unknown,
): data is DeliveryReadyNotificationData {
  if (
    !data ||
    typeof data !==
      'object'
  ) {
    return false;
  }

  const notificationData =
    data as {
      type?:
        unknown;

      orderId?:
        unknown;

      trackingCode?:
        unknown;
    };

  return (
    notificationData.type ===
    'delivery_ready'
  );
}


/*
 * ============================================================
 * NOTIFICACIÓN DE NUEVA SOLICITUD DE EVENTO
 * ============================================================
 */
export interface EventRequestNotificationData {
  type: 'new_event_request';
  requestId?: string;
  folio?: number;
}

export function isEventRequestNotification(
  data: unknown,
): data is EventRequestNotificationData {
  if (!data || typeof data !== 'object') {
    return false;
  }

  const notificationData = data as {
    type?: unknown;
    requestId?: unknown;
    folio?: unknown;
  };

  return notificationData.type === 'new_event_request';
}

/*
 * ============================================================
 * LISTENER POS
 * ============================================================
 */
export function listenToPushNotificationResponses(
  onWebOrderPressed: (
    data: WebOrderNotificationData,
  ) => void,
  onEventRequestPressed?: (
    data: EventRequestNotificationData,
  ) => void,
): Notifications.EventSubscription {
  return Notifications.addNotificationResponseReceivedListener(
    response => {
      const data = response.notification.request.content.data;

      if (isWebOrderNotification(data)) {
        onWebOrderPressed(data);
        return;
      }

      if (
        onEventRequestPressed &&
        isEventRequestNotification(data)
      ) {
        onEventRequestPressed(data);
      }
    },
  );
}

export function listenToPushNotificationsReceived(
  onEventRequestReceived: (
    data: EventRequestNotificationData,
  ) => void,
): Notifications.EventSubscription {
  return Notifications.addNotificationReceivedListener(
    notification => {
      const data = notification.request.content.data;
      if (isEventRequestNotification(data)) {
        onEventRequestReceived(data);
      }
    },
  );
}

/*
 * ============================================================
 * LISTENER DRIVER
 * ============================================================
 */
export function listenToDriverNotificationResponses(
  onDeliveryPressed:
    (
      data:
        DeliveryReadyNotificationData,
    ) => void,
): Notifications.EventSubscription {
  return Notifications
    .addNotificationResponseReceivedListener(
      (
        response,
      ) => {
        const data =
          response
            .notification
            .request
            .content
            .data;

        if (
          isDeliveryReadyNotification(
            data,
          )
        ) {
          onDeliveryPressed(
            data,
          );
        }
      },
    );
}

/*
 * ============================================================
 * NOTIFICACIÓN INICIAL
 * ============================================================
 */
export async function getLastPushNotificationResponse():
  Promise<
    Notifications.NotificationResponse | null
  > {
  return Notifications
    .getLastNotificationResponseAsync();
}