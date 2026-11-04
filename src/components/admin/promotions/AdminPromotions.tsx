import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
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
  ModifierPromotionOption,
} from '../../../services/modifierPromotionService';
import {
  DateCalendarField,
} from '../../common/date-calendar-field/DateCalendarField';
import { Product } from '../../../types';


interface ProgramDraft {
  id?: string;
  code: string;
  displayName: string;
  programType: PromotionProgram['programType'];
  codePrefix: string;
  isEnabled: boolean;
  issueChanceDenominator: string;
  requiredCoupons: string;
  targetProductId: string | null;
  targetModifierId: string | null;
  buyQuantity: string;
  payQuantity: string;
  discountAmount: string;
  fixedPrice: string;
  minimumOrderAmount: string;
  orderDiscountKind: 'percent' | 'fixed';
  orderDiscountValue: string;
  startsAt: string;
  endsAt: string;
  activeWeekdays: number[];
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
  targetProductId: null,
  targetModifierId: null,
  buyQuantity: '2',
  payQuantity: '1',
  discountAmount: '5.00',
  fixedPrice: '0.00',
  minimumOrderAmount: '300.00',
  orderDiscountKind: 'percent',
  orderDiscountValue: '10',
  startsAt: '',
  endsAt: '',
  activeWeekdays: [0, 1, 2, 3, 4, 5, 6],
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
    targetProductId: program.targetProductId,
    targetModifierId: program.targetModifierId,
    buyQuantity: String(program.buyQuantity ?? 2),
    payQuantity: String(program.payQuantity ?? 1),
    discountAmount: String(program.discountAmount ?? 5),
    fixedPrice: String(program.fixedPrice ?? 0),
    minimumOrderAmount: String(program.minimumOrderAmount ?? 300),
    orderDiscountKind: program.orderDiscountKind ?? 'percent',
    orderDiscountValue: String(program.orderDiscountValue ?? 10),
    startsAt: program.startsAt ?? '',
    endsAt: program.endsAt ?? '',
    activeWeekdays: program.activeWeekdays.length > 0 ? program.activeWeekdays : [0,1,2,3,4,5,6],
    priority: String(program.priority),
  };
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
  const [
    productSelectorMode,
    setProductSelectorMode,
  ] = useState<'reward' | 'quantity' | 'special' | null>(null);

  const [modifierOptions, setModifierOptions] = useState<ModifierPromotionOption[]>([]);
  const [modifierSelectorVisible, setModifierSelectorVisible] = useState(false);

  const selectedProgram = useMemo(
    () => programs.find(program => program.id === selectedProgramId) ?? null,
    [programs, selectedProgramId],
  );

  const selectedModifier = useMemo(
    () =>
      modifierOptions.find(
        option => option.id === draft.targetModifierId,
      ) ?? null,
    [draft.targetModifierId, modifierOptions],
  );

  const selectedTargetProduct =
    useMemo(
      () =>
        products.find(
          product =>
            product.id ===
            draft.targetProductId,
        ) ?? null,
      [
        draft.targetProductId,
        products,
      ],
    );


  const load = useCallback(async (preferredProgramId?: string) => {
    if (!promotionsEnabled) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      const [programData, productData, modifierOptionData] = await Promise.all([
        getPromotionPrograms(),
        getAllProducts(),
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
        targetProductId:
          draft.programType === 'quantity_deal' ||
          draft.programType === 'special_price'
            ? draft.targetProductId
            : null,
        targetModifierId:
          draft.programType === 'modifier_discount'
            ? draft.targetModifierId
            : null,
        buyQuantity:
          draft.programType === 'quantity_deal'
            ? Number(draft.buyQuantity)
            : null,
        payQuantity:
          draft.programType === 'quantity_deal'
            ? Number(draft.payQuantity)
            : null,
        discountAmount:
          draft.programType === 'modifier_discount'
            ? Number(draft.discountAmount)
            : null,
        fixedPrice:
          draft.programType === 'special_price'
            ? Number(draft.fixedPrice)
            : null,
        minimumOrderAmount:
          draft.programType === 'minimum_spend_discount'
            ? Number(draft.minimumOrderAmount)
            : null,
        orderDiscountKind:
          draft.programType === 'minimum_spend_discount'
            ? draft.orderDiscountKind
            : null,
        orderDiscountValue:
          draft.programType === 'minimum_spend_discount'
            ? Number(draft.orderDiscountValue)
            : null,
        startsAt: draft.startsAt || null,
        endsAt: draft.endsAt || null,
        activeWeekdays: draft.activeWeekdays,
        priority,
      });

      await load(id);
      Alert.alert('Promociones', 'Promoción guardada correctamente.');
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
      setProductSelectorMode(null);
      await load(selectedProgram.id);
    } catch (error) {
      Alert.alert('Premio', error instanceof Error ? error.message : 'No se pudo agregar el premio.');
    }
  };

  const selectTargetProduct = (
    product: Product,
  ) => {
    setDraft(
      current => ({
        ...current,
        targetProductId:
          product.id,
      }),
    );

    setProductSelectorMode(
      null,
    );
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
          Crea promociones fáciles de entender para tus clientes. DorianCore administra automáticamente la configuración técnica.
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
            {draft.id ? 'Editar promoción' : 'Nueva promoción'}
          </Text>

          <Text style={labelStyle}>Nombre visible</Text>
          <TextInput value={draft.displayName} onChangeText={displayName => setDraft(current => ({ ...current, displayName }))} style={inputStyle} placeholder="Programa de cliente frecuente" placeholderTextColor={theme.textMuted} />

          <Text style={labelStyle}>
            Tipo de promoción
          </Text>

          <View
            style={{
              flexDirection: 'row',
              flexWrap: 'wrap',
              gap: 8,
              marginTop: 8,
            }}
          >
            {([
              ['collect_reward', 'Junta y canjea'],
              ['order_refund', 'Compra gratis'],
              ['quantity_deal', 'Compra X, paga Y'],
              ['modifier_discount', 'Descuento'],
              ['special_price', 'Precio especial'],
              ['minimum_spend_discount', 'Compra mínima'],
            ] as const).map(([value, label]) => {
              const selected =
                draft.programType === value;

              return (
                <TouchableOpacity
                  key={value}
                  disabled={
                    Boolean(
                      draft.id,
                    )
                  }
                  onPress={() =>
                    setDraft(current => ({
                      ...current,
                      programType: value,
                    }))
                  }
                  style={{
                    minWidth: 145,
                    flexGrow: 1,
                    paddingVertical: 12,
                    paddingHorizontal: 10,
                    borderRadius: 10,
                    borderWidth: 1,
                    borderColor: selected
                      ? theme.primary
                      : theme.border,
                    backgroundColor: selected
                      ? theme.primary
                      : theme.surfaceAlt,
                    opacity:
                      draft.id &&
                      !selected
                        ? 0.45
                        : 1,
                  }}
                >
                  <Text
                    style={{
                      textAlign: 'center',
                      color: selected
                        ? theme.onPrimary
                        : theme.text,
                      fontWeight: '700',
                    }}
                  >
                    {label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {draft.id ? (
            <Text
              style={{
                color: theme.textMuted,
                marginTop: 7,
                fontSize: 11,
              }}
            >
              El tipo de una promoción existente se conserva para proteger su historial.
            </Text>
          ) : null}

          <Text
            style={{
              color: theme.textMuted,
              marginTop: 8,
              lineHeight: 18,
            }}
          >
            {draft.programType === 'collect_reward'
              ? 'El cliente recibe códigos y, al juntar la cantidad indicada, puede canjear un premio.'
              : draft.programType === 'order_refund'
                ? 'Al cliente ganador se le genera un código que permite devolver el importe de su compra.'
                : draft.programType === 'quantity_deal'
                  ? 'El descuento se aplica automáticamente al comprar la cantidad indicada del producto.'
                  : draft.programType === 'modifier_discount'
                    ? 'Descuenta una cantidad fija cuando el cliente selecciona un modificador específico.'
                    : draft.programType === 'special_price'
                      ? 'Vende un producto a un precio especial durante la vigencia configurada.'
                      : 'Aplica un porcentaje o monto fijo al alcanzar un subtotal mínimo de productos.'}
          </Text>

          {draft.programType === 'collect_reward' || draft.programType === 'order_refund' ? (
            <>
              <Text style={labelStyle}>
                Probabilidad de entrega
              </Text>

              <TextInput
                value={
                  draft.issueChanceDenominator
                }
                onChangeText={
                  issueChanceDenominator =>
                    setDraft(current => ({
                      ...current,
                      issueChanceDenominator,
                    }))
                }
                style={inputStyle}
                keyboardType="number-pad"
              />

              <Text
                style={{
                  color: theme.textMuted,
                  marginTop: 5,
                }}
              >
                1 = siempre · 10 = 10% · 100 = 1%.
              </Text>
            </>
          ) : null}

          {draft.programType === 'collect_reward' ? (
            <>
              <Text style={labelStyle}>
                Cupones necesarios para canjear
              </Text>

              <TextInput
                value={
                  draft.requiredCoupons
                }
                onChangeText={
                  requiredCoupons =>
                    setDraft(current => ({
                      ...current,
                      requiredCoupons,
                    }))
                }
                style={inputStyle}
                keyboardType="number-pad"
              />
            </>
          ) : null}

          {draft.programType === 'quantity_deal' ? (
            <View
              style={{
                marginTop: 16,
                padding: 14,
                borderWidth: 1,
                borderColor: theme.border,
                borderRadius: 12,
                backgroundColor: theme.background,
              }}
            >
              <Text
                style={{
                  color: theme.text,
                  fontWeight: '800',
                  fontSize: 16,
                }}
              >
                Configuración de la oferta
              </Text>

              <Text style={labelStyle}>
                Producto
              </Text>

              <TouchableOpacity
                onPress={() =>
                  setProductSelectorMode(
                    'quantity',
                  )
                }
                style={inputStyle}
              >
                <Text
                  style={{
                    color:
                      selectedTargetProduct
                        ? theme.text
                        : theme.textMuted,
                  }}
                >
                  {selectedTargetProduct?.name ??
                    'Seleccionar producto'}
                </Text>
              </TouchableOpacity>

              <View
                style={{
                  flexDirection: 'row',
                  gap: 10,
                  marginTop: 4,
                }}
              >
                <View
                  style={{
                    flex: 1,
                  }}
                >
                  <Text style={labelStyle}>
                    Cliente lleva
                  </Text>

                  <TextInput
                    value={
                      draft.buyQuantity
                    }
                    onChangeText={
                      buyQuantity =>
                        setDraft(current => ({
                          ...current,
                          buyQuantity,
                        }))
                    }
                    style={[
                      inputStyle,
                      {
                        width: '100%',
                      },
                    ]}
                    keyboardType="number-pad"
                  />
                </View>

                <View
                  style={{
                    flex: 1,
                  }}
                >
                  <Text style={labelStyle}>
                    Cliente paga
                  </Text>

                  <TextInput
                    value={
                      draft.payQuantity
                    }
                    onChangeText={
                      payQuantity =>
                        setDraft(current => ({
                          ...current,
                          payQuantity,
                        }))
                    }
                    style={[
                      inputStyle,
                      {
                        width: '100%',
                      },
                    ]}
                    keyboardType="number-pad"
                  />
                </View>
              </View>

              <View
                style={{
                  marginTop: 14,
                  borderRadius: 10,
                  padding: 12,
                  backgroundColor: theme.surfaceAlt,
                }}
              >
                <Text
                  style={{
                    color: theme.primary,
                    fontWeight: '900',
                    fontSize: 16,
                  }}
                >
                  {draft.buyQuantity || 'X'}x{draft.payQuantity || 'Y'}
                  {selectedTargetProduct
                    ? ` en ${selectedTargetProduct.name}`
                    : ''}
                </Text>

                <Text
                  style={{
                    color: theme.textMuted,
                    marginTop: 4,
                    lineHeight: 17,
                  }}
                >
                  Ejemplo: 4x3 significa que al llevar 4 unidades, el cliente paga únicamente 3.
                </Text>
              </View>
            </View>
          ) : null}

          {draft.programType === 'modifier_discount' ? (
            <View style={{ marginTop: 16, padding: 14, borderWidth: 1, borderColor: theme.border, borderRadius: 12, backgroundColor: theme.background }}>
              <Text style={{ color: theme.text, fontWeight: '800', fontSize: 16 }}>Descuento en modificador</Text>
              <Text style={labelStyle}>Modificador</Text>
              <TouchableOpacity onPress={() => setModifierSelectorVisible(true)} style={inputStyle}>
                <Text style={{ color: selectedModifier ? theme.text : theme.textMuted }}>
                  {selectedModifier ? `${selectedModifier.group_name} · ${selectedModifier.name}` : 'Seleccionar modificador'}
                </Text>
              </TouchableOpacity>
              <Text style={labelStyle}>Descuento por unidad</Text>
              <TextInput value={draft.discountAmount} onChangeText={discountAmount => setDraft(current => ({ ...current, discountAmount }))} style={inputStyle} keyboardType="decimal-pad" />
              <Text style={{ color: theme.textMuted, marginTop: 5 }}>Se descontarán {formatCurrency(Number(draft.discountAmount) || 0)} por cada modificador aplicado.</Text>
            </View>
          ) : null}

          {draft.programType === 'special_price' ? (
            <View style={{ marginTop: 16, padding: 14, borderWidth: 1, borderColor: theme.border, borderRadius: 12, backgroundColor: theme.background }}>
              <Text style={{ color: theme.text, fontWeight: '800', fontSize: 16 }}>Precio especial</Text>
              <Text style={labelStyle}>Producto</Text>
              <TouchableOpacity onPress={() => setProductSelectorMode('special')} style={inputStyle}>
                <Text style={{ color: selectedTargetProduct ? theme.text : theme.textMuted }}>
                  {selectedTargetProduct?.name ?? 'Seleccionar producto'}
                </Text>
              </TouchableOpacity>
              <Text style={labelStyle}>Precio promocional</Text>
              <TextInput value={draft.fixedPrice} onChangeText={fixedPrice => setDraft(current => ({ ...current, fixedPrice }))} style={inputStyle} keyboardType="decimal-pad" />
              <Text style={{ color: theme.textMuted, marginTop: 5 }}>Durante la vigencia, cada unidad se venderá a {formatCurrency(Number(draft.fixedPrice) || 0)}.</Text>
            </View>
          ) : null}

          {draft.programType === 'minimum_spend_discount' ? (
            <View style={{ marginTop: 16, padding: 14, borderWidth: 1, borderColor: theme.border, borderRadius: 12, backgroundColor: theme.background }}>
              <Text style={{ color: theme.text, fontWeight: '800', fontSize: 16 }}>Descuento por compra mínima</Text>
              <Text style={labelStyle}>Subtotal mínimo de productos</Text>
              <TextInput value={draft.minimumOrderAmount} onChangeText={minimumOrderAmount => setDraft(current => ({ ...current, minimumOrderAmount }))} style={inputStyle} keyboardType="decimal-pad" />
              <Text style={labelStyle}>Tipo de descuento</Text>
              <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
                {([['percent','Porcentaje'],['fixed','Monto fijo']] as const).map(([value,label]) => {
                  const selected = draft.orderDiscountKind === value;
                  return (
                    <TouchableOpacity key={value} onPress={() => setDraft(current => ({ ...current, orderDiscountKind: value }))} style={{ flex: 1, padding: 11, borderRadius: 10, borderWidth: 1, borderColor: selected ? theme.primary : theme.border, backgroundColor: selected ? theme.primary : theme.surfaceAlt }}>
                      <Text style={{ color: selected ? theme.onPrimary : theme.text, textAlign: 'center', fontWeight: '700' }}>{label}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
              <Text style={labelStyle}>{draft.orderDiscountKind === 'percent' ? 'Porcentaje' : 'Monto a descontar'}</Text>
              <TextInput value={draft.orderDiscountValue} onChangeText={orderDiscountValue => setDraft(current => ({ ...current, orderDiscountValue }))} style={inputStyle} keyboardType="decimal-pad" />
              <Text style={{ color: theme.textMuted, marginTop: 5 }}>
                {draft.orderDiscountKind === 'percent'
                  ? `Ejemplo: ${draft.orderDiscountValue || '10'}% al comprar ${formatCurrency(Number(draft.minimumOrderAmount) || 0)}.`
                  : `Ejemplo: ${formatCurrency(Number(draft.orderDiscountValue) || 0)} de descuento al comprar ${formatCurrency(Number(draft.minimumOrderAmount) || 0)}.`}
              </Text>
            </View>
          ) : null}

          <View style={{ marginTop: 18, padding: 14, borderWidth: 1, borderColor: theme.border, borderRadius: 12, backgroundColor: theme.background }}>
            <Text style={{ color: theme.text, fontWeight: '800', fontSize: 16 }}>Vigencia</Text>
            <Text style={{ color: theme.textMuted, marginTop: 4, lineHeight: 18 }}>Déjalo sin fechas para que no expire. También puedes limitarla a días específicos de la semana.</Text>

            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 }}>
              {([
                [0,'Dom'],[1,'Lun'],[2,'Mar'],[3,'Mié'],[4,'Jue'],[5,'Vie'],[6,'Sáb'],
              ] as const).map(([day,label]) => {
                const selected = draft.activeWeekdays.includes(day);
                return (
                  <TouchableOpacity key={day} onPress={() => setDraft(current => ({ ...current, activeWeekdays: selected ? current.activeWeekdays.filter(value => value !== day) : [...current.activeWeekdays, day].sort() }))} style={{ minWidth: 54, paddingVertical: 9, paddingHorizontal: 10, borderRadius: 999, borderWidth: 1, borderColor: selected ? theme.primary : theme.border, backgroundColor: selected ? theme.primary : theme.surfaceAlt }}>
                    <Text style={{ color: selected ? theme.onPrimary : theme.text, textAlign: 'center', fontWeight: '700' }}>{label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 14 }}>
              <View style={{ flex: 1, minWidth: 180 }}>
                <DateCalendarField label="Desde (opcional)" value={draft.startsAt} allowClear onChange={startsAt => setDraft(current => ({ ...current, startsAt, endsAt: current.endsAt && startsAt && current.endsAt < startsAt ? startsAt : current.endsAt }))} />
              </View>
              <View style={{ flex: 1, minWidth: 180 }}>
                <DateCalendarField label="Hasta (opcional)" value={draft.endsAt} minimumDate={draft.startsAt || undefined} allowClear onChange={endsAt => setDraft(current => ({ ...current, endsAt }))} />
              </View>
            </View>
          </View>

          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 16 }}>
            <Text style={{ color: theme.text, fontWeight: '600' }}>Promoción activa</Text>
            <Switch value={draft.isEnabled} onValueChange={isEnabled => setDraft(current => ({ ...current, isEnabled }))} trackColor={{ false: theme.border, true: theme.primary }} />
          </View>

          <View style={{ flexDirection: 'row', gap: 10, marginTop: 18 }}>
            <TouchableOpacity disabled={isSaving} onPress={() => void handleSaveProgram()} style={{ flex: 1, backgroundColor: theme.primary, borderRadius: 10, padding: 12 }}>
              <Text style={{ color: theme.onPrimary, textAlign: 'center', fontWeight: '700' }}>{isSaving ? 'GUARDANDO...' : 'GUARDAR PROMOCIÓN'}</Text>
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

            <TouchableOpacity onPress={() => setProductSelectorMode('reward')} style={{ borderRadius: 10, borderWidth: 1, borderColor: theme.primary, padding: 12, marginTop: 12 }}>
              <Text style={{ color: theme.primary, textAlign: 'center', fontWeight: '700' }}>＋ AGREGAR PRODUCTO COMO PREMIO</Text>
            </TouchableOpacity>
          </View>
        )}

      </ScrollView>

      <Modal
        visible={productSelectorMode !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setProductSelectorMode(null)}
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
                  {productSelectorMode === 'quantity'
                    ? 'Selecciona el producto que tendrá la oferta por cantidad.'
                    : productSelectorMode === 'special'
                      ? 'Selecciona el producto que tendrá el precio especial.'
                      : 'Selecciona el producto que se entregará como premio.'}
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
                    onPress={() => {
                      if (
                        productSelectorMode === 'quantity' ||
                        productSelectorMode === 'special'
                      ) {
                        selectTargetProduct(
                          product,
                        );
                        return;
                      }

                      void addRewardForProduct(
                        product,
                      );
                    }}
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
                  onPress={() => setProductSelectorMode(null)}
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
                      setDraft(current => ({
                        ...current,
                        targetModifierId: option.id,
                      }));
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


    </>
  );
}
