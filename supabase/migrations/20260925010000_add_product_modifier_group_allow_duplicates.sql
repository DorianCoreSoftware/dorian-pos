alter table public.product_modifier_groups
  add column if not exists allow_duplicates boolean not null default false;

comment on column public.product_modifier_groups.allow_duplicates is
  'Permite seleccionar más de una vez el mismo modificador dentro del grupo.';
