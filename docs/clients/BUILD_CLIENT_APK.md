# Compilar APK de un cliente

## Objetivo

No editar manualmente `app.json`, `app.config.js`, packages Android, iconos ni IDs antes de una compilación. Toda compilación se hace indicando cliente y entorno.

## Burger Kong DEV

```powershell
npm run apk -- --client kong-burger --env development
```

Resultado esperado:
- Nombre: `Burger Kong DEV`
- Package: `com.burgerkong.pos.dev`
- Icono: genérico DorianCore
- Supabase: `lzkcqrelwynecsyvhhsy`
- EAS environment: `development`
- Perfil: `development-apk`

## Burger Kong PROD

```powershell
npm run apk -- --client kong-burger --env production
```

Resultado esperado:
- Nombre: `Burger Kong`
- Package: `com.burgerkong.pos`
- Icono: Burger Kong
- Supabase: `keqmsnnffrtowkbthwqk`
- EAS environment: `production`
- Perfil: `production-apk`

## Primera preparación

Después de instalar este kit, ejecutar una sola vez:

```powershell
npm run branding:setup
npm run branding:generate
npm run branding:apply
```

`branding:setup` recupera desde Git los assets originales de Burger Kong y el archivo raster ESC/POS histórico. El comando `apk` también ejecuta estas comprobaciones automáticamente, por lo que normalmente basta con usar el comando de build.

## Configuración EAS requerida

Para DEV:

```powershell
npx eas-cli env:set development --name EXPO_PUBLIC_SUPABASE_URL --value https://lzkcqrelwynecsyvhhsy.supabase.co --visibility plaintext
npx eas-cli env:set development --name EXPO_PUBLIC_SUPABASE_ANON_KEY --value "TU_ANON_KEY_DEV" --visibility sensitive
```

Para PROD:

```powershell
npx eas-cli env:set production --name EXPO_PUBLIC_SUPABASE_URL --value https://keqmsnnffrtowkbthwqk.supabase.co --visibility plaintext
npx eas-cli env:set production --name EXPO_PUBLIC_SUPABASE_ANON_KEY --value "TU_ANON_KEY_PROD" --visibility sensitive
```

## Verificación antes de compilar

```powershell
npx eas-cli env:list --environment development
npx eas-cli env:list --environment production
```

Nunca compilar PROD si la URL de Production apunta al proyecto legacy `eclnyvbsbyqnqrhkhkxv`.
