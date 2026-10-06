# Fase 16 — Auditoría final de producción

## Resultado

El proyecto está en estado apto para pasar a una prueba de migración de Burger Kong PROD, pero PROD no debe recibir `db push` todavía sin una restauración/prueba intermedia.

Validaciones ya completadas en Burger Kong DEV:

- `npx tsc --noEmit`: OK.
- `npm run audit:preflight`: OK.
- `npm run android:validate-identity`: OK para `com.burgerkong.pos.dev`.
- La migración `20261006040000_use_business_timezone_in_reports_and_loyalty.sql` fue aplicada correctamente.
- `.env` dejó de estar versionado en Git.

## Hallazgos importantes de la cadena de migraciones

### 1. Las migraciones históricas son inmutables

No deben editarse migraciones que ya fueron aplicadas a Burger Kong DEV. Si hace falta corregir algo en adelante, se crea una migración aditiva nueva.

### 2. Hay migraciones históricas deliberadamente destructivas

Estas operaciones forman parte de la evolución Burger Kong -> Dorian POS y requieren backup antes de migrar PROD:

- `20260920181128_remove_legacy_null_modifiers.sql`
  - elimina modificadores legacy cuyo `group_name` sea NULL.
- `20260924234500_remove_legacy_combo_modifier_flags.sql`
  - elimina `requires_meat`, `requires_sauce`, `requires_drink_flavor`.
- `20260925022000_remove_product_flavors_legacy.sql`
  - elimina `product_flavors`, pero contiene una comprobación previa que aborta si las relaciones no fueron migradas a `product_modifier_options`.
- `20260925034500_remove_modifiers_group_name.sql`
  - elimina `modifiers.group_name`, pero aborta si existe algún modificador sin `group_id`.

Esto no significa que estén mal; significa que Burger Kong PROD debe pasar primero por una copia/staging.

### 3. `public.expenses` no es el módulo nuevo de egresos

El esquema antiguo ya tenía una tabla `public.expenses`. La Fase 13 usa deliberadamente:

- `public.expense_categories`
- `public.business_expenses`

No renombrar, borrar ni reutilizar `public.expenses` durante la migración de PROD.

### 4. Las migraciones históricas contienen datos heredados de Burger Kong

La cadena histórica conserva referencias necesarias para migrar datos antiguos:

- Burger Kong
- Kong
- Dorian de la Suerte
- `BK-K`
- `BK-D`

No deben eliminarse de migraciones ya aplicadas.

En un Supabase nuevo, al reproducir toda la historia, algunos defaults heredados también pueden aparecer. Para clientes nuevos se incluye `supabase/bootstrap/new_client_after_migrations.sql`, que debe ejecutarse únicamente en una base vacía/nueva después del `db push`.

### 5. SECURITY DEFINER

La revisión estática encontró que las funciones `SECURITY DEFINER` actuales fijan `search_path`, lo cual es correcto para evitar depender de un search path controlable por el cliente.

Antes de producción, ejecutar también `supabase/audits/prod_readiness.sql` en el SQL Editor del proyecto destino para comprobar RLS, grants y estado general del esquema real.

## Regla para Burger Kong PROD

No ejecutar directamente:

```powershell
npx supabase db push
```

contra Burger Kong PROD hasta completar:

1. backup;
2. restauración o clon de staging;
3. migración en staging;
4. pruebas funcionales;
5. comparación de conteos/datos;
6. ventana de mantenimiento;
7. backup final;
8. migración PROD.

## Funcionalidad mínima a validar antes de dar PROD por aprobado

- Inicio de sesión y recuperación.
- Admin web y Admin Android.
- Productos/categorías/modificadores.
- Combos.
- POS y creación de órdenes.
- Cocina y checks de preparación.
- Cobro.
- Caja y reembolsos.
- Delivery.
- Web order.
- Promociones.
- Rewards.
- Reportes.
- Egresos.
- Dashboard financiero.
- Horarios/timezone.
- Tickets/impresora.
- Push notifications.
- Feature flags.

## Conclusión de Fase 16

A nivel de aplicación, DEV está listo para una prueba controlada de promoción a producción. El siguiente riesgo ya no está en TypeScript o en el flujo normal de la app, sino en la preservación de los datos históricos de Burger Kong PROD durante la cadena completa de migraciones.
