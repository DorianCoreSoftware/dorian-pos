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

const DEFAULT_PRIMARY =
  '#FFBF00';

const DEFAULT_SECONDARY =
  '#000000';

export function createBusinessTheme(
  identity:
    BusinessIdentity | null |
    undefined,
): BusinessTheme {
  return {
    primary:
      identity?.primaryColor ||
      DEFAULT_PRIMARY,

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
      '#121212',

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