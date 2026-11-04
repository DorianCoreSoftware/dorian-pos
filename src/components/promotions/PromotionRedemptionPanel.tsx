import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { useBusiness } from '../../context/BusinessContext';
import { useCurrency } from '../../hooks/useCurrency';
import { RewardOrderLinkModal } from '../rewards/RewardOrderLinkModal';
import {
  PromotionProgram,
  redeemPromotionCodes,
  redeemRefundPromotion,
} from '../../services/promoService';

interface PromotionRedemptionPanelProps {
  programs: PromotionProgram[];
  onRefundRedeemed: () => Promise<void>;
}

export function PromotionRedemptionPanel({
  programs,
  onRefundRedeemed,
}: PromotionRedemptionPanelProps) {
  const { theme } = useBusiness();
  const { formatCurrency } = useCurrency();
  const enabledPrograms = useMemo(
    () =>
      programs.filter(
        program =>
          program.isEnabled &&
          (
            program.programType === 'collect_reward' ||
            program.programType === 'order_refund'
          ),
      ),
    [programs],
  );

  const [selectedProgramId, setSelectedProgramId] = useState<string | null>(
    enabledPrograms[0]?.id ?? null,
  );
  const [codes, setCodes] = useState<string[]>([]);
  const [singleCode, setSingleCode] = useState('');
  const [selectedRewardId, setSelectedRewardId] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [orderLinkVisible, setOrderLinkVisible] = useState(false);

  const selectedProgram = useMemo(
    () => enabledPrograms.find(program => program.id === selectedProgramId) ?? enabledPrograms[0] ?? null,
    [enabledPrograms, selectedProgramId],
  );

  useEffect(() => {
    if (!selectedProgram) {
      setCodes([]);
      setSingleCode('');
      setSelectedRewardId(null);
      return;
    }

    if (selectedProgram.programType === 'collect_reward') {
      const required = selectedProgram.requiredCoupons ?? 0;
      setCodes(Array.from({ length: required }, () => selectedProgram.codePrefix));
      setSelectedRewardId(selectedProgram.rewards[0]?.id ?? null);
      setSingleCode('');
    } else {
      setSingleCode(selectedProgram.codePrefix);
      setCodes([]);
      setSelectedRewardId(null);
    }
  }, [selectedProgram?.id]);

  if (!selectedProgram) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <Text style={{ color: theme.textMuted }}>No hay programas de promoción activos.</Text>
      </View>
    );
  }

  const inputStyle = {
    borderWidth: 1,
    borderColor: theme.border,
    backgroundColor: theme.surfaceAlt,
    color: theme.text,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  } as const;

  const normalizeCodeInput = (value: string) => {
    const prefix = selectedProgram.codePrefix.toUpperCase().replace(/\s/g, '');
    const normalized = value.toUpperCase().replace(/\s/g, '');

    if (!prefix) {
      return normalized;
    }

    if (normalized.startsWith(prefix)) {
      return normalized;
    }

    // Si el usuario intenta borrar parte del prefijo, lo restauramos.
    if (prefix.startsWith(normalized)) {
      return prefix;
    }

    return `${prefix}${normalized}`;
  };

  const updateCode = (index: number, value: string) => {
    const normalized = normalizeCodeInput(value);
    setCodes(current => current.map((code, currentIndex) => currentIndex === index ? normalized : code));
  };

  const hasCodeSuffix = (value: string) => {
    const prefix = selectedProgram.codePrefix.toUpperCase().replace(/\s/g, '');
    const normalized = value.toUpperCase().replace(/\s/g, '');
    return normalized.length > prefix.length;
  };

  const collectCodesComplete =
    codes.length > 0 && codes.every(hasCodeSuffix);

  const executeCollectRedemption = async (orderId: string | null) => {
    if (!selectedRewardId) {
      Alert.alert('Premio requerido', 'Selecciona un premio para continuar.');
      return;
    }

    try {
      setIsProcessing(true);
      await redeemPromotionCodes({
        program: selectedProgram,
        codes,
        rewardId: selectedRewardId,
        orderId,
      });

      const reward = selectedProgram.rewards.find(item => item.id === selectedRewardId);
      setCodes(Array.from({ length: selectedProgram.requiredCoupons ?? 0 }, () => selectedProgram.codePrefix));
      setOrderLinkVisible(false);
      Alert.alert(
        '✅ Canje realizado',
        `${reward?.displayName ?? 'Premio'} enviado a Cocina${orderId ? ' y vinculado a la orden seleccionada' : ' como canje independiente'}.`,
      );
    } catch (error) {
      Alert.alert('No se pudo realizar el canje', error instanceof Error ? error.message : 'Error desconocido.');
    } finally {
      setIsProcessing(false);
    }
  };

  const executeRefundRedemption = async () => {
    try {
      setIsProcessing(true);
      const result = await redeemRefundPromotion(selectedProgram, singleCode);
      setSingleCode(selectedProgram.codePrefix);
      await onRefundRedeemed();

      Alert.alert(
        '✅ Promoción aplicada',
        [
          `Monto: ${formatCurrency(result.amount)}`,
          `Forma de devolución: ${result.paymentMethod === 'cash' ? 'EFECTIVO' : result.paymentMethod === 'card' ? 'TARJETA' : 'TRANSFERENCIA'}`,
        ].join('\n'),
      );
    } catch (error) {
      Alert.alert('No se pudo aplicar la promoción', error instanceof Error ? error.message : 'Error desconocido.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <>
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={{ padding: 18 }}
      keyboardShouldPersistTaps="handled"
    >
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
        {enabledPrograms.map(program => {
          const active = program.id === selectedProgram.id;
          return (
            <TouchableOpacity
              key={program.id}
              onPress={() => setSelectedProgramId(program.id)}
              style={{
                paddingHorizontal: 12,
                paddingVertical: 8,
                borderRadius: 999,
                borderWidth: 1,
                borderColor: active ? theme.primary : theme.border,
                backgroundColor: active ? theme.primary : theme.surface,
              }}
            >
              <Text style={{ color: active ? theme.onPrimary : theme.text }}>{program.displayName}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <View style={{ backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.border, borderRadius: 14, padding: 18 }}>
        <Text style={{ color: theme.text, fontSize: 23, fontWeight: '800' }}>{selectedProgram.displayName}</Text>
        <Text style={{ color: theme.textMuted, marginTop: 4, marginBottom: 16 }}>
          {selectedProgram.programType === 'collect_reward'
            ? `Ingresa ${selectedProgram.requiredCoupons ?? 0} códigos válidos para realizar el canje.`
            : 'Ingresa el código promocional presentado por el cliente.'}
        </Text>

        {selectedProgram.programType === 'collect_reward' ? (
          <>
            <View style={{ gap: 10 }}>
              {codes.map((code, index) => (
                <View key={index}>
                  <Text style={{ color: theme.text, fontWeight: '600', marginBottom: 5 }}>Código {index + 1}</Text>
                  <TextInput
                    value={code}
                    onChangeText={value => updateCode(index, value)}
                    style={inputStyle}
                    autoCapitalize="characters"
                    autoCorrect={false}
                    placeholder={`${selectedProgram.codePrefix}...`}
                    placeholderTextColor={theme.textMuted}
                    editable={!isProcessing}
                  />
                </View>
              ))}
            </View>

            <Text style={{ color: theme.text, fontSize: 18, fontWeight: '700', marginTop: 20, marginBottom: 8 }}>Premio</Text>
            <View style={{ gap: 8 }}>
              {selectedProgram.rewards.map(reward => {
                const selected = reward.id === selectedRewardId;
                return (
                  <TouchableOpacity
                    key={reward.id}
                    onPress={() => setSelectedRewardId(reward.id)}
                    disabled={isProcessing}
                    style={{
                      padding: 12,
                      borderRadius: 10,
                      borderWidth: 1,
                      borderColor: selected ? theme.primary : theme.border,
                      backgroundColor: selected ? theme.primary : theme.surfaceAlt,
                    }}
                  >
                    <Text style={{ color: selected ? theme.onPrimary : theme.text }}>{reward.displayName}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <TouchableOpacity
              disabled={isProcessing || selectedProgram.rewards.length === 0 || !collectCodesComplete}
              onPress={() => setOrderLinkVisible(true)}
              style={{ backgroundColor: theme.primary, opacity: isProcessing || selectedProgram.rewards.length === 0 || !collectCodesComplete ? 0.5 : 1, borderRadius: 10, padding: 13, marginTop: 20 }}
            >
              <Text style={{ color: theme.onPrimary, textAlign: 'center', fontWeight: '800' }}>
                {isProcessing ? 'VALIDANDO...' : 'VALIDAR Y CANJEAR'}
              </Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <TextInput
              value={singleCode}
              onChangeText={value => setSingleCode(normalizeCodeInput(value))}
              style={inputStyle}
              autoCapitalize="characters"
              autoCorrect={false}
              placeholder={`${selectedProgram.codePrefix}...`}
              placeholderTextColor={theme.textMuted}
              editable={!isProcessing}
            />

            <View style={{ backgroundColor: theme.surfaceAlt, borderRadius: 10, padding: 12, marginTop: 14 }}>
              <Text style={{ color: theme.textMuted }}>
                Al validar el código, el sistema consulta la compra original y registra el reembolso en la caja abierta.
              </Text>
            </View>

            <TouchableOpacity
              disabled={isProcessing || !hasCodeSuffix(singleCode)}
              onPress={() => void executeRefundRedemption()}
              style={{ backgroundColor: theme.primary, opacity: isProcessing || !hasCodeSuffix(singleCode) ? 0.5 : 1, borderRadius: 10, padding: 13, marginTop: 20 }}
            >
              <Text style={{ color: theme.onPrimary, textAlign: 'center', fontWeight: '800' }}>
                {isProcessing ? 'VALIDANDO...' : 'VALIDAR PROMOCIÓN'}
              </Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </ScrollView>

      <RewardOrderLinkModal
        visible={orderLinkVisible}
        rewardName={
          selectedProgram.rewards.find(reward => reward.id === selectedRewardId)?.displayName ??
          'Premio'
        }
        isProcessing={isProcessing}
        onClose={() => setOrderLinkVisible(false)}
        onSelect={orderId => {
          void executeCollectRedemption(orderId);
        }}
      />
    </>
  );
}
