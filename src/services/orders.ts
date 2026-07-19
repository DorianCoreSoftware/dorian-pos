import { supabase } from './supabase';
import { CartItem } from '../types/cart-item';

// ==========================================
// 1. CREAR ORDEN (Con las columnas reales de la BD)
// ==========================================
export async function createKitchenOrder(cart: CartItem[], totalAmount: number) {
  try {
    // 1. Insertamos la Orden Principal
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert([{ total: totalAmount, status: 'pending', created_at: new Date().toISOString() }])
      .select().single();

    if (orderError) throw orderError;

    // 2. Insertamos cada artículo del carrito
    for (const item of cart) {
      const { data: insertedItem, error: itemError } = await supabase
        .from('order_items') 
        .insert({
          order_id: order.id,
          product_id: item.product.id,
          quantity: item.quantity,
          price_at_purchase: item.product.price, 
          notes: item.notes || null,
        })
        .select().single();

      if (itemError) throw itemError;

      // 3. Si el artículo tiene modificadores (ej: extra queso, sin cebolla, etc.)
      if (item.selectedModifiers && item.selectedModifiers.length > 0) {
  
  const modifiersToInsert = item.selectedModifiers.map((mod: any) => ({
    order_item_id: insertedItem.id,
    // Si cambiaste modifier_id a tipo TEXT en Supabase, puedes guardar mod.id ("meat-pollo-id")
    // o incluso mod.name ("Pollo") si prefieres ver el nombre directo en la comanda.
    modifier_id: mod.id || mod.name, 
    extra_price_applied: mod.extra_price || 0 
  }));

  const { error: modInsertError } = await supabase
    .from("order_item_modifiers")
    .insert(modifiersToInsert);

  if (modInsertError) throw modInsertError;
      }
    }
    return { success: true, orderId: order.id };
  } catch (error: any) {
    console.error('Error al guardar el pedido en cocina:', error);
    throw new Error(error.message || 'Error de conexión');
  }
}

// ==========================================
// 2. OBTENER ÓRDENES PENDIENTES (Unión Manual en JS)
// ==========================================
export const getPendingOrders = async () => {
  // 1. Traemos las órdenes y sus artículos base
  const { data: orders, error: ordersError } = await supabase
    .from('orders')
    .select('*, order_items(*, products(*))') 
    .neq('status', 'entregado') 
    .order('created_at', { ascending: true });

  if (ordersError) throw ordersError;
  if (!orders || orders.length === 0) return [];

  // 2. Extraemos todos los IDs de los 'order_items' obtenidos
  const allItemIds = orders
    .flatMap(order => order.order_items || [])
    .map(item => item.id);

  if (allItemIds.length === 0) return orders;

  // 3. Traemos todos los modificadores asociados de la tabla 'sale_item_modifiers'
const { data: allModifiers, error: modsError } = await supabase
  .from("order_item_modifiers")
  .select(`
      *,
      modifiers (
          id,
          name,
          group_name,
          extra_price,
          is_available
      )
  `)
  .in("order_item_id", allItemIds);

  if (modsError) {
    console.error("Error cargando modificadores:", modsError);
    return orders; 
  }

  // 4. Estructuramos el objeto final para que tu KitchenScreen no se rompa
  const fullOrders = orders.map((order: any) => ({
    ...order,
    order_items: order.order_items?.map((item: any) => {
      // Filtramos los modificadores que pertenecen a esta línea de artículo
      const itemMods =
    allModifiers
        ?.filter(mod => mod.order_item_id === item.id)
        .map(mod => ({
            id: mod.modifiers.id,
            name: mod.modifiers.name,
            group_name: mod.modifiers.group_name,
            extra_price: mod.modifiers.extra_price,
            is_available: mod.modifiers.is_available
        })) || [];
      
      return {
        ...item,
        // Inyectamos el array en la propiedad '.modifiers' que espera tu interfaz de cocina
        modifiers: itemMods 
      };
    })
  }));

  return fullOrders;
};

// ==========================================
// 3. ACTUALIZAR EL ESTATUS DE LA ORDEN
// ==========================================
export async function updateOrderStatus(
  orderId: string, 
  newStatus: 'pending' | 'completed' | 'cancelled' | 'entregado'
) {
  const { data, error } = await supabase
    .from('orders')
    .update({ status: newStatus })
    .eq('id', orderId)
    .select().single(); 

  if (error) throw error;
  return data; 
}