import Constants from 'expo-constants';

interface DorianExtra {
  version?: string;
  androidVersionCode?: number;
  buildEnv?: string;
}

const dorianExtra =
  (Constants.expoConfig?.extra?.dorian ?? {}) as DorianExtra;

export const appVersionInfo = {
  version:
    typeof dorianExtra.version === 'string' &&
    dorianExtra.version.trim().length > 0
      ? dorianExtra.version.trim()
      : 'desconocida',

  androidVersionCode:
    typeof dorianExtra.androidVersionCode === 'number'
      ? dorianExtra.androidVersionCode
      : null,

  buildEnv:
    typeof dorianExtra.buildEnv === 'string'
      ? dorianExtra.buildEnv
      : null,
} as const;

export const appVersionLabel =
  appVersionInfo.androidVersionCode !== null
    ? `Dorian POS ${appVersionInfo.version} - Build ${appVersionInfo.androidVersionCode}`
    : `Dorian POS ${appVersionInfo.version}`;
