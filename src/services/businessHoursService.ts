import { DEFAULT_BRAND_PRIMARY } from '../theme/brandStyles';

import { supabase } from './supabase';
import { DEFAULT_CURRENCY_CODE } from '../Utils/currency';

export interface BusinessHour {
  id: string;
  dayOfWeek: number;
  isOpen: boolean;
  openTime: string;
  closeTime: string;
}

export interface BusinessIdentity {
  businessName: string;
  shortName: string;
  currencyCode: string;
  phone: string;
  address: string;
  logoUrl: string;
  primaryColor: string;
  secondaryColor: string;
}

export interface BusinessFeatures {
  loyaltyEnabled: boolean;
  deliveryEnabled: boolean;
  promotionsEnabled: boolean;
  kitchenEnabled: boolean;
  eventsEnabled: boolean;
  invoicingEnabled: boolean;
}

export interface WebOrderSettings {
  webOrdersEnabled: boolean;
  webOrdersPauseMessage: string;
}

export interface BusinessTicketSettings {
  footerText: string;
}

export interface BusinessSocialLinks {
  facebookUrl: string;
  instagramUrl: string;
  tiktokUrl: string;
  whatsapp: string;
  websiteUrl: string;
}

export interface BusinessSettings {
  identity: BusinessIdentity;
  features: BusinessFeatures;
  timezone: string;
  ticketSettings: BusinessTicketSettings;
  webOrderSettings: WebOrderSettings;
  socialLinks: BusinessSocialLinks;
}

export interface SaveBusinessSettingsInput {
  identity: Pick<
    BusinessIdentity,
    | 'businessName'
    | 'shortName'
    | 'currencyCode'
    | 'phone'
    | 'address'
  >;
  timezone: string;
  ticketSettings: BusinessTicketSettings;
  socialLinks: BusinessSocialLinks;
}

export interface BusinessHourException {
  id: string;
  exceptionDate: string;
  isOpen: boolean;
  openTime: string;
  closeTime: string;
  reason: string;
}

export interface SaveBusinessHourExceptionInput {
  id?: string;
  exceptionDate: string;
  isOpen: boolean;
  openTime: string;
  closeTime: string;
  reason: string;
}

interface BusinessHourRow {
  id: string;
  day_of_week: number;
  is_open: boolean;
  open_time: string;
  close_time: string;
}

interface BusinessSettingsRow {
  business_name: string | null;
  short_name: string | null;
  currency_code: string | null;
  phone: string | null;
  address: string | null;
  logo_url: string | null;
  primary_color: string | null;
  secondary_color: string | null;
  loyalty_enabled: boolean | null;
  delivery_enabled: boolean | null;
  promotions_enabled: boolean | null;
  kitchen_enabled: boolean | null;
  events_enabled: boolean | null;
  invoicing_enabled: boolean | null;
  timezone: string;
  web_orders_enabled: boolean;
  web_orders_pause_message: string | null;
  ticket_footer: string | null;
  facebook_url: string | null;
  instagram_url: string | null;
  tiktok_url: string | null;
  whatsapp: string | null;
  website_url: string | null;
}

interface BusinessHourExceptionRow {
  id: string;
  exception_date: string;
  is_open: boolean;
  open_time: string | null;
  close_time: string | null;
  reason: string | null;
}

const DEFAULT_TIMEZONE =
  'America/Mexico_City';

const DEFAULT_BUSINESS_NAME =
  'Dorian POS';

const DEFAULT_PRIMARY_COLOR =
  DEFAULT_BRAND_PRIMARY;

const DEFAULT_SECONDARY_COLOR =
  '#000000';

export async function getBusinessHours(): Promise<
  BusinessHour[]
> {
  const { data, error } =
    await supabase
      .from('business_hours')
      .select(
        'id, day_of_week, is_open, open_time, close_time',
      )
      .order(
        'day_of_week',
        {
          ascending: true,
        },
      );

  if (error) {
    throw new Error(
      `No se pudieron obtener los horarios: ${error.message}`,
    );
  }

  return (
    (data ?? []) as BusinessHourRow[]
  ).map(
    (row) => ({
      id:
        row.id,

      dayOfWeek:
        row.day_of_week,

      isOpen:
        row.is_open,

      openTime:
        row.open_time.slice(
          0,
          5,
        ),

      closeTime:
        row.close_time.slice(
          0,
          5,
        ),
    }),
  );
}

export async function saveBusinessHours(
  hours: BusinessHour[],
): Promise<void> {
  if (
    hours.length !==
    7
  ) {
    throw new Error(
      'Deben existir horarios para los 7 días.',
    );
  }

  const timeRegex =
    /^([01]\d|2[0-3]):[0-5]\d$/;

  hours.forEach(
    (hour) => {
      if (
        !hour.isOpen
      ) {
        return;
      }

      if (
        !timeRegex.test(
          hour.openTime,
        ) ||
        !timeRegex.test(
          hour.closeTime,
        )
      ) {
        throw new Error(
          'Los horarios deben usar el formato HH:MM.',
        );
      }

      if (
        hour.openTime ===
        hour.closeTime
      ) {
        throw new Error(
          'La hora de apertura y cierre no pueden ser iguales.',
        );
      }
    },
  );

  const { error } =
    await supabase
      .from(
        'business_hours',
      )
      .upsert(
        hours.map(
          (hour) => ({
            id:
              hour.id,

            day_of_week:
              hour.dayOfWeek,

            is_open:
              hour.isOpen,

            open_time:
              hour.openTime,

            close_time:
              hour.closeTime,
          }),
        ),
        {
          onConflict:
            'day_of_week',
        },
      );

  if (error) {
    throw new Error(
      `No se pudieron guardar los horarios: ${error.message}`,
    );
  }
}

export async function getBusinessSettings(): Promise<
  BusinessSettings
> {
  const {
    data,
    error,
  } =
    await supabase
      .from(
        'business_settings',
      )
      .select(
        `
    business_name,
    short_name,
    currency_code,
    phone,
    address,
    logo_url,
    primary_color,
    secondary_color,
    loyalty_enabled,
    delivery_enabled,
    promotions_enabled,
    kitchen_enabled,
    events_enabled,
    invoicing_enabled,
    timezone,
    web_orders_enabled,
    web_orders_pause_message,
    ticket_footer,
    facebook_url,
    instagram_url,
    tiktok_url,
    whatsapp,
    website_url
  `,
      )
      .eq(
        'id',
        1,
      )
      .single();

  if (error) {
    throw new Error(
      `No se pudo obtener la configuración del negocio: ${error.message}`,
    );
  }

  const row =
    data as BusinessSettingsRow;

  const businessName =
    row.business_name
      ?.trim() ||
    DEFAULT_BUSINESS_NAME;

  return {
    identity: {
      businessName,

      shortName:
        row.short_name
          ?.trim() ||
        businessName,

      currencyCode:
        row.currency_code
          ?.trim() ||
        DEFAULT_CURRENCY_CODE,

      phone:
        row.phone
          ?.trim() ??
        '',

      address:
        row.address
          ?.trim() ??
        '',

      logoUrl:
        row.logo_url
          ?.trim() ??
        '',

      primaryColor:
        row.primary_color
          ?.trim() ||
        DEFAULT_PRIMARY_COLOR,

      secondaryColor:
        row.secondary_color
          ?.trim() ||
        DEFAULT_SECONDARY_COLOR,
    },

    features: {
      loyaltyEnabled:
        row.loyalty_enabled ??
        true,

      deliveryEnabled:
        row.delivery_enabled ??
        true,

      promotionsEnabled:
        row.promotions_enabled ??
        true,

      kitchenEnabled:
        row.kitchen_enabled ??
        true,

      eventsEnabled:
        row.events_enabled ??
        false,

      invoicingEnabled:
        row.invoicing_enabled ??
        false,
    },

    timezone:
      row.timezone ??
      DEFAULT_TIMEZONE,

    ticketSettings: {
      footerText:
        row.ticket_footer
          ?.trim() ||
        'Gracias por tu compra',
    },

    webOrderSettings: {
      webOrdersEnabled:
        row.web_orders_enabled ??
        true,

      webOrdersPauseMessage:
        row.web_orders_pause_message ??
        '',
    },

    socialLinks: {
      facebookUrl:
        row.facebook_url
          ?.trim() ??
        '',

      instagramUrl:
        row.instagram_url
          ?.trim() ??
        '',

      tiktokUrl:
        row.tiktok_url
          ?.trim() ??
        '',

      whatsapp:
        row.whatsapp
          ?.trim() ??
        '',

      websiteUrl:
        row.website_url
          ?.trim() ??
        '',
    },
  };
}


function normalizeHttpUrl(
  value: string,
  label: string,
): string {
  const normalized =
    value.trim();

  if (!normalized) {
    return '';
  }

  const withProtocol =
    /^https?:\/\//i.test(
      normalized,
    )
      ? normalized
      : `https://${normalized}`;

  if (
    !/^https?:\/\/[^\s]+$/i.test(
      withProtocol,
    )
  ) {
    throw new Error(
      `${label} no es una URL válida.`,
    );
  }

  return withProtocol;
}

function normalizeWhatsapp(
  value: string,
): string {
  const normalized =
    value.trim();

  if (!normalized) {
    return '';
  }

  if (
    /^https?:\/\//i.test(
      normalized,
    )
  ) {
    return normalizeHttpUrl(
      normalized,
      'WhatsApp',
    );
  }

  const digits =
    normalized.replace(
      /\D/g,
      '',
    );

  if (
    digits.length < 10 ||
    digits.length > 15
  ) {
    throw new Error(
      'WhatsApp debe contener un número válido con lada y código de país.',
    );
  }

  return `https://wa.me/${digits}`;
}

export async function saveBusinessSettings(
  input: SaveBusinessSettingsInput,
): Promise<void> {
  const businessName =
    input.identity.businessName.trim();

  const shortName =
    input.identity.shortName.trim();

  const currencyCode =
    input.identity.currencyCode
      .trim()
      .toUpperCase();

  const phone =
    input.identity.phone.trim();

  const address =
    input.identity.address.trim();

  const timezone =
    input.timezone.trim();

  const ticketFooter =
    input.ticketSettings.footerText.trim();

  const facebookUrl =
    normalizeHttpUrl(
      input.socialLinks.facebookUrl,
      'Facebook',
    );

  const instagramUrl =
    normalizeHttpUrl(
      input.socialLinks.instagramUrl,
      'Instagram',
    );

  const tiktokUrl =
    normalizeHttpUrl(
      input.socialLinks.tiktokUrl,
      'TikTok',
    );

  const whatsapp =
    normalizeWhatsapp(
      input.socialLinks.whatsapp,
    );

  const websiteUrl =
    normalizeHttpUrl(
      input.socialLinks.websiteUrl,
      'Sitio web',
    );

  if (!businessName) {
    throw new Error(
      'El nombre del negocio es obligatorio.',
    );
  }

  if (businessName.length > 80) {
    throw new Error(
      'El nombre del negocio no puede superar 80 caracteres.',
    );
  }

  if (shortName.length > 40) {
    throw new Error(
      'El nombre corto no puede superar 40 caracteres.',
    );
  }

  if (!/^[A-Z]{3}$/.test(currencyCode)) {
    throw new Error(
      'La moneda debe usar un código ISO de 3 letras, por ejemplo MXN o USD.',
    );
  }

  if (address.length > 180) {
    throw new Error(
      'La dirección no puede superar 180 caracteres.',
    );
  }

  if (ticketFooter.length > 180) {
    throw new Error(
      'El pie del ticket no puede superar 180 caracteres.',
    );
  }

  if (phone.length > 30) {
    throw new Error(
      'El teléfono no puede superar 30 caracteres.',
    );
  }

  const socialValues = [
    facebookUrl,
    instagramUrl,
    tiktokUrl,
    whatsapp,
    websiteUrl,
  ];

  if (
    socialValues.some(
      value =>
        value.length > 220,
    )
  ) {
    throw new Error(
      'Las URLs de redes sociales no pueden superar 220 caracteres.',
    );
  }

  if (!timezone) {
    throw new Error(
      'La zona horaria es obligatoria.',
    );
  }

  const { error } =
    await supabase
      .from('business_settings')
      .update({
        business_name:
          businessName,

        short_name:
          shortName ||
          businessName,

        currency_code:
          currencyCode,

        phone:
          phone || null,

        address:
          address || null,

        timezone,

        ticket_footer:
          ticketFooter ||
          'Gracias por tu compra',

        facebook_url:
          facebookUrl || null,

        instagram_url:
          instagramUrl || null,

        tiktok_url:
          tiktokUrl || null,

        whatsapp:
          whatsapp || null,

        website_url:
          websiteUrl || null,

        updated_at:
          new Date().toISOString(),
      })
      .eq('id', 1);

  if (error) {
    throw new Error(
      `No se pudo guardar la configuración del negocio: ${error.message}`,
    );
  }
}

export async function getBusinessIdentity(): Promise<
  BusinessIdentity
> {
  const settings =
    await getBusinessSettings();

  return settings.identity;
}

export async function getBusinessFeatures(): Promise<
  BusinessFeatures
> {
  const settings =
    await getBusinessSettings();

  return settings.features;
}

export async function getBusinessTimezone(): Promise<
  string
> {
  const settings =
    await getBusinessSettings();

  return settings.timezone;
}

export async function getWebOrderSettings(): Promise<
  WebOrderSettings
> {
  const settings =
    await getBusinessSettings();

  return settings.webOrderSettings;
}

export async function saveWebOrderSettings(
  settings: WebOrderSettings,
): Promise<void> {
  const pauseMessage =
    settings
      .webOrdersPauseMessage
      .trim()
      .slice(
        0,
        250,
      );

  const { error } =
    await supabase
      .from(
        'business_settings',
      )
      .update({
        web_orders_enabled:
          settings.webOrdersEnabled,

        web_orders_pause_message:
          pauseMessage ||
          null,

        updated_at:
          new Date()
            .toISOString(),
      })
      .eq(
        'id',
        1,
      );

  if (error) {
    throw new Error(
      `No se pudo guardar la configuración de pedidos web: ${error.message}`,
    );
  }
}

export async function getBusinessHourExceptions():
  Promise<BusinessHourException[]> {
  const {
    data,
    error,
  } =
    await supabase
      .from(
        'business_hour_exceptions',
      )
      .select(
        'id, exception_date, is_open, open_time, close_time, reason',
      )
      .order(
        'exception_date',
        {
          ascending: true,
        },
      )
      .limit(
        100,
      );

  if (error) {
    throw new Error(
      `No se pudieron obtener las excepciones: ${error.message}`,
    );
  }

  return (
    (
      data ??
      []
    ) as BusinessHourExceptionRow[]
  ).map(
    (row) => ({
      id:
        row.id,

      exceptionDate:
        row.exception_date,

      isOpen:
        row.is_open,

      openTime:
        row.open_time
          ?.slice(
            0,
            5,
          ) ??
        '17:00',

      closeTime:
        row.close_time
          ?.slice(
            0,
            5,
          ) ??
        '23:00',

      reason:
        row.reason ??
        '',
    }),
  );
}

export async function saveBusinessHourException(
  input: SaveBusinessHourExceptionInput,
): Promise<void> {
  validateExceptionDate(
    input.exceptionDate,
  );

  if (
    input.isOpen
  ) {
    validateTime(
      input.openTime,
    );

    validateTime(
      input.closeTime,
    );

    if (
      input.openTime ===
      input.closeTime
    ) {
      throw new Error(
        'La hora de apertura y cierre no pueden ser iguales.',
      );
    }
  }

  const reason =
    input.reason
      .trim()
      .slice(
        0,
        120,
      );

  const row = {
    exception_date:
      input.exceptionDate,

    is_open:
      input.isOpen,

    open_time:
      input.isOpen
        ? input.openTime
        : null,

    close_time:
      input.isOpen
        ? input.closeTime
        : null,

    reason:
      reason ||
      null,

    updated_at:
      new Date()
        .toISOString(),
  };

  if (
    input.id
  ) {
    const { error } =
      await supabase
        .from(
          'business_hour_exceptions',
        )
        .update(
          row,
        )
        .eq(
          'id',
          input.id,
        );

    if (error) {
      throw new Error(
        `No se pudo actualizar la excepción: ${error.message}`,
      );
    }

    return;
  }

  const { error } =
    await supabase
      .from(
        'business_hour_exceptions',
      )
      .insert(
        row,
      );

  if (error) {
    if (
      error.code ===
      '23505'
    ) {
      throw new Error(
        'Ya existe una excepción para esa fecha.',
      );
    }

    throw new Error(
      `No se pudo crear la excepción: ${error.message}`,
    );
  }
}

export async function deleteBusinessHourException(
  id: string,
): Promise<void> {
  const { error } =
    await supabase
      .from(
        'business_hour_exceptions',
      )
      .delete()
      .eq(
        'id',
        id,
      );

  if (error) {
    throw new Error(
      `No se pudo eliminar la excepción: ${error.message}`,
    );
  }
}

function validateExceptionDate(
  value: string,
): void {
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(
      value,
    )
  ) {
    throw new Error(
      'La fecha debe usar el formato AAAA-MM-DD.',
    );
  }

  const date =
    new Date(
      `${value}T12:00:00`,
    );

  if (
    Number.isNaN(
      date.getTime(),
    ) ||
    date
      .toISOString()
      .slice(
        0,
        10,
      ) !==
    value
  ) {
    throw new Error(
      'La fecha no es válida.',
    );
  }
}

function validateTime(
  value: string,
): void {
  if (
    !/^([01]\d|2[0-3]):[0-5]\d$/.test(
      value,
    )
  ) {
    throw new Error(
      'Los horarios deben usar el formato HH:MM.',
    );
  }
}