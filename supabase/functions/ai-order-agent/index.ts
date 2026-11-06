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
};

type DraftItemInput = {
  product_id: string;
  quantity: number;
  notes?: string;
  modifier_ids?: string[];
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
    .select('enabled,order_creation_enabled,model,max_tool_iterations,max_history_messages,require_explicit_confirmation,system_instructions')
    .eq('id', 1)
    .single();
  if (error) throw error;
  return data as Settings;
}

async function ensureConversation(id?: string): Promise<string> {
  if (id) {
    const { data } = await admin
      .from('ai_order_conversations')
      .select('id,status')
      .eq('id', id)
      .maybeSingle();
    if (!data) throw new Error('Conversación no encontrada.');
    if (!['active', 'awaiting_human'].includes(data.status)) {
      throw new Error('La conversación ya está cerrada.');
    }
    return data.id;
  }

  const { data, error } = await admin
    .from('ai_order_conversations')
    .insert({ channel: 'internal', metadata: { source: 'admin_simulator' } })
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

async function searchMenu(query: string, limit = 8) {
  const safeLimit = Math.max(1, Math.min(15, Math.floor(limit || 8)));
  let request = admin
    .from('products')
    .select('id,name,description,price,is_available,is_active,is_combo_option,categories(name)')
    .eq('is_active', true)
    .eq('is_available', true)
    .eq('is_combo_option', false)
    .order('name')
    .limit(safeLimit);

  const clean = query?.trim().replace(/[,%()]/g, ' ').replace(/\s+/g, ' ').slice(0, 80);
  if (clean) request = request.or(`name.ilike.%${clean}%,description.ilike.%${clean}%`);

  const { data, error } = await request;
  if (error) throw error;
  return { products: data ?? [] };
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

    const optionPositionByModifierId = new Map(
      (options ?? []).map((row: any) => [
        row.modifier_id,
        Number(row.position ?? 0),
      ]),
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
      ? { requiresConfiguration: true, supportedInPhase1: false }
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
  const { data: settings, error } = await admin
    .from('business_settings')
    .select('business_name,short_name,currency_code,web_orders_enabled,delivery_enabled')
    .eq('id', 1)
    .maybeSingle();
  if (error) throw error;

  const { data: fulfillment, error: fulfillmentError } = await admin
    .rpc('get_public_fulfillment_availability');
  if (fulfillmentError) throw fulfillmentError;

  return {
    settings,
    fulfillment: Array.isArray(fulfillment) ? fulfillment[0] ?? null : fulfillment ?? null,
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
    if (comboProductIds.has(product.id)) {
      throw new Error(`El combo ${product.name} requiere configurar componentes y todavía no está soportado en la Fase 1.`);
    }

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

    const unitPrice = Number(product.price) + modifierTotal;
    const lineTotal = unitPrice * quantity;
    estimatedTotal += lineTotal;
    normalized.push({
      productId: product.id,
      productName: product.name,
      productDescription: product.description,
      quantity,
      notes: String(raw.notes ?? '').trim().slice(0, 500),
      modifiers: modifiers.map((m) => ({ id: m.id, name: m.name, extraPrice: Number(m.extra_price ?? 0) })),
      unitPrice: Number(unitPrice.toFixed(2)),
      lineTotal: Number(lineTotal.toFixed(2)),
    });
  }

  return { items: normalized, estimatedTotal: Number(estimatedTotal.toFixed(2)) };
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

  const estimatedTotal =
    Number(
      (
        validated.estimatedTotal +
        deliveryValidation.deliveryFee
      ).toFixed(2),
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

  return {
    ...data,
    pricing: {
      productsTotal:
        validated.estimatedTotal,
      deliveryFee:
        deliveryValidation.deliveryFee,
      estimatedTotal,
    },
  };
}

async function getDraft(conversationId: string) {
  const { data, error } = await admin
    .from('ai_order_drafts')
    .select('*')
    .eq('conversation_id', conversationId)
    .maybeSingle();
  if (error) throw error;
  return { draft: data };
}

async function requestHuman(conversationId: string, reason: string) {
  await admin.from('ai_order_conversations').update({
    status: 'awaiting_human',
    human_handoff_requested: true,
    human_handoff_reason: reason?.trim().slice(0, 500) || 'Solicitud del agente',
  }).eq('id', conversationId);
  return { handoffRequested: true };
}

async function confirmOrder(conversationId: string, settings: Settings) {
  const { data: draft, error } = await admin
    .from('ai_order_drafts')
    .select('*')
    .eq('conversation_id', conversationId)
    .maybeSingle();
  if (error) throw error;
  if (!draft || !Array.isArray(draft.items) || draft.items.length === 0) {
    return { ok: false, reason: 'No hay un pedido armado.' };
  }

  if (draft.fulfillment_type === 'delivery') {
    const deliveryQuote = draft.delivery?.quote;

    if (
      !deliveryQuote?.available ||
      !Number.isFinite(Number(deliveryQuote?.totalFee)) ||
      !Number.isFinite(Number(draft.delivery?.latitude)) ||
      !Number.isFinite(Number(draft.delivery?.longitude))
    ) {
      return {
        ok: false,
        blocked: true,
        reason: 'El domicilio todavía no tiene una cotización de entrega válida. Valida la dirección antes de confirmar.',
        draftId: draft.id,
      };
    }
  }

  if (!settings.order_creation_enabled) {
    await admin.from('ai_order_drafts').update({ status: 'awaiting_confirmation' }).eq('id', draft.id);
    return {
      ok: false,
      blocked: true,
      reason: 'La creación real de pedidos está deshabilitada en esta fase. El borrador quedó listo para revisión humana.',
      draftId: draft.id,
    };
  }

  return {
    ok: false,
    blocked: true,
    reason: 'El adaptador final hacia create_web_order se habilitará en la siguiente fase después de validar el simulador.',
    draftId: draft.id,
  };
}

const tools = [
  {
    type: 'function', name: 'search_menu',
    description: 'Busca productos reales disponibles en el menú. Úsala antes de asumir que un producto existe.',
    parameters: { type: 'object', properties: { query: { type: 'string' }, limit: { type: 'integer', minimum: 1, maximum: 15 } }, required: ['query', 'limit'], additionalProperties: false },
    strict: true,
  },
  {
    type: 'function', name: 'get_product_details',
    description: 'Obtiene precio, descripción y modificadores válidos de un producto.',
    parameters: { type: 'object', properties: { product_id: { type: 'string' } }, required: ['product_id'], additionalProperties: false },
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
              product_id: { type: 'string' }, quantity: { type: 'integer', minimum: 1, maximum: 50 },
              notes: { type: 'string' }, modifier_ids: { type: 'array', items: { type: 'string' } },
            },
            required: ['product_id', 'quantity', 'notes', 'modifier_ids'], additionalProperties: false,
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
    description: 'Obtiene el borrador actual y su total estimado recalculado desde el catálogo.',
    parameters: { type: 'object', properties: {}, required: [], additionalProperties: false },
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
    description: 'Se usa únicamente después de que el cliente haya confirmado explícitamente el resumen final. En Fase 1 no crea aún la orden real.',
    parameters: { type: 'object', properties: {}, required: [], additionalProperties: false },
    strict: true,
  },
];

async function runTool(conversationId: string, call: ToolCall, settings: Settings) {
  const started = performance.now();
  let args: any = {};
  try { args = JSON.parse(call.arguments || '{}'); } catch { throw new Error('Argumentos de herramienta inválidos.'); }

  try {
    let result: unknown;
    switch (call.name) {
      case 'search_menu': result = await searchMenu(args.query ?? '', args.limit ?? 8); break;
      case 'get_product_details': result = await getProductDetails(args.product_id); break;
      case 'get_business_status': result = await getBusinessStatus(); break;
      case 'quote_delivery': result = await quoteDeliveryAddress(args.address ?? '', args.postal_code ?? null); break;
      case 'update_draft': result = await updateDraft(conversationId, args); break;
      case 'get_order_summary': result = await getDraft(conversationId); break;
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
    const message = error instanceof Error ? error.message : String(error);
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
- Nunca inventes productos, precios, promociones, horarios ni opciones.
- Busca el producto antes de agregarlo y consulta detalles cuando necesites modificadores.
- Si get_product_details indica combo.requiresConfiguration=true, no lo agregues al borrador en esta fase; explica la limitación o solicita apoyo humano.
- No calcules totales mentalmente: usa update_draft y get_order_summary.
- Si el cliente pide domicilio, solicita una dirección suficientemente completa y usa quote_delivery antes de guardar el domicilio.
- Nunca inventes coordenadas, cobertura ni costo de envío. Usa exactamente el resultado de quote_delivery.
- Después de quote_delivery, copia sus campos address al objeto delivery de update_draft.
- El total estimado de update_draft ya incluye la tarifa real de entrega cuando el domicilio fue validado; no sumes nada por tu cuenta.
- Conserva notas como "sin tocino" como notes cuando no exista un modificador estructurado apropiado.
- Si falta información importante, pregunta una sola cosa concreta a la vez.
- Antes de confirm_order, muestra resumen, total estimado y pide confirmación explícita.
- Mientras order_creation_enabled sea false, habla siempre de "borrador", "actualizar el borrador" o "dejar listo para revisión". No digas "registraré", "crearé", "levantaré" ni afirmes que un pedido será creado.
- En esta Fase 1, si confirm_order informa que la creación está bloqueada, explica que el pedido quedó listo para revisión, no digas que fue creado.
- Si no puedes resolver algo con seguridad o el cliente pide humano, usa request_human.
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

    const conversationId = await ensureConversation(body.conversationId);
    await saveMessage(conversationId, 'user', message);
    const history = await loadHistory(conversationId, settings.max_history_messages);

    let input: any[] = history.map((item) => ({ role: item.role, content: item.content }));
    let response: any = null;

    for (let iteration = 0; iteration < settings.max_tool_iterations; iteration += 1) {
      response = await callOpenAI({
        model: settings.model,
        instructions: buildInstructions(settings),
        input,
        tools,
        tool_choice: 'auto',
      });

      const calls = (response.output ?? []).filter((item: any) => item?.type === 'function_call') as ToolCall[];
      if (calls.length === 0) break;

      input = [...input, ...(response.output ?? [])];
      for (const call of calls) {
        const result = await runTool(conversationId, call, settings);
        await saveMessage(conversationId, 'tool', JSON.stringify(result), { tool_name: call.name, tool_call_id: call.call_id });
        input.push({ type: 'function_call_output', call_id: call.call_id, output: JSON.stringify(result) });
      }
    }

    const assistantText = extractText(response) || 'No pude generar una respuesta segura. Solicita apoyo humano.';
    await saveMessage(conversationId, 'assistant', assistantText);
    const draft = await getDraft(conversationId);

    return json({ conversationId, message: assistantText, draft: draft.draft });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (message === 'UNAUTHORIZED') return json({ error: 'No autorizado.' }, 401);
    if (message === 'FORBIDDEN') return json({ error: 'Solo administradores pueden usar el simulador interno.' }, 403);
    console.error('ai-order-agent:', error);
    return json({ error: message || 'Error interno.' }, 500);
  }
});
