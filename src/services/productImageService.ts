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

  const extension =
    getFileExtension(
      contentType,
    );

  const version =
    Date.now();

  const storagePath =
    `${cleanProductId}/${version}.${extension}`;

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

        upsert: false,

        cacheControl:
          '31536000',
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

function getFileExtension(
  contentType: string,
): string {
  const normalizedType =
    contentType
      .trim()
      .toLowerCase();

  switch (normalizedType) {
    case 'image/png':
      return 'png';

    case 'image/webp':
      return 'webp';

    case 'image/gif':
      return 'gif';

    case 'image/heic':
    case 'image/heif':
      return 'heic';

    case 'image/jpeg':
    case 'image/jpg':
    default:
      return 'jpg';
  }
}