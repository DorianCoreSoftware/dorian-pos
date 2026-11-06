-- DorianCore Fase 6
-- 1) Métodos de cocción configurables por producto.
-- 2) Persistencia del método elegido en items/componentes de orden.
-- 3) Imagen configurable para cupones/promociones impresas.

alter table public.products
  add column if not exists allows_oil_fryer boolean not null default false,
  add column if not exists allows_air_fryer boolean not null default false,
  add column if not exists air_fryer_extra_minutes integer not null default 0;

alter table public.products
  drop constraint if exists products_air_fryer_extra_minutes_check;

alter table public.products
  add constraint products_air_fryer_extra_minutes_check
  check (air_fryer_extra_minutes between 0 and 120);

alter table public.order_items
  add column if not exists cooking_method text;

alter table public.order_items
  drop constraint if exists order_items_cooking_method_check;

alter table public.order_items
  add constraint order_items_cooking_method_check
  check (cooking_method is null or cooking_method in ('oil', 'air_fryer'));

alter table public.order_item_components
  add column if not exists cooking_method text;

alter table public.order_item_components
  drop constraint if exists order_item_components_cooking_method_check;

alter table public.order_item_components
  add constraint order_item_components_cooking_method_check
  check (cooking_method is null or cooking_method in ('oil', 'air_fryer'));

alter table public.promotion_programs
  add column if not exists ticket_show_image boolean not null default false,
  add column if not exists ticket_image_url text,
  add column if not exists ticket_image_raster_base64 text,
  add column if not exists ticket_image_width integer,
  add column if not exists ticket_image_height integer;

alter table public.promotion_programs
  drop constraint if exists promotion_programs_ticket_image_dimensions_check;

alter table public.promotion_programs
  add constraint promotion_programs_ticket_image_dimensions_check
  check (
    (ticket_image_width is null and ticket_image_height is null)
    or (
      ticket_image_width between 1 and 576
      and ticket_image_height between 1 and 2000
    )
  );

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'promotion-images',
  'promotion-images',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "authenticated can upload promotion images" on storage.objects;
create policy "authenticated can upload promotion images"
on storage.objects for insert to authenticated
with check (bucket_id = 'promotion-images');

drop policy if exists "authenticated can update promotion images" on storage.objects;
create policy "authenticated can update promotion images"
on storage.objects for update to authenticated
using (bucket_id = 'promotion-images')
with check (bucket_id = 'promotion-images');

drop policy if exists "authenticated can delete promotion images" on storage.objects;
create policy "authenticated can delete promotion images"
on storage.objects for delete to authenticated
using (bucket_id = 'promotion-images');

-- Conserva las firmas vigentes y modifica únicamente la serialización interna
-- para no pisar las protecciones agregadas por migraciones posteriores.
--
-- IMPORTANTE:
-- pg_get_functiondef() puede devolver la función con formato/casts distintos
-- a los del archivo que la creó. Por eso usamos regexp_replace() tolerante a
-- espacios, saltos de línea y casts ::text, en lugar de replace() literal.
do $$
declare
  v_definition text;
  v_new_definition text;
  v_step_definition text;
begin
  select pg_get_functiondef(
    'public.create_kitchen_order(numeric,jsonb,jsonb,uuid)'::regprocedure
  ) into v_definition;

  v_new_definition := v_definition;

  -- 1) Columna cooking_method en order_items.
  v_step_definition := regexp_replace(
    v_new_definition,
    $re$(insert\s+into\s+public\.order_items\s*\(\s*order_id\s*,\s*product_id\s*,\s*quantity\s*,\s*price_at_purchase\s*,\s*notes)(\s*\))$re$,
    E'\\1,\n      cooking_method\\2',
    'i'
  );

  if v_step_definition = v_new_definition then
    raise exception 'No se encontró la lista de columnas de order_items en create_kitchen_order().';
  end if;

  v_new_definition := v_step_definition;

  -- 2) Valor cookingMethod en el INSERT de order_items.
  v_step_definition := regexp_replace(
    v_new_definition,
    $re$nullif\s*\(\s*trim\s*\(\s*v_item\s*->>\s*'notes'(?:::text)?\s*\)\s*,\s*''(?:::text)?\s*\)$re$,
    $rep$nullif(
        trim(
          v_item ->> 'notes'
        ),
        ''
      ),

      nullif(
        v_item ->> 'cookingMethod',
        ''
      )$rep$,
    'i'
  );

  if v_step_definition = v_new_definition then
    raise exception 'No se encontró el valor notes de order_items en create_kitchen_order().';
  end if;

  v_new_definition := v_step_definition;

  -- 3) Columna cooking_method en order_item_components.
  v_step_definition := regexp_replace(
    v_new_definition,
    $re$(insert\s+into\s+public\.order_item_components\s*\(\s*order_item_id\s*,\s*product_id\s*,\s*component_type\s*,\s*label\s*,\s*quantity\s*,\s*notes\s*,\s*position)(\s*\))$re$,
    E'\\1,\n          cooking_method\\2',
    'i'
  );

  if v_step_definition = v_new_definition then
    raise exception 'No se encontró la lista de columnas de order_item_components en create_kitchen_order().';
  end if;

  v_new_definition := v_step_definition;

  -- 4) Valor cookingMethod en el INSERT del componente.
  v_step_definition := regexp_replace(
    v_new_definition,
    $re$v_position\s*\)\s*returning\s+id\s+into\s+v_component_id$re$,
    $rep$v_position,

          nullif(
            v_component ->> 'cookingMethod',
            ''
          )
        )

        returning id
        into v_component_id$rep$,
    'i'
  );

  if v_step_definition = v_new_definition then
    raise exception 'No se encontró el cierre del INSERT de order_item_components en create_kitchen_order().';
  end if;

  v_new_definition := v_step_definition;

  execute v_new_definition;
end
$$;

do $$
declare
  v_definition text;
  v_new_definition text;
  v_step_definition text;
begin
  select pg_get_functiondef(
    'public.create_web_order(jsonb,jsonb,uuid,text,text,text)'::regprocedure
  ) into v_definition;

  v_new_definition := v_definition;

  -- Conserva cookingMethod cuando create_web_order() sanea componentes.
  v_step_definition := regexp_replace(
    v_new_definition,
    $re$left\s*\(\s*coalesce\s*\(\s*v_component\s*->>\s*'notes'(?:::text)?\s*,\s*''(?:::text)?\s*\)\s*,\s*500\s*\)$re$,
    $rep$left(
                coalesce(
                  v_component ->> 'notes',
                  ''
                ),
                500
              ),

              'cookingMethod',
              nullif(v_component ->> 'cookingMethod', '')$rep$,
    'i'
  );

  if v_step_definition = v_new_definition then
    raise exception 'No se encontró notes del componente en create_web_order().';
  end if;

  v_new_definition := v_step_definition;

  -- Conserva cookingMethod cuando create_web_order() sanea items.
  v_step_definition := regexp_replace(
    v_new_definition,
    $re$left\s*\(\s*coalesce\s*\(\s*v_item\s*->>\s*'notes'(?:::text)?\s*,\s*''(?:::text)?\s*\)\s*,\s*500\s*\)$re$,
    $rep$left(
            coalesce(
              v_item ->> 'notes',
              ''
            ),
            500
          ),

          'cookingMethod',
          nullif(v_item ->> 'cookingMethod', '')$rep$,
    'i'
  );

  if v_step_definition = v_new_definition then
    raise exception 'No se encontró notes del item en create_web_order().';
  end if;

  v_new_definition := v_step_definition;

  execute v_new_definition;
end
$$;
