import React, { useEffect, useMemo, useState } from 'react';
import { Alert, ActivityIndicator, Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { getOrderRefundAvailability, getOrderRefundHistory, createOrderRefund, getRefundReceiptDetails } from '../../services/refundService';
import { RefundAvailabilityItem, OrderRefundHistoryRow } from '../../types/refund';
import { printRefundTicket } from '../../services/printerService';
import { useBusiness } from '../../context/BusinessContext';


interface Props {
  visible: boolean;
  orderId: string | null;
  onClose: () => void;
  onCompleted: () => Promise<void> | void;
  formatCurrency: (value: number) => string;
  currencyCode: string;
}

const REASONS = ['Cliente se arrepintió', 'Producto incorrecto', 'Problema de calidad', 'Pedido incompleto', 'Otro'];

export function RefundModal({ visible, orderId, onClose, onCompleted, formatCurrency, currencyCode }: Props) {
  const { theme: businessTheme } = useBusiness();
  const brandPrimary = businessTheme.primary;

  const [items, setItems] = useState<RefundAvailabilityItem[]>([]);
  const [history, setHistory] = useState<OrderRefundHistoryRow[]>([]);
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [reason, setReason] = useState('');
  const [notes, setNotes] = useState('');
  const [policyException, setPolicyException] = useState(false);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [
    reprintingRefundId,
    setReprintingRefundId,
  ] = useState<string | null>(
    null,
  );

  useEffect(() => {
    if (!visible || !orderId) return;
    let mounted = true;
    void (async () => {
      try {
        setLoading(true);
        setErrorMessage(null);
        const [availability, refundHistory] = await Promise.all([
          getOrderRefundAvailability(orderId),
          getOrderRefundHistory(orderId),
        ]);
        if (!mounted) return;
        setItems(availability);
        setHistory(refundHistory);
        setQuantities({});
        setReason('');
        setNotes('');
        setPolicyException(false);
      } catch (error) {
        if (mounted) setErrorMessage(error instanceof Error ? error.message : 'No se pudo cargar la venta.');
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [visible, orderId]);

  const firstItem = items[0] ?? null;
  const refundTotal = useMemo(() => items.reduce((total, item) => total + (quantities[item.itemId] ?? 0) * item.unitRefundAmount, 0), [items, quantities]);
  const selectedCount = useMemo(() => Object.values(quantities).reduce((a, b) => a + b, 0), [quantities]);
  const totalRefunded = useMemo(() => history.reduce((a, b) => a + b.refundTotal, 0), [history]);

  const adjust = (item: RefundAvailabilityItem, delta: number) => {
    if (!item.refundable) return;
    setQuantities(current => ({
      ...current,
      [item.itemId]: Math.min(item.remainingQuantity, Math.max(0, (current[item.itemId] ?? 0) + delta)),
    }));
  };

  const handleReprintRefund =
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

        setErrorMessage(null);

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


  const submit = async () => {
    if (!orderId || selectedCount <= 0) {
      setErrorMessage('Selecciona al menos un artículo.');
      return;
    }
    if (firstItem?.requireReason && !reason.trim()) {
      setErrorMessage('Selecciona un motivo.');
      return;
    }
    if (firstItem?.requireNotes && !notes.trim()) {
      setErrorMessage('Agrega las notas requeridas.');
      return;
    }
    try {
      setSubmitting(true);
      setErrorMessage(null);
      const selectedRefundItems =
        items
          .map(item => ({
            productName:
              item.productName,
            quantity:
              quantities[
                item.itemId
              ] ?? 0,
            unitRefundAmount:
              item.unitRefundAmount,
          }))
          .filter(
            item =>
              item.quantity > 0,
          );

      const previousRefundIds =
        new Set(
          history.map(
            refund =>
              refund.refundId,
          ),
        );

      await createOrderRefund({
        orderId,
        items: Object.entries(
          quantities,
        )
          .filter(
            ([, quantity]) =>
              quantity > 0,
          )
          .map(
            ([
              orderItemId,
              quantity,
            ]) => ({
              orderItemId,
              quantity,
            }),
          ),
        reason,
        notes,
        policyException,
      });

      const updatedHistory =
        await getOrderRefundHistory(
          orderId,
        );

      const createdRefund =
        updatedHistory.find(
          refund =>
            !previousRefundIds.has(
              refund.refundId,
            ),
        ) ??
        [...updatedHistory].sort(
          (a, b) =>
            b.refundNumber -
            a.refundNumber,
        )[0] ??
        null;

      let printError:
        string | null = null;

      if (createdRefund) {
        try {
          await printRefundTicket({
            refundNumber:
              createdRefund
                .refundNumber,
            refundType:
              createdRefund
                .refundType,
            orderId,
            createdAt:
              createdRefund
                .createdAt,
            paymentMethod:
              createdRefund
                .paymentMethod,
            refundTotal:
              createdRefund
                .refundTotal,
            reason:
              createdRefund.reason,
            notes:
              createdRefund.notes,
            policyException:
              createdRefund
                .policyException,
            userName:
              createdRefund
                .userName,
            items:
              selectedRefundItems,
            currencyCode,
          });
        } catch (printErrorValue) {
          printError =
            printErrorValue instanceof
            Error
              ? printErrorValue.message
              : 'No se pudo imprimir el comprobante.';
        }
      } else {
        printError =
          'La devolución quedó registrada, pero no se pudo obtener su folio para imprimir el comprobante.';
      }

      await onCompleted();

      onClose();

      if (printError) {
        Alert.alert(
          'Devolución registrada',
          `La devolución se guardó correctamente, pero el comprobante no pudo imprimirse.\n\n${printError}`,
        );
      }
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'No se pudo completar la devolución.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <View style={styles.header}>
            <View><Text style={styles.title}>Devolución</Text><Text style={styles.subtitle}>Orden #{orderId?.slice(-4).toUpperCase()}</Text></View>
            <TouchableOpacity style={styles.close} onPress={onClose} disabled={submitting}><Text style={styles.closeText}>✕</Text></TouchableOpacity>
          </View>

          {loading ? <View style={styles.loading}><ActivityIndicator /><Text style={styles.muted}>Cargando venta...</Text></View> : (
            <ScrollView contentContainerStyle={styles.content}>
              {firstItem ? <View style={styles.summary}>
                <Text style={styles.summaryText}>Pagado: {formatCurrency(firstItem.originalTotal)}</Text>
                <Text style={styles.summaryText}>Ya devuelto: {formatCurrency(totalRefunded)}</Text>
                <Text style={styles.summaryText}>Método: {firstItem.paymentMethod === 'cash' ? 'Efectivo' : firstItem.paymentMethod === 'card' ? 'Tarjeta' : firstItem.paymentMethod}</Text>
                <Text style={styles.summaryText}>Plazo: {firstItem.maxHours} horas</Text>
              </View> : null}

              <Text style={styles.section}>Artículos</Text>
              {items.map(item => {
                const quantity = quantities[item.itemId] ?? 0;
                return <View key={item.itemId} style={[styles.item, !item.refundable && styles.disabled]}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.itemName}>{item.productName}</Text>
                    {!item.refundable ? <Text style={styles.reward}>Premio / $0 - No reembolsable</Text> : <Text style={styles.muted}>Disponible: {item.remainingQuantity} · {formatCurrency(item.unitRefundAmount)} c/u</Text>}
                  </View>
                  {item.refundable ? <View style={styles.qtyRow}>
                    <TouchableOpacity style={styles.qtyBtn} onPress={() => adjust(item, -1)}><Text style={styles.qtyTxt}>−</Text></TouchableOpacity>
                    <Text style={styles.qty}>{quantity}</Text>
                    <TouchableOpacity style={styles.qtyBtn} onPress={() => adjust(item, 1)}><Text style={styles.qtyTxt}>+</Text></TouchableOpacity>
                  </View> : null}
                </View>;
              })}

              <Text style={styles.section}>Motivo</Text>
              <View style={styles.reasons}>{REASONS.map(option => <TouchableOpacity key={option} style={[styles.reasonBtn, reason === option && styles.reasonActive]} onPress={() => setReason(option)}><Text style={[styles.reasonText, reason === option && styles.reasonTextActive]}>{option}</Text></TouchableOpacity>)}</View>

              <Text style={styles.section}>Notas</Text>
              <TextInput style={styles.notes} value={notes} onChangeText={setNotes} placeholder="Detalles de la devolución" placeholderTextColor="#777" multiline />

              <TouchableOpacity style={styles.exception} onPress={() => setPolicyException(v => !v)}>
                <View style={[styles.checkbox, policyException && styles.checkboxActive]}>{policyException ? <Text style={styles.check}>✓</Text> : null}</View>
                <Text style={styles.exceptionText}>Autorizar excepción a la política</Text>
              </TouchableOpacity>

              {history.length > 0 ? (
                <>
                  <Text
                    style={
                      styles.section
                    }
                  >
                    Devoluciones anteriores
                  </Text>

                  {history.map(
                    r => (
                      <View
                        key={
                          r.refundId
                        }
                        style={
                          styles.history
                        }
                      >
                        <View
                          style={
                            styles.historyHeader
                          }
                        >
                          <View
                            style={{
                              flex: 1,
                            }}
                          >
                            <Text
                              style={[
                                styles.historyTitle,
                                {
                                  color:
                                    brandPrimary,
                                },
                              ]}
                            >
                              DEV-
                              {String(
                                r.refundNumber,
                              ).padStart(
                                6,
                                '0',
                              )}
                            </Text>

                            <Text
                              style={
                                styles.muted
                              }
                            >
                              {r.reason}
                              {' · '}
                              {formatCurrency(
                                r.refundTotal,
                              )}
                            </Text>
                          </View>

                          <TouchableOpacity
                            style={[
                              styles.reprintRefundButton,
                              reprintingRefundId !==
                                null &&
                                styles.reprintRefundButtonDisabled,
                            ]}
                            disabled={
                              reprintingRefundId !==
                              null
                            }
                            onPress={() => {
                              void handleReprintRefund(
                                r,
                              );
                            }}
                          >
                            {reprintingRefundId ===
                            r.refundId ? (
                              <ActivityIndicator
                                size="small"
                                color="#111"
                              />
                            ) : (
                              <Text
                                style={
                                  styles.reprintRefundButtonText
                                }
                              >
                                🖨️ Reimprimir comprobante
                              </Text>
                            )}
                          </TouchableOpacity>
                        </View>
                      </View>
                    ),
                  )}
                </>
              ) : null}

              {errorMessage ? <Text style={styles.error}>{errorMessage}</Text> : null}

              <View style={styles.totalRow}><Text style={styles.totalLabel}>A devolver</Text><Text style={[
                    styles.totalValue,
                    {
                      color: brandPrimary,
                    },
                  ]}>{formatCurrency(refundTotal)}</Text></View>
              <TouchableOpacity style={[styles.submit, (selectedCount <= 0 || submitting) && styles.submitDisabled]} disabled={selectedCount <= 0 || submitting} onPress={() => void submit()}>
                {submitting ? <ActivityIndicator color="#111" /> : <Text style={styles.submitText}>Confirmar devolución</Text>}
              </TouchableOpacity>
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,.78)', justifyContent: 'center', padding: 16 },
  card: { width: '100%', maxWidth: 700, maxHeight: '92%', alignSelf: 'center', borderRadius: 18, backgroundColor: '#171717', borderWidth: 1, borderColor: '#333', overflow: 'hidden' },
  header: { padding: 18, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#333' },
  title: { color: '#fff', fontSize: 22, fontWeight: '900' },
  subtitle: { marginTop: 3, color: '#aaa', fontSize: 13 },
  close: { width: 38, height: 38, borderRadius: 19, backgroundColor: '#2a2a2a', alignItems: 'center', justifyContent: 'center' },
  closeText: { color: '#fff', fontSize: 18, fontWeight: '800' },
  loading: { padding: 32, alignItems: 'center', gap: 12 },
  content: { padding: 18, gap: 12 },
  summary: { padding: 14, borderRadius: 12, backgroundColor: '#222', gap: 4 },
  summaryText: { color: '#ddd', fontSize: 13, fontWeight: '600' },
  section: { marginTop: 6, color: '#fff', fontSize: 14, fontWeight: '900' },
  item: { padding: 14, borderRadius: 12, borderWidth: 1, borderColor: '#3a3a3a', backgroundColor: '#202020', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  disabled: { opacity: .55 },
  itemName: { color: '#fff', fontSize: 15, fontWeight: '800' },
  reward: { marginTop: 4, color: '#e4b84e', fontSize: 12, fontWeight: '700' },
  muted: { marginTop: 4, color: '#999', fontSize: 12 },
  qtyRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  qtyBtn: { width: 34, height: 34, borderRadius: 8, backgroundColor: '#333', alignItems: 'center', justifyContent: 'center' },
  qtyTxt: { color: '#fff', fontSize: 20, fontWeight: '800' },
  qty: { minWidth: 24, textAlign: 'center', color: '#fff', fontWeight: '900' },
  reasons: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  reasonBtn: { paddingHorizontal: 12, paddingVertical: 9, borderRadius: 10, borderWidth: 1, borderColor: '#444', backgroundColor: '#222' },
  reasonActive: { borderColor: '#e4b84e', backgroundColor: '#342c17' },
  reasonText: { color: '#bbb', fontSize: 12, fontWeight: '700' },
  reasonTextActive: { color: '#f0ca69' },
  notes: { minHeight: 84, borderWidth: 1, borderColor: '#444', borderRadius: 10, padding: 12, color: '#fff', textAlignVertical: 'top', backgroundColor: '#202020' },
  exception: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 6 },
  checkbox: { width: 22, height: 22, borderRadius: 5, borderWidth: 1, borderColor: '#666', alignItems: 'center', justifyContent: 'center' },
  checkboxActive: { backgroundColor: '#e4b84e', borderColor: '#e4b84e' },
  check: { color: '#111', fontWeight: '900' },
  exceptionText: { flex: 1, color: '#bbb', fontSize: 13, fontWeight: '700' },
  history: { padding: 12, borderRadius: 10, backgroundColor: '#202020', borderWidth: 1, borderColor: '#333' },
  historyHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  reprintRefundButton: { minHeight: 38, paddingHorizontal: 12, borderRadius: 9, backgroundColor: '#e4b84e', alignItems: 'center', justifyContent: 'center' },
  reprintRefundButtonDisabled: { opacity: .55 },
  reprintRefundButtonText: { color: '#111', fontSize: 11, fontWeight: '900' },
  historyTitle: { color: '#f0ca69', fontSize: 13, fontWeight: '900' },
  error: { padding: 10, borderRadius: 8, backgroundColor: '#3a1717', color: '#ffb0b0', fontWeight: '700' },
  totalRow: { marginTop: 8, paddingTop: 14, borderTopWidth: 1, borderTopColor: '#333', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  totalLabel: { color: '#ddd', fontSize: 16, fontWeight: '800' },
  totalValue: { color: '#f0ca69', fontSize: 22, fontWeight: '900' },
  submit: { marginTop: 4, minHeight: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: '#e4b84e' },
  submitDisabled: { opacity: .45 },
  submitText: { color: '#111', fontSize: 15, fontWeight: '900' },
});
