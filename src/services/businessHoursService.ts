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

export interface BusinessHourException {
  id: string;
  exceptionDate: string;
  isOpen: boolean;
  openTime: string;
  closeTime: string;
  reason: string;
}

export interface SaveBusinessHourExceptionInput {
  id?: string;
  exceptionDate: string;
  isOpen: boolean;
  openTime: string;
  closeTime: string;
  reason: string;
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

interface BusinessHourExceptionRow {
  id: string;
  exception_date: string;
  is_open: boolean;
  open_time: string | null;
  close_time: string | null;
  reason: string | null;
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

  const row =
    data as BusinessSettingsRow;

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

export async function getBusinessHourExceptions():
  Promise<BusinessHourException[]> {
  const { data, error } = await supabase
    .from('business_hour_exceptions')
    .select(
      'id, exception_date, is_open, open_time, close_time, reason',
    )
    .order(
      'exception_date',
      { ascending: true },
    )
    .limit(100);

  if (error) {
    throw new Error(
      `No se pudieron obtener las excepciones: ${error.message}`,
    );
  }

  return (
    (data ?? []) as BusinessHourExceptionRow[]
  ).map(
    (row) => ({
      id:
        row.id,

      exceptionDate:
        row.exception_date,

      isOpen:
        row.is_open,

      openTime:
        row.open_time?.slice(0, 5) ??
        '17:00',

      closeTime:
        row.close_time?.slice(0, 5) ??
        '23:00',

      reason:
        row.reason ??
        '',
    }),
  );
}

export async function saveBusinessHourException(
  input: SaveBusinessHourExceptionInput,
): Promise<void> {
  validateExceptionDate(
    input.exceptionDate,
  );

  if (input.isOpen) {
    validateTime(
      input.openTime,
    );

    validateTime(
      input.closeTime,
    );

    if (
      input.openTime ===
      input.closeTime
    ) {
      throw new Error(
        'La hora de apertura y cierre no pueden ser iguales.',
      );
    }
  }

  const reason =
    input.reason
      .trim()
      .slice(0, 120);

  const row = {
    exception_date:
      input.exceptionDate,

    is_open:
      input.isOpen,

    open_time:
      input.isOpen
        ? input.openTime
        : null,

    close_time:
      input.isOpen
        ? input.closeTime
        : null,

    reason:
      reason || null,

    updated_at:
      new Date().toISOString(),
  };

  if (input.id) {
    const { error } =
      await supabase
        .from(
          'business_hour_exceptions',
        )
        .update(
          row,
        )
        .eq(
          'id',
          input.id,
        );

    if (error) {
      throw new Error(
        `No se pudo actualizar la excepción: ${error.message}`,
      );
    }

    return;
  }

  const { error } =
    await supabase
      .from(
        'business_hour_exceptions',
      )
      .insert(
        row,
      );

  if (error) {
    if (
      error.code ===
      '23505'
    ) {
      throw new Error(
        'Ya existe una excepción para esa fecha.',
      );
    }

    throw new Error(
      `No se pudo crear la excepción: ${error.message}`,
    );
  }
}

export async function deleteBusinessHourException(
  id: string,
): Promise<void> {
  const { error } =
    await supabase
      .from(
        'business_hour_exceptions',
      )
      .delete()
      .eq(
        'id',
        id,
      );

  if (error) {
    throw new Error(
      `No se pudo eliminar la excepción: ${error.message}`,
    );
  }
}

function validateExceptionDate(
  value: string,
): void {
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(
      value,
    )
  ) {
    throw new Error(
      'La fecha debe usar el formato AAAA-MM-DD.',
    );
  }

  const date =
    new Date(
      `${value}T12:00:00`,
    );

  if (
    Number.isNaN(
      date.getTime(),
    ) ||
    date.toISOString()
      .slice(0, 10) !==
      value
  ) {
    throw new Error(
      'La fecha no es válida.',
    );
  }
}

function validateTime(
  value: string,
): void {
  if (
    !/^([01]\d|2[0-3]):[0-5]\d$/.test(
      value,
    )
  ) {
    throw new Error(
      'Los horarios deben usar el formato HH:MM.',
    );
  }
}