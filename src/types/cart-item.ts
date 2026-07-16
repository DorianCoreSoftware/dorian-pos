// src/types/cart.ts (o similar)
import { Product } from './product';

export interface CartItem {
  id: string; // ID único que combina producto + notas/modificadores
  product: Product;
  quantity: number;
  notes: string;
}