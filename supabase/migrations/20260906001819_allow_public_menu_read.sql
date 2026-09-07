/*
 * Catálogo público para Burger Kong Web.
 *
 * Solo permite lectura.
 * No permite insertar, editar ni eliminar.
 */

create policy "anon_read_active_categories"
on public.categories
for select
to anon
using (
  is_active = true
);


create policy "anon_read_active_products"
on public.products
for select
to anon
using (
  is_active = true
  and is_available = true
);