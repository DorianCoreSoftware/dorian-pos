const fs = require('fs');
const path = require('path');

const sourcePath = process.env.DORIAN_GOOGLE_SERVICES_FILE;

if (!sourcePath || !fs.existsSync(sourcePath)) {
  console.error(`No existe Firebase config: ${sourcePath || '(sin ruta)'}`);
  process.exit(1);
}

const applicationId = (process.env.DORIAN_ANDROID_APPLICATION_ID || '').trim();
const appName = (process.env.DORIAN_APP_NAME || '').trim();
const appVersion = (process.env.DORIAN_APP_VERSION || '').trim();
const androidVersionCode = Number(process.env.DORIAN_ANDROID_VERSION_CODE);

if (!/^[A-Za-z][A-Za-z0-9_]*(\.[A-Za-z][A-Za-z0-9_]*)+$/.test(applicationId)) {
  console.error(`ApplicationId inválido: ${applicationId}`);
  process.exit(1);
}

if (!appName) {
  console.error('DORIAN_APP_NAME no está definido.');
  process.exit(1);
}

if (!/^\d+\.\d+\.\d+$/.test(appVersion)) {
  console.error(`Versión Dorian inválida: ${appVersion}`);
  process.exit(1);
}

if (!Number.isInteger(androidVersionCode) || androidVersionCode <= 0) {
  console.error(`versionCode inválido: ${process.env.DORIAN_ANDROID_VERSION_CODE}`);
  process.exit(1);
}

const firebaseConfig = JSON.parse(fs.readFileSync(sourcePath, 'utf8'));
const configuredPackages = (firebaseConfig.client || [])
  .map(client => client?.client_info?.android_client_info?.package_name)
  .filter(Boolean);

if (!configuredPackages.includes(applicationId)) {
  console.error(
    [
      'El package del build no existe en Firebase.',
      `Build: ${applicationId}`,
      `Firebase: ${configuredPackages.join(', ') || 'sin package_name'}`,
    ].join('\n'),
  );
  process.exit(1);
}

const gradlePath = path.join('android', 'app', 'build.gradle');
const originalGradle = fs.readFileSync(gradlePath, 'utf8');

const applicationIdPattern = /applicationId\s+["'][^"']+["']/;
const versionCodePattern = /versionCode\s+\d+/;
const versionNamePattern = /versionName\s+["'][^"']+["']/;
const appNamePattern =
  /resValue\s+"string",\s*"app_name",\s*(?:configuredAppName|["'][^"']*["'])/m;

if (!applicationIdPattern.test(originalGradle)) {
  throw new Error('No se encontró applicationId literal en build.gradle.');
}
if (!versionCodePattern.test(originalGradle)) {
  throw new Error('No se encontró versionCode en build.gradle.');
}
if (!versionNamePattern.test(originalGradle)) {
  throw new Error('No se encontró versionName en build.gradle.');
}
if (!appNamePattern.test(originalGradle)) {
  throw new Error('No se encontró resValue app_name en build.gradle.');
}

let preparedGradle = originalGradle
  .replace(applicationIdPattern, `applicationId "${applicationId}"`)
  .replace(versionCodePattern, `versionCode ${androidVersionCode}`)
  .replace(versionNamePattern, `versionName "${appVersion}"`)
  .replace(
    appNamePattern,
    [
      'resValue "string",',
      '        "app_name",',
      `        "${appName}"`,
    ].join('\n'),
  );

fs.writeFileSync(gradlePath, preparedGradle, 'utf8');

const destinations = [
  path.join('android', 'app', 'google-services.json'),
  path.join('android', 'app', 'src', 'debug', 'google-services.json'),
  path.join('android', 'app', 'src', 'release', 'google-services.json'),
];

for (const destination of destinations) {
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  fs.copyFileSync(sourcePath, destination);
}

console.log(
  [
    `Identidad Android preparada: ${applicationId}`,
    `Nombre Android: ${appName}`,
    `Dorian POS: ${appVersion}`,
    `Android versionCode: ${androidVersionCode}`,
    `Firebase source: ${sourcePath}`,
    'Firebase preparado para debug y release.',
  ].join('\n'),
);
