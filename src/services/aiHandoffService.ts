import {
  supabase,
} from './supabase';

export interface AiHandoffInboxItem {
  conversationId: string;
  channel: string;
  customerName: string | null;
  customerPhone: string | null;
  handoffReason: string | null;
  handoffAt: string | null;
  lastMessageAt: string;
  assigneeId: string | null;
  takenAt: string | null;
  lastUserMessage: string | null;
  lastAssistantMessage: string | null;
  draftStatus: string | null;
  orderId: string | null;
  trackingCode: string | null;
  estimatedTotal: number | null;
  resolvedAt?: string | null;
  resolutionType?: string | null;
}

export interface AiHandoffMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string | null;
  toolName: string | null;
  createdAt: string;
  metadata: Record<
    string,
    unknown
  >;
}

export interface AiHandoffDraft {
  id: string;
  status: string;
  customerName: string | null;
  customerPhone: string | null;
  fulfillmentType:
    | 'pickup'
    | 'delivery'
    | null;
  delivery:
    | Record<
        string,
        unknown
      >
    | null;
  items: unknown[];
  estimatedTotal: number | null;
  orderId: string | null;
  trackingCode: string | null;
}

export interface AiHandoffConversationDetail {
  conversation: {
    id: string;
    channel: string;
    status: string;
    customerName: string | null;
    customerPhone: string | null;
    handoffReason: string | null;
    handoffAt: string | null;
    assigneeId: string | null;
    takenAt: string | null;
    resolvedAt?: string | null;
    resolutionType?: string | null;
    lastMessageAt: string;
    metadata: Record<
      string,
      unknown
    >;
  };
  messages:
    AiHandoffMessage[];
  draft:
    AiHandoffDraft | null;
}

interface AiHandoffInboxRpcRow {
  conversation_id: string;
  channel: string;
  customer_name: string | null;
  customer_phone: string | null;
  handoff_reason: string | null;
  handoff_at: string | null;
  last_message_at: string;
  assignee_id: string | null;
  taken_at: string | null;
  last_user_message: string | null;
  last_assistant_message: string | null;
  draft_status: string | null;
  order_id: string | null;
  tracking_code: string | null;
  estimated_total:
    | string
    | number
    | null;
}

export async function getAiHandoffInbox():
  Promise<AiHandoffInboxItem[]> {
  const {
    data,
    error,
  } =
    await supabase.rpc(
      'get_ai_handoff_inbox',
    );

  if (error) {
    throw new Error(
      `No se pudo cargar la bandeja de IA: ${error.message}`,
    );
  }

  return (
    (
      data ??
      []
    ) as AiHandoffInboxRpcRow[]
  ).map(
    row => ({
      conversationId:
        row.conversation_id,
      channel:
        row.channel,
      customerName:
        row.customer_name,
      customerPhone:
        row.customer_phone,
      handoffReason:
        row.handoff_reason,
      handoffAt:
        row.handoff_at,
      lastMessageAt:
        row.last_message_at,
      assigneeId:
        row.assignee_id,
      takenAt:
        row.taken_at,
      lastUserMessage:
        row.last_user_message,
      lastAssistantMessage:
        row.last_assistant_message,
      draftStatus:
        row.draft_status,
      orderId:
        row.order_id,
      trackingCode:
        row.tracking_code,
      estimatedTotal:
        row.estimated_total ===
          null
          ? null
          : Number(
              row.estimated_total,
            ),
    }),
  );
}

export async function getAiHandoffConversation(
  conversationId: string,
): Promise<
  AiHandoffConversationDetail | null
> {
  const {
    data,
    error,
  } =
    await supabase.rpc(
      'get_ai_handoff_conversation',
      {
        p_conversation_id:
          conversationId,
      },
    );

  if (error) {
    throw new Error(
      `No se pudo cargar la conversación: ${error.message}`,
    );
  }

  return (
    data ??
    null
  ) as AiHandoffConversationDetail | null;
}

export interface AiHandoffClaimResult {
  claimed: boolean;
  alreadyClaimed?: boolean;
  assigneeId?: string | null;
  assigneeName?: string | null;
  takenAt?: string | null;
  reason?: string;
}

export interface AiHandoffHumanMessageResult {
  sent: boolean;
  messageId?: string;
  humanUserId?: string;
  humanName?: string | null;
  createdAt?: string;
  reason?: string;
}

export async function claimAiHandoffConversation(
  conversationId: string,
): Promise<AiHandoffClaimResult> {
  const {
    data,
    error,
  } =
    await supabase.rpc(
      'claim_ai_handoff_conversation',
      {
        p_conversation_id:
          conversationId,
      },
    );

  if (error) {
    throw new Error(
      `No se pudo tomar la conversación: ${error.message}`,
    );
  }

  return (
    data ??
    {
      claimed:
        false,
      reason:
        'No se recibió respuesta del servidor.',
    }
  ) as AiHandoffClaimResult;
}

export async function sendAiHandoffHumanMessage(
  conversationId: string,
  content: string,
): Promise<AiHandoffHumanMessageResult> {
  const clean =
    content
      .trim()
      .slice(
        0,
        3000,
      );

  if (!clean) {
    return {
      sent:
        false,
      reason:
        'El mensaje no puede estar vacío.',
    };
  }

  const {
    data,
    error,
  } =
    await supabase.rpc(
      'send_ai_handoff_human_message',
      {
        p_conversation_id:
          conversationId,
        p_content:
          clean,
      },
    );

  if (error) {
    throw new Error(
      `No se pudo enviar la respuesta humana: ${error.message}`,
    );
  }

  return (
    data ??
    {
      sent:
        false,
      reason:
        'No se recibió respuesta del servidor.',
    }
  ) as AiHandoffHumanMessageResult;
}

export interface AiHandoffReturnToAiResult {
  resumed: boolean;
  status?: string;
  resolvedAt?: string;
  reason?: string;
}

export interface AiHandoffResolveResult {
  resolved: boolean;
  status?: string;
  resolvedAt?: string;
  hasOrder?: boolean;
  reason?: string;
}

export async function returnAiHandoffToDorian(
  conversationId: string,
  note?: string,
): Promise<AiHandoffReturnToAiResult> {
  const {
    data,
    error,
  } =
    await supabase.rpc(
      'return_ai_handoff_to_dorian',
      {
        p_conversation_id:
          conversationId,
        p_note:
          note?.trim() ||
          null,
      },
    );

  if (error) {
    throw new Error(
      `No se pudo devolver la conversación a DORIAN: ${error.message}`,
    );
  }

  return (
    data ??
    {
      resumed:
        false,
      reason:
        'No se recibió respuesta del servidor.',
    }
  ) as AiHandoffReturnToAiResult;
}

export async function resolveAiHandoffConversation(
  conversationId: string,
  note?: string,
): Promise<AiHandoffResolveResult> {
  const {
    data,
    error,
  } =
    await supabase.rpc(
      'resolve_ai_handoff_conversation',
      {
        p_conversation_id:
          conversationId,
        p_note:
          note?.trim() ||
          null,
      },
    );

  if (error) {
    throw new Error(
      `No se pudo resolver el caso: ${error.message}`,
    );
  }

  return (
    data ??
    {
      resolved:
        false,
      reason:
        'No se recibió respuesta del servidor.',
    }
  ) as AiHandoffResolveResult;
}

interface AiHandoffHistoryRpcRow
  extends AiHandoffInboxRpcRow {
  resolved_at: string | null;
  resolution_type: string | null;
}

export async function getAiHandoffHistory():
  Promise<AiHandoffInboxItem[]> {
  const {
    data,
    error,
  } =
    await supabase.rpc(
      'get_ai_handoff_history',
    );

  if (error) {
    throw new Error(
      `No se pudo cargar el historial de IA: ${error.message}`,
    );
  }

  return (
    (
      data ??
      []
    ) as AiHandoffHistoryRpcRow[]
  ).map(
    row => ({
      conversationId:
        row.conversation_id,
      channel:
        row.channel,
      customerName:
        row.customer_name,
      customerPhone:
        row.customer_phone,
      handoffReason:
        row.handoff_reason,
      handoffAt:
        row.handoff_at,
      lastMessageAt:
        row.last_message_at,
      assigneeId:
        row.assignee_id,
      takenAt:
        row.taken_at,
      lastUserMessage:
        row.last_user_message,
      lastAssistantMessage:
        row.last_assistant_message,
      draftStatus:
        row.draft_status,
      orderId:
        row.order_id,
      trackingCode:
        row.tracking_code,
      estimatedTotal:
        row.estimated_total ===
          null
          ? null
          : Number(
              row.estimated_total,
            ),
      resolvedAt:
        row.resolved_at,
      resolutionType:
        row.resolution_type,
    }),
  );
}

export async function getAiHandoffPendingCount():
  Promise<number> {
  const {
    data,
    error,
  } =
    await supabase.rpc(
      'get_ai_handoff_pending_count',
    );

  if (error) {
    throw new Error(
      `No se pudo consultar el contador de handoffs: ${error.message}`,
    );
  }

  const count =
    Number(
      data ??
      0,
    );

  return Number.isFinite(
    count,
  )
    ? count
    : 0;
}

export function subscribeAiHandoffRealtime(
  onChange: () => void,
): () => void {
  const channel =
    supabase
      .channel(
        `ai-handoff-realtime-${Date.now()}`,
      )
      .on(
        'postgres_changes',
        {
          event:
            '*',
          schema:
            'public',
          table:
            'ai_order_conversations',
        },
        () => {
          onChange();
        },
      )
      .subscribe();

  return () => {
    void supabase
      .removeChannel(
        channel,
      );
  };
}

