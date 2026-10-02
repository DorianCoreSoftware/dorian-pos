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
      'No se copió Firebase porque el package no coincide.',
      `Build: ${effectiveApplicationId}`,
      `Firebase: ${configuredPackages.join(', ') || 'sin package_name'}`,
    ].join('\n'),
  );
  process.exit(1);
}

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
  `Firebase preparado para ${effectiveApplicationId}: ${destination}`,
);
