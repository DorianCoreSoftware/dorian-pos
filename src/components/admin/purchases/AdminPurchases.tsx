import React, {
  useCallback,
  useEffect,
  useMemo,
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
  View,
} from 'react-native';

import {
  getInventoryItems,
  InventoryBaseUnit,
  InventoryItem,
} from '../../../services/inventoryService';

import {
  convertPurchaseQuantityToBase,
  getCompatiblePurchaseUnits,
  getSupplierInventoryPresentations,
  getSuppliers,
  PurchaseUnit,
  saveSupplier,
  saveSupplierInventoryPresentation,
  Supplier,
  SupplierInventoryPresentation,
} from '../../../services/purchaseSupplierService';

import {
  useBusiness,
} from '../../../context/BusinessContext';

import {
  useCurrency,
} from '../../../hooks/useCurrency';

import {
  styles,
} from './AdminPurchases.styles';

import { PurchaseManager } from './PurchaseManager';

type Tab =
  | 'purchases'
  | 'suppliers'
  | 'presentations';

interface SupplierDraft {
  id?: string;
  name: string;
  contactName: string;
  phone: string;
  email: string;
  notes: string;
  isActive: boolean;
}

interface PresentationDraft {
  id?: string;
  supplierId: string;
  inventoryItemId: string;
  name: string;
  supplierSku: string;
  purchaseUnit: PurchaseUnit;
  purchaseQuantity: string;
  lastPurchaseCost: string;
  isPreferred: boolean;
  isActive: boolean;
  notes: string;
}

const EMPTY_SUPPLIER:
  SupplierDraft = {
    name: '',
    contactName: '',
    phone: '',
    email: '',
    notes: '',
    isActive: true,
  };

const EMPTY_PRESENTATION:
  PresentationDraft = {
    supplierId: '',
    inventoryItemId: '',
    name: '',
    supplierSku: '',
    purchaseUnit: 'piece',
    purchaseQuantity: '1',
    lastPurchaseCost: '0',
    isPreferred: false,
    isActive: true,
    notes: '',
  };

const PURCHASE_UNIT_LABEL:
  Record<
    PurchaseUnit,
    string
  > = {
    g: 'g',
    kg: 'kg',
    ml: 'ml',
    l: 'L',
    piece: 'pza',
  };

const BASE_UNIT_LABEL:
  Record<
    InventoryBaseUnit,
    string
  > = {
    g: 'g',
    ml: 'ml',
    piece: 'pza',
  };

export function AdminPurchases() {
  const {
    theme,
  } =
    useBusiness();

  const {
    formatCurrency,
  } =
    useCurrency();

  const [
    tab,
    setTab,
  ] =
    useState<Tab>(
      'purchases',
    );

  const [
    suppliers,
    setSuppliers,
  ] =
    useState<Supplier[]>(
      [],
    );

  const [
    presentations,
    setPresentations,
  ] =
    useState<
      SupplierInventoryPresentation[]
    >([]);

  const [
    inventoryItems,
    setInventoryItems,
  ] =
    useState<InventoryItem[]>(
      [],
    );

  const [
    search,
    setSearch,
  ] =
    useState('');

  const [
    showInactive,
    setShowInactive,
  ] =
    useState(true);

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

  const [
    supplierModalVisible,
    setSupplierModalVisible,
  ] =
    useState(false);

  const [
    presentationModalVisible,
    setPresentationModalVisible,
  ] =
    useState(false);

  const [
    supplierDraft,
    setSupplierDraft,
  ] =
    useState<SupplierDraft>({
      ...EMPTY_SUPPLIER,
    });

  const [
    presentationDraft,
    setPresentationDraft,
  ] =
    useState<PresentationDraft>({
      ...EMPTY_PRESENTATION,
    });

  const load =
    useCallback(
      async (): Promise<void> => {
        try {
          setLoading(
            true,
          );

          const [
            supplierData,
            presentationData,
            itemData,
          ] =
            await Promise.all([
              getSuppliers(
                true,
              ),
              getSupplierInventoryPresentations(
                true,
              ),
              getInventoryItems(),
            ]);

          setSuppliers(
            supplierData,
          );

          setPresentations(
            presentationData,
          );

          setInventoryItems(
            itemData,
          );
        } catch (error) {
          Alert.alert(
            'Compras',
            error instanceof Error
              ? error.message
              : 'No se pudo cargar el módulo.',
          );
        } finally {
          setLoading(
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

  const activeSuppliers =
    suppliers.filter(
      supplier =>
        supplier.isActive,
    );

  const activeInventoryItems =
    inventoryItems.filter(
      item =>
        item.isActive,
    );

  const visibleSuppliers =
    useMemo(
      () => {
        const query =
          search
            .trim()
            .toLocaleLowerCase(
              'es-MX',
            );

        return suppliers.filter(
          supplier => {
            if (
              !showInactive &&
              !supplier.isActive
            ) {
              return false;
            }

            if (!query) {
              return true;
            }

            return [
              supplier.name,
              supplier.contactName,
              supplier.phone,
              supplier.email,
            ].some(
              value =>
                value
                  .toLocaleLowerCase(
                    'es-MX',
                  )
                  .includes(
                    query,
                  ),
            );
          },
        );
      },
      [
        suppliers,
        search,
        showInactive,
      ],
    );

  const visiblePresentations =
    useMemo(
      () => {
        const query =
          search
            .trim()
            .toLocaleLowerCase(
              'es-MX',
            );

        return presentations.filter(
          presentation => {
            if (
              !showInactive &&
              !presentation.isActive
            ) {
              return false;
            }

            if (!query) {
              return true;
            }

            return [
              presentation.name,
              presentation.supplierName,
              presentation.inventoryItemName,
              presentation.supplierSku,
            ].some(
              value =>
                value
                  .toLocaleLowerCase(
                    'es-MX',
                  )
                  .includes(
                    query,
                  ),
            );
          },
        );
      },
      [
        presentations,
        search,
        showInactive,
      ],
    );

  const selectedInventoryItem =
    inventoryItems.find(
      item =>
        item.id ===
        presentationDraft.inventoryItemId,
    );

  const compatibleUnits =
    selectedInventoryItem
      ? getCompatiblePurchaseUnits(
          selectedInventoryItem.baseUnit,
        )
      : [
          'piece',
        ] as PurchaseUnit[];

  const purchaseQuantity =
    Number(
      presentationDraft.purchaseQuantity
        .replace(
          ',',
          '.',
        ),
    );

  const purchaseCost =
    Number(
      presentationDraft.lastPurchaseCost
        .replace(
          ',',
          '.',
        ),
    );

  const previewBaseQuantity =
    selectedInventoryItem
      ? convertPurchaseQuantityToBase(
          selectedInventoryItem.baseUnit,
          presentationDraft.purchaseUnit,
          purchaseQuantity,
        )
      : 0;

  const previewUnitCost =
    previewBaseQuantity > 0 &&
    Number.isFinite(
      purchaseCost,
    )
      ? purchaseCost /
        previewBaseQuantity
      : 0;

  function openNewSupplier():
    void {
    setSupplierDraft({
      ...EMPTY_SUPPLIER,
    });

    setSupplierModalVisible(
      true,
    );
  }

  function openEditSupplier(
    supplier: Supplier,
  ): void {
    setSupplierDraft({
      id:
        supplier.id,
      name:
        supplier.name,
      contactName:
        supplier.contactName,
      phone:
        supplier.phone,
      email:
        supplier.email,
      notes:
        supplier.notes,
      isActive:
        supplier.isActive,
    });

    setSupplierModalVisible(
      true,
    );
  }

  function openNewPresentation():
    void {
    if (
      activeSuppliers.length ===
      0
    ) {
      Alert.alert(
        'Sin proveedores',
        'Primero crea o activa un proveedor.',
      );

      return;
    }

    if (
      activeInventoryItems.length ===
      0
    ) {
      Alert.alert(
        'Sin insumos',
        'Primero crea un insumo activo en Inventario.',
      );

      return;
    }

    const item =
      activeInventoryItems[0];

    setPresentationDraft({
      ...EMPTY_PRESENTATION,
      supplierId:
        activeSuppliers[0].id,
      inventoryItemId:
        item.id,
      purchaseUnit:
        getCompatiblePurchaseUnits(
          item.baseUnit,
        )[0],
    });

    setPresentationModalVisible(
      true,
    );
  }

  function openEditPresentation(
    presentation:
      SupplierInventoryPresentation,
  ): void {
    setPresentationDraft({
      id:
        presentation.id,
      supplierId:
        presentation.supplierId,
      inventoryItemId:
        presentation.inventoryItemId,
      name:
        presentation.name,
      supplierSku:
        presentation.supplierSku,
      purchaseUnit:
        presentation.purchaseUnit,
      purchaseQuantity:
        String(
          presentation.purchaseQuantity,
        ),
      lastPurchaseCost:
        String(
          presentation.lastPurchaseCost,
        ),
      isPreferred:
        presentation.isPreferred,
      isActive:
        presentation.isActive,
      notes:
        presentation.notes,
    });

    setPresentationModalVisible(
      true,
    );
  }

  async function handleSaveSupplier():
    Promise<void> {
    try {
      setSaving(
        true,
      );

      await saveSupplier(
        supplierDraft,
      );

      setSupplierModalVisible(
        false,
      );

      await load();
    } catch (error) {
      Alert.alert(
        'Proveedor',
        error instanceof Error
          ? error.message
          : 'No se pudo guardar.',
      );
    } finally {
      setSaving(
        false,
      );
    }
  }

  async function handleSavePresentation():
    Promise<void> {
    try {
      setSaving(
        true,
      );

      await saveSupplierInventoryPresentation({
        id:
          presentationDraft.id,
        supplierId:
          presentationDraft.supplierId,
        inventoryItemId:
          presentationDraft.inventoryItemId,
        name:
          presentationDraft.name,
        supplierSku:
          presentationDraft.supplierSku,
        purchaseUnit:
          presentationDraft.purchaseUnit,
        purchaseQuantity,
        lastPurchaseCost:
          purchaseCost,
        isPreferred:
          presentationDraft.isPreferred,
        isActive:
          presentationDraft.isActive,
        notes:
          presentationDraft.notes,
      });

      setPresentationModalVisible(
        false,
      );

      await load();
    } catch (error) {
      Alert.alert(
        'Presentación',
        error instanceof Error
          ? error.message
          : 'No se pudo guardar.',
      );
    } finally {
      setSaving(
        false,
      );
    }
  }

  function selectInventoryItem(
    item: InventoryItem,
  ): void {
    setPresentationDraft(
      current => ({
        ...current,
        inventoryItemId:
          item.id,
        purchaseUnit:
          getCompatiblePurchaseUnits(
            item.baseUnit,
          )[0],
      }),
    );
  }

  return (
    <>
      <ScrollView
        style={
          styles.container
        }
        contentContainerStyle={
          styles.content
        }
        showsVerticalScrollIndicator={
          false
        }
      >
        <View
          style={
            styles.header
          }
        >
          <View
            style={
              styles.headerText
            }
          >
            <Text
              style={[
                styles.title,
                {
                  color:
                    theme.text,
                },
              ]}
            >
              Compras y proveedores
            </Text>

            <Text
              style={[
                styles.subtitle,
                {
                  color:
                    theme.textMuted,
                },
              ]}
            >
              Define quién te vende cada insumo y en qué presentación. La siguiente fase usará este catálogo para registrar compras, ingresar existencias y crear el egreso automáticamente.
            </Text>
          </View>
        </View>

        <View
          style={
            styles.tabs
          }
        >
          {[
            {
              id:
                'purchases' as Tab,
              label:
                'COMPRAS',
            },
            {
              id:
                'suppliers' as Tab,
              label:
                'PROVEEDORES',
            },
            {
              id:
                'presentations' as Tab,
              label:
                'PRESENTACIONES',
            },
          ].map(
            option => {
              const selected =
                tab ===
                option.id;

              return (
                <TouchableOpacity
                  key={
                    option.id
                  }
                  style={[
                    styles.tab,
                    {
                      borderColor:
                        selected
                          ? theme.primary
                          : theme.border,
                      backgroundColor:
                        selected
                          ? theme.surfaceAlt
                          : theme.surface,
                    },
                  ]}
                  onPress={
                    () => {
                      setTab(
                        option.id,
                      );

                      setSearch('');
                    }
                  }
                >
                  <Text
                    style={[
                      styles.tabText,
                      {
                        color:
                          selected
                            ? theme.primary
                            : theme.textMuted,
                      },
                    ]}
                  >
                    {option.label}
                  </Text>
                </TouchableOpacity>
              );
            },
          )}
        </View>

        {tab !==
        'purchases' ? (
        <View
          style={
            styles.toolbar
          }
        >
          <TextInput
            value={
              search
            }
            onChangeText={
              setSearch
            }
            placeholder={
              tab ===
              'suppliers'
                ? 'Buscar proveedor...'
                : 'Buscar presentación, proveedor o insumo...'
            }
            placeholderTextColor={
              theme.textMuted
            }
            style={[
              styles.searchInput,
              {
                color:
                  theme.text,
                borderColor:
                  theme.border,
                backgroundColor:
                  theme.surface,
              },
            ]}
          />

          <View
            style={
              styles.switchRow
            }
          >
            <Text
              style={[
                styles.switchText,
                {
                  color:
                    theme.textMuted,
                },
              ]}
            >
              Mostrar inactivos
            </Text>

            <Switch
              value={
                showInactive
              }
              onValueChange={
                setShowInactive
              }
            />
          </View>

          <TouchableOpacity
            style={[
              styles.addButton,
              {
                backgroundColor:
                  theme.primary,
              },
            ]}
            onPress={
              tab ===
              'suppliers'
                ? openNewSupplier
                : openNewPresentation
            }
          >
            <Text
              style={[
                styles.addButtonText,
                {
                  color:
                    theme.onPrimary,
                },
              ]}
            >
              {tab ===
              'suppliers'
                ? '+ PROVEEDOR'
                : '+ PRESENTACIÓN'}
            </Text>
          </TouchableOpacity>
        </View>
        ) : null}

        {tab ===
        'purchases' ? (
          <PurchaseManager />
        ) : loading ? (
          <ActivityIndicator
            color={
              theme.primary
            }
          />
        ) : tab ===
          'suppliers' ? (
          <View
            style={
              styles.list
            }
          >
            {visibleSuppliers.map(
              supplier => (
                <View
                  key={
                    supplier.id
                  }
                  style={[
                    styles.card,
                    {
                      borderColor:
                        theme.border,
                      backgroundColor:
                        theme.surface,
                      opacity:
                        supplier.isActive
                          ? 1
                          : 0.55,
                    },
                  ]}
                >
                  <View
                    style={
                      styles.cardHeader
                    }
                  >
                    <View
                      style={
                        styles.cardInfo
                      }
                    >
                      <Text
                        style={[
                          styles.cardTitle,
                          {
                            color:
                              theme.text,
                          },
                        ]}
                      >
                        {supplier.name}
                      </Text>

                      <Text
                        style={[
                          styles.cardMeta,
                          {
                            color:
                              theme.textMuted,
                          },
                        ]}
                      >
                        {[
                          supplier.contactName,
                          supplier.phone,
                          supplier.email,
                        ]
                          .filter(
                            Boolean,
                          )
                          .join(
                            ' · ',
                          ) ||
                          'Sin datos de contacto'}
                      </Text>
                    </View>

                    <View
                      style={[
                        styles.badge,
                        {
                          borderColor:
                            supplier.isActive
                              ? theme.primary
                              : theme.border,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.badgeText,
                          {
                            color:
                              supplier.isActive
                                ? theme.primary
                                : theme.textMuted,
                          },
                        ]}
                      >
                        {supplier.isActive
                          ? 'ACTIVO'
                          : 'INACTIVO'}
                      </Text>
                    </View>
                  </View>

                  <View
                    style={
                      styles.actions
                    }
                  >
                    <TouchableOpacity
                      onPress={
                        () =>
                          openEditSupplier(
                            supplier,
                          )
                      }
                    >
                      <Text
                        style={[
                          styles.actionText,
                          {
                            color:
                              theme.primary,
                          },
                        ]}
                      >
                        Editar
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ),
            )}

            {visibleSuppliers.length ===
            0 ? (
              <View
                style={
                  styles.empty
                }
              >
                <Text
                  style={[
                    styles.emptyTitle,
                    {
                      color:
                        theme.text,
                    },
                  ]}
                >
                  No hay proveedores
                </Text>

                <Text
                  style={[
                    styles.emptyText,
                    {
                      color:
                        theme.textMuted,
                    },
                  ]}
                >
                  Registra los proveedores que abastecen tus insumos.
                </Text>
              </View>
            ) : null}
          </View>
        ) : (
          <View
            style={
              styles.list
            }
          >
            {visiblePresentations.map(
              presentation => (
                <View
                  key={
                    presentation.id
                  }
                  style={[
                    styles.card,
                    {
                      borderColor:
                        theme.border,
                      backgroundColor:
                        theme.surface,
                      opacity:
                        presentation.isActive
                          ? 1
                          : 0.55,
                    },
                  ]}
                >
                  <View
                    style={
                      styles.cardHeader
                    }
                  >
                    <View
                      style={
                        styles.cardInfo
                      }
                    >
                      <Text
                        style={[
                          styles.cardTitle,
                          {
                            color:
                              theme.text,
                          },
                        ]}
                      >
                        {presentation.name}
                        {presentation.isPreferred
                          ? ' ★'
                          : ''}
                      </Text>

                      <Text
                        style={[
                          styles.cardMeta,
                          {
                            color:
                              theme.textMuted,
                          },
                        ]}
                      >
                        {presentation.inventoryItemName}
                        {' · '}
                        {presentation.supplierName}
                        {' · '}
                        {presentation.purchaseQuantity.toLocaleString(
                          'es-MX',
                          {
                            maximumFractionDigits:
                              3,
                          },
                        )}{' '}
                        {PURCHASE_UNIT_LABEL[
                          presentation.purchaseUnit
                        ]}
                        {' · '}
                        {formatCurrency(
                          presentation.lastPurchaseCost,
                        )}
                      </Text>

                      <Text
                        style={[
                          styles.cardMeta,
                          {
                            color:
                              theme.textMuted,
                          },
                        ]}
                      >
                        Costo normalizado:{' '}
                        {formatCurrency(
                          presentation.normalizedUnitCost,
                        )}
                        /
                        {BASE_UNIT_LABEL[
                          presentation.inventoryBaseUnit
                        ]}
                      </Text>
                    </View>

                    <View
                      style={[
                        styles.badge,
                        {
                          borderColor:
                            presentation.isActive
                              ? theme.primary
                              : theme.border,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.badgeText,
                          {
                            color:
                              presentation.isActive
                                ? theme.primary
                                : theme.textMuted,
                          },
                        ]}
                      >
                        {presentation.isActive
                          ? 'ACTIVA'
                          : 'INACTIVA'}
                      </Text>
                    </View>
                  </View>

                  <View
                    style={
                      styles.actions
                    }
                  >
                    <TouchableOpacity
                      onPress={
                        () =>
                          openEditPresentation(
                            presentation,
                          )
                      }
                    >
                      <Text
                        style={[
                          styles.actionText,
                          {
                            color:
                              theme.primary,
                          },
                        ]}
                      >
                        Editar
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ),
            )}

            {visiblePresentations.length ===
            0 ? (
              <View
                style={
                  styles.empty
                }
              >
                <Text
                  style={[
                    styles.emptyTitle,
                    {
                      color:
                        theme.text,
                    },
                  ]}
                >
                  No hay presentaciones
                </Text>

                <Text
                  style={[
                    styles.emptyText,
                    {
                      color:
                        theme.textMuted,
                    },
                  ]}
                >
                  Ejemplo: Caja 15 kg de alitas, garrafa 3.8 L de salsa o caja 12 Boing.
                </Text>
              </View>
            ) : null}
          </View>
        )}
      </ScrollView>

      <Modal
        visible={
          supplierModalVisible
        }
        transparent
        animationType="fade"
        onRequestClose={
          () =>
            setSupplierModalVisible(
              false,
            )
        }
      >
        <View
          style={
            styles.overlay
          }
        >
          <ScrollView
            style={[
              styles.modal,
              {
                borderColor:
                  theme.border,
                backgroundColor:
                  theme.surface,
              },
            ]}
          >
            <View
              style={
                styles.modalHeader
              }
            >
              <Text
                style={[
                  styles.modalTitle,
                  {
                    color:
                      theme.text,
                  },
                ]}
              >
                {supplierDraft.id
                  ? 'Editar proveedor'
                  : 'Nuevo proveedor'}
              </Text>

              <TouchableOpacity
                onPress={
                  () =>
                    setSupplierModalVisible(
                      false,
                    )
                }
              >
                <Text
                  style={[
                    styles.closeText,
                    {
                      color:
                        theme.textMuted,
                    },
                  ]}
                >
                  ✕
                </Text>
              </TouchableOpacity>
            </View>

            {[
              {
                label:
                  'Nombre',
                value:
                  supplierDraft.name,
                key:
                  'name' as const,
                placeholder:
                  'Ej. Distribuidora del Bajío',
              },
              {
                label:
                  'Contacto',
                value:
                  supplierDraft.contactName,
                key:
                  'contactName' as const,
                placeholder:
                  'Nombre de contacto',
              },
              {
                label:
                  'Teléfono',
                value:
                  supplierDraft.phone,
                key:
                  'phone' as const,
                placeholder:
                  'Teléfono',
              },
              {
                label:
                  'Correo',
                value:
                  supplierDraft.email,
                key:
                  'email' as const,
                placeholder:
                  'correo@proveedor.com',
              },
            ].map(
              field => (
                <React.Fragment
                  key={
                    field.key
                  }
                >
                  <Text
                    style={[
                      styles.label,
                      {
                        color:
                          theme.textMuted,
                      },
                    ]}
                  >
                    {field.label}
                  </Text>

                  <TextInput
                    value={
                      field.value
                    }
                    onChangeText={
                      value =>
                        setSupplierDraft(
                          current => ({
                            ...current,
                            [field.key]:
                              value,
                          }),
                        )
                    }
                    placeholder={
                      field.placeholder
                    }
                    placeholderTextColor={
                      theme.textMuted
                    }
                    style={[
                      styles.input,
                      {
                        color:
                          theme.text,
                        borderColor:
                          theme.border,
                        backgroundColor:
                          theme.background,
                      },
                    ]}
                  />
                </React.Fragment>
              ),
            )}

            <Text
              style={[
                styles.label,
                {
                  color:
                    theme.textMuted,
                },
              ]}
            >
              Notas
            </Text>

            <TextInput
              value={
                supplierDraft.notes
              }
              onChangeText={
                value =>
                  setSupplierDraft(
                    current => ({
                      ...current,
                      notes:
                        value,
                    }),
                  )
              }
              multiline
              style={[
                styles.input,
                styles.notesInput,
                {
                  color:
                    theme.text,
                  borderColor:
                    theme.border,
                  backgroundColor:
                    theme.background,
                },
              ]}
            />

            <View
              style={[
                styles.formSwitch,
                {
                  backgroundColor:
                    theme.background,
                },
              ]}
            >
              <View
                style={
                  styles.formSwitchText
                }
              >
                <Text
                  style={[
                    styles.formSwitchTitle,
                    {
                      color:
                        theme.text,
                    },
                  ]}
                >
                  Proveedor activo
                </Text>
              </View>

              <Switch
                value={
                  supplierDraft.isActive
                }
                onValueChange={
                  value =>
                    setSupplierDraft(
                      current => ({
                        ...current,
                        isActive:
                          value,
                      }),
                    )
                }
              />
            </View>

            <View
              style={
                styles.modalActions
              }
            >
              <TouchableOpacity
                style={[
                  styles.secondaryButton,
                  {
                    borderColor:
                      theme.border,
                  },
                ]}
                onPress={
                  () =>
                    setSupplierModalVisible(
                      false,
                    )
                }
              >
                <Text
                  style={[
                    styles.buttonText,
                    {
                      color:
                        theme.text,
                    },
                  ]}
                >
                  Cancelar
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                disabled={
                  saving
                }
                style={[
                  styles.primaryButton,
                  {
                    backgroundColor:
                      theme.primary,
                    opacity:
                      saving
                        ? 0.55
                        : 1,
                  },
                ]}
                onPress={
                  () => {
                    void handleSaveSupplier();
                  }
                }
              >
                {saving ? (
                  <ActivityIndicator
                    color={
                      theme.onPrimary
                    }
                  />
                ) : (
                  <Text
                    style={[
                      styles.buttonText,
                      {
                        color:
                          theme.onPrimary,
                      },
                    ]}
                  >
                    Guardar
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </Modal>

      <Modal
        visible={
          presentationModalVisible
        }
        transparent
        animationType="fade"
        onRequestClose={
          () =>
            setPresentationModalVisible(
              false,
            )
        }
      >
        <View
          style={
            styles.overlay
          }
        >
          <ScrollView
            style={[
              styles.modal,
              {
                borderColor:
                  theme.border,
                backgroundColor:
                  theme.surface,
              },
            ]}
          >
            <View
              style={
                styles.modalHeader
              }
            >
              <Text
                style={[
                  styles.modalTitle,
                  {
                    color:
                      theme.text,
                  },
                ]}
              >
                {presentationDraft.id
                  ? 'Editar presentación'
                  : 'Nueva presentación'}
              </Text>

              <TouchableOpacity
                onPress={
                  () =>
                    setPresentationModalVisible(
                      false,
                    )
                }
              >
                <Text
                  style={[
                    styles.closeText,
                    {
                      color:
                        theme.textMuted,
                    },
                  ]}
                >
                  ✕
                </Text>
              </TouchableOpacity>
            </View>

            <Text
              style={[
                styles.label,
                {
                  color:
                    theme.textMuted,
                },
              ]}
            >
              Proveedor
            </Text>

            <View
              style={
                styles.optionGrid
              }
            >
              {activeSuppliers.map(
                supplier => {
                  const selected =
                    supplier.id ===
                    presentationDraft.supplierId;

                  return (
                    <TouchableOpacity
                      key={
                        supplier.id
                      }
                      style={[
                        styles.option,
                        {
                          borderColor:
                            selected
                              ? theme.primary
                              : theme.border,
                          backgroundColor:
                            selected
                              ? theme.surfaceAlt
                              : theme.background,
                        },
                      ]}
                      onPress={
                        () =>
                          setPresentationDraft(
                            current => ({
                              ...current,
                              supplierId:
                                supplier.id,
                            }),
                          )
                      }
                    >
                      <Text
                        style={[
                          styles.optionText,
                          {
                            color:
                              selected
                                ? theme.primary
                                : theme.textMuted,
                          },
                        ]}
                      >
                        {supplier.name}
                      </Text>
                    </TouchableOpacity>
                  );
                },
              )}
            </View>

            <Text
              style={[
                styles.label,
                {
                  color:
                    theme.textMuted,
                },
              ]}
            >
              Insumo
            </Text>

            <View
              style={
                styles.optionGrid
              }
            >
              {activeInventoryItems.map(
                item => {
                  const selected =
                    item.id ===
                    presentationDraft.inventoryItemId;

                  return (
                    <TouchableOpacity
                      key={
                        item.id
                      }
                      style={[
                        styles.option,
                        {
                          borderColor:
                            selected
                              ? theme.primary
                              : theme.border,
                          backgroundColor:
                            selected
                              ? theme.surfaceAlt
                              : theme.background,
                        },
                      ]}
                      onPress={
                        () =>
                          selectInventoryItem(
                            item,
                          )
                      }
                    >
                      <Text
                        style={[
                          styles.optionText,
                          {
                            color:
                              selected
                                ? theme.primary
                                : theme.textMuted,
                          },
                        ]}
                      >
                        {item.name}
                      </Text>
                    </TouchableOpacity>
                  );
                },
              )}
            </View>

            <Text
              style={[
                styles.label,
                {
                  color:
                    theme.textMuted,
                },
              ]}
            >
              Nombre de presentación
            </Text>

            <TextInput
              value={
                presentationDraft.name
              }
              onChangeText={
                value =>
                  setPresentationDraft(
                    current => ({
                      ...current,
                      name:
                        value,
                    }),
                  )
              }
              placeholder="Ej. Caja 15 kg"
              placeholderTextColor={
                theme.textMuted
              }
              style={[
                styles.input,
                {
                  color:
                    theme.text,
                  borderColor:
                    theme.border,
                  backgroundColor:
                    theme.background,
                },
              ]}
            />

            <Text
              style={[
                styles.label,
                {
                  color:
                    theme.textMuted,
                },
              ]}
            >
              SKU del proveedor
            </Text>

            <TextInput
              value={
                presentationDraft.supplierSku
              }
              onChangeText={
                value =>
                  setPresentationDraft(
                    current => ({
                      ...current,
                      supplierSku:
                        value,
                    }),
                  )
              }
              placeholder="Opcional"
              placeholderTextColor={
                theme.textMuted
              }
              style={[
                styles.input,
                {
                  color:
                    theme.text,
                  borderColor:
                    theme.border,
                  backgroundColor:
                    theme.background,
                },
              ]}
            />

            <Text
              style={[
                styles.label,
                {
                  color:
                    theme.textMuted,
                },
              ]}
            >
              Unidad de compra
            </Text>

            <View
              style={
                styles.optionGrid
              }
            >
              {compatibleUnits.map(
                unit => {
                  const selected =
                    unit ===
                    presentationDraft.purchaseUnit;

                  return (
                    <TouchableOpacity
                      key={
                        unit
                      }
                      style={[
                        styles.option,
                        {
                          borderColor:
                            selected
                              ? theme.primary
                              : theme.border,
                          backgroundColor:
                            selected
                              ? theme.surfaceAlt
                              : theme.background,
                        },
                      ]}
                      onPress={
                        () =>
                          setPresentationDraft(
                            current => ({
                              ...current,
                              purchaseUnit:
                                unit,
                            }),
                          )
                      }
                    >
                      <Text
                        style={[
                          styles.optionText,
                          {
                            color:
                              selected
                                ? theme.primary
                                : theme.textMuted,
                          },
                        ]}
                      >
                        {PURCHASE_UNIT_LABEL[
                          unit
                        ]}
                      </Text>
                    </TouchableOpacity>
                  );
                },
              )}
            </View>

            <Text
              style={[
                styles.label,
                {
                  color:
                    theme.textMuted,
                },
              ]}
            >
              Contenido de la presentación
            </Text>

            <TextInput
              value={
                presentationDraft.purchaseQuantity
              }
              onChangeText={
                value =>
                  setPresentationDraft(
                    current => ({
                      ...current,
                      purchaseQuantity:
                        value,
                    }),
                  )
              }
              keyboardType="decimal-pad"
              placeholder="Ej. 15"
              placeholderTextColor={
                theme.textMuted
              }
              style={[
                styles.input,
                {
                  color:
                    theme.text,
                  borderColor:
                    theme.border,
                  backgroundColor:
                    theme.background,
                },
              ]}
            />

            <Text
              style={[
                styles.label,
                {
                  color:
                    theme.textMuted,
                },
              ]}
            >
              Último costo conocido
            </Text>

            <TextInput
              value={
                presentationDraft.lastPurchaseCost
              }
              onChangeText={
                value =>
                  setPresentationDraft(
                    current => ({
                      ...current,
                      lastPurchaseCost:
                        value,
                    }),
                  )
              }
              keyboardType="decimal-pad"
              placeholder="0.00"
              placeholderTextColor={
                theme.textMuted
              }
              style={[
                styles.input,
                {
                  color:
                    theme.text,
                  borderColor:
                    theme.border,
                  backgroundColor:
                    theme.background,
                },
              ]}
            />

            <View
              style={[
                styles.preview,
                {
                  borderColor:
                    theme.border,
                  backgroundColor:
                    theme.background,
                },
              ]}
            >
              <Text
                style={[
                  styles.previewTitle,
                  {
                    color:
                      theme.textMuted,
                  },
                ]}
              >
                Conversión
              </Text>

              <Text
                style={[
                  styles.previewValue,
                  {
                    color:
                      theme.text,
                  },
                ]}
              >
                {previewBaseQuantity.toLocaleString(
                  'es-MX',
                  {
                    maximumFractionDigits:
                      3,
                  },
                )}{' '}
                {selectedInventoryItem
                  ? BASE_UNIT_LABEL[
                      selectedInventoryItem.baseUnit
                    ]
                  : ''}
              </Text>

              <Text
                style={[
                  styles.previewMeta,
                  {
                    color:
                      theme.textMuted,
                  },
                ]}
              >
                Costo normalizado:{' '}
                {formatCurrency(
                  previewUnitCost,
                )}
                /
                {selectedInventoryItem
                  ? BASE_UNIT_LABEL[
                      selectedInventoryItem.baseUnit
                    ]
                  : 'unidad'}
              </Text>
            </View>

            <View
              style={[
                styles.formSwitch,
                {
                  backgroundColor:
                    theme.background,
                },
              ]}
            >
              <View
                style={
                  styles.formSwitchText
                }
              >
                <Text
                  style={[
                    styles.formSwitchTitle,
                    {
                      color:
                        theme.text,
                    },
                  ]}
                >
                  Presentación preferida
                </Text>

                <Text
                  style={[
                    styles.formSwitchSubtitle,
                    {
                      color:
                        theme.textMuted,
                    },
                  ]}
                >
                  Solo una presentación puede quedar marcada como preferida por insumo.
                </Text>
              </View>

              <Switch
                value={
                  presentationDraft.isPreferred
                }
                onValueChange={
                  value =>
                    setPresentationDraft(
                      current => ({
                        ...current,
                        isPreferred:
                          value,
                      }),
                    )
                }
              />
            </View>

            <View
              style={[
                styles.formSwitch,
                {
                  backgroundColor:
                    theme.background,
                },
              ]}
            >
              <View
                style={
                  styles.formSwitchText
                }
              >
                <Text
                  style={[
                    styles.formSwitchTitle,
                    {
                      color:
                        theme.text,
                    },
                  ]}
                >
                  Presentación activa
                </Text>
              </View>

              <Switch
                value={
                  presentationDraft.isActive
                }
                onValueChange={
                  value =>
                    setPresentationDraft(
                      current => ({
                        ...current,
                        isActive:
                          value,
                      }),
                    )
                }
              />
            </View>

            <Text
              style={[
                styles.label,
                {
                  color:
                    theme.textMuted,
                },
              ]}
            >
              Notas
            </Text>

            <TextInput
              value={
                presentationDraft.notes
              }
              onChangeText={
                value =>
                  setPresentationDraft(
                    current => ({
                      ...current,
                      notes:
                        value,
                    }),
                  )
              }
              multiline
              style={[
                styles.input,
                styles.notesInput,
                {
                  color:
                    theme.text,
                  borderColor:
                    theme.border,
                  backgroundColor:
                    theme.background,
                },
              ]}
            />

            <View
              style={
                styles.modalActions
              }
            >
              <TouchableOpacity
                style={[
                  styles.secondaryButton,
                  {
                    borderColor:
                      theme.border,
                  },
                ]}
                onPress={
                  () =>
                    setPresentationModalVisible(
                      false,
                    )
                }
              >
                <Text
                  style={[
                    styles.buttonText,
                    {
                      color:
                        theme.text,
                    },
                  ]}
                >
                  Cancelar
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                disabled={
                  saving
                }
                style={[
                  styles.primaryButton,
                  {
                    backgroundColor:
                      theme.primary,
                    opacity:
                      saving
                        ? 0.55
                        : 1,
                  },
                ]}
                onPress={
                  () => {
                    void handleSavePresentation();
                  }
                }
              >
                {saving ? (
                  <ActivityIndicator
                    color={
                      theme.onPrimary
                    }
                  />
                ) : (
                  <Text
                    style={[
                      styles.buttonText,
                      {
                        color:
                          theme.onPrimary,
                      },
                    ]}
                  >
                    Guardar
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </Modal>
    </>
  );
}
