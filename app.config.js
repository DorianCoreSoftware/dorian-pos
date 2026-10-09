const fs = require('fs');
const path = require('path');

const normalize = value =>
  typeof value === 'string' && value.trim().length > 0
    ? value.trim()
    : null;

function loadJson(filePath) {
  if (!fs.existsSync(filePath)) return null;
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function loadClientConfig(clientId) {
  const configPath = path.join(__dirname, 'clients', clientId, 'client.config.json');
  if (!fs.existsSync(configPath)) {
    throw new Error(`No existe la configuración del cliente: ${configPath}`);
  }
  return JSON.parse(fs.readFileSync(configPath, 'utf8'));
}

module.exports = ({ config }) => {
  // buildTarget.json queda dentro del source bundle y permite que EAS remoto
  // resuelva exactamente el mismo cliente/entorno elegido localmente.
  const buildTarget = loadJson(
    path.join(__dirname, 'src', 'generated', 'buildTarget.json'),
  );

  const clientId =
    normalize(process.env.DORIAN_CLIENT_ID) ??
    buildTarget?.clientId ??
    'kong-burger';

  const buildEnv =
    normalize(process.env.DORIAN_BUILD_ENV) ??
    buildTarget?.buildEnv ??
    'development';

  const client = loadClientConfig(clientId);
  const target = buildEnv === 'production' ? client.production : client.development;

  const appName =
    normalize(process.env.DORIAN_APP_NAME) ??
    buildTarget?.appName ??
    target.appName ??
    client.businessName ??
    config.name ??
    'Dorian POS';

  const androidApplicationId =
    normalize(process.env.DORIAN_ANDROID_APPLICATION_ID) ??
    buildTarget?.androidApplicationId ??
    target.androidPackage ??
    config.android?.package ??
    'com.doriancore.pos';

  const icon =
    normalize(process.env.DORIAN_APP_ICON) ??
    buildTarget?.icon ??
    target.icon ??
    config.icon ??
    './assets/app-icon.png';

  const splashImage =
    normalize(process.env.DORIAN_SPLASH_IMAGE) ??
    buildTarget?.splashImage ??
    target.splash ??
    config.splash?.image ??
    './assets/splash.png';

  const slug =
    normalize(process.env.DORIAN_EXPO_SLUG) ??
    buildTarget?.slug ??
    client.expoSlug ??
    config.slug ??
    'dorian-pos';

  const projectId =
    normalize(process.env.DORIAN_EAS_PROJECT_ID) ??
    buildTarget?.projectId ??
    client.easProjectId ??
    config.extra?.eas?.projectId ??
    null;

  return {
    ...config,
    name: appName,
    slug,
    icon,
    splash: {
      ...config.splash,
      image: splashImage,
    },
    android: {
      ...config.android,
      package: androidApplicationId,
      adaptiveIcon: {
        ...config.android?.adaptiveIcon,
        foregroundImage: icon,
      },
    },
    web: {
      ...config.web,
      favicon: icon,
    },
    extra: {
      ...config.extra,
      dorian: {
        clientId,
        buildEnv,
        businessName: client.businessName,
      },
      ...(projectId
        ? {
            eas: {
              ...config.extra?.eas,
              projectId,
            },
          }
        : {}),
    },
  };
};
