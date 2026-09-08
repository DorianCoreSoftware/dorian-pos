import { supabase } from './supabase';

export interface BusinessHour {
  id: string;
  dayOfWeek: number;
  isOpen: boolean;
  openTime: string;
  closeTime: string;
}

export interface WebOrderSettings {
  webOrdersEnabled: boolean;
  webOrdersPauseMessage: string;
}

interface BusinessHourRow {
  id: string;
  day_of_week: number;
  is_open: boolean;
  open_time: string;
  close_time: string;
}

interface BusinessSettingsRow {
  timezone: string;
  web_orders_enabled: boolean;
  web_orders_pause_message: string | null;
}

export async function getBusinessHours(): Promise<BusinessHour[]> {
  const { data, error } = await supabase
    .from('business_hours')
    .select('id, day_of_week, is_open, open_time, close_time')
    .order('day_of_week', { ascending: true });

  if (error) {
    throw new Error(`No se pudieron obtener los horarios: ${error.message}`);
  }

  return ((data ?? []) as BusinessHourRow[]).map((row) => ({
    id: row.id,
    dayOfWeek: row.day_of_week,
    isOpen: row.is_open,
    openTime: row.open_time.slice(0, 5),
    closeTime: row.close_time.slice(0, 5),
  }));
}

export async function saveBusinessHours(
  hours: BusinessHour[],
): Promise<void> {
  if (hours.length !== 7) {
    throw new Error('Deben existir horarios para los 7 días.');
  }

  const timeRegex = /^([01]\d|2[0-3]):[0-5]\d$/;

  hours.forEach((hour) => {
    if (!hour.isOpen) return;

    if (
      !timeRegex.test(hour.openTime) ||
      !timeRegex.test(hour.closeTime)
    ) {
      throw new Error('Los horarios deben usar el formato HH:MM.');
    }

    if (hour.openTime === hour.closeTime) {
      throw new Error(
        'La hora de apertura y cierre no pueden ser iguales.',
      );
    }
  });

  const { error } = await supabase
    .from('business_hours')
    .upsert(
      hours.map((hour) => ({
        id: hour.id,
        day_of_week: hour.dayOfWeek,
        is_open: hour.isOpen,
        open_time: hour.openTime,
        close_time: hour.closeTime,
      })),
      { onConflict: 'day_of_week' },
    );

  if (error) {
    throw new Error(
      `No se pudieron guardar los horarios: ${error.message}`,
    );
  }
}

export async function getBusinessSettings(): Promise<{
  timezone: string;
  webOrderSettings: WebOrderSettings;
}> {
  const { data, error } = await supabase
    .from('business_settings')
    .select(
      'timezone, web_orders_enabled, web_orders_pause_message',
    )
    .eq('id', 1)
    .single();

  if (error) {
    throw new Error(
      `No se pudo obtener la configuración del negocio: ${error.message}`,
    );
  }

  const row = data as BusinessSettingsRow;

  return {
    timezone:
      row.timezone ??
      'America/Mexico_City',

    webOrderSettings: {
      webOrdersEnabled:
        row.web_orders_enabled ??
        true,

      webOrdersPauseMessage:
        row.web_orders_pause_message ??
        '',
    },
  };
}

export async function getBusinessTimezone(): Promise<string> {
  const settings =
    await getBusinessSettings();

  return settings.timezone;
}

export async function getWebOrderSettings(): Promise<WebOrderSettings> {
  const settings =
    await getBusinessSettings();

  return settings.webOrderSettings;
}

export async function saveWebOrderSettings(
  settings: WebOrderSettings,
): Promise<void> {
  const pauseMessage =
    settings.webOrdersPauseMessage
      .trim()
      .slice(0, 250);

  const { error } = await supabase
    .from('business_settings')
    .update({
      web_orders_enabled:
        settings.webOrdersEnabled,

      web_orders_pause_message:
        pauseMessage || null,

      updated_at:
        new Date().toISOString(),
    })
    .eq('id', 1);

  if (error) {
    throw new Error(
      `No se pudo guardar la configuración de pedidos web: ${error.message}`,
    );
  }
}