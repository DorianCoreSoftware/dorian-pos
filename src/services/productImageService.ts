import {
  supabase,
} from './supabase';

import * as ImageManipulator from 'expo-image-manipulator';

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

const PROMOTION_IMAGES_BUCKET =
  'promotion-images';

export interface PromotionTicketImageResult {
  imageUrl: string;
  rasterBase64: string;
  width: number;
  height: number;
}

export async function uploadPromotionTicketImage(
  promotionId: string,
  uri: string,
): Promise<PromotionTicketImageResult> {
  const cleanPromotionId =
    promotionId.trim();

  if (!cleanPromotionId) {
    throw new Error(
      'El identificador de la promoción es obligatorio.',
    );
  }

  if (!uri.trim()) {
    throw new Error(
      'La imagen de la promoción no es válida.',
    );
  }

  const manipulated =
    await ImageManipulator.manipulateAsync(
      uri,
      [
        {
          resize: {
            width: 384,
          },
        },
      ],
      {
        compress: 0.88,
        format:
          ImageManipulator.SaveFormat.JPEG,
        base64: true,
      },
    );

  if (!manipulated.base64) {
    throw new Error(
      'No se pudo preparar la imagen para impresión.',
    );
  }

  const imageResponse =
    await fetch(
      manipulated.uri,
    );

  if (!imageResponse.ok) {
    throw new Error(
      'No se pudo leer la imagen procesada.',
    );
  }

  const imageBytes =
    await imageResponse.arrayBuffer();

  const version =
    Date.now();

  const storagePath =
    `${cleanPromotionId}/${version}.jpg`;

  const {
    error: uploadError,
  } = await supabase.storage
    .from(
      PROMOTION_IMAGES_BUCKET,
    )
    .upload(
      storagePath,
      imageBytes,
      {
        contentType:
          'image/jpeg',

        upsert:
          false,

        cacheControl:
          '31536000',
      },
    );

  if (uploadError) {
    throw new Error(
      `No se pudo subir la imagen de promoción: ${uploadError.message}`,
    );
  }

  const {
    data: publicUrlData,
  } = supabase.storage
    .from(
      PROMOTION_IMAGES_BUCKET,
    )
    .getPublicUrl(
      storagePath,
    );

  const {
    data: rasterData,
    error: rasterError,
  } = await supabase.functions.invoke(
    'promotion-ticket-image',
    {
      body: {
        imageBase64:
          manipulated.base64,

        mimeType:
          'image/jpeg',

        maxWidth:
          384,
      },
    },
  );

  if (rasterError) {
    throw new Error(
      `No se pudo convertir la imagen para ticket: ${rasterError.message}`,
    );
  }

  const raster =
    rasterData as
      | {
          base64?: unknown;
          width?: unknown;
          height?: unknown;
        }
      | null;

  if (
    !raster ||
    typeof raster.base64 !==
      'string' ||
    !Number.isFinite(
      Number(
        raster.width,
      ),
    ) ||
    !Number.isFinite(
      Number(
        raster.height,
      ),
    )
  ) {
    throw new Error(
      'La conversión de imagen no devolvió un raster válido.',
    );
  }

  return {
    imageUrl:
      publicUrlData.publicUrl,

    rasterBase64:
      raster.base64,

    width:
      Number(
        raster.width,
      ),

    height:
      Number(
        raster.height,
      ),
  };
}
