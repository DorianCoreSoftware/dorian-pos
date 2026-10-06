const fs = require('fs');
const path = require('path');

const variant =
  process.env.APP_VARIANT ||
  'production';

const baseApplicationId =
  (
    process.env.DORIAN_ANDROID_APPLICATION_ID ||
    'com.burgerkong.pos'
  ).trim();

const effectiveApplicationId =
  variant === 'development'
    ? `${baseApplicationId}.dev`
    : baseApplicationId;

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

const gradleText = fs.readFileSync(
  gradlePath,
  'utf8',
);

const gradleApplicationId =
  gradleText.match(
    /applicationId\s+["']([^"']+)["']/,
  )?.[1];

if (!gradleApplicationId) {
  console.error(
    'No se encontró un applicationId literal en android/app/build.gradle.',
  );
  process.exit(1);
}

if (
  gradleApplicationId !==
  baseApplicationId
) {
  console.error(
    [
      'El applicationId nativo no coincide con la identidad solicitada.',
      `Gradle: ${gradleApplicationId}`,
      `Esperado: ${baseApplicationId}`,
      '',
      'Ejecuta primero npm run android:prepare-firebase con las variables del cliente.',
    ].join('\n'),
  );
  process.exit(1);
}

const defaultGoogleServicesPath =
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

const googleServicesPath =
  process.env.DORIAN_GOOGLE_SERVICES_FILE ||
  defaultGoogleServicesPath;

if (!fs.existsSync(googleServicesPath)) {
  console.error(
    `No existe google-services.json en: ${googleServicesPath}`,
  );
  process.exit(1);
}

const config = JSON.parse(
  fs.readFileSync(
    googleServicesPath,
    'utf8',
  ),
);

const configuredPackages =
  (config.client || [])
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
      'Firebase no coincide con el applicationId del build.',
      `Build: ${effectiveApplicationId}`,
      `Firebase: ${configuredPackages.join(', ') || 'sin package_name'}`,
      '',
      'Para un cliente white-label registra primero esa app Android en Firebase',
      'y usa su google-services.json correspondiente.',
    ].join('\n'),
  );
  process.exit(1);
}

console.log(
  `Identidad Android/Firebase válida: ${effectiveApplicationId}`,
);
