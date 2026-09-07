import {
  supabase,
} from '../services/supabase';

import {
  Category,
  Product,
} from '../types';

export interface UpdateProductData {
  name: string;
  description: string | null;
  price: number;
}

export interface AdminUpdateProductData {
  name: string;
  description: string | null;
  price: number;
  categoryId: string;
  isAvailable: boolean;
  imageUrl?: string | null;
}

export interface CreateProductData {
  name: string;
  description: string | null;
  price: number;
  categoryId: string;
}

export async function fetchCategories(): Promise<
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
      created_at
    `)
    .order(
      'created_at',
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

export async function fetchActiveProducts(): Promise<
  Product[]
> {
  const {
    data,
    error,
  } = await supabase
    .from('products')
    .select('*')
    .eq(
      'is_available',
      true,
    )
    .eq(
      'is_active',
      true,
    );

  if (error) {
    throw new Error(
      error.message,
    );
  }

  return (
    data ?? []
  ) as Product[];
}

export async function fetchAllProducts(): Promise<
  Product[]
> {
  const {
    data,
    error,
  } = await supabase
    .from('products')
    .select('*')
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
  ) as Product[];
}

export async function insertProduct(
  productData:
    CreateProductData,
): Promise<Product> {
  const {
    data,
    error,
  } = await supabase
    .from('products')
    .insert({
      name:
        productData.name,

      description:
        productData.description,

      price:
        productData.price,

      category_id:
        productData.categoryId,

      is_active:
        true,

      is_available:
        true,
    })
    .select()
    .single();

  if (error) {
    throw new Error(
      error.message,
    );
  }

  return data as Product;
}

export async function updateProductById(
  productId: string,
  productData:
    UpdateProductData,
): Promise<Product> {
  const {
    data,
    error,
  } = await supabase
    .from('products')
    .update({
      name:
        productData.name,

      description:
        productData.description,

      price:
        productData.price,
    })
    .eq(
      'id',
      productId,
    )
    .select()
    .single();

  if (error) {
    throw new Error(
      error.message,
    );
  }

  return data as Product;
}

export async function adminUpdateProductById(
  productId: string,
  productData:
    AdminUpdateProductData,
): Promise<Product> {
  const updateData: {
    name: string;
    description: string | null;
    price: number;
    category_id: string;
    is_available: boolean;
    image_url?: string | null;
  } = {
    name:
      productData.name,

    description:
      productData.description,

    price:
      productData.price,

    category_id:
      productData.categoryId,

    is_available:
      productData.isAvailable,
  };

  if (
    productData.imageUrl !==
    undefined
  ) {
    updateData.image_url =
      productData.imageUrl;
  }

  const {
    data,
    error,
  } = await supabase
    .from('products')
    .update(
      updateData,
    )
    .eq(
      'id',
      productId,
    )
    .select()
    .single();

  if (error) {
    throw new Error(
      error.message,
    );
  }

  return data as Product;
}

export async function updateProductImageById(
  productId: string,
  imageUrl:
    string | null,
): Promise<Product> {
  const {
    data,
    error,
  } = await supabase
    .from('products')
    .update({
      image_url:
        imageUrl,
    })
    .eq(
      'id',
      productId,
    )
    .select()
    .single();

  if (error) {
    throw new Error(
      error.message,
    );
  }

  return data as Product;
}

export async function setProductActiveById(
  productId: string,
  isActive: boolean,
): Promise<Product> {
  const {
    data,
    error,
  } = await supabase
    .from('products')
    .update({
      is_active:
        isActive,
    })
    .eq(
      'id',
      productId,
    )
    .select()
    .single();

  if (error) {
    throw new Error(
      error.message,
    );
  }

  return data as Product;
}

export async function deactivateProductById(
  productId: string,
): Promise<Product> {
  return setProductActiveById(
    productId,
    false,
  );
}

export async function updateProductPriceById(
  productId: string,
  newPrice: number,
): Promise<Product> {
  const {
    data,
    error,
  } = await supabase
    .from('products')
    .update({
      price:
        newPrice,
    })
    .eq(
      'id',
      productId,
    )
    .select()
    .single();

  if (error) {
    throw new Error(
      error.message,
    );
  }

  return data as Product;
}

export interface LuckyDorianRefundResult {
  redemptionId: string;
  refundId: string;
  orderId: string;
  paymentMethod:
    | 'cash'
    | 'card';
  amount: number;
}