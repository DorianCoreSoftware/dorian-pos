-- DorianCore 1.7.x
-- Snapshot del estado "incluido por defecto" de la personalización.
--
-- Permite distinguir:
--   default=true  + selected=false => SIN X
--   default=false + selected=true  => AGREGAR X
--   default=true  + selected=true  => sin cambio, no imprimir
--   default=false + selected=false => sin cambio, no imprimir

alter table public.order_item_check_selections
  add column if not exists default_selected_applied boolean not null default true;

comment on column public.order_item_check_selections.default_selected_applied is
  'Snapshot del valor product_check_options.default_selected al crear la orden.';

create or replace function public.save_order_product_checks(
  p_order_id uuid,
  p_items jsonb
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  item jsonb;
  check_row jsonb;
  idx integer := 0;
  product_uuid uuid;
  occurrence integer;
  order_item_uuid uuid;
  product_category_uuid uuid;
  inherit_category boolean;
  own_personalization boolean;
  g record;
  o record;
  selected_value boolean;
  default_selected_value boolean;
begin
  if p_items is null then
    return;
  end if;

  delete from public.order_item_check_selections
  where order_item_id in (
    select id
    from public.order_items
    where order_id = p_order_id
  );

  for item in
    select *
    from jsonb_array_elements(p_items)
  loop
    idx := idx + 1;
    product_uuid := (item->>'productId')::uuid;

    select
      p.category_id,
      p.inherit_category_personalization,
      p.allow_personalization
    into
      product_category_uuid,
      inherit_category,
      own_personalization
    from public.products p
    where p.id = product_uuid;

    select count(*) + 1
    into occurrence
    from jsonb_array_elements(p_items) with ordinality x(value, ord)
    where ord < idx
      and (value->>'productId')::uuid = product_uuid;

    select id
    into order_item_uuid
    from (
      select
        id,
        row_number() over(order by created_at, id) rn
      from public.order_items
      where order_id = p_order_id
        and product_id = product_uuid
    ) q
    where rn = occurrence;

    if order_item_uuid is null then
      continue;
    end if;

    for check_row in
      select *
      from jsonb_array_elements(
        coalesce(item->'checks', '[]'::jsonb)
      )
    loop
      select *
      into g
      from public.product_check_groups
      where id = (check_row->>'groupId')::uuid
        and is_active = true
        and (
          (
            product_id = product_uuid
            and own_personalization = true
          )
          or
          (
            category_id = product_category_uuid
            and inherit_category = true
          )
        );

      if g.id is null then
        continue;
      end if;

      select *
      into o
      from public.product_check_options
      where id = (check_row->>'optionId')::uuid
        and group_id = g.id
        and is_active = true;

      if o.id is null then
        continue;
      end if;

      selected_value :=
        coalesce(
          (check_row->>'isSelected')::boolean,
          true
        );

      default_selected_value :=
        coalesce(
          (check_row->>'defaultSelected')::boolean,
          o.default_selected,
          true
        );

      insert into public.order_item_check_selections(
        order_item_id,
        group_id,
        option_id,
        group_name_applied,
        option_name_applied,
        is_selected,
        default_selected_applied
      ) values (
        order_item_uuid,
        g.id,
        o.id,
        g.name,
        o.name,
        selected_value,
        default_selected_value
      );
    end loop;
  end loop;
end
$$;

grant execute
on function public.save_order_product_checks(uuid, jsonb)
to anon, authenticated;
