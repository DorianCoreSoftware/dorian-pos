import React, {
  useEffect,
  useState,
} from 'react';

import {
  ActivityIndicator,
  Alert,
  ScrollView,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import {
  getPromotionSettings,
  PromotionSettings,
  updatePromotionSettings,
} from '../../../services/promotionService';

import {
  styles,
} from './AdminPromotions.styles';

export function AdminPromotions() {
  const [
    settings,
    setSettings,
  ] = useState<
    PromotionSettings | null
  >(null);

  const [
    kongEnabled,
    setKongEnabled,
  ] = useState(true);

  const [
    requiredKongs,
    setRequiredKongs,
  ] = useState('5');

  const [
    luckyDorianEnabled,
    setLuckyDorianEnabled,
  ] = useState(true);

  const [
    luckyDorianChance,
    setLuckyDorianChance,
  ] = useState('0');

  const [
    isLoading,
    setIsLoading,
  ] = useState(true);

  const [
    isSaving,
    setIsSaving,
  ] = useState(false);

  const [
    errorMessage,
    setErrorMessage,
  ] = useState<
    string | null
  >(null);

  useEffect(() => {
    const loadSettings =
      async () => {
        try {
          setIsLoading(
            true,
          );

          setErrorMessage(
            null,
          );

          const data =
            await getPromotionSettings();

          setSettings(
            data,
          );

          setKongEnabled(
            data.kong_enabled,
          );

          setRequiredKongs(
            String(
              data.required_kongs,
            ),
          );

          setLuckyDorianEnabled(
            data.lucky_dorian_enabled,
          );

          setLuckyDorianChance(
            String(
              data.lucky_dorian_chance,
            ),
          );
        } catch (error) {
          console.error(
            'Error loading promotion settings:',
            error,
          );

          setErrorMessage(
            error instanceof Error
              ? error.message
              : 'No se pudo cargar la configuración de promociones.',
          );
        } finally {
          setIsLoading(
            false,
          );
        }
      };

    void loadSettings();
  }, []);

  const handleSave =
    async () => {
      if (!settings) {
        return;
      }

      const parsedRequiredKongs =
        Number(
          requiredKongs,
        );

      const parsedDorianChance =
        Number(
          luckyDorianChance,
        );

      if (
        !Number.isInteger(
          parsedRequiredKongs,
        ) ||
        parsedRequiredKongs <
        1
      ) {
        Alert.alert(
          'Dato inválido',
          'La cantidad de Kongs requeridos debe ser un número entero mayor a 0.',
        );

        return;
      }

      if (
        !Number.isInteger(
          parsedDorianChance,
        ) ||
        parsedDorianChance <
        0 ||
        parsedDorianChance >
        100
      ) {
        Alert.alert(
          'Dato inválido',
          'La probabilidad de Dorian debe ser un número entero entre 0 y 100.',
        );

        return;
      }

      try {
        setIsSaving(
          true,
        );

        await updatePromotionSettings(
          settings.id,
          {
            kong_enabled:
              kongEnabled,

            required_kongs:
              parsedRequiredKongs,

            lucky_dorian_enabled:
              luckyDorianEnabled,

            lucky_dorian_chance:
              parsedDorianChance,
          },
        );

        setSettings({
          ...settings,

          kong_enabled:
            kongEnabled,

          required_kongs:
            parsedRequiredKongs,

          lucky_dorian_enabled:
            luckyDorianEnabled,

          lucky_dorian_chance:
            parsedDorianChance,
        });

        Alert.alert(
          'Promociones',
          'La configuración se guardó correctamente.',
        );
      } catch (error) {
        console.error(
          'Error saving promotion settings:',
          error,
        );

        Alert.alert(
          'Error',
          'No se pudo guardar la configuración de promociones.',
        );
      } finally {
        setIsSaving(
          false,
        );
      }
    };

  if (isLoading) {
    return (
      <View
        style={
          styles.loadingContainer
        }
      >
        <ActivityIndicator
          size="large"
        />

        <Text
          style={
            styles.loadingText
          }
        >
          Cargando promociones...
        </Text>
      </View>
    );
  }

  if (
    errorMessage ||
    !settings
  ) {
    return (
      <View
        style={
          styles.errorContainer
        }
      >
        <Text
          style={
            styles.errorTitle
          }
        >
          No se pudieron cargar
          las promociones
        </Text>

        <Text
          style={
            styles.errorText
          }
        >
          {errorMessage ??
            'No existe una configuración activa.'}
        </Text>
      </View>
    );
  }

  return (
  <ScrollView
    style={
      styles.container
    }
    contentContainerStyle={
      styles.scrollContent
    }
    showsVerticalScrollIndicator={
      true
    }
    keyboardShouldPersistTaps="handled"
  >
      <View
        style={
          styles.header
        }
      >
        <Text
          style={
            styles.title
          }
        >
          Promociones
        </Text>

        <Text
          style={
            styles.subtitle
          }
        >
          Activa, desactiva y configura
          las promociones del punto de venta.
        </Text>
      </View>

      {/* KONGS */}
      <View
        style={
          styles.card
        }
      >
        <View
          style={
            styles.cardHeader
          }
        >
          <View
            style={
              styles.cardHeaderText
            }
          >
            <Text
              style={
                styles.cardTitle
              }
            >
              Kongs
            </Text>

            <Text
              style={
                styles.cardDescription
              }
            >
              Controla la acumulación y canje
              de cupones Kong.
            </Text>
          </View>

          <Switch
            value={
              kongEnabled
            }
            onValueChange={
              setKongEnabled
            }
            trackColor={{
              false:
                '#444444',
              true:
                '#8A6A00',
            }}
            thumbColor={
              kongEnabled
                ? '#FFBF00'
                : '#888888'
            }
          />
        </View>

        <View
          style={
            styles.fieldContainer
          }
        >
          <Text
            style={
              styles.fieldLabel
            }
          >
            Kongs necesarios para premio
          </Text>

          <TextInput
            value={
              requiredKongs
            }
            onChangeText={
              setRequiredKongs
            }
            keyboardType="number-pad"
            editable={
              kongEnabled
            }
            maxLength={2}
            style={[
              styles.input,

              !kongEnabled &&
              styles.inputDisabled,
            ]}
          />

          <Text
            style={
              styles.fieldHelp
            }
          >
            Actualmente el cliente necesita
            {` ${requiredKongs || '0'} `}
            cupones Kong para completar la promoción.
          </Text>
        </View>
      </View>

      {/* DORIAN */}
      <View
        style={
          styles.card
        }
      >
        <View
          style={
            styles.cardHeader
          }
        >
          <View
            style={
              styles.cardHeaderText
            }
          >
            <Text
              style={
                styles.cardTitle
              }
            >
              Dorian de la Suerte
            </Text>

            <Text
              style={
                styles.cardDescription
              }
            >
              Controla si las ventas pueden
              generar un Dorian de la Suerte.
            </Text>
          </View>

          <Switch
            value={
              luckyDorianEnabled
            }
            onValueChange={
              setLuckyDorianEnabled
            }
            trackColor={{
              false:
                '#444444',
              true:
                '#8A6A00',
            }}
            thumbColor={
              luckyDorianEnabled
                ? '#FFBF00'
                : '#888888'
            }
          />
        </View>

        <View
          style={
            styles.fieldContainer
          }
        >
          <Text
            style={
              styles.fieldLabel
            }
          >
            Probabilidad
          </Text>

          <View
            style={
              styles.percentageRow
            }
          >
            <TextInput
              value={
                luckyDorianChance
              }
              onChangeText={
                setLuckyDorianChance
              }
              keyboardType="number-pad"
              editable={
                luckyDorianEnabled
              }
              maxLength={3}
              style={[
                styles.input,
                styles.percentageInput,

                !luckyDorianEnabled &&
                styles.inputDisabled,
              ]}
            />

            <Text
              style={
                styles.percentageSymbol
              }
            >
              %
            </Text>
          </View>

          <Text
            style={
              styles.fieldHelp
            }
          >
            Debe ser un valor entre 0 y 100.
          </Text>
        </View>
      </View>

      {/* SALSA DE LA SEMANA */}
      <View
        style={[
          styles.card,
          styles.comingSoonCard,
        ]}
      >
        <View
          style={
            styles.cardHeaderText
          }
        >
          <Text
            style={
              styles.cardTitle
            }
          >
            Salsa de la Semana
          </Text>

          <Text
            style={
              styles.cardDescription
            }
          >
            Esta promoción usará las estadísticas
            de rotación para favorecer salsas
            con menor salida.
          </Text>

          <View
            style={
              styles.comingSoonBadge
            }
          >
            <Text
              style={
                styles.comingSoonText
              }
            >
              PRÓXIMAMENTE
            </Text>
          </View>
        </View>
      </View>

      <TouchableOpacity
        style={[
          styles.saveButton,

          isSaving &&
          styles.saveButtonDisabled,
        ]}
        disabled={
          isSaving
        }
        onPress={
          handleSave
        }
      >
        <Text
          style={
            styles.saveButtonText
          }
        >
          {isSaving
            ? 'GUARDANDO...'
            : 'GUARDAR CONFIGURACIÓN'}
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
}