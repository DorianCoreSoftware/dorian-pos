import React, { useCallback, useEffect, useMemo, useState } from 'react';
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
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';

import { useBusiness } from '../../../context/BusinessContext';
import { useCurrency } from '../../../hooks/useCurrency';
import { PeriodFilter, PeriodFilterValue } from '../../period-filter/PeriodFilter';
import {
  deleteExpense,
  ExpenseCategory,
  ExpensePaymentMethod,
  ExpenseRecord,
  getExpenseCategories,
  getExpenses,
  saveExpense,
  saveExpenseCategory,
  setExpenseCategoryActive,
} from '../../../services/expenseService';
import { styles } from './AdminExpenses.styles';

interface ExpenseDraft {
  id?: string;
  categoryId: string;
  amount: string;
  description: string;
  paymentMethod: ExpensePaymentMethod;
  expenseAt: Date;
}

const PAYMENT_OPTIONS: { value: ExpensePaymentMethod; label: string }[] = [
  { value: 'cash', label: 'Efectivo' },
  { value: 'card', label: 'Tarjeta' },
  { value: 'transfer', label: 'Transferencia' },
  { value: 'other', label: 'Otro' },
];

function emptyDraft(categoryId = ''): ExpenseDraft {
  return {
    categoryId,
    amount: '',
    description: '',
    paymentMethod: 'cash',
    expenseAt: new Date(),
  };
}

function startOfDay(date: Date): Date {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}

function endOfDay(date: Date): Date {
  const next = new Date(date);
  next.setHours(23, 59, 59, 999);
  return next;
}

function getPeriodRange(
  period: PeriodFilterValue,
  customStart: Date,
  customEnd: Date,
): { from: Date; to: Date } {
  const now = new Date();
  const to = endOfDay(now);

  if (period === 'today') return { from: startOfDay(now), to };
  if (period === '7days') {
    const from = startOfDay(now);
    from.setDate(from.getDate() - 6);
    return { from, to };
  }
  if (period === 'month') {
    return { from: new Date(now.getFullYear(), now.getMonth(), 1), to };
  }
  if (period === 'all') {
    return { from: new Date(2000, 0, 1), to };
  }
  return { from: startOfDay(customStart), to: endOfDay(customEnd) };
}

function formatDate(date: Date): string {
  return date.toLocaleDateString('es-MX', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function paymentLabel(method: ExpensePaymentMethod): string {
  return PAYMENT_OPTIONS.find(option => option.value === method)?.label ?? method;
}

export function AdminExpenses() {
  const { theme } = useBusiness();
  const { formatCurrency } = useCurrency();

  const [period, setPeriod] = useState<PeriodFilterValue>('month');
  const [customStart, setCustomStart] = useState(new Date());
  const [customEnd, setCustomEnd] = useState(new Date());
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);

  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [expenses, setExpenses] = useState<ExpenseRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [expenseModalVisible, setExpenseModalVisible] = useState(false);
  const [categoryModalVisible, setCategoryModalVisible] = useState(false);
  const [draft, setDraft] = useState<ExpenseDraft>(emptyDraft());
  const [newCategoryName, setNewCategoryName] = useState('');

  const dateRange = useMemo(
    () => getPeriodRange(period, customStart, customEnd),
    [period, customStart, customEnd],
  );

  const totalExpenses = useMemo(
    () => expenses.reduce((sum, expense) => sum + expense.amount, 0),
    [expenses],
  );

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const [categoryData, expenseData] = await Promise.all([
        getExpenseCategories(true),
        getExpenses(dateRange.from, dateRange.to),
      ]);
      setCategories(categoryData);
      setExpenses(expenseData);
    } catch (error) {
      Alert.alert('Egresos', error instanceof Error ? error.message : 'No se pudieron cargar los egresos.');
    } finally {
      setLoading(false);
    }
  }, [dateRange.from, dateRange.to]);

  useEffect(() => {
    void load();
  }, [load]);

  const activeCategories = categories.filter(category => category.isActive);

  const openNewExpense = () => {
    setDraft(emptyDraft(activeCategories[0]?.id ?? ''));
    setExpenseModalVisible(true);
  };

  const openEditExpense = (expense: ExpenseRecord) => {
    setDraft({
      id: expense.id,
      categoryId: expense.categoryId,
      amount: expense.amount.toFixed(2),
      description: expense.description,
      paymentMethod: expense.paymentMethod,
      expenseAt: new Date(expense.expenseAt),
    });
    setExpenseModalVisible(true);
  };

  const handleSaveExpense = async () => {
    try {
      setSaving(true);
      await saveExpense({
        id: draft.id,
        categoryId: draft.categoryId,
        amount: Number(draft.amount.replace(',', '.')),
        description: draft.description,
        paymentMethod: draft.paymentMethod,
        expenseAt: draft.expenseAt,
      });
      setExpenseModalVisible(false);
      await load();
    } catch (error) {
      Alert.alert('No se pudo guardar', error instanceof Error ? error.message : 'Error desconocido.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteExpense = (expense: ExpenseRecord) => {
    Alert.alert('Eliminar egreso', `¿Eliminar "${expense.description}"?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: () => {
          void (async () => {
            try {
              await deleteExpense(expense.id);
              await load();
            } catch (error) {
              Alert.alert('Egresos', error instanceof Error ? error.message : 'No se pudo eliminar el egreso.');
            }
          })();
        },
      },
    ]);
  };

  const handleAddCategory = async () => {
    try {
      await saveExpenseCategory({ name: newCategoryName, position: categories.length * 10 + 10 });
      setNewCategoryName('');
      await load();
    } catch (error) {
      Alert.alert('Categorías', error instanceof Error ? error.message : 'No se pudo crear la categoría.');
    }
  };

  const handleToggleCategory = async (category: ExpenseCategory) => {
    try {
      await setExpenseCategoryActive(category.id, !category.isActive);
      await load();
    } catch (error) {
      Alert.alert('Categorías', error instanceof Error ? error.message : 'No se pudo actualizar la categoría.');
    }
  };

  const handleStartDate = (event: DateTimePickerEvent, value?: Date) => {
    setShowStartPicker(false);
    if (event.type !== 'set' || !value) return;
    setCustomStart(value);
    if (value > customEnd) setCustomEnd(value);
  };

  const handleEndDate = (event: DateTimePickerEvent, value?: Date) => {
    setShowEndPicker(false);
    if (event.type !== 'set' || !value) return;
    setCustomEnd(value);
  };

  return (
    <>
      <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View style={styles.headerText}>
            <Text style={[styles.title, { color: theme.text }]}>Egresos</Text>
            <Text style={[styles.subtitle, { color: theme.textMuted }]}>Registra gastos operativos y consulta cuánto dinero salió del negocio.</Text>
          </View>

          <TouchableOpacity style={[styles.addButton, { backgroundColor: theme.primary }]} onPress={openNewExpense}>
            <Text style={[styles.addButtonText, { color: theme.onPrimary }]}>+ REGISTRAR</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.filtersRow}>
          <View style={styles.filterCell}>
            <PeriodFilter value={period} onChange={setPeriod} />
          </View>
        </View>

        {period === 'custom' ? (
          <View style={styles.customDateRow}>
            <TouchableOpacity style={[styles.dateButton, { borderColor: theme.border, backgroundColor: theme.surface }]} onPress={() => setShowStartPicker(true)}>
              <Text style={[styles.dateLabel, { color: theme.textMuted }]}>Desde</Text>
              <Text style={[styles.dateValue, { color: theme.text }]}>{formatDate(customStart)}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.dateButton, { borderColor: theme.border, backgroundColor: theme.surface }]} onPress={() => setShowEndPicker(true)}>
              <Text style={[styles.dateLabel, { color: theme.textMuted }]}>Hasta</Text>
              <Text style={[styles.dateValue, { color: theme.text }]}>{formatDate(customEnd)}</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        <View style={styles.summaryGrid}>
          <View style={[styles.summaryCard, { borderColor: theme.border, backgroundColor: theme.surface }]}>
            <Text style={[styles.summaryLabel, { color: theme.textMuted }]}>Egresos</Text>
            <Text style={[styles.summaryValue, { color: theme.primary }]}>{formatCurrency(totalExpenses)}</Text>
          </View>
          <View style={[styles.summaryCard, { borderColor: theme.border, backgroundColor: theme.surface }]}>
            <Text style={[styles.summaryLabel, { color: theme.textMuted }]}>Registros</Text>
            <Text style={[styles.summaryValue, { color: theme.text }]}>{expenses.length}</Text>
          </View>
        </View>

        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Movimientos</Text>
          <TouchableOpacity onPress={() => setCategoryModalVisible(true)}>
            <Text style={[styles.linkText, { color: theme.primary }]}>Administrar categorías</Text>
          </TouchableOpacity>
        </View>

        {loading ? (
          <ActivityIndicator color={theme.primary} />
        ) : expenses.length === 0 ? (
          <View style={styles.empty}>
            <Text style={[styles.emptyTitle, { color: theme.text }]}>Sin egresos en este periodo</Text>
            <Text style={[styles.emptyText, { color: theme.textMuted }]}>Los gastos que registres aparecerán aquí y alimentarán el balance financiero.</Text>
          </View>
        ) : (
          <View style={styles.list}>
            {expenses.map(expense => (
              <View key={expense.id} style={[styles.expenseCard, { borderColor: theme.border, backgroundColor: theme.surface }]}>
                <View style={styles.expenseHeader}>
                  <View style={styles.expenseInfo}>
                    <Text style={[styles.expenseDescription, { color: theme.text }]}>{expense.description}</Text>
                    <Text style={[styles.expenseMeta, { color: theme.textMuted }]}>
                      {expense.categoryName} · {new Date(expense.expenseAt).toLocaleString('es-MX')} · {paymentLabel(expense.paymentMethod)}
                    </Text>
                  </View>
                  <Text style={[styles.expenseAmount, { color: theme.danger }]}>{formatCurrency(expense.amount)}</Text>
                </View>
                <View style={styles.expenseActions}>
                  <TouchableOpacity onPress={() => openEditExpense(expense)}>
                    <Text style={[styles.actionText, { color: theme.primary }]}>Editar</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => handleDeleteExpense(expense)}>
                    <Text style={[styles.actionText, { color: theme.danger }]}>Eliminar</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      <Modal visible={expenseModalVisible} transparent animationType="fade" onRequestClose={() => setExpenseModalVisible(false)}>
        <View style={styles.overlay}>
          <View style={[styles.modalCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, { color: theme.text }]}>{draft.id ? 'Editar egreso' : 'Registrar egreso'}</Text>
                <TouchableOpacity onPress={() => setExpenseModalVisible(false)}><Text style={[styles.closeText, { color: theme.textMuted }]}>✕</Text></TouchableOpacity>
              </View>

              <Text style={[styles.label, { color: theme.textMuted }]}>Monto</Text>
              <TextInput value={draft.amount} onChangeText={value => setDraft(current => ({ ...current, amount: value.replace(/[^0-9.,]/g, '') }))} keyboardType="decimal-pad" placeholder="0.00" placeholderTextColor={theme.textMuted} style={[styles.input, { color: theme.text, borderColor: theme.border, backgroundColor: theme.background }]} />

              <Text style={[styles.label, { color: theme.textMuted }]}>Descripción</Text>
              <TextInput value={draft.description} onChangeText={value => setDraft(current => ({ ...current, description: value }))} placeholder="Ej. compra de aceite" placeholderTextColor={theme.textMuted} style={[styles.input, { color: theme.text, borderColor: theme.border, backgroundColor: theme.background }]} />

              <Text style={[styles.label, { color: theme.textMuted }]}>Categoría</Text>
              <View style={styles.optionGrid}>
                {activeCategories.map(category => {
                  const selected = category.id === draft.categoryId;
                  return (
                    <TouchableOpacity key={category.id} style={[styles.optionChip, { borderColor: selected ? theme.primary : theme.border, backgroundColor: selected ? theme.surfaceAlt : theme.background }]} onPress={() => setDraft(current => ({ ...current, categoryId: category.id }))}>
                      <Text style={[styles.optionText, { color: selected ? theme.primary : theme.textMuted }]}>{category.name}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <Text style={[styles.label, { color: theme.textMuted }]}>Método de pago</Text>
              <View style={styles.optionGrid}>
                {PAYMENT_OPTIONS.map(option => {
                  const selected = option.value === draft.paymentMethod;
                  return (
                    <TouchableOpacity key={option.value} style={[styles.optionChip, { borderColor: selected ? theme.primary : theme.border, backgroundColor: selected ? theme.surfaceAlt : theme.background }]} onPress={() => setDraft(current => ({ ...current, paymentMethod: option.value }))}>
                      <Text style={[styles.optionText, { color: selected ? theme.primary : theme.textMuted }]}>{option.label}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <Text style={[styles.label, { color: theme.textMuted }]}>Fecha</Text>
              <TouchableOpacity style={[styles.selector, { borderColor: theme.border, backgroundColor: theme.background }]} onPress={() => setShowStartPicker(true)}>
                <Text style={[styles.selectorText, { color: theme.text }]}>{draft.expenseAt.toLocaleString('es-MX')}</Text>
                <Text style={{ color: theme.primary }}>▾</Text>
              </TouchableOpacity>

              <View style={styles.modalActions}>
                <TouchableOpacity style={[styles.secondaryButton, { borderColor: theme.border }]} onPress={() => setExpenseModalVisible(false)}>
                  <Text style={[styles.buttonText, { color: theme.text }]}>Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity disabled={saving} style={[styles.primaryButton, { backgroundColor: theme.primary, opacity: saving ? 0.6 : 1 }]} onPress={() => { void handleSaveExpense(); }}>
                  {saving ? <ActivityIndicator color={theme.onPrimary} /> : <Text style={[styles.buttonText, { color: theme.onPrimary }]}>Guardar</Text>}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal visible={categoryModalVisible} transparent animationType="fade" onRequestClose={() => setCategoryModalVisible(false)}>
        <View style={styles.overlay}>
          <View style={[styles.modalCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.text }]}>Categorías de egreso</Text>
              <TouchableOpacity onPress={() => setCategoryModalVisible(false)}><Text style={[styles.closeText, { color: theme.textMuted }]}>✕</Text></TouchableOpacity>
            </View>

            <Text style={[styles.label, { color: theme.textMuted }]}>Nueva categoría</Text>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <TextInput value={newCategoryName} onChangeText={setNewCategoryName} placeholder="Nombre" placeholderTextColor={theme.textMuted} style={[styles.input, { flex: 1, color: theme.text, borderColor: theme.border, backgroundColor: theme.background }]} />
              <TouchableOpacity style={[styles.primaryButton, { backgroundColor: theme.primary }]} onPress={() => { void handleAddCategory(); }}>
                <Text style={[styles.buttonText, { color: theme.onPrimary }]}>Agregar</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 360 }} contentContainerStyle={styles.categoriesList}>
              {categories.map(category => (
                <View key={category.id} style={[styles.categoryRow, { borderColor: theme.border, backgroundColor: theme.background }]}>
                  <Text style={[styles.categoryName, { color: theme.text }]}>{category.name}</Text>
                  <TouchableOpacity onPress={() => { void handleToggleCategory(category); }}>
                    <Text style={[styles.categoryState, { color: category.isActive ? theme.primary : theme.textMuted }]}>{category.isActive ? 'ACTIVA' : 'INACTIVA'}</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {showStartPicker ? (
        <DateTimePicker
          value={expenseModalVisible ? draft.expenseAt : customStart}
          mode={expenseModalVisible ? 'datetime' : 'date'}
          maximumDate={new Date()}
          onChange={(event, value) => {
            if (expenseModalVisible) {
              setShowStartPicker(false);
              if (event.type === 'set' && value) setDraft(current => ({ ...current, expenseAt: value }));
            } else {
              handleStartDate(event, value);
            }
          }}
        />
      ) : null}

      {showEndPicker ? (
        <DateTimePicker value={customEnd} mode="date" minimumDate={customStart} maximumDate={new Date()} onChange={handleEndDate} />
      ) : null}
    </>
  );
}
