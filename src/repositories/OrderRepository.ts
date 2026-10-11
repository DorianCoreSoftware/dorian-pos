import { supabase } from '../services/supabase';
import {
  ComboComponentSelection,
  OrderStatus,
} from '../types';

export type OrderSource =
  | 'pos'
  | 'web';

export type FulfillmentType =
  | 'pickup'
  | 'delivery';

export interface OrderDeliveryDetailsRecord {
  id: string;
  order_id: string;
  customer_name: string;
  phone: string;
  street: string;
  exterior_number: string;
  interior_number: string | null;
  neighborhood: string;
  postal_code: string | null;
  delivery_references: string | null;
  latitude: number | null;
  longitude: number | null;
  created_at: string;
  updated_at: string;
}

/**
 * Representa una fila recién creada en la tabla orders.
 */
export interface OrderRecord {
  id: string;

  total:
  | string
  | number;

  status:
  OrderStatus;

  order_source:
  OrderSource;

  fulfillment_type:
  FulfillmentType;

  customer_name:
  string | null;

  customer_phone:
  string | null;

  driver_id:
  string | null;

  profiles:
  | {
    id: string;
    first_name: string | null;
    last_name: string | null;
  }
  | null;

  created_at:
  string;
}

/**
 * Representa una fila recién creada en order_items.
 */
export interface OrderItemRecord {
  id: string;
  order_id: string;
  product_id: string;
  quantity: number;
  price_at_purchase: string | number;
  notes: string | null;
  reward_source?: 'promotion' | 'loyalty' | null;
  promo_redemption_id?: string | null;
  loyalty_redemption_id?: string | null;
  is_prepared: boolean;
  prepared_at: string | null;
  prepared_by: string | null;
}

export interface OrderItemComponentRecord {
  id: string;
  order_item_id: string;
  product_id: string;
  component_type:
  ComboComponentSelection['type'];
  label: string;
  quantity: number;
  notes: string | null;
  position: number;
  created_at: string;
}

/**
 * Forma que devuelve Supabase antes de transformar
 * order_item_modifiers en modifiers.
 */
export interface PendingOrderModifierRelation {
  modifiers: {
    id: string;
    name: string;
    extra_price: string | number;
    is_available: boolean;

    group_id: string;

    group: {
      id: string;
      code: string;
      name: string;
    } | null;
  } | null;
}

export interface PendingOrderItemComponentRecord
  extends OrderItemComponentRecord {
  products: {
    id: string;
    category_id: string;
    name: string;
    description: string | null;
    price: string | number;
    image_url: string | null;
    is_available: boolean;
    is_active: boolean;
    created_at: string;
  } | null;

  order_item_component_modifiers:
  PendingOrderModifierRelation[];
}

export interface PendingOrderItemRecord
  extends OrderItemRecord {
  products: {
    id: string;
    category_id: string;
    name: string;
    description: string | null;
    price: string | number;
    image_url: string | null;
    is_available: boolean;
    is_active: boolean;
    created_at: string;
  } | null;

  order_item_modifiers:
  PendingOrderModifierRelation[];

  order_item_components:
  PendingOrderItemComponentRecord[];
}

export interface PendingOrderRecord
  extends OrderRecord {
  order_items: PendingOrderItemRecord[];

  order_delivery_details:
  PendingOrderDeliveryDetailsRecord | null;
}

/**
 * Crea solamente el encabezado de una orden.
 *
 * No inserta productos ni modificadores.
 */
export async function insertOrder(
  totalAmount: number,
  orderSource: OrderSource = 'pos',
  fulfillmentType: FulfillmentType = 'pickup',
): Promise<OrderRecord> {
  const { data, error } = await supabase
    .from('orders')
    .insert({
      total: totalAmount,
      status: 'pending',
      order_source: orderSource,
      fulfillment_type: fulfillmentType,
    })
    .select()
    .single();

  if (error) {
    throw new Error(
      `No se pudo crear la orden: ${error.message}`,
    );
  }

  if (!data) {
    throw new Error(
      'Supabase no devolvió la orden creada.',
    );
  }

  return data as OrderRecord;
}

export interface CreateKitchenOrderRpcItem {
  productId: string;
  quantity: number;
  price: number;
  notes: string;

  modifiers: Array<{
    id: string;
    extraPrice: number;
  }>;

  components: Array<{
    productId: string;

    type: string;

    label: string;
    quantity: number;
    notes: string;

    modifiers: Array<{
      id: string;
    }>;
  }>;
}

export interface CreateKitchenOrderRpcDelivery {
  customerName: string;
  phone: string;
  street: string;
  exteriorNumber: string;
  interiorNumber: string;
  neighborhood: string;
  postalCode: string;
  deliveryReferences: string;
  latitude: number | null;
  longitude: number | null;
}

export async function createKitchenOrderTransaction(
  totalAmount: number,
  items: CreateKitchenOrderRpcItem[],
  delivery:
    CreateKitchenOrderRpcDelivery | null,
  clientRequestId: string,
  orderSource: OrderSource,
  fulfillmentType: FulfillmentType,
): Promise<string> {
  const {
    data,
    error,
  } = await supabase.rpc(
    'create_kitchen_order',
    {
      p_total:
        totalAmount,

      p_items:
        items,

      p_delivery:
        delivery,

      p_client_request_id:
        clientRequestId,

      p_order_source:
        orderSource,

      p_fulfillment_type:
        fulfillmentType,
    },
  );

  if (error) {
    throw new Error(
      `No se pudo crear la orden: ${error.message}`,
    );
  }

  if (
    !data ||
    typeof data !== 'string'
  ) {
    throw new Error(
      'Supabase no devolvió el identificador de la orden creada.',
    );
  }

  return data;
}

/**
 * Obtiene órdenes activas de cocina.
 *
 * La transformación de la respuesta pertenece al service,
 * no al repository.
 */
export async function fetchPendingOrders(): Promise<
  PendingOrderRecord[]
> {
  const { data, error } = await supabase
    .from('orders')
    .select(`
      *,
      profiles:driver_id(
        id,
        first_name,
        last_name
      ),
      order_delivery_details(
        *
      ),
      order_items(
        *,
        products(*),
        order_item_modifiers(
          modifiers(
            *,
            group:modifier_groups!modifiers_group_id_fkey(
              id,
              code,
              name
            )
          )
        ),
        order_item_components(
          *,
          products(*),
          order_item_component_modifiers(
            modifiers(
              *,
              group:modifier_groups!modifiers_group_id_fkey(
                id,
                code,
                name
              )
            )
          )
        )
      )
    `)
    .in('status', [
      'pending',
      'preparing',
      'ready',
      'on_the_way',
    ])
    .order('created_at', {
      ascending: true,
    });

  if (error) {
    throw new Error(
      `No se pudieron obtener las órdenes pendientes: ${error.message}`,
    );
  }

  return (
    data ?? []
  ) as PendingOrderRecord[];
}

export async function fetchOrderById(
  orderId: string,
): Promise<PendingOrderRecord | null> {
  const {
    data,
    error,
  } =
    await supabase
      .from(
        'orders',
      )
      .select(`
        *,
        profiles:driver_id(
          id,
          first_name,
          last_name
        ),
        order_delivery_details(
          *
        ),
        order_items(
          *,
          products(*),
          order_item_modifiers(
            modifiers(
              *,
              group:modifier_groups!modifiers_group_id_fkey(
                id,
                code,
                name
              )
            )
          ),
          order_item_components(
            *,
            products(*),
            order_item_component_modifiers(
              modifiers(
                *,
                group:modifier_groups!modifiers_group_id_fkey(
                  id,
                  code,
                  name
                )
              )
            )
          )
        )
      `)
      .eq(
        'id',
        orderId,
      )
      .maybeSingle();

  if (error) {
    throw new Error(
      `No se pudo obtener la orden: ${error.message}`,
    );
  }

  return (
    data ??
    null
  ) as PendingOrderRecord | null;
}


export async function setOrderItemPreparedById(
  orderItemId: string,
  isPrepared: boolean,
): Promise<void> {
  const { error } = await supabase.rpc(
    'set_order_item_prepared',
    {
      p_order_item_id: orderItemId,
      p_is_prepared: isPrepared,
    },
  );

  if (error) {
    throw new Error(
      `No se pudo actualizar la preparación: ${error.message}`,
    );
  }
}

/**
 * Actualiza el estado de una orden.
 */
export async function updateOrderStatusById(
  orderId: string,
  status: OrderStatus,
): Promise<OrderRecord> {
  const { data, error } = await supabase
    .from('orders')
    .update({
      status,
    })
    .eq('id', orderId)
    .select()
    .single();

  if (error) {
    throw new Error(
      `No se pudo actualizar la orden: ${error.message}`,
    );
  }

  if (!data) {
    throw new Error(
      'Supabase no devolvió la orden actualizada.',
    );
  }

  return data as OrderRecord;
}

export interface PendingOrderDeliveryDetailsRecord {
  id: string;
  order_id: string;
  customer_name: string;
  phone: string;
  street: string;
  exterior_number: string;
  interior_number: string | null;
  neighborhood: string;
  postal_code: string | null;
  delivery_references: string | null;
  latitude: number | null;
  longitude: number | null;
  created_at: string;
  updated_at: string;
}

export interface OrderModifierPromotionDiscountRecord {
  id: string;

  order_id: string;

  order_item_id:
  | string
  | null;

  order_item_component_id:
  | string
  | null;

  modifier_id: string;

  promotion_name: string;

  discount_amount:
  | string
  | number;

  created_at: string;

  modifiers:
  | {
    id: string;
    name: string;
  }
  | null;
}

export interface OrderModifierPromotionDiscount {
  id: string;

  orderId: string;

  orderItemId:
  | string
  | null;

  orderItemComponentId:
  | string
  | null;

  modifierId: string;

  modifierName: string;

  promotionName: string;

  discountAmount: number;

  createdAt: string;
}

export async function fetchOrderModifierPromotionDiscounts(
  orderId: string,
): Promise<OrderModifierPromotionDiscount[]> {
  const {
    data,
    error,
  } = await supabase
    .from(
      'order_modifier_promotion_discounts',
    )
    .select(`
      id,
      order_id,
      order_item_id,
      order_item_component_id,
      modifier_id,
      promotion_name,
      discount_amount,
      created_at,
      modifiers(
        id,
        name
      )
    `)
    .eq(
      'order_id',
      orderId,
    )
    .order(
      'created_at',
      {
        ascending: true,
      },
    );

  if (error) {
    throw new Error(
      `No se pudieron consultar los descuentos de la promoción de modificador: ${error.message}`,
    );
  }

  return (
    data ?? []
  ).map(
    (record) => {
      const typedRecord =
        record as unknown as
        OrderModifierPromotionDiscountRecord;

      return {
        id:
          typedRecord.id,

        orderId:
          typedRecord.order_id,

        orderItemId:
          typedRecord
            .order_item_id,

        orderItemComponentId:
          typedRecord
            .order_item_component_id,

        modifierId:
          typedRecord.modifier_id,

        modifierName:
          typedRecord.modifiers
            ?.name ??
          'Promoción',

        promotionName:
          typedRecord.promotion_name ||
          'Promoción',

        discountAmount:
          Number(
            typedRecord
              .discount_amount,
          ),

        createdAt:
          typedRecord.created_at,
      };
    },
  );
}