alter table public.business_settings
  add column if not exists facebook_url text,
  add column if not exists instagram_url text,
  add column if not exists tiktok_url text,
  add column if not exists whatsapp text,
  add column if not exists website_url text;

comment on column public.business_settings.facebook_url is
  'Optional public Facebook URL for the business.';

comment on column public.business_settings.instagram_url is
  'Optional public Instagram URL for the business.';

comment on column public.business_settings.tiktok_url is
  'Optional public TikTok URL for the business.';

comment on column public.business_settings.whatsapp is
  'Optional normalized WhatsApp URL for the business.';

comment on column public.business_settings.website_url is
  'Optional public website URL for the business.';
