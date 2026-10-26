import {
  Cart,
  DeliveryDetails,
} from '../../../types';

import {
  supabase,
} from '../../../services/supabase';
import { getFulfillmentAvailability } from '../../../services/deliveryService';

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

  customerSessionToken?:
  string | null;
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
  customerSessionToken,
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

  const fulfillmentAvailability =
    await getFulfillmentAvailability();

  if (
    fulfillmentType === 'pickup' &&
    !fulfillmentAvailability.pickupAvailable
  ) {
    throw new Error(
      fulfillmentAvailability.pickupReason ||
      'El servicio para recoger no está disponible por el momento.',
    );
  }

  if (
    fulfillmentType === 'delivery' &&
    !fulfillmentAvailability.deliveryAvailable
  ) {
    throw new Error(
      fulfillmentAvailability.deliveryReason ||
      'El servicio a domicilio no está disponible por el momento.',
    );
  }

  const cleanSessionToken =
    customerSessionToken
      ?.trim() || null;

  const rpcArgs =
    cleanSessionToken
      ? {
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

        p_customer_session_token:
          cleanSessionToken,
      }
      : {
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
      };

  const {
    data,
    error,
  } = await supabase.rpc(
    'create_web_order',
    rpcArgs,
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
