/*
 * PUBLICIDAD WEB: UBICACION + AUDIENCIA + MODAL POST-PEDIDO
 */

alter table public.web_banners
add column if not exists placement text not null default 'carousel';

alter table public.web_banners
add column if not exists audience text not null default 'all';

alter table public.web_banners
drop constraint if exists web_banners_placement_check;

alter table public.web_banners
add constraint web_banners_placement_check
check (
  placement in (
    'carousel',
    'post_order',
    'both'
  )
);

alter table public.web_banners
drop constraint if exists web_banners_audience_check;

alter table public.web_banners
add constraint web_banners_audience_check
check (
  audience in (
    'all',
    'guest',
    'registered'
  )
);

drop function if exists public.get_public_web_banners();

create function public.get_public_web_banners()
returns table (
  id uuid,
  title text,
  description text,
  image_url text,
  target_url text,
  placement text,
  audience text,
  sort_order integer
)
language sql
stable
security definer
set search_path = public
as $$
  select
    wb.id,
    wb.title,
    wb.description,
    wb.image_url,
    wb.target_url,
    wb.placement,
    wb.audience,
    wb.sort_order
  from public.web_banners wb
  where
    wb.is_active = true
    and (
      wb.starts_at is null
      or wb.starts_at <= now()
    )
    and (
      wb.ends_at is null
      or wb.ends_at >= now()
    )
  order by
    wb.sort_order asc,
    wb.created_at asc;
$$;

revoke all
on function public.get_public_web_banners()
from public;

grant execute
on function public.get_public_web_banners()
to anon, authenticated;
