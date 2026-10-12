import React, {
  useMemo,
  useState,
} from 'react';

import {
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import {
  RefundReportSummary,
  RefundReportRow,
} from '../../../types/refund';

interface Props {
  summary: RefundReportSummary;
  rows: RefundReportRow[];
  formatCurrency:
    (value: number) => string;
}

type PaymentFilter =
  | 'all'
  | 'cash'
  | 'card';

type RefundTypeFilter =
  | 'all'
  | 'partial'
  | 'full';

type PolicyFilter =
  | 'all'
  | 'yes'
  | 'no';

export function AdminRefundReport({
  summary,
  rows,
  formatCurrency,
}: Props) {
  const [
    paymentFilter,
    setPaymentFilter,
  ] = useState<PaymentFilter>(
    'all',
  );

  const [
    refundTypeFilter,
    setRefundTypeFilter,
  ] =
    useState<RefundTypeFilter>(
      'all',
    );

  const [
    policyFilter,
    setPolicyFilter,
  ] = useState<PolicyFilter>(
    'all',
  );

  const [
    reasonQuery,
    setReasonQuery,
  ] = useState('');

  const filteredRows =
    useMemo(() => {
      const normalizedReason =
        reasonQuery
          .trim()
          .toLocaleLowerCase(
            'es-MX',
          );

      return rows.filter(
        row => {
          if (
            paymentFilter !==
              'all' &&
            row.paymentMethod !==
              paymentFilter
          ) {
            return false;
          }

          if (
            refundTypeFilter !==
              'all' &&
            row.refundType !==
              refundTypeFilter
          ) {
            return false;
          }

          if (
            policyFilter ===
              'yes' &&
            !row.policyException
          ) {
            return false;
          }

          if (
            policyFilter ===
              'no' &&
            row.policyException
          ) {
            return false;
          }

          if (
            normalizedReason &&
            !row.reason
              .toLocaleLowerCase(
                'es-MX',
              )
              .includes(
                normalizedReason,
              )
          ) {
            return false;
          }

          return true;
        },
      );
    }, [
      rows,
      paymentFilter,
      refundTypeFilter,
      policyFilter,
      reasonQuery,
    ]);

  const filteredSummary =
    useMemo<
      RefundReportSummary
    >(() => {
      return filteredRows.reduce(
        (
          accumulator,
          row,
        ) => {
          accumulator
            .refundsCount += 1;

          accumulator
            .refundedTotal +=
            row.refundTotal;

          accumulator
            .itemsCount +=
            row.itemsCount;

          if (
            row.paymentMethod ===
            'cash'
          ) {
            accumulator
              .cashTotal +=
              row.refundTotal;
          }

          if (
            row.paymentMethod ===
            'card'
          ) {
            accumulator
              .cardTotal +=
              row.refundTotal;
          }

          return accumulator;
        },
        {
          refundsCount: 0,
          refundedTotal: 0,
          cashTotal: 0,
          cardTotal: 0,
          itemsCount: 0,
        },
      );
    }, [filteredRows]);

  const hasActiveFilters =
    paymentFilter !== 'all' ||
    refundTypeFilter !== 'all' ||
    policyFilter !== 'all' ||
    reasonQuery.trim() !== '';

  const clearFilters =
    (): void => {
      setPaymentFilter('all');
      setRefundTypeFilter('all');
      setPolicyFilter('all');
      setReasonQuery('');
    };

  const renderFilterGroup =
    <T extends string>(
      label: string,
      value: T,
      options: Array<{
        value: T;
        label: string;
      }>,
      onChange:
        (nextValue: T) => void,
    ) => (
      <View
        style={
          styles.filterGroup
        }
      >
        <Text
          style={
            styles.filterLabel
          }
        >
          {label}
        </Text>

        <View
          style={
            styles.filterOptions
          }
        >
          {options.map(
            option => {
              const isActive =
                option.value ===
                value;

              return (
                <TouchableOpacity
                  key={
                    option.value
                  }
                  onPress={() =>
                    onChange(
                      option.value,
                    )
                  }
                  style={[
                    styles.filterChip,
                    isActive &&
                      styles.filterChipActive,
                  ]}
                  activeOpacity={0.8}
                >
                  <Text
                    style={[
                      styles.filterChipText,
                      isActive &&
                        styles.filterChipTextActive,
                    ]}
                  >
                    {option.label}
                  </Text>
                </TouchableOpacity>
              );
            },
          )}
        </View>
      </View>
    );

  return (
    <>
      <View
        style={
          styles.filtersCard
        }
      >
        <View
          style={
            styles.filtersHeader
          }
        >
          <View
            style={{
              flex: 1,
            }}
          >
            <Text
              style={
                styles.filtersTitle
              }
            >
              Filtros
            </Text>

            <Text
              style={
                styles.filtersSubtitle
              }
            >
              Ajusta la vista del reporte sin cambiar el periodo seleccionado.
            </Text>
          </View>

          {hasActiveFilters ? (
            <TouchableOpacity
              onPress={
                clearFilters
              }
              style={
                styles.clearButton
              }
            >
              <Text
                style={
                  styles.clearButtonText
                }
              >
                LIMPIAR
              </Text>
            </TouchableOpacity>
          ) : null}
        </View>

        {renderFilterGroup<
          PaymentFilter
        >(
          'Método de pago',
          paymentFilter,
          [
            {
              value: 'all',
              label: 'Todos',
            },
            {
              value: 'cash',
              label: 'Efectivo',
            },
            {
              value: 'card',
              label: 'Tarjeta',
            },
          ],
          setPaymentFilter,
        )}

        {renderFilterGroup<
          RefundTypeFilter
        >(
          'Tipo de devolución',
          refundTypeFilter,
          [
            {
              value: 'all',
              label: 'Todas',
            },
            {
              value: 'partial',
              label: 'Parcial',
            },
            {
              value: 'full',
              label: 'Total',
            },
          ],
          setRefundTypeFilter,
        )}

        {renderFilterGroup<
          PolicyFilter
        >(
          'Excepción de política',
          policyFilter,
          [
            {
              value: 'all',
              label: 'Todas',
            },
            {
              value: 'yes',
              label: 'Sí',
            },
            {
              value: 'no',
              label: 'No',
            },
          ],
          setPolicyFilter,
        )}

        <View
          style={
            styles.filterGroup
          }
        >
          <Text
            style={
              styles.filterLabel
            }
          >
            Motivo
          </Text>

          <TextInput
            value={
              reasonQuery
            }
            onChangeText={
              setReasonQuery
            }
            placeholder="Buscar por motivo..."
            placeholderTextColor="#666"
            style={
              styles.searchInput
            }
          />
        </View>

        <Text
          style={
            styles.filteredCount
          }
        >
          {filteredRows.length}{' '}
          de {rows.length}{' '}
          devolución(es)
        </Text>
      </View>

      <View
        style={styles.grid}
      >
        <Box
          label="Devoluciones"
          value={String(
            filteredSummary
              .refundsCount,
          )}
        />

        <Box
          label="Total devuelto"
          value={formatCurrency(
            filteredSummary
              .refundedTotal,
          )}
        />

        <Box
          label="Efectivo"
          value={formatCurrency(
            filteredSummary
              .cashTotal,
          )}
        />

        <Box
          label="Tarjeta"
          value={formatCurrency(
            filteredSummary
              .cardTotal,
          )}
        />
      </View>

      <View
        style={styles.card}
      >
        <Text
          style={styles.title}
        >
          Historial de devoluciones
        </Text>

        <Text
          style={styles.subtitle}
        >
          {
            filteredSummary
              .itemsCount
          }{' '}
          artículo(s) devuelto(s)
          {hasActiveFilters
            ? ' con los filtros actuales.'
            : ' en el periodo.'}
        </Text>

        {filteredRows.length ===
        0 ? (
          <Text
            style={styles.empty}
          >
            No hay devoluciones que coincidan con los filtros.
          </Text>
        ) : (
          filteredRows.map(
            row => (
              <View
                key={
                  row.refundId
                }
                style={
                  styles.row
                }
              >
                <View
                  style={
                    styles.rowHeader
                  }
                >
                  <Text
                    style={
                      styles.folio
                    }
                  >
                    DEV-
                    {String(
                      row.refundNumber,
                    ).padStart(
                      6,
                      '0',
                    )}
                  </Text>

                  <Text
                    style={
                      styles.amount
                    }
                  >
                    {formatCurrency(
                      row.refundTotal,
                    )}
                  </Text>
                </View>

                <Text
                  style={
                    styles.meta
                  }
                >
                  Orden #
                  {row.orderId
                    .slice(-4)
                    .toUpperCase()}
                  {' · '}
                  {row.refundType ===
                  'full'
                    ? 'TOTAL'
                    : 'PARCIAL'}
                  {' · '}
                  {row.paymentMethod ===
                  'cash'
                    ? 'EFECTIVO'
                    : row.paymentMethod ===
                        'card'
                      ? 'TARJETA'
                      : row.paymentMethod.toUpperCase()}
                </Text>

                <Text
                  style={
                    styles.reason
                  }
                >
                  {row.reason}
                </Text>

                <Text
                  style={
                    styles.meta
                  }
                >
                  {row.itemsCount}{' '}
                  artículo(s)
                  {row.userName
                    ? ` · ${row.userName}`
                    : ''}
                  {row.policyException
                    ? ' · EXCEPCIÓN'
                    : ''}
                </Text>

                <Text
                  style={
                    styles.meta
                  }
                >
                  {new Date(
                    row.createdAt,
                  ).toLocaleString(
                    'es-MX',
                  )}
                </Text>
              </View>
            ),
          )
        )}
      </View>
    </>
  );
}

function Box({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <View
      style={styles.box}
    >
      <Text
        style={styles.value}
      >
        {value}
      </Text>

      <Text
        style={styles.label}
      >
        {label}
      </Text>
    </View>
  );
}

const styles =
  StyleSheet.create({
    filtersCard: {
      marginBottom: 16,
      padding: 16,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: '#333',
      backgroundColor:
        '#171717',
    },

    filtersHeader: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent:
        'space-between',
      gap: 12,
      marginBottom: 14,
    },

    filtersTitle: {
      color: '#fff',
      fontSize: 16,
      fontWeight: '900',
    },

    filtersSubtitle: {
      marginTop: 3,
      color: '#777',
      fontSize: 11,
      lineHeight: 16,
    },

    clearButton: {
      paddingHorizontal: 10,
      paddingVertical: 7,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: '#555',
      backgroundColor:
        '#222',
    },

    clearButtonText: {
      color: '#ddd',
      fontSize: 10,
      fontWeight: '900',
    },

    filterGroup: {
      marginTop: 12,
    },

    filterLabel: {
      marginBottom: 7,
      color: '#aaa',
      fontSize: 11,
      fontWeight: '800',
    },

    filterOptions: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },

    filterChip: {
      paddingHorizontal: 11,
      paddingVertical: 7,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: '#444',
      backgroundColor:
        '#202020',
    },

    filterChipActive: {
      borderColor: '#f0ca69',
      backgroundColor:
        '#2f2818',
    },

    filterChipText: {
      color: '#999',
      fontSize: 11,
      fontWeight: '800',
    },

    filterChipTextActive: {
      color: '#f0ca69',
    },

    searchInput: {
      minHeight: 42,
      borderWidth: 1,
      borderColor: '#444',
      borderRadius: 10,
      paddingHorizontal: 12,
      color: '#fff',
      backgroundColor:
        '#202020',
      fontSize: 13,
    },

    filteredCount: {
      marginTop: 14,
      color: '#777',
      fontSize: 11,
      fontWeight: '700',
    },

    grid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 12,
    },

    box: {
      flexGrow: 1,
      flexBasis: 150,
      minHeight: 92,
      padding: 16,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: '#333',
      backgroundColor:
        '#1b1b1b',
      justifyContent:
        'center',
    },

    value: {
      color: '#fff',
      fontSize: 21,
      fontWeight: '900',
    },

    label: {
      marginTop: 4,
      color: '#888',
      fontSize: 12,
      fontWeight: '700',
    },

    card: {
      marginTop: 16,
      padding: 16,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: '#333',
      backgroundColor:
        '#171717',
    },

    title: {
      color: '#fff',
      fontSize: 17,
      fontWeight: '900',
    },

    subtitle: {
      marginTop: 4,
      color: '#888',
      fontSize: 12,
    },

    empty: {
      paddingVertical: 24,
      color: '#777',
      textAlign: 'center',
      fontWeight: '600',
    },

    row: {
      marginTop: 12,
      paddingTop: 12,
      borderTopWidth: 1,
      borderTopColor:
        '#2f2f2f',
    },

    rowHeader: {
      flexDirection: 'row',
      justifyContent:
        'space-between',
      gap: 12,
    },

    folio: {
      color: '#f0ca69',
      fontSize: 14,
      fontWeight: '900',
    },

    amount: {
      color: '#fff',
      fontSize: 15,
      fontWeight: '900',
    },

    reason: {
      marginTop: 5,
      color: '#e0e0e0',
      fontSize: 13,
    },

    meta: {
      marginTop: 4,
      color: '#777',
      fontSize: 11,
    },
  });
