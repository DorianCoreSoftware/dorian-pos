import React, {
  useEffect,
  useState,
} from 'react';

import {
  ActivityIndicator,
  Alert,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import {
  getInventoryCostingSettings,
  saveInventoryCostingSettings,
} from '../../../services/inventoryService';

import {
  styles,
} from './AdminInventory.styles';

export function InventoryCostingSettingsCard() {
  const [
    target,
    setTarget,
  ] =
    useState('35');

  const [
    rounding,
    setRounding,
  ] =
    useState('5');

  const [
    loading,
    setLoading,
  ] =
    useState(true);

  const [
    saving,
    setSaving,
  ] =
    useState(false);

  useEffect(
    () => {
      void (async () => {
        try {
          const settings =
            await getInventoryCostingSettings();

          setTarget(
            String(
              settings.targetFoodCostPercent,
            ),
          );

          setRounding(
            String(
              settings.roundingStep,
            ),
          );
        } catch (error) {
          Alert.alert(
            'Costeo',
            error instanceof Error
              ? error.message
              : 'No se pudo cargar la configuración.',
          );
        } finally {
          setLoading(false);
        }
      })();
    },
    [],
  );

  const save =
    async (): Promise<void> => {
      const targetValue =
        Number(target);

      const roundingValue =
        Number(rounding);

      if (
        !Number.isFinite(targetValue) ||
        targetValue <= 0 ||
        targetValue >= 100
      ) {
        Alert.alert(
          'Food cost inválido',
          'Usa un porcentaje mayor a 0 y menor a 100.',
        );
        return;
      }

      if (
        !Number.isFinite(roundingValue) ||
        roundingValue <= 0
      ) {
        Alert.alert(
          'Redondeo inválido',
          'El múltiplo de redondeo debe ser mayor a 0.',
        );
        return;
      }

      try {
        setSaving(true);

        await saveInventoryCostingSettings({
          targetFoodCostPercent:
            targetValue,
          roundingStep:
            roundingValue,
        });

        Alert.alert(
          'Costeo actualizado',
          'La configuración de precios recomendados fue guardada.',
        );
      } catch (error) {
        Alert.alert(
          'Error',
          error instanceof Error
            ? error.message
            : 'No se pudo guardar la configuración.',
        );
      } finally {
        setSaving(false);
      }
    };

  if (loading) {
    return (
      <View
        style={
          styles.costSettingsCard
        }
      >
        <ActivityIndicator
          size="small"
        />
      </View>
    );
  }

  return (
    <View
      style={
        styles.costSettingsCard
      }
    >
      <View
        style={
          styles.costSettingsHeader
        }
      >
        <View
          style={{
            flex: 1,
          }}
        >
          <Text
            style={
              styles.costSettingsTitle
            }
          >
            Configuración de costeo
          </Text>

          <Text
            style={
              styles.costSettingsSubtitle
            }
          >
            Define el food cost objetivo y el múltiplo usado para redondear precios recomendados.
          </Text>
        </View>
      </View>

      <View
        style={
          styles.costSettingsFields
        }
      >
        <View
          style={
            styles.costField
          }
        >
          <Text
            style={
              styles.label
            }
          >
            Food cost objetivo (%)
          </Text>

          <TextInput
            style={
              styles.input
            }
            keyboardType="decimal-pad"
            value={
              target
            }
            onChangeText={
              value =>
                setTarget(
                  value.replace(
                    ',',
                    '.',
                  ),
                )
            }
          />
        </View>

        <View
          style={
            styles.costField
          }
        >
          <Text
            style={
              styles.label
            }
          >
            Redondear a múltiplos de
          </Text>

          <TextInput
            style={
              styles.input
            }
            keyboardType="decimal-pad"
            value={
              rounding
            }
            onChangeText={
              value =>
                setRounding(
                  value.replace(
                    ',',
                    '.',
                  ),
                )
            }
          />
        </View>

        <TouchableOpacity
          style={[
            styles.primaryButton,
            saving &&
            styles.disabled,
          ]}
          disabled={
            saving
          }
          onPress={
            () => {
              void save();
            }
          }
        >
          <Text
            style={
              styles.primaryButtonText
            }
          >
            Guardar costeo
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
