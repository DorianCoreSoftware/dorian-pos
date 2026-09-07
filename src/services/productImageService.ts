import {
  supabase,
} from './supabase';

const PRODUCT_IMAGES_BUCKET =
  'product-images';

export async function uploadProductImage(
  productId: string,
  uri: string,
  contentType: string,
): Promise<string> {
  const cleanProductId =
    productId.trim();

  if (!cleanProductId) {
    throw new Error(
      'El identificador del producto es obligatorio.',
    );
  }

  if (!uri.trim()) {
    throw new Error(
      'La imagen no es válida.',
    );
  }

  const response =
    await fetch(uri);

  if (!response.ok) {
    throw new Error(
      'No se pudo leer la imagen seleccionada.',
    );
  }

  const arrayBuffer =
    await response.arrayBuffer();

  if (
    arrayBuffer.byteLength >
    5 * 1024 * 1024
  ) {
    throw new Error(
      'La imagen excede el límite de 5 MB.',
    );
  }

  const storagePath =
    `${cleanProductId}/main`;

    const {
  data: sessionData,
  error: sessionError,
} = await supabase.auth.getSession();

console.log(
  '🔐 STORAGE SESSION',
  {
    session:
      sessionData.session,

    userId:
      sessionData.session?.user.id ??
      null,

    role:
      sessionData.session?.user.role ??
      null,

    error:
      sessionError,
  },
);

  const {
    error,
  } = await supabase.storage
    .from(
      PRODUCT_IMAGES_BUCKET,
    )
    .upload(
      storagePath,
      arrayBuffer,
      {
        contentType:
          contentType ||
          'image/jpeg',

        upsert:
          true,

        cacheControl:
          '3600',
      },
    );

  if (error) {
    throw new Error(
      `No se pudo subir la imagen: ${error.message}`,
    );
  }

  const {
    data,
  } = supabase.storage
    .from(
      PRODUCT_IMAGES_BUCKET,
    )
    .getPublicUrl(
      storagePath,
    );

  return data.publicUrl;
}