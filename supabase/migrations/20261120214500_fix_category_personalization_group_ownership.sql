-- DorianCore - Corrige la propiedad de personalizaciones creadas desde Productos
-- Antes, "+ Grupo" dentro del producto siempre creaba product_id.
-- A partir de este cambio, con herencia activa el editor administra la plantilla de categoría.
-- Esta migración promueve los grupos existentes de productos con herencia activa.

do $$
declare
  src record;
  target_group_id uuid;
begin
  for src in
    select
      g.id as group_id,
      g.name,
      g.position,
      g.is_active,
      p.category_id
    from public.product_check_groups g
    join public.products p
      on p.id = g.product_id
    where g.product_id is not null
      and g.category_id is null
      and p.category_id is not null
      and coalesce(p.inherit_category_personalization, true) = true
  loop
    select cg.id
    into target_group_id
    from public.product_check_groups cg
    where cg.category_id = src.category_id
      and cg.product_id is null
      and lower(trim(cg.name)) = lower(trim(src.name))
    order by cg.created_at, cg.id
    limit 1;

    if target_group_id is null then
      update public.product_check_groups
      set
        category_id = src.category_id,
        product_id = null,
        updated_at = now()
      where id = src.group_id;
    else
      insert into public.product_check_options(
        group_id,
        name,
        position,
        is_active,
        default_selected
      )
      select
        target_group_id,
        o.name,
        o.position,
        o.is_active,
        o.default_selected
      from public.product_check_options o
      where o.group_id = src.group_id
        and not exists (
          select 1
          from public.product_check_options existing
          where existing.group_id = target_group_id
            and lower(trim(existing.name)) = lower(trim(o.name))
        );

      delete from public.product_check_groups
      where id = src.group_id;
    end if;
  end loop;
end
$$;
