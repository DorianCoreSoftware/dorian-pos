import {
  Cart,
  CartItem,
  ComboComponentSelection,
} from '../../types';

import {
  ProductConfigurationResult,
} from '../../components/ProductConfigurator/ProductConfiguratorModal';

import {
  WeeklySauce,
} from '../../services/weeklySauceService';

export function addConfiguredProductToCart(
  cart: Cart,
  product: CartItem['product'],
  notes: string,
  configuration:
    ProductConfigurationResult,
): Cart {
  const {
    selectedModifiers = [],
    comboComponents = [],
  } = configuration;

  const cleanNotes =
    notes.trim();

  const normalizedComponents =
    cloneComboComponents(
      comboComponents,
    );

  const modifierIdentifier =
    createModifierIdentifier(
      selectedModifiers,
    );

  const comboIdentifier =
    createComboIdentifier(
      normalizedComponents,
    );

  const cartItemId = [
    product.id,
    cleanNotes,
    modifierIdentifier,
    comboIdentifier,
  ].join('-');

  const itemToAdd:
    CartItem = {
    id:
      cartItemId,

    product: {
      ...product,
    },

    quantity: 1,

    notes:
      cleanNotes,

    selectedModifiers:
      selectedModifiers.map(
        (modifier) => ({
          ...modifier,
        }),
      ),

    comboComponents:
      normalizedComponents
        .length > 0
        ? normalizedComponents
        : undefined,
  };

  const existingItemIndex =
    cart.findIndex(
      (item) =>
        item.id ===
        cartItemId,
    );

  if (
    existingItemIndex ===
    -1
  ) {
    return [
      ...cart,
      itemToAdd,
    ];
  }

  return cart.map(
    (
      item,
      index,
    ) => {
      if (
        index !==
        existingItemIndex
      ) {
        return item;
      }

      const preservedComponents =
        item.comboComponents &&
        item.comboComponents
          .length > 0
          ? cloneComboComponents(
              item.comboComponents,
            )
          : cloneComboComponents(
              itemToAdd
                .comboComponents ??
              [],
            );

      return {
        ...item,

        quantity:
          item.quantity +
          itemToAdd.quantity,

        selectedModifiers:
          item.selectedModifiers
            .length > 0
            ? item
                .selectedModifiers
                .map(
                  (modifier) => ({
                    ...modifier,
                  }),
                )
            : itemToAdd
                .selectedModifiers
                .map(
                  (modifier) => ({
                    ...modifier,
                  }),
                ),

        comboComponents:
          preservedComponents
            .length > 0
            ? preservedComponents
            : undefined,
      };
    },
  );
}

export function updateCartQuantity(
  cart: Cart,
  itemId: string,
  change: number,
): Cart {
  return cart
    .map((item) => {
      if (
        item.id !== itemId
      ) {
        return item;
      }

      return {
        ...item,

        quantity:
          item.quantity +
          change,
      };
    })
    .filter(
      (item) =>
        item.quantity > 0,
    );
}

export function removeCartItem(
  cart: Cart,
  itemId: string,
): Cart {
  return cart.filter(
    (item) =>
      item.id !== itemId,
  );
}

export function getCartSummary(
  cart: Cart,
  weeklySauce:
    WeeklySauce | null,
) {
  const totalItems =
    cart.reduce(
      (
        total,
        item,
      ) =>
        total +
        item.quantity,
      0,
    );

  const subtotal =
    cart.reduce(
      (
        total,
        item,
      ) =>
        total +
        Number(
          item.product.price,
        ) *
        item.quantity,
      0,
    );

  const weeklySauceDiscount =
    weeklySauce
      ? cart.reduce(
          (
            total,
            item,
          ) =>
            total +
            getWeeklySauceDiscountForItem(
              item,
              weeklySauce,
            ),
          0,
        )
      : 0;

  const total =
    Math.max(
      0,
      subtotal -
      weeklySauceDiscount,
    );

  return {
    totalItems,
    subtotal,
    weeklySauceDiscount,
    total,
  };
}

function cloneComboComponents(
  components:
    | ComboComponentSelection[]
    | undefined,
): ComboComponentSelection[] {
  return (
    components ?? []
  ).map(
    (component) => ({
      ...component,

      product: {
        ...component.product,
      },

      selectedModifiers: (
        component
          .selectedModifiers ??
        []
      ).map(
        (modifier) => ({
          ...modifier,
        }),
      ),
    }),
  );
}

function createModifierIdentifier(
  modifiers:
    ProductConfigurationResult[
      'selectedModifiers'
    ],
): string {
  return (
    modifiers ?? []
  )
    .map(
      (modifier) =>
        modifier.id,
    )
    .sort()
    .join(',');
}

function createComboIdentifier(
  components:
    | ComboComponentSelection[]
    | undefined,
): string {
  return (
    components ?? []
  )
    .map(
      (component) => {
        const modifierIds = (
          component
            .selectedModifiers ??
          []
        )
          .map(
            (modifier) =>
              modifier.id,
          )
          .sort()
          .join(',');

        return [
          component.slotId,
          component.type,
          component.product.id,
          component.quantity,
          component.notes.trim(),
          modifierIds,
        ].join(':');
      },
    )
    .sort()
    .join('|');
}

function getWeeklySauceDiscountForItem(
  item: CartItem,
  weeklySauce:
    WeeklySauce,
): number {
  const discountPerEligibleUnit =
    Number(
      weeklySauce
        .discount_amount,
    );

  if (
    !Number.isFinite(
      discountPerEligibleUnit,
    ) ||
    discountPerEligibleUnit <=
      0
  ) {
    return 0;
  }

  const hasDirectWeeklySauce =
    item.selectedModifiers
      ?.some(
        (modifier) =>
          modifier.id ===
          weeklySauce
            .modifier_id,
      ) ??
    false;

  const directEligibleUnits =
    hasDirectWeeklySauce
      ? item.quantity
      : 0;

  const comboEligibleUnits =
    (
      item.comboComponents ??
      []
    ).reduce(
      (
        total,
        component,
      ) => {
        const hasWeeklySauce =
          component
            .selectedModifiers
            ?.some(
              (modifier) =>
                modifier.id ===
                weeklySauce
                  .modifier_id,
            ) ??
          false;

        if (
          !hasWeeklySauce
        ) {
          return total;
        }

        const componentQuantity =
          Number(
            component.quantity ??
            1,
          );

        return (
          total +
          (
            Number.isFinite(
              componentQuantity,
            ) &&
            componentQuantity >
              0
              ? componentQuantity
              : 1
          )
        );
      },
      0,
    );

  const eligibleUnits =
    directEligibleUnits +
    comboEligibleUnits *
      item.quantity;

  return (
    eligibleUnits *
    discountPerEligibleUnit
  );
}
