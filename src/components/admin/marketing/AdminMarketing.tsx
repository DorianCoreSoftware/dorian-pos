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
  getCrmAudiences,
} from '../../../services/crmService';

import {
  activateMarketingCampaign,
  addMarketingCampaignConversion,
  closeMarketingCampaign,
  deleteMarketingCampaignConversion,
  getMarketingCampaignConversions,
  getMarketingCandidateOrders,
  getMarketingCampaigns,
  MarketingCampaignConversion,
  MarketingCandidateOrder,
  MarketingActionType,
  MarketingCampaign,
  MarketingCampaignChannel,
  MarketingCampaignObjective,
  MarketingCampaignStatus,
  saveMarketingCampaign,
  saveMarketingTrackingIdentifiers,
  updateMarketingCampaignTracking,
} from '../../../services/marketingService';

import {
  useBusiness,
} from '../../../context/BusinessContext';
import { DateCalendarField, DateTimeCalendarField } from '../../common/date-calendar-field/DateCalendarField';

import {
  styles,
} from './AdminMarketing.styles';

const STATUS_LABELS:
Record<
  MarketingCampaignStatus,
  string
> = {
  draft:
    'Borrador',
  scheduled:
    'Programada',
  active:
    'Activa',
  completed:
    'Completada',
  cancelled:
    'Cancelada',
};

const OBJECTIVE_OPTIONS:
Array<{
  value: MarketingCampaignObjective;
  label: string;
}> = [
  {
    value: 'acquisition',
    label: 'Adquisición',
  },
  {
    value: 'retention',
    label: 'Retención',
  },
  {
    value: 'reactivation',
    label: 'Reactivación',
  },
  {
    value: 'loyalty',
    label: 'Lealtad',
  },
  {
    value: 'sales',
    label: 'Ventas',
  },
  {
    value: 'event',
    label: 'Eventos',
  },
  {
    value: 'announcement',
    label: 'Anuncio',
  },
];

const CHANNEL_OPTIONS:
Array<{
  value: MarketingCampaignChannel;
  label: string;
}> = [
  {
    value: 'whatsapp',
    label: 'WhatsApp',
  },
  {
    value: 'sms',
    label: 'SMS',
  },
  {
    value: 'email',
    label: 'Correo',
  },
  {
    value: 'push',
    label: 'Push',
  },
  {
    value: 'social',
    label: 'Redes',
  },
  {
    value: 'in_store',
    label: 'En negocio',
  },
  {
    value: 'other',
    label: 'Otro',
  },
];

const ACTION_OPTIONS:
Array<{
  value: MarketingActionType;
  label: string;
}> = [
  {
    value: 'promotion',
    label: 'Promoción',
  },
  {
    value: 'reward',
    label: 'Recompensa',
  },
  {
    value: 'web_banner',
    label: 'Banner web',
  },
  {
    value: 'custom',
    label: 'Personalizada',
  },
];

function toIsoOrNull(
  value: string,
): string | null {
  const clean =
    value.trim();

  if (!clean) {
    return null;
  }

  const parsed =
    new Date(clean);

  if (
    Number.isNaN(
      parsed.getTime(),
    )
  ) {
    throw new Error(
      'Selecciona una fecha y captura una hora válida.',
    );
  }

  return parsed.toISOString();
}

export function AdminMarketing() {
  const {
    theme,
  } =
    useBusiness();

  const [
    campaigns,
    setCampaigns,
  ] =
    useState<MarketingCampaign[]>(
      [],
    );

  const [
    audiences,
    setAudiences,
  ] =
    useState<
      Awaited<
        ReturnType<
          typeof getCrmAudiences
        >
      >
    >([]);

  const [
    statusFilter,
    setStatusFilter,
  ] =
    useState<
      MarketingCampaignStatus | 'all'
    >('all');

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
    editorVisible,
    setEditorVisible,
  ] =
    useState(false);

  const [
    editing,
    setEditing,
  ] =
    useState<MarketingCampaign | null>(
      null,
    );

  const [
    name,
    setName,
  ] =
    useState('');

  const [
    description,
    setDescription,
  ] =
    useState('');

  const [
    audienceId,
    setAudienceId,
  ] =
    useState<string | null>(
      null,
    );

  const [
    objective,
    setObjective,
  ] =
    useState<MarketingCampaignObjective>(
      'retention',
    );

  const [
    channel,
    setChannel,
  ] =
    useState<MarketingCampaignChannel>(
      'whatsapp',
    );

  const [
    actionType,
    setActionType,
  ] =
    useState<MarketingActionType>(
      'custom',
    );

  const [
    messageTitle,
    setMessageTitle,
  ] =
    useState('');

  const [
    messageBody,
    setMessageBody,
  ] =
    useState('');

  const [
    startsAt,
    setStartsAt,
  ] =
    useState('');

  const [
    endsAt,
    setEndsAt,
  ] =
    useState('');


  const [
    resultsVisible,
    setResultsVisible,
  ] =
    useState(false);

  const [
    resultsCampaign,
    setResultsCampaign,
  ] =
    useState<MarketingCampaign | null>(
      null,
    );

  const [
    budgetText,
    setBudgetText,
  ] =
    useState('');

  const [
    trackingNotes,
    setTrackingNotes,
  ] =
    useState('');

  const [
    candidateOrders,
    setCandidateOrders,
  ] =
    useState<MarketingCandidateOrder[]>(
      [],
    );

  const [
    conversions,
    setConversions,
  ] =
    useState<MarketingCampaignConversion[]>(
      [],
    );

  const [
    orderSearch,
    setOrderSearch,
  ] =
    useState('');


  const [
    trackingVisible,
    setTrackingVisible,
  ] =
    useState(false);

  const [
    trackingCampaign,
    setTrackingCampaign,
  ] =
    useState<MarketingCampaign | null>(
      null,
    );

  const [
    trackingEnabled,
    setTrackingEnabled,
  ] =
    useState(false);

  const [
    trackingCode,
    setTrackingCode,
  ] =
    useState('');

  const load =
    useCallback(
      async () => {
        try {
          setLoading(
            true,
          );

          const [
            campaignData,
            audienceData,
          ] =
            await Promise.all([
              getMarketingCampaigns(
                statusFilter ===
                  'all'
                  ? null
                  : statusFilter,
              ),
              getCrmAudiences(
                true,
              ),
            ]);

          setCampaigns(
            campaignData,
          );

          setAudiences(
            audienceData,
          );
        } catch (error) {
          Alert.alert(
            'Marketing',
            error instanceof Error
              ? error.message
              : 'No se pudo cargar Marketing.',
          );
        } finally {
          setLoading(
            false,
          );
        }
      },
      [
        statusFilter,
      ],
    );

  useEffect(
    () => {
      void load();
    },
    [
      load,
    ],
  );

  const summary =
    useMemo(
      () => ({
        total:
          campaigns.length,
        active:
          campaigns.filter(
            value =>
              value.status ===
              'active',
          ).length,
        scheduled:
          campaigns.filter(
            value =>
              value.status ===
              'scheduled',
          ).length,
      }),
      [
        campaigns,
      ],
    );

  function resetEditor():
  void {
    setEditing(
      null,
    );
    setName(
      '',
    );
    setDescription(
      '',
    );
    setAudienceId(
      null,
    );
    setObjective(
      'retention',
    );
    setChannel(
      'whatsapp',
    );
    setActionType(
      'custom',
    );
    setMessageTitle(
      '',
    );
    setMessageBody(
      '',
    );
    setStartsAt(
      '',
    );
    setEndsAt(
      '',
    );
  }

  function openNew():
  void {
    resetEditor();
    setEditorVisible(
      true,
    );
  }

  function openEdit(
    campaign:
      MarketingCampaign,
  ): void {
    setEditing(
      campaign,
    );
    setName(
      campaign.name,
    );
    setDescription(
      campaign.description,
    );
    setAudienceId(
      campaign.audienceId,
    );
    setObjective(
      campaign.objective,
    );
    setChannel(
      campaign.channel,
    );
    setActionType(
      campaign.actionType,
    );
    setMessageTitle(
      campaign.messageTitle,
    );
    setMessageBody(
      campaign.messageBody,
    );
    setStartsAt(
      campaign.startsAt
        ? new Date(
            campaign.startsAt,
          ).toLocaleString(
            'sv-SE',
          ).slice(
            0,
            16,
          )
        : '',
    );
    setEndsAt(
      campaign.endsAt
        ? new Date(
            campaign.endsAt,
          ).toLocaleString(
            'sv-SE',
          ).slice(
            0,
            16,
          )
        : '',
    );
    setEditorVisible(
      true,
    );
  }

  async function handleSave():
  Promise<void> {
    try {
      setSaving(
        true,
      );

      await saveMarketingCampaign({
        id:
          editing?.id ??
          null,
        name,
        description,
        audienceId,
        objective,
        channel,
        actionType,
        messageTitle,
        messageBody,
        startsAt:
          toIsoOrNull(
            startsAt,
          ),
        endsAt:
          toIsoOrNull(
            endsAt,
          ),
      });

      setEditorVisible(
        false,
      );
      resetEditor();
      await load();
    } catch (error) {
      Alert.alert(
        'Marketing',
        error instanceof Error
          ? error.message
          : 'No se pudo guardar la campaña.',
      );
    } finally {
      setSaving(
        false,
      );
    }
  }

  async function handleActivate(
    campaign:
      MarketingCampaign,
  ): Promise<void> {
    try {
      setSaving(
        true,
      );

      await activateMarketingCampaign(
        campaign.id,
      );

      await load();
    } catch (error) {
      Alert.alert(
        'Marketing',
        error instanceof Error
          ? error.message
          : 'No se pudo activar la campaña.',
      );
    } finally {
      setSaving(
        false,
      );
    }
  }

  function confirmClose(
    campaign:
      MarketingCampaign,
    action:
      'completed' | 'cancelled',
  ): void {
    Alert.alert(
      action ===
        'completed'
        ? 'Completar campaña'
        : 'Cancelar campaña',
      action ===
        'completed'
        ? `¿Marcar "${campaign.name}" como completada?`
        : `¿Cancelar "${campaign.name}"?`,
      [
        {
          text:
            'No',
          style:
            'cancel',
        },
        {
          text:
            'Sí',
          style:
            action ===
              'cancelled'
              ? 'destructive'
              : 'default',
          onPress:
            () => {
              void (
                async () => {
                  try {
                    setSaving(
                      true,
                    );

                    await closeMarketingCampaign(
                      campaign.id,
                      action,
                    );

                    await load();
                  } catch (error) {
                    Alert.alert(
                      'Marketing',
                      error instanceof Error
                        ? error.message
                        : 'No se pudo cerrar la campaña.',
                    );
                  } finally {
                    setSaving(
                      false,
                    );
                  }
                }
              )();
            },
        },
      ],
    );
  }

  function openTracking(
    campaign:
      MarketingCampaign,
  ): void {
    setTrackingCampaign(
      campaign,
    );

    setTrackingEnabled(
      campaign.trackingEnabled,
    );

    setTrackingCode(
      campaign.trackingCode,
    );

    setTrackingVisible(
      true,
    );
  }

  async function saveTrackingIdentifiers():
  Promise<void> {
    if (!trackingCampaign) {
      return;
    }

    try {
      setSaving(
        true,
      );

      const result =
        await saveMarketingTrackingIdentifiers(
          trackingCampaign.id,
          trackingEnabled,
          trackingCode,
        );

      setTrackingEnabled(
        result.trackingEnabled,
      );

      setTrackingCode(
        result.trackingCode,
      );

      await load();

      Alert.alert(
        'Marketing',
        result.trackingEnabled
          ? 'Tracking guardado correctamente.'
          : 'Tracking desactivado.',
      );
    } catch (error) {
      Alert.alert(
        'Marketing',
        error instanceof Error
          ? error.message
          : 'No se pudo guardar el tracking.',
      );
    } finally {
      setSaving(
        false,
      );
    }
  }

  async function openResults(
    campaign:
      MarketingCampaign,
  ): Promise<void> {
    try {
      setSaving(
        true,
      );

      const [
        orders,
        conversionData,
      ] =
        await Promise.all([
          getMarketingCandidateOrders(
            campaign.id,
          ),
          getMarketingCampaignConversions(
            campaign.id,
          ),
        ]);

      setResultsCampaign(
        campaign,
      );

      setBudgetText(
        campaign.budgetAmount ==
        null
          ? ''
          : String(
              campaign.budgetAmount,
            ),
      );

      setTrackingNotes(
        campaign.notes,
      );

      setCandidateOrders(
        orders,
      );

      setConversions(
        conversionData,
      );

      setOrderSearch(
        '',
      );

      setResultsVisible(
        true,
      );
    } catch (error) {
      Alert.alert(
        'Marketing',
        error instanceof Error
          ? error.message
          : 'No se pudieron cargar los resultados.',
      );
    } finally {
      setSaving(
        false,
      );
    }
  }

  async function saveTracking():
  Promise<void> {
    if (!resultsCampaign) {
      return;
    }

    try {
      setSaving(
        true,
      );

      await updateMarketingCampaignTracking(
        resultsCampaign.id,
        budgetText.trim()
          ? Number(
              budgetText.replace(
                ',',
                '.',
              ),
            )
          : null,
        trackingNotes,
      );

      await load();
    } catch (error) {
      Alert.alert(
        'Marketing',
        error instanceof Error
          ? error.message
          : 'No se pudo guardar el seguimiento.',
      );
    } finally {
      setSaving(
        false,
      );
    }
  }

  async function attributeOrder(
    order:
      MarketingCandidateOrder,
  ): Promise<void> {
    if (!resultsCampaign) {
      return;
    }

    try {
      setSaving(
        true,
      );

      await addMarketingCampaignConversion({
        campaignId:
          resultsCampaign.id,
        orderId:
          order.orderId,
        crmCustomerId:
          order.crmCustomerId,
        revenueAmount:
          null,
        attributionType:
          resultsCampaign.channel ===
            'whatsapp'
            ? 'manual'
            : resultsCampaign.channel ===
              'email'
              ? 'manual'
              : resultsCampaign.channel ===
                'sms'
                ? 'manual'
                : 'manual',
        notes:
          'Atribución manual desde Marketing.',
      });

      const [
        orders,
        conversionData,
      ] =
        await Promise.all([
          getMarketingCandidateOrders(
            resultsCampaign.id,
            orderSearch,
          ),
          getMarketingCampaignConversions(
            resultsCampaign.id,
          ),
        ]);

      setCandidateOrders(
        orders,
      );
      setConversions(
        conversionData,
      );

      await load();
    } catch (error) {
      Alert.alert(
        'Marketing',
        error instanceof Error
          ? error.message
          : 'No se pudo atribuir la orden.',
      );
    } finally {
      setSaving(
        false,
      );
    }
  }

  async function removeConversion(
    conversionId:
      string,
  ): Promise<void> {
    if (!resultsCampaign) {
      return;
    }

    try {
      setSaving(
        true,
      );

      await deleteMarketingCampaignConversion(
        conversionId,
      );

      const [
        orders,
        conversionData,
      ] =
        await Promise.all([
          getMarketingCandidateOrders(
            resultsCampaign.id,
            orderSearch,
          ),
          getMarketingCampaignConversions(
            resultsCampaign.id,
          ),
        ]);

      setCandidateOrders(
        orders,
      );
      setConversions(
        conversionData,
      );

      await load();
    } catch (error) {
      Alert.alert(
        'Marketing',
        error instanceof Error
          ? error.message
          : 'No se pudo eliminar la conversión.',
      );
    } finally {
      setSaving(
        false,
      );
    }
  }

  async function searchCandidateOrders():
  Promise<void> {
    if (!resultsCampaign) {
      return;
    }

    try {
      setSaving(
        true,
      );

      const orders =
        await getMarketingCandidateOrders(
          resultsCampaign.id,
          orderSearch,
        );

      setCandidateOrders(
        orders,
      );
    } catch (error) {
      Alert.alert(
        'Marketing',
        error instanceof Error
          ? error.message
          : 'No se pudieron buscar las órdenes.',
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
        <View>
          <Text
            style={[
              styles.title,
              {
                color:
                  theme.text,
              },
            ]}
          >
            Marketing
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
            Planea campañas sobre audiencias CRM. Esta fase registra estrategia y ejecución; el envío automático llegará después.
          </Text>
        </View>

        <TouchableOpacity
          onPress={
            openNew
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
            + CAMPAÑA
          </Text>
        </TouchableOpacity>
      </View>

      <View
        style={
          styles.metrics
        }
      >
        <Metric
          label="Campañas"
          value={
            String(
              summary.total,
            )
          }
          theme={
            theme
          }
        />
        <Metric
          label="Activas"
          value={
            String(
              summary.active,
            )
          }
          theme={
            theme
          }
        />
        <Metric
          label="Programadas"
          value={
            String(
              summary.scheduled,
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
        {[
          'all',
          'draft',
          'scheduled',
          'active',
          'completed',
          'cancelled',
        ].map(
          value => {
            const typed =
              value as
                | MarketingCampaignStatus
                | 'all';

            const selected =
              statusFilter ===
              typed;

            return (
              <TouchableOpacity
                key={
                  value
                }
                onPress={
                  () =>
                    setStatusFilter(
                      typed,
                    )
                }
                style={[
                  styles.filter,
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
                    styles.buttonText,
                    {
                      color:
                        selected
                          ? theme.primary
                          : theme.textMuted,
                    },
                  ]}
                >
                  {value ===
                    'all'
                    ? 'TODAS'
                    : STATUS_LABELS[
                        value as MarketingCampaignStatus
                      ].toUpperCase()}
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
        >
          {campaigns.map(
            campaign => (
              <View
                key={
                  campaign.id
                }
                style={[
                  styles.card,
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
                      styles.cardInfo
                    }
                  >
                    <Text
                      style={[
                        styles.campaignName,
                        {
                          color:
                            theme.text,
                        },
                      ]}
                    >
                      {campaign.name}
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
                      {campaign.description ||
                        'Sin descripción'}
                    </Text>

                    <View
                      style={
                        styles.chips
                      }
                    >
                      <Chip
                        label={
                          STATUS_LABELS[
                            campaign.status
                          ]
                        }
                        theme={
                          theme
                        }
                      />
                      <Chip
                        label={
                          campaign.channel
                        }
                        theme={
                          theme
                        }
                      />
                      <Chip
                        label={
                          campaign.actionType
                        }
                        theme={
                          theme
                        }
                      />
                      {campaign.audienceName ? (
                        <Chip
                          label={
                            campaign.audienceName
                          }
                          theme={
                            theme
                          }
                        />
                      ) : null}
                    </View>
                  </View>
                </View>

                <View
                  style={
                    styles.metrics
                  }
                >
                  <Metric
                    label="Audiencia actual"
                    value={
                      String(
                        campaign.currentAudienceSize,
                      )
                    }
                    theme={
                      theme
                    }
                  />

                  <Metric
                    label="Al activar"
                    value={
                      campaign.audienceSizeSnapshot ==
                      null
                        ? '—'
                        : String(
                            campaign.audienceSizeSnapshot,
                          )
                    }
                    theme={
                      theme
                    }
                  />

                  <Metric
                    label="Conversiones"
                    value={
                      String(
                        campaign.conversionOrders,
                      )
                    }
                    theme={
                      theme
                    }
                  />

                  <Metric
                    label="Ingresos atrib."
                    value={
                      `$${campaign.attributedRevenue.toFixed(2)}`
                    }
                    theme={
                      theme
                    }
                  />

                  <Metric
                    label="Conversión"
                    value={
                      `${campaign.conversionRate.toFixed(2)}%`
                    }
                    theme={
                      theme
                    }
                  />

                  <Metric
                    label="ROI"
                    value={
                      campaign.roiPercent ==
                      null
                        ? '—'
                        : `${campaign.roiPercent.toFixed(2)}%`
                    }
                    theme={
                      theme
                    }
                  />

                  <Metric
                    label="Órdenes rastreadas"
                    value={
                      String(
                        campaign.trackedOrders,
                      )
                    }
                    theme={
                      theme
                    }
                  />

                  <Metric
                    label="Inicio"
                    value={
                      campaign.startsAt
                        ? new Date(
                            campaign.startsAt,
                          ).toLocaleDateString(
                            'es-MX',
                          )
                        : 'Sin fecha'
                    }
                    theme={
                      theme
                    }
                  />
                </View>

                <View
                  style={
                    styles.actions
                  }
                >
                  <TouchableOpacity
                    onPress={
                      () =>
                        openTracking(
                          campaign,
                        )
                    }
                    style={[
                      styles.secondaryButton,
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
                            campaign.trackingEnabled
                              ? theme.primary
                              : theme.text,
                        },
                      ]}
                    >
                      TRACKING
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={
                      () => {
                        void openResults(
                          campaign,
                        );
                      }
                    }
                    style={[
                      styles.secondaryButton,
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
                      RESULTADOS
                    </Text>
                  </TouchableOpacity>

                  {![
                    'completed',
                    'cancelled',
                  ].includes(
                    campaign.status,
                  ) ? (
                    <TouchableOpacity
                      onPress={
                        () =>
                          openEdit(
                            campaign,
                          )
                      }
                      style={[
                        styles.secondaryButton,
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
                  ) : null}

                  {campaign.status !==
                    'active' &&
                  ![
                    'completed',
                    'cancelled',
                  ].includes(
                    campaign.status,
                  ) ? (
                    <TouchableOpacity
                      disabled={
                        saving
                      }
                      onPress={
                        () => {
                          void handleActivate(
                            campaign,
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
                        ACTIVAR
                      </Text>
                    </TouchableOpacity>
                  ) : null}

                  {campaign.status ===
                  'active' ? (
                    <TouchableOpacity
                      onPress={
                        () =>
                          confirmClose(
                            campaign,
                            'completed',
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
                        COMPLETAR
                      </Text>
                    </TouchableOpacity>
                  ) : null}

                  {![
                    'completed',
                    'cancelled',
                  ].includes(
                    campaign.status,
                  ) ? (
                    <TouchableOpacity
                      onPress={
                        () =>
                          confirmClose(
                            campaign,
                            'cancelled',
                          )
                      }
                      style={[
                        styles.secondaryButton,
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
                              theme.textMuted,
                          },
                        ]}
                      >
                        CANCELAR
                      </Text>
                    </TouchableOpacity>
                  ) : null}
                </View>
              </View>
            ),
          )}

          {!campaigns.length ? (
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
                No hay campañas
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
                Crea la primera campaña y asígnala a una audiencia del CRM.
              </Text>
            </View>
          ) : null}
        </ScrollView>
      )}

      <Modal
        visible={
          trackingVisible
        }
        transparent
        animationType="fade"
        onRequestClose={
          () =>
            setTrackingVisible(
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
                  Tracking de campaña
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
                  {trackingCampaign?.name ??
                    ''}
                </Text>
              </View>

              <TouchableOpacity
                onPress={
                  () =>
                    setTrackingVisible(
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
                () =>
                  setTrackingEnabled(
                    value =>
                      !value,
                  )
              }
              style={[
                styles.selector,
                {
                  alignSelf:
                    'flex-start',
                  borderColor:
                    trackingEnabled
                      ? theme.primary
                      : theme.border,
                  backgroundColor:
                    trackingEnabled
                      ? theme.surfaceAlt
                      : theme.surface,
                },
              ]}
            >
              <Text
                style={[
                  styles.buttonText,
                  {
                    color:
                      trackingEnabled
                        ? theme.primary
                        : theme.textMuted,
                  },
                ]}
              >
                {trackingEnabled
                  ? 'TRACKING ACTIVO'
                  : 'TRACKING INACTIVO'}
              </Text>
            </TouchableOpacity>

            <Field
              label="Código rastreable"
              value={
                trackingCode
              }
              onChangeText={
                setTrackingCode
              }
              placeholder="Ej. VIPNOV26"
              theme={
                theme
              }
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
              Token de enlace
            </Text>

            <View
              style={[
                styles.card,
                {
                  borderColor:
                    theme.border,
                  backgroundColor:
                    theme.background,
                },
              ]}
            >
              <Text
                selectable
                style={[
                  styles.meta,
                  {
                    color:
                      theme.text,
                  },
                ]}
              >
                {trackingCampaign?.trackingToken ||
                  'Se generará automáticamente al guardar.'}
              </Text>
            </View>

            <Text
              style={[
                styles.meta,
                {
                  marginTop:
                    10,
                  color:
                    theme.textMuted,
                },
              ]}
            >
              El código puede capturarse manualmente. El token está pensado para enlaces de campaña. Una orden rastreada se convierte automáticamente cuando llega a estado entregado.
            </Text>

            <View
              style={
                styles.actions
              }
            >
              <TouchableOpacity
                onPress={
                  () =>
                    setTrackingVisible(
                      false,
                    )
                }
                style={[
                  styles.secondaryButton,
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
                    void saveTrackingIdentifiers();
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
                  GUARDAR TRACKING
                </Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </Modal>

      <Modal
        visible={
          resultsVisible
        }
        transparent
        animationType="fade"
        onRequestClose={
          () =>
            setResultsVisible(
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
                  Resultados
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
                  {resultsCampaign?.name ??
                    ''}
                </Text>
              </View>

              <TouchableOpacity
                onPress={
                  () =>
                    setResultsVisible(
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

            {resultsCampaign ? (
              <>
                <View
                  style={
                    styles.metrics
                  }
                >
                  <Metric
                    label="Audiencia base"
                    value={
                      resultsCampaign.audienceSizeSnapshot ==
                      null
                        ? '—'
                        : String(
                            resultsCampaign.audienceSizeSnapshot,
                          )
                    }
                    theme={
                      theme
                    }
                  />

                  <Metric
                    label="Clientes convert."
                    value={
                      String(
                        resultsCampaign.convertedCustomers,
                      )
                    }
                    theme={
                      theme
                    }
                  />

                  <Metric
                    label="Ingresos"
                    value={
                      `$${resultsCampaign.attributedRevenue.toFixed(2)}`
                    }
                    theme={
                      theme
                    }
                  />

                  <Metric
                    label="Conversión"
                    value={
                      `${resultsCampaign.conversionRate.toFixed(2)}%`
                    }
                    theme={
                      theme
                    }
                  />
                </View>

                <Field
                  label="Presupuesto / costo de campaña"
                  value={
                    budgetText
                  }
                  onChangeText={
                    setBudgetText
                  }
                  placeholder="0.00"
                  theme={
                    theme
                  }
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
                  Notas de seguimiento
                </Text>

                <TextInput
                  value={
                    trackingNotes
                  }
                  onChangeText={
                    setTrackingNotes
                  }
                  multiline
                  style={[
                    styles.input,
                    styles.multiline,
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
                  disabled={
                    saving
                  }
                  onPress={
                    () => {
                      void saveTracking();
                    }
                  }
                  style={[
                    styles.button,
                    {
                      alignSelf:
                        'flex-end',
                      marginTop:
                        10,
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
                    GUARDAR SEGUIMIENTO
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
                  Conversiones atribuidas
                </Text>

                {conversions.map(
                  conversion => (
                    <View
                      key={
                        conversion.id
                      }
                      style={[
                        styles.card,
                        {
                          marginTop:
                            7,
                          borderColor:
                            theme.border,
                          backgroundColor:
                            theme.background,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.campaignName,
                          {
                            color:
                              theme.text,
                          },
                        ]}
                      >
                        {conversion.customerName}
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
                        ${conversion.revenueAmount.toFixed(2)}
                        {' · '}
                        {conversion.attributionType}
                        {' · '}
                        {new Date(
                          conversion.createdAt,
                        ).toLocaleString(
                          'es-MX',
                        )}
                      </Text>

                      <TouchableOpacity
                        disabled={
                          saving
                        }
                        onPress={
                          () => {
                            void removeConversion(
                              conversion.id,
                            );
                          }
                        }
                        style={[
                          styles.secondaryButton,
                          {
                            alignSelf:
                              'flex-end',
                            marginTop:
                              8,
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
                                theme.textMuted,
                            },
                          ]}
                        >
                          QUITAR ATRIBUCIÓN
                        </Text>
                      </TouchableOpacity>
                    </View>
                  ),
                )}

                {!conversions.length ? (
                  <Text
                    style={[
                      styles.meta,
                      {
                        color:
                          theme.textMuted,
                      },
                    ]}
                  >
                    Aún no hay conversiones atribuidas.
                  </Text>
                ) : null}

                <Text
                  style={[
                    styles.label,
                    {
                      color:
                        theme.textMuted,
                    },
                  ]}
                >
                  Atribuir orden entregada
                </Text>

                <View
                  style={
                    styles.toolbar
                  }
                >
                  <TextInput
                    value={
                      orderSearch
                    }
                    onChangeText={
                      setOrderSearch
                    }
                    placeholder="Buscar nombre o teléfono..."
                    placeholderTextColor={
                      theme.textMuted
                    }
                    style={[
                      styles.input,
                      {
                        flexGrow:
                          1,
                        minWidth:
                          200,
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
                      () => {
                        void searchCandidateOrders();
                      }
                    }
                    style={[
                      styles.secondaryButton,
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
                      BUSCAR
                    </Text>
                  </TouchableOpacity>
                </View>

                {candidateOrders.map(
                  order => (
                    <View
                      key={
                        order.orderId
                      }
                      style={[
                        styles.card,
                        {
                          marginTop:
                            7,
                          opacity:
                            order.alreadyAttributed
                              ? 0.55
                              : 1,
                          borderColor:
                            theme.border,
                          backgroundColor:
                            theme.background,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.campaignName,
                          {
                            color:
                              theme.text,
                          },
                        ]}
                      >
                        {order.customerName}
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
                        {order.customerPhone ||
                          'Sin teléfono'}
                        {' · '}
                        ${order.netTotal.toFixed(2)}
                        {' · '}
                        {new Date(
                          order.createdAt,
                        ).toLocaleString(
                          'es-MX',
                        )}
                      </Text>

                      <TouchableOpacity
                        disabled={
                          saving ||
                          order.alreadyAttributed
                        }
                        onPress={
                          () => {
                            void attributeOrder(
                              order,
                            );
                          }
                        }
                        style={[
                          styles.button,
                          {
                            alignSelf:
                              'flex-end',
                            marginTop:
                              8,
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
                          {order.alreadyAttributed
                            ? 'YA ATRIBUIDA'
                            : 'ATRIBUIR'}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  ),
                )}
              </>
            ) : null}
          </ScrollView>
        </View>
      </Modal>

      <Modal
        visible={
          editorVisible
        }
        transparent
        animationType="fade"
        onRequestClose={
          () =>
            setEditorVisible(
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
                {editing
                  ? 'Editar campaña'
                  : 'Nueva campaña'}
              </Text>
              <TouchableOpacity
                onPress={
                  () =>
                    setEditorVisible(
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

            <Field
              label="Nombre"
              value={
                name
              }
              onChangeText={
                setName
              }
              theme={
                theme
              }
            />

            <Field
              label="Descripción"
              value={
                description
              }
              onChangeText={
                setDescription
              }
              theme={
                theme
              }
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
              Audiencia CRM
            </Text>
            <View
              style={
                styles.selectorGrid
              }
            >
              <Selector
                label="Sin audiencia"
                selected={
                  audienceId ===
                  null
                }
                onPress={
                  () =>
                    setAudienceId(
                      null,
                    )
                }
                theme={
                  theme
                }
              />
              {audiences.map(
                audience => (
                  <Selector
                    key={
                      audience.id
                    }
                    label={`${audience.name} · ${audience.memberCount}`}
                    selected={
                      audienceId ===
                      audience.id
                    }
                    onPress={
                      () =>
                        setAudienceId(
                          audience.id,
                        )
                    }
                    theme={
                      theme
                    }
                  />
                ),
              )}
            </View>

            <OptionGroup
              label="Objetivo"
              options={
                OBJECTIVE_OPTIONS
              }
              value={
                objective
              }
              onChange={
                value =>
                  setObjective(
                    value as MarketingCampaignObjective,
                  )
              }
              theme={
                theme
              }
            />

            <OptionGroup
              label="Canal"
              options={
                CHANNEL_OPTIONS
              }
              value={
                channel
              }
              onChange={
                value =>
                  setChannel(
                    value as MarketingCampaignChannel,
                  )
              }
              theme={
                theme
              }
            />

            <OptionGroup
              label="Tipo de acción"
              options={
                ACTION_OPTIONS
              }
              value={
                actionType
              }
              onChange={
                value =>
                  setActionType(
                    value as MarketingActionType,
                  )
              }
              theme={
                theme
              }
            />

            <Field
              label="Título / asunto"
              value={
                messageTitle
              }
              onChangeText={
                setMessageTitle
              }
              theme={
                theme
              }
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
              Mensaje
            </Text>
            <TextInput
              value={
                messageBody
              }
              onChangeText={
                setMessageBody
              }
              multiline
              style={[
                styles.input,
                styles.multiline,
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

            <DateTimeCalendarField label="Inicio opcional" value={startsAt} onChange={setStartsAt} allowClear />

            <DateTimeCalendarField label="Fin opcional" value={endsAt} onChange={setEndsAt} allowClear />

            <View
              style={
                styles.actions
              }
            >
              <TouchableOpacity
                onPress={
                  () =>
                    setEditorVisible(
                      false,
                    )
                }
                style={[
                  styles.secondaryButton,
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
                    void handleSave();
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
                    GUARDAR CAMPAÑA
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

function Field({
  label,
  value,
  onChangeText,
  placeholder,
  theme,
}: {
  label: string;
  value: string;
  onChangeText:
    (value: string) => void;
  placeholder?: string;
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
        placeholder={
          placeholder
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
    </>
  );
}

function Selector({
  label,
  selected,
  onPress,
  theme,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
  theme: {
    primary: string;
    textMuted: string;
    border: string;
    surface: string;
    surfaceAlt: string;
  };
}) {
  return (
    <TouchableOpacity
      onPress={
        onPress
      }
      style={[
        styles.selector,
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
          styles.buttonText,
          {
            color:
              selected
                ? theme.primary
                : theme.textMuted,
          },
        ]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}

function OptionGroup({
  label,
  options,
  value,
  onChange,
  theme,
}: {
  label: string;
  options:
    Array<{
      value: string;
      label: string;
    }>;
  value: string;
  onChange:
    (value: string) => void;
  theme: {
    primary: string;
    textMuted: string;
    border: string;
    surface: string;
    surfaceAlt: string;
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
      <View
        style={
          styles.selectorGrid
        }
      >
        {options.map(
          option => (
            <Selector
              key={
                option.value
              }
              label={
                option.label
              }
              selected={
                value ===
                option.value
              }
              onPress={
                () =>
                  onChange(
                    option.value,
                  )
              }
              theme={
                theme
              }
            />
          ),
        )}
      </View>
    </>
  );
}
