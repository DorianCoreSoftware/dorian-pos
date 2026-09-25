create or replace function public.admin_save_combo_recipe(
  p_combo_product_id uuid,
  p_enabled boolean,
  p_components jsonb default '[]'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role text;
  v_recipe_id uuid;
  v_component jsonb;
  v_component_id uuid;
  v_allowed_product_id text;
  v_selection_mode text;
  v_fixed_product_id uuid;
  v_category_id uuid;
begin
  select role::text
    into v_role
  from public.profiles
  where id = auth.uid();

  if coalesce(v_role, '') <> 'admin' then
    raise exception 'Solo un administrador puede guardar recetas de combo.';
  end if;

  if not exists (
    select 1
    from public.products
    where id = p_combo_product_id
  ) then
    raise exception 'El producto del combo no existe.';
  end if;

  if p_components is null then
    p_components := '[]'::jsonb;
  end if;

  if jsonb_typeof(p_components) <> 'array' then
    raise exception 'Los componentes del combo deben ser un arreglo.';
  end if;

  insert into public.combo_recipes (
    combo_product_id,
    enabled
  )
  values (
    p_combo_product_id,
    p_enabled
  )
  on conflict (combo_product_id)
  do update set
    enabled = excluded.enabled,
    updated_at = now()
  returning id into v_recipe_id;

  if p_enabled and jsonb_array_length(p_components) = 0 then
    raise exception 'Un combo activo debe tener al menos un componente.';
  end if;

  if p_enabled then
    delete from public.combo_recipe_components
    where combo_recipe_id = v_recipe_id;

    for v_component in
      select value
      from jsonb_array_elements(p_components)
    loop
      v_selection_mode :=
        btrim(coalesce(v_component ->> 'selectionMode', ''));

      if v_selection_mode not in ('fixed', 'selectable') then
        raise exception 'Modo de selección inválido.';
      end if;

      if btrim(coalesce(v_component ->> 'slotKey', '')) = '' then
        raise exception 'Cada componente debe tener una clave interna.';
      end if;

      if btrim(coalesce(v_component ->> 'type', '')) = '' then
        raise exception 'Cada componente debe tener un tipo.';
      end if;

      if btrim(coalesce(v_component ->> 'label', '')) = '' then
        raise exception 'Cada componente debe tener una etiqueta.';
      end if;

      v_fixed_product_id :=
        nullif(v_component ->> 'fixedProductId', '')::uuid;

      v_category_id :=
        nullif(v_component ->> 'selectableCategoryId', '')::uuid;

      if v_selection_mode = 'fixed' and v_fixed_product_id is null then
        raise exception 'Los componentes fijos requieren un producto.';
      end if;

      if v_selection_mode = 'selectable' and v_category_id is null then
        raise exception 'Los componentes seleccionables requieren una categoría.';
      end if;

      insert into public.combo_recipe_components (
        combo_recipe_id,
        slot_key,
        component_type,
        label,
        selection_mode,
        fixed_product_id,
        product_category_id,
        allows_notes,
        position
      )
      values (
        v_recipe_id,
        btrim(v_component ->> 'slotKey'),
        btrim(v_component ->> 'type'),
        btrim(v_component ->> 'label'),
        v_selection_mode,
        case
          when v_selection_mode = 'fixed'
            then v_fixed_product_id
          else null
        end,
        case
          when v_selection_mode = 'selectable'
            then v_category_id
          else null
        end,
        coalesce(
          (v_component ->> 'allowsNotes')::boolean,
          false
        ),
        coalesce(
          (v_component ->> 'position')::integer,
          0
        )
      )
      returning id into v_component_id;

      if v_selection_mode = 'selectable' then
        for v_allowed_product_id in
          select value
          from jsonb_array_elements_text(
            coalesce(
              v_component -> 'allowedProductIds',
              '[]'::jsonb
            )
          )
        loop
          insert into public.combo_component_products (
            combo_component_id,
            product_id,
            rule_type
          )
          values (
            v_component_id,
            v_allowed_product_id::uuid,
            'allowed'
          );
        end loop;
      end if;
    end loop;
  end if;

  return v_recipe_id;
end;
$$;

revoke all on function public.admin_save_combo_recipe(
  uuid,
  boolean,
  jsonb
) from public;

grant execute on function public.admin_save_combo_recipe(
  uuid,
  boolean,
  jsonb
) to authenticated;
