import {
  supabase,
} from './supabase';

const WEB_BANNERS_BUCKET =
  'web-banners';

const MAX_IMAGE_SIZE =
  5 * 1024 * 1024;

const ALLOWED_IMAGE_TYPES =
  new Set([
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/webp',
  ]);

export interface UploadedWebBannerImage {
  publicUrl: string;
  path: string;
}

export async function uploadWebBannerImage(
  uri: string,
  contentType: string,
): Promise<UploadedWebBannerImage> {
  if (!uri.trim()) {
    throw new Error(
      'La imagen no es válida.',
    );
  }

  const normalizedContentType =
    normalizeContentType(
      contentType,
    );

  if (
    !ALLOWED_IMAGE_TYPES.has(
      normalizedContentType,
    )
  ) {
    throw new Error(
      'Usa una imagen JPG, PNG o WEBP.',
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
    MAX_IMAGE_SIZE
  ) {
    throw new Error(
      'La imagen excede el límite de 5 MB.',
    );
  }

  const extension =
    getFileExtension(
      normalizedContentType,
    );

  const storagePath =
    `banners/${Date.now()}-${createRandomSuffix()}.${extension}`;

  const {
    error,
  } = await supabase.storage
    .from(
      WEB_BANNERS_BUCKET,
    )
    .upload(
      storagePath,
      arrayBuffer,
      {
        contentType:
          normalizedContentType,
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
      WEB_BANNERS_BUCKET,
    )
    .getPublicUrl(
      storagePath,
    );

  return {
    publicUrl:
      data.publicUrl,
    path:
      storagePath,
  };
}

export async function deleteWebBannerImage(
  path: string | null | undefined,
): Promise<void> {
  const cleanPath =
    path?.trim();

  if (!cleanPath) {
    return;
  }

  const {
    error,
  } = await supabase.storage
    .from(
      WEB_BANNERS_BUCKET,
    )
    .remove([
      cleanPath,
    ]);

  if (error) {
    throw new Error(
      `No se pudo eliminar la imagen: ${error.message}`,
    );
  }
}

function normalizeContentType(
  contentType: string,
): string {
  const normalized =
    contentType
      .trim()
      .toLowerCase();

  if (
    normalized ===
    'image/jpg'
  ) {
    return 'image/jpeg';
  }

  return normalized ||
    'image/jpeg';
}

function getFileExtension(
  contentType: string,
): string {
  switch (contentType) {
    case 'image/png':
      return 'png';

    case 'image/webp':
      return 'webp';

    case 'image/jpeg':
    default:
      return 'jpg';
  }
}

function createRandomSuffix():
  string {
  return Math.random()
    .toString(36)
    .slice(2, 10);
}
