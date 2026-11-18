-- ============================================================
-- DORIANCORE
-- FIX: mover promociones por cantidad al return FINAL
-- de create_web_order()
-- ============================================================
--
-- La migración anterior insertó el bloque antes del PRIMER:
--
--   return v_order_id;
--
-- pero create_web_order() tiene dos:
--
-- 1) retorno temprano de idempotencia
-- 2) retorno final después de crear el pedido
--
-- Este fix:
-- - elimina el bloque mal colocado;
-- - conserva el return temprano;
-- - inserta el descuento justo antes del ÚLTIMO return v_order_id;
-- - no reemplaza manualmente la definición completa del checkout.
-- ============================================================

do $migration$
declare
  v_signature regprocedure;
  v_definition text;
  v_clean_definition text;
  v_updated_definition text;

  v_marker constant text :=
    '/* DORIAN_QUANTITY_PROMOTION_CHECKOUT_V1 */';

  v_marker_position integer;
  v_tail text;
  v_return_in_tail integer;

  v_return_text constant text :=
    'return v_order_id;';

  v_reverse_position integer;
  v_last_return_position integer;

  v_patch text;
begin
  v_signature :=
    to_regprocedure(
      'public.create_web_order(jsonb,jsonb,uuid,text,text,text)'
    );

  if v_signature is null then
    raise exception
      'No existe public.create_web_order(jsonb,jsonb,uuid,text,text,text).';
  end if;

  select
    pg_get_functiondef(
      v_signature
    )
  into
    v_definition;

  v_clean_definition :=
    v_definition;

  /*
   * ------------------------------------------------------------
   * 1. ELIMINAR EL BLOQUE MAL COLOCADO DE LA MIGRACIÓN ANTERIOR
   * ------------------------------------------------------------
   *
   * Cortamos desde el marcador hasta justo antes del return que
   * sigue al bloque. El return temprano se conserva.
   */
  v_marker_position :=
    position(
      v_marker
      in v_clean_definition
    );

  if v_marker_position > 0 then
    v_tail :=
      substring(
        v_clean_definition
        from v_marker_position
      );

    v_return_in_tail :=
      position(
        v_return_text
        in v_tail
      );

    if v_return_in_tail <= 0 then
      raise exception
        'Se encontró el marcador de promoción, pero no su return asociado.';
    end if;

    v_clean_definition :=
      substring(
        v_clean_definition
        from 1
        for v_marker_position - 1
      )
      ||
      substring(
        v_tail
        from v_return_in_tail
      );
  end if;

  /*
   * ------------------------------------------------------------
   * 2. LOCALIZAR EL ÚLTIMO return v_order_id;
   * ------------------------------------------------------------
   *
   * reverse() permite encontrar de forma segura la última aparición,
   * aunque exista un return temprano por idempotencia.
   */
  v_reverse_position :=
    position(
      reverse(
        v_return_text
      )
      in reverse(
        v_clean_definition
      )
    );

  if v_reverse_position <= 0 then
    raise exception
      'No se encontró ningún return v_order_id; en create_web_order().';
  end if;

  v_last_return_position :=
    length(
      v_clean_definition
    )
    -
    v_reverse_position
    -
    length(
      v_return_text
    )
    + 2;

  /*
   * ------------------------------------------------------------
   * 3. BLOQUE AUTORITATIVO DE PROMOCIÓN
   * ------------------------------------------------------------
   */
  v_patch :=
    E'  /* DORIAN_QUANTITY_PROMOTION_CHECKOUT_V1 */\n'
    || E'  declare\n'
    || E'    v_quantity_promotion_discount numeric(10,2);\n'
    || E'  begin\n'
    || E'    v_quantity_promotion_discount :=\n'
    || E'      public.apply_quantity_promotion_discounts(v_order_id);\n\n'
    || E'    if coalesce(v_quantity_promotion_discount, 0) > 0 then\n'
    || E'      update public.orders\n'
    || E'      set total = greatest(\n'
    || E'        0,\n'
    || E'        round(total - v_quantity_promotion_discount, 2)\n'
    || E'      )\n'
    || E'      where id = v_order_id;\n'
    || E'    end if;\n'
    || E'  end;\n\n';

  v_updated_definition :=
    substring(
      v_clean_definition
      from 1
      for v_last_return_position - 1
    )
    ||
    v_patch
    ||
    substring(
      v_clean_definition
      from v_last_return_position
    );

  execute
    v_updated_definition;
end;
$migration$;


/*
 * Verificación defensiva:
 * debe existir exactamente un marcador en la función final.
 */
do $verify$
declare
  v_definition text;
  v_marker_count integer;
begin
  select
    pg_get_functiondef(
      'public.create_web_order(jsonb,jsonb,uuid,text,text,text)'::regprocedure
    )
  into
    v_definition;

  v_marker_count :=
    (
      length(v_definition)
      -
      length(
        replace(
          v_definition,
          'DORIAN_QUANTITY_PROMOTION_CHECKOUT_V1',
          ''
        )
      )
    )
    /
    length(
      'DORIAN_QUANTITY_PROMOTION_CHECKOUT_V1'
    );

  if v_marker_count <> 1 then
    raise exception
      'El parche de promoción quedó en una cantidad inesperada de posiciones: %',
      v_marker_count;
  end if;
end;
$verify$;
