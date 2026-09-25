-- Los modificadores de los componentes del combo se resuelven
-- mediante los grupos asociados al producto seleccionado.
-- Estas banderas específicas ya no son necesarias.

alter table public.combo_recipe_components
  drop column if exists requires_meat,
  drop column if exists requires_sauce,
  drop column if exists requires_drink_flavor;
