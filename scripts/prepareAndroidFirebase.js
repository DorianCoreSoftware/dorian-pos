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

const variant =
  process.env.APP_VARIANT ||
  'production';

const baseApplicationId =
  (
    process.env.DORIAN_ANDROID_APPLICATION_ID ||
    'com.burgerkong.pos'
  ).trim();

if (
  !/^[A-Za-z][A-Za-z0-9_]*(\.[A-Za-z][A-Za-z0-9_]*)+$/.test(
    baseApplicationId,
  )
) {
  console.error(
    `DORIAN_ANDROID_APPLICATION_ID no es válido: ${baseApplicationId}`,
  );
  process.exit(1);
}

const effectiveApplicationId =
  variant === 'development'
    ? `${baseApplicationId}.dev`
    : baseApplicationId;

const firebaseConfig = JSON.parse(
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
    effectiveApplicationId,
  )
) {
  console.error(
    [
      'No se preparó la identidad Android porque el package no coincide con Firebase.',
      `Build: ${effectiveApplicationId}`,
      `Firebase: ${configuredPackages.join(', ') || 'sin package_name'}`,
    ].join('\n'),
  );
  process.exit(1);
}

/*
 * Expo necesita encontrar un applicationId literal en build.gradle cuando
 * existe un proyecto Android nativo. Por eso no lo hacemos dinámico dentro
 * de Gradle: este script reescribe el literal ANTES del build white-label.
 */
const gradlePath = path.join(
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
    `applicationId "${baseApplicationId}"`,
  );

fs.writeFileSync(
  gradlePath,
  preparedGradle,
  'utf8',
);

const destination =
  variant === 'development'
    ? path.join(
        'android',
        'app',
        'src',
        'debug',
        'google-services.json',
      )
    : path.join(
        'android',
        'app',
        'src',
        'release',
        'google-services.json',
      );

fs.mkdirSync(
  path.dirname(
    destination,
  ),
  {
    recursive: true,
  },
);

fs.copyFileSync(
  sourcePath,
  destination,
);

console.log(
  [
    `Identidad Android preparada: ${effectiveApplicationId}`,
    `Gradle base: ${baseApplicationId}`,
    `Firebase: ${destination}`,
  ].join('\n'),
);
