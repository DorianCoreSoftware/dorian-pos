import { supabase } from './supabase';
import { Product, Category } from '../types'; // Importas desde tus interfaces modulares

// Traer las categorías reales de Supabase
export const getCategories = async (): Promise<Category[]> => {
  const { data, error } = await supabase
    .from('categories')
    .select('*');

  if (error) {
    console.error('Error fetching categories:', error.message);
    throw new Error(error.message);
  }

  return data as Category[];
};

// Traer los productos reales de Supabase (solo los disponibles para vender)
export const getActiveProducts = async (): Promise<Product[]> => {
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .eq('is_available', true)
    .eq('is_active', true); // <--- Filtramos por ambas banderas de seguridad

  if (error) {
    console.error('Error fetching products:', error.message);
    throw new Error(error.message);
  }

  const formattedProducts = data.map((item: any) => ({
    ...item,
    price: typeof item.price === 'string' ? parseFloat(item.price) : item.price
  }));

  return formattedProducts as Product[];
};

/**
 * Actualiza el precio de un producto en la base de datos
 * @param productId ID único del producto
 * @param newPrice Nuevo precio del producto
 */
export const updateProductPrice = async (productId: string, newPrice: number) => {
  const { data, error } = await supabase
    .from('products') // Asegúrate de que coincida con el nombre de tu tabla
    .update({ price: newPrice })
    .eq('id', productId)
    .select()
    .single();

  if (error) {
    console.error("Error al actualizar el precio:", error);
    throw error;
  }
  
  return data;
};