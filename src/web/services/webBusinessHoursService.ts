import {
  supabase,
} from '../../services/supabase';

export interface PublicBusinessStatus {
  isOpen: boolean;
  timezone: string;
  localDayOfWeek: number;
  localTime: string;
  todayIsOpen: boolean;
  todayOpenTime:
    | string
    | null;
  todayCloseTime:
    | string
    | null;
}

interface PublicBusinessStatusRow {
  is_open: boolean;
  timezone: string;
  local_day_of_week: number;
  local_time: string;
  today_is_open: boolean;
  today_open_time:
    | string
    | null;
  today_close_time:
    | string
    | null;
}

export async function getPublicBusinessStatus():
  Promise<PublicBusinessStatus> {
  const {
    data,
    error,
  } = await supabase
    .rpc(
      'get_public_business_status',
    );

  if (error) {
    throw new Error(
      `No se pudo consultar el horario: ${error.message}`,
    );
  }

  const row =
    (
      data as
        | PublicBusinessStatusRow[]
        | null
    )?.[0];

  if (!row) {
    throw new Error(
      'No se recibió el estado del negocio.',
    );
  }

  return {
    isOpen:
      row.is_open,

    timezone:
      row.timezone,

    localDayOfWeek:
      row.local_day_of_week,

    localTime:
      row.local_time,

    todayIsOpen:
      row.today_is_open,

    todayOpenTime:
      row.today_open_time,

    todayCloseTime:
      row.today_close_time,
  };
}