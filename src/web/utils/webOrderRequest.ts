import {
  Cart,
  DeliveryDetails,
} from '../../types';

import {
  WebFulfillmentType,
} from '../services/web-order/webOrderService';

export function createWebOrderFingerprint(
  cart: Cart,
  fulfillmentType:
    WebFulfillmentType,
  customerName: string,
  customerPhone: string,
  deliveryDetails:
    DeliveryDetails | null,
): string {
  return JSON.stringify({
    fulfillmentType,

    customerName:
      customerName.trim(),

    customerPhone:
      customerPhone.replace(
        /\D/g,
        '',
      ),

    delivery:
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
        : null,

    items:
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
          )
            .map(
              (modifier) =>
                modifier.id,
            )
            .sort(),

          components: (
            item.comboComponents ??
            []
          )
            .map(
              (component) => ({
                slotId:
                  component.slotId,

                productId:
                  component
                    .product.id,

                type:
                  component.type,

                quantity:
                  component.quantity,

                notes:
                  component.notes.trim(),

                modifiers: (
                  component
                    .selectedModifiers ??
                  []
                )
                  .map(
                    (modifier) =>
                      modifier.id,
                  )
                  .sort(),
              }),
            )
            .sort(
              (
                first,
                second,
              ) =>
                first.slotId.localeCompare(
                  second.slotId,
                ),
            ),
        }),
      ),
  });
}

export function createRequestId(): string {
  const cryptoObject =
    globalThis.crypto;

  if (
    cryptoObject &&
    typeof cryptoObject.randomUUID ===
      'function'
  ) {
    return cryptoObject.randomUUID();
  }

  return (
    'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'
  ).replace(
    /[xy]/g,
    (character) => {
      const random =
        Math.floor(
          Math.random() * 16,
        );

      const value =
        character === 'x'
          ? random
          : (
              random & 0x3
            ) | 0x8;

      return value.toString(
        16,
      );
    },
  );
}
