import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  Text,
  TextInput,
  View,
} from 'react-native';

import { useBusiness } from '../../../context/BusinessContext';
import {
  submitPublicEventRequest,
  SubmitPublicEventExtra,
} from '../../services/web-events/webEventsService';
import styles from './WebEventRequestSection.styles';

interface Props {
  eventTypeId: string | null;
  packageId: string | null;
  eventDate: string;
  guestCount: number;
  estimatedTotal: number;
  currencyCode: string;
  isDateValid: boolean;
  extras: SubmitPublicEventExtra[];
}

function formatMoney(
  value: number,
  currencyCode: string,
): string {
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

export default function WebEventRequestSection({
  eventTypeId,
  packageId,
  eventDate,
  guestCount,
  estimatedTotal,
  currencyCode,
  isDateValid,
  extras,
}: Props) {
  const { theme } = useBusiness();
  const [eventTime, setEventTime] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerNotes, setCustomerNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<{
    folio: number;
    estimatedTotal: number;
  } | null>(null);

  const canSubmit = useMemo(
    () =>
      !!eventTypeId &&
      !!packageId &&
      isDateValid &&
      customerName.trim().length >= 2 &&
      customerPhone.trim().length >= 7 &&
      !isSubmitting,
    [
      eventTypeId,
      packageId,
      isDateValid,
      customerName,
      customerPhone,
      isSubmitting,
    ],
  );

  const handleSubmit = async (): Promise<void> => {
    if (!eventTypeId || !packageId) {
      setError('Selecciona un tipo de evento y un paquete.');
      return;
    }
    if (!isDateValid) {
      setError('Selecciona una fecha válida para tu evento.');
      return;
    }
    if (customerName.trim().length < 2) {
      setError('Escribe tu nombre.');
      return;
    }
    if (customerPhone.trim().length < 7) {
      setError('Escribe un teléfono de contacto válido.');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);

      const result = await submitPublicEventRequest({
        eventTypeId,
        packageId,
        eventDate,
        eventTime,
        guestCount,
        customerName,
        customerPhone,
        customerEmail,
        customerNotes,
        extras,
      });

      setSuccess({
        folio: result.folio,
        estimatedTotal: result.estimatedTotal,
      });
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : 'No se pudo enviar la solicitud.',
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (success) {
    return (
      <View
        style={[
          styles.card,
          {
            backgroundColor: theme.surface,
            borderColor: theme.primary,
          },
        ]}
      >
        <Text style={[styles.successTitle, { color: theme.text }]}>Solicitud enviada</Text>
        <Text style={[styles.successFolio, { color: theme.primary }]}>Folio #{success.folio}</Text>
        <Text style={[styles.successText, { color: theme.textMuted }]}>Recibimos los datos de tu evento. El negocio revisará disponibilidad y se pondrá en contacto contigo para confirmar o ajustar la cotización.</Text>
        <Text style={[styles.successTotal, { color: theme.text }]}>
          Total estimado confirmado: {formatMoney(success.estimatedTotal, currencyCode)}
        </Text>
      </View>
    );
  }

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
      <Text style={[styles.title, { color: theme.text }]}>5. Solicita tu evento</Text>
      <Text style={[styles.subtitle, { color: theme.textMuted }]}>Déjanos tus datos para revisar disponibilidad. Esta solicitud todavía no confirma una reservación.</Text>

      <Text style={[styles.label, { color: theme.textMuted }]}>Hora tentativa (opcional)</Text>
      {React.createElement('input', {
        type: 'time',
        value: eventTime,
        onChange: (event: React.ChangeEvent<HTMLInputElement>) => setEventTime(event.target.value),
        'aria-label': 'Hora tentativa del evento',
        style: {
          width: '100%',
          minHeight: 48,
          boxSizing: 'border-box',
          borderWidth: 1,
          borderStyle: 'solid',
          borderColor: theme.border,
          borderRadius: 10,
          backgroundColor: theme.background,
          color: theme.text,
          paddingLeft: 14,
          paddingRight: 14,
          fontSize: 15,
          marginBottom: 14,
        },
      })}

      <Text style={[styles.label, { color: theme.textMuted }]}>Nombre *</Text>
      <TextInput
        value={customerName}
        onChangeText={setCustomerName}
        placeholder="Tu nombre"
        placeholderTextColor={theme.textMuted}
        style={[styles.input, { color: theme.text, borderColor: theme.border, backgroundColor: theme.background }]}
        maxLength={120}
      />

      <View style={styles.twoColumns}>
        <View style={styles.column}>
          <Text style={[styles.label, { color: theme.textMuted }]}>Teléfono / WhatsApp *</Text>
          <TextInput
            value={customerPhone}
            onChangeText={setCustomerPhone}
            placeholder="461 000 0000"
            placeholderTextColor={theme.textMuted}
            keyboardType="phone-pad"
            style={[styles.input, { color: theme.text, borderColor: theme.border, backgroundColor: theme.background }]}
            maxLength={30}
          />
        </View>
        <View style={styles.column}>
          <Text style={[styles.label, { color: theme.textMuted }]}>Correo (opcional)</Text>
          <TextInput
            value={customerEmail}
            onChangeText={setCustomerEmail}
            placeholder="correo@ejemplo.com"
            placeholderTextColor={theme.textMuted}
            keyboardType="email-address"
            autoCapitalize="none"
            style={[styles.input, { color: theme.text, borderColor: theme.border, backgroundColor: theme.background }]}
            maxLength={160}
          />
        </View>
      </View>

      <Text style={[styles.label, { color: theme.textMuted }]}>Comentarios (opcional)</Text>
      <TextInput
        value={customerNotes}
        onChangeText={setCustomerNotes}
        placeholder="Cuéntanos algún detalle especial de tu evento."
        placeholderTextColor={theme.textMuted}
        multiline
        style={[styles.input, styles.notesInput, { color: theme.text, borderColor: theme.border, backgroundColor: theme.background }]}
        maxLength={1200}
      />

      <View style={[styles.preview, { borderColor: theme.border, backgroundColor: theme.background }]}> 
        <Text style={[styles.previewLabel, { color: theme.textMuted }]}>Estimado mostrado</Text>
        <Text style={[styles.previewValue, { color: theme.primary }]}>{formatMoney(estimatedTotal, currencyCode)}</Text>
        <Text style={[styles.previewHint, { color: theme.textMuted }]}>Supabase recalculará el total con los precios vigentes al enviar.</Text>
      </View>

      {error ? <Text style={[styles.errorText, { color: theme.danger }]}>{error}</Text> : null}

      <Pressable
        disabled={!canSubmit}
        onPress={() => { void handleSubmit(); }}
        style={({ pressed }) => [
          styles.submitButton,
          { backgroundColor: theme.primary },
          (!canSubmit || pressed) && styles.buttonMuted,
        ]}
      >
        {isSubmitting ? (
          <ActivityIndicator color={theme.onPrimary} />
        ) : (
          <Text style={[styles.submitText, { color: theme.onPrimary }]}>Enviar solicitud</Text>
        )}
      </Pressable>
    </View>
  );
}
