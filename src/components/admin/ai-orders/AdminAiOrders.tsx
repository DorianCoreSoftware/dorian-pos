import React, {
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';

import {
  supabase,
} from '../../../services/supabase';

import {
  useBusiness,
} from '../../../context/BusinessContext';

import {
  styles,
} from './AdminAiOrders.styles';

type ChatRole =
  | 'user'
  | 'assistant';

interface ChatMessage {
  id: string;
  role: ChatRole;
  content: string;
}

interface AiOrderSettings {
  enabled: boolean;
  order_creation_enabled: boolean;
  model: string;
  require_explicit_confirmation: boolean;
}

interface DraftModifier {
  id?: string;
  name?: string;
  extraPrice?: number;
}

interface DraftItem {
  productId?: string;
  productName?: string;
  productDescription?: string | null;
  quantity?: number;
  notes?: string;
  modifiers?: DraftModifier[];
  unitPrice?: number;
  lineTotal?: number;
}

interface AiOrderDraft {
  id?: string;
  status?: string;
  customer_name?: string | null;
  customer_phone?: string | null;
  fulfillment_type?: string | null;
  delivery?: Record<string, unknown> | null;
  items?: DraftItem[];
  estimated_total?: number | string;
  currency_code?: string;
}

interface AgentResponse {
  conversationId: string;
  message: string;
  draft: AiOrderDraft | null;
}

function createLocalId():
  string {
  return `${Date.now()}-${Math.random()
    .toString(36)
    .slice(2)}`;
}

function formatMoney(
  value:
    | number
    | string
    | null
    | undefined,
  currency = 'MXN',
): string {
  const amount =
    Number(
      value ?? 0,
    );

  if (
    !Number.isFinite(
      amount,
    )
  ) {
    return '$0.00';
  }

  try {
    return new Intl
      .NumberFormat(
        'es-MX',
        {
          style:
            'currency',
          currency,
        },
      )
      .format(
        amount,
      );
  } catch {
    return `$${amount.toFixed(2)}`;
  }
}

export function AdminAiOrders() {
  const {
    theme,
  } = useBusiness();

  const scrollRef =
    useRef<ScrollView | null>(
      null,
    );

  const [
    settings,
    setSettings,
  ] =
    useState<AiOrderSettings | null>(
      null,
    );

  const [
    settingsLoading,
    setSettingsLoading,
  ] =
    useState(true);

  const [
    conversationId,
    setConversationId,
  ] =
    useState<string | null>(
      null,
    );

  const [
    messages,
    setMessages,
  ] =
    useState<ChatMessage[]>(
      [],
    );

  const [
    draft,
    setDraft,
  ] =
    useState<AiOrderDraft | null>(
      null,
    );

  const [
    input,
    setInput,
  ] =
    useState('');

  const [
    sending,
    setSending,
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
    lastToolHint,
    setLastToolHint,
  ] =
    useState<string | null>(
      null,
    );

  useEffect(
    () => {
      let mounted =
        true;

      const loadSettings =
        async (): Promise<void> => {
          try {
            setSettingsLoading(
              true,
            );

            const {
              data,
              error,
            } =
              await supabase
                .from(
                  'ai_order_settings',
                )
                .select(
                  'enabled,order_creation_enabled,model,require_explicit_confirmation',
                )
                .eq(
                  'id',
                  1,
                )
                .single();

            if (
              error
            ) {
              throw error;
            }

            if (
              mounted
            ) {
              setSettings(
                data as
                AiOrderSettings,
              );
            }
          } catch (
            error
          ) {
            console.error(
              'Error cargando configuración de AI Orders:',
              error,
            );

            if (
              mounted
            ) {
              setErrorMessage(
                error instanceof
                  Error
                  ? error.message
                  : 'No se pudo cargar la configuración de AI Orders.',
              );
            }
          } finally {
            if (
              mounted
            ) {
              setSettingsLoading(
                false,
              );
            }
          }
        };

      void loadSettings();

      return () => {
        mounted =
          false;
      };
    },
    [],
  );

  useEffect(
    () => {
      if (
        messages.length ===
        0
      ) {
        return;
      }

      const timeout =
        setTimeout(
          () => {
            scrollRef.current
              ?.scrollToEnd({
                animated:
                  true,
              });
          },
          50,
        );

      return () =>
        clearTimeout(
          timeout,
        );
    },
    [
      messages,
    ],
  );

  const draftItems =
    useMemo(
      () =>
        Array.isArray(
          draft?.items,
        )
          ? draft?.items ??
            []
          : [],
      [
        draft,
      ],
    );

  const resetConversation =
    (): void => {
      if (
        sending
      ) {
        return;
      }

      setConversationId(
        null,
      );

      setMessages(
        [],
      );

      setDraft(
        null,
      );

      setInput(
        '',
      );

      setErrorMessage(
        null,
      );

      setLastToolHint(
        null,
      );
    };

  const sendMessage =
    async (): Promise<void> => {
      const cleanMessage =
        input.trim();

      if (
        !cleanMessage ||
        sending
      ) {
        return;
      }

      if (
        !settings?.enabled
      ) {
        setErrorMessage(
          'Dorian AI Orders está desactivado en ai_order_settings.',
        );
        return;
      }

      const userMessage:
        ChatMessage = {
        id:
          createLocalId(),
        role:
          'user',
        content:
          cleanMessage,
      };

      setMessages(
        current => [
          ...current,
          userMessage,
        ],
      );

      setInput(
        '',
      );

      setSending(
        true,
      );

      setErrorMessage(
        null,
      );

      setLastToolHint(
        'Consultando el agente y el catálogo real…',
      );

      try {
        const {
          data,
          error,
        } =
          await supabase
            .functions
            .invoke(
              'ai-order-agent',
              {
                body: {
                  conversationId:
                    conversationId ??
                    undefined,
                  message:
                    cleanMessage,
                  channel:
                    'internal',
                },
              },
            );

        if (
          error
        ) {
          let detail =
            error.message;

          const context =
            (
              error as {
                context?: Response;
              }
            ).context;

          if (
            context
          ) {
            try {
              const payload =
                await context
                  .clone()
                  .json() as
                  {
                    error?: string;
                  };

              if (
                payload?.error
              ) {
                detail =
                  payload.error;
              }
            } catch {
              // Conserva el mensaje original.
            }
          }

          throw new Error(
            detail ||
            'No se pudo consultar el agente.',
          );
        }

        const result =
          data as
            AgentResponse;

        if (
          !result ||
          typeof result
            .message !==
            'string' ||
          typeof result
            .conversationId !==
            'string'
        ) {
          throw new Error(
            'La respuesta del agente no tiene el formato esperado.',
          );
        }

        setConversationId(
          result
            .conversationId,
        );

        setDraft(
          result.draft ??
          null,
        );

        setMessages(
          current => [
            ...current,
            {
              id:
                createLocalId(),
              role:
                'assistant',
              content:
                result.message,
            },
          ],
        );

        setLastToolHint(
          result.draft
            ? 'Borrador actualizado desde datos reales del POS.'
            : 'Respuesta recibida. Aún no hay borrador.',
        );
      } catch (
        error
      ) {
        console.error(
          'Error enviando mensaje a AI Orders:',
          error,
        );

        setErrorMessage(
          error instanceof
            Error
            ? error.message
            : 'No se pudo consultar Dorian AI Orders.',
        );
      } finally {
        setSending(
          false,
        );
      }
    };

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor:
            theme.background,
        },
      ]}
    >
      <View
        style={[
          styles.hero,
          {
            backgroundColor:
              theme.surface,
            borderColor:
              theme.border,
          },
        ]}
      >
        <View
          style={
            styles.heroTop
          }
        >
          <View
            style={{
              flex:
                1,
            }}
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
              🤖 Dorian AI Orders
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
              Simulador interno para validar conversaciones, catálogo, modificadores y borradores antes de abrir canales como WhatsApp.
            </Text>
          </View>

          <Pressable
            disabled={
              sending
            }
            style={[
              styles.newConversationButton,
              {
                borderColor:
                  theme.primary,
              },
            ]}
            onPress={
              resetConversation
            }
          >
            <Text
              style={[
                styles.newConversationButtonText,
                {
                  color:
                    theme.primary,
                },
              ]}
            >
              Nueva conversación
            </Text>
          </Pressable>
        </View>

        {settingsLoading ? (
          <View
            style={
              styles.settingsLoading
            }
          >
            <ActivityIndicator
              color={
                theme.primary
              }
            />
            <Text
              style={[
                styles.settingsText,
                {
                  color:
                    theme.textMuted,
                },
              ]}
            >
              Cargando configuración…
            </Text>
          </View>
        ) : settings ? (
          <View
            style={
              styles.badgesRow
            }
          >
            <View
              style={[
                styles.badge,
                {
                  borderColor:
                    settings.enabled
                      ? theme.primary
                      : theme.danger,
                },
              ]}
            >
              <Text
                style={[
                  styles.badgeText,
                  {
                    color:
                      settings.enabled
                        ? theme.primary
                        : theme.danger,
                  },
                ]}
              >
                {settings.enabled
                  ? 'AGENTE ACTIVO'
                  : 'AGENTE APAGADO'}
              </Text>
            </View>

            <View
              style={[
                styles.badge,
                {
                  borderColor:
                    settings.order_creation_enabled
                      ? theme.danger
                      : theme.border,
                },
              ]}
            >
              <Text
                style={[
                  styles.badgeText,
                  {
                    color:
                      settings.order_creation_enabled
                        ? theme.danger
                        : theme.textMuted,
                  },
                ]}
              >
                {settings.order_creation_enabled
                  ? 'PEDIDOS REALES ACTIVOS'
                  : 'PEDIDOS REALES BLOQUEADOS'}
              </Text>
            </View>

            <View
              style={[
                styles.badge,
                {
                  borderColor:
                    theme.border,
                },
              ]}
            >
              <Text
                style={[
                  styles.badgeText,
                  {
                    color:
                      theme.textMuted,
                  },
                ]}
              >
                {settings.model}
              </Text>
            </View>
          </View>
        ) : null}

        <View
          style={[
            styles.safetyNotice,
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
              styles.safetyNoticeTitle,
              {
                color:
                  theme.text,
              },
            ]}
          >
            Modo de prueba
          </Text>

          <Text
            style={[
              styles.safetyNoticeText,
              {
                color:
                  theme.textMuted,
              },
            ]}
          >
            En esta fase el agente puede consultar el catálogo y construir un borrador, pero el adaptador final todavía bloquea la creación real de órdenes.
          </Text>
        </View>
      </View>

      <View
        style={
          styles.mainGrid
        }
      >
        <View
          style={[
            styles.chatCard,
            {
              backgroundColor:
                theme.surface,
              borderColor:
                theme.border,
            },
          ]}
        >
          <View
            style={[
              styles.cardHeader,
              {
                borderBottomColor:
                  theme.border,
              },
            ]}
          >
            <View>
              <Text
                style={[
                  styles.cardTitle,
                  {
                    color:
                      theme.text,
                  },
                ]}
              >
                Conversación
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
                {conversationId
                  ? `ID: ${conversationId}`
                  : 'Sin conversación iniciada'}
              </Text>
            </View>
          </View>

          <ScrollView
            ref={
              scrollRef
            }
            style={
              styles.chatScroll
            }
            contentContainerStyle={
              styles.chatContent
            }
            keyboardShouldPersistTaps="handled"
          >
            {messages.length ===
            0 ? (
              <View
                style={
                  styles.emptyChat
                }
              >
                <Text
                  style={[
                    styles.emptyChatTitle,
                    {
                      color:
                        theme.text,
                    },
                  ]}
                >
                  Primera prueba sugerida
                </Text>

                <Text
                  style={[
                    styles.emptyChatExample,
                    {
                      color:
                        theme.textMuted,
                    },
                  ]}
                >
                  “Quiero una hamburguesa sencilla”
                </Text>
              </View>
            ) : (
              messages.map(
                message => {
                  const isUser =
                    message.role ===
                    'user';

                  return (
                    <View
                      key={
                        message.id
                      }
                      style={[
                        styles.messageBubble,
                        isUser
                          ? styles.userBubble
                          : styles.assistantBubble,
                        {
                          backgroundColor:
                            isUser
                              ? theme.primary
                              : theme.surfaceAlt,
                          borderColor:
                            isUser
                              ? theme.primary
                              : theme.border,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.messageRole,
                          {
                            color:
                              isUser
                                ? theme.onPrimary
                                : theme.primary,
                          },
                        ]}
                      >
                        {isUser
                          ? 'TÚ'
                          : 'DORIAN AI'}
                      </Text>

                      <Text
                        selectable
                        style={[
                          styles.messageText,
                          {
                            color:
                              isUser
                                ? theme.onPrimary
                                : theme.text,
                          },
                        ]}
                      >
                        {message.content}
                      </Text>
                    </View>
                  );
                },
              )
            )}

            {sending ? (
              <View
                style={[
                  styles.messageBubble,
                  styles.assistantBubble,
                  {
                    backgroundColor:
                      theme.surfaceAlt,
                    borderColor:
                      theme.border,
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
                    styles.thinkingText,
                    {
                      color:
                        theme.textMuted,
                    },
                  ]}
                >
                  Dorian está consultando el POS…
                </Text>
              </View>
            ) : null}
          </ScrollView>

          {lastToolHint ? (
            <Text
              style={[
                styles.toolHint,
                {
                  color:
                    theme.textMuted,
                },
              ]}
            >
              {lastToolHint}
            </Text>
          ) : null}

          {errorMessage ? (
            <View
              style={[
                styles.errorBox,
                {
                  borderColor:
                    theme.danger,
                },
              ]}
            >
              <Text
                selectable
                style={[
                  styles.errorText,
                  {
                    color:
                      theme.danger,
                  },
                ]}
              >
                {errorMessage}
              </Text>
            </View>
          ) : null}

          <View
            style={[
              styles.composer,
              {
                borderTopColor:
                  theme.border,
              },
            ]}
          >
            <TextInput
              value={
                input
              }
              onChangeText={
                setInput
              }
              editable={
                !sending &&
                settings?.enabled !==
                  false
              }
              multiline
              maxLength={
                3000
              }
              placeholder="Escribe como si fueras un cliente…"
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
              onSubmitEditing={() => {
                if (
                  input.trim()
                ) {
                  void sendMessage();
                }
              }}
            />

            <Pressable
              disabled={
                sending ||
                !input.trim() ||
                settings?.enabled !==
                  true
              }
              style={[
                styles.sendButton,
                {
                  backgroundColor:
                    theme.primary,
                  opacity:
                    sending ||
                    !input.trim() ||
                    settings?.enabled !==
                      true
                      ? 0.5
                      : 1,
                },
              ]}
              onPress={() =>
                void sendMessage()
              }
            >
              {sending ? (
                <ActivityIndicator
                  color={
                    theme.onPrimary
                  }
                />
              ) : (
                <Text
                  style={[
                    styles.sendButtonText,
                    {
                      color:
                        theme.onPrimary,
                    },
                  ]}
                >
                  Enviar
                </Text>
              )}
            </Pressable>
          </View>
        </View>

        <View
          style={[
            styles.draftCard,
            {
              backgroundColor:
                theme.surface,
              borderColor:
                theme.border,
            },
          ]}
        >
          <View
            style={[
              styles.cardHeader,
              {
                borderBottomColor:
                  theme.border,
              },
            ]}
          >
            <View>
              <Text
                style={[
                  styles.cardTitle,
                  {
                    color:
                      theme.text,
                  },
                ]}
              >
                Borrador del pedido
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
                {draft?.status
                  ? `Estado: ${draft.status}`
                  : 'Todavía vacío'}
              </Text>
            </View>
          </View>

          <ScrollView
            style={
              styles.draftScroll
            }
            contentContainerStyle={
              styles.draftContent
            }
          >
            {!draft ? (
              <Text
                style={[
                  styles.emptyDraft,
                  {
                    color:
                      theme.textMuted,
                  },
                ]}
              >
                El borrador aparecerá aquí cuando el agente agregue productos mediante las herramientas del POS.
              </Text>
            ) : (
              <>
                <View
                  style={[
                    styles.summaryBox,
                    {
                      backgroundColor:
                        theme.surfaceAlt,
                      borderColor:
                        theme.border,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.summaryLabel,
                      {
                        color:
                          theme.textMuted,
                      },
                    ]}
                  >
                    Cliente
                  </Text>

                  <Text
                    style={[
                      styles.summaryValue,
                      {
                        color:
                          theme.text,
                      },
                    ]}
                  >
                    {draft.customer_name ||
                      'Pendiente'}
                  </Text>

                  <Text
                    style={[
                      styles.summaryLabel,
                      {
                        color:
                          theme.textMuted,
                      },
                    ]}
                  >
                    Teléfono
                  </Text>

                  <Text
                    style={[
                      styles.summaryValue,
                      {
                        color:
                          theme.text,
                      },
                    ]}
                  >
                    {draft.customer_phone ||
                      'Pendiente'}
                  </Text>

                  <Text
                    style={[
                      styles.summaryLabel,
                      {
                        color:
                          theme.textMuted,
                      },
                    ]}
                  >
                    Modalidad
                  </Text>

                  <Text
                    style={[
                      styles.summaryValue,
                      {
                        color:
                          theme.text,
                      },
                    ]}
                  >
                    {draft.fulfillment_type ||
                      'Pendiente'}
                  </Text>
                </View>

                {draftItems.length ===
                0 ? (
                  <Text
                    style={[
                      styles.emptyDraft,
                      {
                        color:
                          theme.textMuted,
                      },
                    ]}
                  >
                    El agente todavía no ha agregado productos.
                  </Text>
                ) : (
                  draftItems.map(
                    (
                      item,
                      index,
                    ) => (
                      <View
                        key={`${item.productId ?? index}-${index}`}
                        style={[
                          styles.draftItem,
                          {
                            borderColor:
                              theme.border,
                          },
                        ]}
                      >
                        <View
                          style={
                            styles.draftItemTop
                          }
                        >
                          <Text
                            style={[
                              styles.draftItemName,
                              {
                                color:
                                  theme.text,
                              },
                            ]}
                          >
                            {item.quantity ??
                              1}
                            {' × '}
                            {item.productName ||
                              'Producto'}
                          </Text>

                          <Text
                            style={[
                              styles.draftItemPrice,
                              {
                                color:
                                  theme.primary,
                              },
                            ]}
                          >
                            {formatMoney(
                              item.lineTotal,
                              draft.currency_code ||
                                'MXN',
                            )}
                          </Text>
                        </View>

                        {Array.isArray(
                          item.modifiers,
                        ) &&
                        item
                          .modifiers
                          .length >
                          0 ? (
                          <Text
                            style={[
                              styles.draftItemMeta,
                              {
                                color:
                                  theme.textMuted,
                              },
                            ]}
                          >
                            {item.modifiers
                              .map(
                                modifier =>
                                  modifier.name,
                              )
                              .filter(
                                Boolean,
                              )
                              .join(
                                ' · ',
                              )}
                          </Text>
                        ) : null}

                        {item.notes ? (
                          <Text
                            style={[
                              styles.draftItemMeta,
                              {
                                color:
                                  theme.textMuted,
                              },
                            ]}
                          >
                            Nota: {item.notes}
                          </Text>
                        ) : null}
                      </View>
                    ),
                  )
                )}

                <View
                  style={[
                    styles.totalRow,
                    {
                      borderTopColor:
                        theme.border,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.totalLabel,
                      {
                        color:
                          theme.text,
                      },
                    ]}
                  >
                    Total estimado
                  </Text>

                  <Text
                    style={[
                      styles.totalValue,
                      {
                        color:
                          theme.primary,
                      },
                    ]}
                  >
                    {formatMoney(
                      draft.estimated_total,
                      draft.currency_code ||
                        'MXN',
                    )}
                  </Text>
                </View>
              </>
            )}
          </ScrollView>
        </View>
      </View>
    </View>
  );
}
