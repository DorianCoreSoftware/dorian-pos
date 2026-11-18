import React, {
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';

import {
  useBusiness,
} from '../../../context/BusinessContext';

import {
  supabase,
} from '../../../services/supabase';

import {
  getOrCreateWebVisitorId,
} from '../../../services/webAnalyticsService';

import {
  getSavedWebCustomerSessionToken,
} from '../../utils/webCustomerStorage';

import {
  getMyWebCustomer,
  getMyWebCustomerProfileDetails,
  WebCustomerProfile,
} from '../../services/web-customer/webCustomerService';

import {
  styles,
} from './DorianWebChat.styles';

type ChatRole =
  | 'assistant'
  | 'user';

interface ChatMessage {
  id: string;
  role: ChatRole;
  content: string;
  createdAt: string;
}

interface WebChatCustomerIdentity {
  name: string | null;
  phone: string | null;
  avatarUrl: string | null;
}

interface WebChatResponse {
  conversationId?: string;
  message?: string;
  blocked?: boolean;
  conversationStatus?: string;
  customer?: WebChatCustomerIdentity | null;
  error?: string;
}

interface PublicAiWebChatConfig {
  assistantAvatarUrl: string | null;
}


function findStringByKeys(
  value: unknown,
  keys: RegExp,
  depth = 0,
): string | null {
  if (
    depth > 5 ||
    value == null
  ) {
    return null;
  }

  if (
    Array.isArray(value)
  ) {
    for (
      const item of value
    ) {
      const found =
        findStringByKeys(
          item,
          keys,
          depth + 1,
        );

      if (found) {
        return found;
      }
    }

    return null;
  }

  if (
    typeof value !==
      'object'
  ) {
    return null;
  }

  const record =
    value as
      Record<string, unknown>;

  for (
    const [key, item] of
      Object.entries(record)
  ) {
    if (
      keys.test(key) &&
      typeof item ===
        'string' &&
      item.trim()
    ) {
      return item.trim();
    }
  }

  for (
    const item of
      Object.values(record)
  ) {
    if (
      item &&
      typeof item ===
        'object'
    ) {
      const found =
        findStringByKeys(
          item,
          keys,
          depth + 1,
        );

      if (found) {
        return found;
      }
    }
  }

  return null;
}

function firstNonEmptyString(
  ...values: unknown[]
): string | null {
  for (const value of values) {
    if (
      typeof value ===
        'string' &&
      value.trim()
    ) {
      return value.trim();
    }
  }

  return null;
}

function getCustomerAvatarUrl(
  customer:
    WebCustomerProfile | null,
): string | null {
  if (!customer) {
    return null;
  }

  return findStringByKeys(
    customer,
    /avatar|photo|image|picture/i,
  );
}

const CHAT_MESSAGES_KEY =
  'dorian_web_chat_messages_v1';

const CHAT_VISITOR_KEY =
  'dorian_web_visitor_id_v1';

const CHAT_TERMINAL_KEY =
  'dorian_web_chat_terminal_v1';

const TERMINAL_CHAT_RESET_MS =
  5 * 60 * 1000;

const TERMINAL_STATUSES =
  new Set([
    'completed',
    'cancelled',
    'abandoned',
  ]);

function clearPersistedChat(): void {
  if (
    typeof window ===
    'undefined'
  ) {
    return;
  }

  try {
    window.localStorage.removeItem(
      CHAT_MESSAGES_KEY,
    );
    window.localStorage.removeItem(
      CHAT_VISITOR_KEY,
    );
    window.localStorage.removeItem(
      CHAT_TERMINAL_KEY,
    );
  } catch {
    // No-op.
  }
}

function getTerminalCleanupAt(): number | null {
  if (
    typeof window ===
    'undefined'
  ) {
    return null;
  }

  try {
    const raw =
      window.localStorage.getItem(
        CHAT_TERMINAL_KEY,
      );

    if (!raw) {
      return null;
    }

    const parsed =
      JSON.parse(raw) as {
        cleanupAt?: unknown;
      };

    const cleanupAt =
      Number(parsed.cleanupAt);

    return Number.isFinite(
      cleanupAt,
    )
      ? cleanupAt
      : null;
  } catch {
    return null;
  }
}

function saveTerminalCleanup(
  status: string,
): number {
  const cleanupAt =
    Date.now() +
    TERMINAL_CHAT_RESET_MS;

  if (
    typeof window !==
    'undefined'
  ) {
    try {
      window.localStorage.setItem(
        CHAT_TERMINAL_KEY,
        JSON.stringify({
          status,
          cleanupAt,
        }),
      );
    } catch {
      // No-op.
    }
  }

  return cleanupAt;
}

function createMessageId(): string {
  return `${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 10)}`;
}

function getInitialMessages():
ChatMessage[] {
  if (
    typeof window ===
    'undefined'
  ) {
    return [];
  }

  try {
    const cleanupAt =
      getTerminalCleanupAt();

    if (
      cleanupAt !== null &&
      cleanupAt <= Date.now()
    ) {
      clearPersistedChat();
      return [];
    }

    const raw =
      window.localStorage.getItem(
        CHAT_MESSAGES_KEY,
      );

    if (!raw) {
      return [];
    }

    const parsed =
      JSON.parse(
        raw,
      );

    if (
      !Array.isArray(
        parsed,
      )
    ) {
      return [];
    }

    return parsed
      .filter(
        item =>
          item &&
          (
            item.role ===
              'assistant' ||
            item.role ===
              'user'
          ) &&
          typeof item.content ===
            'string',
      )
      .slice(
        -40,
      );
  } catch {
    return [];
  }
}

function saveMessages(
  messages:
    ChatMessage[],
): void {
  if (
    typeof window ===
    'undefined'
  ) {
    return;
  }

  try {
    window.localStorage.setItem(
      CHAT_MESSAGES_KEY,
      JSON.stringify(
        messages.slice(
          -40,
        ),
      ),
    );
  } catch {
    // El chat sigue funcionando aunque storage esté bloqueado.
  }
}

export default function DorianWebChat() {
  const {
    business,
    theme,
  } =
    useBusiness();

  const [
    isOpen,
    setIsOpen,
  ] =
    useState(false);

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
    assistantAvatarUrl,
    setAssistantAvatarUrl,
  ] =
    useState<string | null>(
      null,
    );

  const [
    webCustomerProfile,
    setWebCustomerProfile,
  ] =
    useState<WebCustomerProfile | null>(
      null,
    );

  const [
    backendCustomer,
    setBackendCustomer,
  ] =
    useState<WebChatCustomerIdentity | null>(
      null,
    );

  const [
    messages,
    setMessages,
  ] =
    useState<ChatMessage[]>(
      getInitialMessages,
    );

  const [
    terminalCleanupAt,
    setTerminalCleanupAt,
  ] =
    useState<number | null>(
      getTerminalCleanupAt,
    );

  const scrollRef =
    useRef<ScrollView | null>(
      null,
    );

  const businessName =
    business?.identity
      .businessName ??
    'el negocio';

  const customerAvatarUrl =
    backendCustomer
      ?.avatarUrl ??
    getCustomerAvatarUrl(
      webCustomerProfile,
    );

  const loadVisualIdentity =
    async (): Promise<void> => {
      try {
        const {
          data,
          error,
        } =
          await supabase.rpc(
            'get_public_ai_web_chat_config',
          );

        if (error) {
          throw error;
        }

        const row =
          (
            Array.isArray(
              data,
            )
              ? data[0]
              : data
          ) as
            | Record<
                string,
                unknown
              >
            | null
            | undefined;

        const config:
          PublicAiWebChatConfig = {
            assistantAvatarUrl:
              firstNonEmptyString(
                row?.assistant_avatar_url,
                row?.assistantAvatarUrl,
              ),
          };

        setAssistantAvatarUrl(
          config.assistantAvatarUrl,
        );
      } catch (error) {
        console.warn(
          'No se pudo cargar el avatar de DORIAN:',
          error,
        );

        setAssistantAvatarUrl(
          null,
        );
      }

      const sessionToken =
        getSavedWebCustomerSessionToken();

      if (!sessionToken) {
        setWebCustomerProfile(
          null,
        );
        setBackendCustomer(
          null,
        );
        return;
      }

      try {
        const [
          customer,
          profileDetails,
        ] =
          await Promise.all([
            getMyWebCustomer(
              sessionToken,
            ),
            getMyWebCustomerProfileDetails(
              sessionToken,
            ),
          ]);

        setWebCustomerProfile(
          {
            ...customer,
            avatarUrl:
              profileDetails.avatarUrl,
            createdAt:
              profileDetails.createdAt,
          },
        );

        setBackendCustomer({
          name:
            customer.name,
          phone:
            customer.phone,
          avatarUrl:
            profileDetails.avatarUrl,
        });
      } catch (error) {
        console.warn(
          'No se pudo cargar el perfil del cliente para DORIAN:',
          error,
        );

        setWebCustomerProfile(
          null,
        );
        setBackendCustomer(
          null,
        );
      }
    };

  const greeting =
    useMemo(
      () =>
        `Hola 👋 Soy DORIAN. Puedo ayudarte con el menú, resolver dudas y preparar tu pedido en ${businessName}. ¿Qué se te antoja?`,
      [
        businessName,
      ],
    );

  const resetConversation =
    (
      options?: {
        reloadIdentity?: boolean;
      },
    ): void => {
      clearPersistedChat();
      setTerminalCleanupAt(
        null,
      );
      setMessages([
        {
          id:
            createMessageId(),
          role:
            'assistant',
          content:
            greeting,
          createdAt:
            new Date()
              .toISOString(),
        },
      ]);
      setInput('');

      if (
        options
          ?.reloadIdentity !==
        false
      ) {
        void loadVisualIdentity();
      } else {
        setWebCustomerProfile(
          null,
        );
        setBackendCustomer(
          null,
        );
      }
    };

  useEffect(
    () => {
      void loadVisualIdentity();
    },
    [
      isOpen,
    ],
  );


  useEffect(
    () => {
      if (
        terminalCleanupAt ===
        null
      ) {
        return;
      }

      const delay =
        terminalCleanupAt -
        Date.now();

      if (delay <= 0) {
        resetConversation();
        return;
      }

      const timeout =
        window.setTimeout(
          () => {
            resetConversation();
          },
          delay,
        );

      return () =>
        window.clearTimeout(
          timeout,
        );
    },
    [
      terminalCleanupAt,
      greeting,
    ],
  );

  useEffect(
    () => {
      if (
        typeof window ===
        'undefined'
      ) {
        return;
      }

      const handleSessionCleared =
        (): void => {
          resetConversation({
            reloadIdentity:
              false,
          });
        };

      window.addEventListener(
        'dorian:web-customer-session-cleared',
        handleSessionCleared,
      );

      return () => {
        window.removeEventListener(
          'dorian:web-customer-session-cleared',
          handleSessionCleared,
        );
      };
    },
    [
      greeting,
    ],
  );

  useEffect(
    () => {
      if (
        messages.length >
        0
      ) {
        return;
      }

      setMessages([
        {
          id:
            createMessageId(),
          role:
            'assistant',
          content:
            greeting,
          createdAt:
            new Date()
              .toISOString(),
        },
      ]);
    },
    [
      greeting,
      messages.length,
    ],
  );

  useEffect(
    () => {
      saveMessages(
        messages,
      );

      const timeout =
        setTimeout(
          () => {
            scrollRef.current
              ?.scrollToEnd({
                animated:
                  true,
              });
          },
          40,
        );

      return () =>
        clearTimeout(
          timeout,
        );
    },
    [
      messages,
      sending,
    ],
  );

  const handleSend =
    async (): Promise<void> => {
      const message =
        input.trim();

      if (
        !message ||
        sending
      ) {
        return;
      }

      const userMessage:
        ChatMessage = {
          id:
            createMessageId(),
          role:
            'user',
          content:
            message,
          createdAt:
            new Date()
              .toISOString(),
        };

      setInput(
        '',
      );

      setMessages(
        current => [
          ...current,
          userMessage,
        ],
      );

      setSending(
        true,
      );

      try {
        const visitorId =
          getOrCreateWebVisitorId();

        const customerSessionToken =
          getSavedWebCustomerSessionToken();

        let customerName =
          firstNonEmptyString(
            webCustomerProfile
              ?.name,
            backendCustomer
              ?.name,
          );

        let customerPhone =
          firstNonEmptyString(
            webCustomerProfile
              ?.phone,
            backendCustomer
              ?.phone,
          );

        /*
         * La identidad visual se carga al abrir el chat, pero si el usuario
         * envía demasiado rápido o el estado aún no se sincronizó, usamos
         * exactamente la misma fuente que "Mi cuenta" como respaldo.
         */
        if (
          customerSessionToken &&
          (
            !customerName ||
            !customerPhone
          )
        ) {
          try {
            const customer =
              await getMyWebCustomer(
                customerSessionToken,
              );

            customerName =
              customerName ??
              firstNonEmptyString(
                customer.name,
              );

            customerPhone =
              customerPhone ??
              firstNonEmptyString(
                customer.phone,
              );

            setWebCustomerProfile(
              current => ({
                ...customer,
                avatarUrl:
                  current
                    ?.avatarUrl ??
                  customer
                    .avatarUrl ??
                  null,
                createdAt:
                  current
                    ?.createdAt ??
                  customer
                    .createdAt ??
                  null,
              }),
            );

            setBackendCustomer(
              current => ({
                name:
                  customerName,
                phone:
                  customerPhone,
                avatarUrl:
                  current
                    ?.avatarUrl ??
                  null,
              }),
            );
          } catch (identityError) {
            console.warn(
              'No se pudo refrescar identidad del cliente antes de enviar a DORIAN:',
              identityError,
            );
          }
        }

        const {
          data,
          error,
        } =
          await supabase
            .functions
            .invoke(
              'ai-web-chat',
              {
                body: {
                  externalConversationId:
                    visitorId,
                  message,
                  customerSessionToken,
                  customerName:
                    customerName ??
                    undefined,
                  customerPhone:
                    customerPhone ??
                    undefined,
                },
              },
            );

        if (error) {
          throw error;
        }

        const response =
          (
            data ??
            {}
          ) as
            WebChatResponse;

        if (
          response.error
        ) {
          throw new Error(
            response.error,
          );
        }

        if (
          response.customer
        ) {
          setBackendCustomer(
            response.customer,
          );
        }

        if (
          response
            .conversationStatus &&
          TERMINAL_STATUSES
            .has(
              response
                .conversationStatus,
            )
        ) {
          setTerminalCleanupAt(
            saveTerminalCleanup(
              response
                .conversationStatus,
            ),
          );
        }

        const assistantMessage =
          response.message
            ?.trim() ||
          'No pude responder en este momento. Intenta nuevamente.';

        setMessages(
          current => [
            ...current,
            {
              id:
                createMessageId(),
              role:
                'assistant',
              content:
                assistantMessage,
              createdAt:
                new Date()
                  .toISOString(),
            },
          ],
        );
      } catch (error) {
        console.error(
          'Error en DORIAN Web:',
          error,
        );

        setMessages(
          current => [
            ...current,
            {
              id:
                createMessageId(),
              role:
                'assistant',
              content:
                'Tuve un problema para conectarme. Intenta de nuevo en unos momentos.',
              createdAt:
                new Date()
                  .toISOString(),
            },
          ],
        );
      } finally {
        setSending(
          false,
        );
      }
    };

  const handleNewConversation =
    (): void => {
      resetConversation();
    };

  return (
    <View
      pointerEvents="box-none"
      style={
        styles.host
      }
    >
      {isOpen ? (
        <View
          style={[
            styles.panel,
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
              styles.header,
              {
                backgroundColor:
                  theme.primary,
              },
            ]}
          >
            <View
              style={
                styles.headerIdentity
              }
            >
              <View
                style={
                  styles.avatar
                }
              >
                {assistantAvatarUrl ? (
                  <Image
                    source={{
                      uri:
                        assistantAvatarUrl,
                    }}
                    style={
                      styles.avatarImage
                    }
                    resizeMode="cover"
                  />
                ) : (
                  <Text
                    style={
                      styles.avatarFallbackText
                    }
                  >
                    D
                  </Text>
                )}
              </View>

              <View>
                <Text
                  style={[
                    styles.title,
                    {
                      color:
                        theme.onPrimary,
                    },
                  ]}
                >
                  DORIAN
                </Text>

                <Text
                  style={[
                    styles.subtitle,
                    {
                      color:
                        theme.onPrimary,
                    },
                  ]}
                >
                  Asistente virtual
                </Text>
              </View>
            </View>

            <View
              style={
                styles.headerActions
              }
            >
              <Pressable
                onPress={
                  handleNewConversation
                }
                style={
                  styles.newChatButton
                }
              >
                <Text
                  style={[
                    styles.newChatText,
                    {
                      color:
                        theme.onPrimary,
                    },
                  ]}
                >
                  Nuevo
                </Text>
              </Pressable>

              <Pressable
                onPress={() =>
                  setIsOpen(
                    false,
                  )
                }
                style={
                  styles.closeButton
                }
              >
              <Text
                style={[
                  styles.closeText,
                  {
                    color:
                      theme.onPrimary,
                  },
                ]}
              >
                ×
              </Text>
              </Pressable>
            </View>
          </View>

          <ScrollView
            ref={
              scrollRef
            }
            style={
              styles.messages
            }
            contentContainerStyle={
              styles.messagesContent
            }
            keyboardShouldPersistTaps="handled"
          >
            {messages.map(
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
                      styles.messageRow,
                      isUser
                        ? styles.messageRowUser
                        : styles.messageRowAssistant,
                    ]}
                  >
                    {!isUser ? (
                      <View
                        style={[
                          styles.messageAvatar,
                          {
                            backgroundColor:
                              theme.surfaceAlt,
                            borderColor:
                              theme.border,
                          },
                        ]}
                      >
                        {assistantAvatarUrl ? (
                          <Image
                            source={{
                              uri:
                                assistantAvatarUrl,
                            }}
                            style={
                              styles.messageAvatarImage
                            }
                            resizeMode="cover"
                          />
                        ) : (
                          <Text
                            style={[
                              styles.messageAvatarFallback,
                              {
                                color:
                                  theme.primary,
                              },
                            ]}
                          >
                            D
                          </Text>
                        )}
                      </View>
                    ) : null}

                    <View
                      style={[
                        styles.bubble,
                        isUser
                          ? {
                              backgroundColor:
                                theme.primary,
                            }
                          : {
                              backgroundColor:
                                theme.surfaceAlt,
                              borderColor:
                                theme.border,
                              borderWidth:
                                1,
                            },
                      ]}
                    >
                      <Text
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
                        {
                          message.content
                        }
                      </Text>
                    </View>

                    {isUser ? (
                      <View
                        style={[
                          styles.messageAvatar,
                          {
                            backgroundColor:
                              theme.surfaceAlt,
                            borderColor:
                              theme.border,
                          },
                        ]}
                      >
                        {customerAvatarUrl ? (
                          <Image
                            source={{
                              uri:
                                customerAvatarUrl,
                            }}
                            style={
                              styles.messageAvatarImage
                            }
                            resizeMode="cover"
                          />
                        ) : (
                          <Text
                            style={[
                              styles.customerAvatarFallback,
                              {
                                color:
                                  theme.textMuted,
                              },
                            ]}
                          >
                            👤
                          </Text>
                        )}
                      </View>
                    ) : null}
                  </View>
                );
              },
            )}

            {sending ? (
              <View
                style={[
                  styles.messageRow,
                  styles.messageRowAssistant,
                ]}
              >
                <View
                  style={[
                    styles.messageAvatar,
                    {
                      backgroundColor:
                        theme.surfaceAlt,
                      borderColor:
                        theme.border,
                    },
                  ]}
                >
                  {assistantAvatarUrl ? (
                    <Image
                      source={{
                        uri:
                          assistantAvatarUrl,
                      }}
                      style={
                        styles.messageAvatarImage
                      }
                      resizeMode="cover"
                    />
                  ) : (
                    <Text
                      style={[
                        styles.messageAvatarFallback,
                        {
                          color:
                            theme.primary,
                        },
                      ]}
                    >
                      D
                    </Text>
                  )}
                </View>

                <View
                  style={[
                    styles.typingBubble,
                    {
                      backgroundColor:
                        theme.surfaceAlt,
                      borderColor:
                        theme.border,
                    },
                  ]}
                >
                  <ActivityIndicator
                    size="small"
                    color={
                      theme.primary
                    }
                  />

                  <Text
                    style={[
                      styles.typingText,
                      {
                        color:
                          theme.textMuted,
                      },
                    ]}
                  >
                    DORIAN está escribiendo…
                  </Text>
                </View>
              </View>
            ) : null}
          </ScrollView>

          <View
            style={[
              styles.inputRow,
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
              placeholder="Escribe un mensaje…"
              placeholderTextColor={
                theme.textMuted
              }
              multiline
              maxLength={
                3000
              }
              editable={
                !sending
              }
              blurOnSubmit={
                false
              }
              onKeyPress={(
                event:
                  any,
              ) => {
                if (
                  typeof window ===
                    'undefined'
                ) {
                  return;
                }

                const key =
                  event
                    ?.nativeEvent
                    ?.key ??
                  event?.key;

                const shiftKey =
                  Boolean(
                    event
                      ?.nativeEvent
                      ?.shiftKey ??
                    event
                      ?.shiftKey,
                  );

                if (
                  key ===
                    'Enter' &&
                  !shiftKey
                ) {
                  event
                    ?.preventDefault
                    ?.();

                  event
                    ?.nativeEvent
                    ?.preventDefault
                    ?.();

                  void handleSend();
                }
              }}
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

            <Pressable
              disabled={
                sending ||
                !input.trim()
              }
              onPress={() =>
                void handleSend()
              }
              style={[
                styles.sendButton,
                {
                  backgroundColor:
                    theme.primary,
                  opacity:
                    sending ||
                    !input.trim()
                      ? 0.45
                      : 1,
                },
              ]}
            >
              <Text
                style={[
                  styles.sendText,
                  {
                    color:
                      theme.onPrimary,
                  },
                ]}
              >
                ➤
              </Text>
            </Pressable>
          </View>
        </View>
      ) : null}

      <Pressable
        onPress={() =>
          setIsOpen(
            current =>
              !current,
          )
        }
        style={[
          styles.launcher,
          {
            backgroundColor:
              theme.primary,
          },
        ]}
      >
        {isOpen ? (
          <Text
            style={
              styles.launcherIcon
            }
          >
            ×
          </Text>
        ) : (
          <View
            style={
              styles.launcherAvatar
            }
          >
            {assistantAvatarUrl ? (
              <Image
                source={{
                  uri:
                    assistantAvatarUrl,
                }}
                style={
                  styles.launcherAvatarImage
                }
                resizeMode="cover"
              />
            ) : (
              <Text
                style={
                  styles.launcherAvatarFallback
                }
              >
                D
              </Text>
            )}
          </View>
        )}

        {!isOpen ? (
          <Text
            style={[
              styles.launcherText,
              {
                color:
                  theme.onPrimary,
              },
            ]}
          >
            Pregúntale a DORIAN
          </Text>
        ) : null}
      </Pressable>
    </View>
  );
}
