import {
  useBusiness } from '../../context/BusinessContext';

import React,
  {
  useCallback,
  useEffect,
  useMemo,
  useState,
  } from 'react';

import { Alert,
  ActivityIndicator,
  FlatList,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
  } from 'react-native';

import DateTimePicker,
  {
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
import { printOrderTicket,
  printRefundTicket } from '../../services/printerService';
import { getExistingOrderPromoCoupon } from '../../services/promoService';
import { getOrderById } from '../../services/orderService';
import { useCurrency } from '../../hooks/useCurrency';
import { useAuth } from '../../context/AuthContext';
import { RefundModal } from '../../components/refunds/RefundModal';
import {
  getOrderRefundStatuses,
  RefundStatusByOrder,
  getOrderRefundHistory,
  getRefundReceiptDetails,
  getRefundReport,
} from '../../services/refundService';
import { canCreateRefund } from '../../Utils/permissions';
import { OrderRefundHistoryRow } from '../../types/refund';

import {
  PeriodFilter,
  PeriodFilterValue,
} from '../../components/period-filter/PeriodFilter';

import {
  formatBusinessDateTime,
  getBusinessPeriodRange,
} from '../../Utils/businessTime';

type SalesFilter =
  PeriodFilterValue;

type DatePickerField =
  | 'from'
  | 'to'
  | null;

export function SalesScreen() {
  const { user } = useAuth();

  const userCanUseRefundFeatures =
    canCreateRefund(user);
  const { business, theme: businessTheme } = useBusiness();
    setBrandPrimaryColor(businessTheme.primary);

  const formatSaleDateTime =
    (dateValue: string): string =>
      formatBusinessDateTime(
        dateValue,
        business?.timezone,
      );

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
    refundSale,
    setRefundSale,
  ] = useState<CompletedSale | null>(
    null,
  );

  const [
    refundStatusByOrder,
    setRefundStatusByOrder,
  ] = useState<
    Record<
      string,
      RefundStatusByOrder
    >
  >({});

  const [
    periodRefundTotal,
    setPeriodRefundTotal,
  ] = useState(0);

  const [
    periodRefundCount,
    setPeriodRefundCount,
  ] = useState(0);

  const [
    isLoadingPeriodRefunds,
    setIsLoadingPeriodRefunds,
  ] = useState(false);

  const [
    periodRefundRefreshKey,
    setPeriodRefundRefreshKey,
  ] = useState(0);

  const [
    refundHistoryByOrder,
    setRefundHistoryByOrder,
  ] = useState<
    Record<
      string,
      OrderRefundHistoryRow[]
    >
  >({});

  const [
    expandedRefundOrderId,
    setExpandedRefundOrderId,
  ] = useState<string | null>(
    null,
  );

  const [
    loadingRefundHistoryOrderId,
    setLoadingRefundHistoryOrderId,
  ] = useState<string | null>(
    null,
  );

  const [
    reprintingRefundId,
    setReprintingRefundId,
  ] = useState<string | null>(
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

          let refundStatuses:
            Record<string, RefundStatusByOrder> =
              {};

          if (userCanUseRefundFeatures) {
            try {
              refundStatuses =
                await getOrderRefundStatuses(
                  completedSales.map(
                    sale =>
                      sale.orderId,
                  ),
                );
            } catch (refundError) {
              console.error(
                'No se pudieron cargar los estados de devolución:',
                refundError,
              );
            }
          }

          setSales(
            completedSales,
          );

          setRefundStatusByOrder(
            refundStatuses,
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
      [userCanUseRefundFeatures],
    );useEffect(() => {
    void loadSales();
  }, [loadSales]);

  const filteredSales =
    useMemo(() => {
      if (
        salesFilter === 'all'
      ) {
        return sales;
      }

      const range =
        getBusinessPeriodRange(
          salesFilter,
          customStartDate,
          customEndDate,
          business?.timezone,
        );

      return filterSalesByRange(
        sales,
        range.from,
        range.to,
      );
    }, [
      sales,
      salesFilter,
      customStartDate,
      customEndDate,
      business?.timezone,
    ]);

  const refundPeriodRange =
    useMemo(() => {
      if (
        salesFilter === 'all'
      ) {
        return {
          from: new Date(
            '2000-01-01T00:00:00.000Z',
          ),
          to: new Date(),
        };
      }

      return getBusinessPeriodRange(
        salesFilter,
        customStartDate,
        customEndDate,
        business?.timezone,
      );
    }, [
      salesFilter,
      customStartDate,
      customEndDate,
      business?.timezone,
    ]);

  useEffect(() => {
    let mounted = true;

    if (!userCanUseRefundFeatures) {
      setPeriodRefundTotal(0);
      setPeriodRefundCount(0);
      setIsLoadingPeriodRefunds(false);

      return () => {
        mounted = false;
      };
    }

    void (async () => {
      try {
        setIsLoadingPeriodRefunds(
          true,
        );

        const rows =
          await getRefundReport(
            refundPeriodRange.from,
            refundPeriodRange.to,
          );

        if (!mounted) {
          return;
        }

        setPeriodRefundTotal(
          rows.reduce(
            (
              total,
              row,
            ) =>
              total +
              Number(
                row.refundTotal ??
                  0,
              ),
            0,
          ),
        );

        setPeriodRefundCount(
          rows.length,
        );
      } catch (error) {
        console.error(
          'Error al cargar devoluciones del periodo:',
          error,
        );

        if (mounted) {
          setPeriodRefundTotal(0);
          setPeriodRefundCount(0);
        }
      } finally {
        if (mounted) {
          setIsLoadingPeriodRefunds(
            false,
          );
        }
      }
    })();

    return () => {
      mounted = false;
    };
  }, [
    refundPeriodRange,
    periodRefundRefreshKey,
  userCanUseRefundFeatures,
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

          sale.payments.forEach(
            movement => {
              if (
                movement.paymentMethod ===
                'cash'
              ) {
                accumulator.cash +=
                  movement.amount;
              }

              if (
                movement.paymentMethod ===
                'card'
              ) {
                accumulator.card +=
                  movement.amount;
              }
            },
          );

          const refundStatus =
            refundStatusByOrder[
              sale.orderId
            ];

          if (refundStatus) {
            const refundedAmount =
              Number(
                refundStatus
                  .refundedTotal ??
                  0,
              );

            accumulator.refunded +=
              refundedAmount;

            if (
              sale.payment
                .paymentMethod ===
              'cash'
            ) {
              accumulator.refundedCash +=
                refundedAmount;
            }

            if (
              sale.payment
                .paymentMethod ===
              'card'
            ) {
              accumulator.refundedCard +=
                refundedAmount;
            }
          }

          return accumulator;
        },
        {
          total: 0,
          cash: 0,
          card: 0,
          refunded: 0,
          refundedCash: 0,
          refundedCard: 0,
        },
      );
    }, [
      filteredSales,
      refundStatusByOrder,
    ]);

  const netSales =
    Math.max(
      0,
      summary.total -
        summary.refunded,
    );

  const netCash =
    Math.max(
      0,
      summary.cash -
        summary.refundedCash,
    );

  const netCard =
    Math.max(
      0,
      summary.card -
        summary.refundedCard,
    );

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

  const handleToggleRefundHistory =
    async (
      orderId: string,
    ): Promise<void> => {
      if (
        expandedRefundOrderId ===
        orderId
      ) {
        setExpandedRefundOrderId(
          null,
        );
        return;
      }

      setExpandedRefundOrderId(
        orderId,
      );

      if (
        refundHistoryByOrder[
          orderId
        ]
      ) {
        return;
      }

      try {
        setLoadingRefundHistoryOrderId(
          orderId,
        );

        const history =
          await getOrderRefundHistory(
            orderId,
          );

        setRefundHistoryByOrder(
          current => ({
            ...current,
            [orderId]:
              history,
          }),
        );
      } catch (error) {
        setExpandedRefundOrderId(
          null,
        );

        Alert.alert(
          'No se pudo cargar',
          error instanceof Error
            ? error.message
            : 'No se pudo cargar el historial de devoluciones.',
        );
      } finally {
        setLoadingRefundHistoryOrderId(
          null,
        );
      }
    };

  const handleReprintRefundReceipt =
    async (
      refund:
        OrderRefundHistoryRow,
    ): Promise<void> => {
      if (
        reprintingRefundId
      ) {
        return;
      }

      try {
        setReprintingRefundId(
          refund.refundId,
        );

        const receipt =
          await getRefundReceiptDetails(
            refund.refundId,
          );

        await printRefundTicket({
          refundNumber:
            receipt.refundNumber,
          refundType:
            receipt.refundType,
          orderId:
            receipt.orderId,
          createdAt:
            receipt.createdAt,
          paymentMethod:
            receipt.paymentMethod,
          refundTotal:
            receipt.refundTotal,
          reason:
            receipt.reason,
          notes:
            receipt.notes,
          policyException:
            receipt.policyException,
          userName:
            receipt.userName,
          items:
            receipt.items.map(
              item => ({
                productName:
                  item.productName,
                quantity:
                  item.quantity,
                unitRefundAmount:
                  item.unitRefundAmount,
              }),
            ),
          currencyCode,
        });

        Alert.alert(
          'Comprobante reimpreso',
          `DEV-${String(
            receipt.refundNumber,
          ).padStart(
            6,
            '0',
          )} se reimprimió correctamente.`,
        );
      } catch (error) {
        Alert.alert(
          'No se pudo reimprimir',
          error instanceof Error
            ? error.message
            : 'Ocurrió un error al reimprimir el comprobante.',
        );
      } finally {
        setReprintingRefundId(
          null,
        );
      }
    };

  const refreshRefundHistoryAfterCompleted =
    async (
      orderId: string,
    ): Promise<void> => {
      const wasExpanded =
        expandedRefundOrderId ===
        orderId;

      try {
        if (wasExpanded) {
          setLoadingRefundHistoryOrderId(
            orderId,
          );
        }

        const history =
          await getOrderRefundHistory(
            orderId,
          );

        setRefundHistoryByOrder(
          current => ({
            ...current,
            [orderId]: history,
          }),
        );
      } catch (error) {
        console.error(
          'No se pudo refrescar el historial de devoluciones:',
          error,
        );

        setRefundHistoryByOrder(
          current => {
            const next = {
              ...current,
            };

            delete next[orderId];

            return next;
          },
        );
      } finally {
        if (wasExpanded) {
          setLoadingRefundHistoryOrderId(
            null,
          );
        }
      }
    };

  const handleRefreshSales =
    async (): Promise<void> => {
      await loadSales(true);

      setPeriodRefundRefreshKey(
        current => current + 1,
      );

      if (
        !expandedRefundOrderId
      ) {
        return;
      }

      try {
        setLoadingRefundHistoryOrderId(
          expandedRefundOrderId,
        );

        const history =
          await getOrderRefundHistory(
            expandedRefundOrderId,
          );

        setRefundHistoryByOrder(
          current => ({
            ...current,
            [expandedRefundOrderId]:
              history,
          }),
        );
      } catch (error) {
        console.error(
          'No se pudo actualizar el historial de devoluciones expandido:',
          error,
        );

        setRefundHistoryByOrder(
          current => {
            const next = {
              ...current,
            };

            delete next[
              expandedRefundOrderId
            ];

            return next;
          },
        );
      } finally {
        setLoadingRefundHistoryOrderId(
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

    const refundStatus =
      refundStatusByOrder[
        item.orderId
      ] ?? null;

    const isFullyRefunded =
      refundStatus?.status ===
      'full';

    const refundOriginalTotal =
      refundStatus
        ? Number(
            refundStatus.originalTotal ??
              item.totalAmount,
          )
        : item.totalAmount;

    const refundedTotal =
      refundStatus
        ? Number(
            refundStatus.refundedTotal ??
              0,
          )
        : 0;

    const netAfterRefund =
      Math.max(
        0,
        refundOriginalTotal -
          refundedTotal,
      );

    const refundHistory =
      refundHistoryByOrder[
        item.orderId
      ] ?? [];

    const isRefundHistoryExpanded =
      expandedRefundOrderId ===
      item.orderId;

    const isRefundHistoryLoading =
      loadingRefundHistoryOrderId ===
      item.orderId;

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
              {formatSaleDateTime(
                item.payment
                  .createdAt,
              )}
            </Text>

              {refundStatus ? (
                <View
                  style={[
                    styles.refundStatusBadge,
                    refundStatus.status ===
                      'full'
                      ? styles.refundStatusBadgeFull
                      : styles.refundStatusBadgePartial,
                  ]}
                >
                  <Text
                    style={
                      styles.refundStatusBadgeText
                    }
                  >
                    {refundStatus.status ===
                    'full'
                      ? '↩ DEVOLUCIÓN TOTAL'
                      : '↩ DEVOLUCIÓN PARCIAL'}
                  </Text>
                </View>
              ) : null}
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

        {refundStatus ? (
          <View
            style={
              styles.refundFinancialSummary
            }
          >
            <View
              style={
                styles.refundFinancialColumn
              }
            >
              <Text
                style={
                  styles.refundFinancialLabel
                }
              >
                Original
              </Text>
              <Text
                style={
                  styles.refundFinancialOriginal
                }
              >
                {formatCurrency(
                  refundOriginalTotal,
                )}
              </Text>
            </View>

            <View
              style={
                styles.refundFinancialColumn
              }
            >
              <Text
                style={
                  styles.refundFinancialLabel
                }
              >
                Devuelto
              </Text>
              <Text
                style={
                  styles.refundFinancialRefunded
                }
              >
                −
                {formatCurrency(
                  refundedTotal,
                )}
              </Text>
            </View>

            <View
              style={
                styles.refundFinancialColumn
              }
            >
              <Text
                style={
                  styles.refundFinancialLabel
                }
              >
                Neto
              </Text>
              <Text
                style={
                  styles.refundFinancialNet
                }
              >
                {formatCurrency(
                  netAfterRefund,
                )}
              </Text>
            </View>
          </View>
        ) : null}

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
              </Text></View>

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
        {refundStatus ? (
          <View
            style={
              styles.refundHistorySection
            }
          >
            <TouchableOpacity
              style={
                styles.refundHistoryToggle
              }
              disabled={
                isRefundHistoryLoading
              }
              onPress={() => {
                void handleToggleRefundHistory(
                  item.orderId,
                );
              }}
            >
              <Text
                style={
                  styles.refundHistoryToggleText
                }
              >
                {isRefundHistoryExpanded
                  ? 'Ocultar devoluciones'
                  : refundHistory.length > 0
                    ? `Ver devoluciones (${refundHistory.length})`
                    : 'Ver devoluciones'}
              </Text>

              {isRefundHistoryLoading ? (
                <ActivityIndicator
                  size="small"
                  color={
                    businessTheme.primary
                  }
                />
              ) : (
                <Text
                  style={
                    styles.refundHistoryChevron
                  }
                >
                  {isRefundHistoryExpanded
                    ? '▲'
                    : '▼'}
                </Text>
              )}
            </TouchableOpacity>

            {isRefundHistoryExpanded &&
            !isRefundHistoryLoading ? (
              <View
                style={
                  styles.refundHistoryList
                }
              >
                {refundHistory.length ===
                0 ? (
                  <Text
                    style={
                      styles.refundHistoryEmpty
                    }
                  >
                    No se encontraron devoluciones.
                  </Text>
                ) : (
                  refundHistory.map(
                    refund => (
                      <View
                        key={
                          refund.refundId
                        }
                        style={
                          styles.refundHistoryCard
                        }
                      >
                        <View
                          style={
                            styles.refundHistoryHeader
                          }
                        >
                          <View
                            style={{
                              flex: 1,
                            }}
                          >
                            <Text
                              style={
                                styles.refundHistoryFolio
                              }
                            >
                              DEV-
                              {String(
                                refund.refundNumber,
                              ).padStart(
                                6,
                                '0',
                              )}
                            </Text>

                            <Text
                              style={
                                styles.refundHistoryDate
                              }
                            >
                              {formatSaleDateTime(
                                refund.createdAt,
                              )}
                            </Text>
                          </View>

                          <Text
                            style={
                              styles.refundHistoryAmount
                            }
                          >
                            {formatCurrency(
                              refund.refundTotal,
                            )}
                          </Text>
                        </View>

                        <Text
                          style={
                            styles.refundHistoryMeta
                          }
                        >
                          {refund.refundType ===
                          'full'
                            ? 'TOTAL'
                            : 'PARCIAL'}
                          {' · '}
                          {refund.paymentMethod ===
                          'cash'
                            ? 'EFECTIVO'
                            : refund.paymentMethod ===
                                'card'
                              ? 'TARJETA'
                              : refund.paymentMethod.toUpperCase()}
                        </Text>

                        <Text
                          style={
                            styles.refundHistoryReason
                          }
                        >
                          {refund.reason}
                        </Text>

                        {refund.userName ? (
                          <Text
                            style={
                              styles.refundHistoryMeta
                            }
                          >
                            Realizó:{' '}
                            {refund.userName}
                          </Text>
                        ) : null}

                        {refund.policyException ? (
                          <Text
                            style={
                              styles.refundHistoryException
                            }
                          >
                            EXCEPCIÓN DE POLÍTICA
                          </Text>
                        ) : null}

                        <TouchableOpacity
                          style={[
                            styles.refundReceiptReprintButton,
                            reprintingRefundId !==
                              null &&
                              styles.refundReceiptReprintButtonDisabled,
                          ]}
                          disabled={
                            reprintingRefundId !==
                            null
                          }
                          onPress={() => {
                            void handleReprintRefundReceipt(
                              refund,
                            );
                          }}
                        >
                          {reprintingRefundId ===
                          refund.refundId ? (
                            <ActivityIndicator
                              size="small"
                              color="#121212"
                            />
                          ) : (
                            <Text
                              style={
                                styles.refundReceiptReprintButtonText
                              }
                            >
                              🖨️ Reimprimir comprobante
                            </Text>
                          )}
                        </TouchableOpacity>
                      </View>
                    ),
                  )
                )}
              </View>
            ) : null}
          </View>
        ) : null}

        <View
          style={
            styles.saleActions
          }
        >
          {canCreateRefund(user) &&
            !isFullyRefunded ? (
            <TouchableOpacity
              style={{
                minHeight: 42,
                paddingHorizontal: 14,
                borderRadius: 10,
                borderWidth: 1,
                borderColor: '#d7a83b',
                backgroundColor: '#2f2818',
                alignItems: 'center',
                justifyContent: 'center',
                marginRight: 8,
              }}
              onPress={() => {
                setRefundSale(item);
              }}
            >
              <Text
                style={{
                  color: '#f0ca69',
                  fontWeight: '900',
                }}
              >
                ↩️ Devolver
              </Text>
            </TouchableOpacity>
          ) : null}
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
      {userCanUseRefundFeatures ? (
        <RefundModal
        visible={refundSale !== null}
        orderId={refundSale?.orderId ?? null}
        formatCurrency={formatCurrency}
        currencyCode={currencyCode}
        onClose={() => {
          setRefundSale(null);
        }}
        onCompleted={async () => {
          const completedOrderId =
            refundSale?.orderId ??
            null;

          await loadSales(true);

          setPeriodRefundRefreshKey(
            current => current + 1,
          );

          if (completedOrderId) {
            await refreshRefundHistoryAfterCompleted(
              completedOrderId,
            );
          }
        }}
      />
      ) : null}

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
        ListHeaderComponent={
          <>
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
                void handleRefreshSales();
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

              {userCanUseRefundFeatures ? (
                <>
                  <Text
                    style={{
                      marginTop: 6,
                      color: '#E05A5A',
                      fontSize: 10,
                      fontWeight: '800',
                    }}
                  >
                    Devuelto:{' '}
                    {formatCurrency(
                      summary.refundedCash,
                    )}
                  </Text>

                  <Text
                    style={{
                      marginTop: 2,
                      color:
                        businessTheme.primary,
                      fontSize: 11,
                      fontWeight: '900',
                    }}
                  >
                    Neto:{' '}
                    {formatCurrency(
                      netCash,
                    )}
                  </Text>
                </>
              ) : null}</View>

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

              {userCanUseRefundFeatures ? (
                <>
                  <Text
                    style={{
                      marginTop: 6,
                      color: '#E05A5A',
                      fontSize: 10,
                      fontWeight: '800',
                    }}
                  >
                    Devuelto:{' '}
                    {formatCurrency(
                      summary.refundedCard,
                    )}
                  </Text>

                  <Text
                    style={{
                      marginTop: 2,
                      color:
                        businessTheme.primary,
                      fontSize: 11,
                      fontWeight: '900',
                    }}
                  >
                    Neto:{' '}
                    {formatCurrency(
                      netCard,
                    )}
                  </Text>
                </>
              ) : null}</View>

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

            {userCanUseRefundFeatures ? (
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
                ↩ Devuelto de ventas del periodo
              </Text>

              <Text
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.7}
                style={[
                  styles.summaryValue,
                  styles.summaryRefundedValue,
                  isSmallPhone &&
                    styles.summaryValueSmall,
                ]}
              >
                {formatCurrency(
                  summary.refunded,
                )}
              </Text>
            </View>
            ) : null}

            {userCanUseRefundFeatures ? (
              <View
              style={[
                styles.summaryCard,
                isPhone &&
                  styles.summaryCardPhone,
                styles.netCard,
              ]}
            >
              <Text
                style={
                  styles.summaryLabel
                }
              >
                Neto de ventas del periodo
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
                  netSales,
                )}
              </Text>
            </View>
            ) : null}

            {userCanUseRefundFeatures ? (
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
                Devoluciones hechas en el periodo
              </Text>

              <Text
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.7}
                style={[
                  styles.summaryValue,
                  styles.summaryRefundedValue,
                  isSmallPhone &&
                    styles.summaryValueSmall,
                ]}
              >
                {isLoadingPeriodRefunds
                  ? '...'
                  : formatCurrency(
                      periodRefundTotal,
                    )}
              </Text>

              <Text
                style={{
                  marginTop: 4,
                  color: '#888888',
                  fontSize: 10,
                  fontWeight: '700',
                }}
              >
                {periodRefundCount}{' '}
                {periodRefundCount === 1
                  ? 'devolución'
                  : 'devoluciones'}
              </Text>
            </View>
            ) : null}
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
          </>
        }
        ListEmptyComponent={
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
        }
      />

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
