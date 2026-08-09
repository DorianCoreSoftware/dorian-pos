import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';

import {
  ActivityIndicator,
  FlatList,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import {
  getCompletedSales,
} from '../../services/salesService';

import {
  CompletedSale,
} from '../../types';
import { styles } from './SalesScreen.styles';


export function SalesScreen() {
  const [
    sales,
    setSales,
  ] = useState<CompletedSale[]>([]);

  const [
    isLoading,
    setIsLoading,
  ] = useState(true);

  const [
    isRefreshing,
    setIsRefreshing,
  ] = useState(false);

  const [
    errorMessage,
    setErrorMessage,
  ] = useState<string | null>(
    null,
  );

  const loadSales =
    useCallback(
      async (
        refreshing = false,
      ): Promise<void> => {
        try {
          if (refreshing) {
            setIsRefreshing(true);
          } else {
            setIsLoading(true);
          }

          setErrorMessage(null);

          const completedSales =
            await getCompletedSales();

          setSales(
            completedSales,
          );
        } catch (error) {
          console.error(
            'Error al cargar ventas:',
            error,
          );

          setErrorMessage(
            error instanceof Error
              ? error.message
              : 'No se pudieron cargar las ventas.',
          );
        } finally {
          setIsLoading(false);
          setIsRefreshing(false);
        }
      },
      [],
    );

  useEffect(() => {
    void loadSales();
  }, [loadSales]);

  const summary =
    useMemo(() => {
      return sales.reduce(
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
    }, [sales]);

  const renderSale = ({
    item,
  }: {
    item: CompletedSale;
  }) => {
    const isCash =
      item.payment
        .paymentMethod === 'cash';

    return (
      <View
        style={styles.saleCard}
      >
        <View
          style={
            styles.saleCardHeader
          }
        >
          <View>
            <Text
              style={
                styles.ticketNumber
              }
            >
              Ticket #
              {item.orderId
                .slice(-4)
                .toUpperCase()}
            </Text>

            <Text
              style={
                styles.saleDate
              }
            >
              {formatDateTime(
                item.payment.createdAt,
              )}
            </Text>
          </View>

          <Text
            style={
              styles.saleAmount
            }
          >
            $
            {item.totalAmount.toFixed(
              2,
            )}
          </Text>
        </View>

        <View
          style={
            styles.separator
          }
        />

        <View
          style={
            styles.paymentRow
          }
        >
          <Text
            style={
              styles.paymentLabel
            }
          >
            Método
          </Text>

          <View
            style={[
              styles.paymentBadge,

              isCash
                ? styles.cashBadge
                : styles.cardBadge,
            ]}
          >
            <Text
              style={
                styles.paymentBadgeText
              }
            >
              {isCash
                ? '💵 Efectivo'
                : '💳 Tarjeta'}
            </Text>
          </View>
        </View>

        {isCash ? (
          <View
            style={
              styles.cashDetails
            }
          >
            <View
              style={
                styles.detailRow
              }
            >
              <Text
                style={
                  styles.detailLabel
                }
              >
                Recibido
              </Text>

              <Text
                style={
                  styles.detailValue
                }
              >
                $
                {(
                  item.payment
                    .amountReceived ??
                  0
                ).toFixed(2)}
              </Text>
            </View>

            <View
              style={
                styles.detailRow
              }
            >
              <Text
                style={
                  styles.detailLabel
                }
              >
                Cambio
              </Text>

              <Text
                style={
                  styles.changeValue
                }
              >
                $
                {(
                  item.payment
                    .changeAmount ??
                  0
                ).toFixed(2)}
              </Text>
            </View>
          </View>
        ) : null}
      </View>
    );
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
          Cargando ventas...
        </Text>
      </View>
    );
  }

  if (
    errorMessage &&
    sales.length === 0
  ) {
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
          ⚠️ No se pudieron cargar
          las ventas
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
            void loadSales();
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
            Ventas
          </Text>

          <Text
            style={
              styles.subtitle
            }
          >
            Historial de órdenes
            cobradas y entregadas
          </Text>
        </View>

        <TouchableOpacity
          style={
            styles.refreshButton
          }
          disabled={
            isRefreshing
          }
          onPress={() => {
            void loadSales(true);
          }}
        >
          <Text
            style={
              styles.refreshButtonText
            }
          >
            {isRefreshing
              ? 'Actualizando...'
              : '↻ Actualizar'}
          </Text>
        </TouchableOpacity>
      </View>

      <View
        style={
          styles.summaryContainer
        }
      >
        <View
          style={[
            styles.summaryCard,
            styles.totalCard,
          ]}
        >
          <Text
            style={
              styles.summaryLabel
            }
          >
            Total vendido
          </Text>

          <Text
            style={
              styles.totalValue
            }
          >
            $
            {summary.total.toFixed(
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
            {sales.length}
          </Text>
        </View>
      </View>

      <View
        style={
          styles.listHeader
        }
      >
        <Text
          style={
            styles.listTitle
          }
        >
          Historial
        </Text>

        <Text
          style={
            styles.listCount
          }
        >
          {sales.length}{' '}
          {sales.length === 1
            ? 'venta'
            : 'ventas'}
        </Text>
      </View>

      {errorMessage ? (
        <View
          style={
            styles.inlineError
          }
        >
          <Text
            style={
              styles.inlineErrorText
            }
          >
            ⚠️ {errorMessage}
          </Text>
        </View>
      ) : null}

      {sales.length === 0 ? (
        <View
          style={
            styles.emptyContainer
          }
        >
          <Text
            style={
              styles.emptyIcon
            }
          >
            💰
          </Text>

          <Text
            style={
              styles.emptyTitle
            }
          >
            Aún no hay ventas
          </Text>

          <Text
            style={
              styles.emptyText
            }
          >
            Las órdenes cobradas y
            entregadas aparecerán aquí.
          </Text>
        </View>
      ) : (
        <FlatList
          data={sales}
          keyExtractor={
            (item) =>
              item.orderId
          }
          renderItem={
            renderSale
          }
          contentContainerStyle={
            styles.salesList
          }
          showsVerticalScrollIndicator={
            false
          }
        />
      )}
    </View>
  );
}

function formatDateTime(
  dateValue: string,
): string {
  const date =
    new Date(dateValue);

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