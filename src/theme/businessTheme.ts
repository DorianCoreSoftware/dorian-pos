import { DEFAULT_BRAND_PRIMARY } from './brandStyles';

import {
  BusinessIdentity,
} from '../services/businessHoursService';

export interface BusinessTheme {
  primary: string;
  secondary: string;

  background: string;
  surface: string;
  surfaceAlt: string;

  text: string;
  textMuted: string;

  border: string;

  onPrimary: string;

  danger: string;
  success: string;
  warning: string;
}

const DEFAULT_SECONDARY =
  '#000000';


function getContrastTextColor(
  hexColor: string,
): string {
  const clean =
    hexColor.replace('#', '');

  if (!/^[0-9A-Fa-f]{6}$/.test(clean)) {
    return '#121212';
  }

  const red = parseInt(clean.slice(0, 2), 16);
  const green = parseInt(clean.slice(2, 4), 16);
  const blue = parseInt(clean.slice(4, 6), 16);

  const luminance =
    (0.299 * red + 0.587 * green + 0.114 * blue) / 255;

  return luminance > 0.58
    ? '#121212'
    : '#FFFFFF';
}

export function createBusinessTheme(
  identity:
    BusinessIdentity | null |
    undefined,
): BusinessTheme {
  const primary =
    identity?.primaryColor ||
    DEFAULT_BRAND_PRIMARY;

  return {
    primary,

    secondary:
      identity?.secondaryColor ||
      DEFAULT_SECONDARY,

    /*
     * Por ahora conservamos el
     * tema oscuro actual de Dorian POS.
     *
     * Después podremos permitir
     * light/dark/custom.
     */
    background:
      '#121212',

    surface:
      '#1E1E1E',

    surfaceAlt:
      '#2A2A2A',

    text:
      '#FFFFFF',

    textMuted:
      '#AAAAAA',

    border:
      '#3A3A3A',

    /*
     * Color utilizado sobre botones
     * con el color primario.
     */
    onPrimary:
      getContrastTextColor(primary),

    /*
     * Colores semánticos.
     * No dependen de la marca.
     */
    danger:
      '#FF5252',

    success:
      '#4CAF50',

    warning:
      '#FFB300',
  };
}