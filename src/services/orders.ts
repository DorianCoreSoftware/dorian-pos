import { supabase } from "./supabase";
import { CartItem } from "../types/cart-item";

type OrderStatus =
  | "pending"
  | "completed"
  | "cancelled"
  | "entregado";


// ==========================================
// Helpers
// ==========================================

async function insertOrderItem(orderId: string, item: CartItem) {
  const { data: orderItem, error } = await supabase
    .from("order_items")
    .insert({
      order_id: orderId,
      product_id: item.product.id,
      quantity: item.quantity,
      price_at_purchase: item.product.price,
      notes: item.notes || null,
    })
    .select()
    .single();

  if (error) throw error;

  if (!item.selectedModifiers?.length) return;

  const modifiers = item.selectedModifiers.map((modifier) => ({
    order_item_id: orderItem.id,
    modifier_id: modifier.id,
  }));

  const { error: modifierError } = await supabase
    .from("order_item_modifiers")
    .insert(modifiers);

  if (modifierError) throw modifierError;
}


// ==========================================
// Crear orden
// ==========================================

export async function createKitchenOrder(
  cart: CartItem[],
  totalAmount: number
) {
  try {
    const { data: order, error } = await supabase
      .from("orders")
      .insert({
        total: totalAmount,
        status: "pending",
      })
      .select()
      .single();

    if (error) throw error;

    await Promise.all(
      cart.map(item => insertOrderItem(order.id, item))
    );

    return {
      success: true,
      orderId: order.id,
    };

  } catch (error: any) {
    console.error(error);

    throw new Error(error.message);
  }
}


// ==========================================
// Obtener órdenes
// ==========================================

export async function getPendingOrders() {

  const { data, error } = await supabase
    .from("orders")
    .select(`
      *,
      order_items(
        *,
        products(*),
        order_item_modifiers(
          modifiers(*)
        )
      )
    `)
    .neq("status", "entregado")
    .order("created_at");

  if (error) throw error;

  return data?.map(order => ({
    ...order,
    order_items: order.order_items.map((item: any) => ({
      ...item,
      modifiers:
        item.order_item_modifiers?.map((m: any) => m.modifiers) ?? []
    }))
  })) ?? [];
}


// ==========================================
// Actualizar estatus
// ==========================================

export async function updateOrderStatus(
  orderId: string,
  status: OrderStatus
) {

  const { data, error } = await supabase
    .from("orders")
    .update({ status })
    .eq("id", orderId)
    .select()
    .single();

  if (error) throw error;

  return data;
}