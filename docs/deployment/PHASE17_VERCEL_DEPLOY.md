# Fase 17 — Deploy real de Dorian POS Web/Admin

Objetivo de esta fase:

- desplegar la aplicación web en Vercel;
- validar el Admin en un deployment preview;
- conectar `app.doriancore.com`;
- mantener la web pública y el Admin en el mismo bundle sin exponer el panel como una ruta pública normal;
- dejar un flujo repetible para futuros despliegues.

## Qué cambia

### `App.web.tsx`

Producción:

- `https://app.doriancore.com/` abre Admin.
- otros hosts siguen abriendo la experiencia web pública.

Preview/local:

- `http://localhost:.../admin`
- `https://<deployment>.vercel.app/admin`

abren Admin para poder probar antes de conectar el dominio.

El acceso sigue protegido por autenticación y rol `admin`.

### `app.json`

Se declara explícitamente:

```json
"web": {
  "favicon": "./assets/app-icon.png",
  "bundler": "metro",
  "output": "single"
}
```

Dorian POS Web se publica como SPA.

### `vercel.json`

- build mediante `npm run web:build`;
- output `dist`;
- rewrite SPA para rutas profundas;
- headers básicos de seguridad.

## 1. Aplicar el paquete

Copia los archivos del ZIP sobre la raíz del proyecto.

Después:

```powershell
npx tsc --noEmit
npm run audit:preflight
```

## 2. Variables de entorno en Vercel

En el proyecto de Vercel agrega, como mínimo:

```text
EXPO_PUBLIC_SUPABASE_URL
EXPO_PUBLIC_SUPABASE_ANON_KEY
```

Si las funciones web de mapas están habilitadas:

```text
EXPO_PUBLIC_GOOGLE_MAPS_API_KEY
```

Usa los valores del entorno que quieras publicar.

Para esta primera publicación debe ser Burger Kong DEV, no Burger Kong PROD.

No pongas `service_role` ni otros secretos privados como variables `EXPO_PUBLIC_*`.

## 3. Validación local del build

Con tus variables locales disponibles:

```powershell
npm run web:preflight
npm run web:build
```

Luego puedes probar el resultado exportado con:

```powershell
npm run web:serve
```

## 4. Primer deploy de Preview

Desde la raíz:

```powershell
npx vercel
```

La primera vez Vercel pedirá iniciar sesión y vincular/crear proyecto.

Configuración esperada:

- Framework Preset: `Other`
- Build Command: detectado desde `vercel.json`
- Output Directory: `dist`

Cuando termine, abre:

```text
https://TU-DEPLOYMENT.vercel.app/admin
```

Prueba:

- login Admin;
- Dashboard;
- Productos;
- Reportes;
- Egresos;
- Negocio;
- cerrar sesión;
- recuperación de cuenta.

En la URL preview, `/` seguirá mostrando la experiencia web pública.

## 5. Deploy de producción de Vercel

Cuando Preview esté aprobado:

```powershell
npx vercel --prod
```

Todavía puedes probar con la URL `.vercel.app` de producción antes de conectar DNS.

## 6. Conectar `app.doriancore.com`

En Vercel:

1. Project.
2. Settings.
3. Domains.
4. Add Domain.
5. Escribe:

```text
app.doriancore.com
```

Vercel mostrará el registro DNS exacto requerido.

Para un subdominio normalmente será un CNAME, pero usa exactamente el target que muestre Vercel para el proyecto.

En el proveedor DNS de `doriancore.com` crea/actualiza el registro `app`.

No cambies registros MX/DKIM/SPF usados por Resend o correo.

Cuando DNS quede listo, Vercel emitirá SSL automáticamente.

## 7. Verificación final

Abrir:

```text
https://app.doriancore.com
```

Debe mostrar directamente el login/Admin.

Validar también una URL pública del deployment que corresponda a pedidos/recompensas si actualmente se usa desde el mismo proyecto.

## 8. Checklist de demo

Antes de enseñar Dorian POS:

- Admin abre correctamente por HTTPS.
- Login con admin DEV funciona.
- Usuario no-admin recibe “Acceso restringido”.
- Dashboard carga.
- Reportes cargan.
- Egresos cargan.
- Productos/categorías/modificadores funcionan.
- Features desactivadas no aparecen.
- Branding viene de `business_settings`.
- Cerrar sesión funciona.
- Refresh directo del navegador no produce 404.
- `/admin` en preview funciona.
- `app.doriancore.com` abre Admin sin necesitar `/admin`.

## 9. Importante para esta fase

No conectar Burger Kong PROD todavía.

El primer deployment público de Admin debe apuntar a Burger Kong DEV para validar infraestructura, dominio y comportamiento web sin arriesgar datos reales.
