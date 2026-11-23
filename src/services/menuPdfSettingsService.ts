import {
  supabase,
} from './supabase';

import {
  Category,
} from '../types';

import {
  getActiveCategories,
} from './categoryService';

export interface MenuPdfSettings {
  showDescriptions: boolean;
  showUnavailableProducts: boolean;
  showUpdatedDate: boolean;
  showLogo: boolean;
  qrEnabled: boolean;
  qrUrl: string;
  qrLabel: string;
}

export interface MenuPdfCategoryOrderItem {
  categoryId: string;
  position: number;
}

interface MenuPdfSettingsRow {
  show_descriptions: boolean | null;
  show_unavailable_products: boolean | null;
  show_updated_date: boolean | null;
  show_logo: boolean | null;
  qr_enabled: boolean | null;
  qr_url: string | null;
  qr_label: string | null;
}

interface MenuPdfCategoryOrderRow {
  category_id: string;
  position: number;
}

const DEFAULT_SETTINGS:
  MenuPdfSettings = {
    showDescriptions: true,
    showUnavailableProducts: true,
    showUpdatedDate: true,
    showLogo: true,
    qrEnabled: false,
    qrUrl: '',
    qrLabel: 'Escanea para ordenar',
  };

export async function getMenuPdfSettings():
  Promise<MenuPdfSettings> {
  const {
    data,
    error,
  } =
    await supabase
      .from(
        'menu_pdf_settings',
      )
      .select(`
        show_descriptions,
        show_unavailable_products,
        show_updated_date,
        show_logo,
        qr_enabled,
        qr_url,
        qr_label
      `)
      .eq(
        'id',
        1,
      )
      .maybeSingle();

  if (error) {
    throw new Error(
      `No se pudo cargar la configuración del menú PDF: ${error.message}`,
    );
  }

  const row =
    data as
      | MenuPdfSettingsRow
      | null;

  if (!row) {
    return {
      ...DEFAULT_SETTINGS,
    };
  }

  return {
    showDescriptions:
      row.show_descriptions !==
      false,

    showUnavailableProducts:
      row.show_unavailable_products !==
      false,

    showUpdatedDate:
      row.show_updated_date !==
      false,

    showLogo:
      row.show_logo !==
      false,

    qrEnabled:
      row.qr_enabled ===
      true,

    qrUrl:
      row.qr_url?.trim() ??
      '',

    qrLabel:
      row.qr_label?.trim() ||
      DEFAULT_SETTINGS.qrLabel,
  };
}

export async function saveMenuPdfSettings(
  settings:
    MenuPdfSettings,
): Promise<void> {
  const {
    error,
  } =
    await supabase
      .from(
        'menu_pdf_settings',
      )
      .upsert(
        {
          id:
            1,

          show_descriptions:
            settings.showDescriptions,

          show_unavailable_products:
            settings.showUnavailableProducts,

          show_updated_date:
            settings.showUpdatedDate,

          show_logo:
            settings.showLogo,

          qr_enabled:
            settings.qrEnabled,

          qr_url:
            settings.qrUrl.trim() ||
            null,

          qr_label:
            settings.qrLabel.trim() ||
            DEFAULT_SETTINGS.qrLabel,

          updated_at:
            new Date().toISOString(),
        },
        {
          onConflict:
            'id',
        },
      );

  if (error) {
    throw new Error(
      `No se pudo guardar la configuración del menú PDF: ${error.message}`,
    );
  }
}

export async function getMenuPdfCategoryOrder():
  Promise<
    MenuPdfCategoryOrderItem[]
  > {
  const {
    data,
    error,
  } =
    await supabase
      .from(
        'menu_pdf_category_order',
      )
      .select(
        'category_id, position',
      )
      .order(
        'position',
        {
          ascending:
            true,
        },
      );

  if (error) {
    throw new Error(
      `No se pudo cargar el orden de categorías del menú PDF: ${error.message}`,
    );
  }

  return (
    (
      data ??
      []
    ) as MenuPdfCategoryOrderRow[]
  ).map(
    row => ({
      categoryId:
        row.category_id,

      position:
        row.position,
    }),
  );
}

export async function saveMenuPdfCategoryOrder(
  categoryIds:
    string[],
): Promise<void> {
  const uniqueIds =
    Array.from(
      new Set(
        categoryIds,
      ),
    );

  const {
    error:
      deleteError,
  } =
    await supabase
      .from(
        'menu_pdf_category_order',
      )
      .delete()
      .neq(
        'position',
        -999999,
      );

  if (deleteError) {
    throw new Error(
      `No se pudo actualizar el orden del menú PDF: ${deleteError.message}`,
    );
  }

  if (
    uniqueIds.length ===
    0
  ) {
    return;
  }

  const {
    error,
  } =
    await supabase
      .from(
        'menu_pdf_category_order',
      )
      .insert(
        uniqueIds.map(
          (
            categoryId,
            index,
          ) => ({
            category_id:
              categoryId,

            position:
              index,
          }),
        ),
      );

  if (error) {
    throw new Error(
      `No se pudo guardar el orden del menú PDF: ${error.message}`,
    );
  }
}

export async function getOrderedMenuPdfCategories():
  Promise<Category[]> {
  const [
    categories,
    order,
  ] =
    await Promise.all([
      getActiveCategories(),
      getMenuPdfCategoryOrder(),
    ]);

  const positions =
    new Map(
      order.map(
        item => [
          item.categoryId,
          item.position,
        ],
      ),
    );

  return categories
    .filter(
      category =>
        category.is_active ===
        true,
    )
    .sort(
      (
        left,
        right,
      ) => {
        const leftPosition =
          positions.get(
            left.id,
          );

        const rightPosition =
          positions.get(
            right.id,
          );

        if (
          leftPosition !==
            undefined ||
          rightPosition !==
            undefined
        ) {
          return (
            (
              leftPosition ??
              Number.MAX_SAFE_INTEGER
            ) -
            (
              rightPosition ??
              Number.MAX_SAFE_INTEGER
            )
          );
        }

        return left.name.localeCompare(
          right.name,
          'es',
          {
            sensitivity:
              'base',
          },
        );
      },
    );
}
