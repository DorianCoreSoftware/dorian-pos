import React, {
  useCallback,
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
  downloadMenuPdf,
  previewMenuPdf,
} from '../../../services/menuPdfService';

import {
  getMenuPdfCategoryOrder,
  getMenuPdfSettings,
  MenuPdfSettings,
  saveMenuPdfCategoryOrder,
  saveMenuPdfSettings,
} from '../../../services/menuPdfSettingsService';

import {
  getActiveCategories,
} from '../../../services/categoryService';

import {
  Category,
} from '../../../types';

const DEFAULT_SETTINGS:
  MenuPdfSettings = {
    showDescriptions: true,
    showUnavailableProducts: true,
    showUpdatedDate: true,
    showLogo: true,
    qrEnabled: false,
    qrUrl: '',
    qrLabel: 'Escanea para ordenar',
  };

export function AdminMenuPdf() {
  const {
    business,
    theme,
  } = useBusiness();

  const [
    action,
    setAction,
  ] = useState<
    'preview' |
    'download' |
    'save' |
    null
  >(null);

  const [
    settings,
    setSettings,
  ] =
    useState<MenuPdfSettings>(
      DEFAULT_SETTINGS,
    );

  const [
    categories,
    setCategories,
  ] =
    useState<Category[]>(
      [],
    );

  const [
    isLoading,
    setIsLoading,
  ] = useState(
    true,
  );

  const isBusy =
    action !==
      null ||
    isLoading;

  const load =
    useCallback(
      async (): Promise<void> => {
        try {
          setIsLoading(
            true,
          );

          const [
            loadedSettings,
            activeCategories,
            order,
          ] =
            await Promise.all([
              getMenuPdfSettings(),
              getActiveCategories(),
              getMenuPdfCategoryOrder(),
            ]);

          const positions =
            new Map(
              order.map(
                item => [
                  item.categoryId,
                  item.position,
                ],
              ),
            );

          setSettings(
            loadedSettings,
          );

          setCategories(
            activeCategories
              .filter(
                category =>
                  category.is_active ===
                  true,
              )
              .sort(
                (
                  left,
                  right,
                ) => {
                  const leftPosition =
                    positions.get(
                      left.id,
                    );

                  const rightPosition =
                    positions.get(
                      right.id,
                    );

                  if (
                    leftPosition !==
                      undefined ||
                    rightPosition !==
                      undefined
                  ) {
                    return (
                      (
                        leftPosition ??
                        Number.MAX_SAFE_INTEGER
                      ) -
                      (
                        rightPosition ??
                        Number.MAX_SAFE_INTEGER
                      )
                    );
                  }

                  return left.name.localeCompare(
                    right.name,
                    'es',
                    {
                      sensitivity:
                        'base',
                    },
                  );
                },
              ),
          );
        } catch (
        error
        ) {
          Alert.alert(
            'No se pudo cargar Menú PDF',
            error instanceof Error
              ? error.message
              : 'Ocurrió un error al cargar la configuración.',
          );
        } finally {
          setIsLoading(
            false,
          );
        }
      },
      [],
    );

  useEffect(
    () => {
      void load();
    },
    [
      load,
    ],
  );

  function patchSettings(
    patch:
      Partial<MenuPdfSettings>,
  ): void {
    setSettings(
      current => ({
        ...current,
        ...patch,
      }),
    );
  }

  function moveCategory(
    index:
      number,
    direction:
      -1 | 1,
  ): void {
    const targetIndex =
      index +
      direction;

    if (
      targetIndex <
        0 ||
      targetIndex >=
        categories.length
    ) {
      return;
    }

    setCategories(
      current => {
        const next =
          [
            ...current,
          ];

        const temporary =
          next[index];

        next[index] =
          next[
            targetIndex
          ];

        next[targetIndex] =
          temporary;

        return next;
      },
    );
  }

  async function handleSave():
    Promise<void> {
    if (isBusy) {
      return;
    }

    if (
      settings.qrEnabled &&
      !settings.qrUrl.trim()
    ) {
      Alert.alert(
        'Falta enlace del QR',
        'Escribe la URL que debe abrir el código QR.',
      );

      return;
    }

    try {
      setAction(
        'save',
      );

      await Promise.all([
        saveMenuPdfSettings(
          settings,
        ),

        saveMenuPdfCategoryOrder(
          categories.map(
            category =>
              category.id,
          ),
        ),
      ]);

      Alert.alert(
        'Configuración guardada',
        'El siguiente PDF utilizará estos ajustes.',
      );
    } catch (
    error
    ) {
      Alert.alert(
        'No se pudo guardar',
        error instanceof Error
          ? error.message
          : 'Ocurrió un error al guardar la configuración.',
      );
    } finally {
      setAction(
        null,
      );
    }
  }

  async function runAction(
    nextAction:
      'preview' |
      'download',
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

      await Promise.all([
        saveMenuPdfSettings(
          settings,
        ),

        saveMenuPdfCategoryOrder(
          categories.map(
            category =>
              category.id,
          ),
        ),
      ]);

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

  function renderToggle(
    label:
      string,
    description:
      string,
    value:
      boolean,
    onChange:
      (
        value:
          boolean,
      ) => void,
  ) {
    return (
      <View
        style={{
          minHeight:
            54,
          flexDirection:
            'row',
          alignItems:
            'center',
          gap:
            12,
          borderBottomWidth:
            1,
          borderBottomColor:
            theme.border,
          paddingVertical:
            8,
        }}
      >
        <View
          style={{
            flex:
              1,
          }}
        >
          <Text
            style={{
              color:
                theme.text,
              fontSize:
                12,
              fontWeight:
                '800',
            }}
          >
            {label}
          </Text>

          <Text
            style={{
              color:
                theme.textMuted,
              fontSize:
                9.5,
              lineHeight:
                14,
              marginTop:
                2,
            }}
          >
            {description}
          </Text>
        </View>

        <Switch
          value={
            value
          }
          disabled={
            isBusy
          }
          onValueChange={
            onChange
          }
          trackColor={{
            false:
              '#555555',
            true:
              theme.primary,
          }}
        />
      </View>
    );
  }

  return (
    <ScrollView
      style={{
        flex:
          1,
      }}
      contentContainerStyle={{
        gap:
          14,
        paddingBottom:
          40,
      }}
      showsVerticalScrollIndicator={
        true
      }
      keyboardShouldPersistTaps="handled"
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
          Configura y genera el menú descargable que verá el cliente web.
        </Text>
      </View>

      {isLoading ? (
        <View
          style={{
            padding:
              28,
            alignItems:
              'center',
          }}
        >
          <ActivityIndicator
            color={
              theme.primary
            }
          />
        </View>
      ) : (
        <>
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
                marginBottom:
                  8,
              }}
            >
              Contenido
            </Text>

            {renderToggle(
              'Mostrar descripciones',
              'Incluye la descripción de cada producto debajo del precio.',
              settings.showDescriptions,
              value =>
                patchSettings({
                  showDescriptions:
                    value,
                }),
            )}

            {renderToggle(
              'Mostrar productos agotados',
              'Los productos activos pero temporalmente no disponibles seguirán apareciendo.',
              settings.showUnavailableProducts,
              value =>
                patchSettings({
                  showUnavailableProducts:
                    value,
                }),
            )}

            {renderToggle(
              'Mostrar fecha de actualización',
              'Agrega la fecha en la portada para indicar cuándo fue generado el menú.',
              settings.showUpdatedDate,
              value =>
                patchSettings({
                  showUpdatedDate:
                    value,
                }),
            )}

            {renderToggle(
              'Mostrar logo',
              'Intenta usar el logo configurado del negocio. JPEG es el formato más compatible.',
              settings.showLogo,
              value =>
                patchSettings({
                  showLogo:
                    value,
                }),
            )}

            {renderToggle(
              'Mostrar código QR',
              'Agrega un QR en la portada para abrir la web, pedidos o el enlace que configures.',
              settings.qrEnabled,
              value =>
                patchSettings({
                  qrEnabled:
                    value,
                }),
            )}

            {settings.qrEnabled ? (
              <View
                style={{
                  gap:
                    9,
                  paddingTop:
                    12,
                }}
              >
                <TextInput
                  value={
                    settings.qrUrl
                  }
                  onChangeText={
                    value =>
                      patchSettings({
                        qrUrl:
                          value,
                      })
                  }
                  placeholder="https://..."
                  placeholderTextColor="#777777"
                  autoCapitalize="none"
                  autoCorrect={false}
                  style={{
                    minHeight:
                      44,
                    borderWidth:
                      1,
                    borderColor:
                      theme.border,
                    borderRadius:
                      9,
                    backgroundColor:
                      theme.background,
                    color:
                      theme.text,
                    paddingHorizontal:
                      12,
                    fontSize:
                      12,
                  }}
                />

                <TextInput
                  value={
                    settings.qrLabel
                  }
                  onChangeText={
                    value =>
                      patchSettings({
                        qrLabel:
                          value,
                      })
                  }
                  placeholder="Escanea para ordenar"
                  placeholderTextColor="#777777"
                  maxLength={
                    70
                  }
                  style={{
                    minHeight:
                      44,
                    borderWidth:
                      1,
                    borderColor:
                      theme.border,
                    borderRadius:
                      9,
                    backgroundColor:
                      theme.background,
                    color:
                      theme.text,
                    paddingHorizontal:
                      12,
                    fontSize:
                      12,
                  }}
                />
              </View>
            ) : null}
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
                10,
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
              Orden de categorías
            </Text>

            <Text
              style={{
                color:
                  theme.textMuted,
                fontSize:
                  10,
                lineHeight:
                  15,
              }}
            >
              Sólo aparecen categorías activas. Usa las flechas para decidir el orden de las páginas del PDF.
            </Text>

            {categories.map(
              (
                category,
                index,
              ) => (
                <View
                  key={
                    category.id
                  }
                  style={{
                    minHeight:
                      48,
                    borderWidth:
                      1,
                    borderColor:
                      theme.border,
                    borderRadius:
                      9,
                    backgroundColor:
                      theme.background,
                    paddingHorizontal:
                      10,
                    flexDirection:
                      'row',
                    alignItems:
                      'center',
                    gap:
                      8,
                  }}
                >
                  <Text
                    style={{
                      width:
                        24,
                      color:
                        theme.textMuted,
                      fontSize:
                        10,
                      fontWeight:
                        '800',
                    }}
                  >
                    {index +
                      1}
                  </Text>

                  <Text
                    style={{
                      flex:
                        1,
                      color:
                        theme.text,
                      fontSize:
                        12,
                      fontWeight:
                        '800',
                    }}
                  >
                    {
                      category.name
                    }
                  </Text>

                  <TouchableOpacity
                    disabled={
                      isBusy ||
                      index ===
                        0
                    }
                    onPress={() =>
                      moveCategory(
                        index,
                        -1,
                      )
                    }
                    style={{
                      width:
                        36,
                      height:
                        34,
                      borderRadius:
                        8,
                      borderWidth:
                        1,
                      borderColor:
                        theme.border,
                      alignItems:
                        'center',
                      justifyContent:
                        'center',
                      opacity:
                        index ===
                          0
                          ? 0.35
                          : 1,
                    }}
                  >
                    <Text
                      style={{
                        color:
                          theme.text,
                        fontSize:
                          14,
                        fontWeight:
                          '900',
                      }}
                    >
                      ↑
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    disabled={
                      isBusy ||
                      index ===
                        categories.length -
                          1
                    }
                    onPress={() =>
                      moveCategory(
                        index,
                        1,
                      )
                    }
                    style={{
                      width:
                        36,
                      height:
                        34,
                      borderRadius:
                        8,
                      borderWidth:
                        1,
                      borderColor:
                        theme.border,
                      alignItems:
                        'center',
                      justifyContent:
                        'center',
                      opacity:
                        index ===
                          categories.length -
                            1
                          ? 0.35
                          : 1,
                    }}
                  >
                    <Text
                      style={{
                        color:
                          theme.text,
                        fontSize:
                          14,
                        fontWeight:
                          '900',
                      }}
                    >
                      ↓
                    </Text>
                  </TouchableOpacity>
                </View>
              ),
            )}
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
                10,
            }}
          >
            <TouchableOpacity
              disabled={
                isBusy
              }
              onPress={() =>
                void handleSave()
              }
              style={{
                minHeight:
                  44,
                borderRadius:
                  10,
                borderWidth:
                  1,
                borderColor:
                  theme.border,
                alignItems:
                  'center',
                justifyContent:
                  'center',
              }}
            >
              {action ===
              'save' ? (
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
                      theme.text,
                    fontSize:
                      11,
                    fontWeight:
                      '900',
                  }}
                >
                  Guardar configuración
                </Text>
              )}
            </TouchableOpacity>

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
                    150,
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
                    150,
                  borderRadius:
                    10,
                  backgroundColor:
                    theme.primary,
                  alignItems:
                    'center',
                  justifyContent:
                    'center',
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
        </>
      )}
    </ScrollView>
  );
}
