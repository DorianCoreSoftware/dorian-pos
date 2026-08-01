export interface DeliveryDetails {
  customerName: string;
  phone: string;

  street: string;
  exteriorNumber: string;
  interiorNumber: string;

  neighborhood: string;
  postalCode: string;

  deliveryReferences: string;

  latitude: number | null;
  longitude: number | null;
}

export interface OrderDeliveryDetails {
  id: string;
  orderId: string;

  customerName: string;
  phone: string;

  street: string;
  exteriorNumber: string;
  interiorNumber: string | null;

  neighborhood: string;
  postalCode: string | null;

  deliveryReferences: string | null;

  latitude: number | null;
  longitude: number | null;

  createdAt: string;
  updatedAt: string;
}