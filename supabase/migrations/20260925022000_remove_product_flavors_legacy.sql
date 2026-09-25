-- ============================================================
-- ELIMINA PRODUCT_FLAVORS LEGACY
-- ============================================================
-- product_modifier_options ya es la fuente genérica de verdad para
-- restringir modificadores por producto.
--
-- Antes de eliminar la tabla verificamos que todas las relaciones
-- legacy producto -> modificador ya estén migradas.

do $$
declare
  legacy_count integer;
  migrated_count integer;
begin
  if to_regclass('public.product_flavors') is null then
    return;
  end if;

  select count(*)
  into legacy_count
  from public.product_flavors pf
  where pf.modifier_id is not null;

  select count(*)
  into migrated_count
  from public.product_flavors pf
  where
    pf.modifier_id is not null
    and exists (
      select 1
      from public.product_modifier_options pmo
      where
        pmo.product_id = pf.product_id
        and pmo.modifier_id = pf.modifier_id
    );

  if migrated_count <> legacy_count then
    raise exception
      'No se puede eliminar product_flavors: % de % relaciones fueron migradas a product_modifier_options.',
      migrated_count,
      legacy_count;
  end if;
end
$$;

drop table if exists public.product_flavors;
