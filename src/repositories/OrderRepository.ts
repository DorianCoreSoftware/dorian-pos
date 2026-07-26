import { supabase } from '../services/supabase';
import {
  CartItem,
  ComboComponentSelection,
  OrderStatus,
} from '../types';

/**
 * Representa una fila recién creada en la tabla orders.
 */
export interface OrderRecord {
  id: string;
  total: string | number;
  status: OrderStatus;
  created_at: string;
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
    group_name: 'Carne' | 'Salsa' | 'Sabor' | null;
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

export interface PendingOrderRecord extends OrderRecord {
  order_items: PendingOrderItemRecord[];
}

/**
 * Crea solamente el encabezado de una orden.
 *
 * No inserta productos ni modificadores.
 */
export async function insertOrder(
  totalAmount: number,
): Promise<OrderRecord> {
  const { data, error } = await supabase
    .from('orders')
    .insert({
      total: totalAmount,
      status: 'pending',
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

/**
 * Inserta un producto dentro de una orden.
 *
 * Los modificadores no se insertan aquí; pertenecen a
 * order_item_modifiers.
 */
export async function insertOrderItem(
  orderId: string,
  item: CartItem,
): Promise<OrderItemRecord> {
  const { data, error } = await supabase
    .from('order_items')
    .insert({
      order_id: orderId,
      product_id: item.product.id,
      quantity: item.quantity,
      price_at_purchase: item.product.price,
      notes: item.notes.trim() || null,
    })
    .select()
    .single();

  if (error) {
    throw new Error(
      `No se pudo agregar "${item.product.name}" a la orden: ${error.message}`,
    );
  }

  if (!data) {
    throw new Error(
      `Supabase no devolvió el registro de "${item.product.name}".`,
    );
  }

  return data as OrderItemRecord;
}

/**
 * Inserta las relaciones entre un order_item y sus modificadores.
 */
export async function insertOrderItemModifiers(
  orderItemId: string,
  modifiers: CartItem['selectedModifiers'],
): Promise<void> {
  if (modifiers.length === 0) {
    return;
  }

  const payload = modifiers.map((modifier) => ({
    order_item_id: orderItemId,
    modifier_id: modifier.id,
  }));

  const { error } = await supabase
    .from('order_item_modifiers')
    .insert(payload);

  if (error) {
    throw new Error(
      `No se pudieron guardar los modificadores: ${error.message}`,
    );
  }
}

export async function insertOrderItemComponent(
  orderItemId: string,
  component: ComboComponentSelection,
  position: number,
): Promise<OrderItemComponentRecord> {
  const { data, error } = await supabase
    .from('order_item_components')
    .insert({
      order_item_id: orderItemId,
      product_id: component.product.id,
      component_type: component.type,
      label: component.label,
      quantity: component.quantity,
      notes:
        component.notes.trim() || null,
      position,
    })
    .select()
    .single();

  if (error) {
    throw new Error(
      `No se pudo guardar el componente "${component.label}": ${error.message}`,
    );
  }

  if (!data) {
    throw new Error(
      `Supabase no devolvió el componente "${component.label}".`,
    );
  }

  return data as OrderItemComponentRecord;
}

export async function insertOrderItemComponentModifiers(
  orderItemComponentId: string,
  modifiers: ComboComponentSelection[
    'selectedModifiers'
  ],
): Promise<void> {
  if (modifiers.length === 0) {
    return;
  }

  const payload = modifiers.map(
    (modifier) => ({
      order_item_component_id:
        orderItemComponentId,
      modifier_id: modifier.id,
    }),
  );

  const { error } = await supabase
    .from(
      'order_item_component_modifiers',
    )
    .insert(payload);

  if (error) {
    throw new Error(
      `No se pudieron guardar los modificadores del componente: ${error.message}`,
    );
  }
}

/**
 * Obtiene solamente órdenes pendientes.
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
      order_items(
        *,
        products(*),

        order_item_modifiers(
          modifiers(*)
        ),

        order_item_components(
          *,
          products(*),

          order_item_component_modifiers(
            modifiers(*)
          )
        )
      )
    `)
    .eq('status', 'pending')
    .order('created_at', {
      ascending: true,
    });

  if (error) {
    throw new Error(
      `No se pudieron obtener las órdenes pendientes: ${error.message}`,
    );
  }

  console.log(
    '🍔 Órdenes pendientes crudas:',
    JSON.stringify(data, null, 2),
  );

  return (data ?? []) as PendingOrderRecord[];
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

export async function updateOrderTotalById(
  orderId: string,
  total: number,
): Promise<void> {
  const { error } = await supabase
    .from('orders')
    .update({
      total,
    })
    .eq('id', orderId);

  if (error) {
    throw new Error(
      `No se pudo actualizar el total de la orden: ${error.message}`,
    );
  }
}

export async function deleteOrderItemsByOrderId(
  orderId: string,
): Promise<void> {
  const { data: orderItems, error: findError } =
    await supabase
      .from('order_items')
      .select('id')
      .eq('order_id', orderId);

  if (findError) {
    throw new Error(
      `No se pudieron consultar los productos de la orden: ${findError.message}`,
    );
  }

  const orderItemIds = (orderItems ?? []).map(
    (item) => item.id,
  );

  if (orderItemIds.length > 0) {
    const { error: modifiersError } =
      await supabase
        .from('order_item_modifiers')
        .delete()
        .in('order_item_id', orderItemIds);

    if (modifiersError) {
      throw new Error(
        `No se pudieron eliminar los modificadores anteriores: ${modifiersError.message}`,
      );
    }
  }

  const { error: itemsError } = await supabase
    .from('order_items')
    .delete()
    .eq('order_id', orderId);

  if (itemsError) {
    throw new Error(
      `No se pudieron eliminar los productos anteriores: ${itemsError.message}`,
    );
  }
}