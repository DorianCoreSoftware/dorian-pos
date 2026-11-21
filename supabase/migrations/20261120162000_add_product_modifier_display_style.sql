-- DorianCore - presentación configurable de grupos por producto
-- 2026-11-20
-- Permite mostrar un grupo normal como botones de opción o checklist incluido.

alter table public.product_modifier_groups
add column if not exists display_style text not null default 'buttons';

alter table public.product_modifier_groups
drop constraint if exists product_modifier_groups_display_style_check;

alter table public.product_modifier_groups
add constraint product_modifier_groups_display_style_check
check (display_style in ('buttons', 'checklist'));

comment on column public.product_modifier_groups.display_style is
  'Presentación del grupo en el configurador del producto: buttons = opciones normales; checklist = checks incluidos.';
