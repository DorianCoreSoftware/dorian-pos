import { supabase } from '../services/supabase';

import {
  Category,
  Product,
} from '../types';

export interface UpdateProductData {
  name: string;
  description: string | null;
  price: number;
}

export async function fetchCategories(): Promise<Category[]> {
  const { data, error } = await supabase
    .from('categories')
    .select(`
      id,
      name,
      description,
      created_at
    `)
    .order('created_at', {
      ascending: true,
    });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as Category[];
}

export async function fetchActiveProducts(): Promise<
  Product[]
> {
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .eq('is_available', true)
    .eq('is_active', true);

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as Product[];
}

export async function updateProductById(
  productId: string,
  productData: UpdateProductData,
): Promise<Product> {
  const { data, error } = await supabase
    .from('products')
    .update({
      name: productData.name,
      description:
        productData.description,
      price: productData.price,
    })
    .eq('id', productId)
    .select()
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data as Product;
}

export async function deactivateProductById(
  productId: string,
): Promise<Product> {
  const { data, error } = await supabase
    .from('products')
    .update({
      is_active: false,
    })
    .eq('id', productId)
    .select()
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data as Product;
}

export async function updateProductPriceById(
  productId: string,
  newPrice: number,
): Promise<Product> {
  const { data, error } = await supabase
    .from('products')
    .update({
      price: newPrice,
    })
    .eq('id', productId)
    .select()
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data as Product;
}