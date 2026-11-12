import React, {
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';

import * as ImagePicker from 'expo-image-picker';

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
  assistant_avatar_url: string | null;
}

interface DraftModifier {
  id?: string;
  name?: string;
  extraPrice?: number;
}

interface DraftComboComponent {
  slotId?: string;
  slotKey?: string;
  type?: string;
  label?: string;
  productId?: string;
  productName?: string;
  quantity?: number;
  notes?: string;
  modifiers?: DraftModifier[];
  cookingMethod?: 'oil' | 'air_fryer' | null;
}

interface DraftItem {
  productId?: string;
  productName?: string;
  productDescription?: string | null;
  quantity?: number;
  notes?: string;
  modifiers?: DraftModifier[];
  comboComponents?: DraftComboComponent[];
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
  pricing?: Record<string, unknown> | null;
}

interface SimulatorSessionSnapshot {
  conversationId: string | null;
  messages: ChatMessage[];
  draft: AiOrderDraft | null;
  input: string;
  lastToolHint: string | null;
}

const simulatorSessionStorageKey =
  'doriancore.ai-orders.admin-simulator.v1';

let simulatorSessionMemory:
  SimulatorSessionSnapshot = {
  conversationId:
    null,
  messages:
    [],
  draft:
    null,
  input:
    '',
  lastToolHint:
    null,
};

function readSimulatorSession():
  SimulatorSessionSnapshot {
  try {
    const storage =
      (
        globalThis as
          typeof globalThis & {
            sessionStorage?: {
              getItem:
                (
                  key: string,
                ) => string | null;
            };
          }
      ).sessionStorage;

    const raw =
      storage?.getItem(
        simulatorSessionStorageKey,
      );

    if (
      raw
    ) {
      const parsed =
        JSON.parse(
          raw,
        ) as
          Partial<SimulatorSessionSnapshot>;

      simulatorSessionMemory = {
        conversationId:
          typeof parsed.conversationId ===
            'string'
            ? parsed.conversationId
            : null,
        messages:
          Array.isArray(
            parsed.messages,
          )
            ? parsed.messages
                .filter(
                  message =>
                    message &&
                    (
                      message.role ===
                        'user' ||
                      message.role ===
                        'assistant'
                    ) &&
                    typeof message.content ===
                      'string',
                )
                .slice(
                  -100,
                ) as
                ChatMessage[]
            : [],
        draft:
          parsed.draft &&
          typeof parsed.draft ===
            'object'
            ? parsed.draft as
              AiOrderDraft
            : null,
        input:
          typeof parsed.input ===
            'string'
            ? parsed.input
            : '',
        lastToolHint:
          typeof parsed.lastToolHint ===
            'string'
            ? parsed.lastToolHint
            : null,
      };
    }
  } catch {
    // En móvil o almacenamiento restringido usamos memoria del módulo.
  }

  return {
    ...simulatorSessionMemory,
    messages:
      [
        ...simulatorSessionMemory.messages,
      ],
  };
}

function persistSimulatorSession(
  snapshot:
    SimulatorSessionSnapshot,
): void {
  simulatorSessionMemory = {
    ...snapshot,
    messages:
      snapshot.messages.slice(
        -100,
      ),
  };

  try {
    const storage =
      (
        globalThis as
          typeof globalThis & {
            sessionStorage?: {
              setItem:
                (
                  key: string,
                  value: string,
                ) => void;
            };
          }
      ).sessionStorage;

    storage?.setItem(
      simulatorSessionStorageKey,
      JSON.stringify(
        simulatorSessionMemory,
      ),
    );
  } catch {
    // La memoria del módulo conserva la sesión mientras la app siga abierta.
  }
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
    width,
  } = useWindowDimensions();

  const {
    theme,
  } = useBusiness();

  const isPhone =
    width < 700;

  const isTablet =
    width >= 700 &&
    width < 1100;

  const scrollRef =
    useRef<ScrollView | null>(
      null,
    );

  const initialSession =
    useRef(
      readSimulatorSession(),
    ).current;

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
    avatarSaving,
    setAvatarSaving,
  ] =
    useState(false);

  const [
    avatarError,
    setAvatarError,
  ] =
    useState<string | null>(
      null,
    );

  const [
    conversationId,
    setConversationId,
  ] =
    useState<string | null>(
      initialSession
        .conversationId,
    );

  const [
    messages,
    setMessages,
  ] =
    useState<ChatMessage[]>(
      initialSession
        .messages,
    );

  const [
    draft,
    setDraft,
  ] =
    useState<AiOrderDraft | null>(
      initialSession
        .draft,
    );

  const [
    input,
    setInput,
  ] =
    useState(
      initialSession
        .input,
    );

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
      initialSession
        .lastToolHint,
    );

  useEffect(
    () => {
      persistSimulatorSession({
        conversationId,
        messages,
        draft,
        input,
        lastToolHint,
      });
    },
    [
      conversationId,
      messages,
      draft,
      input,
      lastToolHint,
    ],
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
                  'enabled,order_creation_enabled,model,require_explicit_confirmation,assistant_avatar_url',
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

  const updateAssistantAvatarSetting =
    async (
      avatarUrl:
        string | null,
    ): Promise<void> => {
      const {
        error,
      } =
        await supabase
          .from(
            'ai_order_settings',
          )
          .update({
            assistant_avatar_url:
              avatarUrl,
            updated_at:
              new Date()
                .toISOString(),
          })
          .eq(
            'id',
            1,
          );

      if (error) {
        throw error;
      }

      setSettings(
        current =>
          current
            ? {
                ...current,
                assistant_avatar_url:
                  avatarUrl,
              }
            : current,
      );
    };

  const pickAssistantAvatar =
    async (): Promise<void> => {
      if (avatarSaving) {
        return;
      }

      try {
        setAvatarSaving(true);

        const result =
          await ImagePicker
            .launchImageLibraryAsync({
              mediaTypes:
                ImagePicker
                  .MediaTypeOptions
                  .Images,
              allowsEditing:
                true,
              aspect: [1, 1],
              quality:
                0.85,
            });

        if (
          result.canceled ||
          !result.assets?.[0]
        ) {
          return;
        }

        const asset =
          result.assets[0];

        setAvatarError(
          null,
        );

        const webFile =
          (
            asset as
              typeof asset & {
                file?:
                  Blob;
              }
          ).file;

        let uploadBody:
          Blob;

        if (
          webFile
        ) {
          uploadBody =
            webFile;
        } else {
          const response =
            await fetch(
              asset.uri,
            );

          if (
            !response.ok
          ) {
            throw new Error(
              `No se pudo leer la imagen seleccionada (${response.status}).`,
            );
          }

          uploadBody =
            await response.blob();
        }

        const mimeType =
          asset.mimeType ||
          uploadBody.type ||
          'image/jpeg';

        const extension =
          mimeType.includes(
            'png',
          )
            ? 'png'
            : mimeType.includes(
                  'webp',
                )
              ? 'webp'
              : 'jpg';

        const path =
          `assistant/avatar-${Date.now()}.${extension}`;

        const {
          error: uploadError,
        } =
          await supabase
            .storage
            .from(
              'ai-order-assistant',
            )
            .upload(
              path,
              uploadBody,
              {
                contentType:
                  mimeType,
                cacheControl:
                  '3600',
                upsert:
                  false,
              },
            );

        if (uploadError) {
          throw uploadError;
        }

        const {
          data:
            publicUrlData,
        } =
          supabase
            .storage
            .from(
              'ai-order-assistant',
            )
            .getPublicUrl(path);

        const publicUrl =
          `${publicUrlData.publicUrl}?v=${Date.now()}`;

        await updateAssistantAvatarSetting(
          publicUrl,
        );

        setAvatarError(
          null,
        );
      } catch (error) {
        console.error(
          'Error guardando avatar de Dorian AI:',
          error,
        );

        const message =
          error instanceof Error
            ? error.message
            : 'No se pudo guardar la foto del asistente.';

        setAvatarError(
          message,
        );

        Alert.alert(
          'Dorian AI',
          message,
        );
      } finally {
        setAvatarSaving(false);
      }
    };

  const removeAssistantAvatar =
    async (): Promise<void> => {
      if (
        avatarSaving ||
        !settings?.assistant_avatar_url
      ) {
        return;
      }

      try {
        setAvatarSaving(true);

        await updateAssistantAvatarSetting(
          null,
        );

        setAvatarError(
          null,
        );
      } catch (error) {
        console.error(
          'Error eliminando avatar de Dorian AI:',
          error,
        );

        Alert.alert(
          'Dorian AI',
          error instanceof Error
            ? error.message
            : 'No se pudo quitar la foto del asistente.',
        );
      } finally {
        setAvatarSaving(false);
      }
    };

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

      persistSimulatorSession({
        conversationId:
          null,
        messages:
          [],
        draft:
          null,
        input:
          '',
        lastToolHint:
          null,
      });
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
    <ScrollView
      style={[
        styles.rootScroll,
        {
          backgroundColor:
            theme.background,
        },
      ]}
      contentContainerStyle={[
        styles.container,
        isTablet &&
        styles.containerTablet,
        isPhone &&
        styles.containerPhone,
      ]}
      showsVerticalScrollIndicator
      keyboardShouldPersistTaps="handled"
      nestedScrollEnabled
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
          style={[
            styles.heroTop,
            isPhone &&
            styles.heroTopPhone,
          ]}
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
              isPhone &&
              styles.fullWidthButton,
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

        {settings ? (
          <View
            style={[
              styles.assistantAppearance,
              {
                backgroundColor:
                  theme.surfaceAlt,
                borderColor:
                  theme.border,
              },
            ]}
          >
            <View
              style={
                styles.assistantAppearanceIdentity
              }
            >
              {settings.assistant_avatar_url ? (
                <Image
                  source={{
                    uri:
                      settings.assistant_avatar_url,
                  }}
                  style={
                    styles.assistantAppearanceAvatar
                  }
                />
              ) : (
                <View
                  style={[
                    styles.assistantAppearanceAvatarFallback,
                    {
                      borderColor:
                        theme.primary,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.assistantAppearanceAvatarText,
                      {
                        color:
                          theme.primary,
                      },
                    ]}
                  >
                    AI
                  </Text>
                </View>
              )}

              <View
                style={{
                  flex:
                    1,
                }}
              >
                <Text
                  style={[
                    styles.assistantAppearanceTitle,
                    {
                      color:
                        theme.text,
                    },
                  ]}
                >
                  DORIAN AI
                </Text>

                <Text
                  style={[
                    styles.assistantAppearanceText,
                    {
                      color:
                        theme.textMuted,
                    },
                  ]}
                >
                  Identidad visual del asistente. El nombre DORIAN AI se mantiene como marca; puedes personalizar su foto de perfil.
                </Text>
              </View>
            </View>

            <View
              style={
                styles.assistantAppearanceActions
              }
            >
              <Pressable
                disabled={
                  avatarSaving
                }
                onPress={() =>
                  void pickAssistantAvatar()
                }
                style={[
                  styles.assistantAppearanceButton,
                  isPhone &&
                  styles.fullWidthButton,
                  {
                    borderColor:
                      theme.primary,
                  },
                ]}
              >
                {avatarSaving ? (
                  <ActivityIndicator
                    size="small"
                    color={
                      theme.primary
                    }
                  />
                ) : (
                  <Text
                    style={[
                      styles.assistantAppearanceButtonText,
                      {
                        color:
                          theme.primary,
                      },
                    ]}
                  >
                    {settings.assistant_avatar_url
                      ? 'Cambiar foto'
                      : 'Agregar foto'}
                  </Text>
                )}
              </Pressable>

              {settings.assistant_avatar_url ? (
                <Pressable
                  disabled={
                    avatarSaving
                  }
                  onPress={() =>
                    void removeAssistantAvatar()
                  }
                  style={[
                    styles.assistantAppearanceButton,
                    {
                      borderColor:
                        theme.border,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.assistantAppearanceButtonText,
                      {
                        color:
                          theme.textMuted,
                      },
                    ]}
                  >
                    Quitar
                  </Text>
                </Pressable>
              ) : null}
            </View>

            {avatarError ? (
              <Text
                selectable
                style={{
                  color:
                    '#FF6B6B',
                  fontSize:
                    11,
                  lineHeight:
                    16,
                }}
              >
                Error al guardar foto: {avatarError}
              </Text>
            ) : null}
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
        style={[
          styles.mainGrid,
          (isTablet || isPhone) &&
          styles.mainGridStacked,
        ]}
      >
        <View
          style={[
            styles.chatCard,
            (isTablet || isPhone) &&
            styles.cardStacked,
            isPhone &&
            styles.cardPhone,
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
                        styles.messageRow,
                        isUser
                          ? styles.userMessageRow
                          : styles.assistantMessageRow,
                      ]}
                    >
                      {!isUser ? (
                        settings?.assistant_avatar_url ? (
                          <Image
                            source={{
                              uri:
                                settings.assistant_avatar_url,
                            }}
                            style={
                              styles.messageAvatar
                            }
                          />
                        ) : (
                          <View
                            style={[
                              styles.messageAvatarFallback,
                              {
                                borderColor:
                                  theme.primary,
                              },
                            ]}
                          >
                            <Text
                              style={[
                                styles.messageAvatarText,
                                {
                                  color:
                                    theme.primary,
                                },
                              ]}
                            >
                              AI
                            </Text>
                          </View>
                        )
                      ) : null}

                      <View
                        style={[
                          styles.messageBubble,
                          isPhone &&
                          styles.messageBubblePhone,
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

                      {isUser ? (
                        <View
                          style={[
                            styles.messageAvatarFallback,
                            {
                              borderColor:
                                theme.border,
                            },
                          ]}
                        >
                          <Text
                            style={[
                              styles.messageAvatarText,
                              {
                                color:
                                  theme.textMuted,
                              },
                            ]}
                          >
                            👤
                          </Text>
                        </View>
                      ) : null}
                    </View>
                  );
                },
              )
            )}

            {sending ? (
              <View
                style={[
                  styles.messageBubble,
                  isPhone &&
                  styles.messageBubblePhone,
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
              isPhone &&
              styles.composerPhone,
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
                isPhone &&
                styles.sendButtonPhone,
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
            (isTablet || isPhone) &&
            styles.cardStacked,
            isPhone &&
            styles.cardPhone,
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

                        {Array.isArray(
                          item.comboComponents,
                        ) &&
                        item.comboComponents.length >
                          0 ? (
                          <View
                            style={
                              styles.comboComponentsBox
                            }
                          >
                            {item.comboComponents.map(
                              (
                                component,
                                componentIndex,
                              ) => (
                                <View
                                  key={`${component.slotId ?? componentIndex}-${component.productId ?? componentIndex}`}
                                  style={
                                    styles.comboComponentRow
                                  }
                                >
                                  <Text
                                    style={[
                                      styles.comboComponentLabel,
                                      {
                                        color:
                                          theme.textMuted,
                                      },
                                    ]}
                                  >
                                    {component.label ||
                                      component.type ||
                                      'Componente'}
                                    {': '}
                                    {component.productName ||
                                      'Producto'}
                                    {component.cookingMethod ===
                                    'air_fryer'
                                      ? ' · Freidora de aire'
                                      : component.cookingMethod ===
                                          'oil'
                                        ? ' · Aceite'
                                        : ''}
                                  </Text>

                                  {Array.isArray(
                                    component.modifiers,
                                  ) &&
                                  component.modifiers.length >
                                    0 ? (
                                    <Text
                                      style={[
                                        styles.comboComponentMeta,
                                        {
                                          color:
                                            theme.textMuted,
                                        },
                                      ]}
                                    >
                                      {component.modifiers
                                        .map(
                                          modifier =>
                                            modifier.name,
                                        )
                                        .filter(Boolean)
                                        .join(' · ')}
                                    </Text>
                                  ) : null}

                                  {component.notes ? (
                                    <Text
                                      style={[
                                        styles.comboComponentMeta,
                                        {
                                          color:
                                            theme.textMuted,
                                        },
                                      ]}
                                    >
                                      Nota: {component.notes}
                                    </Text>
                                  ) : null}
                                </View>
                              ),
                            )}
                          </View>
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
    </ScrollView>
  );
}
