import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { useBusiness } from '../../../context/BusinessContext';
import {
  BusinessTransferSettings,
  getAdminBusinessTransferSettings,
  saveAdminBusinessTransferSettings,
} from '../../../services/paymentAccountService';
import { styles } from './AdminPaymentSettings.styles';

const EMPTY: BusinessTransferSettings = {
  enabled: false,
  bankName: '',
  accountHolder: '',
  clabe: '',
  accountNumber: '',
  instructions: '',
};

function onlyDigits(value: string, max: number): string {
  return value.replace(/\D/g, '').slice(0, max);
}

export function AdminPaymentSettings() {
  const { theme } = useBusiness();
  const [form, setForm] = useState<BusinessTransferSettings>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    void (async () => {
      try {
        setLoading(true);
        setForm(await getAdminBusinessTransferSettings());
      } catch (error) {
        Alert.alert('No se pudo cargar', error instanceof Error ? error.message : 'Ocurrió un error.');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const update = <K extends keyof BusinessTransferSettings>(key: K, value: BusinessTransferSettings[K]): void => {
    setForm(current => ({ ...current, [key]: value }));
  };

  const save = async (): Promise<void> => {
    if (form.enabled && form.clabe.length !== 18) {
      Alert.alert('CLABE inválida', 'La CLABE debe contener exactamente 18 dígitos.');
      return;
    }
    try {
      setSaving(true);
      await saveAdminBusinessTransferSettings(form);
      setForm(await getAdminBusinessTransferSettings());
      Alert.alert('Configuración guardada', 'Los datos para transferencias ya están disponibles para POS y web.');
    } catch (error) {
      Alert.alert('No se pudo guardar', error instanceof Error ? error.message : 'Ocurrió un error.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <View style={styles.loading}><ActivityIndicator color={theme.primary} /></View>;
  }

  return (
    <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
      <Text style={[styles.eyebrow, { color: theme.primary }]}>MÉTODOS DE PAGO</Text>
      <Text style={[styles.title, { color: theme.text }]}>Transferencias</Text>
      <Text style={[styles.subtitle, { color: theme.textMuted }]}>
        Configura la cuenta que se mostrará al cobrar por transferencia en POS y a los clientes que elijan transferencia en la web.
      </Text>

      <View style={[styles.switchRow, { borderColor: theme.border }]}>
        <View style={styles.switchText}>
          <Text style={[styles.fieldTitle, { color: theme.text }]}>Aceptar transferencias</Text>
          <Text style={[styles.help, { color: theme.textMuted }]}>Al desactivarlo, la opción desaparece del POS y del checkout web.</Text>
        </View>
        <Switch value={form.enabled} onValueChange={value => update('enabled', value)} trackColor={{ true: theme.primary }} />
      </View>

      <View style={styles.grid}>
        <Field label="Banco" value={form.bankName} onChangeText={value => update('bankName', value)} placeholder="Ej. BBVA" theme={theme} />
        <Field label="Titular" value={form.accountHolder} onChangeText={value => update('accountHolder', value)} placeholder="Nombre del titular" theme={theme} />
        <Field label="CLABE" value={form.clabe} onChangeText={value => update('clabe', onlyDigits(value, 18))} placeholder="18 dígitos" keyboardType="number-pad" theme={theme} />
        <Field label="Número de cuenta (opcional)" value={form.accountNumber} onChangeText={value => update('accountNumber', onlyDigits(value, 20))} placeholder="Cuenta bancaria" keyboardType="number-pad" theme={theme} />
      </View>

      <Text style={[styles.label, { color: theme.textMuted }]}>INSTRUCCIONES PARA EL CLIENTE</Text>
      <TextInput
        value={form.instructions}
        onChangeText={value => update('instructions', value.slice(0, 500))}
        placeholder="Ej. Envía tu comprobante por WhatsApp e incluye el número de pedido."
        placeholderTextColor={theme.textMuted}
        multiline
        style={[styles.notes, { color: theme.text, backgroundColor: theme.background, borderColor: theme.border }]}
      />

      {form.enabled ? (
        <View style={[styles.preview, { borderColor: theme.primary, backgroundColor: theme.background }]}>
          <Text style={[styles.fieldTitle, { color: theme.text }]}>Vista previa para clientes</Text>
          <Text style={[styles.previewText, { color: theme.textMuted }]}>{form.bankName || 'Banco'} · {form.accountHolder || 'Titular'}</Text>
          <Text style={[styles.clabe, { color: theme.primary }]}>{form.clabe || 'CLABE pendiente'}</Text>
          {form.accountNumber ? <Text style={[styles.previewText, { color: theme.textMuted }]}>Cuenta: {form.accountNumber}</Text> : null}
          {form.instructions ? <Text style={[styles.previewText, { color: theme.textMuted }]}>{form.instructions}</Text> : null}
        </View>
      ) : null}

      <TouchableOpacity disabled={saving} onPress={() => void save()} style={[styles.saveButton, { backgroundColor: theme.primary, opacity: saving ? 0.55 : 1 }]}>
        <Text style={{ color: theme.onPrimary, fontWeight: '900' }}>{saving ? 'GUARDANDO...' : 'GUARDAR MÉTODO DE TRANSFERENCIA'}</Text>
      </TouchableOpacity>
    </View>
  );
}

function Field(props: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder: string;
  keyboardType?: 'default' | 'number-pad';
  theme: any;
}) {
  return (
    <View style={styles.field}>
      <Text style={[styles.label, { color: props.theme.textMuted }]}>{props.label.toUpperCase()}</Text>
      <TextInput
        value={props.value}
        onChangeText={props.onChangeText}
        placeholder={props.placeholder}
        placeholderTextColor={props.theme.textMuted}
        keyboardType={props.keyboardType ?? 'default'}
        style={[styles.input, { color: props.theme.text, backgroundColor: props.theme.background, borderColor: props.theme.border }]}
      />
    </View>
  );
}
