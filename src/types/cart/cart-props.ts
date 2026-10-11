import { CartItem } from "./cart-item";

export interface CartProps {
  cart: CartItem[];

  onUpdateQuantity: (
    itemId: string,
    change: number,
  ) => void;

  onRemoveItem: (
    itemId: string,
  ) => void;

  onClearCart: () => void;

  onCheckout: (
    totalAmount: number,
  ) => void;

  onToggleDelivery: () => void;

  onEditDelivery: () => void;

  isMobile?: boolean;
}