-- DorianCore - Tres tipos de grupos + limite total de extras por producto
-- 2026-11-20

alter table public.modifier_groups
  add column if not exists kind text not null default 'option';

alter table public.modifier_groups
  drop constraint if exists modifier_groups_kind_check;

alter table public.modifier_groups
  add constraint modifier_groups_kind_check
  check (kind in ('option', 'modifier', 'extra'));

comment on column public.modifier_groups.kind is
  'option = eleccion/variante del producto; modifier = modificacion no tratada como adicional; extra = adicional cobrable y repetible.';

alter table public.products
  add column if not exists max_extra_items integer not null default 5;

alter table public.products
  drop constraint if exists products_max_extra_items_check;

alter table public.products
  add constraint products_max_extra_items_check
  check (max_extra_items between 0 and 50);

comment on column public.products.max_extra_items is
  'Cantidad maxima total de selecciones de grupos kind=extra permitida por unidad del producto.';

-- Limite global para modificadores directos del producto.
create or replace function public.enforce_order_item_total_extra_limit()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_kind text;
  v_limit integer;
  v_current integer;
begin
  select mg.kind
  into v_kind
  from public.modifiers m
  join public.modifier_groups mg
    on mg.id = m.group_id
  where m.id = new.modifier_id;

  if coalesce(v_kind, 'option') <> 'extra' then
    return new;
  end if;

  select coalesce(p.max_extra_items, 5)
  into v_limit
  from public.order_items oi
  join public.products p
    on p.id = oi.product_id
  where oi.id = new.order_item_id;

  select count(*)
  into v_current
  from public.order_item_modifiers oim
  join public.modifiers m
    on m.id = oim.modifier_id
  join public.modifier_groups mg
    on mg.id = m.group_id
  where oim.order_item_id = new.order_item_id
    and mg.kind = 'extra';

  if v_current >= coalesce(v_limit, 5) then
    raise exception
      'Este producto permite un maximo de % extras.',
      coalesce(v_limit, 5);
  end if;

  return new;
end;
$$;

drop trigger if exists trg_order_item_total_extra_limit
on public.order_item_modifiers;

create trigger trg_order_item_total_extra_limit
before insert on public.order_item_modifiers
for each row
execute function public.enforce_order_item_total_extra_limit();

-- Mismo limite para modificadores de productos dentro de combos.
create or replace function public.enforce_component_total_extra_limit()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_kind text;
  v_limit integer;
  v_current integer;
begin
  select mg.kind
  into v_kind
  from public.modifiers m
  join public.modifier_groups mg
    on mg.id = m.group_id
  where m.id = new.modifier_id;

  if coalesce(v_kind, 'option') <> 'extra' then
    return new;
  end if;

  select coalesce(p.max_extra_items, 5)
  into v_limit
  from public.order_item_components oic
  join public.products p
    on p.id = oic.product_id
  where oic.id = new.order_item_component_id;

  select count(*)
  into v_current
  from public.order_item_component_modifiers oicm
  join public.modifiers m
    on m.id = oicm.modifier_id
  join public.modifier_groups mg
    on mg.id = m.group_id
  where oicm.order_item_component_id = new.order_item_component_id
    and mg.kind = 'extra';

  if v_current >= coalesce(v_limit, 5) then
    raise exception
      'Este producto del combo permite un maximo de % extras.',
      coalesce(v_limit, 5);
  end if;

  return new;
end;
$$;

drop trigger if exists trg_component_total_extra_limit
on public.order_item_component_modifiers;

create trigger trg_component_total_extra_limit
before insert on public.order_item_component_modifiers
for each row
execute function public.enforce_component_total_extra_limit();
