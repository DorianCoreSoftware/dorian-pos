import { supabase } from './supabase';

export interface BusinessHour {
  id: string;
  dayOfWeek: number;
  isOpen: boolean;
  openTime: string;
  closeTime: string;
}

interface BusinessHourRow {
  id: string;
  day_of_week: number;
  is_open: boolean;
  open_time: string;
  close_time: string;
}

export async function getBusinessHours(): Promise<BusinessHour[]> {
  const { data, error } = await supabase
    .from('business_hours')
    .select('id, day_of_week, is_open, open_time, close_time')
    .order('day_of_week', { ascending: true });

  if (error) throw new Error(`No se pudieron obtener los horarios: ${error.message}`);

  return ((data ?? []) as BusinessHourRow[]).map((row) => ({
    id: row.id,
    dayOfWeek: row.day_of_week,
    isOpen: row.is_open,
    openTime: row.open_time.slice(0, 5),
    closeTime: row.close_time.slice(0, 5),
  }));
}

export async function saveBusinessHours(hours: BusinessHour[]): Promise<void> {
  if (hours.length !== 7) throw new Error('Deben existir horarios para los 7 días.');

  const timeRegex = /^([01]\d|2[0-3]):[0-5]\d$/;

  hours.forEach((hour) => {
    if (!hour.isOpen) return;
    if (!timeRegex.test(hour.openTime) || !timeRegex.test(hour.closeTime)) {
      throw new Error('Los horarios deben usar el formato HH:MM.');
    }
    if (hour.openTime === hour.closeTime) {
      throw new Error('La hora de apertura y cierre no pueden ser iguales.');
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

  if (error) throw new Error(`No se pudieron guardar los horarios: ${error.message}`);
}

export async function getBusinessTimezone(): Promise<string> {
  const { data, error } = await supabase
    .from('business_settings')
    .select('timezone')
    .eq('id', 1)
    .single();

  if (error) throw new Error(`No se pudo obtener la zona horaria: ${error.message}`);
  return data?.timezone ?? 'America/Mexico_City';
}
