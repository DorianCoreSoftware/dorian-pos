-- Cierra la migración de modificadores hacia modifier_groups.
-- A partir de este punto modifier_groups/group_id son la única fuente de verdad.

do $$
begin
  if exists (
    select 1
    from public.modifiers
    where group_id is null
  ) then
    raise exception
      'No se puede eliminar modifiers.group_name: existen modificadores sin group_id.';
  end if;
end
$$;

alter table public.modifiers
  alter column group_id set not null;

alter table public.modifiers
  drop constraint if exists modifiers_group_id_fkey;

alter table public.modifiers
  add constraint modifiers_group_id_fkey
  foreign key (group_id)
  references public.modifier_groups(id)
  on delete restrict;

alter table public.modifiers
  drop column if exists group_name;
