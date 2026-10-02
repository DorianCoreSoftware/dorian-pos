const normalize = value =>
  typeof value === 'string' &&
  value.trim().length > 0
    ? value.trim()
    : null;

module.exports = ({ config }) => {
  const androidApplicationId =
    normalize(
      process.env.DORIAN_ANDROID_APPLICATION_ID,
    ) ??
    config.android?.package ??
    'com.burgerkong.pos';

  const appName =
    normalize(
      process.env.DORIAN_APP_NAME,
    ) ??
    config.name ??
    'Dorian POS';

  return {
    ...config,
    name: appName,
    android: {
      ...config.android,
      package:
        androidApplicationId,
    },
  };
};
