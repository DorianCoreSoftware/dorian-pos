export const DEFAULT_BRAND_PRIMARY =
  '#FFBF00';

/**
 * Convierte un color hexadecimal #RRGGBB a rgba() conservando
 * la opacidad solicitada. Los colores de negocio se validan
 * como hexadecimal antes de guardarse.
 */
export function withAlpha(
  hexColor: string,
  alpha: number,
): string {
  const clean =
    hexColor.replace('#', '');

  if (!/^[0-9A-Fa-f]{6}$/.test(clean)) {
    return hexColor;
  }

  const red =
    parseInt(clean.slice(0, 2), 16);
  const green =
    parseInt(clean.slice(2, 4), 16);
  const blue =
    parseInt(clean.slice(4, 6), 16);

  return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
}
