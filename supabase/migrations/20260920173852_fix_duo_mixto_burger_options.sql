/*
 * ============================================================
 * COMBO DÚO MIXTO
 * Opciones permitidas para el slot de hamburguesa.
 *
 * Migración heredada de Burger Kong.
 * Solo aplica el parche cuando los registros específicos
 * existen en la base de datos.
 * ============================================================
 */

delete from public.combo_component_products
where combo_component_id = 'b17a65bb-82d3-4250-b656-224d74ce31d2'
  and exists (
    select 1
    from public.combo_recipe_components
    where id = 'b17a65bb-82d3-4250-b656-224d74ce31d2'
  );


insert into public.combo_component_products (
  combo_component_id,
  product_id,
  rule_type
)
select
  v.combo_component_id,
  v.product_id,
  v.rule_type
from (
  values
    (
      'b17a65bb-82d3-4250-b656-224d74ce31d2'::uuid,
      '2ce5634b-5e59-41ec-a7e6-25b87ab5f137'::uuid,
      'allowed'::text
    ),
    (
      'b17a65bb-82d3-4250-b656-224d74ce31d2'::uuid,
      'f796390f-c170-4390-b0bf-8bd0a12094ae'::uuid,
      'allowed'::text
    ),
    (
      'b17a65bb-82d3-4250-b656-224d74ce31d2'::uuid,
      '8c2ed8d3-477a-4ce5-834f-17e75bdc78a2'::uuid,
      'allowed'::text
    ),
    (
      'b17a65bb-82d3-4250-b656-224d74ce31d2'::uuid,
      '7d3a13a1-c74d-47af-87b3-eef2adfab37e'::uuid,
      'allowed'::text
    )
) as v (
  combo_component_id,
  product_id,
  rule_type
)
where exists (
  select 1
  from public.combo_recipe_components c
  where c.id = v.combo_component_id
)
and exists (
  select 1
  from public.products p
  where p.id = v.product_id
)
on conflict do nothing;