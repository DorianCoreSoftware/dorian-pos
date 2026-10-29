import React, {
  useCallback,
  useEffect,
  useState,
} from 'react';

import {
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import {
  AttendanceShiftChangeOffer,
  AttendanceShiftChangeRequest,
  getAdminShiftChangeRequests,
  getShiftChangeOffers,
  reviewShiftChangeRequest,
} from '../../../services/attendanceService';

import { useBusiness } from '../../../context/BusinessContext';

function typeLabel(value: string): string {
  if (value === 'change') return 'CAMBIO DE HORARIO';
  if (value === 'release') return 'LIBERACIÓN / COBERTURA';
  return 'INTERCAMBIO';
}

export function AdminAttendanceShiftChanges() {
  const { theme } = useBusiness();

  const [loading, setLoading] = useState(true);
  const [requests, setRequests] = useState<AttendanceShiftChangeRequest[]>([]);
  const [selected, setSelected] =
    useState<AttendanceShiftChangeRequest | null>(null);
  const [offers, setOffers] = useState<AttendanceShiftChangeOffer[]>([]);
  const [selectedOfferId, setSelectedOfferId] = useState<string | null>(null);
  const [adminNote, setAdminNote] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async (): Promise<void> => {
    setRequests(await getAdminShiftChangeRequests());
  }, []);

  useEffect(() => {
    void (async () => {
      try {
        await load();
      } catch (error) {
        console.error('Error cargando cambios de turno:', error);
      } finally {
        setLoading(false);
      }
    })();
  }, [load]);

  const openRequest = async (
    item: AttendanceShiftChangeRequest,
  ): Promise<void> => {
    try {
      setSelected(item);
      setAdminNote(item.adminNote);
      setSelectedOfferId(item.selectedOfferId);
      setOffers(
        item.requestType === 'change'
          ? []
          : await getShiftChangeOffers(item.id),
      );
    } catch (error) {
      Alert.alert(
        'No se pudo abrir',
        error instanceof Error ? error.message : 'Ocurrió un error.',
      );
    }
  };

  const review = async (approve: boolean): Promise<void> => {
    if (!selected) return;

    if (
      approve &&
      selected.requestType !== 'change' &&
      !selectedOfferId
    ) {
      Alert.alert(
        'Selecciona una propuesta',
        'Para aprobar una cobertura o intercambio debes elegir quién la realizará.',
      );
      return;
    }

    Alert.alert(
      approve ? 'Aprobar cambio' : 'Rechazar solicitud',
      approve
        ? 'El horario publicado se actualizará inmediatamente y se notificará a los empleados afectados.'
        : 'La solicitud se cerrará sin modificar horarios.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: approve ? 'Aprobar' : 'Rechazar',
          style: approve ? 'default' : 'destructive',
          onPress: () =>
            void (async () => {
              try {
                setSaving(true);
                await reviewShiftChangeRequest({
                  requestId: selected.id,
                  approve,
                  selectedOfferId,
                  adminNote,
                });
                setSelected(null);
                setOffers([]);
                setSelectedOfferId(null);
                setAdminNote('');
                await load();
              } catch (error) {
                Alert.alert(
                  'No se pudo resolver',
                  error instanceof Error
                    ? error.message
                    : 'Ocurrió un error.',
                );
              } finally {
                setSaving(false);
              }
            })(),
        },
      ],
    );
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={theme.primary} />
      </View>
    );
  }

  const openRequests = requests.filter(item => item.status === 'open');
  const resolved = requests.filter(item => item.status !== 'open');

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: theme.surface,
          borderColor: theme.border,
        },
      ]}
    >
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.title, { color: theme.text }]}>
            Cambios y coberturas de turnos
          </Text>
          <Text style={[styles.help, { color: theme.textMuted }]}>
            Ningún intercambio o cobertura modifica el horario hasta que
            Administración lo aprueba.
          </Text>
        </View>

        <TouchableOpacity
          onPress={() => void load()}
          style={[styles.button, { borderColor: theme.border }]}
        >
          <Text style={{ color: theme.text, fontWeight: '800' }}>
            ACTUALIZAR
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.metrics}>
        <View style={[styles.metric, { borderColor: theme.border }]}>
          <Text style={[styles.metricNumber, { color: theme.primary }]}>
            {openRequests.length}
          </Text>
          <Text style={{ color: theme.textMuted }}>pendientes</Text>
        </View>
        <View style={[styles.metric, { borderColor: theme.border }]}>
          <Text style={[styles.metricNumber, { color: theme.primary }]}>
            {openRequests.reduce((sum, item) => sum + item.offersCount, 0)}
          </Text>
          <Text style={{ color: theme.textMuted }}>propuestas recibidas</Text>
        </View>
      </View>

      {openRequests.length === 0 ? (
        <Text style={{ color: theme.textMuted }}>
          No hay solicitudes pendientes.
        </Text>
      ) : (
        openRequests.map(item => (
          <TouchableOpacity
            key={item.id}
            onPress={() => void openRequest(item)}
            style={[styles.row, { borderColor: theme.border }]}
          >
            <View style={{ flex: 1 }}>
              <Text style={{ color: theme.text, fontWeight: '900' }}>
                {item.requesterName} · {typeLabel(item.requestType)}
              </Text>
              <Text style={{ color: theme.textMuted, marginTop: 3 }}>
                {item.workDate} · {item.startTime}-{item.endTime}
                {item.desiredStartTime
                  ? ` → ${item.desiredStartTime}-${item.desiredEndTime}`
                  : ''}
              </Text>
              <Text style={{ color: theme.textMuted, marginTop: 3 }}>
                {item.reason}
              </Text>
            </View>
            <Text style={{ color: theme.primary, fontWeight: '900' }}>
              {item.offersCount} oferta(s)
            </Text>
          </TouchableOpacity>
        ))
      )}

      {resolved.length > 0 ? (
        <>
          <Text style={[styles.subtitle, { color: theme.text }]}>
            Historial reciente
          </Text>
          {resolved.slice(0, 20).map(item => (
            <View
              key={item.id}
              style={[styles.row, { borderColor: theme.border }]}
            >
              <View style={{ flex: 1 }}>
                <Text style={{ color: theme.text, fontWeight: '800' }}>
                  {item.requesterName} · {typeLabel(item.requestType)}
                </Text>
                <Text style={{ color: theme.textMuted }}>
                  {item.workDate} · {item.status.toUpperCase()}
                </Text>
              </View>
            </View>
          ))}
        </>
      ) : null}

      <Modal
        visible={Boolean(selected)}
        transparent
        animationType="fade"
        onRequestClose={() => setSelected(null)}
      >
        <View style={styles.backdrop}>
          <View
            style={[
              styles.modal,
              {
                backgroundColor: theme.surface,
                borderColor: theme.border,
              },
            ]}
          >
            <ScrollView>
              <Text style={[styles.modalTitle, { color: theme.text }]}>
                {selected ? typeLabel(selected.requestType) : ''}
              </Text>
              <Text style={{ color: theme.textMuted, marginTop: 4 }}>
                {selected?.requesterName} · {selected?.workDate} ·{' '}
                {selected?.startTime}-{selected?.endTime}
              </Text>

              {selected?.desiredStartTime ? (
                <Text style={{ color: theme.primary, marginTop: 8, fontWeight: '800' }}>
                  Solicita: {selected.desiredStartTime}-{selected.desiredEndTime}
                </Text>
              ) : null}

              <Text style={{ color: theme.text, marginTop: 12 }}>
                {selected?.reason}
              </Text>

              {offers.length > 0 ? (
                <>
                  <Text style={[styles.subtitle, { color: theme.text }]}>
                    Propuestas
                  </Text>
                  {offers.map(offer => (
                    <TouchableOpacity
                      key={offer.id}
                      onPress={() => setSelectedOfferId(offer.id)}
                      style={[
                        styles.offer,
                        {
                          borderColor:
                            selectedOfferId === offer.id
                              ? theme.primary
                              : theme.border,
                          backgroundColor:
                            selectedOfferId === offer.id
                              ? theme.surfaceAlt
                              : theme.background,
                        },
                      ]}
                    >
                      <Text style={{ color: theme.text, fontWeight: '900' }}>
                        {offer.offererName}
                      </Text>
                      {offer.offeredWorkDate ? (
                        <Text style={{ color: theme.textMuted, marginTop: 3 }}>
                          Ofrece {offer.offeredWorkDate} ·{' '}
                          {offer.offeredStartTime}-{offer.offeredEndTime}
                        </Text>
                      ) : (
                        <Text style={{ color: theme.textMuted, marginTop: 3 }}>
                          Se ofrece a cubrir el turno.
                        </Text>
                      )}
                    </TouchableOpacity>
                  ))}
                </>
              ) : selected?.requestType !== 'change' ? (
                <Text style={{ color: theme.textMuted, marginTop: 14 }}>
                  Todavía no hay propuestas de compañeros.
                </Text>
              ) : null}

              <TextInput
                value={adminNote}
                onChangeText={setAdminNote}
                multiline
                placeholder="Nota administrativa opcional"
                placeholderTextColor={theme.textMuted}
                style={[
                  styles.input,
                  {
                    color: theme.text,
                    borderColor: theme.border,
                    backgroundColor: theme.background,
                  },
                ]}
              />

              <View style={styles.actions}>
                <TouchableOpacity
                  disabled={saving}
                  onPress={() => setSelected(null)}
                  style={[styles.button, { borderColor: theme.border }]}
                >
                  <Text style={{ color: theme.text, fontWeight: '800' }}>
                    CERRAR
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  disabled={saving}
                  onPress={() => void review(false)}
                  style={[styles.button, { borderColor: theme.danger }]}
                >
                  <Text style={{ color: theme.danger, fontWeight: '900' }}>
                    RECHAZAR
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  disabled={saving}
                  onPress={() => void review(true)}
                  style={[
                    styles.button,
                    {
                      borderColor: theme.primary,
                      backgroundColor: theme.primary,
                    },
                  ]}
                >
                  <Text style={{ color: theme.onPrimary, fontWeight: '900' }}>
                    APROBAR Y PUBLICAR
                  </Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: 1, borderRadius: 14, padding: 18, gap: 12 },
  center: { minHeight: 160, alignItems: 'center', justifyContent: 'center' },
  header: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, alignItems: 'flex-start' },
  title: { fontSize: 18, fontWeight: '900' },
  help: { marginTop: 4, fontSize: 11, lineHeight: 17 },
  subtitle: { marginTop: 8, fontSize: 15, fontWeight: '900' },
  metrics: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  metric: { minWidth: 150, borderWidth: 1, borderRadius: 10, padding: 11 },
  metricNumber: { fontSize: 22, fontWeight: '900' },
  row: { borderTopWidth: 1, paddingTop: 11, flexDirection: 'row', gap: 10, alignItems: 'center' },
  button: { minHeight: 40, borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, alignItems: 'center', justifyContent: 'center' },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.65)', alignItems: 'center', justifyContent: 'center', padding: 16 },
  modal: { width: '100%', maxWidth: 720, maxHeight: '90%', borderWidth: 1, borderRadius: 14, padding: 18 },
  modalTitle: { fontSize: 20, fontWeight: '900' },
  offer: { borderWidth: 1, borderRadius: 10, padding: 11, marginTop: 8 },
  input: { minHeight: 80, borderWidth: 1, borderRadius: 9, padding: 10, textAlignVertical: 'top', marginTop: 14 },
  actions: { marginTop: 15, flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'flex-end', gap: 8 },
});
