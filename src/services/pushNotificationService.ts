import {
  Platform,
} from 'react-native';

import * as Notifications
  from 'expo-notifications';

import Constants
  from 'expo-constants';

import {
  supabase,
} from './supabase';


const WEB_ORDERS_CHANNEL_ID =
  'web-orders';


/*
 * Esto controla qué pasa cuando llega
 * una notificación mientras Burger Kong
 * está ABIERTO.
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


async function configureAndroidNotificationChannel():
  Promise<void> {
  if (
    Platform.OS !==
    'android'
  ) {
    return;
  }

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
}


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


async function savePushDevice(
  expoPushToken: string,
  userId:
    | string
    | null,
): Promise<void> {
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

        platform:
          Platform.OS ===
          'ios'
            ? 'ios'
            : 'android',

        device_name:
          'Burger Kong POS',

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

  if (error) {
    throw new Error(
      `No se pudo registrar la tablet para notificaciones: ${error.message}`,
    );
  }
}


export async function registerPosPushNotifications(
  userId:
    | string
    | null,
): Promise<
  | string
  | null
> {
  try {
    /*
     * En este proyecto las notificaciones
     * push son principalmente para Android.
     */
    if (
      Platform.OS ===
      'web'
    ) {
      return null;
    }

    await configureAndroidNotificationChannel();

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
    );

    console.log(
      '✅ Tablet registrada para Push Notifications:',
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