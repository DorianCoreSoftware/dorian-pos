import {
  useCallback,
} from 'react';

import {
  useBusiness,
} from '../context/BusinessContext';

import {
  DEFAULT_CURRENCY_CODE,
  formatCompactCurrency as formatCompactCurrencyValue,
  formatCurrency as formatCurrencyValue,
  normalizeCurrencyCode,
} from '../Utils/currency';

export interface CurrencyFormatter {
  currencyCode: string;
  formatCurrency: (
    value: number,
  ) => string;
  formatCompactCurrency: (
    value: number,
  ) => string;
}

export function useCurrency(): CurrencyFormatter {
  const {
    business,
  } = useBusiness();

  const currencyCode =
    normalizeCurrencyCode(
      business?.identity
        .currencyCode ??
      DEFAULT_CURRENCY_CODE,
    );

  const formatCurrency =
    useCallback(
      (
        value: number,
      ): string =>
        formatCurrencyValue(
          value,
          currencyCode,
        ),
      [
        currencyCode,
      ],
    );

  const formatCompactCurrency =
    useCallback(
      (
        value: number,
      ): string =>
        formatCompactCurrencyValue(
          value,
          currencyCode,
        ),
      [
        currencyCode,
      ],
    );

  return {
    currencyCode,
    formatCurrency,
    formatCompactCurrency,
  };
}
