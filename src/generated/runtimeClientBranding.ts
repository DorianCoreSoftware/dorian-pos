import { CLIENT_TICKET_LOGO } from './clientPrinterAssets';

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
