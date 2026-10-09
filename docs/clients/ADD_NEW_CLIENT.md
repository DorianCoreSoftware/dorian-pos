# Agregar un nuevo cliente a Dorian POS

1. Crear `clients/<client-id>/client.config.json` tomando como ejemplo `clients/kong-burger/client.config.json`.
2. Asignar packages Android únicos para DEV y PROD.
3. Crear o enlazar un proyecto EAS propio para ese cliente y guardar su `projectId` en la configuración.
4. Colocar el icono PROD en `clients/<client-id>/assets/app-icon.png`.
5. Colocar el logo de encabezado en `clients/<client-id>/assets/header-logo.png`.
6. Configurar en EAS los entornos `development` y `production` con las URLs y anon keys del Supabase independiente del cliente.
7. Si el cliente requiere logos térmicos, generar su módulo raster ESC/POS y declararlo en `runtimeBranding`.
8. Agregar el cliente a `docs/clients/CLIENT_REGISTRY.md`.

Regla: cada cliente mantiene Supabase independiente. No reutilizar el Supabase de Burger Kong para nuevos negocios.

Build DEV:

```powershell
npm run apk -- --client <client-id> --env development
```

Build PROD:

```powershell
npm run apk -- --client <client-id> --env production
```
