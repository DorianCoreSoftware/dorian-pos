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
} from 'react-native';

import { useBusiness } from '../../../context/BusinessContext';
import {
  EventRequestAdmin,
  EventRequestStatus,
  getEventRequestsAdmin,
  updateEventRequestAdmin,
} from '../../../services/adminEventsService';
import { requestStyles as styles } from './AdminEventRequests.styles';

const STATUS_OPTIONS: Array<{
  value: EventRequestStatus;
  label: string;
}> = [
  { value: 'new', label: 'NUEVA' },
  { value: 'reviewing', label: 'EN REVISIÓN' },
  { value: 'quoted', label: 'COTIZADA' },
  { value: 'accepted', label: 'ACEPTADA' },
  { value: 'rejected', label: 'RECHAZADA' },
  { value: 'cancelled', label: 'CANCELADA' },
  { value: 'completed', label: 'REALIZADA' },
];

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

  const openRequest = (item: EventRequestAdmin): void => {
    setSelected(item);
    setStatus(item.status);
    setQuotedTotal(item.quotedTotal === null ? '' : String(item.quotedTotal));
    setAdminNotes(item.adminNotes);
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
              <Text style={[styles.amount, { color: theme.text }]}>{formatMoney(item.quotedTotal ?? item.estimatedTotal, currencyCode)}</Text>
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
                  <Text style={[styles.sectionTitle, { color: theme.text }]}>Estado</Text>
                  <View style={styles.statusWrap}>
                    {STATUS_OPTIONS.map(option => (
                      <TouchableOpacity
                        key={option.value}
                        style={[styles.statusChoice, { borderColor: status === option.value ? theme.primary : theme.border, backgroundColor: status === option.value ? theme.surfaceAlt : theme.surface }]}
                        onPress={() => setStatus(option.value)}
                      >
                        <Text style={[styles.statusChoiceText, { color: status === option.value ? theme.primary : theme.textMuted }]}>{option.label}</Text>
                      </TouchableOpacity>
                    ))}
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
