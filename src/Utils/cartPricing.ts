import {
  CartItem,
  SelectedModifier,
} from '../types';

export function getModifierExtraTotal(
  modifiers: SelectedModifier[] | undefined,
): number {
  return (modifiers ?? []).reduce(
    (total, modifier) =>
      total +
      safeMoney(
        Number(modifier.extra_price ?? 0),
      ),
    0,
  );
}


export function groupModifiersForDisplay(
  modifiers: SelectedModifier[] | undefined,
): Array<{
  modifier: SelectedModifier;
  count: number;
}> {
  const grouped = new Map<
    string,
    {
      modifier: SelectedModifier;
      count: number;
    }
  >();

  for (const modifier of modifiers ?? []) {
    const current = grouped.get(modifier.id);

    if (current) {
      current.count += 1;
      continue;
    }

    grouped.set(modifier.id, {
      modifier,
      count: 1,
    });
  }

  return Array.from(grouped.values());
}

export function getCartItemUnitPrice(
  item: CartItem,
): number {
  const basePrice =
    safeMoney(
      Number(item.product.price ?? 0),
    );

  const directModifiers =
    getModifierExtraTotal(
      item.selectedModifiers,
    );

  const componentModifiers =
    (item.comboComponents ?? []).reduce(
      (total, component) => {
        const quantity =
          Math.max(
            1,
            Number(component.quantity ?? 1),
          );

        return (
          total +
          getModifierExtraTotal(
            component.selectedModifiers,
          ) * quantity
        );
      },
      0,
    );

  return safeMoney(
    basePrice +
    directModifiers +
    componentModifiers,
  );
}

export function getCartItemLineTotal(
  item: CartItem,
): number {
  return safeMoney(
    getCartItemUnitPrice(item) *
      Math.max(0, Number(item.quantity ?? 0)),
  );
}

function safeMoney(
  amount: number,
): number {
  if (!Number.isFinite(amount)) {
    return 0;
  }

  return Math.round((amount + Number.EPSILON) * 100) / 100;
}
