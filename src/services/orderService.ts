import {
    deleteOrderItemsByOrderId,
    fetchPendingOrders,
    insertOrder,
    insertOrderItem,
    insertOrderItemComponent,
    insertOrderItemComponentModifiers,
    insertOrderItemModifiers,
    updateOrderStatusById,
    updateOrderTotalById,
} from '../repositories/OrderRepository';

import {
    Cart,
    CartItem,
    KitchenOrder,
    KitchenOrderItem,
    KitchenOrderItemComponent,
    OrderStatus,
} from '../types';

/**
 * Resultado devuelto al crear una orden.
 */
export interface CreateOrderResult {
    success: true;
    orderId: string;
}

async function persistCartItem(
    orderId: string,
    item: CartItem,
): Promise<void> {
    const orderItem =
        await insertOrderItem(
            orderId,
            item,
        );

    await insertOrderItemModifiers(
        orderItem.id,
        item.selectedModifiers ?? [],
    );

    const comboComponents =
        item.comboComponents ?? [];

    for (
        let position = 0;
        position < comboComponents.length;
        position += 1
    ) {
        const component =
            comboComponents[position];

        const componentRecord =
            await insertOrderItemComponent(
                orderItem.id,
                component,
                position,
            );

        await insertOrderItemComponentModifiers(
            componentRecord.id,
            component.selectedModifiers ?? [],
        );
    }
}

/**
 * Crea una orden completa:
 *
 * 1. Crea el encabezado de la orden.
 * 2. Crea cada order_item.
 * 3. Crea sus relaciones con modificadores.
 */
export async function createKitchenOrder(
    cart: CartItem[],
    totalAmount: number,
): Promise<CreateOrderResult> {
    validateOrder(cart, totalAmount);

    const order = await insertOrder(totalAmount);

    for (const item of cart) {
        await persistCartItem(
            order.id,
            item,
        );
    }

    return {
        success: true,
        orderId: order.id,
    };
}

/**
 * Obtiene las órdenes pendientes y transforma la respuesta
 * de Supabase al modelo que utiliza KitchenScreen.
 */
export async function getPendingOrders(): Promise<
  KitchenOrder[]
> {
  const orders = await fetchPendingOrders();

  return orders.map((order): KitchenOrder => ({
    id: order.id,
    total: order.total,
    status: order.status,
    created_at: order.created_at,

    order_items: (
      order.order_items ?? []
    ).map(
      (item): KitchenOrderItem => ({
        id: item.id,
        order_id: item.order_id,
        product_id: item.product_id,
        quantity: item.quantity,

        price_at_purchase:
          item.price_at_purchase,

        notes: item.notes,

        products: item.products
          ? {
              ...item.products,
              price: Number(
                item.products.price,
              ),
            }
          : null,

        modifiers: (
          item.order_item_modifiers ?? []
        )
          .map(
            (relation) =>
              relation.modifiers,
          )
          .filter(
            (
              modifier,
            ): modifier is NonNullable<
              typeof modifier
            > => modifier !== null,
          ),

        components: (
          item.order_item_components ?? []
        )
          .map(
            (
              component,
            ): KitchenOrderItemComponent => ({
              id: component.id,

              order_item_id:
                component.order_item_id,

              product_id:
                component.product_id,

              component_type:
                component.component_type,

              label: component.label,

              quantity:
                component.quantity,

              notes:
                component.notes,

              position:
                component.position ?? null,

              products:
                component.products
                  ? {
                      ...component.products,
                      price: Number(
                        component.products
                          .price,
                      ),
                    }
                  : null,

              modifiers: (
                component
                  .order_item_component_modifiers ??
                []
              )
                .map(
                  (relation) =>
                    relation.modifiers,
                )
                .filter(
                  (
                    modifier,
                  ): modifier is NonNullable<
                    typeof modifier
                  > =>
                    modifier !== null,
                ),
            }),
          )
          .sort(
            (first, second) =>
              (first.position ?? 0) -
              (second.position ?? 0),
          ),
      }),
    ),
  }));
}

/**
 * Marca una orden como entregada.
 */
export async function deliverOrder(
    orderId: string,
) {
    validateOrderId(orderId);

    return updateOrderStatusById(
        orderId,
        'entregado',
    );
}

/**
 * Marca una orden como cancelada.
 */
export async function cancelOrder(
    orderId: string,
) {
    validateOrderId(orderId);

    return updateOrderStatusById(
        orderId,
        'cancelado',
    );
}

/**
 * Actualiza una orden a un estado permitido.
 *
 * Esta función se mantiene para facilitar la migración
 * del servicio anterior.
 */
export async function updateOrderStatus(
    orderId: string,
    status: OrderStatus,
) {
    validateOrderId(orderId);

    return updateOrderStatusById(
        orderId,
        status,
    );
}

function validateOrder(
  cart: CartItem[],
  totalAmount: number,
): void {
  if (
    !Array.isArray(cart) ||
    cart.length === 0
  ) {
    throw new Error(
      'No se puede crear una orden vacía.',
    );
  }

  if (
    !Number.isFinite(totalAmount) ||
    totalAmount < 0
  ) {
    throw new Error(
      'El total de la orden no es válido.',
    );
  }

  cart.forEach((item, index) => {
    if (!item.product?.id) {
      throw new Error(
        `El producto de la posición ${
          index + 1
        } no es válido.`,
      );
    }

    if (
      !Number.isInteger(
        item.quantity,
      ) ||
      item.quantity <= 0
    ) {
      throw new Error(
        `La cantidad de "${item.product.name}" no es válida.`,
      );
    }

    if (
      !Array.isArray(
        item.selectedModifiers,
      )
    ) {
      throw new Error(
        `Los modificadores de "${item.product.name}" no son válidos.`,
      );
    }

    const comboComponents =
      item.comboComponents ?? [];

    if (
      !Array.isArray(
        comboComponents,
      )
    ) {
      throw new Error(
        `Los componentes de "${item.product.name}" no son válidos.`,
      );
    }

    comboComponents.forEach(
      (
        component,
        componentIndex,
      ) => {
        if (
          !component.slotId?.trim()
        ) {
          throw new Error(
            `El componente ${
              componentIndex + 1
            } de "${item.product.name}" no tiene un identificador válido.`,
          );
        }

        if (
          !component.product?.id
        ) {
          throw new Error(
            `El componente ${
              componentIndex + 1
            } de "${item.product.name}" no tiene un producto válido.`,
          );
        }

        if (
          !component.label?.trim()
        ) {
          throw new Error(
            `El componente ${
              componentIndex + 1
            } de "${item.product.name}" no tiene una etiqueta válida.`,
          );
        }

        if (
          !Number.isInteger(
            component.quantity,
          ) ||
          component.quantity <= 0
        ) {
          throw new Error(
            `La cantidad del componente "${component.label}" no es válida.`,
          );
        }

        if (
          !Array.isArray(
            component.selectedModifiers,
          )
        ) {
          throw new Error(
            `Los modificadores de "${component.label}" no son válidos.`,
          );
        }
      },
    );
  });
}

function validateOrderId(
    orderId: string,
): void {
    if (!orderId?.trim()) {
        throw new Error(
            'El identificador de la orden es obligatorio.',
        );
    }
}

export async function updateKitchenOrder(
  orderId: string,
  cart: Cart,
  totalAmount: number,
): Promise<void> {
  validateOrderId(orderId);

  validateOrder(
    cart,
    totalAmount,
  );

  await deleteOrderItemsByOrderId(
    orderId,
  );

  await updateOrderTotalById(
    orderId,
    totalAmount,
  );

  for (const cartItem of cart) {
    await persistCartItem(
      orderId,
      cartItem,
    );
  }
}