import React, {
  useCallback,
  useEffect,
  useState,
} from 'react';

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
  useSafeAreaInsets,
} from 'react-native-safe-area-context';

import {
  Product,
  ProductCheckAssignment,
} from '../../../types';

import {
  createProductCheckOption,
  createProductPersonalizationGroup,
  deleteProductCheckOption,
  deleteProductPersonalizationGroup,
  getOwnProductPersonalizationGroups,
  getCategoryPersonalizationGroups,
  getProductPersonalizationContext,
  setProductCategoryPersonalizationInheritance,
  setProductCheckOptionDefault,
} from '../../../services/productCheckService';

import {
  useBusiness,
} from '../../../context/BusinessContext';

interface ProductPersonalizationModalProps {
  visible: boolean;
  product: Product | null;
  onClose: () => void;
}

export function ProductPersonalizationModal({
  visible,
  product,
  onClose,
}: ProductPersonalizationModalProps) {
  const {
    theme,
  } = useBusiness();

  const insets =
    useSafeAreaInsets();

  const {
    height,
  } = useWindowDimensions();

  const [
    groups,
    setGroups,
  ] = useState<ProductCheckAssignment[]>([]);

  const [
    inheritedGroups,
    setInheritedGroups,
  ] = useState<ProductCheckAssignment[]>([]);

  const [
    categoryName,
    setCategoryName,
  ] = useState<string | null>(null);

  const [
    inheritCategory,
    setInheritCategory,
  ] = useState(true);

  const [
    groupName,
    setGroupName,
  ] = useState('');

  const [
    optionDrafts,
    setOptionDrafts,
  ] = useState<Record<string, string>>({});

  const [
    isLoading,
    setIsLoading,
  ] = useState(false);

  const [
    isProcessing,
    setIsProcessing,
  ] = useState(false);

  const load =
    useCallback(
      async (): Promise<void> => {
        if (!product?.id) {
          setGroups([]);
          return;
        }

        try {
          setIsLoading(true);
          const context =
            await getProductPersonalizationContext(
              product.id,
            );

          const [ownData, inheritedData] =
            await Promise.all([
              getOwnProductPersonalizationGroups(
                product.id,
              ),
              context.categoryId
                ? getCategoryPersonalizationGroups(
                    context.categoryId,
                  )
                : Promise.resolve([]),
            ]);

          setGroups(ownData);
          setInheritedGroups(inheritedData);
          setCategoryName(context.categoryName);
          setInheritCategory(context.inheritCategory);
        } catch (error) {
          Alert.alert(
            'Error',
            error instanceof Error
              ? error.message
              : 'No se pudo cargar la personalización.',
          );
        } finally {
          setIsLoading(false);
        }
      },
      [product?.id],
    );

  useEffect(
    () => {
      if (visible) {
        setGroupName('');
        setOptionDrafts({});
        void load();
      }
    },
    [visible, load],
  );

  async function handleAddGroup(): Promise<void> {
    if (!product?.id || isProcessing) {
      return;
    }

    const clean =
      groupName.trim();

    if (!clean) {
      Alert.alert(
        'Nombre requerido',
        'Escribe el nombre de la personalización, por ejemplo Verdura o Aderezos.',
      );
      return;
    }

    try {
      setIsProcessing(true);
      await createProductPersonalizationGroup(
        product.id,
        clean,
      );
      setGroupName('');
      await load();
    } catch (error) {
      Alert.alert(
        'Error',
        error instanceof Error
          ? error.message
          : 'No se pudo crear el grupo.',
      );
    } finally {
      setIsProcessing(false);
    }
  }

  async function handleAddOption(
    groupId: string,
  ): Promise<void> {
    if (isProcessing) {
      return;
    }

    const clean =
      (optionDrafts[groupId] ?? '')
        .trim();

    if (!clean) {
      Alert.alert(
        'Opción requerida',
        'Escribe el nombre de la opción.',
      );
      return;
    }

    try {
      setIsProcessing(true);
      await createProductCheckOption(
        groupId,
        clean,
        true,
      );
      setOptionDrafts(current => ({
        ...current,
        [groupId]: '',
      }));
      await load();
    } catch (error) {
      Alert.alert(
        'Error',
        error instanceof Error
          ? error.message
          : 'No se pudo crear la opción.',
      );
    } finally {
      setIsProcessing(false);
    }
  }

  function confirmDeleteGroup(
    groupId: string,
    name: string,
  ): void {
    Alert.alert(
      'Eliminar personalización',
      `¿Eliminar “${name}” y todas sus opciones?`,
      [
        {
          text: 'Cancelar',
          style: 'cancel',
        },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: () => {
            void (async () => {
              try {
                setIsProcessing(true);
                await deleteProductPersonalizationGroup(
                  groupId,
                );
                await load();
              } catch (error) {
                Alert.alert(
                  'Error',
                  error instanceof Error
                    ? error.message
                    : 'No se pudo eliminar el grupo.',
                );
              } finally {
                setIsProcessing(false);
              }
            })();
          },
        },
      ],
    );
  }

  function confirmDeleteOption(
    optionId: string,
    name: string,
  ): void {
    Alert.alert(
      'Eliminar opción',
      `¿Eliminar “${name}”?`,
      [
        {
          text: 'Cancelar',
          style: 'cancel',
        },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: () => {
            void (async () => {
              try {
                setIsProcessing(true);
                await deleteProductCheckOption(
                  optionId,
                );
                await load();
              } catch (error) {
                Alert.alert(
                  'Error',
                  error instanceof Error
                    ? error.message
                    : 'No se pudo eliminar la opción.',
                );
              } finally {
                setIsProcessing(false);
              }
            })();
          },
        },
      ],
    );
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View
        style={{
          flex: 1,
          paddingHorizontal: 14,
          paddingTop: Math.max(12, insets.top + 8),
          paddingBottom: Math.max(14, insets.bottom + 10),
          backgroundColor: 'rgba(0,0,0,0.78)',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <View
          style={{
            width: '100%',
            maxWidth: 620,
            height: Math.min(
              height - Math.max(34, insets.top + insets.bottom + 28),
              780,
            ),
            borderRadius: 20,
            borderWidth: 1,
            borderColor: theme.border,
            backgroundColor: theme.surface,
            overflow: 'hidden',
          }}
        >
          <View
            style={{
              paddingHorizontal: 18,
              paddingVertical: 16,
              borderBottomWidth: 1,
              borderBottomColor: theme.border,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 12,
            }}
          >
            <View style={{ flex: 1 }}>
              <Text
                style={{
                  color: theme.text,
                  fontSize: 20,
                  fontWeight: '900',
                }}
              >
                Personalización
              </Text>

              <Text
                style={{
                  color: theme.textMuted,
                  fontSize: 11,
                  marginTop: 3,
                }}
              >
                {product?.name ?? 'Producto'}
              </Text>
            </View>

            <TouchableOpacity
              onPress={onClose}
              disabled={isProcessing}
              style={{
                width: 40,
                height: 40,
                borderRadius: 20,
                borderWidth: 1,
                borderColor: theme.border,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text
                style={{
                  color: theme.text,
                  fontSize: 22,
                  fontWeight: '800',
                }}
              >
                ×
              </Text>
            </TouchableOpacity>
          </View>

          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={{
              padding: 18,
              paddingBottom: 40,
            }}
            keyboardShouldPersistTaps="handled"
          >
            <View
              style={{
                padding: 12,
                borderRadius: 10,
                borderWidth: 1,
                borderColor: '#4B4430',
                backgroundColor: '#211C0E',
                marginBottom: 16,
              }}
            >
              <Text
                style={{
                  color: theme.primary,
                  fontSize: 12,
                  fontWeight: '900',
                  marginBottom: 4,
                }}
              >
                ¿Cómo funciona?
              </Text>
              <Text
                style={{
                  color: '#C5C5C5',
                  fontSize: 11,
                  lineHeight: 17,
                }}
              >
                Cada grupo aparece como un check principal en el producto. Si el cliente lo marca, incluye todas sus opciones. Puede desplegarlo y quitar o agregar elementos individualmente. “Incluido por defecto” define cómo aparece al abrir el producto.
              </Text>
            </View>

            {categoryName ? (
              <View
                style={{
                  padding: 12,
                  borderRadius: 10,
                  borderWidth: 1,
                  borderColor: '#35515B',
                  backgroundColor: '#142128',
                  marginBottom: 16,
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: '#8FD6E8', fontSize: 12, fontWeight: '900' }}>
                      Herencia de categoría · {categoryName}
                    </Text>
                    <Text style={{ color: '#A7B6BB', fontSize: 10, marginTop: 3, lineHeight: 15 }}>
                      Se actualiza automáticamente cuando cambias la personalización de la categoría.
                    </Text>
                  </View>
                  <Switch
                    value={inheritCategory}
                    disabled={isProcessing}
                    onValueChange={value => {
                      void (async () => {
                        if (!product?.id) return;
                        try {
                          setIsProcessing(true);
                          await setProductCategoryPersonalizationInheritance(product.id, value);
                          setInheritCategory(value);
                        } catch (error) {
                          Alert.alert('Error', error instanceof Error ? error.message : 'No se pudo cambiar la herencia.');
                        } finally {
                          setIsProcessing(false);
                        }
                      })();
                    }}
                    trackColor={{ false: '#494949', true: '#477C89' }}
                    thumbColor={inheritCategory ? '#8FD6E8' : '#BDBDBD'}
                  />
                </View>

                {inheritCategory && inheritedGroups.length > 0 ? (
                  <View style={{ marginTop: 10, gap: 7 }}>
                    {inheritedGroups.map(group => (
                      <View key={group.groupId} style={{ padding: 9, borderRadius: 8, backgroundColor: '#192D35', borderWidth: 1, borderColor: '#2D4A54' }}>
                        <Text style={{ color: '#D8EEF4', fontSize: 11, fontWeight: '900' }}>{group.group.name}</Text>
                        <Text style={{ color: '#91AAB1', fontSize: 9, marginTop: 2 }}>{group.options.map(option => option.name).join(' · ')}</Text>
                      </View>
                    ))}
                  </View>
                ) : null}
              </View>
            ) : null}

            <Text
              style={{
                color: theme.text,
                fontSize: 13,
                fontWeight: '900',
                marginBottom: 8,
              }}
            >
              Personalización adicional de este producto
            </Text>

            <View
              style={{
                flexDirection: 'row',
                gap: 8,
                marginBottom: 18,
              }}
            >
              <TextInput
                value={groupName}
                onChangeText={setGroupName}
                placeholder="Ej. Verdura, Aderezos"
                placeholderTextColor="#777777"
                editable={!isProcessing}
                maxLength={60}
                style={{
                  flex: 1,
                  minHeight: 44,
                  borderRadius: 9,
                  borderWidth: 1,
                  borderColor: theme.border,
                  paddingHorizontal: 12,
                  color: theme.text,
                  backgroundColor: '#171717',
                }}
              />

              <TouchableOpacity
                onPress={() => void handleAddGroup()}
                disabled={isProcessing}
                style={{
                  minHeight: 44,
                  paddingHorizontal: 14,
                  borderRadius: 9,
                  backgroundColor: theme.primary,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Text
                  style={{
                    color: theme.onPrimary,
                    fontSize: 11,
                    fontWeight: '900',
                  }}
                >
                  + Grupo
                </Text>
              </TouchableOpacity>
            </View>

            {isLoading ? (
              <ActivityIndicator
                color={theme.primary}
              />
            ) : groups.length === 0 ? (
              <View
                style={{
                  padding: 18,
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: theme.border,
                  alignItems: 'center',
                }}
              >
                <Text
                  style={{
                    color: theme.textMuted,
                    textAlign: 'center',
                    fontSize: 12,
                  }}
                >
                  Todavía no hay personalización adicional propia de este producto.
                </Text>
              </View>
            ) : (
              groups.map(group => (
                <View
                  key={group.groupId}
                  style={{
                    marginBottom: 14,
                    padding: 12,
                    borderRadius: 12,
                    borderWidth: 1,
                    borderColor: '#444444',
                    backgroundColor: '#1B1B1B',
                  }}
                >
                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 10,
                    }}
                  >
                    <View style={{ flex: 1 }}>
                      <Text
                        style={{
                          color: '#FFFFFF',
                          fontSize: 14,
                          fontWeight: '900',
                        }}
                      >
                        {group.group.name}
                      </Text>
                      <Text
                        style={{
                          color: '#888888',
                          fontSize: 10,
                          marginTop: 2,
                        }}
                      >
                        {group.options.length} opción{group.options.length === 1 ? '' : 'es'}
                      </Text>
                    </View>

                    <TouchableOpacity
                      onPress={() =>
                        confirmDeleteGroup(
                          group.groupId,
                          group.group.name,
                        )
                      }
                      disabled={isProcessing}
                      style={{
                        minHeight: 36,
                        paddingHorizontal: 11,
                        borderRadius: 8,
                        borderWidth: 1,
                        borderColor: '#7D3A3A',
                        backgroundColor: '#341C1C',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Text
                        style={{
                          color: '#FF9B9B',
                          fontSize: 10,
                          fontWeight: '900',
                        }}
                      >
                        Eliminar
                      </Text>
                    </TouchableOpacity>
                  </View>

                  <View
                    style={{
                      marginTop: 12,
                      gap: 8,
                    }}
                  >
                    {group.options.map(option => (
                      <View
                        key={option.id}
                        style={{
                          minHeight: 48,
                          paddingHorizontal: 10,
                          paddingVertical: 8,
                          borderRadius: 9,
                          borderWidth: 1,
                          borderColor: '#383838',
                          backgroundColor: '#202020',
                          flexDirection: 'row',
                          alignItems: 'center',
                          gap: 10,
                        }}
                      >
                        <View style={{ flex: 1 }}>
                          <Text
                            style={{
                              color: '#FFFFFF',
                              fontSize: 12,
                              fontWeight: '800',
                            }}
                          >
                            {option.name}
                          </Text>
                          <Text
                            style={{
                              color: '#888888',
                              fontSize: 9,
                              marginTop: 2,
                            }}
                          >
                            Incluido por defecto
                          </Text>
                        </View>

                        <Switch
                          value={option.defaultSelected}
                          disabled={isProcessing}
                          onValueChange={value => {
                            void (async () => {
                              try {
                                setIsProcessing(true);
                                await setProductCheckOptionDefault(
                                  option.id,
                                  value,
                                );
                                await load();
                              } catch (error) {
                                Alert.alert(
                                  'Error',
                                  error instanceof Error
                                    ? error.message
                                    : 'No se pudo actualizar la opción.',
                                );
                              } finally {
                                setIsProcessing(false);
                              }
                            })();
                          }}
                          trackColor={{
                            false: '#494949',
                            true: '#6FAFAD',
                          }}
                          thumbColor={
                            option.defaultSelected
                              ? '#8ED3D0'
                              : '#BDBDBD'
                          }
                        />

                        <TouchableOpacity
                          onPress={() =>
                            confirmDeleteOption(
                              option.id,
                              option.name,
                            )
                          }
                          disabled={isProcessing}
                          style={{
                            width: 34,
                            height: 34,
                            borderRadius: 8,
                            borderWidth: 1,
                            borderColor: '#6B3A3A',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          <Text
                            style={{
                              color: '#FF8D8D',
                              fontSize: 16,
                              fontWeight: '900',
                            }}
                          >
                            ×
                          </Text>
                        </TouchableOpacity>
                      </View>
                    ))}
                  </View>

                  <View
                    style={{
                      marginTop: 10,
                      flexDirection: 'row',
                      gap: 8,
                    }}
                  >
                    <TextInput
                      value={optionDrafts[group.groupId] ?? ''}
                      onChangeText={value =>
                        setOptionDrafts(current => ({
                          ...current,
                          [group.groupId]: value,
                        }))
                      }
                      placeholder={`Agregar a ${group.group.name}`}
                      placeholderTextColor="#777777"
                      editable={!isProcessing}
                      maxLength={60}
                      style={{
                        flex: 1,
                        minHeight: 42,
                        borderRadius: 8,
                        borderWidth: 1,
                        borderColor: '#444444',
                        backgroundColor: '#171717',
                        paddingHorizontal: 10,
                        color: '#FFFFFF',
                      }}
                    />

                    <TouchableOpacity
                      onPress={() =>
                        void handleAddOption(
                          group.groupId,
                        )
                      }
                      disabled={isProcessing}
                      style={{
                        minHeight: 42,
                        paddingHorizontal: 12,
                        borderRadius: 8,
                        borderWidth: 1,
                        borderColor: theme.primary,
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Text
                        style={{
                          color: theme.primary,
                          fontSize: 10,
                          fontWeight: '900',
                        }}
                      >
                        + Opción
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))
            )}
          </ScrollView>

          <View
            style={{
              padding: 14,
              borderTopWidth: 1,
              borderTopColor: theme.border,
            }}
          >
            <TouchableOpacity
              onPress={onClose}
              disabled={isProcessing}
              style={{
                minHeight: 48,
                borderRadius: 10,
                backgroundColor: theme.primary,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text
                style={{
                  color: theme.onPrimary,
                  fontWeight: '900',
                }}
              >
                Listo
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}
