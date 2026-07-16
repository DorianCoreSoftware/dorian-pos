import { supabase } from './supabase';
import { CartItem } from '../types/cart-item';

// ==========================================
// 1. CREAR UNA NUEVA ORDEN EN LA BD
// ==========================================
export async function createKitchenOrder(cart: CartItem[], totalAmount: number) {
  try {
    // 1. Insertamos la Orden de manera principal
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert([
        {
          total: totalAmount,
          status: 'pending', // 'pending' -> va directo a la pantalla de cocina
          created_at: new Date().toISOString(),
        }
      ])
      .select()
      .single();

    if (orderError) throw orderError;
    if (!order) throw new Error('No se pudo generar la orden en el servidor');

    // 2. Preparamos los items vinculados a ese order.id
    const orderItemsToInsert = cart.map((item) => ({
      order_id: order.id,
      product_id: item.product.id,
      quantity: item.quantity,
      price_at_purchase: item.product.price, // Guardamos el precio del momento
      notes: item.notes || null,
    }));

    // 3. Insertamos todos los items de golpe en la tabla relacional
    const { error: itemsError } = await supabase
      .from('order_items')
      .insert(orderItemsToInsert);

    if (itemsError) throw itemsError;

    return { success: true, orderId: order.id };
  } catch (error: any) {
    console.error('Error al guardar el pedido en cocina:', error);
    throw new Error(error.message || 'Error de conexión con la base de datos');
  }
} // <-- AQUÍ SE CIERRA CORRECTAMENTE createKitchenOrder

// ==========================================
// 2. OBTENER ÓRDENES PENDIENTES DE COCINA
// ==========================================
export const getPendingOrders = async () => {
  const { data, error } = await supabase
    .from('orders')
    .select('*, order_items(*, products(*))')
    .neq('status', 'entregado') // <-- IMPORTANTE: Solo traer las que NO estén entregadas
    .order('created_at', { ascending: true });

  if (error) throw error;
  return data;
};

// ==========================================
// 3. ACTUALIZAR EL ESTATUS DE LA ORDEN
// ==========================================
export async function updateOrderStatus(
  orderId: string, 
  newStatus: 'pending' | 'completed' | 'cancelled'
) {
  const { data, error } = await supabase
    .from('orders')
    .update({ status: newStatus })
    .eq('id', orderId)
    .select();

  if (error) throw error;
  return data;
}