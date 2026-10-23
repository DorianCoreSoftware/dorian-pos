/*
 * ============================================================
 * PUBLICIDAD WEB: ENLACES + ORDEN DINÁMICO
 * ============================================================
 *
 * - Agrega un destino opcional al banner.
 * - Normaliza el orden existente a 0, 1, 2...
 * - Expone el destino en el RPC público.
 * - Agrega un RPC autenticado para persistir el orden completo
 *   de forma atómica después de arrastrar las tarjetas.
 */

alter table public.web_banners
add column if not exists target_url text;

alter table public.web_banners
drop constraint if exists web_banners_target_url_length_check;

alter table public.web_banners
add constraint web_banners_target_url_length_check
check (
  target_url is null
  or char_length(target_url) <= 2048
);

alter table public.web_banners
drop constraint if exists web_banners_target_url_format_check;

alter table public.web_banners
add constraint web_banners_target_url_format_check
check (
  target_url is null
  or target_url = '/'
  or target_url ~ '^/[^/]'
  or target_url ~* '^https?://'
);

with normalized as (
  select
    id,
    row_number() over (
      order by sort_order asc, created_at asc, id asc
    ) - 1 as new_sort_order
  from public.web_banners
)
update public.web_banners wb
set sort_order = normalized.new_sort_order
from normalized
where normalized.id = wb.id;


drop function if exists public.get_public_web_banners();

create function public.get_public_web_banners()
returns table (
  id uuid,
  title text,
  description text,
  image_url text,
  target_url text,
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


create or replace function public.reorder_web_banners(
  p_banner_ids uuid[]
)
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_total integer;
  v_unique_total integer;
begin
  if p_banner_ids is null then
    raise exception 'La lista de banners es requerida.';
  end if;

  select count(*)
  into v_total
  from public.web_banners;

  select count(distinct item)
  into v_unique_total
  from unnest(p_banner_ids) as item;

  if coalesce(array_length(p_banner_ids, 1), 0) <> v_total
     or v_unique_total <> v_total then
    raise exception 'La lista de banners no coincide con los banners actuales.';
  end if;

  if exists (
    select 1
    from unnest(p_banner_ids) as item
    left join public.web_banners wb
      on wb.id = item
    where wb.id is null
  ) then
    raise exception 'La lista contiene un banner inexistente.';
  end if;

  update public.web_banners wb
  set sort_order = ordered.position - 1
  from unnest(p_banner_ids) with ordinality
    as ordered(id, position)
  where wb.id = ordered.id;
end;
$$;

revoke all
on function public.reorder_web_banners(uuid[])
from public;

grant execute
on function public.reorder_web_banners(uuid[])
to authenticated;
