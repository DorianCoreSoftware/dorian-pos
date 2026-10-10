const fs = require('fs');
const path = require('path');

const sourcePath =
  process.env.DORIAN_GOOGLE_SERVICES_FILE;

if (!sourcePath) {
  console.error(
    'Define DORIAN_GOOGLE_SERVICES_FILE con la ruta del google-services.json del cliente.',
  );
  process.exit(1);
}

if (!fs.existsSync(sourcePath)) {
  console.error(
    `No existe el archivo Firebase indicado: ${sourcePath}`,
  );
  process.exit(1);
}

/*
 * IMPORTANTE:
 *
 * DORIAN_ANDROID_APPLICATION_ID ya representa
 * el applicationId FINAL del build.
 *
 * Ejemplos:
 * PROD -> com.burgerkong.pos
 * DEV  -> com.burgerkong.pos.dev
 *
 * Aquí NO debemos agregar ".dev".
 */
const applicationId =
  (
    process.env.DORIAN_ANDROID_APPLICATION_ID ||
    ''
  ).trim();

if (!applicationId) {
  console.error(
    'DORIAN_ANDROID_APPLICATION_ID no está definido.',
  );
  process.exit(1);
}

if (
  !/^[A-Za-z][A-Za-z0-9_]*(\.[A-Za-z][A-Za-z0-9_]*)+$/.test(
    applicationId,
  )
) {
  console.error(
    `DORIAN_ANDROID_APPLICATION_ID no es válido: ${applicationId}`,
  );
  process.exit(1);
}

const firebaseConfig =
  JSON.parse(
    fs.readFileSync(
      sourcePath,
      'utf8',
    ),
  );

const configuredPackages =
  (firebaseConfig.client || [])
    .map(
      client =>
        client?.client_info
          ?.android_client_info
          ?.package_name,
    )
    .filter(Boolean);

if (
  !configuredPackages.includes(
    applicationId,
  )
) {
  console.error(
    [
      'No se preparó la identidad Android porque el package no coincide con Firebase.',
      `Build: ${applicationId}`,
      `Firebase: ${configuredPackages.join(', ') || 'sin package_name'}`,
    ].join('\n'),
  );

  process.exit(1);
}

/*
 * Como existe /android, Expo no puede cambiar
 * android.package dinámicamente.
 *
 * Por eso reescribimos applicationId directamente
 * antes de enviar el proyecto a EAS.
 */
const gradlePath =
  path.join(
    'android',
    'app',
    'build.gradle',
  );

if (!fs.existsSync(gradlePath)) {
  console.error(
    `No existe el archivo Gradle esperado: ${gradlePath}`,
  );
  process.exit(1);
}

const originalGradle =
  fs.readFileSync(
    gradlePath,
    'utf8',
  );

const applicationIdPattern =
  /applicationId\s+["'][^"']+["']/;

if (
  !applicationIdPattern.test(
    originalGradle,
  )
) {
  console.error(
    'No se encontró un applicationId literal en android/app/build.gradle.',
  );
  process.exit(1);
}

const preparedGradle =
  originalGradle.replace(
    applicationIdPattern,
    `applicationId "${applicationId}"`,
  );

fs.writeFileSync(
  gradlePath,
  preparedGradle,
  'utf8',
);

/*
 * Dejamos el mismo google-services.json disponible
 * para Gradle en cualquier variante.
 *
 * El archivo contiene tanto:
 * - com.burgerkong.pos
 * - com.burgerkong.pos.dev
 */
const destinations = [
  path.join(
    'android',
    'app',
    'google-services.json',
  ),
  path.join(
    'android',
    'app',
    'src',
    'debug',
    'google-services.json',
  ),
  path.join(
    'android',
    'app',
    'src',
    'release',
    'google-services.json',
  ),
];

for (const destination of destinations) {
  fs.mkdirSync(
    path.dirname(destination),
    {
      recursive: true,
    },
  );

  fs.copyFileSync(
    sourcePath,
    destination,
  );
}

console.log(
  [
    `Identidad Android preparada: ${applicationId}`,
    `Firebase source: ${sourcePath}`,
    'Firebase preparado para debug y release.',
  ].join('\n'),
);