import { createClient } from '@supabase/supabase-js';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY') ?? '';
const GOOGLE_MAPS_SERVER_API_KEY = Deno.env.get('GOOGLE_MAPS_SERVER_API_KEY') ?? '';
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error('Missing Supabase environment variables.');
}

const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

type RequestBody = {
  conversationId?: string;
  message?: string;
  channel?: 'internal';
};

type Settings = {
  enabled: boolean;
  order_creation_enabled: boolean;
  model: string;
  max_tool_iterations: number;
  max_history_messages: number;
  require_explicit_confirmation: boolean;
  system_instructions: string;
  conversation_idle_timeout_minutes: number;
  eta_preparation_minutes: number;
  eta_delivery_transit_minutes: number;
  eta_buffer_minutes: number;
};

type DraftComboComponentInput = {
  slot_id: string;
  product_id: string;
  notes?: string;
  modifier_ids?: string[];
  cooking_method?: 'oil' | 'air_fryer' | null;
};

type DraftItemInput = {
  product_id: string;
  quantity: number;
  notes?: string;
  modifier_ids?: string[];
  combo_components?: DraftComboComponentInput[];
};

type ToolCall = {
  type: 'function_call';
  name: string;
  arguments: string;
  call_id: string;
};

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

async function requireAdmin(request: Request): Promise<{ userId: string }> {
  const authorization = request.headers.get('Authorization') ?? '';
  if (!authorization.toLowerCase().startsWith('bearer ')) {
    throw new Error('UNAUTHORIZED');
  }

  const token = authorization.slice(7).trim();
  const authClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: userData, error: userError } = await authClient.auth.getUser(token);
  if (userError || !userData.user) throw new Error('UNAUTHORIZED');

  const { data: profile } = await admin
    .from('profiles')
    .select('role,is_active')
    .eq('id', userData.user.id)
    .maybeSingle();

  if (!profile || profile.is_active === false || profile.role !== 'admin') {
    throw new Error('FORBIDDEN');
  }

  return { userId: userData.user.id };
}

async function getSettings(): Promise<Settings> {
  const { data, error } = await admin
    .from('ai_order_settings')
    .select('enabled,order_creation_enabled,model,max_tool_iterations,max_history_messages,require_explicit_confirmation,system_instructions,conversation_idle_timeout_minutes,eta_preparation_minutes,eta_delivery_transit_minutes,eta_buffer_minutes')
    .eq('id', 1)
    .single();
  if (error) throw error;
  return data as Settings;
}

async function ensureConversation(id?: string): Promise<string> {
  if (id) {
    const { data, error } = await admin
      .from('ai_order_conversations')
      .select('id')
      .eq('id', id)
      .maybeSingle();

    if (error) throw error;
    if (!data) throw new Error('Conversación no encontrada.');

    /*
     * No evaluamos status aquí.
     * Toda la política de ciclo de vida se resuelve después
     * en un solo guard central.
     */
    return data.id;
  }

  const { data, error } = await admin
    .from('ai_order_conversations')
    .insert({
      channel: 'internal',
      metadata: {
        source: 'admin_simulator',
      },
    })
    .select('id')
    .single();

  if (error) throw error;
  return data.id;
}

async function loadHistory(conversationId: string, limit: number) {
  const { data, error } = await admin
    .from('ai_order_messages')
    .select('role,content,created_at')
    .eq('conversation_id', conversationId)
    .in('role', ['user', 'assistant'])
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []).reverse().map((row) => ({
    role: row.role,
    content: row.content ?? '',
  }));
}

type ConversationLifecycleState = {
  id: string;
  status:
    | 'active'
    | 'awaiting_human'
    | 'completed'
    | 'abandoned'
    | 'cancelled';
  human_handoff_requested:
    boolean;
  human_handoff_reason:
    | string
    | null;
  last_message_at:
    string;
  metadata:
    Record<string, unknown>;
};

async function getConversationLifecycleState(
  conversationId: string,
): Promise<ConversationLifecycleState> {
  const {
    data,
    error,
  } =
    await admin
      .from(
        'ai_order_conversations',
      )
      .select(
        'id,status,human_handoff_requested,human_handoff_reason,last_message_at,metadata',
      )
      .eq(
        'id',
        conversationId,
      )
      .single();

  if (error) {
    throw error;
  }

  return data as
    ConversationLifecycleState;
}

function getBlockedConversationMessage(
  state:
    ConversationLifecycleState,
): string | null {
  if (
    state.status ===
      'awaiting_human' ||
    state
      .human_handoff_requested
  ) {
    return 'Esta conversación está esperando atención humana. No voy a seguir modificando el pedido desde la IA para evitar cambios duplicados.';
  }

  if (
    state.status ===
    'cancelled'
  ) {
    return 'Este borrador fue cancelado y la conversación quedó cerrada. Para empezar otro pedido, inicia una nueva conversación.';
  }

  if (
    state.status ===
    'abandoned'
  ) {
    return 'Esta conversación ya fue cerrada por inactividad. Para evitar mezclar pedidos anteriores, inicia una nueva conversación.';
  }

  return null;
}

function hasConversationExpired(
  state: ConversationLifecycleState,
  timeoutMinutes: number,
): boolean {
  if (
    state.status !==
      'active' ||
    !Number.isFinite(
      timeoutMinutes,
    ) ||
    timeoutMinutes <=
      0
  ) {
    return false;
  }

  const lastMessageMs =
    new Date(
      state.last_message_at,
    ).getTime();

  if (
    !Number.isFinite(
      lastMessageMs,
    )
  ) {
    return false;
  }

  const idleMs =
    Date.now() -
    lastMessageMs;

  return (
    idleMs >=
    timeoutMinutes *
      60 *
      1000
  );
}

async function abandonConversationForInactivity(
  state: ConversationLifecycleState,
  timeoutMinutes: number,
): Promise<void> {
  const abandonedAt =
    new Date()
      .toISOString();

  const metadata = {
    ...(
      state.metadata ??
      {}
    ),
    abandonedAt,
    abandonedReason:
      'idle_timeout',
    idleTimeoutMinutes:
      timeoutMinutes,
  };

  const {
    error,
  } =
    await admin
      .from(
        'ai_order_conversations',
      )
      .update({
        status:
          'abandoned',
        metadata,
      })
      .eq(
        'id',
        state.id,
      )
      .eq(
        'status',
        'active',
      );

  if (error) {
    throw error;
  }
}

async function createRecoveredConversation(
  previousConversationId: string,
): Promise<string> {
  const {
    data,
    error,
  } =
    await admin
      .from(
        'ai_order_conversations',
      )
      .insert({
        channel:
          'internal',
        metadata: {
          source:
            'admin_simulator',
          recoveredFromConversationId:
            previousConversationId,
          recoveryReason:
            'idle_timeout',
          recoveredAt:
            new Date()
              .toISOString(),
        },
      })
      .select(
        'id',
      )
      .single();

  if (error) {
    throw error;
  }

  return data.id;
}

async function isFirstUserMessage(
  conversationId: string,
): Promise<boolean> {
  const {
    data,
    error,
  } =
    await admin
      .from(
        'ai_order_messages',
      )
      .select(
        'id',
      )
      .eq(
        'conversation_id',
        conversationId,
      )
      .eq(
        'role',
        'user',
      )
      .limit(
        1,
      );

  if (error) {
    throw error;
  }

  return (
    data ??
    []
  ).length ===
    0;
}

function buildInitialServiceContext(
  businessStatus: any,
): string {
  const fulfillment =
    businessStatus
      ?.fulfillment ??
    null;

  const pickupAvailable =
    Boolean(
      fulfillment
        ?.pickupAvailable,
    );

  const deliveryAvailable =
    Boolean(
      fulfillment
        ?.deliveryAvailable,
    );

  return [
    'VALIDACIÓN INICIAL DE SERVICIO YA REALIZADA POR EL BACKEND.',
    `pickupAvailable=${pickupAvailable}`,
    `deliveryAvailable=${deliveryAvailable}`,
    `pickupReason=${String(fulfillment?.pickupReason ?? '')}`,
    `deliveryReason=${String(fulfillment?.deliveryReason ?? '')}`,
    'No vuelvas a consultar disponibilidad en este primer turno salvo que sea estrictamente necesario.',
    'No ofrezcas modalidades marcadas como no disponibles.',
    pickupAvailable && deliveryAvailable
      ? 'Ambas modalidades están disponibles; procesa normalmente el pedido del cliente.'
      : pickupAvailable
        ? 'Solo está disponible RECOGER. No preguntes si quiere domicilio.'
        : deliveryAvailable
          ? 'Solo está disponible DOMICILIO. No preguntes si quiere recoger.'
          : 'No hay ninguna modalidad disponible; el backend debe haber detenido el flujo antes de llegar aquí.',
  ].join(
    '\n',
  );
}

function buildNoServiceMessage(
  businessStatus: any,
): string {
  const fulfillment =
    businessStatus
      ?.fulfillment ??
    null;

  const pickupReason =
    String(
      fulfillment
        ?.pickupReason ??
      '',
    ).trim();

  const deliveryReason =
    String(
      fulfillment
        ?.deliveryReason ??
      '',
    ).trim();

  const reasons =
    [
      pickupReason,
      deliveryReason,
    ].filter(
      (
        value,
        index,
        values,
      ) =>
        Boolean(value) &&
        values.indexOf(
          value,
        ) ===
          index,
    );

  if (
    reasons.length ===
    0
  ) {
    return 'Por el momento no tenemos servicio para recoger ni a domicilio. Cuando vuelva a estar disponible con gusto te ayudo con tu pedido.';
  }

  return `Por el momento no tenemos servicio para recoger ni a domicilio. ${reasons.join(' ')}`;
}

async function saveMessage(conversationId: string, role: 'user' | 'assistant' | 'tool', content: string, extra: Record<string, unknown> = {}) {
  const { error } = await admin.from('ai_order_messages').insert({
    conversation_id: conversationId,
    role,
    content,
    tool_name: extra.tool_name ?? null,
    tool_call_id: extra.tool_call_id ?? null,
    metadata: extra.metadata ?? {},
  });
  if (error) throw error;
  await admin.from('ai_order_conversations').update({ last_message_at: new Date().toISOString() }).eq('id', conversationId);
}

function getProductCategoryName(product: any): string {
  const category =
    Array.isArray(product?.categories)
      ? product.categories[0] ?? null
      : product?.categories ?? null;

  return String(category?.name ?? '');
}

function getMenuSearchTokens(query: string) {
  const normalized =
    normalizeText(
      String(query ?? '')
        .replace(/[,%()]/g, ' ')
        .replace(/\s+/g, ' ')
        .slice(0, 120),
    );

  const stopWords = new Set([
    'quiero', 'quisiera', 'dame', 'deseo', 'agrega', 'agregame',
    'una', 'uno', 'unos', 'unas', 'un', 'de', 'del', 'la', 'las',
    'el', 'los', 'con', 'sin', 'por', 'para', 'favor', 'orden',
    'pedido', 'presentacion', 'presentaciones', 'pieza', 'piezas',
    'gramo', 'gramos', 'gr', 'g', 'kg',
  ]);

  const tokens =
    normalized
      .split(/\s+/)
      .filter(Boolean);

  return {
    normalized,
    words:
      tokens.filter(
        token =>
          !/^\d+(?:[.,]\d+)?$/.test(token) &&
          !stopWords.has(token),
      ),
    numbers:
      tokens.filter(
        token =>
          /^\d+(?:[.,]\d+)?$/.test(token),
      ),
  };
}

async function getAvailableMenuProducts() {
  const { data, error } =
    await admin
      .from('products')
      .select('id,name,description,price,is_available,is_active,is_combo_option,categories(id,name)')
      .eq('is_active', true)
      .eq('is_available', true)
      .eq('is_combo_option', false)
      .order('name');

  if (error) throw error;

  return data ?? [];
}

async function searchMenu(query: string, limit = 20) {
  const safeLimit =
    Math.max(
      1,
      Math.min(
        50,
        Math.floor(
          Number(limit) || 20,
        ),
      ),
    );

  const products =
    await getAvailableMenuProducts();

  const search =
    getMenuSearchTokens(
      query,
    );

  if (!search.normalized) {
    return {
      query: '',
      totalMatches:
        products.length,
      truncated:
        products.length >
        safeLimit,
      products:
        products.slice(
          0,
          safeLimit,
        ),
    };
  }

  const ranked =
    products
      .map((product: any) => {
        const name =
          normalizeText(
            String(
              product.name ??
              '',
            ),
          );

        const description =
          normalizeText(
            String(
              product.description ??
              '',
            ),
          );

        const category =
          normalizeText(
            getProductCategoryName(
              product,
            ),
          );

        const haystack =
          `${name} ${description} ${category}`;

        let score = 0;

        if (
          haystack.includes(
            search.normalized,
          )
        ) {
          score += 100;
        }

        for (
          const word of
          search.words
        ) {
          if (
            name.includes(
              word,
            )
          ) {
            score += 30;
          } else if (
            category.includes(
              word,
            )
          ) {
            score += 22;
          } else if (
            description.includes(
              word,
            )
          ) {
            score += 10;
          }
        }

        for (
          const numericToken of
          search.numbers
        ) {
          if (
            name.includes(
              numericToken,
            )
          ) {
            score += 35;
          } else if (
            description.includes(
              numericToken,
            )
          ) {
            score += 12;
          }
        }

        if (
          search.words.length >
            0 &&
          search.words.every(
            word =>
              haystack.includes(
                word,
              ),
          )
        ) {
          score += 45;
        }

        return {
          product,
          score,
        };
      })
      .filter(
        entry =>
          entry.score > 0,
      )
      .sort(
        (left, right) =>
          right.score -
            left.score ||
          String(
            left.product.name ??
            '',
          ).localeCompare(
            String(
              right.product.name ??
              '',
            ),
            'es',
            {
              sensitivity:
                'base',
            },
          ),
      );

  return {
    query:
      search.normalized,
    totalMatches:
      ranked.length,
    truncated:
      ranked.length >
      safeLimit,
    products:
      ranked
        .slice(
          0,
          safeLimit,
        )
        .map(
          entry =>
            entry.product,
        ),
  };
}

async function listMenuCategory(
  categoryQuery: string,
) {
  const products =
    await getAvailableMenuProducts();

  const search =
    getMenuSearchTokens(
      categoryQuery,
    );

  const normalizedQuery =
    search.normalized;

  const matches =
    products.filter(
      (product: any) => {
        const category =
          normalizeText(
            getProductCategoryName(
              product,
            ),
          );

        const name =
          normalizeText(
            String(
              product.name ??
              '',
            ),
          );

        if (
          !normalizedQuery
        ) {
          return true;
        }

        if (
          category ===
            normalizedQuery ||
          category.includes(
            normalizedQuery,
          )
        ) {
          return true;
        }

        return search.words.length >
          0 &&
          search.words.every(
            word =>
              category.includes(
                word,
              ) ||
              name.includes(
                word,
              ),
          );
      },
    );

  return {
    query:
      normalizedQuery,
    count:
      matches.length,
    products:
      matches,
  };
}

async function getProductDetails(productId: string) {
  const { data: product, error } = await admin
    .from('products')
    .select('id,name,description,price,is_available,is_active,is_combo_option,categories(name)')
    .eq('id', productId)
    .maybeSingle();
  if (error) throw error;
  if (!product || !product.is_active || !product.is_available) return { available: false };

  const { data: groups, error: groupsError } = await admin
    .from('product_modifier_groups')
    .select('modifier_group_id,is_required,min_selections,max_selections,position,modifier_groups(id,code,name,is_active)')
    .eq('product_id', productId)
    .eq('is_active', true)
    .order('position');
  if (groupsError) throw groupsError;

  const groupIds = (groups ?? [])
    .map((row: any) => row.modifier_group_id)
    .filter(Boolean);

  let modifiers: any[] = [];

  if (groupIds.length > 0) {
    const [
      { data: options, error: optionsError },
      { data: groupModifiers, error: modifiersError },
    ] = await Promise.all([
      admin
        .from('product_modifier_options')
        .select('modifier_id,position')
        .eq('product_id', productId)
        .eq('is_available', true)
        .order('position'),
      admin
        .from('modifiers')
        .select('id,name,extra_price,is_available,group_id')
        .in('group_id', groupIds)
        .eq('is_available', true)
        .order('name'),
    ]);

    if (optionsError) throw optionsError;
    if (modifiersError) throw modifiersError;

    const optionPositionByModifierId =
      new Map<string, number>(
        (options ?? []).map(
          (row: any) => [
            String(
              row.modifier_id,
            ),
            Number(
              row.position ??
              0,
            ),
          ] as [
            string,
            number,
          ],
        ),
      );

    for (const groupId of groupIds) {
      const availableInGroup = (groupModifiers ?? [])
        .filter((modifier: any) => modifier.group_id === groupId);

      const configured = availableInGroup
        .filter((modifier: any) =>
          optionPositionByModifierId.has(modifier.id),
        )
        .sort(
          (left: any, right: any) =>
            (optionPositionByModifierId.get(left.id) ?? 0) -
            (optionPositionByModifierId.get(right.id) ?? 0),
        );

      const allowed =
        configured.length > 0
          ? configured
          : availableInGroup;

      modifiers.push(
        ...allowed.map((modifier: any, index: number) => ({
          modifier_id: modifier.id,
          position:
            optionPositionByModifierId.get(modifier.id) ??
            index,
          modifiers: modifier,
        })),
      );
    }
  }

  const { data: comboRecipe, error: comboError } = await admin
    .from('combo_recipes')
    .select('id,enabled')
    .eq('combo_product_id', productId)
    .eq('enabled', true)
    .maybeSingle();
  if (comboError) throw comboError;

  return {
    available: true,
    product,
    groups: groups ?? [],
    modifiers,
    combo: comboRecipe
      ? {
          requiresConfiguration: true,
          supportedInPhase1: true,
          configurationTool:
            'get_combo_configuration',
        }
      : null,
  };
}


function normalizeText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function getGoogleAddressComponent(
  components: any[],
  type: string,
): string | null {
  const component = (components ?? []).find(
    (item: any) =>
      Array.isArray(item?.types) &&
      item.types.includes(type),
  );

  return (
    component?.long_name ??
    component?.short_name ??
    null
  );
}

async function getDeliveryBaseProduct() {
  const { data, error } = await admin
    .from('products')
    .select('id,name,price,is_active,is_available,categories(name)')
    .eq('is_active', true)
    .eq('is_available', true);

  if (error) throw error;

  const product = (data ?? []).find((row: any) => {
    const category = Array.isArray(row.categories)
      ? row.categories[0]
      : row.categories;

    const categoryName = normalizeText(
      String(category?.name ?? ''),
    );

    const productName = normalizeText(
      String(row.name ?? ''),
    );

    return (
      categoryName === 'domicilio' ||
      productName === 'envio a domicilio' ||
      productName === 'envio' ||
      productName === 'domicilio'
    );
  });

  if (!product) {
    throw new Error(
      'No se encontró el producto activo de envío a domicilio.',
    );
  }

  return {
    id: product.id,
    name: product.name,
    baseFee: Number(product.price ?? 0),
  };
}

async function getDeliveryQuoteByCoordinates(
  latitude: number,
  longitude: number,
) {
  if (
    !Number.isFinite(latitude) ||
    latitude < -90 ||
    latitude > 90 ||
    !Number.isFinite(longitude) ||
    longitude < -180 ||
    longitude > 180
  ) {
    throw new Error(
      'Las coordenadas de entrega no son válidas.',
    );
  }

  const { data: serviceEnabled, error: serviceError } =
    await admin.rpc('get_delivery_service_status');

  if (serviceError) throw serviceError;

  if (!serviceEnabled) {
    return {
      available: false,
      reason: 'El servicio a domicilio está desactivado.',
      distanceKm: null,
      zoneId: null,
      zoneName: null,
      extraFee: 0,
      baseFee: 0,
      totalFee: 0,
    };
  }

  const { data, error } = await admin.rpc(
    'get_delivery_quote',
    {
      p_latitude: latitude,
      p_longitude: longitude,
    },
  );

  if (error) throw error;

  const row =
    Array.isArray(data)
      ? data[0] ?? null
      : data ?? null;

  if (!row) {
    throw new Error(
      'No se recibió información de la zona de entrega.',
    );
  }

  const deliveryProduct =
    await getDeliveryBaseProduct();

  const available =
    Boolean(row.available);

  const extraFee =
    available
      ? Number(row.extra_fee ?? 0)
      : 0;

  const baseFee =
    available
      ? deliveryProduct.baseFee
      : 0;

  return {
    available,
    reason:
      available
        ? null
        : 'Esta ubicación está fuera de nuestra zona de reparto.',
    distanceKm:
      row.distance_km !== null &&
      row.distance_km !== undefined
        ? Number(row.distance_km)
        : null,
    zoneId:
      row.zone_id ?? null,
    zoneName:
      row.zone_name ?? null,
    extraFee:
      Number(extraFee.toFixed(2)),
    baseFee:
      Number(baseFee.toFixed(2)),
    totalFee:
      Number(
        (
          baseFee +
          extraFee
        ).toFixed(2),
      ),
    deliveryProductId:
      deliveryProduct.id,
    deliveryProductName:
      deliveryProduct.name,
  };
}

async function quoteDeliveryAddress(
  address: string,
  postalCode?: string | null,
) {
  if (!GOOGLE_MAPS_SERVER_API_KEY) {
    throw new Error(
      'GOOGLE_MAPS_SERVER_API_KEY no está configurada en Supabase Secrets.',
    );
  }

  const cleanAddress =
    String(address ?? '')
      .trim()
      .replace(/\s+/g, ' ')
      .slice(0, 300);

  const cleanPostalCode =
    typeof postalCode === 'string'
      ? postalCode
        .trim()
        .replace(/\s+/g, ' ')
        .slice(0, 20)
      : '';

  if (!cleanAddress) {
    throw new Error(
      'Se necesita una dirección completa para cotizar el envío.',
    );
  }

  const query = [
    cleanAddress,
    cleanPostalCode,
    'México',
  ]
    .filter(Boolean)
    .join(', ');

  const url =
    new URL(
      'https://maps.googleapis.com/maps/api/geocode/json',
    );

  url.searchParams.set(
    'address',
    query,
  );

  url.searchParams.set(
    'key',
    GOOGLE_MAPS_SERVER_API_KEY,
  );

  url.searchParams.set(
    'region',
    'mx',
  );

  url.searchParams.set(
    'language',
    'es',
  );

  const response =
    await fetch(
      url.toString(),
    );

  const payload =
    await response.json();

  if (!response.ok) {
    throw new Error(
      'No se pudo consultar Google Maps para validar la dirección.',
    );
  }

  if (
    payload?.status !== 'OK' ||
    !Array.isArray(payload?.results) ||
    payload.results.length === 0
  ) {
    const suffix =
      payload?.error_message
        ? `: ${payload.error_message}`
        : '';

    throw new Error(
      `No se pudo localizar la dirección en Google Maps${suffix}`,
    );
  }

  const result =
    payload.results[0];

  const latitude =
    Number(
      result?.geometry?.location?.lat,
    );

  const longitude =
    Number(
      result?.geometry?.location?.lng,
    );

  if (
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude)
  ) {
    throw new Error(
      'Google Maps no devolvió coordenadas válidas para la dirección.',
    );
  }

  const components =
    Array.isArray(
      result.address_components,
    )
      ? result.address_components
      : [];

  const route =
    getGoogleAddressComponent(
      components,
      'route',
    );

  const streetNumber =
    getGoogleAddressComponent(
      components,
      'street_number',
    );

  const neighborhood =
    getGoogleAddressComponent(
      components,
      'sublocality_level_1',
    ) ??
    getGoogleAddressComponent(
      components,
      'neighborhood',
    ) ??
    getGoogleAddressComponent(
      components,
      'locality',
    );

  const resolvedPostalCode =
    (
      getGoogleAddressComponent(
        components,
        'postal_code',
      ) ??
      cleanPostalCode
    ) ||
    null;

  const quote =
    await getDeliveryQuoteByCoordinates(
      latitude,
      longitude,
    );

  return {
    geocoded: true,
    formattedAddress:
      result.formatted_address ??
      cleanAddress,
    address: {
      street:
        route ??
        cleanAddress,
      exteriorNumber:
        streetNumber,
      interiorNumber:
        null,
      neighborhood,
      postalCode:
        resolvedPostalCode,
      deliveryReferences:
        null,
      latitude,
      longitude,
    },
    quote,
  };
}

async function validateDeliveryForDraft(
  fulfillmentType: string | null,
  delivery: any,
) {
  if (fulfillmentType !== 'delivery') {
    return {
      delivery: null,
      deliveryFee: 0,
    };
  }

  const latitude =
    Number(
      delivery?.latitude,
    );

  const longitude =
    Number(
      delivery?.longitude,
    );

  if (
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude)
  ) {
    throw new Error(
      'El domicilio todavía no tiene una ubicación validada. Usa quote_delivery antes de actualizar el borrador.',
    );
  }

  const quote =
    await getDeliveryQuoteByCoordinates(
      latitude,
      longitude,
    );

  if (!quote.available) {
    throw new Error(
      quote.reason ??
      'La ubicación está fuera de la zona de reparto.',
    );
  }

  const normalizedDelivery = {
    street:
      typeof delivery?.street === 'string'
        ? delivery.street.trim().slice(0, 160)
        : null,
    exteriorNumber:
      typeof delivery?.exteriorNumber === 'string'
        ? delivery.exteriorNumber.trim().slice(0, 30)
        : null,
    interiorNumber:
      typeof delivery?.interiorNumber === 'string'
        ? delivery.interiorNumber.trim().slice(0, 30)
        : null,
    neighborhood:
      typeof delivery?.neighborhood === 'string'
        ? delivery.neighborhood.trim().slice(0, 160)
        : null,
    postalCode:
      typeof delivery?.postalCode === 'string'
        ? delivery.postalCode.trim().slice(0, 20)
        : null,
    deliveryReferences:
      typeof delivery?.deliveryReferences === 'string'
        ? delivery.deliveryReferences.trim().slice(0, 500)
        : null,
    latitude,
    longitude,
    quote: {
      ...quote,
      quotedAt:
        new Date().toISOString(),
    },
  };

  return {
    delivery:
      normalizedDelivery,
    deliveryFee:
      quote.totalFee,
  };
}


async function getBusinessStatus() {
  const {
    data: settings,
    error,
  } =
    await admin
      .from(
        'business_settings',
      )
      .select(
        'business_name,short_name,currency_code,web_orders_enabled,delivery_enabled',
      )
      .eq(
        'id',
        1,
      )
      .maybeSingle();

  if (error) throw error;

  const {
    data: fulfillment,
    error:
      fulfillmentError,
  } =
    await admin
      .rpc(
        'get_public_fulfillment_availability',
      );

  if (fulfillmentError) {
    throw fulfillmentError;
  }

  const rawFulfillment =
    Array.isArray(
      fulfillment,
    )
      ? fulfillment[0] ??
        null
      : fulfillment ??
        null;

  return {
    settings,
    fulfillment:
      rawFulfillment
        ? {
            pickupAvailable:
              Boolean(
                rawFulfillment.pickup_available,
              ),
            deliveryAvailable:
              Boolean(
                rawFulfillment.delivery_available,
              ),
            pickupReason:
              rawFulfillment.pickup_reason ??
              null,
            deliveryReason:
              rawFulfillment.delivery_reason ??
              null,
            pickupNextWindow:
              rawFulfillment.pickup_next_window ??
              null,
            deliveryNextWindow:
              rawFulfillment.delivery_next_window ??
              null,
          }
        : null,
  };
}


function getMexicoCityDateContext() {
  const now =
    new Date();

  const dateParts =
    new Intl.DateTimeFormat(
      'en-US',
      {
        timeZone:
          'America/Mexico_City',
        year:
          'numeric',
        month:
          '2-digit',
        day:
          '2-digit',
        weekday:
          'short',
      },
    ).formatToParts(
      now,
    );

  const byType =
    new Map(
      dateParts.map(
        part => [
          part.type,
          part.value,
        ],
      ),
    );

  const weekdayMap:
    Record<string, number> = {
      Sun: 0,
      Mon: 1,
      Tue: 2,
      Wed: 3,
      Thu: 4,
      Fri: 5,
      Sat: 6,
    };

  return {
    date:
      `${byType.get('year')}-${byType.get('month')}-${byType.get('day')}`,
    weekday:
      weekdayMap[
        byType.get('weekday') ??
        ''
      ] ?? 0,
  };
}

function isCouponProgramActiveToday(
  program: any,
): boolean {
  if (
    !program?.is_enabled
  ) {
    return false;
  }

  const context =
    getMexicoCityDateContext();

  const startsAt =
    typeof program.starts_at ===
      'string'
      ? program.starts_at.slice(
        0,
        10,
      )
      : null;

  const endsAt =
    typeof program.ends_at ===
      'string'
      ? program.ends_at.slice(
        0,
        10,
      )
      : null;

  if (
    startsAt &&
    context.date <
      startsAt
  ) {
    return false;
  }

  if (
    endsAt &&
    context.date >
      endsAt
  ) {
    return false;
  }

  const weekdays =
    Array.isArray(
      program.active_weekdays,
    )
      ? program.active_weekdays.map(
        (value: unknown) =>
          Number(
            value,
          ),
      )
      : [];

  return (
    weekdays.length ===
      0 ||
    weekdays.includes(
      context.weekday,
    )
  );
}

async function getActivePromotions() {
  const [
    modifierResult,
    quantityResult,
    pricingResult,
    couponResult,
  ] =
    await Promise.all([
      admin.rpc(
        'get_active_modifier_promotion',
      ),
      admin.rpc(
        'get_active_quantity_promotions',
      ),
      admin.rpc(
        'get_active_pricing_promotions',
      ),
      admin
        .from(
          'promotion_programs',
        )
        .select(`
          id,
          display_name,
          program_type,
          required_coupons,
          issue_chance_denominator,
          starts_at,
          ends_at,
          active_weekdays,
          is_enabled,
          rewards:promotion_rewards(
            id,
            display_name,
            is_active,
            position
          )
        `)
        .eq(
          'is_enabled',
          true,
        )
        .in(
          'program_type',
          [
            'collect_reward',
            'order_refund',
          ],
        )
        .order(
          'priority',
          {
            ascending:
              true,
          },
        ),
    ]);

  if (
    modifierResult.error
  ) {
    throw modifierResult.error;
  }

  if (
    quantityResult.error
  ) {
    throw quantityResult.error;
  }

  if (
    pricingResult.error
  ) {
    throw pricingResult.error;
  }

  if (
    couponResult.error
  ) {
    throw couponResult.error;
  }

  const modifierRow =
    Array.isArray(
      modifierResult.data,
    )
      ? modifierResult.data[0] ??
        null
      : modifierResult.data ??
        null;

  const modifierPromotion =
    modifierRow
      ? {
        id:
          modifierRow.id,
        displayName:
          modifierRow.display_name,
        modifierId:
          modifierRow.modifier_id,
        modifierName:
          modifierRow.modifier_name,
        discountAmount:
          Number(
            modifierRow.discount_amount ??
            0,
          ),
        startsAt:
          modifierRow.starts_at ??
          null,
        endsAt:
          modifierRow.ends_at ??
          null,
      }
      : null;

  const quantityPromotions =
    (
      quantityResult.data ??
      []
    ).map(
      (row: any) => ({
        id:
          row.id,
        displayName:
          row.display_name,
        targetProductId:
          row.target_product_id,
        productName:
          row.product_name,
        buyQuantity:
          Number(
            row.buy_quantity,
          ),
        payQuantity:
          Number(
            row.pay_quantity,
          ),
        priority:
          Number(
            row.priority,
          ),
      }),
    );

  const pricingPromotions =
    (
      pricingResult.data ??
      []
    ).map(
      (row: any) => ({
        id:
          row.id,
        displayName:
          row.display_name,
        programType:
          row.program_type,
        targetProductId:
          row.target_product_id ??
          null,
        productName:
          row.product_name ??
          null,
        fixedPrice:
          row.fixed_price ===
            null
            ? null
            : Number(
              row.fixed_price,
            ),
        minimumOrderAmount:
          row.minimum_order_amount ===
            null
            ? null
            : Number(
              row.minimum_order_amount,
            ),
        orderDiscountKind:
          row.order_discount_kind ??
          null,
        orderDiscountValue:
          row.order_discount_value ===
            null
            ? null
            : Number(
              row.order_discount_value,
            ),
        priority:
          Number(
            row.priority,
          ),
      }),
    );

  const couponPrograms =
    (
      couponResult.data ??
      []
    )
      .filter(
        isCouponProgramActiveToday,
      )
      .map(
        (program: any) => ({
          id:
            program.id,
          displayName:
            program.display_name,
          programType:
            program.program_type,
          requiredCoupons:
            program.required_coupons ??
            null,
          issueChanceDenominator:
            Number(
              program.issue_chance_denominator ??
              1,
            ),
          rewards:
            (
              program.rewards ??
              []
            )
              .filter(
                (reward: any) =>
                  reward.is_active !==
                  false,
              )
              .sort(
                (
                  left: any,
                  right: any,
                ) =>
                  Number(
                    left.position ??
                    0,
                  ) -
                  Number(
                    right.position ??
                    0,
                  ),
              )
              .map(
                (reward: any) => ({
                  id:
                    reward.id,
                  displayName:
                    reward.display_name,
                }),
              ),
        }),
      );

  return {
    modifierPromotion,
    quantityPromotions,
    pricingPromotions,
    couponPrograms,
  };
}

function roundMoney(
  value: number,
): number {
  return Number(
    (
      Math.round(
        (
          value +
          Number.EPSILON
        ) *
        100,
      ) /
      100
    ).toFixed(
      2,
    ),
  );
}

async function calculateDraftPromotionSummary(
  items: any[],
) {
  const promotions =
    await getActivePromotions();

  const productSubtotal =
    roundMoney(
      (
        items ??
        []
      ).reduce(
        (
          total,
          item,
        ) =>
          total +
          Number(
            item.basePrice ??
            item.unitPrice ??
            0,
          ) *
          Number(
            item.quantity ??
            0,
          ),
        0,
      ),
    );

  const modifierExtrasTotal =
    roundMoney(
      (
        items ??
        []
      ).reduce(
        (
          total,
          item,
        ) => {
          const extrasPerUnit =
            (
              item.modifiers ??
              []
            ).reduce(
              (
                subtotal: number,
                modifier: any,
              ) =>
                subtotal +
                Number(
                  modifier.extraPrice ??
                  0,
                ),
              0,
            );

          return (
            total +
            extrasPerUnit *
              Number(
                item.quantity ??
                0,
              )
          );
        },
        0,
      ),
    );

  let modifierDiscount =
    0;

  const modifierLines:
    any[] = [];

  if (
    promotions.modifierPromotion
  ) {
    const promotion =
      promotions.modifierPromotion;

    for (
      const item of
      items ??
      []
    ) {
      const directEligible =
        (
          item.modifiers ??
          []
        ).some(
          (modifier: any) =>
            modifier.id ===
            promotion.modifierId,
        )
          ? Number(item.quantity ?? 0)
          : 0;

      const comboEligiblePerUnit =
        (
          item.comboComponents ??
          []
        ).reduce(
          (
            total: number,
            component: any,
          ) =>
            total +
            (
              (
                component.modifiers ??
                []
              ).some(
                (modifier: any) =>
                  modifier.id ===
                  promotion.modifierId,
              )
                ? Number(component.quantity ?? 1)
                : 0
            ),
          0,
        );

      const eligibleUnits =
        directEligible +
        comboEligiblePerUnit *
          Number(item.quantity ?? 0);

      if (eligibleUnits <= 0) {
        continue;
      }

      const amount =
        roundMoney(
          promotion.discountAmount *
          eligibleUnits,
        );

      if (amount <= 0) {
        continue;
      }

      modifierDiscount +=
        amount;

      modifierLines.push({
        promotionId:
          promotion.id,
        promotionName:
          promotion.displayName,
        modifierName:
          promotion.modifierName,
        productName:
          item.productName,
        eligibleUnits,
        discountAmount:
          amount,
      });
    }
  }

  const quantityLines:
    any[] = [];

  let quantityDiscount =
    0;

  for (
    const promotion of
    promotions.quantityPromotions
  ) {
    const matchingItems =
      (
        items ??
        []
      ).filter(
        item =>
          item.productId ===
          promotion.targetProductId,
      );

    if (
      matchingItems.length ===
      0 ||
      promotion.buyQuantity <
        2 ||
      promotion.payQuantity <
        1 ||
      promotion.payQuantity >=
        promotion.buyQuantity
    ) {
      continue;
    }

    const quantity =
      matchingItems.reduce(
        (
          total,
          item,
        ) =>
          total +
          Number(
            item.quantity ??
            0,
          ),
        0,
      );

    const basePrice =
      Math.min(
        ...matchingItems.map(
          item =>
            Number(
              item.basePrice ??
              item.unitPrice ??
              0,
            ),
        ),
      );

    const groups =
      Math.floor(
        quantity /
        promotion.buyQuantity,
      );

    if (
      groups <= 0
    ) {
      continue;
    }

    const freeQuantity =
      groups *
      (
        promotion.buyQuantity -
        promotion.payQuantity
      );

    const amount =
      roundMoney(
        freeQuantity *
        basePrice,
      );

    if (
      amount <= 0
    ) {
      continue;
    }

    quantityDiscount +=
      amount;

    quantityLines.push({
      promotionId:
        promotion.id,
      promotionName:
        promotion.displayName,
      productId:
        promotion.targetProductId,
      productName:
        promotion.productName,
      qualifyingQuantity:
        groups *
        promotion.buyQuantity,
      freeQuantity,
      discountAmount:
        amount,
    });
  }

  const quantityProductIds =
    new Set(
      promotions.quantityPromotions.map(
        promotion =>
          promotion.targetProductId,
      ),
    );

  const specialPriceByProduct =
    new Map<string, any>();

  const minimumSpendPromotions:
    any[] = [];

  for (
    const promotion of
    promotions.pricingPromotions
  ) {
    if (
      promotion.programType ===
        'special_price' &&
      promotion.targetProductId &&
      promotion.fixedPrice !==
        null &&
      !quantityProductIds.has(
        promotion.targetProductId,
      )
    ) {
      const previous =
        specialPriceByProduct.get(
          promotion.targetProductId,
        );

      if (
        !previous ||
        promotion.priority <
          previous.priority
      ) {
        specialPriceByProduct.set(
          promotion.targetProductId,
          promotion,
        );
      }

      continue;
    }

    if (
      promotion.programType ===
      'minimum_spend_discount'
    ) {
      minimumSpendPromotions.push(
        promotion,
      );
    }
  }

  const pricingLines:
    any[] = [];

  let pricingDiscount =
    0;

  for (
    const [
      productId,
      promotion,
    ] of
    specialPriceByProduct.entries()
  ) {
    const matchingItems =
      (
        items ??
        []
      ).filter(
        item =>
          item.productId ===
          productId,
      );

    if (
      matchingItems.length ===
      0
    ) {
      continue;
    }

    const quantity =
      matchingItems.reduce(
        (
          total,
          item,
        ) =>
          total +
          Number(
            item.quantity ??
            0,
          ),
        0,
      );

    const basePrice =
      Math.min(
        ...matchingItems.map(
          item =>
            Number(
              item.basePrice ??
              item.unitPrice ??
              0,
            ),
        ),
      );

    const discountPerUnit =
      Math.max(
        0,
        basePrice -
        Number(
          promotion.fixedPrice ??
          basePrice,
        ),
      );

    const amount =
      roundMoney(
        discountPerUnit *
        quantity,
      );

    if (
      amount <= 0
    ) {
      continue;
    }

    pricingDiscount +=
      amount;

    pricingLines.push({
      promotionId:
        promotion.id,
      promotionName:
        promotion.displayName,
      productId,
      productName:
        promotion.productName,
      discountAmount:
        amount,
      type:
        'special_price',
    });
  }

  const selectedMinimum =
    minimumSpendPromotions
      .filter(
        promotion =>
          promotion.minimumOrderAmount !==
            null &&
          productSubtotal >=
            promotion.minimumOrderAmount,
      )
      .sort(
        (
          left,
          right,
        ) =>
          left.priority -
          right.priority,
      )[0] ??
    null;

  if (
    selectedMinimum &&
    selectedMinimum.orderDiscountKind &&
    selectedMinimum.orderDiscountValue !==
      null
  ) {
    const eligibleAmount =
      Math.max(
        0,
        productSubtotal -
          quantityDiscount -
          pricingDiscount,
      );

    const amount =
      roundMoney(
        selectedMinimum.orderDiscountKind ===
          'percent'
          ? eligibleAmount *
            (
              selectedMinimum.orderDiscountValue /
              100
            )
          : Math.min(
            eligibleAmount,
            selectedMinimum.orderDiscountValue,
          ),
      );

    if (
      amount > 0
    ) {
      pricingDiscount +=
        amount;

      pricingLines.push({
        promotionId:
          selectedMinimum.id,
        promotionName:
          selectedMinimum.displayName,
        discountAmount:
          amount,
        type:
          'minimum_spend_discount',
      });
    }
  }

  modifierDiscount =
    roundMoney(
      modifierDiscount,
    );

  quantityDiscount =
    roundMoney(
      quantityDiscount,
    );

  pricingDiscount =
    roundMoney(
      pricingDiscount,
    );

  const totalDiscount =
    roundMoney(
      modifierDiscount +
      quantityDiscount +
      pricingDiscount,
    );

  const productsBeforePromotions =
    roundMoney(
      productSubtotal +
      modifierExtrasTotal,
    );

  const productsAfterPromotions =
    roundMoney(
      Math.max(
        0,
        productsBeforePromotions -
        totalDiscount,
      ),
    );

  return {
    activePromotions:
      promotions,
    productSubtotal,
    modifierExtrasTotal,
    productsBeforePromotions,
    modifierDiscount,
    modifierLines,
    quantityDiscount,
    quantityLines,
    pricingDiscount,
    pricingLines,
    totalDiscount,
    productsAfterPromotions,
  };
}


async function getProductModifierConfiguration(
  productId: string,
) {
  const { data: groups, error: groupsError } =
    await admin
      .from('product_modifier_groups')
      .select(`
        modifier_group_id,
        is_required,
        min_selections,
        max_selections,
        allow_duplicates,
        position,
        modifier_groups(id,code,name,is_active)
      `)
      .eq('product_id', productId)
      .eq('is_active', true)
      .order('position');

  if (groupsError) throw groupsError;

  const groupIds =
    (groups ?? [])
      .map((row: any) => row.modifier_group_id)
      .filter(Boolean);

  if (groupIds.length === 0) {
    return [];
  }

  const [
    { data: configuredOptions, error: optionsError },
    { data: modifiers, error: modifiersError },
  ] =
    await Promise.all([
      admin
        .from('product_modifier_options')
        .select('modifier_id,position')
        .eq('product_id', productId)
        .eq('is_available', true)
        .order('position'),
      admin
        .from('modifiers')
        .select('id,name,extra_price,is_available,group_id')
        .in('group_id', groupIds)
        .eq('is_available', true)
        .order('name'),
    ]);

  if (optionsError) throw optionsError;
  if (modifiersError) throw modifiersError;

  const configuredModifierIds =
    new Set(
      (configuredOptions ?? []).map(
        (row: any) =>
          String(
            row.modifier_id,
          ),
      ),
    );

  return (groups ?? []).map((row: any) => {
    const relation =
      Array.isArray(row.modifier_groups)
        ? row.modifier_groups[0]
        : row.modifier_groups;

    const groupId =
      String(row.modifier_group_id);

    const availableInGroup =
      (modifiers ?? [])
        .filter(
          (modifier: any) =>
            String(
              modifier.group_id,
            ) ===
            groupId,
        );

    const configured =
      availableInGroup.filter(
        (modifier: any) =>
          configuredModifierIds.has(
            String(
              modifier.id,
            ),
          ),
      );

    const available =
      configured.length > 0
        ? configured
        : availableInGroup;

    return {
      groupId,
      code:
        relation?.code ?? null,
      name:
        relation?.name ?? 'Opciones',
      isRequired:
        Boolean(row.is_required),
      minSelections:
        Number(row.min_selections ?? 0),
      maxSelections:
        Number(row.max_selections ?? 1),
      allowDuplicates:
        Boolean(row.allow_duplicates),
      position:
        Number(row.position ?? 0),
      options:
        available.map((modifier: any) => ({
          id: modifier.id,
          name: modifier.name,
          extraPrice:
            Number(modifier.extra_price ?? 0),
        })),
    };
  });
}

async function getComboConfiguration(
  comboProductId: string,
) {
  const { data: recipe, error: recipeError } =
    await admin
      .from('combo_recipes')
      .select('id,combo_product_id,enabled')
      .eq('combo_product_id', comboProductId)
      .eq('enabled', true)
      .maybeSingle();

  if (recipeError) throw recipeError;

  if (!recipe) {
    return {
      isCombo: false,
      recipe: null,
      components: [],
    };
  }

  const { data: componentRows, error: componentError } =
    await admin
      .from('combo_recipe_components')
      .select(`
        id,
        combo_recipe_id,
        slot_key,
        component_type,
        label,
        selection_mode,
        fixed_product_id,
        product_category_id,
        allows_notes,
        position
      `)
      .eq('combo_recipe_id', recipe.id)
      .order('position');

  if (componentError) throw componentError;

  const componentIds =
    (componentRows ?? []).map(
      (row: any) => row.id,
    );

  const { data: rules, error: rulesError } =
    componentIds.length > 0
      ? await admin
          .from('combo_component_products')
          .select('combo_component_id,product_id,rule_type')
          .in('combo_component_id', componentIds)
      : { data: [], error: null };

  if (rulesError) throw rulesError;

  const categoryIds =
    [
      ...new Set(
        (componentRows ?? [])
          .map((row: any) => row.product_category_id)
          .filter(Boolean),
      ),
    ];

  const fixedIds =
    [
      ...new Set(
        (componentRows ?? [])
          .map((row: any) => row.fixed_product_id)
          .filter(Boolean),
      ),
    ];

  const ruleProductIds =
    [
      ...new Set(
        (rules ?? [])
          .map((row: any) => row.product_id)
          .filter(Boolean),
      ),
    ];

  const referencedIds =
    [
      ...new Set([
        ...fixedIds,
        ...ruleProductIds,
      ]),
    ];

  const [
    referencedResult,
    categoryResult,
  ] =
    await Promise.all([
      referencedIds.length > 0
        ? admin
            .from('products')
            .select(`
              id,
              category_id,
              name,
              description,
              price,
              is_available,
              is_active,
              is_combo_option,
              allows_oil_fryer,
              allows_air_fryer,
              air_fryer_extra_minutes
            `)
            .in('id', referencedIds)
        : Promise.resolve({
            data: [],
            error: null,
          } as any),
      categoryIds.length > 0
        ? admin
            .from('products')
            .select(`
              id,
              category_id,
              name,
              description,
              price,
              is_available,
              is_active,
              is_combo_option,
              allows_oil_fryer,
              allows_air_fryer,
              air_fryer_extra_minutes
            `)
            .in('category_id', categoryIds)
            .eq('is_active', true)
            .eq('is_available', true)
            .eq('is_combo_option', true)
            .order('name')
        : Promise.resolve({
            data: [],
            error: null,
          } as any),
    ]);

  if (referencedResult.error) {
    throw referencedResult.error;
  }

  if (categoryResult.error) {
    throw categoryResult.error;
  }

  const allProducts =
    [
      ...(referencedResult.data ?? []),
      ...(categoryResult.data ?? []),
    ];

  const productsById =
    new Map(
      allProducts.map((product: any) => [
        String(product.id),
        product,
      ]),
    );

  const modifierConfigByProductId =
    new Map<string, any[]>();

  async function enrichProduct(
    product: any,
  ) {
    if (!product) return null;

    const productId =
      String(product.id);

    if (
      !modifierConfigByProductId.has(productId)
    ) {
      modifierConfigByProductId.set(
        productId,
        await getProductModifierConfiguration(
          productId,
        ),
      );
    }

    return {
      id: product.id,
      name: product.name,
      description: product.description,
      price: Number(product.price ?? 0),
      isAvailable:
        product.is_available !== false &&
        product.is_active !== false,
      allowsOilFryer:
        product.allows_oil_fryer === true,
      allowsAirFryer:
        product.allows_air_fryer === true,
      airFryerExtraMinutes:
        Number(
          product.air_fryer_extra_minutes ?? 0,
        ),
      modifierGroups:
        modifierConfigByProductId.get(
          productId,
        ) ?? [],
    };
  }

  const components: any[] = [];

  for (const component of componentRows ?? []) {
    const componentRules =
      (rules ?? []).filter(
        (rule: any) =>
          String(rule.combo_component_id) ===
          String((component as any).id),
      );

    const allowedIds =
      new Set(
        componentRules
          .filter((rule: any) =>
            rule.rule_type === 'allowed',
          )
          .map((rule: any) =>
            String(rule.product_id),
          ),
      );

    const excludedIds =
      new Set(
        componentRules
          .filter((rule: any) =>
            rule.rule_type === 'excluded',
          )
          .map((rule: any) =>
            String(rule.product_id),
          ),
      );

    let rawOptions: any[] = [];

    if (
      (component as any).selection_mode ===
      'fixed'
    ) {
      const fixed =
        productsById.get(
          String(
            (component as any).fixed_product_id ?? '',
          ),
        );

      rawOptions =
        fixed
          ? [fixed]
          : [];
    } else {
      rawOptions =
        (categoryResult.data ?? [])
          .filter((product: any) =>
            String(product.category_id) ===
            String(
              (component as any).product_category_id ?? '',
            ),
          )
          .filter((product: any) => {
            const id =
              String(product.id);

            if (excludedIds.has(id)) {
              return false;
            }

            if (
              allowedIds.size > 0 &&
              !allowedIds.has(id)
            ) {
              return false;
            }

            return true;
          });
    }

    const options: any[] = [];

    for (const rawOption of rawOptions) {
      const enriched =
        await enrichProduct(rawOption);

      if (
        enriched &&
        enriched.isAvailable
      ) {
        options.push(enriched);
      }
    }

    components.push({
      id: (component as any).id,
      slotKey: (component as any).slot_key,
      type: (component as any).component_type,
      label: (component as any).label,
      selectionMode:
        (component as any).selection_mode,
      fixedProductId:
        (component as any).fixed_product_id,
      selectableCategoryId:
        (component as any).product_category_id,
      allowsNotes:
        Boolean((component as any).allows_notes),
      requiresMeat:
        false,
      requiresSauce:
        false,
      requiresDrinkFlavor:
        options.some(
          (option: any) =>
            (
              option.modifierGroups ??
              []
            ).some(
              (group: any) =>
                group.code ===
                'drink_flavor',
            ),
        ),
      position:
        Number((component as any).position ?? 0),
      options,
    });
  }

  return {
    isCombo: true,
    recipe: {
      id: recipe.id,
      comboProductId:
        recipe.combo_product_id,
    },
    components,
  };
}

async function validateComboComponents(
  comboProduct: any,
  rawComponents:
    DraftComboComponentInput[] |
    undefined,
) {
  const configuration =
    await getComboConfiguration(
      comboProduct.id,
    );

  if (!configuration.isCombo) {
    return {
      components: [],
    };
  }

  const requested =
    Array.isArray(rawComponents)
      ? rawComponents
      : [];

  const requestedBySlot =
    new Map(
      requested.map(
        component => [
          String(component.slot_id),
          component,
        ],
      ),
    );

  const normalized: any[] = [];

  for (const component of configuration.components) {
    const raw =
      requestedBySlot.get(
        String(component.id),
      );

    if (!raw) {
      throw new Error(
        `Falta configurar "${component.label}" del combo ${comboProduct.name}.`,
      );
    }

    const option =
      component.options.find(
        (candidate: any) =>
          String(candidate.id) ===
          String(raw.product_id),
      );

    if (!option) {
      throw new Error(
        `La opción elegida para "${component.label}" no es válida en ${comboProduct.name}.`,
      );
    }

    const modifierIds =
      Array.isArray(raw.modifier_ids)
        ? raw.modifier_ids.map(String)
        : [];

    const allAllowedModifierIds =
      new Set(
        (option.modifierGroups ?? [])
          .flatMap(
            (group: any) =>
              (group.options ?? []).map(
                (modifier: any) =>
                  String(modifier.id),
              ),
          ),
      );

    const unknownIds =
      modifierIds.filter(
        modifierId =>
          !allAllowedModifierIds.has(
            String(modifierId),
          ),
      );

    if (unknownIds.length > 0) {
      throw new Error(
        `Hay modificadores no válidos para ${option.name}.`,
      );
    }

    const normalizedModifiers: any[] = [];

    for (const group of option.modifierGroups ?? []) {
      const availableById =
        new Map(
          (group.options ?? []).map(
            (modifier: any) => [
              String(modifier.id),
              modifier,
            ],
          ),
        );

      const selectedIds =
        modifierIds.filter(
          modifierId =>
            availableById.has(
              String(modifierId),
            ),
        );

      if (
        !group.allowDuplicates &&
        new Set(selectedIds).size !==
          selectedIds.length
      ) {
        throw new Error(
          `El grupo "${group.name}" no permite repetir opciones.`,
        );
      }

      const minimum =
        group.isRequired
          ? Math.max(
              1,
              Number(group.minSelections ?? 0),
            )
          : Number(group.minSelections ?? 0);

      const maximum =
        Math.max(
          1,
          Number(group.maxSelections ?? 1),
        );

      if (
        selectedIds.length < minimum ||
        selectedIds.length > maximum
      ) {
        throw new Error(
          `"${group.name}" en ${option.name} requiere entre ${minimum} y ${maximum} selecciones.`,
        );
      }

      for (const modifierId of selectedIds) {
        const modifier =
          availableById.get(
            String(modifierId),
          );

        if (!modifier) continue;

        normalizedModifiers.push({
          id: modifier.id,
          name: modifier.name,
          groupId: group.groupId,
          groupName: group.name,
          extraPrice:
            Number(modifier.extraPrice ?? 0),
        });
      }
    }

    let cookingMethod:
      'oil' |
      'air_fryer' |
      null = null;

    if (
      option.allowsOilFryer &&
      option.allowsAirFryer
    ) {
      if (
        raw.cooking_method !== 'oil' &&
        raw.cooking_method !== 'air_fryer'
      ) {
        throw new Error(
          `Falta elegir método de cocción para ${option.name}.`,
        );
      }

      cookingMethod =
        raw.cooking_method;
    } else if (
      option.allowsOilFryer
    ) {
      cookingMethod = 'oil';
    } else if (
      option.allowsAirFryer
    ) {
      cookingMethod = 'air_fryer';
    }

    normalized.push({
      slotId: component.id,
      slotKey: component.slotKey,
      type: component.type,
      label: component.label,
      productId: option.id,
      productName: option.name,
      quantity: 1,
      notes:
        component.allowsNotes
          ? String(raw.notes ?? '')
              .trim()
              .slice(0, 250)
          : '',
      modifiers:
        normalizedModifiers,
      cookingMethod,
      airFryerExtraMinutes:
        cookingMethod === 'air_fryer'
          ? Number(
              option.airFryerExtraMinutes ?? 0,
            )
          : 0,
    });
  }

  if (
    requested.length !==
    configuration.components.length
  ) {
    throw new Error(
      `El combo ${comboProduct.name} tiene una configuración incompleta o contiene componentes adicionales.`,
    );
  }

  return {
    components: normalized,
  };
}

async function validateDraftItems(items: DraftItemInput[]) {
  if (!Array.isArray(items) || items.length === 0) return { items: [], estimatedTotal: 0 };
  if (items.length > 30) throw new Error('El borrador no puede tener más de 30 renglones.');

  const productIds = [...new Set(items.map((item) => item.product_id))];
  const { data: products, error } = await admin
    .from('products')
    .select('id,name,description,price,is_active,is_available,is_combo_option')
    .in('id', productIds);
  if (error) throw error;

  const byId = new Map((products ?? []).map((p: any) => [p.id, p]));

  const { data: comboRecipes, error: comboRecipesError } = await admin
    .from('combo_recipes')
    .select('combo_product_id')
    .in('combo_product_id', productIds)
    .eq('enabled', true);
  if (comboRecipesError) throw comboRecipesError;
  const comboProductIds = new Set((comboRecipes ?? []).map((row: any) => row.combo_product_id));

  const normalized: any[] = [];
  let estimatedTotal = 0;

  for (const raw of items) {
    const product: any = byId.get(raw.product_id);
    if (!product || !product.is_active || !product.is_available || product.is_combo_option) {
      throw new Error(`Producto no disponible: ${raw.product_id}`);
    }
    const isCombo =
      comboProductIds.has(product.id);

    const quantity = Math.max(1, Math.min(50, Math.floor(Number(raw.quantity) || 1)));
    const modifierIds = [...new Set(Array.isArray(raw.modifier_ids) ? raw.modifier_ids : [])];
    let modifierTotal = 0;
    let modifiers: any[] = [];

    if (modifierIds.length > 0) {
      const { data: groupLinks, error: groupLinksError } = await admin
        .from('product_modifier_groups')
        .select('modifier_group_id')
        .eq('product_id', product.id)
        .eq('is_active', true);

      if (groupLinksError) throw groupLinksError;

      const allowedGroupIds = (groupLinks ?? [])
        .map((row: any) => row.modifier_group_id)
        .filter(Boolean);

      if (allowedGroupIds.length === 0) {
        throw new Error(`${product.name} no tiene grupos de modificadores configurados.`);
      }

      const [
        { data: configuredOptions, error: configuredOptionsError },
        { data: requestedModifiers, error: requestedModifiersError },
      ] = await Promise.all([
        admin
          .from('product_modifier_options')
          .select('modifier_id,modifiers(group_id)')
          .eq('product_id', product.id)
          .eq('is_available', true),
        admin
          .from('modifiers')
          .select('id,name,extra_price,is_available,group_id')
          .in('id', modifierIds)
          .eq('is_available', true),
      ]);

      if (configuredOptionsError) throw configuredOptionsError;
      if (requestedModifiersError) throw requestedModifiersError;

      const optionIds = new Set(
        (configuredOptions ?? []).map((row: any) => row.modifier_id),
      );

      const requestedById = new Map(
        (requestedModifiers ?? []).map((modifier: any) => [
          modifier.id,
          modifier,
        ]),
      );

      const requestedGroupIds = [
        ...new Set(
          (requestedModifiers ?? [])
            .map((modifier: any) => modifier.group_id)
            .filter(Boolean),
        ),
      ];

      const invalidModifier = modifierIds.some((modifierId) => {
        const modifier: any = requestedById.get(modifierId);

        if (
          !modifier ||
          !allowedGroupIds.includes(modifier.group_id)
        ) {
          return true;
        }

        const groupHasConfiguredOptions =
          (configuredOptions ?? []).some((row: any) => {
            const relation =
              Array.isArray(row.modifiers)
                ? row.modifiers[0]
                : row.modifiers;

            return relation?.group_id === modifier.group_id;
          });

        if (!groupHasConfiguredOptions) {
          return false;
        }

        return !optionIds.has(modifierId);
      });

      if (invalidModifier) {
        throw new Error(`Uno o más modificadores no son válidos para ${product.name}.`);
      }

      modifiers = modifierIds
        .map((modifierId) => requestedById.get(modifierId))
        .filter(Boolean);

      modifierTotal = modifiers.reduce(
        (sum, modifier) =>
          sum + Number(modifier.extra_price ?? 0),
        0,
      );
    }

    const comboValidation =
      isCombo
        ? await validateComboComponents(
            product,
            raw.combo_components,
          )
        : {
            components: [],
          };

    const unitPrice =
      Number(product.price) +
      modifierTotal;

    const lineTotal =
      unitPrice * quantity;

    estimatedTotal +=
      lineTotal;

    normalized.push({
      productId: product.id,
      productName: product.name,
      productDescription: product.description,
      quantity,
      notes: String(raw.notes ?? '').trim().slice(0, 500),
      modifiers: modifiers.map((m) => ({
        id: m.id,
        name: m.name,
        extraPrice:
          Number(m.extra_price ?? 0),
      })),
      comboComponents:
        comboValidation.components,
      isCombo,
      basePrice:
        Number(Number(product.price).toFixed(2)),
      unitPrice:
        Number(unitPrice.toFixed(2)),
      lineTotal:
        Number(lineTotal.toFixed(2)),
    });
  }

  return { items: normalized, estimatedTotal: Number(estimatedTotal.toFixed(2)) };
}

type DraftReadiness = {
  readyToConfirm:
    boolean;
  missingFields:
    string[];
  blockingReasons:
    string[];
  fulfillmentAvailability: {
    pickupAvailable:
      boolean;
    deliveryAvailable:
      boolean;
  };
};

async function evaluateDraftReadiness(
  draft: any,
): Promise<DraftReadiness> {
  const missingFields:
    string[] =
    [];

  const blockingReasons:
    string[] =
    [];

  const items =
    Array.isArray(
      draft?.items,
    )
      ? draft.items
      : [];

  if (
    items.length ===
    0
  ) {
    missingFields.push(
      'items',
    );
  }

  const customerName =
    String(
      draft?.customer_name ??
      '',
    ).trim();

  if (
    !customerName
  ) {
    missingFields.push(
      'customer_name',
    );
  }

  const customerPhone =
    normalizePhone(
      draft?.customer_phone,
    );

  if (
    customerPhone.length !==
    10
  ) {
    missingFields.push(
      'customer_phone',
    );
  }

  const fulfillmentType =
    draft?.fulfillment_type;

  if (
    fulfillmentType !==
      'pickup' &&
    fulfillmentType !==
      'delivery'
  ) {
    missingFields.push(
      'fulfillment_type',
    );
  }

  const businessStatus =
    await getBusinessStatus();

  const pickupAvailable =
    Boolean(
      businessStatus
        ?.fulfillment
        ?.pickupAvailable,
    );

  const deliveryAvailable =
    Boolean(
      businessStatus
        ?.fulfillment
        ?.deliveryAvailable,
    );

  if (
    fulfillmentType ===
      'pickup' &&
    !pickupAvailable
  ) {
    blockingReasons.push(
      businessStatus
        ?.fulfillment
        ?.pickupReason ||
      'La opción para recoger no está disponible en este momento.',
    );
  }

  if (
    fulfillmentType ===
      'delivery'
  ) {
    if (
      !deliveryAvailable
    ) {
      blockingReasons.push(
        businessStatus
          ?.fulfillment
          ?.deliveryReason ||
        'El servicio a domicilio no está disponible en este momento.',
      );
    }

    const deliveryQuote =
      draft?.delivery
        ?.quote;

    const hasValidQuote =
      Boolean(
        deliveryQuote
          ?.available,
      ) &&
      Number.isFinite(
        Number(
          deliveryQuote
            ?.totalFee,
        ),
      ) &&
      Number.isFinite(
        Number(
          draft?.delivery
            ?.latitude,
        ),
      ) &&
      Number.isFinite(
        Number(
          draft?.delivery
            ?.longitude,
        ),
      );

    if (
      !hasValidQuote
    ) {
      missingFields.push(
        'delivery_quote',
      );
    }
  }

  /*
   * Si ninguna modalidad está disponible,
   * el pedido nunca puede estar listo para confirmar.
   */
  if (
    !pickupAvailable &&
    !deliveryAvailable
  ) {
    blockingReasons.push(
      'No hay servicio para recoger ni a domicilio en este momento.',
    );
  }

  return {
    readyToConfirm:
      missingFields.length ===
        0 &&
      blockingReasons.length ===
        0,
    missingFields:
      [
        ...new Set(
          missingFields,
        ),
      ],
    blockingReasons:
      [
        ...new Set(
          blockingReasons,
        ),
      ],
    fulfillmentAvailability: {
      pickupAvailable,
      deliveryAvailable,
    },
  };
}

async function saveCustomerContextToConversation(
  conversationId: string,
  customerContext: Record<string, unknown>,
): Promise<void> {
  const {
    data:
      conversation,
    error:
      readError,
  } =
    await admin
      .from(
        'ai_order_conversations',
      )
      .select(
        'metadata',
      )
      .eq(
        'id',
        conversationId,
      )
      .maybeSingle();

  if (readError) {
    throw readError;
  }

  const metadata = {
    ...(
      conversation
        ?.metadata ??
      {}
    ),
    customerContext: {
      ...customerContext,
      lookedUpAt:
        new Date()
          .toISOString(),
    },
  };

  const {
    error:
      updateError,
  } =
    await admin
      .from(
        'ai_order_conversations',
      )
      .update({
        metadata,
      })
      .eq(
        'id',
        conversationId,
      );

  if (updateError) {
    throw updateError;
  }
}

async function lookupCustomerContext(
  conversationId: string,
  rawPhone: unknown,
) {
  const phone =
    normalizePhone(
      rawPhone,
    );

  if (
    phone.length !==
    10
  ) {
    return {
      found:
        false,
      validPhone:
        false,
      phone,
      reason:
        'El teléfono debe tener exactamente 10 dígitos.',
    };
  }

  /*
   * Primero revisamos si ya consultamos este mismo teléfono
   * en esta conversación. Así evitamos queries repetidas.
   */
  const {
    data:
      conversation,
    error:
      conversationError,
  } =
    await admin
      .from(
        'ai_order_conversations',
      )
      .select(
        'metadata',
      )
      .eq(
        'id',
        conversationId,
      )
      .maybeSingle();

  if (conversationError) {
    throw conversationError;
  }

  const cachedContext =
    conversation
      ?.metadata
      ?.customerContext;

  if (
    cachedContext &&
    typeof cachedContext ===
      'object' &&
    String(
      cachedContext
        ?.phone ??
      '',
    ) ===
      phone
  ) {
    return {
      ...cachedContext,
      cached:
        true,
    };
  }

  /*
   * Fuente principal: cuenta web.
   *
   * No devolvemos PIN, hashes ni datos sensibles.
   */
  const {
    data:
      webCustomer,
    error:
      webCustomerError,
  } =
    await admin
      .from(
        'web_customers',
      )
      .select(
        'id,name,phone,loyalty_customer_id,is_active',
      )
      .eq(
        'phone',
        phone,
      )
      .maybeSingle();

  if (webCustomerError) {
    throw webCustomerError;
  }

  if (
    webCustomer &&
    webCustomer
      .is_active !==
      false
  ) {
    const customerContext = {
      found:
        true,
      validPhone:
        true,
      source:
        'web_customer',
      phone,
      customerId:
        webCustomer.id,
      suggestedName:
        String(
          webCustomer
            .name ??
          '',
        ).trim() ||
        null,
      loyaltyCustomerId:
        webCustomer
          .loyalty_customer_id ??
        null,
      hasLoyalty:
        Boolean(
          webCustomer
            .loyalty_customer_id,
        ),
    };

    await saveCustomerContextToConversation(
      conversationId,
      customerContext,
    );

    return customerContext;
  }

  /*
   * Fallback:
   * un cliente puede haber comprado antes sin tener cuenta web.
   * En ese caso usamos únicamente el nombre del pedido más
   * reciente como sugerencia histórica.
   */
  const {
    data:
      latestOrder,
    error:
      latestOrderError,
  } =
    await admin
      .from(
        'orders',
      )
      .select(
        'customer_name,customer_phone,customer_id,created_at',
      )
      .eq(
        'customer_phone',
        phone,
      )
      .not(
        'customer_name',
        'is',
        null,
      )
      .order(
        'created_at',
        {
          ascending:
            false,
        },
      )
      .limit(
        1,
      )
      .maybeSingle();

  if (latestOrderError) {
    throw latestOrderError;
  }

  if (
    latestOrder
  ) {
    const customerContext = {
      found:
        true,
      validPhone:
        true,
      source:
        'order_history',
      phone,
      customerId:
        latestOrder
          .customer_id ??
        null,
      suggestedName:
        String(
          latestOrder
            .customer_name ??
          '',
        ).trim() ||
        null,
      loyaltyCustomerId:
        null,
      hasLoyalty:
        false,
    };

    await saveCustomerContextToConversation(
      conversationId,
      customerContext,
    );

    return customerContext;
  }

  const customerContext = {
    found:
      false,
    validPhone:
      true,
    source:
      null,
    phone,
    customerId:
      null,
    suggestedName:
      null,
    loyaltyCustomerId:
      null,
    hasLoyalty:
      false,
  };

  await saveCustomerContextToConversation(
    conversationId,
    customerContext,
  );

  return customerContext;
}

function readFirstString(
  source: Record<string, unknown>,
  keys: string[],
): string | null {
  for (const key of keys) {
    const value =
      source?.[key];

    if (
      typeof value ===
        'string' &&
      value.trim()
    ) {
      return value
        .trim();
    }
  }

  return null;
}

function readFirstBoolean(
  source: Record<string, unknown>,
  keys: string[],
): boolean {
  for (const key of keys) {
    const value =
      source?.[key];

    if (
      typeof value ===
        'boolean'
    ) {
      return value;
    }
  }

  return false;
}

function readFirstNumber(
  source: Record<string, unknown>,
  keys: string[],
): number | null {
  for (const key of keys) {
    const value =
      Number(
        source?.[key],
      );

    if (
      Number.isFinite(
        value,
      )
    ) {
      return value;
    }
  }

  return null;
}

function normalizeSavedAddressRow(
  row: Record<string, unknown>,
) {
  return {
    id:
      readFirstString(
        row,
        [
          'id',
        ],
      ),
    label:
      readFirstString(
        row,
        [
          'label',
          'name',
          'nickname',
          'address_label',
        ],
      ),
    isDefault:
      readFirstBoolean(
        row,
        [
          'is_default',
          'isDefault',
          'default',
          'preferred',
          'is_preferred',
        ],
      ),
    street:
      readFirstString(
        row,
        [
          'street',
          'street_name',
          'address_line_1',
        ],
      ),
    exteriorNumber:
      readFirstString(
        row,
        [
          'exterior_number',
          'exteriorNumber',
          'street_number',
          'number',
        ],
      ),
    interiorNumber:
      readFirstString(
        row,
        [
          'interior_number',
          'interiorNumber',
          'unit',
          'apartment',
        ],
      ),
    neighborhood:
      readFirstString(
        row,
        [
          'neighborhood',
          'colony',
          'colonia',
        ],
      ),
    postalCode:
      readFirstString(
        row,
        [
          'postal_code',
          'postalCode',
          'zip_code',
          'zip',
        ],
      ),
    deliveryReferences:
      readFirstString(
        row,
        [
          'delivery_references',
          'deliveryReferences',
          'references',
          'notes',
        ],
      ),
    latitude:
      readFirstNumber(
        row,
        [
          'latitude',
          'lat',
        ],
      ),
    longitude:
      readFirstNumber(
        row,
        [
          'longitude',
          'lng',
          'lon',
        ],
      ),
    updatedAt:
      readFirstString(
        row,
        [
          'updated_at',
          'updatedAt',
          'created_at',
          'createdAt',
        ],
      ),
  };
}

async function saveAddressContextToConversation(
  conversationId: string,
  addressContext: Record<string, unknown>,
): Promise<void> {
  const {
    data:
      conversation,
    error:
      readError,
  } =
    await admin
      .from(
        'ai_order_conversations',
      )
      .select(
        'metadata',
      )
      .eq(
        'id',
        conversationId,
      )
      .maybeSingle();

  if (readError) {
    throw readError;
  }

  const metadata = {
    ...(
      conversation
        ?.metadata ??
      {}
    ),
    addressContext: {
      ...addressContext,
      lookedUpAt:
        new Date()
          .toISOString(),
    },
  };

  const {
    error:
      updateError,
  } =
    await admin
      .from(
        'ai_order_conversations',
      )
      .update({
        metadata,
      })
      .eq(
        'id',
        conversationId,
      );

  if (updateError) {
    throw updateError;
  }
}

async function lookupCustomerAddresses(
  conversationId: string,
  rawPhone: unknown,
) {
  const phone =
    normalizePhone(
      rawPhone,
    );

  if (
    phone.length !==
    10
  ) {
    return {
      found:
        false,
      validPhone:
        false,
      phone,
      reason:
        'El teléfono debe tener exactamente 10 dígitos.',
      addresses:
        [],
    };
  }

  /*
   * Primero identificamos al cliente usando la misma lógica
   * de Fase 3 / Bloque 1.
   */
  const customerContext =
    await lookupCustomerContext(
      conversationId,
      phone,
    );

  const customerId =
    typeof customerContext
      ?.customerId ===
      'string'
      ? customerContext
        .customerId
      : null;

  /*
   * Fuente principal:
   * domicilios explícitamente guardados por el cliente web.
   */
  if (customerId) {
    const {
      data:
        savedAddresses,
      error:
        savedAddressesError,
    } =
      await admin
        .from(
          'web_customer_saved_addresses',
        )
        .select(
          '*',
        )
        .eq(
          'customer_id',
          customerId,
        );

    if (
      !savedAddressesError &&
      Array.isArray(
        savedAddresses,
      ) &&
      savedAddresses.length >
        0
    ) {
      const addresses =
        savedAddresses
          .map(
            row =>
              normalizeSavedAddressRow(
                row as Record<
                  string,
                  unknown
                >,
              ),
          )
          .filter(
            address =>
              Boolean(
                address.street ||
                address.latitude !==
                  null,
              ),
          )
          .sort(
            (
              left,
              right,
            ) =>
              Number(
                right.isDefault,
              ) -
              Number(
                left.isDefault,
              ),
          );

      const context = {
        found:
          addresses.length >
          0,
        validPhone:
          true,
        phone,
        source:
          'saved_addresses',
        addresses,
        defaultAddress:
          addresses.find(
            address =>
              address.isDefault,
          ) ??
          addresses[0] ??
          null,
      };

      await saveAddressContextToConversation(
        conversationId,
        context,
      );

      return context;
    }

    /*
     * Si la tabla existe pero hay un error inesperado,
     * no inventamos direcciones.
     */
    if (
      savedAddressesError &&
      !String(
        savedAddressesError
          .message ??
        '',
      )
        .toLowerCase()
        .includes(
          'does not exist',
        )
    ) {
      throw savedAddressesError;
    }
  }

  /*
   * Fallback:
   * último domicilio realmente usado en una orden.
   * NO se presenta como "guardado", sino como "usado antes".
   */
  const {
    data:
      recentDelivery,
    error:
      recentDeliveryError,
  } =
    await admin
      .from(
        'order_delivery_details',
      )
      .select(
        'street,exterior_number,interior_number,neighborhood,postal_code,delivery_references,latitude,longitude,updated_at,created_at',
      )
      .eq(
        'phone',
        phone,
      )
      .order(
        'updated_at',
        {
          ascending:
            false,
        },
      )
      .limit(
        1,
      )
      .maybeSingle();

  if (
    recentDeliveryError
  ) {
    throw recentDeliveryError;
  }

  if (
    recentDelivery
  ) {
    const address = {
      id:
        null,
      label:
        null,
      isDefault:
        false,
      street:
        recentDelivery.street ??
        null,
      exteriorNumber:
        recentDelivery
          .exterior_number ??
        null,
      interiorNumber:
        recentDelivery
          .interior_number ??
        null,
      neighborhood:
        recentDelivery
          .neighborhood ??
        null,
      postalCode:
        recentDelivery
          .postal_code ??
        null,
      deliveryReferences:
        recentDelivery
          .delivery_references ??
        null,
      latitude:
        Number.isFinite(
          Number(
            recentDelivery
              .latitude,
          ),
        )
          ? Number(
            recentDelivery
              .latitude,
          )
          : null,
      longitude:
        Number.isFinite(
          Number(
            recentDelivery
              .longitude,
          ),
        )
          ? Number(
            recentDelivery
              .longitude,
          )
          : null,
      updatedAt:
        recentDelivery
          .updated_at ??
        recentDelivery
          .created_at ??
        null,
    };

    const context = {
      found:
        true,
      validPhone:
        true,
      phone,
      source:
        'recent_delivery_history',
      addresses: [
        address,
      ],
      defaultAddress:
        address,
    };

    await saveAddressContextToConversation(
      conversationId,
      context,
    );

    return context;
  }

  const context = {
    found:
      false,
    validPhone:
      true,
    phone,
    source:
      null,
    addresses:
      [],
    defaultAddress:
      null,
  };

  await saveAddressContextToConversation(
    conversationId,
    context,
  );

  return context;
}


function getVisibleTrackingCode(
  orderId: unknown,
): string | null {
  const clean =
    String(
      orderId ??
      '',
    )
      .replace(
        /-/g,
        '',
      )
      .trim();

  return clean
    ? clean
        .slice(
          0,
          8,
        )
        .toUpperCase()
    : null;
}

function normalizeOrderModifierRelation(
  relation: any,
) {
  const modifier =
    relation
      ?.modifiers ??
    null;

  if (!modifier) {
    return null;
  }

  return {
    id:
      modifier.id ??
      null,
    name:
      modifier.name ??
      null,
    extraPrice:
      Number(
        relation
          ?.extra_price_applied ??
        modifier
          ?.extra_price ??
        0,
      ),
    group:
      modifier.group
        ? {
            id:
              modifier
                .group
                .id ??
              null,
            code:
              modifier
                .group
                .code ??
              null,
            name:
              modifier
                .group
                .name ??
              null,
          }
        : null,
  };
}

function normalizeRecentOrderItem(
  item: any,
) {
  const modifiers =
    Array.isArray(
      item
        ?.order_item_modifiers,
    )
      ? item
          .order_item_modifiers
          .map(
            normalizeOrderModifierRelation,
          )
          .filter(
            Boolean,
          )
      : [];

  const components =
    Array.isArray(
      item
        ?.order_item_components,
    )
      ? item
          .order_item_components
          .map(
            (
              component:
                any,
            ) => ({
              productId:
                component
                  ?.product_id ??
                null,
              productName:
                component
                  ?.products
                  ?.name ??
                null,
              type:
                component
                  ?.component_type ??
                null,
              label:
                component
                  ?.label ??
                null,
              quantity:
                Number(
                  component
                    ?.quantity ??
                  1,
                ),
              notes:
                component
                  ?.notes ??
                null,
              position:
                component
                  ?.position ??
                null,
              modifiers:
                Array.isArray(
                  component
                    ?.order_item_component_modifiers,
                )
                  ? component
                      .order_item_component_modifiers
                      .map(
                        normalizeOrderModifierRelation,
                      )
                      .filter(
                        Boolean,
                      )
                  : [],
            }),
          )
      : [];

  return {
    productId:
      item
        ?.product_id ??
      null,
    productName:
      item
        ?.products
        ?.name ??
      null,
    quantity:
      Number(
        item
          ?.quantity ??
        1,
      ),
    priceAtPurchase:
      Number(
        item
          ?.price_at_purchase ??
        0,
      ),
    notes:
      item
        ?.notes ??
      null,
    modifiers,
    components,
  };
}

async function saveRecentOrdersContextToConversation(
  conversationId: string,
  recentOrdersContext: Record<string, unknown>,
): Promise<void> {
  const {
    data:
      conversation,
    error:
      readError,
  } =
    await admin
      .from(
        'ai_order_conversations',
      )
      .select(
        'metadata',
      )
      .eq(
        'id',
        conversationId,
      )
      .maybeSingle();

  if (readError) {
    throw readError;
  }

  const metadata = {
    ...(
      conversation
        ?.metadata ??
      {}
    ),
    recentOrdersContext: {
      ...recentOrdersContext,
      lookedUpAt:
        new Date()
          .toISOString(),
    },
  };

  const {
    error:
      updateError,
  } =
    await admin
      .from(
        'ai_order_conversations',
      )
      .update({
        metadata,
      })
      .eq(
        'id',
        conversationId,
      );

  if (updateError) {
    throw updateError;
  }
}

async function lookupRecentOrders(
  conversationId: string,
  rawPhone: unknown,
  rawLimit: unknown,
) {
  const phone =
    normalizePhone(
      rawPhone,
    );

  if (
    phone.length !==
    10
  ) {
    return {
      found:
        false,
      validPhone:
        false,
      phone,
      orders:
        [],
      reason:
        'El teléfono debe tener exactamente 10 dígitos.',
    };
  }

  const limit =
    Math.min(
      5,
      Math.max(
        1,
        Number(
          rawLimit ??
          3,
        ) ||
        3,
      ),
    );

  /*
   * Intentamos primero por customer_id si la identidad ya existe.
   * También conservamos fallback por teléfono para pedidos previos
   * o clientes invitados.
   */
  const customerContext =
    await lookupCustomerContext(
      conversationId,
      phone,
    );

  const customerId =
    typeof customerContext
      ?.customerId ===
      'string'
      ? customerContext
          .customerId
      : null;

  const nestedSelect = `
    id,
    total,
    status,
    fulfillment_type,
    customer_name,
    customer_phone,
    customer_id,
    created_at,
    order_items(
      id,
      product_id,
      quantity,
      price_at_purchase,
      notes,
      products(
        id,
        name,
        is_available,
        is_active
      ),
      order_item_modifiers(
        extra_price_applied,
        modifiers(
          id,
          name,
          extra_price,
          is_available,
          group_id,
          group:modifier_groups(
            id,
            code,
            name
          )
        )
      ),
      order_item_components(
        id,
        product_id,
        component_type,
        label,
        quantity,
        notes,
        position,
        products(
          id,
          name,
          is_available,
          is_active
        ),
        order_item_component_modifiers(
          modifiers(
            id,
            name,
            extra_price,
            is_available,
            group_id,
            group:modifier_groups(
              id,
              code,
              name
            )
          )
        )
      )
    )
  `;

  let query =
    admin
      .from(
        'orders',
      )
      .select(
        nestedSelect,
      )
      .order(
        'created_at',
        {
          ascending:
            false,
        },
      )
      .limit(
        limit,
      );

  if (customerId) {
    query =
      query.or(
        `customer_id.eq.${customerId},customer_phone.eq.${phone}`,
      );
  } else {
    query =
      query.eq(
        'customer_phone',
        phone,
      );
  }

  const {
    data:
      orders,
    error:
      ordersError,
  } =
    await query;

  if (ordersError) {
    throw ordersError;
  }

  const normalizedOrders =
    (
      Array.isArray(
        orders,
      )
        ? orders
        : []
    )
      .map(
        (
          order:
            any,
          index:
            number,
        ) => ({
          position:
            index +
            1,
          orderId:
            order.id,
          trackingCode:
            getVisibleTrackingCode(
              order.id,
            ),
          createdAt:
            order
              .created_at ??
            null,
          total:
            Number(
              order
                .total ??
              0,
            ),
          status:
            order
              .status ??
            null,
          fulfillmentType:
            order
              .fulfillment_type ??
            null,
          customerName:
            order
              .customer_name ??
            null,
          items:
            Array.isArray(
              order
                .order_items,
            )
              ? order
                  .order_items
                  .map(
                    normalizeRecentOrderItem,
                  )
              : [],
        }),
      )
      .filter(
        order =>
          order
            .items
            .length >
          0,
      );

  const context = {
    found:
      normalizedOrders.length >
      0,
    validPhone:
      true,
    phone,
    orders:
      normalizedOrders,
    latestOrder:
      normalizedOrders[0] ??
      null,
  };

  await saveRecentOrdersContextToConversation(
    conversationId,
    context,
  );

  return context;
}

function getOrderStatusLabelForAI(
  status: unknown,
  fulfillmentType: unknown,
): string {
  const cleanStatus =
    String(
      status ??
      '',
    );

  switch (
    cleanStatus
  ) {
    case 'pending':
      return 'Pedido recibido';

    case 'preparing':
      return 'En preparación';

    case 'ready':
      return fulfillmentType ===
        'delivery'
        ? 'Listo para reparto'
        : 'Listo para recoger';

    case 'on_the_way':
      return 'En camino';

    case 'delivered':
      return 'Entregado';

    case 'cancelled':
      return 'Cancelado';

    default:
      return cleanStatus ||
        'Estado desconocido';
  }
}

async function getCurrentOrderStatus(
  conversationId: string,
) {
  const {
    data:
      draft,
    error:
      draftError,
  } =
    await admin
      .from(
        'ai_order_drafts',
      )
      .select(
        'id,order_id,status',
      )
      .eq(
        'conversation_id',
        conversationId,
      )
      .maybeSingle();

  if (draftError) {
    throw draftError;
  }

  if (
    !draft?.order_id
  ) {
    return {
      found:
        false,
      reason:
        'Esta conversación todavía no tiene una orden real asociada.',
    };
  }

  const {
    data:
      order,
    error:
      orderError,
  } =
    await admin
      .from(
        'orders',
      )
      .select(
        'id,total,status,fulfillment_type,customer_name,customer_phone,driver_id,created_at,status_updated_at,updated_at',
      )
      .eq(
        'id',
        draft.order_id,
      )
      .maybeSingle();

  if (orderError) {
    throw orderError;
  }

  if (!order) {
    return {
      found:
        false,
      reason:
        'No encontré la orden asociada a esta conversación.',
    };
  }

  let driverName:
    | string
    | null =
    null;

  if (
    order.driver_id
  ) {
    const {
      data:
        driver,
      error:
        driverError,
    } =
      await admin
        .from(
          'profiles',
        )
        .select(
          'first_name,last_name',
        )
        .eq(
          'id',
          order.driver_id,
        )
        .maybeSingle();

    if (
      driverError
    ) {
      console.warn(
        'No se pudo consultar el repartidor del pedido:',
        driverError,
      );
    } else if (
      driver
    ) {
      const name =
        [
          driver
            .first_name,
          driver
            .last_name,
        ]
          .filter(
            value =>
              typeof value ===
                'string' &&
              value.trim(),
          )
          .map(
            value =>
              String(
                value,
              ).trim(),
          )
          .join(
            ' ',
          );

      driverName =
        name ||
        null;
    }
  }

  const status =
    String(
      order.status ??
      '',
    );

  const fulfillmentType =
    order
      .fulfillment_type ??
    null;

  return {
    found:
      true,
    orderId:
      order.id,
    trackingCode:
      getOrderTrackingCodeFromId(
        order.id,
      ),
    status,
    statusLabel:
      getOrderStatusLabelForAI(
        status,
        fulfillmentType,
      ),
    fulfillmentType,
    total:
      Number(
        order.total ??
        0,
      ),
    customerName:
      order
        .customer_name ??
      null,
    driverAssigned:
      Boolean(
        order.driver_id,
      ),
    driverName,
    createdAt:
      order
        .created_at ??
      null,
    updatedAt:
      order
        .status_updated_at ??
      order
        .updated_at ??
      null,
    terminal:
      status ===
        'delivered' ||
      status ===
        'cancelled',
    eta: {
      available:
        false,
      minutes:
        null,
      reason:
        'Usa get_current_order_eta para obtener una estimación operativa.',
    },
  };
}

function buildPostOrderContext(): string {
  return [
    'MODO POST-PEDIDO ACTIVO.',
    'La orden de esta conversación ya fue creada.',
    'Puedes consultar su estado usando get_current_order_status y su estimación usando get_current_order_eta.',
    'Puedes cancelar la orden actual únicamente mediante cancel_current_order y solo si el backend la considera elegible.',
    'Solo puedes modificar campos seguros mediante get_current_order_editability + update_current_order_safe_field.',
    'No puedes cambiar productos, cantidades, modificadores, modalidad, domicilio, precio ni crear otra orden en esta conversación.',
    'Si el cliente quiere agregar o cambiar productos, indícale que debe iniciar una nueva conversación/pedido.',
    'Si pregunta cuánto falta y la herramienta no devuelve un ETA real, NO inventes minutos.',
    'Si el cliente pide ayuda humana, usa request_human.',
  ].join(
    '\n',
  );
}


function normalizePublicTrackingCode(
  rawCode: unknown,
): string {
  return String(
    rawCode ??
    '',
  )
    .replace(
      /[^0-9a-f]/gi,
      '',
    )
    .slice(
      0,
      8,
    )
    .toUpperCase();
}

function readObjectValue(
  source: Record<string, unknown>,
  keys: string[],
): unknown {
  for (
    const key of keys
  ) {
    if (
      Object.prototype
        .hasOwnProperty
        .call(
          source,
          key,
        )
    ) {
      return source[key];
    }
  }

  return null;
}

function normalizePublicTrackingResult(
  raw: unknown,
  requestedCode: string,
) {
  if (
    !raw ||
    typeof raw !==
      'object'
  ) {
    return null;
  }

  const source =
    raw as Record<
      string,
      unknown
    >;

  const status =
    String(
      readObjectValue(
        source,
        [
          'status',
          'orderStatus',
          'order_status',
        ],
      ) ??
      '',
    );

  const fulfillmentType =
    String(
      readObjectValue(
        source,
        [
          'fulfillmentType',
          'fulfillment_type',
        ],
      ) ??
      '',
    ) ||
    null;

  const trackingCode =
    normalizePublicTrackingCode(
      readObjectValue(
        source,
        [
          'trackingCode',
          'tracking_code',
        ],
      ) ??
      requestedCode,
    );

  const totalRaw =
    readObjectValue(
      source,
      [
        'total',
        'orderTotal',
        'order_total',
      ],
    );

  const total =
    Number(
      totalRaw ??
      0,
    );

  const updatedAt =
    readObjectValue(
      source,
      [
        'updatedAt',
        'updated_at',
        'statusUpdatedAt',
        'status_updated_at',
      ],
    );

  const createdAt =
    readObjectValue(
      source,
      [
        'createdAt',
        'created_at',
      ],
    );

  return {
    found:
      true,
    trackingCode,
    status,
    statusLabel:
      getOrderStatusLabelForAI(
        status,
        fulfillmentType,
      ),
    fulfillmentType,
    total:
      Number.isFinite(
        total,
      )
        ? total
        : null,
    createdAt:
      typeof createdAt ===
        'string'
        ? createdAt
        : null,
    updatedAt:
      typeof updatedAt ===
        'string'
        ? updatedAt
        : null,
    terminal:
      status ===
        'delivered' ||
      status ===
        'cancelled',
    eta: {
      available:
        false,
      minutes:
        null,
      reason:
        'DorianCore no tiene un ETA exacto calculado para esta orden.',
    },
  };
}

async function lookupOrderByTracking(
  rawTrackingCode: unknown,
) {
  const trackingCode =
    normalizePublicTrackingCode(
      rawTrackingCode,
    );

  if (
    trackingCode.length !==
    8
  ) {
    return {
      found:
        false,
      validTrackingCode:
        false,
      trackingCode,
      reason:
        'El código de pedido debe tener exactamente 8 caracteres hexadecimales.',
    };
  }

  const {
    data,
    error,
  } =
    await admin
      .rpc(
        'get_public_order_tracking',
        {
          p_tracking_code:
            trackingCode,
        },
      );

  if (error) {
    throw error;
  }

  if (!data) {
    return {
      found:
        false,
      validTrackingCode:
        true,
      trackingCode,
      reason:
        'No encontré un pedido con ese código.',
    };
  }

  /*
   * Algunos RPC pueden devolver una fila o una colección de una fila.
   */
  const rawResult =
    Array.isArray(
      data,
    )
      ? data[0] ??
        null
      : data;

  if (!rawResult) {
    return {
      found:
        false,
      validTrackingCode:
        true,
      trackingCode,
      reason:
        'No encontré un pedido con ese código.',
    };
  }

  return (
    normalizePublicTrackingResult(
      rawResult,
      trackingCode,
    ) ?? {
      found:
        false,
      validTrackingCode:
        true,
      trackingCode,
      reason:
        'No pude interpretar el estado del pedido.',
    }
  );
}

async function lookupActiveOrdersByPhone(
  rawPhone: unknown,
) {
  const phone =
    normalizePhone(
      rawPhone,
    );

  if (
    phone.length !==
    10
  ) {
    return {
      found:
        false,
      validPhone:
        false,
      phone,
      orders:
        [],
      reason:
        'El teléfono debe tener exactamente 10 dígitos.',
    };
  }

  const {
    data:
      orders,
    error:
      ordersError,
  } =
    await admin
      .from(
        'orders',
      )
      .select(
        'id,total,status,fulfillment_type,customer_name,customer_phone,driver_id,created_at,status_updated_at,updated_at',
      )
      .eq(
        'customer_phone',
        phone,
      )
      .in(
        'status',
        [
          'pending',
          'preparing',
          'ready',
          'on_the_way',
        ],
      )
      .order(
        'created_at',
        {
          ascending:
            false,
        },
      )
      .limit(
        5,
      );

  if (
    ordersError
  ) {
    throw ordersError;
  }

  const normalizedOrders =
    [];

  for (
    const order of
      (
        Array.isArray(
          orders,
        )
          ? orders
          : []
      )
  ) {
    let driverName:
      | string
      | null =
      null;

    if (
      order.driver_id
    ) {
      const {
        data:
          driver,
      } =
        await admin
          .from(
            'profiles',
          )
          .select(
            'first_name,last_name',
          )
          .eq(
            'id',
            order.driver_id,
          )
          .maybeSingle();

      if (driver) {
        const name =
          [
            driver
              .first_name,
            driver
              .last_name,
          ]
            .filter(
              value =>
                typeof value ===
                  'string' &&
                value.trim(),
            )
            .map(
              value =>
                String(
                  value,
                ).trim(),
            )
            .join(
              ' ',
            );

        driverName =
          name ||
          null;
      }
    }

    normalizedOrders.push({
      trackingCode:
        getOrderTrackingCodeFromId(
          order.id,
        ),
      status:
        order.status,
      statusLabel:
        getOrderStatusLabelForAI(
          order.status,
          order
            .fulfillment_type,
        ),
      fulfillmentType:
        order
          .fulfillment_type ??
        null,
      total:
        Number(
          order.total ??
          0,
        ),
      customerName:
        order
          .customer_name ??
        null,
      driverAssigned:
        Boolean(
          order.driver_id,
        ),
      driverName,
      createdAt:
        order
          .created_at ??
        null,
      updatedAt:
        order
          .status_updated_at ??
        order
          .updated_at ??
        null,
      eta: {
        available:
          false,
        minutes:
          null,
      },
    });
  }

  return {
    found:
      normalizedOrders.length >
      0,
    validPhone:
      true,
    phone,
    orders:
      normalizedOrders,
  };
}


async function getCurrentOrderCancellationEligibility(
  conversationId: string,
) {
  const {
    data:
      draft,
    error:
      draftError,
  } =
    await admin
      .from(
        'ai_order_drafts',
      )
      .select(
        'order_id,status',
      )
      .eq(
        'conversation_id',
        conversationId,
      )
      .maybeSingle();

  if (draftError) {
    throw draftError;
  }

  if (
    !draft?.order_id
  ) {
    return {
      found:
        false,
      eligible:
        false,
      reason:
        'Esta conversación no tiene una orden real asociada.',
    };
  }

  const {
    data:
      order,
    error:
      orderError,
  } =
    await admin
      .from(
        'orders',
      )
      .select(
        'id,status,fulfillment_type,total,created_at',
      )
      .eq(
        'id',
        draft.order_id,
      )
      .maybeSingle();

  if (orderError) {
    throw orderError;
  }

  if (!order) {
    return {
      found:
        false,
      eligible:
        false,
      reason:
        'No encontré la orden asociada a esta conversación.',
    };
  }

  const {
    data:
      payment,
    error:
      paymentError,
  } =
    await admin
      .from(
        'order_payments',
      )
      .select(
        'id,payment_method,total_amount,created_at',
      )
      .eq(
        'order_id',
        order.id,
      )
      .maybeSingle();

  if (paymentError) {
    throw paymentError;
  }

  const status =
    String(
      order.status ??
      '',
    );

  const hasPayment =
    Boolean(
      payment,
    );

  let eligible =
    false;

  let requiresHuman =
    false;

  let reason =
    '';

  if (
    status ===
      'cancelled'
  ) {
    reason =
      'El pedido ya está cancelado.';
  } else if (
    status ===
      'delivered'
  ) {
    reason =
      'El pedido ya aparece como entregado.';
  } else if (
    hasPayment
  ) {
    requiresHuman =
      true;
    reason =
      'El pedido ya tiene un pago registrado y requiere revisión humana para cancelar o gestionar un reembolso.';
  } else if (
    status ===
      'ready'
  ) {
    requiresHuman =
      true;
    reason =
      'El pedido ya está listo y requiere autorización humana para cancelarse.';
  } else if (
    status ===
      'on_the_way'
  ) {
    requiresHuman =
      true;
    reason =
      'El pedido ya va en camino y requiere atención humana para intentar cancelarlo.';
  } else if (
    status ===
      'pending' ||
    status ===
      'preparing'
  ) {
    eligible =
      true;
    reason =
      'El pedido puede cancelarse automáticamente porque aún no está listo ni en camino y no tiene pago registrado.';
  } else {
    requiresHuman =
      true;
    reason =
      'No puedo cancelar automáticamente un pedido en este estado.';
  }

  return {
    found:
      true,
    eligible,
    requiresHuman,
    orderId:
      order.id,
    trackingCode:
      getOrderTrackingCodeFromId(
        order.id,
      ),
    status,
    statusLabel:
      getOrderStatusLabelForAI(
        status,
        order
          .fulfillment_type,
      ),
    fulfillmentType:
      order
        .fulfillment_type ??
      null,
    total:
      Number(
        order.total ??
        0,
      ),
    hasPayment,
    paymentMethod:
      payment
        ?.payment_method ??
      null,
    reason,
  };
}

async function cancelCurrentOrderSafely(
  conversationId: string,
  reason: unknown,
) {
  const eligibility =
    await getCurrentOrderCancellationEligibility(
      conversationId,
    );

  if (
    !eligibility.found
  ) {
    return {
      ok:
        false,
      cancelled:
        false,
      blocked:
        true,
      ...eligibility,
    };
  }

  if (
    !eligibility
      .eligible
  ) {
    if (
      eligibility
        .requiresHuman
    ) {
      await requestHuman(
        conversationId,
        `Solicitud de cancelación del pedido #${eligibility.trackingCode ?? ''}: ${eligibility.reason}`,
      );
    }

    return {
      ok:
        false,
      cancelled:
        false,
      blocked:
        true,
      ...eligibility,
    };
  }

  const cleanReason =
    String(
      reason ??
      'Cancelación solicitada por el cliente mediante DORIAN AI',
    )
      .trim()
      .slice(
        0,
        500,
      );

  /*
   * El RPC vuelve a validar estado y pago dentro de la misma
   * transacción para evitar carreras entre este check y el UPDATE.
   */
  const {
    data:
      cancellationResult,
    error:
      cancellationError,
  } =
    await admin
      .rpc(
        'cancel_ai_order_if_eligible',
        {
          p_order_id:
            eligibility
              .orderId,
          p_reason:
            cleanReason,
        },
      );

  if (
    cancellationError
  ) {
    throw cancellationError;
  }

  const result =
    (
      cancellationResult &&
      typeof cancellationResult ===
        'object'
    )
      ? cancellationResult as Record<
          string,
          unknown
        >
      : {};

  const cancelled =
    result.cancelled ===
      true;

  if (
    !cancelled &&
    result.requiresHuman ===
      true
  ) {
    await requestHuman(
      conversationId,
      `La cancelación automática del pedido #${eligibility.trackingCode ?? ''} fue bloqueada: ${String(result.reason ?? eligibility.reason)}`,
    );
  }

  return {
    ok:
      cancelled,
    cancelled,
    trackingCode:
      eligibility
        .trackingCode,
    statusBefore:
      eligibility
        .status,
    status:
      cancelled
        ? 'cancelled'
        : eligibility
            .status,
    statusLabel:
      cancelled
        ? 'Cancelado'
        : eligibility
            .statusLabel,
    requiresHuman:
      result
        .requiresHuman ===
      true,
    reason:
      String(
        result.reason ??
        (
          cancelled
            ? 'Pedido cancelado correctamente.'
            : eligibility
                .reason
        ),
      ),
  };
}


async function getCurrentOrderSafeEditContext(
  conversationId: string,
) {
  const {
    data:
      draft,
    error:
      draftError,
  } =
    await admin
      .from(
        'ai_order_drafts',
      )
      .select(
        'order_id,status',
      )
      .eq(
        'conversation_id',
        conversationId,
      )
      .maybeSingle();

  if (draftError) {
    throw draftError;
  }

  if (
    !draft?.order_id
  ) {
    return {
      found:
        false,
      reason:
        'Esta conversación no tiene una orden real asociada.',
      allowedChanges:
        [],
      items:
        [],
    };
  }

  const {
    data:
      order,
    error:
      orderError,
  } =
    await admin
      .from(
        'orders',
      )
      .select(
        `
          id,
          status,
          fulfillment_type,
          total,
          created_at,
          order_items(
            id,
            product_id,
            quantity,
            notes,
            products(
              id,
              name
            )
          ),
          order_delivery_details(
            id,
            delivery_references
          )
        `,
      )
      .eq(
        'id',
        draft.order_id,
      )
      .maybeSingle();

  if (orderError) {
    throw orderError;
  }

  if (!order) {
    return {
      found:
        false,
      reason:
        'No encontré la orden asociada a esta conversación.',
      allowedChanges:
        [],
      items:
        [],
    };
  }

  const status =
    String(
      order.status ??
      '',
    );

  const fulfillmentType =
    order
      .fulfillment_type ??
    null;

  const allowedChanges:
    string[] =
    [];

  if (
    status ===
    'pending'
  ) {
    allowedChanges.push(
      'item_note',
    );

    if (
      fulfillmentType ===
      'delivery'
    ) {
      allowedChanges.push(
        'delivery_references',
      );
    }
  } else if (
    status ===
      'preparing' ||
    status ===
      'ready' ||
    status ===
      'on_the_way'
  ) {
    if (
      fulfillmentType ===
      'delivery'
    ) {
      allowedChanges.push(
        'delivery_references',
      );
    }
  }

  const items =
    (
      Array.isArray(
        order
          .order_items,
      )
        ? order
            .order_items
        : []
    )
      .map(
        (
          item:
            any,
          index:
            number,
        ) => ({
          position:
            index +
            1,
          orderItemId:
            item.id,
          productId:
            item
              .product_id ??
            null,
          productName:
            item
              ?.products
              ?.name ??
            null,
          quantity:
            Number(
              item
                .quantity ??
              1,
            ),
          notes:
            item
              .notes ??
            null,
        }),
      );

  const deliveryDetails =
    Array.isArray(
      order
        .order_delivery_details,
    )
      ? order
          .order_delivery_details[0] ??
        null
      : order
          .order_delivery_details ??
        null;

  return {
    found:
      true,
    orderId:
      order.id,
    trackingCode:
      getOrderTrackingCodeFromId(
        order.id,
      ),
    status,
    statusLabel:
      getOrderStatusLabelForAI(
        status,
        fulfillmentType,
      ),
    fulfillmentType,
    allowedChanges,
    items,
    currentDeliveryReferences:
      deliveryDetails
        ?.delivery_references ??
      null,
    structuralChangesRequireHuman:
      true,
  };
}

async function updateCurrentOrderSafeField(
  conversationId: string,
  args: any,
) {
  const context =
    await getCurrentOrderSafeEditContext(
      conversationId,
    );

  if (
    !context.found
  ) {
    return {
      ok:
        false,
      updated:
        false,
      blocked:
        true,
      ...context,
    };
  }

  const changeType =
    String(
      args
        ?.change_type ??
      '',
    );

  if (
    !context
      .allowedChanges
      .includes(
        changeType,
      )
  ) {
    await requestHuman(
      conversationId,
      `Cambio post-pedido no permitido automáticamente en #${context.trackingCode ?? ''}. Tipo: ${changeType || 'desconocido'}. Estado: ${context.statusLabel ?? context.status}.`,
    );

    return {
      ok:
        false,
      updated:
        false,
      blocked:
        true,
      requiresHuman:
        true,
      trackingCode:
        context
          .trackingCode,
      status:
        context.status,
      reason:
        'Ese cambio no está permitido automáticamente en el estado actual del pedido.',
      allowedChanges:
        context
          .allowedChanges,
    };
  }

  const value =
    String(
      args
        ?.value ??
      '',
    )
      .trim()
      .slice(
        0,
        500,
      );

  if (
    !value
  ) {
    return {
      ok:
        false,
      updated:
        false,
      blocked:
        true,
      reason:
        'El nuevo valor no puede estar vacío.',
    };
  }

  let orderItemId:
    | string
    | null =
    null;

  if (
    changeType ===
    'item_note'
  ) {
    const rawPosition =
      Number(
        args
          ?.item_position,
      );

    if (
      !Number.isInteger(
        rawPosition,
      ) ||
      rawPosition <
        1
    ) {
      return {
        ok:
          false,
        updated:
          false,
        blocked:
          true,
        reason:
          'Para cambiar una nota necesito la posición válida del producto.',
      };
    }

    const targetItem =
      context
        .items
        .find(
          item =>
            item.position ===
            rawPosition,
        );

    if (
      !targetItem
    ) {
      return {
        ok:
          false,
        updated:
          false,
        blocked:
          true,
        reason:
          'No existe un producto en esa posición dentro de la orden.',
      };
    }

    orderItemId =
      targetItem
        .orderItemId;
  }

  const {
    data:
      updateResult,
    error:
      updateError,
  } =
    await admin
      .rpc(
        'update_ai_order_safe_field',
        {
          p_order_id:
            context.orderId,
          p_change_type:
            changeType,
          p_order_item_id:
            orderItemId,
          p_value:
            value,
        },
      );

  if (
    updateError
  ) {
    throw updateError;
  }

  const result =
    (
      updateResult &&
      typeof updateResult ===
        'object'
    )
      ? updateResult as Record<
          string,
          unknown
        >
      : {};

  if (
    result.updated !==
      true &&
    result.requiresHuman ===
      true
  ) {
    await requestHuman(
      conversationId,
      `Cambio post-pedido bloqueado para #${context.trackingCode ?? ''}: ${String(result.reason ?? 'requiere revisión humana')}`,
    );
  }

  return {
    ok:
      result.updated ===
      true,
    updated:
      result.updated ===
      true,
    trackingCode:
      context
        .trackingCode,
    changeType,
    status:
      result.status ??
      context.status,
    requiresHuman:
      result
        .requiresHuman ===
      true,
    reason:
      result.reason ??
      (
        result.updated ===
          true
          ? 'Cambio aplicado correctamente.'
          : 'No se pudo aplicar el cambio.'
      ),
  };
}


function addMinutesToIso(
  isoValue: unknown,
  minutes: number,
): string | null {
  const timestamp =
    new Date(
      String(
        isoValue ??
        '',
      ),
    ).getTime();

  if (
    !Number.isFinite(
      timestamp,
    )
  ) {
    return null;
  }

  return new Date(
    timestamp +
      minutes *
        60 *
        1000,
  ).toISOString();
}

function getRemainingMinutes(
  targetIso: string | null,
): number | null {
  if (!targetIso) {
    return null;
  }

  const targetMs =
    new Date(
      targetIso,
    ).getTime();

  if (
    !Number.isFinite(
      targetMs,
    )
  ) {
    return null;
  }

  return Math.max(
    0,
    Math.ceil(
      (
        targetMs -
        Date.now()
      ) /
      60000,
    ),
  );
}

async function getCurrentOrderEta(
  conversationId: string,
  settings: Settings,
) {
  const statusResult =
    await getCurrentOrderStatus(
      conversationId,
    );

  if (
    !statusResult
      ?.found
  ) {
    return {
      available:
        false,
      reason:
        statusResult
          ?.reason ??
        'No encontré una orden asociada a esta conversación.',
    };
  }

  const preparationMinutes =
    Math.max(
      0,
      Number(
        settings
          .eta_preparation_minutes ??
        25,
      ),
    );

  const deliveryTransitMinutes =
    Math.max(
      0,
      Number(
        settings
          .eta_delivery_transit_minutes ??
        15,
      ),
    );

  const bufferMinutes =
    Math.max(
      0,
      Number(
        settings
          .eta_buffer_minutes ??
        5,
      ),
    );

  const status =
    statusResult
      .status;

  const fulfillmentType =
    statusResult
      .fulfillmentType;

  const createdAt =
    statusResult
      .createdAt;

  const updatedAt =
    statusResult
      .updatedAt;

  if (
    status ===
      'cancelled'
  ) {
    return {
      available:
        false,
      terminal:
        true,
      status,
      reason:
        'El pedido está cancelado.',
    };
  }

  if (
    status ===
      'delivered'
  ) {
    return {
      available:
        false,
      terminal:
        true,
      status,
      reason:
        'El pedido ya fue entregado.',
    };
  }

  if (
    fulfillmentType ===
      'pickup' &&
    status ===
      'ready'
  ) {
    return {
      available:
        true,
      exact:
        true,
      status,
      remainingMinutesMin:
        0,
      remainingMinutesMax:
        0,
      message:
        'El pedido ya está listo para recoger.',
    };
  }

  let targetIso:
    | string
    | null =
    null;

  let basis =
    '';

  if (
    status ===
      'pending' ||
    status ===
      'preparing'
  ) {
    const totalMinutes =
      preparationMinutes +
      (
        fulfillmentType ===
          'delivery'
          ? deliveryTransitMinutes
          : 0
      );

    targetIso =
      addMinutesToIso(
        createdAt,
        totalMinutes,
      );

    basis =
      fulfillmentType ===
        'delivery'
        ? 'preparación + trayecto configurados'
        : 'tiempo de preparación configurado';
  } else if (
    fulfillmentType ===
      'delivery' &&
    status ===
      'ready'
  ) {
    targetIso =
      addMinutesToIso(
        updatedAt,
        deliveryTransitMinutes,
      );

    basis =
      'trayecto configurado desde que quedó listo para reparto';
  } else if (
    fulfillmentType ===
      'delivery' &&
    status ===
      'on_the_way'
  ) {
    targetIso =
      addMinutesToIso(
        updatedAt,
        deliveryTransitMinutes,
      );

    basis =
      'trayecto configurado desde que salió a reparto';
  }

  const remaining =
    getRemainingMinutes(
      targetIso,
    );

  if (
    remaining ===
      null
  ) {
    return {
      available:
        false,
      status,
      reason:
        'No hay suficientes timestamps para calcular una estimación.',
    };
  }

  const minMinutes =
    Math.max(
      0,
      remaining -
      bufferMinutes,
    );

  const maxMinutes =
    Math.max(
      minMinutes,
      remaining +
      bufferMinutes,
    );

  return {
    available:
      true,
    exact:
      false,
    status,
    basis,
    remainingMinutesMin:
      minMinutes,
    remainingMinutesMax:
      maxMinutes,
    targetAt:
      targetIso,
    configured: {
      preparationMinutes,
      deliveryTransitMinutes,
      bufferMinutes,
    },
    disclaimer:
      'Es una estimación operativa, no una hora garantizada.',
  };
}


function buildReturnedFromHumanContext(
  lifecycleState: ConversationLifecycleState,
): string | null {
  const resolution =
    lifecycleState
      ?.metadata
      ?.lastHandoffResolution as
      | Record<string, unknown>
      | undefined;

  if (
    lifecycleState.status !==
      'active' ||
    !resolution ||
    resolution.type !==
      'returned_to_ai'
  ) {
    return null;
  }

  const note =
    typeof resolution.note ===
      'string' &&
    resolution.note.trim()
      ? resolution.note.trim()
      : null;

  return [
    'HANDOFF HUMANO FINALIZADO.',
    'Una persona atendió esta conversación y devolvió explícitamente el control a DORIAN.',
    'Continúa normalmente desde el estado actual del borrador y el historial.',
    'NO vuelvas a solicitar atención humana solo porque mensajes anteriores pidieron hablar con una persona.',
    'Solo usa request_human de nuevo si el mensaje ACTUAL contiene un motivo nuevo que realmente requiera humano.',
    note
      ? `Nota del cierre humano: ${note}`
      : null,
  ]
    .filter(
      Boolean,
    )
    .join(
      '\n',
    );
}

async function updateDraft(conversationId: string, args: any) {
  const validated =
    await validateDraftItems(
      Array.isArray(args.items)
        ? args.items
        : [],
    );

  const fulfillmentType =
    ['pickup', 'delivery'].includes(
      args.fulfillment_type,
    )
      ? args.fulfillment_type
      : null;

  const deliveryValidation =
    await validateDeliveryForDraft(
      fulfillmentType,
      args.delivery,
    );

  const promotionSummary =
    await calculateDraftPromotionSummary(
      validated.items,
    );

  const estimatedTotal =
    roundMoney(
      promotionSummary.productsAfterPromotions +
      deliveryValidation.deliveryFee,
    );

  const payload = {
    conversation_id:
      conversationId,
    status:
      'building',
    customer_name:
      typeof args.customer_name === 'string'
        ? args.customer_name.trim().slice(0, 120)
        : null,
    customer_phone:
      typeof args.customer_phone === 'string'
        ? args.customer_phone.replace(/\D/g, '').slice(0, 15)
        : null,
    fulfillment_type:
      fulfillmentType,
    delivery:
      deliveryValidation.delivery,
    items:
      validated.items,
    estimated_total:
      estimatedTotal,
  };

  const { data, error } = await admin
    .from('ai_order_drafts')
    .upsert(
      payload,
      {
        onConflict:
          'conversation_id',
      },
    )
    .select('*')
    .single();

  if (error) throw error;

  await admin
    .from('ai_order_conversations')
    .update({
      customer_name:
        payload.customer_name,
      customer_phone:
        payload.customer_phone,
    })
    .eq(
      'id',
      conversationId,
    );

  const readiness =
    await evaluateDraftReadiness(
      data,
    );

  return {
    ...data,
    pricing: {
      ...promotionSummary,
      deliveryFee:
        deliveryValidation.deliveryFee,
      estimatedTotal,
    },
    readiness,
  };
}

async function getDraft(conversationId: string) {
  const { data, error } =
    await admin
      .from('ai_order_drafts')
      .select('*')
      .eq(
        'conversation_id',
        conversationId,
      )
      .maybeSingle();

  if (error) throw error;

  if (!data) {
    return {
      draft:
        null,
      pricing:
        null,
      readiness:
        null,
    };
  }

  const promotionSummary =
    await calculateDraftPromotionSummary(
      Array.isArray(
        data.items,
      )
        ? data.items
        : [],
    );

  const deliveryFee =
    data.fulfillment_type ===
      'delivery'
      ? Number(
        data.delivery?.quote
          ?.totalFee ??
        0,
      )
      : 0;

  const estimatedTotal =
    roundMoney(
      promotionSummary.productsAfterPromotions +
      deliveryFee,
    );

  const normalizedDraft = {
    ...data,
    estimated_total:
      estimatedTotal,
  };

  const readiness =
    await evaluateDraftReadiness(
      normalizedDraft,
    );

  return {
    draft:
      normalizedDraft,
    pricing: {
      ...promotionSummary,
      deliveryFee:
        roundMoney(
          deliveryFee,
        ),
      estimatedTotal,
    },
    readiness,
  };
}

async function requestHuman(conversationId: string, reason: string) {
  const handoffReason =
    reason?.trim().slice(0, 500) ||
    'Solicitud del agente';

  const {
    data:
      conversation,
    error:
      readError,
  } =
    await admin
      .from(
        'ai_order_conversations',
      )
      .select(
        'metadata,human_handoff_at',
      )
      .eq(
        'id',
        conversationId,
      )
      .maybeSingle();

  if (readError) {
    throw readError;
  }

  const handoffAt =
    new Date().toISOString();

  const metadata = {
    ...(
      conversation?.metadata ??
      {}
    ),
    handoff: {
      requestedAt:
        handoffAt,
      reason:
        handoffReason,
      source:
        'dorian_ai',
    },
  };

  const {
    error:
      updateError,
  } =
    await admin
      .from(
        'ai_order_conversations',
      )
      .update({
        status:
          'awaiting_human',
        human_handoff_requested:
          true,
        human_handoff_reason:
          handoffReason,
        human_handoff_at:
          handoffAt,
        human_assignee_id:
          null,
        human_taken_at:
          null,
        human_resolved_at:
          null,
        human_resolved_by_id:
          null,
        human_resolution_type:
          null,
        metadata,
      })
      .eq(
        'id',
        conversationId,
      );

  if (updateError) {
    throw updateError;
  }

  const {
    error:
      eventError,
  } =
    await admin
      .from(
        'ai_order_handoff_events',
      )
      .insert({
        conversation_id:
          conversationId,
        event_type:
          'requested',
        actor_user_id:
          null,
        note:
          handoffReason,
        metadata: {
          source:
            'dorian_ai',
        },
      });

  if (
    eventError
  ) {
    console.warn(
      'No se pudo guardar auditoría del handoff:',
      eventError,
    );
  }

  return {
    handoffRequested:
      true,
    handoffAt,
  };
}


async function cancelDraft(
  conversationId: string,
  reason: string,
) {
  const cancelledAt =
    new Date()
      .toISOString();

  const {
    data: draft,
    error:
      draftError,
  } =
    await admin
      .from(
        'ai_order_drafts',
      )
      .select(
        'id,status,order_id',
      )
      .eq(
        'conversation_id',
        conversationId,
      )
      .maybeSingle();

  if (draftError) {
    throw draftError;
  }

  if (
    draft?.order_id
  ) {
    return {
      ok:
        false,
      blocked:
        true,
      reason:
        'El pedido ya fue creado. No puedo cancelarlo como borrador; requiere el flujo de cancelación de una orden real.',
      orderId:
        draft.order_id,
    };
  }

  if (draft) {
    const {
      error,
    } =
      await admin
        .from(
          'ai_order_drafts',
        )
        .update({
          status:
            'cancelled',
          explicit_confirmation_at:
            null,
        })
        .eq(
          'id',
          draft.id,
        );

    if (error) {
      throw error;
    }
  }

  const {
    error:
      conversationError,
  } =
    await admin
      .from(
        'ai_order_conversations',
      )
      .update({
        status:
          'cancelled',
        human_handoff_requested:
          false,
        human_handoff_reason:
          null,
      })
      .eq(
        'id',
        conversationId,
      );

  if (conversationError) {
    throw conversationError;
  }

  const {
    data:
      currentConversation,
  } =
    await admin
      .from(
        'ai_order_conversations',
      )
      .select(
        'metadata',
      )
      .eq(
        'id',
        conversationId,
      )
      .maybeSingle();

  await admin
    .from(
      'ai_order_conversations',
    )
    .update({
      metadata: {
        ...(
          currentConversation
            ?.metadata ??
          {}
        ),
        cancelledAt,
        cancelReason:
          String(
            reason ??
            'Cancelado por el cliente',
          )
            .trim()
            .slice(
              0,
              500,
            ),
      },
    })
    .eq(
      'id',
      conversationId,
    );

  return {
    ok:
      true,
    cancelled:
      true,
    draftId:
      draft?.id ??
      null,
  };
}

function normalizePhone(
  value: unknown,
): string {
  return String(
    value ?? '',
  ).replace(
    /\D/g,
    '',
  );
}

async function getLastUserMessage(
  conversationId: string,
): Promise<string> {
  const {
    data,
    error,
  } =
    await admin
      .from(
        'ai_order_messages',
      )
      .select(
        'content,created_at',
      )
      .eq(
        'conversation_id',
        conversationId,
      )
      .eq(
        'role',
        'user',
      )
      .order(
        'created_at',
        {
          ascending:
            false,
        },
      )
      .limit(
        1,
      )
      .maybeSingle();

  if (error) {
    throw error;
  }

  return String(
    data?.content ??
    '',
  ).trim();
}

function isExplicitOrderConfirmation(
  message: string,
): boolean {
  const normalized =
    normalizeText(
      message,
    )
      .replace(
        /[.!?¡¿,;:]+/g,
        ' ',
      )
      .replace(
        /\s+/g,
        ' ',
      )
      .trim();

  if (!normalized) {
    return false;
  }

  /*
   * Rechazos explícitos.
   *
   * Se evalúan antes que las afirmaciones para evitar casos
   * como "no, todavía no" o "espera".
   */
  const negativePatterns = [
    /^no$/,
    /\bno gracias\b/,
    /\bno confirmo\b/,
    /\btodavia no\b/,
    /\baun no\b/,
    /\bmejor no\b/,
    /\bespera\b/,
    /\baguanta\b/,
    /\bcancel/,
    /\bdeten/,
    /\bno esta bien\b/,
    /\bno asi\b/,
    /\bcambialo\b/,
    /\bcambia\b/,
    /\bquita\b/,
    /\bagrega\b/,
    /\bmodifica\b/,
  ];

  if (
    negativePatterns.some(
      pattern =>
        pattern.test(
          normalized,
        ),
    )
  ) {
    return false;
  }

  /*
   * Confirmaciones humanas/naturales.
   *
   * No exigimos "confirmo". En una conversación real el cliente
   * normalmente responde con frases cortas como "sí", "va",
   * "claro", "dale", "está bien", "perfecto", etc.
   */
  const positivePatterns = [
    /^si$/,
    /^sí$/,
    /^si porfa$/,
    /^si por favor$/,
    /^sí porfa$/,
    /^sí por favor$/,
    /^claro$/,
    /^claro que si$/,
    /^claro que sí$/,
    /^va$/,
    /^va esta bien$/,
    /^va está bien$/,
    /^dale$/,
    /^dale asi$/,
    /^dale así$/,
    /^ok$/,
    /^okay$/,
    /^oki$/,
    /^perfecto$/,
    /^correcto$/,
    /^de acuerdo$/,
    /^esta bien$/,
    /^está bien$/,
    /^asi esta bien$/,
    /^así está bien$/,
    /^si esta bien$/,
    /^si está bien$/,
    /^sí esta bien$/,
    /^sí está bien$/,
    /^si asi$/,
    /^si así$/,
    /^sí asi$/,
    /^sí así$/,
    /^adelante$/,
    /^hazlo$/,
    /^crealo$/,
    /^créalo$/,
    /^registralo$/,
    /^regístralo$/,
    /^mandalo$/,
    /^mándalo$/,
    /^levantalo$/,
    /^levántalo$/,
    /^eso es todo$/,
    /^seria todo$/,
    /^sería todo$/,
    /^ya quedo$/,
    /^ya quedó$/,
    /^todo bien$/,
    /^todo correcto$/,
    /^listo$/,
    /^listo asi$/,
    /^listo así$/,
    /\bconfirmo\b/,
    /\bconfirmado\b/,
    /\bpedido confirmado\b/,
  ];

  return positivePatterns.some(
    pattern =>
      pattern.test(
        normalized,
      ),
  );
}


function buildWebOrderItems(
  draftItems: any[],
) {
  return (
    draftItems ??
    []
  ).map(
    (item: any) => ({
      productId:
        item.productId,
      quantity:
        Number(
          item.quantity ??
          1,
        ),
      notes:
        String(
          item.notes ??
          '',
        ).trim(),
      modifiers:
        (
          item.modifiers ??
          []
        ).map(
          (modifier: any) => ({
            id:
              modifier.id,
          }),
        ),
      components:
        (
          item.comboComponents ??
          []
        ).map(
          (component: any) => ({
            productId:
              component.productId,
            type:
              component.type,
            label:
              component.label,
            quantity:
              Number(
                component.quantity ??
                1,
              ),
            notes:
              String(
                component.notes ??
                '',
              ).trim(),
            modifiers:
              (
                component.modifiers ??
                []
              ).map(
                (modifier: any) => ({
                  id:
                    modifier.id,
                }),
              ),
          }),
        ),
    }),
  );
}

function buildWebOrderDelivery(
  draft: any,
) {
  if (
    draft.fulfillment_type !==
    'delivery'
  ) {
    return null;
  }

  const delivery =
    draft.delivery ??
    {};

  return {
    street:
      String(
        delivery.street ??
        '',
      ).trim(),
    exteriorNumber:
      String(
        delivery.exteriorNumber ??
        '',
      ).trim(),
    interiorNumber:
      String(
        delivery.interiorNumber ??
        '',
      ).trim(),
    neighborhood:
      String(
        delivery.neighborhood ??
        '',
      ).trim(),
    postalCode:
      String(
        delivery.postalCode ??
        '',
      ).trim(),
    deliveryReferences:
      String(
        delivery.deliveryReferences ??
        '',
      ).trim(),
    latitude:
      Number(
        delivery.latitude,
      ),
    longitude:
      Number(
        delivery.longitude,
      ),
  };
}

function getOrderTrackingCodeFromId(
  orderId: string,
): string {
  return String(
    orderId ??
    '',
  )
    .replace(
      /-/g,
      '',
    )
    .slice(
      0,
      8,
    )
    .toUpperCase();
}

async function confirmOrder(
  conversationId: string,
  settings: Settings,
) {
  const {
    data: draft,
    error,
  } =
    await admin
      .from(
        'ai_order_drafts',
      )
      .select(
        '*',
      )
      .eq(
        'conversation_id',
        conversationId,
      )
      .maybeSingle();

  if (error) throw error;

  if (
    !draft ||
    !Array.isArray(
      draft.items,
    ) ||
    draft.items.length ===
      0
  ) {
    return {
      ok:
        false,
      reason:
        'No hay un pedido armado.',
    };
  }

  const readiness =
    await evaluateDraftReadiness(
      draft,
    );

  if (
    !readiness
      .readyToConfirm
  ) {
    return {
      ok:
        false,
      blocked:
        true,
      reason:
        'El pedido todavía no está listo para confirmarse.',
      readiness,
      draftId:
        draft.id,
    };
  }

  const customerName =
    String(
      draft.customer_name ??
      '',
    ).trim();

  const customerPhone =
    normalizePhone(
      draft.customer_phone,
    );

  if (!customerName) {
    return {
      ok:
        false,
      blocked:
        true,
      reason:
        'Falta el nombre del cliente antes de confirmar.',
      missing:
        'customer_name',
      draftId:
        draft.id,
    };
  }

  if (
    customerPhone.length !==
    10
  ) {
    return {
      ok:
        false,
      blocked:
        true,
      reason:
        'Falta un teléfono válido de exactamente 10 dígitos antes de confirmar.',
      missing:
        'customer_phone',
      draftId:
        draft.id,
    };
  }

  const fulfillmentType =
    draft.fulfillment_type;

  if (
    fulfillmentType !==
      'pickup' &&
    fulfillmentType !==
      'delivery'
  ) {
    return {
      ok:
        false,
      blocked:
        true,
      reason:
        'Falta elegir si el pedido es para recoger o a domicilio.',
      missing:
        'fulfillment_type',
      draftId:
        draft.id,
    };
  }

  const businessStatus =
    await getBusinessStatus();

  if (
    fulfillmentType ===
      'pickup' &&
    businessStatus
      .fulfillment &&
    !businessStatus
      .fulfillment
      .pickupAvailable
  ) {
    return {
      ok:
        false,
      blocked:
        true,
      reason:
        businessStatus
          .fulfillment
          .pickupReason ||
        'La opción para recoger no está disponible en este momento.',
      nextWindow:
        businessStatus
          .fulfillment
          .pickupNextWindow,
      draftId:
        draft.id,
    };
  }

  if (
    fulfillmentType ===
    'delivery'
  ) {
    if (
      businessStatus
        .fulfillment &&
      !businessStatus
        .fulfillment
        .deliveryAvailable
    ) {
      return {
        ok:
          false,
        blocked:
          true,
        reason:
          businessStatus
            .fulfillment
            .deliveryReason ||
          'El servicio a domicilio no está disponible en este momento.',
        nextWindow:
          businessStatus
            .fulfillment
            .deliveryNextWindow,
        draftId:
          draft.id,
      };
    }

    const deliveryQuote =
      draft.delivery
        ?.quote;

    if (
      !deliveryQuote
        ?.available ||
      !Number.isFinite(
        Number(
          deliveryQuote
            ?.totalFee,
        ),
      ) ||
      !Number.isFinite(
        Number(
          draft.delivery
            ?.latitude,
        ),
      ) ||
      !Number.isFinite(
        Number(
          draft.delivery
            ?.longitude,
        ),
      )
    ) {
      return {
        ok:
          false,
        blocked:
          true,
        reason:
          'El domicilio todavía no tiene una cotización de entrega válida. Valida la dirección antes de confirmar.',
        draftId:
          draft.id,
      };
    }
  }

  if (
    settings
      .require_explicit_confirmation
  ) {
    const lastUserMessage =
      await getLastUserMessage(
        conversationId,
      );

    if (
      !isExplicitOrderConfirmation(
        lastUserMessage,
      )
    ) {
      return {
        ok:
          false,
        blocked:
          true,
        reason:
          'Necesito una confirmación explícita del cliente antes de crear el pedido.',
        confirmationRequired:
          true,
        draftId:
          draft.id,
      };
    }
  }

  if (
    !settings
      .order_creation_enabled
  ) {
    await admin
      .from(
        'ai_order_drafts',
      )
      .update({
        status:
          'awaiting_confirmation',
      })
      .eq(
        'id',
        draft.id,
      );

    return {
      ok:
        false,
      blocked:
        true,
      reason:
        'La creación real de pedidos está deshabilitada. El borrador quedó listo para revisión humana.',
      draftId:
        draft.id,
    };
  }

  const rpcItems =
    buildWebOrderItems(
      draft.items,
    );

  const rpcDelivery =
    buildWebOrderDelivery(
      draft,
    );

  const {
    data: orderId,
    error:
      orderError,
  } =
    await admin.rpc(
      'create_web_order',
      {
        p_items:
          rpcItems,
        p_delivery:
          rpcDelivery,
        p_client_request_id:
          draft.id,
        p_customer_name:
          customerName,
        p_customer_phone:
          customerPhone,
        p_fulfillment_type:
          fulfillmentType,
      },
    );

  if (orderError) {
    throw orderError;
  }

  if (
    !orderId ||
    typeof orderId !==
      'string'
  ) {
    throw new Error(
      'create_web_order no devolvió un identificador de pedido válido.',
    );
  }

  const confirmedAt =
    new Date()
      .toISOString();

  const {
    error:
      draftUpdateError,
  } =
    await admin
      .from(
        'ai_order_drafts',
      )
      .update({
        status:
          'converted',
        explicit_confirmation_at:
          confirmedAt,
        order_id:
          orderId,
      })
      .eq(
        'id',
        draft.id,
      );

  if (draftUpdateError) {
    throw draftUpdateError;
  }

  const {
    error:
      conversationUpdateError,
  } =
    await admin
      .from(
        'ai_order_conversations',
      )
      .update({
        status:
          'completed',
        customer_name:
          customerName,
        customer_phone:
          customerPhone,
        updated_at:
          confirmedAt,
      })
      .eq(
        'id',
        conversationId,
      );

  if (
    conversationUpdateError
  ) {
    throw conversationUpdateError;
  }

  const trackingCode =
    getOrderTrackingCodeFromId(
      orderId,
    );

  const {
    data:
      createdOrder,
    error:
      createdOrderError,
  } =
    await admin
      .from(
        'orders',
      )
      .select(
        'total',
      )
      .eq(
        'id',
        orderId,
      )
      .maybeSingle();

  if (
    createdOrderError
  ) {
    console.warn(
      'No se pudo consultar el total final del pedido creado:',
      createdOrderError,
    );
  }

  return {
    ok:
      true,
    created:
      true,
    orderId,
    trackingCode,
    draftId:
      draft.id,
    fulfillmentType,
    customerName,
    total:
      Number(
        createdOrder?.total ??
        draft.estimated_total ??
        0,
      ),
  };
}

const tools = [
  {
    type: 'function', name: 'search_menu',
    description: 'Busca productos reales disponibles con coincidencia flexible por nombre, descripción, categoría y presentación. Para listar una categoría completa usa list_menu_category.',
    parameters: { type: 'object', properties: { query: { type: 'string' }, limit: { type: 'integer', minimum: 1, maximum: 50 } }, required: ['query', 'limit'], additionalProperties: false },
    strict: true,
  },
  {
    type: 'function', name: 'list_menu_category',
    description: 'Lista todos los productos disponibles de una categoría o familia del menú, por ejemplo alitas, papas, boneless, hamburguesas o bebidas. Úsala cuando el cliente pregunte qué presentaciones u opciones existen.',
    parameters: { type: 'object', properties: { category_query: { type: 'string' } }, required: ['category_query'], additionalProperties: false },
    strict: true,
  },
  {
    type: 'function', name: 'get_active_promotions',
    description: 'Consulta las promociones vigentes reales de DorianCore: descuentos de modificador, promociones por cantidad, precios especiales, descuentos por monto y programas de cupones activos.',
    parameters: { type: 'object', properties: {}, required: [], additionalProperties: false },
    strict: true,
  },
  {
    type: 'function', name: 'get_product_details',
    description: 'Obtiene precio, descripción y modificadores válidos de un producto.',
    parameters: { type: 'object', properties: { product_id: { type: 'string' } }, required: ['product_id'], additionalProperties: false },
    strict: true,
  },
  {
    type: 'function', name: 'get_combo_configuration',
    description: 'Obtiene la receta real de un combo, sus componentes, opciones válidas, modificadores requeridos y métodos de cocción. Debes usarla antes de agregar o modificar cualquier combo.',
    parameters: {
      type: 'object',
      properties: {
        product_id: { type: 'string' },
      },
      required: ['product_id'],
      additionalProperties: false,
    },
    strict: true,
  },
  {
    type: 'function',
    name: 'lookup_recent_orders',
    description: 'Consulta hasta 5 pedidos recientes reales asociados a un teléfono de 10 dígitos. Devuelve productos, cantidades, notas, modificadores, componentes de combo, modalidad, total histórico y trackingCode. Úsala para responder "¿qué pedí la última vez?", "quiero lo mismo", "mi pedido anterior" o para ofrecer repetir un pedido reciente. Los precios y disponibilidad históricos NO son autoridad para un pedido nuevo.',
    parameters: {
      type: 'object',
      properties: {
        phone: {
          type: 'string',
          description: 'Teléfono mexicano de 10 dígitos.',
        },
        limit: {
          type: 'integer',
          minimum: 1,
          maximum: 5,
          description: 'Cantidad máxima de pedidos recientes. Usa 3 por defecto.',
        },
      },
      required: ['phone', 'limit'],
      additionalProperties: false,
    },
    strict: true,
  },
  {
    type: 'function',
    name: 'lookup_customer_addresses',
    description: 'Busca domicilios guardados o el último domicilio usado por un cliente a partir de un teléfono válido de 10 dígitos. Úsala cuando el pedido será a domicilio y el cliente ya proporcionó su teléfono. Una dirección recuperada nunca debe usarse sin que el cliente la acepte explícitamente.',
    parameters: {
      type: 'object',
      properties: {
        phone: {
          type: 'string',
          description: 'Teléfono mexicano de 10 dígitos.',
        },
      },
      required: ['phone'],
      additionalProperties: false,
    },
    strict: true,
  },
  {
    type: 'function',
    name: 'lookup_customer_context',
    description: 'Busca contexto básico de un cliente usando un teléfono mexicano válido de 10 dígitos. Devuelve nombre sugerido, si existe cuenta web y vínculo con Rewards. Úsala cuando el cliente proporcione un teléfono válido y todavía necesites identificarlo. El nombre recuperado es una sugerencia: no sobrescribas un nombre que el cliente haya dado explícitamente.',
    parameters: {
      type: 'object',
      properties: {
        phone: {
          type: 'string',
          description: 'Teléfono de 10 dígitos.',
        },
      },
      required: ['phone'],
      additionalProperties: false,
    },
    strict: true,
  },
  {
    type: 'function',
    name: 'lookup_order_by_tracking',
    description: 'Consulta un pedido real usando su código público de seguimiento de 8 caracteres (#XXXXXXXX). Reutiliza el mismo RPC de seguimiento que la web. Úsala aunque la conversación actual no sea la que creó el pedido.',
    parameters: {
      type: 'object',
      properties: {
        tracking_code: {
          type: 'string',
          description: 'Código de pedido de 8 caracteres, con o sin #.',
        },
      },
      required: ['tracking_code'],
      additionalProperties: false,
    },
    strict: true,
  },
  {
    type: 'function',
    name: 'lookup_active_orders_by_phone',
    description: 'Busca hasta 5 pedidos activos recientes asociados exactamente a un teléfono de 10 dígitos. Úsala cuando el cliente quiera saber cómo va su pedido pero no tenga o no recuerde el código. Devuelve solo pedidos pendientes, en preparación, listos o en camino.',
    parameters: {
      type: 'object',
      properties: {
        phone: {
          type: 'string',
          description: 'Teléfono mexicano de 10 dígitos.',
        },
      },
      required: ['phone'],
      additionalProperties: false,
    },
    strict: true,
  },
  {
    type: 'function',
    name: 'get_current_order_editability',
    description: 'Consulta qué cambios seguros están permitidos en la orden real creada en esta misma conversación según su estado actual. Devuelve items ordenados y allowedChanges. Úsala antes de intentar corregir notas o referencias de entrega después de crear el pedido.',
    parameters: {
      type: 'object',
      properties: {},
      required: [],
      additionalProperties: false,
    },
    strict: true,
  },
  {
    type: 'function',
    name: 'update_current_order_safe_field',
    description: 'Aplica un cambio post-pedido limitado que NO altera precio ni composición. Tipos permitidos por backend: item_note solo en pending; delivery_references en pedidos delivery pending/preparing/ready/on_the_way. Cualquier otro cambio se bloquea y deriva a humano.',
    parameters: {
      type: 'object',
      properties: {
        change_type: {
          type: 'string',
          enum: [
            'item_note',
            'delivery_references'
          ],
        },
        item_position: {
          type: ['integer', 'null'],
          minimum: 1,
          description: 'Posición 1-based del producto. Obligatoria solo para item_note.',
        },
        value: {
          type: 'string',
          minLength: 1,
          maxLength: 500,
        },
      },
      required: [
        'change_type',
        'item_position',
        'value'
      ],
      additionalProperties: false,
    },
    strict: true,
  },
  {
    type: 'function',
    name: 'check_current_order_cancellation',
    description: 'Evalúa si la orden REAL creada en esta misma conversación puede cancelarse automáticamente. Revisa estado actual y si ya existe pago. Úsala antes de cancelar cuando el cliente pregunte si puede cancelar o cuando necesites explicar por qué requiere atención humana.',
    parameters: {
      type: 'object',
      properties: {},
      required: [],
      additionalProperties: false,
    },
    strict: true,
  },
  {
    type: 'function',
    name: 'cancel_current_order',
    description: 'Cancela de forma REAL la orden creada en esta misma conversación. Úsala solo cuando el cliente haya pedido claramente cancelar su pedido. El backend únicamente permite pending/preparing sin pago; cualquier caso avanzado o pagado se bloquea y solicita atención humana.',
    parameters: {
      type: 'object',
      properties: {
        reason: {
          type: 'string',
          description: 'Motivo breve de cancelación expresado por el cliente o un resumen neutral.',
        },
      },
      required: ['reason'],
      additionalProperties: false,
    },
    strict: true,
  },
  {
    type: 'function',
    name: 'get_current_order_eta',
    description: 'Calcula una estimación operativa del tiempo restante de la orden creada en esta conversación usando estado real, timestamps y tiempos configurados. No es una promesa exacta. Úsala para "¿cuánto falta?", "¿cuánto tarda?", "¿a qué hora llega?" o equivalentes.',
    parameters: {
      type: 'object',
      properties: {},
      required: [],
      additionalProperties: false,
    },
    strict: true,
  },
  {
    type: 'function',
    name: 'get_current_order_status',
    description: 'Consulta el estado REAL de la orden ya creada en esta conversación. Devuelve trackingCode, estado, modalidad, total, nombre del repartidor si ya está asignado y última actualización. Úsala para preguntas como "¿ya está?", "¿ya salió?", "¿quién lo lleva?", "¿cómo va mi pedido?" o "¿cuánto falta?". No inventa ETA.',
    parameters: {
      type: 'object',
      properties: {},
      required: [],
      additionalProperties: false,
    },
    strict: true,
  },
  {
    type: 'function', name: 'get_business_status',
    description: 'Consulta configuración general de pedidos, recoger y domicilio.',
    parameters: { type: 'object', properties: {}, required: [], additionalProperties: false },
    strict: true,
  },
  {
    type: 'function', name: 'quote_delivery',
    description: 'Valida una dirección con Google Maps y calcula cobertura y costo real de reparto usando DorianCore. Úsala antes de guardar cualquier pedido a domicilio.',
    parameters: {
      type: 'object',
      properties: {
        address: { type: 'string' },
        postal_code: { type: ['string', 'null'] },
      },
      required: ['address', 'postal_code'],
      additionalProperties: false,
    },
    strict: true,
  },
  {
    type: 'function', name: 'update_draft',
    description: 'Reemplaza el borrador actual con los productos y datos confirmados hasta ahora. Solo usa IDs obtenidos de herramientas.',
    parameters: {
      type: 'object',
      properties: {
        customer_name: { type: ['string', 'null'] },
        customer_phone: { type: ['string', 'null'] },
        fulfillment_type: { type: ['string', 'null'], enum: ['pickup', 'delivery', null] },
        delivery: {
          anyOf: [
            { type: 'null' },
            {
              type: 'object',
              properties: {
                street: { type: ['string', 'null'] },
                exteriorNumber: { type: ['string', 'null'] },
                interiorNumber: { type: ['string', 'null'] },
                neighborhood: { type: ['string', 'null'] },
                postalCode: { type: ['string', 'null'] },
                deliveryReferences: { type: ['string', 'null'] },
                latitude: { type: ['number', 'null'] },
                longitude: { type: ['number', 'null'] },
              },
              required: ['street', 'exteriorNumber', 'interiorNumber', 'neighborhood', 'postalCode', 'deliveryReferences', 'latitude', 'longitude'],
              additionalProperties: false,
            },
          ],
        },
        items: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              product_id: { type: 'string' },
              quantity: { type: 'integer', minimum: 1, maximum: 50 },
              notes: { type: 'string' },
              modifier_ids: { type: 'array', items: { type: 'string' } },
              combo_components: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    slot_id: { type: 'string' },
                    product_id: { type: 'string' },
                    notes: { type: 'string' },
                    modifier_ids: {
                      type: 'array',
                      items: { type: 'string' },
                    },
                    cooking_method: {
                      type: ['string', 'null'],
                      enum: ['oil', 'air_fryer', null],
                    },
                  },
                  required: ['slot_id', 'product_id', 'notes', 'modifier_ids', 'cooking_method'],
                  additionalProperties: false,
                },
              },
            },
            required: ['product_id', 'quantity', 'notes', 'modifier_ids', 'combo_components'],
            additionalProperties: false,
          },
        },
      },
      required: ['customer_name', 'customer_phone', 'fulfillment_type', 'delivery', 'items'],
      additionalProperties: false,
    },
    strict: true,
  },
  {
    type: 'function', name: 'get_order_summary',
    description: 'Obtiene el borrador actual, sus items EN ORDEN, total recalculado y readiness.readyToConfirm. Úsala antes de interpretar referencias relativas, antes de corregir parcialmente el pedido y OBLIGATORIAMENTE justo antes de pedir la confirmación final. Si readiness.readyToConfirm=false, no pidas confirmación: resuelve missingFields o blockingReasons.',
    parameters: { type: 'object', properties: {}, required: [], additionalProperties: false },
    strict: true,
  },
  {
    type: 'function',
    name: 'cancel_draft',
    description: 'Cancela el borrador y cierra la conversación cuando el cliente claramente diga que ya no quiere continuar o que desea cancelar antes de que exista una orden real. No la uses para quitar un solo producto.',
    parameters: {
      type: 'object',
      properties: {
        reason: {
          type: 'string',
        },
      },
      required: ['reason'],
      additionalProperties: false,
    },
    strict: true,
  },
  {
    type: 'function', name: 'request_human',
    description: 'Pide intervención humana si el cliente lo solicita o si el pedido no puede resolverse con seguridad.',
    parameters: { type: 'object', properties: { reason: { type: 'string' } }, required: ['reason'], additionalProperties: false },
    strict: true,
  },
  {
    type: 'function', name: 'confirm_order',
    description: 'Crea la orden real cuando order_creation_enabled=true. Úsala únicamente después de que get_order_summary haya devuelto readiness.readyToConfirm=true, hayas mostrado el resumen final una sola vez y el cliente lo haya confirmado afirmativamente sin pedir cambios.',
    parameters: { type: 'object', properties: {}, required: [], additionalProperties: false },
    strict: true,
  },
];

function formatToolError(
  error: unknown,
): string {
  if (
    error instanceof Error
  ) {
    return error.message;
  }

  if (
    error &&
    typeof error ===
      'object'
  ) {
    const candidate =
      error as
        Record<
          string,
          unknown
        >;

    const message =
      candidate.message;

    const details =
      candidate.details;

    const hint =
      candidate.hint;

    const code =
      candidate.code;

    const parts =
      [
        typeof message ===
          'string'
          ? message
          : null,
        typeof details ===
          'string' &&
        details
          ? `Detalles: ${details}`
          : null,
        typeof hint ===
          'string' &&
        hint
          ? `Hint: ${hint}`
          : null,
        typeof code ===
          'string' &&
        code
          ? `Código: ${code}`
          : null,
      ].filter(
        Boolean,
      );

    if (
      parts.length >
      0
    ) {
      return parts.join(
        ' | ',
      );
    }

    try {
      return JSON.stringify(
        error,
      );
    } catch {
      return '[Error no serializable]';
    }
  }

  return String(
    error,
  );
}

async function runTool(conversationId: string, call: ToolCall, settings: Settings) {
  const started = performance.now();
  let args: any = {};
  try { args = JSON.parse(call.arguments || '{}'); } catch { throw new Error('Argumentos de herramienta inválidos.'); }

  try {
    /*
     * MODO POST-PEDIDO:
     * una conversación completed puede seguir viva para consultas,
     * pero no puede mutar la orden ni el borrador.
     */
    const {
      data:
        conversationState,
      error:
        conversationStateError,
    } =
      await admin
        .from(
          'ai_order_conversations',
        )
        .select(
          'status',
        )
        .eq(
          'id',
          conversationId,
        )
        .maybeSingle();

    if (
      conversationStateError
    ) {
      throw conversationStateError;
    }

    if (
      conversationState
        ?.status ===
        'completed'
    ) {
      const allowedPostOrderTools =
        new Set([
          'get_current_order_status',
          'get_current_order_eta',
          'get_current_order_editability',
          'update_current_order_safe_field',
          'check_current_order_cancellation',
          'cancel_current_order',
          'lookup_order_by_tracking',
          'lookup_active_orders_by_phone',
          'request_human',
        ]);

      if (
        !allowedPostOrderTools
          .has(
            call.name,
          )
      ) {
        const blockedResult = {
          ok:
            false,
          blocked:
            true,
          postOrderMode:
            true,
          reason:
            'La orden ya fue creada. Esta conversación está en modo seguimiento y no puede modificar el pedido.',
        };

        await admin
          .from(
            'ai_order_tool_runs',
          )
          .insert({
            conversation_id:
              conversationId,
            tool_name:
              call.name,
            arguments:
              args,
            result:
              blockedResult,
            succeeded:
              true,
            duration_ms:
              Math.round(
                performance.now() -
                started,
              ),
          });

        return blockedResult;
      }
    }

    let result: unknown;
    switch (call.name) {
      case 'search_menu': result = await searchMenu(args.query ?? '', args.limit ?? 20); break;
      case 'list_menu_category': result = await listMenuCategory(args.category_query ?? ''); break;
      case 'get_active_promotions': result = await getActivePromotions(); break;
      case 'get_product_details': result = await getProductDetails(args.product_id); break;
      case 'get_combo_configuration': result = await getComboConfiguration(args.product_id); break;
      case 'lookup_customer_context': result = await lookupCustomerContext(conversationId, args.phone); break;
      case 'lookup_customer_addresses': result = await lookupCustomerAddresses(conversationId, args.phone); break;
      case 'lookup_recent_orders': result = await lookupRecentOrders(conversationId, args.phone, args.limit); break;
      case 'get_current_order_status': result = await getCurrentOrderStatus(conversationId); break;
      case 'get_current_order_eta': result = await getCurrentOrderEta(conversationId, settings); break;
      case 'get_current_order_editability': result = await getCurrentOrderSafeEditContext(conversationId); break;
      case 'update_current_order_safe_field': result = await updateCurrentOrderSafeField(conversationId, args); break;
      case 'check_current_order_cancellation': result = await getCurrentOrderCancellationEligibility(conversationId); break;
      case 'cancel_current_order': result = await cancelCurrentOrderSafely(conversationId, args.reason); break;
      case 'lookup_order_by_tracking': result = await lookupOrderByTracking(args.tracking_code); break;
      case 'lookup_active_orders_by_phone': result = await lookupActiveOrdersByPhone(args.phone); break;
      case 'get_business_status': result = await getBusinessStatus(); break;
      case 'quote_delivery': result = await quoteDeliveryAddress(args.address ?? '', args.postal_code ?? null); break;
      case 'update_draft': result = await updateDraft(conversationId, args); break;
      case 'get_order_summary': result = await getDraft(conversationId); break;
      case 'cancel_draft': result = await cancelDraft(conversationId, args.reason); break;
      case 'request_human': result = await requestHuman(conversationId, args.reason); break;
      case 'confirm_order': result = await confirmOrder(conversationId, settings); break;
      default: throw new Error(`Herramienta no permitida: ${call.name}`);
    }

    await admin.from('ai_order_tool_runs').insert({
      conversation_id: conversationId, tool_name: call.name, arguments: args,
      result, succeeded: true, duration_ms: Math.round(performance.now() - started),
    });
    return result;
  } catch (error) {
    const message =
      formatToolError(
        error,
      );

    console.error(
      `AI tool ${call.name} failed:`,
      error,
    );

    await admin.from('ai_order_tool_runs').insert({
      conversation_id: conversationId, tool_name: call.name, arguments: args,
      succeeded: false, error_message: message, duration_ms: Math.round(performance.now() - started),
    });
    return { error: message };
  }
}

function extractText(response: any): string {
  if (typeof response?.output_text === 'string' && response.output_text.trim()) return response.output_text.trim();
  const parts: string[] = [];
  for (const item of response?.output ?? []) {
    if (item?.type !== 'message') continue;
    for (const content of item.content ?? []) {
      if ((content?.type === 'output_text' || content?.type === 'text') && typeof content.text === 'string') parts.push(content.text);
    }
  }
  return parts.join('\n').trim();
}

async function callOpenAI(payload: Record<string, unknown>) {
  if (!OPENAI_API_KEY) throw new Error('OPENAI_API_KEY no está configurada en Supabase Secrets.');
  const response = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: { Authorization: `Bearer ${OPENAI_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = await response.json();
  if (!response.ok) {
    console.error('OpenAI error:', data);
    throw new Error(data?.error?.message ?? 'No se pudo consultar el modelo.');
  }
  return data;
}

function buildInstructions(settings: Settings) {
  return `Eres Dorian AI Orders, asistente de pedidos del negocio conectado a DorianCore POS.
Habla en español natural, breve y amable.
REGLAS OBLIGATORIAS:
- DorianCore es la única fuente de verdad para productos, disponibilidad, modificadores y precios.
- DISPONIBILIDAD ANTES DEL PEDIDO: en el primer mensaje de cada conversación, el backend valida obligatoriamente si hay servicio para recoger, domicilio, ambos o ninguno. Usa el contexto de validación inicial que recibas y no permitas que el cliente arme un pedido para una modalidad no disponible.
- Si solo hay recoger, trabaja únicamente con pickup y no preguntes por domicilio. Si solo hay domicilio, trabaja únicamente con delivery y no preguntes por recoger. Si están ambos, puedes ofrecer ambos cuando sea necesario. Si no hay ninguno, el flujo debe terminar sin armar pedido.
- Nunca inventes productos, precios, promociones, horarios ni opciones.
- Busca el producto antes de agregarlo y consulta detalles cuando necesites modificadores.
- search_menu es flexible, pero si el cliente pregunta por todas las opciones, presentaciones o productos de una familia usa list_menu_category. No concluyas que algo no existe tras una sola búsqueda estrecha: prueba una búsqueda más amplia o lista la categoría correspondiente.
- Si el cliente pregunta por promociones, descuentos, ofertas o qué conviene comprar, usa get_active_promotions antes de responder. Nunca afirmes que no hay promociones sin consultar esa herramienta.
- update_draft aplica automáticamente las promociones vigentes al total estimado. Usa get_order_summary para consultar el desglose de descuentos; no calcules descuentos ni totales mentalmente.
- Si get_product_details indica combo.requiresConfiguration=true, usa get_combo_configuration. Debes completar exactamente cada componente del combo con una opción válida antes de update_draft.
- Para combos, pregunta solo por la siguiente decisión faltante: opción del componente, modificadores obligatorios o método de cocción. No inventes componentes ni sustituciones.
- Los sabores de bebida son modificadores normales. Si una opción tiene un modifierGroup con code='drink_flavor', trata ese grupo como la selección de sabor y envía el modifier.id elegido dentro de modifier_ids.
- En update_draft envía combo_components estructurados con slot_id, product_id, modifier_ids, notes y cooking_method. Si el cliente cambia un componente, reconstruye el combo completo conservando los demás componentes confirmados.
- Si el cliente pide domicilio, solicita una dirección suficientemente completa y usa quote_delivery antes de guardar el domicilio.
- Nunca inventes coordenadas, cobertura ni costo de envío. Usa exactamente el resultado de quote_delivery.
- Después de quote_delivery, copia sus campos address al objeto delivery de update_draft.
- El total estimado de update_draft ya incluye la tarifa real de entrega cuando el domicilio fue validado; no sumes nada por tu cuenta.
- Conserva notas como "sin tocino" como notes cuando no exista un modificador estructurado apropiado.
- FASE 3 / CONTEXTO DEL CLIENTE: cuando el cliente proporcione un teléfono válido de 10 dígitos y todavía no haya dado un nombre explícito, usa lookup_customer_context ANTES de pedirle su nombre.
- Si lookup_customer_context devuelve found=true y suggestedName, trátalo únicamente como sugerencia histórica. Pregunta de forma breve, por ejemplo: "Te encontré como Eduardo, ¿uso ese nombre?". No lo impongas sin confirmación.
- Si el cliente ya dio su nombre explícitamente en el mismo mensaje o antes, ese nombre tiene prioridad. Puedes consultar lookup_customer_context para contexto, pero NO preguntes de nuevo ni reemplaces el nombre aunque la BD tenga otro.
- Si lookup_customer_context devuelve found=false, continúa normalmente y pide el nombre solo cuando sea necesario.
- Si source=order_history, recuerda que el nombre procede de una compra anterior, no de una cuenta autenticada. Nunca lo presentes como identidad verificada.
- Si hasLoyalty=true, solo sabes que existe vínculo con Rewards. No inventes visitas, premios o saldo; esos datos se consultarán con herramientas específicas posteriores.
- FASE 3 / DOMICILIOS: cuando el pedido sea a domicilio, tengas un teléfono válido y el cliente NO haya dado ya una dirección explícita en esta conversación, usa lookup_customer_addresses antes de pedirle que escriba su domicilio desde cero.
- Si lookup_customer_addresses devuelve source=saved_addresses y existe defaultAddress, ofrece esa dirección de forma breve y pide aceptación, por ejemplo: "Tengo guardado Casa: Av. 1 de Mayo 598, Centro. ¿Lo mando ahí?".
- Si hay varias direcciones guardadas y ninguna fue elegida explícitamente, muestra como máximo 3 opciones identificables por label o calle y deja que el cliente elija. No selecciones silenciosamente una dirección.
- Si source=recent_delivery_history, NO digas "domicilio guardado". Di algo como "La última vez lo enviamos a..." y pregunta si quiere usar esa dirección.
- Si el cliente proporciona una dirección nueva en el mensaje actual, esa dirección tiene prioridad y NO debes ofrecer primero una dirección histórica.
- Nunca copies una dirección recuperada al borrador hasta que el cliente la acepte explícitamente.
- Una vez aceptada una dirección recuperada que ya tiene latitude y longitude, vuelve a cotizarla mediante quote_delivery o mediante la validación de delivery del borrador antes de confirmar. Nunca reutilices un costo de envío histórico.
- Si la dirección guardada carece de coordenadas o la cotización actual falla, valida nuevamente la dirección con quote_delivery.
- No muestres customerId ni IDs internos de domicilios al cliente.
- FASE 3 / HISTORIAL: si el cliente pregunta qué pidió antes, dice "lo mismo de la vez pasada", "mi pedido anterior", "repite mi último pedido" o equivalente, usa lookup_recent_orders con su teléfono válido.
- Si lookup_recent_orders devuelve latestOrder, puedes resumirlo brevemente usando nombres, cantidades, notas y modificadores relevantes. No muestres orderId interno; si necesitas identificarlo usa trackingCode con formato #XXXXXXXX.
- Si el cliente todavía NO pidió repetir nada y solo estamos identificándolo, puedes ofrecer una sola vez "¿Quieres lo mismo de la vez pasada?" únicamente cuando exista latestOrder y el borrador actual todavía no tenga productos. No lo ofrezcas en cada turno.
- NUNCA copies automáticamente un pedido histórico al borrador sin aceptación explícita del cliente.
- Cuando el cliente acepte repetir un pedido anterior, reconstruye el pedido usando los productId/modifierId/component productId históricos como referencia, pero vuelve a validar contra el catálogo actual antes de update_draft. Para productos o combos usa get_product_details/get_combo_configuration cuando sea necesario.
- Si un producto histórico ya no existe, está inactivo o no está disponible, no lo inventes ni lo agregues. Informa cuál ya no está disponible y ofrece alternativas reales mediante search_menu/list_menu_category.
- Si un modificador histórico ya no está disponible, no lo agregues silenciosamente. Informa de forma breve y permite elegir otra opción válida.
- El total, precios y promociones de un pedido histórico son SOLO referencia. Un pedido repetido siempre debe recalcular precios y promociones actuales con update_draft/get_order_summary.
- La modalidad histórica tampoco se impone. Si el cliente quiere repetir a domicilio, el domicilio debe aceptarse nuevamente y cotizarse con costo actual. Si quiere recoger, valida disponibilidad actual.
- Si el cliente dice "el segundo de mis últimos pedidos", usa orders[position=2] de lookup_recent_orders. Si la referencia es ambigua, muestra hasta 3 pedidos recientes con fecha/trackingCode y resumen corto.
- No repitas automáticamente un pedido que tenga status claramente cancelado si el historial lo devuelve. Si el status parece no utilizable, muestra el historial pero no lo ofrezcas como repetición automática.
- FASE 4 / POST-PEDIDO: una conversación completed ya no está cerrada para lectura; entra en modo seguimiento. En ese modo usa get_current_order_status para responder sobre el pedido creado.
- En modo post-pedido NO intentes search_menu, update_draft, get_order_summary, quote_delivery, cancel_draft, confirm_order ni ninguna herramienta que cambie o reconstruya el pedido. El backend también lo bloquea.
- Para "¿ya está?", responde según statusLabel real.
- Para "¿ya salió?" en delivery: on_the_way significa que sí va en camino; pending/preparing/ready significa que todavía no está en camino.
- Para "¿quién lo lleva?", menciona driverName solo si driverAssigned=true y driverName existe. Si todavía no hay repartidor asignado, dilo claramente.
- Para "¿cuánto falta?", usa ETA solo si la herramienta devuelve eta.available=true. Si eta.available=false, explica brevemente que todavía no hay un tiempo exacto disponible; NO inventes minutos.
- Si status=ready y fulfillmentType=pickup, indica que ya está listo para recoger.
- Si status=ready y fulfillmentType=delivery, indica que está listo para reparto pero aún no necesariamente va en camino.
- Si status=cancelled, informa que el pedido fue cancelado. No prometas reactivarlo.
- Si status=delivered, informa que ya aparece como entregado.
- Si el cliente intenta agregar/quitar/cambiar algo después de creada la orden, indícale que esa orden ya no puede modificarse desde este chat y que debe iniciar un pedido nuevo o pedir apoyo humano si corresponde.
- FASE 4 / SEGUIMIENTO EXTERNO: si el cliente proporciona un código #XXXXXXXX o dice "pedido XXXXXXXX", usa lookup_order_by_tracking aunque este chat no haya creado esa orden.
- Normaliza mentalmente el #; la herramienta acepta código con o sin #. No pidas teléfono si ya proporcionó un código válido.
- Si el cliente no tiene código pero proporciona un teléfono válido y pregunta por un pedido activo, usa lookup_active_orders_by_phone.
- Si lookup_active_orders_by_phone devuelve exactamente un pedido, responde directamente con ese pedido.
- Si devuelve varios pedidos activos, NO adivines cuál es. Muestra como máximo 3 opciones usando trackingCode, modalidad, estado y hora/fecha de creación, y pregunta cuál quiere consultar.
- Si no hay pedidos activos con ese teléfono, dilo claramente. Puedes sugerir usar el código de 8 caracteres si tiene uno. No inventes pedidos entregados o cancelados como activos.
- El teléfono solo sirve aquí para LOCALIZAR pedidos de seguimiento. No concede permiso para modificar, cancelar ni revelar datos sensibles.
- No muestres orderId UUID, customerId, dirección completa ni teléfono completo en respuestas de seguimiento. Usa trackingCode público.
- Para seguimiento por código o teléfono aplica las mismas reglas de estado de get_current_order_status: no inventes ETA y no digas que va en camino salvo status=on_the_way.
- FASE 4 / CANCELACIÓN POST-PEDIDO: solo puedes cancelar automáticamente la orden creada EN ESTA MISMA conversación usando cancel_current_order.
- Si el cliente dice claramente "cancela mi pedido", "ya no lo quiero", "cancélalo" o equivalente respecto a la orden actual, usa cancel_current_order. No confundas esto con cancel_draft: cancel_draft es únicamente para borradores ANTES de crear una orden.
- cancel_current_order solo puede completar la cancelación automática cuando el pedido está pending o preparing Y no existe pago registrado.
- Si está ready, on_the_way, delivered, ya pagado o el backend devuelve requiresHuman=true, NO digas que fue cancelado. Informa que requiere atención del negocio y deja que request_human continúe el caso.
- Si el pedido ya está cancelled, simplemente informa que ya está cancelado.
- Si el pedido fue localizado por lookup_order_by_tracking o lookup_active_orders_by_phone en una conversación distinta, NO lo canceles automáticamente aunque esté pending. El seguimiento externo sigue siendo solo lectura; para cancelar un pedido externo usa request_human.
- Nunca elimines order_payments ni simules reembolsos. Un pedido pagado siempre requiere humano en esta fase.
- Después de cancel_current_order con cancelled=true, cualquier consulta posterior de estado debe reflejar status=cancelled.
- FASE 4 / CAMBIOS POST-PEDIDO: después de crear una orden, los únicos cambios automáticos permitidos son los que get_current_order_editability incluya en allowedChanges.
- item_note significa corregir/agregar una nota de preparación de un producto EXISTENTE. Solo se permite mientras status=pending. Antes de aplicarla llama get_current_order_editability para resolver la posición exacta del producto. No cambies nombre de producto, cantidad ni modificadores mediante una nota.
- delivery_references significa únicamente referencias descriptivas para encontrar el domicilio, por ejemplo "portón negro", "tocar el timbre de arriba" o "frente a la farmacia". No significa cambiar calle, número, colonia, coordenadas ni domicilio.
- delivery_references puede actualizarse solo si el backend la ofrece en allowedChanges. Aun cuando esté on_the_way, nunca conviertas una nueva dirección en una simple referencia.
- Si el cliente pide agregar/quitar productos, cambiar cantidades, sabor, carne, modificadores, combo, total, modalidad pickup/delivery, calle, número, colonia, ubicación o cualquier dato que pueda alterar precio/ruta/composición, NO uses update_current_order_safe_field. Usa request_human.
- Si el cliente pide cambiar una nota de cocina y status ya es preparing/ready/on_the_way, NO la cambies automáticamente: la cocina pudo haber empezado a preparar el producto. Usa request_human.
- Si el pedido está delivered o cancelled no se permite ningún cambio post-pedido.
- Las herramientas de edición post-pedido solo pueden operar sobre la orden creada EN ESTA MISMA conversación. Pedidos localizados externamente por código o teléfono siguen siendo solo lectura.
- FASE 4 / ETA: cuando el cliente pregunte "¿cuánto falta?", "¿cuánto tarda?", "¿a qué hora llega?" o equivalente sobre la orden actual, usa get_current_order_eta. No calcules tiempos tú mismo.
- Si get_current_order_eta devuelve available=true y exact=false, expresa SIEMPRE un rango aproximado ("entre X y Y minutos") y aclara de forma breve que es estimado. Nunca prometas una hora exacta.
- Si devuelve exact=true con 0 minutos, informa que ya está listo.
- Si la estimación da 0-5 minutos, evita frases absolutas como "ya llega"; usa "debería estar prácticamente listo/en llegar según la estimación".
- Si available=false, responde con el estado real y explica que no hay una estimación confiable disponible.
- El ETA configurado es operativo: preparación + trayecto + margen. El estado real siempre tiene prioridad sobre la estimación.
- CIERRE DE POSTVENTA: si status=delivered, la conversación queda únicamente para informar que ya fue entregado o solicitar apoyo humano por un problema. No intentes editar, cancelar ni reabrir esa orden.
- Si status=cancelled, la conversación queda únicamente para informar la cancelación o solicitar apoyo humano. No intentes reactivar la orden.
- Si después de delivered/cancelled el cliente quiere comprar algo nuevo, indícale que debe iniciar un pedido nuevo; no reutilices la orden terminal.
- No muestres customerId, loyaltyCustomerId ni identificadores internos al cliente.
- FASE 2 / LENGUAJE NATURAL: interpreta el mensaje completo antes de preguntar. Un cliente puede dar productos, notas, nombre, teléfono, modalidad y dirección en una sola frase; aprovecha todo lo que ya haya dicho.
- REFERENCIAS RELATIVAS: si el cliente dice "la primera", "la segunda", "la otra", "esa", "esas", "las dos", "la anterior", "la de pollo", "la de res" o una referencia similar a productos ya agregados, usa get_order_summary ANTES de update_draft y resuelve la referencia contra los items actuales en su orden. No reconstruyas el pedido desde cero.
- Si una referencia puede señalar inequívocamente a un solo item por posición, nombre, carne, nota o contexto reciente, resuélvela sin preguntar. Si realmente puede señalar a más de uno, pregunta una aclaración corta mostrando solo las opciones ambiguas.
- CORRECCIONES NATURALES: expresiones como "no, mejor...", "cámbiala por...", "esa sin...", "la otra con...", "quita la primera", "déjame solo..." son modificaciones del borrador, no un pedido nuevo.
- Al modificar un item, conserva TODOS los demás items, cantidades, notas, modificadores, componentes de combo y datos del cliente que no hayan sido cambiados explícitamente.
- Si el cliente pide quitar solo un producto, elimina únicamente ese producto del borrador. No uses cancel_draft para eso.
- CANCELACIÓN: si el cliente claramente dice "cancela el pedido", "ya no quiero nada", "olvídalo", "mejor nada", "déjalo, ya no voy a pedir" o equivalente, usa cancel_draft. Si ya existe una orden real, no finjas cancelarla: explica que requiere el flujo de cancelación real/humano.
- PRODUCTO NO ENCONTRADO: antes de decir que algo no existe, haz como máximo dos intentos útiles: primero search_menu con el nombre del cliente y luego una búsqueda más amplia o list_menu_category si conoces la familia. Si no aparece, dilo claramente y ofrece 2-4 alternativas REALES obtenidas de herramientas; no inventes sustitutos.
- NO LOOPS: nunca repitas exactamente la misma pregunta si el cliente ya respondió. Relee el historial y el borrador antes de volver a pedir un dato.
- Si una herramienta falla, no inventes el resultado. Puedes corregir argumentos y reintentar una vez cuando haya una causa clara. Si vuelve a fallar o no sabes cómo continuar con seguridad, usa request_human.
- Si el cliente pide hablar con una persona, encargado, humano, soporte o alguien del negocio, usa request_human inmediatamente sin intentar convencerlo de continuar con la IA.
- CICLO DE VIDA: una conversación con status completed, cancelled, abandoned o awaiting_human no puede seguir modificando borradores ni crear nuevas órdenes. El backend bloquea esos estados; nunca intentes continuar un pedido cerrado.
- Después de confirm_order con created=true, la conversación queda completed. No aceptes modificaciones posteriores en ese mismo chat; un pedido nuevo debe comenzar en una conversación nueva.
- Después de cancel_draft, la conversación queda cancelled. No reconstruyas automáticamente el pedido cancelado.
- Después de request_human, la conversación queda awaiting_human. La IA debe dejar de responder operativamente hasta que un humano retome o cierre el caso.
- Si un humano devuelve posteriormente la conversación a status=active, continúa usando el historial existente como contexto. No repitas preguntas ya resueltas por el humano y no vuelvas a solicitar handoff salvo que aparezca un motivo nuevo.
- INACTIVIDAD: una conversación activa que supera el límite configurado se marca abandoned y el backend abre una conversación limpia. Nunca mezcles un pedido anterior con uno retomado después del timeout. El mensaje que reactivó al cliente debe procesarse como primer mensaje del nuevo contexto, sin pedirle que lo repita.
- Si falta información importante, pregunta una sola cosa concreta a la vez.
- No preguntes "¿recoger o domicilio?" después de cada producto o modificación. Espera a que el cliente parezca haber terminado de armar los productos, diga que eso es todo, pida cerrar/confirmar, o indique explícitamente la modalidad.
- Antes de confirm_order, asegúrate de tener nombre del cliente, teléfono de exactamente 10 dígitos, modalidad pickup/delivery y, para delivery, domicilio cotizado.
- READINESS GATE OBLIGATORIO: justo antes de mostrar el resumen final y preguntar "¿Está bien así?", llama get_order_summary y revisa readiness. Solo puedes pedir confirmación si readiness.readyToConfirm=true.
- Si readiness.readyToConfirm=false, NO muestres un resumen como final y NO preguntes si confirma. Resuelve primero missingFields y blockingReasons.
- missingFields se resuelven de forma concreta: items=armar al menos un producto; customer_name=pedir nombre; customer_phone=pedir teléfono válido de 10 dígitos; fulfillment_type=definir recoger/domicilio usando solo modalidades disponibles; delivery_quote=validar/cotizar una dirección.
- Si solo una modalidad está disponible y fulfillment_type falta, utiliza esa modalidad disponible sin hacer una pregunta innecesaria, salvo que falte información propia de esa modalidad como la dirección.
- Si blockingReasons indica que la modalidad elegida dejó de estar disponible, informa el motivo y ofrece únicamente otra modalidad que fulfillmentAvailability marque disponible. Si ninguna está disponible, no continúes el pedido.
- CONFIRMACIÓN ÚNICA: para cada versión final del pedido existe exactamente un solo punto de confirmación.
- Cuando ya estén completos productos, nombre, teléfono, modalidad y domicilio/cotización si aplica, muestra UNA sola vez un resumen breve con el total y pregunta algo natural como "¿Está bien así?" o "¿Lo dejamos así?".
- Considera válidas respuestas afirmativas naturales como "sí", "claro", "va", "dale", "está bien", "así está bien", "perfecto", "ok", "de acuerdo", "sí porfa" y equivalentes.
- Si el cliente responde afirmativamente a ese resumen y NO pide ningún cambio en el mismo mensaje, llama INMEDIATAMENTE a confirm_order. No vuelvas a resumir, no vuelvas a preguntar, no llames update_draft y no llames get_order_summary antes de confirm_order.
- Nunca pidas una segunda confirmación solo para pasar de "revisión" a "crear pedido". La confirmación natural del resumen final es suficiente para crear.
- Si el cliente modifica, corrige, agrega o quita algo después del resumen final, actualiza el borrador y entonces pide UNA nueva confirmación para esa nueva versión. Esa nueva confirmación sustituye a la anterior.
- Un cambio de nombre, teléfono, dirección, modalidad, producto, cantidad, modificador o nota invalida la confirmación anterior y permite pedir una nueva; si no hubo cambios, repetir la confirmación está prohibido.
- Si el cliente ya proporcionó nombre, teléfono, dirección o modalidad en mensajes anteriores o en el mismo mensaje inicial, reutiliza esos datos y no vuelvas a pedirlos.
- Si el cliente elige recoger, usa get_business_status para consultar pickupAvailable y pickupReason. No confundas pickup con delivery y no inventes que recoger está desactivado: usa exactamente pickupAvailable/pickupReason.
- Cuando order_creation_enabled sea false, habla de "borrador" o "listo para revisión" y nunca afirmes que crearás la orden.
- Cuando order_creation_enabled sea true, NO uses frases como "dejarlo listo para revisión". Tras la única confirmación afirmativa llama confirm_order y crea el pedido.
- Si confirm_order devuelve created=true, responde una sola vez con una confirmación breve de creación e incluye siempre el número visible devuelto en trackingCode con formato #XXXXXXXX y el total final devuelto por la herramienta. No vuelvas a pedir confirmación después de created=true.
- Si confirm_order informa que la creación está bloqueada, explica el motivo exacto y no digas que fue creado.
- Si no puedes resolver algo con seguridad o el cliente pide humano, usa request_human.
${settings.order_creation_enabled
  ? '- ESTADO ACTUAL: order_creation_enabled=true. Puedes crear pedidos reales. Después de una respuesta afirmativa al único resumen final, llama confirm_order inmediatamente y no vuelvas a pedir confirmación.'
  : '- ESTADO ACTUAL: order_creation_enabled=false. No puedes crear pedidos reales; solo deja el borrador listo para revisión.'}
${settings.system_instructions || ''}`;
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  try {
    await requireAdmin(request);
    const body = await request.json() as RequestBody;
    const message = body.message?.trim() ?? '';
    if (!message || message.length > 3000) return json({ error: 'Mensaje requerido (máximo 3000 caracteres).' }, 400);

    const settings = await getSettings();
    if (!settings.enabled) {
      return json({ error: 'Dorian AI Orders está desactivado. Actívalo en ai_order_settings cuando configures OPENAI_API_KEY.' }, 409);
    }

    let conversationId =
      await ensureConversation(
        body.conversationId,
      );

    /*
     * ========================================================
     * TIMEOUT / RECUPERACIÓN SEGURA
     * ========================================================
     *
     * Si una conversación ACTIVA quedó inactiva más tiempo
     * del configurado:
     * 1. cerramos el contexto anterior como abandoned;
     * 2. abrimos una conversación nueva;
     * 3. procesamos ESTE MISMO mensaje como primer mensaje.
     *
     * El cliente no necesita repetir nada y tampoco mezclamos
     * un pedido viejo con uno nuevo.
     */
    let lifecycleState =
      await getConversationLifecycleState(
        conversationId,
      );

    const idleTimeoutMinutes =
      Math.max(
        0,
        Number(
          settings
            .conversation_idle_timeout_minutes ??
          30,
        ),
      );

    const hadPreviousUserMessage =
      !(
        await isFirstUserMessage(
          conversationId,
        )
      );

    let recoveredFromConversationId:
      | string
      | null =
      null;

    if (
      hadPreviousUserMessage &&
      hasConversationExpired(
        lifecycleState,
        idleTimeoutMinutes,
      )
    ) {
      recoveredFromConversationId =
        conversationId;

      await abandonConversationForInactivity(
        lifecycleState,
        idleTimeoutMinutes,
      );

      conversationId =
        await createRecoveredConversation(
          recoveredFromConversationId,
        );

      lifecycleState =
        await getConversationLifecycleState(
          conversationId,
        );
    }

    /*
     * ========================================================
     * GUARD DE CICLO DE VIDA
     * ========================================================
     *
     * Nunca permitimos que el agente siga operando sobre:
     * - pedidos ya creados;
     * - borradores cancelados;
     * - conversaciones abandonadas;
     * - conversaciones entregadas a un humano.
     */
    const blockedConversationMessage =
      getBlockedConversationMessage(
        lifecycleState,
      );

    if (
      blockedConversationMessage
    ) {
      /*
       * Guardamos el mensaje entrante para auditoría,
       * pero NO llamamos OpenAI y NO ejecutamos tools.
       */
      await saveMessage(
        conversationId,
        'user',
        message,
        {
          metadata: {
            blockedByLifecycle:
              true,
            conversationStatus:
              lifecycleState.status,
          },
        },
      );

      const draft =
        await getDraft(
          conversationId,
        );

      return json({
        conversationId,
        message:
          blockedConversationMessage,
        draft:
          draft.draft,
        pricing:
          draft.pricing,
        conversationStatus:
          lifecycleState.status,
        blocked:
          true,
      });
    }

    /*
     * ========================================================
     * PREFLIGHT OBLIGATORIO DE SERVICIO
     * ========================================================
     *
     * Se ejecuta una sola vez, antes de procesar el primer
     * mensaje del cliente.
     *
     * Objetivo:
     * no hacer que alguien arme todo su pedido para descubrir
     * al final que no hay servicio disponible.
     */
    const firstUserMessage =
      await isFirstUserMessage(
        conversationId,
      );

    let initialServiceContext:
      | string
      | null =
      null;

    if (firstUserMessage) {
      const businessStatus =
        await getBusinessStatus();

      const pickupAvailable =
        Boolean(
          businessStatus
            ?.fulfillment
            ?.pickupAvailable,
        );

      const deliveryAvailable =
        Boolean(
          businessStatus
            ?.fulfillment
            ?.deliveryAvailable,
        );

      initialServiceContext =
        buildInitialServiceContext(
          businessStatus,
        );

      /*
       * Ninguna modalidad disponible:
       * guardamos el mensaje del cliente para historial,
       * respondemos inmediatamente y NO consultamos al modelo.
       */
      if (
        !pickupAvailable &&
        !deliveryAvailable
      ) {
        await saveMessage(
          conversationId,
          'user',
          message,
        );

        const noServiceMessage =
          buildNoServiceMessage(
            businessStatus,
          );

        await saveMessage(
          conversationId,
          'assistant',
          noServiceMessage,
          {
            metadata: {
              servicePreflight:
                true,
              pickupAvailable:
                false,
              deliveryAvailable:
                false,
            },
          },
        );

        const draft =
          await getDraft(
            conversationId,
          );

        return json({
          conversationId,
          message:
            noServiceMessage,
          draft:
            draft.draft,
          pricing:
            draft.pricing,
          serviceAvailability: {
            pickupAvailable:
              false,
            deliveryAvailable:
              false,
          },
        });
      }
    }

    await saveMessage(
      conversationId,
      'user',
      message,
    );

    const history =
      await loadHistory(
        conversationId,
        settings.max_history_messages,
      );

    let input:
      any[] =
      history.map(
        item => ({
          role:
            item.role,
          content:
            item.content,
        }),
      );

    /*
     * Inyectamos el resultado de disponibilidad al modelo sin
     * obligarlo a gastar una tool call adicional.
     * El mensaje original del cliente permanece intacto.
     */
    if (
      initialServiceContext
    ) {
      input = [
        {
          role:
            'system',
          content:
            initialServiceContext,
        },
        ...input,
      ];
    }

    if (
      lifecycleState
        .status ===
        'completed'
    ) {
      input = [
        {
          role:
            'system',
          content:
            buildPostOrderContext(),
        },
        ...input,
      ];
    }

    const returnedFromHumanContext =
      buildReturnedFromHumanContext(
        lifecycleState,
      );

    if (
      returnedFromHumanContext
    ) {
      input = [
        {
          role:
            'system',
          content:
            returnedFromHumanContext,
        },
        ...input,
      ];
    }

    let response:
      any =
      null;

        const toolSignatureCounts =
      new Map<
        string,
        number
      >();

    const toolFailureCounts =
      new Map<
        string,
        number
      >();

    let forcedAssistantText:
      | string
      | null =
      null;

    toolLoop:
    for (
      let iteration = 0;
      iteration <
        settings.max_tool_iterations;
      iteration += 1
    ) {
      response =
        await callOpenAI({
          model:
            settings.model,
          instructions:
            buildInstructions(
              settings,
            ),
          input,
          tools,
          tool_choice:
            'auto',
        });

      const calls =
        (
          response.output ??
          []
        ).filter(
          (item: any) =>
            item?.type ===
            'function_call',
        ) as ToolCall[];

      if (
        calls.length === 0
      ) {
        break;
      }

      input = [
        ...input,
        ...(
          response.output ??
          []
        ),
      ];

      for (
        const call of calls
      ) {
        let parsedArgs:
          Record<
            string,
            unknown
          > =
          {};

        try {
          parsedArgs =
            JSON.parse(
              call.arguments ||
              '{}',
            );
        } catch {
          parsedArgs =
            {};
        }

        const signature =
          `${call.name}:${JSON.stringify(
            parsedArgs,
          )}`;

        const signatureCount =
          (
            toolSignatureCounts
              .get(
                signature,
              ) ??
            0
          ) +
          1;

        toolSignatureCounts.set(
          signature,
          signatureCount,
        );

        /*
         * Anti-loop:
         * no permitimos ejecutar tres veces la misma
         * herramienta con exactamente los mismos argumentos
         * durante un solo turno.
         */
        if (
          signatureCount >=
          3
        ) {
          await requestHuman(
            conversationId,
            `Loop detectado: ${call.name} repitió los mismos argumentos.`,
          );

          forcedAssistantText =
            'No quiero hacerte repetir lo mismo. Se atoró esta parte del pedido y ya pedí apoyo humano para revisarla.';

          break toolLoop;
        }

        const result =
          await runTool(
            conversationId,
            call,
            settings,
          );

        await saveMessage(
          conversationId,
          'tool',
          JSON.stringify(
            result,
          ),
          {
            tool_name:
              call.name,
            tool_call_id:
              call.call_id,
          },
        );

        input.push({
          type:
            'function_call_output',
          call_id:
            call.call_id,
          output:
            JSON.stringify(
              result,
            ),
        });

        const failed =
          Boolean(
            result &&
            typeof result ===
              'object' &&
            'error' in
              (
                result as
                  Record<
                    string,
                    unknown
                  >
              ),
          );

        if (failed) {
          const failureCount =
            (
              toolFailureCounts
                .get(
                  call.name,
                ) ??
              0
            ) +
            1;

          toolFailureCounts.set(
            call.name,
            failureCount,
          );

          /*
           * Una herramienta puede corregirse y reintentarse una vez.
           * Dos fallos de la misma herramienta en el mismo turno
           * disparan handoff para evitar loops y datos inventados.
           */
          if (
            failureCount >=
            2
          ) {
            await requestHuman(
              conversationId,
              `La herramienta ${call.name} falló repetidamente en el mismo turno.`,
            );

            forcedAssistantText =
              'No pude validar esta parte del pedido con seguridad. Ya pedí apoyo humano para que no te dé información incorrecta.';

            break toolLoop;
          }
        }

        if (
          call.name ===
            'cancel_draft' &&
          result &&
          typeof result ===
            'object' &&
          (
            result as
              Record<
                string,
                unknown
              >
          ).cancelled ===
            true
        ) {
          forcedAssistantText =
            'Listo, cancelé el borrador del pedido.';

          break toolLoop;
        }

        if (
          call.name ===
            'request_human'
        ) {
          forcedAssistantText =
            'Listo, pedí apoyo humano para continuar contigo.';

          break toolLoop;
        }
      }
    }

    const assistantText =
      forcedAssistantText ??
      (
        extractText(
          response,
        ) ||
        'No pude generar una respuesta segura. Solicita apoyo humano.'
      );
    await saveMessage(conversationId, 'assistant', assistantText);
    const draft = await getDraft(conversationId);

    return json({
      conversationId,
      message:
        assistantText,
      draft:
        draft.draft,
      pricing:
        draft.pricing,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (message === 'UNAUTHORIZED') return json({ error: 'No autorizado.' }, 401);
    if (message === 'FORBIDDEN') return json({ error: 'Solo administradores pueden usar el simulador interno.' }, 403);
    console.error('ai-order-agent:', error);
    return json({ error: message || 'Error interno.' }, 500);
  }
});
