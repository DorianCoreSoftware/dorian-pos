-- DorianCore - Extras cobrables separados de Modificadores
-- 2026-11-20
--
-- UX:
-- - Los grupos normales siguen siendo modificadores/opciones del producto.
-- - Los extras cobrables se administran como catálogo separado.
--
-- Internamente se usa UN grupo técnico oculto para reutilizar:
-- order_item_modifiers, precios históricos, inventario, web, cocina e IA.

do $$
declare
  v_extra_group_id uuid;
begin
  -- Si la migración anterior todavía no fue aplicada, crea la columna técnica
  -- para mantener compatibilidad con las funciones ya desplegadas.
  alter table public.modifier_groups
    add column if not exists kind text not null default 'option';

  -- Ya no existe el tipo "modifier": todos los grupos visibles son opciones.
  update public.modifier_groups
  set kind = 'option'
  where kind = 'modifier';

  -- Grupo técnico único para catálogo de extras.
  select id
  into v_extra_group_id
  from public.modifier_groups
  where code = 'billable_extras'
  limit 1;

  if v_extra_group_id is null then
    insert into public.modifier_groups(
      code,
      name,
      kind,
      is_active,
      position
    )
    values(
      'billable_extras',
      'Extras cobrables',
      'extra',
      true,
      9999
    )
    returning id
    into v_extra_group_id;
  else
    update public.modifier_groups
    set
      name = 'Extras cobrables',
      kind = 'extra',
      is_active = true,
      position = 9999,
      updated_at = now()
    where id = v_extra_group_id;
  end if;

  -- Migra extras creados bajo grupos "extra" anteriores al catálogo global.
  update public.modifiers m
  set group_id = v_extra_group_id
  from public.modifier_groups mg
  where m.group_id = mg.id
    and mg.kind = 'extra'
    and mg.id <> v_extra_group_id;

  -- Para cada producto que usaba un grupo Extra anterior, crea/actualiza la
  -- asociación técnica única. max_extra_items continúa siendo el límite total.
  insert into public.product_modifier_groups(
    product_id,
    modifier_group_id,
    is_required,
    min_selections,
    max_selections,
    allow_duplicates,
    position,
    is_active
  )
  select distinct
    pmg.product_id,
    v_extra_group_id,
    false,
    0,
    greatest(
      1,
      coalesce(
        (
          select p.max_extra_items
          from public.products p
          where p.id = pmg.product_id
        ),
        pmg.max_selections,
        5
      )
    ),
    true,
    9999,
    true
  from public.product_modifier_groups pmg
  join public.modifier_groups mg
    on mg.id = pmg.modifier_group_id
  where mg.kind = 'extra'
    and mg.id <> v_extra_group_id
  on conflict(product_id, modifier_group_id)
  do update set
    is_required = false,
    min_selections = 0,
    max_selections = excluded.max_selections,
    allow_duplicates = true,
    position = 9999,
    is_active = true,
    updated_at = now();

  -- Elimina asociaciones a los grupos Extra anteriores.
  delete from public.product_modifier_groups pmg
  using public.modifier_groups mg
  where pmg.modifier_group_id = mg.id
    and mg.kind = 'extra'
    and mg.id <> v_extra_group_id;

  -- Los grupos viejos quedan desactivados y dejan de ser "extra".
  update public.modifier_groups
  set
    kind = 'option',
    is_active = false,
    updated_at = now()
  where kind = 'extra'
    and id <> v_extra_group_id;

  -- Restricción técnica: sólo normal vs catálogo oculto.
  alter table public.modifier_groups
    drop constraint if exists modifier_groups_kind_check;

  alter table public.modifier_groups
    add constraint modifier_groups_kind_check
    check (kind in ('option', 'extra'));
end
$$;

comment on column public.modifier_groups.kind is
  'Campo técnico interno. La UI no expone tipos: option=grupo normal; extra=catálogo técnico oculto de extras cobrables.';

-- Si existía la migración de tres tipos, las funciones de límite siguen
-- funcionando: sólo billable_extras conserva kind=extra.
