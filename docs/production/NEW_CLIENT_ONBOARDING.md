# Nuevo cliente Dorian POS — Onboarding

Arquitectura v1 recomendada:

- un solo código fuente Dorian POS;
- un Supabase independiente por negocio;
- configuración de negocio en DB;
- build neutral Dorian POS o APK white-label;
- Firebase independiente cuando el cliente tenga APK white-label.

No compartir la base de Burger Kong con otro cliente.

## 1. Crear infraestructura

- [ ] Crear proyecto Supabase.
- [ ] Guardar project ref.
- [ ] Configurar URL y anon key en el entorno del cliente.
- [ ] Mantener service role solamente en backend/scripts seguros.
- [ ] Configurar Resend/remitente para recuperación.
- [ ] Configurar `DORIAN_PUBLIC_URL`.
- [ ] Configurar dominio web.

Variables públicas usadas por la app:

- `EXPO_PUBLIC_SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_ANON_KEY`
- `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY` si Delivery usa mapas.

Build white-label:

- `DORIAN_ANDROID_APPLICATION_ID`
- `DORIAN_APP_NAME`
- `APP_VARIANT`
- `DORIAN_GOOGLE_SERVICES_FILE` cuando se valida/prepara otro Firebase.

## 2. Crear esquema

Vincular el repo al Supabase NUEVO.

Revisar dos veces el project ref y después:

```powershell
npx supabase migration list
npx supabase db push
```

No editar migraciones históricas para “hacerlas más genéricas”; contienen pasos necesarios para reproducir la evolución del esquema.

## 3. Neutralizar datos heredados de la historia

En una base NUEVA, sin pedidos ni usuarios operando, ejecutar:

`supabase/bootstrap/new_client_after_migrations.sql`

Antes de ejecutarlo, leer el archivo. Tiene guardas para abortar si detecta datos operativos.

El bootstrap:

- elimina únicamente los programas promocionales legacy creados por la historia de Burger Kong;
- cambia la identidad provisional a Dorian POS;
- apaga pedidos web y módulos opcionales hasta que se configuren;
- no modifica la estructura.

Después el administrador configura el negocio desde Admin.

## 4. Configuración inicial en Admin > Negocio

- [ ] Nombre.
- [ ] Nombre corto.
- [ ] Teléfono.
- [ ] Dirección.
- [ ] Logo.
- [ ] Color primario.
- [ ] Color secundario.
- [ ] Moneda.
- [ ] Zona horaria.
- [ ] Pie de ticket.
- [ ] Features.

No activar Delivery, Rewards, Promociones o pedidos web antes de configurarlos.

## 5. Catálogo

Orden sugerido:

1. categorías;
2. productos;
3. grupos de modificadores;
4. modificadores;
5. relaciones producto-grupo;
6. restricciones de opciones;
7. combos;
8. promociones.

## 6. Horarios y web

- [ ] Configurar los 7 días.
- [ ] Excepciones/feriados si aplica.
- [ ] Confirmar timezone.
- [ ] Probar web pública.
- [ ] Solo entonces activar pedidos web.

Admin Web recomendado:

`app.doriancore.com`

Para una instalación/branding independiente se puede usar un subdominio del cliente posteriormente.

## 7. Usuarios

Crear al menos:

- un admin propietario;
- usuarios POS necesarios;
- drivers si Delivery está habilitado.

Verificar recuperación de contraseña antes de entregar.

## 8. Firebase / APK

### Dorian POS neutral

Puede utilizar la identidad neutral estándar cuando el modelo comercial lo permita.

### White-label

1. crear proyecto/app Android de Firebase del cliente;
2. descargar su `google-services.json`;
3. definir `DORIAN_ANDROID_APPLICATION_ID`;
4. ejecutar preparación de identidad;
5. validar:

```powershell
npm run android:prepare-firebase
npm run android:validate-identity
```

6. compilar APK/AAB;
7. probar push notifications.

No reutilizar el Firebase de Burger Kong para otro cliente white-label.

## 9. Impresora

La configuración Bluetooth/térmica se realiza desde Android.

- [ ] impresora emparejada;
- [ ] ticket de prueba;
- [ ] nombre/dirección/teléfono correctos;
- [ ] footer correcto.

## 10. Validación final

```powershell
npx tsc --noEmit
npm run audit:preflight
```

Además ejecutar:

`supabase/audits/prod_readiness.sql`

y completar un smoke test real:

- venta;
- cocina;
- cobro;
- caja;
- egreso;
- dashboard;
- web order si aplica;
- delivery si aplica;
- promoción si aplica;
- Rewards si aplica;
- recuperación de cuenta.

## 11. Entrega

Guardar por cliente, fuera del código compartido:

- Supabase project ref;
- dominio;
- Firebase project;
- applicationId;
- URL de web;
- qué features contrató;
- fecha/version del build;
- responsable del negocio.

Nunca guardar secretos en documentación versionada.
