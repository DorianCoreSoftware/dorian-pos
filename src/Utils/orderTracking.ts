export function getOrderTrackingCode(
  orderId: string,
): string {
  return orderId
    .split('-')[0]
    .toUpperCase();
}