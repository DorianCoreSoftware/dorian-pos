alter table public.combo_recipe_components
  drop constraint if exists combo_recipe_components_type_check;

alter table public.combo_recipe_components
  add constraint combo_recipe_components_type_not_blank_check
  check (length(btrim(component_type)) > 0);

alter table public.order_item_components
  drop constraint if exists order_item_components_component_type_check;

alter table public.order_item_components
  add constraint order_item_components_component_type_not_blank_check
  check (length(btrim(component_type)) > 0);