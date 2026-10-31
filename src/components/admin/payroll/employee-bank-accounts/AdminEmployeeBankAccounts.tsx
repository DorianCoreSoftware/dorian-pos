import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { useBusiness } from '../../../../context/BusinessContext';
import {
  EmployeeBankAccount,
  getEmployeeBankAccounts,
  saveEmployeeBankAccount,
} from '../../../../services/paymentAccountService';
import { styles } from './AdminEmployeeBankAccounts.styles';

function digits(value: string, max: number): string {
  return value.replace(/\D/g, '').slice(0, max);
}

export function AdminEmployeeBankAccounts() {
  const { theme } = useBusiness();
  const [items, setItems] = useState<EmployeeBankAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);

  const load = async (): Promise<void> => {
    try {
      setLoading(true);
      setItems(await getEmployeeBankAccounts());
    } catch (error) {
      Alert.alert('No se pudieron cargar los datos bancarios', error instanceof Error ? error.message : 'Ocurrió un error.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, []);

  const update = <K extends keyof EmployeeBankAccount>(userId: string, key: K, value: EmployeeBankAccount[K]): void => {
    setItems(current => current.map(item => item.userId === userId ? { ...item, [key]: value } : item));
  };

  const save = async (item: EmployeeBankAccount): Promise<void> => {
    const hasBankData = Boolean(item.bankName.trim() || item.accountHolder.trim() || item.clabe.trim() || item.accountNumber.trim());
    if (hasBankData && !item.bankName.trim()) {
      Alert.alert('Banco obligatorio', 'Indica el banco del empleado.');
      return;
    }
    if (hasBankData && !item.accountHolder.trim()) {
      Alert.alert('Titular obligatorio', 'Indica el titular de la cuenta.');
      return;
    }
    if (hasBankData && item.clabe.length !== 18) {
      Alert.alert('CLABE inválida', 'La CLABE debe contener exactamente 18 dígitos.');
      return;
    }
    try {
      setSavingId(item.userId);
      await saveEmployeeBankAccount(item);
      await load();
      Alert.alert('Datos guardados', `Se actualizaron los datos bancarios de ${item.employeeName}.`);
    } catch (error) {
      Alert.alert('No se pudo guardar', error instanceof Error ? error.message : 'Ocurrió un error.');
    } finally {
      setSavingId(null);
    }
  };

  if (loading) return <ActivityIndicator color={theme.primary} />;

  return (
    <View style={styles.container}>
      <Text style={[styles.title, { color: theme.text }]}>Datos bancarios de empleados</Text>
      <Text style={[styles.subtitle, { color: theme.textMuted }]}>Estos datos son privados y solo los pueden consultar usuarios con permiso de nómina.</Text>

      <View style={styles.grid}>
        {items.map(item => (
          <View key={item.userId} style={[styles.card, { backgroundColor: theme.background, borderColor: item.clabe ? theme.border : theme.primary }]}>
            <Text style={[styles.employeeName, { color: theme.text }]}>{item.employeeName}</Text>
            <Text style={[styles.role, { color: theme.textMuted }]}>{item.employeeRole.toUpperCase()} · {item.clabe ? 'CONFIGURADO' : 'SIN CLABE'}</Text>

            <Field label="Banco" value={item.bankName} onChangeText={value => update(item.userId, 'bankName', value)} theme={theme} />
            <Field label="Titular" value={item.accountHolder} onChangeText={value => update(item.userId, 'accountHolder', value)} theme={theme} />
            <Field label="CLABE" value={item.clabe} onChangeText={value => update(item.userId, 'clabe', digits(value, 18))} keyboardType="number-pad" theme={theme} />
            <Field label="Número de cuenta (opcional)" value={item.accountNumber} onChangeText={value => update(item.userId, 'accountNumber', digits(value, 20))} keyboardType="number-pad" theme={theme} />
            <Field label="Notas (opcional)" value={item.notes} onChangeText={value => update(item.userId, 'notes', value.slice(0, 300))} theme={theme} />

            <TouchableOpacity disabled={savingId === item.userId} onPress={() => void save(item)} style={[styles.saveButton, { backgroundColor: theme.primary, opacity: savingId === item.userId ? 0.55 : 1 }]}>
              <Text style={{ color: theme.onPrimary, fontWeight: '900' }}>{savingId === item.userId ? 'GUARDANDO...' : 'GUARDAR DATOS BANCARIOS'}</Text>
            </TouchableOpacity>
          </View>
        ))}
      </View>
    </View>
  );
}

function Field(props: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  keyboardType?: 'default' | 'number-pad';
  theme: any;
}) {
  return (
    <View style={styles.field}>
      <Text style={[styles.label, { color: props.theme.textMuted }]}>{props.label.toUpperCase()}</Text>
      <TextInput
        value={props.value}
        onChangeText={props.onChangeText}
        keyboardType={props.keyboardType ?? 'default'}
        placeholderTextColor={props.theme.textMuted}
        style={[styles.input, { color: props.theme.text, borderColor: props.theme.border, backgroundColor: props.theme.surface }]}
      />
    </View>
  );
}
