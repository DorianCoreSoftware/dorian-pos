import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { useBusiness } from '../../../context/BusinessContext';
import { shareEventQuotePdf } from '../../../services/eventQuotePdfService';
import {
  getPublicEventQuotePortal,
  PublicEventQuotePortal,
  respondPublicEventQuote,
} from '../../services/web-events/webEventQuotePortalService';
import styles from './WebEventQuoteScreen.styles';

interface Props {
  token: string;
  onBack: () => void;
}

function formatMoney(value: number, currencyCode: string): string {
  try {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: currencyCode,
      minimumFractionDigits: 2,
    }).format(value);
  } catch {
    return `$${value.toFixed(2)}`;
  }
}

function formatDate(value: string): string {
  if (!value) return '—';
  const parts = value.slice(0, 10).split('-');
  if (parts.length !== 3) return value;
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

function portalUnavailableMessage(reason: PublicEventQuotePortal['reason']): string {
  switch (reason) {
    case 'revoked':
      return 'Este enlace fue revocado por el negocio.';
    case 'expired':
      return 'Este enlace ya venció. Solicita al negocio uno nuevo.';
    case 'superseded':
      return 'Existe una versión más reciente de esta cotización. Solicita el enlace actualizado para responder.';
    default:
      return 'El enlace de cotización no es válido o ya no está disponible.';
  }
}

function requestStatusLabel(status: string): string {
  switch (status) {
    case 'new': return 'Nueva';
    case 'reviewing': return 'En revisión';
    case 'quoted': return 'Cotizada';
    case 'accepted': return 'Aceptada';
    case 'confirmed': return 'Confirmada';
    case 'rejected': return 'Rechazada';
    case 'cancelled': return 'Cancelada';
    case 'completed': return 'Realizada';
    default: return status || '—';
  }
}

export default function WebEventQuoteScreen({
  token,
  onBack,
}: Props) {
  const { theme } = useBusiness();
  const [portal, setPortal] = useState<PublicEventQuotePortal | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async (): Promise<void> => {
    try {
      setLoading(true);
      setError(null);
      setPortal(await getPublicEventQuotePortal(token));
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : 'No se pudo cargar la cotización.',
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [token]);

  const respond = async (
    response: 'accepted' | 'rejected',
  ): Promise<void> => {
    try {
      setProcessing(true);
      setPortal(await respondPublicEventQuote(token, response));
      Alert.alert(
        response === 'accepted' ? 'Cotización aceptada' : 'Cotización rechazada',
        response === 'accepted'
          ? 'Tu respuesta fue registrada. El negocio dará seguimiento al anticipo y confirmación del evento.'
          : 'Tu respuesta fue registrada.',
      );
    } catch (responseError) {
      Alert.alert(
        'No se pudo registrar la respuesta',
        responseError instanceof Error
          ? responseError.message
          : 'Inténtalo nuevamente.',
      );
      await load();
    } finally {
      setProcessing(false);
    }
  };

  const openPdf = async (): Promise<void> => {
    if (!portal?.quote) return;
    try {
      await shareEventQuotePdf(portal.quote);
    } catch (pdfError) {
      Alert.alert(
        'PDF',
        pdfError instanceof Error
          ? pdfError.message
          : 'No se pudo abrir el documento.',
      );
    }
  };

  if (loading) {
    return (
      <View style={[styles.loading, { backgroundColor: theme.background }]}>
        <ActivityIndicator color={theme.primary} />
        <Text style={[styles.loadingText, { color: theme.textMuted }]}>
          Cargando cotización...
        </Text>
      </View>
    );
  }

  if (error || !portal?.available || !portal.quote) {
    return (
      <View style={[styles.loading, { backgroundColor: theme.background }]}>
        <Text style={[styles.title, { color: theme.text }]}>Cotización de evento</Text>
        <Text style={[styles.loadingText, { color: theme.textMuted }]}>
          {error ?? portalUnavailableMessage(portal?.reason ?? 'invalid')}
        </Text>
        <TouchableOpacity
          style={[styles.secondaryButton, { borderColor: theme.border, marginTop: 18 }]}
          onPress={onBack}
        >
          <Text style={[styles.buttonText, { color: theme.text }]}>VOLVER AL MENÚ</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const quote = portal.quote;
  const responseText =
    portal.response === 'accepted'
      ? 'Aceptaste esta cotización.'
      : portal.response === 'rejected'
        ? 'Rechazaste esta cotización.'
        : portal.reason === 'superseded'
          ? 'Esta versión es histórica y existe una cotización más reciente.'
          : `Estado actual: ${requestStatusLabel(portal.requestStatus)}.`;

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.background }]}
      contentContainerStyle={styles.content}
    >
      <TouchableOpacity style={styles.backButton} onPress={onBack}>
        <Text style={[styles.backButtonText, { color: theme.primary }]}>← VOLVER AL MENÚ</Text>
      </TouchableOpacity>

      <Text style={[styles.brand, { color: theme.primary }]}>{quote.businessName}</Text>
      <Text style={[styles.title, { color: theme.text }]}>
        Cotización #{quote.folio}
      </Text>
      <Text style={[styles.subtitle, { color: theme.textMuted }]}>
        Versión {quote.version} · Revisa los datos y conserva esta versión para tu referencia.
      </Text>

      <View style={[styles.statusBox, { borderColor: theme.border, backgroundColor: theme.surfaceAlt }]}>
        <Text style={[styles.statusTitle, { color: theme.text }]}>Estado de la cotización</Text>
        <Text style={[styles.statusText, { color: theme.textMuted }]}>{responseText}</Text>
      </View>

      <View style={[styles.card, { borderColor: theme.border, backgroundColor: theme.surface }]}>
        <Text style={[styles.cardTitle, { color: theme.text }]}>Tu evento</Text>
        <Text style={[styles.infoText, { color: theme.textMuted }]}>Cliente: {quote.customerName}</Text>
        <Text style={[styles.infoText, { color: theme.textMuted }]}>Fecha: {formatDate(quote.eventDate)}</Text>
        <Text style={[styles.infoText, { color: theme.textMuted }]}>Hora: {quote.eventTime ? quote.eventTime.slice(0, 5) : '—'}</Text>
        <Text style={[styles.infoText, { color: theme.textMuted }]}>Tipo: {quote.eventTypeName || '—'}</Text>
        <Text style={[styles.infoText, { color: theme.textMuted }]}>Paquete: {quote.packageName || '—'}</Text>
        <Text style={[styles.infoText, { color: theme.textMuted }]}>Personas: {quote.guestCount}</Text>
      </View>

      <View style={[styles.card, { borderColor: theme.border, backgroundColor: theme.surface }]}>
        <Text style={[styles.cardTitle, { color: theme.text }]}>Desglose</Text>
        <View style={styles.row}>
          <Text style={[styles.rowLabel, { color: theme.textMuted }]}>{quote.packageName || 'Paquete'}</Text>
          <Text style={[styles.rowValue, { color: theme.text }]}>{formatMoney(quote.packageBasePrice, quote.currencyCode)}</Text>
        </View>
        {quote.additionalGuestCount > 0 ? (
          <View style={styles.row}>
            <Text style={[styles.rowLabel, { color: theme.textMuted }]}>
              {quote.additionalGuestCount} personas adicionales
            </Text>
            <Text style={[styles.rowValue, { color: theme.text }]}>
              {formatMoney(quote.additionalGuestSubtotal, quote.currencyCode)}
            </Text>
          </View>
        ) : null}
        {quote.extras.map(extra => (
          <View key={extra.id} style={styles.row}>
            <Text style={[styles.rowLabel, { color: theme.textMuted }]}>
              {extra.extraName}{extra.quantity > 1 ? ` × ${extra.quantity}` : ''}
            </Text>
            <Text style={[styles.rowValue, { color: theme.text }]}>
              {formatMoney(extra.subtotal, quote.currencyCode)}
            </Text>
          </View>
        ))}
        <View style={[styles.divider, { backgroundColor: theme.border }]} />
        <View style={styles.row}>
          <Text style={[styles.totalLabel, { color: theme.text }]}>Total cotizado</Text>
          <Text style={[styles.totalValue, { color: theme.primary }]}>
            {formatMoney(quote.effectiveTotal, quote.currencyCode)}
          </Text>
        </View>
      </View>

      <View style={[styles.card, { borderColor: theme.border, backgroundColor: theme.surface }]}>
        <Text style={[styles.cardTitle, { color: theme.text }]}>Anticipo y saldo</Text>
        <View style={styles.row}>
          <Text style={[styles.rowLabel, { color: theme.textMuted }]}>Anticipo requerido</Text>
          <Text style={[styles.rowValue, { color: theme.text }]}>
            {formatMoney(portal.currentRequiredDepositAmount, quote.currencyCode)}
          </Text>
        </View>
        <View style={styles.row}>
          <Text style={[styles.rowLabel, { color: theme.textMuted }]}>Pagado actualmente</Text>
          <Text style={[styles.rowValue, { color: theme.primary }]}>
            {formatMoney(portal.currentPaidAmount, quote.currencyCode)}
          </Text>
        </View>
        <View style={styles.row}>
          <Text style={[styles.rowLabel, { color: theme.textMuted }]}>Anticipo pendiente</Text>
          <Text style={[styles.rowValue, { color: theme.text }]}>
            {formatMoney(portal.currentPendingDepositAmount, quote.currencyCode)}
          </Text>
        </View>
        {quote.paymentDueDate ? (
          <Text style={[styles.infoText, { color: theme.textMuted, marginTop: 8 }]}>
            Fecha límite del anticipo: {formatDate(quote.paymentDueDate)}
          </Text>
        ) : null}
      </View>

      <View style={[styles.card, { borderColor: theme.border, backgroundColor: theme.surface }]}>
        <Text style={[styles.cardTitle, { color: theme.text }]}>Condiciones</Text>
        <Text style={[styles.terms, { color: theme.textMuted }]}>
          {quote.terms.trim() || 'Sin condiciones adicionales.'}
        </Text>

        <View style={styles.actionWrap}>
          <TouchableOpacity
            style={[styles.secondaryButton, { borderColor: theme.border, backgroundColor: theme.surfaceAlt }]}
            disabled={processing}
            onPress={() => { void openPdf(); }}
          >
            <Text style={[styles.buttonText, { color: theme.text }]}>DESCARGAR / IMPRIMIR PDF</Text>
          </TouchableOpacity>

          {portal.canRespond ? (
            <>
              <TouchableOpacity
                style={[styles.primaryButton, { backgroundColor: theme.primary }, processing && styles.disabled]}
                disabled={processing}
                onPress={() => { void respond('accepted'); }}
              >
                <Text style={[styles.buttonText, { color: theme.onPrimary }]}>
                  {processing ? 'PROCESANDO...' : 'ACEPTAR COTIZACIÓN'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.secondaryButton, { borderColor: theme.border }, processing && styles.disabled]}
                disabled={processing}
                onPress={() => { void respond('rejected'); }}
              >
                <Text style={[styles.buttonText, { color: theme.text }]}>RECHAZAR</Text>
              </TouchableOpacity>
            </>
          ) : null}
        </View>
      </View>
    </ScrollView>
  );
}
