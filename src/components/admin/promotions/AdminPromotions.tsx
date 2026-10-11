import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
  ScrollView,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';

import {
  SafeAreaProvider,
  SafeAreaView,
} from 'react-native-safe-area-context';

import { useBusiness } from '../../../context/BusinessContext';
import { useCurrency } from '../../../hooks/useCurrency';
import { getAllProducts } from '../../../services/products';
import {
  deletePromotionProgram,
  deletePromotionReward,
  getPromotionPrograms,
  savePromotionProgram,
  savePromotionReward,
} from '../../../services/promotionService';
import { PromotionProgram } from '../../../services/promoService';
import {
  getAvailablePromotionModifiers,
  getModifierPromotionSettings,
  ModifierPromotionOption,
  saveModifierPromotionSettings,
} from '../../../services/modifierPromotionService';
import { Product } from '../../../types';

declare const require: (moduleName: string) => { default: React.ComponentType<any> };

const NativeDateTimePicker =
  Platform.OS === 'web'
    ? null
    : require('@react-native-community/datetimepicker').default;

interface ProgramDraft {
  id?: string;
  code: string;
  displayName: string;
  programType: 'collect_reward' | 'order_refund';
  codePrefix: string;
  isEnabled: boolean;
  issueChanceDenominator: string;
  requiredCoupons: string;
  priority: string;
}

const emptyProgram = (): ProgramDraft => ({
  code: '',
  displayName: '',
  programType: 'collect_reward',
  codePrefix: '',
  isEnabled: true,
  issueChanceDenominator: '1',
  requiredCoupons: '5',
  priority: '100',
});

function draftFromProgram(program: PromotionProgram): ProgramDraft {
  return {
    id: program.id,
    code: program.code,
    displayName: program.displayName,
    programType: program.programType,
    codePrefix: program.codePrefix,
    isEnabled: program.isEnabled,
    issueChanceDenominator: String(program.issueChanceDenominator),
    requiredCoupons: String(program.requiredCoupons ?? 1),
    priority: String(program.priority),
  };
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function plusDays(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

function parseLocalDate(value: string): Date {
  const [year, month, day] = value.split('-').map(Number);

  if (!year || !month || !day) {
    return new Date();
  }

  return new Date(year, month - 1, day, 12, 0, 0, 0);
}

function toDateString(value: Date): string {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, '0');
  const day = String(value.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

function formatDisplayDate(value: string): string {
  const [year, month, day] = value.split('-');

  if (!year || !month || !day) {
    return value;
  }

  return `${day}/${month}/${year}`;
}

export function AdminPromotions() {
  const { business, theme } = useBusiness();
  const { formatCurrency } = useCurrency();
  const { height: windowHeight } = useWindowDimensions();
  const promotionsEnabled = business?.features.promotionsEnabled ?? false;

  const [programs, setPrograms] = useState<PromotionProgram[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProgramId, setSelectedProgramId] = useState<string | null>(null);
  const [draft, setDraft] = useState<ProgramDraft>(emptyProgram());
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [productSelectorVisible, setProductSelectorVisible] = useState(false);

  const [modifierOptions, setModifierOptions] = useState<ModifierPromotionOption[]>([]);
  const [modifierSelectorVisible, setModifierSelectorVisible] = useState(false);
  const [modifierSettingsId, setModifierSettingsId] = useState<string | null>(null);
  const [modifierName, setModifierName] = useState('Promoción de modificador');
  const [modifierEnabled, setModifierEnabled] = useState(false);
  const [modifierId, setModifierId] = useState<string | null>(null);
  const [modifierDiscount, setModifierDiscount] = useState('5.00');
  const [modifierStartsAt, setModifierStartsAt] = useState(today());
  const [modifierEndsAt, setModifierEndsAt] = useState(plusDays(6));
  const [datePickerTarget, setDatePickerTarget] = useState<'start' | 'end' | null>(null);

  const selectedProgram = useMemo(
    () => programs.find(program => program.id === selectedProgramId) ?? null,
    [programs, selectedProgramId],
  );

  const selectedModifier = useMemo(
    () => modifierOptions.find(option => option.id === modifierId) ?? null,
    [modifierId, modifierOptions],
  );

  const openDatePicker = (target: 'start' | 'end') => {
    setDatePickerTarget(target);
  };

  const closeDatePicker = () => {
    setDatePickerTarget(null);
  };

  const handleNativeDateChange = (event: { type?: string }, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      closeDatePicker();
    }

    if (event.type === 'dismissed' || !selectedDate || !datePickerTarget) {
      return;
    }

    const value = toDateString(selectedDate);

    if (datePickerTarget === 'start') {
      setModifierStartsAt(value);

      if (parseLocalDate(modifierEndsAt) < selectedDate) {
        setModifierEndsAt(value);
      }
    } else {
      setModifierEndsAt(value);
    }
  };

  const load = useCallback(async (preferredProgramId?: string) => {
    if (!promotionsEnabled) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      const [programData, productData, modifierData, modifierOptionData] = await Promise.all([
        getPromotionPrograms(),
        getAllProducts(),
        getModifierPromotionSettings(),
        getAvailablePromotionModifiers(),
      ]);

      setPrograms(programData);
      setProducts(productData);
      setModifierOptions(modifierOptionData);

      if (programData.length > 0) {
        const preferredProgram =
          programData.find(program => program.id === preferredProgramId) ??
          programData[0];

        setSelectedProgramId(preferredProgram.id);
        setDraft(draftFromProgram(preferredProgram));
      } else {
        setSelectedProgramId(null);
        setDraft(emptyProgram());
      }

      if (modifierData) {
        setModifierSettingsId(modifierData.id);
        setModifierName(modifierData.display_name);
        setModifierEnabled(modifierData.is_enabled);
        setModifierId(modifierData.modifier_id);
        setModifierDiscount(Number(modifierData.discount_amount ?? 0).toFixed(2));
        setModifierStartsAt(modifierData.starts_at ?? today());
        setModifierEndsAt(modifierData.ends_at ?? plusDays(6));
      }
    } catch (error) {
      Alert.alert(
        'Promociones',
        error instanceof Error ? error.message : 'No se pudieron cargar las promociones.',
      );
    } finally {
      setIsLoading(false);
    }
  }, [promotionsEnabled]);

  useEffect(() => {
    void load();
  }, [load]);

  const selectProgram = (program: PromotionProgram) => {
    setSelectedProgramId(program.id);
    setDraft(draftFromProgram(program));
  };

  const startNewProgram = () => {
    setSelectedProgramId(null);
    setDraft(emptyProgram());
  };

  const handleSaveProgram = async () => {
    const chance = Number(draft.issueChanceDenominator);
    const required = draft.programType === 'collect_reward' ? Number(draft.requiredCoupons) : null;
    const priority = Number(draft.priority);

    try {
      setIsSaving(true);
      const id = await savePromotionProgram({
        id: draft.id,
        code: draft.code,
        displayName: draft.displayName,
        programType: draft.programType,
        codePrefix: draft.codePrefix,
        isEnabled: draft.isEnabled,
        issueChanceDenominator: chance,
        requiredCoupons: required,
        priority,
      });

      await load(id);
      Alert.alert('Promociones', 'Programa guardado correctamente.');
    } catch (error) {
      Alert.alert('No se pudo guardar', error instanceof Error ? error.message : 'Error desconocido.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteProgram = () => {
    if (!selectedProgram) return;

    Alert.alert(
      'Eliminar promoción',
      `¿Eliminar "${selectedProgram.displayName}"? Si ya tiene historial, el sistema te pedirá desactivarla en lugar de eliminarla.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: () => {
            void (async () => {
              try {
                await deletePromotionProgram(selectedProgram.id);
                await load();
              } catch (error) {
                Alert.alert('No se pudo eliminar', error instanceof Error ? error.message : 'Error desconocido.');
              }
            })();
          },
        },
      ],
    );
  };

  const addRewardForProduct = async (product: Product) => {
    if (!selectedProgram || selectedProgram.programType !== 'collect_reward') {
      Alert.alert('Guarda primero', 'Guarda el programa antes de agregar premios.');
      return;
    }

    try {
      await savePromotionReward({
        programId: selectedProgram.id,
        productId: product.id,
        displayName: product.name,
        position: selectedProgram.rewards.length * 10 + 10,
        isActive: true,
      });
      setProductSelectorVisible(false);
      await load(selectedProgram.id);
    } catch (error) {
      Alert.alert('Premio', error instanceof Error ? error.message : 'No se pudo agregar el premio.');
    }
  };

  const removeReward = (rewardId: string, name: string) => {
    Alert.alert('Eliminar premio', `¿Eliminar "${name}" de esta promoción?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: () => {
          void (async () => {
            try {
              await deletePromotionReward(rewardId);
              await load(selectedProgram?.id);
            } catch (error) {
              Alert.alert('Premio', error instanceof Error ? error.message : 'No se pudo eliminar.');
            }
          })();
        },
      },
    ]);
  };

  const handleSaveModifierPromotion = async () => {
    const discount = Number(modifierDiscount);

    if (modifierEnabled && !modifierId) {
      Alert.alert('Promoción', 'Selecciona un modificador.');
      return;
    }

    if (!Number.isFinite(discount) || discount < 0) {
      Alert.alert('Promoción', 'El descuento no es válido.');
      return;
    }

    try {
      const id = await saveModifierPromotionSettings(modifierSettingsId, {
        display_name: modifierName.trim() || 'Promoción de modificador',
        modifier_id: modifierId,
        discount_amount: discount,
        is_enabled: modifierEnabled,
        starts_at: modifierStartsAt || null,
        ends_at: modifierEndsAt || null,
      });
      setModifierSettingsId(id);
      Alert.alert('Promociones', 'Promoción de modificador guardada.');
    } catch (error) {
      Alert.alert('Promociones', error instanceof Error ? error.message : 'No se pudo guardar.');
    }
  };

  if (!promotionsEnabled) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, backgroundColor: theme.background }}>
        <Text style={{ color: theme.text, fontSize: 22, fontWeight: '700' }}>Promociones deshabilitadas</Text>
        <Text style={{ color: theme.textMuted, marginTop: 8, textAlign: 'center' }}>
          Activa el módulo desde Admin → Negocio para configurar promociones.
        </Text>
      </View>
    );
  }

  if (isLoading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.background }}>
        <ActivityIndicator size="large" color={theme.primary} />
        <Text style={{ color: theme.textMuted, marginTop: 12 }}>Cargando promociones...</Text>
      </View>
    );
  }

  const cardStyle = {
    backgroundColor: theme.surface,
    borderColor: theme.border,
    borderWidth: 1,
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
  } as const;

  const inputStyle = {
    color: theme.text,
    backgroundColor: theme.surfaceAlt,
    borderColor: theme.border,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginTop: 6,
  } as const;

  const labelStyle = { color: theme.text, fontWeight: '600' as const, marginTop: 12 };

  return (
    <>
      <ScrollView style={{ flex: 1, backgroundColor: theme.background }} contentContainerStyle={{ padding: 18 }}>
        <Text style={{ color: theme.text, fontSize: 28, fontWeight: '800' }}>Promociones</Text>
        <Text style={{ color: theme.textMuted, marginTop: 4, marginBottom: 18 }}>
          Los programas, nombres, prefijos, probabilidades y premios se configuran aquí; el código ya no conoce promociones específicas del negocio.
        </Text>

        <View style={cardStyle}>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
            {programs.map(program => (
              <TouchableOpacity
                key={program.id}
                onPress={() => selectProgram(program)}
                style={{
                  paddingHorizontal: 12,
                  paddingVertical: 8,
                  borderRadius: 999,
                  backgroundColor: selectedProgramId === program.id ? theme.primary : theme.surfaceAlt,
                  borderWidth: 1,
                  borderColor: selectedProgramId === program.id ? theme.primary : theme.border,
                }}
              >
                <Text style={{ color: selectedProgramId === program.id ? theme.onPrimary : theme.text }}>
                  {program.displayName}
                </Text>
              </TouchableOpacity>
            ))}

            <TouchableOpacity
              onPress={startNewProgram}
              style={{ paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, borderWidth: 1, borderColor: theme.primary }}
            >
              <Text style={{ color: theme.primary }}>＋ Nueva</Text>
            </TouchableOpacity>
          </View>

          <Text style={{ color: theme.text, fontSize: 20, fontWeight: '700' }}>
            {draft.id ? 'Editar programa' : 'Nuevo programa'}
          </Text>

          <Text style={labelStyle}>Nombre visible</Text>
          <TextInput value={draft.displayName} onChangeText={displayName => setDraft(current => ({ ...current, displayName }))} style={inputStyle} placeholder="Programa de cliente frecuente" placeholderTextColor={theme.textMuted} />

          <Text style={labelStyle}>Código interno</Text>
          <TextInput value={draft.code} onChangeText={code => setDraft(current => ({ ...current, code }))} style={inputStyle} autoCapitalize="none" placeholder="cliente_frecuente" placeholderTextColor={theme.textMuted} />

          <Text style={labelStyle}>Tipo</Text>
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
            {([
              ['collect_reward', 'Acumular cupones'],
              ['order_refund', 'Reembolso de compra'],
            ] as const).map(([value, label]) => (
              <TouchableOpacity
                key={value}
                onPress={() => setDraft(current => ({ ...current, programType: value }))}
                style={{ flex: 1, padding: 10, borderRadius: 10, borderWidth: 1, borderColor: draft.programType === value ? theme.primary : theme.border, backgroundColor: draft.programType === value ? theme.primary : theme.surfaceAlt }}
              >
                <Text style={{ textAlign: 'center', color: draft.programType === value ? theme.onPrimary : theme.text }}>{label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={labelStyle}>Prefijo de códigos</Text>
          <TextInput value={draft.codePrefix} onChangeText={codePrefix => setDraft(current => ({ ...current, codePrefix: codePrefix.toUpperCase().replace(/\s/g, '') }))} style={inputStyle} autoCapitalize="characters" placeholder="PROMO-" placeholderTextColor={theme.textMuted} />

          <Text style={labelStyle}>1 cupón entre</Text>
          <TextInput value={draft.issueChanceDenominator} onChangeText={issueChanceDenominator => setDraft(current => ({ ...current, issueChanceDenominator }))} style={inputStyle} keyboardType="number-pad" />
          <Text style={{ color: theme.textMuted, marginTop: 5 }}>1 = siempre, 10 = 10%, 100 = 1%.</Text>

          {draft.programType === 'collect_reward' && (
            <>
              <Text style={labelStyle}>Cupones necesarios para canjear</Text>
              <TextInput value={draft.requiredCoupons} onChangeText={requiredCoupons => setDraft(current => ({ ...current, requiredCoupons }))} style={inputStyle} keyboardType="number-pad" />
            </>
          )}

          <Text style={labelStyle}>Prioridad</Text>
          <TextInput value={draft.priority} onChangeText={priority => setDraft(current => ({ ...current, priority }))} style={inputStyle} keyboardType="number-pad" />
          <Text style={{ color: theme.textMuted, marginTop: 5 }}>Menor número = se evalúa primero al terminar una orden.</Text>

          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 16 }}>
            <Text style={{ color: theme.text, fontWeight: '600' }}>Programa activo</Text>
            <Switch value={draft.isEnabled} onValueChange={isEnabled => setDraft(current => ({ ...current, isEnabled }))} trackColor={{ false: theme.border, true: theme.primary }} />
          </View>

          <View style={{ flexDirection: 'row', gap: 10, marginTop: 18 }}>
            <TouchableOpacity disabled={isSaving} onPress={() => void handleSaveProgram()} style={{ flex: 1, backgroundColor: theme.primary, borderRadius: 10, padding: 12 }}>
              <Text style={{ color: theme.onPrimary, textAlign: 'center', fontWeight: '700' }}>{isSaving ? 'GUARDANDO...' : 'GUARDAR PROGRAMA'}</Text>
            </TouchableOpacity>
            {selectedProgram && (
              <TouchableOpacity onPress={handleDeleteProgram} style={{ padding: 12, borderRadius: 10, borderWidth: 1, borderColor: theme.danger }}>
                <Text style={{ color: theme.danger }}>Eliminar</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {selectedProgram?.programType === 'collect_reward' && (
          <View style={cardStyle}>
            <Text style={{ color: theme.text, fontSize: 20, fontWeight: '700' }}>Premios</Text>
            <Text style={{ color: theme.textMuted, marginTop: 4, marginBottom: 12 }}>Los premios salen del catálogo del negocio.</Text>

            {selectedProgram.rewards.map(reward => (
              <View key={reward.id} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: theme.border, paddingVertical: 10 }}>
                <Text style={{ color: theme.text, flex: 1 }}>{reward.displayName}</Text>
                <TouchableOpacity onPress={() => removeReward(reward.id, reward.displayName)}>
                  <Text style={{ color: theme.danger }}>Eliminar</Text>
                </TouchableOpacity>
              </View>
            ))}

            <TouchableOpacity onPress={() => setProductSelectorVisible(true)} style={{ borderRadius: 10, borderWidth: 1, borderColor: theme.primary, padding: 12, marginTop: 12 }}>
              <Text style={{ color: theme.primary, textAlign: 'center', fontWeight: '700' }}>＋ AGREGAR PRODUCTO COMO PREMIO</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={cardStyle}>
          <Text style={{ color: theme.text, fontSize: 20, fontWeight: '700' }}>Promoción de modificador</Text>
          <Text style={{ color: theme.textMuted, marginTop: 4 }}>Esta promoción sigue siendo genérica y puede usar cualquier modificador activo.</Text>

          <Text style={labelStyle}>Nombre visible</Text>
          <TextInput value={modifierName} onChangeText={setModifierName} style={inputStyle} />

          <Text style={labelStyle}>Modificador</Text>
          <TouchableOpacity onPress={() => setModifierSelectorVisible(true)} style={inputStyle}>
            <Text style={{ color: selectedModifier ? theme.text : theme.textMuted }}>
              {selectedModifier ? `${selectedModifier.group_name} · ${selectedModifier.name}` : 'Seleccionar modificador'}
            </Text>
          </TouchableOpacity>

          <Text style={labelStyle}>Descuento</Text>
          <TextInput value={modifierDiscount} onChangeText={setModifierDiscount} style={inputStyle} keyboardType="decimal-pad" />
          <Text style={{ color: theme.textMuted, marginTop: 5 }}>Actual: {formatCurrency(Number(modifierDiscount) || 0)}</Text>

          <Text style={labelStyle}>Inicio</Text>
          {Platform.OS === 'web' ? (
            React.createElement('input', {
              type: 'date',
              value: modifierStartsAt,
              onChange: (event: React.ChangeEvent<HTMLInputElement>) =>
                setModifierStartsAt(event.target.value),
              style: {
                color: theme.text,
                backgroundColor: theme.surfaceAlt,
                borderColor: theme.border,
                borderWidth: 1,
                borderStyle: 'solid',
                borderRadius: 10,
                padding: 10,
                marginTop: 6,
                fontWeight: 600,
                boxSizing: 'border-box',
                width: '100%',
              },
            })
          ) : (
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => openDatePicker('start')}
              style={inputStyle}
            >
              <Text style={{ color: theme.text, fontWeight: '600' }}>
                📅 {formatDisplayDate(modifierStartsAt)}
              </Text>
            </TouchableOpacity>
          )}

          <Text style={labelStyle}>Fin</Text>
          {Platform.OS === 'web' ? (
            React.createElement('input', {
              type: 'date',
              value: modifierEndsAt,
              min: modifierStartsAt,
              onChange: (event: React.ChangeEvent<HTMLInputElement>) =>
                setModifierEndsAt(event.target.value),
              style: {
                color: theme.text,
                backgroundColor: theme.surfaceAlt,
                borderColor: theme.border,
                borderWidth: 1,
                borderStyle: 'solid',
                borderRadius: 10,
                padding: 10,
                marginTop: 6,
                fontWeight: 600,
                boxSizing: 'border-box',
                width: '100%',
              },
            })
          ) : (
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => openDatePicker('end')}
              style={inputStyle}
            >
              <Text style={{ color: theme.text, fontWeight: '600' }}>
                📅 {formatDisplayDate(modifierEndsAt)}
              </Text>
            </TouchableOpacity>
          )}

          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 16 }}>
            <Text style={{ color: theme.text, fontWeight: '600' }}>Promoción activa</Text>
            <Switch value={modifierEnabled} onValueChange={setModifierEnabled} trackColor={{ false: theme.border, true: theme.primary }} />
          </View>

          <TouchableOpacity onPress={() => void handleSaveModifierPromotion()} style={{ backgroundColor: theme.primary, borderRadius: 10, padding: 12, marginTop: 18 }}>
            <Text style={{ color: theme.onPrimary, textAlign: 'center', fontWeight: '700' }}>GUARDAR PROMOCIÓN DE MODIFICADOR</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      <Modal
        visible={productSelectorVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setProductSelectorVisible(false)}
      >
        <SafeAreaProvider>
          <SafeAreaView
            edges={['top', 'bottom']}
            style={{
              flex: 1,
              backgroundColor: 'rgba(0,0,0,0.65)',
              justifyContent: 'center',
              paddingHorizontal: 16,
            }}
          >
            <View
              style={{
                width: '100%',
                maxWidth: 520,
                maxHeight: Math.max(280, windowHeight - 48),
                alignSelf: 'center',
                backgroundColor: theme.surface,
                borderRadius: 16,
                overflow: 'hidden',
                borderWidth: 1,
                borderColor: theme.border,
              }}
            >
              <View
                style={{
                  paddingHorizontal: 16,
                  paddingTop: 16,
                  paddingBottom: 12,
                  borderBottomWidth: 1,
                  borderBottomColor: theme.border,
                }}
              >
                <Text style={{ color: theme.text, fontSize: 20, fontWeight: '700' }}>
                  Seleccionar producto
                </Text>
                <Text style={{ color: theme.textMuted, marginTop: 4, fontSize: 12 }}>
                  Desliza para ver todos los productos.
                </Text>
              </View>

              <ScrollView
                style={{ flexShrink: 1 }}
                contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 18 }}
                showsVerticalScrollIndicator
                persistentScrollbar
                nestedScrollEnabled
              >
                {products.map(product => (
                  <TouchableOpacity
                    key={product.id}
                    onPress={() => void addRewardForProduct(product)}
                    style={{
                      minHeight: 50,
                      justifyContent: 'center',
                      paddingVertical: 12,
                      borderBottomWidth: 1,
                      borderBottomColor: theme.border,
                    }}
                  >
                    <Text style={{ color: theme.text }}>{product.name}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <View
                style={{
                  borderTopWidth: 1,
                  borderTopColor: theme.border,
                  padding: 12,
                }}
              >
                <TouchableOpacity
                  onPress={() => setProductSelectorVisible(false)}
                  style={{ minHeight: 44, alignItems: 'center', justifyContent: 'center' }}
                >
                  <Text style={{ color: theme.primary, fontWeight: '700' }}>Cerrar</Text>
                </TouchableOpacity>
              </View>
            </View>
          </SafeAreaView>
        </SafeAreaProvider>
      </Modal>

      <Modal
        visible={modifierSelectorVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setModifierSelectorVisible(false)}
      >
        <SafeAreaProvider>
          <SafeAreaView
            edges={['top', 'bottom']}
            style={{
              flex: 1,
              backgroundColor: 'rgba(0,0,0,0.65)',
              justifyContent: 'center',
              paddingHorizontal: 16,
            }}
          >
            <View
              style={{
                width: '100%',
                maxWidth: 520,
                maxHeight: Math.max(280, windowHeight - 48),
                alignSelf: 'center',
                backgroundColor: theme.surface,
                borderRadius: 16,
                overflow: 'hidden',
                borderWidth: 1,
                borderColor: theme.border,
              }}
            >
              <View
                style={{
                  paddingHorizontal: 16,
                  paddingTop: 16,
                  paddingBottom: 12,
                  borderBottomWidth: 1,
                  borderBottomColor: theme.border,
                }}
              >
                <Text style={{ color: theme.text, fontSize: 20, fontWeight: '700' }}>
                  Seleccionar modificador
                </Text>
                <Text style={{ color: theme.textMuted, marginTop: 4, fontSize: 12 }}>
                  Desliza para ver todos los modificadores.
                </Text>
              </View>

              <ScrollView
                style={{ flexShrink: 1 }}
                contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 18 }}
                showsVerticalScrollIndicator
                persistentScrollbar
                nestedScrollEnabled
              >
                {modifierOptions.map(option => (
                  <TouchableOpacity
                    key={option.id}
                    onPress={() => {
                      setModifierId(option.id);
                      setModifierSelectorVisible(false);
                    }}
                    style={{
                      minHeight: 50,
                      justifyContent: 'center',
                      paddingVertical: 12,
                      borderBottomWidth: 1,
                      borderBottomColor: theme.border,
                    }}
                  >
                    <Text style={{ color: theme.text }}>
                      {option.group_name} · {option.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <View
                style={{
                  borderTopWidth: 1,
                  borderTopColor: theme.border,
                  padding: 12,
                }}
              >
                <TouchableOpacity
                  onPress={() => setModifierSelectorVisible(false)}
                  style={{ minHeight: 44, alignItems: 'center', justifyContent: 'center' }}
                >
                  <Text style={{ color: theme.primary, fontWeight: '700' }}>Cerrar</Text>
                </TouchableOpacity>
              </View>
            </View>
          </SafeAreaView>
        </SafeAreaProvider>
      </Modal>

      {datePickerTarget && NativeDateTimePicker ? (
        Platform.OS === 'ios' ? (
          <Modal
            visible
            transparent
            animationType="fade"
            onRequestClose={closeDatePicker}
          >
            <SafeAreaProvider>
              <SafeAreaView
                edges={['top', 'bottom']}
                style={{
                  flex: 1,
                  justifyContent: 'flex-end',
                  backgroundColor: 'rgba(0,0,0,0.45)',
                }}
              >
                <View
                  style={{
                    backgroundColor: theme.surface,
                    borderTopLeftRadius: 18,
                    borderTopRightRadius: 18,
                    padding: 16,
                  }}
                >
                  <Text style={{ color: theme.text, fontSize: 17, fontWeight: '700' }}>
                    {datePickerTarget === 'start' ? 'Fecha de inicio' : 'Fecha de fin'}
                  </Text>

                  <NativeDateTimePicker
                    value={parseLocalDate(
                      datePickerTarget === 'start' ? modifierStartsAt : modifierEndsAt,
                    )}
                    mode="date"
                    display="inline"
                    minimumDate={
                      datePickerTarget === 'end' ? parseLocalDate(modifierStartsAt) : undefined
                    }
                    onChange={handleNativeDateChange}
                  />

                  <TouchableOpacity
                    onPress={closeDatePicker}
                    style={{
                      minHeight: 46,
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginTop: 8,
                      borderRadius: 10,
                      backgroundColor: theme.primary,
                    }}
                  >
                    <Text style={{ color: theme.onPrimary, fontWeight: '700' }}>LISTO</Text>
                  </TouchableOpacity>
                </View>
              </SafeAreaView>
            </SafeAreaProvider>
          </Modal>
        ) : (
          <NativeDateTimePicker
            value={parseLocalDate(
              datePickerTarget === 'start' ? modifierStartsAt : modifierEndsAt,
            )}
            mode="date"
            display="default"
            minimumDate={
              datePickerTarget === 'end' ? parseLocalDate(modifierStartsAt) : undefined
            }
            onChange={handleNativeDateChange}
          />
        )
      ) : null}

    </>
  );
}
