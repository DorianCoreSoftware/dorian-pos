/*
 * ============================================================
 * ESTADO PÚBLICO Y PROTECCIÓN GLOBAL DEL SERVICIO A DOMICILIO
 * ============================================================
 *
 * - Expone de forma segura únicamente si el reparto está activo.
 * - No expone coordenadas ni configuración interna.
 * - Protege create_web_order() para impedir pedidos delivery
 *   cuando el administrador desactive el servicio.
 * - Conserva la definición vigente de create_web_order().
 */


/*
 * ============================================================
 * ESTADO PÚBLICO DEL SERVICIO
 * ============================================================
 */

create or replace function public.get_delivery_service_status()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (
      select is_enabled
      from public.delivery_settings
      where id = true
      limit 1
    ),
    false
  );
$$;

revoke all
on function public.get_delivery_service_status()
from public;

grant execute
on function public.get_delivery_service_status()
to anon, authenticated;


/*
 * ============================================================
 * PROTECCIÓN DE CREATE_WEB_ORDER
 * ============================================================
 *
 * Modificamos la versión ACTUAL registrada en PostgreSQL para no
 * sobrescribir cambios posteriores de combos, promociones, cuentas,
 * rewards, etc.
 */

do $$
declare
  v_signature regprocedure;
  v_current_definition text;
  v_updated_definition text;
  v_error_message constant text :=
    'El servicio a domicilio no está disponible por el momento.';
begin
  v_signature :=
    to_regprocedure(
      'public.create_web_order(jsonb,jsonb,uuid,text,text,text)'
    );

  if v_signature is null then
    raise exception
      'No existe public.create_web_order(jsonb,jsonb,uuid,text,text,text).';
  end if;

  select pg_get_functiondef(
    v_signature
  )
  into v_current_definition;

  /*
   * Evita insertar dos veces la misma validación.
   */
  if position(
    v_error_message
    in v_current_definition
  ) > 0 then
    return;
  end if;

  /*
   * Insertamos el guard al comienzo del bloque principal.
   *
   * La función de 7 parámetros de cuentas web termina delegando
   * en esta función base, por lo que ambas rutas quedan protegidas.
   */
  v_updated_definition :=
    regexp_replace(
      v_current_definition,
      '\mbegin\M',
      $replacement$begin
  if
    lower(
      trim(
        coalesce(
          p_fulfillment_type,
          ''
        )
      )
    ) = 'delivery'
    and not public.get_delivery_service_status()
  then
    raise exception
      'El servicio a domicilio no está disponible por el momento.';
  end if;
$replacement$,
      'i'
    );

  if
    v_updated_definition =
    v_current_definition
  then
    raise exception
      'No se pudo insertar la validación de reparto en create_web_order().';
  end if;

  execute v_updated_definition;
end;
$$;