import React, {
  useMemo,
  useState,
} from 'react';

import {
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';

import {
  useBusiness,
} from '../../../context/BusinessContext';

import {
  EventReportRow,
} from '../../../services/reportService';

import {
  AdminReportSelect,
  AdminReportSelectOption,
} from './AdminReportSelect';

interface Props {
  rows: EventReportRow[];
  formatCurrency: (value: number) => string;
}

type StatusFilter =
  | 'all'
  | EventReportRow['status'];

const STATUS_OPTIONS: AdminReportSelectOption[] = [
  { value: 'all', label: 'Todos los estados' },
  { value: 'new', label: 'Nueva' },
  { value: 'reviewing', label: 'En revisión' },
  { value: 'quoted', label: 'Cotizada' },
  { value: 'accepted', label: 'Aceptada' },
  { value: 'confirmed', label: 'Confirmada' },
  { value: 'completed', label: 'Realizada' },
  { value: 'rejected', label: 'Rechazada' },
  { value: 'cancelled', label: 'Cancelada' },
];

function statusLabel(status: EventReportRow['status']): string {
  switch (status) {
    case 'new': return 'NUEVA';
    case 'reviewing': return 'EN REVISIÓN';
    case 'quoted': return 'COTIZADA';
    case 'accepted': return 'ACEPTADA';
    case 'confirmed': return 'CONFIRMADA';
    case 'completed': return 'REALIZADA';
    case 'rejected': return 'RECHAZADA';
    case 'cancelled': return 'CANCELADA';
  }
}

function csvCell(value: string | number | null | undefined): string {
  const normalized = String(value ?? '').replace(/"/g, '""');
  return `"${normalized}"`;
}

function formatEventDate(value: string): string {
  const [year, month, day] = value.split('-');
  if (!year || !month || !day) return value;
  return `${day}/${month}/${year}`;
}

export function AdminEventReport({
  rows,
  formatCurrency,
}: Props) {
  const { theme } = useBusiness();

  const [statusFilter, setStatusFilter] =
    useState<StatusFilter>('all');
  const [typeFilter, setTypeFilter] =
    useState('all');
  const [packageFilter, setPackageFilter] =
    useState('all');
  const [query, setQuery] =
    useState('');
  const [isExporting, setIsExporting] =
    useState(false);

  const typeOptions =
    useMemo<AdminReportSelectOption[]>(() => {
      const values = Array.from(
        new Set(
          rows
            .map(row => row.eventTypeName.trim())
            .filter(Boolean),
        ),
      ).sort((a, b) =>
        a.localeCompare(b, 'es', { sensitivity: 'base' }),
      );

      return [
        { value: 'all', label: 'Todos los tipos' },
        ...values.map(value => ({ value, label: value })),
      ];
    }, [rows]);

  const packageOptions =
    useMemo<AdminReportSelectOption[]>(() => {
      const values = Array.from(
        new Set(
          rows
            .map(row => row.packageName.trim())
            .filter(Boolean),
        ),
      ).sort((a, b) =>
        a.localeCompare(b, 'es', { sensitivity: 'base' }),
      );

      return [
        { value: 'all', label: 'Todos los paquetes' },
        ...values.map(value => ({ value, label: value })),
      ];
    }, [rows]);

  const filteredRows =
    useMemo(() => {
      const normalizedQuery = query
        .trim()
        .toLocaleLowerCase('es-MX');

      return rows.filter(row => {
        if (
          statusFilter !== 'all' &&
          row.status !== statusFilter
        ) {
          return false;
        }

        if (
          typeFilter !== 'all' &&
          row.eventTypeName !== typeFilter
        ) {
          return false;
        }

        if (
          packageFilter !== 'all' &&
          row.packageName !== packageFilter
        ) {
          return false;
        }

        if (normalizedQuery) {
          const haystack = [
            String(row.folio),
            row.customerName,
            row.customerPhone,
            row.customerEmail,
          ]
            .join(' ')
            .toLocaleLowerCase('es-MX');

          if (!haystack.includes(normalizedQuery)) {
            return false;
          }
        }

        return true;
      });
    }, [
      rows,
      statusFilter,
      typeFilter,
      packageFilter,
      query,
    ]);

  const summary =
    useMemo(() => {
      let quoted = 0;
      let accepted = 0;
      let confirmed = 0;
      let completed = 0;
      let cancelledOrRejected = 0;
      let quotedValue = 0;
      let collected = 0;
      let pending = 0;
      let ticketBase = 0;
      let ticketCount = 0;

      filteredRows.forEach(row => {
        if (row.wasQuoted) quoted += 1;

        if (
          row.status === 'accepted' ||
          row.status === 'confirmed' ||
          row.status === 'completed'
        ) {
          accepted += 1;
        }

        if (
          row.status === 'confirmed' ||
          row.status === 'completed'
        ) {
          confirmed += 1;
          ticketBase += row.effectiveTotal;
          ticketCount += 1;
        }

        if (row.status === 'completed') {
          completed += 1;
        }

        if (
          row.status === 'cancelled' ||
          row.status === 'rejected'
        ) {
          cancelledOrRejected += 1;
        }

        if (row.wasQuoted) {
          quotedValue += row.effectiveTotal;
        }

        collected += row.totalCollected;
        pending += row.pendingBalance;
      });

      const requests = filteredRows.length;

      return {
        requests,
        quoted,
        accepted,
        confirmed,
        completed,
        cancelledOrRejected,
        quotedValue,
        collected,
        pending,
        averageTicket:
          ticketCount > 0
            ? ticketBase / ticketCount
            : 0,
        confirmationConversion:
          requests > 0
            ? (confirmed / requests) * 100
            : 0,
      };
    }, [filteredRows]);

  const typeRanking =
    useMemo(() => {
      const map = new Map<
        string,
        { count: number; value: number }
      >();

      filteredRows.forEach(row => {
        const key = row.eventTypeName || 'Sin tipo';
        const current = map.get(key) ?? {
          count: 0,
          value: 0,
        };
        current.count += 1;
        current.value += row.effectiveTotal;
        map.set(key, current);
      });

      return Array.from(map.entries())
        .map(([name, metrics]) => ({
          name,
          ...metrics,
        }))
        .sort((a, b) => b.count - a.count || b.value - a.value);
    }, [filteredRows]);

  const packageRanking =
    useMemo(() => {
      const map = new Map<
        string,
        { count: number; value: number }
      >();

      filteredRows.forEach(row => {
        const key = row.packageName || 'Sin paquete';
        const current = map.get(key) ?? {
          count: 0,
          value: 0,
        };
        current.count += 1;
        current.value += row.effectiveTotal;
        map.set(key, current);
      });

      return Array.from(map.entries())
        .map(([name, metrics]) => ({
          name,
          ...metrics,
        }))
        .sort((a, b) => b.count - a.count || b.value - a.value);
    }, [filteredRows]);

  const hasFilters =
    statusFilter !== 'all' ||
    typeFilter !== 'all' ||
    packageFilter !== 'all' ||
    query.trim() !== '';

  const clearFilters = (): void => {
    setStatusFilter('all');
    setTypeFilter('all');
    setPackageFilter('all');
    setQuery('');
  };

  const handleExportCsv = async (): Promise<void> => {
    if (filteredRows.length === 0 || isExporting) {
      return;
    }

    setIsExporting(true);

    try {
      const headers = [
        'Folio',
        'Estado',
        'Fecha evento',
        'Hora',
        'Cliente',
        'Teléfono',
        'Correo',
        'Tipo',
        'Paquete',
        'Personas',
        'Total evento',
        'Pagado en Eventos',
        'Pagado en POS',
        'Cobrado total',
        'Saldo pendiente',
        'Pedido POS',
      ];

      const lines = [
        headers.map(csvCell).join(','),
        ...filteredRows.map(row => [
          row.folio,
          statusLabel(row.status),
          row.eventDate,
          row.eventTime,
          row.customerName,
          row.customerPhone,
          row.customerEmail,
          row.eventTypeName,
          row.packageName,
          row.guestCount,
          row.effectiveTotal.toFixed(2),
          row.eventPaymentsTotal.toFixed(2),
          row.posPaymentsTotal.toFixed(2),
          row.totalCollected.toFixed(2),
          row.pendingBalance.toFixed(2),
          row.posOrderId,
        ].map(csvCell).join(',')),
      ];

      const csv = `\uFEFF${lines.join('\n')}`;
      const fileName =
        `eventos-${new Date().toISOString().slice(0, 10)}.csv`;

      if (Platform.OS === 'web') {
        const blob = new Blob(
          [csv],
          { type: 'text/csv;charset=utf-8' },
        );
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.download = fileName;
        document.body.appendChild(anchor);
        anchor.click();
        document.body.removeChild(anchor);
        URL.revokeObjectURL(url);
        return;
      }

      if (!FileSystem.cacheDirectory) {
        throw new Error('No se pudo preparar el archivo CSV.');
      }

      const uri = `${FileSystem.cacheDirectory}${fileName}`;
      await FileSystem.writeAsStringAsync(
        uri,
        csv,
        { encoding: FileSystem.EncodingType.UTF8 },
      );

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, {
          mimeType: 'text/csv',
          dialogTitle: 'Exportar reporte de eventos',
          UTI: 'public.comma-separated-values-text',
        });
      }
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <>
      <View
        style={[
          styles.filtersCard,
          {
            borderColor: theme.border,
            backgroundColor: theme.surface,
          },
        ]}
      >
        <View style={styles.filtersHeader}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.title, { color: theme.text }]}>Filtros de eventos</Text>
            <Text style={[styles.subtitle, { color: theme.textMuted }]}>El periodo superior se aplica por fecha del evento.</Text>
          </View>

          {hasFilters ? (
            <TouchableOpacity
              style={[styles.secondaryButton, { borderColor: theme.border }]}
              onPress={clearFilters}
            >
              <Text style={[styles.secondaryButtonText, { color: theme.textMuted }]}>LIMPIAR</Text>
            </TouchableOpacity>
          ) : null}
        </View>

        <View style={styles.selectGrid}>
          <AdminReportSelect
            label="Estado"
            value={statusFilter}
            options={STATUS_OPTIONS}
            onChange={value => setStatusFilter(value as StatusFilter)}
            modalTitle="Filtrar por estado"
          />

          <AdminReportSelect
            label="Tipo"
            value={typeFilter}
            options={typeOptions}
            onChange={setTypeFilter}
            modalTitle="Filtrar por tipo de evento"
          />

          <AdminReportSelect
            label="Paquete"
            value={packageFilter}
            options={packageOptions}
            onChange={setPackageFilter}
            modalTitle="Filtrar por paquete"
          />
        </View>

        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Buscar por folio, cliente, teléfono o correo..."
          placeholderTextColor={theme.textMuted}
          style={[
            styles.searchInput,
            {
              borderColor: theme.border,
              color: theme.text,
              backgroundColor: theme.surfaceAlt,
            },
          ]}
        />

        <View style={styles.filterFooter}>
          <Text style={[styles.countText, { color: theme.textMuted }]}>
            {filteredRows.length} de {rows.length} evento(s)
          </Text>

          <TouchableOpacity
            style={[
              styles.exportButton,
              { backgroundColor: theme.primary },
              (filteredRows.length === 0 || isExporting) && styles.disabled,
            ]}
            disabled={filteredRows.length === 0 || isExporting}
            onPress={() => { void handleExportCsv(); }}
          >
            <Text style={[styles.exportButtonText, { color: theme.onPrimary }]}>
              {isExporting ? 'EXPORTANDO...' : 'EXPORTAR CSV'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.summaryGrid}>
        <Metric label="Solicitudes" value={String(summary.requests)} />
        <Metric label="Cotizadas" value={String(summary.quoted)} />
        <Metric label="Aceptadas" value={String(summary.accepted)} />
        <Metric label="Confirmadas" value={String(summary.confirmed)} />
        <Metric label="Realizadas" value={String(summary.completed)} />
        <Metric label="Cancel./rechaz." value={String(summary.cancelledOrRejected)} />
        <Metric label="Conversión a confirmada" value={`${summary.confirmationConversion.toFixed(1)}%`} />
        <Metric label="Ticket promedio" value={formatCurrency(summary.averageTicket)} />
      </View>

      <View style={styles.summaryGrid}>
        <Metric label="Valor cotizado" value={formatCurrency(summary.quotedValue)} />
        <Metric label="Cobrado" value={formatCurrency(summary.collected)} />
        <Metric label="Saldo pendiente" value={formatCurrency(summary.pending)} />
      </View>

      <View style={[styles.infoCard, { borderColor: theme.border, backgroundColor: theme.surfaceAlt }]}>
        <Text style={[styles.infoText, { color: theme.textMuted }]}>
          “Cobrado” suma pagos registrados en Eventos y el saldo cobrado después en el pedido POS vinculado. El total cotizado no se vuelve a sumar como ingreso.
        </Text>
      </View>

      <View style={styles.rankingsGrid}>
        <RankingCard
          title="Tipos de evento"
          rows={typeRanking}
          formatCurrency={formatCurrency}
        />
        <RankingCard
          title="Paquetes"
          rows={packageRanking}
          formatCurrency={formatCurrency}
        />
      </View>

      <View style={[styles.detailCard, { borderColor: theme.border, backgroundColor: theme.surface }]}>
        <Text style={[styles.detailTitle, { color: theme.text }]}>Detalle de eventos</Text>

        {filteredRows.length === 0 ? (
          <Text style={[styles.emptyText, { color: theme.textMuted }]}>No hay eventos que coincidan con los filtros.</Text>
        ) : (
          filteredRows.map(row => (
            <View
              key={row.requestId}
              style={[styles.eventRow, { borderColor: theme.border }]}
            >
              <View style={styles.eventHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.folio, { color: theme.primary }]}>Evento #{row.folio}</Text>
                  <Text style={[styles.customer, { color: theme.text }]}>{row.customerName}</Text>
                </View>
                <View style={[styles.statusBadge, { borderColor: theme.border, backgroundColor: theme.surfaceAlt }]}>
                  <Text style={[styles.statusText, { color: theme.textMuted }]}>{statusLabel(row.status)}</Text>
                </View>
              </View>

              <Text style={[styles.meta, { color: theme.textMuted }]}>
                {formatEventDate(row.eventDate)}{row.eventTime ? ` · ${row.eventTime.slice(0, 5)}` : ''} · {row.guestCount} personas
              </Text>
              <Text style={[styles.meta, { color: theme.textMuted }]}>{row.eventTypeName || 'Sin tipo'} · {row.packageName || 'Sin paquete'}</Text>

              <View style={styles.moneyGrid}>
                <MoneyValue label="Total" value={formatCurrency(row.effectiveTotal)} />
                <MoneyValue label="Eventos" value={formatCurrency(row.eventPaymentsTotal)} />
                <MoneyValue label="POS" value={formatCurrency(row.posPaymentsTotal)} />
                <MoneyValue label="Pendiente" value={formatCurrency(row.pendingBalance)} />
              </View>
            </View>
          ))
        )}
      </View>
    </>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  const { theme } = useBusiness();
  return (
    <View style={[styles.metricCard, { borderColor: theme.border, backgroundColor: theme.surface }]}>
      <Text style={[styles.metricValue, { color: theme.primary }]}>{value}</Text>
      <Text style={[styles.metricLabel, { color: theme.textMuted }]}>{label}</Text>
    </View>
  );
}

function RankingCard({
  title,
  rows,
  formatCurrency,
}: {
  title: string;
  rows: Array<{ name: string; count: number; value: number }>;
  formatCurrency: (value: number) => string;
}) {
  const { theme } = useBusiness();
  return (
    <View style={[styles.rankingCard, { borderColor: theme.border, backgroundColor: theme.surface }]}>
      <Text style={[styles.detailTitle, { color: theme.text }]}>{title}</Text>
      {rows.length === 0 ? (
        <Text style={[styles.emptyText, { color: theme.textMuted }]}>Sin datos.</Text>
      ) : (
        rows.slice(0, 10).map((row, index) => (
          <View key={row.name} style={[styles.rankingRow, { borderColor: theme.border }]}>
            <Text style={[styles.rankIndex, { color: theme.textMuted }]}>{index + 1}</Text>
            <View style={{ flex: 1 }}>
              <Text style={[styles.rankName, { color: theme.text }]} numberOfLines={1}>{row.name}</Text>
              <Text style={[styles.rankMeta, { color: theme.textMuted }]}>{row.count} evento(s)</Text>
            </View>
            <Text style={[styles.rankValue, { color: theme.primary }]}>{formatCurrency(row.value)}</Text>
          </View>
        ))
      )}
    </View>
  );
}

function MoneyValue({ label, value }: { label: string; value: string }) {
  const { theme } = useBusiness();
  return (
    <View style={styles.moneyItem}>
      <Text style={[styles.moneyLabel, { color: theme.textMuted }]}>{label}</Text>
      <Text style={[styles.moneyValue, { color: theme.text }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  filtersCard: {
    padding: 16,
    borderWidth: 1,
    borderRadius: 12,
    marginBottom: 16,
  },
  filtersHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: '900',
  },
  subtitle: {
    marginTop: 4,
    fontSize: 11,
    lineHeight: 16,
  },
  selectGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  searchInput: {
    marginTop: 12,
    minHeight: 42,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderRadius: 8,
    fontSize: 13,
  },
  filterFooter: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    flexWrap: 'wrap',
  },
  countText: {
    fontSize: 11,
    fontWeight: '700',
  },
  exportButton: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 8,
  },
  exportButtonText: {
    fontSize: 11,
    fontWeight: '900',
  },
  secondaryButton: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  secondaryButtonText: {
    fontSize: 10,
    fontWeight: '900',
  },
  disabled: {
    opacity: 0.5,
  },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 12,
  },
  metricCard: {
    flexGrow: 1,
    flexBasis: 150,
    minWidth: 140,
    padding: 15,
    borderWidth: 1,
    borderRadius: 12,
  },
  metricValue: {
    fontSize: 21,
    fontWeight: '900',
  },
  metricLabel: {
    marginTop: 5,
    fontSize: 11,
    fontWeight: '700',
  },
  infoCard: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    marginBottom: 14,
  },
  infoText: {
    fontSize: 11,
    lineHeight: 16,
  },
  rankingsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 14,
  },
  rankingCard: {
    flexGrow: 1,
    flexBasis: 300,
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
  },
  detailCard: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    marginBottom: 18,
  },
  detailTitle: {
    fontSize: 16,
    fontWeight: '900',
    marginBottom: 10,
  },
  rankingRow: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderTopWidth: 1,
    paddingVertical: 8,
  },
  rankIndex: {
    width: 24,
    fontWeight: '800',
  },
  rankName: {
    fontSize: 12,
    fontWeight: '800',
  },
  rankMeta: {
    marginTop: 2,
    fontSize: 10,
  },
  rankValue: {
    fontSize: 12,
    fontWeight: '900',
  },
  eventRow: {
    borderTopWidth: 1,
    paddingVertical: 12,
  },
  eventHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  folio: {
    fontSize: 12,
    fontWeight: '900',
  },
  customer: {
    marginTop: 2,
    fontSize: 14,
    fontWeight: '800',
  },
  statusBadge: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 5,
  },
  statusText: {
    fontSize: 9,
    fontWeight: '900',
  },
  meta: {
    marginTop: 5,
    fontSize: 11,
  },
  moneyGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 10,
  },
  moneyItem: {
    minWidth: 105,
  },
  moneyLabel: {
    fontSize: 9,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  moneyValue: {
    marginTop: 2,
    fontSize: 12,
    fontWeight: '900',
  },
  emptyText: {
    paddingVertical: 16,
    fontSize: 12,
    textAlign: 'center',
  },
});
