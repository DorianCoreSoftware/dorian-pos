import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { RefundReportRow, RefundReportSummary } from '../../../types/refund';

interface Props {
  summary: RefundReportSummary;
  rows: RefundReportRow[];
  formatCurrency: (value: number) => string;
}

export function AdminRefundReport({ summary, rows, formatCurrency }: Props) {
  return (
    <>
      <View style={styles.grid}>
        <Box label="Devoluciones" value={String(summary.refundsCount)} />
        <Box label="Total devuelto" value={formatCurrency(summary.refundedTotal)} />
        <Box label="Efectivo" value={formatCurrency(summary.cashTotal)} />
        <Box label="Tarjeta" value={formatCurrency(summary.cardTotal)} />
      </View>

      <View style={styles.card}>
        <Text style={styles.title}>Historial de devoluciones</Text>
        <Text style={styles.subtitle}>{summary.itemsCount} artículo(s) devuelto(s) en el periodo.</Text>

        {rows.length === 0 ? (
          <Text style={styles.empty}>No hay devoluciones en este periodo.</Text>
        ) : rows.map(row => (
          <View key={row.refundId} style={styles.row}>
            <View style={styles.rowHeader}>
              <Text style={styles.folio}>DEV-{String(row.refundNumber).padStart(6, '0')}</Text>
              <Text style={styles.amount}>{formatCurrency(row.refundTotal)}</Text>
            </View>
            <Text style={styles.meta}>Orden #{row.orderId.slice(-4).toUpperCase()} · {row.refundType === 'full' ? 'TOTAL' : 'PARCIAL'} · {row.paymentMethod === 'cash' ? 'EFECTIVO' : row.paymentMethod === 'card' ? 'TARJETA' : row.paymentMethod.toUpperCase()}</Text>
            <Text style={styles.reason}>{row.reason}</Text>
            <Text style={styles.meta}>{row.itemsCount} artículo(s){row.userName ? ` · ${row.userName}` : ''}{row.policyException ? ' · EXCEPCIÓN' : ''}</Text>
            <Text style={styles.meta}>{new Date(row.createdAt).toLocaleString('es-MX')}</Text>
          </View>
        ))}
      </View>
    </>
  );
}

function Box({ label, value }: { label: string; value: string }) {
  return <View style={styles.box}><Text style={styles.value}>{value}</Text><Text style={styles.label}>{label}</Text></View>;
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  box: { flexGrow: 1, flexBasis: 150, minHeight: 92, padding: 16, borderRadius: 14, borderWidth: 1, borderColor: '#333', backgroundColor: '#1b1b1b', justifyContent: 'center' },
  value: { color: '#fff', fontSize: 21, fontWeight: '900' },
  label: { marginTop: 4, color: '#888', fontSize: 12, fontWeight: '700' },
  card: { marginTop: 16, padding: 16, borderRadius: 14, borderWidth: 1, borderColor: '#333', backgroundColor: '#171717' },
  title: { color: '#fff', fontSize: 17, fontWeight: '900' },
  subtitle: { marginTop: 4, color: '#888', fontSize: 12 },
  empty: { paddingVertical: 24, color: '#777', textAlign: 'center', fontWeight: '600' },
  row: { marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#2f2f2f' },
  rowHeader: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  folio: { color: '#f0ca69', fontSize: 14, fontWeight: '900' },
  amount: { color: '#fff', fontSize: 15, fontWeight: '900' },
  reason: { marginTop: 5, color: '#e0e0e0', fontSize: 13 },
  meta: { marginTop: 4, color: '#777', fontSize: 11 },
});
