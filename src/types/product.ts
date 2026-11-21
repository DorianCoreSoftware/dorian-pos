import { Category } from "./category";

export type ProductCookingMethod = "oil" | "air_fryer";

export interface Product {
  id: string;
  category_id: string;
  name: string;
  description: string | null;
  price: number;
  image_url: string | null;
  is_available: boolean;
  is_active: boolean;
  allows_oil_fryer?: boolean;
  allows_air_fryer?: boolean;
  air_fryer_extra_minutes?: number;
  max_extra_items?: number;
  created_at: string;
  category?: Category;
}