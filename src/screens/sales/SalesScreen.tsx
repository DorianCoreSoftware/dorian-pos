import { useBusiness } from '../../context/BusinessContext';

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
  useWindowDimensions,
  View,
} from 'react-native';

import DateTimePicker, {
  DateTimePickerEvent,
} from '@react-native-community/datetimepicker';

import {
  getCompletedSales,
} from '../../services/salesService';

import {
  CompletedSale,
} from '../../types';

import {
  styles,
  setBrandPrimaryColor,
} from './SalesScreen.styles';
import { printOrderTicket } from '../../services/printerService';
import { getExistingOrderPromoCoupon } from '../../services/promoService';
import { getOrderById } from '../../services/orderService';
import { useCurrency } from '../../hooks/useCurrency';

import {
  PeriodFilter,
  PeriodFilterValue,
} from '../../components/period-filter/PeriodFilter';

type SalesFilter =
  PeriodFilterValue;

type DatePickerField =
  | 'from'
  | 'to'
  | null;

export function SalesScreen() {
  const { theme: businessTheme } = useBusiness();
    setBrandPrimaryColor(businessTheme.primary);

  const {
    currencyCode,
    formatCurrency,
  } = useCurrency();

  const {
    width,
  } = useWindowDimensions();

  const isPhone =
    width < 700;

  const isSmallPhone =
    width < 430;

  const [
    salesFilter,
    setSalesFilter,
  ] = useState<SalesFilter>(
    'today',
  );

  const [
    sales,
    setSales,
  ] = useState<CompletedSale[]>(
    [],
  );

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

  const [
    reprintingOrderId,
    setReprintingOrderId,
  ] = useState<string | null>(
    null,
  );

  const [
    reprintMessage,
    setReprintMessage,
  ] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(
    null,
  );

  const [
    customStartDate,
    setCustomStartDate,
  ] = useState<Date>(() => {
    const today = new Date();

    return startOfDay(today);
  });

  const [
    customEndDate,
    setCustomEndDate,
  ] = useState<Date>(() => {
    const today = new Date();

    return startOfDay(today);
  });

  const [
    datePickerField,
    setDatePickerField,
  ] = useState<DatePickerField>(
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

  const filteredSales =
    useMemo(() => {
      if (
        salesFilter === 'all'
      ) {
        return sales;
      }

      const now = new Date();

      if (
        salesFilter === 'today'
      ) {
        return filterSalesByRange(
          sales,
          startOfDay(now),
          endOfDay(now),
        );
      }

      if (
        salesFilter === '7days'
      ) {
        const sevenDaysAgo =
          new Date(
            now.getFullYear(),
            now.getMonth(),
            now.getDate() - 6,
          );

        return filterSalesByRange(
          sales,
          startOfDay(
            sevenDaysAgo,
          ),
          endOfDay(now),
        );
      }

      if (
        salesFilter === 'month'
      ) {
        return filterSalesByRange(
          sales,
          new Date(
            now.getFullYear(),
            now.getMonth(),
            1,
            0,
            0,
            0,
            0,
          ),
          endOfDay(now),
        );
      }

      return filterSalesByRange(
        sales,
        startOfDay(
          customStartDate,
        ),
        endOfDay(
          customEndDate,
        ),
      );
    }, [
      sales,
      salesFilter,
      customStartDate,
      customEndDate,
    ]);

  const summary =
    useMemo(() => {
      return filteredSales.reduce(
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
    }, [filteredSales]);

  const handleSalesFilter = (
    filter: SalesFilter,
  ): void => {
    setSalesFilter(filter);
  };

  const handleDateChange = (
    event: DateTimePickerEvent,
    selectedDate?: Date,
  ): void => {
    const field =
      datePickerField;

    setDatePickerField(
      null,
    );

    if (
      event.type === 'dismissed' ||
      !selectedDate ||
      !field
    ) {
      return;
    }

    const normalizedDate =
      startOfDay(
        selectedDate,
      );

    if (field === 'from') {
      setCustomStartDate(
        normalizedDate,
      );

      if (
        normalizedDate >
        customEndDate
      ) {
        setCustomEndDate(
          normalizedDate,
        );
      }

      return;
    }

    if (
      normalizedDate <
      customStartDate
    ) {
      setCustomEndDate(
        customStartDate,
      );

      return;
    }

    setCustomEndDate(
      normalizedDate,
    );
  };

  const handleReprintTicket =
    async (
      sale: CompletedSale,
    ): Promise<void> => {
      if (reprintingOrderId) {
        return;
      }

      try {
        setReprintingOrderId(
          sale.orderId,
        );

        setReprintMessage(
          null,
        );

        const [
          order,
          promoCoupon,
        ] =
          await Promise.all([
            getOrderById(
              sale.orderId,
            ),

            getExistingOrderPromoCoupon(
              sale.orderId,
            ),
          ]);

        const originalDate =
          parseSupabaseDate(
            sale.payment
              .createdAt,
          );

        await printOrderTicket({
          order,

          paymentMethod:
            sale.payment
              .paymentMethod,

          amountReceived:
            sale.payment
              .amountReceived,

          promoCoupon,

          ticketDate:
            originalDate ??
            undefined,

          isReprint:
            true,

          currencyCode,
        });

        setReprintMessage({
          type: 'success',
          text:
            `Ticket #${sale.orderId
              .slice(-4)
              .toUpperCase()} reimpreso correctamente.`,
        });
      } catch (error) {
        console.error(
          'Error al reimprimir ticket:',
          error,
        );

        setReprintMessage({
          type: 'error',
          text:
            error instanceof Error
              ? error.message
              : 'No se pudo reimprimir el ticket.',
        });
      } finally {
        setReprintingOrderId(
          null,
        );
      }
    };

  const renderSale = ({
    item,
  }: {
    item: CompletedSale;
  }) => {
    const isCash =
      item.payment
        .paymentMethod ===
      'cash';

    return (
      <View
        style={
          styles.saleCard
        }
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
                item.payment
                  .createdAt,
              )}
            </Text>
          </View>

          <Text
            style={
              styles.saleAmount
            }
          >
            {formatCurrency(
              item.totalAmount,
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
                {formatCurrency(
                  item.payment
                    .amountReceived ??
                  0,
                )}
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
                {formatCurrency(
                  item.payment
                    .changeAmount ??
                  0,
                )}
              </Text>
            </View>
          </View>
        ) : null}
        <View
          style={
            styles.saleActions
          }
        >
          <TouchableOpacity
            style={[
              styles.reprintButton,

              reprintingOrderId ===
              item.orderId &&
              styles.reprintButtonDisabled,
            ]}
            disabled={
              reprintingOrderId !==
              null
            }
            onPress={() => {
              void handleReprintTicket(
                item,
              );
            }}
          >
            {reprintingOrderId ===
              item.orderId ? (
              <ActivityIndicator
                size="small"
                color="#121212"
              />
            ) : (
              <Text
                style={
                  styles.reprintButtonText
                }
              >
                🖨️ Reimprimir ticket
              </Text>
            )}
          </TouchableOpacity>
        </View>
        {reprintMessage ? (
          <View
            style={[
              styles.reprintMessage,

              reprintMessage.type ===
                'success'
                ? styles.reprintMessageSuccess
                : styles.reprintMessageError,
            ]}
          >
            <Text
              style={
                styles.reprintMessageText
              }
            >
              {reprintMessage.type ===
                'success'
                ? '✓ '
                : '⚠️ '}

              {reprintMessage.text}
            </Text>
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
          color={businessTheme.primary}
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

      <PeriodFilter
        value={salesFilter}
        onChange={
          handleSalesFilter
        }
      />

      {salesFilter ===
        'custom' ? (
        <View
          style={[
            styles.customDateContainer,
            isSmallPhone &&
            styles.customDateContainerSmall,
          ]}
        >
          <TouchableOpacity
            style={
              styles.dateField
            }
            activeOpacity={0.8}
            onPress={() =>
              setDatePickerField(
                'from',
              )
            }
          >
            <Text
              style={
                styles.dateLabel
              }
            >
              Desde
            </Text>

            <Text
              style={
                styles.dateValue
              }
            >
              📅{' '}
              {formatShortDate(
                customStartDate,
              )}
            </Text>
          </TouchableOpacity>

          <Text
            style={
              styles.dateRangeSeparator
            }
          >
            →
          </Text>

          <TouchableOpacity
            style={
              styles.dateField
            }
            activeOpacity={0.8}
            onPress={() =>
              setDatePickerField(
                'to',
              )
            }
          >
            <Text
              style={
                styles.dateLabel
              }
            >
              Hasta
            </Text>

            <Text
              style={
                styles.dateValue
              }
            >
              📅{' '}
              {formatShortDate(
                customEndDate,
              )}
            </Text>
          </TouchableOpacity>
        </View>
      ) : null}

      <View
        style={[
          styles.summaryContainer,
          isPhone &&
          styles.summaryContainerPhone,
        ]}
      >
        <View
          style={[
            styles.summaryCard,
            isPhone &&
            styles.summaryCardPhone,
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
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.7}
            style={[
              styles.totalValue,
              isSmallPhone &&
              styles.summaryValueSmall,
            ]}
          >
            {formatCurrency(
              summary.total,
            )}
          </Text>
        </View>

        <View
          style={[
            styles.summaryCard,
            isPhone &&
            styles.summaryCardPhone,
          ]}
        >
          <Text
            style={
              styles.summaryLabel
            }
          >
            💵 Efectivo
          </Text>

          <Text
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.7}
            style={[
              styles.summaryValue,
              isSmallPhone &&
              styles.summaryValueSmall,
            ]}
          >
            {formatCurrency(
              summary.cash,
            )}
          </Text>
        </View>

        <View
          style={[
            styles.summaryCard,
            isPhone &&
            styles.summaryCardPhone,
          ]}
        >
          <Text
            style={
              styles.summaryLabel
            }
          >
            💳 Tarjeta
          </Text>

          <Text
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.7}
            style={[
              styles.summaryValue,
              isSmallPhone &&
              styles.summaryValueSmall,
            ]}
          >
            {formatCurrency(
              summary.card,
            )}
          </Text>
        </View>

        <View
          style={[
            styles.summaryCard,
            isPhone &&
            styles.summaryCardPhone,
          ]}
        >
          <Text
            style={
              styles.summaryLabel
            }
          >
            Ventas
          </Text>

          <Text
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.7}
            style={[
              styles.summaryValue,
              isSmallPhone &&
              styles.summaryValueSmall,
            ]}
          >
            {
              filteredSales.length
            }
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
          {filteredSales.length}{' '}
          {filteredSales.length === 1
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

      {filteredSales.length ===
        0 ? (
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
            No hay ventas en este
            periodo
          </Text>

          <Text
            style={
              styles.emptyText
            }
          >
            Cambia el filtro o
            selecciona otro rango
            de fechas.
          </Text>
        </View>
      ) : (
        <FlatList
          data={
            filteredSales
          }
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

      {datePickerField ? (
        <DateTimePicker
          value={
            datePickerField ===
              'from'
              ? customStartDate
              : customEndDate
          }
          mode="date"
          display="default"
          minimumDate={
            datePickerField ===
              'to'
              ? customStartDate
              : undefined
          }
          maximumDate={
            new Date()
          }
          onChange={
            handleDateChange
          }
        />
      ) : null}
    </View>
  );
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

function filterSalesByRange(
  sales: CompletedSale[],
  startDate: Date,
  endDate: Date,
): CompletedSale[] {
  return sales.filter(
    (sale) => {
      const saleDate =
        parseSupabaseDate(
          sale.payment
            .createdAt,
        );

      if (!saleDate) {
        return false;
      }

      return (
        saleDate >= startDate &&
        saleDate <= endDate
      );
    },
  );
}

function formatShortDate(
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