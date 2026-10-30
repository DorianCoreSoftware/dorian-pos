import React from 'react';

import {
  Text,
  View,
} from 'react-native';

import {
  DailyProfitabilityReport,
  ProfitabilityReport,
} from '../../../services/reportService';

import {
  useBusiness,
} from '../../../context/BusinessContext';

import {
  styles,
} from './AdminProfitabilityReport.styles';

interface Props {
  summary:
    ProfitabilityReport;
  daily:
    DailyProfitabilityReport[];
  formatCurrency:
    (value: number) => string;
}

export function AdminProfitabilityReport({
  summary,
  daily,
  formatCurrency,
}: Props) {
  const {
    theme,
  } =
    useBusiness();

  const coverageComplete =
    summary.costCoveragePercent >=
    99.999;

  return (
    <>
      <View
        style={
          styles.grid
        }
      >
        <Metric
          label="Ventas netas"
          value={
            formatCurrency(
              summary.netSales,
            )
          }
          theme={
            theme
          }
        />

        <Metric
          label="Costo vendido"
          value={
            formatCurrency(
              summary.cogs,
            )
          }
          theme={
            theme
          }
        />

        <Metric
          label="Utilidad bruta"
          value={
            formatCurrency(
              summary.grossProfit,
            )
          }
          theme={
            theme
          }
        />

        <Metric
          label="Margen bruto"
          value={
            summary.grossMarginPercent ===
            null
              ? '—'
              : `${summary.grossMarginPercent.toFixed(1)}%`
          }
          theme={
            theme
          }
        />
      </View>

      <View
        style={[
          styles.card,
          {
            borderColor:
              theme.border,
            backgroundColor:
              theme.surface,
          },
        ]}
      >
        <Text
          style={[
            styles.title,
            {
              color:
                theme.text,
            },
          ]}
        >
          Cobertura de costeo
        </Text>

        <Text
          style={[
            styles.coverageValue,
            {
              color:
                coverageComplete
                  ? theme.primary
                  : theme.text,
            },
          ]}
        >
          {summary.costCoveragePercent.toFixed(
            1,
          )}
          %
        </Text>

        <Text
          style={[
            styles.meta,
            {
              color:
                theme.textMuted,
            },
          ]}
        >
          {summary.costedOrdersCount} de{' '}
          {summary.ordersCount} órdenes entregadas tienen snapshot completo de costo.
        </Text>

        {!coverageComplete ? (
          <View
            style={[
              styles.warning,
              {
                borderColor:
                  theme.border,
                backgroundColor:
                  theme.background,
              },
            ]}
          >
            <Text
              style={[
                styles.warningText,
                {
                  color:
                    theme.textMuted,
                },
              ]}
            >
              Hay {summary.uncostedOrdersCount} orden(es) sin costo histórico exacto. La utilidad mostrada usa únicamente los costos conocidos y puede estar sobreestimada para este periodo.
            </Text>
          </View>
        ) : null}
      </View>

      <View
        style={[
          styles.card,
          {
            borderColor:
              theme.border,
            backgroundColor:
              theme.surface,
          },
        ]}
      >
        <Text
          style={[
            styles.title,
            {
              color:
                theme.text,
            },
          ]}
        >
          Desglose
        </Text>

        <Row
          label="Ventas entregadas"
          value={
            formatCurrency(
              summary.grossSales,
            )
          }
          theme={
            theme
          }
        />

        <Row
          label="Devoluciones"
          value={
            formatCurrency(
              summary.refunds,
            )
          }
          theme={
            theme
          }
        />

        <Row
          label="Ventas netas"
          value={
            formatCurrency(
              summary.netSales,
            )
          }
          theme={
            theme
          }
        />

        <Row
          label="Costo de insumos consumidos"
          value={
            formatCurrency(
              summary.cogs,
            )
          }
          theme={
            theme
          }
        />

        <Row
          label="Utilidad bruta"
          value={
            formatCurrency(
              summary.grossProfit,
            )
          }
          theme={
            theme
          }
          strong
        />
      </View>

      <View
        style={[
          styles.card,
          {
            borderColor:
              theme.border,
            backgroundColor:
              theme.surface,
          },
        ]}
      >
        <Text
          style={[
            styles.title,
            {
              color:
                theme.text,
            },
          ]}
        >
          Utilidad por día
        </Text>

        {daily.length ===
        0 ? (
          <Text
            style={[
              styles.empty,
              {
                color:
                  theme.textMuted,
              },
            ]}
          >
            No hay ventas entregadas en este periodo.
          </Text>
        ) : (
          daily.map(
            day => {
              const coverage =
                day.ordersCount > 0
                  ? (
                    day.costedOrdersCount /
                    day.ordersCount
                  ) *
                    100
                  : 100;

              return (
                <View
                  key={
                    day.reportDate
                  }
                  style={[
                    styles.day,
                    {
                      borderColor:
                        theme.border,
                    },
                  ]}
                >
                  <View
                    style={
                      styles.dayHeader
                    }
                  >
                    <Text
                      style={[
                        styles.dayDate,
                        {
                          color:
                            theme.text,
                        },
                      ]}
                    >
                      {day.reportDate}
                    </Text>

                    <Text
                      style={[
                        styles.dayProfit,
                        {
                          color:
                            theme.primary,
                        },
                      ]}
                    >
                      {formatCurrency(
                        day.grossProfit,
                      )}
                    </Text>
                  </View>

                  <Text
                    style={[
                      styles.meta,
                      {
                        color:
                          theme.textMuted,
                      },
                    ]}
                  >
                    Ventas netas {formatCurrency(
                      day.netSales,
                    )}
                    {' · '}
                    Costo {formatCurrency(
                      day.cogs,
                    )}
                    {' · '}
                    Margen{' '}
                    {day.grossMarginPercent ===
                    null
                      ? '—'
                      : `${day.grossMarginPercent.toFixed(1)}%`}
                    {' · '}
                    Cobertura {coverage.toFixed(
                      0,
                    )}
                    %
                  </Text>
                </View>
              );
            },
          )
        )}
      </View>
    </>
  );
}

function Metric({
  label,
  value,
  theme,
}: {
  label: string;
  value: string;
  theme: {
    text: string;
    textMuted: string;
    surface: string;
    border: string;
  };
}) {
  return (
    <View
      style={[
        styles.metric,
        {
          borderColor:
            theme.border,
          backgroundColor:
            theme.surface,
        },
      ]}
    >
      <Text
        style={[
          styles.metricLabel,
          {
            color:
              theme.textMuted,
          },
        ]}
      >
        {label}
      </Text>

      <Text
        style={[
          styles.metricValue,
          {
            color:
              theme.text,
          },
        ]}
      >
        {value}
      </Text>
    </View>
  );
}

function Row({
  label,
  value,
  theme,
  strong = false,
}: {
  label: string;
  value: string;
  strong?: boolean;
  theme: {
    text: string;
    textMuted: string;
    border: string;
  };
}) {
  return (
    <View
      style={[
        styles.row,
        {
          borderBottomColor:
            theme.border,
        },
      ]}
    >
      <Text
        style={[
          styles.rowLabel,
          {
            color:
              theme.textMuted,
          },
        ]}
      >
        {label}
      </Text>

      <Text
        style={[
          strong
            ? styles.rowValueStrong
            : styles.rowValue,
          {
            color:
              theme.text,
          },
        ]}
      >
        {value}
      </Text>
    </View>
  );
}
