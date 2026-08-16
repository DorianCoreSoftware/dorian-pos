import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';

import {
  ActivityIndicator,
  Alert,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import {
  closeCashSession,
  getCashSessionHistory,
  openCashSession,
} from '../../services/cashSessionService';

import {
  getCompletedSales,
} from '../../services/salesService';

import {
  CashSession,
  CompletedSale,
} from '../../types';

import {
  styles,
} from './CashClosingScreen.styles';

interface CashClosingScreenProps {
  cashSession:
  CashSession | null;

  setCashSession: React.Dispatch<
    React.SetStateAction<
      CashSession | null
    >
  >;

  fetchCashSession:
  () => Promise<void>;

  pendingOrdersCount: number;
}

export function CashClosingScreen({
  cashSession,
  setCashSession,
  fetchCashSession,
  pendingOrdersCount,
}: CashClosingScreenProps) {
  const [
    sales,
    setSales,
  ] = useState<CompletedSale[]>(
    [],
  );

  const [
    openingAmountText,
    setOpeningAmountText,
  ] = useState('1000');

  const [
    countedCashText,
    setCountedCashText,
  ] = useState('');

  const [
    isLoading,
    setIsLoading,
  ] = useState(true);

  const [
    isProcessing,
    setIsProcessing,
  ] = useState(false);

  const [
    errorMessage,
    setErrorMessage,
  ] = useState<string | null>(
    null,
  );

  const [
    activeView,
    setActiveView,
  ] = useState<
    'current' | 'history'
  >('current');

  const [
    cashHistory,
    setCashHistory,
  ] = useState<CashSession[]>(
    [],
  );

  const [
    isHistoryLoading,
    setIsHistoryLoading,
  ] = useState(false);

  const [
    historyError,
    setHistoryError,
  ] = useState<string | null>(
    null,
  );

  const loadSales =
    useCallback(
      async (): Promise<void> => {
        try {
          setIsLoading(true);
          setErrorMessage(null);

          const completedSales =
            await getCompletedSales();

          setSales(
            completedSales,
          );
        } catch (error) {
          console.error(
            'Error al cargar caja:',
            error,
          );

          setErrorMessage(
            error instanceof Error
              ? error.message
              : 'No se pudo cargar la información de caja.',
          );
        } finally {
          setIsLoading(false);
        }
      },
      [],
    );

  const loadHistory =
    useCallback(
      async (): Promise<void> => {
        try {
          setIsHistoryLoading(true);
          setHistoryError(null);

          const history =
            await getCashSessionHistory();

          setCashHistory(
            history,
          );
        } catch (error) {
          console.error(
            'Error cargando historial de caja:',
            error,
          );

          setHistoryError(
            error instanceof Error
              ? error.message
              : 'No se pudo cargar el historial de caja.',
          );
        } finally {
          setIsHistoryLoading(false);
        }
      },
      [],
    );

  useEffect(() => {
    if (
      activeView !== 'history'
    ) {
      return;
    }

    void loadHistory();
  }, [
    activeView,
    loadHistory,
  ]);

  useEffect(() => {
    void loadSales();
  }, [loadSales]);

  useEffect(() => {
    if (cashSession) {
      setOpeningAmountText(
        cashSession
          .openingAmount
          .toFixed(2),
      );

      return;
    }

    setOpeningAmountText(
      '1000',
    );

    setCountedCashText('');
  }, [cashSession]);

  const sessionSales =
    useMemo(() => {
      if (!cashSession) {
        return [];
      }

      const openedAt =
        parseSupabaseDate(
          cashSession.openedAt,
        );

      if (!openedAt) {
        return [];
      }

      return sales.filter(
        (sale) => {
          const paymentDate =
            parseSupabaseDate(
              sale.payment.createdAt,
            );

          if (!paymentDate) {
            return false;
          }

          return (
            paymentDate >= openedAt
          );
        },
      );
    }, [
      cashSession,
      sales,
    ]);

  const summary =
    useMemo(() => {
      return sessionSales.reduce(
        (
          accumulator,
          sale,
        ) => {
          accumulator.total +=
            sale.totalAmount;

          if (
            sale.payment
              .paymentMethod ===
            'cash'
          ) {
            accumulator.cash +=
              sale.totalAmount;
          }

          if (
            sale.payment
              .paymentMethod ===
            'card'
          ) {
            accumulator.card +=
              sale.totalAmount;
          }

          return accumulator;
        },
        {
          total: 0,
          cash: 0,
          card: 0,
        },
      );
    }, [sessionSales]);

  const countedCash =
    useMemo(() => {
      if (
        !countedCashText.trim()
      ) {
        return null;
      }

      const parsedValue =
        Number(
          countedCashText,
        );

      return Number.isFinite(
        parsedValue,
      )
        ? parsedValue
        : null;
    }, [countedCashText]);

  const expectedCash =
    useMemo(() => {
      if (!cashSession) {
        return 0;
      }

      return roundCurrency(
        cashSession.openingAmount +
        summary.cash,
      );
    }, [
      cashSession,
      summary.cash,
    ]);

  const difference =
    useMemo(() => {
      if (
        countedCash === null
      ) {
        return null;
      }

      return roundCurrency(
        countedCash -
        expectedCash,
      );
    }, [
      countedCash,
      expectedCash,
    ]);

  const handleOpenCash =
    async (): Promise<void> => {
      if (isProcessing) {
        return;
      }

      const openingAmount =
        Number(
          openingAmountText,
        );

      try {
        setIsProcessing(true);

        const session =
          await openCashSession({
            openingAmount,
          });

        /*
         * Actualizamos la sesión
         * compartida de toda la app.
         */
        setCashSession(
          session,
        );

        /*
         * Actualizamos ventas por si
         * existió algún cambio mientras
         * estábamos en esta pantalla.
         */
        const completedSales =
          await getCompletedSales();

        setSales(
          completedSales,
        );

        Alert.alert(
          'Caja abierta',
          `Fondo inicial: $${session.openingAmount.toFixed(
            2,
          )}`,
        );
      } catch (error) {
        Alert.alert(
          'Error',
          error instanceof Error
            ? error.message
            : 'No se pudo abrir la caja.',
        );
      } finally {
        setIsProcessing(false);
      }
    };

  const handleCloseCashPrompt =
    (): void => {
      if (
        pendingOrdersCount > 0
      ) {
        Alert.alert(
          'Pedidos pendientes',
          [
            'No puedes cerrar la caja mientras haya pedidos pendientes.',
            '',
            pendingOrdersCount === 1
              ? 'Hay 1 pedido pendiente.'
              : `Hay ${pendingOrdersCount} pedidos pendientes.`,
            '',
            'Entrega o cancela los pedidos antes de cerrar la caja.',
          ].join('\n'),
        );

        return;
      }

      if (
        countedCash === null
      ) {
        Alert.alert(
          'Efectivo requerido',
          'Ingresa el efectivo contado en caja.',
        );

        return;
      }

      Alert.alert(
        'Cerrar caja',
        [
          `Efectivo esperado: $${expectedCash.toFixed(
            2,
          )}`,
          `Efectivo contado: $${countedCash.toFixed(
            2,
          )}`,
          `Diferencia: $${(
            difference ?? 0
          ).toFixed(2)}`,
          '',
          '¿Deseas cerrar la caja?',
        ].join('\n'),
        [
          {
            text: 'Cancelar',
            style: 'cancel',
          },
          {
            text: 'Cerrar caja',

            onPress: () => {
              void handleCloseCash();
            },
          },
        ],
      );
    };

  const handleCloseCash =
    async (): Promise<void> => {
      if (
        pendingOrdersCount > 0
      ) {
        Alert.alert(
          'Pedidos pendientes',
          'No puedes cerrar la caja mientras haya pedidos pendientes.',
        );

        return;
      }
      if (
        !cashSession ||
        countedCash === null ||
        isProcessing
      ) {
        return;
      }

      try {
        setIsProcessing(true);

        const closedSession =
          await closeCashSession({
            cashSessionId:
              cashSession.id,

            countedCash,

            openingAmount:
              cashSession
                .openingAmount,

            totalCashSales:
              summary.cash,

            totalCardSales:
              summary.card,

            salesCount:
              sessionSales.length,
          });

        /*
         * La sesión compartida queda
         * inmediatamente cerrada.
         *
         * Esto bloquea el POS desde App
         * sin necesidad de reiniciar.
         */
        setCashSession(null);

        setCountedCashText('');

        setOpeningAmountText(
          '1000',
        );

        Alert.alert(
          'Caja cerrada',
          [
            `Total vendido: $${(
              closedSession
                .totalSales ??
              0
            ).toFixed(2)}`,

            `Diferencia: $${(
              closedSession
                .differenceAmount ??
              0
            ).toFixed(2)}`,
          ].join('\n'),
        );

        /*
         * Confirmamos contra Supabase
         * que efectivamente no exista
         * otra sesión abierta.
         */
        await fetchCashSession();

        await loadSales();
        await loadHistory();
      } catch (error) {
        Alert.alert(
          'Error',
          error instanceof Error
            ? error.message
            : 'No se pudo cerrar la caja.',
        );

        /*
         * Si ocurrió un error ambiguo,
         * resincronizamos la sesión con
         * Supabase.
         */
        await fetchCashSession();
      } finally {
        setIsProcessing(false);
      }
    };

  const handleRefresh =
    async (): Promise<void> => {
      if (isProcessing) {
        return;
      }

      try {
        setIsProcessing(true);

        await Promise.all([
          fetchCashSession(),
          loadSales(),
        ]);
      } finally {
        setIsProcessing(false);
      }
    };

  const handleMoneyInput = (
    value: string,

    setter: (
      value: string,
    ) => void,
  ): void => {
    const sanitized =
      value
        .replace(',', '.')
        .replace(
          /[^0-9.]/g,
          '',
        );

    const parts =
      sanitized.split('.');

    if (parts.length > 2) {
      return;
    }

    if (
      parts[1] &&
      parts[1].length > 2
    ) {
      return;
    }

    setter(sanitized);
  };

  if (isLoading) {
    return (
      <View
        style={
          styles.centerContainer
        }
      >
        <ActivityIndicator
          size="large"
          color="#FFBF00"
        />

        <Text
          style={
            styles.loadingText
          }
        >
          Cargando caja...
        </Text>
      </View>
    );
  }

  if (errorMessage) {
    return (
      <View
        style={
          styles.centerContainer
        }
      >
        <Text
          style={
            styles.errorTitle
          }
        >
          ⚠️ Error de caja
        </Text>

        <Text
          style={
            styles.errorMessage
          }
        >
          {errorMessage}
        </Text>

        <TouchableOpacity
          style={
            styles.retryButton
          }
          onPress={() => {
            void handleRefresh();
          }}
        >
          <Text
            style={
              styles.retryButtonText
            }
          >
            Reintentar
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  const renderNavigation =
  () => {
    return (
      <View
        style={
          styles.cashTabs
        }
      >
        <TouchableOpacity
          style={[
            styles.cashTab,

            activeView ===
              'current' &&
              styles.cashTabActive,
          ]}
          onPress={() =>
            setActiveView(
              'current',
            )
          }
        >
          <Text
            style={[
              styles.cashTabText,

              activeView ===
                'current' &&
                styles.cashTabTextActive,
            ]}
          >
            CAJA ACTUAL
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.cashTab,

            activeView ===
              'history' &&
              styles.cashTabActive,
          ]}
          onPress={() =>
            setActiveView(
              'history',
            )
          }
        >
          <Text
            style={[
              styles.cashTabText,

              activeView ===
                'history' &&
                styles.cashTabTextActive,
            ]}
          >
            HISTORIAL
          </Text>
        </TouchableOpacity>
      </View>
    );
  };

  const renderHistory =
  () => {
    if (isHistoryLoading) {
      return (
        <View
          style={
            styles.historyCenter
          }
        >
          <ActivityIndicator
            size="large"
            color="#FFBF00"
          />

          <Text
            style={
              styles.historyLoadingText
            }
          >
            Cargando historial...
          </Text>
        </View>
      );
    }

    if (historyError) {
      return (
        <View
          style={
            styles.historyCenter
          }
        >
          <Text
            style={
              styles.errorTitle
            }
          >
            ⚠️ Error
          </Text>

          <Text
            style={
              styles.errorMessage
            }
          >
            {historyError}
          </Text>

          <TouchableOpacity
            style={
              styles.retryButton
            }
            onPress={() => {
              void loadHistory();
            }}
          >
            <Text
              style={
                styles.retryButtonText
              }
            >
              Reintentar
            </Text>
          </TouchableOpacity>
        </View>
      );
    }

    if (
      cashHistory.length === 0
    ) {
      return (
        <View
          style={
            styles.historyCenter
          }
        >
          <Text
            style={
              styles.historyEmptyIcon
            }
          >
            🧾
          </Text>

          <Text
            style={
              styles.historyEmptyTitle
            }
          >
            Sin cortes todavía
          </Text>

          <Text
            style={
              styles.historyEmptyText
            }
          >
            Los cierres de caja
            aparecerán aquí.
          </Text>
        </View>
      );
    }

    return (
      <ScrollView
        style={
          styles.historyScroll
        }
        contentContainerStyle={
          styles.historyContent
        }
        showsVerticalScrollIndicator={
          false
        }
      >
        {cashHistory.map(
          (session) => {
            const differenceValue =
              session.differenceAmount ??
              0;

            return (
              <View
                key={
                  session.id
                }
                style={
                  styles.historyCard
                }
              >
                <View
                  style={
                    styles.historyCardHeader
                  }
                >
                  <View>
                    <Text
                      style={
                        styles.historyDate
                      }
                    >
                      {session.closedAt
                        ? formatDateTime(
                            session.closedAt,
                          )
                        : 'Sin fecha de cierre'}
                    </Text>

                    <Text
                      style={
                        styles.historyOpenedAt
                      }
                    >
                      Apertura:{' '}
                      {formatDateTime(
                        session.openedAt,
                      )}
                    </Text>
                  </View>

                  <View
                    style={
                      styles.closedBadge
                    }
                  >
                    <Text
                      style={
                        styles.closedBadgeText
                      }
                    >
                      CERRADA
                    </Text>
                  </View>
                </View>

                <View
                  style={
                    styles.historySalesRow
                  }
                >
                  <View
                    style={
                      styles.historyMetric
                    }
                  >
                    <Text
                      style={
                        styles.historyMetricLabel
                      }
                    >
                      Ventas
                    </Text>

                    <Text
                      style={
                        styles.historyMetricValue
                      }
                    >
                      {session.salesCount ??
                        0}
                    </Text>
                  </View>

                  <View
                    style={
                      styles.historyMetric
                    }
                  >
                    <Text
                      style={
                        styles.historyMetricLabel
                      }
                    >
                      💵 Efectivo
                    </Text>

                    <Text
                      style={
                        styles.historyMetricValue
                      }
                    >
                      $
                      {(
                        session.totalCashSales ??
                        0
                      ).toFixed(2)}
                    </Text>
                  </View>

                  <View
                    style={
                      styles.historyMetric
                    }
                  >
                    <Text
                      style={
                        styles.historyMetricLabel
                      }
                    >
                      💳 Tarjeta
                    </Text>

                    <Text
                      style={
                        styles.historyMetricValue
                      }
                    >
                      $
                      {(
                        session.totalCardSales ??
                        0
                      ).toFixed(2)}
                    </Text>
                  </View>

                  <View
                    style={
                      styles.historyMetric
                    }
                  >
                    <Text
                      style={
                        styles.historyMetricLabel
                      }
                    >
                      Total
                    </Text>

                    <Text
                      style={
                        styles.historyTotalValue
                      }
                    >
                      $
                      {(
                        session.totalSales ??
                        0
                      ).toFixed(2)}
                    </Text>
                  </View>
                </View>

                <View
                  style={
                    styles.historyDivider
                  }
                />

                <View
                  style={
                    styles.historyCashGrid
                  }
                >
                  <HistoryCashValue
                    label="Fondo inicial"
                    value={
                      session.openingAmount
                    }
                  />

                  <HistoryCashValue
                    label="Esperado"
                    value={
                      session.expectedCash ??
                      0
                    }
                  />

                  <HistoryCashValue
                    label="Contado"
                    value={
                      session.countedCash ??
                      0
                    }
                  />

                  <View
                    style={
                      styles.historyCashItem
                    }
                  >
                    <Text
                      style={
                        styles.historyCashLabel
                      }
                    >
                      Diferencia
                    </Text>

                    <Text
                      style={[
                        styles.historyDifference,

                        differenceValue ===
                        0
                          ? styles.differenceNeutral
                          : differenceValue >
                              0
                            ? styles.differencePositive
                            : styles.differenceNegative,
                      ]}
                    >
                      {differenceValue >
                      0
                        ? '+'
                        : ''}
                      $
                      {differenceValue.toFixed(
                        2,
                      )}
                    </Text>
                  </View>
                </View>
              </View>
            );
          },
        )}
      </ScrollView>
    );
  };

  if (
  activeView === 'history'
) {
  return (
    <View
      style={
        styles.container
      }
    >
      {renderNavigation()}

      {renderHistory()}
    </View>
  );
}
  /*
   * ============================
   * CAJA CERRADA
   * ============================
   */

  if (!cashSession) {
    return (
      <View
        style={
          styles.container
        }
      >
        <View
          style={
            styles.openCashCard
          }
        >
          <Text
            style={
              styles.title
            }
          >
            Apertura de caja
          </Text>

          <Text
            style={
              styles.subtitle
            }
          >
            Ingresa el fondo inicial
            disponible para cambio.
          </Text>

          <Text
            style={
              styles.inputLabel
            }
          >
            Fondo inicial
          </Text>

          <TextInput
            value={
              openingAmountText
            }
            onChangeText={(
              value,
            ) =>
              handleMoneyInput(
                value,
                setOpeningAmountText,
              )
            }
            keyboardType="decimal-pad"
            editable={
              !isProcessing
            }
            style={
              styles.input
            }
            placeholder="1000.00"
            placeholderTextColor="#777777"
          />

          <TouchableOpacity
            style={[
              styles.primaryButton,

              isProcessing &&
              styles.buttonDisabled,
            ]}
            disabled={
              isProcessing
            }
            onPress={() => {
              void handleOpenCash();
            }}
          >
            <Text
              style={
                styles.primaryButtonText
              }
            >
              {isProcessing
                ? 'Abriendo...'
                : 'Abrir caja'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  /*
   * ============================
   * CAJA ABIERTA
   * ============================
   */

  return (
    <View
      style={
        styles.container
      }
    >
       {renderNavigation()}

      <View
        style={
          styles.header
        }
      >
        <View>
          <Text
            style={
              styles.title
            }
          >
            Caja abierta
          </Text>

          <Text
            style={
              styles.subtitle
            }
          >
            Desde{' '}
            {formatDateTime(
              cashSession.openedAt,
            )}
          </Text>
        </View>

        <View
          style={
            styles.openBadge
          }
        >
          <Text
            style={
              styles.openBadgeText
            }
          >
            ● ABIERTA
          </Text>
        </View>
      </View>

      <View
        style={
          styles.summaryContainer
        }
      >
        <View
          style={
            styles.summaryCard
          }
        >
          <Text
            style={
              styles.summaryLabel
            }
          >
            Fondo inicial
          </Text>

          <Text
            style={
              styles.summaryValue
            }
          >
            $
            {cashSession
              .openingAmount
              .toFixed(2)}
          </Text>
        </View>

        <View
          style={
            styles.summaryCard
          }
        >
          <Text
            style={
              styles.summaryLabel
            }
          >
            💵 Efectivo
          </Text>

          <Text
            style={
              styles.summaryValue
            }
          >
            $
            {summary.cash.toFixed(
              2,
            )}
          </Text>
        </View>

        <View
          style={
            styles.summaryCard
          }
        >
          <Text
            style={
              styles.summaryLabel
            }
          >
            💳 Tarjeta
          </Text>

          <Text
            style={
              styles.summaryValue
            }
          >
            $
            {summary.card.toFixed(
              2,
            )}
          </Text>
        </View>

        <View
          style={
            styles.summaryCard
          }
        >
          <Text
            style={
              styles.summaryLabel
            }
          >
            Ventas
          </Text>

          <Text
            style={
              styles.summaryValue
            }
          >
            {
              sessionSales.length
            }
          </Text>
        </View>
      </View>

      <View
        style={
          styles.closingCard
        }
      >
        <View
          style={
            styles.closingHeader
          }
        >
          <Text
            style={
              styles.closingTitle
            }
          >
            Cierre de caja
          </Text>

          <Text
            style={
              styles.totalSales
            }
          >
            Total vendido: $
            {summary.total.toFixed(
              2,
            )}
          </Text>
        </View>

        <View
          style={
            styles.cashCalculation
          }
        >
          <View
            style={
              styles.calculationRow
            }
          >
            <Text
              style={
                styles.calculationLabel
              }
            >
              Fondo inicial
            </Text>

            <Text
              style={
                styles.calculationValue
              }
            >
              $
              {cashSession
                .openingAmount
                .toFixed(2)}
            </Text>
          </View>

          <View
            style={
              styles.calculationRow
            }
          >
            <Text
              style={
                styles.calculationLabel
              }
            >
              + Ventas en efectivo
            </Text>

            <Text
              style={
                styles.calculationValue
              }
            >
              $
              {summary.cash.toFixed(
                2,
              )}
            </Text>
          </View>

          <View
            style={
              styles.calculationSeparator
            }
          />

          <View
            style={
              styles.calculationRow
            }
          >
            <Text
              style={
                styles.expectedLabel
              }
            >
              Efectivo esperado
            </Text>

            <Text
              style={
                styles.expectedValue
              }
            >
              $
              {expectedCash.toFixed(
                2,
              )}
            </Text>
          </View>
        </View>

        <Text
          style={
            styles.inputLabel
          }
        >
          Efectivo contado en caja
        </Text>

        <TextInput
          value={
            countedCashText
          }
          onChangeText={(
            value,
          ) =>
            handleMoneyInput(
              value,
              setCountedCashText,
            )
          }
          keyboardType="decimal-pad"
          editable={
            !isProcessing
          }
          style={
            styles.input
          }
          placeholder="0.00"
          placeholderTextColor="#777777"
        />

        <View
          style={
            styles.differenceContainer
          }
        >
          <Text
            style={
              styles.differenceLabel
            }
          >
            Diferencia
          </Text>

          <Text
            style={[
              styles.differenceValue,

              difference === null ||
                difference === 0
                ? styles.differenceNeutral
                : difference > 0
                  ? styles.differencePositive
                  : styles.differenceNegative,
            ]}
          >
            {difference === null
              ? '$0.00'
              : `${difference > 0
                ? '+'
                : ''
              }$${difference.toFixed(
                2,
              )}`}
          </Text>
        </View>

        <TouchableOpacity
          style={[
            styles.closeButton,

            (
              countedCash === null ||
              isProcessing
            ) &&
            styles.buttonDisabled,
          ]}
          disabled={
            countedCash === null ||
            isProcessing
          }
          onPress={
            handleCloseCashPrompt
          }
        >
          <Text
            style={
              styles.closeButtonText
            }
          >
            {isProcessing
              ? 'Cerrando...'
              : 'Cerrar caja'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

interface HistoryCashValueProps {
  label: string;
  value: number;
}

function HistoryCashValue({
  label,
  value,
}: HistoryCashValueProps) {
  return (
    <View
      style={
        styles.historyCashItem
      }
    >
      <Text
        style={
          styles.historyCashLabel
        }
      >
        {label}
      </Text>

      <Text
        style={
          styles.historyCashValue
        }
      >
        ${value.toFixed(2)}
      </Text>
    </View>
  );
}

function parseSupabaseDate(
  dateValue: string,
): Date | null {
  if (!dateValue) {
    return null;
  }

  let normalizedValue =
    dateValue.trim();

  normalizedValue =
    normalizedValue.replace(
      /^(\d{4}-\d{2}-\d{2})\s/,
      '$1T',
    );

  normalizedValue =
    normalizedValue.replace(
      /([+-]\d{2})$/,
      '$1:00',
    );

  const date =
    new Date(
      normalizedValue,
    );

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    return null;
  }

  return date;
}

function formatDateTime(
  dateValue: string,
): string {
  const date =
    parseSupabaseDate(
      dateValue,
    );

  if (!date) {
    return 'Fecha no disponible';
  }

  return date.toLocaleString(
    'es-MX',
    {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    },
  );
}

function roundCurrency(
  amount: number,
): number {
  return (
    Math.round(
      (
        amount +
        Number.EPSILON
      ) * 100,
    ) / 100
  );
}