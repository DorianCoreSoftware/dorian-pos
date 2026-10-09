# DorianCore - Registro de clientes

Este documento es la referencia administrativa para saber qué proyecto, package, EAS project y Supabase corresponde a cada cliente.

## Burger Kong

### Identidad
- Client ID: `kong-burger`
- Nombre PROD: `Burger Kong`
- Nombre DEV: `Burger Kong DEV`
- Expo slug: `burger-kong`
- EAS project: `@lalo_gzl/burger-kong`
- EAS project ID: `14f8bcc3-9327-4987-b505-899cc734c274`

### Android
- PROD package: `com.burgerkong.pos`
- DEV package: `com.burgerkong.pos.dev`
- Icono PROD: `clients/kong-burger/assets/app-icon.png`
- Icono DEV: `assets/app-icon.png` (genérico DorianCore)

### Supabase DEV
- Project ref: `lzkcqrelwynecsyvhhsy`
- URL: `https://lzkcqrelwynecsyvhhsy.supabase.co`
- EAS environment: `development`
- Variable: `EXPO_PUBLIC_SUPABASE_URL`
- Variable: `EXPO_PUBLIC_SUPABASE_ANON_KEY`

### Supabase PROD
- Project ref: `keqmsnnffrtowkbthwqk`
- URL: `https://keqmsnnffrtowkbthwqk.supabase.co`
- EAS environment: `production`
- Variable: `EXPO_PUBLIC_SUPABASE_URL`
- Variable: `EXPO_PUBLIC_SUPABASE_ANON_KEY`

### Legacy / rollback
- Project ref: `eclnyvbsbyqnqrhkhkxv`
- Estado: solo rollback / solo lectura. No compilar nuevas versiones contra este proyecto.

## Variables sensibles

Las claves `EXPO_PUBLIC_SUPABASE_ANON_KEY` se administran en EAS y no se duplican dentro del repositorio. Para revisar los valores del cliente autenticado en EAS:

```powershell
npx eas-cli env:list --environment development --include-sensitive
npx eas-cli env:list --environment production --include-sensitive
```

## Comandos de build

DEV:

```powershell
npm run apk -- --client kong-burger --env development
```

PROD:

```powershell
npm run apk -- --client kong-burger --env production
```
