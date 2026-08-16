import {
  supabase,
} from '../services/supabase';

import {
  Category,
} from '../types';

export interface CreateCategoryData {
  name: string;
  description: string | null;
}

export interface UpdateCategoryData {
  name: string;
  description: string | null;
}

export async function fetchActiveCategories(): Promise<
  Category[]
> {
  const {
    data,
    error,
  } = await supabase
    .from('categories')
    .select(`
      id,
      name,
      description,
      created_at,
      is_active
    `)
    .eq(
      'is_active',
      true,
    )
    .order(
      'name',
      {
        ascending: true,
      },
    );

  if (error) {
    throw new Error(
      error.message,
    );
  }

  return (
    data ?? []
  ) as Category[];
}

export async function fetchAllCategories(): Promise<
  Category[]
> {
  const {
    data,
    error,
  } = await supabase
    .from('categories')
    .select(`
      id,
      name,
      description,
      created_at,
      is_active
    `)
    .order(
      'name',
      {
        ascending: true,
      },
    );

  if (error) {
    throw new Error(
      error.message,
    );
  }

  return (
    data ?? []
  ) as Category[];
}

export async function insertCategory(
  categoryData:
    CreateCategoryData,
): Promise<Category> {
  const {
    data,
    error,
  } = await supabase
    .from('categories')
    .insert({
      name:
        categoryData.name,

      description:
        categoryData.description,

      is_active:
        true,
    })
    .select()
    .single();

  if (error) {
    throw new Error(
      error.message,
    );
  }

  return data as Category;
}

export async function updateCategoryById(
  categoryId: string,
  categoryData:
    UpdateCategoryData,
): Promise<Category> {
  const {
    data,
    error,
  } = await supabase
    .from('categories')
    .update({
      name:
        categoryData.name,

      description:
        categoryData.description,
    })
    .eq(
      'id',
      categoryId,
    )
    .select()
    .single();

  if (error) {
    throw new Error(
      error.message,
    );
  }

  return data as Category;
}

export async function setCategoryActiveById(
  categoryId: string,
  isActive: boolean,
): Promise<Category> {
  const {
    data,
    error,
  } = await supabase
    .from('categories')
    .update({
      is_active:
        isActive,
    })
    .eq(
      'id',
      categoryId,
    )
    .select()
    .single();

  if (error) {
    throw new Error(
      error.message,
    );
  }

  return data as Category;
}