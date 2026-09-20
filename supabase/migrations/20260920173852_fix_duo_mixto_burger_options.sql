/*
 * ============================================================
 * COMBO DÚO MIXTO
 * Opciones permitidas para el slot de hamburguesa.
 * ============================================================
 */

delete from public.combo_component_products
where combo_component_id =
  'b17a65bb-82d3-4250-b656-224d74ce31d2';


insert into public.combo_component_products (
  combo_component_id,
  product_id,
  rule_type
)
values

/*
 * Hamburguesa sencilla
 */
(
  'b17a65bb-82d3-4250-b656-224d74ce31d2',
  '2ce5634b-5e59-41ec-a7e6-25b87ab5f137',
  'allowed'
),

/*
 * Hamburguesa 3 quesos
 */
(
  'b17a65bb-82d3-4250-b656-224d74ce31d2',
  'f796390f-c170-4390-b0bf-8bd0a12094ae',
  'allowed'
),

/*
 * Hamburguesa especial
 */
(
  'b17a65bb-82d3-4250-b656-224d74ce31d2',
  '8c2ed8d3-477a-4ce5-834f-17e75bdc78a2',
  'allowed'
),

/*
 * Hamburguesa Hawaiana
 */
(
  'b17a65bb-82d3-4250-b656-224d74ce31d2',
  '7d3a13a1-c74d-47af-87b3-eef2adfab37e',
  'allowed'
);