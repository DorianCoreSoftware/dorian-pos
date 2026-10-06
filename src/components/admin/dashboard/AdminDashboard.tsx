import React, {
  useEffect,
  useMemo,
  useState,
} from 'react';

import {
  ActivityIndicator,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import DateTimePicker, {
  DateTimePickerEvent,
} from '@react-native-community/datetimepicker';

import {
  PeriodFilter,
  PeriodFilterValue,
} from '../../period-filter/PeriodFilter';

import {
  useBusiness,
} from '../../../context/BusinessContext';

import {
  useCurrency,
} from '../../../hooks/useCurrency';

import {
  DailyFinancialReport,
  ExpenseCategoryReport,
  FinancialBalanceReport,
  SalesReportSummary,
  getDailyFinancialReport,
  getExpenseCategoryReport,
  getFinancialBalanceReport,
  getSalesReportSummary,
} from '../../../services/reportService';

import {
  formatPickerDate,
  getBusinessPeriodRange,
} from '../../../Utils/businessTime';

import {
  styles,
} from './AdminDashboard.styles';

const EMPTY_FINANCIAL: FinancialBalanceReport = {
  gross_sales: 0,
  refunds: 0,
  net_sales: 0,
  expenses: 0,
  balance: 0,
  expense_count: 0,
};

const EMPTY_SALES: SalesReportSummary = {
  total_revenue: 0,
  orders_count: 0,
  average_ticket: 0,
  items_sold: 0,
};

export function AdminDashboard() {
  const {
    business,
    theme,
  } = useBusiness();

  const {
    formatCurrency,
    formatCompactCurrency,
  } = useCurrency();

  const [
    period,
    setPeriod,
  ] = useState<PeriodFilterValue>('today');

  const [
    customStartDate,
    setCustomStartDate,
  ] = useState(new Date());

  const [
    customEndDate,
    setCustomEndDate,
  ] = useState(new Date());

  const [
    showStartPicker,
    setShowStartPicker,
  ] = useState(false);

  const [
    showEndPicker,
    setShowEndPicker,
  ] = useState(false);

  const [
    financial,
    setFinancial,
  ] = useState<FinancialBalanceReport>(EMPTY_FINANCIAL);

  const [
    sales,
    setSales,
  ] = useState<SalesReportSummary>(EMPTY_SALES);

  const [
    daily,
    setDaily,
  ] = useState<DailyFinancialReport[]>([]);

  const [
    categories,
    setCategories,
  ] = useState<ExpenseCategoryReport[]>([]);

  const [
    isLoading,
    setIsLoading,
  ] = useState(true);

  const [
    errorMessage,
    setErrorMessage,
  ] = useState<string | null>(null);

  const dateRange = useMemo(
    () => getBusinessPeriodRange(
      period,
      customStartDate,
      customEndDate,
      business?.timezone,
      2020,
    ),
    [
      period,
      customStartDate,
      customEndDate,
      business?.timezone,
    ],
  );

  useEffect(() => {
    const loadDashboard = async (): Promise<void> => {
      try {
        setIsLoading(true);
        setErrorMessage(null);

        const [
          financialData,
          salesData,
          dailyData,
          categoryData,
        ] = await Promise.all([
          getFinancialBalanceReport(
            dateRange.from,
            dateRange.to,
          ),
          getSalesReportSummary(
            dateRange.from,
            dateRange.to,
          ),
          getDailyFinancialReport(
            dateRange.from,
            dateRange.to,
          ),
          getExpenseCategoryReport(
            dateRange.from,
            dateRange.to,
          ),
        ]);

        setFinancial(financialData);
        setSales(salesData);
        setDaily(dailyData);
        setCategories(categoryData);
      } catch (error) {
        console.error(
          'Error loading financial dashboard:',
          error,
        );

        setErrorMessage(
          error instanceof Error
            ? error.message
            : 'No se pudo cargar el dashboard financiero.',
        );
      } finally {
        setIsLoading(false);
      }
    };

    void loadDashboard();
  }, [
    dateRange.from,
    dateRange.to,
  ]);

  const balanceIsPositive =
    financial.balance >= 0;

  const expenseRatio =
    financial.net_sales > 0
      ? Math.min(
        100,
        (
          financial.expenses /
          financial.net_sales
        ) * 100,
      )
      : financial.expenses > 0
        ? 100
        : 0;

  const topExpenseCategory =
    categories[0] ?? null;

  const maxDailyValue =
    Math.max(
      1,
      ...daily.flatMap(
        row => [
          row.net_sales,
          row.expenses,
        ],
      ),
    );

  const handleStartDateChange = (
    event: DateTimePickerEvent,
    selectedDate?: Date,
  ): void => {
    setShowStartPicker(false);

    if (
      event.type !== 'set' ||
      !selectedDate
    ) {
      return;
    }

    setCustomStartDate(selectedDate);

    if (
      selectedDate >
      customEndDate
    ) {
      setCustomEndDate(selectedDate);
    }
  };

  const handleEndDateChange = (
    event: DateTimePickerEvent,
    selectedDate?: Date,
  ): void => {
    setShowEndPicker(false);

    if (
      event.type !== 'set' ||
      !selectedDate
    ) {
      return;
    }

    setCustomEndDate(selectedDate);
  };

  if (isLoading) {
    return (
      <View style={styles.centerState}>
        <ActivityIndicator
          size="large"
          color={theme.primary}
        />

        <Text
          style={[
            styles.centerStateText,
            {
              color:
                theme.textMuted,
            },
          ]}
        >
          Cargando dashboard...
        </Text>
      </View>
    );
  }

  if (errorMessage) {
    return (
      <View style={styles.centerState}>
        <Text
          style={[
            styles.errorTitle,
            {
              color:
                theme.danger,
            },
          ]}
        >
          No se pudo cargar el dashboard
        </Text>

        <Text
          style={[
            styles.centerStateText,
            {
              color:
                theme.textMuted,
            },
          ]}
        >
          {errorMessage}
        </Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.header}>
        <View style={styles.headerText}>
          <Text
            style={[
              styles.title,
              {
                color:
                  theme.text,
              },
            ]}
          >
            Dashboard financiero
          </Text>

          <Text
            style={[
              styles.subtitle,
              {
                color:
                  theme.textMuted,
              },
            ]}
          >
            Vista ejecutiva de ventas, egresos y balance operativo.
          </Text>
        </View>

        <View style={styles.periodControl}>
          <PeriodFilter
            value={period}
            onChange={setPeriod}
          />
        </View>
      </View>

      {period === 'custom' ? (
        <View style={styles.customDateRow}>
          <TouchableOpacity
            style={[
              styles.dateButton,
              {
                borderColor:
                  theme.border,
                backgroundColor:
                  theme.surface,
              },
            ]}
            onPress={() =>
              setShowStartPicker(true)
            }
          >
            <Text
              style={[
                styles.dateLabel,
                {
                  color:
                    theme.textMuted,
                },
              ]}
            >
              Desde
            </Text>

            <Text
              style={[
                styles.dateValue,
                {
                  color:
                    theme.text,
                },
              ]}
            >
              {formatPickerDate(customStartDate)}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.dateButton,
              {
                borderColor:
                  theme.border,
                backgroundColor:
                  theme.surface,
              },
            ]}
            onPress={() =>
              setShowEndPicker(true)
            }
          >
            <Text
              style={[
                styles.dateLabel,
                {
                  color:
                    theme.textMuted,
                },
              ]}
            >
              Hasta
            </Text>

            <Text
              style={[
                styles.dateValue,
                {
                  color:
                    theme.text,
                },
              ]}
            >
              {formatPickerDate(customEndDate)}
            </Text>
          </TouchableOpacity>
        </View>
      ) : null}

      <View style={styles.kpiGrid}>
        <DashboardKpi
          label="Ventas netas"
          value={formatCurrency(
            financial.net_sales,
          )}
          hint={`${sales.orders_count} venta(s)`}
          theme={theme}
        />

        <DashboardKpi
          label="Egresos"
          value={formatCurrency(
            financial.expenses,
          )}
          hint={`${financial.expense_count} movimiento(s)`}
          theme={theme}
        />

        <DashboardKpi
          label="Balance"
          value={formatCurrency(
            financial.balance,
          )}
          hint={
            balanceIsPositive
              ? 'Ingresos por encima de egresos'
              : 'Egresos por encima de ingresos'
          }
          valueColor={
            balanceIsPositive
              ? theme.success
              : theme.danger
          }
          emphasized
          theme={theme}
        />

        <DashboardKpi
          label="Ticket promedio"
          value={formatCurrency(
            sales.average_ticket,
          )}
          hint={`${sales.items_sold} artículo(s)`}
          theme={theme}
        />
      </View>

      <View
        style={[
          styles.healthCard,
          {
            backgroundColor:
              theme.surface,
            borderColor:
              theme.border,
          },
        ]}
      >
        <View style={styles.healthHeader}>
          <View style={styles.healthHeaderText}>
            <Text
              style={[
                styles.sectionTitle,
                {
                  color:
                    theme.text,
                },
              ]}
            >
              Salud del periodo
            </Text>

            <Text
              style={[
                styles.sectionSubtitle,
                {
                  color:
                    theme.textMuted,
                },
              ]}
            >
              Qué proporción de las ventas netas se está yendo en egresos registrados.
            </Text>
          </View>

          <Text
            style={[
              styles.healthPercent,
              {
                color:
                  expenseRatio <= 70
                    ? theme.success
                    : expenseRatio <= 90
                      ? theme.primary
                      : theme.danger,
              },
            ]}
          >
            {expenseRatio.toFixed(1)}%
          </Text>
        </View>

        <View
          style={[
            styles.progressTrack,
            {
              backgroundColor:
                theme.surfaceAlt,
            },
          ]}
        >
          <View
            style={[
              styles.progressFill,
              {
                width:
                  `${expenseRatio}%`,
                backgroundColor:
                  expenseRatio <= 70
                    ? theme.success
                    : expenseRatio <= 90
                      ? theme.primary
                      : theme.danger,
              },
            ]}
          />
        </View>

        <View style={styles.healthFooter}>
          <Text
            style={[
              styles.healthMetric,
              {
                color:
                  theme.textMuted,
              },
            ]}
          >
            Brutas {formatCurrency(financial.gross_sales)}
          </Text>

          <Text
            style={[
              styles.healthMetric,
              {
                color:
                  theme.textMuted,
              },
            ]}
          >
            Reembolsos {formatCurrency(financial.refunds)}
          </Text>
        </View>
      </View>

      <View style={styles.twoColumnGrid}>
        <View
          style={[
            styles.panel,
            {
              backgroundColor:
                theme.surface,
              borderColor:
                theme.border,
            },
          ]}
        >
          <Text
            style={[
              styles.sectionTitle,
              {
                color:
                  theme.text,
              },
            ]}
          >
            Tendencia diaria
          </Text>

          <Text
            style={[
              styles.sectionSubtitle,
              {
                color:
                  theme.textMuted,
              },
            ]}
          >
            Ventas netas contra egresos.
          </Text>

          {daily.length === 0 ? (
            <Text
              style={[
                styles.emptyText,
                {
                  color:
                    theme.textMuted,
                },
              ]}
            >
              No hay movimientos en este periodo.
            </Text>
          ) : (
            <View style={styles.dailyList}>
              {daily.slice(-14).map(
                row => {
                  const salesWidth =
                    Math.max(
                      2,
                      (
                        row.net_sales /
                        maxDailyValue
                      ) * 100,
                    );

                  const expenseWidth =
                    Math.max(
                      row.expenses > 0
                        ? 2
                        : 0,
                      (
                        row.expenses /
                        maxDailyValue
                      ) * 100,
                    );

                  return (
                    <View
                      key={row.report_date}
                      style={styles.dailyRow}
                    >
                      <View style={styles.dailyHeader}>
                        <Text
                          style={[
                            styles.dailyDate,
                            {
                              color:
                                theme.text,
                            },
                          ]}
                        >
                          {formatShortDate(
                            row.report_date,
                          )}
                        </Text>

                        <Text
                          style={[
                            styles.dailyBalance,
                            {
                              color:
                                row.balance >= 0
                                  ? theme.success
                                  : theme.danger,
                            },
                          ]}
                        >
                          {formatCompactCurrency(
                            row.balance,
                          )}
                        </Text>
                      </View>

                      <View
                        style={[
                          styles.miniTrack,
                          {
                            backgroundColor:
                              theme.surfaceAlt,
                          },
                        ]}
                      >
                        <View
                          style={[
                            styles.miniBar,
                            {
                              width:
                                `${salesWidth}%`,
                              backgroundColor:
                                theme.success,
                            },
                          ]}
                        />
                      </View>

                      <View
                        style={[
                          styles.miniTrack,
                          {
                            backgroundColor:
                              theme.surfaceAlt,
                          },
                        ]}
                      >
                        <View
                          style={[
                            styles.miniBar,
                            {
                              width:
                                `${expenseWidth}%`,
                              backgroundColor:
                                theme.danger,
                            },
                          ]}
                        />
                      </View>
                    </View>
                  );
                },
              )}
            </View>
          )}
        </View>

        <View
          style={[
            styles.panel,
            {
              backgroundColor:
                theme.surface,
              borderColor:
                theme.border,
            },
          ]}
        >
          <Text
            style={[
              styles.sectionTitle,
              {
                color:
                  theme.text,
              },
            ]}
          >
            Egresos por categoría
          </Text>

          <Text
            style={[
              styles.sectionSubtitle,
              {
                color:
                  theme.textMuted,
              },
            ]}
          >
            En qué se está gastando más.
          </Text>

          {topExpenseCategory ? (
            <View
              style={[
                styles.topCategory,
                {
                  backgroundColor:
                    theme.surfaceAlt,
                },
              ]}
            >
              <Text
                style={[
                  styles.topCategoryLabel,
                  {
                    color:
                      theme.textMuted,
                  },
                ]}
              >
                MAYOR EGRESO
              </Text>

              <Text
                style={[
                  styles.topCategoryName,
                  {
                    color:
                      theme.text,
                  },
                ]}
              >
                {topExpenseCategory.category_name}
              </Text>

              <Text
                style={[
                  styles.topCategoryAmount,
                  {
                    color:
                      theme.primary,
                  },
                ]}
              >
                {formatCurrency(
                  topExpenseCategory.amount,
                )}
              </Text>
            </View>
          ) : null}

          <View style={styles.categoryList}>
            {categories.slice(0, 6).map(
              category => {
                const width =
                  financial.expenses > 0
                    ? Math.max(
                      2,
                      (
                        category.amount /
                        financial.expenses
                      ) * 100,
                    )
                    : 0;

                return (
                  <View
                    key={category.category_id}
                    style={styles.categoryRow}
                  >
                    <View style={styles.categoryHeader}>
                      <Text
                        numberOfLines={1}
                        style={[
                          styles.categoryName,
                          {
                            color:
                              theme.text,
                          },
                        ]}
                      >
                        {category.category_name}
                      </Text>

                      <Text
                        style={[
                          styles.categoryAmount,
                          {
                            color:
                              theme.textMuted,
                          },
                        ]}
                      >
                        {formatCompactCurrency(
                          category.amount,
                        )}
                      </Text>
                    </View>

                    <View
                      style={[
                        styles.miniTrack,
                        {
                          backgroundColor:
                            theme.surfaceAlt,
                        },
                      ]}
                    >
                      <View
                        style={[
                          styles.miniBar,
                          {
                            width:
                              `${width}%`,
                            backgroundColor:
                              theme.primary,
                          },
                        ]}
                      />
                    </View>
                  </View>
                );
              },
            )}

            {categories.length === 0 ? (
              <Text
                style={[
                  styles.emptyText,
                  {
                    color:
                      theme.textMuted,
                  },
                ]}
              >
                No hay egresos registrados en este periodo.
              </Text>
            ) : null}
          </View>
        </View>
      </View>

      <Text
        style={[
          styles.accountingNote,
          {
            color:
              theme.textMuted,
          },
        ]}
      >
        Balance operativo: ventas cobradas menos reembolsos y egresos registrados. No sustituye una utilidad contable o fiscal.
      </Text>

      {showStartPicker ? (
        <DateTimePicker
          value={customStartDate}
          mode="date"
          onChange={handleStartDateChange}
          maximumDate={new Date()}
        />
      ) : null}

      {showEndPicker ? (
        <DateTimePicker
          value={customEndDate}
          mode="date"
          onChange={handleEndDateChange}
          minimumDate={customStartDate}
          maximumDate={new Date()}
        />
      ) : null}
    </ScrollView>
  );
}

interface DashboardKpiProps {
  label: string;
  value: string;
  hint: string;
  valueColor?: string;
  emphasized?: boolean;
  theme: {
    text: string;
    textMuted: string;
    surface: string;
    border: string;
    primary: string;
  };
}

function DashboardKpi({
  label,
  value,
  hint,
  valueColor,
  emphasized = false,
  theme,
}: DashboardKpiProps) {
  return (
    <View
      style={[
        styles.kpiCard,
        {
          backgroundColor:
            theme.surface,
          borderColor:
            emphasized
              ? theme.primary
              : theme.border,
        },
      ]}
    >
      <Text
        style={[
          styles.kpiLabel,
          {
            color:
              theme.textMuted,
          },
        ]}
      >
        {label}
      </Text>

      <Text
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.72}
        style={[
          styles.kpiValue,
          {
            color:
              valueColor ??
              theme.text,
          },
        ]}
      >
        {value}
      </Text>

      <Text
        style={[
          styles.kpiHint,
          {
            color:
              theme.textMuted,
          },
        ]}
      >
        {hint}
      </Text>
    </View>
  );
}

function getDashboardDateRange(
  period: PeriodFilterValue,
  customStartDate: Date,
  customEndDate: Date,
): {
  from: Date;
  to: Date;
} {
  const now = new Date();

  if (period === 'all') {
    return {
      from: new Date(2020, 0, 1),
      to: endOfDay(now),
    };
  }

  if (period === 'custom') {
    return {
      from: startOfDay(customStartDate),
      to: endOfDay(customEndDate),
    };
  }

  if (period === 'month') {
    return {
      from: new Date(
        now.getFullYear(),
        now.getMonth(),
        1,
        0,
        0,
        0,
        0,
      ),
      to: endOfDay(now),
    };
  }

  if (period === '7days') {
    const from = startOfDay(now);
    from.setDate(
      from.getDate() - 6,
    );

    return {
      from,
      to: endOfDay(now),
    };
  }

  return {
    from: startOfDay(now),
    to: endOfDay(now),
  };
}

function startOfDay(
  date: Date,
): Date {
  return new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
    0,
    0,
    0,
    0,
  );
}

function endOfDay(
  date: Date,
): Date {
  return new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
    23,
    59,
    59,
    999,
  );
}

function formatDate(
  date: Date,
): string {
  return date.toLocaleDateString(
    'es-MX',
    {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    },
  );
}

function formatShortDate(
  dateValue: string,
): string {
  const date =
    new Date(
      `${dateValue}T00:00:00`,
    );

  return date.toLocaleDateString(
    'es-MX',
    {
      day: '2-digit',
      month: 'short',
    },
  );
}
