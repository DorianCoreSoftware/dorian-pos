import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Share,
  Platform,
  Linking,
} from 'react-native';

import { useBusiness } from '../../../context/BusinessContext';
import {
  EventRequestAdmin,
  EventRequestStatus,
  EventPaymentMethod,
  EventQuoteSnapshot,
  EventQuoteVersionSummary,
  addEventPaymentAdmin,
  createEventQuoteVersionAdmin,
  getEventQuoteVersionAdmin,
  getEventQuoteVersionsAdmin,
  getEventRequestsAdmin,
  updateEventRequestAdmin,
  EventQuotePortalLinkAdmin,
  createEventQuotePortalLinkAdmin,
  getEventQuotePortalLinksAdmin,
  revokeEventQuotePortalLinkAdmin,
  EventOperationStatus,
  createEventPosOrderAdmin,
  setEventOperationChecklistItemAdmin,
  updateEventOperationAdmin,
  markEventReminderHandledAdmin,
} from '../../../services/adminEventsService';
import { requestStyles as styles } from './AdminEventRequests.styles';
import {
  openEventQuoteEmail,
  openEventQuoteWhatsApp,
  shareEventQuotePdf,
} from '../../../services/eventQuotePdfService';

const STATUS_OPTIONS: Array<{
  value: EventRequestStatus;
  label: string;
}> = [
  { value: 'new', label: 'NUEVA' },
  { value: 'reviewing', label: 'EN REVISIÓN' },
  { value: 'quoted', label: 'COTIZADA' },
  { value: 'accepted', label: 'ACEPTADA' },
  { value: 'confirmed', label: 'CONFIRMADA' },
  { value: 'rejected', label: 'RECHAZADA' },
  { value: 'cancelled', label: 'CANCELADA' },
  { value: 'completed', label: 'REALIZADA' },
];

const STATUS_PROGRESS_OPTIONS: Array<{
  value: Extract<EventRequestStatus, 'new' | 'reviewing' | 'quoted' | 'accepted' | 'confirmed' | 'completed'>;
  label: string;
}> = [
  { value: 'new', label: 'NUEVA' },
  { value: 'reviewing', label: 'EN REVISIÓN' },
  { value: 'quoted', label: 'COTIZADA' },
  { value: 'accepted', label: 'ACEPTADA' },
  { value: 'confirmed', label: 'CONFIRMADA' },
  { value: 'completed', label: 'REALIZADA' },
];

const TERMINAL_STATUS_OPTIONS: Array<{
  value: Extract<EventRequestStatus, 'rejected' | 'cancelled'>;
  label: string;
}> = [
  { value: 'rejected', label: 'RECHAZADA' },
  { value: 'cancelled', label: 'CANCELADA' },
];

const PAYMENT_METHODS: Array<{ value: EventPaymentMethod; label: string }> = [
  { value: 'cash', label: 'EFECTIVO' },
  { value: 'card', label: 'TARJETA' },
  { value: 'transfer', label: 'TRANSFERENCIA' },
  { value: 'other', label: 'OTRO' },
];


const OPERATION_STATUS_OPTIONS: Array<{ value: EventOperationStatus; label: string }> = [
  { value: 'planned', label: 'PLANEADO' },
  { value: 'in_progress', label: 'EN OPERACIÓN' },
  { value: 'ready', label: 'LISTO' },
  { value: 'completed', label: 'FINALIZADO' },
];

function operationStatusLabel(value: EventOperationStatus): string {
  return OPERATION_STATUS_OPTIONS.find(item => item.value === value)?.label ?? value.toUpperCase();
}

function reminderTypeLabel(value: EventRequestAdmin['reminders'][number]['type']): string {
  switch (value) {
    case 'deposit_due': return 'ANTICIPO PENDIENTE';
    case 'event_upcoming': return 'EVENTO PRÓXIMO';
    case 'balance_pending': return 'SALDO PENDIENTE';
    case 'checklist_incomplete': return 'CHECKLIST INCOMPLETO';
    default: return value;
  }
}

function paymentMethodLabel(value: EventPaymentMethod): string {
  return PAYMENT_METHODS.find(item => item.value === value)?.label ?? value.toUpperCase();
}

function statusLabel(value: EventRequestStatus): string {
  return STATUS_OPTIONS.find(item => item.value === value)?.label ?? value.toUpperCase();
}

function formatMoney(value: number, currencyCode: string): string {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: currencyCode,
    minimumFractionDigits: 2,
  }).format(value);
}

function formatDate(value: string): string {
  if (!value) return 'Sin fecha';
  const parts = value.slice(0, 10).split('-');
  if (parts.length !== 3) return value;
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

function formatCreatedAt(value: string): string {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('es-MX');
}

interface Props {
  onChanged?: () => void;
}

export default function AdminEventRequests({ onChanged }: Props) {
  const { theme, business } = useBusiness();
  const currencyCode = business?.identity.currencyCode ?? 'MXN';
  const [requests, setRequests] = useState<EventRequestAdmin[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [filter, setFilter] = useState<EventRequestStatus | 'all'>('all');
  const [filterMenuVisible, setFilterMenuVisible] = useState(false);
  const [selected, setSelected] = useState<EventRequestAdmin | null>(null);
  const [status, setStatus] = useState<EventRequestStatus>('new');
  const [quotedTotal, setQuotedTotal] = useState('');
  const [adminNotes, setAdminNotes] = useState('');
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<EventPaymentMethod>('transfer');
  const [paymentReference, setPaymentReference] = useState('');
  const [paymentNotes, setPaymentNotes] = useState('');
  const [quoteVersions, setQuoteVersions] = useState<EventQuoteVersionSummary[]>([]);
  const [quoteProcessing, setQuoteProcessing] = useState(false);
  const [portalLinks, setPortalLinks] = useState<EventQuotePortalLinkAdmin[]>([]);
  const [operationStatus, setOperationStatus] = useState<EventOperationStatus>('planned');
  const [operationNotes, setOperationNotes] = useState('');
  const [operationProcessing, setOperationProcessing] = useState(false);

  const load = async (): Promise<void> => {
    try {
      setLoading(true);
      setRequests(await getEventRequestsAdmin());
    } catch (error) {
      Alert.alert('Error', error instanceof Error ? error.message : 'No se pudieron cargar las solicitudes.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const visible = useMemo(
    () =>
      filter === 'all'
        ? requests
        : requests.filter(item => item.status === filter),
    [requests, filter],
  );

  const loadQuoteVersions = async (requestId: string): Promise<void> => {
    try {
      setQuoteVersions(await getEventQuoteVersionsAdmin(requestId));
    } catch (error) {
      Alert.alert(
        'Cotizaciones',
        error instanceof Error ? error.message : 'No se pudo cargar el historial de cotizaciones.',
      );
    }
  };

  const loadPortalLinks = async (requestId: string): Promise<void> => {
    try {
      setPortalLinks(await getEventQuotePortalLinksAdmin(requestId));
    } catch (error) {
      Alert.alert(
        'Portal del cliente',
        error instanceof Error ? error.message : 'No se pudieron cargar los enlaces del portal.',
      );
    }
  };

  const openRequest = (item: EventRequestAdmin): void => {
    setSelected(item);
    setStatus(item.status);
    setQuotedTotal(item.quotedTotal === null ? '' : String(item.quotedTotal));
    setAdminNotes(item.adminNotes);
    setPaymentAmount('');
    setPaymentMethod('transfer');
    setPaymentReference('');
    setPaymentNotes('');
    setQuoteVersions([]);
    setPortalLinks([]);
    setOperationStatus(item.operationStatus);
    setOperationNotes(item.operationNotes);
    void loadQuoteVersions(item.id);
    void loadPortalLinks(item.id);
  };

  const close = (): void => {
    if (!processing) setSelected(null);
  };

  const save = async (): Promise<void> => {
    if (!selected) return;
    try {
      setProcessing(true);
      await updateEventRequestAdmin({
        id: selected.id,
        status,
        quotedTotal: quotedTotal.trim() === '' ? null : Number(quotedTotal),
        adminNotes,
      });
      setSelected(null);
      await load();
      onChanged?.();
    } catch (error) {
      Alert.alert('Error', error instanceof Error ? error.message : 'No se pudo actualizar la solicitud.');
    } finally {
      setProcessing(false);
    }
  };

  const registerPayment = async (): Promise<void> => {
    if (!selected) return;
    const amount = Number(paymentAmount);
    if (!Number.isFinite(amount) || amount <= 0) {
      Alert.alert('Pago inválido', 'Ingresa un monto mayor a cero.');
      return;
    }

    try {
      setProcessing(true);
      await addEventPaymentAdmin({
        requestId: selected.id,
        amount,
        method: paymentMethod,
        reference: paymentReference,
        notes: paymentNotes,
      });
      const updated = await getEventRequestsAdmin();
      setRequests(updated);
      const nextSelected = updated.find(item => item.id === selected.id) ?? null;
      setSelected(nextSelected);
      if (nextSelected) setStatus(nextSelected.status);
      setPaymentAmount('');
      setPaymentReference('');
      setPaymentNotes('');
      onChanged?.();
    } catch (error) {
      Alert.alert('Error', error instanceof Error ? error.message : 'No se pudo registrar el pago.');
    } finally {
      setProcessing(false);
    }
  };

  const refreshSelectedRequest = async (requestId: string): Promise<EventRequestAdmin | null> => {
    const updated = await getEventRequestsAdmin();
    setRequests(updated);
    const next = updated.find(item => item.id === requestId) ?? null;
    setSelected(next);
    if (next) {
      setStatus(next.status);
      setOperationStatus(next.operationStatus);
      setOperationNotes(next.operationNotes);
    }
    return next;
  };

  const saveOperation = async (): Promise<void> => {
    if (!selected) return;
    try {
      setOperationProcessing(true);
      await updateEventOperationAdmin({
        requestId: selected.id,
        status: operationStatus,
        notes: operationNotes,
      });
      await refreshSelectedRequest(selected.id);
      onChanged?.();
    } catch (error) {
      Alert.alert('Operación del evento', error instanceof Error ? error.message : 'No se pudo guardar la operación.');
    } finally {
      setOperationProcessing(false);
    }
  };

  const toggleOperationChecklist = async (itemId: string, isCompleted: boolean): Promise<void> => {
    if (!selected) return;
    try {
      setOperationProcessing(true);
      await setEventOperationChecklistItemAdmin(itemId, isCompleted);
      await refreshSelectedRequest(selected.id);
      onChanged?.();
    } catch (error) {
      Alert.alert('Checklist', error instanceof Error ? error.message : 'No se pudo actualizar el checklist.');
    } finally {
      setOperationProcessing(false);
    }
  };

  const createPosOrder = async (): Promise<void> => {
    if (!selected) return;
    try {
      setOperationProcessing(true);
      const result = await createEventPosOrderAdmin(selected.id);
      await refreshSelectedRequest(selected.id);
      onChanged?.();
      Alert.alert(
        result.created ? 'Pedido POS creado' : 'Pedido POS existente',
        `Pedido #${result.orderId.slice(-6).toUpperCase()} · saldo ${formatMoney(result.orderTotal, currencyCode)}. Ya está disponible en PEDIDOS.`,
      );
    } catch (error) {
      Alert.alert('Pedido POS', error instanceof Error ? error.message : 'No se pudo crear el pedido del evento.');
    } finally {
      setOperationProcessing(false);
    }
  };

  const markReminderHandled = async (reminderId: string): Promise<void> => {
    if (!selected) return;
    try {
      setOperationProcessing(true);
      await markEventReminderHandledAdmin(reminderId);
      await refreshSelectedRequest(selected.id);
    } catch (error) {
      Alert.alert('Recordatorio', error instanceof Error ? error.message : 'No se pudo actualizar el recordatorio.');
    } finally {
      setOperationProcessing(false);
    }
  };

  const openCustomerReminderWhatsApp = async (): Promise<void> => {
    if (!selected) return;
    const phone = selected.customerPhone.replace(/\D/g, '');
    if (!phone) {
      Alert.alert('WhatsApp', 'La solicitud no tiene teléfono del cliente.');
      return;
    }
    const balance = selected.remainingBalance > 0
      ? ` Saldo pendiente: ${formatMoney(selected.remainingBalance, currencyCode)}.`
      : '';
    const message = `Hola ${selected.customerName || 'cliente'}, te recordamos tu evento #${selected.folio} para el ${formatDate(selected.eventDate)}${selected.eventTime ? ` a las ${selected.eventTime.slice(0, 5)}` : ''}.${balance} Si necesitas hacer algún ajuste, contáctanos.`;
    await Linking.openURL(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`);
  };

  const openCustomerReminderEmail = async (): Promise<void> => {
    if (!selected) return;
    if (!selected.customerEmail.trim()) {
      Alert.alert('Correo', 'La solicitud no tiene correo del cliente.');
      return;
    }
    const subject = `Recordatorio de evento #${selected.folio}`;
    const balance = selected.remainingBalance > 0
      ? `\nSaldo pendiente: ${formatMoney(selected.remainingBalance, currencyCode)}.`
      : '';
    const body = `Hola ${selected.customerName || 'cliente'},\n\nTe recordamos tu evento #${selected.folio} para el ${formatDate(selected.eventDate)}${selected.eventTime ? ` a las ${selected.eventTime.slice(0, 5)}` : ''}.${balance}\n\nSi necesitas hacer algún ajuste, contáctanos.`;
    await Linking.openURL(`mailto:${encodeURIComponent(selected.customerEmail.trim())}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`);
  };

  const generateQuote = async (): Promise<void> => {
    if (!selected) return;

    const currentQuotedTotal = quotedTotal.trim() === '' ? null : Number(quotedTotal);
    const hasUnsavedChanges =
      status !== selected.status ||
      currentQuotedTotal !== selected.quotedTotal ||
      adminNotes.trim() !== selected.adminNotes.trim();

    if (hasUnsavedChanges) {
      Alert.alert(
        'Guarda los cambios',
        'Guarda primero el estado, total cotizado o notas antes de emitir una nueva versión de la cotización.',
      );
      return;
    }

    try {
      setQuoteProcessing(true);
      const quote = await createEventQuoteVersionAdmin({
        requestId: selected.id,
        businessName: business?.identity.businessName ?? 'Dorian POS',
        currencyCode,
      });
      await shareEventQuotePdf(quote);
      await loadQuoteVersions(selected.id);
      await loadPortalLinks(selected.id);
    } catch (error) {
      Alert.alert(
        'Cotización',
        error instanceof Error ? error.message : 'No se pudo generar la cotización.',
      );
    } finally {
      setQuoteProcessing(false);
    }
  };

  const getLatestQuote = async (): Promise<EventQuoteSnapshot | null> => {
    const latest = quoteVersions[0];
    if (!latest) {
      Alert.alert('Cotización', 'Primero genera una cotización para crear una versión histórica.');
      return null;
    }
    return getEventQuoteVersionAdmin(latest.id);
  };

  const shareHistoricalQuote = async (versionId: string): Promise<void> => {
    try {
      setQuoteProcessing(true);
      const quote = await getEventQuoteVersionAdmin(versionId);
      await shareEventQuotePdf(quote);
    } catch (error) {
      Alert.alert('Cotización', error instanceof Error ? error.message : 'No se pudo compartir la cotización.');
    } finally {
      setQuoteProcessing(false);
    }
  };

  const shareLatestByWhatsApp = async (): Promise<void> => {
    try {
      setQuoteProcessing(true);
      const quote = await getLatestQuote();
      if (quote) await openEventQuoteWhatsApp(quote);
    } catch (error) {
      Alert.alert('WhatsApp', error instanceof Error ? error.message : 'No se pudo abrir WhatsApp.');
    } finally {
      setQuoteProcessing(false);
    }
  };

  const shareLatestByEmail = async (): Promise<void> => {
    try {
      setQuoteProcessing(true);
      const quote = await getLatestQuote();
      if (quote) await openEventQuoteEmail(quote);
    } catch (error) {
      Alert.alert('Correo', error instanceof Error ? error.message : 'No se pudo abrir el correo.');
    } finally {
      setQuoteProcessing(false);
    }
  };


  const getActivePortalLink = (quoteVersionId: string): EventQuotePortalLinkAdmin | undefined =>
    portalLinks.find(link => link.quoteVersionId === quoteVersionId && link.isActive);

  const sharePortalLink = async (
    quoteVersionId: string,
    regenerate = false,
  ): Promise<void> => {
    if (!selected) return;

    try {
      setQuoteProcessing(true);
      const link = await createEventQuotePortalLinkAdmin({
        quoteVersionId,
        expiresDays: 30,
        regenerate,
      });

      const shareTitle = `Cotización evento #${selected.folio}`;
      const shareMessage = `Consulta y responde tu cotización de evento aquí:\n${link.url}`;

      if (Platform.OS === 'web') {
        const browser = globalThis as typeof globalThis & {
          navigator?: {
            share?: (data: { title?: string; text?: string; url?: string }) => Promise<void>;
            clipboard?: { writeText: (value: string) => Promise<void> };
          };
        };

        if (browser.navigator?.share) {
          await browser.navigator.share({
            title: shareTitle,
            text: shareMessage,
            url: link.url,
          });
        } else if (browser.navigator?.clipboard) {
          await browser.navigator.clipboard.writeText(link.url);
          Alert.alert('Enlace copiado', 'El enlace del portal quedó copiado al portapapeles.');
        } else {
          Alert.alert('Enlace del cliente', link.url);
        }
      } else {
        await Share.share({
          title: shareTitle,
          message: shareMessage,
          url: link.url,
        });
      }

      await loadPortalLinks(selected.id);
    } catch (error) {
      Alert.alert(
        'Portal del cliente',
        error instanceof Error ? error.message : 'No se pudo compartir el enlace del cliente.',
      );
    } finally {
      setQuoteProcessing(false);
    }
  };

  const revokePortalLink = async (linkId: string): Promise<void> => {
    if (!selected) return;
    try {
      setQuoteProcessing(true);
      await revokeEventQuotePortalLinkAdmin(linkId);
      await loadPortalLinks(selected.id);
      Alert.alert('Portal del cliente', 'El enlace fue revocado.');
    } catch (error) {
      Alert.alert(
        'Portal del cliente',
        error instanceof Error ? error.message : 'No se pudo revocar el enlace.',
      );
    } finally {
      setQuoteProcessing(false);
    }
  };


  if (loading) {
    return (
      <View style={styles.empty}>
        <ActivityIndicator color={theme.primary} />
        <Text style={[styles.emptyText, { color: theme.textMuted, marginTop: 10 }]}>Cargando solicitudes...</Text>
      </View>
    );
  }

  return (
    <>
      <View style={styles.header}>
        <View style={styles.headerText}>
          <Text style={[styles.title, { color: theme.text }]}>Solicitudes de eventos</Text>
          <Text style={[styles.subtitle, { color: theme.textMuted }]}>Revisa cotizaciones enviadas desde la web y actualiza su seguimiento.</Text>
        </View>
        <TouchableOpacity
          style={[styles.refreshButton, { borderColor: theme.border, backgroundColor: theme.surfaceAlt }]}
          onPress={() => { void load(); }}
        >
          <Text style={[styles.refreshText, { color: theme.text }]}>ACTUALIZAR</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.filterRow}>
        <Text style={[styles.filterLabel, { color: theme.textMuted }]}>Estado</Text>
        <TouchableOpacity
          style={[styles.filterSelect, { borderColor: theme.border, backgroundColor: theme.surface }]}
          onPress={() => setFilterMenuVisible(true)}
          activeOpacity={0.8}
        >
          <Text style={[styles.filterSelectText, { color: theme.text }]} numberOfLines={1}>
            {filter === 'all'
              ? `TODAS (${requests.length})`
              : `${statusLabel(filter)} (${requests.filter(item => item.status === filter).length})`}
          </Text>
          <Text style={[styles.filterChevron, { color: theme.primary }]}>⌄</Text>
        </TouchableOpacity>
      </View>

      <Modal
        visible={filterMenuVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setFilterMenuVisible(false)}
      >
        <TouchableOpacity
          style={styles.filterModalBackdrop}
          activeOpacity={1}
          onPress={() => setFilterMenuVisible(false)}
        >
          <View style={[styles.filterModalCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <Text style={[styles.filterModalTitle, { color: theme.text }]}>Filtrar por estado</Text>

            {[
              { value: 'all' as const, label: 'TODAS', count: requests.length },
              ...STATUS_OPTIONS.map(option => ({
                value: option.value,
                label: option.label,
                count: requests.filter(item => item.status === option.value).length,
              })),
            ].map(option => {
              const selectedOption = filter === option.value;

              return (
                <TouchableOpacity
                  key={option.value}
                  style={[
                    styles.filterOption,
                    {
                      borderColor: selectedOption ? theme.primary : theme.border,
                      backgroundColor: selectedOption ? theme.surfaceAlt : theme.surface,
                    },
                  ]}
                  onPress={() => {
                    setFilter(option.value);
                    setFilterMenuVisible(false);
                  }}
                >
                  <Text
                    style={[
                      styles.filterOptionText,
                      { color: selectedOption ? theme.primary : theme.text },
                    ]}
                  >
                    {option.label}
                  </Text>
                  <Text
                    style={[
                      styles.filterOptionCount,
                      { color: selectedOption ? theme.primary : theme.textMuted },
                    ]}
                  >
                    {option.count}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </TouchableOpacity>
      </Modal>

      {visible.length === 0 ? (
        <View style={[styles.empty, { borderColor: theme.border, backgroundColor: theme.surface }]}>
          <Text style={[styles.emptyText, { color: theme.textMuted }]}>No hay solicitudes con este estado.</Text>
        </View>
      ) : (
        visible.map(item => (
          <View key={item.id} style={[styles.card, { borderColor: theme.border, backgroundColor: theme.surface }]}>
            <View style={styles.cardTop}>
              <View style={styles.cardInfo}>
                <Text style={[styles.folio, { color: theme.primary }]}>Folio #{item.folio}</Text>
                <Text style={[styles.name, { color: theme.text }]}>{item.customerName}</Text>
                <Text style={[styles.meta, { color: theme.textMuted }]}>
                  {item.eventTypeName || 'Evento'} · {item.packageName || 'Paquete'} · {formatDate(item.eventDate)}{item.eventTime ? ` ${item.eventTime.slice(0, 5)}` : ''} · {item.guestCount} personas
                </Text>
                <Text style={[styles.meta, { color: theme.textMuted }]}>Recibida: {formatCreatedAt(item.createdAt)}</Text>
              </View>
              <View style={[styles.badge, { backgroundColor: theme.surfaceAlt }]}>
                <Text style={[styles.badgeText, { color: theme.primary }]}>{statusLabel(item.status)}</Text>
              </View>
            </View>
            <View style={styles.cardBottom}>
              <View>
                <Text style={[styles.amount, { color: theme.text }]}>{formatMoney(item.quotedTotal ?? item.estimatedTotal, currencyCode)}</Text>
                {item.requiredDepositAmount > 0 ? (
                  <Text style={[styles.paymentMeta, { color: item.paymentStatus === 'paid' ? theme.primary : theme.textMuted }]}>
                    Anticipo: {formatMoney(item.paidAmount, currencyCode)} / {formatMoney(item.requiredDepositAmount, currencyCode)}
                  </Text>
                ) : null}
              </View>
              <TouchableOpacity
                style={[styles.detailButton, { borderColor: theme.border, backgroundColor: theme.surfaceAlt }]}
                onPress={() => openRequest(item)}
              >
                <Text style={[styles.detailText, { color: theme.text }]}>VER / EDITAR</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))
      )}

      <Modal visible={!!selected} transparent animationType="fade" onRequestClose={close}>
        <View style={styles.modalBackdrop}>
          {selected ? (
            <View style={[styles.modalCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, { color: theme.text }]}>Evento #{selected.folio}</Text>
                <TouchableOpacity style={styles.close} onPress={close}>
                  <Text style={[styles.closeText, { color: theme.textMuted }]}>✕</Text>
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.modalScroll} contentContainerStyle={styles.modalContent} keyboardShouldPersistTaps="handled">
                <View style={[styles.section, { borderTopColor: theme.border }]}>
                  <Text style={[styles.sectionTitle, { color: theme.text }]}>Cliente y evento</Text>
                  <Text style={[styles.infoText, { color: theme.textMuted }]}>Nombre: {selected.customerName}</Text>
                  <Text style={[styles.infoText, { color: theme.textMuted }]}>Teléfono: {selected.customerPhone || '—'}</Text>
                  <Text style={[styles.infoText, { color: theme.textMuted }]}>Correo: {selected.customerEmail || '—'}</Text>
                  <Text style={[styles.infoText, { color: theme.textMuted }]}>Fecha: {formatDate(selected.eventDate)}{selected.eventTime ? ` · ${selected.eventTime.slice(0, 5)}` : ''}</Text>
                  <Text style={[styles.infoText, { color: theme.textMuted }]}>Tipo: {selected.eventTypeName || '—'}</Text>
                  <Text style={[styles.infoText, { color: theme.textMuted }]}>Paquete: {selected.packageName || '—'}</Text>
                  <Text style={[styles.infoText, { color: theme.textMuted }]}>Personas: {selected.guestCount}</Text>
                  {selected.customerNotes ? <Text style={[styles.infoText, { color: theme.textMuted }]}>Comentarios: {selected.customerNotes}</Text> : null}
                </View>

                <View style={[styles.section, { borderTopColor: theme.border }]}>
                  <Text style={[styles.sectionTitle, { color: theme.text }]}>Desglose original</Text>
                  <View style={styles.summaryRow}>
                    <Text style={[styles.summaryLabel, { color: theme.textMuted }]}>{selected.packageName || 'Paquete'}</Text>
                    <Text style={[styles.summaryValue, { color: theme.text }]}>{formatMoney(selected.packageBasePrice, currencyCode)}</Text>
                  </View>
                  {selected.additionalGuestCount > 0 ? (
                    <View style={styles.summaryRow}>
                      <Text style={[styles.summaryLabel, { color: theme.textMuted }]}>{selected.additionalGuestCount} personas adicionales × {formatMoney(selected.packageExtraGuestPrice, currencyCode)}</Text>
                      <Text style={[styles.summaryValue, { color: theme.text }]}>{formatMoney(selected.additionalGuestSubtotal, currencyCode)}</Text>
                    </View>
                  ) : null}
                  {selected.extras.map(extra => (
                    <View key={extra.id} style={styles.summaryRow}>
                      <Text style={[styles.summaryLabel, { color: theme.textMuted }]}>{extra.extraName}{extra.quantity > 1 ? ` × ${extra.quantity}` : ''}</Text>
                      <Text style={[styles.summaryValue, { color: theme.text }]}>{formatMoney(extra.subtotal, currencyCode)}</Text>
                    </View>
                  ))}
                  <View style={styles.summaryRow}>
                    <Text style={[styles.summaryLabel, { color: theme.text, fontWeight: '900' }]}>Total estimado</Text>
                    <Text style={[styles.summaryValue, { color: theme.primary }]}>{formatMoney(selected.estimatedTotal, currencyCode)}</Text>
                  </View>
                </View>

                <View style={[styles.section, { borderTopColor: theme.border }]}>
                  <Text style={[styles.sectionTitle, { color: theme.text }]}>Cotización formal</Text>
                  <Text style={[styles.infoText, { color: theme.textMuted }]}>
                    Cada PDF genera una versión histórica que no cambia aunque después edites precios o condiciones. Desde cada versión puedes crear un enlace seguro para que el cliente la consulte y responda.
                  </Text>

                  <View style={styles.quoteActionWrap}>
                    <TouchableOpacity
                      style={[styles.quotePrimaryButton, { backgroundColor: theme.primary }, quoteProcessing && styles.disabled]}
                      disabled={quoteProcessing}
                      onPress={() => { void generateQuote(); }}
                    >
                      <Text style={[styles.buttonText, { color: theme.onPrimary }]}>
                        {quoteProcessing ? 'Procesando...' : 'GENERAR / COMPARTIR PDF'}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.quoteSecondaryButton, { borderColor: theme.border, backgroundColor: theme.surfaceAlt }, quoteProcessing && styles.disabled]}
                      disabled={quoteProcessing}
                      onPress={() => { void shareLatestByWhatsApp(); }}
                    >
                      <Text style={[styles.buttonText, { color: theme.text }]}>WHATSAPP</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.quoteSecondaryButton, { borderColor: theme.border, backgroundColor: theme.surfaceAlt }, quoteProcessing && styles.disabled]}
                      disabled={quoteProcessing}
                      onPress={() => { void shareLatestByEmail(); }}
                    >
                      <Text style={[styles.buttonText, { color: theme.text }]}>CORREO</Text>
                    </TouchableOpacity>
                  </View>

                  {quoteVersions.length > 0 ? (
                    <View style={styles.quoteHistory}>
                      <Text style={[styles.label, { color: theme.textMuted }]}>Versiones emitidas</Text>
                      {quoteVersions.map(version => (
                        <View key={version.id} style={[styles.quoteHistoryRow, { borderColor: theme.border }]}>
                          <View style={styles.quoteHistoryInfo}>
                            <Text style={[styles.quoteHistoryTitle, { color: theme.text }]}>Versión {version.version}</Text>
                            <Text style={[styles.quoteHistoryMeta, { color: theme.textMuted }]}>
                              {formatCreatedAt(version.createdAt)} · {formatMoney(version.effectiveTotal, currencyCode)}
                            </Text>
                          </View>
                          <View style={styles.quoteHistoryActions}>
                            <TouchableOpacity
                              style={[styles.quoteHistoryButton, { borderColor: theme.border, backgroundColor: theme.surfaceAlt }]}
                              disabled={quoteProcessing}
                              onPress={() => { void shareHistoricalQuote(version.id); }}
                            >
                              <Text style={[styles.quoteHistoryButtonText, { color: theme.text }]}>PDF</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                              style={[styles.quoteHistoryButton, { borderColor: theme.primary, backgroundColor: theme.surfaceAlt }]}
                              disabled={quoteProcessing}
                              onPress={() => { void sharePortalLink(version.id, false); }}
                            >
                              <Text style={[styles.quoteHistoryButtonText, { color: theme.primary }]}>
                                {getActivePortalLink(version.id) ? 'COMPARTIR LINK' : 'CREAR LINK'}
                              </Text>
                            </TouchableOpacity>
                            {getActivePortalLink(version.id) ? (
                              <>
                                <TouchableOpacity
                                  style={[styles.quoteHistoryButton, { borderColor: theme.border, backgroundColor: theme.surfaceAlt }]}
                                  disabled={quoteProcessing}
                                  onPress={() => { void sharePortalLink(version.id, true); }}
                                >
                                  <Text style={[styles.quoteHistoryButtonText, { color: theme.text }]}>REGENERAR</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                  style={[styles.quoteHistoryButton, { borderColor: theme.border, backgroundColor: theme.surface }]}
                                  disabled={quoteProcessing}
                                  onPress={() => { void revokePortalLink(getActivePortalLink(version.id)!.id); }}
                                >
                                  <Text style={[styles.quoteHistoryButtonText, { color: theme.textMuted }]}>REVOCAR</Text>
                                </TouchableOpacity>
                              </>
                            ) : null}
                          </View>
                        </View>
                      ))}
                    </View>
                  ) : (
                    <Text style={[styles.infoText, { color: theme.textMuted, marginTop: 10 }]}>
                      Aún no se ha emitido ninguna cotización formal.
                    </Text>
                  )}
                </View>

                <View style={[styles.section, { borderTopColor: theme.border }]}>
                  <Text style={[styles.sectionTitle, { color: theme.text }]}>Anticipo y pagos</Text>
                  <View style={styles.paymentSummaryGrid}>
                    <View style={[styles.paymentSummaryCard, { borderColor: theme.border, backgroundColor: theme.surfaceAlt }]}>
                      <Text style={[styles.paymentSummaryLabel, { color: theme.textMuted }]}>ANTICIPO REQUERIDO</Text>
                      <Text style={[styles.paymentSummaryValue, { color: theme.text }]}>{formatMoney(selected.requiredDepositAmount, currencyCode)}</Text>
                    </View>
                    <View style={[styles.paymentSummaryCard, { borderColor: theme.border, backgroundColor: theme.surfaceAlt }]}>
                      <Text style={[styles.paymentSummaryLabel, { color: theme.textMuted }]}>PAGADO</Text>
                      <Text style={[styles.paymentSummaryValue, { color: theme.primary }]}>{formatMoney(selected.paidAmount, currencyCode)}</Text>
                    </View>
                    <View style={[styles.paymentSummaryCard, { borderColor: theme.border, backgroundColor: theme.surfaceAlt }]}>
                      <Text style={[styles.paymentSummaryLabel, { color: theme.textMuted }]}>PENDIENTE</Text>
                      <Text style={[styles.paymentSummaryValue, { color: theme.text }]}>{formatMoney(selected.pendingDepositAmount, currencyCode)}</Text>
                    </View>
                  </View>
                  <Text style={[styles.infoText, { color: theme.textMuted }]}>Estado de pago: {selected.paymentStatus === 'not_required' ? 'No requerido' : selected.paymentStatus === 'pending' ? 'Pendiente' : selected.paymentStatus === 'partial' ? 'Parcial' : 'Pagado'}</Text>
                  {selected.paymentDueDate ? <Text style={[styles.infoText, { color: theme.textMuted }]}>Fecha límite: {formatDate(selected.paymentDueDate)}</Text> : null}
                  {selected.confirmedAt ? <Text style={[styles.infoText, { color: theme.primary }]}>Confirmado: {formatCreatedAt(selected.confirmedAt)}</Text> : null}

                  {selected.payments.length > 0 ? (
                    <View style={styles.paymentHistory}>
                      {selected.payments.map(payment => (
                        <View key={payment.id} style={[styles.paymentHistoryRow, { borderColor: theme.border }]}>
                          <View style={{ flex: 1, minWidth: 0 }}>
                            <Text style={[styles.paymentHistoryAmount, { color: theme.text }]}>{formatMoney(payment.amount, currencyCode)} · {paymentMethodLabel(payment.method)}</Text>
                            <Text style={[styles.paymentHistoryMeta, { color: theme.textMuted }]}>{formatCreatedAt(payment.paidAt)}{payment.reference ? ` · Ref: ${payment.reference}` : ''}</Text>
                            {payment.notes ? <Text style={[styles.paymentHistoryMeta, { color: theme.textMuted }]}>{payment.notes}</Text> : null}
                          </View>
                        </View>
                      ))}
                    </View>
                  ) : null}

                  {(selected.status === 'accepted' || selected.status === 'confirmed') && selected.requiredDepositAmount > selected.paidAmount ? (
                    <View style={styles.paymentForm}>
                      <Text style={[styles.label, { color: theme.textMuted }]}>Registrar pago</Text>
                      <TextInput
                        value={paymentAmount}
                        onChangeText={setPaymentAmount}
                        keyboardType="decimal-pad"
                        placeholder={String(selected.pendingDepositAmount)}
                        placeholderTextColor={theme.textMuted}
                        style={[styles.input, { color: theme.text, borderColor: theme.border, backgroundColor: theme.surfaceAlt }]}
                      />
                      <View style={styles.paymentMethodWrap}>
                        {PAYMENT_METHODS.map(option => (
                          <TouchableOpacity
                            key={option.value}
                            style={[styles.paymentMethodChoice, { borderColor: paymentMethod === option.value ? theme.primary : theme.border, backgroundColor: paymentMethod === option.value ? theme.surfaceAlt : theme.surface }]}
                            onPress={() => setPaymentMethod(option.value)}
                          >
                            <Text style={[styles.paymentMethodText, { color: paymentMethod === option.value ? theme.primary : theme.textMuted }]}>{option.label}</Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                      <TextInput
                        value={paymentReference}
                        onChangeText={setPaymentReference}
                        placeholder="Referencia (opcional)"
                        placeholderTextColor={theme.textMuted}
                        style={[styles.input, { color: theme.text, borderColor: theme.border, backgroundColor: theme.surfaceAlt }]}
                      />
                      <TextInput
                        value={paymentNotes}
                        onChangeText={setPaymentNotes}
                        placeholder="Nota del pago (opcional)"
                        placeholderTextColor={theme.textMuted}
                        style={[styles.input, { color: theme.text, borderColor: theme.border, backgroundColor: theme.surfaceAlt, marginTop: 8 }]}
                      />
                      <TouchableOpacity
                        style={[styles.registerPaymentButton, { backgroundColor: theme.primary }, processing && styles.disabled]}
                        disabled={processing}
                        onPress={() => { void registerPayment(); }}
                      >
                        <Text style={[styles.buttonText, { color: theme.onPrimary }]}>{processing ? 'Registrando...' : 'Registrar pago'}</Text>
                      </TouchableOpacity>
                    </View>
                  ) : null}
                </View>

                <View style={[styles.section, { borderTopColor: theme.border }]}>
                  <Text style={[styles.sectionTitle, { color: theme.text }]}>Recordatorios y seguimiento</Text>
                  <Text style={[styles.infoText, { color: theme.textMuted }]}>
                    Los avisos internos se generan automáticamente. Para el cliente puedes abrir un mensaje prellenado por WhatsApp o correo.
                  </Text>
                  <View style={styles.reminderCustomerActions}>
                    <TouchableOpacity
                      style={[styles.reminderActionButton, { borderColor: theme.border, backgroundColor: theme.surfaceAlt }]}
                      onPress={() => { void openCustomerReminderWhatsApp(); }}
                    >
                      <Text style={[styles.buttonText, { color: theme.text }]}>WHATSAPP CLIENTE</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.reminderActionButton, { borderColor: theme.border, backgroundColor: theme.surfaceAlt }]}
                      onPress={() => { void openCustomerReminderEmail(); }}
                    >
                      <Text style={[styles.buttonText, { color: theme.text }]}>CORREO CLIENTE</Text>
                    </TouchableOpacity>
                  </View>

                  {selected.reminders.length > 0 ? (
                    <View style={styles.reminderList}>
                      {selected.reminders.slice(0, 10).map(reminder => (
                        <View key={reminder.id} style={[styles.reminderRow, { borderColor: theme.border, backgroundColor: theme.surfaceAlt }]}>
                          <View style={styles.reminderInfo}>
                            <Text style={[styles.reminderTitle, { color: theme.text }]}>{reminderTypeLabel(reminder.type)}</Text>
                            <Text style={[styles.reminderBody, { color: theme.textMuted }]}>{reminder.body}</Text>
                            <Text style={[styles.reminderMeta, { color: theme.textMuted }]}>
                              {reminder.sentAt ? `Enviado: ${formatCreatedAt(reminder.sentAt)}` : `Programado: ${formatCreatedAt(reminder.scheduledFor)}`}
                              {reminder.pushError ? ` · Error: ${reminder.pushError}` : ''}
                            </Text>
                          </View>
                          {reminder.handledAt ? (
                            <Text style={[styles.reminderHandled, { color: theme.primary }]}>ATENDIDO</Text>
                          ) : (
                            <TouchableOpacity
                              style={[styles.reminderHandleButton, { borderColor: theme.primary }]}
                              disabled={operationProcessing}
                              onPress={() => { void markReminderHandled(reminder.id); }}
                            >
                              <Text style={[styles.reminderHandleText, { color: theme.primary }]}>MARCAR ATENDIDO</Text>
                            </TouchableOpacity>
                          )}
                        </View>
                      ))}
                    </View>
                  ) : (
                    <Text style={[styles.infoText, { color: theme.textMuted, marginTop: 10 }]}>Aún no hay recordatorios generados para este evento.</Text>
                  )}
                </View>

                <View style={[styles.section, { borderTopColor: theme.border }]}>
                  <Text style={[styles.sectionTitle, { color: theme.text }]}>Operación del evento</Text>
                  {selected.status === 'confirmed' || selected.status === 'completed' ? (
                    <>
                      <Text style={[styles.infoText, { color: theme.textMuted }]}>
                        Controla la preparación del evento y crea el pedido POS únicamente cuando deba entrar a operación. Los anticipos no se vuelven a cobrar.
                      </Text>

                      <View style={styles.operationStatusWrap}>
                        {OPERATION_STATUS_OPTIONS.map(option => (
                          <TouchableOpacity
                            key={option.value}
                            style={[styles.operationStatusChoice, { borderColor: operationStatus === option.value ? theme.primary : theme.border, backgroundColor: operationStatus === option.value ? theme.surfaceAlt : theme.surface }]}
                            disabled={operationProcessing}
                            onPress={() => setOperationStatus(option.value)}
                          >
                            <Text style={[styles.operationStatusText, { color: operationStatus === option.value ? theme.primary : theme.textMuted }]}>{option.label}</Text>
                          </TouchableOpacity>
                        ))}
                      </View>

                      <Text style={[styles.label, { color: theme.textMuted }]}>Checklist operativo</Text>
                      <View style={styles.operationChecklist}>
                        {selected.operationChecklist.map(item => (
                          <TouchableOpacity
                            key={item.id}
                            style={[styles.operationChecklistRow, { borderColor: theme.border, backgroundColor: theme.surfaceAlt }]}
                            disabled={operationProcessing}
                            onPress={() => { void toggleOperationChecklist(item.id, !item.isCompleted); }}
                          >
                            <View style={[styles.operationCheck, { borderColor: item.isCompleted ? theme.primary : theme.border, backgroundColor: item.isCompleted ? theme.primary : theme.surface }]}>
                              <Text style={[styles.operationCheckText, { color: item.isCompleted ? theme.onPrimary : theme.textMuted }]}>{item.isCompleted ? '✓' : ''}</Text>
                            </View>
                            <View style={{ flex: 1 }}>
                              <Text style={[styles.operationChecklistLabel, { color: theme.text }]}>{item.label}</Text>
                              {item.completedAt ? <Text style={[styles.operationHistoryMeta, { color: theme.textMuted }]}>Completado: {formatCreatedAt(item.completedAt)}</Text> : null}
                            </View>
                          </TouchableOpacity>
                        ))}
                      </View>

                      <Text style={[styles.label, { color: theme.textMuted }]}>Notas de operación</Text>
                      <TextInput
                        value={operationNotes}
                        onChangeText={setOperationNotes}
                        multiline
                        placeholder="Indicaciones, montaje, tiempos, responsables..."
                        placeholderTextColor={theme.textMuted}
                        style={[styles.input, styles.notes, { color: theme.text, borderColor: theme.border, backgroundColor: theme.surfaceAlt }]}
                      />

                      <View style={[styles.operationOrderCard, { borderColor: theme.border, backgroundColor: theme.surfaceAlt }]}>
                        <Text style={[styles.operationOrderTitle, { color: theme.text }]}>Pedido POS</Text>
                        <Text style={[styles.infoText, { color: theme.textMuted }]}>Saldo actual del evento: {formatMoney(selected.remainingBalance, currencyCode)}</Text>
                        {selected.posOrderId ? (
                          <>
                            <Text style={[styles.infoText, { color: theme.primary }]}>Pedido #{selected.posOrderId.slice(-6).toUpperCase()} · {selected.posOrderStatus ? selected.posOrderStatus.toUpperCase() : 'CREADO'}</Text>
                            <Text style={[styles.infoText, { color: theme.textMuted }]}>Total enviado a POS: {formatMoney(selected.posOrderTotal ?? 0, currencyCode)}</Text>
                            <Text style={[styles.infoText, { color: theme.textMuted }]}>Disponible en la pestaña PEDIDOS.</Text>
                          </>
                        ) : (
                          <TouchableOpacity
                            style={[styles.operationOrderButton, { backgroundColor: theme.primary }, operationProcessing && styles.disabled]}
                            disabled={operationProcessing || selected.status !== 'confirmed'}
                            onPress={() => { void createPosOrder(); }}
                          >
                            <Text style={[styles.buttonText, { color: theme.onPrimary }]}>{operationProcessing ? 'Procesando...' : 'CREAR PEDIDO POS'}</Text>
                          </TouchableOpacity>
                        )}
                      </View>

                      <TouchableOpacity
                        style={[styles.operationSaveButton, { borderColor: theme.primary }, operationProcessing && styles.disabled]}
                        disabled={operationProcessing}
                        onPress={() => { void saveOperation(); }}
                      >
                        <Text style={[styles.buttonText, { color: theme.primary }]}>{operationProcessing ? 'Guardando...' : 'GUARDAR OPERACIÓN'}</Text>
                      </TouchableOpacity>

                      {selected.operationHistory.length > 0 ? (
                        <View style={styles.operationHistory}>
                          <Text style={[styles.label, { color: theme.textMuted }]}>Actividad reciente</Text>
                          {selected.operationHistory.slice(0, 6).map(item => (
                            <View key={item.id} style={[styles.operationHistoryRow, { borderColor: theme.border }]}>
                              <Text style={[styles.operationHistoryTitle, { color: theme.text }]}>{item.action.replace(/_/g, ' ').toUpperCase()}</Text>
                              <Text style={[styles.operationHistoryMeta, { color: theme.textMuted }]}>{formatCreatedAt(item.createdAt)}</Text>
                            </View>
                          ))}
                        </View>
                      ) : null}
                    </>
                  ) : (
                    <Text style={[styles.infoText, { color: theme.textMuted }]}>La operación se habilita cuando la solicitud queda CONFIRMADA.</Text>
                  )}
                </View>

                <View style={[styles.section, { borderTopColor: theme.border }]}>
                  <Text style={[styles.sectionTitle, { color: theme.text }]}>Estado</Text>
                  <Text style={[styles.infoText, { color: theme.textMuted }]}>
                    Seguimiento principal del evento. Puedes tocar una etapa para actualizarla manualmente cuando corresponda.
                  </Text>

                  <View style={styles.statusProgress}>
                    {STATUS_PROGRESS_OPTIONS.map((option, index) => {
                      const currentIndex = STATUS_PROGRESS_OPTIONS.findIndex(item => item.value === status);
                      const isTerminal = status === 'rejected' || status === 'cancelled';
                      const isCurrent = status === option.value;
                      const isReached = !isTerminal && currentIndex >= index;

                      return (
                        <React.Fragment key={option.value}>
                          <TouchableOpacity
                            style={styles.statusProgressStep}
                            onPress={() => setStatus(option.value)}
                            activeOpacity={0.8}
                          >
                            <View
                              style={[
                                styles.statusProgressDot,
                                {
                                  borderColor: isReached ? theme.primary : theme.border,
                                  backgroundColor: isReached ? theme.primary : theme.surface,
                                },
                              ]}
                            >
                              <Text style={[styles.statusProgressDotText, { color: isReached ? theme.onPrimary : theme.textMuted }]}>
                                {isReached ? '✓' : index + 1}
                              </Text>
                            </View>
                            <Text
                              style={[
                                styles.statusProgressLabel,
                                { color: isCurrent ? theme.primary : isReached ? theme.text : theme.textMuted },
                              ]}
                              numberOfLines={2}
                            >
                              {option.label}
                            </Text>
                          </TouchableOpacity>

                          {index < STATUS_PROGRESS_OPTIONS.length - 1 ? (
                            <View
                              style={[
                                styles.statusProgressConnector,
                                { backgroundColor: !isTerminal && currentIndex > index ? theme.primary : theme.border },
                              ]}
                            />
                          ) : null}
                        </React.Fragment>
                      );
                    })}
                  </View>

                  <View style={styles.statusTerminalWrap}>
                    <Text style={[styles.statusTerminalLabel, { color: theme.textMuted }]}>Salidas alternativas</Text>
                    <View style={styles.statusTerminalActions}>
                      {TERMINAL_STATUS_OPTIONS.map(option => (
                        <TouchableOpacity
                          key={option.value}
                          style={[
                            styles.statusTerminalChoice,
                            {
                              borderColor: status === option.value ? theme.primary : theme.border,
                              backgroundColor: status === option.value ? theme.surfaceAlt : theme.surface,
                            },
                          ]}
                          onPress={() => setStatus(option.value)}
                        >
                          <Text style={[styles.statusChoiceText, { color: status === option.value ? theme.primary : theme.textMuted }]}>
                            {option.label}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>

                  <Text style={[styles.label, { color: theme.textMuted }]}>Total cotizado (opcional)</Text>
                  <TextInput
                    value={quotedTotal}
                    onChangeText={setQuotedTotal}
                    keyboardType="decimal-pad"
                    placeholder={String(selected.estimatedTotal)}
                    placeholderTextColor={theme.textMuted}
                    style={[styles.input, { color: theme.text, borderColor: theme.border, backgroundColor: theme.surfaceAlt }]}
                  />

                  <Text style={[styles.label, { color: theme.textMuted }]}>Notas internas</Text>
                  <TextInput
                    value={adminNotes}
                    onChangeText={setAdminNotes}
                    multiline
                    placeholder="Notas visibles solo para administración"
                    placeholderTextColor={theme.textMuted}
                    style={[styles.input, styles.notes, { color: theme.text, borderColor: theme.border, backgroundColor: theme.surfaceAlt }]}
                  />
                </View>
              </ScrollView>

              <View style={[styles.footer, { borderTopColor: theme.border }]}>
                <TouchableOpacity style={[styles.cancelButton, { borderColor: theme.border }]} disabled={processing} onPress={close}>
                  <Text style={[styles.buttonText, { color: theme.text }]}>Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.saveButton, { backgroundColor: theme.primary }, processing && styles.disabled]}
                  disabled={processing}
                  onPress={() => { void save(); }}
                >
                  <Text style={[styles.buttonText, { color: theme.onPrimary }]}>{processing ? 'Guardando...' : 'Guardar cambios'}</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : null}
        </View>
      </Modal>
    </>
  );
}
