import { CLIENT_TICKET_LOGO } from './clientPrinterAssets';
import { BURGER_KONG_PROMO, LUCKY_DORIAN } from './printerAssets';

export interface PrinterRasterImage {
  width: number;
  height: number;
  base64: string;
}

export const runtimeBranding = {
  clientId: "kong-burger",
  businessName: "Burger Kong",
  headerLogoSource: require("../../clients/kong-burger/assets/header-logo.png"),
  printer: {
    ticketLogo: CLIENT_TICKET_LOGO as PrinterRasterImage | null,
  },
} as const;

const promotionRules = [
  {
    "match": "kong",
    "export": "BURGER_KONG_PROMO"
  },
  {
    "match": "dorian",
    "export": "LUCKY_DORIAN"
  }
];

export function getPromotionImageForProgram(
  programName: string | null | undefined,
): PrinterRasterImage | null {
  const normalized = (programName ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();

  for (const rule of promotionRules) {
    if (!rule.match || !normalized.includes(String(rule.match).toLowerCase())) {
      continue;
    }

    switch (rule.export) {
      case "BURGER_KONG_PROMO":
        return BURGER_KONG_PROMO as PrinterRasterImage;
      case "LUCKY_DORIAN":
        return LUCKY_DORIAN as PrinterRasterImage;
      default:
        return null;
    }
  }

  return null;
}
