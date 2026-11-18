import React, {
  useCallback,
  useEffect,
  useState,
} from 'react';

import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';

import {
  useBusiness,
} from '../../../context/BusinessContext';

import {
  useAuth,
} from '../../../context/AuthContext';

import {
  AiHandoffConversationDetail,
  AiHandoffInboxItem,
  claimAiHandoffConversation,
  getAiHandoffConversation,
  getAiHandoffHistory,
  getAiHandoffInbox,
  resolveAiHandoffConversation,
  subscribeAiHandoffRealtime,
  returnAiHandoffToDorian,
  sendAiHandoffHumanMessage,
} from '../../../services/aiHandoffService';

import {
  styles,
} from './AdminAiHandoffInbox.styles';

export function AdminAiHandoffInbox() {
  const {
    width,
  } = useWindowDimensions();

  const {
    theme,
  } = useBusiness();

  const {
    user,
  } = useAuth();

  const isPhone =
    width < 700;

  const isTablet =
    width >= 700 &&
    width < 1100;

  const [
    viewMode,
    setViewMode,
  ] =
    useState<
      'pending' |
      'history'
    >(
      'pending',
    );

  const [
    items,
    setItems,
  ] =
    useState<AiHandoffInboxItem[]>(
      [],
    );

  const [
    selectedId,
    setSelectedId,
  ] =
    useState<string | null>(
      null,
    );

  const [
    detail,
    setDetail,
  ] =
    useState<
      AiHandoffConversationDetail | null
    >(
      null,
    );

  const [
    loading,
    setLoading,
  ] =
    useState(true);

  const [
    loadingDetail,
    setLoadingDetail,
  ] =
    useState(false);

  const [
    errorMessage,
    setErrorMessage,
  ] =
    useState<string | null>(
      null,
    );


  const [
    replyText,
    setReplyText,
  ] =
    useState('');

  const [
    claiming,
    setClaiming,
  ] =
    useState(false);

  const [
    sendingReply,
    setSendingReply,
  ] =
    useState(false);


  const [
    resolving,
    setResolving,
  ] =
    useState(false);

  const [
    returningToAi,
    setReturningToAi,
  ] =
    useState(false);

  const loadInbox =
    useCallback(
      async () => {
        try {
          setLoading(
            true,
          );

          setErrorMessage(
            null,
          );

          const result =
            viewMode ===
              'pending'
              ? await getAiHandoffInbox()
              : await getAiHandoffHistory();

          setItems(
            result,
          );

          if (
            selectedId &&
            !result.some(
              item =>
                item.conversationId ===
                selectedId,
            )
          ) {
            setSelectedId(
              null,
            );

            setDetail(
              null,
            );
          }
        } catch (
          error
        ) {
          setErrorMessage(
            error instanceof Error
              ? error.message
              : 'No se pudo cargar la bandeja.',
          );
        } finally {
          setLoading(
            false,
          );
        }
      },
      [
        selectedId,
        viewMode,
      ],
    );

  useEffect(
    () => {
      void loadInbox();
    },
    [
      loadInbox,
    ],
  );


  useEffect(
    () => {
      const unsubscribe =
        subscribeAiHandoffRealtime(
          () => {
            void loadInbox();
          },
        );

      return unsubscribe;
    },
    [
      loadInbox,
    ],
  );

  const openConversation =
    async (
      conversationId:
        string,
    ): Promise<void> => {
      if (
        selectedId ===
        conversationId
      ) {
        setSelectedId(
          null,
        );

        setDetail(
          null,
        );

        setReplyText(
          '',
        );

        return;
      }

      try {
        setSelectedId(
          conversationId,
        );

        setLoadingDetail(
          true,
        );

        setErrorMessage(
          null,
        );

        const result =
          await getAiHandoffConversation(
            conversationId,
          );

        setDetail(
          result,
        );
      } catch (
        error
      ) {
        setDetail(
          null,
        );

        setErrorMessage(
          error instanceof Error
            ? error.message
            : 'No se pudo cargar la conversación.',
        );
      } finally {
        setLoadingDetail(
          false,
        );
      }
    };

  const refreshSelectedConversation =
    async (): Promise<void> => {
      if (!selectedId) {
        return;
      }

      const result =
        await getAiHandoffConversation(
          selectedId,
        );

      setDetail(
        result,
      );
    };

  const handleClaimConversation =
    async (): Promise<void> => {
      if (!selectedId) {
        return;
      }

      try {
        setClaiming(
          true,
        );

        setErrorMessage(
          null,
        );

        const result =
          await claimAiHandoffConversation(
            selectedId,
          );

        if (!result.claimed) {
          setErrorMessage(
            result.reason ??
            'No se pudo tomar la conversación.',
          );

          await loadInbox();
          await refreshSelectedConversation();

          return;
        }

        await loadInbox();
        await refreshSelectedConversation();
      } catch (
        error
      ) {
        setErrorMessage(
          error instanceof Error
            ? error.message
            : 'No se pudo tomar la conversación.',
        );
      } finally {
        setClaiming(
          false,
        );
      }
    };

  const handleSendHumanReply =
    async (): Promise<void> => {
      if (
        !selectedId ||
        !replyText.trim()
      ) {
        return;
      }

      try {
        setSendingReply(
          true,
        );

        setErrorMessage(
          null,
        );

        const result =
          await sendAiHandoffHumanMessage(
            selectedId,
            replyText,
          );

        if (!result.sent) {
          setErrorMessage(
            result.reason ??
            'No se pudo guardar la respuesta.',
          );

          return;
        }

        setReplyText(
          '',
        );

        await refreshSelectedConversation();
        await loadInbox();
      } catch (
        error
      ) {
        setErrorMessage(
          error instanceof Error
            ? error.message
            : 'No se pudo guardar la respuesta humana.',
        );
      } finally {
        setSendingReply(
          false,
        );
      }
    };

  const leaveResolvedConversation =
    async (): Promise<void> => {
      setSelectedId(
        null,
      );

      setDetail(
        null,
      );

      setReplyText(
        '',
      );

      await loadInbox();
    };

  const executeReturnToDorian =
    async (): Promise<void> => {
      if (!selectedId) {
        return;
      }

      try {
        setReturningToAi(
          true,
        );

        setErrorMessage(
          null,
        );

        const result =
          await returnAiHandoffToDorian(
            selectedId,
            'Atención humana finalizada; se devuelve control a DORIAN.',
          );

        if (!result.resumed) {
          setErrorMessage(
            result.reason ??
            'No se pudo devolver la conversación a DORIAN.',
          );

          return;
        }

        await leaveResolvedConversation();
      } catch (
        error
      ) {
        setErrorMessage(
          error instanceof Error
            ? error.message
            : 'No se pudo devolver la conversación a DORIAN.',
        );
      } finally {
        setReturningToAi(
          false,
        );
      }
    };

  const handleReturnToDorian =
    (): void => {
      Alert.alert(
        'Devolver a DORIAN',
        'La atención humana terminará y DORIAN podrá continuar respondiendo en esta conversación usando todo el historial.',
        [
          {
            text:
              'Cancelar',
            style:
              'cancel',
          },
          {
            text:
              'Devolver',
            onPress:
              () => {
                void executeReturnToDorian();
              },
          },
        ],
      );
    };

  const executeResolveCase =
    async (): Promise<void> => {
      if (!selectedId) {
        return;
      }

      try {
        setResolving(
          true,
        );

        setErrorMessage(
          null,
        );

        const result =
          await resolveAiHandoffConversation(
            selectedId,
            'Caso resuelto por atención humana.',
          );

        if (!result.resolved) {
          setErrorMessage(
            result.reason ??
            'No se pudo resolver el caso.',
          );

          return;
        }

        await leaveResolvedConversation();
      } catch (
        error
      ) {
        setErrorMessage(
          error instanceof Error
            ? error.message
            : 'No se pudo resolver el caso.',
        );
      } finally {
        setResolving(
          false,
        );
      }
    };

  const handleResolveCase =
    (): void => {
      Alert.alert(
        'Resolver caso',
        'El caso saldrá del Inbox. Si ya existe una orden, la conversación quedará en modo post-pedido; si no existe orden, se cerrará.',
        [
          {
            text:
              'Cancelar',
            style:
              'cancel',
          },
          {
            text:
              'Resolver',
            onPress:
              () => {
                void executeResolveCase();
              },
          },
        ],
      );
    };

  return (
    <ScrollView
      style={
        styles.scroll
      }
      contentContainerStyle={[
        styles.scrollContent,
        isPhone &&
        styles.scrollContentPhone,
      ]}
      showsVerticalScrollIndicator
      keyboardShouldPersistTaps="handled"
      nestedScrollEnabled
    >
      <View
        style={[
          styles.container,
          isTablet &&
          styles.containerTablet,
          isPhone &&
          styles.containerPhone,
        ]}
      >
        <View
          style={
            styles.header
          }
        >
          <Text
            style={[
              styles.title,
              isPhone &&
              styles.titlePhone,
              {
                color:
                  theme.text,
              },
            ]}
          >
            Inbox IA
          </Text>

          <Text
            style={[
              styles.subtitle,
              isPhone &&
              styles.subtitlePhone,
              {
                color:
                  theme.textMuted,
              },
            ]}
          >
            Conversaciones que DORIAN
            pausó y necesitan atención
            humana.
          </Text>
        </View>

        <View
          style={
            styles.modeTabs
          }
        >
          <Pressable
            onPress={() => {
              setSelectedId(
                null,
              );
              setDetail(
                null,
              );
              setViewMode(
                'pending',
              );
            }}
            style={[
              styles.modeTab,
              {
                borderColor:
                  viewMode ===
                    'pending'
                    ? theme.primary
                    : theme.border,
                backgroundColor:
                  viewMode ===
                    'pending'
                    ? theme.surfaceAlt
                    : theme.surface,
              },
            ]}
          >
            <Text
              style={[
                styles.modeTabText,
                {
                  color:
                    viewMode ===
                      'pending'
                      ? theme.primary
                      : theme.textMuted,
                },
              ]}
            >
              Pendientes
            </Text>
          </Pressable>

          <Pressable
            onPress={() => {
              setSelectedId(
                null,
              );
              setDetail(
                null,
              );
              setViewMode(
                'history',
              );
            }}
            style={[
              styles.modeTab,
              {
                borderColor:
                  viewMode ===
                    'history'
                    ? theme.primary
                    : theme.border,
                backgroundColor:
                  viewMode ===
                    'history'
                    ? theme.surfaceAlt
                    : theme.surface,
              },
            ]}
          >
            <Text
              style={[
                styles.modeTabText,
                {
                  color:
                    viewMode ===
                      'history'
                      ? theme.primary
                      : theme.textMuted,
                },
              ]}
            >
              Historial
            </Text>
          </Pressable>
        </View>

        <View
          style={[
            styles.actionsRow,
            isPhone &&
            styles.actionsRowPhone,
          ]}
        >
          <Pressable
            onPress={() => {
              void loadInbox();
            }}
            style={[
              styles.refreshButton,
              isPhone &&
              styles.refreshButtonPhone,
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
                styles.refreshText,
                {
                  color:
                    theme.text,
                },
              ]}
            >
              Actualizar
            </Text>
          </Pressable>

          <Text
            style={[
              styles.counter,
              {
                color:
                  theme.textMuted,
              },
            ]}
          >
            {
              items.length
            } {
              viewMode ===
                'pending'
                ? 'pendientes'
                : 'casos'
            }
          </Text>
        </View>

        {
          errorMessage
            ? (
              <View
                style={[
                  styles.errorCard,
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
                    styles.errorText,
                    {
                      color:
                        theme.text,
                    },
                  ]}
                >
                  {
                    errorMessage
                  }
                </Text>
              </View>
            )
            : null
        }

        {
          loading
            ? (
              <View
                style={[
                  styles.emptyCard,
                  {
                    borderColor:
                      theme.border,
                    backgroundColor:
                      theme.surface,
                  },
                ]}
              >
                <ActivityIndicator
                  color={
                    theme.primary
                  }
                />

                <Text
                  style={[
                    styles.loadingText,
                    {
                      color:
                        theme.textMuted,
                    },
                  ]}
                >
                  Cargando conversaciones…
                </Text>
              </View>
            )
            : null
        }

        {
          !loading &&
          items.length ===
            0
            ? (
              <View
                style={[
                  styles.emptyCard,
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
                    styles.emptyTitle,
                    {
                      color:
                        theme.text,
                    },
                  ]}
                >
                  Todo al día
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
                  {
                    viewMode ===
                      'pending'
                      ? 'No hay conversaciones esperando atención humana.'
                      : 'Todavía no hay casos resueltos en el historial.'
                  }
                </Text>
              </View>
            )
            : null
        }

        <View
          style={
            styles.list
          }
        >
          {
            items.map(
              item => {
                const isOpen =
                  selectedId ===
                  item.conversationId;

                return (
                  <View
                    key={
                      item.conversationId
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
                      style={[
                        styles.cardTop,
                        isPhone &&
                        styles.cardTopPhone,
                      ]}
                    >
                      <View
                        style={
                          styles.customerBlock
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
                          {
                            item.customerName ||
                            'Cliente sin nombre'
                          }
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
                          {
                            formatChannel(
                              item.channel,
                            )
                          }
                          {
                            item.customerPhone
                              ? ` · ${maskPhone(
                                  item.customerPhone,
                                )}`
                              : ''
                          }
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
                          {
                            viewMode ===
                              'pending'
                              ? 'Esperando desde '
                              : 'Resuelto '
                          }
                          {
                            formatDate(
                              viewMode ===
                                'pending'
                                ? item.handoffAt ??
                                  item.lastMessageAt
                                : item.resolvedAt ??
                                  item.lastMessageAt,
                            )
                          }
                        </Text>
                      </View>

                      <View
                        style={[
                          styles.badge,
                          {
                            borderColor:
                              theme.primary,
                            backgroundColor:
                              theme.surfaceAlt,
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.badgeText,
                            {
                              color:
                                theme.primary,
                            },
                          ]}
                        >
                          {
                            viewMode ===
                              'pending'
                              ? 'HUMANO'
                              : item.resolutionType ===
                                  'returned_to_ai'
                                ? 'DEVUELTO A IA'
                                : 'RESUELTO'
                          }
                        </Text>
                      </View>
                    </View>

                    {
                      viewMode ===
                        'pending'
                        ? (
                          <View
                            style={[
                              styles.waitingChip,
                              getWaitingLevel(
                                item.handoffAt ??
                                item.lastMessageAt,
                              ) ===
                                'urgent'
                                ? styles.waitingChipUrgent
                                : getWaitingLevel(
                                    item.handoffAt ??
                                    item.lastMessageAt,
                                  ) ===
                                    'waiting'
                                  ? styles.waitingChipWaiting
                                  : styles.waitingChipNew,
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
                                styles.waitingChipText,
                                {
                                  color:
                                    theme.text,
                                },
                              ]}
                            >
                              {
                                getWaitingLabel(
                                  item.handoffAt ??
                                  item.lastMessageAt,
                                )
                              }
                            </Text>
                          </View>
                        )
                        : null
                    }

                    <Text
                      style={[
                        styles.reason,
                        {
                          color:
                            theme.text,
                        },
                      ]}
                    >
                      {
                        item.handoffReason ||
                        'Sin motivo registrado.'
                      }
                    </Text>

                    {
                      item.lastUserMessage
                        ? (
                          <Text
                            numberOfLines={
                              isPhone
                                ? 5
                                : 3
                            }
                            style={[
                              styles.messagePreview,
                              {
                                color:
                                  theme.textMuted,
                              },
                            ]}
                          >
                            “{
                              item.lastUserMessage
                            }”
                          </Text>
                        )
                        : null
                    }

                    {
                      item.trackingCode ||
                      item.estimatedTotal !==
                        null ||
                      item.draftStatus
                        ? (
                          <View
                            style={
                              styles.orderRow
                            }
                          >
                            {
                              item.trackingCode
                                ? (
                                  <View
                                    style={[
                                      styles.infoChip,
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
                                        styles.orderText,
                                        {
                                          color:
                                            theme.text,
                                        },
                                      ]}
                                    >
                                      #{
                                        item.trackingCode
                                      }
                                    </Text>
                                  </View>
                                )
                                : null
                            }

                            {
                              item.estimatedTotal !==
                                null
                                ? (
                                  <View
                                    style={[
                                      styles.infoChip,
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
                                        styles.orderText,
                                        {
                                          color:
                                            theme.text,
                                        },
                                      ]}
                                    >
                                      ${
                                        item.estimatedTotal.toFixed(
                                          2,
                                        )
                                      }
                                    </Text>
                                  </View>
                                )
                                : null
                            }

                            {
                              item.draftStatus
                                ? (
                                  <View
                                    style={[
                                      styles.infoChip,
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
                                        styles.orderText,
                                        {
                                          color:
                                            theme.text,
                                        },
                                      ]}
                                    >
                                      {
                                        item.draftStatus
                                      }
                                    </Text>
                                  </View>
                                )
                                : null
                            }
                          </View>
                        )
                        : null
                    }

                    <Pressable
                      onPress={() => {
                        void openConversation(
                          item.conversationId,
                        );
                      }}
                      style={[
                        styles.detailButton,
                        isPhone &&
                        styles.detailButtonPhone,
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
                          styles.detailButtonText,
                          {
                            color:
                              theme.text,
                          },
                        ]}
                      >
                        {
                          isOpen
                            ? 'Ocultar detalle'
                            : 'Ver conversación'
                        }
                      </Text>
                    </Pressable>

                    {
                      isOpen
                        ? (
                          <View
                            style={[
                              styles.detailPanel,
                              {
                                borderTopColor:
                                  theme.border,
                              },
                            ]}
                          >
                            {
                              loadingDetail
                                ? (
                                  <ActivityIndicator
                                    color={
                                      theme.primary
                                    }
                                  />
                                )
                                : null
                            }

                            {
                              !loadingDetail &&
                              detail
                                ? (
                                  <>
                                    {
                                      viewMode ===
                                        'pending'
                                        ? (
                                          <View
                                      style={[
                                        styles.handoffPanel,
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
                                          styles.detailHeading,
                                          {
                                            color:
                                              theme.text,
                                          },
                                        ]}
                                      >
                                        Atención humana
                                      </Text>

                                      {
                                        !detail.conversation.assigneeId
                                          ? (
                                            <>
                                              <Text
                                                style={[
                                                  styles.handoffHelp,
                                                  {
                                                    color:
                                                      theme.textMuted,
                                                  },
                                                ]}
                                              >
                                                Toma la conversación para responder. DORIAN permanecerá pausado mientras el caso esté en atención humana.
                                              </Text>

                                              <Pressable
                                                disabled={
                                                  claiming
                                                }
                                                onPress={() => {
                                                  void handleClaimConversation();
                                                }}
                                                style={[
                                                  styles.claimButton,
                                                  isPhone &&
                                                  styles.fullWidthAction,
                                                  {
                                                    backgroundColor:
                                                      theme.primary,
                                                    opacity:
                                                      claiming
                                                        ? 0.65
                                                        : 1,
                                                  },
                                                ]}
                                              >
                                                {
                                                  claiming
                                                    ? (
                                                      <ActivityIndicator
                                                        color="#000"
                                                      />
                                                    )
                                                    : (
                                                      <Text
                                                        style={[
                                                          styles.claimButtonText,
                                                          {
                                                            color:
                                                              theme.background,
                                                          },
                                                        ]}
                                                      >
                                                        Tomar conversación
                                                      </Text>
                                                    )
                                                }
                                              </Pressable>
                                            </>
                                          )
                                          : detail.conversation.assigneeId ===
                                            user?.id
                                            ? (
                                              <>
                                                <Text
                                                  style={[
                                                    styles.assignmentText,
                                                    {
                                                      color:
                                                        theme.primary,
                                                    },
                                                  ]}
                                                >
                                                  La estás atendiendo tú.
                                                </Text>

                                                <TextInput
                                                  value={
                                                    replyText
                                                  }
                                                  onChangeText={
                                                    setReplyText
                                                  }
                                                  placeholder="Escribe una respuesta como humano…"
                                                  placeholderTextColor={
                                                    theme.textMuted
                                                  }
                                                  editable={
                                                    !sendingReply
                                                  }
                                                  multiline
                                                  maxLength={
                                                    3000
                                                  }
                                                  style={[
                                                    styles.replyInput,
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

                                                <Pressable
                                                  disabled={
                                                    sendingReply ||
                                                    !replyText.trim()
                                                  }
                                                  onPress={() => {
                                                    void handleSendHumanReply();
                                                  }}
                                                  style={[
                                                    styles.sendHumanButton,
                                                    isPhone &&
                                                    styles.fullWidthAction,
                                                    {
                                                      backgroundColor:
                                                        theme.primary,
                                                      opacity:
                                                        sendingReply ||
                                                        !replyText.trim()
                                                          ? 0.55
                                                          : 1,
                                                    },
                                                  ]}
                                                >
                                                  {
                                                    sendingReply
                                                      ? (
                                                        <ActivityIndicator
                                                          color="#000"
                                                        />
                                                      )
                                                      : (
                                                        <Text
                                                          style={[
                                                            styles.sendHumanButtonText,
                                                            {
                                                              color:
                                                                theme.background,
                                                            },
                                                          ]}
                                                        >
                                                          Responder como humano
                                                        </Text>
                                                      )
                                                  }
                                                </Pressable>

                                                <View
                                                  style={[
                                                    styles.resolutionActions,
                                                    isPhone &&
                                                    styles.resolutionActionsPhone,
                                                  ]}
                                                >
                                                  <Pressable
                                                    disabled={
                                                      returningToAi ||
                                                      resolving ||
                                                      sendingReply
                                                    }
                                                    onPress={
                                                      handleReturnToDorian
                                                    }
                                                    style={[
                                                      styles.returnToAiButton,
                                                      isPhone &&
                                                      styles.fullWidthAction,
                                                      {
                                                        borderColor:
                                                          theme.primary,
                                                        backgroundColor:
                                                          theme.surfaceAlt,
                                                        opacity:
                                                          returningToAi ||
                                                          resolving
                                                            ? 0.6
                                                            : 1,
                                                      },
                                                    ]}
                                                  >
                                                    {
                                                      returningToAi
                                                        ? (
                                                          <ActivityIndicator
                                                            color={
                                                              theme.primary
                                                            }
                                                          />
                                                        )
                                                        : (
                                                          <Text
                                                            style={[
                                                              styles.returnToAiButtonText,
                                                              {
                                                                color:
                                                                  theme.primary,
                                                              },
                                                            ]}
                                                          >
                                                            Devolver a DORIAN
                                                          </Text>
                                                        )
                                                    }
                                                  </Pressable>

                                                  <Pressable
                                                    disabled={
                                                      resolving ||
                                                      returningToAi ||
                                                      sendingReply
                                                    }
                                                    onPress={
                                                      handleResolveCase
                                                    }
                                                    style={[
                                                      styles.resolveButton,
                                                      isPhone &&
                                                      styles.fullWidthAction,
                                                      {
                                                        borderColor:
                                                          theme.border,
                                                        backgroundColor:
                                                          theme.surface,
                                                        opacity:
                                                          resolving ||
                                                          returningToAi
                                                            ? 0.6
                                                            : 1,
                                                      },
                                                    ]}
                                                  >
                                                    {
                                                      resolving
                                                        ? (
                                                          <ActivityIndicator
                                                            color={
                                                              theme.text
                                                            }
                                                          />
                                                        )
                                                        : (
                                                          <Text
                                                            style={[
                                                              styles.resolveButtonText,
                                                              {
                                                                color:
                                                                  theme.text,
                                                              },
                                                            ]}
                                                          >
                                                            Resolver caso
                                                          </Text>
                                                        )
                                                    }
                                                  </Pressable>
                                                </View>
                                              </>
                                            )
                                            : (
                                              <Text
                                                style={[
                                                  styles.assignmentText,
                                                  {
                                                    color:
                                                      theme.textMuted,
                                                  },
                                                ]}
                                              >
                                                Otro administrador ya está atendiendo esta conversación.
                                              </Text>
                                            )
                                      }
                                    </View>

                                        )
                                        : null
                                    }

                                    <Text
                                      style={[
                                        styles.detailHeading,
                                        {
                                          color:
                                            theme.text,
                                        },
                                      ]}
                                    >
                                      Conversación
                                    </Text>

                                    <View
                                      style={
                                        styles.messages
                                      }
                                    >
                                      {
                                        detail.messages.map(
                                          message => {
                                            const isUser =
                                              message.role ===
                                              'user';

                                            const isHuman =
                                              message.metadata
                                                ?.source ===
                                              'human';

                                            return (
                                              <View
                                                key={
                                                  message.id
                                                }
                                                style={[
                                                  styles.messageBubble,
                                                  isUser
                                                    ? styles.messageBubbleUser
                                                    : styles.messageBubbleAssistant,
                                                  {
                                                    borderColor:
                                                      isUser
                                                        ? theme.primary
                                                        : theme.border,
                                                    backgroundColor:
                                                      isUser
                                                        ? theme.surfaceAlt
                                                        : theme.background,
                                                  },
                                                ]}
                                              >
                                                <Text
                                                  style={[
                                                    styles.messageRole,
                                                    {
                                                      color:
                                                        isUser
                                                          ? theme.primary
                                                          : theme.textMuted,
                                                    },
                                                  ]}
                                                >
                                                  {
                                                    isUser
                                                      ? 'CLIENTE'
                                                      : isHuman
                                                        ? 'HUMANO'
                                                        : 'DORIAN'
                                                  }
                                                  {' · '}
                                                  {
                                                    formatDate(
                                                      message.createdAt,
                                                    )
                                                  }
                                                </Text>

                                                <Text
                                                  selectable
                                                  style={[
                                                    styles.messageText,
                                                    {
                                                      color:
                                                        theme.text,
                                                    },
                                                  ]}
                                                >
                                                  {
                                                    message.content ||
                                                    ''
                                                  }
                                                </Text>
                                              </View>
                                            );
                                          },
                                        )
                                      }
                                    </View>

                                    {
                                      detail.draft
                                        ? (
                                          <View
                                            style={[
                                              styles.draftCard,
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
                                                styles.detailHeading,
                                                {
                                                  color:
                                                    theme.text,
                                                },
                                              ]}
                                            >
                                              Pedido / borrador
                                            </Text>

                                            {
                                              detail.draft.trackingCode
                                                ? (
                                                  <Text
                                                    style={{
                                                      color:
                                                        theme.text,
                                                    }}
                                                  >
                                                    Código: #{
                                                      detail.draft.trackingCode
                                                    }
                                                  </Text>
                                                )
                                                : null
                                            }

                                            <Text
                                              style={{
                                                color:
                                                  theme.text,
                                              }}
                                            >
                                              Estado: {
                                                detail.draft.status
                                              }
                                            </Text>

                                            {
                                              detail.draft.fulfillmentType
                                                ? (
                                                  <Text
                                                    style={{
                                                      color:
                                                        theme.text,
                                                    }}
                                                  >
                                                    Modalidad: {
                                                      detail.draft.fulfillmentType ===
                                                        'delivery'
                                                        ? 'Domicilio'
                                                        : 'Recoger'
                                                    }
                                                  </Text>
                                                )
                                                : null
                                            }

                                            {
                                              detail.draft.estimatedTotal !==
                                                null
                                                ? (
                                                  <Text
                                                    style={{
                                                      color:
                                                        theme.text,
                                                    }}
                                                  >
                                                    Total: ${
                                                      Number(
                                                        detail.draft.estimatedTotal,
                                                      ).toFixed(
                                                        2,
                                                      )
                                                    }
                                                  </Text>
                                                )
                                                : null
                                            }

                                            <Text
                                              style={{
                                                color:
                                                  theme.text,
                                              }}
                                            >
                                              Productos: {
                                                Array.isArray(
                                                  detail.draft.items,
                                                )
                                                  ? detail.draft.items.length
                                                  : 0
                                              }
                                            </Text>
                                          </View>
                                        )
                                        : null
                                    }
                                  </>
                                )
                                : null
                            }
                          </View>
                        )
                        : null
                    }
                  </View>
                );
              },
            )
          }
        </View>
      </View>
    </ScrollView>
  );
}

function getWaitingMinutes(
  value:
    | string
    | null,
): number {
  if (!value) {
    return 0;
  }

  const timestamp =
    new Date(
      value,
    ).getTime();

  if (
    !Number.isFinite(
      timestamp,
    )
  ) {
    return 0;
  }

  return Math.max(
    0,
    Math.floor(
      (
        Date.now() -
        timestamp
      ) /
      60000,
    ),
  );
}

function getWaitingLevel(
  value:
    | string
    | null,
):
  | 'new'
  | 'waiting'
  | 'urgent' {
  const minutes =
    getWaitingMinutes(
      value,
    );

  if (
    minutes >=
    15
  ) {
    return 'urgent';
  }

  if (
    minutes >=
    5
  ) {
    return 'waiting';
  }

  return 'new';
}

function getWaitingLabel(
  value:
    | string
    | null,
): string {
  const minutes =
    getWaitingMinutes(
      value,
    );

  const level =
    getWaitingLevel(
      value,
    );

  const prefix =
    level ===
      'urgent'
      ? 'URGENTE'
      : level ===
          'waiting'
        ? 'ESPERANDO'
        : 'NUEVO';

  if (
    minutes <=
    0
  ) {
    return `${prefix} · ahora`;
  }

  if (
    minutes <
    60
  ) {
    return `${prefix} · ${minutes} min`;
  }

  const hours =
    Math.floor(
      minutes /
      60,
    );

  const remaining =
    minutes %
    60;

  return remaining >
    0
    ? `${prefix} · ${hours} h ${remaining} min`
    : `${prefix} · ${hours} h`;
}

function formatChannel(
  channel: string,
): string {
  switch (
    channel
  ) {
    case 'web':
      return 'Web';

    case 'whatsapp':
      return 'WhatsApp';

    case 'instagram':
      return 'Instagram';

    case 'voice':
      return 'Voz';

    default:
      return 'Interno';
  }
}

function maskPhone(
  phone: string,
): string {
  const clean =
    phone.replace(
      /\D/g,
      '',
    );

  if (
    clean.length <
    4
  ) {
    return '••••';
  }

  return `••••••${clean.slice(
    -4,
  )}`;
}

function formatDate(
  value:
    | string
    | null,
): string {
  if (!value) {
    return '—';
  }

  const date =
    new Date(
      value,
    );

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    return value;
  }

  return date.toLocaleString(
    'es-MX',
    {
      day:
        '2-digit',
      month:
        '2-digit',
      hour:
        '2-digit',
      minute:
        '2-digit',
    },
  );
}
