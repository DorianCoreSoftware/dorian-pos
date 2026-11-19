import {
  supabase,
} from './supabase';

export type WebBannerPlacement =
  | 'carousel'
  | 'post_order'
  | 'both';

export type WebBannerAudience =
  | 'all'
  | 'guest'
  | 'registered';

export interface WebBanner {
  id: string;
  title: string | null;
  description: string | null;
  imageUrl: string;
  imagePath: string | null;
  targetUrl: string | null;
  placement: WebBannerPlacement;
  audience: WebBannerAudience;
  sortOrder: number;
  isActive: boolean;
  startsAt: string | null;
  endsAt: string | null;
  createdAt: string | null;
  updatedAt: string | null;
}

interface WebBannerRow {
  id: string;
  title: string | null;
  description: string | null;
  image_url: string;
  image_path?: string | null;
  target_url?: string | null;
  placement?: WebBannerPlacement | null;
  audience?: WebBannerAudience | null;
  sort_order: number;
  is_active?: boolean;
  starts_at?: string | null;
  ends_at?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface SaveWebBannerInput {
  title: string | null;
  description: string | null;
  imageUrl: string;
  imagePath: string;
  targetUrl: string | null;
  placement: WebBannerPlacement;
  audience: WebBannerAudience;
  sortOrder: number;
  isActive: boolean;
  startsAt: string | null;
  endsAt: string | null;
}

function mapBanner(
  row: WebBannerRow,
): WebBanner {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    imageUrl: row.image_url,
    imagePath: row.image_path ?? null,
    targetUrl: row.target_url ?? null,
    placement: row.placement ?? 'carousel',
    audience: row.audience ?? 'all',
    sortOrder: Number(row.sort_order ?? 0),
    isActive: row.is_active ?? true,
    startsAt: row.starts_at ?? null,
    endsAt: row.ends_at ?? null,
    createdAt: row.created_at ?? null,
    updatedAt: row.updated_at ?? null,
  };
}

const ADMIN_SELECT = `
  id,
  title,
  description,
  image_url,
  image_path,
  target_url,
  placement,
  audience,
  sort_order,
  is_active,
  starts_at,
  ends_at,
  created_at,
  updated_at
`;

export async function getAdminWebBanners():
  Promise<WebBanner[]> {
  const {
    data,
    error,
  } = await supabase
    .from('web_banners')
    .select(ADMIN_SELECT)
    .order(
      'sort_order',
      {
        ascending: true,
      },
    )
    .order(
      'created_at',
      {
        ascending: true,
      },
    );

  if (error) {
    throw new Error(
      error.message ||
      'No se pudo cargar la publicidad web.',
    );
  }

  return (data ?? []).map(
    row =>
      mapBanner(
        row as WebBannerRow,
      ),
  );
}

export async function getPublicWebBanners():
  Promise<WebBanner[]> {
  const {
    data,
    error,
  } = await supabase.rpc(
    'get_public_web_banners',
  );

  if (error) {
    throw new Error(
      error.message ||
      'No se pudo cargar la publicidad.',
    );
  }

  return (data ?? []).map(
    (row: WebBannerRow) =>
      mapBanner(row),
  );
}

export async function createWebBanner(
  input: SaveWebBannerInput,
): Promise<WebBanner> {
  const {
    data,
    error,
  } = await supabase
    .from('web_banners')
    .insert({
      title: input.title,
      description: input.description,
      image_url: input.imageUrl,
      image_path: input.imagePath,
      target_url: input.targetUrl,
      placement: input.placement,
      audience: input.audience,
      sort_order: input.sortOrder,
      is_active: input.isActive,
      starts_at: input.startsAt,
      ends_at: input.endsAt,
    })
    .select(ADMIN_SELECT)
    .single();

  if (error) {
    throw new Error(
      error.message ||
      'No se pudo crear la publicidad.',
    );
  }

  return mapBanner(
    data as WebBannerRow,
  );
}

export async function updateWebBanner(
  id: string,
  input: SaveWebBannerInput,
): Promise<WebBanner> {
  const {
    data,
    error,
  } = await supabase
    .from('web_banners')
    .update({
      title: input.title,
      description: input.description,
      image_url: input.imageUrl,
      image_path: input.imagePath,
      target_url: input.targetUrl,
      placement: input.placement,
      audience: input.audience,
      sort_order: input.sortOrder,
      is_active: input.isActive,
      starts_at: input.startsAt,
      ends_at: input.endsAt,
    })
    .eq(
      'id',
      id,
    )
    .select(ADMIN_SELECT)
    .single();

  if (error) {
    throw new Error(
      error.message ||
      'No se pudo actualizar la publicidad.',
    );
  }

  return mapBanner(
    data as WebBannerRow,
  );
}

export async function setWebBannerActive(
  id: string,
  isActive: boolean,
): Promise<void> {
  const {
    error,
  } = await supabase
    .from('web_banners')
    .update({
      is_active: isActive,
    })
    .eq(
      'id',
      id,
    );

  if (error) {
    throw new Error(
      error.message ||
      'No se pudo cambiar el estado de la publicidad.',
    );
  }
}

export async function reorderWebBanners(
  bannerIds: string[],
): Promise<void> {
  const {
    error,
  } = await supabase.rpc(
    'reorder_web_banners',
    {
      p_banner_ids: bannerIds,
    },
  );

  if (error) {
    throw new Error(
      error.message ||
      'No se pudo guardar el orden de la publicidad.',
    );
  }
}

export async function deleteWebBanner(
  id: string,
): Promise<void> {
  const {
    error,
  } = await supabase
    .from('web_banners')
    .delete()
    .eq(
      'id',
      id,
    );

  if (error) {
    throw new Error(
      error.message ||
      'No se pudo eliminar la publicidad.',
    );
  }
}
