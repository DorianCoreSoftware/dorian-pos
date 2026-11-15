import React, {
  useCallback,
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

import {
  DashboardPeriod,
  DashboardSnapshot,
  getDashboardSnapshot,
} from '../../../services/dashboardService';

import {
  useBusiness,
} from '../../../context/BusinessContext';

import {
  styles,
} from './AdminDashboard.styles';

import {
  getWebVisitStats,
  WebVisitStats,
} from '../../../services/webAnalyticsService';

const PERIODS:
Array<{
  key: DashboardPeriod;
  label: string;
}> = [
  {
    key:
      'today',
    label:
      'HOY',
  },
  {
    key:
      '7d',
    label:
      '7 DÍAS',
  },
  {
    key:
      '30d',
    label:
      '30 DÍAS',
  },
];

function percentageChange(
  current: number,
  previous: number,
): number | null {
  if (
    previous ===
    0
  ) {
    if (
      current ===
      0
    ) {
      return 0;
    }

    return null;
  }

  return (
    (
      current -
      previous
    ) /
    Math.abs(
      previous,
    )
  ) * 100;
}

function comparisonLabel(
  current: number,
  previous: number,
): string {
  const change =
    percentageChange(
      current,
      previous,
    );

  if (
    change ===
    null
  ) {
    return current > 0
      ? 'Sin base comparable'
      : 'Sin cambio';
  }

  const prefix =
    change > 0
      ? '+'
      : '';

  return `${prefix}${change.toFixed(
    1,
  )}% vs. periodo anterior`;
}

function dateLabel(
  snapshot:
    DashboardSnapshot,
): string {
  const formatter =
    new Intl.DateTimeFormat(
      'es-MX',
      {
        day:
          '2-digit',
        month:
          'short',
      },
    );

  return `${formatter.format(
    snapshot.from,
  )} – ${formatter.format(
    snapshot.to,
  )}`;
}


function hasFullCostCoverage(
  snapshot:
    DashboardSnapshot,
): boolean {
  return (
    snapshot.costCoveragePercent >=
    99.95
  );
}

function profitabilityTitle(
  snapshot:
    DashboardSnapshot,
): string {
  return hasFullCostCoverage(
    snapshot,
  )
    ? 'Utilidad bruta'
    : 'Utilidad con costo conocido';
}

function marginTitle(
  snapshot:
    DashboardSnapshot,
): string {
  return hasFullCostCoverage(
    snapshot,
  )
    ? 'Margen bruto'
    : 'Margen sobre ventas con costo';
}

function shortDayLabel(
  value: string,
): string {
  const date =
    new Date(
      `${value}T00:00:00`,
    );

  return new Intl.DateTimeFormat(
    'es-MX',
    {
      day: '2-digit',
      month: 'short',
    },
  ).format(date);
}

function clampBarPercent(
  value: number,
  max: number,
): number {
  if (max <= 0) {
    return 0;
  }

  return Math.max(
    3,
    Math.min(
      100,
      (value / max) * 100,
    ),
  );
}

export function AdminDashboard() {
  const {
    business,
    theme,
  } =
    useBusiness();

  const currency =
    business?.identity
      .currencyCode ??
    'MXN';

  const money =
    useMemo(
      () =>
        new Intl.NumberFormat(
          'es-MX',
          {
            style:
              'currency',
            currency,
            maximumFractionDigits:
              2,
          },
        ),
      [
        currency,
      ],
    );

  const [
    period,
    setPeriod,
  ] =
    useState<DashboardPeriod>(
      'today',
    );

  const [
    snapshot,
    setSnapshot,
  ] =
    useState<DashboardSnapshot | null>(
      null,
    );

  const [
    loading,
    setLoading,
  ] =
    useState(true);

  const [
    error,
    setError,
  ] =
    useState<string | null>(
      null,
    );

  const [
    webVisits,
    setWebVisits,
  ] =
    useState<WebVisitStats | null>(
      null,
    );

  const load =
    useCallback(
      async () => {
        try {
          setLoading(
            true,
          );

          setError(
            null,
          );

          const [
            data,
            visits,
          ] =
            await Promise.all([
              getDashboardSnapshot(
                period,
              ),
              getWebVisitStats()
                .catch(
                  visitError => {
                    console.warn(
                      'No se pudieron cargar las visitas web:',
                      visitError,
                    );

                    return null;
                  },
                ),
            ]);

          setSnapshot(
            data,
          );

          setWebVisits(
            visits,
          );
        } catch (loadError) {
          console.error(
            'Error cargando Dashboard:',
            loadError,
          );

          setError(
            loadError instanceof
              Error
              ? loadError.message
              : 'No se pudo cargar el Dashboard.',
          );
        } finally {
          setLoading(
            false,
          );
        }
      },
      [
        period,
      ],
    );

  useEffect(
    () => {
      void load();
    },
    [
      load,
    ],
  );

  return (
    <View
      style={
        styles.container
      }
    >
      <View
        style={
          styles.header
        }
      >
        <View>
          <Text
            style={[
              styles.title,
              {
                color:
                  theme.text,
              },
            ]}
          >
            Dashboard
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
            Vista ejecutiva del negocio. Los datos provienen de ventas, utilidad histórica, egresos, inventario, CRM y Marketing.
          </Text>
        </View>
      </View>

      <View
        style={
          styles.periodRow
        }
      >
        {PERIODS.map(
          option => {
            const selected =
              option.key ===
              period;

            return (
              <TouchableOpacity
                key={
                  option.key
                }
                onPress={
                  () =>
                    setPeriod(
                      option.key,
                    )
                }
                style={[
                  styles.periodButton,
                  {
                    borderColor:
                      selected
                        ? theme.primary
                        : theme.border,
                    backgroundColor:
                      selected
                        ? theme.surfaceAlt
                        : theme.surface,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.periodText,
                    {
                      color:
                        selected
                          ? theme.primary
                          : theme.textMuted,
                    },
                  ]}
                >
                  {option.label}
                </Text>
              </TouchableOpacity>
            );
          },
        )}
      </View>

      {loading ? (
        <View
          style={
            styles.loading
          }
        >
          <ActivityIndicator
            color={
              theme.primary
            }
          />
        </View>
      ) : error ? (
        <View
          style={[
            styles.errorBox,
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
              styles.errorText,
              {
                color:
                  theme.text,
              },
            ]}
          >
            {error}
          </Text>

          <TouchableOpacity
            onPress={
              () => {
                void load();
              }
            }
            style={[
              styles.refreshButton,
              {
                backgroundColor:
                  theme.primary,
              },
            ]}
          >
            <Text
              style={[
                styles.refreshText,
                {
                  color:
                    theme.onPrimary,
                },
              ]}
            >
              REINTENTAR
            </Text>
          </TouchableOpacity>
        </View>
      ) : snapshot ? (
        <ScrollView
          contentContainerStyle={{
            paddingBottom:
              30,
          }}
        >
          <Text
            style={[
              styles.helper,
              {
                marginBottom:
                  10,
                color:
                  theme.textMuted,
              },
            ]}
          >
            {dateLabel(
              snapshot,
            )}
          </Text>

          <View
            style={
              styles.grid
            }
          >
            <KpiCard
              hero
              label="Ventas netas"
              value={
                money.format(
                  snapshot.netSales,
                )
              }
              comparison={
                comparisonLabel(
                  snapshot.netSales,
                  snapshot.previousNetSales,
                )
              }
              theme={
                theme
              }
            />

            <KpiCard
              hero
              label={
                profitabilityTitle(
                  snapshot,
                )
              }
              value={
                money.format(
                  snapshot.grossProfit,
                )
              }
              comparison={
                comparisonLabel(
                  snapshot.grossProfit,
                  snapshot.previousGrossProfit,
                )
              }
              theme={
                theme
              }
            />

            <KpiCard
              label="Pedidos"
              value={
                String(
                  snapshot.ordersCount,
                )
              }
              comparison={
                comparisonLabel(
                  snapshot.ordersCount,
                  snapshot.previousOrdersCount,
                )
              }
              theme={
                theme
              }
            />

            <KpiCard
              label="Ticket promedio"
              value={
                money.format(
                  snapshot.averageTicket,
                )
              }
              comparison={
                comparisonLabel(
                  snapshot.averageTicket,
                  snapshot.previousAverageTicket,
                )
              }
              theme={
                theme
              }
            />

            <KpiCard
              label={
                marginTitle(
                  snapshot,
                )
              }
              value={
                snapshot.grossMarginPercent ==
                null
                  ? '—'
                  : `${snapshot.grossMarginPercent.toFixed(
                      1,
                    )}%`
              }
              helper={
                hasFullCostCoverage(
                  snapshot,
                )
                  ? `Cobertura de costos: ${snapshot.costCoveragePercent.toFixed(
                      1,
                    )}%`
                  : `⚠ Solo ${snapshot.costCoveragePercent.toFixed(
                      1,
                    )}% de las ventas tiene costo histórico disponible`
              }
              theme={
                theme
              }
            />

            <KpiCard
              label="COGS"
              value={
                money.format(
                  snapshot.cogs,
                )
              }
              helper="Costo histórico de productos vendidos."
              theme={
                theme
              }
            />

            <KpiCard
              label="Egresos"
              value={
                money.format(
                  snapshot.expenses,
                )
              }
              theme={
                theme
              }
            />

            <KpiCard
              label="Balance"
              value={
                money.format(
                  snapshot.balance,
                )
              }
              helper={`Devoluciones: ${money.format(
                snapshot.refunds,
              )}`}
              theme={
                theme
              }
            />
          </View>

          <View
            style={
              styles.section
            }
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
              Tendencia
            </Text>

            <View
              style={[
                styles.chartCard,
                {
                  borderColor:
                    theme.border,
                  backgroundColor:
                    theme.surface,
                },
              ]}
            >
              <View
                style={
                  styles.chartHeader
                }
              >
                <View>
                  <Text
                    style={[
                      styles.chartTitle,
                      {
                        color:
                          theme.text,
                      },
                    ]}
                  >
                    Ventas por día
                  </Text>

                  <Text
                    style={[
                      styles.chartHint,
                      {
                        color:
                          theme.textMuted,
                      },
                    ]}
                  >
                    Evolución de ventas netas dentro del periodo.
                  </Text>
                </View>
              </View>

              {snapshot.dailySales.length > 0 ? (
                <View
                  style={
                    styles.barsRow
                  }
                >
                  {snapshot.dailySales.map(
                    point => {
                      const maxRevenue =
                        Math.max(
                          ...snapshot.dailySales.map(
                            item => item.revenue,
                          ),
                          0,
                        );

                      const height =
                        clampBarPercent(
                          point.revenue,
                          maxRevenue,
                        );

                      return (
                        <View
                          key={
                            point.date
                          }
                          style={
                            styles.barItem
                          }
                        >
                          <View
                            style={[
                              styles.barTrack,
                              {
                                backgroundColor:
                                  theme.surfaceAlt,
                              },
                            ]}
                          >
                            <View
                              style={[
                                styles.barFill,
                                {
                                  height:
                                    `${height}%`,
                                  backgroundColor:
                                    theme.primary,
                                },
                              ]}
                            />
                          </View>

                          <Text
                            style={[
                              styles.barLabel,
                              {
                                color:
                                  theme.textMuted,
                              },
                            ]}
                            numberOfLines={
                              1
                            }
                          >
                            {shortDayLabel(
                              point.date,
                            )}
                          </Text>
                        </View>
                      );
                    },
                  )}
                </View>
              ) : (
                <View
                  style={
                    styles.emptyState
                  }
                >
                  <Text
                    style={[
                      styles.emptyText,
                      {
                        color:
                          theme.textMuted,
                      },
                    ]}
                  >
                    No hay ventas registradas en este periodo.
                  </Text>
                </View>
              )}

              <View
                style={
                  styles.compareGrid
                }
              >
                <ComparePill
                  label="Ventas"
                  value={
                    comparisonLabel(
                      snapshot.netSales,
                      snapshot.previousNetSales,
                    )
                  }
                  theme={
                    theme
                  }
                />

                <ComparePill
                  label="Pedidos"
                  value={
                    comparisonLabel(
                      snapshot.ordersCount,
                      snapshot.previousOrdersCount,
                    )
                  }
                  theme={
                    theme
                  }
                />

                <ComparePill
                  label="Ticket"
                  value={
                    comparisonLabel(
                      snapshot.averageTicket,
                      snapshot.previousAverageTicket,
                    )
                  }
                  theme={
                    theme
                  }
                />

                <ComparePill
                  label="Utilidad"
                  value={
                    comparisonLabel(
                      snapshot.grossProfit,
                      snapshot.previousGrossProfit,
                    )
                  }
                  theme={
                    theme
                  }
                />
              </View>
            </View>
          </View>

          <View
            style={
              styles.section
            }
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
              Productos destacados
            </Text>

            <View
              style={[
                styles.chartCard,
                {
                  borderColor:
                    theme.border,
                  backgroundColor:
                    theme.surface,
                },
              ]}
            >
              {snapshot.topProducts.length > 0 ? (
                snapshot.topProducts.map(
                  (
                    product,
                    index,
                  ) => (
                    <View
                      key={
                        product.id
                      }
                      style={[
                        styles.productRow,
                        {
                          borderBottomColor:
                            theme.border,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.productRank,
                          {
                            color:
                              theme.primary,
                          },
                        ]}
                      >
                        #{index + 1}
                      </Text>

                      <View
                        style={
                          styles.productInfo
                        }
                      >
                        <Text
                          style={[
                            styles.productName,
                            {
                              color:
                                theme.text,
                            },
                          ]}
                          numberOfLines={
                            1
                          }
                        >
                          {product.name}
                        </Text>

                        <Text
                          style={[
                            styles.productMeta,
                            {
                              color:
                                theme.textMuted,
                            },
                          ]}
                        >
                          {product.unitsSold} unidades
                        </Text>
                      </View>

                      <Text
                        style={[
                          styles.productRevenue,
                          {
                            color:
                              theme.text,
                          },
                        ]}
                      >
                        {money.format(
                          product.revenue,
                        )}
                      </Text>
                    </View>
                  ),
                )
              ) : (
                <View
                  style={
                    styles.emptyState
                  }
                >
                  <Text
                    style={[
                      styles.emptyText,
                      {
                        color:
                          theme.textMuted,
                      },
                    ]}
                  >
                    No hay productos vendidos en este periodo.
                  </Text>
                </View>
              )}
            </View>
          </View>

          {!hasFullCostCoverage(
            snapshot,
          ) ? (
            <View
              style={
                styles.section
              }
            >
              <StatusCard
                title="Cobertura de costos incompleta"
                text={`La utilidad y el margen se calculan solo sobre ventas que tienen costo histórico registrado. Cobertura actual: ${snapshot.costCoveragePercent.toFixed(
                  1,
                )}%.`}
                value={
                  Math.round(
                    snapshot.costCoveragePercent,
                  )
                }
                theme={
                  theme
                }
              />
            </View>
          ) : null}

          <View
            style={
              styles.section
            }
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
              Operación
            </Text>

            <StatusCard
              title="Inventario bajo"
              text="Insumos activos en o debajo de su stock mínimo."
              value={
                snapshot.lowStockItems
              }
              theme={
                theme
              }
            />

            <StatusCard
              title="Inventario agotado"
              text="Insumos con stock en cero o negativo."
              value={
                snapshot.criticalStockItems
              }
              theme={
                theme
              }
            />
          </View>

          <View
            style={
              styles.section
            }
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
              Clientes y Marketing
            </Text>

            <View
              style={
                styles.grid
              }
            >
              <KpiCard
                label="Clientes CRM"
                value={
                  String(
                    snapshot.activeCrmCustomers,
                  )
                }
                helper={`${snapshot.newCrmCustomers} nuevos en el periodo`}
                theme={
                  theme
                }
              />

              <KpiCard
                label="Campañas activas"
                value={
                  String(
                    snapshot.activeCampaigns,
                  )
                }
                theme={
                  theme
                }
              />

              <KpiCard
                label="Revenue Marketing"
                value={
                  money.format(
                    snapshot.marketingAttributedRevenue,
                  )
                }
                helper="Ingresos atribuidos a conversiones registradas en el periodo."
                theme={
                  theme
                }
              />
            </View>
          </View>

          {webVisits ? (
            <View
              style={
                styles.section
              }
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
                Sitio web
              </Text>

              <Text
                style={[
                  styles.helper,
                  {
                    marginBottom:
                      10,
                    color:
                      theme.textMuted,
                  },
                ]}
              >
                Visitas registradas en la web pública. Una recarga de la misma sesión no genera otra visita.
              </Text>

              <View
                style={
                  styles.grid
                }
              >
                <KpiCard
                  label="Visitas hoy"
                  value={
                    String(
                      webVisits.today,
                    )
                  }
                  helper={`${webVisits.uniqueToday} visitantes únicos`}
                  theme={
                    theme
                  }
                />

                <KpiCard
                  label="Últimos 7 días"
                  value={
                    String(
                      webVisits.last7Days,
                    )
                  }
                  helper={`${webVisits.unique7Days} visitantes únicos`}
                  theme={
                    theme
                  }
                />

                <KpiCard
                  label="Últimos 30 días"
                  value={
                    String(
                      webVisits.last30Days,
                    )
                  }
                  helper={`${webVisits.unique30Days} visitantes únicos`}
                  theme={
                    theme
                  }
                />

                <KpiCard
                  label="Visitas totales"
                  value={
                    String(
                      webVisits.total,
                    )
                  }
                  helper={`${webVisits.uniqueTotal} visitantes únicos`}
                  theme={
                    theme
                  }
                />
              </View>
            </View>
          ) : null}

          <View
            style={
              styles.footer
            }
          >
            <Text
              style={[
                styles.footerText,
                {
                  color:
                    theme.textMuted,
                },
              ]}
            >
              La rentabilidad usa costos históricos capturados al entregar cada orden. Si la cobertura es menor a 100%, utilidad y margen representan únicamente las ventas con costo conocido. El balance financiero y la utilidad bruta miden conceptos diferentes: el balance descuenta egresos registrados; la utilidad bruta descuenta COGS.
            </Text>
          </View>
        </ScrollView>
      ) : null}
    </View>
  );
}

function KpiCard({
  label,
  value,
  comparison,
  helper,
  hero = false,
  theme,
}: {
  label: string;
  value: string;
  comparison?: string;
  helper?: string;
  hero?: boolean;
  theme: {
    text: string;
    textMuted: string;
    border: string;
    surface: string;
    primary: string;
  };
}) {
  return (
    <View
      style={[
        hero
          ? styles.heroCard
          : styles.card,
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
          styles.cardLabel,
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
          hero
            ? styles.heroValue
            : styles.cardValue,
          {
            color:
              theme.text,
          },
        ]}
      >
        {value}
      </Text>

      {comparison ? (
        <Text
          style={[
            styles.comparison,
            {
              color:
                theme.primary,
            },
          ]}
        >
          {comparison}
        </Text>
      ) : null}

      {helper ? (
        <Text
          style={[
            styles.helper,
            {
              color:
                theme.textMuted,
            },
          ]}
        >
          {helper}
        </Text>
      ) : null}
    </View>
  );
}

function ComparePill({
  label,
  value,
  theme,
}: {
  label: string;
  value: string;
  theme: {
    text: string;
    textMuted: string;
    border: string;
    surfaceAlt: string;
    primary: string;
  };
}) {
  return (
    <View
      style={[
        styles.comparePill,
        {
          borderColor:
            theme.border,
          backgroundColor:
            theme.surfaceAlt,
        },
      ]}
    >
      <Text
        style={[
          styles.compareLabel,
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
          styles.compareValue,
          {
            color:
              theme.primary,
          },
        ]}
      >
        {value}
      </Text>
    </View>
  );
}

function StatusCard({
  title,
  text,
  value,
  theme,
}: {
  title: string;
  text: string;
  value: number;
  theme: {
    text: string;
    textMuted: string;
    border: string;
    surface: string;
    surfaceAlt: string;
    primary: string;
  };
}) {
  return (
    <View
      style={[
        styles.alertCard,
        {
          borderColor:
            theme.border,
          backgroundColor:
            theme.surface,
        },
      ]}
    >
      <View
        style={
          styles.alertInfo
        }
      >
        <Text
          style={[
            styles.alertTitle,
            {
              color:
                theme.text,
            },
          ]}
        >
          {title}
        </Text>

        <Text
          style={[
            styles.alertText,
            {
              color:
                theme.textMuted,
            },
          ]}
        >
          {text}
        </Text>
      </View>

      <View
        style={[
          styles.badge,
          {
            borderColor:
              value > 0
                ? theme.primary
                : theme.border,
            backgroundColor:
              theme.surfaceAlt,
          },
        ]}
      >
        <Text
          style={[
            styles.badgeText,
            {
              color:
                value > 0
                  ? theme.primary
                  : theme.textMuted,
            },
          ]}
        >
          {value}
        </Text>
      </View>
    </View>
  );
}
