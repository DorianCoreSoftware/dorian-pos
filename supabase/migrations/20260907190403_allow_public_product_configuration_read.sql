/*
 * ============================================================
 * CATÁLOGO PÚBLICO PARA CONFIGURACIÓN DE PRODUCTOS WEB
 * ============================================================
 *
 * Solamente SELECT para anon.
 * No abre escritura sobre ninguna tabla.
 */


/*
 * ============================================================
 * MODIFIERS
 * ============================================================
 */

create policy "anon_read_available_modifiers"
on public.modifiers
for select
to anon
using (
  is_available = true
);


/*
 * ============================================================
 * COMBO RECIPES
 * ============================================================
 */

create policy "anon_read_enabled_combo_recipes"
on public.combo_recipes
for select
to anon
using (
  enabled = true
);


/*
 * ============================================================
 * COMBO RECIPE COMPONENTS
 * ============================================================
 *
 * Solo componentes pertenecientes a una receta habilitada.
 */

create policy "anon_read_enabled_combo_recipe_components"
on public.combo_recipe_components
for select
to anon
using (
  exists (
    select 1
    from public.combo_recipes cr
    where
      cr.id =
        combo_recipe_components.combo_recipe_id
      and cr.enabled = true
  )
);


/*
 * ============================================================
 * COMBO COMPONENT PRODUCTS
 * ============================================================
 */

create policy "anon_read_enabled_combo_component_products"
on public.combo_component_products
for select
to anon
using (
  exists (
    select 1
    from public.combo_recipe_components crc
    join public.combo_recipes cr
      on cr.id = crc.combo_recipe_id
    where
      crc.id =
        combo_component_products.combo_component_id
      and cr.enabled = true
  )
);


/*
 * ============================================================
 * PRODUCT FLAVORS
 * ============================================================
 */

create policy "anon_read_available_product_flavors"
on public.product_flavors
for select
to anon
using (
  is_available = true
);


/*
 * ============================================================
 * SALSA DE LA SEMANA
 * ============================================================
 *
 * El configurador actual utiliza este RPC.
 */

grant execute
on function public.get_active_weekly_sauce()
to anon;