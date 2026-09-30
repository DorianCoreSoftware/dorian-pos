export const DEFAULT_CURRENCY_CODE =
  'MXN';

export const DEFAULT_CURRENCY_LOCALE =
  'es-MX';

export function normalizeCurrencyCode(
  currencyCode?: string | null,
): string {
  const normalized =
    currencyCode
      ?.trim()
      .toUpperCase();

  return normalized &&
    /^[A-Z]{3}$/.test(
      normalized,
    )
    ? normalized
    : DEFAULT_CURRENCY_CODE;
}

export function formatCurrency(
  value: number,
  currencyCode?: string | null,
  locale = DEFAULT_CURRENCY_LOCALE,
): string {
  const amount =
    Number(value);

  const safeAmount =
    Number.isFinite(amount)
      ? amount
      : 0;

  const normalizedCurrencyCode =
    normalizeCurrencyCode(
      currencyCode,
    );

  try {
    return new Intl.NumberFormat(
      locale,
      {
        style:
          'currency',

        currency:
          normalizedCurrencyCode,

        minimumFractionDigits:
          2,

        maximumFractionDigits:
          2,
      },
    ).format(
      safeAmount,
    );
  } catch {
    return `${normalizedCurrencyCode} ${safeAmount.toFixed(
      2,
    )}`;
  }
}

export function formatCompactCurrency(
  value: number,
  currencyCode?: string | null,
): string {
  const amount =
    Number(value);

  const safeAmount =
    Number.isFinite(amount)
      ? amount
      : 0;

  if (
    Math.abs(
      safeAmount,
    ) >= 1000
  ) {
    const compactValue =
      safeAmount /
      1000;

    return `${formatCurrency(
      compactValue,
      currencyCode,
    ).replace(
      /\.00(?=\D|$)/,
      '',
    )}k`;
  }

  return formatCurrency(
    Math.round(
      safeAmount,
    ),
    currencyCode,
  ).replace(
    /\.00(?=\D|$)/,
    '',
  );
}
