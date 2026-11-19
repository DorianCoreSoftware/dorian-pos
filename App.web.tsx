import WebApp from './src/web/WebApp';

import WebAdminApp from './src/web/admin/WebAdminApp';

import {
  SafeAreaProvider,
} from 'react-native-safe-area-context';

import {
  AuthProvider,
} from './src/context/AuthContext';

import {
  BusinessProvider,
} from './src/context/BusinessContext';

function shouldUseAdminWeb(): boolean {
  if (
    typeof window ===
    'undefined'
  ) {
    return false;
  }

  const pathname =
    window.location.pathname
      .toLowerCase();

  const isControlPanelPath =
    pathname ===
      '/control-panel' ||
    pathname.startsWith(
      '/control-panel/',
    );

  return isControlPanelPath;
}

export default function AppWeb() {
  const adminWeb =
    shouldUseAdminWeb();

  return (
    <SafeAreaProvider>
      <BusinessProvider>
        {adminWeb ? (
          <AuthProvider>
            <WebAdminApp />
          </AuthProvider>
        ) : (
          <WebApp />
        )}
      </BusinessProvider>
    </SafeAreaProvider>
  );
}
