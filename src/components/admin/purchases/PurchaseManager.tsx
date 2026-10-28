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
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import {
  useBusiness,
} from '../../../context/BusinessContext';

import {
  useCurrency,
} from '../../../hooks/useCurrency';

import {
  cancelPurchaseDraft,
  getPurchaseLines,
  getPurchases,
  getSupplierInventoryPresentations,
  getSuppliers,
  PurchaseLineRecord,
  PurchasePaymentMethod,
  PurchaseRecord,
  receivePurchase,
  reverseReceivedPurchase,
  savePurchaseDraft,
  Supplier,
  SupplierInventoryPresentation,
} from '../../../services/purchaseSupplierService';

import {
  purchaseStyles as s,
} from './PurchaseManager.styles';

type LineDraft = {
  id: string;
  presentationId: string;
  quantity: string;
  cost: string;
};

type Draft = {
  id?: string;
  supplierId: string;
  reference: string;
  date: string;
  paymentMethod: PurchasePaymentMethod;
  notes: string;
  lines: LineDraft[];
};

const methods:
Record<
  PurchasePaymentMethod,
  string
> = {
  cash: 'Efectivo',
  card: 'Tarjeta',
  transfer: 'Transferencia',
  other: 'Otro',
};

function today():
string {
  const d =
    new Date();

  return `${d.getFullYear()}-${String(
    d.getMonth() + 1,
  ).padStart(2, '0')}-${String(
    d.getDate(),
  ).padStart(2, '0')}`;
}

function blank(
  supplierId = '',
): Draft {
  return {
    supplierId,
    reference: '',
    date: today(),
    paymentMethod: 'cash',
    notes: '',
    lines: [],
  };
}

function uid():
string {
  return `${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 8)}`;
}

export function PurchaseManager() {
  const {
    theme,
  } =
    useBusiness();

  const {
    formatCurrency,
  } =
    useCurrency();

  const [
    purchases,
    setPurchases,
  ] =
    useState<PurchaseRecord[]>(
      [],
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
    detailLines,
    setDetailLines,
  ] =
    useState<PurchaseLineRecord[]>(
      [],
    );

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
    search,
    setSearch,
  ] =
    useState('');

  const [
    visible,
    setVisible,
  ] =
    useState(false);

  const [
    draft,
    setDraft,
  ] =
    useState<Draft>(
      blank(),
    );

  const [
    reversalReason,
    setReversalReason,
  ] =
    useState('');

  const load =
    useCallback(
      async (): Promise<void> => {
        try {
          setLoading(
            true,
          );

          const [
            p,
            sData,
            pr,
          ] =
            await Promise.all([
              getPurchases(),
              getSuppliers(
                false,
              ),
              getSupplierInventoryPresentations(
                false,
              ),
            ]);

          setPurchases(
            p,
          );

          setSuppliers(
            sData,
          );

          setPresentations(
            pr,
          );
        } catch (e) {
          Alert.alert(
            'Compras',
            e instanceof Error
              ? e.message
              : 'No se pudo cargar.',
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

  const filtered =
    useMemo(
      () => {
        const q =
          search
            .trim()
            .toLowerCase();

        return purchases.filter(
          p =>
            !q ||
            [
              p.supplierName,
              p.reference,
              p.status,
            ].some(
              v =>
                v
                  .toLowerCase()
                  .includes(q),
            ),
        );
      },
      [
        purchases,
        search,
      ],
    );

  const supplierPresentations =
    presentations.filter(
      p =>
        p.supplierId ===
          draft.supplierId &&
        p.isActive,
    );

  const opened =
    draft.id
      ? purchases.find(
          p =>
            p.id ===
            draft.id,
        )
      : undefined;

  const editable =
    !opened ||
    opened.status ===
      'draft';

  const total =
    draft.lines.reduce(
      (
        amount,
        line,
      ) => {
        const q =
          Number(
            line.quantity.replace(
              ',',
              '.',
            ),
          );

        const c =
          Number(
            line.cost.replace(
              ',',
              '.',
            ),
          );

        return (
          amount +
          (
            Number.isFinite(q) &&
            Number.isFinite(c)
              ? q * c
              : 0
          )
        );
      },
      0,
    );

  function status(
    value:
      PurchaseRecord['status'],
  ): string {
    if (
      value ===
      'received'
    ) {
      return 'RECIBIDA';
    }

    if (
      value ===
      'reversed'
    ) {
      return 'REVERTIDA';
    }

    if (
      value ===
      'cancelled'
    ) {
      return 'CANCELADA';
    }

    return 'BORRADOR';
  }

  function openNew():
  void {
    if (!suppliers.length) {
      Alert.alert(
        'Compras',
        'Primero crea un proveedor activo.',
      );

      return;
    }

    setDraft(
      blank(
        suppliers[0].id,
      ),
    );

    setDetailLines(
      [],
    );

    setReversalReason(
      '',
    );

    setVisible(
      true,
    );
  }

  async function openExisting(
    purchase:
      PurchaseRecord,
  ): Promise<void> {
    try {
      setSaving(
        true,
      );

      const lines =
        await getPurchaseLines(
          purchase.id,
        );

      setDetailLines(
        lines,
      );

      setReversalReason(
        '',
      );

      setDraft({
        id:
          purchase.id,
        supplierId:
          purchase.supplierId,
        reference:
          purchase.reference,
        date:
          purchase.purchasedAt.slice(
            0,
            10,
          ),
        paymentMethod:
          purchase.paymentMethod,
        notes:
          purchase.notes,
        lines:
          lines.map(
            l => ({
              id:
                l.id,
              presentationId:
                l.presentationId,
              quantity:
                String(
                  l.packageQuantity,
                ),
              cost:
                String(
                  l.packageCost,
                ),
            }),
          ),
      });

      setVisible(
        true,
      );
    } catch (e) {
      Alert.alert(
        'Compra',
        e instanceof Error
          ? e.message
          : 'No se pudo abrir.',
      );
    } finally {
      setSaving(
        false,
      );
    }
  }

  function addLine():
  void {
    const p =
      supplierPresentations[0];

    if (!p) {
      Alert.alert(
        'Compras',
        'Este proveedor no tiene presentaciones activas.',
      );

      return;
    }

    setDraft(
      d => ({
        ...d,
        lines: [
          ...d.lines,
          {
            id:
              uid(),
            presentationId:
              p.id,
            quantity:
              '1',
            cost:
              String(
                p.lastPurchaseCost,
              ),
          },
        ],
      }),
    );
  }

  function updateLine(
    id: string,
    changes:
      Partial<LineDraft>,
  ): void {
    setDraft(
      d => ({
        ...d,
        lines:
          d.lines.map(
            l =>
              l.id === id
                ? {
                    ...l,
                    ...changes,
                  }
                : l,
          ),
      }),
    );
  }

  async function persist(
    receive: boolean,
  ): Promise<void> {
    try {
      setSaving(
        true,
      );

      const date =
        new Date(
          `${draft.date}T12:00:00`,
        );

      if (
        Number.isNaN(
          date.getTime(),
        )
      ) {
        throw new Error(
          'Usa una fecha válida AAAA-MM-DD.',
        );
      }

      const id =
        await savePurchaseDraft({
          id:
            draft.id,
          supplierId:
            draft.supplierId,
          reference:
            draft.reference,
          purchasedAt:
            date,
          paymentMethod:
            draft.paymentMethod,
          notes:
            draft.notes,
          lines:
            draft.lines.map(
              l => ({
                presentationId:
                  l.presentationId,
                packageQuantity:
                  Number(
                    l.quantity.replace(
                      ',',
                      '.',
                    ),
                  ),
                packageCost:
                  Number(
                    l.cost.replace(
                      ',',
                      '.',
                    ),
                  ),
              }),
            ),
        });

      if (receive) {
        await receivePurchase(
          id,
        );

        Alert.alert(
          'Compra recibida',
          'Se actualizó inventario, costo promedio y egreso Insumos.',
        );
      }

      setVisible(
        false,
      );

      await load();
    } catch (e) {
      Alert.alert(
        'Compra',
        e instanceof Error
          ? e.message
          : 'No se pudo guardar.',
      );
    } finally {
      setSaving(
        false,
      );
    }
  }

  async function handleReverse():
  Promise<void> {
    if (
      !opened ||
      opened.status !==
        'received'
    ) {
      return;
    }

    try {
      setSaving(
        true,
      );

      await reverseReceivedPurchase(
        opened.id,
        reversalReason,
      );

      Alert.alert(
        'Compra revertida',
        'Se restauraron stock y costo, y el egreso automático fue eliminado.',
      );

      setVisible(
        false,
      );

      await load();
    } catch (e) {
      Alert.alert(
        'No se pudo revertir',
        e instanceof Error
          ? e.message
          : 'Error desconocido.',
      );
    } finally {
      setSaving(
        false,
      );
    }
  }

  return (
    <>
      <View
        style={
          s.toolbar
        }
      >
        <TextInput
          value={
            search
          }
          onChangeText={
            setSearch
          }
          placeholder="Buscar compra..."
          placeholderTextColor={
            theme.textMuted
          }
          style={[
            s.search,
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

        <TouchableOpacity
          onPress={
            openNew
          }
          style={[
            s.button,
            {
              backgroundColor:
                theme.primary,
            },
          ]}
        >
          <Text
            style={[
              s.buttonText,
              {
                color:
                  theme.onPrimary,
              },
            ]}
          >
            + COMPRA
          </Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator
          color={
            theme.primary
          }
        />
      ) : (
        <View
          style={
            s.list
          }
        >
          {filtered.map(
            p => (
              <TouchableOpacity
                key={
                  p.id
                }
                onPress={
                  () =>
                    void openExisting(
                      p,
                    )
                }
                style={[
                  s.card,
                  {
                    borderColor:
                      theme.border,
                    backgroundColor:
                      theme.surface,
                    opacity:
                      p.status ===
                        'cancelled'
                        ? 0.55
                        : 1,
                  },
                ]}
              >
                <View
                  style={
                    s.row
                  }
                >
                  <View
                    style={
                      s.info
                    }
                  >
                    <Text
                      style={[
                        s.title,
                        {
                          color:
                            theme.text,
                        },
                      ]}
                    >
                      {p.supplierName}
                    </Text>

                    <Text
                      style={[
                        s.meta,
                        {
                          color:
                            theme.textMuted,
                        },
                      ]}
                    >
                      {p.purchasedAt.slice(
                        0,
                        10,
                      )}
                      {p.reference
                        ? ` · ${p.reference}`
                        : ''}
                      {' · '}
                      {methods[
                        p.paymentMethod
                      ]}
                    </Text>

                    <Text
                      style={[
                        s.total,
                        {
                          color:
                            theme.primary,
                        },
                      ]}
                    >
                      {formatCurrency(
                        p.total,
                      )}
                    </Text>

                    {p.expenseId ? (
                      <Text
                        style={[
                          s.meta,
                          {
                            color:
                              theme.textMuted,
                          },
                        ]}
                      >
                        Egreso ligado ✓
                      </Text>
                    ) : null}

                    {p.status ===
                    'reversed' ? (
                      <Text
                        style={[
                          s.meta,
                          {
                            color:
                              theme.textMuted,
                          },
                        ]}
                      >
                        Reversa: {p.reversalReason || 'Sin motivo'}
                      </Text>
                    ) : null}
                  </View>

                  <View
                    style={[
                      s.badge,
                      {
                        borderColor:
                          p.status ===
                            'received'
                            ? theme.primary
                            : theme.border,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        s.badgeText,
                        {
                          color:
                            p.status ===
                              'received'
                              ? theme.primary
                              : theme.textMuted,
                        },
                      ]}
                    >
                      {status(
                        p.status,
                      )}
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            ),
          )}

          {!filtered.length ? (
            <View
              style={
                s.empty
              }
            >
              <Text
                style={[
                  s.emptyTitle,
                  {
                    color:
                      theme.text,
                  },
                ]}
              >
                No hay compras
              </Text>

              <Text
                style={[
                  s.emptyText,
                  {
                    color:
                      theme.textMuted,
                  },
                ]}
              >
                Crea una compra y recíbela para alimentar inventario y egresos.
              </Text>
            </View>
          ) : null}
        </View>
      )}

      <Modal
        visible={
          visible
        }
        transparent
        animationType="fade"
        onRequestClose={
          () =>
            setVisible(
              false,
            )
        }
      >
        <View
          style={
            s.overlay
          }
        >
          <ScrollView
            style={[
              s.modal,
              {
                borderColor:
                  theme.border,
                backgroundColor:
                  theme.surface,
              },
            ]}
            keyboardShouldPersistTaps="handled"
          >
            <View
              style={
                s.header
              }
            >
              <View>
                <Text
                  style={[
                    s.modalTitle,
                    {
                      color:
                        theme.text,
                    },
                  ]}
                >
                  {draft.id
                    ? 'Compra'
                    : 'Nueva compra'}
                </Text>

                {opened ? (
                  <Text
                    style={[
                      s.meta,
                      {
                        color:
                          theme.textMuted,
                      },
                    ]}
                  >
                    {status(
                      opened.status,
                    )}
                  </Text>
                ) : null}
              </View>

              <TouchableOpacity
                onPress={
                  () =>
                    setVisible(
                      false,
                    )
                }
              >
                <Text
                  style={[
                    s.close,
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
                s.label,
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
                s.chips
              }
            >
              {suppliers.map(
                x => {
                  const selected =
                    x.id ===
                    draft.supplierId;

                  return (
                    <TouchableOpacity
                      key={
                        x.id
                      }
                      disabled={
                        !editable
                      }
                      onPress={
                        () =>
                          setDraft(
                            d => ({
                              ...d,
                              supplierId:
                                x.id,
                              lines: [],
                            }),
                          )
                      }
                      style={[
                        s.chip,
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
                    >
                      <Text
                        style={[
                          s.chipText,
                          {
                            color:
                              selected
                                ? theme.primary
                                : theme.textMuted,
                          },
                        ]}
                      >
                        {x.name}
                      </Text>
                    </TouchableOpacity>
                  );
                },
              )}
            </View>

            <View
              style={
                s.cols
              }
            >
              <View
                style={
                  s.col
                }
              >
                <Text
                  style={[
                    s.label,
                    {
                      color:
                        theme.textMuted,
                    },
                  ]}
                >
                  Fecha
                </Text>

                <TextInput
                  editable={
                    editable
                  }
                  value={
                    draft.date
                  }
                  onChangeText={
                    v =>
                      setDraft(
                        d => ({
                          ...d,
                          date:
                            v,
                        }),
                      )
                  }
                  style={[
                    s.input,
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
              </View>

              <View
                style={
                  s.col
                }
              >
                <Text
                  style={[
                    s.label,
                    {
                      color:
                        theme.textMuted,
                    },
                  ]}
                >
                  Folio / referencia
                </Text>

                <TextInput
                  editable={
                    editable
                  }
                  value={
                    draft.reference
                  }
                  onChangeText={
                    v =>
                      setDraft(
                        d => ({
                          ...d,
                          reference:
                            v,
                        }),
                      )
                  }
                  style={[
                    s.input,
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
              </View>
            </View>

            <Text
              style={[
                s.label,
                {
                  color:
                    theme.textMuted,
                },
              ]}
            >
              Método de pago
            </Text>

            <View
              style={
                s.chips
              }
            >
              {(
                Object.keys(
                  methods,
                ) as
                PurchasePaymentMethod[]
              ).map(
                m => {
                  const selected =
                    m ===
                    draft.paymentMethod;

                  return (
                    <TouchableOpacity
                      key={
                        m
                      }
                      disabled={
                        !editable
                      }
                      onPress={
                        () =>
                          setDraft(
                            d => ({
                              ...d,
                              paymentMethod:
                                m,
                            }),
                          )
                      }
                      style={[
                        s.chip,
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
                    >
                      <Text
                        style={[
                          s.chipText,
                          {
                            color:
                              selected
                                ? theme.primary
                                : theme.textMuted,
                          },
                        ]}
                      >
                        {methods[m]}
                      </Text>
                    </TouchableOpacity>
                  );
                },
              )}
            </View>

            <View
              style={
                s.sectionHeader
              }
            >
              <Text
                style={[
                  s.sectionTitle,
                  {
                    color:
                      theme.text,
                  },
                ]}
              >
                Insumos
              </Text>

              {editable ? (
                <TouchableOpacity
                  onPress={
                    addLine
                  }
                >
                  <Text
                    style={{
                      color:
                        theme.primary,
                      fontSize: 10,
                      fontWeight:
                        '900',
                    }}
                  >
                    + Agregar renglón
                  </Text>
                </TouchableOpacity>
              ) : null}
            </View>

            {draft.lines.map(
              l => {
                const p =
                  presentations.find(
                    x =>
                      x.id ===
                      l.presentationId,
                  );

                const q =
                  Number(
                    l.quantity.replace(
                      ',',
                      '.',
                    ),
                  );

                const c =
                  Number(
                    l.cost.replace(
                      ',',
                      '.',
                    ),
                  );

                return (
                  <View
                    key={
                      l.id
                    }
                    style={[
                      s.lineCard,
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
                        s.label,
                        {
                          color:
                            theme.textMuted,
                        },
                      ]}
                    >
                      Presentación
                    </Text>

                    <View
                      style={
                        s.chips
                      }
                    >
                      {supplierPresentations.map(
                        o => {
                          const selected =
                            o.id ===
                            l.presentationId;

                          return (
                            <TouchableOpacity
                              key={
                                o.id
                              }
                              disabled={
                                !editable
                              }
                              onPress={
                                () =>
                                  updateLine(
                                    l.id,
                                    {
                                      presentationId:
                                        o.id,
                                      cost:
                                        String(
                                          o.lastPurchaseCost,
                                        ),
                                    },
                                  )
                              }
                              style={[
                                s.chip,
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
                            >
                              <Text
                                style={[
                                  s.chipText,
                                  {
                                    color:
                                      selected
                                        ? theme.primary
                                        : theme.textMuted,
                                  },
                                ]}
                              >
                                {o.inventoryItemName}
                                {' · '}
                                {o.name}
                              </Text>
                            </TouchableOpacity>
                          );
                        },
                      )}
                    </View>

                    <View
                      style={
                        s.cols
                      }
                    >
                      <View
                        style={
                          s.col
                        }
                      >
                        <Text
                          style={[
                            s.label,
                            {
                              color:
                                theme.textMuted,
                            },
                          ]}
                        >
                          Cantidad
                        </Text>

                        <TextInput
                          editable={
                            editable
                          }
                          keyboardType="decimal-pad"
                          value={
                            l.quantity
                          }
                          onChangeText={
                            v =>
                              updateLine(
                                l.id,
                                {
                                  quantity:
                                    v,
                                },
                              )
                          }
                          style={[
                            s.input,
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
                      </View>

                      <View
                        style={
                          s.col
                        }
                      >
                        <Text
                          style={[
                            s.label,
                            {
                              color:
                                theme.textMuted,
                            },
                          ]}
                        >
                          Costo por presentación
                        </Text>

                        <TextInput
                          editable={
                            editable
                          }
                          keyboardType="decimal-pad"
                          value={
                            l.cost
                          }
                          onChangeText={
                            v =>
                              updateLine(
                                l.id,
                                {
                                  cost:
                                    v,
                                },
                              )
                          }
                          style={[
                            s.input,
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
                      </View>
                    </View>

                    <Text
                      style={[
                        s.summary,
                        {
                          color:
                            theme.textMuted,
                        },
                      ]}
                    >
                      {p
                        ? `${p.baseQuantity.toLocaleString(
                            'es-MX',
                          )} base por presentación`
                        : ''}
                      {' · '}
                      Total:{' '}
                      {formatCurrency(
                        (
                          Number.isFinite(
                            q,
                          )
                            ? q
                            : 0
                        ) *
                        (
                          Number.isFinite(
                            c,
                          )
                            ? c
                            : 0
                        ),
                      )}
                    </Text>

                    {editable ? (
                      <TouchableOpacity
                        onPress={
                          () =>
                            setDraft(
                              d => ({
                                ...d,
                                lines:
                                  d.lines.filter(
                                    x =>
                                      x.id !==
                                      l.id,
                                  ),
                              }),
                            )
                        }
                      >
                        <Text
                          style={
                            s.remove
                          }
                        >
                          Quitar renglón
                        </Text>
                      </TouchableOpacity>
                    ) : null}
                  </View>
                );
              },
            )}

            {opened &&
            (
              opened.status ===
                'received' ||
              opened.status ===
                'reversed'
            ) &&
            detailLines.length >
              0 ? (
              <View
                style={[
                  s.auditPanel,
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
                    s.sectionTitle,
                    {
                      color:
                        theme.text,
                    },
                  ]}
                >
                  Trazabilidad de recepción
                </Text>

                {detailLines.map(
                  line => (
                    <View
                      key={
                        line.id
                      }
                      style={[
                        s.auditLine,
                        {
                          borderColor:
                            theme.border,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          s.auditTitle,
                          {
                            color:
                              theme.text,
                          },
                        ]}
                      >
                        {line.inventoryItemName}
                      </Text>

                      <Text
                        style={[
                          s.meta,
                          {
                            color:
                              theme.textMuted,
                          },
                        ]}
                      >
                        Stock:{' '}
                        {line.stockBefore ??
                          '—'}
                        {' → '}
                        {line.stockAfter ??
                          '—'}
                      </Text>

                      <Text
                        style={[
                          s.meta,
                          {
                            color:
                              theme.textMuted,
                          },
                        ]}
                      >
                        Costo:{' '}
                        {line.previousUnitCost ===
                        null
                          ? '—'
                          : formatCurrency(
                              line.previousUnitCost,
                            )}
                        {' → '}
                        {line.resultingUnitCost ===
                        null
                          ? '—'
                          : formatCurrency(
                              line.resultingUnitCost,
                            )}
                        /unidad base
                      </Text>

                      {line.reversedAt ? (
                        <Text
                          style={[
                            s.meta,
                            {
                              color:
                                theme.textMuted,
                            },
                          ]}
                        >
                          Revertido ✓
                        </Text>
                      ) : null}
                    </View>
                  ),
                )}
              </View>
            ) : null}

            <View
              style={[
                s.totalPanel,
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
                  s.totalLabel,
                  {
                    color:
                      theme.textMuted,
                  },
                ]}
              >
                TOTAL
              </Text>

              <Text
                style={[
                  s.grandTotal,
                  {
                    color:
                      theme.primary,
                  },
                ]}
              >
                {formatCurrency(
                  total,
                )}
              </Text>
            </View>

            <Text
              style={[
                s.label,
                {
                  color:
                    theme.textMuted,
                },
              ]}
            >
              Notas
            </Text>

            <TextInput
              editable={
                editable
              }
              multiline
              value={
                draft.notes
              }
              onChangeText={
                v =>
                  setDraft(
                    d => ({
                      ...d,
                      notes:
                        v,
                    }),
                  )
              }
              style={[
                s.input,
                s.notes,
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

            {opened?.status ===
            'received' ? (
              <View
                style={[
                  s.reversalPanel,
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
                    s.sectionTitle,
                    {
                      color:
                        theme.text,
                    },
                  ]}
                >
                  Revertir recepción
                </Text>

                <Text
                  style={[
                    s.meta,
                    {
                      color:
                        theme.textMuted,
                    },
                  ]}
                >
                  Solo se permitirá si el stock y costo de estos insumos no cambiaron después de esta recepción.
                </Text>

                {!opened.reversalSupported ? (
                  <Text
                    style={[
                      s.warning,
                      {
                        color:
                          theme.textMuted,
                      },
                    ]}
                  >
                    Esta compra fue recibida antes de habilitar reversas seguras y no puede revertirse automáticamente.
                  </Text>
                ) : (
                  <>
                    <TextInput
                      value={
                        reversalReason
                      }
                      onChangeText={
                        setReversalReason
                      }
                      placeholder="Motivo de la reversa"
                      placeholderTextColor={
                        theme.textMuted
                      }
                      multiline
                      style={[
                        s.input,
                        s.notes,
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

                    <TouchableOpacity
                      disabled={
                        saving
                      }
                      onPress={
                        () =>
                          Alert.alert(
                            'Revertir compra',
                            'Se restaurará el inventario y costo anterior, y se eliminará el egreso automático asociado.',
                            [
                              {
                                text:
                                  'Volver',
                                style:
                                  'cancel',
                              },
                              {
                                text:
                                  'Revertir',
                                style:
                                  'destructive',
                                onPress:
                                  () => {
                                    void handleReverse();
                                  },
                              },
                            ],
                          )
                      }
                      style={
                        s.danger
                      }
                    >
                      <Text
                        style={
                          s.dangerText
                        }
                      >
                        Revertir recepción
                      </Text>
                    </TouchableOpacity>
                  </>
                )}
              </View>
            ) : null}

            {opened?.status ===
            'reversed' ? (
              <View
                style={[
                  s.reversalPanel,
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
                    s.sectionTitle,
                    {
                      color:
                        theme.text,
                    },
                  ]}
                >
                  Compra revertida
                </Text>

                <Text
                  style={[
                    s.meta,
                    {
                      color:
                        theme.textMuted,
                    },
                  ]}
                >
                  Motivo: {opened.reversalReason || 'Sin motivo'}
                </Text>
              </View>
            ) : null}

            <View
              style={
                s.actions
              }
            >
              <TouchableOpacity
                style={[
                  s.secondary,
                  {
                    borderColor:
                      theme.border,
                  },
                ]}
                onPress={
                  () =>
                    setVisible(
                      false,
                    )
                }
              >
                <Text
                  style={[
                    s.buttonText,
                    {
                      color:
                        theme.text,
                    },
                  ]}
                >
                  Cerrar
                </Text>
              </TouchableOpacity>

              {editable &&
              draft.id ? (
                <TouchableOpacity
                  style={
                    s.danger
                  }
                  onPress={
                    () =>
                      Alert.alert(
                        'Cancelar compra',
                        'El borrador se marcará como cancelado.',
                        [
                          {
                            text:
                              'Volver',
                            style:
                              'cancel',
                          },
                          {
                            text:
                              'Cancelar compra',
                            style:
                              'destructive',
                            onPress:
                              () =>
                                void (async () => {
                                  try {
                                    setSaving(
                                      true,
                                    );

                                    await cancelPurchaseDraft(
                                      draft.id!,
                                    );

                                    setVisible(
                                      false,
                                    );

                                    await load();
                                  } catch (e) {
                                    Alert.alert(
                                      'Compra',
                                      e instanceof Error
                                        ? e.message
                                        : 'No se pudo cancelar.',
                                    );
                                  } finally {
                                    setSaving(
                                      false,
                                    );
                                  }
                                })(),
                          },
                        ],
                      )
                  }
                >
                  <Text
                    style={
                      s.dangerText
                    }
                  >
                    Cancelar compra
                  </Text>
                </TouchableOpacity>
              ) : null}

              {editable ? (
                <>
                  <TouchableOpacity
                    disabled={
                      saving
                    }
                    onPress={
                      () =>
                        void persist(
                          false,
                        )
                    }
                    style={[
                      s.secondary,
                      {
                        borderColor:
                          theme.primary,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        s.buttonText,
                        {
                          color:
                            theme.primary,
                        },
                      ]}
                    >
                      Guardar borrador
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    disabled={
                      saving
                    }
                    onPress={
                      () =>
                        Alert.alert(
                          'Recibir compra',
                          'Al confirmar se sumará el stock, se recalculará el costo promedio y se creará el egreso en Insumos.',
                          [
                            {
                              text:
                                'Cancelar',
                              style:
                                'cancel',
                            },
                            {
                              text:
                                'Recibir',
                              onPress:
                                () =>
                                  void persist(
                                    true,
                                  ),
                            },
                          ],
                        )
                    }
                    style={[
                      s.primary,
                      {
                        backgroundColor:
                          theme.primary,
                        opacity:
                          saving
                            ? 0.55
                            : 1,
                      },
                    ]}
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
                          s.buttonText,
                          {
                            color:
                              theme.onPrimary,
                          },
                        ]}
                      >
                        Guardar y recibir
                      </Text>
                    )}
                  </TouchableOpacity>
                </>
              ) : null}
            </View>
          </ScrollView>
        </View>
      </Modal>
    </>
  );
}
