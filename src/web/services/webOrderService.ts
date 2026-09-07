import {
  Cart,
  DeliveryDetails,
} from '../../types';

import {
  supabase,
} from '../../services/supabase';

export type WebFulfillmentType =
  | 'pickup'
  | 'delivery';

export interface CreateWebOrderInput {
  cart: Cart;

  customerName: string;
  customerPhone: string;

  fulfillmentType:
    WebFulfillmentType;

  deliveryDetails:
    DeliveryDetails | null;

  clientRequestId: string;
}

export interface CreateWebOrderResult {
  orderId: string;
}

export async function createWebOrder({
  cart,
  customerName,
  customerPhone,
  fulfillmentType,
  deliveryDetails,
  clientRequestId,
}: CreateWebOrderInput): Promise<CreateWebOrderResult> {
  if (
    !Array.isArray(cart) ||
    cart.length === 0
  ) {
    throw new Error(
      'Tu carrito está vacío.',
    );
  }

  const normalizedName =
    customerName.trim();

  const normalizedPhone =
    customerPhone.replace(
      /\D/g,
      '',
    );

  if (!normalizedName) {
    throw new Error(
      'El nombre del cliente es obligatorio.',
    );
  }

  if (
    normalizedPhone.length !==
    10
  ) {
    throw new Error(
      'El teléfono debe tener exactamente 10 dígitos.',
    );
  }

  if (
    fulfillmentType ===
      'delivery' &&
    !deliveryDetails
  ) {
    throw new Error(
      'Faltan los datos del domicilio.',
    );
  }

  const rpcItems =
    cart.map(
      (item) => ({
        productId:
          item.product.id,

        quantity:
          item.quantity,

        notes:
          item.notes.trim(),

        modifiers: (
          item.selectedModifiers ??
          []
        ).map(
          (modifier) => ({
            id:
              modifier.id,
          }),
        ),

        components: (
          item.comboComponents ??
          []
        ).map(
          (component) => ({
            productId:
              component.product.id,

            type:
              component.type,

            label:
              component.label,

            quantity:
              component.quantity,

            notes:
              component.notes.trim(),

            modifiers: (
              component
                .selectedModifiers ??
              []
            ).map(
              (modifier) => ({
                id:
                  modifier.id,
              }),
            ),
          }),
        ),
      }),
    );

  const rpcDelivery =
    fulfillmentType ===
      'delivery' &&
    deliveryDetails
      ? {
          street:
            deliveryDetails
              .street
              .trim(),

          exteriorNumber:
            deliveryDetails
              .exteriorNumber
              .trim(),

          interiorNumber:
            deliveryDetails
              .interiorNumber
              .trim(),

          neighborhood:
            deliveryDetails
              .neighborhood
              .trim(),

          postalCode:
            deliveryDetails
              .postalCode
              .trim(),

          deliveryReferences:
            deliveryDetails
              .deliveryReferences
              .trim(),

          latitude:
            deliveryDetails
              .latitude,

          longitude:
            deliveryDetails
              .longitude,
        }
      : null;

  const {
    data,
    error,
  } = await supabase.rpc(
    'create_web_order',
    {
      p_items:
        rpcItems,

      p_delivery:
        rpcDelivery,

      p_client_request_id:
        clientRequestId,

      p_customer_name:
        normalizedName,

      p_customer_phone:
        normalizedPhone,

      p_fulfillment_type:
        fulfillmentType,
    },
  );

  if (error) {
    throw new Error(
      error.message ||
      'No se pudo crear tu pedido.',
    );
  }

  if (
    !data ||
    typeof data !== 'string'
  ) {
    throw new Error(
      'No se recibió el identificador del pedido.',
    );
  }

  return {
    orderId:
      data,
  };
}
