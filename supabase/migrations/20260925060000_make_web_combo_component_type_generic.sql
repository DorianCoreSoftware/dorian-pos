/*
 * ============================================================
 * COMPONENT TYPE GENÉRICO EN CREATE_WEB_ORDER
 * ============================================================
 *
 * El modelo de combos ya permite component_type genérico.
 * Esta migración elimina la última validación cerrada del flujo web
 * (burger/hotdog/side/drink) sin sobrescribir con una versión antigua
 * la función create_web_order().
 *
 * Estrategia:
 * - Lee la definición ACTUAL registrada en PostgreSQL.
 * - Sustituye únicamente el bloque que limita component_type.
 * - Conserva intactos todos los demás cambios posteriores de la función.
 */

do $$
declare
  v_signature regprocedure;
  v_current_definition text;
  v_updated_definition text;
begin
  v_signature :=
    to_regprocedure(
      'public.create_web_order(jsonb,jsonb,uuid,text,text,text)'
    );

  if v_signature is null then
    raise exception
      'No existe public.create_web_order(jsonb,jsonb,uuid,text,text,text).';
  end if;

  select pg_get_functiondef(v_signature)
  into v_current_definition;

  v_updated_definition :=
    regexp_replace(
      v_current_definition,
      $pattern$if\s+v_component_type\s+not\s+in\s*\(\s*'burger'\s*,\s*'hotdog'\s*,\s*'side'\s*,\s*'drink'\s*\)\s*then\s*raise\s+exception\s*'El tipo de componente no es válido\.';\s*end\s+if;$pattern$,
      $replacement$if
          nullif(
            trim(
              coalesce(
                v_component_type,
                ''
              )
            ),
            ''
          ) is null
        then
          raise exception
            'El tipo de componente no es válido.';
        end if;$replacement$,
      'i'
    );

  if v_updated_definition = v_current_definition then
    raise exception
      'No se encontró la validación legacy de component_type dentro de create_web_order().';
  end if;

  execute v_updated_definition;
end;
$$;
