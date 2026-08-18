import {
  fetchActivePrinterSettings,
  fetchPrinterSettings,
  PrinterSettings,
  updatePrinterSettings,
  UpdatePrinterSettingsInput,
} from '../repositories/PrinterSettingsRepository';

export async function getActivePrinterSettings(): Promise<
  PrinterSettings | null
> {
  return fetchActivePrinterSettings();
}

export async function getPrinterSettings(): Promise<
  PrinterSettings[]
> {
  return fetchPrinterSettings();
}

export async function savePrinterSettings(
  id: string,
  input:
    UpdatePrinterSettingsInput,
): Promise<PrinterSettings> {
  if (!id.trim()) {
    throw new Error(
      'La configuración de impresora no es válida.',
    );
  }

  if (!input.name.trim()) {
    throw new Error(
      'El nombre de la impresora es obligatorio.',
    );
  }

  if (
    input.connectionType ===
    'bluetooth'
  ) {
    if (
      !input.bluetoothAddress
        ?.trim()
    ) {
      throw new Error(
        'Selecciona una impresora Bluetooth.',
      );
    }

    input = {
      ...input,
      bluetoothAddress:
        input.bluetoothAddress
          .trim()
          .toUpperCase(),

      ipAddress:
        null,

      port:
        null,
    };
  }

  return updatePrinterSettings(
    id,
    input,
  );
}