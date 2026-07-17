import { Category } from './category';

export interface Product {
  id: string;
  category_id: string;
  name: string;
  description: string | null;
  price: number;
  image_url: string | null; // Obligatorio en la interfaz (puede ser un string o null)
  is_available: boolean;    // Obligatorio en la interfaz
  is_active: boolean;       // ← Añadimos el nuevo campo
  created_at: string;
  category?: Category; 
}