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
  useBusiness,
} from '../../../context/BusinessContext';

import {
  getRefundSettings,
  RefundSettings,
  updateRefundSettings,
} from '../../../services/refundService';

export function AdminRefundSettings() {
  const {
    theme,
  } = useBusiness();

  const [
    settings,
    setSettings,
  ] = useState<RefundSettings | null>(
    null,
  );

  const [
    maxHoursText,
    setMaxHoursText,
  ] = useState('');

  const [
    isLoading,
    setIsLoading,
  ] = useState(true);

  const [
    isSaving,
    setIsSaving,
  ] = useState(false);

  const loadSettings =
    async (): Promise<void> => {
      try {
        setIsLoading(true);

        const data =
          await getRefundSettings();

        setSettings(data);

        setMaxHoursText(
          String(data.maxHours),
        );
      } catch (error) {
        Alert.alert(
          'Error',
          error instanceof Error
            ? error.message
            : 'No se pudo cargar la política de devoluciones.',
        );
      } finally {
        setIsLoading(false);
      }
    };

  useEffect(() => {
    void loadSettings();
  }, []);

  const updateBoolean =
    (
      key:
        | 'enabled'
        | 'allowPartial'
        | 'requireReason'
        | 'requireNotes'
        | 'allowPolicyExceptions',
      value: boolean,
    ): void => {
      setSettings(
        current =>
          current
            ? {
                ...current,
                [key]:
                  value,
              }
            : current,
      );
    };

  const handleSave =
    async (): Promise<void> => {
      if (!settings) {
        return;
      }

      const maxHours =
        Number(maxHoursText);

      if (
        !Number.isInteger(
          maxHours,
        ) ||
        maxHours < 0 ||
        maxHours > 8760
      ) {
        Alert.alert(
          'Dato inválido',
          'Las horas máximas deben ser un entero entre 0 y 8760. Usa 0 para no limitar por tiempo.',
        );

        return;
      }

      try {
        setIsSaving(true);

        await updateRefundSettings({
          ...settings,
          maxHours,
        });

        setSettings({
          ...settings,
          maxHours,
        });

        Alert.alert(
          'Guardado',
          'La política de devoluciones se actualizó correctamente.',
        );
      } catch (error) {
        Alert.alert(
          'Error',
          error instanceof Error
            ? error.message
            : 'No se pudo guardar la política de devoluciones.',
        );
      } finally {
        setIsSaving(false);
      }
    };

  if (isLoading) {
    return (
      <View
        style={{
          minHeight: 220,
          alignItems:
            'center',
          justifyContent:
            'center',
        }}
      >
        <ActivityIndicator
          size="large"
          color={
            theme.primary
          }
        />
      </View>
    );
  }

  if (!settings) {
    return (
      <View
        style={{
          padding: 24,
        }}
      >
        <Text
          style={{
            color:
              theme.text,
            fontSize: 16,
            fontWeight:
              '700',
          }}
        >
          No se pudo cargar la configuración.
        </Text>

        <TouchableOpacity
          onPress={() =>
            void loadSettings()
          }
          style={{
            marginTop: 16,
            alignSelf:
              'flex-start',
            paddingHorizontal:
              18,
            paddingVertical:
              11,
            borderRadius: 10,
            backgroundColor:
              theme.primary,
          }}
        >
          <Text
            style={{
              color: '#FFFFFF',
              fontWeight:
                '800',
            }}
          >
            REINTENTAR
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  const rows: Array<{
    key:
      | 'enabled'
      | 'allowPartial'
      | 'requireReason'
      | 'requireNotes'
      | 'allowPolicyExceptions';
    title: string;
    description: string;
  }> = [
    {
      key:
        'enabled',
      title:
        'Devoluciones activas',
      description:
        'Permite realizar devoluciones desde Ventas.',
    },
    {
      key:
        'allowPartial',
      title:
        'Permitir devoluciones parciales',
      description:
        'Permite devolver solo algunos productos o cantidades.',
    },
    {
      key:
        'requireReason',
      title:
        'Motivo obligatorio',
      description:
        'Exige seleccionar o escribir un motivo para registrar la devolución.',
    },
    {
      key:
        'requireNotes',
      title:
        'Notas obligatorias',
      description:
        'Exige capturar observaciones adicionales antes de confirmar.',
    },
    {
      key:
        'allowPolicyExceptions',
      title:
        'Permitir excepciones de política',
      description:
        'Permite que un administrador autorice una devolución fuera del plazo permitido.',
    },
  ];

  return (
    <ScrollView
      contentContainerStyle={{
        paddingBottom: 40,
      }}
      showsVerticalScrollIndicator
    >
      <View
        style={{
          padding: 20,
          borderRadius: 16,
          borderWidth: 1,
          borderColor:
            theme.border,
          backgroundColor:
            theme.surface,
        }}
      >
        <Text
          style={{
            color:
              theme.text,
            fontSize: 22,
            fontWeight:
              '900',
          }}
        >
          Política de devoluciones
        </Text>

        <Text
          style={{
            marginTop: 6,
            color:
              theme.textMuted,
            fontSize: 13,
            lineHeight: 19,
          }}
        >
          Configura las reglas que se aplican al registrar devoluciones en este negocio.
        </Text>

        <View
          style={{
            marginTop: 22,
          }}
        >
          <Text
            style={{
              color:
                theme.text,
              fontSize: 14,
              fontWeight:
                '800',
            }}
          >
            Plazo máximo
          </Text>

          <Text
            style={{
              marginTop: 4,
              color:
                theme.textMuted,
              fontSize: 12,
              lineHeight: 18,
            }}
          >
            Horas disponibles desde el pago para realizar una devolución. Usa 0 para no limitar por tiempo.
          </Text>

          <TextInput
            value={
              maxHoursText
            }
            onChangeText={
              setMaxHoursText
            }
            keyboardType="number-pad"
            placeholder="24"
            placeholderTextColor={
              theme.textMuted
            }
            style={{
              marginTop: 10,
              maxWidth: 220,
              borderWidth: 1,
              borderColor:
                theme.border,
              borderRadius: 10,
              paddingHorizontal:
                12,
              paddingVertical:
                10,
              color:
                theme.text,
              backgroundColor:
                theme.surfaceAlt,
              fontSize: 15,
              fontWeight:
                '700',
            }}
          />
        </View>

        <View
          style={{
            marginTop: 24,
            gap: 12,
          }}
        >
          {rows.map(
            row => (
              <View
                key={
                  row.key
                }
                style={{
                  padding: 14,
                  borderWidth: 1,
                  borderColor:
                    theme.border,
                  borderRadius: 12,
                  backgroundColor:
                    theme.surfaceAlt,
                  flexDirection:
                    'row',
                  alignItems:
                    'center',
                  justifyContent:
                    'space-between',
                  gap: 16,
                }}
              >
                <View
                  style={{
                    flex: 1,
                  }}
                >
                  <Text
                    style={{
                      color:
                        theme.text,
                      fontSize: 14,
                      fontWeight:
                        '800',
                    }}
                  >
                    {row.title}
                  </Text>

                  <Text
                    style={{
                      marginTop: 4,
                      color:
                        theme.textMuted,
                      fontSize: 12,
                      lineHeight: 17,
                    }}
                  >
                    {row.description}
                  </Text>
                </View>

                <Switch
                  value={
                    settings[
                      row.key
                    ]
                  }
                  onValueChange={
                    value =>
                      updateBoolean(
                        row.key,
                        value,
                      )
                  }
                  trackColor={{
                    false:
                      theme.border,
                    true:
                      theme.primary,
                  }}
                />
              </View>
            ),
          )}
        </View>

        <TouchableOpacity
          disabled={
            isSaving
          }
          onPress={() =>
            void handleSave()
          }
          activeOpacity={0.85}
          style={{
            marginTop: 24,
            alignSelf:
              'flex-start',
            minWidth: 180,
            paddingHorizontal:
              22,
            paddingVertical:
              13,
            borderRadius: 11,
            alignItems:
              'center',
            backgroundColor:
              theme.primary,
            opacity:
              isSaving
                ? 0.65
                : 1,
          }}
        >
          <Text
            style={{
              color: '#FFFFFF',
              fontWeight:
                '900',
              fontSize: 13,
            }}
          >
            {isSaving
              ? 'GUARDANDO...'
              : 'GUARDAR POLÍTICA'}
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}
