# Burger Kong PROD — Checklist de migración segura

> Objetivo: llevar el PROD real al esquema actual sin arriesgar pedidos, ventas, promociones, usuarios ni configuración histórica.

## A. Antes de tocar PROD

- [ ] Confirmar que el commit que se va a desplegar está limpio.
- [ ] `npx tsc --noEmit`
- [ ] `npm run audit:preflight`
- [ ] Confirmar `APP_VARIANT=production` para el build PROD.
- [ ] Ejecutar `npm run android:validate-identity` con la identidad PROD esperada.
- [ ] Confirmar que `.env` no está trackeado.
- [ ] Confirmar secretos de Edge Functions.
- [ ] Registrar el ID/ref exacto del proyecto Supabase PROD.
- [ ] No modificar migraciones históricas.

## B. Backup obligatorio

Generar un respaldo completo de Burger Kong PROD antes de aplicar cualquier migración.

Conservar por separado:

1. esquema;
2. datos;
3. Storage/archivos relevantes;
4. configuración/secrets anotados fuera del repositorio.

No considerar una exportación visual de tablas como backup suficiente.

## C. Crear staging con una copia de PROD

La prueba correcta no es solamente migrar una base vacía. Se necesita una copia de los datos reales porque las migraciones más delicadas transforman estructuras legacy.

En el staging restaurado:

- [ ] confirmar conteo de usuarios/profiles;
- [ ] órdenes;
- [ ] order_items;
- [ ] pagos;
- [ ] ventas históricas si aplica;
- [ ] promociones/cupones/redenciones;
- [ ] modificadores;
- [ ] combos;
- [ ] configuración de impresora;
- [ ] horarios;
- [ ] clientes Rewards.

Guardar esos conteos antes de migrar.

## D. Ejecutar pre-auditoría SQL

Abrir Supabase SQL Editor en staging y ejecutar:

`supabase/audits/prod_readiness.sql`

Guardar el resultado.

No continuar si aparecen tablas privadas sin RLS o permisos inesperados que no puedan explicarse.

## E. Migrar staging

Vincular la CLI exclusivamente al proyecto STAGING y confirmar visualmente el project ref.

Después:

```powershell
npx supabase migration list
npx supabase db push
```

Leer la lista de migraciones antes de responder `Yes`.

## F. Validaciones de datos posteriores

### Modificadores

- [ ] No existen modificadores importantes perdidos.
- [ ] Todos los modificadores actuales tienen `group_id`.
- [ ] Las relaciones de sabores/opciones antiguas existen ahora en `product_modifier_options`.
- [ ] `product_flavors` puede desaparecer sin pérdida funcional.

### Combos

- [ ] Recetas existentes conservan componentes.
- [ ] Productos permitidos por componente siguen correctos.
- [ ] Los modificadores de los productos de combo siguen disponibles.

### Promociones

- [ ] Cupones históricos conservan `program_id`.
- [ ] Redenciones históricas conservan el programa correcto.
- [ ] Kong y Dorian siguen configurados como Burger Kong espera.
- [ ] Los códigos existentes continúan siendo válidos.

### Ventas / caja

- [ ] Totales históricos coinciden.
- [ ] Reembolsos coinciden.
- [ ] Cierres de caja siguen visibles.
- [ ] Dashboard no interpreta `business_expenses` como la tabla legacy `expenses`.

### Cocina

- [ ] Órdenes históricas entregadas quedan preparadas.
- [ ] Órdenes nuevas requieren checks antes de cobrar/listas.

### Timezone

- [ ] `business_settings.timezone = 'America/Mexico_City'`.
- [ ] “Hoy” coincide en Ventas, Caja, Dashboard y Reportes.

## G. Smoke test de staging

Crear datos de prueba y luego eliminarlos si corresponde:

1. iniciar sesión;
2. abrir caja;
3. crear orden;
4. preparar todos los artículos;
5. cobrar;
6. imprimir ticket;
7. registrar egreso;
8. revisar dashboard;
9. crear pedido web;
10. mover flujo de delivery;
11. probar Rewards;
12. probar una promoción;
13. recuperación de contraseña/PIN;
14. Admin web.

## H. Go / No-Go

Solo migrar PROD si:

- [ ] no hubo error de migración;
- [ ] conteos críticos son coherentes;
- [ ] no se perdió configuración;
- [ ] smoke test completo OK;
- [ ] existe backup restaurable;
- [ ] está documentado el rollback.

## I. Migración PROD

Durante una ventana de poco movimiento:

1. detener temporalmente nuevos pedidos web;
2. evitar operación concurrente del POS;
3. tomar un backup final;
4. confirmar que la CLI está ligada a PROD;
5. revisar `npx supabase migration list`;
6. ejecutar `npx supabase db push`;
7. desplegar Edge Functions que correspondan;
8. ejecutar nuevamente `prod_readiness.sql`;
9. abrir app PROD;
10. hacer smoke test corto;
11. reactivar pedidos web.

## J. Rollback

No intentar “deshacer” a mano migraciones destructivas en una base parcialmente migrada.

Si una migración de PROD deja la operación inutilizable y no existe una corrección aditiva inmediata y segura:

1. detener operación;
2. restaurar el backup previo;
3. volver al build anterior;
4. investigar en staging;
5. crear una migración nueva de corrección.

Nunca editar una migración ya aplicada para simular un rollback.
