import {
  fetchActivePrinterSettings,
  fetchPrinterSettings,
  PrinterSettings,
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