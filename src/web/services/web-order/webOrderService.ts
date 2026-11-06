import {
  Cart,
  DeliveryDetails,
} from '../../../types';

import {
  supabase,
} from '../../../services/supabase';
import { getDeliveryServiceStatus } from '../../../services/deliveryService';
import { setWebOrderPaymentIntent } from '../../../services/paymentAccountService';

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

  paymentMethod: 'cash' | 'transfer';

  customerSessionToken?:
  string | null;

  marketingCode?:
  string | null;

  marketingToken?:
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
  paymentMethod,
  customerSessionToken,
  marketingCode,
  marketingToken,
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

        cookingMethod:
          item.cookingMethod ??
          null,

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

            cookingMethod:
              component.cookingMethod ??
              null,

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

  if (
    fulfillmentType ===
    'delivery'
  ) {
    const deliveryEnabled =
      await getDeliveryServiceStatus();

    if (!deliveryEnabled) {
      throw new Error(
        'El servicio a domicilio no está disponible por el momento.',
      );
    }
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

  await setWebOrderPaymentIntent({
    orderId: data,
    clientRequestId,
    paymentMethod,
  });

  const cleanMarketingCode =
    marketingCode
      ?.trim()
      .toUpperCase() ||
    null;

  const cleanMarketingToken =
    marketingToken
      ?.trim() ||
    null;

  if (
    cleanMarketingCode ||
    cleanMarketingToken
  ) {
    /*
     * El pedido ya existe en este punto.
     * El tracking es complementario y nunca debe
     * convertir un pedido exitoso en un error de checkout.
     */
    const {
      error:
        marketingTrackingError,
    } =
      await supabase.rpc(
        'claim_marketing_tracking_for_web_order',
        {
          p_order_id:
            data,
          p_client_request_id:
            clientRequestId,
          p_code:
            cleanMarketingCode,
          p_token:
            cleanMarketingToken,
        },
      );

    if (
      marketingTrackingError
    ) {
      console.warn(
        'No se pudo asociar el tracking de Marketing al pedido:',
        marketingTrackingError.message,
      );
    }
  }

  return {
    orderId:
      data,
  };
}
