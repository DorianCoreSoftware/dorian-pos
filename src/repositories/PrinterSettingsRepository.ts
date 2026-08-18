import {
  supabase,
} from '../services/supabase';

export type PrinterConnectionType =
  | 'bluetooth'
  | 'network';

export interface PrinterSettings {
  id: string;
  name: string;

  connectionType:
    PrinterConnectionType;

  bluetoothAddress:
    string | null;

  ipAddress:
    string | null;

  port:
    number | null;

  isActive: boolean;

  createdAt: string;
  updatedAt: string;
}

interface PrinterSettingsRecord {
  id: string;
  name: string;

  connection_type:
    PrinterConnectionType;

  bluetooth_address:
    string | null;

  ip_address:
    string | null;

  port:
    number | null;

  is_active: boolean;

  created_at: string;
  updated_at: string;
}

export async function fetchActivePrinterSettings(): Promise<
  PrinterSettings | null
> {
  const {
    data,
    error,
  } = await supabase
    .from('printer_settings')
    .select('*')
    .eq(
      'is_active',
      true,
    )
    .maybeSingle();

  if (error) {
    throw new Error(
      `No se pudo consultar la configuración de impresora: ${error.message}`,
    );
  }

  if (!data) {
    return null;
  }

  return mapPrinterSettings(
    data as PrinterSettingsRecord,
  );
}

export async function fetchPrinterSettings(): Promise<
  PrinterSettings[]
> {
  const {
    data,
    error,
  } = await supabase
    .from('printer_settings')
    .select('*')
    .order(
      'created_at',
      {
        ascending: true,
      },
    );

  if (error) {
    throw new Error(
      `No se pudieron consultar las impresoras: ${error.message}`,
    );
  }

  return (
    data as
      | PrinterSettingsRecord[]
      | null
  )?.map(
    mapPrinterSettings,
  ) ?? [];
}

function mapPrinterSettings(
  record:
    PrinterSettingsRecord,
): PrinterSettings {
  return {
    id:
      record.id,

    name:
      record.name,

    connectionType:
      record.connection_type,

    bluetoothAddress:
      record.bluetooth_address,

    ipAddress:
      record.ip_address,

    port:
      record.port,

    isActive:
      record.is_active,

    createdAt:
      record.created_at,

    updatedAt:
      record.updated_at,
  };

  
}

export interface UpdatePrinterSettingsInput {
  name: string;

  connectionType:
    PrinterConnectionType;

  bluetoothAddress:
    string | null;

  ipAddress:
    string | null;

  port:
    number | null;

  isActive: boolean;
}

export async function updatePrinterSettings(
  id: string,
  input:
    UpdatePrinterSettingsInput,
): Promise<PrinterSettings> {
  const {
    data,
    error,
  } = await supabase
    .from('printer_settings')
    .update({
      name:
        input.name.trim(),

      connection_type:
        input.connectionType,

      bluetooth_address:
        input.bluetoothAddress,

      ip_address:
        input.ipAddress,

      port:
        input.port,

      is_active:
        input.isActive,
    })
    .eq(
      'id',
      id,
    )
    .select('*')
    .single();

  if (error) {
    throw new Error(
      `No se pudo actualizar la impresora: ${error.message}`,
    );
  }

  if (!data) {
    throw new Error(
      'Supabase no devolvió la configuración actualizada.',
    );
  }

  return mapPrinterSettings(
    data as PrinterSettingsRecord,
  );
}