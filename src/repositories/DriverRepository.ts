import { supabase } from '../services/supabase';

export type DriverOrderStatus =
    | 'ready'
    | 'on_the_way';

export interface DriverOrderRecord {
    order_id: string;

    status:
    DriverOrderStatus;

    total:
    | number
    | string;

    created_at: string;

    customer_name:
    | string
    | null;

    customer_phone:
    | string
    | null;

    street:
    | string
    | null;

    exterior_number:
    | string
    | null;

    interior_number:
    | string
    | null;

    neighborhood:
    | string
    | null;

    postal_code:
    | string
    | null;

    delivery_references:
    | string
    | null;

    latitude:
    | number
    | string
    | null;

    longitude:
    | number
    | string
    | null;

    delivery_zone_name:
    | string
    | null;

    delivery_distance_km:
    | number
    | string
    | null;

    delivery_base_fee:
    | number
    | string
    | null;

    delivery_extra_fee:
    | number
    | string
    | null;

    delivery_total_fee:
    | number
    | string
    | null;

    driver_id:
    | string
    | null;
}

/**
 * Obtiene únicamente las entregas que
 * el backend permite ver al repartidor.
 *
 * La seguridad y los filtros reales
 * pertenecen al RPC get_driver_orders.
 */
export async function fetchDriverOrders(): Promise<
    DriverOrderRecord[]
> {
    const {
        data,
        error,
    } = await supabase.rpc(
        'get_driver_orders',
    );

    if (error) {
        console.error(
            '❌ Error al obtener entregas:',
            error,
        );

        throw new Error(
            'No se pudieron obtener las entregas.',
        );
    }

    return (
        data ?? []
    ) as DriverOrderRecord[];
}

/**
 * Toma una entrega disponible.
 *
 * El backend valida:
 * - usuario autenticado
 * - role = driver
 * - delivery
 * - status = ready
 * - sin otro repartidor asignado
 */
export async function startDriverDeliveryById(
    orderId: string,
): Promise<void> {
    const {
        error,
    } = await supabase.rpc(
        'driver_start_delivery',
        {
            p_order_id:
                orderId,
        },
    );

    if (error) {
        console.error(
            '❌ Error al iniciar entrega:',
            error,
        );

        throw new Error(
            error.message ||
            'No se pudo iniciar la entrega.',
        );
    }
}

/**
 * Finaliza una entrega que pertenece
 * al repartidor autenticado.
 */
export async function completeDriverDeliveryById(
    orderId: string,
): Promise<void> {
    const {
        error,
    } = await supabase.rpc(
        'driver_complete_delivery',
        {
            p_order_id:
                orderId,
        },
    );

    if (error) {
        console.error(
            '❌ Error al completar entrega:',
            error,
        );

        throw new Error(
            error.message ||
            'No se pudo completar la entrega.',
        );
    }
}

export async function registerDriverPaymentById(
    orderId: string,
    paymentMethod:
        | 'cash'
        | 'card',
    amountReceived:
        | number
        | null,
): Promise<string> {
    const {
        data,
        error,
    } = await supabase.rpc(
        'driver_register_payment',
        {
            p_order_id:
                orderId,

            p_payment_method:
                paymentMethod,

            p_amount_received:
                amountReceived,
        },
    );

    if (error) {
        console.error(
            '❌ Error registrando pago del repartidor:',
            error,
        );

        throw new Error(
            error.message ||
            'No se pudo registrar el pago.',
        );
    }

    if (
        !data ||
        typeof data !==
        'string'
    ) {
        throw new Error(
            'Supabase no devolvió el pago registrado.',
        );
    }

    return data;
}

export function subscribeToDriverOrderChanges(
    onChange:
        () => void,
): () => void {
    const channel =
        supabase
            .channel(
                'driver-orders-live',
            )
            .on(
                'postgres_changes',
                {
                    event:
                        '*',

                    schema:
                        'public',

                    table:
                        'orders',
                },
                () => {
                    onChange();
                },
            )
            .subscribe(
                (
                    status,
                ) => {
                    console.log(
                        '🛵 Realtime repartidor:',
                        status,
                    );
                },
            );

    return () => {
        void supabase
            .removeChannel(
                channel,
            );
    };
}