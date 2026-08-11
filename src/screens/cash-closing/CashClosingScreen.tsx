import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';

import {
  ActivityIndicator,
  Alert,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import {
  closeCashSession,
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
}

export function CashClosingScreen({
  cashSession,
  setCashSession,
  fetchCashSession,
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
              : `${
                  difference > 0
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