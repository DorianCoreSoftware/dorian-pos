-- DorianCore - Personalización propia por producto
-- Corrige el enfoque anterior de "Checks" globales.

alter table public.products
  add column if not exists allow_personalization boolean not null default false;

alter table public.product_check_groups
  add column if not exists product_id uuid references public.products(id) on delete cascade;

alter table public.product_check_options
  add column if not exists default_selected boolean not null default true;

alter table public.order_item_check_selections
  add column if not exists is_selected boolean not null default true;

-- Si existía configuración del intento anterior, conserva lo posible ligando
-- cada grupo al primer producto al que estaba asignado.
update public.product_check_groups g
set product_id = source.product_id
from (
  select distinct on (group_id)
    group_id,
    product_id
  from public.product_check_group_assignments
  order by group_id, created_at asc
) source
where g.id = source.group_id
  and g.product_id is null;

update public.products p
set allow_personalization = true
where exists (
  select 1
  from public.product_check_groups g
  where g.product_id = p.id
    and g.is_active = true
);

create index if not exists idx_product_check_groups_product
  on public.product_check_groups(product_id, position, name);

create index if not exists idx_product_check_options_group
  on public.product_check_options(group_id, position, name);

-- El historial guarda tanto lo incluido como lo retirado.
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
  g record;
  o record;
  selected_value boolean;
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
        and product_id = product_uuid
        and is_active = true;

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

      insert into public.order_item_check_selections(
        order_item_id,
        group_id,
        option_id,
        group_name_applied,
        option_name_applied,
        is_selected
      ) values (
        order_item_uuid,
        g.id,
        o.id,
        g.name,
        o.name,
        selected_value
      );
    end loop;
  end loop;
end
$$;

grant execute
on function public.save_order_product_checks(uuid, jsonb)
to anon, authenticated;

comment on column public.products.allow_personalization is
  'Habilita grupos de personalización incluida propios del producto.';
comment on column public.product_check_groups.product_id is
  'Producto propietario de esta personalización. No es un modificador ni un extra.';
comment on column public.product_check_options.default_selected is
  'Indica si esta opción aparece incluida al abrir el configurador.';
comment on column public.order_item_check_selections.is_selected is
  'Snapshot: true=incluir, false=quitar del producto.';
