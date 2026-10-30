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
  createCrmCustomer,
  CrmAudience,
  CrmAudienceMember,
  CrmContactChannel,
  CrmCustomer,
  CrmCustomerDetail,
  CrmSegmentCode,
  CrmSegmentSummary,
  CrmSettings,
  getCrmAudienceMembers,
  getCrmAudiences,
  getCrmCustomerDetail,
  getCrmCustomers,
  getCrmSegmentSummary,
  getCrmSettings,
  markCrmCustomerContacted,
  saveCrmAudience,
  saveCrmSettings,
  updateCrmContactPreferences,
  updateCrmCustomer,
} from '../../../services/crmService';

import {
  useBusiness,
} from '../../../context/BusinessContext';

import {
  useCurrency,
} from '../../../hooks/useCurrency';

import {
  styles,
} from './AdminCrm.styles';

export function AdminCrm() {
  const {
    theme,
  } =
    useBusiness();

  const {
    formatCurrency,
  } =
    useCurrency();

  const [
    customers,
    setCustomers,
  ] =
    useState<CrmCustomer[]>(
      [],
    );

  const [
    search,
    setSearch,
  ] =
    useState('');

  const [
    activeOnly,
    setActiveOnly,
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
    detail,
    setDetail,
  ] =
    useState<CrmCustomerDetail | null>(
      null,
    );

  const [
    detailVisible,
    setDetailVisible,
  ] =
    useState(false);

  const [
    createVisible,
    setCreateVisible,
  ] =
    useState(false);

  const [
    notes,
    setNotes,
  ] =
    useState('');

  const [
    tagsText,
    setTagsText,
  ] =
    useState('');

  const [
    detailActive,
    setDetailActive,
  ] =
    useState(true);

  const [
    newName,
    setNewName,
  ] =
    useState('');

  const [
    newPhone,
    setNewPhone,
  ] =
    useState('');

  const [
    newEmail,
    setNewEmail,
  ] =
    useState('');

  const [
    segmentFilter,
    setSegmentFilter,
  ] =
    useState<
      CrmSegmentCode | 'all'
    >('all');

  const [
    segmentSummary,
    setSegmentSummary,
  ] =
    useState<CrmSegmentSummary>({
      totalCustomers: 0,
      newCustomers: 0,
      frequentCustomers: 0,
      vipCustomers: 0,
      highTicketCustomers: 0,
      inactiveCustomers: 0,
    });

  const [
    crmSettings,
    setCrmSettings,
  ] =
    useState<CrmSettings>({
      vipMinSpend: 3000,
      frequentMinOrders: 5,
      highTicketMinAverage: 400,
      inactiveDays: 45,
      newCustomerDays: 30,
    });

  const [
    settingsVisible,
    setSettingsVisible,
  ] =
    useState(false);

  const [
    vipMinSpendText,
    setVipMinSpendText,
  ] =
    useState('3000');

  const [
    frequentMinOrdersText,
    setFrequentMinOrdersText,
  ] =
    useState('5');

  const [
    highTicketMinAverageText,
    setHighTicketMinAverageText,
  ] =
    useState('400');

  const [
    inactiveDaysText,
    setInactiveDaysText,
  ] =
    useState('45');

  const [
    newCustomerDaysText,
    setNewCustomerDaysText,
  ] =
    useState('30');


  const [
    marketingOptIn,
    setMarketingOptIn,
  ] =
    useState(false);

  const [
    contactChannel,
    setContactChannel,
  ] =
    useState<CrmContactChannel>(
      'none',
    );

  const [
    doNotContactReason,
    setDoNotContactReason,
  ] =
    useState('');

  const [
    audiencesVisible,
    setAudiencesVisible,
  ] =
    useState(false);

  const [
    audiences,
    setAudiences,
  ] =
    useState<CrmAudience[]>(
      [],
    );

  const [
    selectedAudience,
    setSelectedAudience,
  ] =
    useState<CrmAudience | null>(
      null,
    );

  const [
    audienceMembers,
    setAudienceMembers,
  ] =
    useState<CrmAudienceMember[]>(
      [],
    );

  const [
    audienceEditorVisible,
    setAudienceEditorVisible,
  ] =
    useState(false);

  const [
    audienceName,
    setAudienceName,
  ] =
    useState('');

  const [
    audienceDescription,
    setAudienceDescription,
  ] =
    useState('');

  const [
    audienceSegments,
    setAudienceSegments,
  ] =
    useState<CrmSegmentCode[]>(
      [],
    );

  const [
    audienceTagsText,
    setAudienceTagsText,
  ] =
    useState('');

  const [
    audienceMinSpendText,
    setAudienceMinSpendText,
  ] =
    useState('');

  const [
    audienceMinOrdersText,
    setAudienceMinOrdersText,
  ] =
    useState('');

  const [
    audienceRequireOptIn,
    setAudienceRequireOptIn,
  ] =
    useState(true);

  const [
    audienceActive,
    setAudienceActive,
  ] =
    useState(true);

  const load =
    useCallback(
      async (): Promise<void> => {
        try {
          setLoading(
            true,
          );

          const [
            data,
            summary,
            settings,
          ] =
            await Promise.all([
              getCrmCustomers(
                search,
                activeOnly,
              ),
              getCrmSegmentSummary(),
              getCrmSettings(),
            ]);

          setCustomers(
            data,
          );

          setSegmentSummary(
            summary,
          );

          setCrmSettings(
            settings,
          );
        } catch (error) {
          Alert.alert(
            'CRM',
            error instanceof Error
              ? error.message
              : 'No se pudieron cargar los clientes.',
          );
        } finally {
          setLoading(
            false,
          );
        }
      },
      [
        search,
        activeOnly,
      ],
    );

  useEffect(
    () => {
      const timer =
        setTimeout(
          () => {
            void load();
          },
          250,
        );

      return () =>
        clearTimeout(
          timer,
        );
    },
    [
      load,
    ],
  );

  const filteredCustomers =
    useMemo(
      () =>
        segmentFilter ===
          'all'
          ? customers
          : customers.filter(
              customer =>
                customer.segmentCodes.includes(
                  segmentFilter,
                ),
            ),
      [
        customers,
        segmentFilter,
      ],
    );

  const totals =
    useMemo(
      () => ({
        customers:
          filteredCustomers.length,
        orders:
          filteredCustomers.reduce(
            (
              total,
              customer,
            ) =>
              total +
              customer.deliveredOrders,
            0,
          ),
        spend:
          filteredCustomers.reduce(
            (
              total,
              customer,
            ) =>
              total +
              customer.netSpend,
            0,
          ),
      }),
      [
        filteredCustomers,
      ],
    );

  async function openCustomer(
    customerId: string,
  ): Promise<void> {
    try {
      setSaving(
        true,
      );

      const data =
        await getCrmCustomerDetail(
          customerId,
        );

      setDetail(
        data,
      );

      setNotes(
        data.notes,
      );

      setTagsText(
        data.tags.join(
          ', ',
        ),
      );

      setDetailActive(
        data.isActive,
      );

      setMarketingOptIn(
        data.marketingOptIn,
      );

      setContactChannel(
        data.preferredContactChannel,
      );

      setDoNotContactReason(
        data.doNotContactReason,
      );

      setDetailVisible(
        true,
      );
    } catch (error) {
      Alert.alert(
        'CRM',
        error instanceof Error
          ? error.message
          : 'No se pudo abrir el cliente.',
      );
    } finally {
      setSaving(
        false,
      );
    }
  }

  async function saveDetail():
  Promise<void> {
    if (!detail) {
      return;
    }

    try {
      setSaving(
        true,
      );

      await updateCrmCustomer({
        id:
          detail.id,
        notes,
        tags:
          tagsText
            .split(',')
            .map(
              value =>
                value.trim(),
            )
            .filter(
              Boolean,
            ),
        isActive:
          detailActive,
      });

      setDetailVisible(
        false,
      );

      await load();
    } catch (error) {
      Alert.alert(
        'CRM',
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

  async function createCustomer():
  Promise<void> {
    try {
      setSaving(
        true,
      );

      const id =
        await createCrmCustomer({
          name:
            newName,
          phone:
            newPhone,
          email:
            newEmail,
        });

      setCreateVisible(
        false,
      );

      setNewName(
        '',
      );

      setNewPhone(
        '',
      );

      setNewEmail(
        '',
      );

      await load();

      await openCustomer(
        id,
      );
    } catch (error) {
      Alert.alert(
        'CRM',
        error instanceof Error
          ? error.message
          : 'No se pudo crear el cliente.',
      );
    } finally {
      setSaving(
        false,
      );
    }
  }

  async function saveContactPreferences():
  Promise<void> {
    if (!detail) {
      return;
    }

    try {
      setSaving(
        true,
      );

      await updateCrmContactPreferences({
        customerId:
          detail.id,
        marketingOptIn,
        preferredContactChannel:
          contactChannel,
        doNotContactReason,
      });

      const refreshed =
        await getCrmCustomerDetail(
          detail.id,
        );

      setDetail(
        refreshed,
      );

      setMarketingOptIn(
        refreshed.marketingOptIn,
      );

      setContactChannel(
        refreshed.preferredContactChannel,
      );

      setDoNotContactReason(
        refreshed.doNotContactReason,
      );

      await load();
    } catch (error) {
      Alert.alert(
        'CRM',
        error instanceof Error
          ? error.message
          : 'No se pudieron guardar las preferencias de contacto.',
      );
    } finally {
      setSaving(
        false,
      );
    }
  }

  async function registerContact():
  Promise<void> {
    if (!detail) {
      return;
    }

    try {
      setSaving(
        true,
      );

      const contactedAt =
        await markCrmCustomerContacted(
          detail.id,
        );

      setDetail(
        current =>
          current
            ? {
                ...current,
                lastContactedAt:
                  contactedAt,
              }
            : current,
      );
    } catch (error) {
      Alert.alert(
        'CRM',
        error instanceof Error
          ? error.message
          : 'No se pudo registrar el contacto.',
      );
    } finally {
      setSaving(
        false,
      );
    }
  }

  async function openAudiences():
  Promise<void> {
    try {
      setSaving(
        true,
      );

      const data =
        await getCrmAudiences(
          false,
        );

      setAudiences(
        data,
      );

      setSelectedAudience(
        null,
      );

      setAudienceMembers(
        [],
      );

      setAudiencesVisible(
        true,
      );
    } catch (error) {
      Alert.alert(
        'CRM',
        error instanceof Error
          ? error.message
          : 'No se pudieron cargar las audiencias.',
      );
    } finally {
      setSaving(
        false,
      );
    }
  }

  async function openAudience(
    audience:
      CrmAudience,
  ): Promise<void> {
    try {
      setSaving(
        true,
      );

      const members =
        await getCrmAudienceMembers(
          audience.id,
        );

      setSelectedAudience(
        audience,
      );

      setAudienceMembers(
        members,
      );
    } catch (error) {
      Alert.alert(
        'CRM',
        error instanceof Error
          ? error.message
          : 'No se pudo cargar la audiencia.',
      );
    } finally {
      setSaving(
        false,
      );
    }
  }

  function openNewAudience():
  void {
    setSelectedAudience(
      null,
    );
    setAudienceName(
      '',
    );
    setAudienceDescription(
      '',
    );
    setAudienceSegments(
      [],
    );
    setAudienceTagsText(
      '',
    );
    setAudienceMinSpendText(
      '',
    );
    setAudienceMinOrdersText(
      '',
    );
    setAudienceRequireOptIn(
      true,
    );
    setAudienceActive(
      true,
    );
    setAudienceEditorVisible(
      true,
    );
  }

  function editAudience(
    audience:
      CrmAudience,
  ): void {
    setSelectedAudience(
      audience,
    );
    setAudienceName(
      audience.name,
    );
    setAudienceDescription(
      audience.description,
    );
    setAudienceSegments(
      audience.segmentCodes,
    );
    setAudienceTagsText(
      audience.requiredTags.join(
        ', ',
      ),
    );
    setAudienceMinSpendText(
      audience.minNetSpend ==
      null
        ? ''
        : String(
            audience.minNetSpend,
          ),
    );
    setAudienceMinOrdersText(
      audience.minDeliveredOrders ==
      null
        ? ''
        : String(
            audience.minDeliveredOrders,
          ),
    );
    setAudienceRequireOptIn(
      audience.requireMarketingOptIn,
    );
    setAudienceActive(
      audience.isActive,
    );
    setAudienceEditorVisible(
      true,
    );
  }

  function toggleAudienceSegment(
    segment:
      CrmSegmentCode,
  ): void {
    setAudienceSegments(
      current =>
        current.includes(
          segment,
        )
          ? current.filter(
              value =>
                value !==
                segment,
            )
          : [
              ...current,
              segment,
            ],
    );
  }

  async function handleSaveAudience():
  Promise<void> {
    try {
      setSaving(
        true,
      );

      await saveCrmAudience({
        id:
          selectedAudience
            ?.id ??
          null,
        name:
          audienceName,
        description:
          audienceDescription,
        segmentCodes:
          audienceSegments,
        requiredTags:
          audienceTagsText
            .split(',')
            .map(
              value =>
                value
                  .trim()
                  .toLowerCase(),
            )
            .filter(
              Boolean,
            ),
        minNetSpend:
          audienceMinSpendText
            .trim()
            ? Number(
                audienceMinSpendText
                  .replace(
                    ',',
                    '.',
                  ),
              )
            : null,
        minDeliveredOrders:
          audienceMinOrdersText
            .trim()
            ? Number(
                audienceMinOrdersText,
              )
            : null,
        requireMarketingOptIn:
          audienceRequireOptIn,
        isActive:
          audienceActive,
      });

      setAudienceEditorVisible(
        false,
      );

      const data =
        await getCrmAudiences(
          false,
        );

      setAudiences(
        data,
      );

      setSelectedAudience(
        null,
      );

      setAudienceMembers(
        [],
      );
    } catch (error) {
      Alert.alert(
        'CRM',
        error instanceof Error
          ? error.message
          : 'No se pudo guardar la audiencia.',
      );
    } finally {
      setSaving(
        false,
      );
    }
  }

  function openSettings():
  void {
    setVipMinSpendText(
      String(
        crmSettings.vipMinSpend,
      ),
    );

    setFrequentMinOrdersText(
      String(
        crmSettings.frequentMinOrders,
      ),
    );

    setHighTicketMinAverageText(
      String(
        crmSettings.highTicketMinAverage,
      ),
    );

    setInactiveDaysText(
      String(
        crmSettings.inactiveDays,
      ),
    );

    setNewCustomerDaysText(
      String(
        crmSettings.newCustomerDays,
      ),
    );

    setSettingsVisible(
      true,
    );
  }

  async function handleSaveSettings():
  Promise<void> {
    try {
      setSaving(
        true,
      );

      await saveCrmSettings({
        vipMinSpend:
          Number(
            vipMinSpendText.replace(
              ',',
              '.',
            ),
          ),
        frequentMinOrders:
          Number(
            frequentMinOrdersText,
          ),
        highTicketMinAverage:
          Number(
            highTicketMinAverageText.replace(
              ',',
              '.',
            ),
          ),
        inactiveDays:
          Number(
            inactiveDaysText,
          ),
        newCustomerDays:
          Number(
            newCustomerDaysText,
          ),
      });

      setSettingsVisible(
        false,
      );

      await load();
    } catch (error) {
      Alert.alert(
        'CRM',
        error instanceof Error
          ? error.message
          : 'No se pudo guardar la segmentación.',
      );
    } finally {
      setSaving(
        false,
      );
    }
  }

  return (
    <View
      style={
        styles.container
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
            CRM
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
            Directorio unificado de clientes, compras, recompensas y eventos.
          </Text>
        </View>
      </View>

      <View
        style={
          styles.metrics
        }
      >
        <Metric
          label="Clientes"
          value={
            String(
              totals.customers,
            )
          }
          theme={
            theme
          }
        />

        <Metric
          label="Órdenes"
          value={
            String(
              totals.orders,
            )
          }
          theme={
            theme
          }
        />

        <Metric
          label="Venta neta"
          value={
            formatCurrency(
              totals.spend,
            )
          }
          theme={
            theme
          }
        />
      </View>

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
          placeholder="Buscar por nombre, teléfono, correo o etiqueta..."
          placeholderTextColor={
            theme.textMuted
          }
          style={[
            styles.search,
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
          style={[
            styles.toggle,
            {
              borderColor:
                activeOnly
                  ? theme.primary
                  : theme.border,
              backgroundColor:
                activeOnly
                  ? theme.surfaceAlt
                  : theme.surface,
            },
          ]}
          onPress={
            () =>
              setActiveOnly(
                value =>
                  !value,
              )
          }
        >
          <Text
            style={[
              styles.buttonText,
              {
                color:
                  activeOnly
                    ? theme.primary
                    : theme.textMuted,
              },
            ]}
          >
            {activeOnly
              ? 'SOLO ACTIVOS'
              : 'TODOS'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={
            () => {
              void openAudiences();
            }
          }
          style={[
            styles.toggle,
            {
              borderColor:
                theme.border,
              backgroundColor:
                theme.surface,
            },
          ]}
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
            AUDIENCIAS
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={
            openSettings
          }
          style={[
            styles.toggle,
            {
              borderColor:
                theme.border,
              backgroundColor:
                theme.surface,
            },
          ]}
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
            SEGMENTACIÓN
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={
            () =>
              setCreateVisible(
                true,
              )
          }
          style={[
            styles.button,
            {
              backgroundColor:
                theme.primary,
            },
          ]}
        >
          <Text
            style={[
              styles.buttonText,
              {
                color:
                  theme.onPrimary,
              },
            ]}
          >
            + CLIENTE
          </Text>
        </TouchableOpacity>
      </View>

      <View
        style={
          styles.segmentBar
        }
      >
        {[
          {
            code:
              'all' as const,
            label:
              'TODOS',
            count:
              segmentSummary.totalCustomers,
          },
          {
            code:
              'new' as const,
            label:
              'NUEVOS',
            count:
              segmentSummary.newCustomers,
          },
          {
            code:
              'frequent' as const,
            label:
              'FRECUENTES',
            count:
              segmentSummary.frequentCustomers,
          },
          {
            code:
              'vip' as const,
            label:
              'VIP',
            count:
              segmentSummary.vipCustomers,
          },
          {
            code:
              'high_ticket' as const,
            label:
              'TICKET ALTO',
            count:
              segmentSummary.highTicketCustomers,
          },
          {
            code:
              'inactive' as const,
            label:
              'INACTIVOS',
            count:
              segmentSummary.inactiveCustomers,
          },
        ].map(
          segment => {
            const selected =
              segmentFilter ===
              segment.code;

            return (
              <TouchableOpacity
                key={
                  segment.code
                }
                onPress={
                  () =>
                    setSegmentFilter(
                      segment.code,
                    )
                }
                style={[
                  styles.segmentButton,
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
                    styles.segmentButtonText,
                    {
                      color:
                        selected
                          ? theme.primary
                          : theme.textMuted,
                    },
                  ]}
                >
                  {segment.label} · {segment.count}
                </Text>
              </TouchableOpacity>
            );
          },
        )}
      </View>

      {loading ? (
        <ActivityIndicator
          color={
            theme.primary
          }
        />
      ) : (
        <ScrollView
          contentContainerStyle={
            styles.list
          }
          showsVerticalScrollIndicator={
            false
          }
        >
          {filteredCustomers.map(
            customer => (
              <TouchableOpacity
                key={
                  customer.id
                }
                onPress={
                  () => {
                    void openCustomer(
                      customer.id,
                    );
                  }
                }
                style={[
                  styles.card,
                  !customer.isActive
                    ? styles.inactive
                    : null,
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
                    styles.cardHeader
                  }
                >
                  <View
                    style={
                      styles.info
                    }
                  >
                    <Text
                      style={[
                        styles.customerName,
                        {
                          color:
                            theme.text,
                        },
                      ]}
                    >
                      {customer.name}
                    </Text>

                    <Text
                      style={[
                        styles.meta,
                        {
                          color:
                            theme.textMuted,
                        },
                      ]}
                    >
                      {customer.phone}
                      {customer.email
                        ? ` · ${customer.email}`
                        : ''}
                    </Text>

                    <View
                      style={
                        styles.chips
                      }
                    >
                      {customer.hasWebAccount ? (
                        <Chip
                          label="Cuenta web"
                          theme={
                            theme
                          }
                        />
                      ) : null}

                      {customer.hasLoyalty ? (
                        <Chip
                          label="Recompensas"
                          theme={
                            theme
                          }
                        />
                      ) : null}

                      {customer.segmentCodes.map(
                        segment => (
                          <Chip
                            key={
                              `segment-${segment}`
                            }
                            label={
                              SEGMENT_LABELS[
                                segment
                              ]
                            }
                            theme={
                              theme
                            }
                          />
                        ),
                      )}

                      {customer.tags.map(
                        tag => (
                          <Chip
                            key={
                              tag
                            }
                            label={
                              tag
                            }
                            theme={
                              theme
                            }
                          />
                        ),
                      )}
                    </View>
                  </View>
                </View>

                <View
                  style={
                    styles.metrics
                  }
                >
                  <Metric
                    label="Compras"
                    value={
                      String(
                        customer.deliveredOrders,
                      )
                    }
                    theme={
                      theme
                    }
                  />

                  <Metric
                    label="Gasto neto"
                    value={
                      formatCurrency(
                        customer.netSpend,
                      )
                    }
                    theme={
                      theme
                    }
                  />

                  <Metric
                    label="Ticket prom."
                    value={
                      formatCurrency(
                        customer.averageTicket,
                      )
                    }
                    theme={
                      theme
                    }
                  />

                  <Metric
                    label="Visitas"
                    value={
                      String(
                        customer.loyaltyVisits,
                      )
                    }
                    theme={
                      theme
                    }
                  />

                  <Metric
                    label="Eventos"
                    value={
                      String(
                        customer.eventRequests,
                      )
                    }
                    theme={
                      theme
                    }
                  />
                </View>

                <Text
                  style={[
                    styles.meta,
                    {
                      color:
                        theme.textMuted,
                    },
                  ]}
                >
                  Última actividad:{' '}
                  {new Date(
                    customer.lastSeenAt,
                  ).toLocaleString(
                    'es-MX',
                  )}
                </Text>
              </TouchableOpacity>
            ),
          )}

          {!filteredCustomers.length ? (
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
                No hay clientes
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
                El CRM se alimenta automáticamente desde cuentas web, recompensas, pedidos con teléfono y solicitudes de eventos.
              </Text>
            </View>
          ) : null}
        </ScrollView>
      )}

      <Modal
        visible={
          detailVisible
        }
        transparent
        animationType="fade"
        onRequestClose={
          () =>
            setDetailVisible(
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
            keyboardShouldPersistTaps="handled"
          >
            <View
              style={
                styles.modalHeader
              }
            >
              <View>
                <Text
                  style={[
                    styles.modalTitle,
                    {
                      color:
                        theme.text,
                    },
                  ]}
                >
                  {detail?.name ??
                    'Cliente'}
                </Text>

                {detail ? (
                  <Text
                    style={[
                      styles.meta,
                      {
                        color:
                          theme.textMuted,
                      },
                    ]}
                  >
                    {detail.phone}
                    {detail.email
                      ? ` · ${detail.email}`
                      : ''}
                  </Text>
                ) : null}
              </View>

              <TouchableOpacity
                onPress={
                  () =>
                    setDetailVisible(
                      false,
                    )
                }
              >
                <Text
                  style={[
                    styles.close,
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

            {detail ? (
              <>
                <View
                  style={
                    styles.chips
                  }
                >
                  {detail.hasWebAccount ? (
                    <Chip
                      label="Cuenta web"
                      theme={
                        theme
                      }
                    />
                  ) : null}

                  {detail.hasLoyalty ? (
                    <Chip
                      label={`Rewards · ${detail.rewards.visits} visitas`}
                      theme={
                        theme
                      }
                    />
                  ) : null}

                  <Chip
                    label={
                      detailActive
                        ? 'Activo'
                        : 'Inactivo'
                    }
                    theme={
                      theme
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
                  Etiquetas
                </Text>

                <TextInput
                  value={
                    tagsText
                  }
                  onChangeText={
                    setTagsText
                  }
                  placeholder="vip, frecuente, empresa..."
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
                  Notas internas
                </Text>

                <TextInput
                  value={
                    notes
                  }
                  onChangeText={
                    setNotes
                  }
                  multiline
                  placeholder="Preferencias, observaciones, seguimiento..."
                  placeholderTextColor={
                    theme.textMuted
                  }
                  style={[
                    styles.input,
                    styles.notes,
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

                <TouchableOpacity
                  onPress={
                    () =>
                      setDetailActive(
                        value =>
                          !value,
                      )
                  }
                  style={[
                    styles.toggle,
                    {
                      marginTop:
                        10,
                      borderColor:
                        detailActive
                          ? theme.primary
                          : theme.border,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.buttonText,
                      {
                        color:
                          detailActive
                            ? theme.primary
                            : theme.textMuted,
                      },
                    ]}
                  >
                    {detailActive
                      ? 'CLIENTE ACTIVO'
                      : 'CLIENTE INACTIVO'}
                  </Text>
                </TouchableOpacity>

                <View
                  style={[
                    styles.section,
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
                      styles.sectionTitle,
                      {
                        color:
                          theme.text,
                      },
                    ]}
                  >
                    Contacto y marketing
                  </Text>

                  <TouchableOpacity
                    onPress={
                      () =>
                        setMarketingOptIn(
                          value =>
                            !value,
                        )
                    }
                    style={[
                      styles.toggle,
                      {
                        borderColor:
                          marketingOptIn
                            ? theme.primary
                            : theme.border,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.buttonText,
                        {
                          color:
                            marketingOptIn
                              ? theme.primary
                              : theme.textMuted,
                        },
                      ]}
                    >
                      {marketingOptIn
                        ? 'ACEPTA MARKETING'
                        : 'SIN PERMISO DE MARKETING'}
                    </Text>
                  </TouchableOpacity>

                  <Text
                    style={[
                      styles.label,
                      {
                        color:
                          theme.textMuted,
                      },
                    ]}
                  >
                    Canal preferido
                  </Text>

                  <View
                    style={
                      styles.segmentBar
                    }
                  >
                    {CONTACT_CHANNELS.map(
                      option => (
                        <TouchableOpacity
                          key={
                            option.value
                          }
                          onPress={
                            () =>
                              setContactChannel(
                                option.value,
                              )
                          }
                          style={[
                            styles.segmentButton,
                            {
                              borderColor:
                                contactChannel ===
                                  option.value
                                  ? theme.primary
                                  : theme.border,
                              backgroundColor:
                                contactChannel ===
                                  option.value
                                  ? theme.surfaceAlt
                                  : theme.surface,
                            },
                          ]}
                        >
                          <Text
                            style={[
                              styles.segmentButtonText,
                              {
                                color:
                                  contactChannel ===
                                    option.value
                                    ? theme.primary
                                    : theme.textMuted,
                              },
                            ]}
                          >
                            {option.label}
                          </Text>
                        </TouchableOpacity>
                      ),
                    )}
                  </View>

                  {!marketingOptIn ? (
                    <>
                      <Text
                        style={[
                          styles.label,
                          {
                            color:
                              theme.textMuted,
                          },
                        ]}
                      >
                        Motivo / restricción
                      </Text>

                      <TextInput
                        value={
                          doNotContactReason
                        }
                        onChangeText={
                          setDoNotContactReason
                        }
                        placeholder="Ej. pidió no recibir promociones"
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
                              theme.surface,
                          },
                        ]}
                      />
                    </>
                  ) : null}

                  <Text
                    style={[
                      styles.meta,
                      {
                        color:
                          theme.textMuted,
                        marginTop:
                          10,
                      },
                    ]}
                  >
                    Último contacto:{' '}
                    {detail.lastContactedAt
                      ? new Date(
                          detail.lastContactedAt,
                        ).toLocaleString(
                          'es-MX',
                        )
                      : 'Sin registrar'}
                  </Text>

                  <View
                    style={
                      styles.actions
                    }
                  >
                    <TouchableOpacity
                      disabled={
                        saving
                      }
                      onPress={
                        () => {
                          void registerContact();
                        }
                      }
                      style={[
                        styles.secondary,
                        {
                          borderColor:
                            theme.border,
                        },
                      ]}
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
                        MARCAR CONTACTADO
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      disabled={
                        saving
                      }
                      onPress={
                        () => {
                          void saveContactPreferences();
                        }
                      }
                      style={[
                        styles.button,
                        {
                          backgroundColor:
                            theme.primary,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.buttonText,
                          {
                            color:
                              theme.onPrimary,
                          },
                        ]}
                      >
                        GUARDAR CONTACTO
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>

                <View
                  style={[
                    styles.section,
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
                      styles.sectionTitle,
                      {
                        color:
                          theme.text,
                      },
                    ]}
                  >
                    Compras recientes
                  </Text>

                  {detail.orders.length ? (
                    detail.orders.map(
                      order => (
                        <View
                          key={
                            order.id
                          }
                          style={[
                            styles.row,
                            {
                              borderBottomColor:
                                theme.border,
                            },
                          ]}
                        >
                          <Text
                            style={[
                              styles.rowTitle,
                              {
                                color:
                                  theme.text,
                              },
                            ]}
                          >
                            {formatCurrency(
                              order.netTotal,
                            )}
                          </Text>

                          <Text
                            style={[
                              styles.rowMeta,
                              {
                                color:
                                  theme.textMuted,
                              },
                            ]}
                          >
                            {new Date(
                              order.createdAt,
                            ).toLocaleString(
                              'es-MX',
                            )}
                            {' · '}
                            {order.source}
                            {order.fulfillmentType
                              ? ` · ${order.fulfillmentType}`
                              : ''}
                            {order.refunded >
                            0
                              ? ` · Reembolso ${formatCurrency(
                                  order.refunded,
                                )}`
                              : ''}
                          </Text>
                        </View>
                      ),
                    )
                  ) : (
                    <Text
                      style={[
                        styles.meta,
                        {
                          color:
                            theme.textMuted,
                        },
                      ]}
                    >
                      Sin compras entregadas vinculadas.
                    </Text>
                  )}
                </View>

                <View
                  style={[
                    styles.section,
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
                      styles.sectionTitle,
                      {
                        color:
                          theme.text,
                      },
                    ]}
                  >
                    Eventos
                  </Text>

                  {detail.events.length ? (
                    detail.events.map(
                      event => (
                        <View
                          key={
                            event.id
                          }
                          style={[
                            styles.row,
                            {
                              borderBottomColor:
                                theme.border,
                            },
                          ]}
                        >
                          <Text
                            style={[
                              styles.rowTitle,
                              {
                                color:
                                  theme.text,
                              },
                            ]}
                          >
                            Evento #{event.folio} · {event.status}
                          </Text>

                          <Text
                            style={[
                              styles.rowMeta,
                              {
                                color:
                                  theme.textMuted,
                              },
                            ]}
                          >
                            {event.eventDate}
                            {' · '}
                            {event.guestCount} personas
                            {' · '}
                            {formatCurrency(
                              event.quotedTotal ??
                              event.estimatedTotal,
                            )}
                          </Text>
                        </View>
                      ),
                    )
                  ) : (
                    <Text
                      style={[
                        styles.meta,
                        {
                          color:
                            theme.textMuted,
                        },
                      ]}
                    >
                      Sin solicitudes de eventos vinculadas.
                    </Text>
                  )}
                </View>

                <View
                  style={
                    styles.actions
                  }
                >
                  <TouchableOpacity
                    onPress={
                      () =>
                        setDetailVisible(
                          false,
                        )
                    }
                    style={[
                      styles.secondary,
                      {
                        borderColor:
                          theme.border,
                      },
                    ]}
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
                      CERRAR
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    disabled={
                      saving
                    }
                    onPress={
                      () => {
                        void saveDetail();
                      }
                    }
                    style={[
                      styles.button,
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
                          styles.buttonText,
                          {
                            color:
                              theme.onPrimary,
                          },
                        ]}
                      >
                        GUARDAR
                      </Text>
                    )}
                  </TouchableOpacity>
                </View>
              </>
            ) : null}
          </ScrollView>
        </View>
      </Modal>

      <Modal
        visible={
          audiencesVisible
        }
        transparent
        animationType="fade"
        onRequestClose={
          () =>
            setAudiencesVisible(
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
              <View>
                <Text
                  style={[
                    styles.modalTitle,
                    {
                      color:
                        theme.text,
                    },
                  ]}
                >
                  Audiencias CRM
                </Text>

                <Text
                  style={[
                    styles.meta,
                    {
                      color:
                        theme.textMuted,
                    },
                  ]}
                >
                  Segmentos reutilizables para futuras campañas y acciones de marketing.
                </Text>
              </View>

              <TouchableOpacity
                onPress={
                  () =>
                    setAudiencesVisible(
                      false,
                    )
                }
              >
                <Text
                  style={[
                    styles.close,
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

            <TouchableOpacity
              onPress={
                openNewAudience
              }
              style={[
                styles.button,
                {
                  alignSelf:
                    'flex-start',
                  backgroundColor:
                    theme.primary,
                },
              ]}
            >
              <Text
                style={[
                  styles.buttonText,
                  {
                    color:
                      theme.onPrimary,
                  },
                ]}
              >
                + NUEVA AUDIENCIA
              </Text>
            </TouchableOpacity>

            {audiences.map(
              audience => (
                <View
                  key={
                    audience.id
                  }
                  style={[
                    styles.section,
                    {
                      borderColor:
                        theme.border,
                      backgroundColor:
                        theme.background,
                      opacity:
                        audience.isActive
                          ? 1
                          : 0.55,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.sectionTitle,
                      {
                        color:
                          theme.text,
                      },
                    ]}
                  >
                    {audience.name}
                    {' · '}
                    {audience.memberCount}
                  </Text>

                  {audience.description ? (
                    <Text
                      style={[
                        styles.meta,
                        {
                          color:
                            theme.textMuted,
                        },
                      ]}
                    >
                      {audience.description}
                    </Text>
                  ) : null}

                  <View
                    style={
                      styles.chips
                    }
                  >
                    {audience.segmentCodes.map(
                      segment => (
                        <Chip
                          key={
                            `${audience.id}-${segment}`
                          }
                          label={
                            SEGMENT_LABELS[
                              segment
                            ]
                          }
                          theme={
                            theme
                          }
                        />
                      ),
                    )}

                    {audience.requiredTags.map(
                      tag => (
                        <Chip
                          key={
                            `${audience.id}-tag-${tag}`
                          }
                          label={
                            `#${tag}`
                          }
                          theme={
                            theme
                          }
                        />
                      ),
                    )}

                    {audience.requireMarketingOptIn ? (
                      <Chip
                        label="Solo opt-in"
                        theme={
                          theme
                        }
                      />
                    ) : null}
                  </View>

                  <View
                    style={
                      styles.actions
                    }
                  >
                    <TouchableOpacity
                      onPress={
                        () =>
                          editAudience(
                            audience,
                          )
                      }
                      style={[
                        styles.secondary,
                        {
                          borderColor:
                            theme.border,
                        },
                      ]}
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
                        EDITAR
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      onPress={
                        () => {
                          void openAudience(
                            audience,
                          );
                        }
                      }
                      style={[
                        styles.button,
                        {
                          backgroundColor:
                            theme.primary,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.buttonText,
                          {
                            color:
                              theme.onPrimary,
                          },
                        ]}
                      >
                        VER MIEMBROS
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ),
            )}

            {selectedAudience ? (
              <View
                style={[
                  styles.section,
                  {
                    borderColor:
                      theme.primary,
                    backgroundColor:
                      theme.background,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.sectionTitle,
                    {
                      color:
                        theme.text,
                    },
                  ]}
                >
                  {selectedAudience.name} · miembros
                </Text>

                {audienceMembers.map(
                  member => (
                    <View
                      key={
                        member.id
                      }
                      style={[
                        styles.row,
                        {
                          borderBottomColor:
                            theme.border,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.rowTitle,
                          {
                            color:
                              theme.text,
                          },
                        ]}
                      >
                        {member.name}
                      </Text>

                      <Text
                        style={[
                          styles.rowMeta,
                          {
                            color:
                              theme.textMuted,
                          },
                        ]}
                      >
                        {member.phone}
                        {member.email
                          ? ` · ${member.email}`
                          : ''}
                        {' · '}
                        {formatCurrency(
                          member.netSpend,
                        )}
                        {' · '}
                        {member.deliveredOrders} compras
                      </Text>
                    </View>
                  ),
                )}

                {!audienceMembers.length ? (
                  <Text
                    style={[
                      styles.meta,
                      {
                        color:
                          theme.textMuted,
                      },
                    ]}
                  >
                    Ningún cliente cumple actualmente los criterios.
                  </Text>
                ) : null}
              </View>
            ) : null}
          </ScrollView>
        </View>
      </Modal>

      <Modal
        visible={
          audienceEditorVisible
        }
        transparent
        animationType="fade"
        onRequestClose={
          () =>
            setAudienceEditorVisible(
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
            keyboardShouldPersistTaps="handled"
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
                {selectedAudience
                  ? 'Editar audiencia'
                  : 'Nueva audiencia'}
              </Text>

              <TouchableOpacity
                onPress={
                  () =>
                    setAudienceEditorVisible(
                      false,
                    )
                }
              >
                <Text
                  style={[
                    styles.close,
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
              Nombre
            </Text>

            <TextInput
              value={
                audienceName
              }
              onChangeText={
                setAudienceName
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
              Descripción
            </Text>

            <TextInput
              value={
                audienceDescription
              }
              onChangeText={
                setAudienceDescription
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
              Segmentos requeridos
            </Text>

            <View
              style={
                styles.segmentBar
              }
            >
              {(
                Object.keys(
                  SEGMENT_LABELS,
                ) as
                  CrmSegmentCode[]
              ).map(
                segment => {
                  const selected =
                    audienceSegments.includes(
                      segment,
                    );

                  return (
                    <TouchableOpacity
                      key={
                        segment
                      }
                      onPress={
                        () =>
                          toggleAudienceSegment(
                            segment,
                          )
                      }
                      style={[
                        styles.segmentButton,
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
                          styles.segmentButtonText,
                          {
                            color:
                              selected
                                ? theme.primary
                                : theme.textMuted,
                          },
                        ]}
                      >
                        {SEGMENT_LABELS[
                          segment
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
              Etiquetas requeridas
            </Text>

            <TextInput
              value={
                audienceTagsText
              }
              onChangeText={
                setAudienceTagsText
              }
              placeholder="vip-local, empresa..."
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

            <CrmSettingField
              label="Gasto neto mínimo opcional"
              value={
                audienceMinSpendText
              }
              onChangeText={
                setAudienceMinSpendText
              }
              theme={
                theme
              }
            />

            <CrmSettingField
              label="Compras entregadas mínimas opcional"
              value={
                audienceMinOrdersText
              }
              onChangeText={
                setAudienceMinOrdersText
              }
              theme={
                theme
              }
            />

            <TouchableOpacity
              onPress={
                () =>
                  setAudienceRequireOptIn(
                    value =>
                      !value,
                  )
              }
              style={[
                styles.toggle,
                {
                  marginTop:
                    12,
                  borderColor:
                    audienceRequireOptIn
                      ? theme.primary
                      : theme.border,
                },
              ]}
            >
              <Text
                style={[
                  styles.buttonText,
                  {
                    color:
                      audienceRequireOptIn
                        ? theme.primary
                        : theme.textMuted,
                  },
                ]}
              >
                {audienceRequireOptIn
                  ? 'SOLO CLIENTES CON OPT-IN'
                  : 'INCLUIR SIN OPT-IN'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={
                () =>
                  setAudienceActive(
                    value =>
                      !value,
                  )
              }
              style={[
                styles.toggle,
                {
                  marginTop:
                    9,
                  borderColor:
                    audienceActive
                      ? theme.primary
                      : theme.border,
                },
              ]}
            >
              <Text
                style={[
                  styles.buttonText,
                  {
                    color:
                      audienceActive
                        ? theme.primary
                        : theme.textMuted,
                  },
                ]}
              >
                {audienceActive
                  ? 'AUDIENCIA ACTIVA'
                  : 'AUDIENCIA INACTIVA'}
              </Text>
            </TouchableOpacity>

            <View
              style={
                styles.actions
              }
            >
              <TouchableOpacity
                onPress={
                  () =>
                    setAudienceEditorVisible(
                      false,
                    )
                }
                style={[
                  styles.secondary,
                  {
                    borderColor:
                      theme.border,
                  },
                ]}
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
                  CANCELAR
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                disabled={
                  saving
                }
                onPress={
                  () => {
                    void handleSaveAudience();
                  }
                }
                style={[
                  styles.button,
                  {
                    backgroundColor:
                      theme.primary,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.buttonText,
                    {
                      color:
                        theme.onPrimary,
                    },
                  ]}
                >
                  GUARDAR AUDIENCIA
                </Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </Modal>

      <Modal
        visible={
          settingsVisible
        }
        transparent
        animationType="fade"
        onRequestClose={
          () =>
            setSettingsVisible(
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
            keyboardShouldPersistTaps="handled"
          >
            <View
              style={
                styles.modalHeader
              }
            >
              <View>
                <Text
                  style={[
                    styles.modalTitle,
                    {
                      color:
                        theme.text,
                    },
                  ]}
                >
                  Segmentación automática
                </Text>

                <Text
                  style={[
                    styles.meta,
                    {
                      color:
                        theme.textMuted,
                    },
                  ]}
                >
                  Un cliente puede pertenecer a varios segmentos al mismo tiempo.
                </Text>
              </View>

              <TouchableOpacity
                onPress={
                  () =>
                    setSettingsVisible(
                      false,
                    )
                }
              >
                <Text
                  style={[
                    styles.close,
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

            <CrmSettingField
              label="VIP · gasto neto mínimo"
              value={
                vipMinSpendText
              }
              onChangeText={
                setVipMinSpendText
              }
              theme={
                theme
              }
            />

            <CrmSettingField
              label="Frecuente · compras entregadas mínimas"
              value={
                frequentMinOrdersText
              }
              onChangeText={
                setFrequentMinOrdersText
              }
              theme={
                theme
              }
            />

            <CrmSettingField
              label="Ticket alto · ticket promedio mínimo"
              value={
                highTicketMinAverageText
              }
              onChangeText={
                setHighTicketMinAverageText
              }
              theme={
                theme
              }
            />

            <CrmSettingField
              label="Inactivo · días sin compra"
              value={
                inactiveDaysText
              }
              onChangeText={
                setInactiveDaysText
              }
              theme={
                theme
              }
            />

            <CrmSettingField
              label="Nuevo · días desde primer registro"
              value={
                newCustomerDaysText
              }
              onChangeText={
                setNewCustomerDaysText
              }
              theme={
                theme
              }
            />

            <View
              style={
                styles.actions
              }
            >
              <TouchableOpacity
                onPress={
                  () =>
                    setSettingsVisible(
                      false,
                    )
                }
                style={[
                  styles.secondary,
                  {
                    borderColor:
                      theme.border,
                  },
                ]}
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
                  CANCELAR
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                disabled={
                  saving
                }
                onPress={
                  () => {
                    void handleSaveSettings();
                  }
                }
                style={[
                  styles.button,
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
                <Text
                  style={[
                    styles.buttonText,
                    {
                      color:
                        theme.onPrimary,
                    },
                  ]}
                >
                  GUARDAR UMBRALES
                </Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </Modal>

      <Modal
        visible={
          createVisible
        }
        transparent
        animationType="fade"
        onRequestClose={
          () =>
            setCreateVisible(
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
            keyboardShouldPersistTaps="handled"
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
                Nuevo cliente
              </Text>

              <TouchableOpacity
                onPress={
                  () =>
                    setCreateVisible(
                      false,
                    )
                }
              >
                <Text
                  style={[
                    styles.close,
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
              Nombre
            </Text>

            <TextInput
              value={
                newName
              }
              onChangeText={
                setNewName
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
              Teléfono
            </Text>

            <TextInput
              value={
                newPhone
              }
              onChangeText={
                setNewPhone
              }
              keyboardType="phone-pad"
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
              Correo opcional
            </Text>

            <TextInput
              value={
                newEmail
              }
              onChangeText={
                setNewEmail
              }
              keyboardType="email-address"
              autoCapitalize="none"
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
              style={
                styles.actions
              }
            >
              <TouchableOpacity
                onPress={
                  () =>
                    setCreateVisible(
                      false,
                    )
                }
                style={[
                  styles.secondary,
                  {
                    borderColor:
                      theme.border,
                  },
                ]}
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
                  CANCELAR
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                disabled={
                  saving
                }
                onPress={
                  () => {
                    void createCustomer();
                  }
                }
                style={[
                  styles.button,
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
                      styles.buttonText,
                      {
                        color:
                          theme.onPrimary,
                      },
                    ]}
                  >
                    CREAR CLIENTE
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const CONTACT_CHANNELS: Array<{
  value: CrmContactChannel;
  label: string;
}> = [
  {
    value:
      'none',
    label:
      'Ninguno',
  },
  {
    value:
      'whatsapp',
    label:
      'WhatsApp',
  },
  {
    value:
      'sms',
    label:
      'SMS',
  },
  {
    value:
      'email',
    label:
      'Correo',
  },
  {
    value:
      'call',
    label:
      'Llamada',
  },
];

const SEGMENT_LABELS:
Record<
  CrmSegmentCode,
  string
> = {
  new:
    'Nuevo',
  frequent:
    'Frecuente',
  vip:
    'VIP',
  high_ticket:
    'Ticket alto',
  inactive:
    'Inactivo',
};

function CrmSettingField({
  label,
  value,
  onChangeText,
  theme,
}: {
  label: string;
  value: string;
  onChangeText:
    (value: string) => void;
  theme: {
    text: string;
    textMuted: string;
    border: string;
    background: string;
  };
}) {
  return (
    <>
      <Text
        style={[
          styles.label,
          {
            color:
              theme.textMuted,
          },
        ]}
      >
        {label}
      </Text>

      <TextInput
        value={
          value
        }
        onChangeText={
          onChangeText
        }
        keyboardType="decimal-pad"
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
    </>
  );
}

function Metric({
  label,
  value,
  theme,
}: {
  label: string;
  value: string;
  theme: {
    text: string;
    textMuted: string;
    border: string;
    surface: string;
  };
}) {
  return (
    <View
      style={[
        styles.metric,
        {
          borderColor:
            theme.border,
          backgroundColor:
            theme.surface,
        },
      ]}
    >
      <Text
        style={[
          styles.metricLabel,
          {
            color:
              theme.textMuted,
          },
        ]}
      >
        {label}
      </Text>

      <Text
        style={[
          styles.metricValue,
          {
            color:
              theme.text,
          },
        ]}
      >
        {value}
      </Text>
    </View>
  );
}

function Chip({
  label,
  theme,
}: {
  label: string;
  theme: {
    primary: string;
    border: string;
    surfaceAlt: string;
  };
}) {
  return (
    <View
      style={[
        styles.chip,
        {
          borderColor:
            theme.border,
          backgroundColor:
            theme.surfaceAlt,
        },
      ]}
    >
      <Text
        style={[
          styles.chipText,
          {
            color:
              theme.primary,
          },
        ]}
      >
        {label}
      </Text>
    </View>
  );
}
