import React, {
  useState,
} from 'react';

import {
  ActivityIndicator,
  Alert,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import {
  useBusiness,
} from '../../../context/BusinessContext';

import {
  downloadMenuPdf,
  previewMenuPdf,
} from '../../../services/menuPdfService';

export function AdminMenuPdf() {
  const {
    business,
    theme,
  } = useBusiness();

  const [
    action,
    setAction,
  ] = useState<
    'preview' | 'download' | null
  >(null);

  const isBusy =
    action !==
    null;

  async function runAction(
    nextAction:
      'preview' | 'download',
  ): Promise<void> {
    if (
      !business ||
      isBusy
    ) {
      return;
    }

    try {
      setAction(
        nextAction,
      );

      if (
        nextAction ===
        'preview'
      ) {
        await previewMenuPdf(
          business,
        );
      } else {
        await downloadMenuPdf(
          business,
        );
      }
    } catch (
    error
    ) {
      console.error(
        'Error generando menú PDF:',
        error,
      );

      Alert.alert(
        'No se pudo generar el menú',
        error instanceof Error
          ? error.message
          : 'Ocurrió un error al preparar el PDF.',
      );
    } finally {
      setAction(
        null,
      );
    }
  }

  return (
    <View
      style={{
        gap: 14,
      }}
    >
      <View>
        <Text
          style={{
            color:
              theme.text,
            fontSize:
              22,
            fontWeight:
              '900',
          }}
        >
          Menú PDF
        </Text>

        <Text
          style={{
            color:
              theme.textMuted,
            fontSize:
              12,
            marginTop:
              5,
            lineHeight:
              18,
          }}
        >
          Genera un menú descargable utilizando los productos, precios, categorías y opciones activas de Dorian POS.
        </Text>
      </View>

      <View
        style={{
          borderWidth:
            1,
          borderColor:
            theme.border,
          borderRadius:
            14,
          backgroundColor:
            theme.surface,
          padding:
            16,
          gap:
            12,
        }}
      >
        <Text
          style={{
            color:
              theme.text,
            fontSize:
              15,
            fontWeight:
              '900',
          }}
        >
          Menú dinámico
        </Text>

        <Text
          style={{
            color:
              theme.textMuted,
            fontSize:
              11,
            lineHeight:
              17,
          }}
        >
          El PDF se genera en el momento. Los cambios futuros de precios, productos y categorías se reflejarán automáticamente en la siguiente descarga.
        </Text>

        <View
          style={{
            borderWidth:
              1,
            borderColor:
              theme.border,
            borderRadius:
              10,
            padding:
              12,
            backgroundColor:
              theme.background,
          }}
        >
          <Text
            style={{
              color:
                theme.text,
              fontSize:
                11,
              fontWeight:
                '800',
            }}
          >
            Incluye
          </Text>

          <Text
            style={{
              color:
                theme.textMuted,
              fontSize:
                10,
              lineHeight:
                16,
              marginTop:
                5,
            }}
          >
            • Categorías activas{'\n'}
            • Productos activos, incluso si hoy están temporalmente agotados{'\n'}
            • Nombre, precio y descripción{'\n'}
            • Opciones relevantes del producto{'\n'}
            • Grupos largos compartidos, como Salsa, sin repetirlos producto por producto{'\n'}
            • Personalización incluida por categoría
          </Text>
        </View>

        <View
          style={{
            flexDirection:
              'row',
            flexWrap:
              'wrap',
            gap:
              10,
          }}
        >
          <TouchableOpacity
            disabled={
              !business ||
              isBusy
            }
            onPress={() =>
              void runAction(
                'preview',
              )
            }
            style={{
              minHeight:
                46,
              flexGrow:
                1,
              minWidth:
                160,
              borderRadius:
                10,
              borderWidth:
                1,
              borderColor:
                theme.primary,
              alignItems:
                'center',
              justifyContent:
                'center',
              paddingHorizontal:
                14,
              opacity:
                !business ||
                isBusy
                  ? 0.55
                  : 1,
            }}
          >
            {action ===
            'preview' ? (
              <ActivityIndicator
                size="small"
                color={
                  theme.primary
                }
              />
            ) : (
              <Text
                style={{
                  color:
                    theme.primary,
                  fontSize:
                    12,
                  fontWeight:
                    '900',
                }}
              >
                👁 Vista previa
              </Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            disabled={
              !business ||
              isBusy
            }
            onPress={() =>
              void runAction(
                'download',
              )
            }
            style={{
              minHeight:
                46,
              flexGrow:
                1,
              minWidth:
                160,
              borderRadius:
                10,
              backgroundColor:
                theme.primary,
              alignItems:
                'center',
              justifyContent:
                'center',
              paddingHorizontal:
                14,
              opacity:
                !business ||
                isBusy
                  ? 0.55
                  : 1,
            }}
          >
            {action ===
            'download' ? (
              <ActivityIndicator
                size="small"
                color={
                  theme.onPrimary
                }
              />
            ) : (
              <Text
                style={{
                  color:
                    theme.onPrimary,
                  fontSize:
                    12,
                  fontWeight:
                    '900',
                }}
              >
                📄 Descargar PDF
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}
